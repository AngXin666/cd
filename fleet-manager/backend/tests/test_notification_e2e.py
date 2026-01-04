"""
通知系统 API 端到端测试模块
测试完整的 API 流程，包括请假、车辆、用户管理和仓库管理的通知流程

Requirements: Requirement 1-10 (通知系统全面测试)
"""

import pytest
from datetime import date, timedelta
from fastapi.testclient import TestClient
from sqlmodel import Session, select

from tests.factories import (
    UserFactory, WarehouseFactory, VehicleFactory, NotificationFactory
)
from tests.helpers import (
    get_auth_headers, assert_success_response, create_test_token,
    assert_notification_exists, get_notifications_by_ref
)
from models import Notification, VehicleStatus


class TestLeaveAPINotificationFlow:
    """测试请假 API 通知流程 - 端到端测试"""

    def test_leave_api_full_notification_flow(self, client: TestClient, session: Session):
        """测试请假 API 完整通知流程"""
        warehouse = WarehouseFactory.create(session, name="请假API测试仓库")
        driver = UserFactory.create_driver(session, username="leave_api_driver", name="请假API测试司机")
        WarehouseFactory.assign_user(session, driver, warehouse)
        manager = UserFactory.create_manager(session, username="leave_api_manager", name="车队长")
        WarehouseFactory.assign_user(session, manager, warehouse)
        dispatcher = UserFactory.create_peer_admin(session, username="leave_api_dispatcher", name="调度")
        boss = UserFactory.create_boss(session, username="leave_api_boss", name="老板")
        
        driver_token = create_test_token(driver.id)
        start_date = date.today() + timedelta(days=1)
        end_date = start_date + timedelta(days=2)
        
        create_response = client.post(
            "/api/leave",
            json={"leave_type": "leave", "start_date": str(start_date), "end_date": str(end_date), "reason": "API端到端测试请假"},
            headers=get_auth_headers(driver_token)
        )
        leave_data = assert_success_response(create_response, 200)
        leave_id = leave_data["id"]
        
        manager_notification = assert_notification_exists(session, user_id=manager.id, ref_type="leave", ref_id=leave_id, status="pending")
        assert manager_notification is not None
        dispatcher_notification = assert_notification_exists(session, user_id=dispatcher.id, ref_type="leave", ref_id=leave_id, status="pending")
        assert dispatcher_notification is not None
        boss_notification = assert_notification_exists(session, user_id=boss.id, ref_type="leave", ref_id=leave_id, status="pending")
        assert boss_notification is not None
        
        pending_notifications = get_notifications_by_ref(session, "leave", leave_id, status="pending")
        original_notification_ids = [n.id for n in pending_notifications]
        
        boss_token = create_test_token(boss.id)
        approve_response = client.put(
            f"/api/leave/{leave_id}/approve",
            json={"status": "approved", "approve_remark": "API测试批准"},
            headers=get_auth_headers(boss_token)
        )
        assert_success_response(approve_response, 200)
        
        session.expire_all()
        for notification_id in original_notification_ids:
            notification = session.get(Notification, notification_id)
            assert notification.status == "approved"
        
        manager_token = create_test_token(manager.id)
        notifications_response = client.get("/api/notifications", headers=get_auth_headers(manager_token))
        notifications_data = assert_success_response(notifications_response, 200)
        leave_notifications = [n for n in notifications_data if n.get("ref_type") == "leave" and n.get("ref_id") == leave_id]
        assert len(leave_notifications) > 0

    def test_leave_api_rejection_notification_flow(self, client: TestClient, session: Session):
        """测试请假 API 拒绝流程的通知更新"""
        warehouse = WarehouseFactory.create(session, name="请假拒绝API测试仓库")
        driver = UserFactory.create_driver(session, username="leave_reject_api_driver", name="请假拒绝测试司机")
        WarehouseFactory.assign_user(session, driver, warehouse)
        boss = UserFactory.create_boss(session, username="leave_reject_api_boss", name="老板")
        
        driver_token = create_test_token(driver.id)
        start_date = date.today() + timedelta(days=1)
        create_response = client.post(
            "/api/leave",
            json={"leave_type": "leave", "start_date": str(start_date), "end_date": str(start_date + timedelta(days=1)), "reason": "API拒绝测试"},
            headers=get_auth_headers(driver_token)
        )
        leave_data = assert_success_response(create_response, 200)
        leave_id = leave_data["id"]
        
        pending_notifications = get_notifications_by_ref(session, "leave", leave_id, status="pending")
        original_notification_ids = [n.id for n in pending_notifications]
        
        boss_token = create_test_token(boss.id)
        reject_response = client.put(
            f"/api/leave/{leave_id}/approve",
            json={"status": "rejected", "approve_remark": "API测试拒绝"},
            headers=get_auth_headers(boss_token)
        )
        assert_success_response(reject_response, 200)
        
        session.expire_all()
        for notification_id in original_notification_ids:
            notification = session.get(Notification, notification_id)
            assert notification.status == "rejected"


