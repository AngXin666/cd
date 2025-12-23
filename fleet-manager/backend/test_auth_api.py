"""
认证模块 API 测试脚本
测试登录、获取当前用户、修改密码等 API 功能
Requirements: 1.1
"""

import httpx
import sys

# 后端服务地址
BASE_URL = "http://localhost:8000"

# 测试结果统计
test_results = {
    "passed": 0,
    "failed": 0,
    "tests": []
}


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


def test_login_success():
    """
    测试 2.1.1: 正确登录
    POST /api/auth/login 测试正确登录
    """
    print("\n--- 测试 2.1.1: 正确登录 ---")
    
    try:
        response = httpx.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "admin", "password": "admin123"},
            timeout=10
        )
        
        # 验证状态码
        if response.status_code == 200:
            data = response.json()
            # 验证返回 access_token
            if "access_token" in data and data["access_token"]:
                token = data["access_token"]
                log_test("登录成功返回 200", True, f"Token: {token[:50]}...")
                
                # 立即验证 Token 是否有效
                print("       验证 Token 有效性...")
                verify_response = httpx.get(
                    f"{BASE_URL}/api/auth/me",
                    headers={"Authorization": f"Bearer {token}"},
                    timeout=10
                )
                print(f"       验证响应: {verify_response.status_code}")
                if verify_response.status_code == 200:
                    print(f"       用户信息: {verify_response.json()}")
                else:
                    print(f"       验证失败: {verify_response.text}")
                
                return token
            else:
                log_test("登录成功返回 200", False, "响应中没有 access_token")
                return None
        else:
            log_test("登录成功返回 200", False, f"状态码: {response.status_code}, 响应: {response.text}")
            return None
    except Exception as e:
        log_test("登录成功返回 200", False, f"请求异常: {str(e)}")
        return None


def test_login_wrong_password():
    """
    测试 2.1.2: 错误密码返回 401
    POST /api/auth/login 测试错误密码
    """
    print("\n--- 测试 2.1.2: 错误密码返回 401 ---")
    
    try:
        response = httpx.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "admin", "password": "wrong_password"}
        )
        
        if response.status_code == 401:
            log_test("错误密码返回 401", True, f"响应: {response.json()}")
        else:
            log_test("错误密码返回 401", False, f"状态码: {response.status_code}, 响应: {response.text}")
    except Exception as e:
        log_test("错误密码返回 401", False, f"请求异常: {str(e)}")


def test_login_wrong_username():
    """
    测试 2.1.3: 错误用户名返回 401
    POST /api/auth/login 测试不存在的用户名
    """
    print("\n--- 测试 2.1.3: 错误用户名返回 401 ---")
    
    try:
        response = httpx.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "nonexistent_user", "password": "any_password"}
        )
        
        if response.status_code == 401:
            log_test("错误用户名返回 401", True, f"响应: {response.json()}")
        else:
            log_test("错误用户名返回 401", False, f"状态码: {response.status_code}, 响应: {response.text}")
    except Exception as e:
        log_test("错误用户名返回 401", False, f"请求异常: {str(e)}")


def test_get_me_success(token: str):
    """
    测试 2.2.1: 获取当前用户信息
    GET /api/auth/me 测试获取用户信息
    """
    print("\n--- 测试 2.2.1: 获取当前用户信息 ---")
    
    try:
        response = httpx.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if response.status_code == 200:
            data = response.json()
            # 验证返回的用户信息包含必要字段
            required_fields = ["id", "username", "name", "role"]
            missing_fields = [f for f in required_fields if f not in data]
            
            if not missing_fields:
                log_test("获取当前用户成功", True, f"用户: {data['username']}, 角色: {data['role']}")
            else:
                log_test("获取当前用户成功", False, f"缺少字段: {missing_fields}")
        else:
            log_test("获取当前用户成功", False, f"状态码: {response.status_code}, 响应: {response.text}")
    except Exception as e:
        log_test("获取当前用户成功", False, f"请求异常: {str(e)}")


def test_get_me_no_token():
    """
    测试 2.2.2: 无 Token 返回 401/403
    GET /api/auth/me 测试无 Token 访问
    """
    print("\n--- 测试 2.2.2: 无 Token 返回 401/403 ---")
    
    try:
        response = httpx.get(f"{BASE_URL}/api/auth/me")
        
        # 无 Token 应该返回 401 或 403
        if response.status_code in [401, 403]:
            log_test("无 Token 返回 401/403", True, f"状态码: {response.status_code}")
        else:
            log_test("无 Token 返回 401/403", False, f"状态码: {response.status_code}, 响应: {response.text}")
    except Exception as e:
        log_test("无 Token 返回 401/403", False, f"请求异常: {str(e)}")


def test_get_me_invalid_token():
    """
    测试 2.2.3: 无效 Token 返回 401
    GET /api/auth/me 测试无效 Token 访问
    """
    print("\n--- 测试 2.2.3: 无效 Token 返回 401 ---")
    
    try:
        response = httpx.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": "Bearer invalid_token_12345"}
        )
        
        if response.status_code == 401:
            log_test("无效 Token 返回 401", True, f"响应: {response.json()}")
        else:
            log_test("无效 Token 返回 401", False, f"状态码: {response.status_code}, 响应: {response.text}")
    except Exception as e:
        log_test("无效 Token 返回 401", False, f"请求异常: {str(e)}")


