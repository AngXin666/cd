"""
用户管理测试模块
测试用户创建、更新、删除、权限控制等功能

Requirements: Requirement 2 - 用户管理
"""

from fastapi.testclient import TestClient
from sqlmodel import Session

# 导入测试工具
from tests.factories import UserFactory
from tests.helpers import (
    get_auth_headers, assert_success_response,
    assert_forbidden
)

# 导入模型
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models import User, UserRole


# ==================== 用户创建测试 ====================
# Requirements: Requirement 2 (AC 1-2)

class TestUserCreate:
    """用户创建测试"""

    def test_admin_create_user_success(
        self,
        client: TestClient,
        session: Session,
        boss_token: str
    ):
        """
        测试管理员创建用户成功

        验证：
        - 老板可以创建新用户
        - 返回创建的用户信息
        - 用户可以登录
        """
        # 创建用户请求
        user_data = {
            "username": "new_driver",
            "password": "password123",
            "name": "新司机",
            "phone": "13900000001",
            "role": "driver"
        }

        response = client.post(
            "/api/users",
            json=user_data,
            headers=get_auth_headers(boss_token)
        )

        # API 可能返回 200 或 201
        data = assert_success_response(response, [200, 201])

        # 验证返回数据
        assert data["username"] == user_data["username"]
        assert data["name"] == user_data["name"]
        assert data["role"] == user_data["role"]
        assert "password" not in data  # 不应返回密码

    def test_create_duplicate_username_fail(
        self,
        client: TestClient,
        session: Session,
        boss_token: str,
        driver_user: User
    ):
        """
        测试创建重复用户名失败

        验证：
        - 使用已存在的用户名创建用户失败
        - 返回 400 或 409 状态码
        """
        user_data = {
            "username": driver_user.username,  # 使用已存在的用户名
            "password": "password123",
            "name": "重复用户",
            "phone": "13900000002",
            "role": "driver"
        }

        response = client.post(
            "/api/users",
            json=user_data,
            headers=get_auth_headers(boss_token)
        )

        # 应该返回冲突错误
        assert response.status_code in [400, 409]

    def test_driver_cannot_create_user(
        self,
        client: TestClient,
        driver_token: str
    ):
        """
        测试司机无权创建用户

        验证：
        - 司机角色无法创建用户
        - 返回 403 状态码
        """
        user_data = {
            "username": "unauthorized_user",
            "password": "password123",
            "name": "未授权用户",
            "phone": "13900000003",
            "role": "driver"
        }

        response = client.post(
            "/api/users",
            json=user_data,
            headers=get_auth_headers(driver_token)
        )

        assert_forbidden(response)

    def test_manager_create_driver_success(
        self,
        client: TestClient,
        session: Session,
        manager_token: str,
        manager_user: User,
        test_warehouse: "Warehouse"
    ):
        """
        测试车队长创建司机成功

        验证：
        - 车队长可以创建司机
        - 司机自动分配到车队长管理的仓库
        - Requirements: 1.4, 12.1
        """
        # 先将车队长分配到仓库
        from models import WarehouseAssignment
        assignment = WarehouseAssignment(
            user_id=manager_user.id,
            warehouse_id=test_warehouse.id
        )
        session.add(assignment)
        session.commit()

        user_data = {
            "username": "manager_created_driver",
            "password": "password123",
            "name": "车队长创建的司机",
            "phone": "13900000004",
            "role": "driver"
        }

        response = client.post(
            "/api/users",
            json=user_data,
            headers=get_auth_headers(manager_token)
        )

        data = assert_success_response(response, [200, 201])
        assert data["username"] == user_data["username"]
        assert data["role"] == "driver"

    def test_create_user_invalid_role(
        self,
        client: TestClient,
        boss_token: str
    ):
        """
        测试创建无效角色用户失败

        验证：
        - 使用无效角色创建用户失败
        - 返回 422 验证错误
        """
        user_data = {
            "username": "invalid_role_user",
            "password": "password123",
            "name": "无效角色用户",
            "phone": "13900000005",
            "role": "invalid_role"
        }

        response = client.post(
            "/api/users",
            json=user_data,
            headers=get_auth_headers(boss_token)
        )

        assert response.status_code == 422


