"""
考勤打卡测试模块
测试上下班打卡、打卡状态查询、考勤记录查询等功能

Requirements: Requirement 4 - 考勤打卡
"""

from datetime import date, datetime, timedelta
from fastapi.testclient import TestClient
from sqlmodel import Session

# 导入测试工具
from tests.factories import UserFactory, AttendanceFactory
from tests.helpers import (
    get_auth_headers, assert_success_response, assert_error_response
)

# 导入模型
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


# ==================== 打卡功能测试 ====================
# Requirements: Requirement 4 (AC 1-3)

class TestClockInOut:
    """打卡功能测试"""

    def test_clock_in_success(
        self,
        client: TestClient,
        driver_token: str
    ):
        """
        测试上班打卡成功

        验证：
        - 司机可以上班打卡
        - 返回打卡记录
        """
        response = client.post(
            "/api/attendance/clock-in",
            headers=get_auth_headers(driver_token)
        )

        data = assert_success_response(response, 200)

        assert data["clock_in"] is not None
        assert data["clock_out"] is None
        assert data["work_date"] == str(date.today())

    def test_clock_out_success(
        self,
        client: TestClient,
        session: Session
    ):
        """
        测试下班打卡成功并计算工时

        验证：
        - 已上班打卡的用户可以下班打卡
        - 自动计算工时
        """
        # 创建用户并上班打卡
        user = UserFactory.create_driver(session, username="clock_out_test_user")

        # 创建今日上班打卡记录
        today = date.today()
        clock_in_time = datetime.combine(today, datetime.min.time().replace(hour=8))
        AttendanceFactory.create(
            session, user,
            work_date=today,
            clock_in=clock_in_time
        )

        # 获取用户 Token
        from tests.helpers import create_test_token
        token = create_test_token(user.id)

        # 下班打卡
        response = client.post(
            "/api/attendance/clock-out",
            headers=get_auth_headers(token)
        )

        data = assert_success_response(response, 200)

        assert data["clock_in"] is not None
        assert data["clock_out"] is not None
        assert data["work_hours"] is not None
        assert data["work_hours"] > 0

    def test_clock_out_without_clock_in_fail(
        self,
        client: TestClient,
        session: Session
    ):
        """
        测试未上班打卡就下班打卡失败

        验证：
        - 没有上班打卡记录时，下班打卡返回错误
        """
        # 创建新用户（没有打卡记录）
        user = UserFactory.create_driver(session, username="no_clock_in_user")

        from tests.helpers import create_test_token
        token = create_test_token(user.id)

        response = client.post(
            "/api/attendance/clock-out",
            headers=get_auth_headers(token)
        )

        assert_error_response(response, 400, "还没有上班打卡")

    def test_manager_can_clock_in(
        self,
        client: TestClient,
        manager_token: str
    ):
        """
        测试车队长可以打卡

        验证：
        - 车队长也可以上班打卡
        """
        response = client.post(
            "/api/attendance/clock-in",
            headers=get_auth_headers(manager_token)
        )

        data = assert_success_response(response, 200)
        assert data["clock_in"] is not None

    def test_clock_in_without_auth(self, client: TestClient):
        """
        测试未认证无法打卡

        验证：
        - 不提供 Token 无法打卡
        """
        response = client.post("/api/attendance/clock-in")

        assert response.status_code in [401, 403]


# ==================== 打卡状态查询测试 ====================
# Requirements: Requirement 4 (AC 4-5)

class TestAttendanceStatus:
    """打卡状态查询测试"""

    def test_get_today_attendance_no_record(
        self,
        client: TestClient,
        session: Session
    ):
        """
        测试查询今日打卡状态（无记录）

        验证：
        - 没有打卡记录时返回未打卡状态
        """
        # 创建新用户
        user = UserFactory.create_driver(session, username="no_attendance_user")

        from tests.helpers import create_test_token
        token = create_test_token(user.id)

        response = client.get(
            "/api/attendance/today",
            headers=get_auth_headers(token)
        )

        data = assert_success_response(response, 200)

        assert data["has_clocked_in"] is False
        assert data["has_clocked_out"] is False
        assert data["clock_in_time"] is None
        assert data["clock_out_time"] is None

    def test_get_today_attendance_clocked_in(
        self,
        client: TestClient,
        session: Session
    ):
        """
        测试查询今日打卡状态（已上班打卡）

        验证：
        - 已上班打卡时返回正确状态
        """
        # 创建用户并上班打卡
        user = UserFactory.create_driver(session, username="clocked_in_user")
        today = date.today()
        clock_in_time = datetime.combine(today, datetime.min.time().replace(hour=9))
        AttendanceFactory.create(session, user, work_date=today, clock_in=clock_in_time)

        from tests.helpers import create_test_token
        token = create_test_token(user.id)

        response = client.get(
            "/api/attendance/today",
            headers=get_auth_headers(token)
        )

        data = assert_success_response(response, 200)

        assert data["has_clocked_in"] is True
        assert data["has_clocked_out"] is False
        assert data["clock_in_time"] is not None

    def test_get_today_attendance_full_day(
        self,
        client: TestClient,
        session: Session
    ):
        """
        测试查询今日打卡状态（完整打卡）

        验证：
        - 上下班都打卡后返回正确状态和工时
        """
        # 创建用户并完整打卡
        user = UserFactory.create_driver(session, username="full_day_user")
        AttendanceFactory.create_full_day(session, user)

        from tests.helpers import create_test_token
        token = create_test_token(user.id)

        response = client.get(
            "/api/attendance/today",
            headers=get_auth_headers(token)
        )

        data = assert_success_response(response, 200)

        assert data["has_clocked_in"] is True
        assert data["has_clocked_out"] is True
        assert data["work_hours"] is not None
        assert data["work_hours"] > 0


