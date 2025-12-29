# -*- coding: utf-8 -*-
"""检查 API 返回数据"""
import requests

# 先登录获取 token
login_resp = requests.post('http://localhost:8000/api/auth/login', json={
    'username': 'driver',
    'password': 'driver123'
})
print("Login status:", login_resp.status_code)
if login_resp.status_code != 200:
    print("Login failed:", login_resp.json())
    exit(1)

token = login_resp.json().get('access_token')
headers = {'Authorization': f'Bearer {token}'}

# 获取分类
r = requests.get('http://localhost:8000/api/piece-work/categories', 
                 params={'is_active': True},
                 headers=headers)
data = r.json()
print("\nCategories API:")
print("Status:", r.status_code)
print("Data type:", type(data))
print("\nFirst 3 items:")
if isinstance(data, list):
    for item in data[:3]:
        print(f"  ID: {item.get('id')}, Name: {item.get('name')}, unit_price: {item.get('unit_price')}")
else:
    print(data)
