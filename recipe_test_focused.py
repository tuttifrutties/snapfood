#!/usr/bin/env python3
"""
Focused Recipe Suggestions Test
Tests the specific endpoint as requested in the review
"""

import requests
import json
import time
from datetime import datetime

# Configuration
BACKEND_URL = "https://foodwisdom-5.preview.emergentagent.com/api"

def test_recipe_suggestions_endpoint():
    """Test the recipe suggestions endpoint with the exact payload from review request"""
    print("🧪 FOCUSED RECIPE SUGGESTIONS TEST")
    print("=" * 60)
    
    # Exact payload from review request
    test_payload = {
        "userId": "test-user-123",
        "ingredients": ["chicken breast", "potato", "carrot", "egg", "onion"],
        "language": "es"
    }
    
    print(f"📦 Testing POST /api/recipe-suggestions")
    print(f"📋 Payload: {json.dumps(test_payload, indent=2)}")
    print("⏱️  Expected: 10-20 seconds response time")
    print("🎯 Expected: 8 recipes with new fields")
    print()
    
    try:
        start_time = time.time()
        
        response = requests.post(
            f"{BACKEND_URL}/recipe-suggestions",
            json=test_payload,
            timeout=60
        )
        
        end_time = time.time()
        response_time = end_time - start_time
        
        print(f"⏱️  Response time: {response_time:.1f} seconds")
        
        if response.status_code != 200:
            print(f"❌ HTTP Error {response.status_code}")
            print(f"   Response: {response.text}")
            return False
        
        data = response.json()
        
        if "recipes" not in data:
            print(f"❌ Missing 'recipes' field in response")
            return False
        
        recipes = data["recipes"]
        recipe_count = len(recipes)
        
        print(f"📊 Recipe count: {recipe_count} (expected: 8)")
        
        # Test results tracking
        tests = {
            "recipe_count": recipe_count == 8,
            "new_fields_present": True,
            "main_recipes_correct": True,
            "bonus_recipes_correct": True,
            "spanish_translation": False
        }
        
        # Check new fields
        missing_fields = []
        for i, recipe in enumerate(recipes):
            if "requiresExtraIngredients" not in recipe:
                missing_fields.append(f"Recipe {i+1}: missing requiresExtraIngredients")
                tests["new_fields_present"] = False
            if "extraIngredientsNeeded" not in recipe:
                missing_fields.append(f"Recipe {i+1}: missing extraIngredientsNeeded")
                tests["new_fields_present"] = False
        
        print(f"🔧 New fields present: {'✅' if tests['new_fields_present'] else '❌'}")
        if missing_fields:
            for field in missing_fields[:3]:
                print(f"   {field}")
        
        # Check first 5-6 recipes (should NOT require extra ingredients)
        main_violations = []
        for i in range(min(6, len(recipes))):
            recipe = recipes[i]
            requires_extra = recipe.get("requiresExtraIngredients", True)
            extra_needed = recipe.get("extraIngredientsNeeded", [])
            
            if requires_extra:
                main_violations.append(f"Recipe {i+1} incorrectly requires extra ingredients")
                tests["main_recipes_correct"] = False
            
            if len(extra_needed) > 0:
                main_violations.append(f"Recipe {i+1} has unexpected extra ingredients: {extra_needed}")
                tests["main_recipes_correct"] = False
        
        print(f"🥘 Main recipes (no extra): {'✅' if tests['main_recipes_correct'] else '❌'}")
        if main_violations:
            for violation in main_violations[:2]:
                print(f"   {violation}")
        
        # Check last 2-3 recipes (should require extra ingredients)
        bonus_issues = []
        for i in range(max(0, len(recipes)-3), len(recipes)):
            recipe = recipes[i]
            requires_extra = recipe.get("requiresExtraIngredients", False)
            extra_needed = recipe.get("extraIngredientsNeeded", [])
            
            if not requires_extra:
                bonus_issues.append(f"Recipe {i+1} should require extra ingredients")
                tests["bonus_recipes_correct"] = False
            
            if len(extra_needed) == 0:
                bonus_issues.append(f"Recipe {i+1} should list extra ingredients")
                tests["bonus_recipes_correct"] = False
            elif len(extra_needed) > 2:
                bonus_issues.append(f"Recipe {i+1} has too many extra ingredients ({len(extra_needed)})")
                tests["bonus_recipes_correct"] = False
        
        print(f"🌟 Bonus recipes (extra needed): {'✅' if tests['bonus_recipes_correct'] else '❌'}")
        if bonus_issues:
            for issue in bonus_issues[:2]:
                print(f"   {issue}")
        
        # Check Spanish translation
        spanish_words = ['pollo', 'papa', 'zanahoria', 'huevo', 'cebolla', 'con', 'de', 'en', 'el', 'la', 
                        'minutos', 'cocinar', 'agregar', 'calentar', 'sal', 'pimienta', 'aceite']
        
        spanish_found = []
        for recipe in recipes:
            recipe_text = json.dumps(recipe, ensure_ascii=False).lower()
            for word in spanish_words:
                if word in recipe_text:
                    spanish_found.append(word)
        
        tests["spanish_translation"] = len(spanish_found) > 0
        print(f"🇪🇸 Spanish translation: {'✅' if tests['spanish_translation'] else '❌'}")
        if spanish_found:
            unique_spanish = list(set(spanish_found))[:5]
            print(f"   Found: {unique_spanish}")
        
        # Show sample recipes
        print(f"\n📋 SAMPLE RECIPES:")
        
        # First recipe
        if len(recipes) > 0:
            recipe = recipes[0]
            print(f"   Recipe 1: {recipe.get('name', 'Unknown')}")
            print(f"   - Requires extra: {recipe.get('requiresExtraIngredients', 'N/A')}")
            print(f"   - Extra needed: {recipe.get('extraIngredientsNeeded', [])}")
            print(f"   - Sample ingredients: {recipe.get('ingredients', [])[:3]}")
        
        # Last recipe
        if len(recipes) > 1:
            recipe = recipes[-1]
            print(f"   Recipe {len(recipes)}: {recipe.get('name', 'Unknown')}")
            print(f"   - Requires extra: {recipe.get('requiresExtraIngredients', 'N/A')}")
            print(f"   - Extra needed: {recipe.get('extraIngredientsNeeded', [])}")
            print(f"   - Sample ingredients: {recipe.get('ingredients', [])[:3]}")
        
        # Summary
        passed_tests = sum(tests.values())
        total_tests = len(tests)
        
        print(f"\n🎯 SUMMARY:")
        print(f"   Tests passed: {passed_tests}/{total_tests}")
        print(f"   Response time: {response_time:.1f}s (expected: 10-20s)")
        print(f"   Recipe count: {recipe_count} (expected: 8)")
        
        if passed_tests == total_tests:
            print(f"   🎉 ALL TESTS PASSED!")
        else:
            print(f"   ⚠️  Some tests failed")
        
        return passed_tests == total_tests
        
    except requests.exceptions.Timeout:
        print(f"❌ Request timed out after 60 seconds")
        return False
    except Exception as e:
        print(f"❌ Exception: {str(e)}")
        return False

def check_backend_status():
    """Check if backend is responding"""
    try:
        response = requests.get(f"{BACKEND_URL}/", timeout=10)
        if response.status_code == 200:
            print("✅ Backend is responding")
            return True
        else:
            print(f"❌ Backend returned {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Backend not accessible: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Starting Focused Recipe Suggestions Test")
    print(f"🔗 Backend: {BACKEND_URL}")
    print()
    
    # Check backend first
    if not check_backend_status():
        exit(1)
    
    # Run the test
    success = test_recipe_suggestions_endpoint()
    
    print("\n" + "=" * 60)
    print(f"🏁 TEST COMPLETE: {'SUCCESS' if success else 'FAILED'}")
    
    exit(0 if success else 1)