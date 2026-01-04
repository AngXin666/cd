"""
用户管理功能属性测试模块
使用 Hypothesis 进行属性测试，验证用户管理功能的正确性

测试覆盖：
- Property 1: 管理员创建用户权限 (Requirements 1.1, 1.2)
- Property 2: 用户名唯一性约束 (Requirements 1.6)
- Property 3: 用户创建输入验证 (Requirements 1.7, 1.8)

Requirements: 用户管理功能全面测试
"""

import pytest
from hypothesis import given, settings, assume, HealthCheck
from hypothesis import strategies as st
from fastapi.testclient import TestClient
from sqlmodel import Session

# 导入测试工具
from tests.strategies import (
    user_create_data_strategy,
    valid_user_create_data_strategy,
    invalid_role_user_data_strategy,
    missing_field_user_data_strategy,
    username_strategy,
    password_strategy,
    name_strategy,
    phone_strategy,
    all_roles_strategy,
    creatable_by_boss_strategy,
    creatable_by_peer_admin_strategy,
    can_create_role,
    get_creatable_roles_for
)
from tests.factories import UserFactory, WarehouseFactory
from tests.helpers import get_auth_headers

# 导入模型和认证模块
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models import User, UserRole
from auth import create_access_token


# ==================== Property 1: 管理员创建用户权限 ====================
# **Validates: Requirements 1.1, 1.2**
# *For any* 管理员角色（老板或调度）和任意有效用户数据，
# 当管理员创建权限范围内的角色用户时，系统应成功创建用户并返回用户信息。


class TestAdminCreateUserPermission:
    """
    Property 1: 管理员创建用户权限
    
    测试管理员（老板、调度）创建用户的权限正确性
    **Validates: Requirements 1.1, 1.2**
    """

    @settings(max_examples=100, suppress_health_check=[HealthCheck.too_slow, HealthCheck.function_scoped_fixture])
    @given(
        target_role=creatable_by_boss_strategy,
        username=username_strategy,
        password=password_strategy,
        name=name_strategy,
        phone=phone_strategy
    )
    def test_boss_can_create_any_role(
        self,
        client: TestClient,
        session: Session,
        boss_user: User,
        boss_token: str,
        target_role: UserRole,
        username: str,
        password: str,
        name: str,
        phone: str
    ):
        """
        Property 1.1: 老板可以创建任意角色用户
        
        *For any* 有效用户数据和任意角色，老板创建用户应成功
        **Feature: user-management-testing, Property 1: 管理员创建用户权限**
        **Validates: Requirements 1.1**
        """
        # 确保用户名唯一
        test_username = f"prop1_{username}_{target_role.value}"
        assume(len(test_username) <= 50)
        
        user_data = {
            "username": test_username,
            "password": password,
            "name": name,
            "phone": phone,
            "role": target_role.value
        }

        response = client.post(
            "/api/users",
            json=user_data,
            headers=get_auth_headers(boss_token)
        )

        # 老板应该能创建任意角色
        assert response.status_code in [200, 201], \
            f"老板创建 {target_role.value} 失败: {response.text}"
        
        data = response.json()
        assert data["username"] == test_username
        assert data["role"] == target_role.value
        assert "password" not in data  # 不应返回密码

    @settings(max_examples=100, suppress_health_check=[HealthCheck.too_slow, HealthCheck.function_scoped_fixture])
    @given(
        target_role=creatable_by_peer_admin_strategy,
        username=username_strategy,
        password=password_strategy,
        name=name_strategy,
        phone=phone_strategy
    )
    def test_peer_admin_can_create_allowed_roles(
        self,
        client: TestClient,
        session: Session,
        peer_admin_user: User,
        peer_admin_token: str,
        target_role: UserRole,
        username: str,
        password: str,
        name: str,
        phone: str
    ):
        """
        Property 1.2: 调度可以创建车队长和司机
        
        *For any* 有效用户数据和允许的角色（车队长、司机），调度创建用户应成功
        **Feature: user-management-testing, Property 1: 管理员创建用户权限**
        **Validates: Requirements 1.2**
        """
        test_username = f"prop1_pa_{username}_{target_role.value}"
        assume(len(test_username) <= 50)
        
        user_data = {
            "username": test_username,
            "password": password,
            "name": name,
            "phone": phone,
            "role": target_role.value
        }

        response = client.post(
            "/api/users",
            json=user_data,
            headers=get_auth_headers(peer_admin_token)
        )

        # 调度应该能创建车队长和司机
        assert response.status_code in [200, 201], \
            f"调度创建 {target_role.value} 失败: {response.text}"
        
        data = response.json()
        assert data["username"] == test_username
        assert data["role"] == target_role.value

    @settings(max_examples=50, suppress_health_check=[HealthCheck.too_slow, HealthCheck.function_scoped_fixture])
    @given(
        username=username_strategy,
        password=password_strategy,
        name=name_strategy,
        phone=phone_strategy
    )
    def test_peer_admin_cannot_create_boss(
        self,
        client: TestClient,
        session: Session,
        peer_admin_user: User,
        peer_admin_token: str,
        username: str,
        password: str,
        name: str,
        phone: str
    ):
        """
        Property 1.3: 调度不能创建老板
        
        *For any* 有效用户数据，调度尝试创建老板应返回权限不足错误
        **Feature: user-management-testing, Property 1: 管理员创建用户权限**
        **Validates: Requirements 1.3**
        """
        test_username = f"prop1_boss_{username}"
        assume(len(test_username) <= 50)
        
        user_data = {
            "username": test_username,
            "password": password,
            "name": name,
            "phone": phone,
            "role": "boss"
        }

        response = client.post(
            "/api/users",
            json=user_data,
            headers=get_auth_headers(peer_admin_token)
        )

        # 调度不能创建老板
        assert response.status_code == 403, \
            f"调度创建老板应返回 403，实际: {response.status_code}"


