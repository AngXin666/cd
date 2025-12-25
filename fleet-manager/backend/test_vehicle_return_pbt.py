"""
车辆还车 API 属性测试（Property-Based Testing）
使用 Hypothesis 库进行属性测试，验证还车 API 的正确性

测试属性：
- Property 1: 车辆归属验证 - 车辆不属于当前用户时返回 403
- Property 2: 还车照片数量验证 - return_photos 数组长度必须等于 7
- Property 3: 还车状态转换 - 成功还车后车辆状态变为 returned

**Feature: backend-vehicle-api, Property 1, 2, 3: 车辆归属验证、还车照片数量验证、还车状态转换**
**Validates: Requirements 1.1, 1.2, 1.4, 1.6**

运行方式：
    pytest test_vehicle_return_pbt.py -v
"""

import pytest
import httpx
import random
import string
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
    import time
    provinces = ["京", "沪", "粤", "苏", "浙", "鲁", "川", "渝"]
    letters = string.ascii_uppercase
    digits = string.digits
    
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
            "brand": "测试品牌",
            "model": "测试型号",
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


def generate_valid_photos() -> List[str]:
    """
    生成有效的还车照片 URL 列表（7张）
    
    Returns:
        List[str]: 7个照片 URL
    """
    photo_angles = ["left_front", "right_front", "left_rear", "right_rear", 
                    "dashboard", "rear_door", "cargo_box"]
    return [f"https://example.com/photo_{angle}_{random.randint(1, 9999)}.jpg" 
            for angle in photo_angles]


def generate_invalid_photos(count: int) -> List[str]:
    """
    生成无效数量的照片 URL 列表
    
    Args:
        count: 照片数量（非7）
        
    Returns:
        List[str]: 照片 URL 列表
    """
    return [f"https://example.com/photo_{i}.jpg" for i in range(count)]


# ==================== Hypothesis 策略 ====================

# 生成无效的照片数量（0-6 或 8-15）
invalid_photo_count_strategy = st.one_of(
    st.integers(min_value=0, max_value=6),
    st.integers(min_value=8, max_value=15)
)

# 生成车损照片数量（0-10）
damage_photo_count_strategy = st.integers(min_value=0, max_value=10)


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
def admin_vehicle(tokens):
    """
    创建管理员的测试车辆（用于测试归属验证）
    
    Returns:
        int: 车辆ID
    """
    admin_token = tokens.get("admin")
    
    if not admin_token:
        pytest.skip("无法获取管理员 Token")
    
    vehicle_id = create_test_vehicle(admin_token)
    if not vehicle_id:
        pytest.skip("无法创建管理员测试车辆")
    
    # 审核通过车辆
    approve_vehicle(admin_token, vehicle_id)
    
    return vehicle_id


# ==================== 属性测试 ====================