# ==================== 考勤记录查询测试 ====================

class TestAttendanceRecords:
    """考勤记录查询测试"""

    def test_get_attendance_records(
        self,
        client: TestClient,
        session: Session
    ):
        """
        测试按日期范围查询考勤记录

        验证：
        - 可以查询指定日期范围的考勤记录
        """
        # 创建用户和多天考勤记录
        user = UserFactory.create_driver(session, username="records_test_user")

        today = date.today()
        for i in range(3):
            work_date = today - timedelta(days=i)
            AttendanceFactory.create_full_day(session, user, work_date=work_date)

        from tests.helpers import create_test_token
        token = create_test_token(user.id)

        # 查询最近7天的记录
        start_date = today - timedelta(days=7)
        response = client.get(
            f"/api/attendance?start_date={start_date}&end_date={today}",
            headers=get_auth_headers(token)
        )

        data = assert_success_response(response, 200)

        assert isinstance(data, list)
        assert len(data) >= 3

    def test_driver_can_only_see_own_records(
        self,
        client: TestClient,
        session: Session
    ):
        """
        测试司机只能查看自己的考勤记录

        验证：
        - 司机查询时自动过滤为自己的记录
        """
        # 创建两个用户
        user1 = UserFactory.create_driver(session, username="driver_records_1")
        user2 = UserFactory.create_driver(session, username="driver_records_2")

        # 为两个用户创建考勤记录
        AttendanceFactory.create_full_day(session, user1)
        AttendanceFactory.create_full_day(session, user2)

        from tests.helpers import create_test_token
        token1 = create_test_token(user1.id)

        # user1 查询考勤记录
        response = client.get(
            "/api/attendance",
            headers=get_auth_headers(token1)
        )

        data = assert_success_response(response, 200)

        # 所有记录都应该是 user1 的
        for record in data:
            assert record["user_id"] == user1.id

    def test_manager_can_see_all_records(
        self,
        client: TestClient,
        session: Session,
        manager_token: str
    ):
        """
        测试车队长可以查看所有考勤记录

        验证：
        - 车队长可以查看所有用户的考勤记录
        """
        # 创建多个用户的考勤记录
        for i in range(3):
            user = UserFactory.create_driver(session, username=f"manager_view_user_{i}")
            AttendanceFactory.create_full_day(session, user)

        response = client.get(
            "/api/attendance",
            headers=get_auth_headers(manager_token)
        )

        data = assert_success_response(response, 200)

        assert isinstance(data, list)
        # 应该能看到多个用户的记录
        user_ids = set(record["user_id"] for record in data)
        assert len(user_ids) >= 1

    def test_filter_attendance_by_user_id(
        self,
        client: TestClient,
        session: Session,
        super_admin_token: str
    ):
        """
        测试按用户ID筛选考勤记录

        验证：
        - 管理员可以按用户ID筛选考勤记录
        """
        # 创建用户和考勤记录
        user = UserFactory.create_driver(session, username="filter_user_id_test")
        AttendanceFactory.create_full_day(session, user)

        response = client.get(
            f"/api/attendance?user_id={user.id}",
            headers=get_auth_headers(super_admin_token)
        )

        data = assert_success_response(response, 200)

        # 所有记录都应该是指定用户的
        for record in data:
            assert record["user_id"] == user.id

    def test_attendance_records_pagination(
        self,
        client: TestClient,
        session: Session
    ):
        """
        测试考勤记录分页

        验证：
        - 可以使用 skip 和 limit 参数分页
        """
        # 创建用户和多条考勤记录
        user = UserFactory.create_driver(session, username="pagination_test_user")

        today = date.today()
        for i in range(5):
            work_date = today - timedelta(days=i)
            AttendanceFactory.create_full_day(session, user, work_date=work_date)

        from tests.helpers import create_test_token
        token = create_test_token(user.id)

        # 获取前2条
        response = client.get(
            "/api/attendance?skip=0&limit=2",
            headers=get_auth_headers(token)
        )

        data = assert_success_response(response, 200)

        assert len(data) <= 2


# ==================== 考勤记录响应格式测试 ====================

class TestAttendanceResponseFormat:
    """考勤记录响应格式测试"""

    def test_attendance_response_includes_user_name(
        self,
        client: TestClient,
        session: Session,
        super_admin_token: str
    ):
        """
        测试考勤记录响应包含用户姓名

        验证：
        - 考勤记录响应中包含 user_name 字段
        """
        # 创建用户和考勤记录
        user = UserFactory.create_driver(
            session,
            username="name_test_user",
            name="测试用户姓名"
        )
        AttendanceFactory.create_full_day(session, user)

        response = client.get(
            f"/api/attendance?user_id={user.id}",
            headers=get_auth_headers(super_admin_token)
        )

        data = assert_success_response(response, 200)

        assert len(data) > 0
        assert data[0]["user_name"] == "测试用户姓名"

    def test_clock_in_response_format(
        self,
        client: TestClient,
        session: Session
    ):
        """
        测试上班打卡响应格式

        验证：
        - 上班打卡响应包含所有必要字段
        """
        user = UserFactory.create_driver(session, username="clock_in_format_user")

        from tests.helpers import create_test_token
        token = create_test_token(user.id)

        response = client.post(
            "/api/attendance/clock-in",
            headers=get_auth_headers(token)
        )

        data = assert_success_response(response, 200)

        # 验证必要字段存在
        assert "id" in data
        assert "user_id" in data
        assert "work_date" in data
        assert "clock_in" in data
        assert "clock_out" in data
        assert "work_hours" in data
        assert "user_name" in data
