from fastapi import FastAPI, APIRouter, HTTPException, File, UploadFile
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, date
import base64
from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Models
class UserGoals(BaseModel):
    age: Optional[int] = None
    height: Optional[float] = None  # in cm
    weight: Optional[float] = None  # in kg
    activityLevel: Optional[str] = None
    goal: Optional[str] = None  # lose, maintain, gain
    dailyCalories: Optional[int] = None
    dailyProtein: Optional[int] = None

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: Optional[str] = None
    isPremium: bool = False
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    goals: Optional[UserGoals] = None

class Meal(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    userId: str
    timestamp: Optional[int] = None  # Unix timestamp from frontend (ms)
    photoBase64: str
    dishName: str
    ingredients: List[str]
    calories: int
    protein: float
    carbs: float
    fats: float
    portionSize: str
    warnings: List[str]

class AnalyzeFoodRequest(BaseModel):
    userId: str
    imageBase64: str
    language: Optional[str] = "en"  # Language code: en, es, etc.

class AnalyzeFoodResponse(BaseModel):
    dishName: str
    ingredients: List[str]
    calories: int
    protein: float
    carbs: float
    fats: float
    portionSize: str
    warnings: List[str]
    # Smart portion fields
    foodType: Optional[str] = "single"  # "shareable" (pizza, cake), "container" (can, bottle), "single" (plate, sandwich)
    typicalServings: Optional[int] = 1  # e.g., 8 for pizza, 1 for a can of beer, 1 for a plate
    totalCalories: Optional[int] = None  # Total calories if shareable (e.g., whole pizza)
    servingDescription: Optional[str] = None  # e.g., "1 slice", "1 can (375ml)", "1 plate"

class SaveMealRequest(BaseModel):
    userId: str
    photoBase64: str
    dishName: str
    ingredients: List[str]
    calories: float  # Changed to float for flexibility
    protein: float
    carbs: float
    fats: float
    portionSize: Optional[str] = "medium"  # Made optional with default
    portions: Optional[float] = 1.0  # Added portions field
    warnings: Optional[List[str]] = []  # Made optional with default
    timestamp: Optional[int] = None  # Unix timestamp from frontend (ms)

class SetUserGoalsRequest(BaseModel):
    userId: str
    age: int
    height: float
    weight: float
    activityLevel: str
    goal: str
    gender: Optional[str] = "male"  # male or female for more accurate calculations

# New models for smart ingredients and notifications
class UserIngredients(BaseModel):
    userId: str
    ingredients: List[str] = []
    lastUpdated: datetime = Field(default_factory=datetime.utcnow)

class SaveIngredientsRequest(BaseModel):
    userId: str
    ingredients: List[str]
    append: bool = True  # If True, add to existing. If False, replace all.

class SmartNotificationRequest(BaseModel):
    userId: str
    mealType: str  # "lunch" or "dinner"
    language: Optional[str] = "en"

class SmartNotificationResponse(BaseModel):
    message: str
    caloriesConsumed: int
    caloriesRemaining: int
    proteinConsumed: float
    proteinRemaining: float
    suggestedRecipes: List[str]  # Just recipe names
    hasIngredients: bool

class AnalyzeIngredientsRequest(BaseModel):
    userId: str
    imageBase64: Optional[str] = None
    ingredients: Optional[List[str]] = None
    language: Optional[str] = "en"  # Language code: en, es, etc.
    healthConditions: Optional[List[str]] = None  # User's health conditions
    foodAllergies: Optional[List[str]] = None  # User's food allergies

class Recipe(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    ingredients: List[str]
    instructions: List[str]
    cookingTime: int  # in minutes
    servings: int
    calories: int
    protein: float
    carbs: float
    fats: float
    healthierOption: Optional[str] = None
    countryOfOrigin: Optional[str] = None  # Country or region where this dish originates
    cuisine: Optional[str] = None  # Type of cuisine (Italian, Mexican, Chinese, etc.)
    requiresExtraIngredients: bool = False  # True if this is a "bonus" recipe needing extra items
    extraIngredientsNeeded: List[str] = []  # List of extra ingredients needed for bonus recipes

class RecipeSuggestionsResponse(BaseModel):
    recipes: List[Recipe]

# Helper function to calculate daily calorie needs
def calculate_daily_needs(age: int, height: float, weight: float, activity_level: str, goal: str, gender: str = "male"):
    """
    Calculate daily calorie and protein needs using Mifflin-St Jeor equation.
    This is one of the most accurate formulas for estimating BMR.
    
    Note: These are estimates. Users should consult a nutritionist for personalized advice.
    """
    # Basal Metabolic Rate (BMR) using Mifflin-St Jeor equation
    if gender == "female":
        bmr = 10 * weight + 6.25 * height - 5 * age - 161
    else:  # male or default
        bmr = 10 * weight + 6.25 * height - 5 * age + 5
    
    # Activity multipliers (TDEE - Total Daily Energy Expenditure)
    activity_multipliers = {
        "sedentary": 1.2,       # Little or no exercise
        "light": 1.375,         # Light exercise 1-3 days/week
        "moderate": 1.55,       # Moderate exercise 3-5 days/week
        "active": 1.725,        # Hard exercise 6-7 days/week
        "very_active": 1.9      # Very hard exercise & physical job
    }
    
    tdee = bmr * activity_multipliers.get(activity_level, 1.2)
    
    # Adjust based on goal
    if goal == "lose":
        daily_calories = int(tdee - 500)  # 500 calorie deficit (~0.5kg/week loss)
        daily_protein = int(weight * 1.2)  # Higher protein to preserve muscle
        daily_carbs = int((daily_calories * 0.40) / 4)  # 40% from carbs
        daily_fats = int((daily_calories * 0.30) / 9)   # 30% from fats
    elif goal == "gain":
        daily_calories = int(tdee + 300)  # 300 calorie surplus (lean bulk)
        daily_protein = int(weight * 1.8)  # High protein for muscle building
        daily_carbs = int((daily_calories * 0.45) / 4)  # 45% from carbs
        daily_fats = int((daily_calories * 0.25) / 9)   # 25% from fats
    else:  # maintain
        daily_calories = int(tdee)
        daily_protein = int(weight * 1.0)  # Moderate protein
        daily_carbs = int((daily_calories * 0.45) / 4)  # 45% from carbs
        daily_fats = int((daily_calories * 0.30) / 9)   # 30% from fats
    
    return {
        "calories": daily_calories,
        "protein": daily_protein,
        "carbs": daily_carbs,
        "fats": daily_fats
    }

# Helper function to translate recipes to target language
async def translate_recipes(recipes_data: list, target_language: str, api_key: str):
    """Translate all recipe content to target language using OpenAI"""
    try:
        import json
        
        language_names = {
            "es": "Spanish",
            "en": "English",
            "fr": "French",
            "de": "German",
            "it": "Italian",
            "pt": "Portuguese"
        }
        
        target_lang_name = language_names.get(target_language, target_language)
        
        # Create translation prompt
        chat = LlmChat(
            api_key=api_key,
            session_id=f"translation_{target_language}",
            system_message=f"""You are a professional translator specializing in culinary content.
            
            Translate ALL recipe content to {target_lang_name}. This includes:
            - Recipe names
            - Descriptions  
            - Ingredients (translate the text but keep as simple strings, NOT objects)
            - Step-by-step instructions
            - Healthier options
            
            CRITICAL RULES:
            1. Return the EXACT same JSON structure - do not change data types or structure
            2. Ingredients must remain as an array of strings, NOT objects
            3. Only translate the text content, preserve all numbers and measurements
            4. Do not restructure or reorganize the data
            
            Example ingredient translations to {target_lang_name}:
            - "2 cups of milk" → {'"2 tazas de leche"' if target_language == "es" else '"2 cups of milk"'}
            - "1 chicken breast" → {'"1 pechuga de pollo"' if target_language == "es" else '"1 chicken breast"'}
            
            WRONG: {{"item": "pollo", "quantity": "1", "unit": "pechuga"}}
            CORRECT: "1 pechuga de pollo"
            
            Return only the translated JSON with the exact same structure, no explanations."""
        ).with_model("openai", "gpt-4o")
        
        # Convert recipes to JSON string for translation
        recipes_json = json.dumps(recipes_data, ensure_ascii=False, indent=2)
        
        user_message = UserMessage(
            text=f"Translate this recipe JSON to {target_lang_name}. Return only the translated JSON:\n\n{recipes_json}"
        )
        
        response = await chat.send_message(user_message)
        
        # Parse translated response
        response_text = response.strip()
        if "```json" in response_text:
            response_text = response_text.split("```json")[1].split("```")[0].strip()
        elif "```" in response_text:
            response_text = response_text.split("```")[1].split("```")[0].strip()
        
        translated_recipes = json.loads(response_text)
        logger.info(f"Successfully translated {len(translated_recipes)} recipes to {target_language}")
        
        return translated_recipes
        
    except Exception as e:
        logger.error(f"Translation failed: {e}. Returning original recipes.")
        return recipes_data  # Return original if translation fails

# Routes
@api_router.get("/")
async def root():
    return {"message": "FoodSnap API"}

@api_router.post("/analyze-food")
async def analyze_food(request: AnalyzeFoodRequest):
    """Analyze food image using OpenAI GPT-4 Vision"""
    try:
        logger.info(f"Analyzing food for user: {request.userId} in language: {request.language}")
        
        # Log image info for debugging
        raw_base64 = request.imageBase64
        logger.info(f"Image base64 starts with: {raw_base64[:50] if raw_base64 else 'EMPTY'}...")
        logger.info(f"Image base64 length: {len(raw_base64) if raw_base64 else 0}")
        
        # Track this analysis attempt (counts towards daily limit)
        await db.analysis_attempts.insert_one({
            "user_id": request.userId,
            "timestamp": datetime.utcnow(),
            "type": "food"
        })
        logger.info(f"Recorded analysis attempt for user: {request.userId}")
        
        # Initialize LLM chat with OpenAI GPT-4 Vision
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            raise HTTPException(status_code=500, detail="API key not configured")
        
        # Language-specific system message
        language_instruction = ""
        if request.language == "es":
            language_instruction = "IMPORTANTE: Responde SIEMPRE en ESPAÑOL. Nombres de platos, ingredientes, advertencias - TODO en español."
        elif request.language == "en":
            language_instruction = "IMPORTANT: Respond ALWAYS in ENGLISH. Dish names, ingredients, warnings - EVERYTHING in English."
        else:
            language_instruction = f"IMPORTANT: Respond ALWAYS in {request.language.upper()}. All content must be in {request.language}."
        
        chat = LlmChat(
            api_key=api_key,
            session_id=f"food_analysis_{request.userId}",
            system_message=f"""{language_instruction}
            
            You are a professional nutritionist AI that analyzes food photos. 
            Provide accurate estimates of nutrition information.
            
            CRITICAL PORTION LOGIC - Follow these rules strictly:
            
            1. SHAREABLE FOODS (pizza, cake, pie, tart, casserole, large salads, etc.):
               - foodType: "shareable"
               - typicalServings: How many portions this is typically divided into (e.g., pizza = 8, cake = 12, pie = 8)
               - totalCalories: TOTAL calories for the ENTIRE item
               - calories: Calories PER SINGLE SERVING (totalCalories / typicalServings)
               - servingDescription: "1 porción" or "1 slice" etc.
               - Example: A whole pizza has 2400 total calories, typicalServings=8, so calories=300 per slice
            
            2. CONTAINER FOODS (canned drinks, bottled beverages, packaged snacks):
               - foodType: "container"
               - typicalServings: 1 (one container = one serving)
               - calories: Calories for the ENTIRE container
               - servingDescription: "1 lata (375ml)" or "1 botella (500ml)" etc.
               - Example: A can of beer (375ml) = 150 calories, typicalServings=1
            
            3. SINGLE SERVINGS (a plate of food, a sandwich, a burger, a bowl of soup):
               - foodType: "single" 
               - typicalServings: 1
               - calories: Calories for the ENTIRE plate/item shown
               - servingDescription: "1 plato" or "1 porción" etc.
               - Example: A plate of pasta = 650 calories, typicalServings=1
            
            Also provide:
            - Dish name
            - Main ingredients (list of 3-5 items)
            - Protein (in grams, per serving)
            - Carbohydrates (in grams, per serving)
            - Fats (in grams, per serving)
            - Portion size (small/medium/large)
            - Health warnings if any
            
            Return your response in this EXACT JSON format:
            {{
              "dishName": "Name of the dish",
              "ingredients": ["ingredient1", "ingredient2", "ingredient3"],
              "calories": 300,
              "protein": 12.5,
              "carbs": 30.0,
              "fats": 10.0,
              "portionSize": "medium",
              "warnings": ["High in sodium", "Low protein"],
              "foodType": "shareable",
              "typicalServings": 8,
              "totalCalories": 2400,
              "servingDescription": "1 porción de pizza"
            }}
            
            Be realistic and accurate with estimates. If you can't identify the food clearly, say so in the dishName.
            """
        ).with_model("openai", "gpt-4o")
        
        # Create image content - ensure clean base64 without data URI prefix
        image_base64 = request.imageBase64
        # Remove data URI prefix if present (the library adds it automatically)
        if image_base64.startswith('data:image'):
            # Extract just the base64 part after the comma
            image_base64 = image_base64.split(',', 1)[1] if ',' in image_base64 else image_base64
        
        image_content = ImageContent(image_base64=image_base64)
        
        # Send message with image
        user_message = UserMessage(
            text="Please analyze this food image and provide detailed nutrition information in the specified JSON format.",
            file_contents=[image_content]
        )
        
        response = await chat.send_message(user_message)
        
        # Log response type and content for debugging
        logger.info(f"Response type: {type(response)}, Response is None: {response is None}")
        
        # Check if response is None or empty
        if response is None:
            logger.error("AI returned None response")
            raise HTTPException(status_code=500, detail="AI returned empty response - please try again")
        
        # Parse the response
        import json
        try:
            # Log raw response for debugging
            response_str = str(response) if response else ""
            logger.info(f"Raw AI response (first 500 chars): {response_str[:500] if response_str else 'EMPTY'}")
            
            # Check if AI couldn't identify food
            no_food_phrases = [
                "no puedo identificar", "cannot identify", "can't identify",
                "no food", "no alimento", "not a food", "no es comida",
                "unable to", "no puedo ver", "can't see", "cannot see"
            ]
            response_lower = response_str.lower()
            if any(phrase in response_lower for phrase in no_food_phrases):
                logger.warning(f"AI couldn't identify food in image")
                raise HTTPException(status_code=400, detail="No se pudo identificar comida en la imagen. Por favor, intenta con otra foto más clara.")
            
            # Try to extract JSON from response
            response_text = response_str.strip() if response_str else ""
            if not response_text:
                logger.error("AI returned empty string response")
                raise HTTPException(status_code=500, detail="AI returned empty response")
                
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0].strip()
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0].strip()
            
            nutrition_data = json.loads(response_text)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse AI response as JSON: {e}")
            logger.error(f"Response text was: {response_text[:500] if response_text else 'EMPTY'}")
            raise HTTPException(status_code=500, detail="No se pudo analizar la imagen. Intenta con otra foto más clara.")
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to parse AI response: {e}")
            raise HTTPException(status_code=500, detail="Failed to parse nutrition analysis")
        
        return AnalyzeFoodResponse(**nutrition_data)
        
    except Exception as e:
        logger.error(f"Error analyzing food: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to analyze food: {str(e)}")