class TestVehicleAPINotificationFlow:
    """测试车辆 API 通知流程 - 端到端测试"""

    def test_vehicle_api_full_notification_flow(self, client: TestClient, session: Session):
        """测试车辆 API 完整通知流程"""
        warehouse = WarehouseFactory.create(session, name="车辆API测试仓库")
        driver = UserFactory.create_driver(session, username="vehicle_api_driver", name="车辆API测试司机")
        WarehouseFactory.assign_user(session, driver, warehouse)
        manager = UserFactory.create_manager(session, username="vehicle_api_manager", name="车队长")
        WarehouseFactory.assign_user(session, manager, warehouse)
        dispatcher = UserFactory.create_peer_admin(session, username="vehicle_api_dispatcher", name="调度")
        boss = UserFactory.create_boss(session, username="vehicle_api_boss", name="老板")
        
        driver_token = create_test_token(driver.id)
        create_response = client.post(
            "/api/vehicles",
            json={"license_plate": "川A00001", "brand": "丰田", "model": "卡罗拉", "color": "白色", "ownership_type": "company"},
            headers=get_auth_headers(driver_token)
        )
        vehicle_data = assert_success_response(create_response, 200)
        vehicle_id = vehicle_data["id"]
        
        manager_notification = assert_notification_exists(session, user_id=manager.id, ref_type="vehicle", ref_id=vehicle_id, status="pending")
        assert manager_notification is not None
        dispatcher_notification = assert_notification_exists(session, user_id=dispatcher.id, ref_type="vehicle", ref_id=vehicle_id, status="pending")
        assert dispatcher_notification is not None
        boss_notification = assert_notification_exists(session, user_id=boss.id, ref_type="vehicle", ref_id=vehicle_id, status="pending")
        assert boss_notification is not None
        
        pending_notifications = get_notifications_by_ref(session, "vehicle", vehicle_id, status="pending")
        original_notification_ids = [n.id for n in pending_notifications]
        
        boss_token = create_test_token(boss.id)
        approve_response = client.put(
            f"/api/vehicles/{vehicle_id}/review",
            json={"status": "active", "comment": "API测试审核通过"},
            headers=get_auth_headers(boss_token)
        )
        assert_success_response(approve_response, 200)
        
        session.expire_all()
        for notification_id in original_notification_ids:
            notification = session.get(Notification, notification_id)
            assert notification.status == "approved"
        
        manager_token = create_test_token(manager.id)
        notifications_response = client.get("/api/notifications", headers=get_auth_headers(manager_token))
        notifications_data = assert_success_response(notifications_response, 200)
        vehicle_notifications = [n for n in notifications_data if n.get("ref_type") == "vehicle" and n.get("ref_id") == vehicle_id]
        assert len(vehicle_notifications) > 0

    def test_vehicle_api_rejection_notification_flow(self, client: TestClient, session: Session):
        """测试车辆 API 拒绝流程的通知更新"""
        warehouse = WarehouseFactory.create(session, name="车辆拒绝API测试仓库")
        driver = UserFactory.create_driver(session, username="vehicle_reject_api_driver", name="车辆拒绝测试司机")
        WarehouseFactory.assign_user(session, driver, warehouse)
        boss = UserFactory.create_boss(session, username="vehicle_reject_api_boss", name="老板")
        
        driver_token = create_test_token(driver.id)
        create_response = client.post(
            "/api/vehicles",
            json={"license_plate": "川A00002", "brand": "本田", "model": "雅阁", "color": "黑色", "ownership_type": "company"},
            headers=get_auth_headers(driver_token)
        )
        vehicle_data = assert_success_response(create_response, 200)
        vehicle_id = vehicle_data["id"]
        
        pending_notifications = get_notifications_by_ref(session, "vehicle", vehicle_id, status="pending")
        original_notification_ids = [n.id for n in pending_notifications]
        
        boss_token = create_test_token(boss.id)
        reject_response = client.put(
            f"/api/vehicles/{vehicle_id}/review",
            json={"status": "rejected", "comment": "API测试拒绝"},
            headers=get_auth_headers(boss_token)
        )
        assert_success_response(reject_response, 200)
        
        session.expire_all()
        for notification_id in original_notification_ids:
            notification = session.get(Notification, notification_id)
            assert notification.status == "rejected"