# ==================== Property 2: 用户名唯一性约束 ====================
# **Validates: Requirements 1.6**
# *For any* 已存在的用户名，当尝试创建相同用户名的用户时，系统应返回用户名重复错误。


class TestUsernameUniqueness:
    """
    Property 2: 用户名唯一性约束
    
    测试用户名唯一性约束的正确性
    **Validates: Requirements 1.6**
    """

    @settings(max_examples=100, suppress_health_check=[HealthCheck.too_slow])
    @given(
        username=username_strategy,
        password1=password_strategy,
        password2=password_strategy,
        name1=name_strategy,
        name2=name_strategy,
        phone1=phone_strategy,
        phone2=phone_strategy
    )
    def test_duplicate_username_rejected(
        self,
        client: TestClient,
        session: Session,
        boss_user: User,
        boss_token: str,
        username: str,
        password1: str,
        password2: str,
        name1: str,
        name2: str,
        phone1: str,
        phone2: str
    ):
        """
        Property 2: 重复用户名被拒绝
        
        *For any* 已存在的用户名，创建相同用户名的用户应返回错误
        **Feature: user-management-testing, Property 2: 用户名唯一性约束**
        **Validates: Requirements 1.6**
        """
        test_username = f"prop2_dup_{username}"
        assume(len(test_username) <= 50)
        
        # 第一次创建应成功
        user_data1 = {
            "username": test_username,
            "password": password1,
            "name": name1,
            "phone": phone1,
            "role": "driver"
        }

        response1 = client.post(
            "/api/users",
            json=user_data1,
            headers=get_auth_headers(boss_token)
        )
        assert response1.status_code in [200, 201], \
            f"第一次创建用户失败: {response1.text}"

        # 第二次使用相同用户名创建应失败
        user_data2 = {
            "username": test_username,  # 相同用户名
            "password": password2,
            "name": name2,
            "phone": phone2,
            "role": "driver"
        }

        response2 = client.post(
            "/api/users",
            json=user_data2,
            headers=get_auth_headers(boss_token)
        )

        # 应返回 400 或 409（用户名已存在）
        assert response2.status_code in [400, 409], \
            f"重复用户名应返回 400/409，实际: {response2.status_code}"


# ==================== Property 3: 用户创建输入验证 ====================
# **Validates: Requirements 1.7, 1.8**
# *For any* 无效的角色值或缺失必填字段的请求，系统应返回验证错误。