@api_router.post("/meals")
async def save_meal(request: SaveMealRequest):
    """Save a meal to the database"""
    try:
        # Use timestamp from frontend if provided, otherwise use current UTC time
        meal_timestamp = request.timestamp if request.timestamp else int(datetime.utcnow().timestamp() * 1000)
        
        meal = Meal(
            userId=request.userId,
            timestamp=meal_timestamp,
            photoBase64=request.photoBase64,
            dishName=request.dishName,
            ingredients=request.ingredients,
            calories=request.calories,
            protein=request.protein,
            carbs=request.carbs,
            fats=request.fats,
            portionSize=request.portionSize,
            warnings=request.warnings
        )
        
        await db.meals.insert_one(meal.dict())
        return {"success": True, "mealId": meal.id}
        
    except Exception as e:
        logger.error(f"Error saving meal: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to save meal: {str(e)}")

@api_router.get("/meals/{user_id}/today")
async def get_today_meals_count(user_id: str):
    """Get count of meals logged today for a user"""
    try:
        today_start = datetime.combine(date.today(), datetime.min.time())
        today_end = datetime.combine(date.today(), datetime.max.time())
        
        count = await db.meals.count_documents({
            "userId": user_id,
            "timestamp": {"$gte": today_start, "$lte": today_end}
        })
        
        return {"count": count}
        
    except Exception as e:
        logger.error(f"Error getting meal count: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get meal count: {str(e)}")

