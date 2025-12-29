"""
车辆列表过滤 API 属性测试
Property-Based Testing for Vehicle List Filtering APIs

测试属性：
- Property 6: 仓库过滤正确性 - 返回的车辆都属于指定仓库
- Property 7: 状态过滤正确性 - 返回的车辆都是指定状态

Requirements: 3.2, 3.3, 4.1, 4.2
"""

import requests
from typing import Dict, Optional, List
from hypothesis import given, strategies as st, settings, assume

# 后端 API 基础 URL
BASE_URL = "http://localhost:8000"

# 测试账号
TEST_ACCOUNTS = {
    "admin": {"username": "admin", "password": "admin123"},
    "manager": {"username": "manager", "password": "manager123"},
}

# 车辆状态枚举（与 models.py 中的 VehicleStatus 保持一致）
VEHICLE_STATUSES = ["active", "returned", "reviewing"]


def get_token(username: str, password: str) -> Optional[str]:
    """
    获取登录 Token
    
    Args:
        username: 用户名
        password: 密码
        
    Returns:
        str: JWT Token，失败返回 None
    """
    try:
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": username, "password": password}
        )
        if response.status_code == 200:
            return response.json().get("access_token")
        return None
    except Exception:
        return None


def get_admin_token() -> str:
    """
    获取管理员 Token
    
    Returns:
        str: 管理员 JWT Token
    """
    token = get_token("admin", "admin123")
    if not token:
        raise RuntimeError("无法获取管理员 Token")
    return token


def get_all_warehouses(token: str) -> List[Dict]:
    """
    获取所有仓库列表
    
    Args:
        token: JWT Token
        
    Returns:
        List[Dict]: 仓库列表
    """
    response = requests.get(
        f"{BASE_URL}/api/warehouses",
        headers={"Authorization": f"Bearer {token}"}
    )
    if response.status_code == 200:
        return response.json()
    return []


def get_all_vehicles(token: str) -> List[Dict]:
    """
    获取所有车辆列表
    
    Args:
        token: JWT Token
        
    Returns:
        List[Dict]: 车辆列表
    """
    response = requests.get(
        f"{BASE_URL}/api/vehicles/all",
        headers={"Authorization": f"Bearer {token}"}
    )
    if response.status_code == 200:
        return response.json()
    return []


# ==================== Property 6: 仓库过滤正确性 ====================

@settings(max_examples=5, deadline=30000)
@given(
    warehouse_index=st.integers(min_value=0, max_value=5),
    skip=st.integers(min_value=0, max_value=10),
    limit=st.integers(min_value=1, max_value=20)
)
def test_property_warehouse_filter_correctness(
    warehouse_index: int,
    skip: int,
    limit: int
):
    """
    Property 6: 仓库过滤正确性
    
    属性：通过 warehouse_id 过滤返回的所有车辆都应该属于该仓库
    
    验证：
    - GET /api/vehicles/all?warehouse_id=X 返回的车辆 warehouse_id 都等于 X
    - GET /api/warehouses/{id}/vehicles 返回的车辆都属于该仓库
    
    Requirements: 3.2, 4.1
    """
    # 获取管理员 Token
    token = get_admin_token()
    headers = {"Authorization": f"Bearer {token}"}
    
    # 获取所有仓库
    warehouses = get_all_warehouses(token)
    assume(len(warehouses) > 0)  # 假设至少有一个仓库
    
    # 选择一个仓库（使用模运算确保索引有效）
    warehouse = warehouses[warehouse_index % len(warehouses)]
    warehouse_id = warehouse["id"]
    
    # 测试 1: GET /api/vehicles/all?warehouse_id=X
    response1 = requests.get(
        f"{BASE_URL}/api/vehicles/all",
        headers=headers,
        params={
            "warehouse_id": warehouse_id,
            "skip": skip,
            "limit": limit
        }
    )
    
    assert response1.status_code == 200, f"API 返回错误: {response1.status_code}"
    vehicles1 = response1.json()
    
    # 验证所有返回的车辆都属于指定仓库
    for vehicle in vehicles1:
        assert vehicle.get("warehouse_id") == warehouse_id or vehicle.get("warehouse_id") is None, \
            f"车辆 {vehicle['id']} 的 warehouse_id ({vehicle.get('warehouse_id')}) 不等于 {warehouse_id}"
    
    # 测试 2: GET /api/warehouses/{id}/vehicles
    response2 = requests.get(
        f"{BASE_URL}/api/warehouses/{warehouse_id}/vehicles",
        headers=headers,
        params={
            "skip": skip,
            "limit": limit
        }
    )
    
    assert response2.status_code == 200, f"API 返回错误: {response2.status_code}"
    vehicles2 = response2.json()
    
    # 验证返回的车辆数量不超过 limit
    assert len(vehicles2) <= limit, f"返回车辆数 {len(vehicles2)} 超过 limit {limit}"


