"""
通知系统边界条件和异常测试模块
测试边界条件和异常场景

Requirements: 1.1, 2.1, 3.1, 10.1, 10.4, 错误处理
"""

import pytest
from datetime import date, timedelta
from fastapi.testclient import TestClient
from sqlmodel import Session, select

from tests.factories import UserFactory, WarehouseFactory, LeaveFactory
from tests.helpers import (
    get_auth_headers, assert_success_response, create_test_token,
    assert_notification_exists, get_notifications_by_ref,
    assert_error_response
)
from models import Notification, LeaveStatus
from crud.notifications import (
    create_approval_notification,
    get_notifications,
    get_unread_count
)


# ==================== 8.1 测试无管辖关系时的通知 ====================
# Requirements: 1.1, 2.1, 3.1

class TestNoSupervisionRelationship:
    """测试无管辖关系时的通知"""

    def test_leave_application_without_warehouse_sends_to_dispatcher_and_boss(
        self,
        client: TestClient,
        session: Session
    ):
        """
        测试司机没有分配仓库时提交请假申请
        
        验证：
        - 司机没有分配仓库时提交申请
        - 只有调度和老板收到通知（没有车队长）
        
        Requirements: 1.1
        """
        # 创建司机（不分配仓库）
        driver = UserFactory.create_driver(session, username="no_wh_driver", name="无仓库司机")
        
        # 创建调度和老板
        dispatcher = UserFactory.create_peer_admin(session, username="edge_dispatcher", name="调度")
        boss = UserFactory.create_boss(session, username="edge_boss", name="老板")
        
        # 创建一个车队长（但不与司机在同一仓库）
        other_warehouse = WarehouseFactory.create(session, name="其他仓库")
        manager = UserFactory.create_manager(session, username="edge_manager", name="车队长")
        WarehouseFactory.assign_user(session, manager, other_warehouse)
        
        # 司机提交请假申请
        driver_token = create_test_token(driver.id)
        start_date = date.today() + timedelta(days=1)
        
        response = client.post(
            "/api/leave",
            json={
                "leave_type": "leave",
                "start_date": str(start_date),
                "end_date": str(start_date + timedelta(days=1)),
                "reason": "无仓库司机请假测试"
            },
            headers=get_auth_headers(driver_token)
        )
        
        data = assert_success_response(response, 200)
        leave_id = data["id"]
        
        # 获取所有相关通知
        notifications = get_notifications_by_ref(session, "leave", leave_id)
        
        # 验证通知接收者
        recipient_ids = {n.user_id for n in notifications}
        
        # 调度和老板应该收到通知
        assert dispatcher.id in recipient_ids, "调度应该收到通知"
        assert boss.id in recipient_ids, "老板应该收到通知"
        
        # 车队长不应该收到通知（因为不管辖该司机）
        assert manager.id not in recipient_ids, "不管辖该司机的车队长不应该收到通知"

    def test_resign_application_without_warehouse_sends_to_dispatcher_and_boss(
        self,
        client: TestClient,
        session: Session
    ):
        """
        测试司机没有分配仓库时提交离职申请
        
        验证：
        - 只有调度和老板收到通知
        
        Requirements: 2.1
        """
        # 创建司机（不分配仓库）
        driver = UserFactory.create_driver(session, username="no_wh_resign_driver", name="无仓库离职司机")
        
        # 创建调度和老板
        dispatcher = UserFactory.create_peer_admin(session, username="resign_edge_dispatcher", name="调度")
        boss = UserFactory.create_boss(session, username="resign_edge_boss", name="老板")
        
        # 司机提交离职申请
        driver_token = create_test_token(driver.id)
        start_date = date.today() + timedelta(days=30)
        
        response = client.post(
            "/api/leave",
            json={
                "leave_type": "resign",
                "start_date": str(start_date),
                "end_date": str(start_date),
                "reason": "无仓库司机离职测试"
            },
            headers=get_auth_headers(driver_token)
        )
        
        data = assert_success_response(response, 200)
        resign_id = data["id"]
        
        # 获取所有相关通知
        notifications = get_notifications_by_ref(session, "resign", resign_id)
        
        # 验证通知接收者
        recipient_ids = {n.user_id for n in notifications}
        
        # 调度和老板应该收到通知
        assert dispatcher.id in recipient_ids, "调度应该收到离职通知"
        assert boss.id in recipient_ids, "老板应该收到离职通知"

    def test_approval_notification_no_managers_available(self, session: Session):
        """
        测试使用 create_approval_notification 函数时没有车队长的情况
        
        验证：
        - 只发送给调度和老板
        
        Requirements: 1.1, 2.1, 3.1
        """
        # 创建申请人（不分配仓库）
        applicant = UserFactory.create_driver(session, username="no_mgr_applicant", name="申请人")
        
        # 创建调度和老板
        dispatcher = UserFactory.create_peer_admin(session, username="no_mgr_dispatcher")
        boss = UserFactory.create_boss(session, username="no_mgr_boss")
        
        # 创建审批通知
        notifications = create_approval_notification(
            session,
            applicant_id=applicant.id,
            ref_type="leave",
            ref_id=999,
            title="测试审批通知",
            content="测试内容"
        )
        
        # 验证只有调度和老板收到通知
        recipient_ids = {n.user_id for n in notifications}
        assert dispatcher.id in recipient_ids
        assert boss.id in recipient_ids
        assert len(recipient_ids) == 2  # 只有调度和老板


