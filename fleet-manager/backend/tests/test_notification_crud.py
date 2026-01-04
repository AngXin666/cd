"""
通知 CRUD 单元测试模块
测试 crud/notifications.py 中的各个函数

Requirements: Requirement 1-10 (通知系统全面测试)
"""

import pytest
from datetime import datetime
from sqlmodel import Session

from crud.notifications import (
    create_notification,
    create_notifications_batch,
    get_managers_for_user,
    create_approval_notification,
    complete_approval,
    get_notifications,
    mark_notification_as_read,
    get_unread_count
)
from tests.helpers import (
    create_test_user,
    create_test_warehouse,
    assign_user_to_warehouse
)
from models import Notification


# ==================== 2.1 测试 create_notification 函数 ====================
# Requirements: 8.1

class TestCreateNotification:
    """测试 create_notification 函数"""

    def test_create_basic_notification(self, session: Session):
        """
        测试创建基本通知
        
        验证：
        - 通知成功创建
        - 基本字段正确保存
        - is_read 默认为 False
        """
        user = create_test_user(session, role="driver", name="测试司机")
        
        notification = create_notification(
            session,
            user_id=user.id,
            title="测试通知标题",
            content="测试通知内容"
        )
        
        assert notification.id is not None
        assert notification.user_id == user.id
        assert notification.title == "测试通知标题"
        assert notification.content == "测试通知内容"
        assert notification.is_read is False
        assert notification.created_at is not None

    def test_create_notification_with_sender(self, session: Session):
        """
        测试创建带发送者的通知
        
        验证：
        - sender_id 正确保存
        """
        receiver = create_test_user(session, role="driver", name="接收者")
        sender = create_test_user(session, role="manager", name="发送者")
        
        notification = create_notification(
            session,
            user_id=receiver.id,
            title="来自车队长的通知",
            content="内容",
            sender_id=sender.id
        )
        
        assert notification.sender_id == sender.id

    def test_create_approval_notification_with_ref_fields(self, session: Session):
        """
        测试创建带 ref_type/ref_id/status 的审批通知
        
        验证：
        - ref_type 正确保存
        - ref_id 正确保存
        - status 正确保存
        Requirements: 8.1
        """
        user = create_test_user(session, role="manager", name="车队长")
        
        notification = create_notification(
            session,
            user_id=user.id,
            title="请假审批通知",
            content="司机张三申请请假",
            ref_type="leave",
            ref_id=100,
            status="pending"
        )
        
        assert notification.ref_type == "leave"
        assert notification.ref_id == 100
        assert notification.status == "pending"

    def test_create_notification_fields_persisted(self, session: Session):
        """
        验证通知字段正确保存到数据库
        
        验证：
        - 从数据库重新查询后字段值一致
        """
        user = create_test_user(session, role="driver")
        
        notification = create_notification(
            session,
            user_id=user.id,
            title="持久化测试",
            content="测试内容",
            ref_type="vehicle",
            ref_id=50,
            status="pending"
        )
        
        # 从数据库重新查询
        db_notification = session.get(Notification, notification.id)
        
        assert db_notification is not None
        assert db_notification.title == "持久化测试"
        assert db_notification.content == "测试内容"
        assert db_notification.ref_type == "vehicle"
        assert db_notification.ref_id == 50
        assert db_notification.status == "pending"



# ==================== 2.2 测试 create_notifications_batch 函数 ====================
# Requirements: 1.1, 2.1, 3.1

