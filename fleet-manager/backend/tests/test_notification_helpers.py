"""
通知测试辅助函数测试模块
验证 helpers.py 中新增的测试数据工厂函数和通知断言工具
"""

import pytest
from sqlmodel import Session

from tests.helpers import (
    create_test_user,
    create_test_warehouse,
    assign_user_to_warehouse,
    create_test_vehicle,
    assert_notification_exists,
    assert_notification_status,
    get_notifications_by_ref,
    assert_notifications_sent_to_users,
    assert_all_notifications_status_updated,
    get_unread_notifications_count
)
from models import Notification, UserRole


class TestCreateTestUser:
    """测试 create_test_user 函数"""

    def test_create_driver(self, session: Session):
        """测试创建司机用户"""
        user = create_test_user(session, role="driver", name="测试司机")
        assert user.id is not None
        assert user.name == "测试司机"
        assert user.role == UserRole.DRIVER.value
        assert user.is_active is True

    def test_create_manager(self, session: Session):
        """测试创建车队长用户"""
        user = create_test_user(session, role="manager", name="测试车队长")
        assert user.id is not None
        assert user.role == UserRole.MANAGER.value

    def test_create_dispatcher(self, session: Session):
        """测试创建调度用户（使用别名）"""
        user = create_test_user(session, role="dispatcher", name="测试调度")
        assert user.id is not None
        assert user.role == UserRole.PEER_ADMIN.value

    def test_create_boss(self, session: Session):
        """测试创建老板用户"""
        user = create_test_user(session, role="boss", name="测试老板")
        assert user.id is not None
        assert user.role == UserRole.BOSS.value

    def test_create_with_custom_username(self, session: Session):
        """测试使用自定义用户名创建用户"""
        user = create_test_user(session, username="custom_user", name="自定义用户")
        assert user.username == "custom_user"


class TestCreateTestWarehouse:
    """测试 create_test_warehouse 函数"""

    def test_create_warehouse(self, session: Session):
        """测试创建仓库"""
        warehouse = create_test_warehouse(session, name="测试仓库A")
        assert warehouse.id is not None
        assert warehouse.name == "测试仓库A"
        assert warehouse.is_active is True

    def test_create_warehouse_with_address(self, session: Session):
        """测试创建带地址的仓库"""
        warehouse = create_test_warehouse(
            session, name="测试仓库B", address="测试地址123"
        )
        assert warehouse.address == "测试地址123"


class TestAssignUserToWarehouse:
    """测试 assign_user_to_warehouse 函数"""

    def test_assign_user(self, session: Session):
        """测试分配用户到仓库"""
        user = create_test_user(session, role="driver")
        warehouse = create_test_warehouse(session)
        
        assignment = assign_user_to_warehouse(session, user, warehouse)
        
        assert assignment.id is not None
        assert assignment.user_id == user.id
        assert assignment.warehouse_id == warehouse.id

    def test_assign_user_idempotent(self, session: Session):
        """测试重复分配返回已存在的记录"""
        user = create_test_user(session, role="driver")
        warehouse = create_test_warehouse(session)
        
        assignment1 = assign_user_to_warehouse(session, user, warehouse)
        assignment2 = assign_user_to_warehouse(session, user, warehouse)
        
        assert assignment1.id == assignment2.id


class TestCreateTestVehicle:
    """测试 create_test_vehicle 函数"""

    def test_create_vehicle(self, session: Session):
        """测试创建车辆"""
        user = create_test_user(session, role="driver")
        vehicle = create_test_vehicle(session, user)
        
        assert vehicle.id is not None
        assert vehicle.user_id == user.id
        assert vehicle.license_plate is not None

    def test_create_vehicle_with_warehouse(self, session: Session):
        """测试创建带仓库的车辆"""
        user = create_test_user(session, role="driver")
        warehouse = create_test_warehouse(session)
        vehicle = create_test_vehicle(session, user, warehouse)
        
        assert vehicle.warehouse_id == warehouse.id

    def test_create_vehicle_with_custom_plate(self, session: Session):
        """测试使用自定义车牌创建车辆"""
        user = create_test_user(session, role="driver")
        vehicle = create_test_vehicle(session, user, license_plate="川A12345")
        
        assert vehicle.license_plate == "川A12345"