@api_router.get("/analysis-count/{user_id}/today")
async def get_today_analysis_count(user_id: str):
    """Get count of analysis attempts today for a user (for daily limit)"""
    try:
        today_start = datetime.combine(date.today(), datetime.min.time())
        today_end = datetime.combine(date.today(), datetime.max.time())
        
        count = await db.analysis_attempts.count_documents({
            "user_id": user_id,
            "timestamp": {"$gte": today_start, "$lte": today_end}
        })
        
        return {"count": count}
        
    except Exception as e:
        logger.error(f"Error getting analysis count: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get analysis count: {str(e)}")

@api_router.get("/meals/{user_id}")
async def get_user_meals(user_id: str, limit: int = 50):
    """Get meal history for a user"""
    try:
        meals = await db.meals.find(
            {"userId": user_id}
        ).sort("timestamp", -1).limit(limit).to_list(limit)
        
        # Convert ObjectId to string for JSON serialization
        for meal in meals:
            if "_id" in meal:
                meal["_id"] = str(meal["_id"])
        
        return {"meals": meals}
        
    except Exception as e:
        logger.error(f"Error getting meals: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get meals: {str(e)}")

@api_router.get("/meals/{user_id}/daily-totals")
async def get_daily_totals(user_id: str):
    """Get today's total calories and macros"""
    try:
        today_start = datetime.combine(date.today(), datetime.min.time())
        today_end = datetime.combine(date.today(), datetime.max.time())
        
        meals = await db.meals.find({
            "userId": user_id,
            "timestamp": {"$gte": today_start, "$lte": today_end}
        }).to_list(100)
        
        total_calories = sum(meal.get("calories", 0) for meal in meals)
        total_protein = sum(meal.get("protein", 0) for meal in meals)
        total_carbs = sum(meal.get("carbs", 0) for meal in meals)
        total_fats = sum(meal.get("fats", 0) for meal in meals)
        
        return {
            "calories": total_calories,
            "protein": total_protein,
            "carbs": total_carbs,
            "fats": total_fats,
            "mealCount": len(meals)
        }
        
    except Exception as e:
        logger.error(f"Error getting daily totals: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get daily totals: {str(e)}")

