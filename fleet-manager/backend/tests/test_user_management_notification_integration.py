"""
用户管理通知集成测试模块
测试司机类型变更、仓库分配等用户管理操作的通知流程

Requirements: Requirement 4, 5, 6 (用户管理通知)
"""

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select

from tests.factories import UserFactory, WarehouseFactory
from tests.helpers import (
    get_auth_headers, assert_success_response, create_test_token,
    assert_notification_exists, get_notifications_by_ref
)
from models import Notification


# ==================== 5.1 测试司机类型变更通知 ====================
# Requirements: 4.1, 4.2, 4.3

class TestDriverTypeChangeNotification:
    """测试司机类型变更通知"""

    def test_driver_type_change_sends_notification(
        self,
        client: TestClient,
        session: Session
    ):
        """
        测试修改司机的 driver_type 后，司机收到类型变更通知
        
        验证：
        - 创建司机用户
        - 修改司机的 driver_type
        - 验证司机收到类型变更通知
        - 验证通知 ref_type="driver_type_change"
        
        Requirements: 4.1, 4.2
        """
        # 创建司机用户
        driver = UserFactory.create_driver(
            session, 
            username="type_change_driver", 
            name="类型变更司机"
        )
        
        # 创建管理员（调度）来执行修改操作
        admin = UserFactory.create_peer_admin(
            session, 
            username="type_change_admin", 
            name="调度管理员"
        )
        
        # 管理员修改司机类型
        admin_token = create_test_token(admin.id)
        response = client.put(
            f"/api/users/{driver.id}",
            json={
                "driver_type": "with_vehicle"
            },
            headers=get_auth_headers(admin_token)
        )
        
        assert_success_response(response, 200)
        
        # 验证司机收到类型变更通知
        notification = assert_notification_exists(
            session,
            user_id=driver.id,
            ref_type="driver_type_change"
        )
        
        assert notification is not None
        assert "类型" in notification.title or "变更" in notification.title

    def test_driver_type_change_notification_contains_new_type_name(
        self,
        client: TestClient,
        session: Session
    ):
        """
        验证司机类型变更通知内容包含新类型名称
        
        Requirements: 4.3
        """
        # 创建司机用户
        driver = UserFactory.create_driver(
            session, 
            username="type_name_driver", 
            name="类型名称测试司机"
        )
        
        # 创建老板来执行修改操作
        boss = UserFactory.create_boss(
            session, 
            username="type_name_boss", 
            name="老板"
        )
        
        # 老板修改司机类型为带车司机
        boss_token = create_test_token(boss.id)
        response = client.put(
            f"/api/users/{driver.id}",
            json={
                "driver_type": "with_vehicle"
            },
            headers=get_auth_headers(boss_token)
        )
        
        assert_success_response(response, 200)
        
        # 验证通知内容包含新类型名称
        notification = assert_notification_exists(
            session,
            user_id=driver.id,
            ref_type="driver_type_change"
        )
        
        # 验证通知内容包含"带车司机"
        assert "带车司机" in notification.content

    def test_driver_type_change_to_driver_only(
        self,
        client: TestClient,
        session: Session
    ):
        """
        测试修改司机类型为纯司机时的通知
        
        Requirements: 4.1, 4.3
        """
        # 创建司机用户（初始为带车司机）
        driver = UserFactory.create_driver(
            session, 
            username="driver_only_test", 
            name="纯司机测试"
        )
        # 先设置为带车司机
        driver.driver_type = "with_vehicle"
        session.add(driver)
        session.commit()
        
        # 创建调度来执行修改操作
        admin = UserFactory.create_peer_admin(
            session, 
            username="driver_only_admin", 
            name="调度"
        )
        
        # 修改司机类型为纯司机
        admin_token = create_test_token(admin.id)
        response = client.put(
            f"/api/users/{driver.id}",
            json={
                "driver_type": "driver_only"
            },
            headers=get_auth_headers(admin_token)
        )
        
        assert_success_response(response, 200)
        
        # 验证通知内容包含"纯司机"
        notification = assert_notification_exists(
            session,
            user_id=driver.id,
            ref_type="driver_type_change"
        )
        
        assert "纯司机" in notification.content

    def test_driver_type_change_notification_sender_is_admin(
        self,
        client: TestClient,
        session: Session
    ):
        """
        验证司机类型变更通知的发送者是执行修改的管理员
        
        Requirements: 4.1
        """
        # 创建司机用户
        driver = UserFactory.create_driver(
            session, 
            username="sender_test_driver", 
            name="发送者测试司机"
        )
        
        # 创建老板来执行修改操作
        boss = UserFactory.create_boss(
            session, 
            username="sender_test_boss", 
            name="发送者测试老板"
        )
        
        # 老板修改司机类型
        boss_token = create_test_token(boss.id)
        response = client.put(
            f"/api/users/{driver.id}",
            json={
                "driver_type": "with_vehicle"
            },
            headers=get_auth_headers(boss_token)
        )
        
        assert_success_response(response, 200)
        
        # 验证通知的发送者是老板
        notification = assert_notification_exists(
            session,
            user_id=driver.id,
            ref_type="driver_type_change"
        )
        
        assert notification.sender_id == boss.id

    def test_no_notification_when_driver_type_unchanged(
        self,
        client: TestClient,
        session: Session
    ):
        """
        测试司机类型未变更时不发送通知
        
        Requirements: 4.1
        """
        # 创建司机用户
        driver = UserFactory.create_driver(
            session, 
            username="unchanged_driver", 
            name="未变更司机"
        )
        
        # 创建调度
        admin = UserFactory.create_peer_admin(
            session, 
            username="unchanged_admin", 
            name="调度"
        )
        
        # 获取修改前的通知数量
        notifications_before = list(session.exec(
            select(Notification).where(Notification.user_id == driver.id)
        ).all())
        count_before = len(notifications_before)
        
        # 修改其他字段，不修改 driver_type
        admin_token = create_test_token(admin.id)
        response = client.put(
            f"/api/users/{driver.id}",
            json={
                "name": "新名字"
            },
            headers=get_auth_headers(admin_token)
        )
        
        assert_success_response(response, 200)
        
        # 验证没有新的类型变更通知
        session.expire_all()
        notifications_after = list(session.exec(
            select(Notification).where(
                Notification.user_id == driver.id,
                Notification.ref_type == "driver_type_change"
            )
        ).all())
        
        assert len(notifications_after) == 0


