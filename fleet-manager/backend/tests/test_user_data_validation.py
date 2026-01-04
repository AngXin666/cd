"""
用户数据验证单元测试模块
测试用户创建和查询时的数据验证逻辑

测试覆盖：
- 用户名唯一性约束 (Requirements 1.6)
- 无效角色被拒绝 (Requirements 1.7)
- 必填字段验证 (Requirements 1.8)
- 用户详情不泄露密码 (Requirements 4.6)

Requirements: 用户管理功能全面测试 - Task 5
"""

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

# 导入测试工具
from tests.factories import UserFactory
from tests.helpers import (
    get_auth_headers, assert_success_response,
    assert_validation_error
)

# 导入模型
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models import User, UserRole


# ==================== 用户名唯一性约束测试 ====================
# Requirements: 1.6


class TestUsernameUniqueness:
    """
    用户名唯一性约束测试
    
    验证系统正确拒绝重复的用户名
    **Validates: Requirements 1.6**
    """

    def test_duplicate_username_rejected(
        self,
        client: TestClient,
        session: Session,
        boss_token: str
    ):
        """
        测试创建重复用户名被拒绝
        
        验证：
        - 创建已存在用户名的用户返回 400 或 409 错误
        - Requirements: 1.6
        """
        # 创建第一个用户
        existing_user = UserFactory.create(
            session,
            username="unique_test_user",
            role=UserRole.DRIVER
        )

        # 尝试创建同名用户
        user_data = {
            "username": "unique_test_user",  # 重复用户名
            "password": "password123",
            "name": "重复用户",
            "phone": "13900000001",
            "role": "driver"
        }

        response = client.post(
            "/api/users",
            json=user_data,
            headers=get_auth_headers(boss_token)
        )

        # 应返回 400 或 409 错误
        assert response.status_code in [400, 409], \
            f"重复用户名应返回 400/409，实际: {response.status_code}"

    def test_different_username_accepted(
        self,
        client: TestClient,
        session: Session,
        boss_token: str
    ):
        """
        测试不同用户名可以创建成功
        
        验证：
        - 使用不同用户名创建用户成功
        - Requirements: 1.6
        """
        # 创建第一个用户
        UserFactory.create(
            session,
            username="first_user_unique",
            role=UserRole.DRIVER
        )

        # 创建不同用户名的用户
        user_data = {
            "username": "second_user_unique",  # 不同用户名
            "password": "password123",
            "name": "第二个用户",
            "phone": "13900000002",
            "role": "driver"
        }

        response = client.post(
            "/api/users",
            json=user_data,
            headers=get_auth_headers(boss_token)
        )

        # 应成功创建
        data = assert_success_response(response, [200, 201])
        assert data["username"] == "second_user_unique"

    def test_case_sensitive_username(
        self,
        client: TestClient,
        session: Session,
        boss_token: str
    ):
        """
        测试用户名大小写敏感性
        
        验证：
        - 用户名大小写是否敏感取决于系统设计
        - Requirements: 1.6
        """
        # 创建小写用户名
        UserFactory.create(
            session,
            username="casetest",
            role=UserRole.DRIVER
        )

        # 尝试创建大写用户名
        user_data = {
            "username": "CASETEST",  # 大写版本
            "password": "password123",
            "name": "大写用户",
            "phone": "13900000003",
            "role": "driver"
        }

        response = client.post(
            "/api/users",
            json=user_data,
            headers=get_auth_headers(boss_token)
        )

        # 根据系统设计，可能成功或失败
        # 记录实际行为以便文档化
        assert response.status_code in [200, 201, 400, 409], \
            f"用户名大小写测试返回意外状态码: {response.status_code}"


# ==================== 无效角色验证测试 ====================
# Requirements: 1.7