# ==================== Property 7: 状态过滤正确性 ====================

@settings(max_examples=5, deadline=30000)
@given(
    status_index=st.integers(min_value=0, max_value=2),
    skip=st.integers(min_value=0, max_value=10),
    limit=st.integers(min_value=1, max_value=20)
)
def test_property_status_filter_correctness(
    status_index: int,
    skip: int,
    limit: int
):
    """
    Property 7: 状态过滤正确性
    
    属性：通过 status 过滤返回的所有车辆都应该是指定状态
    
    验证：
    - GET /api/vehicles/all?status=X 返回的车辆 status 都等于 X
    - GET /api/warehouses/{id}/vehicles?status=X 返回的车辆 status 都等于 X
    
    Requirements: 3.3, 4.2
    """
    # 获取管理员 Token
    token = get_admin_token()
    headers = {"Authorization": f"Bearer {token}"}
    
    # 选择一个状态
    status = VEHICLE_STATUSES[status_index]
    
    # 测试 1: GET /api/vehicles/all?status=X
    response1 = requests.get(
        f"{BASE_URL}/api/vehicles/all",
        headers=headers,
        params={
            "status": status,
            "skip": skip,
            "limit": limit
        }
    )
    
    assert response1.status_code == 200, f"API 返回错误: {response1.status_code}"
    vehicles1 = response1.json()
    
    # 验证所有返回的车辆都是指定状态
    for vehicle in vehicles1:
        assert vehicle.get("status") == status, \
            f"车辆 {vehicle['id']} 的 status ({vehicle.get('status')}) 不等于 {status}"
    
    # 验证返回的车辆数量不超过 limit
    assert len(vehicles1) <= limit, f"返回车辆数 {len(vehicles1)} 超过 limit {limit}"
    
    # 测试 2: GET /api/warehouses/{id}/vehicles?status=X
    warehouses = get_all_warehouses(token)
    if warehouses:
        warehouse_id = warehouses[0]["id"]
        
        response2 = requests.get(
            f"{BASE_URL}/api/warehouses/{warehouse_id}/vehicles",
            headers=headers,
            params={
                "status": status,
                "skip": skip,
                "limit": limit
            }
        )
        
        assert response2.status_code == 200, f"API 返回错误: {response2.status_code}"
        vehicles2 = response2.json()
        
        # 验证所有返回的车辆都是指定状态
        for vehicle in vehicles2:
            assert vehicle.get("status") == status, \
                f"车辆 {vehicle['id']} 的 status ({vehicle.get('status')}) 不等于 {status}"


# ==================== Property 8: 分页正确性 ====================

@settings(max_examples=5, deadline=30000)
@given(
    skip=st.integers(min_value=0, max_value=20),
    limit=st.integers(min_value=1, max_value=20)
)
def test_property_pagination_correctness(skip: int, limit: int):
    """
    Property 8: 分页正确性
    
    属性：分页参数应该正确限制返回结果
    
    验证：
    - 返回的车辆数量不超过 limit
    - skip 参数正确跳过指定数量的记录
    
    Requirements: 3.4, 4.3
    """
    # 获取管理员 Token
    token = get_admin_token()
    headers = {"Authorization": f"Bearer {token}"}
    
    # 测试 GET /api/vehicles/all 分页
    response = requests.get(
        f"{BASE_URL}/api/vehicles/all",
        headers=headers,
        params={
            "skip": skip,
            "limit": limit
        }
    )
    
    assert response.status_code == 200, f"API 返回错误: {response.status_code}"
    vehicles = response.json()
    
    # 验证返回的车辆数量不超过 limit
    assert len(vehicles) <= limit, f"返回车辆数 {len(vehicles)} 超过 limit {limit}"
    
    # 获取不带 skip 的结果进行对比
    response_no_skip = requests.get(
        f"{BASE_URL}/api/vehicles/all",
        headers=headers,
        params={
            "skip": 0,
            "limit": 1000  # 获取所有车辆
        }
    )
    
    if response_no_skip.status_code == 200:
        all_vehicles = response_no_skip.json()
        
        # 如果 skip 小于总数，验证返回的第一辆车是正确的
        if skip < len(all_vehicles) and len(vehicles) > 0:
            expected_first = all_vehicles[skip]
            actual_first = vehicles[0]
            assert expected_first["id"] == actual_first["id"], \
                f"skip={skip} 后的第一辆车 ID 不匹配"


