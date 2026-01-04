"""
权限系统测试模块
测试各角色的权限控制

Requirements: Requirement 12 - 权限系统
"""

from fastapi.testclient import TestClient
from sqlmodel import Session

# 导入测试工具
from tests.factories import UserFactory, WarehouseFactory, VehicleFactory
from tests.helpers import (
    get_auth_headers, assert_success_response,
    assert_forbidden
)

# 导入模型
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models import User


# ==================== 司机权限测试 ====================
# Requirements: Requirement 12 (AC 1)

class TestDriverPermissions:
    """司机角色权限测试"""

    def test_driver_cannot_access_users_api(
        self,
        client: TestClient,
        driver_token: str
    ):
        """
        测试司机无法访问用户管理 API

        验证：
        - 司机角色无法获取用户列表
        """
        response = client.get(
            "/api/users",
            headers=get_auth_headers(driver_token)
        )

        assert_forbidden(response)

    def test_driver_cannot_create_user(
        self,
        client: TestClient,
        driver_token: str
    ):
        """
        测试司机无法创建用户

        验证：
        - 司机角色无法创建新用户
        """
        response = client.post(
            "/api/users",
            json={
                "username": "driver_created",
                "password": "password123",
                "name": "司机创建",
                "phone": "13800000000",
                "role": "driver"
            },
            headers=get_auth_headers(driver_token)
        )

        assert_forbidden(response)

    def test_driver_cannot_create_warehouse(
        self,
        client: TestClient,
        driver_token: str
    ):
        """
        测试司机无法创建仓库

        验证：
        - 司机角色无法创建仓库
        """
        response = client.post(
            "/api/warehouses",
            json={
                "name": "司机创建的仓库",
                "address": "测试地址"
            },
            headers=get_auth_headers(driver_token)
        )

        assert_forbidden(response)

    def test_driver_can_access_own_data(
        self,
        client: TestClient,
        driver_user: User,
        driver_token: str
    ):
        """
        测试司机可以访问自己的数据

        验证：
        - 司机可以获取自己的信息
        """
        response = client.get(
            "/api/auth/me",
            headers=get_auth_headers(driver_token)
        )

        data = assert_success_response(response, 200)

        assert data["id"] == driver_user.id
        assert data["role"] == "driver"

    def test_driver_can_clock_in(
        self,
        client: TestClient,
        driver_token: str
    ):
        """
        测试司机可以打卡

        验证：
        - 司机可以进行上班打卡
        """
        response = client.post(
            "/api/attendance/clock-in",
            headers=get_auth_headers(driver_token)
        )

        # 应该成功或返回已打卡的错误
        assert response.status_code in [200, 400]

    def test_driver_can_view_warehouses(
        self,
        client: TestClient,
        driver_token: str
    ):
        """
        测试司机可以查看仓库列表

        验证：
        - 司机可以获取仓库列表
        """
        response = client.get(
            "/api/warehouses",
            headers=get_auth_headers(driver_token)
        )

        data = assert_success_response(response, 200)
        assert isinstance(data, list)


# ==================== 车队长权限测试 ====================
# Requirements: Requirement 12 (AC 2)

