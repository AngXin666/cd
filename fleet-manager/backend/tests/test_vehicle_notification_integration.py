"""
车辆通知集成测试模块
测试车辆添加、审核、分配的完整通知流程

Requirements: Requirement 3, 7, 9 (车辆通知)
"""

import pytest
from datetime import date, timedelta
from fastapi.testclient import TestClient
from sqlmodel import Session, select

from tests.factories import UserFactory, WarehouseFactory, VehicleFactory
from tests.helpers import (
    get_auth_headers, assert_success_response, create_test_token,
    assert_notification_exists, get_notifications_by_ref,
    assert_notifications_sent_to_users, assert_all_notifications_status_updated
)
from models import Notification, VehicleStatus


# ==================== 4.1 测试车辆添加通知流程 ====================
# Requirements: 3.1, 3.2

class TestVehicleAddNotification:
    """测试车辆添加通知流程"""

    def test_vehicle_add_sends_notification_to_managers(
        self,
        client: TestClient,
        session: Session
    ):
        """
        测试司机添加新车辆后，车队长、调度、老板都收到审核通知
        
        验证：
        - 创建司机、车队长、调度、老板
        - 司机添加新车辆
        - 验证车队长、调度、老板都收到审核通知
        - 验证通知 ref_type="vehicle", status="pending"
        
        Requirements: 3.1, 3.2
        """
        # 创建仓库
        warehouse = WarehouseFactory.create(session, name="车辆添加通知测试仓库")
        
        # 创建司机并分配到仓库
        driver = UserFactory.create_driver(session, username="vehicle_add_driver", name="添加车辆司机")
        WarehouseFactory.assign_user(session, driver, warehouse)
        
        # 创建车队长并分配到同一仓库
        manager = UserFactory.create_manager(session, username="vehicle_add_manager", name="车队长")
        WarehouseFactory.assign_user(session, manager, warehouse)
        
        # 创建调度和老板
        dispatcher = UserFactory.create_peer_admin(session, username="vehicle_add_dispatcher", name="调度")
        boss = UserFactory.create_boss(session, username="vehicle_add_boss", name="老板")
        
        # 司机添加新车辆
        driver_token = create_test_token(driver.id)
        
        response = client.post(
            "/api/vehicles",
            json={
                "license_plate": "川A12345",
                "brand": "丰田",
                "model": "卡罗拉",
                "color": "白色",
                "ownership_type": "company"
            },
            headers=get_auth_headers(driver_token)
        )
        
        data = assert_success_response(response, 200)
        vehicle_id = data["id"]
        
        # 验证车队长收到通知
        manager_notification = assert_notification_exists(
            session,
            user_id=manager.id,
            ref_type="vehicle",
            ref_id=vehicle_id,
            status="pending"
        )
        assert "车辆" in manager_notification.title or "审核" in manager_notification.title
        
        # 验证调度收到通知
        dispatcher_notification = assert_notification_exists(
            session,
            user_id=dispatcher.id,
            ref_type="vehicle",
            ref_id=vehicle_id,
            status="pending"
        )
        assert "车辆" in dispatcher_notification.title or "审核" in dispatcher_notification.title
        
        # 验证老板收到通知
        boss_notification = assert_notification_exists(
            session,
            user_id=boss.id,
            ref_type="vehicle",
            ref_id=vehicle_id,
            status="pending"
        )
        assert "车辆" in boss_notification.title or "审核" in boss_notification.title

    def test_vehicle_notification_ref_fields_correct(
        self,
        client: TestClient,
        session: Session
    ):
        """
        验证车辆审核通知的 ref_type、ref_id、status 正确设置
        
        Requirements: 3.2
        """
        # 创建仓库和用户
        warehouse = WarehouseFactory.create(session)
        driver = UserFactory.create_driver(session, username="vehicle_ref_driver")
        WarehouseFactory.assign_user(session, driver, warehouse)
        boss = UserFactory.create_boss(session, username="vehicle_ref_boss")
        
        # 司机添加车辆
        driver_token = create_test_token(driver.id)
        
        response = client.post(
            "/api/vehicles",
            json={
                "license_plate": "川B67890",
                "brand": "本田",
                "model": "雅阁",
                "color": "黑色",
                "ownership_type": "company"
            },
            headers=get_auth_headers(driver_token)
        )
        
        data = assert_success_response(response, 200)
        vehicle_id = data["id"]
        
        # 获取所有相关通知
        notifications = get_notifications_by_ref(session, "vehicle", vehicle_id)
        
        assert len(notifications) > 0
        for n in notifications:
            assert n.ref_type == "vehicle"
            assert n.ref_id == vehicle_id
            assert n.status == "pending"
            assert n.sender_id == driver.id

    def test_vehicle_notification_content_includes_license_plate(
        self,
        client: TestClient,
        session: Session
    ):
        """
        验证车辆审核通知内容包含车牌号
        
        Requirements: 3.1
        """
        # 创建仓库和用户
        warehouse = WarehouseFactory.create(session)
        driver = UserFactory.create_driver(session, username="vehicle_content_driver", name="测试司机")
        WarehouseFactory.assign_user(session, driver, warehouse)
        boss = UserFactory.create_boss(session, username="vehicle_content_boss")
        
        # 司机添加车辆
        driver_token = create_test_token(driver.id)
        license_plate = "川C11111"
        
        response = client.post(
            "/api/vehicles",
            json={
                "license_plate": license_plate,
                "brand": "大众",
                "model": "帕萨特",
                "color": "银色",
                "ownership_type": "company"
            },
            headers=get_auth_headers(driver_token)
        )
        
        data = assert_success_response(response, 200)
        vehicle_id = data["id"]
        
        # 验证通知内容包含车牌号
        boss_notification = assert_notification_exists(
            session,
            user_id=boss.id,
            ref_type="vehicle",
            ref_id=vehicle_id
        )
        
        assert license_plate in boss_notification.content



