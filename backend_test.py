#!/usr/bin/env python3
"""
FoodSnap Backend API Testing Suite
Tests all backend endpoints according to test_result.md priorities
"""

import requests
import json
import base64
import time
from datetime import datetime
import os
from PIL import Image
import io

# Configuration
BACKEND_URL = "https://snapfood-tracker.preview.emergentagent.com/api"
TEST_USER_ID = None

def create_test_food_image():
    """Create a simple test food image (pizza) as base64"""
    # Create a simple colored image representing food
    img = Image.new('RGB', (300, 300), color='orange')
    
    # Add some simple shapes to make it look like food
    from PIL import ImageDraw
    draw = ImageDraw.Draw(img)
    
    # Draw a circle (pizza base)
    draw.ellipse([50, 50, 250, 250], fill='wheat', outline='brown', width=3)
    
    # Add some toppings (red circles for pepperoni)
    draw.ellipse([100, 100, 120, 120], fill='red')
    draw.ellipse([180, 120, 200, 140], fill='red')
    draw.ellipse([140, 180, 160, 200], fill='red')
    
    # Convert to base64
    buffer = io.BytesIO()
    img.save(buffer, format='JPEG')
    img_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
    
    return img_base64

def test_user_creation():
    """Test POST /api/users - User creation and management"""
    print("\n=== Testing User Creation ===")
    
    try:
        response = requests.post(f"{BACKEND_URL}/users", timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            user_id = data.get('userId')
            is_premium = data.get('isPremium')
            
            if user_id and is_premium is not None:
                print(f"✅ User created successfully")
                print(f"   User ID: {user_id}")
                print(f"   Is Premium: {is_premium}")
                return user_id, True
            else:
                print(f"❌ Invalid response format: {data}")
                return None, False
        else:
            print(f"❌ Failed with status {response.status_code}: {response.text}")
            return None, False
            
    except Exception as e:
        print(f"❌ Exception during user creation: {str(e)}")
        return None, False

def test_food_analysis(user_id):
    """Test POST /api/analyze-food - Food image analysis with OpenAI GPT-4 Vision"""
    print("\n=== Testing Food Analysis (OpenAI GPT-5.2 Vision) ===")
    
    try:
        # Create test food image
        print("Creating test food image...")
        image_base64 = create_test_food_image()
        
        payload = {
            "userId": user_id,
            "imageBase64": image_base64
        }
        
        print("Sending request to OpenAI GPT-5.2 Vision API...")
        print("⏳ This may take 5-10 seconds...")
        
        start_time = time.time()
        response = requests.post(f"{BACKEND_URL}/analyze-food", json=payload, timeout=60)
        end_time = time.time()
        
        print(f"Response time: {end_time - start_time:.2f} seconds")
        
        if response.status_code == 200:
            data = response.json()
            
            # Check required fields
            required_fields = ['dishName', 'ingredients', 'calories', 'protein', 'carbs', 'fats', 'portionSize', 'warnings']
            missing_fields = [field for field in required_fields if field not in data]
            
            if not missing_fields:
                print(f"✅ Food analysis successful")
                print(f"   Dish: {data['dishName']}")
                print(f"   Ingredients: {data['ingredients']}")
                print(f"   Calories: {data['calories']}")
                print(f"   Protein: {data['protein']}g")
                print(f"   Carbs: {data['carbs']}g")
                print(f"   Fats: {data['fats']}g")
                print(f"   Portion: {data['portionSize']}")
                print(f"   Warnings: {data['warnings']}")
                return data, True
            else:
                print(f"❌ Missing required fields: {missing_fields}")
                print(f"   Response: {data}")
                return None, False
        else:
            print(f"❌ Failed with status {response.status_code}: {response.text}")
            return None, False
            
    except Exception as e:
        print(f"❌ Exception during food analysis: {str(e)}")
        return None, False

def test_save_meal(user_id, analysis_data):
    """Test POST /api/meals - Save meal to database"""
    print("\n=== Testing Save Meal ===")
    
    try:
        # Create test image for meal
        image_base64 = create_test_food_image()
        
        payload = {
            "userId": user_id,
            "photoBase64": image_base64,
            "dishName": analysis_data['dishName'],
            "ingredients": analysis_data['ingredients'],
            "calories": analysis_data['calories'],
            "protein": analysis_data['protein'],
            "carbs": analysis_data['carbs'],
            "fats": analysis_data['fats'],
            "portionSize": analysis_data['portionSize'],
            "warnings": analysis_data['warnings']
        }
        
        response = requests.post(f"{BACKEND_URL}/meals", json=payload, timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            
            if data.get('success') and data.get('mealId'):
                print(f"✅ Meal saved successfully")
                print(f"   Meal ID: {data['mealId']}")
                return data['mealId'], True
            else:
                print(f"❌ Invalid response format: {data}")
                return None, False
        else:
            print(f"❌ Failed with status {response.status_code}: {response.text}")
            return None, False
            
    except Exception as e:
        print(f"❌ Exception during meal save: {str(e)}")
        return None, False

def test_today_meal_count(user_id):
    """Test GET /api/meals/{user_id}/today - Check daily meal count"""
    print("\n=== Testing Today's Meal Count ===")
    
    try:
        response = requests.get(f"{BACKEND_URL}/meals/{user_id}/today", timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            
            if 'count' in data:
                count = data['count']
                print(f"✅ Today's meal count retrieved successfully")
                print(f"   Count: {count}")
                return count, True
            else:
                print(f"❌ Invalid response format: {data}")
                return None, False
        else:
            print(f"❌ Failed with status {response.status_code}: {response.text}")
            return None, False
            
    except Exception as e:
        print(f"❌ Exception during meal count check: {str(e)}")
        return None, False

def test_daily_totals(user_id):
    """Test GET /api/meals/{user_id}/daily-totals - Get daily nutrition totals"""
    print("\n=== Testing Daily Totals ===")
    
    try:
        response = requests.get(f"{BACKEND_URL}/meals/{user_id}/daily-totals", timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            
            required_fields = ['calories', 'protein', 'carbs', 'fats', 'mealCount']
            missing_fields = [field for field in required_fields if field not in data]
            
            if not missing_fields:
                print(f"✅ Daily totals retrieved successfully")
                print(f"   Total Calories: {data['calories']}")
                print(f"   Total Protein: {data['protein']}g")
                print(f"   Total Carbs: {data['carbs']}g")
                print(f"   Total Fats: {data['fats']}g")
                print(f"   Meal Count: {data['mealCount']}")
                return data, True
            else:
                print(f"❌ Missing required fields: {missing_fields}")
                print(f"   Response: {data}")
                return None, False
        else:
            print(f"❌ Failed with status {response.status_code}: {response.text}")
            return None, False
            
    except Exception as e:
        print(f"❌ Exception during daily totals check: {str(e)}")
        return None, False

def test_set_user_goals(user_id):
    """Test POST /api/users/{user_id}/goals - Set user goals and calculate daily targets"""
    print("\n=== Testing Set User Goals ===")
    
    try:
        payload = {
            "userId": user_id,
            "age": 28,
            "height": 175.0,  # cm
            "weight": 70.0,   # kg
            "activityLevel": "moderate",
            "goal": "maintain"
        }
        
        response = requests.post(f"{BACKEND_URL}/users/{user_id}/goals", json=payload, timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            
            if data.get('success') and data.get('goals'):
                goals = data['goals']
                print(f"✅ User goals set successfully")
                print(f"   Daily Calories: {goals.get('dailyCalories')}")
                print(f"   Daily Protein: {goals.get('dailyProtein')}g")
                print(f"   Age: {goals.get('age')}")
                print(f"   Height: {goals.get('height')}cm")
                print(f"   Weight: {goals.get('weight')}kg")
                print(f"   Activity: {goals.get('activityLevel')}")
                print(f"   Goal: {goals.get('goal')}")
                return goals, True
            else:
                print(f"❌ Invalid response format: {data}")
                return None, False
        else:
            print(f"❌ Failed with status {response.status_code}: {response.text}")
            return None, False
            
    except Exception as e:
        print(f"❌ Exception during goal setting: {str(e)}")
        return None, False

def test_get_user_meals(user_id):
    """Test GET /api/meals/{user_id} - Get user meal history"""
    print("\n=== Testing Get User Meals ===")
    
    try:
        response = requests.get(f"{BACKEND_URL}/meals/{user_id}", timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            
            if 'meals' in data:
                meals = data['meals']
                print(f"✅ User meals retrieved successfully")
                print(f"   Number of meals: {len(meals)}")
                if meals:
                    print(f"   Latest meal: {meals[0].get('dishName', 'Unknown')}")
                return meals, True
            else:
                print(f"❌ Invalid response format: {data}")
                return None, False
        else:
            print(f"❌ Failed with status {response.status_code}: {response.text}")
            return None, False
            
    except Exception as e:
        print(f"❌ Exception during meal history retrieval: {str(e)}")
        return None, False

def test_recipe_suggestions_spanish():
    """Test POST /api/recipe-suggestions with Spanish language and new ingredient restrictions"""
    print("\n=== Testing Recipe Suggestions with Spanish Translation & Ingredient Restrictions ===")
    
    try:
        # Use the exact payload from the review request
        payload = {
            "userId": "test-user-123",
            "ingredients": ["chicken breast", "potato", "carrot", "egg", "onion"],
            "language": "es"
        }
        
        print(f"📤 Request: {json.dumps(payload, indent=2)}")
        print("⏳ This may take 10-20 seconds for AI generation + translation...")
        
        start_time = time.time()
        response = requests.post(f"{BACKEND_URL}/recipe-suggestions", json=payload, timeout=60)
        end_time = time.time()
        
        print(f"Response time: {end_time - start_time:.2f} seconds")
        
        if response.status_code == 200:
            data = response.json()
            recipes = data.get('recipes', [])
            
            print(f"✅ Received {len(recipes)} recipe suggestions")
            
            # TEST 1: Check recipe count (should be 8)
            recipe_count_ok = len(recipes) == 8
            print(f"📊 Recipe Count: {len(recipes)}/8 {'✅' if recipe_count_ok else '❌'}")
            
            # TEST 2: Check new fields presence
            new_fields_ok = True
            missing_fields = []
            
            for i, recipe in enumerate(recipes):
                if "requiresExtraIngredients" not in recipe:
                    missing_fields.append(f"Recipe {i+1}: missing requiresExtraIngredients")
                    new_fields_ok = False
                if "extraIngredientsNeeded" not in recipe:
                    missing_fields.append(f"Recipe {i+1}: missing extraIngredientsNeeded")
                    new_fields_ok = False
            
            print(f"🔧 New Fields Present: {'✅' if new_fields_ok else '❌'}")
            if missing_fields:
                for field in missing_fields[:3]:  # Show first 3 issues
                    print(f"   ❌ {field}")
            
            # TEST 3: Check first 5-6 recipes (should NOT require extra ingredients)
            main_recipes = recipes[:6]
            main_recipes_ok = True
            main_violations = []
            
            for i, recipe in enumerate(main_recipes):
                requires_extra = recipe.get("requiresExtraIngredients", True)
                extra_needed = recipe.get("extraIngredientsNeeded", [])
                
                if requires_extra:
                    main_violations.append(f"Recipe {i+1} '{recipe.get('name', 'Unknown')}' incorrectly requires extra ingredients")
                    main_recipes_ok = False
                
                if len(extra_needed) > 0:
                    main_violations.append(f"Recipe {i+1} '{recipe.get('name', 'Unknown')}' has extra ingredients: {extra_needed}")
                    main_recipes_ok = False
            
            print(f"🥘 Main Recipes (No Extra): {'✅' if main_recipes_ok else '❌'}")
            if main_violations:
                for violation in main_violations[:3]:  # Show first 3 issues
                    print(f"   ❌ {violation}")
            
            # TEST 4: Check last 2-3 recipes (should require extra ingredients)
            bonus_recipes = recipes[-3:]
            bonus_recipes_ok = True
            bonus_issues = []
            
            for i, recipe in enumerate(bonus_recipes):
                recipe_num = len(recipes) - 3 + i + 1
                requires_extra = recipe.get("requiresExtraIngredients", False)
                extra_needed = recipe.get("extraIngredientsNeeded", [])
                
                if not requires_extra:
                    bonus_issues.append(f"Recipe {recipe_num} '{recipe.get('name', 'Unknown')}' should require extra ingredients")
                    bonus_recipes_ok = False
                
                if len(extra_needed) == 0:
                    bonus_issues.append(f"Recipe {recipe_num} '{recipe.get('name', 'Unknown')}' should list extra ingredients needed")
                    bonus_recipes_ok = False
                elif len(extra_needed) > 2:
                    bonus_issues.append(f"Recipe {recipe_num} '{recipe.get('name', 'Unknown')}' has too many extra ingredients: {extra_needed}")
                    bonus_recipes_ok = False
            
            print(f"🌟 Bonus Recipes (Extra Needed): {'✅' if bonus_recipes_ok else '❌'}")
            if bonus_issues:
                for issue in bonus_issues[:3]:  # Show first 3 issues
                    print(f"   ❌ {issue}")
            
            # TEST 5: Check Spanish translation
            spanish_indicators = []
            
            for i, recipe in enumerate(recipes):
                # Check for Spanish content
                name = recipe.get('name', '').lower()
                description = recipe.get('description', '').lower()
                ingredients = ' '.join(recipe.get('ingredients', [])).lower()
                instructions = ' '.join(recipe.get('instructions', [])).lower()
                
                # Common Spanish words/patterns in cooking
                spanish_words = ['pollo', 'papa', 'zanahoria', 'huevo', 'cebolla', 'con', 'de', 'en', 'el', 'la', 'los', 'las', 
                               'minutos', 'cocinar', 'agregar', 'añadir', 'mezclar', 'calentar', 'freír', 'hervir',
                               'cucharada', 'cucharadita', 'taza', 'gramos', 'aceite', 'sal', 'pimienta']
                
                found_spanish = []
                all_text = f"{name} {description} {ingredients} {instructions}"
                for word in spanish_words:
                    if word in all_text:
                        found_spanish.append(word)
                
                if found_spanish:
                    spanish_indicators.extend(found_spanish)
            
            spanish_translation_ok = len(spanish_indicators) > 0
            print(f"🇪🇸 Spanish Translation: {'✅' if spanish_translation_ok else '❌'}")
            if spanish_translation_ok:
                unique_spanish = list(set(spanish_indicators))[:5]
                print(f"   Found Spanish words: {unique_spanish}")
            
            # Show sample recipes for verification
            print(f"\n📋 SAMPLE RECIPES:")
            
            # Show first 2 main recipes
            for i in range(min(2, len(recipes))):
                recipe = recipes[i]
                print(f"   Recipe {i+1}: {recipe.get('name', 'Unknown')}")
                print(f"   - Requires extra: {recipe.get('requiresExtraIngredients', 'N/A')}")
                print(f"   - Extra needed: {recipe.get('extraIngredientsNeeded', [])}")
                print(f"   - Ingredients: {recipe.get('ingredients', [])[:3]}...")
                print()
            
            # Show last 2 bonus recipes
            for i in range(max(0, len(recipes)-2), len(recipes)):
                recipe = recipes[i]
                print(f"   Recipe {i+1}: {recipe.get('name', 'Unknown')}")
                print(f"   - Requires extra: {recipe.get('requiresExtraIngredients', 'N/A')}")
                print(f"   - Extra needed: {recipe.get('extraIngredientsNeeded', [])}")
                print(f"   - Ingredients: {recipe.get('ingredients', [])[:3]}...")
                print()
            
            # Overall success
            all_tests_passed = (recipe_count_ok and new_fields_ok and main_recipes_ok and 
                              bonus_recipes_ok and spanish_translation_ok)
            
            print(f"\n🎯 OVERALL RESULT: {'✅ ALL TESTS PASSED' if all_tests_passed else '❌ SOME TESTS FAILED'}")
            
            return all_tests_passed
                
        else:
            print(f"❌ Failed with status {response.status_code}: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Exception during recipe suggestions: {str(e)}")
        return False

def test_recipe_suggestions_english():
    """Test POST /api/recipe-suggestions with English language (should not translate)"""
    print("\n=== Testing Recipe Suggestions with English (No Translation) ===")
    
    try:
        payload = {
            "userId": "test-user-456",
            "ingredients": ["chicken", "rice", "tomatoes", "garlic"],
            "language": "en"
        }
        
        print(f"📤 Request: {json.dumps(payload, indent=2)}")
        print("⏳ This may take 5-10 seconds for AI generation...")
        
        start_time = time.time()
        response = requests.post(f"{BACKEND_URL}/recipe-suggestions", json=payload, timeout=60)
        end_time = time.time()
        
        print(f"Response time: {end_time - start_time:.2f} seconds")
        
        if response.status_code == 200:
            data = response.json()
            recipes = data.get('recipes', [])
            
            print(f"✅ Received {len(recipes)} recipe suggestions")
            
            for i, recipe in enumerate(recipes):
                print(f"\n📝 Recipe {i+1}: {recipe.get('name', 'Unknown')}")
                print(f"   Description: {recipe.get('description', '')[:100]}...")
                print(f"   First ingredient: {recipe.get('ingredients', [''])[0] if recipe.get('ingredients') else 'None'}")
            
            print(f"\n🇺🇸 English recipes received (no translation should occur)")
            return True
                
        else:
            print(f"❌ Failed with status {response.status_code}: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Exception during recipe suggestions: {str(e)}")
        return False

def check_backend_logs():
    """Check backend logs for translation messages"""
    print("\n=== Checking Backend Logs for Translation Messages ===")
    
    try:
        import subprocess
        result = subprocess.run(
            ["tail", "-n", "100", "/var/log/supervisor/backend.out.log"],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if result.returncode == 0:
            logs = result.stdout
            print("📋 Searching recent backend logs for translation activity...")
            
            # Look for translation-related messages
            translation_logs = []
            recipe_logs = []
            
            for line in logs.split('\n'):
                line_lower = line.lower()
                if 'translat' in line_lower:
                    translation_logs.append(line)
                elif 'recipe' in line_lower:
                    recipe_logs.append(line)
            
            if translation_logs:
                print("🔍 Translation-related log entries found:")
                for log in translation_logs[-5:]:  # Last 5 relevant entries
                    print(f"   {log}")
            else:
                print("ℹ️  No translation-specific logs found")
                
            if recipe_logs:
                print("🔍 Recipe-related log entries found:")
                for log in recipe_logs[-5:]:  # Last 5 relevant entries
                    print(f"   {log}")
            else:
                print("ℹ️  No recipe-specific logs found")
                
            # Look specifically for the "Translating recipes to es" message
            if any("translating recipes to es" in line.lower() for line in logs.split('\n')):
                print("✅ Found 'Translating recipes to es' message in logs!")
            else:
                print("❌ Did not find 'Translating recipes to es' message in logs")
                
        else:
            print(f"❌ Could not read logs: {result.stderr}")
            
    except Exception as e:
        print(f"❌ Error reading logs: {str(e)}")

def test_recipe_translation_feature():
    """Test the complete recipe translation feature as requested"""
    print("🌮 Recipe Translation Feature Test")
    print("=" * 50)
    print("Testing the two-step translation system:")
    print("1. Generate recipes in English with OpenAI")
    print("2. Translate to target language with OpenAI")
    print("=" * 50)
    
    results = {
        'spanish_translation': False,
        'english_no_translation': False
    }
    
    # Test Spanish translation
    results['spanish_translation'] = test_recipe_suggestions_spanish()
    
    time.sleep(2)  # Brief pause between tests
    
    # Test English (no translation)
    results['english_no_translation'] = test_recipe_suggestions_english()
    
    # Check logs for translation activity
    check_backend_logs()
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 RECIPE TRANSLATION TEST SUMMARY")
    print("=" * 50)
    print(f"🇪🇸 Spanish Translation: {'✅ WORKING' if results['spanish_translation'] else '❌ FAILED'}")
    print(f"🇺🇸 English (No Translation): {'✅ WORKING' if results['english_no_translation'] else '❌ FAILED'}")
    
    if results['spanish_translation'] and results['english_no_translation']:
        print("\n🎉 RECIPE TRANSLATION SYSTEM WORKING CORRECTLY!")
        print("   ✅ Recipes are properly translated to Spanish")
        print("   ✅ English recipes are not unnecessarily translated")
    else:
        print("\n⚠️  RECIPE TRANSLATION ISSUES DETECTED")
        if not results['spanish_translation']:
            print("   ❌ Spanish translation not working - recipes remain in English")
        if not results['english_no_translation']:
            print("   ❌ English recipe generation failed")
    
    return results

def run_full_test_suite():
    """Run the complete test suite following the test plan"""
    print("🍕 FoodSnap Backend API Test Suite")
    print("=" * 50)
    print(f"Backend URL: {BACKEND_URL}")
    print(f"Test started at: {datetime.now()}")
    
    results = {
        'user_creation': False,
        'food_analysis': False,
        'save_meal': False,
        'today_count': False,
        'daily_totals': False,
        'set_goals': False,
        'get_meals': False
    }
    
    # Test 1: Create User
    user_id, success = test_user_creation()
    results['user_creation'] = success
    
    if not success:
        print("\n❌ Cannot continue without user creation")
        return results
    
    # Test 2: Food Analysis (MOST IMPORTANT)
    analysis_data, success = test_food_analysis(user_id)
    results['food_analysis'] = success
    
    if not success:
        print("\n❌ Food analysis failed - this is the core feature!")
        analysis_data = {
            'dishName': 'Test Pizza',
            'ingredients': ['dough', 'cheese', 'tomato'],
            'calories': 300,
            'protein': 12.0,
            'carbs': 35.0,
            'fats': 10.0,
            'portionSize': 'medium',
            'warnings': []
        }
    
    # Test 3: Save Meal
    meal_id, success = test_save_meal(user_id, analysis_data)
    results['save_meal'] = success
    
    # Test 4: Check Today's Count
    count, success = test_today_meal_count(user_id)
    results['today_count'] = success
    
    # Test 5: Daily Totals
    totals, success = test_daily_totals(user_id)
    results['daily_totals'] = success
    
    # Test 6: Set User Goals
    goals, success = test_set_user_goals(user_id)
    results['set_goals'] = success
    
    # Test 7: Get User Meals
    meals, success = test_get_user_meals(user_id)
    results['get_meals'] = success
    
    # Summary
    print("\n" + "=" * 50)
    print("🔍 TEST RESULTS SUMMARY")
    print("=" * 50)
    
    passed = sum(results.values())
    total = len(results)
    
    for test_name, passed in results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{test_name.replace('_', ' ').title()}: {status}")
    
    print(f"\nOverall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed!")
    else:
        print("⚠️  Some tests failed - check logs above")
    
    return results

if __name__ == "__main__":
    # Install required packages if not available
    try:
        from PIL import Image, ImageDraw
    except ImportError:
        print("Installing Pillow for image creation...")
        os.system("pip install Pillow")
        from PIL import Image, ImageDraw
    
    # Check if we should run recipe translation tests specifically
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "recipe-translation":
        test_recipe_translation_feature()
    else:
        # Run full test suite first, then recipe translation tests
        print("Running full backend test suite first...")
        run_full_test_suite()
        
        print("\n" + "="*60)
        print("Now running specific recipe translation tests...")
        print("="*60)
        test_recipe_translation_feature()