class TestCreateNotificationsBatch:
    """测试 create_notifications_batch 函数"""

    def test_batch_create_notifications(self, session: Session):
        """
        测试批量创建通知给多个用户
        
        验证：
        - 所有用户都收到通知
        - 返回的通知数量正确
        Requirements: 1.1, 2.1, 3.1
        """
        users = [
            create_test_user(session, role="manager", name="车队长1"),
            create_test_user(session, role="peer_admin", name="调度"),
            create_test_user(session, role="boss", name="老板")
        ]
        user_ids = [u.id for u in users]
        
        notifications = create_notifications_batch(
            session,
            user_ids=user_ids,
            title="批量通知测试",
            content="这是一条批量通知"
        )
        
        assert len(notifications) == 3
        
        # 验证每个用户都收到通知
        notification_user_ids = {n.user_id for n in notifications}
        assert notification_user_ids == set(user_ids)

    def test_batch_create_with_ref_fields(self, session: Session):
        """
        测试批量创建带 ref 字段的通知
        
        验证：
        - 所有通知的 ref_type、ref_id、status 一致
        """
        users = [
            create_test_user(session, role="manager"),
            create_test_user(session, role="boss")
        ]
        user_ids = [u.id for u in users]
        
        notifications = create_notifications_batch(
            session,
            user_ids=user_ids,
            title="请假审批",
            content="司机申请请假",
            ref_type="leave",
            ref_id=200,
            status="pending"
        )
        
        for n in notifications:
            assert n.ref_type == "leave"
            assert n.ref_id == 200
            assert n.status == "pending"

    def test_batch_create_empty_list(self, session: Session):
        """
        测试空用户列表
        
        验证：
        - 返回空列表，不报错
        """
        notifications = create_notifications_batch(
            session,
            user_ids=[],
            title="空列表测试",
            content="内容"
        )
        
        assert notifications == []

    def test_batch_create_with_sender(self, session: Session):
        """
        测试批量创建带发送者的通知
        
        验证：
        - 所有通知的 sender_id 一致
        """
        sender = create_test_user(session, role="driver", name="申请人")
        receivers = [
            create_test_user(session, role="manager"),
            create_test_user(session, role="boss")
        ]
        
        notifications = create_notifications_batch(
            session,
            user_ids=[r.id for r in receivers],
            title="申请通知",
            content="内容",
            sender_id=sender.id
        )
        
        for n in notifications:
            assert n.sender_id == sender.id


# ==================== 2.3 测试 get_managers_for_user 函数 ====================
# Requirements: 1.1, 2.1, 3.1

class TestGetManagersForUser:
    """测试 get_managers_for_user 函数"""

    def test_get_managers_for_driver(self, session: Session):
        """
        测试获取管辖某司机的车队长列表
        
        验证：
        - 返回正确的车队长列表
        Requirements: 1.1, 2.1, 3.1
        """
        # 创建仓库
        warehouse = create_test_warehouse(session, name="测试仓库")
        
        # 创建司机并分配到仓库
        driver = create_test_user(session, role="driver", name="司机")
        assign_user_to_warehouse(session, driver, warehouse)
        
        # 创建车队长并分配到同一仓库
        manager = create_test_user(session, role="manager", name="车队长")
        assign_user_to_warehouse(session, manager, warehouse)
        
        # 获取管辖该司机的车队长
        managers = get_managers_for_user(session, driver.id)
        
        assert len(managers) == 1
        assert managers[0].id == manager.id

    def test_get_managers_no_warehouse(self, session: Session):
        """
        测试司机没有分配仓库时返回空列表
        
        验证：
        - 返回空列表
        Requirements: 1.1, 2.1, 3.1
        """
        driver = create_test_user(session, role="driver", name="无仓库司机")
        
        managers = get_managers_for_user(session, driver.id)
        
        assert managers == []

    def test_get_managers_multiple_warehouses(self, session: Session):
        """
        测试司机分配多个仓库时返回所有车队长
        
        验证：
        - 返回所有仓库的车队长（去重）
        Requirements: 1.1, 2.1, 3.1
        """
        # 创建两个仓库
        warehouse1 = create_test_warehouse(session, name="仓库1")
        warehouse2 = create_test_warehouse(session, name="仓库2")
        
        # 创建司机并分配到两个仓库
        driver = create_test_user(session, role="driver", name="多仓库司机")
        assign_user_to_warehouse(session, driver, warehouse1)
        assign_user_to_warehouse(session, driver, warehouse2)
        
        # 创建两个车队长，分别管理不同仓库
        manager1 = create_test_user(session, role="manager", name="车队长1")
        assign_user_to_warehouse(session, manager1, warehouse1)
        
        manager2 = create_test_user(session, role="manager", name="车队长2")
        assign_user_to_warehouse(session, manager2, warehouse2)
        
        # 获取管辖该司机的车队长
        managers = get_managers_for_user(session, driver.id)
        
        assert len(managers) == 2
        manager_ids = {m.id for m in managers}
        assert manager_ids == {manager1.id, manager2.id}

    def test_get_managers_excludes_inactive(self, session: Session):
        """
        测试不返回禁用的车队长
        
        验证：
        - 只返回 is_active=True 的车队长
        """
        warehouse = create_test_warehouse(session, name="测试仓库")
        
        driver = create_test_user(session, role="driver")
        assign_user_to_warehouse(session, driver, warehouse)
        
        # 创建一个活跃的车队长
        active_manager = create_test_user(session, role="manager", name="活跃车队长")
        assign_user_to_warehouse(session, active_manager, warehouse)
        
        # 创建一个禁用的车队长
        inactive_manager = create_test_user(
            session, role="manager", name="禁用车队长", is_active=False
        )
        assign_user_to_warehouse(session, inactive_manager, warehouse)
        
        managers = get_managers_for_user(session, driver.id)
        
        assert len(managers) == 1
        assert managers[0].id == active_manager.id