# ==================== 5.2 测试用户仓库分配通知 ====================
# Requirements: 5.1, 5.2, 5.3

class TestUserWarehouseAssignmentNotification:
    """测试用户仓库分配通知（用户维度）"""

    def test_warehouse_assignment_sends_notification_to_user(
        self,
        client: TestClient,
        session: Session
    ):
        """
        测试给用户分配仓库后，用户收到仓库分配通知
        
        验证：
        - 创建用户和仓库
        - 给用户分配仓库
        - 验证用户收到仓库分配通知
        - 验证通知 ref_type="warehouse_assignment"
        
        Requirements: 5.1, 5.2
        """
        # 创建司机用户
        driver = UserFactory.create_driver(
            session, 
            username="assign_driver", 
            name="分配测试司机"
        )
        
        # 创建仓库
        warehouse = WarehouseFactory.create(session, name="分配测试仓库")
        
        # 创建调度来执行分配操作
        admin = UserFactory.create_peer_admin(
            session, 
            username="assign_admin", 
            name="调度"
        )
        
        # 给用户分配仓库
        admin_token = create_test_token(admin.id)
        response = client.post(
            f"/api/users/{driver.id}/warehouses",
            json={
                "warehouse_ids": [warehouse.id]
            },
            headers=get_auth_headers(admin_token)
        )
        
        assert_success_response(response, 200)
        
        # 验证用户收到仓库分配通知
        notification = assert_notification_exists(
            session,
            user_id=driver.id,
            ref_type="warehouse_assignment"
        )
        
        assert notification is not None
        assert "仓库" in notification.title or "分配" in notification.title

    def test_warehouse_assignment_notification_contains_warehouse_names(
        self,
        client: TestClient,
        session: Session
    ):
        """
        验证仓库分配通知内容包含仓库名称列表
        
        Requirements: 5.3
        """
        # 创建司机用户
        driver = UserFactory.create_driver(
            session, 
            username="names_driver", 
            name="名称测试司机"
        )
        
        # 创建多个仓库
        warehouse1 = WarehouseFactory.create(session, name="东区仓库")
        warehouse2 = WarehouseFactory.create(session, name="西区仓库")
        
        # 创建老板来执行分配操作
        boss = UserFactory.create_boss(
            session, 
            username="names_boss", 
            name="老板"
        )
        
        # 给用户分配多个仓库
        boss_token = create_test_token(boss.id)
        response = client.post(
            f"/api/users/{driver.id}/warehouses",
            json={
                "warehouse_ids": [warehouse1.id, warehouse2.id]
            },
            headers=get_auth_headers(boss_token)
        )
        
        assert_success_response(response, 200)
        
        # 验证通知内容包含仓库名称
        notification = assert_notification_exists(
            session,
            user_id=driver.id,
            ref_type="warehouse_assignment"
        )
        
        # 验证通知内容包含两个仓库名称
        assert "东区仓库" in notification.content
        assert "西区仓库" in notification.content

    def test_warehouse_assignment_notification_sender_is_admin(
        self,
        client: TestClient,
        session: Session
    ):
        """
        验证仓库分配通知的发送者是执行分配的管理员
        
        Requirements: 5.1
        """
        # 创建司机用户
        driver = UserFactory.create_driver(
            session, 
            username="sender_assign_driver", 
            name="发送者测试司机"
        )
        
        # 创建仓库
        warehouse = WarehouseFactory.create(session, name="发送者测试仓库")
        
        # 创建调度来执行分配操作
        admin = UserFactory.create_peer_admin(
            session, 
            username="sender_assign_admin", 
            name="调度管理员"
        )
        
        # 给用户分配仓库
        admin_token = create_test_token(admin.id)
        response = client.post(
            f"/api/users/{driver.id}/warehouses",
            json={
                "warehouse_ids": [warehouse.id]
            },
            headers=get_auth_headers(admin_token)
        )
        
        assert_success_response(response, 200)
        
        # 验证通知的发送者是调度
        notification = assert_notification_exists(
            session,
            user_id=driver.id,
            ref_type="warehouse_assignment"
        )
        
        assert notification.sender_id == admin.id


