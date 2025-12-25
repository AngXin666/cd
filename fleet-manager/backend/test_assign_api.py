"""
分配车辆 API 测试脚本
测试 PUT /api/vehicles/{id}/assign 端点

运行方式：
    python test_assign_api.py
"""

import httpx
import random
import string
import sys

BASE_URL = "http://localhost:8000"


def generate_license_plate():
    """生成随机车牌号"""
    provinces = ["京", "沪", "粤", "苏", "浙"]
    letters = string.ascii_uppercase
    digits = string.digits
    province = random.choice(provinces)
    letter = random.choice(letters)
    suffix = ''.join(random.choices(digits + letters, k=5))
    return f"{province}{letter}{suffix}"


def get_token(username, password):
    """获取用户 Token"""
    response = httpx.post(f"{BASE_URL}/api/auth/login", json={
        "username": username,
        "password": password
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    return None


def main():
    """主测试函数"""
    print("=" * 60)
    print("分配车辆 API 测试")
    print("=" * 60)
    
    # 检查服务是否可用
    try:
        response = httpx.get(f"{BASE_URL}/api/health", timeout=5)
        if response.status_code != 200:
            print(f"❌ 后端服务异常: {response.status_code}")
            return 1
        print("✅ 后端服务正常运行")
    except Exception as e:
        print(f"❌ 无法连接后端服务: {str(e)}")
        return 1
    
    # 获取 Token
    print("\n获取测试账号 Token...")
    admin_token = get_token("admin", "admin123")
    driver_token = get_token("driver", "driver123")
    
    if not admin_token:
        print("❌ 无法获取管理员 Token")
        return 1
    if not driver_token:
        print("❌ 无法获取司机 Token")
        return 1
    print("✅ 获取 Token 成功")
    
    # 创建测试车辆
    print("\n创建测试车辆...")
    license_plate = generate_license_plate()
    response = httpx.post(f"{BASE_URL}/api/vehicles",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "license_plate": license_plate,
            "brand": "测试品牌",
            "model": "测试型号",
            "color": "白色"
        })
    
    if response.status_code != 200:
        print(f"❌ 创建车辆失败: {response.status_code}")
        print(f"   响应: {response.text}")
        return 1
    
    vehicle_id = response.json().get("id")
    print(f"✅ 创建车辆成功, ID: {vehicle_id}")
    
    # 获取司机用户ID
    response = httpx.get(f"{BASE_URL}/api/auth/me",
        headers={"Authorization": f"Bearer {driver_token}"})
    if response.status_code != 200:
        print(f"❌ 获取司机信息失败: {response.status_code}")
        return 1
    driver_user_id = response.json().get("id")
    print(f"✅ 获取司机用户ID: {driver_user_id}")
    
    # 测试 1: 分配车辆 API
    print("\n" + "-" * 40)
    print("测试 1: PUT /api/vehicles/{id}/assign")
    print("-" * 40)
    response = httpx.put(f"{BASE_URL}/api/vehicles/{vehicle_id}/assign",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"user_id": driver_user_id})
    
    if response.status_code == 200:
        data = response.json()
        print("✅ 分配车辆成功!")
        print(f"   车辆ID: {data.get('id')}")
        print(f"   新车主ID: {data.get('user_id')}")
        print(f"   状态: {data.get('status')}")
        print(f"   车主姓名: {data.get('user_name')}")
        
        # 验证状态是否为 active
        if data.get("status") == "active":
            print("✅ 车辆状态正确更新为 active")
        else:
            print(f"❌ 车辆状态不正确: {data.get('status')}")
        
        # 验证 user_id 是否正确
        if data.get("user_id") == driver_user_id:
            print("✅ 车辆归属正确更新")
        else:
            print(f"❌ 车辆归属不正确: {data.get('user_id')}")
    else:
        print(f"❌ 分配车辆失败: {response.status_code}")
        print(f"   响应: {response.text}")
        return 1
    
    # 测试 2: 司机无权分配车辆
    print("\n" + "-" * 40)
    print("测试 2: 司机无权分配车辆")
    print("-" * 40)
    response = httpx.put(f"{BASE_URL}/api/vehicles/{vehicle_id}/assign",
        headers={"Authorization": f"Bearer {driver_token}"},
        json={"user_id": driver_user_id})
    
    if response.status_code == 403:
        print("✅ 司机无权分配车辆，正确返回 403")
    else:
        print(f"❌ 期望 403，实际: {response.status_code}")
    
    # 测试 3: 分配给不存在的用户
    print("\n" + "-" * 40)
    print("测试 3: 分配给不存在的用户")
    print("-" * 40)
    response = httpx.put(f"{BASE_URL}/api/vehicles/{vehicle_id}/assign",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"user_id": 99999})
    
    if response.status_code == 404:
        print("✅ 分配给不存在的用户，正确返回 404")
    else:
        print(f"❌ 期望 404，实际: {response.status_code}")
    
    # 测试 4: 分配不存在的车辆
    print("\n" + "-" * 40)
    print("测试 4: 分配不存在的车辆")
    print("-" * 40)
    response = httpx.put(f"{BASE_URL}/api/vehicles/99999/assign",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"user_id": driver_user_id})
    
    if response.status_code == 404:
        print("✅ 分配不存在的车辆，正确返回 404")
    else:
        print(f"❌ 期望 404，实际: {response.status_code}")
    
    # 测试 5: 分配车辆并指定仓库
    print("\n" + "-" * 40)
    print("测试 5: 分配车辆并指定仓库")
    print("-" * 40)
    
    # 先获取仓库列表
    response = httpx.get(f"{BASE_URL}/api/warehouses",
        headers={"Authorization": f"Bearer {admin_token}"})
    
    if response.status_code == 200:
        warehouses = response.json()
        if warehouses:
            warehouse_id = warehouses[0].get("id")
            
            # 创建新车辆用于测试
            license_plate2 = generate_license_plate()
            response = httpx.post(f"{BASE_URL}/api/vehicles",
                headers={"Authorization": f"Bearer {admin_token}"},
                json={
                    "license_plate": license_plate2,
                    "brand": "测试品牌2",
                    "model": "测试型号2",
                    "color": "黑色"
                })
            
            if response.status_code == 200:
                vehicle_id2 = response.json().get("id")
                
                # 分配车辆并指定仓库
                response = httpx.put(f"{BASE_URL}/api/vehicles/{vehicle_id2}/assign",
                    headers={"Authorization": f"Bearer {admin_token}"},
                    json={
                        "user_id": driver_user_id,
                        "warehouse_id": warehouse_id
                    })
                
                if response.status_code == 200:
                    print("✅ 分配车辆并指定仓库成功")
                else:
                    print(f"❌ 分配车辆并指定仓库失败: {response.status_code}")
            else:
                print(f"❌ 创建测试车辆失败: {response.status_code}")
        else:
            print("⚠️ 没有可用的仓库，跳过此测试")
    else:
        print(f"❌ 获取仓库列表失败: {response.status_code}")
    
    print("\n" + "=" * 60)
    print("✅ 分配车辆 API 测试完成!")
    print("=" * 60)
    return 0


if __name__ == "__main__":
    sys.exit(main())
