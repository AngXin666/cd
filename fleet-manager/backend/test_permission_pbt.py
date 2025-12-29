"""
权限检查函数属性测试
使用 hypothesis 进行属性测试，验证权限检查函数的正确性

测试属性：
- Property 1: 司机只能访问自己的车辆
- Property 2: 管理角色可以访问任意车辆
- Property 3: 非超级管理员不能操作高权限角色
- Property 4: 车队长只能操作其仓库的司机
- Property 5: 资源所有权检查返回统一格式错误
- Property 6: 权限检查失败记录日志
"""

import pytest
from hypothesis import given, strategies as st, settings, assume
from unittest.mock import MagicMock, patch
from dataclasses import dataclass
from typing import Optional, List

from auth import (
    PermissionErrorCode,
    PermissionError,
    check_resource_ownership,
    check_vehicle_ownership,
    require_super_admin_for_high_roles,
    check_manager_warehouse_access,
    has_management_permission,
)
from models import UserRole


# ==================== 测试数据生成策略 ====================

# 用户角色策略
driver_role = st.just(UserRole.DRIVER)
manager_role = st.just(UserRole.MANAGER)
peer_admin_role = st.just(UserRole.PEER_ADMIN)
boss_role = st.just(UserRole.BOSS)
super_admin_role = st.just(UserRole.SUPER_ADMIN)

# 管理角色策略（车队长、调度、老板、超级管理员）
management_roles = st.sampled_from([
    UserRole.MANAGER,
    UserRole.PEER_ADMIN,
    UserRole.BOSS,
    UserRole.SUPER_ADMIN
])

# 非超级管理员角色策略
non_super_admin_roles = st.sampled_from([
    UserRole.DRIVER,
    UserRole.MANAGER,
    UserRole.PEER_ADMIN,
    UserRole.BOSS
])

# 高权限角色策略（老板、超级管理员）
high_roles = st.sampled_from([UserRole.BOSS, UserRole.SUPER_ADMIN])

# 所有角色策略
all_roles = st.sampled_from([
    UserRole.DRIVER,
    UserRole.MANAGER,
    UserRole.PEER_ADMIN,
    UserRole.BOSS,
    UserRole.SUPER_ADMIN
])

# 用户 ID 策略
user_ids = st.integers(min_value=1, max_value=10000)


@dataclass
class MockUser:
    """模拟用户对象"""
    id: int
    role: UserRole
    is_active: bool = True


@dataclass
class MockResource:
    """模拟资源对象（如车辆、计件记录等）"""
    id: int
    user_id: int


@dataclass
class MockWarehouse:
    """模拟仓库对象"""
    id: int


# ==================== Property 1 & 2: 车辆所有权检查 ====================

@given(
    driver_id=user_ids,
    vehicle_owner_id=user_ids
)
@settings(max_examples=50)
def test_property_driver_can_only_access_own_vehicle(driver_id: int, vehicle_owner_id: int):
    """
    Property 1: 司机只能访问自己的车辆
    
    当司机不是车辆所有者时，访问该车辆应返回 403 错误
    """
    # 假设司机不是车辆所有者
    assume(driver_id != vehicle_owner_id)
    
    # 创建司机用户
    driver = MockUser(id=driver_id, role=UserRole.DRIVER)
    
    # 创建车辆（属于其他用户）
    vehicle = MockResource(id=1, user_id=vehicle_owner_id)
    
    # 验证：司机访问非自己的车辆应抛出 PermissionError
    with pytest.raises(PermissionError) as exc_info:
        check_vehicle_ownership(vehicle, driver)
    
    # 验证错误代码
    assert exc_info.value.error_code == PermissionErrorCode.RESOURCE_NOT_OWNED
    assert "车辆" in exc_info.value.message


@given(
    driver_id=user_ids
)
@settings(max_examples=50)
def test_property_driver_can_access_own_vehicle(driver_id: int):
    """
    Property 1 补充: 司机可以访问自己的车辆
    """
    # 创建司机用户
    driver = MockUser(id=driver_id, role=UserRole.DRIVER)
    
    # 创建车辆（属于该司机）
    vehicle = MockResource(id=1, user_id=driver_id)
    
    # 验证：司机访问自己的车辆不应抛出异常
    check_vehicle_ownership(vehicle, driver)  # 不应抛出异常


@given(
    management_role=management_roles,
    manager_id=user_ids,
    vehicle_owner_id=user_ids
)
@settings(max_examples=50)
def test_property_management_can_access_any_vehicle(
    management_role: UserRole,
    manager_id: int,
    vehicle_owner_id: int
):
    """
    Property 2: 管理角色可以访问任意车辆
    
    管理角色（车队长、调度、老板、超级管理员）可以访问任意车辆
    """
    # 创建管理角色用户
    manager = MockUser(id=manager_id, role=management_role)
    
    # 创建车辆（属于任意用户）
    vehicle = MockResource(id=1, user_id=vehicle_owner_id)
    
    # 验证：管理角色访问任意车辆不应抛出异常
    check_vehicle_ownership(vehicle, manager)  # 不应抛出异常