class TestManagerPermissions:
    """车队长角色权限测试"""

    def test_manager_can_access_users_list(
        self,
        client: TestClient,
        manager_token: str
    ):
        """
        测试车队长可以访问用户列表

        验证：
        - 车队长可以获取用户列表
        """
        response = client.get(
            "/api/users",
            headers=get_auth_headers(manager_token)
        )

        data = assert_success_response(response, 200)
        assert isinstance(data, list)

    def test_manager_can_access_assigned_warehouse(
        self,
        client: TestClient,
        session: Session,
        manager_user: User,
        manager_token: str
    ):
        """
        测试车队长可以访问所辖仓库

        验证：
        - 车队长可以访问分配给自己的仓库
        """
        # 创建仓库并分配给车队长
        warehouse = WarehouseFactory.create(session, name="车队长仓库")
        WarehouseFactory.assign_user(session, manager_user, warehouse)

        response = client.get(
            f"/api/warehouses/{warehouse.id}/users",
            headers=get_auth_headers(manager_token)
        )

        data = assert_success_response(response, 200)
        assert isinstance(data, list)

    def test_manager_can_create_driver(
        self,
        client: TestClient,
        session: Session,
        manager_user: User,
        manager_token: str
    ):
        """
        测试车队长可以创建司机

        验证：
        - 车队长可以创建司机用户
        - Requirements: 1.4, 12.1
        """
        # 创建仓库并分配给车队长
        warehouse = WarehouseFactory.create(session, name="车队长创建司机仓库")
        WarehouseFactory.assign_user(session, manager_user, warehouse)

        response = client.post(
            "/api/users",
            json={
                "username": "manager_created_driver",
                "password": "password123",
                "name": "车队长创建的司机",
                "phone": "13800000001",
                "role": "driver"
            },
            headers=get_auth_headers(manager_token)
        )

        data = assert_success_response(response, 200)
        assert data["username"] == "manager_created_driver"
        assert data["role"] == "driver"

    def test_manager_cannot_create_manager(
        self,
        client: TestClient,
        manager_token: str
    ):
        """
        测试车队长无法创建车队长

        验证：
        - 车队长只能创建司机，不能创建车队长
        - Requirements: 1.4
        """
        response = client.post(
            "/api/users",
            json={
                "username": "manager_try_create_manager",
                "password": "password123",
                "name": "车队长尝试创建车队长",
                "phone": "13800000002",
                "role": "manager"
            },
            headers=get_auth_headers(manager_token)
        )

        assert_forbidden(response)

    def test_manager_cannot_create_boss(
        self,
        client: TestClient,
        manager_token: str
    ):
        """
        测试车队长无法创建老板

        验证：
        - 车队长只能创建司机，不能创建老板
        - Requirements: 1.4
        """
        response = client.post(
            "/api/users",
            json={
                "username": "manager_try_create_boss",
                "password": "password123",
                "name": "车队长尝试创建老板",
                "phone": "13800000003",
                "role": "boss"
            },
            headers=get_auth_headers(manager_token)
        )

        assert_forbidden(response)

    def test_manager_cannot_create_warehouse(
        self,
        client: TestClient,
        manager_token: str
    ):
        """
        测试车队长无法创建仓库

        验证：
        - 车队长角色无法创建仓库
        """
        response = client.post(
            "/api/warehouses",
            json={
                "name": "车队长创建的仓库",
                "address": "测试地址"
            },
            headers=get_auth_headers(manager_token)
        )

        assert_forbidden(response)

    def test_manager_can_update_driver_info(
        self,
        client: TestClient,
        session: Session,
        manager_user: User,
        manager_token: str
    ):
        """
        测试车队长可以更新司机信息

        验证：
        - 车队长可以更新所辖仓库司机的信息
        """
        # 创建仓库
        warehouse = WarehouseFactory.create(session, name="更新司机仓库")

        # 分配车队长和司机到同一仓库
        WarehouseFactory.assign_user(session, manager_user, warehouse)
        driver = UserFactory.create_driver(session, username="manager_update_driver")
        WarehouseFactory.assign_user(session, driver, warehouse)

        response = client.put(
            f"/api/users/{driver.id}/driver-info",
            json={
                "name": "更新后的司机名",
                "phone": "13900000000"
            },
            headers=get_auth_headers(manager_token)
        )

        data = assert_success_response(response, 200)
        assert data["name"] == "更新后的司机名"


# ==================== 老板权限测试 ====================
# Requirements: Requirement 12 (AC 3-5)
# 注意：SUPER_ADMIN 角色已被移除，老板（BOSS）现在是最高权限角色

