"""
调试计件分类单价 API
检查 API 返回的数据格式和字段
"""

import requests
import json

# 后端 API 地址
BASE_URL = "http://localhost:8000"

def main():
    """主函数：测试计件分类 API"""
    # 1. 登录获取 token
    print("1. 登录...")
    login_resp = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"username": "driver", "password": "driver123"}
    )
    
    if login_resp.status_code != 200:
        print(f"登录失败: {login_resp.status_code}")
        print(login_resp.text)
        return
    
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print(f"登录成功，Token: {token[:20]}...")
    
    # 2. 获取计件分类列表
    print("\n2. 获取计件分类列表...")
    categories_resp = requests.get(
        f"{BASE_URL}/api/piece-work/categories",
        headers=headers,
        params={"is_active": True}
    )
    
    print(f"状态码: {categories_resp.status_code}")
    
    if categories_resp.status_code == 200:
        categories = categories_resp.json()
        print(f"分类数量: {len(categories)}")
        print("\n分类详情:")
        for cat in categories:
            print(f"  - ID: {cat.get('id')}")
            print(f"    名称: {cat.get('name')}")
            print(f"    unit_price: {cat.get('unit_price')} (类型: {type(cat.get('unit_price')).__name__})")
            print(f"    upstairs_price: {cat.get('upstairs_price')}")
            print(f"    sorting_price: {cat.get('sorting_price')}")
            print(f"    is_active: {cat.get('is_active')}")
            print()
        
        # 打印原始 JSON
        print("\n原始 JSON 响应:")
        print(json.dumps(categories, indent=2, ensure_ascii=False))
    else:
        print(f"获取分类失败: {categories_resp.text}")
    
    # 3. 获取仓库列表
    print("\n3. 获取仓库列表...")
    warehouses_resp = requests.get(
        f"{BASE_URL}/api/warehouses",
        headers=headers
    )
    
    if warehouses_resp.status_code == 200:
        warehouses = warehouses_resp.json()
        print(f"仓库数量: {len(warehouses)}")
        for wh in warehouses[:3]:
            print(f"  - ID: {wh.get('id')}, 名称: {wh.get('name')}")

if __name__ == "__main__":
    main()