class TestUserCreateValidation:
    """
    Property 3: 用户创建输入验证
    
    测试用户创建时的输入验证正确性
    **Validates: Requirements 1.7, 1.8**
    """

    @settings(max_examples=100, suppress_health_check=[HealthCheck.too_slow])
    @given(data=invalid_role_user_data_strategy())
    def test_invalid_role_rejected(
        self,
        client: TestClient,
        session: Session,
        boss_user: User,
        boss_token: str,
        data: dict
    ):
        """
        Property 3.1: 无效角色被拒绝
        
        *For any* 无效的角色值，创建用户应返回验证错误
        **Feature: user-management-testing, Property 3: 用户创建输入验证**
        **Validates: Requirements 1.7**
        """
        # 确保用户名唯一
        data["username"] = f"prop3_inv_{data['username']}"
        assume(len(data["username"]) <= 50)

        response = client.post(
            "/api/users",
            json=data,
            headers=get_auth_headers(boss_token)
        )

        # 无效角色应返回 422 验证错误
        assert response.status_code == 422, \
            f"无效角色应返回 422，实际: {response.status_code}, 响应: {response.text}"

    @settings(max_examples=100, suppress_health_check=[HealthCheck.too_slow])
    @given(data=missing_field_user_data_strategy())
    def test_missing_required_fields_rejected(
        self,
        client: TestClient,
        session: Session,
        boss_user: User,
        boss_token: str,
        data: dict
    ):
        """
        Property 3.2: 缺少必填字段被拒绝
        
        *For any* 缺少必填字段（username, password, name）的请求，应返回验证错误
        **Feature: user-management-testing, Property 3: 用户创建输入验证**
        **Validates: Requirements 1.8**
        """
        # 检查是否缺少必填字段
        required_fields = ["username", "password", "name"]
        missing_fields = [f for f in required_fields if f not in data]
        
        # 只有当确实缺少必填字段时才测试
        assume(len(missing_fields) > 0)

        response = client.post(
            "/api/users",
            json=data,
            headers=get_auth_headers(boss_token)
        )

        # 缺少必填字段应返回 422 验证错误
        assert response.status_code == 422, \
            f"缺少必填字段应返回 422，实际: {response.status_code}, 缺少: {missing_fields}"



# ==================== Property 4: 管理员更新用户权限 ====================
# **Validates: Requirements 2.1, 2.3**
# *For any* 管理员角色和权限范围内的目标用户，
# 当管理员更新用户信息时，系统应成功更新并返回更新后的信息。


class TestAdminUpdateUserPermission:
    """
    Property 4: 管理员更新用户权限

    测试管理员（老板、调度）更新用户的权限正确性
    **Validates: Requirements 2.1, 2.3**
    """

    @settings(max_examples=100, suppress_health_check=[HealthCheck.too_slow])
    @given(
        target_role=creatable_by_boss_strategy,
        new_name=name_strategy,
        new_phone=phone_strategy
    )
    def test_boss_can_update_any_role(
        self,
        client: TestClient,
        session: Session,
        boss_user: User,
        boss_token: str,
        target_role: UserRole,
        new_name: str,
        new_phone: str
    ):
        """
        Property 4.1: 老板可以更新任意角色用户

        *For any* 有效更新数据和任意角色用户，老板更新用户应成功
        **Feature: user-management-testing, Property 4: 管理员更新用户权限**
        **Validates: Requirements 2.1**
        """
        # 创建目标用户
        target_username = f"prop4_boss_{target_role.value}_{new_name[:5]}"
        assume(len(target_username) <= 50)

        # 先创建用户
        create_data = {
            "username": target_username,
            "password": "test123456",
            "name": "原始姓名",
            "phone": "13800000000",
            "role": target_role.value
        }
        create_response = client.post(
            "/api/users",
            json=create_data,
            headers=get_auth_headers(boss_token)
        )
        assume(create_response.status_code in [200, 201])
        created_user = create_response.json()
        user_id = created_user["id"]

        # 更新用户
        update_data = {
            "name": new_name,
            "phone": new_phone
        }
        response = client.put(
            f"/api/users/{user_id}",
            json=update_data,
            headers=get_auth_headers(boss_token)
        )

        # 老板应该能更新任意角色用户
        assert response.status_code == 200, \
            f"老板更新 {target_role.value} 用户失败: {response.text}"

        data = response.json()
        assert data["name"] == new_name, f"姓名未更新: 期望 {new_name}, 实际 {data['name']}"
        assert data["phone"] == new_phone, f"手机号未更新: 期望 {new_phone}, 实际 {data['phone']}"

    @settings(max_examples=100, suppress_health_check=[HealthCheck.too_slow])
    @given(
        target_role=creatable_by_peer_admin_strategy,
        new_name=name_strategy,
        new_phone=phone_strategy
    )
    def test_peer_admin_can_update_allowed_roles(
        self,
        client: TestClient,
        session: Session,
        peer_admin_user: User,
        peer_admin_token: str,
        boss_user: User,
        boss_token: str,
        target_role: UserRole,
        new_name: str,
        new_phone: str
    ):
        """
        Property 4.2: 调度可以更新车队长和司机

        *For any* 有效更新数据和允许的角色（车队长、司机），调度更新用户应成功
        **Feature: user-management-testing, Property 4: 管理员更新用户权限**
        **Validates: Requirements 2.3**
        """
        # 创建目标用户（使用老板创建，确保成功）
        target_username = f"prop4_pa_{target_role.value}_{new_name[:5]}"
        assume(len(target_username) <= 50)

        create_data = {
            "username": target_username,
            "password": "test123456",
            "name": "原始姓名",
            "phone": "13800000000",
            "role": target_role.value
        }
        create_response = client.post(
            "/api/users",
            json=create_data,
            headers=get_auth_headers(boss_token)
        )
        assume(create_response.status_code in [200, 201])
        created_user = create_response.json()
        user_id = created_user["id"]

        # 调度更新用户
        update_data = {
            "name": new_name,
            "phone": new_phone
        }
        response = client.put(
            f"/api/users/{user_id}",
            json=update_data,
            headers=get_auth_headers(peer_admin_token)
        )

        # 调度应该能更新车队长和司机
        assert response.status_code == 200, \
            f"调度更新 {target_role.value} 用户失败: {response.text}"

        data = response.json()
        assert data["name"] == new_name
        assert data["phone"] == new_phone

    @settings(max_examples=50, suppress_health_check=[HealthCheck.too_slow])
    @given(
        new_name=name_strategy,
        new_phone=phone_strategy
    )
    def test_peer_admin_cannot_update_boss(
        self,
        client: TestClient,
        session: Session,
        peer_admin_user: User,
        peer_admin_token: str,
        boss_user: User,
        boss_token: str,
        new_name: str,
        new_phone: str
    ):
        """
        Property 4.3: 调度不能更新老板

        *For any* 有效更新数据，调度尝试更新老板应返回权限不足错误
        **Feature: user-management-testing, Property 4: 管理员更新用户权限**
        **Validates: Requirements 2.4**
        """
        # 创建另一个老板用户
        target_username = f"prop4_boss_target_{new_name[:5]}"
        assume(len(target_username) <= 50)

        create_data = {
            "username": target_username,
            "password": "test123456",
            "name": "老板用户",
            "phone": "13800000000",
            "role": "boss"
        }
        create_response = client.post(
            "/api/users",
            json=create_data,
            headers=get_auth_headers(boss_token)
        )
        assume(create_response.status_code in [200, 201])
        created_user = create_response.json()
        user_id = created_user["id"]

        # 调度尝试更新老板
        update_data = {
            "name": new_name,
            "phone": new_phone
        }
        response = client.put(
            f"/api/users/{user_id}",
            json=update_data,
            headers=get_auth_headers(peer_admin_token)
        )

        # 调度不能更新老板
        assert response.status_code == 403, \
            f"调度更新老板应返回 403，实际: {response.status_code}"


