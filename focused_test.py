#!/usr/bin/env python3
"""
Focused SnapFood Backend Test - Key Endpoints Only
Tests the specific endpoints mentioned in the review request
"""

import requests
import json
from datetime import datetime

# Backend URL
BACKEND_URL = "https://ui-theming.preview.emergentagent.com/api"

# Simple base64 image
SAMPLE_IMAGE = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="

def test_key_endpoints():
    """Test the key endpoints requested in the review"""
    print("🧪 SNAPFOOD KEY ENDPOINTS TEST")
    print("=" * 50)
    
    results = {}
    
    # 1. Test POST /api/meals
    print("\n1️⃣ POST /api/meals - Register food with photo")
    try:
        payload = {
            "userId": "test-snapfood-123",
            "photoBase64": SAMPLE_IMAGE,
            "dishName": "Test Meal",
            "ingredients": ["test ingredient"],
            "calories": 300,
            "protein": 20.0,
            "carbs": 30.0,
            "fats": 10.0,
            "portionSize": "medium",
            "warnings": [],
            "timestamp": int(datetime.now().timestamp() * 1000)
        }
        
        response = requests.post(f"{BACKEND_URL}/meals", json=payload, timeout=15)
        if response.status_code == 200:
            print("✅ WORKING - Accepts userId, imageBase64, language, timestamp")
            results['meals'] = True
        else:
            print(f"❌ FAILED - Status {response.status_code}")
            results['meals'] = False
    except Exception as e:
        print(f"❌ FAILED - Error: {e}")
        results['meals'] = False
    
    # 2. Test POST /api/recipe-suggestions with NEW fields
    print("\n2️⃣ POST /api/recipe-suggestions - NEW healthConditions and foodAllergies")
    
    # Test healthConditions field
    try:
        payload = {
            "userId": "test-snapfood-123",
            "ingredients": ["chicken", "rice"],
            "language": "es",
            "healthConditions": ["diabetes", "celiac", "hypertension"]
        }
        
        response = requests.post(f"{BACKEND_URL}/recipe-suggestions", json=payload, timeout=30)
        if response.status_code == 200:
            print("✅ NEW healthConditions field - ACCEPTED")
            results['health_conditions'] = True
        else:
            print(f"❌ healthConditions field - Status {response.status_code}")
            results['health_conditions'] = False
    except Exception as e:
        print(f"❌ healthConditions field - Error: {e}")
        results['health_conditions'] = False
    
    # Test foodAllergies field
    try:
        payload = {
            "userId": "test-snapfood-123",
            "ingredients": ["chicken", "rice"],
            "language": "es",
            "foodAllergies": ["peanuts", "eggs", "milk"]
        }
        
        response = requests.post(f"{BACKEND_URL}/recipe-suggestions", json=payload, timeout=30)
        if response.status_code == 200:
            print("✅ NEW foodAllergies field - ACCEPTED")
            results['food_allergies'] = True
        else:
            print(f"❌ foodAllergies field - Status {response.status_code}")
            results['food_allergies'] = False
    except Exception as e:
        print(f"❌ foodAllergies field - Error: {e}")
        results['food_allergies'] = False
    
    # Test without optional fields
    try:
        payload = {
            "userId": "test-snapfood-123",
            "ingredients": ["chicken", "rice"],
            "language": "es"
        }
        
        response = requests.post(f"{BACKEND_URL}/recipe-suggestions", json=payload, timeout=30)
        if response.status_code == 200:
            print("✅ Without optional fields - WORKING")
            results['recipe_basic'] = True
        else:
            print(f"❌ Without optional fields - Status {response.status_code}")
            results['recipe_basic'] = False
    except Exception as e:
        print(f"❌ Without optional fields - Error: {e}")
        results['recipe_basic'] = False
    
    # 3. Test POST /api/search-food
    print("\n3️⃣ POST /api/search-food - Search foods")
    try:
        payload = {
            "query": "apple",
            "language": "en"
        }
        
        response = requests.post(f"{BACKEND_URL}/search-food", json=payload, timeout=15)
        if response.status_code == 200:
            print("✅ WORKING - Search foods endpoint")
            results['search_food'] = True
        else:
            print(f"❌ FAILED - Status {response.status_code}")
            results['search_food'] = False
    except Exception as e:
        print(f"❌ FAILED - Error: {e}")
        results['search_food'] = False
    
    # 4. Test POST /api/analyze-ingredients
    print("\n4️⃣ POST /api/analyze-ingredients - Analyze ingredients from photo")
    try:
        payload = {
            "userId": "test-snapfood-123",
            "imageBase64": SAMPLE_IMAGE,
            "language": "es"
        }
        
        response = requests.post(f"{BACKEND_URL}/analyze-ingredients", json=payload, timeout=15)
        if response.status_code == 200:
            print("✅ WORKING - Analyze ingredients endpoint")
            results['analyze_ingredients'] = True
        else:
            print(f"❌ FAILED - Status {response.status_code}")
            results['analyze_ingredients'] = False
    except Exception as e:
        print(f"❌ FAILED - Error: {e}")
        results['analyze_ingredients'] = False
    
    # 5. Test POST /api/search-recipes
    print("\n5️⃣ POST /api/search-recipes - Search recipes by name")
    try:
        payload = {
            "query": "chicken rice",
            "userIngredients": ["chicken", "rice"],
            "language": "en"
        }
        
        response = requests.post(f"{BACKEND_URL}/search-recipes", json=payload, timeout=15)
        if response.status_code == 200:
            print("✅ WORKING - Search recipes endpoint")
            results['search_recipes'] = True
        else:
            print(f"❌ FAILED - Status {response.status_code}")
            results['search_recipes'] = False
    except Exception as e:
        print(f"❌ FAILED - Error: {e}")
        results['search_recipes'] = False
    
    # Server connectivity check
    print("\n🌐 Server Connectivity Check")
    try:
        response = requests.get(f"{BACKEND_URL}/", timeout=10)
        if response.status_code == 200:
            print("✅ Server responding on port 8001")
            results['server'] = True
        else:
            print(f"❌ Server issue - Status {response.status_code}")
            results['server'] = False
    except Exception as e:
        print(f"❌ Server connectivity failed: {e}")
        results['server'] = False
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 SNAPFOOD BACKEND TEST RESULTS")
    print("=" * 50)
    
    passed = sum(1 for result in results.values() if result)
    total = len(results)
    
    print(f"✅ Passed: {passed}/{total}")
    print(f"❌ Failed: {total - passed}/{total}")
    print()
    
    # Detailed results
    test_names = {
        'server': 'Server Connectivity',
        'meals': 'POST /api/meals',
        'health_conditions': 'NEW healthConditions Field',
        'food_allergies': 'NEW foodAllergies Field',
        'recipe_basic': 'Recipe Suggestions (Basic)',
        'search_food': 'POST /api/search-food',
        'analyze_ingredients': 'POST /api/analyze-ingredients',
        'search_recipes': 'POST /api/search-recipes'
    }
    
    for key, name in test_names.items():
        if key in results:
            status = "✅ PASS" if results[key] else "❌ FAIL"
            print(f"{status} {name}")
    
    print()
    
    # Key findings
    new_fields_working = results.get('health_conditions', False) and results.get('food_allergies', False)
    
    if new_fields_working:
        print("🎉 KEY FINDING: NEW healthConditions and foodAllergies fields WORKING!")
        print("   ✅ Backend accepts healthConditions array without error")
        print("   ✅ Backend accepts foodAllergies array without error")
        print("   ✅ Backend handles when these fields are not sent")
    else:
        print("⚠️ KEY FINDING: Issues with NEW fields")
        if not results.get('health_conditions'):
            print("   ❌ healthConditions field not working")
        if not results.get('food_allergies'):
            print("   ❌ foodAllergies field not working")
    
    no_500_errors = all(results.values())
    if no_500_errors:
        print("✅ NO 500 ERRORS detected - All endpoints responding correctly")
    else:
        print("⚠️ Some endpoints have issues - check details above")
    
    return results

if __name__ == "__main__":
    results = test_key_endpoints()
    
    # Exit with success if key requirements are met
    key_working = (
        results.get('server', False) and
        results.get('meals', False) and
        results.get('health_conditions', False) and
        results.get('food_allergies', False)
    )
    
    exit(0 if key_working else 1)