"""
定时通知路由模块
提供定时通知的创建、管理、执行和调度器控制功能

包含的端点：
- GET /api/scheduled-notifications - 获取定时通知列表
- POST /api/scheduled-notifications - 创建定时通知
- GET /api/scheduled-notifications/{id} - 获取定时通知详情
- PUT /api/scheduled-notifications/{id} - 更新定时通知
- DELETE /api/scheduled-notifications/{id} - 删除定时通知
- POST /api/scheduled-notifications/{id}/cancel - 取消定时通知
- POST /api/scheduled-notifications/{id}/execute - 手动执行定时通知
- GET /api/scheduled-notifications/scheduler/status - 获取调度器状态
- POST /api/scheduled-notifications/scheduler/trigger - 手动触发调度器检查
- POST /api/scheduled-notifications/scheduler/start - 启动调度器
- POST /api/scheduled-notifications/scheduler/stop - 停止调度器

Requirements: 9.1 - 创建 routers/ 目录包含各功能模块路由
"""

import json
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import Session

from database import get_session
from models import User, ScheduledNotificationStatus, RepeatType
from auth import require_admin
from scheduler import start_scheduler, stop_scheduler, is_scheduler_running, trigger_immediate_check
import crud
import helpers

from schemas import (
    ScheduledNotificationCreate, ScheduledNotificationUpdate, ScheduledNotificationResponse,
    SchedulerStatusResponse,
    MessageResponse
)


# 创建路由器
router = APIRouter(tags=["定时通知"])


# ==================== 定时通知 API ====================

