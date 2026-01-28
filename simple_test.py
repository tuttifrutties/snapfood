#!/usr/bin/env python3
"""
Simple SnapFood Backend Test
Tests the main endpoints requested in the review
"""

import requests
import json
import time
from datetime import datetime

# Backend URL from frontend .env
BACKEND_URL = "https://recipe-ai-39.preview.emergentagent.com/api"

# Simple base64 image (1x1 pixel PNG)
SAMPLE_IMAGE = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="

def test_server_health():
    """Test if server is responding"""
    print("🌐 Testing server connectivity...")
    try:
        response = requests.get(f"{BACKEND_URL}/", timeout=10)
        if response.status_code == 200:
            print("✅ Server is responding")
            return True
        else:
            print(f"❌ Server returned {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Server connection failed: {e}")
        return False

def test_meals_endpoint():
    """Test POST /api/meals"""
    print("\n🍽️ Testing POST /api/meals...")
    
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
    
    try:
        response = requests.post(f"{BACKEND_URL}/meals", json=payload, timeout=30)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Meals endpoint working - Meal ID: {data.get('mealId', 'N/A')}")
            return True
        else:
            print(f"❌ Meals endpoint failed: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"❌ Meals endpoint error: {e}")
        return False

def test_recipe_suggestions():
    """Test POST /api/recipe-suggestions with NEW fields"""
    print("\n🍳 Testing POST /api/recipe-suggestions...")
    
    # Test basic functionality
    payload_basic = {
        "userId": "test-snapfood-123",
        "ingredients": ["chicken", "rice"],
        "language": "es"
    }
    
    try:
        response = requests.post(f"{BACKEND_URL}/recipe-suggestions", json=payload_basic, timeout=60)
        if response.status_code == 200:
            print("✅ Basic recipe suggestions working")
        else:
            print(f"❌ Basic recipe suggestions failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Basic recipe suggestions error: {e}")
        return False
    
    # Test NEW healthConditions field
    payload_health = {
        "userId": "test-snapfood-123",
        "ingredients": ["chicken", "rice"],
        "language": "es",
        "healthConditions": ["diabetes", "hypertension"]
    }
    
    try:
        response = requests.post(f"{BACKEND_URL}/recipe-suggestions", json=payload_health, timeout=60)
        if response.status_code == 200:
            print("✅ NEW healthConditions field accepted")
        else:
            print(f"❌ healthConditions field failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ healthConditions field error: {e}")
        return False
    
    # Test NEW foodAllergies field
    payload_allergies = {
        "userId": "test-snapfood-123",
        "ingredients": ["chicken", "rice"],
        "language": "es",
        "foodAllergies": ["peanuts", "eggs"]
    }
    
    try:
        response = requests.post(f"{BACKEND_URL}/recipe-suggestions", json=payload_allergies, timeout=60)
        if response.status_code == 200:
            print("✅ NEW foodAllergies field accepted")
        else:
            print(f"❌ foodAllergies field failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ foodAllergies field error: {e}")
        return False
    
    # Test BOTH new fields together
    payload_both = {
        "userId": "test-snapfood-123",
        "ingredients": ["chicken", "rice"],
        "language": "es",
        "healthConditions": ["diabetes"],
        "foodAllergies": ["peanuts"]
    }
    
    try:
        response = requests.post(f"{BACKEND_URL}/recipe-suggestions", json=payload_both, timeout=60)
        if response.status_code == 200:
            print("✅ BOTH new fields working together")
            return True
        else:
            print(f"❌ Both fields together failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Both fields together error: {e}")
        return False

def test_search_food():
    """Test POST /api/search-food"""
    print("\n🔍 Testing POST /api/search-food...")
    
    payload = {
        "query": "apple",
        "language": "en"
    }
    
    try:
        response = requests.post(f"{BACKEND_URL}/search-food", json=payload, timeout=30)
        if response.status_code == 200:
            data = response.json()
            foods = data.get("foods", [])
            print(f"✅ Search food working - Found {len(foods)} items")
            return True
        else:
            print(f"❌ Search food failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Search food error: {e}")
        return False

def test_analyze_ingredients():
    """Test POST /api/analyze-ingredients"""
    print("\n🔬 Testing POST /api/analyze-ingredients...")
    
    payload = {
        "userId": "test-snapfood-123",
        "imageBase64": SAMPLE_IMAGE,
        "language": "es"
    }
    
    try:
        response = requests.post(f"{BACKEND_URL}/analyze-ingredients", json=payload, timeout=30)
        if response.status_code == 200:
            data = response.json()
            ingredients = data.get("ingredients", [])
            print(f"✅ Analyze ingredients working - Found {len(ingredients)} ingredients")
            return True
        else:
            print(f"❌ Analyze ingredients failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Analyze ingredients error: {e}")
        return False

def test_search_recipes():
    """Test POST /api/search-recipes"""
    print("\n📖 Testing POST /api/search-recipes...")
    
    payload = {
        "query": "chicken rice",
        "userIngredients": ["chicken", "rice"],
        "language": "en"
    }
    
    try:
        response = requests.post(f"{BACKEND_URL}/search-recipes", json=payload, timeout=30)
        if response.status_code == 200:
            data = response.json()
            recipes = data.get("recipes", [])
            print(f"✅ Search recipes working - Found {len(recipes)} recipes")
            return True
        else:
            print(f"❌ Search recipes failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Search recipes error: {e}")
        return False

def main():
    """Run all tests"""
    print("🧪 SNAPFOOD BACKEND TESTING")
    print("=" * 50)
    print(f"Backend URL: {BACKEND_URL}")
    print("=" * 50)
    
    results = {}
    
    # Test all endpoints
    results['server'] = test_server_health()
    results['meals'] = test_meals_endpoint()
    results['recipe_suggestions'] = test_recipe_suggestions()
    results['search_food'] = test_search_food()
    results['analyze_ingredients'] = test_analyze_ingredients()
    results['search_recipes'] = test_search_recipes()
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 TEST SUMMARY")
    print("=" * 50)
    
    passed = sum(1 for result in results.values() if result)
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} {test_name.replace('_', ' ').title()}")
    
    print(f"\nResult: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 ALL SNAPFOOD ENDPOINTS WORKING!")
        print("✅ Server responding on port 8001")
        print("✅ No 500 errors detected")
        print("✅ NEW healthConditions and foodAllergies fields accepted")
    else:
        print("⚠️ Some endpoints have issues")
    
    return passed == total

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)