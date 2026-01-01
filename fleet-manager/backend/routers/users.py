"""
用户管理路由模块
提供用户 CRUD、司机信息更新、仓库分配等用户管理相关 API

Requirements: 9.1 - 提取用户管理路由到独立模块
"""

from datetime import datetime
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import Session

from database import get_session
from models import User, UserRole, is_role
from auth import (
    get_current_user,
    require_admin,
    require_management,
    PermissionErrorCode,
    PermissionError,
    require_super_admin_for_high_roles,
    check_manager_warehouse_access
)
import crud
from schemas import (
    MessageResponse,
    UserCreate,
    UserUpdate,
    UserResponse,
    DriverInfoUpdate,
    UserWarehouseAssignRequest,
    WarehouseResponse,
    DriverLicenseCreate,
    DriverLicenseUpdate,
    DriverLicenseResponse
)
from events import emit_user_update, emit_assignment_update


# 创建用户管理路由器
router = APIRouter(
    prefix="/api/users",
    tags=["用户管理"]
)


@router.get("", response_model=List[UserResponse])
async def get_users(
    role: Optional[UserRole] = None,
    is_active: Optional[bool] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user: User = Depends(require_management),
    session: Session = Depends(get_session)
):
    """
    获取用户列表（管理权限可访问：车队长、调度、老板、超级管理员）

    Args:
        role: 按角色过滤（可选）
        is_active: 按激活状态过滤（可选）
        skip: 跳过记录数，默认0
        limit: 返回记录数上限，默认100，最大1000
        current_user: 当前登录用户
        session: 数据库会话

    Returns:
        List[UserResponse]: 用户列表
    """
    users = crud.get_users(session, role=role, is_active=is_active, skip=skip, limit=limit)
    return users


@router.post("", response_model=UserResponse)
async def create_user(
    request: UserCreate,
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    """
    创建新用户（管理员级别可访问：调度、老板、超级管理员）

    Args:
        request: 用户创建请求
        current_user: 当前登录用户
        session: 数据库会话

    Returns:
        UserResponse: 创建的用户信息

    Raises:
        HTTPException 400: 用户名已存在
        HTTPException 403: 无权限创建高权限角色用户
    """
    # 检查用户名是否已存在
    existing = crud.get_user_by_username(session, request.username)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="用户名已存在"
        )

    # 权限控制：使用统一的高权限角色检查
    require_super_admin_for_high_roles(request.role, current_user, "创建")

    user = crud.create_user(
        session,
        username=request.username,
        password=request.password,
        name=request.name,
        phone=request.phone,
        role=request.role
    )
    return user


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    current_user: User = Depends(require_management),
    session: Session = Depends(get_session)
):
    """
    获取用户详情（管理权限可访问：车队长、调度、老板、超级管理员）

    Args:
        user_id: 用户ID
        current_user: 当前登录用户
        session: 数据库会话

    Returns:
        UserResponse: 用户详情

    Raises:
        HTTPException 404: 用户不存在
    """
    user = crud.get_user_by_id(session, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在"
        )
    return user


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    request: UserUpdate,
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    """
    更新用户信息（管理员级别可访问：调度、老板、超级管理员）

    当用户角色或状态发生变更时，会向该用户推送 user_update 事件，
    让用户及时了解账号状态变更。

    Requirements: 7.1, 7.2 - 用户状态实时通知

    Args:
        user_id: 用户ID
        request: 用户更新请求
        current_user: 当前登录用户
        session: 数据库会话

    Returns:
        UserResponse: 更新后的用户信息

    Raises:
        HTTPException 404: 用户不存在
        HTTPException 403: 无权限修改高权限角色用户
    """
    user = crud.get_user_by_id(session, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在"
        )

    # 记录更新前的状态，用于判断是否需要推送事件
    old_role = user.role
    old_is_active = user.is_active

    # 权限控制：使用统一的高权限角色检查
    # 检查是否有权修改当前用户（如果是老板或超级管理员）
    require_super_admin_for_high_roles(user.role, current_user, "修改")

    # 检查是否有权设置目标角色（如果要设置为老板或超级管理员）
    if request.role:
        require_super_admin_for_high_roles(request.role, current_user, "设置")

    updated_user = crud.update_user(
        session, user,
        name=request.name,
        phone=request.phone,
        role=request.role,
        is_active=request.is_active
    )

    # 检查角色或状态是否发生变更，如果变更则推送事件
    # Requirements: 7.1 - 管理员修改用户角色或状态时推送 user_update 事件
    role_changed = request.role is not None and request.role != old_role
    status_changed = request.is_active is not None and request.is_active != old_is_active

    if role_changed or status_changed:
        # 确定操作类型：如果用户被禁用，action 为 "disable"，否则为 "update"
        action = "disable" if (request.is_active is False) else "update"

        # 触发用户状态更新事件
        # Requirements: 7.2 - 事件负载包含用户ID、变更类型、新的状态值
        emit_user_update(
            user_id=updated_user.id,
            role=updated_user.role.value,
            is_active=updated_user.is_active,
            updated_at=updated_user.updated_at.isoformat() if updated_user.updated_at else datetime.now().isoformat(),
            action=action
        )

    return updated_user