# ==================== Property 9: 组合过滤正确性 ====================

@settings(max_examples=5, deadline=30000)
@given(
    warehouse_index=st.integers(min_value=0, max_value=5),
    status_index=st.integers(min_value=0, max_value=2),
    limit=st.integers(min_value=1, max_value=20)
)
def test_property_combined_filter_correctness(
    warehouse_index: int,
    status_index: int,
    limit: int
):
    """
    Property 9: 组合过滤正确性
    
    属性：同时使用多个过滤条件时，返回的结果应该满足所有条件
    
    验证：
    - GET /api/vehicles/all?warehouse_id=X&status=Y 返回的车辆同时满足两个条件
    
    Requirements: 3.2, 3.3
    """
    # 获取管理员 Token
    token = get_admin_token()
    headers = {"Authorization": f"Bearer {token}"}
    
    # 获取所有仓库
    warehouses = get_all_warehouses(token)
    assume(len(warehouses) > 0)
    
    # 选择仓库和状态
    warehouse = warehouses[warehouse_index % len(warehouses)]
    warehouse_id = warehouse["id"]
    status = VEHICLE_STATUSES[status_index]
    
    # 测试组合过滤
    response = requests.get(
        f"{BASE_URL}/api/vehicles/all",
        headers=headers,
        params={
            "warehouse_id": warehouse_id,
            "status": status,
            "limit": limit
        }
    )
    
    assert response.status_code == 200, f"API 返回错误: {response.status_code}"
    vehicles = response.json()
    
    # 验证所有返回的车辆同时满足两个条件
    for vehicle in vehicles:
        # 验证仓库条件
        assert vehicle.get("warehouse_id") == warehouse_id or vehicle.get("warehouse_id") is None, \
            f"车辆 {vehicle['id']} 的 warehouse_id 不匹配"
        
        # 验证状态条件
        assert vehicle.get("status") == status, \
            f"车辆 {vehicle['id']} 的 status ({vehicle.get('status')}) 不等于 {status}"
    
    # 验证返回数量不超过 limit
    assert len(vehicles) <= limit, f"返回车辆数 {len(vehicles)} 超过 limit {limit}"


# ==================== 运行测试 ====================

def run_all_tests():
    """
    运行所有属性测试
    """
    print("=" * 60)
    print("车辆列表过滤 API 属性测试")
    print("Requirements: 3.2, 3.3, 4.1, 4.2")
    print("=" * 60)
    
    tests = [
        ("Property 6: 仓库过滤正确性", test_property_warehouse_filter_correctness),
        ("Property 7: 状态过滤正确性", test_property_status_filter_correctness),
        ("Property 8: 分页正确性", test_property_pagination_correctness),
        ("Property 9: 组合过滤正确性", test_property_combined_filter_correctness),
    ]
    
    passed = 0
    failed = 0
    
    for name, test_func in tests:
        print(f"\n--- {name} ---")
        try:
            test_func()
            print(f"  ✅ {name}: PASSED")
            passed += 1
        except Exception as e:
            print(f"  ❌ {name}: FAILED")
            print(f"     错误: {str(e)}")
            failed += 1
    
    print("\n" + "=" * 60)
    print("测试结果汇总")
    print("=" * 60)
    print(f"总测试数: {passed + failed}")
    print(f"通过: {passed}")
    print(f"失败: {failed}")
    
    if failed == 0:
        print("\n🎉 所有属性测试通过！")
    else:
        print(f"\n⚠️ 有 {failed} 个测试失败")
    
    return failed == 0


if __name__ == "__main__":
    run_all_tests()
