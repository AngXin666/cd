"""
请假/离职通知集成测试模块
测试请假和离职申请的完整通知流程

Requirements: Requirement 1, 2, 9 (请假/离职通知)
"""

import pytest
from datetime import date, timedelta
from fastapi.testclient import TestClient
from sqlmodel import Session, select

from tests.factories import UserFactory, WarehouseFactory, LeaveFactory
from tests.helpers import (
    get_auth_headers, assert_success_response, create_test_token,
    assert_notification_exists, get_notifications_by_ref,
    assert_notifications_sent_to_users, assert_all_notifications_status_updated
)
from models import Notification, LeaveStatus, LeaveType


# ==================== 3.1 测试请假申请通知流程 ====================
# Requirements: 1.1, 1.2

class TestLeaveApplicationNotification:
    """测试请假申请通知流程"""

    def test_leave_application_sends_notification_to_managers(
        self,
        client: TestClient,
        session: Session
    ):
        """
        测试司机提交请假申请后，车队长、调度、老板都收到通知
        
        验证：
        - 创建司机、车队长、调度、老板
        - 司机提交请假申请
        - 验证车队长、调度、老板都收到通知
        - 验证通知 ref_type="leave", status="pending"
        
        Requirements: 1.1, 1.2
        """
        # 创建仓库
        warehouse = WarehouseFactory.create(session, name="测试仓库")
        
        # 创建司机并分配到仓库
        driver = UserFactory.create_driver(session, username="leave_driver", name="请假司机")
        WarehouseFactory.assign_user(session, driver, warehouse)
        
        # 创建车队长并分配到同一仓库
        manager = UserFactory.create_manager(session, username="leave_manager", name="车队长")
        WarehouseFactory.assign_user(session, manager, warehouse)
        
        # 创建调度和老板
        dispatcher = UserFactory.create_peer_admin(session, username="leave_dispatcher", name="调度")
        boss = UserFactory.create_boss(session, username="leave_boss", name="老板")
        
        # 司机提交请假申请
        driver_token = create_test_token(driver.id)
        start_date = date.today() + timedelta(days=1)
        end_date = start_date + timedelta(days=2)
        
        response = client.post(
            "/api/leave",
            json={
                "leave_type": "leave",
                "start_date": str(start_date),
                "end_date": str(end_date),
                "reason": "个人事务"
            },
            headers=get_auth_headers(driver_token)
        )
        
        data = assert_success_response(response, 200)
        leave_id = data["id"]
        
        # 验证车队长收到通知
        manager_notification = assert_notification_exists(
            session,
            user_id=manager.id,
            ref_type="leave",
            ref_id=leave_id,
            status="pending"
        )
        assert "请假" in manager_notification.title
        
        # 验证调度收到通知
        dispatcher_notification = assert_notification_exists(
            session,
            user_id=dispatcher.id,
            ref_type="leave",
            ref_id=leave_id,
            status="pending"
        )
        assert "请假" in dispatcher_notification.title
        
        # 验证老板收到通知
        boss_notification = assert_notification_exists(
            session,
            user_id=boss.id,
            ref_type="leave",
            ref_id=leave_id,
            status="pending"
        )
        assert "请假" in boss_notification.title

    def test_leave_notification_ref_fields_correct(
        self,
        client: TestClient,
        session: Session
    ):
        """
        验证请假通知的 ref_type、ref_id、status 正确设置
        
        Requirements: 1.2
        """
        # 创建仓库和用户
        warehouse = WarehouseFactory.create(session)
        driver = UserFactory.create_driver(session, username="ref_driver")
        WarehouseFactory.assign_user(session, driver, warehouse)
        boss = UserFactory.create_boss(session, username="ref_boss")
        
        # 提交请假申请
        driver_token = create_test_token(driver.id)
        start_date = date.today() + timedelta(days=1)
        
        response = client.post(
            "/api/leave",
            json={
                "leave_type": "leave",
                "start_date": str(start_date),
                "end_date": str(start_date + timedelta(days=1)),
                "reason": "测试"
            },
            headers=get_auth_headers(driver_token)
        )
        
        data = assert_success_response(response, 200)
        leave_id = data["id"]
        
        # 获取所有相关通知
        notifications = get_notifications_by_ref(session, "leave", leave_id)
        
        assert len(notifications) > 0
        for n in notifications:
            assert n.ref_type == "leave"
            assert n.ref_id == leave_id
            assert n.status == "pending"
            assert n.sender_id == driver.id