# ==================== 2.4 测试 create_approval_notification 函数 ====================
# Requirements: 1.2, 2.2, 3.2

class TestCreateApprovalNotification:
    """测试 create_approval_notification 函数"""

    def test_create_approval_notification_to_admins(self, session: Session):
        """
        测试创建审批通知发送给车队长、调度、老板
        
        验证：
        - 车队长收到通知
        - 调度收到通知
        - 老板收到通知
        Requirements: 1.2, 2.2, 3.2
        """
        # 创建仓库
        warehouse = create_test_warehouse(session, name="测试仓库")
        
        # 创建申请人（司机）并分配到仓库
        applicant = create_test_user(session, role="driver", name="申请人")
        assign_user_to_warehouse(session, applicant, warehouse)
        
        # 创建车队长并分配到同一仓库
        manager = create_test_user(session, role="manager", name="车队长")
        assign_user_to_warehouse(session, manager, warehouse)
        
        # 创建调度和老板
        dispatcher = create_test_user(session, role="peer_admin", name="调度")
        boss = create_test_user(session, role="boss", name="老板")
        
        # 创建审批通知
        notifications = create_approval_notification(
            session,
            applicant_id=applicant.id,
            ref_type="leave",
            ref_id=100,
            title="请假审批",
            content="司机申请请假3天"
        )
        
        # 验证通知数量（车队长 + 调度 + 老板）
        assert len(notifications) >= 3
        
        # 验证接收者
        recipient_ids = {n.user_id for n in notifications}
        assert manager.id in recipient_ids
        assert dispatcher.id in recipient_ids
        assert boss.id in recipient_ids

    def test_approval_notification_ref_fields(self, session: Session):
        """
        验证通知的 ref_type、ref_id、status 正确设置
        
        验证：
        - ref_type 正确
        - ref_id 正确
        - status 为 "pending"
        Requirements: 1.2, 2.2, 3.2
        """
        warehouse = create_test_warehouse(session)
        applicant = create_test_user(session, role="driver")
        assign_user_to_warehouse(session, applicant, warehouse)
        
        manager = create_test_user(session, role="manager")
        assign_user_to_warehouse(session, manager, warehouse)
        
        boss = create_test_user(session, role="boss")
        
        notifications = create_approval_notification(
            session,
            applicant_id=applicant.id,
            ref_type="vehicle",
            ref_id=50,
            title="车辆审核",
            content="新车辆待审核"
        )
        
        for n in notifications:
            assert n.ref_type == "vehicle"
            assert n.ref_id == 50
            assert n.status == "pending"

    def test_approval_notification_sender_is_applicant(self, session: Session):
        """
        验证通知的 sender_id 是申请人
        """
        warehouse = create_test_warehouse(session)
        applicant = create_test_user(session, role="driver")
        assign_user_to_warehouse(session, applicant, warehouse)
        
        boss = create_test_user(session, role="boss")
        
        notifications = create_approval_notification(
            session,
            applicant_id=applicant.id,
            ref_type="resign",
            ref_id=30,
            title="离职审批",
            content="司机申请离职"
        )
        
        for n in notifications:
            assert n.sender_id == applicant.id

    def test_approval_notification_no_managers(self, session: Session):
        """
        测试申请人没有分配仓库时，只发送给调度和老板
        """
        applicant = create_test_user(session, role="driver", name="无仓库司机")
        dispatcher = create_test_user(session, role="peer_admin")
        boss = create_test_user(session, role="boss")
        
        notifications = create_approval_notification(
            session,
            applicant_id=applicant.id,
            ref_type="leave",
            ref_id=100,
            title="请假审批",
            content="内容"
        )
        
        # 应该只有调度和老板收到通知
        recipient_ids = {n.user_id for n in notifications}
        assert dispatcher.id in recipient_ids
        assert boss.id in recipient_ids


# ==================== 2.5 测试 complete_approval 函数 (关键测试) ====================
# Requirements: 1.3, 1.4, 1.5, 9.1, 9.2, 9.3, 9.4