# ==================== Property 5: 车队长仓库范围权限 ====================
# **Validates: Requirements 2.5, 2.6**
# *For any* 车队长和其所辖仓库的司机，车队长应能成功更新该司机信息；
# 对于非所辖仓库的司机，应返回仓库权限错误。


class TestManagerWarehousePermission:
    """
    Property 5: 车队长仓库范围权限

    测试车队长更新司机的仓库范围权限正确性
    **Validates: Requirements 2.5, 2.6**
    """

    @settings(max_examples=100, suppress_health_check=[HealthCheck.too_slow])
    @given(
        new_name=name_strategy,
        new_phone=phone_strategy
    )
    def test_manager_can_update_driver_in_same_warehouse(
        self,
        client: TestClient,
        session: Session,
        manager_user: User,
        manager_token: str,
        boss_user: User,
        boss_token: str,
        test_warehouse: "Warehouse",
        new_name: str,
        new_phone: str
    ):
        """
        Property 5.1: 车队长可以更新所辖仓库的司机

        *For any* 有效更新数据和所辖仓库的司机，车队长更新司机应成功
        **Feature: user-management-testing, Property 5: 车队长仓库范围权限**
        **Validates: Requirements 2.5**
        """
        from tests.factories import UserFactory, WarehouseFactory

        # 将车队长分配到测试仓库
        WarehouseFactory.assign_user(session, manager_user, test_warehouse)

        # 创建司机并分配到同一仓库
        driver_username = f"prop5_driver_{new_name[:5]}"
        assume(len(driver_username) <= 50)

        driver = UserFactory.create_driver(
            session,
            username=driver_username,
            name="原始司机姓名"
        )
        WarehouseFactory.assign_user(session, driver, test_warehouse)

        # 车队长更新司机信息（使用 driver-info 接口）
        update_data = {
            "name": new_name,
            "phone": new_phone
        }
        response = client.put(
            f"/api/users/{driver.id}/driver-info",
            json=update_data,
            headers=get_auth_headers(manager_token)
        )

        # 车队长应该能更新所辖仓库的司机
        assert response.status_code == 200, \
            f"车队长更新所辖仓库司机失败: {response.text}"

        data = response.json()
        assert data["name"] == new_name
        assert data["phone"] == new_phone

    @settings(max_examples=100, suppress_health_check=[HealthCheck.too_slow])
    @given(
        new_name=name_strategy,
        new_phone=phone_strategy
    )
    def test_manager_cannot_update_driver_in_different_warehouse(
        self,
        client: TestClient,
        session: Session,
        manager_user: User,
        manager_token: str,
        boss_user: User,
        boss_token: str,
        test_warehouse: "Warehouse",
        test_warehouse_2: "Warehouse",
        new_name: str,
        new_phone: str
    ):
        """
        Property 5.2: 车队长不能更新非所辖仓库的司机

        *For any* 有效更新数据和非所辖仓库的司机，车队长更新应返回仓库权限错误
        **Feature: user-management-testing, Property 5: 车队长仓库范围权限**
        **Validates: Requirements 2.6**
        """
        from tests.factories import UserFactory, WarehouseFactory

        # 将车队长分配到测试仓库1
        WarehouseFactory.assign_user(session, manager_user, test_warehouse)

        # 创建司机并分配到测试仓库2（不同仓库）
        driver_username = f"prop5_other_{new_name[:5]}"
        assume(len(driver_username) <= 50)

        driver = UserFactory.create_driver(
            session,
            username=driver_username,
            name="其他仓库司机"
        )
        WarehouseFactory.assign_user(session, driver, test_warehouse_2)

        # 车队长尝试更新非所辖仓库的司机
        update_data = {
            "name": new_name,
            "phone": new_phone
        }
        response = client.put(
            f"/api/users/{driver.id}/driver-info",
            json=update_data,
            headers=get_auth_headers(manager_token)
        )

        # 车队长不能更新非所辖仓库的司机
        assert response.status_code == 403, \
            f"车队长更新非所辖仓库司机应返回 403，实际: {response.status_code}"

    @settings(max_examples=50, suppress_health_check=[HealthCheck.too_slow])
    @given(
        new_name=name_strategy,
        new_phone=phone_strategy
    )
    def test_manager_cannot_update_non_driver(
        self,
        client: TestClient,
        session: Session,
        manager_user: User,
        manager_token: str,
        boss_user: User,
        boss_token: str,
        test_warehouse: "Warehouse",
        new_name: str,
        new_phone: str
    ):
        """
        Property 5.3: 车队长不能更新非司机角色用户

        *For any* 有效更新数据和非司机角色用户，车队长更新应返回权限不足错误
        **Feature: user-management-testing, Property 5: 车队长仓库范围权限**
        **Validates: Requirements 2.7**
        """
        from tests.factories import UserFactory, WarehouseFactory

        # 将车队长分配到测试仓库
        WarehouseFactory.assign_user(session, manager_user, test_warehouse)

        # 创建另一个车队长并分配到同一仓库
        other_manager_username = f"prop5_mgr_{new_name[:5]}"
        assume(len(other_manager_username) <= 50)

        other_manager = UserFactory.create_manager(
            session,
            username=other_manager_username,
            name="其他车队长"
        )
        WarehouseFactory.assign_user(session, other_manager, test_warehouse)

        # 车队长尝试更新另一个车队长
        update_data = {
            "name": new_name,
            "phone": new_phone
        }
        response = client.put(
            f"/api/users/{other_manager.id}/driver-info",
            json=update_data,
            headers=get_auth_headers(manager_token)
        )

        # 车队长不能更新非司机角色
        assert response.status_code == 403, \
            f"车队长更新非司机角色应返回 403，实际: {response.status_code}"



