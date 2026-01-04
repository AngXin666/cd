"""
认证系统测试模块
测试登录、Token 验证、密码修改等功能

Requirements: Requirement 1 - 认证系统
"""

from fastapi.testclient import TestClient
from sqlmodel import Session

# 导入测试工具
from tests.factories import UserFactory
from tests.helpers import (
    get_auth_headers, assert_success_response, assert_error_response,
    assert_unauthorized,
    create_test_token, create_expired_token, create_invalid_token,
    login_user
)

# 导入模型和认证模块
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models import User, UserRole


# ==================== 登录功能测试 ====================
# Requirements: Requirement 1 (AC 1-2)

class TestLogin:
    """登录功能测试"""

    def test_login_success(
        self,
        client: TestClient,
        driver_user: User,
        test_password: str
    ):
        """
        测试正确凭据登录成功

        验证：
        - 使用正确的用户名和密码可以登录
        - 返回有效的 access_token
        """
        response = client.post(
            "/api/auth/login",
            json={
                "username": driver_user.username,
                "password": test_password
            }
        )

        data = assert_success_response(response, 200)

        # 验证返回数据
        assert "access_token" in data, "响应中应包含 access_token"
        assert data["token_type"] == "bearer", "token_type 应为 bearer"
        # 注意：当前 API 只返回 token，不返回 user 信息
        # 用户信息需要通过 /api/auth/me 获取

    def test_login_wrong_password(
        self,
        client: TestClient,
        driver_user: User
    ):
        """
        测试错误密码登录失败

        验证：
        - 使用错误密码无法登录
        - 返回 401 状态码
        """
        response = client.post(
            "/api/auth/login",
            json={
                "username": driver_user.username,
                "password": "wrong_password"
            }
        )

        assert_error_response(response, 401)

    def test_login_nonexistent_user(self, client: TestClient):
        """
        测试不存在用户登录失败

        验证：
        - 使用不存在的用户名无法登录
        - 返回 401 状态码
        """
        response = client.post(
            "/api/auth/login",
            json={
                "username": "nonexistent_user",
                "password": "any_password"
            }
        )

        assert_error_response(response, 401)

    def test_login_disabled_user(
        self,
        client: TestClient,
        disabled_user: User,
        test_password: str
    ):
        """
        测试禁用用户可以登录

        验证：
        - 禁用用户可以登录（但只能查看数据，无法进行数据录入操作）
        - 返回 200 状态码和有效的 access_token

        Requirements: 8.1, 12.3 - 禁用用户可登录查看但无法进行数据录入操作
        """
        response = client.post(
            "/api/auth/login",
            json={
                "username": disabled_user.username,
                "password": test_password
            }
        )

        # 禁用用户可以登录
        data = assert_success_response(response, 200)
        assert "access_token" in data, "禁用用户登录应返回 access_token"

    def test_login_empty_username(self, client: TestClient):
        """
        测试空用户名登录失败

        验证：
        - 空用户名无法登录
        - 返回 422 验证错误
        """
        response = client.post(
            "/api/auth/login",
            json={
                "username": "",
                "password": "any_password"
            }
        )

        # 可能返回 401 或 422
        assert response.status_code in [401, 422]

    def test_login_empty_password(
        self,
        client: TestClient,
        driver_user: User
    ):
        """
        测试空密码登录失败

        验证：
        - 空密码无法登录
        - 返回错误状态码
        """
        response = client.post(
            "/api/auth/login",
            json={
                "username": driver_user.username,
                "password": ""
            }
        )

        # 可能返回 401 或 422
        assert response.status_code in [401, 422]

    def test_login_all_roles(
        self,
        client: TestClient,
        session: Session,
        test_password: str
    ):
        """
        测试所有角色都能登录

        验证：
        - 司机、车队长、调度、老板都能正常登录
        
        注意：SUPER_ADMIN 角色已被移除
        """
        roles = [
            (UserRole.DRIVER, "driver_test"),
            (UserRole.MANAGER, "manager_test"),
            (UserRole.PEER_ADMIN, "peer_admin_test"),
            (UserRole.BOSS, "boss_test"),
        ]

        for role, username in roles:
            # 创建用户
            user = UserFactory.create(
                session,
                username=username,
                password=test_password,
                role=role
            )

            # 登录
            response = client.post(
                "/api/auth/login",
                json={
                    "username": username,
                    "password": test_password
                }
            )

            data = assert_success_response(response, 200)
            # 验证登录成功返回 token
            assert "access_token" in data, f"角色 {role.value} 登录应返回 access_token"


# ==================== Token 验证测试 ====================
# Requirements: Requirement 1 (AC 3-4)

