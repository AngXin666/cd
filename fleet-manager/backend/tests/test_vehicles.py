"""
车辆管理测试模块
测试车辆添加、审核、还车、证件管理等功能

Requirements: Requirement 7 - 车辆管理
"""

from datetime import date, timedelta
from fastapi.testclient import TestClient
from sqlmodel import Session

# 导入测试工具
from tests.factories import UserFactory, WarehouseFactory, VehicleFactory
from tests.helpers import (
    get_auth_headers, assert_success_response,
    assert_forbidden, assert_not_found, create_test_token
)

# 导入模型
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models import User, VehicleStatus


# ==================== 车辆添加测试 ====================
# Requirements: Requirement 7 (AC 1)

class TestVehicleAdd:
    """车辆添加测试"""

    def test_driver_add_vehicle_success(
        self,
        client: TestClient,
        session: Session,
        driver_user: User,
        driver_token: str
    ):
        """
        测试司机添加车辆成功

        验证：
        - 司机可以添加车辆
        - 车辆初始状态为 reviewing
        """
        # 创建仓库并分配给司机
        warehouse = WarehouseFactory.create(session, name="司机添加车辆仓库")
        WarehouseFactory.assign_user(session, driver_user, warehouse)

        response = client.post(
            "/api/vehicles",
            json={
                "license_plate": "川A88888",
                "brand": "丰田",
                "model": "卡罗拉",
                "color": "白色",
                "warehouse_id": warehouse.id,
                "ownership_type": "company"
            },
            headers=get_auth_headers(driver_token)
        )

        data = assert_success_response(response, 200)

        assert data["license_plate"] == "川A88888"
        assert data["status"] == "reviewing"
        assert data["user_id"] == driver_user.id

    def test_vehicle_initial_status_reviewing(
        self,
        client: TestClient,
        session: Session
    ):
        """
        测试车辆初始状态为审核中

        验证：
        - 新添加的车辆状态为 reviewing
        """
        user = UserFactory.create_driver(session, username="initial_status_user")
        warehouse = WarehouseFactory.create(session, name="初始状态测试仓库")
        WarehouseFactory.assign_user(session, user, warehouse)

        token = create_test_token(user.id)

        response = client.post(
            "/api/vehicles",
            json={
                "license_plate": "川B11111",
                "brand": "本田",
                "model": "雅阁",
                "color": "黑色",
                "warehouse_id": warehouse.id,
                "ownership_type": "company"
            },
            headers=get_auth_headers(token)
        )

        data = assert_success_response(response, 200)

        assert data["status"] == "reviewing"

    def test_add_vehicle_without_auth(self, client: TestClient):
        """
        测试未认证无法添加车辆

        验证：
        - 不提供 Token 无法添加车辆
        """
        response = client.post(
            "/api/vehicles",
            json={
                "license_plate": "川C22222",
                "brand": "大众",
                "model": "帕萨特",
                "color": "银色"
            }
        )

        assert response.status_code in [401, 403]


# ==================== 车辆审核测试 ====================
# Requirements: Requirement 7 (AC 2)