class TestUserManagementAPINotificationFlow:
    """测试用户管理 API 通知流程 - 端到端测试"""

    def test_driver_type_change_api_notification_flow(self, client: TestClient, session: Session):
        """测试司机类型变更 API 完整通知流程"""
        driver = UserFactory.create_driver(session, username="e2e_type_driver", name="类型变更E2E测试司机")
        admin = UserFactory.create_peer_admin(session, username="e2e_type_admin", name="调度管理员")
        
        admin_token = create_test_token(admin.id)
        update_response = client.put(
            f"/api/users/{driver.id}",
            json={"driver_type": "with_vehicle"},
            headers=get_auth_headers(admin_token)
        )
        assert_success_response(update_response, 200)
        
        notification = assert_notification_exists(session, user_id=driver.id, ref_type="driver_type_change")
        assert notification is not None
        assert "带车司机" in notification.content
        assert notification.sender_id == admin.id
        
        driver_token = create_test_token(driver.id)
        notifications_response = client.get("/api/notifications", headers=get_auth_headers(driver_token))
        notifications_data = assert_success_response(notifications_response, 200)
        type_change_notifications = [n for n in notifications_data if n.get("ref_type") == "driver_type_change"]
        assert len(type_change_notifications) > 0

    def test_driver_type_change_to_driver_only_api_flow(self, client: TestClient, session: Session):
        """测试修改司机类型为纯司机的 API 流程"""
        driver = UserFactory.create_driver(session, username="e2e_driver_only", name="纯司机E2E测试")
        driver.driver_type = "with_vehicle"
        session.add(driver)
        session.commit()
        
        boss = UserFactory.create_boss(session, username="e2e_driver_only_boss", name="老板")
        boss_token = create_test_token(boss.id)
        update_response = client.put(
            f"/api/users/{driver.id}",
            json={"driver_type": "driver_only"},
            headers=get_auth_headers(boss_token)
        )
        assert_success_response(update_response, 200)
        
        notification = assert_notification_exists(session, user_id=driver.id, ref_type="driver_type_change")
        assert "纯司机" in notification.content

    def test_warehouse_assignment_api_notification_flow(self, client: TestClient, session: Session):
        """测试仓库分配 API 完整通知流程"""
        driver = UserFactory.create_driver(session, username="e2e_assign_driver", name="仓库分配E2E测试司机")
        warehouse1 = WarehouseFactory.create(session, name="E2E东区仓库")
        warehouse2 = WarehouseFactory.create(session, name="E2E西区仓库")
        admin = UserFactory.create_peer_admin(session, username="e2e_assign_admin", name="调度管理员")
        
        admin_token = create_test_token(admin.id)
        assign_response = client.post(
            f"/api/users/{driver.id}/warehouses",
            json={"warehouse_ids": [warehouse1.id, warehouse2.id]},
            headers=get_auth_headers(admin_token)
        )
        assert_success_response(assign_response, 200)
        
        notification = assert_notification_exists(session, user_id=driver.id, ref_type="warehouse_assignment")
        assert notification is not None
        assert "E2E东区仓库" in notification.content
        assert "E2E西区仓库" in notification.content
        assert notification.sender_id == admin.id
        
        driver_token = create_test_token(driver.id)
        notifications_response = client.get("/api/notifications", headers=get_auth_headers(driver_token))
        notifications_data = assert_success_response(notifications_response, 200)
        assignment_notifications = [n for n in notifications_data if n.get("ref_type") == "warehouse_assignment"]
        assert len(assignment_notifications) > 0

    def test_user_management_api_combined_flow(self, client: TestClient, session: Session):
        """测试用户管理 API 组合流程"""
        driver = UserFactory.create_driver(session, username="e2e_combined_driver", name="组合测试司机")
        warehouse = WarehouseFactory.create(session, name="E2E组合测试仓库")
        boss = UserFactory.create_boss(session, username="e2e_combined_boss", name="老板")
        
        boss_token = create_test_token(boss.id)
        type_response = client.put(
            f"/api/users/{driver.id}",
            json={"driver_type": "with_vehicle"},
            headers=get_auth_headers(boss_token)
        )
        assert_success_response(type_response, 200)
        
        assign_response = client.post(
            f"/api/users/{driver.id}/warehouses",
            json={"warehouse_ids": [warehouse.id]},
            headers=get_auth_headers(boss_token)
        )
        assert_success_response(assign_response, 200)
        
        driver_token = create_test_token(driver.id)
        notifications_response = client.get("/api/notifications", headers=get_auth_headers(driver_token))
        notifications_data = assert_success_response(notifications_response, 200)
        
        type_change_notifications = [n for n in notifications_data if n.get("ref_type") == "driver_type_change"]
        assignment_notifications = [n for n in notifications_data if n.get("ref_type") == "warehouse_assignment"]
        assert len(type_change_notifications) > 0
        assert len(assignment_notifications) > 0

    def test_no_notification_when_driver_type_unchanged_api(self, client: TestClient, session: Session):
        """测试通过 API 修改其他字段时不发送类型变更通知"""
        driver = UserFactory.create_driver(session, username="e2e_unchanged_driver", name="未变更测试司机")
        admin = UserFactory.create_peer_admin(session, username="e2e_unchanged_admin", name="调度")
        
        notifications_before = list(session.exec(
            select(Notification).where(Notification.user_id == driver.id, Notification.ref_type == "driver_type_change")
        ).all())
        count_before = len(notifications_before)
        
        admin_token = create_test_token(admin.id)
        response = client.put(
            f"/api/users/{driver.id}",
            json={"name": "新名字E2E"},
            headers=get_auth_headers(admin_token)
        )
        assert_success_response(response, 200)
        
        session.expire_all()
        notifications_after = list(session.exec(
            select(Notification).where(Notification.user_id == driver.id, Notification.ref_type == "driver_type_change")
        ).all())
        assert len(notifications_after) == count_before