# ==================== Property 3: 高权限角色操作检查 ====================

@given(
    non_super_admin_role=non_super_admin_roles,
    user_id=user_ids,
    target_role=high_roles
)
@settings(max_examples=50)
def test_property_non_super_admin_cannot_operate_high_roles(
    non_super_admin_role: UserRole,
    user_id: int,
    target_role: UserRole
):
    """
    Property 3: 非超级管理员不能操作高权限角色
    
    非超级管理员尝试创建/修改/删除老板或超级管理员角色应返回 403 错误
    """
    # 创建非超级管理员用户
    user = MockUser(id=user_id, role=non_super_admin_role)
    
    # 验证：非超级管理员操作高权限角色应抛出 PermissionError
    with pytest.raises(PermissionError) as exc_info:
        require_super_admin_for_high_roles(target_role, user, "创建")
    
    # 验证错误代码
    assert exc_info.value.error_code == PermissionErrorCode.HIGH_ROLE_OPERATION
    assert "超级管理员" in exc_info.value.message


@given(
    user_id=user_ids,
    target_role=high_roles
)
@settings(max_examples=50)
def test_property_super_admin_can_operate_high_roles(
    user_id: int,
    target_role: UserRole
):
    """
    Property 3 补充: 超级管理员可以操作高权限角色
    """
    # 创建超级管理员用户
    super_admin = MockUser(id=user_id, role=UserRole.SUPER_ADMIN)
    
    # 验证：超级管理员操作高权限角色不应抛出异常
    require_super_admin_for_high_roles(target_role, super_admin, "创建")  # 不应抛出异常


# ==================== Property 4: 车队长仓库权限检查 ====================

@given(
    manager_id=user_ids,
    driver_id=user_ids,
    manager_warehouse_ids=st.lists(st.integers(min_value=1, max_value=100), min_size=1, max_size=5),
    driver_warehouse_ids=st.lists(st.integers(min_value=1, max_value=100), min_size=1, max_size=5)
)
@settings(max_examples=50)
def test_property_manager_cannot_operate_driver_outside_warehouse(
    manager_id: int,
    driver_id: int,
    manager_warehouse_ids: List[int],
    driver_warehouse_ids: List[int]
):
    """
    Property 4: 车队长只能操作其仓库的司机
    
    当司机不属于车队长管理的任何仓库时，操作该司机应返回 403 错误
    """
    # 假设仓库没有交集
    assume(not set(manager_warehouse_ids) & set(driver_warehouse_ids))
    assume(manager_id != driver_id)
    
    # 创建车队长用户
    manager = MockUser(id=manager_id, role=UserRole.MANAGER)
    
    # 创建司机用户
    driver = MockUser(id=driver_id, role=UserRole.DRIVER)
    
    # 模拟仓库数据
    manager_warehouses = [MockWarehouse(id=wid) for wid in manager_warehouse_ids]
    driver_warehouses = [MockWarehouse(id=wid) for wid in driver_warehouse_ids]
    
    # 模拟 crud.get_user_warehouses 函数
    def mock_get_user_warehouses(session, user_id):
        if user_id == manager_id:
            return manager_warehouses
        elif user_id == driver_id:
            return driver_warehouses
        return []
    
    # 使用 mock 替换 crud 模块（在函数内部导入时 mock）
    with patch.dict('sys.modules', {'crud': MagicMock()}):
        import sys
        sys.modules['crud'].get_user_warehouses = mock_get_user_warehouses
        mock_session = MagicMock()
        
        # 验证：车队长操作不属于其仓库的司机应抛出 PermissionError
        with pytest.raises(PermissionError) as exc_info:
            check_manager_warehouse_access(manager, driver, mock_session)
        
        # 验证错误代码
        assert exc_info.value.error_code == PermissionErrorCode.WAREHOUSE_NOT_ACCESSIBLE
        assert "仓库" in exc_info.value.message


@given(
    manager_id=user_ids,
    driver_id=user_ids,
    shared_warehouse_id=st.integers(min_value=1, max_value=100)
)
@settings(max_examples=50)
def test_property_manager_can_operate_driver_in_same_warehouse(
    manager_id: int,
    driver_id: int,
    shared_warehouse_id: int
):
    """
    Property 4 补充: 车队长可以操作其仓库的司机
    """
    assume(manager_id != driver_id)
    
    # 创建车队长用户
    manager = MockUser(id=manager_id, role=UserRole.MANAGER)
    
    # 创建司机用户
    driver = MockUser(id=driver_id, role=UserRole.DRIVER)
    
    # 模拟仓库数据（有共同仓库）
    shared_warehouse = MockWarehouse(id=shared_warehouse_id)
    
    def mock_get_user_warehouses(session, user_id):
        if user_id == manager_id:
            return [shared_warehouse]
        elif user_id == driver_id:
            return [shared_warehouse]
        return []
    
    with patch.dict('sys.modules', {'crud': MagicMock()}):
        import sys
        sys.modules['crud'].get_user_warehouses = mock_get_user_warehouses
        mock_session = MagicMock()
        
        # 验证：车队长操作其仓库的司机不应抛出异常
        check_manager_warehouse_access(manager, driver, mock_session)  # 不应抛出异常