class TestBossPermissions:
    """老板权限测试"""

    def test_boss_can_access_all_data(
        self,
        client: TestClient,
        session: Session,
        boss_token: str
    ):
        """
        测试老板可以访问所有数据

        验证：
        - 老板可以访问所有用户、仓库、车辆等数据
        """
        # 创建一些数据
        user = UserFactory.create_driver(session, username="boss_access_user")
        warehouse = WarehouseFactory.create(session, name="老板访问仓库")
        vehicle = VehicleFactory.create(session, user, license_plate="川A00001")

        # 访问用户列表
        users_response = client.get(
            "/api/users",
            headers=get_auth_headers(boss_token)
        )
        assert_success_response(users_response, 200)

        # 访问仓库列表
        warehouses_response = client.get(
            "/api/warehouses",
            headers=get_auth_headers(boss_token)
        )
        assert_success_response(warehouses_response, 200)

        # 访问车辆列表
        vehicles_response = client.get(
            "/api/vehicles",
            headers=get_auth_headers(boss_token)
        )
        assert_success_response(vehicles_response, 200)

    def test_boss_can_create_user(
        self,
        client: TestClient,
        boss_token: str
    ):
        """
        测试老板可以创建用户

        验证：
        - 老板可以创建司机、车队长等用户
        """
        response = client.post(
            "/api/users",
            json={
                "username": "boss_created_user",
                "password": "password123",
                "name": "老板创建的用户",
                "phone": "13800000002",
                "role": "driver"
            },
            headers=get_auth_headers(boss_token)
        )

        data = assert_success_response(response, 200)
        assert data["username"] == "boss_created_user"

    def test_boss_can_create_another_boss(
        self,
        client: TestClient,
        boss_token: str
    ):
        """
        测试老板可以创建另一个老板账号

        验证：
        - 老板可以创建另一个老板账号（SUPER_ADMIN 已移除后，老板是最高权限）
        """
        response = client.post(
            "/api/users",
            json={
                "username": "another_boss",
                "password": "password123",
                "name": "另一个老板",
                "phone": "13800000003",
                "role": "boss"
            },
            headers=get_auth_headers(boss_token)
        )

        data = assert_success_response(response, 200)
        assert data["role"] == "boss"

    def test_boss_can_modify_another_boss(
        self,
        client: TestClient,
        session: Session,
        boss_token: str
    ):
        """
        测试老板可以修改另一个老板账号

        验证：
        - 老板可以修改另一个老板的信息（SUPER_ADMIN 已移除后，老板是最高权限）
        """
        # 创建另一个老板
        another_boss = UserFactory.create_boss(session, username="another_boss_to_modify")

        response = client.put(
            f"/api/users/{another_boss.id}",
            json={
                "name": "老板修改的老板名"
            },
            headers=get_auth_headers(boss_token)
        )

        data = assert_success_response(response, 200)
        assert data["name"] == "老板修改的老板名"


# ==================== 调度角色权限测试 ====================
# Requirements: Requirement 12 (补充)

class TestPeerAdminPermissions:
    """调度角色权限测试"""

    def test_peer_admin_can_access_management_functions(
        self,
        client: TestClient,
        peer_admin_token: str
    ):
        """
        测试调度可以访问管理功能

        验证：
        - 调度可以访问用户列表、仓库列表等
        """
        # 访问用户列表
        users_response = client.get(
            "/api/users",
            headers=get_auth_headers(peer_admin_token)
        )
        assert_success_response(users_response, 200)

        # 访问仓库列表
        warehouses_response = client.get(
            "/api/warehouses",
            headers=get_auth_headers(peer_admin_token)
        )
        assert_success_response(warehouses_response, 200)

    def test_peer_admin_can_create_user(
        self,
        client: TestClient,
        peer_admin_token: str
    ):
        """
        测试调度可以创建用户

        验证：
        - 调度可以创建司机、车队长等用户
        """
        response = client.post(
            "/api/users",
            json={
                "username": "peer_created_user",
                "password": "password123",
                "name": "调度创建的用户",
                "phone": "13800000005",
                "role": "driver"
            },
            headers=get_auth_headers(peer_admin_token)
        )

        data = assert_success_response(response, 200)
        assert data["username"] == "peer_created_user"

    def test_peer_admin_can_create_warehouse(
        self,
        client: TestClient,
        peer_admin_token: str
    ):
        """
        测试调度可以创建仓库

        验证：
        - 调度可以创建仓库
        """
        response = client.post(
            "/api/warehouses",
            json={
                "name": "调度创建的仓库",
                "address": "调度仓库地址"
            },
            headers=get_auth_headers(peer_admin_token)
        )

        data = assert_success_response(response, 200)
        assert data["name"] == "调度创建的仓库"

    def test_peer_admin_cannot_create_boss(
        self,
        client: TestClient,
        peer_admin_token: str
    ):
        """
        测试调度无法创建老板账号

        验证：
        - 调度无法创建老板账号
        """
        response = client.post(
            "/api/users",
            json={
                "username": "peer_created_boss",
                "password": "password123",
                "name": "调度创建的老板",
                "phone": "13800000006",
                "role": "boss"
            },
            headers=get_auth_headers(peer_admin_token)
        )

        assert_forbidden(response)

    def test_peer_admin_cannot_modify_boss(
        self,
        client: TestClient,
        boss_user: User,
        peer_admin_token: str
    ):
        """
        测试调度无法修改老板账号

        验证：
        - 调度无法修改老板的信息
        """
        response = client.put(
            f"/api/users/{boss_user.id}",
            json={
                "name": "调度尝试修改老板"
            },
            headers=get_auth_headers(peer_admin_token)
        )

        assert_forbidden(response)


# ==================== 未认证访问测试 ====================