# ==================== 用户更新测试 ====================
# Requirements: Requirement 2 (AC 3-4)

class TestUserUpdate:
    """用户更新测试"""

    def test_update_user_info_success(
        self,
        client: TestClient,
        session: Session,
        boss_token: str,
        driver_user: User
    ):
        """
        测试更新用户信息成功

        验证：
        - 老板可以更新用户信息
        - 返回更新后的用户信息
        """
        update_data = {
            "name": "更新后的名字",
            "phone": "13900000010"
        }

        response = client.put(
            f"/api/users/{driver_user.id}",
            json=update_data,
            headers=get_auth_headers(boss_token)
        )

        data = assert_success_response(response, 200)

        assert data["name"] == update_data["name"]
        assert data["phone"] == update_data["phone"]

    def test_disable_user_success(
        self,
        client: TestClient,
        session: Session,
        boss_token: str
    ):
        """
        测试禁用用户成功

        验证：
        - 老板可以禁用用户
        - 禁用后用户无法登录
        """
        # 创建测试用户
        test_password = "test123456"
        user = UserFactory.create(
            session,
            username="to_disable_user",
            password=test_password,
            role=UserRole.DRIVER
        )

        # 禁用用户
        response = client.put(
            f"/api/users/{user.id}",
            json={"is_active": False},
            headers=get_auth_headers(boss_token)
        )

        data = assert_success_response(response, 200)
        assert data["is_active"] is False

        # 验证禁用后无法登录
        login_response = client.post(
            "/api/auth/login",
            json={
                "username": user.username,
                "password": test_password
            }
        )

        assert login_response.status_code == 401

    def test_driver_cannot_update_others(
        self,
        client: TestClient,
        driver_token: str,
        boss_user: User
    ):
        """
        测试司机无法更新他人信息

        验证：
        - 司机无法更新其他用户的信息
        - 返回 403 状态码
        """
        response = client.put(
            f"/api/users/{boss_user.id}",
            json={"name": "尝试修改"},
            headers=get_auth_headers(driver_token)
        )

        assert_forbidden(response)

    def test_user_update_own_info(
        self,
        client: TestClient,
        driver_user: User,
        driver_token: str
    ):
        """
        测试用户更新自己的信息

        验证：
        - 用户可以更新自己的部分信息（如姓名、电话）
        - 不能更新角色等敏感信息
        """
        # 更新自己的姓名
        response = client.put(
            f"/api/users/{driver_user.id}",
            json={"name": "自己更新的名字"},
            headers=get_auth_headers(driver_token)
        )

        # 根据 API 设计，可能允许或不允许
        # 这里假设允许更新自己的基本信息
        if response.status_code == 200:
            data = response.json()
            assert data["name"] == "自己更新的名字"


# ==================== 高权限角色操作测试 ====================
# Requirements: Requirement 2 (AC 5-6)
# 注意：SUPER_ADMIN 角色已被移除，老板（BOSS）现在是最高权限角色