class TestTokenValidation:
    """Token 验证测试"""

    def test_valid_token_access(
        self,
        client: TestClient,
        driver_user: User,
        driver_token: str
    ):
        """
        测试有效 Token 访问成功

        验证：
        - 使用有效 Token 可以访问受保护的端点
        - 返回正确的用户信息
        """
        response = client.get(
            "/api/auth/me",
            headers=get_auth_headers(driver_token)
        )

        data = assert_success_response(response, 200)

        assert data["id"] == driver_user.id
        assert data["username"] == driver_user.username

    def test_expired_token_access(
        self,
        client: TestClient,
        driver_user: User
    ):
        """
        测试过期 Token 访问失败

        验证：
        - 使用过期 Token 无法访问受保护的端点
        - 返回 401 状态码
        """
        # 创建过期 Token
        expired_token = create_expired_token(driver_user.id)

        response = client.get(
            "/api/auth/me",
            headers=get_auth_headers(expired_token)
        )

        assert_unauthorized(response)

    def test_invalid_token_access(self, client: TestClient):
        """
        测试无效 Token 访问失败

        验证：
        - 使用无效 Token 无法访问受保护的端点
        - 返回 401 或 403 状态码
        """
        invalid_token = create_invalid_token()

        response = client.get(
            "/api/auth/me",
            headers=get_auth_headers(invalid_token)
        )

        assert response.status_code in [401, 403]

    def test_no_token_access(self, client: TestClient):
        """
        测试无 Token 访问失败

        验证：
        - 不提供 Token 无法访问受保护的端点
        - 返回 401 或 403 状态码
        """
        response = client.get("/api/auth/me")

        assert response.status_code in [401, 403]

    def test_malformed_token_access(self, client: TestClient):
        """
        测试格式错误的 Token 访问失败

        验证：
        - 使用格式错误的 Token 无法访问
        """
        # 测试各种格式错误的 Token
        malformed_tokens = [
            "not.a.valid.jwt",
            "Bearer ",
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",  # 只有 header
            "",
        ]

        for token in malformed_tokens:
            response = client.get(
                "/api/auth/me",
                headers={"Authorization": f"Bearer {token}"}
            )
            assert response.status_code in [401, 403, 422], \
                f"格式错误的 Token '{token}' 应该被拒绝"

    def test_disabled_user_token_access(
        self,
        client: TestClient,
        disabled_user: User
    ):
        """
        测试禁用用户的 Token 可以访问查看接口

        验证：
        - 禁用用户可以访问查看类接口（如获取用户信息）
        - 返回 200 状态码

        Requirements: 8.1, 12.3 - 禁用用户可登录查看但无法进行数据录入操作
        """
        # 为禁用用户创建 Token
        token = create_test_token(disabled_user.id)

        response = client.get(
            "/api/auth/me",
            headers=get_auth_headers(token)
        )

        # 禁用用户可以访问查看类接口
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == disabled_user.id


# ==================== 密码修改测试 ====================
# Requirements: Requirement 1 (AC 5)

class TestPasswordChange:
    """密码修改测试"""

    def test_change_password_success(
        self,
        client: TestClient,
        session: Session,
        test_password: str
    ):
        """
        测试正确旧密码可修改

        验证：
        - 提供正确的旧密码可以修改密码
        - 修改后可以使用新密码登录
        """
        # 创建测试用户
        user = UserFactory.create(
            session,
            username="password_test_user",
            password=test_password
        )

        # 登录获取 Token
        token = login_user(client, user.username, test_password)
        assert token is not None, "登录失败"

        # 修改密码
        new_password = "new_password_123"
        response = client.put(
            "/api/auth/password",
            json={
                "old_password": test_password,
                "new_password": new_password
            },
            headers=get_auth_headers(token)
        )

        assert_success_response(response, 200)

        # 验证新密码可以登录
        new_token = login_user(client, user.username, new_password)
        assert new_token is not None, "使用新密码登录失败"

    def test_change_password_wrong_old(
        self,
        client: TestClient,
        driver_user: User,
        driver_token: str
    ):
        """
        测试错误旧密码无法修改

        验证：
        - 提供错误的旧密码无法修改密码
        - 返回 400 或 401 状态码
        """
        response = client.put(
            "/api/auth/password",
            json={
                "old_password": "wrong_old_password",
                "new_password": "new_password_123"
            },
            headers=get_auth_headers(driver_token)
        )

        assert response.status_code in [400, 401]

    def test_change_password_new_works(
        self,
        client: TestClient,
        session: Session,
        test_password: str
    ):
        """
        测试新密码生效

        验证：
        - 修改密码后，旧密码无法登录
        - 新密码可以登录
        """
        # 创建测试用户
        user = UserFactory.create(
            session,
            username="password_verify_user",
            password=test_password
        )

        # 登录获取 Token
        token = login_user(client, user.username, test_password)
        assert token is not None

        # 修改密码
        new_password = "new_secure_password"
        response = client.put(
            "/api/auth/password",
            json={
                "old_password": test_password,
                "new_password": new_password
            },
            headers=get_auth_headers(token)
        )

        assert_success_response(response, 200)

        # 验证旧密码无法登录
        old_token = login_user(client, user.username, test_password)
        assert old_token is None, "旧密码不应该能登录"

        # 验证新密码可以登录
        new_token = login_user(client, user.username, new_password)
        assert new_token is not None, "新密码应该能登录"

    def test_change_password_without_auth(self, client: TestClient):
        """
        测试未认证无法修改密码

        验证：
        - 不提供 Token 无法修改密码
        """
        response = client.put(
            "/api/auth/password",
            json={
                "old_password": "any",
                "new_password": "any"
            }
        )

        assert response.status_code in [401, 403]

    def test_change_password_empty_new(
        self,
        client: TestClient,
        driver_token: str,
        test_password: str
    ):
        """
        测试空新密码无法修改

        验证：
        - 新密码为空时无法修改
        """
        response = client.put(
            "/api/auth/password",
            json={
                "old_password": test_password,
                "new_password": ""
            },
            headers=get_auth_headers(driver_token)
        )

        # 应该返回验证错误或业务错误
        assert response.status_code in [400, 422]


