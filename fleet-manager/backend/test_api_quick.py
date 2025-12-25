"""
Quick API test script to verify login and vehicle creation
"""
import httpx
import random
import string

BASE_URL = "http://localhost:8000"

def generate_license_plate():
    provinces = ["J", "S", "G"]  # Use ASCII for simplicity
    letters = string.ascii_uppercase
    digits = string.digits
    province = random.choice(provinces)
    letter = random.choice(letters)
    suffix = ''.join(random.choices(digits + letters, k=5))
    return f"{province}{letter}{suffix}"

def main():
    print("Testing API...")
    
    # Test login
    print("\n1. Testing login...")
    r = httpx.post(f'{BASE_URL}/api/auth/login', json={'username': 'driver', 'password': 'driver123'})
    print(f"   Login status: {r.status_code}")
    if r.status_code != 200:
        print(f"   Error: {r.text}")
        return
    
    driver_token = r.json()['access_token']
    print(f"   Driver token: {driver_token[:30]}...")
    
    # Login as admin
    r = httpx.post(f'{BASE_URL}/api/auth/login', json={'username': 'admin', 'password': 'admin123'})
    print(f"   Admin login status: {r.status_code}")
    if r.status_code != 200:
        print(f"   Error: {r.text}")
        return
    
    admin_token = r.json()['access_token']
    print(f"   Admin token: {admin_token[:30]}...")
    
    # Test create vehicle
    print("\n2. Testing vehicle creation...")
    plate = generate_license_plate()
    print(f"   License plate: {plate}")
    
    headers = {'Authorization': f'Bearer {driver_token}'}
    try:
        r = httpx.post(f'{BASE_URL}/api/vehicles', headers=headers, json={
            'license_plate': plate,
            'brand': 'TestBrand',
            'model': 'TestModel',
            'color': 'White'
        }, timeout=30)
        print(f"   Create vehicle status: {r.status_code}")
        print(f"   Response headers: {dict(r.headers)}")
        if r.status_code != 200:
            print(f"   Error: {r.text}")
            # Try to get more details
            try:
                error_detail = r.json()
                print(f"   Error detail: {error_detail}")
            except:
                pass
            return
    except Exception as e:
        print(f"   Exception: {type(e).__name__}: {e}")
        return
    
    vehicle_data = r.json()
    vehicle_id = vehicle_data['id']
    print(f"   Vehicle ID: {vehicle_id}")
    print(f"   Vehicle status: {vehicle_data['status']}")
    
    # Test approve vehicle
    print("\n3. Testing vehicle approval...")
    headers = {'Authorization': f'Bearer {admin_token}'}
    r = httpx.put(f'{BASE_URL}/api/vehicles/{vehicle_id}/review', headers=headers, json={
        'status': 'active'
    })
    print(f"   Approve status: {r.status_code}")
    if r.status_code != 200:
        print(f"   Error: {r.text}")
        return
    
    vehicle_data = r.json()
    print(f"   Vehicle status after approval: {vehicle_data['status']}")
    
    # Test return vehicle
    print("\n4. Testing vehicle return...")
    photos = [f"https://example.com/photo_{i}.jpg" for i in range(7)]
    headers = {'Authorization': f'Bearer {driver_token}'}
    r = httpx.put(f'{BASE_URL}/api/vehicles/{vehicle_id}/return', headers=headers, json={
        'return_photos': photos
    })
    print(f"   Return status: {r.status_code}")
    if r.status_code != 200:
        print(f"   Error: {r.text}")
        return
    
    vehicle_data = r.json()
    print(f"   Vehicle status after return: {vehicle_data['status']}")
    
    # Test invalid photo count
    print("\n5. Testing invalid photo count...")
    plate2 = generate_license_plate()
    headers = {'Authorization': f'Bearer {driver_token}'}
    r = httpx.post(f'{BASE_URL}/api/vehicles', headers=headers, json={
        'license_plate': plate2,
        'brand': 'TestBrand2',
        'model': 'TestModel2',
        'color': 'Black'
    })
    if r.status_code == 200:
        vehicle_id2 = r.json()['id']
        # Approve
        headers = {'Authorization': f'Bearer {admin_token}'}
        httpx.put(f'{BASE_URL}/api/vehicles/{vehicle_id2}/review', headers=headers, json={'status': 'active'})
        
        # Try return with wrong photo count
        invalid_photos = [f"https://example.com/photo_{i}.jpg" for i in range(5)]  # Only 5 photos
        headers = {'Authorization': f'Bearer {driver_token}'}
        r = httpx.put(f'{BASE_URL}/api/vehicles/{vehicle_id2}/return', headers=headers, json={
            'return_photos': invalid_photos
        })
        print(f"   Return with 5 photos status: {r.status_code} (expected 400 or 422)")
    
    # Test ownership validation
    print("\n6. Testing ownership validation...")
    # Create vehicle as admin
    plate3 = generate_license_plate()
    headers = {'Authorization': f'Bearer {admin_token}'}
    r = httpx.post(f'{BASE_URL}/api/vehicles', headers=headers, json={
        'license_plate': plate3,
        'brand': 'AdminBrand',
        'model': 'AdminModel',
        'color': 'Red'
    })
    if r.status_code == 200:
        admin_vehicle_id = r.json()['id']
        # Approve
        httpx.put(f'{BASE_URL}/api/vehicles/{admin_vehicle_id}/review', headers=headers, json={'status': 'active'})
        
        # Try to return admin's vehicle as driver
        photos = [f"https://example.com/photo_{i}.jpg" for i in range(7)]
        headers = {'Authorization': f'Bearer {driver_token}'}
        r = httpx.put(f'{BASE_URL}/api/vehicles/{admin_vehicle_id}/return', headers=headers, json={
            'return_photos': photos
        })
        print(f"   Driver returning admin's vehicle status: {r.status_code} (expected 403)")
    
    print("\n=== All tests completed ===")

if __name__ == "__main__":
    main()