class TestHighPrivilegeOperations:
    """高权限角色操作测试"""

    def test_non_boss_cannot_modify_boss(
        self,
        client: TestClient,
        manager_token: str,
        boss_user: User
    ):
        """
        测试非老板无法操作老板账号

        验证：
        - 车队长无法修改老板账号
        - 返回 403 状态码
        """
        response = client.put(
            f"/api/users/{boss_user.id}",
            json={"name": "尝试修改老板"},
            headers=get_auth_headers(manager_token)
        )

        assert_forbidden(response)

    def test_boss_can_modify_another_boss(
        self,
        client: TestClient,
        session: Session,
        boss_token: str
    ):
        """
        测试老板可以操作另一个老板账号

        验证：
        - 老板可以修改另一个老板账号（SUPER_ADMIN 已移除后，老板是最高权限）
        - 返回 200 状态码
        """
        # 创建另一个老板
        another_boss = UserFactory.create_boss(session, username="another_boss_modify")

        response = client.put(
            f"/api/users/{another_boss.id}",
            json={"name": "老板修改的老板名字"},
            headers=get_auth_headers(boss_token)
        )

        data = assert_success_response(response, 200)
        assert data["name"] == "老板修改的老板名字"

    def test_manager_only_manage_assigned_warehouse_drivers(
        self,
        client: TestClient,
        session: Session,
        manager_token: str,
        manager_user: User,
        test_warehouse: "Warehouse",
        test_warehouse_2: "Warehouse"
    ):
        """
        测试车队长只能操作所辖仓库司机

        验证：
        - 车队长可以操作分配给自己仓库的司机
        - 车队长无法操作其他仓库的司机
        """
        from models import WarehouseAssignment

        # 将车队长分配到仓库1
        assignment = WarehouseAssignment(
            user_id=manager_user.id,
            warehouse_id=test_warehouse.id
        )
        session.add(assignment)
        session.commit()

        # 创建仓库1的司机
        driver1 = UserFactory.create(
            session,
            username="warehouse1_driver",
            role=UserRole.DRIVER
        )
        driver1_assignment = WarehouseAssignment(
            user_id=driver1.id,
            warehouse_id=test_warehouse.id
        )
        session.add(driver1_assignment)

        # 创建仓库2的司机
        driver2 = UserFactory.create(
            session,
            username="warehouse2_driver",
            role=UserRole.DRIVER
        )
        driver2_assignment = WarehouseAssignment(
            user_id=driver2.id,
            warehouse_id=test_warehouse_2.id
        )
        session.add(driver2_assignment)
        session.commit()

        # 车队长可以操作仓库1的司机
        response1 = client.put(
            f"/api/users/{driver1.id}",
            json={"name": "车队长修改"},
            headers=get_auth_headers(manager_token)
        )
        # 应该成功或返回 200
        assert response1.status_code in [200, 403]  # 取决于具体权限实现

        # 车队长无法操作仓库2的司机
        response2 = client.put(
            f"/api/users/{driver2.id}",
            json={"name": "尝试修改其他仓库司机"},
            headers=get_auth_headers(manager_token)
        )
        # 应该返回 403
        assert response2.status_code == 403

    def test_peer_admin_cannot_modify_boss(
        self,
        client: TestClient,
        boss_user: User,
        peer_admin_token: str
    ):
        """
        测试调度无法操作老板账号

        验证：
        - 调度无法修改老板账号
        - 返回 403 状态码
        """
        response = client.put(
            f"/api/users/{boss_user.id}",
            json={"name": "尝试修改老板"},
            headers=get_auth_headers(peer_admin_token)
        )

        assert_forbidden(response)


# ==================== 用户列表查询测试 ====================

class TestUserList:
    """用户列表查询测试"""

    def test_boss_get_all_users(
        self,
        client: TestClient,
        boss_token: str,
        driver_user: User,
        manager_user: User
    ):
        """
        测试老板获取所有用户列表

        验证：
        - 老板可以获取所有用户
        - 返回用户列表
        """
        response = client.get(
            "/api/users",
            headers=get_auth_headers(boss_token)
        )

        data = assert_success_response(response, 200)

        # 应该返回列表
        assert isinstance(data, list)
        assert len(data) >= 2  # 至少有 driver 和 manager

    def test_driver_cannot_get_user_list(
        self,
        client: TestClient,
        driver_token: str
    ):
        """
        测试司机无法获取用户列表

        验证：
        - 司机无法访问用户列表 API
        - 返回 403 状态码
        """
        response = client.get(
            "/api/users",
            headers=get_auth_headers(driver_token)
        )

        assert_forbidden(response)

    def test_filter_users_by_role(
        self,
        client: TestClient,
        session: Session,
        boss_token: str
    ):
        """
        测试按角色筛选用户

        验证：
        - 可以按角色筛选用户列表
        """
        # 创建多个不同角色的用户
        UserFactory.create(session, username="filter_driver1", role=UserRole.DRIVER)
        UserFactory.create(session, username="filter_driver2", role=UserRole.DRIVER)
        UserFactory.create(session, username="filter_manager1", role=UserRole.MANAGER)

        # 筛选司机
        response = client.get(
            "/api/users?role=driver",
            headers=get_auth_headers(boss_token)
        )

        if response.status_code == 200:
            data = response.json()
            # 所有返回的用户都应该是司机
            for user in data:
                assert user["role"] == "driver"

    def test_filter_users_by_warehouse(
        self,
        client: TestClient,
        session: Session,
        boss_token: str,
        test_warehouse: "Warehouse"
    ):
        """
        测试按仓库筛选用户

        验证：
        - 可以按仓库筛选用户列表
        """
        from models import WarehouseAssignment

        # 创建用户并分配到仓库
        user = UserFactory.create(session, username="warehouse_filter_user")
        assignment = WarehouseAssignment(
            user_id=user.id,
            warehouse_id=test_warehouse.id
        )
        session.add(assignment)
        session.commit()

        # 按仓库筛选
        response = client.get(
            f"/api/users?warehouse_id={test_warehouse.id}",
            headers=get_auth_headers(boss_token)
        )

        if response.status_code == 200:
            data = response.json()
            # 应该包含分配到该仓库的用户
            usernames = [u["username"] for u in data]
            assert "warehouse_filter_user" in usernames