class TestVehicleReview:
    """车辆审核测试"""

    def test_boss_approve_vehicle_success(
        self,
        client: TestClient,
        session: Session,
        boss_token: str
    ):
        """
        测试老板审核通过成功

        验证：
        - 老板可以审核通过车辆
        - 状态变更为 active
        """
        user = UserFactory.create_driver(session, username="approve_vehicle_user")
        vehicle = VehicleFactory.create(
            session, user,
            license_plate="川D33333",
            status=VehicleStatus.REVIEWING
        )

        response = client.put(
            f"/api/vehicles/{vehicle.id}/review",
            json={
                "status": "active",
                "comment": "审核通过"
            },
            headers=get_auth_headers(boss_token)
        )

        data = assert_success_response(response, 200)

        assert data["status"] == "active"

    def test_boss_reject_vehicle_success(
        self,
        client: TestClient,
        session: Session,
        boss_token: str
    ):
        """
        测试老板审核拒绝成功

        验证：
        - 老板可以拒绝车辆审核
        - 状态变更为 rejected
        """
        user = UserFactory.create_driver(session, username="reject_vehicle_user")
        vehicle = VehicleFactory.create(
            session, user,
            license_plate="川E44444",
            status=VehicleStatus.REVIEWING
        )

        response = client.put(
            f"/api/vehicles/{vehicle.id}/review",
            json={
                "status": "rejected",
                "comment": "资料不完整"
            },
            headers=get_auth_headers(boss_token)
        )

        data = assert_success_response(response, 200)

        assert data["status"] == "rejected"

    def test_super_admin_can_review_vehicle(
        self,
        client: TestClient,
        session: Session,
        super_admin_token: str
    ):
        """
        测试超级管理员可以审核车辆

        验证：
        - 超级管理员可以审核车辆
        """
        user = UserFactory.create_driver(session, username="super_review_user")
        vehicle = VehicleFactory.create(
            session, user,
            license_plate="川F55555",
            status=VehicleStatus.REVIEWING
        )

        response = client.put(
            f"/api/vehicles/{vehicle.id}/review",
            json={
                "status": "active"
            },
            headers=get_auth_headers(super_admin_token)
        )

        data = assert_success_response(response, 200)
        assert data["status"] == "active"

    def test_driver_cannot_review_vehicle(
        self,
        client: TestClient,
        session: Session,
        driver_token: str
    ):
        """
        测试司机无权审核车辆

        验证：
        - 司机角色无法审核车辆
        """
        user = UserFactory.create_driver(session, username="driver_review_target")
        vehicle = VehicleFactory.create(
            session, user,
            license_plate="川G66666",
            status=VehicleStatus.REVIEWING
        )

        response = client.put(
            f"/api/vehicles/{vehicle.id}/review",
            json={
                "status": "active"
            },
            headers=get_auth_headers(driver_token)
        )

        assert_forbidden(response)

    def test_review_nonexistent_vehicle(
        self,
        client: TestClient,
        boss_token: str
    ):
        """
        测试审核不存在的车辆

        验证：
        - 返回 404 错误
        """
        response = client.put(
            "/api/vehicles/99999/review",
            json={
                "status": "active"
            },
            headers=get_auth_headers(boss_token)
        )

        assert_not_found(response)


# ==================== 车辆还车和证件测试 ====================
# Requirements: Requirement 7 (AC 3-5)

class TestVehicleReturnAndDocuments:
    """车辆还车和证件测试"""

    def test_return_vehicle_success(
        self,
        client: TestClient,
        session: Session,
        boss_token: str
    ):
        """
        测试还车操作成功

        验证：
        - 可以执行还车操作
        - 状态变更为 returned
        """
        user = UserFactory.create_driver(session, username="return_vehicle_user")
        vehicle = VehicleFactory.create(
            session, user,
            license_plate="川H77777",
            status=VehicleStatus.ACTIVE
        )

        response = client.post(
            f"/api/vehicles/{vehicle.id}/return",
            json={
                "return_date": str(date.today()),
                "reason": "合同到期"
            },
            headers=get_auth_headers(boss_token)
        )

        data = assert_success_response(response, 200)

        assert data["status"] == "returned"

    def test_upload_vehicle_document_success(
        self,
        client: TestClient,
        session: Session,
        driver_user: User,
        driver_token: str
    ):
        """
        测试上传证件成功

        验证：
        - 可以上传车辆证件
        """
        vehicle = VehicleFactory.create(
            session, driver_user,
            license_plate="川J88888",
            status=VehicleStatus.ACTIVE
        )

        response = client.post(
            f"/api/vehicles/{vehicle.id}/documents",
            json={
                "doc_type": "license",
                "file_url": "https://example.com/license.jpg",
                "expiry_date": str(date.today() + timedelta(days=365))
            },
            headers=get_auth_headers(driver_token)
        )

        data = assert_success_response(response, 200)

        assert data["doc_type"] == "license"

    def test_supplement_photo_success(
        self,
        client: TestClient,
        session: Session,
        driver_user: User,
        driver_token: str
    ):
        """
        测试补录照片成功

        验证：
        - 可以补录车辆照片
        """
        vehicle = VehicleFactory.create(
            session, driver_user,
            license_plate="川K99999",
            status=VehicleStatus.ACTIVE
        )

        response = client.post(
            f"/api/vehicles/{vehicle.id}/supplement-photos",
            json={
                "photo_type": "front",
                "photo_url": "https://example.com/front.jpg"
            },
            headers=get_auth_headers(driver_token)
        )

        data = assert_success_response(response, 200)

        # 验证照片已添加
        assert "supplemented_photos" in data or "message" in data