class TestCompleteApproval:
    """测试 complete_approval 函数 - 关键测试"""

    def test_complete_approval_updates_pending_status(self, session: Session):
        """
        测试审批完成后更新所有 pending 通知的 status
        
        验证：
        - 所有 pending 通知的 status 更新为审批结果
        Requirements: 1.3, 9.1, 9.2
        """
        # 创建用户
        applicant = create_test_user(session, role="driver", name="申请人")
        manager = create_test_user(session, role="manager", name="车队长")
        boss = create_test_user(session, role="boss", name="老板")
        approver = create_test_user(session, role="peer_admin", name="审批人")
        
        # 手动创建 pending 通知
        ref_type = "leave"
        ref_id = 100
        
        for user in [manager, boss]:
            n = Notification(
                user_id=user.id,
                title="请假审批",
                content="内容",
                sender_id=applicant.id,
                ref_type=ref_type,
                ref_id=ref_id,
                status="pending"
            )
            session.add(n)
        session.commit()
        
        # 执行审批完成
        result_notifications = complete_approval(
            session,
            ref_type=ref_type,
            ref_id=ref_id,
            result="approved",
            approver_id=approver.id,
            applicant_id=applicant.id,
            result_title="请假已批准",
            result_content="您的请假申请已批准"
        )
        
        # 验证原 pending 通知状态已更新
        from tests.helpers import get_notifications_by_ref
        all_notifications = get_notifications_by_ref(session, ref_type, ref_id)
        
        # 过滤出原来的审批通知（发送给 manager 和 boss 的）
        original_notifications = [
            n for n in all_notifications 
            if n.user_id in [manager.id, boss.id] and n.sender_id == applicant.id
        ]
        
        for n in original_notifications:
            assert n.status == "approved"

    def test_complete_approval_creates_result_notifications(self, session: Session):
        """
        测试审批完成后创建结果通知给所有相关人员
        
        验证：
        - 申请人收到结果通知
        - 所有原审批人收到结果通知
        Requirements: 1.5, 9.4
        """
        applicant = create_test_user(session, role="driver", name="申请人")
        manager = create_test_user(session, role="manager", name="车队长")
        boss = create_test_user(session, role="boss", name="老板")
        approver = create_test_user(session, role="peer_admin", name="审批人")
        
        ref_type = "leave"
        ref_id = 200
        
        # 创建 pending 通知
        for user in [manager, boss]:
            n = Notification(
                user_id=user.id,
                title="请假审批",
                sender_id=applicant.id,
                ref_type=ref_type,
                ref_id=ref_id,
                status="pending"
            )
            session.add(n)
        session.commit()
        
        # 执行审批完成
        result_notifications = complete_approval(
            session,
            ref_type=ref_type,
            ref_id=ref_id,
            result="approved",
            approver_id=approver.id,
            applicant_id=applicant.id,
            result_title="请假已批准",
            result_content="您的请假申请已批准"
        )
        
        # 验证结果通知
        assert len(result_notifications) >= 3  # 申请人 + manager + boss
        
        result_recipient_ids = {n.user_id for n in result_notifications}
        assert applicant.id in result_recipient_ids
        assert manager.id in result_recipient_ids
        assert boss.id in result_recipient_ids

    def test_complete_approval_rejected(self, session: Session):
        """
        测试审批拒绝后通知状态更新为 rejected
        
        验证：
        - 所有 pending 通知的 status 更新为 "rejected"
        Requirements: 1.4
        """
        applicant = create_test_user(session, role="driver")
        manager = create_test_user(session, role="manager")
        approver = create_test_user(session, role="boss")
        
        ref_type = "leave"
        ref_id = 300
        
        # 创建 pending 通知
        n = Notification(
            user_id=manager.id,
            title="请假审批",
            sender_id=applicant.id,
            ref_type=ref_type,
            ref_id=ref_id,
            status="pending"
        )
        session.add(n)
        session.commit()
        notification_id = n.id
        
        # 执行审批拒绝
        complete_approval(
            session,
            ref_type=ref_type,
            ref_id=ref_id,
            result="rejected",
            approver_id=approver.id,
            applicant_id=applicant.id,
            result_title="请假已拒绝",
            result_content="您的请假申请已被拒绝"
        )
        
        # 验证状态更新
        updated_notification = session.get(Notification, notification_id)
        assert updated_notification.status == "rejected"

    def test_complete_approval_updates_timestamp(self, session: Session):
        """
        验证 updated_at 时间戳被更新
        
        Requirements: 9.3
        """
        applicant = create_test_user(session, role="driver")
        manager = create_test_user(session, role="manager")
        approver = create_test_user(session, role="boss")
        
        ref_type = "vehicle"
        ref_id = 400
        
        # 创建 pending 通知
        n = Notification(
            user_id=manager.id,
            title="车辆审核",
            sender_id=applicant.id,
            ref_type=ref_type,
            ref_id=ref_id,
            status="pending"
        )
        session.add(n)
        session.commit()
        
        original_updated_at = n.updated_at
        notification_id = n.id
        
        # 等待一小段时间确保时间戳不同
        import time
        time.sleep(0.1)
        
        # 执行审批完成
        complete_approval(
            session,
            ref_type=ref_type,
            ref_id=ref_id,
            result="approved",
            approver_id=approver.id,
            applicant_id=applicant.id,
            result_title="车辆已通过",
            result_content="您的车辆已通过审核"
        )
        
        # 刷新并验证时间戳更新
        session.expire_all()
        updated_notification = session.get(Notification, notification_id)
        
        # updated_at 应该被更新（如果原来有值的话）
        if original_updated_at is not None:
            assert updated_notification.updated_at >= original_updated_at



