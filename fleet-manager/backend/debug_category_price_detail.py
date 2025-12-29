"""
详细调试计件分类单价 API
模拟前端的完整调用流程，检查单价获取问题
"""

import requests
import json

# 后端 API 地址
BASE_URL = "http://localhost:8000"

def main():
    """主函数：模拟前端获取单价的完整流程"""
    
    # 1. 登录获取 token（使用司机账号）
    print("=" * 60)
    print("1. 登录（司机账号）...")
    print("=" * 60)
    
    login_resp = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"username": "driver", "password": "driver123"}
    )
    
    if login_resp.status_code != 200:
        print(f"登录失败: {login_resp.status_code}")
        print(login_resp.text)
        return
    
    login_data = login_resp.json()
    token = login_data["access_token"]
    user = login_data.get("user", {})
    headers = {"Authorization": f"Bearer {token}"}
    
    print(f"登录成功！")
    print(f"用户信息: ID={user.get('id')}, 用户名={user.get('username')}, 角色={user.get('role')}")
    print(f"driver_type 字段: {user.get('driver_type', '未设置')}")
    
    # 2. 获取仓库列表
    print("\n" + "=" * 60)
    print("2. 获取仓库列表...")
    print("=" * 60)
    
    warehouses_resp = requests.get(
        f"{BASE_URL}/api/warehouses",
        headers=headers
    )
    
    if warehouses_resp.status_code != 200:
        print(f"获取仓库失败: {warehouses_resp.status_code}")
        return
    
    warehouses = warehouses_resp.json()
    print(f"仓库数量: {len(warehouses)}")
    for wh in warehouses:
        print(f"  - ID: {wh.get('id')}, 名称: {wh.get('name')}, 启用: {wh.get('is_active')}")
    
    # 3. 获取计件分类列表（is_active=true）
    print("\n" + "=" * 60)
    print("3. 获取计件分类列表（is_active=true）...")
    print("=" * 60)
    
    categories_resp = requests.get(
        f"{BASE_URL}/api/piece-work/categories",
        headers=headers,
        params={"is_active": True}
    )
    
    if categories_resp.status_code != 200:
        print(f"获取分类失败: {categories_resp.status_code}")
        return
    
    categories = categories_resp.json()
    print(f"分类数量: {len(categories)}")
    
    print("\n分类详情:")
    for cat in categories:
        print(f"  - ID: {cat.get('id')}")
        print(f"    名称: {cat.get('name')}")
        print(f"    unit_price: {cat.get('unit_price')} (类型: {type(cat.get('unit_price')).__name__})")
        print(f"    upstairs_price: {cat.get('upstairs_price')}")
        print(f"    sorting_price: {cat.get('sorting_price')}")
        print(f"    unit: {cat.get('unit')}")
        print(f"    is_active: {cat.get('is_active')}")
        print()
    
    # 4. 模拟前端 getCategoryPriceForDriver 函数逻辑
    print("\n" + "=" * 60)
    print("4. 模拟前端 getCategoryPriceForDriver 函数...")
    print("=" * 60)
    
    if len(warehouses) > 0 and len(categories) > 0:
        test_warehouse = warehouses[0]
        test_category = categories[0]
        test_driver_type = "driver_only"
        
        print(f"\n测试参数:")
        print(f"  仓库 ID: {test_warehouse.get('id')}")
        print(f"  分类 ID: {test_category.get('id')}")
        print(f"  司机类型: {test_driver_type}")
        
        # 查找分类
        found_category = None
        for cat in categories:
            if cat.get('id') == test_category.get('id'):
                found_category = cat
                break
        
        if found_category:
            unit_price = found_category.get('unit_price', 0)
            is_locked = unit_price > 0
            source = '管理员已设置' if is_locked else '请输入单价'
            
            print(f"\n模拟返回的 CategoryPriceConfig:")
            print(f"  unitPrice: {unit_price}")
            print(f"  isLocked: {is_locked}")
            print(f"  source: {source}")
            
            # 检查问题
            print(f"\n问题诊断:")
            if unit_price == 0:
                print(f"  ⚠️ 单价为 0，前端会显示空字符串")
            elif unit_price is None:
                print(f"  ⚠️ 单价为 None，前端会显示空字符串")
            else:
                print(f"  ✅ 单价正常: {unit_price}")
        else:
            print(f"  ⚠️ 未找到分类 ID: {test_category.get('id')}")
    
    # 5. 检查所有分类的单价
    print("\n" + "=" * 60)
    print("5. 检查所有分类的单价状态...")
    print("=" * 60)
    
    zero_price_categories = []
    valid_price_categories = []
    
    for cat in categories:
        unit_price = cat.get('unit_price', 0)
        if unit_price == 0 or unit_price is None:
            zero_price_categories.append(cat)
        else:
            valid_price_categories.append(cat)
    
    print(f"\n有效单价的分类 ({len(valid_price_categories)} 个):")
    for cat in valid_price_categories:
        print(f"  - {cat.get('name')}: ¥{cat.get('unit_price')}")
    
    print(f"\n单价为 0 或 None 的分类 ({len(zero_price_categories)} 个):")
    for cat in zero_price_categories:
        print(f"  - {cat.get('name')}: {cat.get('unit_price')}")
    
    # 6. 检查原始 JSON 响应
    print("\n" + "=" * 60)
    print("6. 原始 JSON 响应（前 3 个分类）...")
    print("=" * 60)
    print(json.dumps(categories[:3], indent=2, ensure_ascii=False))

if __name__ == "__main__":
    main()
