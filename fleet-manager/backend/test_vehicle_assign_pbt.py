"""
车辆分配 API 属性测试（Property-Based Testing）
使用 Hypothesis 库进行属性测试，验证分配车辆 API 的正确性

测试属性：
- Property 4: 管理权限验证 - 非管理角色用户无法分配车辆
- Property 5: 分配后归属更新 - 成功分配后车辆的 user_id 等于请求中的 user_id

**Feature: backend-vehicle-api, Property 4, 5: 管理权限验证、分配后归属更新**
**Validates: Requirements 2.1, 2.2, 2.6**

运行方式：
    pytest test_vehicle_assign_pbt.py -v
"""

import pytest
import httpx
import random
import string
import time
from datetime import datetime
from typing import Optional, Dict, List
from hypothesis import given, strategies as st, settings, assume, Phase, HealthCheck

# 后端服务地址
BASE_URL = "http://localhost:8000"

# 测试超时设置
TEST_TIMEOUT = 30


# ==================== 辅助函数 ====================

def generate_license_plate() -> str:
    """
    生成随机车牌号
    使用时间戳确保唯一性
    
    Returns:
        str: 随机生成的车牌号
    """
    provinces = ["京", "沪", "粤", "苏", "浙", "鲁", "川", "渝"]
    letters = string.ascii_uppercase
    
    province = random.choice(provinces)
    letter = random.choice(letters)
    # 使用时间戳的后5位确保唯一性
    timestamp_suffix = str(int(time.time() * 1000))[-5:]
    random_char = random.choice(letters)
    
    return f"{province}{letter}{timestamp_suffix}{random_char}"


def api_request(
    method: str,
    endpoint: str,
    token: Optional[str] = None,
    json_data: Optional[Dict] = None,
    params: Optional[Dict] = None,
    timeout: int = TEST_TIMEOUT
) -> httpx.Response:
    """
    发送 API 请求
    
    Args:
        method: HTTP 方法
        endpoint: API 端点
        token: JWT Token
        json_data: JSON 请求体
        params: 查询参数
        timeout: 超时时间
        
    Returns:
        httpx.Response: HTTP 响应
    """
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    url = f"{BASE_URL}{endpoint}"
    
    if method.upper() == "GET":
        return httpx.get(url, headers=headers, params=params, timeout=timeout)
    elif method.upper() == "POST":
        return httpx.post(url, headers=headers, json=json_data, timeout=timeout)
    elif method.upper() == "PUT":
        return httpx.put(url, headers=headers, json=json_data, timeout=timeout)
    elif method.upper() == "DELETE":
        return httpx.delete(url, headers=headers, timeout=timeout)
    else:
        raise ValueError(f"Unsupported method: {method}")


def get_token(username: str, password: str) -> Optional[str]:
    """
    获取用户 Token
    
    Args:
        username: 用户名
        password: 密码
        
    Returns:
        str: JWT Token，失败返回 None
    """
    try:
        response = api_request("POST", "/api/auth/login", json_data={
            "username": username,
            "password": password
        })
        
        if response.status_code == 200:
            data = response.json()
            return data.get("access_token")
    except Exception:
        pass
    return None


def get_user_id_from_token(token: str) -> Optional[int]:
    """
    从 Token 获取用户信息
    
    Args:
        token: JWT Token
        
    Returns:
        int: 用户ID，失败返回 None
    """
    try:
        response = api_request("GET", "/api/auth/me", token=token)
        if response.status_code == 200:
            data = response.json()
            return data.get("id")
    except Exception:
        pass
    return None


def create_test_vehicle(token: str) -> Optional[int]:
    """
    创建测试车辆
    
    Args:
        token: JWT Token
        
    Returns:
        int: 车辆ID，失败返回 None
    """
    try:
        license_plate = generate_license_plate()
        response = api_request("POST", "/api/vehicles", token=token, json_data={
            "license_plate": license_plate,
            "brand": "分配测试品牌",
            "model": "分配测试型号",
            "color": "白色"
        })
        
        if response.status_code == 200:
            data = response.json()
            return data.get("id")
    except Exception:
        pass
    return None


def approve_vehicle(admin_token: str, vehicle_id: int) -> bool:
    """
    审核通过车辆
    
    Args:
        admin_token: 管理员 Token
        vehicle_id: 车辆ID
        
    Returns:
        bool: 是否成功
    """
    try:
        response = api_request("PUT", f"/api/vehicles/{vehicle_id}/review", 
                              token=admin_token, json_data={"status": "active"})
        return response.status_code == 200
    except Exception:
        return False


def get_warehouses(token: str) -> List[Dict]:
    """
    获取仓库列表
    
    Args:
        token: JWT Token
        
    Returns:
        List[Dict]: 仓库列表
    """
    try:
        response = api_request("GET", "/api/warehouses", token=token)
        if response.status_code == 200:
            return response.json()
    except Exception:
        pass
    return []


def get_users(token: str) -> List[Dict]:
    """
    获取用户列表
    
    Args:
        token: JWT Token
        
    Returns:
        List[Dict]: 用户列表
    """
    try:
        response = api_request("GET", "/api/users", token=token)
        if response.status_code == 200:
            return response.json()
    except Exception:
        pass
    return []


