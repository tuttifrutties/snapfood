#!/usr/bin/env python3
"""
Focused test for Smart Portion Logic in /api/analyze-food endpoint
"""

import requests
import json
import base64
import os
from datetime import datetime

# Configuration
BACKEND_URL = "https://nutritrack-upgrade-1.preview.emergentagent.com/api"

def create_simple_test_image():
    """Create a minimal test image as base64"""
    # Simple 1x1 pixel PNG
    png_data = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\tpHYs\x00\x00\x0b\x13\x00\x00\x0b\x13\x01\x00\x9a\x9c\x18\x00\x00\x00\x0cIDATx\x9cc```\x00\x00\x00\x04\x00\x01\xdd\x8d\xb4\x1c\x00\x00\x00\x00IEND\xaeB`\x82'
    return base64.b64encode(png_data).decode('utf-8')

def test_smart_portion_endpoint():
    """Test the /api/analyze-food endpoint for smart portion fields"""
    print("🧪 Testing Smart Portion Logic in /api/analyze-food")
    print("=" * 60)
    
    test_image = create_simple_test_image()
    
    payload = {
        "userId": "test-user-123",
        "imageBase64": test_image,
        "language": "es"
    }
    
    print(f"📡 Making request to: {BACKEND_URL}/analyze-food")
    print(f"📊 Payload: userId={payload['userId']}, language={payload['language']}")
    print(f"🖼️ Image size: {len(test_image)} chars")
    print("⏳ Waiting for AI response...")
    
    try:
        response = requests.post(
            f"{BACKEND_URL}/analyze-food",
            json=payload,
            timeout=60
        )
        
        print(f"📈 Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            
            print("\n✅ SUCCESS - Analyzing response structure:")
            print("=" * 50)
            
            # Check basic fields
            basic_fields = ['dishName', 'ingredients', 'calories', 'protein', 'carbs', 'fats', 'portionSize', 'warnings']
            print("📋 BASIC FIELDS:")
            for field in basic_fields:
                if field in data:
                    print(f"   ✅ {field}: {data[field]}")
                else:
                    print(f"   ❌ {field}: MISSING")
            
            # Check NEW smart portion fields
            print("\n🆕 SMART PORTION FIELDS:")
            smart_fields = ['foodType', 'typicalServings', 'servingDescription', 'totalCalories']
            
            all_smart_present = True
            for field in smart_fields:
                if field in data:
                    print(f"   ✅ {field}: {data[field]} ({type(data[field]).__name__})")
                else:
                    print(f"   ❌ {field}: MISSING")
                    if field != 'totalCalories':  # totalCalories is optional
                        all_smart_present = False
            
            # Validate foodType values
            if 'foodType' in data:
                valid_types = ['shareable', 'container', 'single']
                if data['foodType'] in valid_types:
                    print(f"   ✅ foodType validation: PASSED")
                else:
                    print(f"   ❌ foodType validation: FAILED ('{data['foodType']}' not in {valid_types})")
                    all_smart_present = False
            
            # Check data types
            print("\n🔍 DATA TYPE VALIDATION:")
            if 'typicalServings' in data and not isinstance(data['typicalServings'], int):
                print(f"   ❌ typicalServings should be int, got {type(data['typicalServings'])}")
                all_smart_present = False
            else:
                print(f"   ✅ typicalServings type: OK")
            
            if 'foodType' in data and not isinstance(data['foodType'], str):
                print(f"   ❌ foodType should be string, got {type(data['foodType'])}")
                all_smart_present = False
            else:
                print(f"   ✅ foodType type: OK")
            
            if 'servingDescription' in data and not isinstance(data['servingDescription'], str):
                print(f"   ❌ servingDescription should be string, got {type(data['servingDescription'])}")
                all_smart_present = False
            else:
                print(f"   ✅ servingDescription type: OK")
            
            # Final assessment
            print("\n" + "=" * 50)
            if all_smart_present:
                print("🎉 SMART PORTION LOGIC: ✅ WORKING")
                print("   All required fields present with correct types")
                return True
            else:
                print("❌ SMART PORTION LOGIC: FAILED")
                print("   Missing or invalid smart portion fields")
                return False
        
        else:
            print(f"❌ HTTP Error {response.status_code}")
            try:
                error_data = response.json()
                print(f"Error: {error_data}")
            except:
                print(f"Error text: {response.text}")
            return False
    
    except Exception as e:
        print(f"❌ Exception: {str(e)}")
        return False

if __name__ == "__main__":
    print(f"⏰ Test started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    success = test_smart_portion_endpoint()
    
    print(f"\n📊 FINAL RESULT: {'✅ PASSED' if success else '❌ FAILED'}")
    exit(0 if success else 1)