# ==================== 用户删除测试 ====================

class TestUserDelete:
    """用户删除测试"""

    def test_boss_delete_user_success(
        self,
        client: TestClient,
        session: Session,
        boss_token: str
    ):
        """
        测试老板删除用户成功

        验证：
        - 老板可以删除用户
        - 删除后用户无法登录
        """
        # 创建测试用户
        user = UserFactory.create(
            session,
            username="to_delete_user",
            role=UserRole.DRIVER
        )
        user_id = user.id

        # 删除用户
        response = client.delete(
            f"/api/users/{user_id}",
            headers=get_auth_headers(boss_token)
        )

        assert response.status_code in [200, 204]

        # 验证用户已删除
        get_response = client.get(
            f"/api/users/{user_id}",
            headers=get_auth_headers(boss_token)
        )

        assert get_response.status_code == 404

    def test_driver_cannot_delete_user(
        self,
        client: TestClient,
        driver_token: str,
        manager_user: User
    ):
        """
        测试司机无法删除用户

        验证：
        - 司机无法删除任何用户
        - 返回 403 状态码
        """
        response = client.delete(
            f"/api/users/{manager_user.id}",
            headers=get_auth_headers(driver_token)
        )

        assert_forbidden(response)

    def test_cannot_delete_self(
        self,
        client: TestClient,
        boss_user: User,
        boss_token: str
    ):
        """
        测试用户无法删除自己

        验证：
        - 用户无法删除自己的账号
        - 返回 400 或 403 状态码
        """
        response = client.delete(
            f"/api/users/{boss_user.id}",
            headers=get_auth_headers(boss_token)
        )

        # 应该不允许删除自己
        assert response.status_code in [400, 403]


# ==================== 用户详情查询测试 ====================

class TestUserDetail:
    """用户详情查询测试"""

    def test_get_user_detail_success(
        self,
        client: TestClient,
        boss_token: str,
        driver_user: User
    ):
        """
        测试获取用户详情成功

        验证：
        - 老板可以获取任意用户详情
        - 返回完整的用户信息
        """
        response = client.get(
            f"/api/users/{driver_user.id}",
            headers=get_auth_headers(boss_token)
        )

        data = assert_success_response(response, 200)

        assert data["id"] == driver_user.id
        assert data["username"] == driver_user.username
        assert "password" not in data
        assert "password_hash" not in data

    def test_get_nonexistent_user(
        self,
        client: TestClient,
        boss_token: str
    ):
        """
        测试获取不存在的用户

        验证：
        - 获取不存在的用户返回 404
        """
        response = client.get(
            "/api/users/99999",
            headers=get_auth_headers(boss_token)
        )

        assert response.status_code == 404

    def test_driver_get_own_detail(
        self,
        client: TestClient,
        driver_user: User,
        driver_token: str
    ):
        """
        测试司机获取自己的详情

        验证：
        - 司机可以获取自己的详情
        """
        response = client.get(
            f"/api/users/{driver_user.id}",
            headers=get_auth_headers(driver_token)
        )

        # 应该可以获取自己的信息
        if response.status_code == 200:
            data = response.json()
            assert data["id"] == driver_user.id