# ==================== 测试 Fixtures ====================

@pytest.fixture(scope="module")
def tokens():
    """
    获取测试用的 Token
    
    Returns:
        Dict[str, str]: 各角色的 Token
    """
    driver_token = get_token("driver", "driver123")
    admin_token = get_token("admin", "admin123")
    manager_token = get_token("manager", "manager123")
    
    if not driver_token or not admin_token:
        pytest.skip("无法获取测试 Token，请确保后端服务正在运行")
    
    return {
        "driver": driver_token,
        "admin": admin_token,
        "manager": manager_token
    }


@pytest.fixture(scope="module")
def user_ids(tokens):
    """
    获取测试用户的 ID
    
    Returns:
        Dict[str, int]: 各角色的用户ID
    """
    ids = {}
    for role, token in tokens.items():
        if token:
            user_id = get_user_id_from_token(token)
            if user_id:
                ids[role] = user_id
    return ids


@pytest.fixture(scope="module")
def warehouse_ids(tokens):
    """
    获取可用的仓库 ID 列表
    
    Returns:
        List[int]: 仓库ID列表
    """
    admin_token = tokens.get("admin")
    if not admin_token:
        return []
    
    warehouses = get_warehouses(admin_token)
    return [w.get("id") for w in warehouses if w.get("id")]


# ==================== 属性测试 ====================

