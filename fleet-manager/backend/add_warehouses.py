"""
添加测试仓库数据
确保有正常的仓库供计件录入使用
"""

import requests

BASE_URL = "http://localhost:8000"

def main():
    """主函数：添加测试仓库"""
    # 1. 登录获取 admin token
    print("1. 登录管理员账号...")
    login_resp = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"username": "admin", "password": "admin123"}
    )
    
    if login_resp.status_code != 200:
        print(f"登录失败: {login_resp.status_code}")
        print(login_resp.text)
        return
    
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("登录成功")
    
    # 2. 检查现有仓库
    print("\n2. 检查现有仓库...")
    warehouses_resp = requests.get(
        f"{BASE_URL}/api/warehouses",
        headers=headers
    )
    
    if warehouses_resp.status_code == 200:
        warehouses = warehouses_resp.json()
        print(f"现有仓库数量: {len(warehouses)}")
        for wh in warehouses:
            print(f"  - ID: {wh.get('id')}, 名称: {wh.get('name')}, 激活: {wh.get('is_active')}")
    
    # 3. 添加测试仓库
    print("\n3. 添加测试仓库...")
    test_warehouses = [
        {"name": "总仓库", "address": "北京市朝阳区"},
        {"name": "东区仓库", "address": "北京市东城区"},
        {"name": "西区仓库", "address": "北京市西城区"},
    ]
    
    for wh_data in test_warehouses:
        # 检查是否已存在
        exists = any(wh.get('name') == wh_data['name'] for wh in warehouses)
        if exists:
            print(f"  仓库 '{wh_data['name']}' 已存在，跳过")
            continue
        
        # 创建仓库
        create_resp = requests.post(
            f"{BASE_URL}/api/warehouses",
            headers=headers,
            json=wh_data
        )
        
        if create_resp.status_code in [200, 201]:
            print(f"  创建仓库 '{wh_data['name']}' 成功")
        else:
            print(f"  创建仓库 '{wh_data['name']}' 失败: {create_resp.status_code}")
            print(f"    {create_resp.text}")
    
    # 4. 验证仓库列表
    print("\n4. 验证仓库列表...")
    warehouses_resp = requests.get(
        f"{BASE_URL}/api/warehouses",
        headers=headers
    )
    
    if warehouses_resp.status_code == 200:
        warehouses = warehouses_resp.json()
        print(f"仓库总数: {len(warehouses)}")
        for wh in warehouses:
            print(f"  - ID: {wh.get('id')}, 名称: {wh.get('name')}")

if __name__ == "__main__":
    main()
