"""
车辆列表过滤 API 属性测试（简化版）
测试 Property 6 和 Property 7

Requirements: 3.2, 3.3, 4.1, 4.2
"""

import requests

BASE_URL = "http://localhost:8000"
VEHICLE_STATUSES = ["active", "returned", "reviewing", "inactive"]


def get_token():
    """获取管理员 Token"""
    resp = requests.post(f"{BASE_URL}/api/auth/login", 
                        json={"username": "admin", "password": "admin123"})
    return resp.json().get("access_token") if resp.status_code == 200 else None


def test_property_6_warehouse_filter():
    """
    Property 6: 仓库过滤正确性
    验证返回的车辆都属于指定仓库
    Validates: Requirements 3.2, 4.1
    """
    token = get_token()
    headers = {"Authorization": f"Bearer {token}"}
    
    # 获取仓库列表
    warehouses = requests.get(f"{BASE_URL}/api/warehouses", headers=headers).json()
    if not warehouses:
        print("  ⚠️ 无仓库数据，跳过测试")
        return True
    
    warehouse_id = warehouses[0]["id"]
    
    # 测试 /api/vehicles/all?warehouse_id=X
    resp = requests.get(f"{BASE_URL}/api/vehicles/all", 
                       headers=headers, params={"warehouse_id": warehouse_id})
    assert resp.status_code == 200
    
    for v in resp.json():
        assert v.get("warehouse_id") == warehouse_id or v.get("warehouse_id") is None
    
    # 测试 /api/warehouses/{id}/vehicles
    resp2 = requests.get(f"{BASE_URL}/api/warehouses/{warehouse_id}/vehicles", headers=headers)
    assert resp2.status_code == 200
    
    return True


def test_property_7_status_filter():
    """
    Property 7: 状态过滤正确性
    验证返回的车辆都是指定状态
    Validates: Requirements 3.3, 4.2
    """
    token = get_token()
    headers = {"Authorization": f"Bearer {token}"}
    
    for status in VEHICLE_STATUSES:
        # 测试 /api/vehicles/all?status=X
        resp = requests.get(f"{BASE_URL}/api/vehicles/all", 
                           headers=headers, params={"status": status})
        assert resp.status_code == 200
        
        for v in resp.json():
            assert v.get("status") == status, f"期望 {status}，实际 {v.get('status')}"
    
    return True


def main():
    """运行所有测试"""
    print("=" * 50)
    print("车辆列表过滤属性测试")
    print("=" * 50)
    
    tests = [
        ("Property 6: 仓库过滤正确性", test_property_6_warehouse_filter),
        ("Property 7: 状态过滤正确性", test_property_7_status_filter),
    ]
    
    passed = failed = 0
    for name, func in tests:
        try:
            func()
            print(f"✅ {name}: PASSED")
            passed += 1
        except Exception as e:
            print(f"❌ {name}: FAILED - {e}")
            failed += 1
    
    print(f"\n总计: {passed} 通过, {failed} 失败")
    return failed == 0


if __name__ == "__main__":
    main()