# ==================== Property 9: 仓库分配替换语义 ====================
# **Validates: Requirements 5.1, 5.2**
# *For any* 用户和新的仓库ID列表，分配仓库后查询该用户的仓库应返回完全相同的仓库列表（替换而非追加）。


class TestWarehouseAssignmentReplaceSemantics:
    """
    Property 9: 仓库分配替换语义

    测试仓库分配的替换语义正确性
    **Validates: Requirements 5.1, 5.2**
    """

    def test_boss_assign_warehouses_replaces_existing(
        self,
        client: TestClient,
        session: Session,
        boss_user: User,
        boss_token: str,
        test_warehouse: "Warehouse",
        test_warehouse_2: "Warehouse"
    ):
        """
        Property 9.1: 老板分配仓库替换现有分配

        测试老板给用户分配仓库时，新分配应替换旧分配
        **Feature: user-management-testing, Property 9: 仓库分配替换语义**
        **Validates: Requirements 5.1**
        """
        from tests.factories import UserFactory

        # 创建司机
        driver = UserFactory.create_driver(
            session,
            username="prop9_driver_replace",
            name="测试司机"
        )

        # 第一次分配：分配到仓库1
        response1 = client.post(
            f"/api/users/{driver.id}/warehouses",
            json={"warehouse_ids": [test_warehouse.id]},
            headers=get_auth_headers(boss_token)
        )
        assert response1.status_code == 200, f"第一次分配失败: {response1.text}"

        # 验证第一次分配结果
        query_response1 = client.get(
            f"/api/users/{driver.id}/warehouses",
            headers=get_auth_headers(boss_token)
        )
        assert query_response1.status_code == 200
        warehouses1 = query_response1.json()
        assert len(warehouses1) == 1
        assert warehouses1[0]["id"] == test_warehouse.id

        # 第二次分配：分配到仓库2（应替换仓库1）
        response2 = client.post(
            f"/api/users/{driver.id}/warehouses",
            json={"warehouse_ids": [test_warehouse_2.id]},
            headers=get_auth_headers(boss_token)
        )
        assert response2.status_code == 200, f"第二次分配失败: {response2.text}"

        # 验证第二次分配结果（应只有仓库2，仓库1被替换）
        query_response2 = client.get(
            f"/api/users/{driver.id}/warehouses",
            headers=get_auth_headers(boss_token)
        )
        assert query_response2.status_code == 200
        warehouses2 = query_response2.json()
        assert len(warehouses2) == 1, f"期望1个仓库，实际: {len(warehouses2)}"
        assert warehouses2[0]["id"] == test_warehouse_2.id, \
            f"期望仓库ID {test_warehouse_2.id}，实际: {warehouses2[0]['id']}"

    def test_assign_multiple_warehouses(
        self,
        client: TestClient,
        session: Session,
        boss_user: User,
        boss_token: str,
        test_warehouse: "Warehouse",
        test_warehouse_2: "Warehouse"
    ):
        """
        Property 9.2: 可以同时分配多个仓库

        测试一次分配多个仓库的功能
        **Feature: user-management-testing, Property 9: 仓库分配替换语义**
        **Validates: Requirements 5.1**
        """
        from tests.factories import UserFactory

        # 创建司机
        driver = UserFactory.create_driver(
            session,
            username="prop9_driver_multi",
            name="多仓库司机"
        )

        # 分配多个仓库
        warehouse_ids = [test_warehouse.id, test_warehouse_2.id]
        response = client.post(
            f"/api/users/{driver.id}/warehouses",
            json={"warehouse_ids": warehouse_ids},
            headers=get_auth_headers(boss_token)
        )
        assert response.status_code == 200, f"分配多个仓库失败: {response.text}"

        # 验证分配结果
        query_response = client.get(
            f"/api/users/{driver.id}/warehouses",
            headers=get_auth_headers(boss_token)
        )
        assert query_response.status_code == 200
        warehouses = query_response.json()
        assert len(warehouses) == 2, f"期望2个仓库，实际: {len(warehouses)}"
        
        assigned_ids = set(w["id"] for w in warehouses)
        expected_ids = set(warehouse_ids)
        assert assigned_ids == expected_ids, \
            f"分配的仓库ID不匹配: 期望 {expected_ids}，实际 {assigned_ids}"

    def test_assign_empty_list_clears_assignments(
        self,
        client: TestClient,
        session: Session,
        boss_user: User,
        boss_token: str,
        test_warehouse: "Warehouse"
    ):
        """
        Property 9.3: 分配空列表清除所有仓库分配

        测试分配空仓库列表时清除用户所有仓库分配
        **Feature: user-management-testing, Property 9: 仓库分配替换语义**
        **Validates: Requirements 5.7**
        """
        from tests.factories import UserFactory

        # 创建司机并分配仓库
        driver = UserFactory.create_driver(
            session,
            username="prop9_driver_clear",
            name="清除分配司机"
        )

        # 先分配一个仓库
        response1 = client.post(
            f"/api/users/{driver.id}/warehouses",
            json={"warehouse_ids": [test_warehouse.id]},
            headers=get_auth_headers(boss_token)
        )
        assert response1.status_code == 200

        # 验证已分配
        query_response1 = client.get(
            f"/api/users/{driver.id}/warehouses",
            headers=get_auth_headers(boss_token)
        )
        assert len(query_response1.json()) == 1

        # 分配空列表
        response2 = client.post(
            f"/api/users/{driver.id}/warehouses",
            json={"warehouse_ids": []},
            headers=get_auth_headers(boss_token)
        )
        assert response2.status_code == 200, f"分配空列表失败: {response2.text}"

        # 验证分配已清除
        query_response2 = client.get(
            f"/api/users/{driver.id}/warehouses",
            headers=get_auth_headers(boss_token)
        )
        assert query_response2.status_code == 200
        warehouses = query_response2.json()
        assert len(warehouses) == 0, f"期望0个仓库，实际: {len(warehouses)}"