class TestInvalidRoleValidation:
    """
    无效角色验证测试
    
    验证系统正确拒绝无效的角色值
    **Validates: Requirements 1.7**
    """

    def test_invalid_role_rejected(
        self,
        client: TestClient,
        boss_token: str
    ):
        """
        测试无效角色被拒绝
        
        验证：
        - 使用无效角色值创建用户返回 422 验证错误
        - Requirements: 1.7
        """
        user_data = {
            "username": "invalid_role_user",
            "password": "password123",
            "name": "无效角色用户",
            "phone": "13900000004",
            "role": "invalid_role"  # 无效角色
        }

        response = client.post(
            "/api/users",
            json=user_data,
            headers=get_auth_headers(boss_token)
        )

        # 应返回 422 验证错误
        assert response.status_code == 422, \
            f"无效角色应返回 422，实际: {response.status_code}"

    def test_empty_role_rejected(
        self,
        client: TestClient,
        boss_token: str
    ):
        """
        测试空角色被拒绝
        
        验证：
        - 使用空字符串角色创建用户返回验证错误
        - Requirements: 1.7
        """
        user_data = {
            "username": "empty_role_user",
            "password": "password123",
            "name": "空角色用户",
            "phone": "13900000005",
            "role": ""  # 空角色
        }

        response = client.post(
            "/api/users",
            json=user_data,
            headers=get_auth_headers(boss_token)
        )

        # 应返回 422 验证错误
        assert response.status_code == 422, \
            f"空角色应返回 422，实际: {response.status_code}"

    def test_numeric_role_rejected(
        self,
        client: TestClient,
        boss_token: str
    ):
        """
        测试数字角色被拒绝
        
        验证：
        - 使用数字作为角色值创建用户返回验证错误
        - Requirements: 1.7
        """
        user_data = {
            "username": "numeric_role_user",
            "password": "password123",
            "name": "数字角色用户",
            "phone": "13900000006",
            "role": 123  # 数字角色
        }

        response = client.post(
            "/api/users",
            json=user_data,
            headers=get_auth_headers(boss_token)
        )

        # 应返回 422 验证错误
        assert response.status_code == 422, \
            f"数字角色应返回 422，实际: {response.status_code}"

    def test_valid_roles_accepted(
        self,
        client: TestClient,
        session: Session,
        boss_token: str
    ):
        """
        测试有效角色被接受
        
        验证：
        - 所有有效角色值都可以成功创建用户
        - Requirements: 1.7
        """
        valid_roles = ["driver", "manager", "peer_admin", "boss"]

        for i, role in enumerate(valid_roles):
            user_data = {
                "username": f"valid_role_user_{role}_{i}",
                "password": "password123",
                "name": f"有效角色用户_{role}",
                "phone": f"1390000{1000 + i}",
                "role": role
            }

            response = client.post(
                "/api/users",
                json=user_data,
                headers=get_auth_headers(boss_token)
            )

            # 应成功创建
            assert response.status_code in [200, 201], \
                f"有效角色 {role} 应成功创建，实际: {response.status_code}"


# ==================== 必填字段验证测试 ====================
# Requirements: 1.8


class TestRequiredFieldValidation:
    """
    必填字段验证测试
    
    验证系统正确拒绝缺少必填字段的请求
    **Validates: Requirements 1.8**
    """

    def test_missing_username_rejected(
        self,
        client: TestClient,
        boss_token: str
    ):
        """
        测试缺少用户名被拒绝
        
        验证：
        - 缺少 username 字段返回 422 验证错误
        - Requirements: 1.8
        """
        user_data = {
            # "username": 缺少
            "password": "password123",
            "name": "缺少用户名",
            "phone": "13900000007",
            "role": "driver"
        }

        response = client.post(
            "/api/users",
            json=user_data,
            headers=get_auth_headers(boss_token)
        )

        # 应返回 422 验证错误
        assert response.status_code == 422, \
            f"缺少用户名应返回 422，实际: {response.status_code}"

    def test_missing_password_rejected(
        self,
        client: TestClient,
        boss_token: str
    ):
        """
        测试缺少密码被拒绝
        
        验证：
        - 缺少 password 字段返回 422 验证错误
        - Requirements: 1.8
        """
        user_data = {
            "username": "missing_password_user",
            # "password": 缺少
            "name": "缺少密码",
            "phone": "13900000008",
            "role": "driver"
        }

        response = client.post(
            "/api/users",
            json=user_data,
            headers=get_auth_headers(boss_token)
        )

        # 应返回 422 验证错误
        assert response.status_code == 422, \
            f"缺少密码应返回 422，实际: {response.status_code}"

    def test_missing_name_rejected(
        self,
        client: TestClient,
        boss_token: str
    ):
        """
        测试缺少姓名被拒绝
        
        验证：
        - 缺少 name 字段返回 422 验证错误
        - Requirements: 1.8
        """
        user_data = {
            "username": "missing_name_user",
            "password": "password123",
            # "name": 缺少
            "phone": "13900000009",
            "role": "driver"
        }

        response = client.post(
            "/api/users",
            json=user_data,
            headers=get_auth_headers(boss_token)
        )

        # 应返回 422 验证错误
        assert response.status_code == 422, \
            f"缺少姓名应返回 422，实际: {response.status_code}"

    def test_empty_body_rejected(
        self,
        client: TestClient,
        boss_token: str
    ):
        """
        测试空请求体被拒绝
        
        验证：
        - 空请求体返回 422 验证错误
        - Requirements: 1.8
        """
        response = client.post(
            "/api/users",
            json={},
            headers=get_auth_headers(boss_token)
        )

        # 应返回 422 验证错误
        assert response.status_code == 422, \
            f"空请求体应返回 422，实际: {response.status_code}"

    def test_null_values_rejected(
        self,
        client: TestClient,
        boss_token: str
    ):
        """
        测试 null 值被拒绝
        
        验证：
        - 必填字段为 null 返回 422 验证错误
        - Requirements: 1.8
        """
        user_data = {
            "username": None,  # null 值
            "password": "password123",
            "name": "Null用户名",
            "phone": "13900000010",
            "role": "driver"
        }

        response = client.post(
            "/api/users",
            json=user_data,
            headers=get_auth_headers(boss_token)
        )

        # 应返回 422 验证错误
        assert response.status_code == 422, \
            f"null 用户名应返回 422，实际: {response.status_code}"

    def test_all_required_fields_present_success(
        self,
        client: TestClient,
        boss_token: str
    ):
        """
        测试所有必填字段都存在时成功
        
        验证：
        - 提供所有必填字段可以成功创建用户
        - Requirements: 1.8
        """
        user_data = {
            "username": "all_fields_user",
            "password": "password123",
            "name": "完整字段用户",
            "phone": "13900000011",
            "role": "driver"
        }

        response = client.post(
            "/api/users",
            json=user_data,
            headers=get_auth_headers(boss_token)
        )

        # 应成功创建
        data = assert_success_response(response, [200, 201])
        assert data["username"] == "all_fields_user"


