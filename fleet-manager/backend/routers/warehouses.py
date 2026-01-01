"""
仓库管理路由模块
提供仓库 CRUD、用户分配、车辆查询等仓库管理相关 API

支持仓库类型分类功能（计件/点位/整车/距离），每种类型对应预设的计量单位。

Requirements: 
    - Requirement 9.1: 提取仓库管理路由到独立模块
    - Requirement 1: 仓库类型定义
    - Requirement 7: API 接口更新
"""

from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import Session

from database import get_session
from models import User, UserRole, VehicleStatus, WarehouseType, is_role
from auth import (
    get_current_user,
    require_admin,
    require_management
)
import crud
from schemas import (
    MessageResponse,
    WarehouseCreate,
    WarehouseUpdate,
    WarehouseResponse,
    WarehouseAssignRequest,
    UserResponse,
    VehicleResponse,
    PieceWorkCategoryResponse
)
from helpers import get_warehouse_preset_unit
from events import emit_assignment_update


# 创建仓库管理路由器
router = APIRouter(
    prefix="/api/warehouses",
    tags=["仓库管理"]
)


@router.get("", response_model=List[WarehouseResponse])
async def get_warehouses(
    is_active: Optional[bool] = None,
    warehouse_type: Optional[WarehouseType] = Query(
        None, 
        description="按仓库类型筛选：piece=计件, point=点位, whole=整车, distance=距离"
    ),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    获取仓库列表
    
    根据用户角色返回不同的仓库列表：
    - 老板/调度：返回所有仓库
    - 车队长/司机：只返回被分配的仓库

    Args:
        is_active: 按激活状态过滤（可选）
        warehouse_type: 按仓库类型筛选（可选）
        skip: 跳过记录数，默认0
        limit: 返回记录数上限，默认100，最大1000
        current_user: 当前登录用户
        session: 数据库会话

    Returns:
        List[WarehouseResponse]: 仓库列表
    """
    # 老板和调度可以看到所有仓库
    if current_user.role in [UserRole.BOSS, UserRole.PEER_ADMIN]:
        warehouses = crud.get_warehouses(
            session, 
            is_active=is_active, 
            warehouse_type=warehouse_type,
            skip=skip, 
            limit=limit
        )
    else:
        # 车队长和司机只能看到被分配的仓库
        user_warehouses = crud.get_user_warehouses(session, current_user.id)
        
        # 应用过滤条件
        warehouses = []
        for w in user_warehouses:
            if is_active is not None and w.is_active != is_active:
                continue
            if warehouse_type is not None and w.warehouse_type != warehouse_type:
                continue
            warehouses.append(w)
        
        # 应用分页
        warehouses = warehouses[skip:skip + limit]
    
    # 使用 from_warehouse 方法转换，自动计算 preset_unit
    # Requirements: 7.1, 7.2 - 返回包含 warehouse_type 和 preset_unit
    return [WarehouseResponse.from_warehouse(w) for w in warehouses]


@router.post("", response_model=WarehouseResponse)
async def create_warehouse(
    request: WarehouseCreate,
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    """
    创建仓库（管理员级别可访问：调度、老板）
    
    支持设置仓库类型，默认为计件类型。

    Args:
        request: 仓库创建请求，包含：
            - name: 仓库名称（必填）
            - address: 仓库地址（可选）
            - warehouse_type: 仓库类型（可选，默认 piece）
        current_user: 当前登录用户
        session: 数据库会话

    Returns:
        WarehouseResponse: 创建的仓库信息，包含 warehouse_type 和 preset_unit
        
    Requirements:
        - Requirement 1.6: 仓库类型字段默认值为 "piece"
        - Requirement 2.3: 创建新仓库时默认类型为"计件"
        - Requirement 7.1: API 接口支持创建带类型的仓库
    """
    # 创建仓库，支持设置仓库类型
    warehouse = crud.create_warehouse(
        session, 
        name=request.name, 
        address=request.address,
        warehouse_type=request.warehouse_type
    )
    
    # 使用 from_warehouse 方法转换，自动计算 preset_unit
    return WarehouseResponse.from_warehouse(warehouse)


@router.get("/{warehouse_id}", response_model=WarehouseResponse)
async def get_warehouse(
    warehouse_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    获取仓库详情
    
    返回仓库详细信息，包含仓库类型和预设单位。

    Args:
        warehouse_id: 仓库ID
        current_user: 当前登录用户
        session: 数据库会话

    Returns:
        WarehouseResponse: 仓库详情，包含 warehouse_type 和 preset_unit

    Raises:
        HTTPException 404: 仓库不存在
        
    Requirements:
        - Requirement 7.1: API 返回包含 warehouse_type 字段
        - Requirement 7.2: API 返回包含 preset_unit 字段
    """
    warehouse = crud.get_warehouse_by_id(session, warehouse_id)
    if not warehouse:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="仓库不存在"
        )
    
    # 使用 from_warehouse 方法转换，自动计算 preset_unit
    return WarehouseResponse.from_warehouse(warehouse)