# ==================== Property 10: 车队长仓库分配范围限制 ====================
# **Validates: Requirements 5.3, 5.4**
# *For any* 车队长和其管理的仓库集合，车队长只能给司机分配其管理范围内的仓库。


class TestManagerWarehouseAssignmentScope:
    """
    Property 10: 车队长仓库分配范围限制

    测试车队长分配仓库的范围限制
    **Validates: Requirements 5.3, 5.4**
    """

    def test_manager_can_assign_managed_warehouse(
        self,
        client: TestClient,
        session: Session,
        manager_user: User,
        manager_token: str,
        boss_user: User,
        boss_token: str,
        test_warehouse: "Warehouse"
    ):
        """
        Property 10.1: 车队长可以分配其管理的仓库

        测试车队长给司机分配其管理范围内的仓库
        **Feature: user-management-testing, Property 10: 车队长仓库分配范围限制**
        **Validates: Requirements 5.3**
        """
        from tests.factories import UserFactory, WarehouseFactory

        # 将车队长分配到测试仓库
        WarehouseFactory.assign_user(session, manager_user, test_warehouse)

        # 创建司机
        driver = UserFactory.create_driver(
            session,
            username="prop10_driver_managed",
            name="受管司机"
        )

        # 车队长给司机分配其管理的仓库
        response = client.post(
            f"/api/users/{driver.id}/warehouses",
            json={"warehouse_ids": [test_warehouse.id]},
            headers=get_auth_headers(manager_token)
        )
        assert response.status_code == 200, f"车队长分配管理仓库失败: {response.text}"

        # 验证分配结果
        query_response = client.get(
            f"/api/users/{driver.id}/warehouses",
            headers=get_auth_headers(manager_token)
        )
        assert query_response.status_code == 200
        warehouses = query_response.json()
        assert len(warehouses) == 1
        assert warehouses[0]["id"] == test_warehouse.id

    def test_manager_cannot_assign_unmanaged_warehouse(
        self,
        client: TestClient,
        session: Session,
        manager_user: User,
        manager_token: str,
        boss_user: User,
        boss_token: str,
        test_warehouse: "Warehouse",
        test_warehouse_2: "Warehouse"
    ):
        """
        Property 10.2: 车队长不能分配非管理的仓库

        测试车队长尝试分配非管理范围的仓库时返回权限错误
        **Feature: user-management-testing, Property 10: 车队长仓库分配范围限制**
        **Validates: Requirements 5.4**
        """
        from tests.factories import UserFactory, WarehouseFactory

        # 将车队长分配到测试仓库1（不分配到仓库2）
        WarehouseFactory.assign_user(session, manager_user, test_warehouse)

        # 创建司机
        driver = UserFactory.create_driver(
            session,
            username="prop10_driver_unmanaged",
            name="测试司机"
        )

        # 车队长尝试分配非管理的仓库2
        response = client.post(
            f"/api/users/{driver.id}/warehouses",
            json={"warehouse_ids": [test_warehouse_2.id]},
            headers=get_auth_headers(manager_token)
        )
        
        # 应返回 403 权限不足
        assert response.status_code == 403, \
            f"车队长分配非管理仓库应返回 403，实际: {response.status_code}"

    def test_manager_cannot_assign_to_non_driver(
        self,
        client: TestClient,
        session: Session,
        manager_user: User,
        manager_token: str,
        boss_user: User,
        boss_token: str,
        test_warehouse: "Warehouse"
    ):
        """
        Property 10.3: 车队长不能给非司机分配仓库

        测试车队长尝试给非司机角色分配仓库时返回权限错误
        **Feature: user-management-testing, Property 10: 车队长仓库分配范围限制**
        **Validates: Requirements 5.5**
        """
        from tests.factories import UserFactory, WarehouseFactory

        # 将车队长分配到测试仓库
        WarehouseFactory.assign_user(session, manager_user, test_warehouse)

        # 创建另一个车队长
        other_manager = UserFactory.create_manager(
            session,
            username="prop10_other_manager",
            name="其他车队长"
        )

        # 车队长尝试给另一个车队长分配仓库
        response = client.post(
            f"/api/users/{other_manager.id}/warehouses",
            json={"warehouse_ids": [test_warehouse.id]},
            headers=get_auth_headers(manager_token)
        )
        
        # 应返回 403 权限不足
        assert response.status_code == 403, \
            f"车队长给非司机分配仓库应返回 403，实际: {response.status_code}"