# ==================== 8.2 测试重复审批 ====================
# Requirements: 错误处理

class TestDuplicateApproval:
    """测试重复审批"""

    def test_approve_already_approved_leave_returns_error(
        self,
        client: TestClient,
        session: Session
    ):
        """
        测试对已审批的请假申请再次审批
        
        验证：
        - 返回错误
        - 不创建新通知
        
        Requirements: 错误处理
        """
        # 创建仓库和用户
        warehouse = WarehouseFactory.create(session, name="重复审批测试仓库")
        driver = UserFactory.create_driver(session, username="dup_approve_driver", name="司机")
        WarehouseFactory.assign_user(session, driver, warehouse)
        
        boss = UserFactory.create_boss(session, username="dup_approve_boss", name="老板")
        
        # 司机提交请假申请
        driver_token = create_test_token(driver.id)
        start_date = date.today() + timedelta(days=1)
        
        response = client.post(
            "/api/leave",
            json={
                "leave_type": "leave",
                "start_date": str(start_date),
                "end_date": str(start_date + timedelta(days=1)),
                "reason": "重复审批测试"
            },
            headers=get_auth_headers(driver_token)
        )
        
        data = assert_success_response(response, 200)
        leave_id = data["id"]
        
        # 第一次审批（应该成功）
        boss_token = create_test_token(boss.id)
        first_approve_response = client.put(
            f"/api/leave/{leave_id}/approve",
            json={
                "status": "approved",
                "approve_remark": "第一次审批"
            },
            headers=get_auth_headers(boss_token)
        )
        
        assert_success_response(first_approve_response, 200)
        
        # 记录审批后的通知数量
        notifications_after_first = list(session.exec(
            select(Notification).where(Notification.ref_id == leave_id)
        ).all())
        count_after_first = len(notifications_after_first)
        
        # 第二次审批（应该失败）
        second_approve_response = client.put(
            f"/api/leave/{leave_id}/approve",
            json={
                "status": "approved",
                "approve_remark": "第二次审批"
            },
            headers=get_auth_headers(boss_token)
        )
        
        # 验证返回错误
        assert_error_response(second_approve_response, 400, "已审批")
        
        # 验证没有创建新通知
        session.expire_all()
        notifications_after_second = list(session.exec(
            select(Notification).where(Notification.ref_id == leave_id)
        ).all())
        
        assert len(notifications_after_second) == count_after_first, \
            "重复审批不应该创建新通知"

    def test_approve_already_rejected_leave_returns_error(
        self,
        client: TestClient,
        session: Session
    ):
        """
        测试对已拒绝的请假申请再次审批
        
        验证：
        - 返回错误
        
        Requirements: 错误处理
        """
        # 创建仓库和用户
        warehouse = WarehouseFactory.create(session, name="拒绝后审批测试仓库")
        driver = UserFactory.create_driver(session, username="reject_dup_driver", name="司机")
        WarehouseFactory.assign_user(session, driver, warehouse)
        
        boss = UserFactory.create_boss(session, username="reject_dup_boss", name="老板")
        
        # 司机提交请假申请
        driver_token = create_test_token(driver.id)
        start_date = date.today() + timedelta(days=1)
        
        response = client.post(
            "/api/leave",
            json={
                "leave_type": "leave",
                "start_date": str(start_date),
                "end_date": str(start_date + timedelta(days=1)),
                "reason": "拒绝后审批测试"
            },
            headers=get_auth_headers(driver_token)
        )
        
        data = assert_success_response(response, 200)
        leave_id = data["id"]
        
        # 第一次审批（拒绝）
        boss_token = create_test_token(boss.id)
        first_reject_response = client.put(
            f"/api/leave/{leave_id}/approve",
            json={
                "status": "rejected",
                "approve_remark": "拒绝"
            },
            headers=get_auth_headers(boss_token)
        )
        
        assert_success_response(first_reject_response, 200)
        
        # 第二次审批（尝试批准，应该失败）
        second_approve_response = client.put(
            f"/api/leave/{leave_id}/approve",
            json={
                "status": "approved",
                "approve_remark": "尝试批准"
            },
            headers=get_auth_headers(boss_token)
        )
        
        # 验证返回错误
        assert_error_response(second_approve_response, 400, "已审批")