@api_router.delete("/meals/{meal_id}")
async def delete_meal(meal_id: str):
    """Delete a specific meal"""
    try:
        result = await db.meals.delete_one({"id": meal_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Meal not found")
        return {"success": True, "message": "Meal deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting meal: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete meal: {str(e)}")

@api_router.post("/users")
async def create_user():
    """Create a new user"""
    try:
        user = User()
        await db.users.insert_one(user.dict())
        return {"userId": user.id, "isPremium": user.isPremium}
        
    except Exception as e:
        logger.error(f"Error creating user: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create user: {str(e)}")

@api_router.get("/users/{user_id}")
async def get_user(user_id: str):
    """Get user details"""
    try:
        user = await db.users.find_one({"id": user_id})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Convert ObjectId to string for JSON serialization
        if "_id" in user:
            user["_id"] = str(user["_id"])
        
        return user
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting user: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get user: {str(e)}")

@api_router.post("/users/{user_id}/goals")
async def set_user_goals(user_id: str, request: SetUserGoalsRequest):
    """Set user goals and calculate daily targets"""
    try:
        # Calculate daily needs with the new comprehensive function
        daily_needs = calculate_daily_needs(
            request.age,
            request.height,
            request.weight,
            request.activityLevel,
            request.goal,
            request.gender or "male"
        )
        
        goals = UserGoals(
            age=request.age,
            height=request.height,
            weight=request.weight,
            activityLevel=request.activityLevel,
            goal=request.goal,
            dailyCalories=daily_needs["calories"],
            dailyProtein=daily_needs["protein"]
        )
        
        # Also store carbs and fats targets
        goals_dict = goals.dict()
        goals_dict["dailyCarbs"] = daily_needs["carbs"]
        goals_dict["dailyFats"] = daily_needs["fats"]
        goals_dict["gender"] = request.gender or "male"
        
        await db.users.update_one(
            {"id": user_id},
            {"$set": {"goals": goals_dict}}
        )
        
        return {"success": True, "goals": goals_dict}
        
    except Exception as e:
        logger.error(f"Error setting user goals: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to set user goals: {str(e)}")

@api_router.patch("/users/{user_id}/premium")
async def update_premium_status(user_id: str, is_premium: bool):
    """Update user premium status"""
    try:
        await db.users.update_one(
            {"id": user_id},
            {"$set": {"isPremium": is_premium}}
        )
        return {"success": True, "isPremium": is_premium}
        
    except Exception as e:
        logger.error(f"Error updating premium status: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update premium status: {str(e)}")

@api_router.post("/analyze-ingredients")
async def analyze_ingredients(request: AnalyzeIngredientsRequest):
    """Analyze ingredients from photo or manual list"""
    try:
        logger.info(f"Analyzing ingredients for user: {request.userId} in language: {request.language}")
        
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            raise HTTPException(status_code=500, detail="API key not configured")
        
        # If image provided, extract ingredients
        if request.imageBase64:
            # Language-specific system message
            language_instruction = ""
            if request.language == "es":
                language_instruction = "IMPORTANTE: Responde SIEMPRE en ESPAÑOL. Nombres de ingredientes - TODO en español."
            elif request.language == "en":
                language_instruction = "IMPORTANT: Respond ALWAYS in ENGLISH. Ingredient names - EVERYTHING in English."
            else:
                language_instruction = f"IMPORTANT: Respond ALWAYS in {request.language.upper()}. All content must be in {request.language}."
            
            chat = LlmChat(
                api_key=api_key,
                session_id=f"ingredient_analysis_{request.userId}",
                system_message=f"""{language_instruction}
                
                You are an AI that identifies ingredients from photos.
                Look at the image and list all visible ingredients.
                Return a JSON array of ingredient names.
                Format: ["ingredient1", "ingredient2", "ingredient3"]
                Be specific but concise."""
            ).with_model("openai", "gpt-4o")
            
            # Remove data URI prefix if present (the library adds it automatically)
            image_base64 = request.imageBase64
            if image_base64.startswith('data:image'):
                image_base64 = image_base64.split(',', 1)[1] if ',' in image_base64 else image_base64
            
            image_content = ImageContent(image_base64=image_base64)
            user_message = UserMessage(
                text="Please identify all ingredients visible in this photo and return them as a JSON array.",
                file_contents=[image_content]
            )
            
            response = await chat.send_message(user_message)
            
            import json
            try:
                response_text = response.strip()
                if "```json" in response_text:
                    response_text = response_text.split("```json")[1].split("```")[0].strip()
                elif "```" in response_text:
                    response_text = response_text.split("```")[1].split("```")[0].strip()
                
                ingredients = json.loads(response_text)
            except Exception as e:
                logger.error(f"Failed to parse ingredients: {e}")
                raise HTTPException(status_code=500, detail="Failed to parse ingredients")
            
            return {"ingredients": ingredients}
        
        elif request.ingredients:
            return {"ingredients": request.ingredients}
        
        else:
            raise HTTPException(status_code=400, detail="Either imageBase64 or ingredients must be provided")
            
    except Exception as e:
        logger.error(f"Error analyzing ingredients: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to analyze ingredients: {str(e)}")

@api_router.post("/recipe-suggestions")
async def get_recipe_suggestions(request: AnalyzeIngredientsRequest):
    """Get recipe suggestions based on available ingredients"""
    try:
        logger.info(f"Getting recipe suggestions for user: {request.userId} in language: {request.language}")
        logger.info(f"Request data - Language received: '{request.language}', Ingredients: {request.ingredients}")
        
        if not request.ingredients or len(request.ingredients) == 0:
            return RecipeSuggestionsResponse(recipes=[])
        
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            raise HTTPException(status_code=500, detail="API key not configured")
        
        ingredients_str = ", ".join(request.ingredients)
        
        # STEP 1: Generate recipes in English (most reliable)
        # Build health restrictions context
        health_context = ""
        if request.healthConditions and 'none' not in request.healthConditions:
            conditions_str = ', '.join(request.healthConditions)
            health_context += f"\n\nUSER HEALTH CONDITIONS: {conditions_str}"
            health_context += "\nYou MUST consider these conditions when suggesting recipes:"
            if 'diabetes' in request.healthConditions:
                health_context += "\n- DIABETES: Avoid high-sugar recipes, prefer low glycemic index foods"
            if 'celiac' in request.healthConditions:
                health_context += "\n- CELIAC: NO wheat, barley, rye, or gluten-containing ingredients"
            if 'hypertension' in request.healthConditions:
                health_context += "\n- HYPERTENSION: Minimize salt, avoid processed foods"
            if 'cholesterol' in request.healthConditions:
                health_context += "\n- HIGH CHOLESTEROL: Minimize saturated fats, avoid fried foods"
            if 'lactose' in request.healthConditions:
                health_context += "\n- LACTOSE INTOLERANT: NO milk, cheese, cream, or dairy products"
            if 'vegetarian' in request.healthConditions:
                health_context += "\n- VEGETARIAN: NO meat or fish"
            if 'vegan' in request.healthConditions:
                health_context += "\n- VEGAN: NO animal products (meat, fish, eggs, dairy, honey)"
            if 'keto' in request.healthConditions:
                health_context += "\n- KETO DIET: Very low carbs, high fat, moderate protein"
            if 'pregnant' in request.healthConditions:
                health_context += "\n- PREGNANCY: Avoid raw fish, unpasteurized products, limit caffeine"
            if 'gastritis' in request.healthConditions:
                health_context += "\n- GASTRITIS: Avoid spicy, acidic, fried foods"
            if 'ibs' in request.healthConditions:
                health_context += "\n- IBS: Low FODMAP suggestions preferred"
        
        if request.foodAllergies and len(request.foodAllergies) > 0:
            allergies_str = ', '.join(request.foodAllergies)
            health_context += f"\n\nUSER FOOD ALLERGIES: {allergies_str}"
            health_context += "\nYou MUST NEVER include these foods in any recipe. This is critical for user safety."
        
        chat = LlmChat(
            api_key=api_key,
            session_id=f"recipe_suggestions_{request.userId}",
            system_message=f"""You are a professional chef AI that creates diverse, international recipe suggestions.
            
            CRITICAL RULE - ALL RECIPES MUST BE FOR EXACTLY 4 SERVINGS:
            - ALWAYS normalize every recipe to exactly 4 servings/portions
            - If a traditional recipe is for 2 people, double all ingredient quantities
            - If a traditional recipe is for 6 people, reduce ingredient quantities proportionally (multiply by 4/6)
            - If a traditional recipe is for 8 people, halve all ingredient quantities
            - The calories, protein, carbs, and fats should be PER SERVING (for 1 portion out of 4)
            - This is NON-NEGOTIABLE: servings MUST always be 4
            
            CRITICAL RULE - INGREDIENTS RESTRICTION:
            You will receive a list of ingredients that the user HAS AVAILABLE.
            
            FOR THE FIRST 7 RECIPES: You MUST ONLY use the ingredients provided by the user.
            - DO NOT add any ingredients that are not in the user's list
            - The ONLY exceptions allowed are: salt, pepper, water, and cooking oil (these are assumed to be always available)
            - If the user says they have "chicken", you can ONLY use chicken - do not add capers, olives, wine, or any other ingredient
            - Be creative with ONLY what they have
            - Set "requiresExtraIngredients": false for these recipes
            
            FOR THE LAST 1 RECIPE (BONUS SECTION): You may suggest 1-2 COMMON, EASY-TO-FIND extra ingredients
            - This is a "bonus" recipe that requires buying just 1-2 simple items
            - Only suggest very common ingredients like: rice, pasta, bread, milk, cheese, onion, garlic, tomato, lemon
            - Set "requiresExtraIngredients": true for this recipe
            - Add "extraIngredientsNeeded": ["ingredient1", "ingredient2"] listing ONLY the extra items needed
            {health_context}
            
            Each recipe must include:
            - name: Recipe name
            - description: Brief description of the dish
            - ingredients: List of ingredients with quantities (NORMALIZED FOR 4 SERVINGS)
            - instructions: Step-by-step cooking instructions (array of strings, each step is clear)
            - cookingTime: Total time in minutes
            - servings: ALWAYS 4 (this is mandatory)
            - calories: Estimated calories PER SINGLE SERVING (1 portion) - IMPORTANT: DO NOT include calories from cooking oils/fats/butter. The user will add these separately.
            - protein: Protein in grams PER SINGLE SERVING
            - carbs: Carbohydrates in grams PER SINGLE SERVING  
            - fats: Fats in grams PER SINGLE SERVING - IMPORTANT: DO NOT include fats from cooking oils/butter. Only include fats naturally present in the ingredients.
            - healthierOption: Optional suggestion for making it healthier
            - countryOfOrigin: Country where this dish originates
            - cuisine: Type of cuisine
            - requiresExtraIngredients: boolean (false for first 7, true for bonus recipe)
            - extraIngredientsNeeded: array of strings (empty for first recipes, 1-2 items for bonus recipe)
            
            IMPORTANT ABOUT COOKING OILS/FATS:
            - When a recipe needs oil, butter, or any cooking fat, include it in the ingredients list
            - But DO NOT count those calories/fats in the nutrition values
            - The user will manually select the type and amount of fat they used after cooking
            
            Return as JSON array of 8 recipes total.
            Make recipes beginner-friendly with clear, sequential instructions.
            Include recipes from at least 5 different countries/cuisines.
            """
        ).with_model("openai", "gpt-4o")
        
        user_message = UserMessage(
            text=f"""Create 8 recipe suggestions using ONLY these available ingredients: {ingredients_str}

STRICT RULES:
1. ALL RECIPES MUST BE NORMALIZED TO EXACTLY 4 SERVINGS - adjust all ingredient quantities accordingly
2. For the FIRST 7 recipes: Use ONLY the ingredients I listed above. Do NOT add anything else except salt, pepper, water, and cooking oil.
3. For the LAST 1 recipe: You may add 1-2 VERY COMMON extra ingredients (like rice, pasta, onion, garlic) and mark it as a bonus recipe.
4. Calories, protein, carbs, and fats must be PER SINGLE SERVING (1 portion out of 4)

Return as JSON array with requiresExtraIngredients and extraIngredientsNeeded fields."""
        )
        
        response = await chat.send_message(user_message)
        
        import json
        try:
            response_text = response.strip()
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0].strip()
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0].strip()
            
            recipes_data = json.loads(response_text)
            
            # Helper function to convert ingredient objects to strings
            def normalize_ingredients(ingredients_list):
                normalized = []
                for ing in ingredients_list:
                    if isinstance(ing, dict):
                        # Convert object like {'name': 'chicken', 'quantity': '500g'} to "500g chicken"
                        name = ing.get('name', ing.get('ingredient', ''))
                        quantity = ing.get('quantity', ing.get('amount', ''))
                        if quantity and name:
                            normalized.append(f"{quantity} {name}")
                        elif name:
                            normalized.append(name)
                        else:
                            normalized.append(str(ing))
                    else:
                        normalized.append(str(ing))
                return normalized
            
            # Normalize ingredients in all recipes before translation
            for recipe_dict in recipes_data:
                if 'ingredients' in recipe_dict:
                    recipe_dict['ingredients'] = normalize_ingredients(recipe_dict['ingredients'])
            
            # STEP 2: If not English, translate all recipe content
            if request.language and request.language != "en":
                logger.info(f"Translating recipes to {request.language}")
                recipes_data = await translate_recipes(recipes_data, request.language, api_key)
            
            # Validate and convert to Recipe objects
            recipes = []
            for recipe_dict in recipes_data:
                recipe = Recipe(
                    name=recipe_dict.get("name", "Unknown Recipe"),
                    description=recipe_dict.get("description", ""),
                    ingredients=recipe_dict.get("ingredients", []),
                    instructions=recipe_dict.get("instructions", []),
                    cookingTime=recipe_dict.get("cookingTime", 30),
                    servings=recipe_dict.get("servings", 2),
                    calories=recipe_dict.get("calories", 500),
                    protein=recipe_dict.get("protein", 20.0),
                    carbs=recipe_dict.get("carbs", 50.0),
                    fats=recipe_dict.get("fats", 15.0),
                    healthierOption=recipe_dict.get("healthierOption"),
                    countryOfOrigin=recipe_dict.get("countryOfOrigin"),
                    cuisine=recipe_dict.get("cuisine"),
                    requiresExtraIngredients=recipe_dict.get("requiresExtraIngredients", False),
                    extraIngredientsNeeded=recipe_dict.get("extraIngredientsNeeded", [])
                )
                recipes.append(recipe)
            
            return RecipeSuggestionsResponse(recipes=recipes)
            
        except Exception as e:
            logger.error(f"Failed to parse recipes: {e}")
            raise HTTPException(status_code=500, detail="Failed to parse recipe suggestions")
            
    except Exception as e:
        logger.error(f"Error getting recipe suggestions: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get recipe suggestions: {str(e)}")