# ==================== 3.2 测试请假审批通过后通知状态更新 (关键测试) ====================
# Requirements: 1.3, 1.5, 9.1, 9.2, 9.3, 9.4

class TestLeaveApprovalNotificationUpdate:
    """测试请假审批通过后通知状态更新 - 关键测试"""

    def test_leave_approval_updates_pending_notifications_to_approved(
        self,
        client: TestClient,
        session: Session
    ):
        """
        测试请假审批通过后，所有 pending 通知的 status 更新为 "approved"
        
        验证：
        - 创建请假申请和审批通知
        - 执行审批通过操作
        - 验证所有 pending 通知的 status 更新为 "approved"
        
        Requirements: 1.3, 9.1, 9.2
        """
        # 创建仓库和用户
        warehouse = WarehouseFactory.create(session, name="审批测试仓库")
        driver = UserFactory.create_driver(session, username="approval_driver", name="申请人")
        WarehouseFactory.assign_user(session, driver, warehouse)
        
        manager = UserFactory.create_manager(session, username="approval_manager", name="车队长")
        WarehouseFactory.assign_user(session, manager, warehouse)
        
        dispatcher = UserFactory.create_peer_admin(session, username="approval_dispatcher", name="调度")
        boss = UserFactory.create_boss(session, username="approval_boss", name="老板")
        
        # 司机提交请假申请
        driver_token = create_test_token(driver.id)
        start_date = date.today() + timedelta(days=1)
        
        response = client.post(
            "/api/leave",
            json={
                "leave_type": "leave",
                "start_date": str(start_date),
                "end_date": str(start_date + timedelta(days=1)),
                "reason": "审批测试"
            },
            headers=get_auth_headers(driver_token)
        )
        
        data = assert_success_response(response, 200)
        leave_id = data["id"]
        
        # 验证 pending 通知已创建
        pending_notifications = get_notifications_by_ref(session, "leave", leave_id, status="pending")
        assert len(pending_notifications) >= 3  # 车队长 + 调度 + 老板
        
        # 记录原始通知ID
        original_notification_ids = [n.id for n in pending_notifications]
        
        # 车队长执行审批通过
        manager_token = create_test_token(manager.id)
        approve_response = client.put(
            f"/api/leave/{leave_id}/approve",
            json={
                "status": "approved",
                "approve_remark": "同意请假"
            },
            headers=get_auth_headers(manager_token)
        )
        
        assert_success_response(approve_response, 200)
        
        # 刷新会话以获取最新数据
        session.expire_all()
        
        # 验证所有原 pending 通知的 status 已更新为 "approved"
        for notification_id in original_notification_ids:
            notification = session.get(Notification, notification_id)
            assert notification.status == "approved", \
                f"通知 {notification_id} 状态应为 'approved'，实际为 '{notification.status}'"

    def test_leave_approval_creates_result_notifications(
        self,
        client: TestClient,
        session: Session
    ):
        """
        测试审批完成后创建结果通知给申请人和审批人
        
        验证：
        - 申请人收到结果通知
        - 所有原审批人收到结果通知
        
        Requirements: 1.5, 9.4
        """
        # 创建仓库和用户
        warehouse = WarehouseFactory.create(session, name="结果通知测试仓库")
        driver = UserFactory.create_driver(session, username="result_driver", name="申请人")
        WarehouseFactory.assign_user(session, driver, warehouse)
        
        manager = UserFactory.create_manager(session, username="result_manager", name="车队长")
        WarehouseFactory.assign_user(session, manager, warehouse)
        
        boss = UserFactory.create_boss(session, username="result_boss", name="老板")
        
        # 司机提交请假申请
        driver_token = create_test_token(driver.id)
        start_date = date.today() + timedelta(days=1)
        
        response = client.post(
            "/api/leave",
            json={
                "leave_type": "leave",
                "start_date": str(start_date),
                "end_date": str(start_date + timedelta(days=1)),
                "reason": "结果通知测试"
            },
            headers=get_auth_headers(driver_token)
        )
        
        data = assert_success_response(response, 200)
        leave_id = data["id"]
        
        # 获取审批前的通知数量
        driver_notifications_before = len(list(session.exec(
            select(Notification).where(Notification.user_id == driver.id)
        ).all()))
        
        # 老板执行审批通过
        boss_token = create_test_token(boss.id)
        approve_response = client.put(
            f"/api/leave/{leave_id}/approve",
            json={
                "status": "approved",
                "approve_remark": "批准"
            },
            headers=get_auth_headers(boss_token)
        )
        
        assert_success_response(approve_response, 200)
        
        # 刷新会话
        session.expire_all()
        
        # 验证申请人收到结果通知
        driver_notifications_after = list(session.exec(
            select(Notification).where(Notification.user_id == driver.id)
        ).all())
        
        assert len(driver_notifications_after) > driver_notifications_before, \
            "申请人应该收到结果通知"
        
        # 查找结果通知（状态为 approved 且是新创建的）
        result_notification = None
        for n in driver_notifications_after:
            if n.status == "approved" and "批准" in (n.title or "") or "批准" in (n.content or ""):
                result_notification = n
                break
        
        # 验证车队长也收到结果通知
        manager_result_notifications = list(session.exec(
            select(Notification).where(
                Notification.user_id == manager.id,
                Notification.ref_type == "leave",
                Notification.ref_id == leave_id,
                Notification.status == "approved"
            )
        ).all())
        
        # 应该有原始审批通知（状态已更新）和结果通知
        assert len(manager_result_notifications) >= 1


