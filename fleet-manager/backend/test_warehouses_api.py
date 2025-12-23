"""
仓库管理模块 API 测试脚本
测试仓库 CRUD 和用户分配功能
Requirements: 1.3

测试内容：
- 任务 4.1: 测试仓库 CRUD API
  - GET /api/warehouses 获取仓库列表
  - POST /api/warehouses 创建仓库
  - GET /api/warehouses/{id} 获取仓库详情
  - PUT /api/warehouses/{id} 更新仓库
  - DELETE /api/warehouses/{id} 删除仓库
- 任务 4.2: 测试仓库用户分配 API
  - POST /api/warehouses/{id}/assign 分配用户
  - GET /api/warehouses/{id}/users 获取仓库用户
"""

import httpx
import sys
import random
import string

# 后端服务地址
BASE_URL = "http://localhost:8000"

# 测试结果统计
test_results = {
    "passed": 0,
    "failed": 0,
    "tests": []
}

# 存储测试过程中创建的资源，用于清理
created_warehouses = []
created_users = []


def log_test(name: str, passed: bool, message: str = ""):
    """
    记录测试结果
    
    Args:
        name: 测试名称
        passed: 是否通过
        message: 附加信息
    """
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"{status}: {name}")
    if message:
        print(f"       {message}")
    
    if passed:
        test_results["passed"] += 1
    else:
        test_results["failed"] += 1
    
    test_results["tests"].append({
        "name": name,
        "passed": passed,
        "message": message
    })


def generate_random_name(prefix: str = "test"):
    """
    生成随机名称，用于测试
    
    Args:
        prefix: 名称前缀
        
    Returns:
        str: 随机名称
    """
    return f"{prefix}_" + "".join(random.choices(string.ascii_lowercase + string.digits, k=6))


def login_as_admin():
    """
    以管理员身份登录，获取 Token
    
    Returns:
        str: JWT Token，失败返回 None
    """
    try:
        response = httpx.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "admin", "password": "admin123"},
            timeout=10
        )
        if response.status_code == 200:
            return response.json()["access_token"]
        return None
    except Exception:
        return None


def login_as_driver(username: str, password: str):
    """
    以司机身份登录，获取 Token
    
    Args:
        username: 用户名
        password: 密码
        
    Returns:
        str: JWT Token，失败返回 None
    """
    try:
        response = httpx.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": username, "password": password},
            timeout=10
        )
        if response.status_code == 200:
            return response.json()["access_token"]
        return None
    except Exception:
        return None


def create_test_user(token: str, role: str = "driver"):
    """
    创建测试用户
    
    Args:
        token: 管理员 Token
        role: 用户角色
        
    Returns:
        dict: 创建的用户信息，失败返回 None
    """
    username = generate_random_name("user")
    user_data = {
        "username": username,
        "password": "test_password_123",
        "name": f"测试用户_{username}",
        "phone": "13800138000",
        "role": role
    }
    
    try:
        response = httpx.post(
            f"{BASE_URL}/api/users",
            headers={"Authorization": f"Bearer {token}"},
            json=user_data,
            timeout=10
        )
        if response.status_code == 200:
            user = response.json()
            created_users.append(user)
            return user
        return None
    except Exception:
        return None


# ==================== 任务 4.1: 测试仓库 CRUD API ====================