# =============================================
# SMART INGREDIENTS & NOTIFICATIONS ENDPOINTS
# =============================================

@api_router.post("/users/{user_id}/ingredients")
async def save_user_ingredients(user_id: str, request: SaveIngredientsRequest):
    """Save or update user's available ingredients"""
    try:
        existing = await db.user_ingredients.find_one({"userId": user_id})
        
        if request.append and existing:
            # Append new ingredients (avoid duplicates)
            current_ingredients = set(existing.get("ingredients", []))
            new_ingredients = set(request.ingredients)
            merged = list(current_ingredients.union(new_ingredients))
            
            await db.user_ingredients.update_one(
                {"userId": user_id},
                {"$set": {"ingredients": merged, "lastUpdated": datetime.utcnow()}}
            )
            return {"success": True, "ingredients": merged, "count": len(merged)}
        else:
            # Replace all ingredients
            await db.user_ingredients.update_one(
                {"userId": user_id},
                {"$set": {
                    "userId": user_id,
                    "ingredients": request.ingredients,
                    "lastUpdated": datetime.utcnow()
                }},
                upsert=True
            )
            return {"success": True, "ingredients": request.ingredients, "count": len(request.ingredients)}
        
    except Exception as e:
        logger.error(f"Error saving ingredients: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to save ingredients: {str(e)}")