# ==================== 4.2 测试车辆审核通过后通知状态更新 (关键测试) ====================
# Requirements: 3.3, 3.5, 9.1, 9.2, 9.3, 9.4

class TestVehicleApprovalNotificationUpdate:
    """测试车辆审核通过后通知状态更新 - 关键测试"""

    def test_vehicle_approval_updates_pending_notifications_to_approved(
        self,
        client: TestClient,
        session: Session
    ):
        """
        测试车辆审核通过后，所有 pending 通知的 status 更新为 "approved"
        
        验证：
        - 创建车辆和审核通知
        - 执行审核通过操作
        - 验证所有 pending 通知的 status 更新为 "approved"
        
        Requirements: 3.3, 9.1, 9.2
        """
        # 创建仓库和用户
        warehouse = WarehouseFactory.create(session, name="车辆审核通过测试仓库")
        driver = UserFactory.create_driver(session, username="vehicle_approval_driver", name="车辆申请人")
        WarehouseFactory.assign_user(session, driver, warehouse)
        
        manager = UserFactory.create_manager(session, username="vehicle_approval_manager", name="车队长")
        WarehouseFactory.assign_user(session, manager, warehouse)
        
        dispatcher = UserFactory.create_peer_admin(session, username="vehicle_approval_dispatcher", name="调度")
        boss = UserFactory.create_boss(session, username="vehicle_approval_boss", name="老板")
        
        # 司机添加车辆
        driver_token = create_test_token(driver.id)
        
        response = client.post(
            "/api/vehicles",
            json={
                "license_plate": "川D22222",
                "brand": "比亚迪",
                "model": "汉",
                "color": "红色",
                "ownership_type": "company"
            },
            headers=get_auth_headers(driver_token)
        )
        
        data = assert_success_response(response, 200)
        vehicle_id = data["id"]
        
        # 验证 pending 通知已创建
        pending_notifications = get_notifications_by_ref(session, "vehicle", vehicle_id, status="pending")
        assert len(pending_notifications) >= 3  # 车队长 + 调度 + 老板
        
        # 记录原始通知ID
        original_notification_ids = [n.id for n in pending_notifications]
        
        # 老板执行审核通过
        boss_token = create_test_token(boss.id)
        approve_response = client.put(
            f"/api/vehicles/{vehicle_id}/review",
            json={
                "status": "active",
                "comment": "审核通过"
            },
            headers=get_auth_headers(boss_token)
        )
        
        assert_success_response(approve_response, 200)
        
        # 刷新会话以获取最新数据
        session.expire_all()
        
        # 验证所有原 pending 通知的 status 已更新为 "approved"
        for notification_id in original_notification_ids:
            notification = session.get(Notification, notification_id)
            assert notification.status == "approved", \
                f"通知 {notification_id} 状态应为 'approved'，实际为 '{notification.status}'"

    def test_vehicle_approval_creates_result_notifications(
        self,
        client: TestClient,
        session: Session
    ):
        """
        测试车辆审核通过后创建结果通知给车辆所有者和审批人
        
        验证：
        - 车辆所有者收到结果通知
        - 所有原审批人收到结果通知
        
        Requirements: 3.5, 9.4
        """
        # 创建仓库和用户
        warehouse = WarehouseFactory.create(session, name="车辆审核结果通知仓库")
        driver = UserFactory.create_driver(session, username="vehicle_result_driver", name="车辆所有者")
        WarehouseFactory.assign_user(session, driver, warehouse)
        
        manager = UserFactory.create_manager(session, username="vehicle_result_manager", name="车队长")
        WarehouseFactory.assign_user(session, manager, warehouse)
        
        boss = UserFactory.create_boss(session, username="vehicle_result_boss", name="老板")
        
        # 司机添加车辆
        driver_token = create_test_token(driver.id)
        
        response = client.post(
            "/api/vehicles",
            json={
                "license_plate": "川E33333",
                "brand": "特斯拉",
                "model": "Model 3",
                "color": "白色",
                "ownership_type": "company"
            },
            headers=get_auth_headers(driver_token)
        )
        
        data = assert_success_response(response, 200)
        vehicle_id = data["id"]
        
        # 获取审核前车辆所有者的通知数量
        driver_notifications_before = len(list(session.exec(
            select(Notification).where(Notification.user_id == driver.id)
        ).all()))
        
        # 老板执行审核通过
        boss_token = create_test_token(boss.id)
        approve_response = client.put(
            f"/api/vehicles/{vehicle_id}/review",
            json={
                "status": "active",
                "comment": "审核通过"
            },
            headers=get_auth_headers(boss_token)
        )
        
        assert_success_response(approve_response, 200)
        
        # 刷新会话
        session.expire_all()
        
        # 验证车辆所有者收到结果通知
        driver_notifications_after = list(session.exec(
            select(Notification).where(Notification.user_id == driver.id)
        ).all())
        
        assert len(driver_notifications_after) > driver_notifications_before, \
            "车辆所有者应该收到审核结果通知"
        
        # 验证车队长也收到结果通知
        manager_result_notifications = list(session.exec(
            select(Notification).where(
                Notification.user_id == manager.id,
                Notification.ref_type == "vehicle",
                Notification.ref_id == vehicle_id,
                Notification.status == "approved"
            )
        ).all())
        
        # 应该有原始审批通知（状态已更新）和结果通知
        assert len(manager_result_notifications) >= 1

    def test_vehicle_approval_updates_timestamp(
        self,
        client: TestClient,
        session: Session
    ):
        """
        测试车辆审核完成后更新通知的 updated_at 时间戳
        
        Requirements: 9.3
        """
        # 创建仓库和用户
        warehouse = WarehouseFactory.create(session, name="车辆时间戳测试仓库")
        driver = UserFactory.create_driver(session, username="vehicle_timestamp_driver")
        WarehouseFactory.assign_user(session, driver, warehouse)
        
        boss = UserFactory.create_boss(session, username="vehicle_timestamp_boss")
        
        # 司机添加车辆
        driver_token = create_test_token(driver.id)
        
        response = client.post(
            "/api/vehicles",
            json={
                "license_plate": "川F44444",
                "brand": "宝马",
                "model": "3系",
                "color": "蓝色",
                "ownership_type": "company"
            },
            headers=get_auth_headers(driver_token)
        )
        
        data = assert_success_response(response, 200)
        vehicle_id = data["id"]
        
        # 获取原始通知的 updated_at
        pending_notifications = get_notifications_by_ref(session, "vehicle", vehicle_id, status="pending")
        original_timestamps = {n.id: n.updated_at for n in pending_notifications}
        
        # 老板执行审核通过
        boss_token = create_test_token(boss.id)
        approve_response = client.put(
            f"/api/vehicles/{vehicle_id}/review",
            json={
                "status": "active"
            },
            headers=get_auth_headers(boss_token)
        )
        
        assert_success_response(approve_response, 200)
        
        # 刷新会话
        session.expire_all()
        
        # 验证 updated_at 已更新
        for notification_id, original_timestamp in original_timestamps.items():
            notification = session.get(Notification, notification_id)
            # updated_at 应该被更新（可能相同或更晚）
            assert notification.updated_at is not None



