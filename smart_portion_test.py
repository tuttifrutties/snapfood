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
    """Create a proper test image as base64 using PIL"""
    try:
        from PIL import Image, ImageDraw
        import io
        
        # Create a simple colored image representing food
        img = Image.new('RGB', (200, 200), color='orange')
        
        # Add some simple shapes to make it look like food
        draw = ImageDraw.Draw(img)
        
        # Draw a circle (pizza base)
        draw.ellipse([50, 50, 150, 150], fill='wheat', outline='brown', width=3)
        
        # Add some toppings (red circles for pepperoni)
        draw.ellipse([70, 70, 85, 85], fill='red')
        draw.ellipse([110, 80, 125, 95], fill='red')
        draw.ellipse([90, 120, 105, 135], fill='red')
        
        # Convert to base64
        buffer = io.BytesIO()
        img.save(buffer, format='JPEG')
        img_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
        
        return img_base64
        
    except ImportError:
        # Fallback: create a simple valid JPEG base64
        # This is a minimal valid JPEG header + data
        jpeg_data = b'\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00H\x00H\x00\x00\xff\xdb\x00C\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t\x08\n\x0c\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a\x1f\x1e\x1d\x1a\x1c\x1c $.\' ",#\x1c\x1c(7),01444\x1f\'9=82<.342\xff\xc0\x00\x11\x08\x00\x01\x00\x01\x01\x01\x11\x00\x02\x11\x01\x03\x11\x01\xff\xc4\x00\x14\x00\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x08\xff\xc4\x00\x14\x10\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\xff\xda\x00\x0c\x03\x01\x00\x02\x11\x03\x11\x00\x3f\x00\xaa\xff\xd9'
        return base64.b64encode(jpeg_data).decode('utf-8')

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