@api_router.get("/users/{user_id}/ingredients")
async def get_user_ingredients(user_id: str):
    """Get user's saved ingredients"""
    try:
        doc = await db.user_ingredients.find_one({"userId": user_id})
        if doc:
            return {
                "ingredients": doc.get("ingredients", []),
                "lastUpdated": doc.get("lastUpdated"),
                "count": len(doc.get("ingredients", []))
            }
        return {"ingredients": [], "lastUpdated": None, "count": 0}
        
    except Exception as e:
        logger.error(f"Error getting ingredients: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get ingredients: {str(e)}")

@api_router.delete("/users/{user_id}/ingredients")
async def clear_user_ingredients(user_id: str, ingredients_to_remove: Optional[List[str]] = None):
    """Clear all or specific ingredients"""
    try:
        if ingredients_to_remove:
            # Remove specific ingredients
            await db.user_ingredients.update_one(
                {"userId": user_id},
                {"$pull": {"ingredients": {"$in": ingredients_to_remove}}}
            )
        else:
            # Clear all
            await db.user_ingredients.update_one(
                {"userId": user_id},
                {"$set": {"ingredients": [], "lastUpdated": datetime.utcnow()}}
            )
        return {"success": True}
        
    except Exception as e:
        logger.error(f"Error clearing ingredients: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to clear ingredients: {str(e)}")

