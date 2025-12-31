"""
仓库管理测试模块
测试仓库创建、更新、删除、用户分配等功能

Requirements: Requirement 3 - 仓库管理
"""

from fastapi.testclient import TestClient
from sqlmodel import Session

# 导入测试工具
from tests.factories import UserFactory, WarehouseFactory, VehicleFactory
from tests.helpers import (
    get_auth_headers, assert_success_response,
    assert_forbidden, assert_not_found
)

# 导入模型
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models import User, VehicleStatus


# ==================== 仓库 CRUD 测试 ====================
# Requirements: Requirement 3 (AC 1-2)

class TestWarehouseCRUD:
    """仓库增删改查测试"""

    def test_create_warehouse_success(
        self,
        client: TestClient,
        super_admin_token: str
    ):
        """
        测试创建仓库成功

        验证：
        - 管理员可以创建仓库
        - 返回创建的仓库信息
        """
        response = client.post(
            "/api/warehouses",
            json={
                "name": "新建仓库",
                "address": "测试地址123号"
            },
            headers=get_auth_headers(super_admin_token)
        )

        data = assert_success_response(response, 200)

        assert data["name"] == "新建仓库"
        assert data["address"] == "测试地址123号"
        assert data["is_active"] is True

    def test_boss_create_warehouse_success(
        self,
        client: TestClient,
        boss_token: str
    ):
        """
        测试老板创建仓库成功

        验证：
        - 老板可以创建仓库
        """
        response = client.post(
            "/api/warehouses",
            json={
                "name": "老板创建的仓库",
                "address": "老板仓库地址"
            },
            headers=get_auth_headers(boss_token)
        )

        data = assert_success_response(response, 200)
        assert data["name"] == "老板创建的仓库"

    def test_peer_admin_create_warehouse_success(
        self,
        client: TestClient,
        peer_admin_token: str
    ):
        """
        测试调度创建仓库成功

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

    def test_driver_cannot_create_warehouse(
        self,
        client: TestClient,
        driver_token: str
    ):
        """
        测试司机无权创建仓库

        验证：
        - 司机角色无法创建仓库
        """
        response = client.post(
            "/api/warehouses",
            json={
                "name": "司机创建的仓库",
                "address": "司机仓库地址"
            },
            headers=get_auth_headers(driver_token)
        )

        assert_forbidden(response)

    def test_manager_cannot_create_warehouse(
        self,
        client: TestClient,
        manager_token: str
    ):
        """
        测试车队长无权创建仓库

        验证：
        - 车队长角色无法创建仓库
        """
        response = client.post(
            "/api/warehouses",
            json={
                "name": "车队长创建的仓库",
                "address": "车队长仓库地址"
            },
            headers=get_auth_headers(manager_token)
        )

        assert_forbidden(response)

    def test_get_warehouse_list(
        self,
        client: TestClient,
        session: Session,
        driver_token: str
    ):
        """
        测试获取仓库列表

        验证：
        - 所有登录用户可以获取仓库列表
        """
        # 创建一些仓库
        for i in range(3):
            WarehouseFactory.create(session, name=f"列表测试仓库{i}")

        response = client.get(
            "/api/warehouses",
            headers=get_auth_headers(driver_token)
        )

        data = assert_success_response(response, 200)

        assert isinstance(data, list)
        assert len(data) >= 3

    def test_get_warehouse_detail(
        self,
        client: TestClient,
        session: Session,
        driver_token: str
    ):
        """
        测试获取仓库详情

        验证：
        - 可以获取指定仓库的详细信息
        """
        warehouse = WarehouseFactory.create(session, name="详情测试仓库")

        response = client.get(
            f"/api/warehouses/{warehouse.id}",
            headers=get_auth_headers(driver_token)
        )

        data = assert_success_response(response, 200)

        assert data["id"] == warehouse.id
        assert data["name"] == "详情测试仓库"

    def test_get_nonexistent_warehouse(
        self,
        client: TestClient,
        driver_token: str
    ):
        """
        测试获取不存在的仓库

        验证：
        - 返回 404 错误
        """
        response = client.get(
            "/api/warehouses/99999",
            headers=get_auth_headers(driver_token)
        )

        assert_not_found(response)

    def test_update_warehouse_success(
        self,
        client: TestClient,
        session: Session,
        super_admin_token: str
    ):
        """
        测试更新仓库成功

        验证：
        - 可以更新仓库信息
        """
        warehouse = WarehouseFactory.create(session, name="更新前仓库")

        response = client.put(
            f"/api/warehouses/{warehouse.id}",
            json={
                "name": "更新后仓库",
                "address": "更新后地址"
            },
            headers=get_auth_headers(super_admin_token)
        )

        data = assert_success_response(response, 200)

        assert data["name"] == "更新后仓库"
        assert data["address"] == "更新后地址"

    def test_disable_warehouse_success(
        self,
        client: TestClient,
        session: Session,
        super_admin_token: str
    ):
        """
        测试禁用仓库成功

        验证：
        - 可以将仓库设置为禁用状态
        """
        warehouse = WarehouseFactory.create(session, name="禁用测试仓库")

        response = client.put(
            f"/api/warehouses/{warehouse.id}",
            json={
                "is_active": False
            },
            headers=get_auth_headers(super_admin_token)
        )

        data = assert_success_response(response, 200)

        assert data["is_active"] is False

    def test_delete_warehouse_success(
        self,
        client: TestClient,
        session: Session,
        super_admin_token: str
    ):
        """
        测试删除仓库成功

        验证：
        - 可以删除仓库
        """
        warehouse = WarehouseFactory.create(session, name="删除测试仓库")
        warehouse_id = warehouse.id

        response = client.delete(
            f"/api/warehouses/{warehouse_id}",
            headers=get_auth_headers(super_admin_token)
        )

        data = assert_success_response(response, 200)
        assert "删除" in data.get("message", "") or "成功" in data.get("message", "")

        # 验证仓库已被删除
        get_response = client.get(
            f"/api/warehouses/{warehouse_id}",
            headers=get_auth_headers(super_admin_token)
        )
        assert_not_found(get_response)


# ==================== 仓库用户分配测试 ====================
# Requirements: Requirement 3 (AC 2)

class TestWarehouseUserAssignment:
    """仓库用户分配测试"""

    def test_assign_users_to_warehouse_success(
        self,
        client: TestClient,
        session: Session,
        super_admin_token: str
    ):
        """
        测试分配用户到仓库成功

        验证：
        - 可以将用户分配到仓库
        - 返回成功消息
        """
        # 创建仓库和用户
        warehouse = WarehouseFactory.create(session, name="分配测试仓库")
        user1 = UserFactory.create_driver(session, username="assign_user_1")
        user2 = UserFactory.create_driver(session, username="assign_user_2")

        response = client.post(
            f"/api/warehouses/{warehouse.id}/assign",
            json={
                "user_ids": [user1.id, user2.id]
            },
            headers=get_auth_headers(super_admin_token)
        )

        data = assert_success_response(response, 200)
        assert "成功" in data.get("message", "")

    def test_assign_to_nonexistent_warehouse(
        self,
        client: TestClient,
        session: Session,
        super_admin_token: str
    ):
        """
        测试分配用户到不存在的仓库

        验证：
        - 返回 404 错误
        """
        user = UserFactory.create_driver(session, username="assign_nonexist_user")

        response = client.post(
            "/api/warehouses/99999/assign",
            json={
                "user_ids": [user.id]
            },
            headers=get_auth_headers(super_admin_token)
        )

        assert_not_found(response)

    def test_driver_cannot_assign_users(
        self,
        client: TestClient,
        session: Session,
        driver_token: str
    ):
        """
        测试司机无权分配用户

        验证：
        - 司机角色无法分配用户到仓库
        """
        warehouse = WarehouseFactory.create(session, name="司机分配测试仓库")
        user = UserFactory.create_driver(session, username="driver_assign_user")

        response = client.post(
            f"/api/warehouses/{warehouse.id}/assign",
            json={
                "user_ids": [user.id]
            },
            headers=get_auth_headers(driver_token)
        )

        assert_forbidden(response)


# ==================== 仓库关联数据查询测试 ====================
# Requirements: Requirement 3 (AC 3-4)

class TestWarehouseRelatedData:
    """仓库关联数据查询测试"""

    def test_get_warehouse_users(
        self,
        client: TestClient,
        session: Session,
        super_admin_token: str
    ):
        """
        测试查询仓库用户列表

        验证：
        - 可以获取仓库下的用户列表
        """
        # 创建仓库和用户
        warehouse = WarehouseFactory.create(session, name="用户列表测试仓库")
        user1 = UserFactory.create_driver(session, username="warehouse_user_1")
        user2 = UserFactory.create_driver(session, username="warehouse_user_2")

        # 分配用户到仓库
        WarehouseFactory.assign_user(session, user1, warehouse)
        WarehouseFactory.assign_user(session, user2, warehouse)

        response = client.get(
            f"/api/warehouses/{warehouse.id}/users",
            headers=get_auth_headers(super_admin_token)
        )

        data = assert_success_response(response, 200)

        assert isinstance(data, list)
        assert len(data) >= 2

        # 验证返回的用户包含分配的用户
        user_ids = [u["id"] for u in data]
        assert user1.id in user_ids
        assert user2.id in user_ids

    def test_get_warehouse_vehicles(
        self,
        client: TestClient,
        session: Session,
        super_admin_token: str
    ):
        """
        测试查询仓库车辆列表

        验证：
        - 可以获取仓库下的车辆列表
        """
        # 创建仓库、用户和车辆
        warehouse = WarehouseFactory.create(session, name="车辆列表测试仓库")
        user = UserFactory.create_driver(session, username="vehicle_owner")

        # 创建车辆并关联到仓库
        vehicle = VehicleFactory.create(
            session, user, warehouse,
            license_plate="川A12345",
            status=VehicleStatus.ACTIVE
        )

        response = client.get(
            f"/api/warehouses/{warehouse.id}/vehicles",
            headers=get_auth_headers(super_admin_token)
        )

        data = assert_success_response(response, 200)

        assert isinstance(data, list)
        assert len(data) >= 1

        # 验证返回的车辆包含创建的车辆
        vehicle_ids = [v["id"] for v in data]
        assert vehicle.id in vehicle_ids

    def test_get_warehouse_vehicles_filter_by_status(
        self,
        client: TestClient,
        session: Session,
        super_admin_token: str
    ):
        """
        测试按状态筛选仓库车辆

        验证：
        - 可以按车辆状态筛选
        """
        # 创建仓库、用户和不同状态的车辆
        warehouse = WarehouseFactory.create(session, name="状态筛选测试仓库")
        user = UserFactory.create_driver(session, username="status_filter_owner")

        # 创建不同状态的车辆
        VehicleFactory.create(
            session, user, warehouse,
            license_plate="川B11111",
            status=VehicleStatus.ACTIVE
        )
        VehicleFactory.create(
            session, user, warehouse,
            license_plate="川B22222",
            status=VehicleStatus.REVIEWING
        )

        # 筛选激活状态的车辆
        response = client.get(
            f"/api/warehouses/{warehouse.id}/vehicles?status=active",
            headers=get_auth_headers(super_admin_token)
        )

        data = assert_success_response(response, 200)

        # 所有返回的车辆都应该是激活状态
        for vehicle in data:
            assert vehicle["status"] == "active"

    def test_get_nonexistent_warehouse_users(
        self,
        client: TestClient,
        super_admin_token: str
    ):
        """
        测试查询不存在仓库的用户列表

        验证：
        - 返回 404 错误
        """
        response = client.get(
            "/api/warehouses/99999/users",
            headers=get_auth_headers(super_admin_token)
        )

        assert_not_found(response)

    def test_get_nonexistent_warehouse_vehicles(
        self,
        client: TestClient,
        super_admin_token: str
    ):
        """
        测试查询不存在仓库的车辆列表

        验证：
        - 返回 404 错误
        """
        response = client.get(
            "/api/warehouses/99999/vehicles",
            headers=get_auth_headers(super_admin_token)
        )

        assert_not_found(response)


# ==================== 仓库权限测试 ====================
# Requirements: Requirement 3 (AC 5)

class TestWarehousePermissions:
    """仓库权限测试"""

    def test_driver_cannot_access_unassigned_warehouse_vehicles(
        self,
        client: TestClient,
        session: Session,
        driver_user: User,
        driver_token: str
    ):
        """
        测试司机无法访问非分配仓库的车辆

        验证：
        - 司机只能访问自己分配的仓库
        - 访问未分配的仓库返回 403
        """
        # 创建一个仓库（不分配给司机）
        warehouse = WarehouseFactory.create(session, name="未分配仓库")

        response = client.get(
            f"/api/warehouses/{warehouse.id}/vehicles",
            headers=get_auth_headers(driver_token)
        )

        assert_forbidden(response)

    def test_driver_can_access_assigned_warehouse_vehicles(
        self,
        client: TestClient,
        session: Session,
        driver_user: User,
        driver_token: str
    ):
        """
        测试司机可以访问分配仓库的车辆

        验证：
        - 司机可以访问自己分配的仓库
        """
        # 创建仓库并分配给司机
        warehouse = WarehouseFactory.create(session, name="已分配仓库")
        WarehouseFactory.assign_user(session, driver_user, warehouse)

        response = client.get(
            f"/api/warehouses/{warehouse.id}/vehicles",
            headers=get_auth_headers(driver_token)
        )

        data = assert_success_response(response, 200)
        assert isinstance(data, list)

    def test_manager_can_access_all_warehouses(
        self,
        client: TestClient,
        session: Session,
        manager_token: str
    ):
        """
        测试车队长可以访问仓库用户列表

        验证：
        - 车队长可以查看仓库用户
        """
        warehouse = WarehouseFactory.create(session, name="车队长访问仓库")

        response = client.get(
            f"/api/warehouses/{warehouse.id}/users",
            headers=get_auth_headers(manager_token)
        )

        data = assert_success_response(response, 200)
        assert isinstance(data, list)

    def test_driver_cannot_access_warehouse_users(
        self,
        client: TestClient,
        session: Session,
        driver_token: str
    ):
        """
        测试司机无法访问仓库用户列表

        验证：
        - 司机角色无法查看仓库用户列表
        """
        warehouse = WarehouseFactory.create(session, name="司机访问测试仓库")

        response = client.get(
            f"/api/warehouses/{warehouse.id}/users",
            headers=get_auth_headers(driver_token)
        )

        assert_forbidden(response)


# ==================== 仓库列表筛选测试 ====================

class TestWarehouseListFilter:
    """仓库列表筛选测试"""

    def test_filter_warehouses_by_active(
        self,
        client: TestClient,
        session: Session,
        driver_token: str
    ):
        """
        测试按启用状态筛选仓库

        验证：
        - 可以按 is_active 筛选仓库列表
        """
        # 创建启用和禁用的仓库
        WarehouseFactory.create(session, name="启用仓库", is_active=True)
        WarehouseFactory.create(session, name="禁用仓库", is_active=False)

        # 筛选启用的仓库
        response = client.get(
            "/api/warehouses?is_active=true",
            headers=get_auth_headers(driver_token)
        )

        data = assert_success_response(response, 200)

        # 所有返回的仓库都应该是启用的
        for warehouse in data:
            assert warehouse["is_active"] is True

    def test_warehouse_list_pagination(
        self,
        client: TestClient,
        session: Session,
        driver_token: str
    ):
        """
        测试仓库列表分页

        验证：
        - 可以使用 skip 和 limit 参数分页
        """
        # 创建多个仓库
        for i in range(5):
            WarehouseFactory.create(session, name=f"分页测试仓库{i}")

        # 获取前2个
        response = client.get(
            "/api/warehouses?skip=0&limit=2",
            headers=get_auth_headers(driver_token)
        )

        data = assert_success_response(response, 200)

        assert len(data) <= 2