class TestNotificationAssertions:
    """测试通知断言工具"""

    def test_assert_notification_exists(self, session: Session):
        """测试 assert_notification_exists"""
        user = create_test_user(session, role="manager")
        
        # 创建通知
        notification = Notification(
            user_id=user.id,
            title="测试通知标题",
            content="测试内容",
            ref_type="leave",
            ref_id=1,
            status="pending"
        )
        session.add(notification)
        session.commit()
        
        # 断言通知存在
        found = assert_notification_exists(
            session, user.id, title="测试", ref_type="leave"
        )
        assert found.id == notification.id

    def test_assert_notification_exists_fails(self, session: Session):
        """测试 assert_notification_exists 失败情况"""
        user = create_test_user(session, role="manager")
        
        with pytest.raises(AssertionError):
            assert_notification_exists(session, user.id, title="不存在的通知")

    def test_assert_notification_status(self, session: Session):
        """测试 assert_notification_status"""
        user = create_test_user(session, role="manager")
        
        notification = Notification(
            user_id=user.id,
            title="测试通知",
            status="pending"
        )
        session.add(notification)
        session.commit()
        session.refresh(notification)
        
        # 断言状态正确
        result = assert_notification_status(session, notification.id, "pending")
        assert result.id == notification.id

    def test_assert_notification_status_fails(self, session: Session):
        """测试 assert_notification_status 失败情况"""
        user = create_test_user(session, role="manager")
        
        notification = Notification(
            user_id=user.id,
            title="测试通知",
            status="pending"
        )
        session.add(notification)
        session.commit()
        session.refresh(notification)
        
        with pytest.raises(AssertionError):
            assert_notification_status(session, notification.id, "approved")

    def test_get_notifications_by_ref(self, session: Session):
        """测试 get_notifications_by_ref"""
        user1 = create_test_user(session, role="manager")
        user2 = create_test_user(session, role="boss")
        
        # 创建多个通知
        for user in [user1, user2]:
            notification = Notification(
                user_id=user.id,
                title="请假审批通知",
                ref_type="leave",
                ref_id=100,
                status="pending"
            )
            session.add(notification)
        session.commit()
        
        # 查询通知
        notifications = get_notifications_by_ref(session, "leave", 100)
        assert len(notifications) == 2

    def test_get_notifications_by_ref_with_status(self, session: Session):
        """测试 get_notifications_by_ref 带状态过滤"""
        user = create_test_user(session, role="manager")
        
        # 创建不同状态的通知
        n1 = Notification(
            user_id=user.id, title="通知1",
            ref_type="leave", ref_id=100, status="pending"
        )
        n2 = Notification(
            user_id=user.id, title="通知2",
            ref_type="leave", ref_id=100, status="approved"
        )
        session.add_all([n1, n2])
        session.commit()
        
        # 只查询 pending 状态
        pending = get_notifications_by_ref(session, "leave", 100, status="pending")
        assert len(pending) == 1
        assert pending[0].status == "pending"

    def test_assert_notifications_sent_to_users(self, session: Session):
        """测试 assert_notifications_sent_to_users"""
        users = [
            create_test_user(session, role="manager"),
            create_test_user(session, role="boss")
        ]
        
        # 给每个用户创建通知
        for user in users:
            notification = Notification(
                user_id=user.id,
                title="审批通知",
                ref_type="vehicle",
                ref_id=1
            )
            session.add(notification)
        session.commit()
        
        # 断言所有用户都收到通知
        user_ids = [u.id for u in users]
        notifications = assert_notifications_sent_to_users(
            session, user_ids, title="审批", ref_type="vehicle"
        )
        assert len(notifications) == 2

    def test_assert_all_notifications_status_updated(self, session: Session):
        """测试 assert_all_notifications_status_updated"""
        users = [
            create_test_user(session, role="manager"),
            create_test_user(session, role="boss")
        ]
        
        # 创建通知并更新状态
        for user in users:
            notification = Notification(
                user_id=user.id,
                title="审批通知",
                ref_type="leave",
                ref_id=200,
                status="approved"  # 已更新为 approved
            )
            session.add(notification)
        session.commit()
        
        # 断言所有通知状态已更新
        notifications = assert_all_notifications_status_updated(
            session, "leave", 200, "approved"
        )
        assert len(notifications) == 2

    def test_get_unread_notifications_count(self, session: Session):
        """测试 get_unread_notifications_count"""
        user = create_test_user(session, role="driver")
        
        # 创建 3 条未读通知
        for i in range(3):
            notification = Notification(
                user_id=user.id,
                title=f"通知{i}",
                is_read=False
            )
            session.add(notification)
        
        # 创建 1 条已读通知
        read_notification = Notification(
            user_id=user.id,
            title="已读通知",
            is_read=True
        )
        session.add(read_notification)
        session.commit()
        
        # 验证未读数量
        count = get_unread_notifications_count(session, user.id)
        assert count == 3