@api_router.post("/users/{user_id}/smart-notification")
async def get_smart_notification(user_id: str, request: SmartNotificationRequest):
    """
    Generate smart notification content based on:
    - User's nutritional goals
    - What they've eaten today
    - Their available ingredients
    """
    try:
        # Get user goals
        user = await db.users.find_one({"id": user_id})
        if not user or not user.get("goals"):
            return SmartNotificationResponse(
                message="Complete your profile to get personalized recommendations!",
                caloriesConsumed=0,
                caloriesRemaining=2000,
                proteinConsumed=0,
                proteinRemaining=100,
                suggestedRecipes=[],
                hasIngredients=False
            )
        
        goals = user["goals"]
        daily_calories = goals.get("dailyCalories", 2000)
        daily_protein = goals.get("dailyProtein", 100)
        goal_type = goals.get("goal", "maintain")
        
        # Get today's consumption
        today_start = datetime.combine(date.today(), datetime.min.time())
        today_end = datetime.combine(date.today(), datetime.max.time())
        
        meals_today = await db.meals.find({
            "userId": user_id,
            "timestamp": {"$gte": today_start, "$lte": today_end}
        }).to_list(100)
        
        calories_consumed = sum(meal.get("calories", 0) for meal in meals_today)
        protein_consumed = sum(meal.get("protein", 0) for meal in meals_today)
        carbs_consumed = sum(meal.get("carbs", 0) for meal in meals_today)
        fats_consumed = sum(meal.get("fats", 0) for meal in meals_today)
        
        calories_remaining = max(0, daily_calories - calories_consumed)
        protein_remaining = max(0, daily_protein - protein_consumed)
        
        # Get user's ingredients
        ingredients_doc = await db.user_ingredients.find_one({"userId": user_id})
        user_ingredients = ingredients_doc.get("ingredients", []) if ingredients_doc else []
        has_ingredients = len(user_ingredients) > 0
        
        # Generate smart recipe suggestions using AI
        suggested_recipes = []
        
        if has_ingredients and calories_remaining > 100:
            api_key = os.environ.get('EMERGENT_LLM_KEY')
            if api_key:
                try:
                    # Language setup
                    lang = request.language or "en"
                    lang_instruction = "Respond in Spanish." if lang == "es" else "Respond in English."
                    
                    goal_context = {
                        "lose": "losing weight (needs lower calorie, high protein options)",
                        "gain": "building muscle (needs high protein, adequate calories)",
                        "maintain": "maintaining weight (balanced nutrition)"
                    }.get(goal_type, "maintaining a balanced diet")
                    
                    chat = LlmChat(
                        api_key=api_key,
                        session_id=f"smart_notif_{user_id}",
                        system_message=f"""{lang_instruction}
                        You are a helpful nutrition assistant. Suggest 2-3 quick recipe NAMES ONLY (not full recipes) 
                        that the user can make with their available ingredients.
                        
                        User context:
                        - Goal: {goal_context}
                        - Needs approximately {calories_remaining} more calories today
                        - Needs approximately {protein_remaining}g more protein today
                        - Meal type: {request.mealType}
                        
                        Available ingredients: {', '.join(user_ingredients[:20])}
                        
                        Return ONLY a JSON array of recipe names, like: ["Recipe 1", "Recipe 2", "Recipe 3"]
                        Keep names short and appetizing. Consider the user's nutritional needs.
                        """
                    ).with_model("openai", "gpt-4o-mini")
                    
                    response = await chat.send_message(UserMessage(text="Suggest recipes"))
                    
                    # Parse response
                    import json
                    response_text = response.strip()
                    if "```json" in response_text:
                        response_text = response_text.split("```json")[1].split("```")[0].strip()
                    elif "```" in response_text:
                        response_text = response_text.split("```")[1].split("```")[0].strip()
                    
                    suggested_recipes = json.loads(response_text)
                    if not isinstance(suggested_recipes, list):
                        suggested_recipes = []
                    
                except Exception as e:
                    logger.error(f"Error generating recipe suggestions: {e}")
                    suggested_recipes = []
        
        # Build message based on language
        if request.language == "es":
            if request.mealType == "lunch":
                if calories_remaining > 500:
                    message = f"🍽️ ¡Hora del almuerzo! Hoy puedes consumir ~{calories_remaining} cal más."
                else:
                    message = f"🥗 ¡Hora del almuerzo! Ya casi alcanzas tu meta. Te quedan {calories_remaining} cal."
            else:  # dinner
                if calories_consumed == 0:
                    message = f"🌙 ¡Hora de cenar! Aún no registraste comidas hoy. Meta: {daily_calories} cal."
                elif calories_remaining > 300:
                    message = f"🌙 Consumiste {calories_consumed} cal hoy. Te faltan {calories_remaining} cal y {protein_remaining}g de proteína."
                else:
                    message = f"🌙 ¡Casi completas tu meta! Te quedan solo {calories_remaining} cal. Opta por algo ligero."
            
            if suggested_recipes:
                message += f" Con tus ingredientes podrías hacer: {', '.join(suggested_recipes[:2])}"
        else:
            if request.mealType == "lunch":
                if calories_remaining > 500:
                    message = f"🍽️ Lunch time! You can still have ~{calories_remaining} cal today."
                else:
                    message = f"🥗 Lunch time! You're close to your goal. {calories_remaining} cal remaining."
            else:  # dinner
                if calories_consumed == 0:
                    message = f"🌙 Dinner time! No meals logged today yet. Goal: {daily_calories} cal."
                elif calories_remaining > 300:
                    message = f"🌙 You've had {calories_consumed} cal today. Still need {calories_remaining} cal and {protein_remaining}g protein."
                else:
                    message = f"🌙 Almost at your goal! Only {calories_remaining} cal left. Go for something light."
            
            if suggested_recipes:
                message += f" With your ingredients you could make: {', '.join(suggested_recipes[:2])}"
        
        return SmartNotificationResponse(
            message=message,
            caloriesConsumed=calories_consumed,
            caloriesRemaining=calories_remaining,
            proteinConsumed=protein_consumed,
            proteinRemaining=protein_remaining,
            suggestedRecipes=suggested_recipes,
            hasIngredients=has_ingredients
        )
        
    except Exception as e:
        logger.error(f"Error generating smart notification: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate notification: {str(e)}")

@api_router.get("/users/{user_id}/nutrition-summary")
async def get_nutrition_summary(user_id: str):
    """Get comprehensive nutrition summary for today vs goals"""
    try:
        # Get user goals
        user = await db.users.find_one({"id": user_id})
        goals = user.get("goals", {}) if user else {}
        
        # Get today's consumption
        today_start = datetime.combine(date.today(), datetime.min.time())
        today_end = datetime.combine(date.today(), datetime.max.time())
        
        meals_today = await db.meals.find({
            "userId": user_id,
            "timestamp": {"$gte": today_start, "$lte": today_end}
        }).to_list(100)
        
        consumed = {
            "calories": sum(meal.get("calories", 0) for meal in meals_today),
            "protein": sum(meal.get("protein", 0) for meal in meals_today),
            "carbs": sum(meal.get("carbs", 0) for meal in meals_today),
            "fats": sum(meal.get("fats", 0) for meal in meals_today),
        }
        
        daily_goals = {
            "calories": goals.get("dailyCalories", 2000),
            "protein": goals.get("dailyProtein", 100),
            "carbs": goals.get("dailyCarbs", 250),
            "fats": goals.get("dailyFats", 65),
        }
        
        remaining = {
            "calories": max(0, daily_goals["calories"] - consumed["calories"]),
            "protein": max(0, daily_goals["protein"] - consumed["protein"]),
            "carbs": max(0, daily_goals["carbs"] - consumed["carbs"]),
            "fats": max(0, daily_goals["fats"] - consumed["fats"]),
        }
        
        # Calculate percentages
        percentages = {
            "calories": min(100, int((consumed["calories"] / daily_goals["calories"]) * 100)) if daily_goals["calories"] > 0 else 0,
            "protein": min(100, int((consumed["protein"] / daily_goals["protein"]) * 100)) if daily_goals["protein"] > 0 else 0,
            "carbs": min(100, int((consumed["carbs"] / daily_goals["carbs"]) * 100)) if daily_goals["carbs"] > 0 else 0,
            "fats": min(100, int((consumed["fats"] / daily_goals["fats"]) * 100)) if daily_goals["fats"] > 0 else 0,
        }
        
        return {
            "consumed": consumed,
            "goals": daily_goals,
            "remaining": remaining,
            "percentages": percentages,
            "mealCount": len(meals_today),
            "userGoal": goals.get("goal", "maintain")
        }
        
    except Exception as e:
        logger.error(f"Error getting nutrition summary: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get nutrition summary: {str(e)}")