# ==================== 获取当前用户测试 ====================

class TestGetCurrentUser:
    """获取当前用户信息测试"""

    def test_get_me_success(
        self,
        client: TestClient,
        driver_user: User,
        driver_token: str
    ):
        """
        测试获取当前用户信息成功

        验证：
        - 返回正确的用户信息
        - 不返回密码哈希
        """
        response = client.get(
            "/api/auth/me",
            headers=get_auth_headers(driver_token)
        )

        data = assert_success_response(response, 200)

        assert data["id"] == driver_user.id
        assert data["username"] == driver_user.username
        assert data["name"] == driver_user.name
        # 处理 role 可能是枚举或字符串的情况
        expected_role = driver_user.role.value if hasattr(driver_user.role, 'value') else driver_user.role
        assert data["role"] == expected_role

        # 不应该返回密码
        assert "password" not in data
        assert "password_hash" not in data

    def test_get_me_all_roles(
        self,
        client: TestClient,
        super_admin_user: User,
        super_admin_token: str,
        boss_user: User,
        boss_token: str,
        manager_user: User,
        manager_token: str,
        driver_user: User,
        driver_token: str
    ):
        """
        测试所有角色都能获取自己的信息
        """
        test_cases = [
            (super_admin_user, super_admin_token),
            (boss_user, boss_token),
            (manager_user, manager_token),
            (driver_user, driver_token),
        ]

        for user, token in test_cases:
            response = client.get(
                "/api/auth/me",
                headers=get_auth_headers(token)
            )

            data = assert_success_response(response, 200)
            assert data["id"] == user.id
            # 处理 role 可能是枚举或字符串的情况
            expected_role = user.role.value if hasattr(user.role, 'value') else user.role
            assert data["role"] == expected_role


# ==================== 禁用用户数据录入限制测试 ====================
# Requirements: 8.1, 12.3 - 禁用用户可登录查看但无法进行数据录入操作

class TestDisabledUserDataEntry:
    """禁用用户数据录入限制测试"""

    def test_disabled_user_cannot_clock_in(
        self,
        client: TestClient,
        disabled_user: User
    ):
        """
        测试禁用用户无法打卡

        验证：
        - 禁用用户尝试打卡时返回 403 错误
        - 错误代码为 user_disabled
        """
        # 为禁用用户创建 Token
        token = create_test_token(disabled_user.id)

        response = client.post(
            "/api/attendance/clock-in",
            headers=get_auth_headers(token)
        )

        # 应该返回 403，因为用户被禁用
        assert response.status_code == 403
        data = response.json()

        # 验证错误代码
        if "detail" in data and isinstance(data["detail"], dict):
            assert data["detail"].get("error_code") == "user_disabled"

    def test_disabled_user_can_view_attendance(
        self,
        client: TestClient,
        disabled_user: User
    ):
        """
        测试禁用用户可以查看考勤记录

        验证：
        - 禁用用户可以查看自己的考勤记录
        - 返回 200 状态码
        """
        # 为禁用用户创建 Token
        token = create_test_token(disabled_user.id)

        response = client.get(
            "/api/attendance",
            headers=get_auth_headers(token)
        )

        # 禁用用户可以查看考勤记录
        assert response.status_code == 200