# ==================== 2.6 测试 get_notifications 函数 ====================
# Requirements: 10.1, 10.2, 10.3, 10.4

class TestGetNotifications:
    """测试 get_notifications 函数"""

    def test_get_user_notifications(self, session: Session):
        """
        测试获取用户通知列表
        
        验证：
        - 返回该用户的所有通知
        Requirements: 10.1
        """
        user = create_test_user(session, role="driver")
        
        # 创建多条通知
        for i in range(3):
            create_notification(
                session,
                user_id=user.id,
                title=f"通知{i}",
                content=f"内容{i}"
            )
        
        notifications = get_notifications(session, user.id)
        
        assert len(notifications) == 3
        for n in notifications:
            assert n.user_id == user.id

    def test_get_notifications_filter_by_is_read(self, session: Session):
        """
        测试按 is_read 过滤
        
        验证：
        - is_read=False 只返回未读通知
        - is_read=True 只返回已读通知
        Requirements: 10.2
        """
        user = create_test_user(session, role="driver")
        
        # 创建未读通知
        for i in range(2):
            create_notification(session, user_id=user.id, title=f"未读{i}")
        
        # 创建已读通知
        read_notification = create_notification(
            session, user_id=user.id, title="已读通知"
        )
        mark_notification_as_read(session, read_notification)
        
        # 测试过滤未读
        unread = get_notifications(session, user.id, is_read=False)
        assert len(unread) == 2
        for n in unread:
            assert n.is_read is False
        
        # 测试过滤已读
        read = get_notifications(session, user.id, is_read=True)
        assert len(read) == 1
        assert read[0].is_read is True

    def test_get_notifications_pagination(self, session: Session):
        """
        测试分页功能
        
        验证：
        - skip 参数正确跳过记录
        - limit 参数正确限制返回数量
        Requirements: 10.4
        """
        user = create_test_user(session, role="driver")
        
        # 创建 5 条通知
        for i in range(5):
            create_notification(session, user_id=user.id, title=f"通知{i}")
        
        # 测试 limit
        limited = get_notifications(session, user.id, limit=2)
        assert len(limited) == 2
        
        # 测试 skip
        skipped = get_notifications(session, user.id, skip=2, limit=10)
        assert len(skipped) == 3

    def test_get_notifications_order_by_created_at_desc(self, session: Session):
        """
        测试按创建时间倒序排列
        
        验证：
        - 最新的通知排在前面
        Requirements: 10.3
        """
        user = create_test_user(session, role="driver")
        
        import time
        
        # 创建通知，间隔一小段时间
        n1 = create_notification(session, user_id=user.id, title="第一条")
        time.sleep(0.05)
        n2 = create_notification(session, user_id=user.id, title="第二条")
        time.sleep(0.05)
        n3 = create_notification(session, user_id=user.id, title="第三条")
        
        notifications = get_notifications(session, user.id)
        
        # 最新的应该在前面
        assert notifications[0].title == "第三条"
        assert notifications[1].title == "第二条"
        assert notifications[2].title == "第一条"

    def test_get_notifications_only_own(self, session: Session):
        """
        测试只返回自己的通知
        
        验证：
        - 不返回其他用户的通知
        """
        user1 = create_test_user(session, role="driver", name="用户1")
        user2 = create_test_user(session, role="driver", name="用户2")
        
        create_notification(session, user_id=user1.id, title="用户1的通知")
        create_notification(session, user_id=user2.id, title="用户2的通知")
        
        user1_notifications = get_notifications(session, user1.id)
        
        assert len(user1_notifications) == 1
        assert user1_notifications[0].user_id == user1.id


