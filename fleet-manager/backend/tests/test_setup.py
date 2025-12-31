"""
测试配置验证
验证测试基础设施是否正确配置

这个测试文件用于验证：
- 测试数据库配置正确
- 测试客户端夹具可用
- 依赖注入覆盖正确
- 测试数据工厂可用
"""

from sqlmodel import Session

# 导入测试工厂和辅助函数
from tests.factories import (
    UserFactory, WarehouseFactory, VehicleFactory,
    AttendanceFactory, PieceWorkFactory, LeaveFactory,
    NotificationFactory
)
from tests.helpers import (
    get_auth_headers,
    create_test_token
)

# 导入模型
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models import User, UserRole, Warehouse


class TestDatabaseSetup:
    """测试数据库配置"""

    def test_session_fixture_works(self, session: Session):
        """测试数据库会话夹具可用"""
        from sqlalchemy import text

        # 会话应该存在
        assert session is not None

        # 应该能执行简单查询
        result = session.execute(text("SELECT 1"))
        assert result is not None

    def test_tables_created(self, session: Session):
        """测试数据库表已创建"""
        # 尝试查询用户表
        from sqlmodel import select
        from models import User

        statement = select(User)
        result = session.exec(statement).all()

        # 初始应该是空的
        assert result == []


class TestClientSetup:
    """测试客户端配置"""

    def test_client_fixture_works(self, client):
        """测试客户端夹具可用"""
        assert client is not None

    def test_health_endpoint(self, client):
        """测试健康检查端点"""
        response = client.get("/api/health")
        # 健康检查应该返回 200
        assert response.status_code == 200


class TestUserFixtures:
    """测试用户夹具"""

    def test_super_admin_user_fixture(self, super_admin_user: User):
        """
        测试超级管理员用户夹具（现在使用 BOSS 角色）
        
        注意：SUPER_ADMIN 角色已被移除，此 fixture 现在创建 BOSS 角色用户
        保留 super_admin_user 名称以保持测试兼容性
        """
        assert super_admin_user is not None
        assert super_admin_user.id is not None
        assert super_admin_user.role == UserRole.BOSS  # 改为 BOSS 角色
        assert super_admin_user.is_active is True

    def test_boss_user_fixture(self, boss_user: User):
        """测试老板用户夹具"""
        assert boss_user is not None
        assert boss_user.role == UserRole.BOSS

    def test_manager_user_fixture(self, manager_user: User):
        """测试车队长用户夹具"""
        assert manager_user is not None
        assert manager_user.role == UserRole.MANAGER

    def test_driver_user_fixture(self, driver_user: User):
        """测试司机用户夹具"""
        assert driver_user is not None
        assert driver_user.role == UserRole.DRIVER

    def test_disabled_user_fixture(self, disabled_user: User):
        """测试禁用用户夹具"""
        assert disabled_user is not None
        assert disabled_user.is_active is False


class TestTokenFixtures:
    """测试 Token 夹具"""

    def test_super_admin_token_fixture(self, super_admin_token: str):
        """测试超级管理员 Token 夹具"""
        assert super_admin_token is not None
        assert len(super_admin_token) > 0

    def test_boss_token_fixture(self, boss_token: str):
        """测试老板 Token 夹具"""
        assert boss_token is not None

    def test_driver_token_fixture(self, driver_token: str):
        """测试司机 Token 夹具"""
        assert driver_token is not None


class TestWarehouseFixtures:
    """测试仓库夹具"""

    def test_warehouse_fixture(self, test_warehouse: Warehouse):
        """测试仓库夹具"""
        assert test_warehouse is not None
        assert test_warehouse.id is not None
        assert test_warehouse.is_active is True


class TestFactories:
    """测试数据工厂"""

    def test_user_factory(self, session: Session):
        """测试用户工厂"""
        # 创建司机
        driver = UserFactory.create_driver(session)
        assert driver.role == UserRole.DRIVER

        # 创建车队长
        manager = UserFactory.create_manager(session)
        assert manager.role == UserRole.MANAGER

        # 创建老板
        boss = UserFactory.create_boss(session)
        assert boss.role == UserRole.BOSS

    def test_warehouse_factory(self, session: Session):
        """测试仓库工厂"""
        warehouse = WarehouseFactory.create(session, name="测试仓库A")
        assert warehouse.name == "测试仓库A"
        assert warehouse.is_active is True

    def test_warehouse_assignment(self, session: Session):
        """测试仓库分配"""
        user = UserFactory.create_driver(session)
        warehouse = WarehouseFactory.create(session)

        assignment = WarehouseFactory.assign_user(session, user, warehouse)
        assert assignment.user_id == user.id
        assert assignment.warehouse_id == warehouse.id

    def test_vehicle_factory(self, session: Session):
        """测试车辆工厂"""
        user = UserFactory.create_driver(session)
        vehicle = VehicleFactory.create(session, user)

        assert vehicle.user_id == user.id
        assert vehicle.license_plate is not None

    def test_attendance_factory(self, session: Session):
        """测试考勤工厂"""
        user = UserFactory.create_driver(session)
        attendance = AttendanceFactory.create_full_day(session, user)

        assert attendance.user_id == user.id
        assert attendance.clock_in is not None
        assert attendance.clock_out is not None
        assert attendance.work_hours is not None

    def test_piece_work_factory(self, session: Session):
        """测试计件工厂"""
        user = UserFactory.create_driver(session)
        category = PieceWorkFactory.create_category(session, unit_price=2.0)
        record = PieceWorkFactory.create_record(session, user, category, quantity=50)

        assert record.quantity == 50
        assert record.amount == 100.0  # 50 * 2.0

    def test_leave_factory(self, session: Session):
        """测试请假工厂"""
        user = UserFactory.create_driver(session)
        leave = LeaveFactory.create(session, user)

        assert leave.user_id == user.id
        assert leave.status.value == "pending"

    def test_notification_factory(self, session: Session):
        """测试通知工厂"""
        user = UserFactory.create_driver(session)
        notification = NotificationFactory.create(session, user)

        assert notification.user_id == user.id
        assert notification.is_read is False


class TestHelpers:
    """测试辅助函数"""

    def test_get_auth_headers(self):
        """测试获取认证头"""
        headers = get_auth_headers("test_token")
        assert headers["Authorization"] == "Bearer test_token"

    def test_create_test_token(self, driver_user: User):
        """测试创建测试 Token"""
        token = create_test_token(driver_user.id)
        assert token is not None
        assert len(token) > 0


class TestDependencyOverride:
    """测试依赖注入覆盖"""

    def test_auth_with_token(self, client, driver_user: User, driver_token: str):
        """测试使用 Token 认证"""
        response = client.get(
            "/api/auth/me",
            headers=get_auth_headers(driver_token)
        )

        # 应该能获取当前用户信息
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == driver_user.id
        assert data["username"] == driver_user.username

    def test_auth_without_token(self, client):
        """测试无 Token 访问需要认证的端点"""
        response = client.get("/api/auth/me")

        # 应该返回 401 或 403
        assert response.status_code in [401, 403]
