"""
审批功能属性测试模块
使用 Hypothesis 进行属性测试，验证请假申请、离职审批和车辆审批功能的正确性

Requirements: 1.1, 2.1, 4.1 - 审批功能完整性测试
Design Properties: Property 1-6

测试框架: pytest + hypothesis
最小迭代次数: 100 次

注意：由于 Hypothesis 与 pytest fixtures 的交互问题，
本模块使用独立的数据库会话管理来确保测试隔离性。
"""

from datetime import date, timedelta
from typing import Optional
import string
import random

import pytest
from hypothesis import given, settings, strategies as st, assume, HealthCheck, Phase
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine
from sqlalchemy.pool import StaticPool

# 导入测试工具
from tests.factories import UserFactory, WarehouseFactory, VehicleFactory, LeaveFactory
from tests.helpers import get_auth_headers, create_test_token

# 导入模型和应用
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models import LeaveType, LeaveStatus, VehicleStatus, UserRole
from main import app
from database import get_session


# ==================== Hypothesis 策略定义 ====================

# 生成有效的请假原因（非空字符串）
valid_reason_strategy = st.text(
    alphabet=st.sampled_from('测试请假原因事由个人家庭事务工作调整'),
    min_size=2,
    max_size=50
).filter(lambda x: len(x.strip()) > 0)

# 生成有效的日期偏移量（用于生成未来日期）
date_offset_strategy = st.integers(min_value=1, max_value=365)

# 生成有效的请假天数
leave_days_strategy = st.integers(min_value=1, max_value=30)

# 生成请假类型
leave_type_strategy = st.sampled_from(['leave', 'resign'])

# 生成审批状态
approval_status_strategy = st.sampled_from(['approved', 'rejected'])

# 生成车辆审核状态
vehicle_review_status_strategy = st.sampled_from(['active', 'rejected'])

# 生成车辆品牌
vehicle_brand_strategy = st.sampled_from(['丰田', '本田', '大众', '比亚迪', '特斯拉', '奔驰', '宝马'])

# 生成车辆颜色
vehicle_color_strategy = st.sampled_from(['白色', '黑色', '银色', '红色', '蓝色', '灰色'])


# ==================== 测试辅助函数 ====================

def create_test_db():
    """
    创建独立的测试数据库引擎和会话
    每次调用都返回全新的内存数据库
    """
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        echo=False
    )
    SQLModel.metadata.create_all(engine)
    return engine


def create_test_client_with_session(session: Session) -> TestClient:
    """
    创建使用指定会话的测试客户端
    """
    def get_session_override():
        return session
    
    app.dependency_overrides[get_session] = get_session_override
    return TestClient(app)


# ==================== 属性测试类 ====================