@router.get("/api/scheduled-notifications", response_model=List[ScheduledNotificationResponse])
async def get_scheduled_notifications(
    status: Optional[ScheduledNotificationStatus] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    """
    获取定时通知列表（管理员级别可访问：调度、老板、超级管理员）

    Args:
        status: 按状态筛选（可选）
        skip: 跳过记录数
        limit: 返回记录数
        current_user: 当前登录用户
        session: 数据库会话

    Returns:
        List[ScheduledNotificationResponse]: 定时通知列表
    """
    scheduled_list = crud.get_scheduled_notifications(
        session,
        status=status,
        skip=skip,
        limit=limit
    )

    # 构建响应
    result = []
    for scheduled in scheduled_list:
        # 解析 JSON 字段
        target_user_ids = json.loads(scheduled.target_user_ids) if scheduled.target_user_ids else None
        target_roles = json.loads(scheduled.target_roles) if scheduled.target_roles else None
        variables = json.loads(scheduled.variables) if scheduled.variables else None
        weekdays = json.loads(scheduled.weekdays) if scheduled.weekdays else None

        # 获取模板名称
        template_name = None
        if scheduled.template_id:
            template = crud.get_notification_template_by_id(session, scheduled.template_id)
            if template:
                template_name = template.name

        # 获取创建者姓名
        creator_name = None
        if scheduled.creator_id:
            creator = crud.get_user_by_id(session, scheduled.creator_id)
            if creator:
                creator_name = creator.name

        # 计算目标用户数量
        target_user_count = crud.get_target_user_count(session, target_user_ids, target_roles)

        result.append(ScheduledNotificationResponse(
            id=scheduled.id,
            name=scheduled.name,
            template_id=scheduled.template_id,
            template_name=template_name,
            title=scheduled.title,
            content=scheduled.content,
            variables=variables,
            target_user_ids=target_user_ids,
            target_roles=target_roles,
            target_user_count=target_user_count,
            scheduled_time=scheduled.scheduled_time,
            repeat_type=scheduled.repeat_type.value,
            repeat_interval=scheduled.repeat_interval,
            repeat_end_date=scheduled.repeat_end_date,
            weekdays=weekdays,
            monthly_day=scheduled.monthly_day,
            status=scheduled.status.value,
            last_executed_at=scheduled.last_executed_at,
            next_execute_at=scheduled.next_execute_at,
            execution_count=scheduled.execution_count,
            creator_id=scheduled.creator_id,
            creator_name=creator_name,
            created_at=scheduled.created_at,
            updated_at=scheduled.updated_at
        ))

    return result


@router.post("/api/scheduled-notifications", response_model=ScheduledNotificationResponse)
async def create_scheduled_notification(
    request: ScheduledNotificationCreate,
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    """
    创建定时通知（管理员级别可访问：调度、老板、超级管理员）

    重构后的函数，使用参数数据类封装多参数，简化函数调用。

    Args:
        request: 创建定时通知请求
        current_user: 当前登录用户
        session: 数据库会话

    Returns:
        ScheduledNotificationResponse: 创建的定时通知

    Requirements: 2.3, 4.1
    """
    from helpers import (
        validate_scheduled_notification_create,
        build_scheduled_notification_response
    )
    from schemas import ScheduledNotificationParams

    # 验证请求参数（提取到辅助函数）
    validate_scheduled_notification_create(request, session)

    # 使用参数数据类封装参数，简化函数调用
    params = ScheduledNotificationParams.from_create_request(request, creator_id=current_user.id)

    # 创建定时通知（使用参数数据类版本）
    scheduled = crud.create_scheduled_notification_with_params(session, params)

    # 构建响应（提取到辅助函数）
    response_data = build_scheduled_notification_response(
        scheduled,
        session,
        creator_name=current_user.name
    )

    return ScheduledNotificationResponse(**response_data)


@router.get("/api/scheduled-notifications/{scheduled_id}", response_model=ScheduledNotificationResponse)
async def get_scheduled_notification(
    scheduled_id: int,
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    """
    获取定时通知详情（管理员级别可访问：调度、老板、超级管理员）

    Args:
        scheduled_id: 定时通知ID
        current_user: 当前登录用户
        session: 数据库会话

    Returns:
        ScheduledNotificationResponse: 定时通知详情

    Raises:
        HTTPException 404: 定时通知不存在
    """
    scheduled = crud.get_scheduled_notification_by_id(session, scheduled_id)
    if not scheduled:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="定时通知不存在"
        )

    # 解析 JSON 字段
    target_user_ids = json.loads(scheduled.target_user_ids) if scheduled.target_user_ids else None
    target_roles = json.loads(scheduled.target_roles) if scheduled.target_roles else None
    variables = json.loads(scheduled.variables) if scheduled.variables else None
    weekdays = json.loads(scheduled.weekdays) if scheduled.weekdays else None

    # 获取模板名称
    template_name = None
    if scheduled.template_id:
        template = crud.get_notification_template_by_id(session, scheduled.template_id)
        if template:
            template_name = template.name

    # 获取创建者姓名
    creator_name = None
    if scheduled.creator_id:
        creator = crud.get_user_by_id(session, scheduled.creator_id)
        if creator:
            creator_name = creator.name

    # 计算目标用户数量
    target_user_count = crud.get_target_user_count(session, target_user_ids, target_roles)

    return ScheduledNotificationResponse(
        id=scheduled.id,
        name=scheduled.name,
        template_id=scheduled.template_id,
        template_name=template_name,
        title=scheduled.title,
        content=scheduled.content,
        variables=variables,
        target_user_ids=target_user_ids,
        target_roles=target_roles,
        target_user_count=target_user_count,
        scheduled_time=scheduled.scheduled_time,
        repeat_type=scheduled.repeat_type.value,
        repeat_interval=scheduled.repeat_interval,
        repeat_end_date=scheduled.repeat_end_date,
        weekdays=weekdays,
        monthly_day=scheduled.monthly_day,
        status=scheduled.status.value,
        last_executed_at=scheduled.last_executed_at,
        next_execute_at=scheduled.next_execute_at,
        execution_count=scheduled.execution_count,
        creator_id=scheduled.creator_id,
        creator_name=creator_name,
        created_at=scheduled.created_at,
        updated_at=scheduled.updated_at
    )


@router.put("/api/scheduled-notifications/{scheduled_id}", response_model=ScheduledNotificationResponse)
async def update_scheduled_notification(
    scheduled_id: int,
    request: ScheduledNotificationUpdate,
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    """
    更新定时通知（管理员级别可访问：调度、老板、超级管理员）

    重构后的函数，使用辅助函数简化代码。

    Args:
        scheduled_id: 定时通知ID
        request: 更新定时通知请求
        current_user: 当前登录用户
        session: 数据库会话

    Returns:
        ScheduledNotificationResponse: 更新后的定时通知

    Raises:
        HTTPException 404: 定时通知不存在或模板不存在
        HTTPException 400: 模板已禁用

    Requirements: 2.2, 4.1
    """
    from helpers import (
        get_scheduled_notification_or_404,
        build_scheduled_notification_response
    )

    # 获取定时通知（使用辅助函数）
    scheduled = get_scheduled_notification_or_404(session, scheduled_id)

    # 验证模板是否存在
    if request.template_id:
        template = crud.get_notification_template_by_id(session, request.template_id)
        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="模板不存在"
            )
        if not template.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="模板已禁用"
            )

    # 转换重复类型
    repeat_type = None
    if request.repeat_type:
        repeat_type = RepeatType(request.repeat_type.value)

    # 转换状态
    update_status = None
    if request.status:
        update_status = ScheduledNotificationStatus(request.status.value)

    # 更新定时通知
    updated = crud.update_scheduled_notification(
        session, scheduled,
        name=request.name,
        template_id=request.template_id,
        title=request.title,
        content=request.content,
        variables=request.variables,
        target_user_ids=request.target_user_ids,
        target_roles=request.target_roles,
        scheduled_time=request.scheduled_time,
        repeat_type=repeat_type,
        repeat_interval=request.repeat_interval,
        repeat_end_date=request.repeat_end_date,
        weekdays=request.weekdays,
        monthly_day=request.monthly_day,
        status=update_status
    )

    # 构建响应（使用辅助函数）
    response_data = build_scheduled_notification_response(updated, session)

    return ScheduledNotificationResponse(**response_data)


@router.delete("/api/scheduled-notifications/{scheduled_id}", response_model=MessageResponse)
async def delete_scheduled_notification(
    scheduled_id: int,
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    """
    删除定时通知（管理员级别可访问：调度、老板、超级管理员）

    Args:
        scheduled_id: 定时通知ID
        current_user: 当前登录用户
        session: 数据库会话

    Returns:
        MessageResponse: 删除成功消息

    Raises:
        HTTPException 404: 定时通知不存在
    """
    scheduled = crud.get_scheduled_notification_by_id(session, scheduled_id)
    if not scheduled:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="定时通知不存在"
        )

    crud.delete_scheduled_notification(session, scheduled)
    return MessageResponse(message="定时通知已删除")


@router.post("/api/scheduled-notifications/{scheduled_id}/cancel", response_model=ScheduledNotificationResponse)
async def cancel_scheduled_notification(
    scheduled_id: int,
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    """
    取消定时通知（管理员级别可访问：调度、老板、超级管理员）

    重构后的函数，将状态检查逻辑和响应构建逻辑提取到 helpers 模块。

    Args:
        scheduled_id: 定时通知ID
        current_user: 当前登录用户
        session: 数据库会话

    Returns:
        ScheduledNotificationResponse: 取消后的定时通知

    Requirements: 2.6
    """
    from helpers import (
        get_scheduled_notification_or_404,
        validate_scheduled_notification_cancellable,
        build_scheduled_notification_response
    )

    # 获取定时通知（使用辅助函数）
    scheduled = get_scheduled_notification_or_404(session, scheduled_id)

    # 验证是否可以取消（提取到辅助函数）
    validate_scheduled_notification_cancellable(scheduled)

    # 取消定时通知
    cancelled = crud.cancel_scheduled_notification(session, scheduled)

    # 构建响应（使用辅助函数）
    response_data = build_scheduled_notification_response(cancelled, session)

    return ScheduledNotificationResponse(**response_data)


@router.post("/api/scheduled-notifications/{scheduled_id}/execute", response_model=MessageResponse)
async def execute_scheduled_notification(
    scheduled_id: int,
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    """
    手动执行定时通知（管理员级别可访问：调度、老板、超级管理员）
    立即执行一个定时通知任务，不影响其定时计划

    Args:
        scheduled_id: 定时通知ID
        current_user: 当前登录用户
        session: 数据库会话

    Returns:
        MessageResponse: 执行结果消息

    Raises:
        HTTPException 404: 定时通知不存在
        HTTPException 400: 定时通知已取消
    """
    scheduled = crud.get_scheduled_notification_by_id(session, scheduled_id)
    if not scheduled:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="定时通知不存在"
        )

    # 检查状态
    if scheduled.status == ScheduledNotificationStatus.CANCELLED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="该定时通知已取消"
        )

    # 执行定时通知
    notifications = crud.execute_scheduled_notification(session, scheduled)

    return MessageResponse(message=f"已发送 {len(notifications)} 条通知")


# ==================== 调度器控制 API ====================

@router.get("/api/scheduled-notifications/scheduler/status", response_model=SchedulerStatusResponse)
async def get_scheduler_status(
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    """
    获取调度器状态（管理员级别可访问：调度、老板、超级管理员）

    Args:
        current_user: 当前登录用户
        session: 数据库会话

    Returns:
        SchedulerStatusResponse: 调度器状态信息
    """
    status_info = crud.get_scheduler_status(session)

    # 使用实际的调度器状态
    return SchedulerStatusResponse(
        is_running=is_scheduler_running(),
        pending_tasks=status_info["pending_tasks"],
        active_tasks=status_info["active_tasks"],
        next_execution=status_info["next_execution"]
    )


@router.post("/api/scheduled-notifications/scheduler/trigger", response_model=MessageResponse)
async def trigger_scheduler_check(
    current_user: User = Depends(require_admin)
):
    """
    手动触发调度器检查（管理员级别可访问：调度、老板、超级管理员）
    立即检查并执行所有到期的定时通知

    Args:
        current_user: 当前登录用户

    Returns:
        MessageResponse: 触发结果消息
    """
    await trigger_immediate_check()
    return MessageResponse(message="已触发调度器检查")


@router.post("/api/scheduled-notifications/scheduler/start", response_model=MessageResponse)
async def start_scheduler_endpoint(
    current_user: User = Depends(require_admin)
):
    """
    启动调度器（管理员级别可访问：调度、老板、超级管理员）

    Args:
        current_user: 当前登录用户

    Returns:
        MessageResponse: 启动结果消息
    """
    if is_scheduler_running():
        return MessageResponse(message="调度器已在运行中")

    start_scheduler()
    return MessageResponse(message="调度器已启动")


@router.post("/api/scheduled-notifications/scheduler/stop", response_model=MessageResponse)
async def stop_scheduler_endpoint(
    current_user: User = Depends(require_admin)
):
    """
    停止调度器（管理员级别可访问：调度、老板、超级管理员）

    Args:
        current_user: 当前登录用户

    Returns:
        MessageResponse: 停止结果消息
    """
    if not is_scheduler_running():
        return MessageResponse(message="调度器未运行")

    stop_scheduler()
    return MessageResponse(message="调度器已停止")