class TestVehicleAssignProperties:
    """
    车辆分配 API 属性测试类
    
    **Feature: backend-vehicle-api, Property 4, 5**
    **Validates: Requirements 2.1, 2.2, 2.6**
    """
    
    @given(random_seed=st.integers(min_value=1, max_value=10000))
    @settings(
        max_examples=3, 
        deadline=None,
        suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    def test_property_4_management_permission_validation(
        self, 
        tokens, 
        user_ids,
        random_seed: int
    ):
        """
        Property 4: 管理权限验证
        
        *For any* 分配车辆请求，如果当前用户不是管理角色，则请求应该返回 403 错误
        
        **Feature: backend-vehicle-api, Property 4: 管理权限验证**
        **Validates: Requirements 2.1, 2.6**
        """
        driver_token = tokens.get("driver")
        admin_token = tokens.get("admin")
        driver_id = user_ids.get("driver")
        
        if not driver_token or not admin_token or not driver_id:
            pytest.skip("缺少必要的测试数据")
        
        # 使用管理员创建一个测试车辆
        vehicle_id = create_test_vehicle(admin_token)
        if vehicle_id is None:
            pytest.skip("无法创建测试车辆")
        
        # 审核通过车辆
        approve_vehicle(admin_token, vehicle_id)
        
        # 司机（非管理角色）尝试分配车辆
        request_data = {
            "user_id": driver_id
        }
        
        response = api_request(
            "PUT", 
            f"/api/vehicles/{vehicle_id}/assign",
            token=driver_token,
            json_data=request_data
        )
        
        # 验证：非管理角色用户应返回 403
        assert response.status_code == 403, \
            f"期望 403，实际 {response.status_code}：司机不应能分配车辆"
    
    @given(
        include_warehouse=st.booleans(),
        random_seed=st.integers(min_value=1, max_value=10000)
    )
    @settings(
        max_examples=3, 
        deadline=None,
        suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    def test_property_5_assignment_ownership_update(
        self, 
        tokens, 
        user_ids,
        warehouse_ids,
        include_warehouse: bool,
        random_seed: int
    ):
        """
        Property 5: 分配后归属更新
        
        *For any* 成功的分配操作，车辆的 user_id 应该等于请求中的 user_id
        
        **Feature: backend-vehicle-api, Property 5: 分配后归属更新**
        **Validates: Requirements 2.2**
        """
        admin_token = tokens.get("admin")
        driver_token = tokens.get("driver")
        driver_id = user_ids.get("driver")
        
        if not admin_token or not driver_token or not driver_id:
            pytest.skip("缺少必要的测试数据")
        
        # 使用管理员创建一个测试车辆
        vehicle_id = create_test_vehicle(admin_token)
        if vehicle_id is None:
            pytest.skip("无法创建测试车辆")
        
        # 审核通过车辆
        approve_vehicle(admin_token, vehicle_id)
        
        # 构建分配请求
        request_data = {
            "user_id": driver_id
        }
        
        # 如果有仓库且需要包含仓库，则添加 warehouse_id
        if include_warehouse and warehouse_ids:
            request_data["warehouse_id"] = warehouse_ids[0]
        
        # 管理员分配车辆给司机
        response = api_request(
            "PUT", 
            f"/api/vehicles/{vehicle_id}/assign",
            token=admin_token,
            json_data=request_data
        )
        
        # 验证：分配成功
        assert response.status_code == 200, \
            f"期望 200，实际 {response.status_code}：分配操作应该成功。响应: {response.text}"
        
        # 验证：返回的 user_id 等于请求中的 user_id
        result_user_id = response.json().get("user_id")
        assert result_user_id == driver_id, \
            f"期望 user_id={driver_id}，实际 user_id={result_user_id}：分配后归属应更新"
        
        # 验证：状态变为 active
        result_status = response.json().get("status")
        assert result_status == "active", \
            f"期望状态 'active'，实际 '{result_status}'：分配后状态应为 active"
        
        # 再次获取车辆信息验证持久化
        get_response = api_request("GET", f"/api/vehicles/{vehicle_id}", token=driver_token)
        assert get_response.status_code == 200, \
            f"无法获取车辆信息：{get_response.status_code}"
        
        persisted_user_id = get_response.json().get("user_id")
        assert persisted_user_id == driver_id, \
            f"期望持久化 user_id={driver_id}，实际 user_id={persisted_user_id}：分配应正确持久化"
    
    @given(random_seed=st.integers(min_value=1, max_value=10000))
    @settings(
        max_examples=2, 
        deadline=None,
        suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    def test_property_4_manager_has_permission(
        self, 
        tokens, 
        user_ids,
        random_seed: int
    ):
        """
        Property 4 补充: 车队长（manager）具有管理权限
        
        *For any* 分配车辆请求，如果当前用户是车队长角色，则请求应该成功
        
        **Feature: backend-vehicle-api, Property 4: 管理权限验证**
        **Validates: Requirements 2.1**
        """
        manager_token = tokens.get("manager")
        admin_token = tokens.get("admin")
        driver_id = user_ids.get("driver")
        
        if not manager_token or not admin_token or not driver_id:
            pytest.skip("缺少必要的测试数据")
        
        # 使用管理员创建一个测试车辆
        vehicle_id = create_test_vehicle(admin_token)
        if vehicle_id is None:
            pytest.skip("无法创建测试车辆")
        
        # 审核通过车辆
        approve_vehicle(admin_token, vehicle_id)
        
        # 车队长尝试分配车辆
        request_data = {
            "user_id": driver_id
        }
        
        response = api_request(
            "PUT", 
            f"/api/vehicles/{vehicle_id}/assign",
            token=manager_token,
            json_data=request_data
        )
        
        # 验证：车队长应该能够分配车辆
        assert response.status_code == 200, \
            f"期望 200，实际 {response.status_code}：车队长应能分配车辆。响应: {response.text}"
    
    @given(random_seed=st.integers(min_value=1, max_value=10000))
    @settings(
        max_examples=2, 
        deadline=None,
        suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    def test_assign_nonexistent_user_returns_404(
        self, 
        tokens,
        random_seed: int
    ):
        """
        测试分配给不存在的用户返回 404
        
        **Validates: Requirements 2.5**
        """
        admin_token = tokens.get("admin")
        
        if not admin_token:
            pytest.skip("缺少管理员 Token")
        
        # 创建测试车辆
        vehicle_id = create_test_vehicle(admin_token)
        if vehicle_id is None:
            pytest.skip("无法创建测试车辆")
        
        # 审核通过车辆
        approve_vehicle(admin_token, vehicle_id)
        
        # 尝试分配给不存在的用户
        request_data = {
            "user_id": 99999  # 不存在的用户ID
        }
        
        response = api_request(
            "PUT", 
            f"/api/vehicles/{vehicle_id}/assign",
            token=admin_token,
            json_data=request_data
        )
        
        # 验证：目标用户不存在时应返回 404
        assert response.status_code == 404, \
            f"期望 404，实际 {response.status_code}：分配给不存在的用户应返回 404"
    
    @given(random_seed=st.integers(min_value=1, max_value=10000))
    @settings(
        max_examples=2, 
        deadline=None,
        suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    def test_assign_nonexistent_vehicle_returns_404(
        self, 
        tokens,
        user_ids,
        random_seed: int
    ):
        """
        测试分配不存在的车辆返回 404
        
        **Validates: Requirements 2.1**
        """
        admin_token = tokens.get("admin")
        driver_id = user_ids.get("driver")
        
        if not admin_token or not driver_id:
            pytest.skip("缺少必要的测试数据")
        
        # 尝试分配不存在的车辆
        request_data = {
            "user_id": driver_id
        }
        
        response = api_request(
            "PUT", 
            "/api/vehicles/99999/assign",
            token=admin_token,
            json_data=request_data
        )
        
        # 验证：车辆不存在时应返回 404
        assert response.status_code == 404, \
            f"期望 404，实际 {response.status_code}：分配不存在的车辆应返回 404"


# ==================== 单独运行测试 ====================

if __name__ == "__main__":
    # 检查服务是否可用
    try:
        response = httpx.get(f"{BASE_URL}/api/health", timeout=5)
        if response.status_code != 200:
            print(f"❌ 后端服务异常: {response.status_code}")
            exit(1)
        print("✅ 后端服务正常运行")
    except Exception as e:
        print(f"❌ 无法连接后端服务: {str(e)}")
        print("\n请确保后端服务已启动:")
        print("  cd fleet-manager/backend")
        print("  python main.py")
        exit(1)
    
    # 运行 pytest
    pytest.main([__file__, "-v", "--tb=short"])