@router.delete("/{user_id}", response_model=MessageResponse)
async def delete_user(
    user_id: int,
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    """
    删除用户（管理员级别可访问：调度、老板、超级管理员）

    Args:
        user_id: 用户ID
        current_user: 当前登录用户
        session: 数据库会话

    Returns:
        MessageResponse: 操作结果消息

    Raises:
        HTTPException 404: 用户不存在
        HTTPException 400: 不能删除自己的账号
        HTTPException 403: 无权限删除高权限角色用户
    """
    user = crud.get_user_by_id(session, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在"
        )

    # 不能删除自己
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="不能删除自己的账号"
        )

    # 权限控制：使用统一的高权限角色检查
    require_super_admin_for_high_roles(user.role, current_user, "删除")

    crud.delete_user(session, user)
    return MessageResponse(message="用户已删除")


@router.put("/{user_id}/driver-info", response_model=UserResponse)
async def update_driver_info(
    user_id: int,
    request: DriverInfoUpdate,
    current_user: User = Depends(require_management),
    session: Session = Depends(get_session)
):
    """
    更新司机信息（车队长可用）
    车队长只能更新司机的姓名和手机号，不能修改角色和状态
    Requirements: 1.3 - 车队长提交编辑后的司机信息

    Args:
        user_id: 要更新的用户ID
        request: 更新请求，包含姓名和手机号
        current_user: 当前登录用户
        session: 数据库会话

    Returns:
        UserResponse: 更新后的用户信息

    Raises:
        HTTPException 404: 用户不存在
        HTTPException 403: 无权限修改该用户
    """
    # 获取目标用户
    user = crud.get_user_by_id(session, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在"
        )

    # 权限控制：车队长使用统一的仓库权限检查
    if is_role(current_user.role, UserRole.MANAGER):
        check_manager_warehouse_access(current_user, user, session)

    # 更新用户信息（只更新姓名和手机号）
    updated_user = crud.update_user(
        session, user,
        name=request.name,
        phone=request.phone
    )
    return updated_user