def test_get_warehouses_list(token: str):
    """
    测试 4.1.1: 获取仓库列表
    GET /api/warehouses 获取仓库列表
    """
    print("\n--- 测试 4.1.1: 获取仓库列表 ---")
    
    try:
        response = httpx.get(
            f"{BASE_URL}/api/warehouses",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                log_test("获取仓库列表成功", True, f"返回 {len(data)} 个仓库")
                # 验证返回的仓库数据结构
                if len(data) > 0:
                    warehouse = data[0]
                    required_fields = ["id", "name", "is_active"]
                    missing = [f for f in required_fields if f not in warehouse]
                    if missing:
                        log_test("仓库数据结构完整", False, f"缺少字段: {missing}")
                    else:
                        log_test("仓库数据结构完整", True, f"包含字段: {list(warehouse.keys())}")
                return data
            else:
                log_test("获取仓库列表成功", False, "返回数据不是列表")
                return None
        else:
            log_test("获取仓库列表成功", False, f"状态码: {response.status_code}, 响应: {response.text}")
            return None
    except Exception as e:
        log_test("获取仓库列表成功", False, f"请求异常: {str(e)}")
        return None


def test_get_warehouses_with_filter(token: str):
    """
    测试 4.1.2: 获取仓库列表（带筛选条件）
    GET /api/warehouses?is_active=true
    """
    print("\n--- 测试 4.1.2: 获取仓库列表（带筛选条件）---")
    
    try:
        # 测试按启用状态筛选
        response = httpx.get(
            f"{BASE_URL}/api/warehouses",
            params={"is_active": "true"},
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            all_active = all(w.get("is_active", True) for w in data)
            if all_active:
                log_test("按启用状态筛选仓库", True, f"返回 {len(data)} 个启用仓库")
            else:
                log_test("按启用状态筛选仓库", False, "返回的仓库中包含禁用仓库")
        else:
            log_test("按启用状态筛选仓库", False, f"状态码: {response.status_code}")
            
    except Exception as e:
        log_test("筛选仓库列表", False, f"请求异常: {str(e)}")


def test_create_warehouse(token: str):
    """
    测试 4.1.3: 创建仓库
    POST /api/warehouses 创建仓库
    
    Returns:
        dict: 创建的仓库信息，失败返回 None
    """
    print("\n--- 测试 4.1.3: 创建仓库 ---")
    
    warehouse_name = generate_random_name("warehouse")
    warehouse_data = {
        "name": warehouse_name,
        "address": "测试地址 123 号"
    }
    
    try:
        response = httpx.post(
            f"{BASE_URL}/api/warehouses",
            headers={"Authorization": f"Bearer {token}"},
            json=warehouse_data,
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            # 验证返回的仓库信息
            if data.get("name") == warehouse_name and data.get("address") == "测试地址 123 号":
                log_test("创建仓库成功", True, f"仓库ID: {data.get('id')}, 名称: {warehouse_name}")
                created_warehouses.append(data)
                return data
            else:
                log_test("创建仓库成功", False, "返回的仓库信息不匹配")
                return None
        else:
            log_test("创建仓库成功", False, f"状态码: {response.status_code}, 响应: {response.text}")
            return None
    except Exception as e:
        log_test("创建仓库成功", False, f"请求异常: {str(e)}")
        return None


def test_get_warehouse_detail(token: str, warehouse_id: int):
    """
    测试 4.1.4: 获取仓库详情
    GET /api/warehouses/{id} 获取仓库详情
    """
    print("\n--- 测试 4.1.4: 获取仓库详情 ---")
    
    try:
        response = httpx.get(
            f"{BASE_URL}/api/warehouses/{warehouse_id}",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get("id") == warehouse_id:
                log_test("获取仓库详情成功", True, f"仓库: {data.get('name')}, 地址: {data.get('address')}")
                return data
            else:
                log_test("获取仓库详情成功", False, "返回的仓库ID不匹配")
                return None
        else:
            log_test("获取仓库详情成功", False, f"状态码: {response.status_code}, 响应: {response.text}")
            return None
    except Exception as e:
        log_test("获取仓库详情成功", False, f"请求异常: {str(e)}")
        return None


def test_get_warehouse_not_found(token: str):
    """
    测试 4.1.5: 获取不存在的仓库
    GET /api/warehouses/{id} 测试不存在的仓库返回 404
    """
    print("\n--- 测试 4.1.5: 获取不存在的仓库 ---")
    
    try:
        # 使用一个很大的ID，确保不存在
        response = httpx.get(
            f"{BASE_URL}/api/warehouses/99999",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        
        if response.status_code == 404:
            log_test("不存在的仓库返回 404", True, f"响应: {response.json()}")
        else:
            log_test("不存在的仓库返回 404", False, f"状态码: {response.status_code}, 响应: {response.text}")
    except Exception as e:
        log_test("不存在的仓库返回 404", False, f"请求异常: {str(e)}")


def test_update_warehouse(token: str, warehouse_id: int):
    """
    测试 4.1.6: 更新仓库
    PUT /api/warehouses/{id} 更新仓库
    """
    print("\n--- 测试 4.1.6: 更新仓库 ---")
    
    update_data = {
        "name": "更新后的仓库名称",
        "address": "更新后的地址 456 号",
        "is_active": True
    }
    
    try:
        response = httpx.put(
            f"{BASE_URL}/api/warehouses/{warehouse_id}",
            headers={"Authorization": f"Bearer {token}"},
            json=update_data,
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get("name") == "更新后的仓库名称" and data.get("address") == "更新后的地址 456 号":
                log_test("更新仓库成功", True, f"新名称: {data.get('name')}, 新地址: {data.get('address')}")
                return data
            else:
                log_test("更新仓库成功", False, "返回的仓库信息未更新")
                return None
        else:
            log_test("更新仓库成功", False, f"状态码: {response.status_code}, 响应: {response.text}")
            return None
    except Exception as e:
        log_test("更新仓库成功", False, f"请求异常: {str(e)}")
        return None


def test_update_warehouse_not_found(token: str):
    """
    测试 4.1.7: 更新不存在的仓库
    PUT /api/warehouses/{id} 测试不存在的仓库返回 404
    """
    print("\n--- 测试 4.1.7: 更新不存在的仓库 ---")
    
    update_data = {
        "name": "不存在的仓库",
        "address": "不存在的地址"
    }
    
    try:
        response = httpx.put(
            f"{BASE_URL}/api/warehouses/99999",
            headers={"Authorization": f"Bearer {token}"},
            json=update_data,
            timeout=10
        )
        
        if response.status_code == 404:
            log_test("更新不存在的仓库返回 404", True, f"响应: {response.json()}")
        else:
            log_test("更新不存在的仓库返回 404", False, f"状态码: {response.status_code}, 响应: {response.text}")
    except Exception as e:
        log_test("更新不存在的仓库返回 404", False, f"请求异常: {str(e)}")


def test_delete_warehouse(token: str, warehouse_id: int):
    """
    测试 4.1.8: 删除仓库
    DELETE /api/warehouses/{id} 删除仓库
    """
    print("\n--- 测试 4.1.8: 删除仓库 ---")
    
    try:
        response = httpx.delete(
            f"{BASE_URL}/api/warehouses/{warehouse_id}",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            log_test("删除仓库成功", True, f"响应: {data}")
            
            # 验证仓库已被删除
            verify_response = httpx.get(
                f"{BASE_URL}/api/warehouses/{warehouse_id}",
                headers={"Authorization": f"Bearer {token}"},
                timeout=10
            )
            
            if verify_response.status_code == 404:
                log_test("验证仓库已删除", True, "仓库不再存在")
            else:
                log_test("验证仓库已删除", False, f"仓库仍然存在，状态码: {verify_response.status_code}")
            
            return True
        else:
            log_test("删除仓库成功", False, f"状态码: {response.status_code}, 响应: {response.text}")
            return False
    except Exception as e:
        log_test("删除仓库成功", False, f"请求异常: {str(e)}")
        return False


def test_delete_warehouse_not_found(token: str):
    """
    测试 4.1.9: 删除不存在的仓库
    DELETE /api/warehouses/{id} 测试不存在的仓库返回 404
    """
    print("\n--- 测试 4.1.9: 删除不存在的仓库 ---")
    
    try:
        response = httpx.delete(
            f"{BASE_URL}/api/warehouses/99999",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        
        if response.status_code == 404:
            log_test("删除不存在的仓库返回 404", True, f"响应: {response.json()}")
        else:
            log_test("删除不存在的仓库返回 404", False, f"状态码: {response.status_code}, 响应: {response.text}")
    except Exception as e:
        log_test("删除不存在的仓库返回 404", False, f"请求异常: {str(e)}")


# ==================== 任务 4.2: 测试仓库用户分配 API ====================

def test_assign_users_to_warehouse(token: str, warehouse_id: int, user_ids: list):
    """
    测试 4.2.1: 分配用户到仓库
    POST /api/warehouses/{id}/assign 分配用户
    """
    print("\n--- 测试 4.2.1: 分配用户到仓库 ---")
    
    try:
        response = httpx.post(
            f"{BASE_URL}/api/warehouses/{warehouse_id}/assign",
            headers={"Authorization": f"Bearer {token}"},
            json={"user_ids": user_ids},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            log_test("分配用户到仓库成功", True, f"响应: {data}")
            return True
        else:
            log_test("分配用户到仓库成功", False, f"状态码: {response.status_code}, 响应: {response.text}")
            return False
    except Exception as e:
        log_test("分配用户到仓库成功", False, f"请求异常: {str(e)}")
        return False


def test_assign_users_to_nonexistent_warehouse(token: str, user_ids: list):
    """
    测试 4.2.2: 分配用户到不存在的仓库
    POST /api/warehouses/{id}/assign 测试不存在的仓库返回 404
    """
    print("\n--- 测试 4.2.2: 分配用户到不存在的仓库 ---")
    
    try:
        response = httpx.post(
            f"{BASE_URL}/api/warehouses/99999/assign",
            headers={"Authorization": f"Bearer {token}"},
            json={"user_ids": user_ids},
            timeout=10
        )
        
        if response.status_code == 404:
            log_test("分配用户到不存在的仓库返回 404", True, f"响应: {response.json()}")
        else:
            log_test("分配用户到不存在的仓库返回 404", False, f"状态码: {response.status_code}, 响应: {response.text}")
    except Exception as e:
        log_test("分配用户到不存在的仓库返回 404", False, f"请求异常: {str(e)}")


def test_get_warehouse_users(token: str, warehouse_id: int, expected_user_ids: list):
    """
    测试 4.2.3: 获取仓库用户列表
    GET /api/warehouses/{id}/users 获取仓库用户
    """
    print("\n--- 测试 4.2.3: 获取仓库用户列表 ---")
    
    try:
        response = httpx.get(
            f"{BASE_URL}/api/warehouses/{warehouse_id}/users",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                returned_user_ids = [u.get("id") for u in data]
                # 验证分配的用户都在列表中
                all_assigned = all(uid in returned_user_ids for uid in expected_user_ids)
                if all_assigned:
                    log_test("获取仓库用户列表成功", True, f"返回 {len(data)} 个用户，包含所有分配的用户")
                else:
                    log_test("获取仓库用户列表成功", False, f"返回的用户列表不包含所有分配的用户")
                return data
            else:
                log_test("获取仓库用户列表成功", False, "返回数据不是列表")
                return None
        else:
            log_test("获取仓库用户列表成功", False, f"状态码: {response.status_code}, 响应: {response.text}")
            return None
    except Exception as e:
        log_test("获取仓库用户列表成功", False, f"请求异常: {str(e)}")
        return None


def test_get_warehouse_users_not_found(token: str):
    """
    测试 4.2.4: 获取不存在仓库的用户列表
    GET /api/warehouses/{id}/users 测试不存在的仓库返回 404
    """
    print("\n--- 测试 4.2.4: 获取不存在仓库的用户列表 ---")
    
    try:
        response = httpx.get(
            f"{BASE_URL}/api/warehouses/99999/users",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        
        if response.status_code == 404:
            log_test("获取不存在仓库的用户列表返回 404", True, f"响应: {response.json()}")
        else:
            log_test("获取不存在仓库的用户列表返回 404", False, f"状态码: {response.status_code}, 响应: {response.text}")
    except Exception as e:
        log_test("获取不存在仓库的用户列表返回 404", False, f"请求异常: {str(e)}")


# ==================== 权限测试 ====================

def test_driver_cannot_create_warehouse(driver_token: str):
    """
    测试 4.3.1: 司机无法创建仓库
    POST /api/warehouses 验证司机无法访问
    """
    print("\n--- 测试 4.3.1: 司机无法创建仓库 ---")
    
    warehouse_data = {
        "name": "不应该创建的仓库",
        "address": "不应该创建的地址"
    }
    
    try:
        response = httpx.post(
            f"{BASE_URL}/api/warehouses",
            headers={"Authorization": f"Bearer {driver_token}"},
            json=warehouse_data,
            timeout=10
        )
        
        if response.status_code == 403:
            log_test("司机无法创建仓库", True, f"返回 403 权限不足")
        else:
            log_test("司机无法创建仓库", False, f"状态码: {response.status_code}, 响应: {response.text}")
    except Exception as e:
        log_test("司机无法创建仓库", False, f"请求异常: {str(e)}")


def test_driver_cannot_update_warehouse(driver_token: str, warehouse_id: int):
    """
    测试 4.3.2: 司机无法更新仓库
    PUT /api/warehouses/{id} 验证司机无法访问
    """
    print("\n--- 测试 4.3.2: 司机无法更新仓库 ---")
    
    update_data = {
        "name": "不应该更新的名称",
        "address": "不应该更新的地址"
    }
    
    try:
        response = httpx.put(
            f"{BASE_URL}/api/warehouses/{warehouse_id}",
            headers={"Authorization": f"Bearer {driver_token}"},
            json=update_data,
            timeout=10
        )
        
        if response.status_code == 403:
            log_test("司机无法更新仓库", True, f"返回 403 权限不足")
        else:
            log_test("司机无法更新仓库", False, f"状态码: {response.status_code}, 响应: {response.text}")
    except Exception as e:
        log_test("司机无法更新仓库", False, f"请求异常: {str(e)}")


def test_driver_cannot_delete_warehouse(driver_token: str, warehouse_id: int):
    """
    测试 4.3.3: 司机无法删除仓库
    DELETE /api/warehouses/{id} 验证司机无法访问
    """
    print("\n--- 测试 4.3.3: 司机无法删除仓库 ---")
    
    try:
        response = httpx.delete(
            f"{BASE_URL}/api/warehouses/{warehouse_id}",
            headers={"Authorization": f"Bearer {driver_token}"},
            timeout=10
        )
        
        if response.status_code == 403:
            log_test("司机无法删除仓库", True, f"返回 403 权限不足")
        else:
            log_test("司机无法删除仓库", False, f"状态码: {response.status_code}, 响应: {response.text}")
    except Exception as e:
        log_test("司机无法删除仓库", False, f"请求异常: {str(e)}")


def test_driver_cannot_assign_users(driver_token: str, warehouse_id: int):
    """
    测试 4.3.4: 司机无法分配用户到仓库
    POST /api/warehouses/{id}/assign 验证司机无法访问
    """
    print("\n--- 测试 4.3.4: 司机无法分配用户到仓库 ---")
    
    try:
        response = httpx.post(
            f"{BASE_URL}/api/warehouses/{warehouse_id}/assign",
            headers={"Authorization": f"Bearer {driver_token}"},
            json={"user_ids": [1]},
            timeout=10
        )
        
        if response.status_code == 403:
            log_test("司机无法分配用户到仓库", True, f"返回 403 权限不足")
        else:
            log_test("司机无法分配用户到仓库", False, f"状态码: {response.status_code}, 响应: {response.text}")
    except Exception as e:
        log_test("司机无法分配用户到仓库", False, f"请求异常: {str(e)}")


def test_driver_can_view_warehouses(driver_token: str):
    """
    测试 4.3.5: 司机可以查看仓库列表
    GET /api/warehouses 验证司机可以访问
    """
    print("\n--- 测试 4.3.5: 司机可以查看仓库列表 ---")
    
    try:
        response = httpx.get(
            f"{BASE_URL}/api/warehouses",
            headers={"Authorization": f"Bearer {driver_token}"},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            log_test("司机可以查看仓库列表", True, f"返回 {len(data)} 个仓库")
        else:
            log_test("司机可以查看仓库列表", False, f"状态码: {response.status_code}, 响应: {response.text}")
    except Exception as e:
        log_test("司机可以查看仓库列表", False, f"请求异常: {str(e)}")


# ==================== 清理和汇总 ====================

def cleanup_test_data(token: str):
    """
    清理测试过程中创建的数据
    
    Args:
        token: 管理员 Token
    """
    print("\n--- 清理测试数据 ---")
    
    # 清理仓库
    for warehouse in created_warehouses:
        try:
            warehouse_id = warehouse.get("id")
            if warehouse_id:
                response = httpx.delete(
                    f"{BASE_URL}/api/warehouses/{warehouse_id}",
                    headers={"Authorization": f"Bearer {token}"},
                    timeout=10
                )
                if response.status_code == 200:
                    print(f"       已删除测试仓库: {warehouse.get('name')}")
                elif response.status_code == 404:
                    print(f"       仓库已不存在: {warehouse.get('name')}")
        except Exception as e:
            print(f"       清理仓库失败: {str(e)}")
    
    # 清理用户
    for user in created_users:
        try:
            user_id = user.get("id")
            if user_id:
                response = httpx.delete(
                    f"{BASE_URL}/api/users/{user_id}",
                    headers={"Authorization": f"Bearer {token}"},
                    timeout=10
                )
                if response.status_code == 200:
                    print(f"       已删除测试用户: {user.get('username')}")
                elif response.status_code == 404:
                    print(f"       用户已不存在: {user.get('username')}")
        except Exception as e:
            print(f"       清理用户失败: {str(e)}")


def print_summary():
    """
    打印测试结果汇总
    """
    print("\n" + "=" * 60)
    print("测试结果汇总")
    print("=" * 60)
    print(f"总测试数: {test_results['passed'] + test_results['failed']}")
    print(f"通过: {test_results['passed']}")
    print(f"失败: {test_results['failed']}")
    print("=" * 60)
    
    if test_results["failed"] > 0:
        print("\n失败的测试:")
        for test in test_results["tests"]:
            if not test["passed"]:
                print(f"  - {test['name']}: {test['message']}")


def main():
    """
    主函数：运行所有仓库管理模块测试
    """
    print("=" * 60)
    print("仓库管理模块 API 测试")
    print("=" * 60)
    print(f"后端地址: {BASE_URL}")
    
    # 先检查服务是否可用
    print("\n检查后端服务...")
    try:
        response = httpx.get(f"{BASE_URL}/api/health", timeout=5)
        if response.status_code == 200:
            print("✅ 后端服务正常运行")
        else:
            print(f"❌ 后端服务异常: {response.status_code}")
            sys.exit(1)
    except Exception as e:
        print(f"❌ 无法连接后端服务: {str(e)}")
        sys.exit(1)
    
    # 以管理员身份登录
    print("\n以管理员身份登录...")
    admin_token = login_as_admin()
    if not admin_token:
        print("❌ 管理员登录失败")
        sys.exit(1)
    print("✅ 管理员登录成功")
    
    # ==================== 任务 4.1: 测试仓库 CRUD API ====================
    print("\n" + "=" * 60)
    print("任务 4.1: 测试仓库 CRUD API")
    print("=" * 60)
    
    # 测试获取仓库列表
    warehouses = test_get_warehouses_list(admin_token)
    
    # 测试带筛选条件的仓库列表
    test_get_warehouses_with_filter(admin_token)
    
    # 测试创建仓库
    created_warehouse = test_create_warehouse(admin_token)
    
    # 测试获取仓库详情
    if created_warehouse:
        test_get_warehouse_detail(admin_token, created_warehouse.get("id"))
    
    # 测试获取不存在的仓库
    test_get_warehouse_not_found(admin_token)
    
    # 测试更新仓库
    if created_warehouse:
        test_update_warehouse(admin_token, created_warehouse.get("id"))
    
    # 测试更新不存在的仓库
    test_update_warehouse_not_found(admin_token)
    
    # 测试删除不存在的仓库
    test_delete_warehouse_not_found(admin_token)
    
    # ==================== 任务 4.2: 测试仓库用户分配 API ====================
    print("\n" + "=" * 60)
    print("任务 4.2: 测试仓库用户分配 API")
    print("=" * 60)
    
    # 创建一个新仓库用于用户分配测试
    assign_warehouse_name = generate_random_name("assign_warehouse")
    assign_warehouse_data = {
        "name": assign_warehouse_name,
        "address": "用户分配测试仓库地址"
    }
    
    print(f"\n创建用户分配测试仓库: {assign_warehouse_name}")
    assign_warehouse_response = httpx.post(
        f"{BASE_URL}/api/warehouses",
        headers={"Authorization": f"Bearer {admin_token}"},
        json=assign_warehouse_data,
        timeout=10
    )
    
    assign_warehouse = None
    if assign_warehouse_response.status_code == 200:
        assign_warehouse = assign_warehouse_response.json()
        created_warehouses.append(assign_warehouse)
        print(f"✅ 测试仓库创建成功，ID: {assign_warehouse.get('id')}")
    else:
        print(f"❌ 创建测试仓库失败: {assign_warehouse_response.text}")
    
    # 创建测试用户用于分配
    test_user1 = create_test_user(admin_token, "driver")
    test_user2 = create_test_user(admin_token, "driver")
    
    if assign_warehouse and test_user1 and test_user2:
        warehouse_id = assign_warehouse.get("id")
        user_ids = [test_user1.get("id"), test_user2.get("id")]
        
        # 测试分配用户到仓库
        test_assign_users_to_warehouse(admin_token, warehouse_id, user_ids)
        
        # 测试获取仓库用户列表
        test_get_warehouse_users(admin_token, warehouse_id, user_ids)
    else:
        print("⚠️ 跳过用户分配测试（缺少测试数据）")
    
    # 测试分配用户到不存在的仓库
    if test_user1:
        test_assign_users_to_nonexistent_warehouse(admin_token, [test_user1.get("id")])
    
    # 测试获取不存在仓库的用户列表
    test_get_warehouse_users_not_found(admin_token)

    
    # ==================== 权限测试 ====================
    print("\n" + "=" * 60)
    print("任务 4.3: 测试仓库权限控制")
    print("=" * 60)
    
    # 创建一个司机用户用于权限测试
    driver_username = generate_random_name("driver")
    driver_password = "driver_test_123"
    driver_data = {
        "username": driver_username,
        "password": driver_password,
        "name": "权限测试司机",
        "role": "driver"
    }
    
    print(f"\n创建测试司机用户: {driver_username}")
    driver_response = httpx.post(
        f"{BASE_URL}/api/users",
        headers={"Authorization": f"Bearer {admin_token}"},
        json=driver_data,
        timeout=10
    )
    
    if driver_response.status_code == 200:
        driver_user = driver_response.json()
        created_users.append(driver_user)
        print(f"✅ 测试司机创建成功，ID: {driver_user.get('id')}")
        
        # 以司机身份登录
        print(f"\n以司机身份登录: {driver_username}")
        driver_token = login_as_driver(driver_username, driver_password)
        
        if driver_token:
            print("✅ 司机登录成功")
            
            # 获取一个仓库ID用于权限测试
            test_warehouse_id = assign_warehouse.get("id") if assign_warehouse else 1
            
            # 测试司机权限
            test_driver_can_view_warehouses(driver_token)
            test_driver_cannot_create_warehouse(driver_token)
            test_driver_cannot_update_warehouse(driver_token, test_warehouse_id)
            test_driver_cannot_delete_warehouse(driver_token, test_warehouse_id)
            test_driver_cannot_assign_users(driver_token, test_warehouse_id)
        else:
            print("❌ 司机登录失败，跳过权限测试")
    else:
        print(f"❌ 创建测试司机失败: {driver_response.text}")
    
    # 测试删除仓库（使用之前创建的仓库）
    if created_warehouse:
        test_delete_warehouse(admin_token, created_warehouse.get("id"))
        # 从清理列表中移除已删除的仓库
        if created_warehouse in created_warehouses:
            created_warehouses.remove(created_warehouse)
    
    # 清理测试数据
    cleanup_test_data(admin_token)
    
    # 打印汇总
    print_summary()
    
    # 返回退出码
    return 0 if test_results["failed"] == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