# ==================== 车辆权限测试 ====================
# Requirements: Requirement 7 (AC 6-7)

class TestVehiclePermissions:
    """车辆权限测试"""

    def test_driver_cannot_access_others_vehicle(
        self,
        client: TestClient,
        session: Session,
        driver_user: User,
        driver_token: str
    ):
        """
        测试司机无法访问他人车辆

        验证：
        - 司机只能访问自己的车辆
        """
        # 创建另一个司机的车辆
        other_user = UserFactory.create_driver(session, username="other_vehicle_owner")
        vehicle = VehicleFactory.create(
            session, other_user,
            license_plate="川L11111",
            status=VehicleStatus.ACTIVE
        )

        response = client.get(
            f"/api/vehicles/{vehicle.id}",
            headers=get_auth_headers(driver_token)
        )

        # 应该返回 403 或 404
        assert response.status_code in [403, 404]

    def test_driver_can_access_own_vehicle(
        self,
        client: TestClient,
        session: Session,
        driver_user: User,
        driver_token: str
    ):
        """
        测试司机可以访问自己的车辆

        验证：
        - 司机可以查看自己的车辆详情
        """
        vehicle = VehicleFactory.create(
            session, driver_user,
            license_plate="川M22222",
            status=VehicleStatus.ACTIVE
        )

        response = client.get(
            f"/api/vehicles/{vehicle.id}",
            headers=get_auth_headers(driver_token)
        )

        data = assert_success_response(response, 200)

        assert data["id"] == vehicle.id
        assert data["user_id"] == driver_user.id

    def test_boss_can_access_all_vehicles(
        self,
        client: TestClient,
        session: Session,
        boss_token: str
    ):
        """
        测试老板可以访问所有车辆

        验证：
        - 老板可以查看任何车辆
        """
        user = UserFactory.create_driver(session, username="boss_access_user")
        vehicle = VehicleFactory.create(
            session, user,
            license_plate="川N33333",
            status=VehicleStatus.ACTIVE
        )

        response = client.get(
            f"/api/vehicles/{vehicle.id}",
            headers=get_auth_headers(boss_token)
        )

        data = assert_success_response(response, 200)
        assert data["id"] == vehicle.id


# ==================== 车辆历史记录测试 ====================

class TestVehicleHistory:
    """车辆历史记录测试"""

    def test_get_vehicle_history(
        self,
        client: TestClient,
        session: Session,
        boss_token: str
    ):
        """
        测试查询车辆使用历史

        验证：
        - 可以查询车辆的使用历史记录
        """
        user = UserFactory.create_driver(session, username="history_test_user")
        vehicle = VehicleFactory.create(
            session, user,
            license_plate="川P44444",
            status=VehicleStatus.ACTIVE
        )

        response = client.get(
            f"/api/vehicles/{vehicle.id}/history",
            headers=get_auth_headers(boss_token)
        )

        data = assert_success_response(response, 200)

        # 应该返回历史记录列表
        assert isinstance(data, (list, dict))


# ==================== 车辆列表查询测试 ====================