class TestUnauthenticatedAccess:
    """未认证访问测试"""

    def test_unauthenticated_cannot_access_users(
        self,
        client: TestClient
    ):
        """
        测试未认证无法访问用户 API

        验证：
        - 不提供 Token 无法访问用户列表
        """
        response = client.get("/api/users")

        assert response.status_code in [401, 403]

    def test_unauthenticated_cannot_access_me(
        self,
        client: TestClient
    ):
        """
        测试未认证无法获取当前用户信息

        验证：
        - 不提供 Token 无法获取当前用户信息
        """
        response = client.get("/api/auth/me")

        assert response.status_code in [401, 403]

    def test_unauthenticated_cannot_clock_in(
        self,
        client: TestClient
    ):
        """
        测试未认证无法打卡

        验证：
        - 不提供 Token 无法进行打卡操作
        """
        response = client.post("/api/attendance/clock-in")

        assert response.status_code in [401, 403]


# ==================== 用户更新权限测试 ====================
# Requirements: 2.1-2.8

class TestUserUpdatePermissions:
    """用户更新权限测试"""

    def test_boss_can_update_any_user(
        self,
        client: TestClient,
        session: Session,
        boss_token: str
    ):
        """
        测试老板可以更新任意用户
        Requirements: 2.1
        """
        driver = UserFactory.create_driver(session, username="boss_update_target")

        response = client.put(
            f"/api/users/{driver.id}",
            json={"name": "老板更新的名字"},
            headers=get_auth_headers(boss_token)
        )

        data = assert_success_response(response, 200)
        assert data["name"] == "老板更新的名字"

    def test_peer_admin_can_update_manager(
        self,
        client: TestClient,
        session: Session,
        peer_admin_token: str
    ):
        """
        测试调度可以更新车队长
        Requirements: 2.3
        """
        manager = UserFactory.create_manager(session, username="peer_update_manager")

        response = client.put(
            f"/api/users/{manager.id}",
            json={"name": "调度更新的车队长"},
            headers=get_auth_headers(peer_admin_token)
        )

        data = assert_success_response(response, 200)
        assert data["name"] == "调度更新的车队长"

    def test_peer_admin_can_update_driver(
        self,
        client: TestClient,
        session: Session,
        peer_admin_token: str
    ):
        """
        测试调度可以更新司机
        Requirements: 2.3
        """
        driver = UserFactory.create_driver(session, username="peer_update_driver")

        response = client.put(
            f"/api/users/{driver.id}",
            json={"name": "调度更新的司机"},
            headers=get_auth_headers(peer_admin_token)
        )

        data = assert_success_response(response, 200)
        assert data["name"] == "调度更新的司机"

    def test_peer_admin_cannot_update_boss(
        self,
        client: TestClient,
        boss_user: User,
        peer_admin_token: str
    ):
        """
        测试调度无法更新老板
        Requirements: 2.4
        """
        response = client.put(
            f"/api/users/{boss_user.id}",
            json={"name": "调度尝试更新老板"},
            headers=get_auth_headers(peer_admin_token)
        )

        assert_forbidden(response)

    def test_manager_can_update_assigned_driver(
        self,
        client: TestClient,
        session: Session,
        manager_user: User,
        manager_token: str
    ):
        """
        测试车队长可以更新所辖仓库司机
        Requirements: 2.5
        """
        # 创建仓库并分配
        warehouse = WarehouseFactory.create(session, name="车队长更新司机仓库")
        WarehouseFactory.assign_user(session, manager_user, warehouse)
        driver = UserFactory.create_driver(session, username="manager_update_target")
        WarehouseFactory.assign_user(session, driver, warehouse)

        response = client.put(
            f"/api/users/{driver.id}/driver-info",
            json={"name": "车队长更新的司机"},
            headers=get_auth_headers(manager_token)
        )

        data = assert_success_response(response, 200)
        assert data["name"] == "车队长更新的司机"

    def test_manager_cannot_update_unassigned_driver(
        self,
        client: TestClient,
        session: Session,
        manager_user: User,
        manager_token: str
    ):
        """
        测试车队长无法更新非所辖仓库司机
        Requirements: 2.6
        """
        # 创建两个仓库
        warehouse1 = WarehouseFactory.create(session, name="车队长仓库")
        warehouse2 = WarehouseFactory.create(session, name="其他仓库")

        # 车队长分配到仓库1
        WarehouseFactory.assign_user(session, manager_user, warehouse1)

        # 司机分配到仓库2
        driver = UserFactory.create_driver(session, username="other_warehouse_driver")
        WarehouseFactory.assign_user(session, driver, warehouse2)

        response = client.put(
            f"/api/users/{driver.id}/driver-info",
            json={"name": "车队长尝试更新"},
            headers=get_auth_headers(manager_token)
        )

        assert_forbidden(response)

    def test_manager_cannot_update_non_driver(
        self,
        client: TestClient,
        session: Session,
        manager_user: User,
        manager_token: str
    ):
        """
        测试车队长无法更新非司机角色用户
        Requirements: 2.7
        """
        # 创建仓库并分配
        warehouse = WarehouseFactory.create(session, name="车队长更新非司机仓库")
        WarehouseFactory.assign_user(session, manager_user, warehouse)

        # 创建另一个车队长
        another_manager = UserFactory.create_manager(session, username="another_manager_target")
        WarehouseFactory.assign_user(session, another_manager, warehouse)

        response = client.put(
            f"/api/users/{another_manager.id}/driver-info",
            json={"name": "车队长尝试更新车队长"},
            headers=get_auth_headers(manager_token)
        )

        assert_forbidden(response)

    def test_driver_cannot_update_others(
        self,
        client: TestClient,
        session: Session,
        driver_token: str
    ):
        """
        测试司机无法更新他人信息
        Requirements: 2.8
        """
        another_driver = UserFactory.create_driver(session, username="another_driver_target")

        response = client.put(
            f"/api/users/{another_driver.id}",
            json={"name": "司机尝试更新"},
            headers=get_auth_headers(driver_token)
        )

        assert_forbidden(response)