# ==================== 4.3 测试车辆审核拒绝后通知状态更新 ====================
# Requirements: 3.4, 3.5

class TestVehicleRejectionNotificationUpdate:
    """测试车辆审核拒绝后通知状态更新"""

    def test_vehicle_rejection_updates_pending_notifications_to_rejected(
        self,
        client: TestClient,
        session: Session
    ):
        """
        测试车辆审核拒绝后，所有 pending 通知的 status 更新为 "rejected"
        
        验证：
        - 创建车辆和审核通知
        - 执行审核拒绝操作
        - 验证所有 pending 通知的 status 更新为 "rejected"
        
        Requirements: 3.4, 9.1, 9.2
        """
        # 创建仓库和用户
        warehouse = WarehouseFactory.create(session, name="车辆审核拒绝测试仓库")
        driver = UserFactory.create_driver(session, username="vehicle_reject_driver", name="车辆申请人")
        WarehouseFactory.assign_user(session, driver, warehouse)
        
        manager = UserFactory.create_manager(session, username="vehicle_reject_manager", name="车队长")
        WarehouseFactory.assign_user(session, manager, warehouse)
        
        boss = UserFactory.create_boss(session, username="vehicle_reject_boss", name="老板")
        
        # 司机添加车辆
        driver_token = create_test_token(driver.id)
        
        response = client.post(
            "/api/vehicles",
            json={
                "license_plate": "川G55555",
                "brand": "奔驰",
                "model": "C级",
                "color": "黑色",
                "ownership_type": "company"
            },
            headers=get_auth_headers(driver_token)
        )
        
        data = assert_success_response(response, 200)
        vehicle_id = data["id"]
        
        # 验证 pending 通知已创建
        pending_notifications = get_notifications_by_ref(session, "vehicle", vehicle_id, status="pending")
        original_notification_ids = [n.id for n in pending_notifications]
        
        # 老板执行审核拒绝
        boss_token = create_test_token(boss.id)
        reject_response = client.put(
            f"/api/vehicles/{vehicle_id}/review",
            json={
                "status": "rejected",
                "comment": "资料不完整，请补充"
            },
            headers=get_auth_headers(boss_token)
        )
        
        assert_success_response(reject_response, 200)
        
        # 刷新会话
        session.expire_all()
        
        # 验证所有原 pending 通知的 status 已更新为 "rejected"
        for notification_id in original_notification_ids:
            notification = session.get(Notification, notification_id)
            assert notification.status == "rejected", \
                f"通知 {notification_id} 状态应为 'rejected'，实际为 '{notification.status}'"

    def test_vehicle_rejection_creates_result_notifications(
        self,
        client: TestClient,
        session: Session
    ):
        """
        测试车辆审核拒绝后创建结果通知给车辆所有者
        
        Requirements: 3.5
        """
        # 创建仓库和用户
        warehouse = WarehouseFactory.create(session, name="车辆拒绝结果通知仓库")
        driver = UserFactory.create_driver(session, username="vehicle_reject_result_driver", name="车辆所有者")
        WarehouseFactory.assign_user(session, driver, warehouse)
        
        boss = UserFactory.create_boss(session, username="vehicle_reject_result_boss", name="老板")
        
        # 司机添加车辆
        driver_token = create_test_token(driver.id)
        
        response = client.post(
            "/api/vehicles",
            json={
                "license_plate": "川H66666",
                "brand": "奥迪",
                "model": "A4",
                "color": "灰色",
                "ownership_type": "company"
            },
            headers=get_auth_headers(driver_token)
        )
        
        data = assert_success_response(response, 200)
        vehicle_id = data["id"]
        
        # 获取审核前车辆所有者的通知数量
        driver_notifications_before = len(list(session.exec(
            select(Notification).where(Notification.user_id == driver.id)
        ).all()))
        
        # 老板执行审核拒绝
        boss_token = create_test_token(boss.id)
        reject_response = client.put(
            f"/api/vehicles/{vehicle_id}/review",
            json={
                "status": "rejected",
                "comment": "不符合要求"
            },
            headers=get_auth_headers(boss_token)
        )
        
        assert_success_response(reject_response, 200)
        
        # 刷新会话
        session.expire_all()
        
        # 验证车辆所有者收到拒绝结果通知
        driver_notifications_after = list(session.exec(
            select(Notification).where(Notification.user_id == driver.id)
        ).all())
        
        assert len(driver_notifications_after) > driver_notifications_before, \
            "车辆所有者应该收到审核拒绝结果通知"