def test_change_password_wrong_old(token: str):
    """
    测试 2.3.1: 旧密码错误返回 400
    PUT /api/auth/password 测试旧密码错误
    """
    print("\n--- 测试 2.3.1: 旧密码错误返回 400 ---")
    
    try:
        response = httpx.put(
            f"{BASE_URL}/api/auth/password",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "old_password": "wrong_old_password",
                "new_password": "new_password_123"
            }
        )
        
        if response.status_code == 400:
            log_test("旧密码错误返回 400", True, f"响应: {response.json()}")
        else:
            log_test("旧密码错误返回 400", False, f"状态码: {response.status_code}, 响应: {response.text}")
    except Exception as e:
        log_test("旧密码错误返回 400", False, f"请求异常: {str(e)}")


def test_change_password_success(token: str):
    """
    测试 2.3.2: 修改密码成功
    PUT /api/auth/password 测试修改密码
    注意：为了不影响后续测试，修改后再改回来
    """
    print("\n--- 测试 2.3.2: 修改密码成功 ---")
    
    try:
        # 先修改密码
        response = httpx.put(
            f"{BASE_URL}/api/auth/password",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "old_password": "admin123",
                "new_password": "temp_password_123"
            }
        )
        
        if response.status_code == 200:
            log_test("修改密码成功", True, f"响应: {response.json()}")
            
            # 用新密码登录验证
            print("       验证新密码登录...")
            login_response = httpx.post(
                f"{BASE_URL}/api/auth/login",
                json={"username": "admin", "password": "temp_password_123"}
            )
            
            if login_response.status_code == 200:
                new_token = login_response.json()["access_token"]
                log_test("新密码登录验证", True, "新密码可以正常登录")
                
                # 改回原密码
                print("       恢复原密码...")
                restore_response = httpx.put(
                    f"{BASE_URL}/api/auth/password",
                    headers={"Authorization": f"Bearer {new_token}"},
                    json={
                        "old_password": "temp_password_123",
                        "new_password": "admin123"
                    }
                )
                
                if restore_response.status_code == 200:
                    log_test("恢复原密码", True, "密码已恢复")
                else:
                    log_test("恢复原密码", False, f"状态码: {restore_response.status_code}")
            else:
                log_test("新密码登录验证", False, f"状态码: {login_response.status_code}")
        else:
            log_test("修改密码成功", False, f"状态码: {response.status_code}, 响应: {response.text}")
    except Exception as e:
        log_test("修改密码成功", False, f"请求异常: {str(e)}")


def test_change_password_no_token():
    """
    测试 2.3.3: 无 Token 修改密码返回 401/403
    PUT /api/auth/password 测试无 Token 访问
    """
    print("\n--- 测试 2.3.3: 无 Token 修改密码返回 401/403 ---")
    
    try:
        response = httpx.put(
            f"{BASE_URL}/api/auth/password",
            json={
                "old_password": "admin123",
                "new_password": "new_password_123"
            }
        )
        
        if response.status_code in [401, 403]:
            log_test("无 Token 修改密码返回 401/403", True, f"状态码: {response.status_code}")
        else:
            log_test("无 Token 修改密码返回 401/403", False, f"状态码: {response.status_code}, 响应: {response.text}")
    except Exception as e:
        log_test("无 Token 修改密码返回 401/403", False, f"请求异常: {str(e)}")


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
    主函数：运行所有认证模块测试
    """
    print("=" * 60)
    print("认证模块 API 测试")
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
    
    # ==================== 任务 2.1: 测试登录 API ====================
    print("\n" + "=" * 60)
    print("任务 2.1: 测试登录 API")
    print("=" * 60)
    
    # 测试正确登录
    token = test_login_success()
    
    # 测试错误密码
    test_login_wrong_password()
    
    # 测试错误用户名
    test_login_wrong_username()
    
    # ==================== 任务 2.2: 测试获取当前用户 API ====================
    print("\n" + "=" * 60)
    print("任务 2.2: 测试获取当前用户 API")
    print("=" * 60)
    
    if token:
        # 测试获取当前用户
        test_get_me_success(token)
    else:
        print("⚠️ 跳过获取当前用户测试（无有效 Token）")
    
    # 测试无 Token 访问
    test_get_me_no_token()
    
    # 测试无效 Token 访问
    test_get_me_invalid_token()
    
    # ==================== 任务 2.3: 测试修改密码 API ====================
    print("\n" + "=" * 60)
    print("任务 2.3: 测试修改密码 API")
    print("=" * 60)
    
    if token:
        # 测试旧密码错误
        test_change_password_wrong_old(token)
        
        # 测试修改密码成功
        test_change_password_success(token)
    else:
        print("⚠️ 跳过修改密码测试（无有效 Token）")
    
    # 测试无 Token 修改密码
    test_change_password_no_token()
    
    # 打印汇总
    print_summary()
    
    # 返回退出码
    return 0 if test_results["failed"] == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