# ==================== 用户删除权限测试 ====================
# Requirements: 3.1-3.7

class TestUserDeletePermissions:
    """用户删除权限测试"""

    def test_boss_can_delete_user(
        self,
        client: TestClient,
        session: Session,
        boss_token: str
    ):
        """
        测试老板可以删除用户
        Requirements: 3.1
        """
        driver = UserFactory.create_driver(session, username="boss_delete_target")

        response = client.delete(
            f"/api/users/{driver.id}",
            headers=get_auth_headers(boss_token)
        )

        assert response.status_code in [200, 204]

    def test_boss_cannot_delete_self(
        self,
        client: TestClient,
        boss_user: User,
        boss_token: str
    ):
        """
        测试老板不能删除自己
        Requirements: 3.2
        """
        response = client.delete(
            f"/api/users/{boss_user.id}",
            headers=get_auth_headers(boss_token)
        )

        assert response.status_code in [400, 403]

    def test_peer_admin_can_delete_manager(
        self,
        client: TestClient,
        session: Session,
        peer_admin_token: str
    ):
        """
        测试调度可以删除车队长
        Requirements: 3.3
        """
        manager = UserFactory.create_manager(session, username="peer_delete_manager")

        response = client.delete(
            f"/api/users/{manager.id}",
            headers=get_auth_headers(peer_admin_token)
        )

        assert response.status_code in [200, 204]

    def test_peer_admin_can_delete_driver(
        self,
        client: TestClient,
        session: Session,
        peer_admin_token: str
    ):
        """
        测试调度可以删除司机
        Requirements: 3.3
        """
        driver = UserFactory.create_driver(session, username="peer_delete_driver")

        response = client.delete(
            f"/api/users/{driver.id}",
            headers=get_auth_headers(peer_admin_token)
        )

        assert response.status_code in [200, 204]

    def test_peer_admin_cannot_delete_boss(
        self,
        client: TestClient,
        boss_user: User,
        peer_admin_token: str
    ):
        """
        测试调度无法删除老板
        Requirements: 3.4
        """
        response = client.delete(
            f"/api/users/{boss_user.id}",
            headers=get_auth_headers(peer_admin_token)
        )

        assert_forbidden(response)

    def test_manager_cannot_delete_user(
        self,
        client: TestClient,
        session: Session,
        manager_token: str
    ):
        """
        测试车队长无法删除用户
        Requirements: 3.5
        """
        driver = UserFactory.create_driver(session, username="manager_delete_target")

        response = client.delete(
            f"/api/users/{driver.id}",
            headers=get_auth_headers(manager_token)
        )

        assert_forbidden(response)

    def test_driver_cannot_delete_user(
        self,
        client: TestClient,
        session: Session,
        driver_token: str
    ):
        """
        测试司机无法删除用户
        Requirements: 3.6
        """
        another_driver = UserFactory.create_driver(session, username="driver_delete_target")

        response = client.delete(
            f"/api/users/{another_driver.id}",
            headers=get_auth_headers(driver_token)
        )

        assert_forbidden(response)

    def test_delete_nonexistent_user(
        self,
        client: TestClient,
        boss_token: str
    ):
        """
        测试删除不存在的用户
        Requirements: 3.7
        """
        response = client.delete(
            "/api/users/99999",
            headers=get_auth_headers(boss_token)
        )

        assert response.status_code == 404