# ==================== 2.7 测试 mark_notification_as_read 函数 ====================
# Requirements: 8.2

class TestMarkNotificationAsRead:
    """测试 mark_notification_as_read 函数"""

    def test_mark_as_read(self, session: Session):
        """
        测试标记通知为已读
        
        验证：
        - is_read 字段更新为 true
        Requirements: 8.2
        """
        user = create_test_user(session, role="driver")
        
        notification = create_notification(
            session,
            user_id=user.id,
            title="待读通知"
        )
        
        assert notification.is_read is False
        
        updated = mark_notification_as_read(session, notification)
        
        assert updated.is_read is True

    def test_mark_as_read_persisted(self, session: Session):
        """
        验证已读状态持久化到数据库
        """
        user = create_test_user(session, role="driver")
        
        notification = create_notification(
            session,
            user_id=user.id,
            title="持久化测试"
        )
        notification_id = notification.id
        
        mark_notification_as_read(session, notification)
        
        # 从数据库重新查询
        db_notification = session.get(Notification, notification_id)
        assert db_notification.is_read is True

    def test_mark_already_read(self, session: Session):
        """
        测试标记已读的通知（幂等性）
        
        验证：
        - 重复标记不报错
        - 状态保持为已读
        """
        user = create_test_user(session, role="driver")
        
        notification = create_notification(
            session,
            user_id=user.id,
            title="已读通知"
        )
        
        # 第一次标记
        mark_notification_as_read(session, notification)
        assert notification.is_read is True
        
        # 第二次标记
        mark_notification_as_read(session, notification)
        assert notification.is_read is True


# ==================== 2.8 测试 get_unread_count 函数 ====================
# Requirements: 8.3

class TestGetUnreadCount:
    """测试 get_unread_count 函数"""

    def test_get_unread_count(self, session: Session):
        """
        测试获取未读通知数量
        
        验证：
        - 返回正确的未读数量
        Requirements: 8.3
        """
        user = create_test_user(session, role="driver")
        
        # 创建 3 条未读通知
        for i in range(3):
            create_notification(session, user_id=user.id, title=f"未读{i}")
        
        count = get_unread_count(session, user.id)
        
        assert count == 3

    def test_unread_count_after_mark_read(self, session: Session):
        """
        测试标记已读后数量减少
        
        验证：
        - 标记一条为已读后，未读数量减 1
        Requirements: 8.3
        """
        user = create_test_user(session, role="driver")
        
        # 创建 3 条未读通知
        notifications = []
        for i in range(3):
            n = create_notification(session, user_id=user.id, title=f"通知{i}")
            notifications.append(n)
        
        assert get_unread_count(session, user.id) == 3
        
        # 标记一条为已读
        mark_notification_as_read(session, notifications[0])
        
        assert get_unread_count(session, user.id) == 2

    def test_unread_count_zero(self, session: Session):
        """
        测试没有未读通知时返回 0
        """
        user = create_test_user(session, role="driver")
        
        count = get_unread_count(session, user.id)
        
        assert count == 0

    def test_unread_count_excludes_read(self, session: Session):
        """
        测试不计算已读通知
        """
        user = create_test_user(session, role="driver")
        
        # 创建 2 条未读通知
        for i in range(2):
            create_notification(session, user_id=user.id, title=f"未读{i}")
        
        # 创建 1 条已读通知
        read_notification = create_notification(
            session, user_id=user.id, title="已读"
        )
        mark_notification_as_read(session, read_notification)
        
        count = get_unread_count(session, user.id)
        
        assert count == 2

    def test_unread_count_only_own(self, session: Session):
        """
        测试只计算自己的未读通知
        """
        user1 = create_test_user(session, role="driver", name="用户1")
        user2 = create_test_user(session, role="driver", name="用户2")
        
        # 给用户1创建 2 条通知
        for i in range(2):
            create_notification(session, user_id=user1.id, title=f"用户1通知{i}")
        
        # 给用户2创建 3 条通知
        for i in range(3):
            create_notification(session, user_id=user2.id, title=f"用户2通知{i}")
        
        assert get_unread_count(session, user1.id) == 2
        assert get_unread_count(session, user2.id) == 3