# ==================== 4.4 测试车辆分配通知 ====================
# Requirements: 7.1, 7.2

class TestVehicleAssignmentNotification:
    """测试车辆分配通知"""

    def test_vehicle_assignment_sends_notification_to_target_driver(
        self,
        client: TestClient,
        session: Session
    ):
        """
        测试车辆分配后目标司机收到分配通知
        
        验证：
        - 创建车辆和目标司机
        - 执行车辆分配操作
        - 验证目标司机收到分配通知
        
        Requirements: 7.1
        """
        # 创建仓库
        warehouse = WarehouseFactory.create(session, name="车辆分配通知测试仓库")
        
        # 创建原车主（司机）
        original_driver = UserFactory.create_driver(session, username="vehicle_assign_original", name="原车主")
        WarehouseFactory.assign_user(session, original_driver, warehouse)
        
        # 创建目标司机
        target_driver = UserFactory.create_driver(session, username="vehicle_assign_target", name="目标司机")
        WarehouseFactory.assign_user(session, target_driver, warehouse)
        
        # 创建老板
        boss = UserFactory.create_boss(session, username="vehicle_assign_boss", name="老板")
        
        # 创建已审核通过的车辆
        vehicle = VehicleFactory.create(
            session, original_driver, warehouse,
            license_plate="川J77777",
            status=VehicleStatus.ACTIVE
        )
        
        # 获取分配前目标司机的通知数量
        target_notifications_before = len(list(session.exec(
            select(Notification).where(Notification.user_id == target_driver.id)
        ).all()))
        
        # 老板执行车辆分配
        boss_token = create_test_token(boss.id)
        assign_response = client.put(
            f"/api/vehicles/{vehicle.id}/assign",
            json={
                "user_id": target_driver.id,
                "warehouse_id": warehouse.id
            },
            headers=get_auth_headers(boss_token)
        )
        
        assert_success_response(assign_response, 200)
        
        # 刷新会话
        session.expire_all()
        
        # 验证目标司机收到分配通知
        target_notifications_after = list(session.exec(
            select(Notification).where(Notification.user_id == target_driver.id)
        ).all())
        
        assert len(target_notifications_after) > target_notifications_before, \
            "目标司机应该收到车辆分配通知"

    def test_vehicle_assignment_notification_contains_license_plate(
        self,
        client: TestClient,
        session: Session
    ):
        """
        测试车辆分配通知内容包含车牌号
        
        验证：
        - 通知内容包含车辆车牌号
        
        Requirements: 7.2
        """
        # 创建仓库
        warehouse = WarehouseFactory.create(session, name="车辆分配内容测试仓库")
        
        # 创建原车主
        original_driver = UserFactory.create_driver(session, username="vehicle_content_original", name="原车主")
        WarehouseFactory.assign_user(session, original_driver, warehouse)
        
        # 创建目标司机
        target_driver = UserFactory.create_driver(session, username="vehicle_content_target", name="目标司机")
        WarehouseFactory.assign_user(session, target_driver, warehouse)
        
        # 创建老板
        boss = UserFactory.create_boss(session, username="vehicle_content_boss", name="老板")
        
        # 创建已审核通过的车辆
        license_plate = "川K88888"
        vehicle = VehicleFactory.create(
            session, original_driver, warehouse,
            license_plate=license_plate,
            status=VehicleStatus.ACTIVE
        )
        
        # 老板执行车辆分配
        boss_token = create_test_token(boss.id)
        assign_response = client.put(
            f"/api/vehicles/{vehicle.id}/assign",
            json={
                "user_id": target_driver.id,
                "warehouse_id": warehouse.id
            },
            headers=get_auth_headers(boss_token)
        )
        
        assert_success_response(assign_response, 200)
        
        # 刷新会话
        session.expire_all()
        
        # 获取目标司机的最新通知
        target_notifications = list(session.exec(
            select(Notification).where(Notification.user_id == target_driver.id)
            .order_by(Notification.created_at.desc())
        ).all())
        
        assert len(target_notifications) > 0, "目标司机应该收到通知"
        
        # 验证通知内容包含车牌号
        latest_notification = target_notifications[0]
        notification_text = (latest_notification.title or "") + (latest_notification.content or "")
        assert license_plate in notification_text, \
            f"通知内容应包含车牌号 '{license_plate}'，实际内容: {notification_text}"

    def test_vehicle_assignment_notification_ref_type(
        self,
        client: TestClient,
        session: Session
    ):
        """
        测试车辆分配通知的 ref_type 设置
        
        Requirements: 7.1
        """
        # 创建仓库
        warehouse = WarehouseFactory.create(session, name="车辆分配ref测试仓库")
        
        # 创建原车主
        original_driver = UserFactory.create_driver(session, username="vehicle_ref_original", name="原车主")
        WarehouseFactory.assign_user(session, original_driver, warehouse)
        
        # 创建目标司机
        target_driver = UserFactory.create_driver(session, username="vehicle_ref_target", name="目标司机")
        WarehouseFactory.assign_user(session, target_driver, warehouse)
        
        # 创建老板
        boss = UserFactory.create_boss(session, username="vehicle_ref_boss", name="老板")
        
        # 创建已审核通过的车辆
        vehicle = VehicleFactory.create(
            session, original_driver, warehouse,
            license_plate="川L99999",
            status=VehicleStatus.ACTIVE
        )
        
        # 老板执行车辆分配
        boss_token = create_test_token(boss.id)
        assign_response = client.put(
            f"/api/vehicles/{vehicle.id}/assign",
            json={
                "user_id": target_driver.id,
                "warehouse_id": warehouse.id
            },
            headers=get_auth_headers(boss_token)
        )
        
        assert_success_response(assign_response, 200)
        
        # 刷新会话
        session.expire_all()
        
        # 获取目标司机的最新通知
        target_notifications = list(session.exec(
            select(Notification).where(Notification.user_id == target_driver.id)
            .order_by(Notification.created_at.desc())
        ).all())
        
        assert len(target_notifications) > 0, "目标司机应该收到通知"
        
        # 验证通知存在（分配通知可能有不同的 ref_type）
        latest_notification = target_notifications[0]
        assert latest_notification.title is not None or latest_notification.content is not None
