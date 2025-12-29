"""
测试前端 API 调用
模拟前端获取计件分类和单价的流程
"""

import requests
import json

BASE_URL = "http://localhost:8000/api"

def main():
    # 1. 登录获取 token
    print("1. 登录...")
    login_resp = requests.post(
        f"{BASE_URL}/auth/login",
        json={"username": "admin", "password": "admin123"}
    )
    
    if login_resp.status_code != 200:
        print(f"登录失败: {login_resp.status_code}")
        print(login_resp.text)
        return
    
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print(f"登录成功")
    
    # 2. 获取当前用户信息
    print("\n2. 获取当前用户信息...")
    me_resp = requests.get(f"{BASE_URL}/auth/me", headers=headers)
    if me_resp.status_code == 200:
        user = me_resp.json()
        print(f"用户ID: {user.get('id')}")
        print(f"用户名: {user.get('username')}")
        print(f"角色: {user.get('role')}")
        print(f"driver_type: {user.get('driver_type', '未设置')}")
    
    # 3. 获取仓库列表
    print("\n3. 获取仓库列表...")
    warehouses_resp = requests.get(
        f"{BASE_URL}/warehouses",
        headers=headers
    )
    
    if warehouses_resp.status_code == 200:
        warehouses = warehouses_resp.json()
        print(f"仓库数量: {len(warehouses)}")
        for w in warehouses[:3]:
            print(f"  - ID: {w['id']}, 名称: {w['name']}, is_active: {w.get('is_active')}")
    
    # 4. 获取计件分类列表
    print("\n4. 获取计件分类列表...")
    categories_resp = requests.get(
        f"{BASE_URL}/piece-work/categories",
        headers=headers,
        params={"is_active": True}
    )
    
    if categories_resp.status_code == 200:
        categories = categories_resp.json()
        print(f"分类数量: {len(categories)}")
        for c in categories[:5]:
            print(f"  - ID: {c['id']}, 名称: {c['name']}, unit_price: {c['unit_price']}")
    else:
        print(f"获取分类失败: {categories_resp.status_code}")
        print(categories_resp.text)
    
    # 5. 模拟前端 getCategoryPriceForDriver 逻辑
    print("\n5. 模拟前端 getCategoryPriceForDriver 逻辑...")
    if categories_resp.status_code == 200 and len(categories) > 0:
        category = categories[0]
        print(f"选择分类: {category['name']}")
        print(f"  unit_price: {category['unit_price']}")
        print(f"  unit_price 类型: {type(category['unit_price'])}")
        
        # 模拟前端逻辑
        unit_price = category['unit_price']
        is_locked = unit_price > 0
        
        print(f"\n前端计算结果:")
        print(f"  unitPrice: {unit_price}")
        print(f"  isLocked: {is_locked}")
        print(f"  source: {'管理员已设置' if is_locked else '请输入单价'}")
        
        if is_locked:
            print("\n⚠️ 注意: 单价输入框会被锁定（disabled），因为 unit_price > 0")
            print("   这是预期行为，管理员设置的单价不允许司机修改")
        
    print("\n测试完成！")

if __name__ == "__main__":
    main()