# ==================== Property 11: 仓库分配查询一致性 ====================
# **Validates: Requirements 5.8**
# *For any* 用户和分配的仓库列表，分配后立即查询应返回相同的仓库列表。


class TestWarehouseAssignmentQueryConsistency:
    """
    Property 11: 仓库分配查询一致性

    测试仓库分配后查询的一致性
    **Validates: Requirements 5.8**
    """

    def test_assignment_query_consistency_single(
        self,
        client: TestClient,
        session: Session,
        boss_user: User,
        boss_token: str,
        test_warehouse: "Warehouse"
    ):
        """
        Property 11.1: 分配后查询一致性（单仓库）

        测试分配单个仓库后立即查询返回相同结果
        **Feature: user-management-testing, Property 11: 仓库分配查询一致性**
        **Validates: Requirements 5.8**
        """
        from tests.factories import UserFactory

        # 创建司机
        driver = UserFactory.create_driver(
            session,
            username="prop11_single",
            name="一致性测试司机"
        )

        # 分配仓库
        response = client.post(
            f"/api/users/{driver.id}/warehouses",
            json={"warehouse_ids": [test_warehouse.id]},
            headers=get_auth_headers(boss_token)
        )
        assert response.status_code == 200, f"分配仓库失败: {response.text}"

        # 立即查询
        query_response = client.get(
            f"/api/users/{driver.id}/warehouses",
            headers=get_auth_headers(boss_token)
        )
        assert query_response.status_code == 200

        # 验证一致性
        queried_warehouses = query_response.json()
        assert len(queried_warehouses) == 1
        assert queried_warehouses[0]["id"] == test_warehouse.id

    def test_assignment_query_consistency_multiple(
        self,
        client: TestClient,
        session: Session,
        boss_user: User,
        boss_token: str,
        test_warehouse: "Warehouse",
        test_warehouse_2: "Warehouse"
    ):
        """
        Property 11.1b: 分配后查询一致性（多仓库）

        测试分配多个仓库后立即查询返回相同结果
        **Feature: user-management-testing, Property 11: 仓库分配查询一致性**
        **Validates: Requirements 5.8**
        """
        from tests.factories import UserFactory

        # 创建司机
        driver = UserFactory.create_driver(
            session,
            username="prop11_multi",
            name="多仓库一致性司机"
        )

        warehouse_ids = [test_warehouse.id, test_warehouse_2.id]

        # 分配仓库
        response = client.post(
            f"/api/users/{driver.id}/warehouses",
            json={"warehouse_ids": warehouse_ids},
            headers=get_auth_headers(boss_token)
        )
        assert response.status_code == 200

        # 立即查询
        query_response = client.get(
            f"/api/users/{driver.id}/warehouses",
            headers=get_auth_headers(boss_token)
        )
        assert query_response.status_code == 200

        # 验证一致性
        queried_warehouses = query_response.json()
        queried_ids = set(w["id"] for w in queried_warehouses)
        expected_ids = set(warehouse_ids)
        assert queried_ids == expected_ids

    def test_assign_nonexistent_warehouse_fails(
        self,
        client: TestClient,
        session: Session,
        boss_user: User,
        boss_token: str
    ):
        """
        Property 11.2: 分配不存在的仓库失败

        测试分配不存在的仓库时返回错误
        **Feature: user-management-testing, Property 11: 仓库分配查询一致性**
        **Validates: Requirements 5.6**
        """
        from tests.factories import UserFactory

        # 创建司机
        driver = UserFactory.create_driver(
            session,
            username="prop11_driver_nonexistent",
            name="测试司机"
        )

        # 尝试分配不存在的仓库ID
        nonexistent_id = 99999
        response = client.post(
            f"/api/users/{driver.id}/warehouses",
            json={"warehouse_ids": [nonexistent_id]},
            headers=get_auth_headers(boss_token)
        )
        
        # 应返回 400 错误
        assert response.status_code == 400, \
            f"分配不存在的仓库应返回 400，实际: {response.status_code}"

    def test_assign_to_nonexistent_user_fails(
        self,
        client: TestClient,
        session: Session,
        boss_user: User,
        boss_token: str,
        test_warehouse: "Warehouse"
    ):
        """
        Property 11.3: 给不存在的用户分配仓库失败

        测试给不存在的用户分配仓库时返回错误
        **Feature: user-management-testing, Property 11: 仓库分配查询一致性**
        **Validates: Requirements 5.6**
        """
        # 尝试给不存在的用户分配仓库
        nonexistent_user_id = 99999
        response = client.post(
            f"/api/users/{nonexistent_user_id}/warehouses",
            json={"warehouse_ids": [test_warehouse.id]},
            headers=get_auth_headers(boss_token)
        )
        
        # 应返回 404 错误
        assert response.status_code == 404, \
            f"给不存在的用户分配仓库应返回 404，实际: {response.status_code}"