# ==================== 3.3 测试请假审批拒绝后通知状态更新 ====================
# Requirements: 1.4, 1.5, 9.1, 9.2, 9.3, 9.4

class TestLeaveRejectionNotificationUpdate:
    """测试请假审批拒绝后通知状态更新"""

    def test_leave_rejection_updates_pending_notifications_to_rejected(
        self,
        client: TestClient,
        session: Session
    ):
        """
        测试请假审批拒绝后，所有 pending 通知的 status 更新为 "rejected"
        
        验证：
        - 创建请假申请和审批通知
        - 执行审批拒绝操作
        - 验证所有 pending 通知的 status 更新为 "rejected"
        
        Requirements: 1.4, 9.1, 9.2
        """
        # 创建仓库和用户
        warehouse = WarehouseFactory.create(session, name="拒绝测试仓库")
        driver = UserFactory.create_driver(session, username="reject_driver", name="申请人")
        WarehouseFactory.assign_user(session, driver, warehouse)
        
        manager = UserFactory.create_manager(session, username="reject_manager", name="车队长")
        WarehouseFactory.assign_user(session, manager, warehouse)
        
        boss = UserFactory.create_boss(session, username="reject_boss", name="老板")
        
        # 司机提交请假申请
        driver_token = create_test_token(driver.id)
        start_date = date.today() + timedelta(days=1)
        
        response = client.post(
            "/api/leave",
            json={
                "leave_type": "leave",
                "start_date": str(start_date),
                "end_date": str(start_date + timedelta(days=1)),
                "reason": "拒绝测试"
            },
            headers=get_auth_headers(driver_token)
        )
        
        data = assert_success_response(response, 200)
        leave_id = data["id"]
        
        # 验证 pending 通知已创建
        pending_notifications = get_notifications_by_ref(session, "leave", leave_id, status="pending")
        original_notification_ids = [n.id for n in pending_notifications]
        
        # 车队长执行审批拒绝
        manager_token = create_test_token(manager.id)
        reject_response = client.put(
            f"/api/leave/{leave_id}/approve",
            json={
                "status": "rejected",
                "approve_remark": "工作安排冲突"
            },
            headers=get_auth_headers(manager_token)
        )
        
        assert_success_response(reject_response, 200)
        
        # 刷新会话
        session.expire_all()
        
        # 验证所有原 pending 通知的 status 已更新为 "rejected"
        for notification_id in original_notification_ids:
            notification = session.get(Notification, notification_id)
            assert notification.status == "rejected", \
                f"通知 {notification_id} 状态应为 'rejected'，实际为 '{notification.status}'"

    def test_leave_rejection_creates_result_notifications(
        self,
        client: TestClient,
        session: Session
    ):
        """
        测试审批拒绝后创建结果通知给申请人和审批人
        
        Requirements: 1.5, 9.4
        """
        # 创建仓库和用户
        warehouse = WarehouseFactory.create(session, name="拒绝结果通知仓库")
        driver = UserFactory.create_driver(session, username="reject_result_driver", name="申请人")
        WarehouseFactory.assign_user(session, driver, warehouse)
        
        boss = UserFactory.create_boss(session, username="reject_result_boss", name="老板")
        
        # 司机提交请假申请
        driver_token = create_test_token(driver.id)
        start_date = date.today() + timedelta(days=1)
        
        response = client.post(
            "/api/leave",
            json={
                "leave_type": "leave",
                "start_date": str(start_date),
                "end_date": str(start_date + timedelta(days=1)),
                "reason": "拒绝结果测试"
            },
            headers=get_auth_headers(driver_token)
        )
        
        data = assert_success_response(response, 200)
        leave_id = data["id"]
        
        # 获取审批前申请人的通知数量
        driver_notifications_before = len(list(session.exec(
            select(Notification).where(Notification.user_id == driver.id)
        ).all()))
        
        # 老板执行审批拒绝
        boss_token = create_test_token(boss.id)
        reject_response = client.put(
            f"/api/leave/{leave_id}/approve",
            json={
                "status": "rejected",
                "approve_remark": "不批准"
            },
            headers=get_auth_headers(boss_token)
        )
        
        assert_success_response(reject_response, 200)
        
        # 刷新会话
        session.expire_all()
        
        # 验证申请人收到结果通知
        driver_notifications_after = list(session.exec(
            select(Notification).where(Notification.user_id == driver.id)
        ).all())
        
        assert len(driver_notifications_after) > driver_notifications_before, \
            "申请人应该收到拒绝结果通知"


