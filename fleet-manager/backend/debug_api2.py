"""
调试 API 端点的脚本 - 详细版
"""
import requests
import traceback

BASE_URL = "http://localhost:8000"

def test_api():
    # 登录获取 token
    print("登录管理员账号...")
    login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={"username": "admin", "password": "admin123"})
    if login_resp.status_code != 200:
        print(f"登录失败: {login_resp.status_code}")
        return
    
    token = login_resp.json().get("access_token")
    headers = {"Authorization": f"Bearer {token}"}
    print(f"登录成功")
    
    # 测试 1: 正常访问存在的仓库
    print("\n--- 测试 1: 正常访问存在的仓库 ---")
    warehouses_resp = requests.get(f"{BASE_URL}/api/warehouses", headers=headers)
    if warehouses_resp.status_code == 200:
        warehouses = warehouses_resp.json()
        if warehouses:
            warehouse_id = warehouses[0]["id"]
            print(f"使用仓库 ID: {warehouse_id}")
            
            resp = requests.get(f"{BASE_URL}/api/warehouses/{warehouse_id}/vehicles", headers=headers)
            print(f"状态码: {resp.status_code}")
            if resp.status_code == 200:
                print(f"返回车辆数: {len(resp.json())}")
            else:
                print(f"响应: {resp.text}")
    
    # 测试 2: 访问不存在的仓库
    print("\n--- 测试 2: 访问不存在的仓库 (ID=99999) ---")
    resp = requests.get(f"{BASE_URL}/api/warehouses/99999/vehicles", headers=headers)
    print(f"状态码: {resp.status_code}")
    print(f"响应: {resp.text}")
    
    # 测试 3: 司机访问
    print("\n--- 测试 3: 司机访问 ---")
    driver_login = requests.post(f"{BASE_URL}/api/auth/login", json={"username": "driver", "password": "driver123"})
    if driver_login.status_code == 200:
        driver_token = driver_login.json().get("access_token")
        driver_headers = {"Authorization": f"Bearer {driver_token}"}
        print("司机登录成功")
        
        if warehouses:
            warehouse_id = warehouses[0]["id"]
            resp = requests.get(f"{BASE_URL}/api/warehouses/{warehouse_id}/vehicles", headers=driver_headers)
            print(f"状态码: {resp.status_code}")
            print(f"响应: {resp.text[:500] if len(resp.text) > 500 else resp.text}")
    else:
        print(f"司机登录失败: {driver_login.status_code}")

if __name__ == "__main__":
    test_api()