@router.put("/{warehouse_id}", response_model=WarehouseResponse)
async def update_warehouse(
    warehouse_id: int,
    request: WarehouseUpdate,
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    """
    更新仓库信息（管理员级别可访问：调度、老板）
    
    注意：仓库类型创建后不可修改，以保证计件数据的一致性。
    即使请求中包含 warehouse_type 字段，也会被忽略。

    Args:
        warehouse_id: 仓库ID
        request: 仓库更新请求，包含：
            - name: 仓库名称（可选）
            - address: 仓库地址（可选）
            - is_active: 是否启用（可选）
            - warehouse_type: 仓库类型（已忽略，创建后不可修改）
        current_user: 当前登录用户
        session: 数据库会话

    Returns:
        WarehouseResponse: 更新后的仓库信息，包含 warehouse_type 和 preset_unit

    Raises:
        HTTPException 404: 仓库不存在
        
    Requirements:
        - Requirement 2.3: 仓库类型创建后不可修改
        - Requirement 7.1: API 接口支持更新仓库信息（但不包括类型）
    """
    warehouse = crud.get_warehouse_by_id(session, warehouse_id)
    if not warehouse:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="仓库不存在"
        )

    # 更新仓库信息
    # 注意：warehouse_type 不传递，因为仓库类型创建后不可修改
    # Requirements: 2.3 - 仓库类型创建后不可修改
    updated = crud.update_warehouse(
        session, warehouse,
        name=request.name,
        address=request.address,
        is_active=request.is_active,
        warehouse_type=None  # 显式设置为 None，忽略请求中的类型
    )
    
    # 使用 from_warehouse 方法转换，自动计算 preset_unit
    return WarehouseResponse.from_warehouse(updated)


@router.delete("/{warehouse_id}", response_model=MessageResponse)
async def delete_warehouse(
    warehouse_id: int,
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    """
    删除仓库（管理员级别可访问：调度、老板）

    Args:
        warehouse_id: 仓库ID
        current_user: 当前登录用户
        session: 数据库会话

    Returns:
        MessageResponse: 操作结果消息

    Raises:
        HTTPException 404: 仓库不存在
    """
    warehouse = crud.get_warehouse_by_id(session, warehouse_id)
    if not warehouse:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="仓库不存在"
        )

    crud.delete_warehouse(session, warehouse)
    return MessageResponse(message="仓库已删除")


@router.post("/{warehouse_id}/assign", response_model=MessageResponse)
async def assign_users_to_warehouse(
    warehouse_id: int,
    request: WarehouseAssignRequest,
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    """
    分配用户到仓库（管理员级别可访问：调度、老板）

    将指定用户列表分配到指定仓库，并向每个被分配的用户推送仓库分配更新事件。

    Requirements: 5.1, 5.2 - 仓库分配实时数据同步

    Args:
        warehouse_id: 仓库ID
        request: 分配请求，包含用户ID列表
        current_user: 当前登录用户
        session: 数据库会话

    Returns:
        MessageResponse: 操作结果消息

    Raises:
        HTTPException 404: 仓库不存在
    """
    warehouse = crud.get_warehouse_by_id(session, warehouse_id)
    if not warehouse:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="仓库不存在"
        )

    # 执行仓库分配
    crud.assign_users_to_warehouse(session, warehouse_id, request.user_ids)

    # 为每个被分配的用户推送仓库分配更新事件
    # Requirements: 5.1, 5.2, 5.3 - 仓库分配实时数据同步
    for assigned_user_id in request.user_ids:
        # 获取用户信息以确定分配类型
        assigned_user = crud.get_user_by_id(session, assigned_user_id)
        if assigned_user:
            # 获取该用户分配后的完整仓库列表
            user_warehouses = crud.get_user_warehouses(session, assigned_user_id)

            # 构建仓库数据列表（包含 id, name, address）
            warehouses_data = [
                {
                    "id": w.id,
                    "name": w.name,
                    "address": w.address
                }
                for w in user_warehouses
            ]

            # 确定分配类型（根据用户角色）
            assignment_type = "manager" if is_role(assigned_user.role, UserRole.MANAGER) else "driver"

            # 触发仓库分配更新事件
            emit_assignment_update(
                user_id=assigned_user_id,
                warehouses=warehouses_data,
                assignment_type=assignment_type
            )

    return MessageResponse(message="用户分配成功")