# ==================== 用户详情不泄露密码测试 ====================
# Requirements: 4.6


class TestPasswordNotExposed:
    """
    用户详情不泄露密码测试
    
    验证系统在返回用户信息时不包含密码相关字段
    **Validates: Requirements 4.6**
    """

    def test_user_detail_no_password(
        self,
        client: TestClient,
        session: Session,
        boss_token: str
    ):
        """
        测试用户详情不包含密码
        
        验证：
        - 获取用户详情时不返回 password 字段
        - Requirements: 4.6
        """
        # 创建测试用户
        user = UserFactory.create(
            session,
            username="password_test_user",
            password="secret_password",
            role=UserRole.DRIVER
        )

        # 获取用户详情
        response = client.get(
            f"/api/users/{user.id}",
            headers=get_auth_headers(boss_token)
        )

        data = assert_success_response(response, 200)

        # 验证不包含密码字段
        assert "password" not in data, \
            "用户详情不应包含 password 字段"
        assert "password_hash" not in data, \
            "用户详情不应包含 password_hash 字段"

    def test_user_list_no_password(
        self,
        client: TestClient,
        session: Session,
        boss_token: str
    ):
        """
        测试用户列表不包含密码
        
        验证：
        - 获取用户列表时不返回 password 字段
        - Requirements: 4.6
        """
        # 创建测试用户
        UserFactory.create(
            session,
            username="list_password_test",
            password="secret_password",
            role=UserRole.DRIVER
        )

        # 获取用户列表
        response = client.get(
            "/api/users",
            headers=get_auth_headers(boss_token)
        )

        data = assert_success_response(response, 200)

        # 验证列表中每个用户都不包含密码字段
        for user in data:
            assert "password" not in user, \
                f"用户 {user.get('username')} 不应包含 password 字段"
            assert "password_hash" not in user, \
                f"用户 {user.get('username')} 不应包含 password_hash 字段"

    def test_create_user_response_no_password(
        self,
        client: TestClient,
        boss_token: str
    ):
        """
        测试创建用户响应不包含密码
        
        验证：
        - 创建用户后的响应不返回 password 字段
        - Requirements: 4.6
        """
        user_data = {
            "username": "create_no_password_user",
            "password": "secret_password",
            "name": "创建响应测试",
            "phone": "13900000012",
            "role": "driver"
        }

        response = client.post(
            "/api/users",
            json=user_data,
            headers=get_auth_headers(boss_token)
        )

        data = assert_success_response(response, [200, 201])

        # 验证不包含密码字段
        assert "password" not in data, \
            "创建用户响应不应包含 password 字段"
        assert "password_hash" not in data, \
            "创建用户响应不应包含 password_hash 字段"

    def test_update_user_response_no_password(
        self,
        client: TestClient,
        session: Session,
        boss_token: str
    ):
        """
        测试更新用户响应不包含密码
        
        验证：
        - 更新用户后的响应不返回 password 字段
        - Requirements: 4.6
        """
        # 创建测试用户
        user = UserFactory.create(
            session,
            username="update_no_password_user",
            password="secret_password",
            role=UserRole.DRIVER
        )

        # 更新用户
        response = client.put(
            f"/api/users/{user.id}",
            json={"name": "更新后的名字"},
            headers=get_auth_headers(boss_token)
        )

        data = assert_success_response(response, 200)

        # 验证不包含密码字段
        assert "password" not in data, \
            "更新用户响应不应包含 password 字段"
        assert "password_hash" not in data, \
            "更新用户响应不应包含 password_hash 字段"

    def test_current_user_no_password(
        self,
        client: TestClient,
        driver_user: User,
        driver_token: str
    ):
        """
        测试当前用户信息不包含密码
        
        验证：
        - 获取当前用户信息时不返回 password 字段
        - Requirements: 4.6
        """
        response = client.get(
            "/api/auth/me",
            headers=get_auth_headers(driver_token)
        )

        data = assert_success_response(response, 200)

        # 验证不包含密码字段
        assert "password" not in data, \
            "当前用户信息不应包含 password 字段"
        assert "password_hash" not in data, \
            "当前用户信息不应包含 password_hash 字段"