@router.post("/{user_id}/warehouses", response_model=MessageResponse)
async def assign_warehouses_to_user(
    user_id: int,
    request: UserWarehouseAssignRequest,
    current_user: User = Depends(require_management),
    session: Session = Depends(get_session)
):
    """
    给用户分配仓库（车队长可用）
    替换用户现有的仓库分配
    Requirements: 1.5 - 车队长选择仓库并确认分配

    Args:
        user_id: 要分配仓库的用户ID
        request: 分配请求，包含仓库ID列表
        current_user: 当前登录用户
        session: 数据库会话

    Returns:
        MessageResponse: 操作结果消息

    Raises:
        HTTPException 404: 用户不存在
        HTTPException 403: 无权限操作
        HTTPException 400: 仓库不存在
    """
    # 获取目标用户
    user = crud.get_user_by_id(session, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在"
        )

    # 权限控制：车队长只能给司机分配仓库
    if is_role(current_user.role, UserRole.MANAGER):
        # 检查目标用户是否是司机
        if not is_role(user.role, UserRole.DRIVER):
            raise PermissionError(
                error_code=PermissionErrorCode.ROLE_INSUFFICIENT,
                message="车队长只能给司机分配仓库"
            )

        # 车队长只能分配自己管理的仓库
        manager_warehouses = crud.get_user_warehouses(session, current_user.id)
        manager_warehouse_ids = set(w.id for w in manager_warehouses)

        # 检查请求的仓库是否都在车队长管理范围内
        requested_warehouse_ids = set(request.warehouse_ids)
        if not requested_warehouse_ids.issubset(manager_warehouse_ids):
            raise PermissionError(
                error_code=PermissionErrorCode.WAREHOUSE_NOT_ACCESSIBLE,
                message="只能分配您管理的仓库"
            )

    # 验证所有仓库是否存在
    for warehouse_id in request.warehouse_ids:
        warehouse = crud.get_warehouse_by_id(session, warehouse_id)
        if not warehouse:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"仓库 {warehouse_id} 不存在"
            )

    # 执行仓库分配
    crud.assign_warehouses_to_user(session, user_id, request.warehouse_ids)

    # 获取分配后的完整仓库列表，用于推送事件
    # Requirements: 5.1, 5.2, 5.3 - 仓库分配实时数据同步
    assigned_warehouses = crud.get_user_warehouses(session, user_id)

    # 构建仓库数据列表（包含 id, name, address）
    warehouses_data = [
        {
            "id": w.id,
            "name": w.name,
            "address": w.address
        }
        for w in assigned_warehouses
    ]

    # 确定分配类型（根据用户角色）
    assignment_type = "manager" if is_role(user.role, UserRole.MANAGER) else "driver"

    # 触发仓库分配更新事件
    emit_assignment_update(
        user_id=user_id,
        warehouses=warehouses_data,
        assignment_type=assignment_type
    )

    return MessageResponse(message="仓库分配成功")


@router.get("/{user_id}/warehouses", response_model=List[WarehouseResponse])
async def get_user_warehouses(
    user_id: int,
    current_user: User = Depends(require_management),
    session: Session = Depends(get_session)
):
    """
    获取用户分配的仓库列表
    Requirements: 1.4 - 显示可分配的仓库列表

    Args:
        user_id: 用户ID
        current_user: 当前登录用户
        session: 数据库会话

    Returns:
        List[WarehouseResponse]: 用户分配的仓库列表

    Raises:
        HTTPException 404: 用户不存在
    """
    # 获取目标用户
    user = crud.get_user_by_id(session, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在"
        )

    # 获取用户的仓库列表
    warehouses = crud.get_user_warehouses(session, user_id)
    return warehouses


# ==================== 司机证件 API ====================
# 用于获取和更新司机的身份证和驾驶证信息
# Requirements: 4.5, 4.6, 4.7 - 司机个人档案页面显示身份证号、驾驶证类型、驾驶证有效期


