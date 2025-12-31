"""
计件功能路由模块
提供计件分类管理、计件记录管理、计件统计等 API

Requirements: 9.1 - 提取计件功能路由到独立模块
"""

from datetime import date
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import Session

from database import get_session
from models import User, UserRole
from auth import (
    get_current_user,
    require_management,
    check_resource_ownership
)
import crud
from schemas import (
    PieceWorkCategoryCreate,
    PieceWorkCategoryUpdate,
    PieceWorkCategoryResponse,
    PieceWorkRecordCreate,
    PieceWorkRecordUpdate,
    PieceWorkRecordResponse,
    PieceWorkStatsResponse,
    MessageResponse
)
from events import emit_piece_work_update


# 创建计件路由器
router = APIRouter(
    prefix="/api/piece-work",
    tags=["计件管理"]
)


# ==================== 计件分类 API ====================

@router.get("/categories", response_model=List[PieceWorkCategoryResponse])
async def get_piece_work_categories(
    is_active: Optional[bool] = None,
    unit: Optional[str] = Query(
        None,
        description="按计量单位筛选，如 '件'、'点'、'车'、'公里'"
    ),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    获取计件分类列表
    
    支持按启用状态和单位筛选。

    Args:
        is_active: 是否只获取启用的分类（可选）
        unit: 按计量单位筛选（可选），如 "件"、"点"、"车"、"公里"
        current_user: 当前登录用户
        session: 数据库会话

    Returns:
        List[PieceWorkCategoryResponse]: 计件分类列表
        
    Requirements:
        - Requirement 7.4: 支持按单位筛选品类
    """
    categories = crud.get_piece_work_categories(session, is_active=is_active, unit=unit)
    return categories



@router.post("/categories", response_model=PieceWorkCategoryResponse)
async def create_piece_work_category(
    request: PieceWorkCategoryCreate,
    current_user: User = Depends(require_management),
    session: Session = Depends(get_session)
):
    """
    创建计件分类（管理权限可访问：车队长、调度、老板、超级管理员）
    支持基础单价、上楼单价、分拣单价配置

    Args:
        request: 计件分类创建请求
        current_user: 当前登录用户（需要管理权限）
        session: 数据库会话

    Returns:
        PieceWorkCategoryResponse: 创建的计件分类

    Requirements: 3.1 - 支持多种单价配置
    """
    category = crud.create_piece_work_category(
        session,
        name=request.name,
        unit_price=request.unit_price,
        unit=request.unit,
        upstairs_price=request.upstairs_price,
        sorting_price=request.sorting_price
    )
    return category


@router.put("/categories/{category_id}", response_model=PieceWorkCategoryResponse)
async def update_piece_work_category(
    category_id: int,
    request: PieceWorkCategoryUpdate,
    current_user: User = Depends(require_management),
    session: Session = Depends(get_session)
):
    """
    更新计件分类（管理权限可访问：车队长、调度、老板、超级管理员）
    支持更新基础单价、上楼单价、分拣单价

    Args:
        category_id: 分类ID
        request: 计件分类更新请求
        current_user: 当前登录用户（需要管理权限）
        session: 数据库会话

    Returns:
        PieceWorkCategoryResponse: 更新后的计件分类

    Raises:
        HTTPException 404: 分类不存在

    Requirements: 3.2 - 支持编辑品类配置
    """
    category = session.get(crud.PieceWorkCategory, category_id)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="分类不存在"
        )

    updated = crud.update_piece_work_category(
        session, category,
        name=request.name,
        unit_price=request.unit_price,
        unit=request.unit,
        is_active=request.is_active,
        upstairs_price=request.upstairs_price,
        sorting_price=request.sorting_price
    )
    return updated


@router.delete("/categories/{category_id}", response_model=MessageResponse)
async def delete_piece_work_category(
    category_id: int,
    current_user: User = Depends(require_management),
    session: Session = Depends(get_session)
):
    """
    删除计件分类（管理权限可访问：车队长、调度、老板、超级管理员）
    如果品类已有计件记录，则不允许删除

    Args:
        category_id: 分类ID
        current_user: 当前登录用户（需要管理权限）
        session: 数据库会话

    Returns:
        MessageResponse: 操作结果消息

    Raises:
        HTTPException 404: 分类不存在
        HTTPException 400: 品类已有计件记录，不允许删除

    Requirements: 3.3, 3.4 - 删除品类功能和约束检查
    """
    try:
        success = crud.delete_piece_work_category(session, category_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="分类不存在"
            )
        return MessageResponse(message="删除成功")
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


# ==================== 计件记录 API ====================

@router.get("/records", response_model=List[PieceWorkRecordResponse])
async def get_piece_work_records(
    user_id: Optional[int] = None,
    warehouse_id: Optional[int] = None,
    category_id: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    获取计件记录列表
    司机只能查看自己的记录，车队长和老板可以查看所有

    Args:
        user_id: 用户ID过滤（可选）
        warehouse_id: 仓库ID过滤（可选）
        category_id: 分类ID过滤（可选）
        start_date: 开始日期过滤（可选）
        end_date: 结束日期过滤（可选）
        skip: 跳过记录数
        limit: 返回记录数上限
        current_user: 当前登录用户
        session: 数据库会话

    Returns:
        List[PieceWorkRecordResponse]: 计件记录列表
    """
    # 权限控制：司机只能查看自己的记录
    if current_user.role == UserRole.DRIVER:
        user_id = current_user.id

    records = crud.get_piece_work_records(
        session,
        user_id=user_id,
        warehouse_id=warehouse_id,
        category_id=category_id,
        start_date=start_date,
        end_date=end_date,
        skip=skip,
        limit=limit
    )

    # 构建响应（添加关联信息）
    result = []
    for record in records:
        user = crud.get_user_by_id(session, record.user_id)
        category = session.get(crud.PieceWorkCategory, record.category_id)
        warehouse = crud.get_warehouse_by_id(session, record.warehouse_id) if record.warehouse_id else None

        result.append(PieceWorkRecordResponse(
            id=record.id,
            user_id=record.user_id,
            category_id=record.category_id,
            warehouse_id=record.warehouse_id,
            work_date=record.work_date,
            quantity=record.quantity,
            amount=record.amount,
            remark=record.remark,
            created_at=record.created_at,
            user_name=user.name if user else None,
            category_name=category.name if category else None,
            warehouse_name=warehouse.name if warehouse else None
        ))

    return result



@router.post("/records", response_model=PieceWorkRecordResponse)
async def create_piece_work_record(
    request: PieceWorkRecordCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    录入计件记录（司机操作）
    录入完成后会触发 piece_work_update 事件，通知对应仓库的车队长

    Args:
        request: 计件记录创建请求
        current_user: 当前登录用户
        session: 数据库会话

    Returns:
        PieceWorkRecordResponse: 创建的计件记录

    Raises:
        HTTPException 404: 计件分类不存在
        HTTPException 400: 品类单位与仓库类型不匹配

    Requirements: 
        - 4.1 - 计件记录实时数据同步
        - 3.1 - 品类单位限制（仓库类型与品类单位匹配验证）
    """
    # 导入单位验证辅助函数
    from helpers import validate_category_unit_for_warehouse
    
    # 验证分类是否存在
    category = session.get(crud.PieceWorkCategory, request.category_id)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="计件分类不存在"
        )
    
    # ==================== 验证品类单位与仓库类型匹配 ====================
    # Requirements: 3.1 - 品类单位限制
    # 如果指定了仓库，验证品类单位是否与仓库预设单位匹配
    if request.warehouse_id:
        validate_category_unit_for_warehouse(
            session,
            category_id=request.category_id,
            warehouse_id=request.warehouse_id
        )

    record = crud.create_piece_work_record(
        session,
        user_id=current_user.id,
        category_id=request.category_id,
        work_date=request.work_date,
        quantity=request.quantity,
        warehouse_id=request.warehouse_id,
        remark=request.remark
    )

    # 获取仓库信息
    warehouse = crud.get_warehouse_by_id(session, request.warehouse_id) if request.warehouse_id else None
    warehouse_name = warehouse.name if warehouse else None

    # ==================== 触发计件更新事件 ====================
    # Requirements: 4.1 - 向对应仓库的车队长推送新计件记录

    # 构建目标用户列表：司机 + 对应仓库的车队长
    target_user_ids = [current_user.id]  # 首先添加司机自己

    # 如果有仓库，获取该仓库的所有车队长
    if request.warehouse_id:
        warehouse_users = crud.get_warehouse_users(session, request.warehouse_id)
        for warehouse_user in warehouse_users:
            # 只添加车队长角色的用户
            if warehouse_user.role == UserRole.MANAGER and warehouse_user.id not in target_user_ids:
                target_user_ids.append(warehouse_user.id)

    # 触发计件更新事件
    emit_piece_work_update(
        record_id=record.id,
        user_id=record.user_id,
        user_name=current_user.name,
        warehouse_id=record.warehouse_id,
        warehouse_name=warehouse_name,
        category_id=record.category_id,
        category_name=category.name,
        quantity=record.quantity,
        amount=record.amount,
        work_date=record.work_date.isoformat(),
        remark=record.remark,
        created_at=record.created_at.isoformat(),
        target_user_ids=target_user_ids,
        action="create"
    )

    return PieceWorkRecordResponse(
        id=record.id,
        user_id=record.user_id,
        category_id=record.category_id,
        warehouse_id=record.warehouse_id,
        work_date=record.work_date,
        quantity=record.quantity,
        amount=record.amount,
        remark=record.remark,
        created_at=record.created_at,
        user_name=current_user.name,
        category_name=category.name,
        warehouse_name=warehouse_name
    )


@router.get("/stats", response_model=PieceWorkStatsResponse)
async def get_piece_work_stats(
    user_id: Optional[int] = None,
    warehouse_id: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    获取计件统计
    
    统计计件记录的总数量、总金额和记录数。
    司机只能查看自己的统计，车队长和老板可以查看所有。
    
    如果指定了仓库，响应中会包含该仓库的预设单位和类型信息。

    Args:
        user_id: 用户ID过滤（可选）
        warehouse_id: 仓库ID过滤（可选），指定后会返回该仓库的预设单位
        start_date: 开始日期过滤（可选）
        end_date: 结束日期过滤（可选）
        current_user: 当前登录用户
        session: 数据库会话

    Returns:
        PieceWorkStatsResponse: 计件统计数据，包含：
            - total_quantity: 总数量
            - total_amount: 总金额
            - record_count: 记录数
            - unit: 计量单位（根据仓库类型确定，默认为"件"）
            - warehouse_type: 仓库类型（如果指定了仓库）
            - warehouse_type_display: 仓库类型显示名称（如果指定了仓库）
    
    Requirements: 6.1 - 数据统计单位显示
    """
    # 权限控制：司机只能查看自己的统计
    if current_user.role == UserRole.DRIVER:
        user_id = current_user.id

    # 调用 CRUD 函数获取统计数据
    stats = crud.get_piece_work_stats(
        session,
        user_id=user_id,
        warehouse_id=warehouse_id,
        start_date=start_date,
        end_date=end_date
    )

    return PieceWorkStatsResponse(**stats)



@router.put("/records/{record_id}", response_model=PieceWorkRecordResponse)
async def update_piece_work_record(
    record_id: int,
    request: PieceWorkRecordUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    更新计件记录

    权限规则：
    - 司机只能更新自己的计件记录
    - 管理角色（车队长、调度、老板、超级管理员）可以更新任何记录

    更新完成后会触发 piece_work_update 事件，通知相关用户

    Args:
        record_id: 记录ID
        request: 计件记录更新请求
        current_user: 当前登录用户
        session: 数据库会话

    Returns:
        PieceWorkRecordResponse: 更新后的计件记录

    Raises:
        HTTPException 404: 计件记录不存在
        HTTPException 403: 无权限更新此记录

    Requirements: 2.4, 4.2 - 计件审批实时数据同步
    """
    # 导入辅助函数
    from helpers import (
        get_piece_work_record_or_404,
        get_piece_work_related_info,
        get_piece_work_target_user_ids
    )

    # 获取记录（使用辅助函数）
    record = get_piece_work_record_or_404(session, record_id)

    # 权限检查：使用统一的资源所有权检查
    check_resource_ownership(record, current_user, "计件记录")

    # 更新记录
    updated = crud.update_piece_work_record(
        session, record,
        quantity=request.quantity,
        remark=request.remark
    )

    # 获取关联信息（使用辅助函数）
    related_info = get_piece_work_related_info(session, updated)
    user = related_info["user"]
    category = related_info["category"]
    warehouse = related_info["warehouse"]

    # 获取目标用户列表（使用辅助函数）
    target_user_ids = get_piece_work_target_user_ids(session, updated)

    # 触发计件更新事件
    # Requirements: 4.2 - 向司机推送审批/修改结果
    emit_piece_work_update(
        record_id=updated.id,
        user_id=updated.user_id,
        user_name=user.name if user else "未知",
        warehouse_id=updated.warehouse_id,
        warehouse_name=warehouse.name if warehouse else None,
        category_id=updated.category_id,
        category_name=category.name if category else "未知",
        quantity=updated.quantity,
        amount=updated.amount,
        work_date=updated.work_date.isoformat(),
        remark=updated.remark,
        created_at=updated.created_at.isoformat(),
        target_user_ids=target_user_ids,
        action="update"
    )

    return PieceWorkRecordResponse(
        id=updated.id,
        user_id=updated.user_id,
        category_id=updated.category_id,
        warehouse_id=updated.warehouse_id,
        work_date=updated.work_date,
        quantity=updated.quantity,
        amount=updated.amount,
        remark=updated.remark,
        created_at=updated.created_at,
        user_name=user.name if user else None,
        category_name=category.name if category else None,
        warehouse_name=warehouse.name if warehouse else None
    )


@router.delete("/records/{record_id}", response_model=MessageResponse)
async def delete_piece_work_record(
    record_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    删除计件记录

    权限规则：
    - 司机只能删除自己的计件记录
    - 管理角色（车队长、调度、老板、超级管理员）可以删除任何记录

    Args:
        record_id: 记录ID
        current_user: 当前登录用户
        session: 数据库会话

    Returns:
        MessageResponse: 操作结果消息

    Raises:
        HTTPException 404: 计件记录不存在
        HTTPException 403: 无权限删除此记录
    """
    # 获取记录
    record = session.get(crud.PieceWorkRecord, record_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="计件记录不存在"
        )

    # 权限检查：使用统一的资源所有权检查
    check_resource_ownership(record, current_user, "计件记录")

    crud.delete_piece_work_record(session, record)
    return MessageResponse(message="计件记录已删除")