# ==================== 5.3 测试仓库用户分配通知 ====================
# Requirements: 6.1, 6.2, 6.3

class TestWarehouseUserAssignmentNotification:
    """测试仓库用户分配通知（仓库维度）"""

    def test_warehouse_assign_sends_notification_to_each_user(
        self,
        client: TestClient,
        session: Session
    ):
        """
        测试将用户分配到仓库后，每个用户都收到分配通知
        
        验证：
        - 创建仓库和多个用户
        - 将用户分配到仓库
        - 验证每个用户都收到分配通知
        
        Requirements: 6.1
        """
        # 创建仓库
        warehouse = WarehouseFactory.create(session, name="多用户分配仓库")
        
        # 创建多个司机用户
        driver1 = UserFactory.create_driver(
            session, 
            username="multi_driver1", 
            name="司机1"
        )
        driver2 = UserFactory.create_driver(
            session, 
            username="multi_driver2", 
            name="司机2"
        )
        driver3 = UserFactory.create_driver(
            session, 
            username="multi_driver3", 
            name="司机3"
        )
        
        # 创建调度来执行分配操作
        admin = UserFactory.create_peer_admin(
            session, 
            username="multi_admin", 
            name="调度"
        )
        
        # 将多个用户分配到仓库
        admin_token = create_test_token(admin.id)
        response = client.post(
            f"/api/warehouses/{warehouse.id}/assign",
            json={
                "user_ids": [driver1.id, driver2.id, driver3.id]
            },
            headers=get_auth_headers(admin_token)
        )
        
        assert_success_response(response, 200)
        
        # 验证每个用户都收到通知
        for driver in [driver1, driver2, driver3]:
            notification = assert_notification_exists(
                session,
                user_id=driver.id,
                ref_type="warehouse_assignment"
            )
            assert notification is not None

    def test_warehouse_assign_notification_contains_warehouse_name(
        self,
        client: TestClient,
        session: Session
    ):
        """
        验证仓库用户分配通知内容包含仓库名称
        
        Requirements: 6.3
        """
        # 创建仓库
        warehouse = WarehouseFactory.create(session, name="北区配送中心")
        
        # 创建司机用户
        driver = UserFactory.create_driver(
            session, 
            username="wh_name_driver", 
            name="仓库名称测试司机"
        )
        
        # 创建老板来执行分配操作
        boss = UserFactory.create_boss(
            session, 
            username="wh_name_boss", 
            name="老板"
        )
        
        # 将用户分配到仓库
        boss_token = create_test_token(boss.id)
        response = client.post(
            f"/api/warehouses/{warehouse.id}/assign",
            json={
                "user_ids": [driver.id]
            },
            headers=get_auth_headers(boss_token)
        )
        
        assert_success_response(response, 200)
        
        # 验证通知内容包含仓库名称
        notification = assert_notification_exists(
            session,
            user_id=driver.id,
            ref_type="warehouse_assignment"
        )
        
        assert "北区配送中心" in notification.content

    def test_warehouse_assign_notification_ref_type_correct(
        self,
        client: TestClient,
        session: Session
    ):
        """
        验证仓库用户分配通知的 ref_type 正确设置
        
        Requirements: 6.2
        """
        # 创建仓库
        warehouse = WarehouseFactory.create(session, name="ref_type测试仓库")
        
        # 创建司机用户
        driver = UserFactory.create_driver(
            session, 
            username="ref_type_driver", 
            name="ref_type测试司机"
        )
        
        # 创建调度来执行分配操作
        admin = UserFactory.create_peer_admin(
            session, 
            username="ref_type_admin", 
            name="调度"
        )
        
        # 将用户分配到仓库
        admin_token = create_test_token(admin.id)
        response = client.post(
            f"/api/warehouses/{warehouse.id}/assign",
            json={
                "user_ids": [driver.id]
            },
            headers=get_auth_headers(admin_token)
        )
        
        assert_success_response(response, 200)
        
        # 验证通知的 ref_type 正确
        notification = assert_notification_exists(
            session,
            user_id=driver.id,
            ref_type="warehouse_assignment"
        )
        
        assert notification.ref_type == "warehouse_assignment"
        # ref_id 应该是仓库ID
        assert notification.ref_id == warehouse.id

    def test_warehouse_assign_notification_sender_is_admin(
        self,
        client: TestClient,
        session: Session
    ):
        """
        验证仓库用户分配通知的发送者是执行分配的管理员
        
        Requirements: 6.1
        """
        # 创建仓库
        warehouse = WarehouseFactory.create(session, name="发送者测试仓库2")
        
        # 创建司机用户
        driver = UserFactory.create_driver(
            session, 
            username="wh_sender_driver", 
            name="发送者测试司机"
        )
        
        # 创建老板来执行分配操作
        boss = UserFactory.create_boss(
            session, 
            username="wh_sender_boss", 
            name="老板管理员"
        )
        
        # 将用户分配到仓库
        boss_token = create_test_token(boss.id)
        response = client.post(
            f"/api/warehouses/{warehouse.id}/assign",
            json={
                "user_ids": [driver.id]
            },
            headers=get_auth_headers(boss_token)
        )
        
        assert_success_response(response, 200)
        
        # 验证通知的发送者是老板
        notification = assert_notification_exists(
            session,
            user_id=driver.id,
            ref_type="warehouse_assignment"
        )
        
        assert notification.sender_id == boss.id

    def test_warehouse_assign_manager_receives_notification(
        self,
        client: TestClient,
        session: Session
    ):
        """
        测试将车队长分配到仓库时，车队长也收到通知
        
        Requirements: 6.1
        """
        # 创建仓库
        warehouse = WarehouseFactory.create(session, name="车队长分配仓库")
        
        # 创建车队长用户
        manager = UserFactory.create_manager(
            session, 
            username="assign_manager", 
            name="被分配车队长"
        )
        
        # 创建老板来执行分配操作
        boss = UserFactory.create_boss(
            session, 
            username="manager_assign_boss", 
            name="老板"
        )
        
        # 将车队长分配到仓库
        boss_token = create_test_token(boss.id)
        response = client.post(
            f"/api/warehouses/{warehouse.id}/assign",
            json={
                "user_ids": [manager.id]
            },
            headers=get_auth_headers(boss_token)
        )
        
        assert_success_response(response, 200)
        
        # 验证车队长收到通知
        notification = assert_notification_exists(
            session,
            user_id=manager.id,
            ref_type="warehouse_assignment"
        )
        
        assert notification is not None
        assert "车队长分配仓库" in notification.content