@router.get("/{user_id}/license", response_model=DriverLicenseResponse)
async def get_driver_license(
    user_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    获取司机证件信息
    
    权限规则：
    - 司机只能查看自己的证件
    - 管理角色（车队长、调度、老板）可以查看任何司机的证件
    - 车队长只能查看其管辖仓库的司机证件
    
    返回指定用户的身份证和驾驶证信息，用于司机个人档案页面显示

    Args:
        user_id: 用户ID
        current_user: 当前登录用户
        session: 数据库会话

    Returns:
        DriverLicenseResponse: 司机证件信息，包含部分隐藏的身份证号

    Raises:
        HTTPException 404: 用户不存在或证件信息不存在
        HTTPException 403: 无权查看该用户的证件
        
    Requirements: 4.5, 4.6, 4.7 - 获取司机证件信息用于个人档案页面显示
    """
    # 验证用户是否存在
    user = crud.get_user_by_id(session, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在"
        )
    
    # 权限控制
    if is_role(current_user.role, UserRole.DRIVER):
        # 司机只能查看自己的证件
        if current_user.id != user_id:
            raise PermissionError(
                error_code=PermissionErrorCode.RESOURCE_NOT_OWNED,
                message="无权查看其他用户的证件信息"
            )
    elif is_role(current_user.role, UserRole.MANAGER):
        # 车队长只能查看其管辖仓库的司机
        check_manager_warehouse_access(current_user, user, session)
    # 老板和调度可以查看任何人的证件
    
    # 获取司机证件信息
    driver_license = crud.get_driver_license_by_user_id(session, user_id)
    if not driver_license:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="司机证件信息不存在"
        )
    
    # 使用工厂方法创建响应对象，自动计算部分隐藏的身份证号
    return DriverLicenseResponse.from_driver_license(driver_license)


@router.post("/{user_id}/license", response_model=DriverLicenseResponse)
async def create_or_update_driver_license(
    user_id: int,
    request: DriverLicenseCreate,
    current_user: User = Depends(require_management),
    session: Session = Depends(get_session)
):
    """
    创建或更新司机证件信息（管理权限可访问：车队长、调度、老板、超级管理员）
    
    如果用户已有证件记录则更新，否则创建新记录（upsert 操作）
    用于车辆录入时保存司机证件信息

    Args:
        user_id: 用户ID
        request: 司机证件创建/更新请求
        current_user: 当前登录用户
        session: 数据库会话

    Returns:
        DriverLicenseResponse: 创建或更新后的司机证件信息

    Raises:
        HTTPException 404: 用户不存在
        
    Requirements: 4.5, 4.6, 4.7 - 保存司机证件信息
    """
    # 验证用户是否存在
    user = crud.get_user_by_id(session, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在"
        )
    
    # 权限控制：车队长只能操作其管辖仓库的司机
    if is_role(current_user.role, UserRole.MANAGER):
        check_manager_warehouse_access(current_user, user, session)
    
    # 创建或更新司机证件信息
    driver_license = crud.create_or_update_driver_license(
        session, user_id,
        id_card_number=request.id_card_number,
        id_card_name=request.id_card_name,
        id_card_photo_front=request.id_card_photo_front,
        id_card_photo_back=request.id_card_photo_back,
        license_number=request.license_number,
        license_class=request.license_class,
        valid_from=request.valid_from,
        valid_to=request.valid_to,
        driving_license_photo=request.driving_license_photo
    )
    
    # 使用工厂方法创建响应对象
    return DriverLicenseResponse.from_driver_license(driver_license)


@router.put("/{user_id}/license", response_model=DriverLicenseResponse)
async def update_driver_license(
    user_id: int,
    request: DriverLicenseUpdate,
    current_user: User = Depends(require_management),
    session: Session = Depends(get_session)
):
    """
    更新司机证件信息（管理权限可访问：车队长、调度、老板、超级管理员）
    
    只更新提供的字段，未提供的字段保持不变

    Args:
        user_id: 用户ID
        request: 司机证件更新请求
        current_user: 当前登录用户
        session: 数据库会话

    Returns:
        DriverLicenseResponse: 更新后的司机证件信息

    Raises:
        HTTPException 404: 用户不存在或证件信息不存在
        
    Requirements: 4.5, 4.6, 4.7 - 更新司机证件信息
    """
    # 验证用户是否存在
    user = crud.get_user_by_id(session, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在"
        )
    
    # 权限控制：车队长只能操作其管辖仓库的司机
    if is_role(current_user.role, UserRole.MANAGER):
        check_manager_warehouse_access(current_user, user, session)
    
    # 获取现有的证件信息
    driver_license = crud.get_driver_license_by_user_id(session, user_id)
    if not driver_license:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="司机证件信息不存在，请先创建"
        )
    
    # 更新司机证件信息
    updated_license = crud.update_driver_license(
        session, driver_license,
        id_card_number=request.id_card_number,
        id_card_name=request.id_card_name,
        id_card_photo_front=request.id_card_photo_front,
        id_card_photo_back=request.id_card_photo_back,
        license_number=request.license_number,
        license_class=request.license_class,
        valid_from=request.valid_from,
        valid_to=request.valid_to,
        driving_license_photo=request.driving_license_photo
    )
    
    # 使用工厂方法创建响应对象
    return DriverLicenseResponse.from_driver_license(updated_license)