class TestWarehouseManagementAPINotificationFlow:
    """测试仓库管理 API 通知流程 - 端到端测试"""

    def test_warehouse_assign_users_api_notification_flow(self, client: TestClient, session: Session):
        """测试仓库分配用户 API 完整通知流程"""
        warehouse = WarehouseFactory.create(session, name="E2E仓库分配测试仓库")
        driver1 = UserFactory.create_driver(session, username="e2e_wh_driver1", name="仓库分配司机1")
        driver2 = UserFactory.create_driver(session, username="e2e_wh_driver2", name="仓库分配司机2")
        boss = UserFactory.create_boss(session, username="e2e_wh_boss", name="老板")
        
        boss_token = create_test_token(boss.id)
        assign_response = client.post(
            f"/api/warehouses/{warehouse.id}/assign",
            json={"user_ids": [driver1.id, driver2.id]},
            headers=get_auth_headers(boss_token)
        )
        assert_success_response(assign_response, 200)
        
        notification1 = assert_notification_exists(session, user_id=driver1.id, ref_type="warehouse_assignment")
        assert notification1 is not None
        assert "E2E仓库分配测试仓库" in notification1.content
        
        notification2 = assert_notification_exists(session, user_id=driver2.id, ref_type="warehouse_assignment")
        assert notification2 is not None
        assert "E2E仓库分配测试仓库" in notification2.content

    def test_warehouse_assign_manager_api_notification_flow(self, client: TestClient, session: Session):
        """测试仓库分配车队长 API 通知流程"""
        warehouse = WarehouseFactory.create(session, name="E2E车队长分配仓库")
        manager = UserFactory.create_manager(session, username="e2e_wh_manager", name="被分配车队长")
        boss = UserFactory.create_boss(session, username="e2e_wh_manager_boss", name="老板")
        
        boss_token = create_test_token(boss.id)
        assign_response = client.post(
            f"/api/warehouses/{warehouse.id}/assign",
            json={"user_ids": [manager.id]},
            headers=get_auth_headers(boss_token)
        )
        assert_success_response(assign_response, 200)
        
        notification = assert_notification_exists(session, user_id=manager.id, ref_type="warehouse_assignment")
        assert notification is not None
        assert "E2E车队长分配仓库" in notification.content
        
        manager_token = create_test_token(manager.id)
        notifications_response = client.get("/api/notifications", headers=get_auth_headers(manager_token))
        notifications_data = assert_success_response(notifications_response, 200)
        assignment_notifications = [n for n in notifications_data if n.get("ref_type") == "warehouse_assignment"]
        assert len(assignment_notifications) > 0
