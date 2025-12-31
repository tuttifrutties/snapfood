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
    timestamp: datetime = Field(default_factory=datetime.utcnow)
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

class AnalyzeFoodResponse(BaseModel):
    dishName: str
    ingredients: List[str]
    calories: int
    protein: float
    carbs: float
    fats: float
    portionSize: str
    warnings: List[str]

class SaveMealRequest(BaseModel):
    userId: str
    photoBase64: str
    dishName: str
    ingredients: List[str]
    calories: int
    protein: float
    carbs: float
    fats: float
    portionSize: str
    warnings: List[str]

class SetUserGoalsRequest(BaseModel):
    userId: str
    age: int
    height: float
    weight: float
    activityLevel: str
    goal: str

# Helper function to calculate daily calorie needs
def calculate_daily_needs(age: int, height: float, weight: float, activity_level: str, goal: str):
    # Basal Metabolic Rate (BMR) using Mifflin-St Jeor equation (simplified for average person)
    bmr = 10 * weight + 6.25 * height - 5 * age + 5  # Male formula (simplified)
    
    # Activity multipliers
    activity_multipliers = {
        "sedentary": 1.2,
        "light": 1.375,
        "moderate": 1.55,
        "active": 1.725,
        "very_active": 1.9
    }
    
    tdee = bmr * activity_multipliers.get(activity_level, 1.2)
    
    # Adjust based on goal
    if goal == "lose":
        daily_calories = int(tdee - 500)  # 500 calorie deficit
    elif goal == "gain":
        daily_calories = int(tdee + 500)  # 500 calorie surplus
    else:
        daily_calories = int(tdee)
    
    # Protein: 1.6g per kg for muscle building, 0.8g for maintenance
    daily_protein = int(weight * 1.6) if goal == "gain" else int(weight * 1.0)
    
    return daily_calories, daily_protein

# Routes
@api_router.get("/")
async def root():
    return {"message": "FoodSnap API"}

@api_router.post("/analyze-food")
async def analyze_food(request: AnalyzeFoodRequest):
    """Analyze food image using OpenAI GPT-4 Vision"""
    try:
        logger.info(f"Analyzing food for user: {request.userId}")
        
        # Initialize LLM chat with OpenAI GPT-4 Vision
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            raise HTTPException(status_code=500, detail="API key not configured")
        
        chat = LlmChat(
            api_key=api_key,
            session_id=f"food_analysis_{request.userId}",
            system_message="""You are a professional nutritionist AI that analyzes food photos. 
            Provide accurate estimates of:
            - Dish name
            - Main ingredients (list of 3-5 items)
            - Total calories (reasonable estimate)
            - Protein (in grams)
            - Carbohydrates (in grams)
            - Fats (in grams)
            - Portion size (small/medium/large)
            - Health warnings if any (high calories, high fat, low protein, etc.)
            
            Return your response in this EXACT JSON format:
            {
              "dishName": "Name of the dish",
              "ingredients": ["ingredient1", "ingredient2", "ingredient3"],
              "calories": 500,
              "protein": 25.5,
              "carbs": 40.0,
              "fats": 15.0,
              "portionSize": "medium",
              "warnings": ["High in sodium", "Low protein"]
            }
            
            Be realistic and accurate with estimates. If you can't identify the food clearly, say so in the dishName.
            """
        ).with_model("openai", "gpt-4o")
        
        # Create image content
        image_content = ImageContent(image_base64=request.imageBase64)
        
        # Send message with image
        user_message = UserMessage(
            text="Please analyze this food image and provide detailed nutrition information in the specified JSON format.",
            file_contents=[image_content]
        )
        
        response = await chat.send_message(user_message)
        
        # Parse the response
        import json
        try:
            # Try to extract JSON from response
            response_text = response.strip()
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0].strip()
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0].strip()
            
            nutrition_data = json.loads(response_text)
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
        meal = Meal(
            userId=request.userId,
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

@api_router.get("/meals/{user_id}")
async def get_user_meals(user_id: str, limit: int = 50):
    """Get meal history for a user"""
    try:
        meals = await db.meals.find(
            {"userId": user_id}
        ).sort("timestamp", -1).limit(limit).to_list(limit)
        
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
        daily_calories, daily_protein = calculate_daily_needs(
            request.age,
            request.height,
            request.weight,
            request.activityLevel,
            request.goal
        )
        
        goals = UserGoals(
            age=request.age,
            height=request.height,
            weight=request.weight,
            activityLevel=request.activityLevel,
            goal=request.goal,
            dailyCalories=daily_calories,
            dailyProtein=daily_protein
        )
        
        await db.users.update_one(
            {"id": user_id},
            {"$set": {"goals": goals.dict()}}
        )
        
        return {"success": True, "goals": goals.dict()}
        
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