# =============================================
# RECIPE SEARCH ENDPOINT
# =============================================

class RecipeSearchRequest(BaseModel):
    query: str
    userIngredients: Optional[List[str]] = []
    language: Optional[str] = "es"

@api_router.post("/search-recipes")
async def search_recipes(request: RecipeSearchRequest):
    """
    Search for recipes by name and rank by ingredient match
    Returns recipes sorted by how many ingredients the user already has
    """
    try:
        logger.info(f"Searching recipes for: {request.query}")
        
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            raise HTTPException(status_code=500, detail="API key not configured")
        
        # Language setup
        lang = request.language or "es"
        lang_instruction = "Respond ONLY in Spanish." if lang == "es" else "Respond ONLY in English."
        
        chat = LlmChat(
            api_key=api_key,
            session_id=f"recipe_search_{request.query[:20]}",
            system_message=f"""{lang_instruction}
            
            You are a culinary expert helping users find recipes.
            When given a search query, generate 8 relevant recipes.
            
            Each recipe must include:
            - id: unique string ID (use snake_case like "chicken_rice_123")
            - name: Recipe name
            - description: Brief appetizing description (1-2 sentences)
            - ingredients: List of ingredients with quantities (simple strings)
            - instructions: Step-by-step cooking instructions (array of clear steps)
            - cookingTime: Total time in minutes
            - servings: Number of servings
            - calories: Estimated calories per serving
            - protein: Protein in grams per serving
            - carbs: Carbohydrates in grams per serving
            - fats: Fats in grams per serving
            - countryOfOrigin: Country where this dish originates
            - cuisine: Type of cuisine
            
            Return ONLY a JSON array of 8 recipes. No explanations.
            """
        ).with_model("openai", "gpt-4o")
        
        user_message = UserMessage(
            text=f"Find 8 recipes matching this search: '{request.query}'. Return as JSON array."
        )
        
        response = await chat.send_message(user_message)
        
        import json
        try:
            response_text = response.strip()
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0].strip()
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0].strip()
            
            recipes_data = json.loads(response_text)
            
            # Calculate ingredient match for each recipe
            user_ingredients_lower = [ing.lower().strip() for ing in request.userIngredients]
            
            for recipe in recipes_data:
                recipe_ingredients = recipe.get("ingredients", [])
                matching_count = 0
                missing_ingredients = []
                
                for ing in recipe_ingredients:
                    ing_lower = ing.lower()
                    found = False
                    for user_ing in user_ingredients_lower:
                        if user_ing in ing_lower or ing_lower in user_ing:
                            found = True
                            matching_count += 1
                            break
                    if not found:
                        # Extract just the main ingredient name for missing list
                        missing_ingredients.append(ing)
                
                total_ingredients = len(recipe_ingredients)
                recipe["matchCount"] = matching_count
                recipe["totalIngredients"] = total_ingredients
                recipe["matchPercentage"] = round((matching_count / total_ingredients * 100) if total_ingredients > 0 else 0)
                recipe["missingIngredients"] = missing_ingredients[:5]  # Limit to 5 for UI
            
            # Sort by match percentage (highest first)
            recipes_data.sort(key=lambda r: r.get("matchPercentage", 0), reverse=True)
            
            return {"recipes": recipes_data, "query": request.query}
            
        except Exception as e:
            logger.error(f"Failed to parse recipe search: {e}")
            raise HTTPException(status_code=500, detail="Failed to parse recipe search results")
            
    except Exception as e:
        logger.error(f"Error searching recipes: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to search recipes: {str(e)}")

# =============================================
# FOOD/DRINK SEARCH ENDPOINT (AI-powered)
# =============================================

class FoodSearchRequest(BaseModel):
    query: str
    language: Optional[str] = "es"

@api_router.post("/search-food")
async def search_food(request: FoodSearchRequest):
    """
    Search for any food or drink and get nutritional information
    Uses AI to find accurate nutrition data for anything
    """
    try:
        logger.info(f"Searching food/drink: {request.query}")
        
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            raise HTTPException(status_code=500, detail="API key not configured")
        
        lang = request.language or "es"
        lang_instruction = "Respond ONLY in Spanish." if lang == "es" else "Respond ONLY in English."
        
        chat = LlmChat(
            api_key=api_key,
            session_id=f"food_search_{request.query[:20]}",
            system_message=f"""{lang_instruction}
            
            You are a nutrition expert database. When given a food or drink search query,
            return nutritional information for matching items.
            
            Return 5-8 matching foods/drinks as a JSON array. Each item must have:
            - id: unique string ID (snake_case)
            - name: Name of the food/drink
            - category: Category (fruit, vegetable, protein, dairy, drink, dessert, snack, fast_food, prepared_dish, etc)
            - description: Brief description (1 sentence)
            - serving_size: Standard serving description (e.g., "1 medium apple", "1 glass (250ml)", "1 slice")
            - serving_unit: The unit type ("unit", "glass", "ml", "g", "slice", "cup", "plate")
            - is_drink: true if it's a beverage, false otherwise
            - calories: Calories per serving
            - protein: Protein in grams per serving
            - carbs: Carbohydrates in grams per serving
            - fats: Fats in grams per serving
            - fiber: Fiber in grams (0 for drinks)
            - sugar: Sugar in grams per serving
            - icon: A single relevant emoji for the item
            
            For drinks:
            - Use "glass" or "ml" as serving_unit
            - Default serving is 1 glass (250ml)
            - Include alcohol content info in description if applicable
            
            Be accurate with nutritional values. Use real data.
            Return ONLY the JSON array, no explanations.
            """
        ).with_model("openai", "gpt-4o")
        
        user_message = UserMessage(
            text=f"Find nutritional information for: '{request.query}'. Return as JSON array."
        )
        
        response = await chat.send_message(user_message)
        
        import json
        try:
            response_text = response.strip()
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0].strip()
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0].strip()
            
            foods_data = json.loads(response_text)
            
            return {"foods": foods_data, "query": request.query}
            
        except Exception as e:
            logger.error(f"Failed to parse food search: {e}")
            raise HTTPException(status_code=500, detail="Failed to parse food search results")
            
    except Exception as e:
        logger.error(f"Error searching food: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to search food: {str(e)}")

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()