# ==================== 3.4 测试离职申请通知流程 ====================
# Requirements: 2.1, 2.2

class TestResignApplicationNotification:
    """测试离职申请通知流程"""

    def test_resign_application_sends_notification_to_managers(
        self,
        client: TestClient,
        session: Session
    ):
        """
        测试司机提交离职申请后，车队长、调度、老板都收到通知
        
        验证：
        - 创建司机、车队长、调度、老板
        - 司机提交离职申请
        - 验证车队长、调度、老板都收到通知
        - 验证通知 ref_type="resign", status="pending"
        
        Requirements: 2.1, 2.2
        """
        # 创建仓库
        warehouse = WarehouseFactory.create(session, name="离职测试仓库")
        
        # 创建司机并分配到仓库
        driver = UserFactory.create_driver(session, username="resign_driver", name="离职司机")
        WarehouseFactory.assign_user(session, driver, warehouse)
        
        # 创建车队长并分配到同一仓库
        manager = UserFactory.create_manager(session, username="resign_manager", name="车队长")
        WarehouseFactory.assign_user(session, manager, warehouse)
        
        # 创建调度和老板
        dispatcher = UserFactory.create_peer_admin(session, username="resign_dispatcher", name="调度")
        boss = UserFactory.create_boss(session, username="resign_boss", name="老板")
        
        # 司机提交离职申请
        driver_token = create_test_token(driver.id)
        start_date = date.today() + timedelta(days=30)
        
        response = client.post(
            "/api/leave",
            json={
                "leave_type": "resign",
                "start_date": str(start_date),
                "end_date": str(start_date),
                "reason": "个人发展原因"
            },
            headers=get_auth_headers(driver_token)
        )
        
        data = assert_success_response(response, 200)
        resign_id = data["id"]
        
        # 验证车队长收到通知
        manager_notification = assert_notification_exists(
            session,
            user_id=manager.id,
            ref_type="resign",
            ref_id=resign_id,
            status="pending"
        )
        assert "离职" in manager_notification.title
        
        # 验证调度收到通知
        dispatcher_notification = assert_notification_exists(
            session,
            user_id=dispatcher.id,
            ref_type="resign",
            ref_id=resign_id,
            status="pending"
        )
        assert "离职" in dispatcher_notification.title
        
        # 验证老板收到通知
        boss_notification = assert_notification_exists(
            session,
            user_id=boss.id,
            ref_type="resign",
            ref_id=resign_id,
            status="pending"
        )
        assert "离职" in boss_notification.title

    def test_resign_notification_ref_fields_correct(
        self,
        client: TestClient,
        session: Session
    ):
        """
        验证离职通知的 ref_type、ref_id、status 正确设置
        
        Requirements: 2.2
        """
        # 创建仓库和用户
        warehouse = WarehouseFactory.create(session)
        driver = UserFactory.create_driver(session, username="resign_ref_driver")
        WarehouseFactory.assign_user(session, driver, warehouse)
        boss = UserFactory.create_boss(session, username="resign_ref_boss")
        
        # 提交离职申请
        driver_token = create_test_token(driver.id)
        start_date = date.today() + timedelta(days=30)
        
        response = client.post(
            "/api/leave",
            json={
                "leave_type": "resign",
                "start_date": str(start_date),
                "end_date": str(start_date),
                "reason": "离职测试"
            },
            headers=get_auth_headers(driver_token)
        )
        
        data = assert_success_response(response, 200)
        resign_id = data["id"]
        
        # 获取所有相关通知
        notifications = get_notifications_by_ref(session, "resign", resign_id)
        
        assert len(notifications) > 0
        for n in notifications:
            assert n.ref_type == "resign"
            assert n.ref_id == resign_id
            assert n.status == "pending"
            assert n.sender_id == driver.id


