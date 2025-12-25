import httpx
import time
BASE_URL = 'http://localhost:8000'

def test():
    r = httpx.post(f'{BASE_URL}/api/auth/login', json={'username': 'driver', 'password': 'driver123'}, timeout=5)
    driver_token = r.json()['access_token']
    r = httpx.post(f'{BASE_URL}/api/auth/login', json={'username': 'admin', 'password': 'admin123'}, timeout=5)
    admin_token = r.json()['access_token']
    
    ts = str(int(time.time()))
    
    # Property 1
    r = httpx.post(f'{BASE_URL}/api/vehicles', headers={'Authorization': f'Bearer {admin_token}'}, 
        json={'license_plate': f'P1{ts}', 'brand': 'Test', 'model': 'T1', 'color': 'W'}, timeout=5)
    if r.status_code == 200:
        vid = r.json()['id']
        httpx.put(f'{BASE_URL}/api/vehicles/{vid}/review', headers={'Authorization': f'Bearer {admin_token}'}, json={'status': 'active'}, timeout=5)
        photos = [f'http://x.com/{i}.jpg' for i in range(7)]
        r = httpx.put(f'{BASE_URL}/api/vehicles/{vid}/return', headers={'Authorization': f'Bearer {driver_token}'}, json={'return_photos': photos}, timeout=5)
        print(f'Property 1: {"PASS" if r.status_code == 403 else "FAIL"} (expect 403, got {r.status_code})')
    
    # Property 2
    r = httpx.post(f'{BASE_URL}/api/vehicles', headers={'Authorization': f'Bearer {driver_token}'}, 
        json={'license_plate': f'P2{ts}', 'brand': 'Test', 'model': 'T2', 'color': 'W'}, timeout=5)
    if r.status_code == 200:
        vid = r.json()['id']
        httpx.put(f'{BASE_URL}/api/vehicles/{vid}/review', headers={'Authorization': f'Bearer {admin_token}'}, json={'status': 'active'}, timeout=5)
        photos = [f'http://x.com/{i}.jpg' for i in range(5)]
        r = httpx.put(f'{BASE_URL}/api/vehicles/{vid}/return', headers={'Authorization': f'Bearer {driver_token}'}, json={'return_photos': photos}, timeout=5)
        print(f'Property 2: {"PASS" if r.status_code in [400, 422] else "FAIL"} (expect 400/422, got {r.status_code})')
    
    # Property 3
    r = httpx.post(f'{BASE_URL}/api/vehicles', headers={'Authorization': f'Bearer {driver_token}'}, 
        json={'license_plate': f'P3{ts}', 'brand': 'Test', 'model': 'T3', 'color': 'W'}, timeout=5)
    if r.status_code == 200:
        vid = r.json()['id']
        httpx.put(f'{BASE_URL}/api/vehicles/{vid}/review', headers={'Authorization': f'Bearer {admin_token}'}, json={'status': 'active'}, timeout=5)
        photos = [f'http://x.com/{i}.jpg' for i in range(7)]
        r = httpx.put(f'{BASE_URL}/api/vehicles/{vid}/return', headers={'Authorization': f'Bearer {driver_token}'}, json={'return_photos': photos}, timeout=5)
        if r.status_code == 200:
            status = r.json()['status']
            print(f'Property 3: {"PASS" if status == "returned" else "FAIL"} (expect returned, got {status})')
        else:
            print(f'Property 3: FAIL (return failed {r.status_code}: {r.text[:100]})')

if __name__ == '__main__':
    test()