@router.get("/{warehouse_id}/users", response_model=List[UserResponse])
async def get_warehouse_users(
    warehouse_id: int,
    current_user: User = Depends(require_management),
    session: Session = Depends(get_session)
):
    """
    获取仓库下的用户列表（管理权限可访问：车队长、调度、老板）

    Args:
        warehouse_id: 仓库ID
        current_user: 当前登录用户
        session: 数据库会话

    Returns:
        List[UserResponse]: 仓库下的用户列表

    Raises:
        HTTPException 404: 仓库不存在
    """
    warehouse = crud.get_warehouse_by_id(session, warehouse_id)
    if not warehouse:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="仓库不存在"
        )

    users = crud.get_warehouse_users(session, warehouse_id)
    return users


@router.get("/{warehouse_id}/vehicles", response_model=List[VehicleResponse])
async def get_warehouse_vehicles(
    warehouse_id: int,
    vehicle_status: Optional[VehicleStatus] = Query(None, alias="status", description="按车辆状态过滤"),
    skip: int = Query(0, ge=0, description="跳过记录数"),
    limit: int = Query(100, ge=1, le=1000, description="返回记录数上限"),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    获取仓库下的车辆列表
    所有登录用户可访问，但需要验证仓库存在
    支持按状态过滤和分页

    Args:
        warehouse_id: 仓库ID
        vehicle_status: 按车辆状态过滤（可选）
        skip: 跳过记录数，默认0
        limit: 返回记录数上限，默认100，最大1000
        current_user: 当前登录用户
        session: 数据库会话

    Returns:
        List[VehicleResponse]: 该仓库的车辆列表

    Raises:
        HTTPException 404: 仓库不存在
        HTTPException 403: 当前用户无权访问该仓库
    """
    # 验证仓库是否存在 (Requirement 4.4)
    warehouse = crud.get_warehouse_by_id(session, warehouse_id)
    if not warehouse:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="仓库不存在"
        )

    # 权限检查：司机只能访问自己分配的仓库 (Requirement 4.5)
    if is_role(current_user.role, UserRole.DRIVER):
        # 获取用户分配的仓库列表
        user_warehouses = crud.get_user_warehouses(session, current_user.id)
        user_warehouse_ids = [w.id for w in user_warehouses]

        # 检查用户是否有权访问该仓库
        if warehouse_id not in user_warehouse_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="无权访问该仓库"
            )

    # 获取仓库车辆列表 (Requirement 4.1, 4.2, 4.3)
    vehicles = crud.get_warehouse_vehicles(
        session,
        warehouse_id=warehouse_id,
        status=vehicle_status,
        skip=skip,
        limit=limit
    )

    # 构建响应（添加车主姓名）
    result = []
    for vehicle in vehicles:
        user = crud.get_user_by_id(session, vehicle.user_id)
        result.append(VehicleResponse(
            id=vehicle.id,
            user_id=vehicle.user_id,
            license_plate=vehicle.license_plate,
            brand=vehicle.brand,
            model=vehicle.model,
            color=vehicle.color,
            status=vehicle.status,
            ownership_type=vehicle.ownership_type,
            created_at=vehicle.created_at,
            updated_at=vehicle.updated_at,
            user_name=user.name if user else None
        ))

    return result


@router.get("/{warehouse_id}/categories", response_model=List[PieceWorkCategoryResponse])
async def get_warehouse_categories(
    warehouse_id: int,
    is_active: Optional[bool] = Query(True, description="是否只获取启用的分类，默认 True"),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    获取仓库可用的品类列表
    
    根据仓库类型返回匹配单位的品类。
    如果仓库没有关联品类，则返回所有匹配仓库类型单位的品类。

    Args:
        warehouse_id: 仓库ID
        is_active: 是否只获取启用的分类，默认 True
        current_user: 当前登录用户
        session: 数据库会话

    Returns:
        List[PieceWorkCategoryResponse]: 匹配仓库类型的品类列表

    Raises:
        HTTPException 404: 仓库不存在
        
    Requirements:
        - Requirement 4.3: 司机在该仓库只能选择合适的品类进行计件
        - Requirement 4.4: 如果没有关联品类，显示所有匹配仓库类型单位的品类
        - Requirement 7.4: 支持按单位筛选品类
        
    Example:
        如果仓库类型为 "piece"（计件），则返回单位为 "件" 的品类
        如果仓库类型为 "point"（点位），则返回单位为 "点" 的品类
    """
    # 验证仓库是否存在
    warehouse = crud.get_warehouse_by_id(session, warehouse_id)
    if not warehouse:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="仓库不存在"
        )
    
    # 获取仓库类型对应的预设单位
    # Requirements: 4.3, 4.4 - 根据仓库类型筛选品类
    preset_unit = get_warehouse_preset_unit(warehouse.warehouse_type)
    
    # 获取匹配单位的品类
    # Requirements: 7.4 - 支持按单位筛选品类
    categories = crud.get_piece_work_categories(
        session, 
        is_active=is_active,
        unit=preset_unit
    )
    
    return categories