class TestApprovalProperties:
    """
    审批功能属性测试
    
    测试覆盖:
    - Property 1: 申请创建状态一致性
    - Property 2: 审批状态变更正确性
    - Property 3: 司机资源隔离
    - Property 4: 车辆初始状态一致性
    - Property 5: 车辆审核状态变更正确性
    - Property 6: 还车状态变更正确性
    """

    # ==================== Property 1: 申请创建状态一致性 ====================
    # Feature: approval-testing, Property 1: 申请创建状态一致性
    # **Validates: Requirements 1.1, 2.1**

    @settings(
        max_examples=100,
        suppress_health_check=[HealthCheck.function_scoped_fixture],
        deadline=None,  # 禁用超时检查
        phases=[Phase.generate, Phase.target]  # 跳过 shrink 阶段以避免 flaky 问题
    )
    @given(
        leave_type=leave_type_strategy,
        start_offset=date_offset_strategy,
        leave_days=leave_days_strategy,
        reason=valid_reason_strategy
    )
    def test_property_1_application_initial_status_pending(
        self,
        leave_type: str,
        start_offset: int,
        leave_days: int,
        reason: str
    ):
        """
        Property 1: 申请创建状态一致性
        
        *For any* 有效的请假或离职申请数据，提交后系统返回的申请状态应始终为 pending。
        
        **Validates: Requirements 1.1, 2.1**
        """
        # 创建独立的数据库和会话
        engine = create_test_db()
        with Session(engine) as session:
            client = create_test_client_with_session(session)
            
            try:
                # 创建司机用户
                user = UserFactory.create_driver(session)
                token = create_test_token(user.id)
                
                # 计算日期
                start_date = date.today() + timedelta(days=start_offset)
                end_date = start_date + timedelta(days=leave_days)
                
                # 提交申请
                response = client.post(
                    "/api/leave",
                    json={
                        "leave_type": leave_type,
                        "start_date": str(start_date),
                        "end_date": str(end_date),
                        "reason": reason
                    },
                    headers=get_auth_headers(token)
                )
                
                # 验证响应成功
                assert response.status_code == 200, f"申请提交失败: {response.text}"
                
                data = response.json()
                
                # 核心属性验证：状态必须为 pending
                assert data["status"] == "pending", \
                    f"申请初始状态应为 pending，实际为 {data['status']}"
                
                # 验证申请类型正确
                assert data["leave_type"] == leave_type, \
                    f"申请类型应为 {leave_type}，实际为 {data['leave_type']}"
            finally:
                app.dependency_overrides.clear()

    # ==================== Property 2: 审批状态变更正确性 ====================
    # Feature: approval-testing, Property 2: 审批状态变更正确性
    # **Validates: Requirements 2.2, 2.3, 3.1, 3.2**

    @settings(
        max_examples=100,
        suppress_health_check=[HealthCheck.function_scoped_fixture],
        deadline=None,
        phases=[Phase.generate, Phase.target]
    )
    @given(
        approval_status=approval_status_strategy,
        leave_type=leave_type_strategy
    )
    def test_property_2_approval_status_change_correctness(
        self,
        approval_status: str,
        leave_type: str
    ):
        """
        Property 2: 审批状态变更正确性
        
        *For any* 待审批的申请（请假或离职），当管理员执行审批操作时，
        申请状态应正确更新为 approved 或 rejected，且审批人信息应被正确记录。
        
        **Validates: Requirements 2.2, 2.3, 3.1, 3.2**
        """
        engine = create_test_db()
        with Session(engine) as session:
            client = create_test_client_with_session(session)
            
            try:
                # 创建车队长和司机
                manager = UserFactory.create_manager(session)
                manager_token = create_test_token(manager.id)
                
                driver = UserFactory.create_driver(session)
                leave = LeaveFactory.create(
                    session, 
                    driver, 
                    leave_type=LeaveType.LEAVE if leave_type == 'leave' else LeaveType.RESIGN,
                    status=LeaveStatus.PENDING
                )
                
                # 执行审批
                response = client.put(
                    f"/api/leave/{leave.id}/approve",
                    json={
                        "status": approval_status,
                        "comment": f"测试审批-{approval_status}"
                    },
                    headers=get_auth_headers(manager_token)
                )
                
                # 验证响应成功
                assert response.status_code == 200, f"审批操作失败: {response.text}"
                
                data = response.json()
                
                # 核心属性验证：状态必须正确更新
                assert data["status"] == approval_status, \
                    f"审批后状态应为 {approval_status}，实际为 {data['status']}"
            finally:
                app.dependency_overrides.clear()

    # ==================== Property 3: 司机资源隔离 ====================
    # Feature: approval-testing, Property 3: 司机资源隔离
    # **Validates: Requirements 1.5, 4.4**

    @settings(
        max_examples=100,
        suppress_health_check=[HealthCheck.function_scoped_fixture],
        deadline=None,
        phases=[Phase.generate, Phase.target]
    )
    @given(
        num_applications=st.integers(min_value=1, max_value=5)
    )
    def test_property_3_driver_resource_isolation_leave(
        self,
        num_applications: int
    ):
        """
        Property 3: 司机资源隔离（请假申请）
        
        *For any* 司机用户，查询请假列表时，返回的所有记录的 user_id 应等于该司机的 id。
        
        **Validates: Requirements 1.5**
        """
        engine = create_test_db()
        with Session(engine) as session:
            client = create_test_client_with_session(session)
            
            try:
                # 创建两个司机
                driver1 = UserFactory.create_driver(session)
                driver2 = UserFactory.create_driver(session)
                
                # 为两个司机分别创建申请
                for _ in range(num_applications):
                    LeaveFactory.create(session, driver1)
                    LeaveFactory.create(session, driver2)
                
                # 司机1查询自己的申请
                token1 = create_test_token(driver1.id)
                response = client.get(
                    "/api/leave",
                    headers=get_auth_headers(token1)
                )
                
                assert response.status_code == 200, f"查询失败: {response.text}"
                
                data = response.json()
                
                # 核心属性验证：所有返回的申请都属于当前司机
                for leave in data:
                    assert leave["user_id"] == driver1.id, \
                        f"司机只能看到自己的申请，但发现 user_id={leave['user_id']}，期望 {driver1.id}"
            finally:
                app.dependency_overrides.clear()

    @settings(
        max_examples=100,
        suppress_health_check=[HealthCheck.function_scoped_fixture],
        deadline=None,
        phases=[Phase.generate, Phase.target]
    )
    @given(
        num_vehicles=st.integers(min_value=1, max_value=3)
    )
    def test_property_3_driver_resource_isolation_vehicle(
        self,
        num_vehicles: int
    ):
        """
        Property 3: 司机资源隔离（车辆）
        
        *For any* 司机用户，查询车辆列表时，返回的所有记录的 user_id 应等于该司机的 id。
        
        **Validates: Requirements 4.4**
        """
        engine = create_test_db()
        with Session(engine) as session:
            client = create_test_client_with_session(session)
            
            try:
                # 创建两个司机
                driver1 = UserFactory.create_driver(session)
                driver2 = UserFactory.create_driver(session)
                
                # 为两个司机分别创建车辆
                for i in range(num_vehicles):
                    VehicleFactory.create(session, driver1)
                    VehicleFactory.create(session, driver2)
                
                # 司机1查询自己的车辆
                token1 = create_test_token(driver1.id)
                response = client.get(
                    "/api/vehicles",
                    headers=get_auth_headers(token1)
                )
                
                assert response.status_code == 200, f"查询失败: {response.text}"
                
                data = response.json()
                
                # 核心属性验证：所有返回的车辆都属于当前司机
                for vehicle in data:
                    assert vehicle["user_id"] == driver1.id, \
                        f"司机只能看到自己的车辆，但发现 user_id={vehicle['user_id']}，期望 {driver1.id}"
            finally:
                app.dependency_overrides.clear()

    # ==================== Property 4: 车辆初始状态一致性 ====================
    # Feature: approval-testing, Property 4: 车辆初始状态一致性
    # **Validates: Requirements 4.1**

    @settings(
        max_examples=100,
        suppress_health_check=[HealthCheck.function_scoped_fixture],
        deadline=None,
        phases=[Phase.generate, Phase.target]
    )
    @given(
        brand=vehicle_brand_strategy,
        color=vehicle_color_strategy
    )
    def test_property_4_vehicle_initial_status_reviewing(
        self,
        brand: str,
        color: str
    ):
        """
        Property 4: 车辆初始状态一致性
        
        *For any* 有效的车辆信息，添加后系统返回的车辆状态应始终为 reviewing。
        
        **Validates: Requirements 4.1**
        """
        engine = create_test_db()
        with Session(engine) as session:
            client = create_test_client_with_session(session)
            
            try:
                # 创建司机和仓库
                driver = UserFactory.create_driver(session)
                warehouse = WarehouseFactory.create(session)
                WarehouseFactory.assign_user(session, driver, warehouse)
                
                token = create_test_token(driver.id)
                
                # 生成唯一车牌号
                license_plate = f"川{random.choice(string.ascii_uppercase)}{random.randint(10000, 99999)}"
                
                # 添加车辆
                response = client.post(
                    "/api/vehicles",
                    json={
                        "license_plate": license_plate,
                        "brand": brand,
                        "model": "测试型号",
                        "color": color,
                        "warehouse_id": warehouse.id,
                        "ownership_type": "company"
                    },
                    headers=get_auth_headers(token)
                )
                
                # 验证响应成功
                assert response.status_code == 200, f"车辆添加失败: {response.text}"
                
                data = response.json()
                
                # 核心属性验证：状态必须为 reviewing
                assert data["status"] == "reviewing", \
                    f"车辆初始状态应为 reviewing，实际为 {data['status']}"
            finally:
                app.dependency_overrides.clear()

    # ==================== Property 5: 车辆审核状态变更正确性 ====================
    # Feature: approval-testing, Property 5: 车辆审核状态变更正确性
    # **Validates: Requirements 5.1, 5.2**

    @settings(
        max_examples=100,
        suppress_health_check=[HealthCheck.function_scoped_fixture],
        deadline=None,
        phases=[Phase.generate, Phase.target]
    )
    @given(
        review_status=vehicle_review_status_strategy
    )
    def test_property_5_vehicle_review_status_change(
        self,
        review_status: str
    ):
        """
        Property 5: 车辆审核状态变更正确性
        
        *For any* 待审核的车辆，当老板执行审核操作时，
        车辆状态应正确更新为 active（通过）或 rejected（拒绝）。
        
        **Validates: Requirements 5.1, 5.2**
        """
        engine = create_test_db()
        with Session(engine) as session:
            client = create_test_client_with_session(session)
            
            try:
                # 创建老板和司机
                boss = UserFactory.create_boss(session)
                boss_token = create_test_token(boss.id)
                
                driver = UserFactory.create_driver(session)
                vehicle = VehicleFactory.create(
                    session, 
                    driver,
                    status=VehicleStatus.REVIEWING
                )
                
                # 执行审核
                response = client.put(
                    f"/api/vehicles/{vehicle.id}/review",
                    json={
                        "status": review_status,
                        "comment": f"测试审核-{review_status}"
                    },
                    headers=get_auth_headers(boss_token)
                )
                
                # 验证响应成功
                assert response.status_code == 200, f"车辆审核失败: {response.text}"
                
                data = response.json()
                
                # 核心属性验证：状态必须正确更新
                assert data["status"] == review_status, \
                    f"审核后状态应为 {review_status}，实际为 {data['status']}"
            finally:
                app.dependency_overrides.clear()

    # ==================== Property 6: 还车状态变更正确性 ====================
    # Feature: approval-testing, Property 6: 还车状态变更正确性
    # **Validates: Requirements 6.1, 6.2**

    @settings(
        max_examples=100,
        suppress_health_check=[HealthCheck.function_scoped_fixture],
        deadline=None,
        phases=[Phase.generate, Phase.target]
    )
    @given(
        return_reason=valid_reason_strategy
    )
    def test_property_6_vehicle_return_status_change(
        self,
        return_reason: str
    ):
        """
        Property 6: 还车状态变更正确性
        
        *For any* 使用中的车辆，执行还车操作后，车辆状态应更新为 returned。
        
        **Validates: Requirements 6.1, 6.2**
        """
        engine = create_test_db()
        with Session(engine) as session:
            client = create_test_client_with_session(session)
            
            try:
                # 创建老板和司机
                boss = UserFactory.create_boss(session)
                boss_token = create_test_token(boss.id)
                
                driver = UserFactory.create_driver(session)
                vehicle = VehicleFactory.create(
                    session, 
                    driver,
                    status=VehicleStatus.ACTIVE
                )
                
                # 执行还车
                response = client.post(
                    f"/api/vehicles/{vehicle.id}/return",
                    json={
                        "return_date": str(date.today()),
                        "reason": return_reason
                    },
                    headers=get_auth_headers(boss_token)
                )
                
                # 验证响应成功
                assert response.status_code == 200, f"还车操作失败: {response.text}"
                
                data = response.json()
                
                # 核心属性验证：状态必须为 returned
                assert data["status"] == "returned", \
                    f"还车后状态应为 returned，实际为 {data['status']}"
            finally:
                app.dependency_overrides.clear()


