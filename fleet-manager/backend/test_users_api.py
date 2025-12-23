"""
用户管理模块 API 测试脚本
测试用户 CRUD 和权限控制功能
Requirements: 1.2

测试内容：
- 任务 3.1: 测试用户 CRUD API
  - GET /api/users 获取用户列表
  - POST /api/users 创建用户
  - GET /api/users/{id} 获取用户详情
  - PUT /api/users/{id} 更新用户
  - DELETE /api/users/{id} 删除用户
- 任务 3.2: 测试用户权限控制
  - 验证只有老板可以管理用户
  - 验证司机无法访问用户管理 API
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


def generate_random_username():
    """
    生成随机用户名，用于测试
    
    Returns:
        str: 随机用户名
    """
    return "test_user_" + "".join(random.choices(string.ascii_lowercase + string.digits, k=8))


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


# ==================== 任务 3.1: 测试用户 CRUD API ====================

def test_get_users_list(token: str):
    """
    测试 3.1.1: 获取用户列表
    GET /api/users 获取用户列表
    """
    print("\n--- 测试 3.1.1: 获取用户列表 ---")
    
    try:
        response = httpx.get(
            f"{BASE_URL}/api/users",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                log_test("获取用户列表成功", True, f"返回 {len(data)} 个用户")
                # 验证返回的用户数据结构
                if len(data) > 0:
                    user = data[0]
                    required_fields = ["id", "username", "name", "role"]
                    missing = [f for f in required_fields if f not in user]
                    if missing:
                        log_test("用户数据结构完整", False, f"缺少字段: {missing}")
                    else:
                        log_test("用户数据结构完整", True, f"包含字段: {list(user.keys())}")
                return data
            else:
                log_test("获取用户列表成功", False, "返回数据不是列表")
                return None
        else:
            log_test("获取用户列表成功", False, f"状态码: {response.status_code}, 响应: {response.text}")
            return None
    except Exception as e:
        log_test("获取用户列表成功", False, f"请求异常: {str(e)}")
        return None


def test_get_users_with_filter(token: str):
    """
    测试 3.1.2: 获取用户列表（带筛选条件）
    GET /api/users?role=driver&is_active=true
    """
    print("\n--- 测试 3.1.2: 获取用户列表（带筛选条件）---")
    
    try:
        # 测试按角色筛选
        response = httpx.get(
            f"{BASE_URL}/api/users",
            params={"role": "driver"},
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            # 验证所有返回的用户都是司机角色
            all_drivers = all(u.get("role") == "driver" for u in data)
            if all_drivers:
                log_test("按角色筛选用户", True, f"返回 {len(data)} 个司机")
            else:
                log_test("按角色筛选用户", False, "返回的用户中包含非司机角色")
        else:
            log_test("按角色筛选用户", False, f"状态码: {response.status_code}")
        
        # 测试按启用状态筛选
        response = httpx.get(
            f"{BASE_URL}/api/users",
            params={"is_active": "true"},
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            all_active = all(u.get("is_active", True) for u in data)
            if all_active:
                log_test("按启用状态筛选用户", True, f"返回 {len(data)} 个启用用户")
            else:
                log_test("按启用状态筛选用户", False, "返回的用户中包含禁用用户")
        else:
            log_test("按启用状态筛选用户", False, f"状态码: {response.status_code}")
            
    except Exception as e:
        log_test("筛选用户列表", False, f"请求异常: {str(e)}")


def test_create_user(token: str):
    """
    测试 3.1.3: 创建用户
    POST /api/users 创建用户
    
    Returns:
        dict: 创建的用户信息，失败返回 None
    """
    print("\n--- 测试 3.1.3: 创建用户 ---")
    
    username = generate_random_username()
    user_data = {
        "username": username,
        "password": "test_password_123",
        "name": "测试用户",
        "phone": "13800138000",
        "role": "driver"
    }
    
    try:
        response = httpx.post(
            f"{BASE_URL}/api/users",
            headers={"Authorization": f"Bearer {token}"},
            json=user_data,
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            # 验证返回的用户信息
            if data.get("username") == username and data.get("name") == "测试用户":
                log_test("创建用户成功", True, f"用户ID: {data.get('id')}, 用户名: {username}")
                created_users.append(data)
                return data
            else:
                log_test("创建用户成功", False, "返回的用户信息不匹配")
                return None
        else:
            log_test("创建用户成功", False, f"状态码: {response.status_code}, 响应: {response.text}")
            return None
    except Exception as e:
        log_test("创建用户成功", False, f"请求异常: {str(e)}")
        return None


def test_create_user_duplicate_username(token: str, existing_username: str):
    """
    测试 3.1.4: 创建用户（重复用户名）
    POST /api/users 测试重复用户名返回 400
    """
    print("\n--- 测试 3.1.4: 创建用户（重复用户名）---")
    
    user_data = {
        "username": existing_username,
        "password": "test_password_123",
        "name": "重复用户",
        "role": "driver"
    }
    
    try:
        response = httpx.post(
            f"{BASE_URL}/api/users",
            headers={"Authorization": f"Bearer {token}"},
            json=user_data,
            timeout=10
        )
        
        if response.status_code == 400:
            log_test("重复用户名返回 400", True, f"响应: {response.json()}")
        else:
            log_test("重复用户名返回 400", False, f"状态码: {response.status_code}, 响应: {response.text}")
    except Exception as e:
        log_test("重复用户名返回 400", False, f"请求异常: {str(e)}")


def test_get_user_detail(token: str, user_id: int):
    """
    测试 3.1.5: 获取用户详情
    GET /api/users/{id} 获取用户详情
    """
    print("\n--- 测试 3.1.5: 获取用户详情 ---")
    
    try:
        response = httpx.get(
            f"{BASE_URL}/api/users/{user_id}",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get("id") == user_id:
                log_test("获取用户详情成功", True, f"用户: {data.get('username')}, 角色: {data.get('role')}")
                return data
            else:
                log_test("获取用户详情成功", False, "返回的用户ID不匹配")
                return None
        else:
            log_test("获取用户详情成功", False, f"状态码: {response.status_code}, 响应: {response.text}")
            return None
    except Exception as e:
        log_test("获取用户详情成功", False, f"请求异常: {str(e)}")
        return None


def test_get_user_not_found(token: str):
    """
    测试 3.1.6: 获取不存在的用户
    GET /api/users/{id} 测试不存在的用户返回 404
    """
    print("\n--- 测试 3.1.6: 获取不存在的用户 ---")
    
    try:
        # 使用一个很大的ID，确保不存在
        response = httpx.get(
            f"{BASE_URL}/api/users/99999",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        
        if response.status_code == 404:
            log_test("不存在的用户返回 404", True, f"响应: {response.json()}")
        else:
            log_test("不存在的用户返回 404", False, f"状态码: {response.status_code}, 响应: {response.text}")
    except Exception as e:
        log_test("不存在的用户返回 404", False, f"请求异常: {str(e)}")


def test_update_user(token: str, user_id: int):
    """
    测试 3.1.7: 更新用户
    PUT /api/users/{id} 更新用户
    """
    print("\n--- 测试 3.1.7: 更新用户 ---")
    
    update_data = {
        "name": "更新后的名字",
        "phone": "13900139000",
        "role": "driver",
        "is_active": True
    }
    
    try:
        response = httpx.put(
            f"{BASE_URL}/api/users/{user_id}",
            headers={"Authorization": f"Bearer {token}"},
            json=update_data,
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get("name") == "更新后的名字" and data.get("phone") == "13900139000":
                log_test("更新用户成功", True, f"新名字: {data.get('name')}, 新电话: {data.get('phone')}")
                return data
            else:
                log_test("更新用户成功", False, "返回的用户信息未更新")
                return None
        else:
            log_test("更新用户成功", False, f"状态码: {response.status_code}, 响应: {response.text}")
            return None
    except Exception as e:
        log_test("更新用户成功", False, f"请求异常: {str(e)}")
        return None


def test_update_user_not_found(token: str):
    """
    测试 3.1.8: 更新不存在的用户
    PUT /api/users/{id} 测试不存在的用户返回 404
    """
    print("\n--- 测试 3.1.8: 更新不存在的用户 ---")
    
    update_data = {
        "name": "不存在的用户",
        "role": "driver"
    }
    
    try:
        response = httpx.put(
            f"{BASE_URL}/api/users/99999",
            headers={"Authorization": f"Bearer {token}"},
            json=update_data,
            timeout=10
        )
        
        if response.status_code == 404:
            log_test("更新不存在的用户返回 404", True, f"响应: {response.json()}")
        else:
            log_test("更新不存在的用户返回 404", False, f"状态码: {response.status_code}, 响应: {response.text}")
    except Exception as e:
        log_test("更新不存在的用户返回 404", False, f"请求异常: {str(e)}")


def test_delete_user(token: str, user_id: int):
    """
    测试 3.1.9: 删除用户
    DELETE /api/users/{id} 删除用户
    """
    print("\n--- 测试 3.1.9: 删除用户 ---")
    
    try:
        response = httpx.delete(
            f"{BASE_URL}/api/users/{user_id}",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            log_test("删除用户成功", True, f"响应: {data}")
            
            # 验证用户已被删除
            verify_response = httpx.get(
                f"{BASE_URL}/api/users/{user_id}",
                headers={"Authorization": f"Bearer {token}"},
                timeout=10
            )
            
            if verify_response.status_code == 404:
                log_test("验证用户已删除", True, "用户不再存在")
            else:
                log_test("验证用户已删除", False, f"用户仍然存在，状态码: {verify_response.status_code}")
            
            return True
        else:
            log_test("删除用户成功", False, f"状态码: {response.status_code}, 响应: {response.text}")
            return False
    except Exception as e:
        log_test("删除用户成功", False, f"请求异常: {str(e)}")
        return False


def test_delete_user_not_found(token: str):
    """
    测试 3.1.10: 删除不存在的用户
    DELETE /api/users/{id} 测试不存在的用户返回 404
    """
    print("\n--- 测试 3.1.10: 删除不存在的用户 ---")
    
    try:
        response = httpx.delete(
            f"{BASE_URL}/api/users/99999",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        
        if response.status_code == 404:
            log_test("删除不存在的用户返回 404", True, f"响应: {response.json()}")
        else:
            log_test("删除不存在的用户返回 404", False, f"状态码: {response.status_code}, 响应: {response.text}")
    except Exception as e:
        log_test("删除不存在的用户返回 404", False, f"请求异常: {str(e)}")


def test_delete_self(token: str, admin_id: int):
    """
    测试 3.1.11: 删除自己
    DELETE /api/users/{id} 测试不能删除自己返回 400
    """
    print("\n--- 测试 3.1.11: 删除自己 ---")
    
    try:
        response = httpx.delete(
            f"{BASE_URL}/api/users/{admin_id}",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        
        if response.status_code == 400:
            log_test("不能删除自己返回 400", True, f"响应: {response.json()}")
        else:
            log_test("不能删除自己返回 400", False, f"状态码: {response.status_code}, 响应: {response.text}")
    except Exception as e:
        log_test("不能删除自己返回 400", False, f"请求异常: {str(e)}")


# ==================== 任务 3.2: 测试用户权限控制 ====================

def test_driver_cannot_get_users(driver_token: str):
    """
    测试 3.2.1: 司机无法获取用户列表
    GET /api/users 验证司机无法访问
    """
    print("\n--- 测试 3.2.1: 司机无法获取用户列表 ---")
    
    try:
        response = httpx.get(
            f"{BASE_URL}/api/users",
            headers={"Authorization": f"Bearer {driver_token}"},
            timeout=10
        )
        
        if response.status_code == 403:
            log_test("司机无法获取用户列表", True, f"返回 403 权限不足")
        else:
            log_test("司机无法获取用户列表", False, f"状态码: {response.status_code}, 响应: {response.text}")
    except Exception as e:
        log_test("司机无法获取用户列表", False, f"请求异常: {str(e)}")


def test_driver_cannot_create_user(driver_token: str):
    """
    测试 3.2.2: 司机无法创建用户
    POST /api/users 验证司机无法访问
    """
    print("\n--- 测试 3.2.2: 司机无法创建用户 ---")
    
    user_data = {
        "username": "should_not_create",
        "password": "test123",
        "name": "不应该创建",
        "role": "driver"
    }
    
    try:
        response = httpx.post(
            f"{BASE_URL}/api/users",
            headers={"Authorization": f"Bearer {driver_token}"},
            json=user_data,
            timeout=10
        )
        
        if response.status_code == 403:
            log_test("司机无法创建用户", True, f"返回 403 权限不足")
        else:
            log_test("司机无法创建用户", False, f"状态码: {response.status_code}, 响应: {response.text}")
    except Exception as e:
        log_test("司机无法创建用户", False, f"请求异常: {str(e)}")


def test_driver_cannot_update_user(driver_token: str, user_id: int):
    """
    测试 3.2.3: 司机无法更新用户
    PUT /api/users/{id} 验证司机无法访问
    """
    print("\n--- 测试 3.2.3: 司机无法更新用户 ---")
    
    update_data = {
        "name": "不应该更新",
        "role": "driver"
    }
    
    try:
        response = httpx.put(
            f"{BASE_URL}/api/users/{user_id}",
            headers={"Authorization": f"Bearer {driver_token}"},
            json=update_data,
            timeout=10
        )
        
        if response.status_code == 403:
            log_test("司机无法更新用户", True, f"返回 403 权限不足")
        else:
            log_test("司机无法更新用户", False, f"状态码: {response.status_code}, 响应: {response.text}")
    except Exception as e:
        log_test("司机无法更新用户", False, f"请求异常: {str(e)}")


def test_driver_cannot_delete_user(driver_token: str, user_id: int):
    """
    测试 3.2.4: 司机无法删除用户
    DELETE /api/users/{id} 验证司机无法访问
    """
    print("\n--- 测试 3.2.4: 司机无法删除用户 ---")
    
    try:
        response = httpx.delete(
            f"{BASE_URL}/api/users/{user_id}",
            headers={"Authorization": f"Bearer {driver_token}"},
            timeout=10
        )
        
        if response.status_code == 403:
            log_test("司机无法删除用户", True, f"返回 403 权限不足")
        else:
            log_test("司机无法删除用户", False, f"状态码: {response.status_code}, 响应: {response.text}")
    except Exception as e:
        log_test("司机无法删除用户", False, f"请求异常: {str(e)}")


def test_no_token_cannot_access_users():
    """
    测试 3.2.5: 无 Token 无法访问用户管理 API
    验证所有用户管理 API 都需要认证
    """
    print("\n--- 测试 3.2.5: 无 Token 无法访问用户管理 API ---")
    
    try:
        # 测试获取用户列表
        response = httpx.get(f"{BASE_URL}/api/users", timeout=10)
        if response.status_code in [401, 403]:
            log_test("无 Token 无法获取用户列表", True, f"状态码: {response.status_code}")
        else:
            log_test("无 Token 无法获取用户列表", False, f"状态码: {response.status_code}")
        
        # 测试创建用户
        response = httpx.post(
            f"{BASE_URL}/api/users",
            json={"username": "test", "password": "test", "name": "test", "role": "driver"},
            timeout=10
        )
        if response.status_code in [401, 403]:
            log_test("无 Token 无法创建用户", True, f"状态码: {response.status_code}")
        else:
            log_test("无 Token 无法创建用户", False, f"状态码: {response.status_code}")
        
        # 测试获取用户详情
        response = httpx.get(f"{BASE_URL}/api/users/1", timeout=10)
        if response.status_code in [401, 403]:
            log_test("无 Token 无法获取用户详情", True, f"状态码: {response.status_code}")
        else:
            log_test("无 Token 无法获取用户详情", False, f"状态码: {response.status_code}")
        
        # 测试更新用户
        response = httpx.put(
            f"{BASE_URL}/api/users/1",
            json={"name": "test"},
            timeout=10
        )
        if response.status_code in [401, 403]:
            log_test("无 Token 无法更新用户", True, f"状态码: {response.status_code}")
        else:
            log_test("无 Token 无法更新用户", False, f"状态码: {response.status_code}")
        
        # 测试删除用户
        response = httpx.delete(f"{BASE_URL}/api/users/1", timeout=10)
        if response.status_code in [401, 403]:
            log_test("无 Token 无法删除用户", True, f"状态码: {response.status_code}")
        else:
            log_test("无 Token 无法删除用户", False, f"状态码: {response.status_code}")
            
    except Exception as e:
        log_test("无 Token 访问测试", False, f"请求异常: {str(e)}")


def cleanup_test_users(token: str):
    """
    清理测试过程中创建的用户
    
    Args:
        token: 管理员 Token
    """
    print("\n--- 清理测试数据 ---")
    
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
    主函数：运行所有用户管理模块测试
    """
    print("=" * 60)
    print("用户管理模块 API 测试")
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
    
    # 获取管理员ID
    admin_response = httpx.get(
        f"{BASE_URL}/api/auth/me",
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10
    )
    admin_id = admin_response.json().get("id") if admin_response.status_code == 200 else None
    
    # ==================== 任务 3.1: 测试用户 CRUD API ====================
    print("\n" + "=" * 60)
    print("任务 3.1: 测试用户 CRUD API")
    print("=" * 60)
    
    # 测试获取用户列表
    users = test_get_users_list(admin_token)
    
    # 测试带筛选条件的用户列表
    test_get_users_with_filter(admin_token)
    
    # 测试创建用户
    created_user = test_create_user(admin_token)
    
    # 测试创建重复用户名
    if created_user:
        test_create_user_duplicate_username(admin_token, created_user.get("username"))
    
    # 测试获取用户详情
    if created_user:
        test_get_user_detail(admin_token, created_user.get("id"))
    
    # 测试获取不存在的用户
    test_get_user_not_found(admin_token)
    
    # 测试更新用户
    if created_user:
        test_update_user(admin_token, created_user.get("id"))
    
    # 测试更新不存在的用户
    test_update_user_not_found(admin_token)
    
    # 测试删除自己
    if admin_id:
        test_delete_self(admin_token, admin_id)
    
    # 测试删除不存在的用户
    test_delete_user_not_found(admin_token)
    
    # ==================== 任务 3.2: 测试用户权限控制 ====================
    print("\n" + "=" * 60)
    print("任务 3.2: 测试用户权限控制")
    print("=" * 60)
    
    # 创建一个司机用户用于权限测试
    driver_username = generate_random_username()
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
            
            # 测试司机权限
            test_driver_cannot_get_users(driver_token)
            test_driver_cannot_create_user(driver_token)
            test_driver_cannot_update_user(driver_token, admin_id if admin_id else 1)
            test_driver_cannot_delete_user(driver_token, admin_id if admin_id else 1)
        else:
            print("❌ 司机登录失败，跳过权限测试")
    else:
        print(f"❌ 创建测试司机失败: {driver_response.text}")
    
    # 测试无 Token 访问
    test_no_token_cannot_access_users()
    
    # 测试删除用户（使用之前创建的用户）
    if created_user:
        test_delete_user(admin_token, created_user.get("id"))
        # 从清理列表中移除已删除的用户
        created_users.remove(created_user)
    
    # 清理测试数据
    cleanup_test_users(admin_token)
    
    # 打印汇总
    print_summary()
    
    # 返回退出码
    return 0 if test_results["failed"] == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