class TestVehicleReturnProperties:
    """
    车辆还车 API 属性测试类
    
    **Feature: backend-vehicle-api, Property 1, 2, 3**
    **Validates: Requirements 1.1, 1.2, 1.4, 1.6**
    """
    
    @given(
        damage_count=damage_photo_count_strategy,
        random_seed=st.integers(min_value=1, max_value=10000)
    )
    @settings(
        max_examples=10, 
        deadline=None,
        suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    def test_property_1_vehicle_ownership_validation(
        self, 
        tokens, 
        admin_vehicle, 
        damage_count: int,
        random_seed: int
    ):
        """
        Property 1: 车辆归属验证
        
        *For any* 还车请求，如果车辆不属于当前用户，则请求应该返回 403 错误
        
        **Feature: backend-vehicle-api, Property 1: 车辆归属验证**
        **Validates: Requirements 1.1, 1.6**
        """
        driver_token = tokens.get("driver")
        
        # 生成有效的还车照片
        photos = generate_valid_photos()
        
        # 生成车损照片
        damage_photos = [f"https://example.com/damage_{i}.jpg" for i in range(damage_count)] if damage_count > 0 else None
        
        # 司机尝试还管理员的车辆
        request_data = {
            "return_photos": photos
        }
        if damage_photos:
            request_data["damage_photos"] = damage_photos
        
        response = api_request(
            "PUT", 
            f"/api/vehicles/{admin_vehicle}/return",
            token=driver_token,
            json_data=request_data
        )
        
        # 验证：车辆不属于当前用户时应返回 403
        assert response.status_code == 403, \
            f"期望 403，实际 {response.status_code}：司机不应能还其他人的车辆"
    
    @given(invalid_count=invalid_photo_count_strategy)
    @settings(
        max_examples=20, 
        deadline=None,
        suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    def test_property_2_return_photos_count_validation(
        self, 
        tokens,
        invalid_count: int
    ):
        """
        Property 2: 还车照片数量验证
        
        *For any* 还车请求，return_photos 数组长度必须等于 7，否则返回 400 或 422 错误
        
        **Feature: backend-vehicle-api, Property 2: 还车照片数量验证**
        **Validates: Requirements 1.2**
        """
        driver_token = tokens.get("driver")
        admin_token = tokens.get("admin")
        
        # 创建一个新的测试车辆
        vehicle_id = create_test_vehicle(driver_token)
        if vehicle_id is None:
            pytest.skip("无法创建测试车辆")
        
        # 审核通过
        if not approve_vehicle(admin_token, vehicle_id):
            pytest.skip("无法审核通过车辆")
        
        # 生成无效数量的照片
        photos = generate_invalid_photos(invalid_count)
        
        # 尝试用非7张照片还车
        request_data = {
            "return_photos": photos
        }
        
        response = api_request(
            "PUT", 
            f"/api/vehicles/{vehicle_id}/return",
            token=driver_token,
            json_data=request_data
        )
        
        # 验证：照片数量不为7时应返回 400 或 422（Pydantic 验证错误）
        assert response.status_code in [400, 422], \
            f"期望 400 或 422，实际 {response.status_code}：照片数量 {invalid_count} 不为 7 应被拒绝"
    
    @given(damage_count=damage_photo_count_strategy)
    @settings(
        max_examples=10, 
        deadline=None,
        suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    def test_property_3_return_status_transition(
        self, 
        tokens, 
        damage_count: int
    ):
        """
        Property 3: 还车状态转换
        
        *For any* 成功的还车操作，车辆状态应该从 active 变为 returned
        
        **Feature: backend-vehicle-api, Property 3: 还车状态转换**
        **Validates: Requirements 1.4**
        """
        driver_token = tokens.get("driver")
        admin_token = tokens.get("admin")
        
        # 创建一个新的测试车辆
        vehicle_id = create_test_vehicle(driver_token)
        if vehicle_id is None:
            pytest.skip("无法创建测试车辆")
        
        # 审核通过（状态变为 active）
        if not approve_vehicle(admin_token, vehicle_id):
            pytest.skip("无法审核通过车辆")
        
        # 验证初始状态为 active
        get_response = api_request("GET", f"/api/vehicles/{vehicle_id}", token=driver_token)
        if get_response.status_code != 200:
            pytest.skip("无法获取车辆信息")
        
        initial_status = get_response.json().get("status")
        if initial_status != "active":
            pytest.skip(f"车辆初始状态不是 active: {initial_status}")
        
        # 生成有效的还车照片
        photos = generate_valid_photos()
        
        # 生成车损照片
        damage_photos = [f"https://example.com/damage_{i}.jpg" for i in range(damage_count)] if damage_count > 0 else None
        
        # 执行还车操作
        request_data = {
            "return_photos": photos
        }
        if damage_photos:
            request_data["damage_photos"] = damage_photos
        
        response = api_request(
            "PUT", 
            f"/api/vehicles/{vehicle_id}/return",
            token=driver_token,
            json_data=request_data
        )
        
        # 验证：还车成功
        assert response.status_code == 200, \
            f"期望 200，实际 {response.status_code}：还车操作应该成功。响应: {response.text}"
        
        # 验证：状态变为 returned
        result_status = response.json().get("status")
        assert result_status == "returned", \
            f"期望状态 'returned'，实际 '{result_status}'：还车后状态应变为 returned"


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