# ==================== 未认证用户访问测试 ====================
# Requirements: 1.3, 4.3 - 未认证用户无法访问

class TestUnauthenticatedApprovalAccess:
    """
    未认证用户访问审批功能测试
    
    验证未认证用户无法访问请假申请和车辆相关的 API 接口
    
    **Validates: Requirements 1.3, 4.3**
    """

    def test_unauthenticated_cannot_submit_leave_application(self):
        """
        测试未认证用户无法提交请假申请
        
        验证：
        - 不提供 Token 无法提交请假申请
        - 应返回 401 或 403 错误
        
        **Validates: Requirements 1.3**
        """
        engine = create_test_db()
        with Session(engine) as session:
            client = create_test_client_with_session(session)
            
            try:
                # 不提供认证头，尝试提交请假申请
                response = client.post(
                    "/api/leave",
                    json={
                        "leave_type": "leave",
                        "start_date": "2025-01-15",
                        "end_date": "2025-01-16",
                        "reason": "测试请假"
                    }
                )
                
                # 验证返回 401 或 403
                assert response.status_code in [401, 403], \
                    f"未认证用户提交请假申请应返回 401/403，实际返回 {response.status_code}"
            finally:
                app.dependency_overrides.clear()

    def test_unauthenticated_cannot_get_leave_list(self):
        """
        测试未认证用户无法获取请假列表
        
        验证：
        - 不提供 Token 无法获取请假列表
        - 应返回 401 或 403 错误
        
        **Validates: Requirements 1.3**
        """
        engine = create_test_db()
        with Session(engine) as session:
            client = create_test_client_with_session(session)
            
            try:
                # 不提供认证头，尝试获取请假列表
                response = client.get("/api/leave")
                
                # 验证返回 401 或 403
                assert response.status_code in [401, 403], \
                    f"未认证用户获取请假列表应返回 401/403，实际返回 {response.status_code}"
            finally:
                app.dependency_overrides.clear()

    def test_unauthenticated_cannot_approve_leave(self):
        """
        测试未认证用户无法审批请假申请
        
        验证：
        - 不提供 Token 无法审批请假申请
        - 应返回 401 或 403 错误
        
        **Validates: Requirements 1.3**
        """
        engine = create_test_db()
        with Session(engine) as session:
            client = create_test_client_with_session(session)
            
            try:
                # 创建一个请假申请用于测试
                driver = UserFactory.create_driver(session)
                leave = LeaveFactory.create(session, driver)
                
                # 不提供认证头，尝试审批
                response = client.put(
                    f"/api/leave/{leave.id}/approve",
                    json={
                        "status": "approved",
                        "comment": "测试审批"
                    }
                )
                
                # 验证返回 401 或 403
                assert response.status_code in [401, 403], \
                    f"未认证用户审批请假应返回 401/403，实际返回 {response.status_code}"
            finally:
                app.dependency_overrides.clear()

    def test_unauthenticated_cannot_add_vehicle(self):
        """
        测试未认证用户无法添加车辆
        
        验证：
        - 不提供 Token 无法添加车辆
        - 应返回 401 或 403 错误
        
        **Validates: Requirements 4.3**
        """
        engine = create_test_db()
        with Session(engine) as session:
            client = create_test_client_with_session(session)
            
            try:
                # 创建仓库用于测试
                warehouse = WarehouseFactory.create(session)
                
                # 不提供认证头，尝试添加车辆
                response = client.post(
                    "/api/vehicles",
                    json={
                        "license_plate": "川A12345",
                        "brand": "丰田",
                        "model": "卡罗拉",
                        "color": "白色",
                        "warehouse_id": warehouse.id,
                        "ownership_type": "company"
                    }
                )
                
                # 验证返回 401 或 403
                assert response.status_code in [401, 403], \
                    f"未认证用户添加车辆应返回 401/403，实际返回 {response.status_code}"
            finally:
                app.dependency_overrides.clear()

    def test_unauthenticated_cannot_get_vehicle_list(self):
        """
        测试未认证用户无法获取车辆列表
        
        验证：
        - 不提供 Token 无法获取车辆列表
        - 应返回 401 或 403 错误
        
        **Validates: Requirements 4.3**
        """
        engine = create_test_db()
        with Session(engine) as session:
            client = create_test_client_with_session(session)
            
            try:
                # 不提供认证头，尝试获取车辆列表
                response = client.get("/api/vehicles")
                
                # 验证返回 401 或 403
                assert response.status_code in [401, 403], \
                    f"未认证用户获取车辆列表应返回 401/403，实际返回 {response.status_code}"
            finally:
                app.dependency_overrides.clear()

    def test_unauthenticated_cannot_review_vehicle(self):
        """
        测试未认证用户无法审核车辆
        
        验证：
        - 不提供 Token 无法审核车辆
        - 应返回 401 或 403 错误
        
        **Validates: Requirements 4.3**
        """
        engine = create_test_db()
        with Session(engine) as session:
            client = create_test_client_with_session(session)
            
            try:
                # 创建一个车辆用于测试
                driver = UserFactory.create_driver(session)
                vehicle = VehicleFactory.create(session, driver)
                
                # 不提供认证头，尝试审核车辆
                response = client.put(
                    f"/api/vehicles/{vehicle.id}/review",
                    json={
                        "status": "active",
                        "comment": "测试审核"
                    }
                )
                
                # 验证返回 401 或 403
                assert response.status_code in [401, 403], \
                    f"未认证用户审核车辆应返回 401/403，实际返回 {response.status_code}"
            finally:
                app.dependency_overrides.clear()

    def test_unauthenticated_cannot_return_vehicle(self):
        """
        测试未认证用户无法执行还车操作
        
        验证：
        - 不提供 Token 无法执行还车操作
        - 应返回 401 或 403 错误
        
        **Validates: Requirements 4.3**
        """
        engine = create_test_db()
        with Session(engine) as session:
            client = create_test_client_with_session(session)
            
            try:
                # 创建一个使用中的车辆用于测试
                driver = UserFactory.create_driver(session)
                vehicle = VehicleFactory.create(
                    session, 
                    driver,
                    status=VehicleStatus.ACTIVE
                )
                
                # 不提供认证头，尝试还车
                response = client.post(
                    f"/api/vehicles/{vehicle.id}/return",
                    json={
                        "return_date": "2025-01-15",
                        "reason": "测试还车"
                    }
                )
                
                # 验证返回 401 或 403
                assert response.status_code in [401, 403], \
                    f"未认证用户还车应返回 401/403，实际返回 {response.status_code}"
            finally:
                app.dependency_overrides.clear()