@given(
    manager_id=user_ids,
    non_driver_id=user_ids,
    non_driver_role=st.sampled_from([UserRole.MANAGER, UserRole.PEER_ADMIN, UserRole.BOSS])
)
@settings(max_examples=50)
def test_property_manager_cannot_operate_non_driver(
    manager_id: int,
    non_driver_id: int,
    non_driver_role: UserRole
):
    """
    Property 4 补充: 车队长不能操作非司机用户
    """
    assume(manager_id != non_driver_id)
    
    # 创建车队长用户
    manager = MockUser(id=manager_id, role=UserRole.MANAGER)
    
    # 创建非司机用户
    non_driver = MockUser(id=non_driver_id, role=non_driver_role)
    
    mock_session = MagicMock()
    
    # 验证：车队长操作非司机用户应抛出 PermissionError
    with pytest.raises(PermissionError) as exc_info:
        check_manager_warehouse_access(manager, non_driver, mock_session)
    
    # 验证错误代码
    assert exc_info.value.error_code == PermissionErrorCode.ROLE_INSUFFICIENT
    assert "司机" in exc_info.value.message


# ==================== Property 5: 统一错误格式检查 ====================

@given(
    driver_id=user_ids,
    resource_owner_id=user_ids,
    resource_name=st.sampled_from(["车辆", "计件记录", "请假记录", "通知"])
)
@settings(max_examples=50)
def test_property_resource_ownership_error_format(
    driver_id: int,
    resource_owner_id: int,
    resource_name: str
):
    """
    Property 5: 资源所有权检查返回统一格式错误
    
    权限检查失败时，返回的错误信息应包含 error_code 和 message 字段
    """
    # 假设司机不是资源所有者
    assume(driver_id != resource_owner_id)
    
    # 创建司机用户
    driver = MockUser(id=driver_id, role=UserRole.DRIVER)
    
    # 创建资源
    resource = MockResource(id=1, user_id=resource_owner_id)
    
    # 验证错误格式
    with pytest.raises(PermissionError) as exc_info:
        check_resource_ownership(resource, driver, resource_name)
    
    # 验证错误包含 error_code 和 message
    error = exc_info.value
    assert hasattr(error, 'error_code')
    assert hasattr(error, 'message')
    assert error.error_code == PermissionErrorCode.RESOURCE_NOT_OWNED
    assert resource_name in error.message
    
    # 验证 detail 格式
    assert isinstance(error.detail, dict)
    assert 'error_code' in error.detail
    assert 'message' in error.detail


# ==================== Property 6: 日志记录检查 ====================

@given(
    driver_id=user_ids,
    resource_owner_id=user_ids
)
@settings(max_examples=20)
def test_property_permission_failure_logs_warning(
    driver_id: int,
    resource_owner_id: int
):
    """
    Property 6: 权限检查失败记录日志
    
    权限检查失败时，系统应记录包含用户ID、操作、资源的日志
    """
    # 假设司机不是资源所有者
    assume(driver_id != resource_owner_id)
    
    # 创建司机用户
    driver = MockUser(id=driver_id, role=UserRole.DRIVER)
    
    # 创建资源
    resource = MockResource(id=1, user_id=resource_owner_id)
    
    # 使用 mock 捕获日志
    with patch('auth.logger') as mock_logger:
        try:
            check_resource_ownership(resource, driver, "测试资源")
        except PermissionError:
            pass
        
        # 验证日志被调用
        mock_logger.warning.assert_called_once()
        
        # 验证日志内容包含关键信息
        log_message = mock_logger.warning.call_args[0][0]
        assert str(driver_id) in log_message  # 包含用户 ID
        assert str(resource_owner_id) in log_message  # 包含资源所有者 ID


# ==================== 辅助函数测试 ====================

@given(role=all_roles)
@settings(max_examples=20)
def test_has_management_permission_consistency(role: UserRole):
    """
    测试 has_management_permission 函数的一致性
    """
    result = has_management_permission(role)
    
    # 管理角色应返回 True
    if role in [UserRole.MANAGER, UserRole.PEER_ADMIN, UserRole.BOSS, UserRole.SUPER_ADMIN]:
        assert result is True
    else:
        assert result is False


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