# ==================== 8.3 测试通知查询边界条件 ====================
# Requirements: 10.1, 10.4

class TestNotificationQueryEdgeCases:
    """测试通知查询边界条件"""

    def test_get_notifications_empty_list(self, session: Session):
        """
        测试空通知列表
        
        验证：
        - 新用户没有通知时返回空列表
        
        Requirements: 10.1
        """
        # 创建新用户（没有任何通知）
        user = UserFactory.create_driver(session, username="empty_notif_user", name="无通知用户")
        
        # 查询通知列表
        notifications = get_notifications(session, user.id)
        
        assert notifications == []
        assert len(notifications) == 0

    def test_get_notifications_skip_exceeds_total(self, session: Session):
        """
        测试分页边界（skip 超出范围）
        
        验证：
        - skip 超出总数时返回空列表
        
        Requirements: 10.4
        """
        from crud.notifications import create_notification
        
        # 创建用户和少量通知
        user = UserFactory.create_driver(session, username="skip_test_user", name="分页测试用户")
        
        # 创建 3 条通知
        for i in range(3):
            create_notification(
                session,
                user_id=user.id,
                title=f"通知{i}",
                content=f"内容{i}"
            )
        
        # 使用超出范围的 skip
        notifications = get_notifications(session, user.id, skip=100, limit=10)
        
        assert notifications == []
        assert len(notifications) == 0

    def test_get_notifications_skip_equals_total(self, session: Session):
        """
        测试 skip 等于总数时返回空列表
        
        Requirements: 10.4
        """
        from crud.notifications import create_notification
        
        user = UserFactory.create_driver(session, username="skip_eq_user", name="分页边界用户")
        
        # 创建 5 条通知
        for i in range(5):
            create_notification(
                session,
                user_id=user.id,
                title=f"通知{i}"
            )
        
        # skip 等于总数
        notifications = get_notifications(session, user.id, skip=5, limit=10)
        
        assert notifications == []

    def test_get_notifications_limit_zero(self, session: Session):
        """
        测试 limit 为 0 时的行为
        
        注意：这取决于实现，可能返回空列表或所有记录
        
        Requirements: 10.4
        """
        from crud.notifications import create_notification
        
        user = UserFactory.create_driver(session, username="limit_zero_user", name="限制零用户")
        
        # 创建通知
        create_notification(session, user_id=user.id, title="测试通知")
        
        # limit 为 0
        notifications = get_notifications(session, user.id, skip=0, limit=0)
        
        # 根据 SQL 行为，limit 0 应该返回空列表
        assert len(notifications) == 0

    def test_get_unread_count_no_notifications(self, session: Session):
        """
        测试没有通知时未读数量为 0
        
        Requirements: 10.1
        """
        user = UserFactory.create_driver(session, username="no_unread_user", name="无未读用户")
        
        count = get_unread_count(session, user.id)
        
        assert count == 0

    def test_get_notifications_api_empty_list(
        self,
        client: TestClient,
        session: Session
    ):
        """
        测试通过 API 获取空通知列表
        
        Requirements: 10.1
        """
        # 创建新用户
        user = UserFactory.create_driver(session, username="api_empty_user", name="API空列表用户")
        user_token = create_test_token(user.id)
        
        # 通过 API 获取通知列表
        response = client.get(
            "/api/notifications",
            headers=get_auth_headers(user_token)
        )
        
        data = assert_success_response(response, 200)
        
        # 验证返回空列表
        assert isinstance(data, list)
        assert len(data) == 0

    def test_get_notifications_api_pagination_boundary(
        self,
        client: TestClient,
        session: Session
    ):
        """
        测试通过 API 进行分页查询的边界条件
        
        Requirements: 10.4
        """
        from crud.notifications import create_notification
        
        # 创建用户和通知
        user = UserFactory.create_driver(session, username="api_page_user", name="API分页用户")
        
        # 创建 3 条通知
        for i in range(3):
            create_notification(
                session,
                user_id=user.id,
                title=f"API通知{i}"
            )
        
        user_token = create_test_token(user.id)
        
        # 测试 skip 超出范围
        response = client.get(
            "/api/notifications?skip=100&limit=10",
            headers=get_auth_headers(user_token)
        )
        
        data = assert_success_response(response, 200)
        
        # 验证返回空列表
        assert isinstance(data, list)
        assert len(data) == 0