# ==================== 3.5 测试离职审批后通知状态更新 ====================
# Requirements: 2.3, 2.4, 2.5

class TestResignApprovalNotificationUpdate:
    """测试离职审批后通知状态更新"""

    def test_resign_approval_updates_pending_notifications_to_approved(
        self,
        client: TestClient,
        session: Session
    ):
        """
        测试离职审批通过后，所有 pending 通知的 status 更新为 "approved"
        
        验证：
        - 创建离职申请和审批通知
        - 执行审批通过操作
        - 验证所有 pending 通知的 status 正确更新
        
        Requirements: 2.3, 2.5
        """
        # 创建仓库和用户
        warehouse = WarehouseFactory.create(session, name="离职审批测试仓库")
        driver = UserFactory.create_driver(session, username="resign_approval_driver", name="离职申请人")
        WarehouseFactory.assign_user(session, driver, warehouse)
        
        manager = UserFactory.create_manager(session, username="resign_approval_manager", name="车队长")
        WarehouseFactory.assign_user(session, manager, warehouse)
        
        boss = UserFactory.create_boss(session, username="resign_approval_boss", name="老板")
        
        # 司机提交离职申请
        driver_token = create_test_token(driver.id)
        start_date = date.today() + timedelta(days=30)
        
        response = client.post(
            "/api/leave",
            json={
                "leave_type": "resign",
                "start_date": str(start_date),
                "end_date": str(start_date),
                "reason": "离职审批测试"
            },
            headers=get_auth_headers(driver_token)
        )
        
        data = assert_success_response(response, 200)
        resign_id = data["id"]
        
        # 验证 pending 通知已创建
        pending_notifications = get_notifications_by_ref(session, "resign", resign_id, status="pending")
        original_notification_ids = [n.id for n in pending_notifications]
        
        # 老板执行审批通过
        boss_token = create_test_token(boss.id)
        approve_response = client.put(
            f"/api/leave/{resign_id}/approve",
            json={
                "status": "approved",
                "approve_remark": "同意离职"
            },
            headers=get_auth_headers(boss_token)
        )
        
        assert_success_response(approve_response, 200)
        
        # 刷新会话
        session.expire_all()
        
        # 验证所有原 pending 通知的 status 已更新为 "approved"
        for notification_id in original_notification_ids:
            notification = session.get(Notification, notification_id)
            assert notification.status == "approved", \
                f"通知 {notification_id} 状态应为 'approved'，实际为 '{notification.status}'"

    def test_resign_rejection_updates_pending_notifications_to_rejected(
        self,
        client: TestClient,
        session: Session
    ):
        """
        测试离职审批拒绝后，所有 pending 通知的 status 更新为 "rejected"
        
        Requirements: 2.4, 2.5
        """
        # 创建仓库和用户
        warehouse = WarehouseFactory.create(session, name="离职拒绝测试仓库")
        driver = UserFactory.create_driver(session, username="resign_reject_driver", name="离职申请人")
        WarehouseFactory.assign_user(session, driver, warehouse)
        
        boss = UserFactory.create_boss(session, username="resign_reject_boss", name="老板")
        
        # 司机提交离职申请
        driver_token = create_test_token(driver.id)
        start_date = date.today() + timedelta(days=30)
        
        response = client.post(
            "/api/leave",
            json={
                "leave_type": "resign",
                "start_date": str(start_date),
                "end_date": str(start_date),
                "reason": "离职拒绝测试"
            },
            headers=get_auth_headers(driver_token)
        )
        
        data = assert_success_response(response, 200)
        resign_id = data["id"]
        
        # 验证 pending 通知已创建
        pending_notifications = get_notifications_by_ref(session, "resign", resign_id, status="pending")
        original_notification_ids = [n.id for n in pending_notifications]
        
        # 老板执行审批拒绝
        boss_token = create_test_token(boss.id)
        reject_response = client.put(
            f"/api/leave/{resign_id}/approve",
            json={
                "status": "rejected",
                "approve_remark": "暂不批准离职"
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

    def test_resign_approval_creates_result_notifications(
        self,
        client: TestClient,
        session: Session
    ):
        """
        测试离职审批完成后创建结果通知给申请人
        
        Requirements: 2.5
        """
        # 创建仓库和用户
        warehouse = WarehouseFactory.create(session, name="离职结果通知仓库")
        driver = UserFactory.create_driver(session, username="resign_result_driver", name="离职申请人")
        WarehouseFactory.assign_user(session, driver, warehouse)
        
        boss = UserFactory.create_boss(session, username="resign_result_boss", name="老板")
        
        # 司机提交离职申请
        driver_token = create_test_token(driver.id)
        start_date = date.today() + timedelta(days=30)
        
        response = client.post(
            "/api/leave",
            json={
                "leave_type": "resign",
                "start_date": str(start_date),
                "end_date": str(start_date),
                "reason": "离职结果测试"
            },
            headers=get_auth_headers(driver_token)
        )
        
        data = assert_success_response(response, 200)
        resign_id = data["id"]
        
        # 获取审批前申请人的通知数量
        driver_notifications_before = len(list(session.exec(
            select(Notification).where(Notification.user_id == driver.id)
        ).all()))
        
        # 老板执行审批通过
        boss_token = create_test_token(boss.id)
        approve_response = client.put(
            f"/api/leave/{resign_id}/approve",
            json={
                "status": "approved",
                "approve_remark": "批准离职"
            },
            headers=get_auth_headers(boss_token)
        )
        
        assert_success_response(approve_response, 200)
        
        # 刷新会话
        session.expire_all()
        
        # 验证申请人收到结果通知
        driver_notifications_after = list(session.exec(
            select(Notification).where(Notification.user_id == driver.id)
        ).all())
        
        assert len(driver_notifications_after) > driver_notifications_before, \
            "申请人应该收到离职审批结果通知"