class TestVehicleList:
    """车辆列表查询测试"""

    def test_get_vehicles_list(
        self,
        client: TestClient,
        session: Session,
        boss_token: str
    ):
        """
        测试获取车辆列表

        验证：
        - 可以获取车辆列表
        """
        # 创建多个车辆
        for i in range(3):
            user = UserFactory.create_driver(session, username=f"list_vehicle_user_{i}")
            VehicleFactory.create(
                session, user,
                license_plate=f"川Q{i}0000",
                status=VehicleStatus.ACTIVE
            )

        response = client.get(
            "/api/vehicles",
            headers=get_auth_headers(boss_token)
        )

        data = assert_success_response(response, 200)

        assert isinstance(data, list)
        assert len(data) >= 3

    def test_filter_vehicles_by_status(
        self,
        client: TestClient,
        session: Session,
        boss_token: str
    ):
        """
        测试按状态筛选车辆

        验证：
        - 可以按车辆状态筛选
        """
        user = UserFactory.create_driver(session, username="status_filter_vehicle_user")

        VehicleFactory.create(
            session, user,
            license_plate="川R11111",
            status=VehicleStatus.ACTIVE
        )
        VehicleFactory.create(
            session, user,
            license_plate="川R22222",
            status=VehicleStatus.REVIEWING
        )

        response = client.get(
            "/api/vehicles?status=active",
            headers=get_auth_headers(boss_token)
        )

        data = assert_success_response(response, 200)

        for vehicle in data:
            assert vehicle["status"] == "active"

    def test_driver_can_only_see_own_vehicles(
        self,
        client: TestClient,
        session: Session
    ):
        """
        测试司机只能查看自己的车辆

        验证：
        - 司机查询时自动过滤为自己的车辆
        """
        user1 = UserFactory.create_driver(session, username="own_vehicle_1")
        user2 = UserFactory.create_driver(session, username="own_vehicle_2")

        VehicleFactory.create(session, user1, license_plate="川S11111")
        VehicleFactory.create(session, user2, license_plate="川S22222")

        token1 = create_test_token(user1.id)

        response = client.get(
            "/api/vehicles",
            headers=get_auth_headers(token1)
        )

        data = assert_success_response(response, 200)

        # 所有车辆都应该是 user1 的
        for vehicle in data:
            assert vehicle["user_id"] == user1.id


# ==================== 车辆更新测试 ====================

class TestVehicleUpdate:
    """车辆更新测试"""

    def test_update_vehicle_info_success(
        self,
        client: TestClient,
        session: Session,
        driver_user: User,
        driver_token: str
    ):
        """
        测试更新车辆信息成功

        验证：
        - 车主可以更新车辆信息
        """
        vehicle = VehicleFactory.create(
            session, driver_user,
            license_plate="川T11111",
            color="白色"
        )

        response = client.put(
            f"/api/vehicles/{vehicle.id}",
            json={
                "color": "黑色"
            },
            headers=get_auth_headers(driver_token)
        )

        data = assert_success_response(response, 200)

        assert data["color"] == "黑色"

    def test_update_nonexistent_vehicle(
        self,
        client: TestClient,
        driver_token: str
    ):
        """
        测试更新不存在的车辆

        验证：
        - 返回 404 错误
        """
        response = client.put(
            "/api/vehicles/99999",
            json={
                "color": "红色"
            },
            headers=get_auth_headers(driver_token)
        )

        assert_not_found(response)


# ==================== 车辆删除测试 ====================

class TestVehicleDelete:
    """车辆删除测试"""

    def test_delete_vehicle_success(
        self,
        client: TestClient,
        session: Session,
        super_admin_token: str
    ):
        """
        测试删除车辆成功

        验证：
        - 管理员可以删除车辆
        """
        user = UserFactory.create_driver(session, username="delete_vehicle_user")
        vehicle = VehicleFactory.create(
            session, user,
            license_plate="川U11111"
        )
        vehicle_id = vehicle.id

        response = client.delete(
            f"/api/vehicles/{vehicle_id}",
            headers=get_auth_headers(super_admin_token)
        )

        data = assert_success_response(response, 200)
        assert "删除" in data.get("message", "") or "成功" in data.get("message", "")

    def test_driver_cannot_delete_vehicle(
        self,
        client: TestClient,
        session: Session,
        driver_user: User,
        driver_token: str
    ):
        """
        测试司机无权删除车辆

        验证：
        - 司机角色无法删除车辆
        """
        vehicle = VehicleFactory.create(
            session, driver_user,
            license_plate="川V11111"
        )

        response = client.delete(
            f"/api/vehicles/{vehicle.id}",
            headers=get_auth_headers(driver_token)
        )

        assert_forbidden(response)
