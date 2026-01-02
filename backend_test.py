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
BACKEND_URL = "https://caloriesnap-41.preview.emergentagent.com/api"
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
    
    run_full_test_suite()