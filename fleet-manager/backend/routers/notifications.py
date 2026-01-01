"""
通知系统路由模块
提供通知管理、通知模板、SSE 实时推送等功能

包含的端点：
- GET /api/notifications - 获取通知列表
- POST /api/notifications - 发送通知
- PUT /api/notifications/{id}/read - 标记通知为已读
- PUT /api/notifications/read-all - 标记所有通知为已读
- GET /api/notifications/unread-count - 获取未读数量
- GET /api/notifications/{id} - 获取通知详情
- GET /api/notifications/stream - SSE 实时通知推送
- GET /api/notifications/sse-status - 获取 SSE 连接状态
- POST /api/notifications/from-template - 使用模板发送通知
- GET /api/notification-templates - 获取模板列表
- POST /api/notification-templates - 创建模板
- GET /api/notification-templates/{id} - 获取模板详情
- PUT /api/notification-templates/{id} - 更新模板
- DELETE /api/notification-templates/{id} - 删除模板
- POST /api/notification-templates/{id}/preview - 预览模板
- GET /api/notification-templates/categories - 获取模板分类

Requirements: 9.1 - 创建 routers/ 目录包含各功能模块路由
"""

import asyncio
import json
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from fastapi.responses import StreamingResponse
from sqlmodel import Session

from database import get_session, engine
from models import User, Notification as NotificationModel
from auth import get_current_user, require_management, require_admin, check_resource_ownership
import crud
import helpers

from schemas import (
    NotificationCreate, NotificationResponse, UnreadCountResponse,
    NotificationFromTemplateCreate,
    NotificationTemplateCreate, NotificationTemplateUpdate, NotificationTemplateResponse,
    MessageResponse
)


# 创建路由器
router = APIRouter(tags=["通知管理"])


# ==================== 存储活跃的 SSE 连接 ====================
# 用户ID -> 最后检查时间戳
# 注意：生产环境应使用 Redis 等分布式存储
_active_connections: dict[int, float] = {}


# ==================== 通知 API ====================

@router.get("/api/notifications", response_model=List[NotificationResponse])
async def get_notifications(
    is_read: Optional[bool] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    获取当前用户的通知列表

    Args:
        is_read: 按已读状态筛选（可选）
        skip: 跳过记录数
        limit: 返回记录数
        current_user: 当前登录用户
        session: 数据库会话

    Returns:
        List[NotificationResponse]: 通知列表
    """
    notifications = crud.get_notifications(
        session,
        user_id=current_user.id,
        is_read=is_read,
        skip=skip,
        limit=limit
    )
    return notifications


@router.post("/api/notifications", response_model=MessageResponse)
async def create_notification(
    request: NotificationCreate,
    current_user: User = Depends(require_management),
    session: Session = Depends(get_session)
):
    """
    发送通知（管理权限可操作：车队长、调度、老板、超级管理员）

    Args:
        request: 通知创建请求
        current_user: 当前登录用户
        session: 数据库会话

    Returns:
        MessageResponse: 发送成功消息
    """
    crud.create_notifications_batch(
        session,
        user_ids=request.user_ids,
        title=request.title,
        content=request.content,
        sender_id=current_user.id
    )

    return MessageResponse(message=f"通知已发送给 {len(request.user_ids)} 位用户")


@router.put("/api/notifications/{notification_id}/read", response_model=NotificationResponse)
async def mark_notification_as_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    标记通知为已读

    Args:
        notification_id: 通知ID
        current_user: 当前登录用户
        session: 数据库会话

    Returns:
        NotificationResponse: 更新后的通知

    Raises:
        HTTPException 404: 通知不存在
        HTTPException 403: 无权操作该通知
    """
    notification = session.get(crud.Notification, notification_id)
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="通知不存在"
        )

    # 权限控制：使用统一的资源所有权检查
    check_resource_ownership(notification, current_user, "通知")

    updated = crud.mark_notification_as_read(session, notification)
    return updated


@router.put("/api/notifications/read-all", response_model=MessageResponse)
async def mark_all_notifications_as_read(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    标记所有通知为已读

    将当前用户的所有未读通知标记为已读状态。

    Args:
        current_user: 当前登录用户
        session: 数据库会话

    Returns:
        MessageResponse: 操作成功消息
    """
    from sqlmodel import select as sql_select

    # 查询当前用户的所有未读通知
    notifications = session.exec(
        sql_select(NotificationModel).where(
            NotificationModel.user_id == current_user.id,
            NotificationModel.is_read.is_(False)
        )
    ).all()

    # 标记为已读
    count = 0
    for notification in notifications:
        notification.is_read = True
        session.add(notification)
        count += 1

    session.commit()

    return MessageResponse(message=f"已将 {count} 条通知标记为已读")


@router.get("/api/notifications/unread-count", response_model=UnreadCountResponse)
async def get_unread_count(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    获取当前用户未读通知数量

    注意：此路由必须在 /api/notifications/{notification_id} 之前定义，
    否则 "unread-count" 会被当作 notification_id 解析。

    Args:
        current_user: 当前登录用户
        session: 数据库会话

    Returns:
        UnreadCountResponse: 未读数量
    """
    count = crud.get_unread_count(session, current_user.id)
    return UnreadCountResponse(count=count)


@router.get("/api/notifications/{notification_id}", response_model=NotificationResponse)
async def get_notification_detail(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    获取通知详情

    获取指定通知的详细信息，只能查看自己的通知。

    Args:
        notification_id: 通知ID
        current_user: 当前登录用户
        session: 数据库会话

    Returns:
        NotificationResponse: 通知详情

    Raises:
        HTTPException 404: 通知不存在
        HTTPException 403: 无权查看该通知
    """
    notification = session.get(crud.Notification, notification_id)
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="通知不存在"
        )

    # 权限控制：只能查看自己的通知
    if notification.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权查看该通知"
        )

    return NotificationResponse(
        id=notification.id,
        user_id=notification.user_id,
        title=notification.title,
        content=notification.content,
        is_read=notification.is_read,
        sender_id=notification.sender_id,
        template_id=notification.template_id,
        created_at=notification.created_at
    )


# ==================== SSE 实时通知 ====================

async def notification_event_generator(user_id: int, last_id: int = 0):
    """
    SSE 事件生成器
    定期检查新通知和业务事件并推送给客户端

    重构说明：
    - 通知数据构建已提取到 helpers.build_notification_event_data()
    - 心跳数据构建已提取到 helpers.build_heartbeat_data()
    - SSE 事件格式化已提取到 helpers.format_sse_event()

    支持的事件类型：
    - notification: 新通知到达
    - heartbeat: 心跳包（包含未读数量）
    - vehicle_update: 车辆更新事件
    - leave_update: 请假更新事件
    - piece_work_update: 计件更新事件
    - assignment_update: 仓库分配更新事件
    - permission_update: 权限更新事件
    - user_update: 用户状态更新事件

    Requirements: 1.1, 1.2, 3.2 - 扩展 SSE 事件类型，支持业务事件分发

    Args:
        user_id: 用户ID
        last_id: 上次接收的最后一条通知ID

    Yields:
        SSE 格式的事件数据
    """
    import time
    from events import pop_events

    # 记录连接
    _active_connections[user_id] = time.time()

    # 配置参数
    heartbeat_interval = 30  # 心跳间隔（秒）
    check_interval = 5       # 检查新通知间隔（秒）

    last_heartbeat = time.time()
    current_last_id = last_id

    try:
        while True:
            current_time = time.time()

            # 1. 检查新通知
            with Session(engine) as session:
                new_notifications = crud.get_new_notifications(
                    session, user_id=user_id, after_id=current_last_id
                )

                if new_notifications:
                    # 更新最后ID
                    current_last_id = max(n.id for n in new_notifications)
                    # 构建并发送通知事件
                    notifications_data = helpers.build_notification_event_data(new_notifications)
                    yield helpers.format_sse_event("notification", notifications_data)

                # 获取未读数量
                unread_count = crud.get_unread_count(session, user_id)

            # 2. 检查业务事件
            business_events = pop_events(user_id)
            for event in business_events:
                event_type = event.event_type.value
                yield helpers.format_sse_event(event_type, event.data)

            # 3. 发送心跳（包含未读数量）
            if current_time - last_heartbeat >= heartbeat_interval:
                heartbeat_data = helpers.build_heartbeat_data(unread_count, current_time)
                yield helpers.format_sse_event("heartbeat", heartbeat_data)
                last_heartbeat = current_time

            # 更新活跃时间
            _active_connections[user_id] = current_time

            # 等待下次检查
            await asyncio.sleep(check_interval)

    except asyncio.CancelledError:
        # 连接被取消（客户端断开）
        pass
    finally:
        # 清理连接记录
        if user_id in _active_connections:
            del _active_connections[user_id]


@router.get("/api/notifications/stream")
async def notification_stream(
    request: Request,
    last_id: int = Query(0, ge=0, description="上次接收的最后一条通知ID"),
    token: Optional[str] = Query(None, description="JWT Token（用于 SSE 认证）")
):
    """
    SSE 实时通知和业务事件推送接口

    客户端通过 EventSource 连接此接口，实时接收新通知和业务事件。
    支持统一实时更新系统的所有事件类型。

    重构说明：
    - Token 验证已提取到 helpers.validate_sse_token()
    - 用户验证已提取到 helpers.validate_sse_user()

    Requirements: 1.1, 1.2, 3.2 - 扩展 SSE 事件类型，支持业务事件分发

    事件类型：
    - notification: 新通知到达
    - heartbeat: 心跳包（包含未读数量）
    - vehicle_update: 车辆更新事件
    - leave_update: 请假更新事件
    - piece_work_update: 计件更新事件
    - assignment_update: 仓库分配更新事件
    - permission_update: 权限更新事件
    - user_update: 用户状态更新事件

    Args:
        request: HTTP 请求对象
        last_id: 上次接收的最后一条通知ID
        token: JWT Token（用于 SSE 认证）

    Returns:
        StreamingResponse: SSE 事件流
    """
    # 1. 验证 Token 并获取用户 ID
    user_id = helpers.validate_sse_token(token)

    # 2. 验证用户存在且活跃
    with Session(engine) as session:
        helpers.validate_sse_user(session, user_id)

    # 3. 返回 SSE 响应
    return StreamingResponse(
        notification_event_generator(user_id, last_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # 禁用 Nginx 缓冲
        }
    )


@router.get("/api/notifications/sse-status")
async def get_sse_status(
    current_user: User = Depends(get_current_user)
):
    """
    获取 SSE 连接状态
    用于前端判断是否需要降级到轮询

    Args:
        current_user: 当前登录用户

    Returns:
        dict: SSE 连接状态信息
    """
    is_connected = current_user.id in _active_connections
    last_active = _active_connections.get(current_user.id)

    return {
        "sse_supported": True,
        "is_connected": is_connected,
        "last_active": last_active,
        "connection_count": len(_active_connections)
    }


# ==================== 通知模板 API ====================

@router.get("/api/notification-templates", response_model=List[NotificationTemplateResponse], tags=["通知模板"])
async def get_notification_templates(
    category: Optional[str] = Query(None, description="按分类筛选"),
    is_active: Optional[bool] = Query(None, description="按启用状态筛选"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user: User = Depends(require_management),
    session: Session = Depends(get_session)
):
    """
    获取通知模板列表
    管理权限可访问（车队长、调度、老板）

    Args:
        category: 按分类筛选（可选）
        is_active: 按启用状态筛选（可选）
        skip: 跳过记录数
        limit: 返回记录数
        current_user: 当前登录用户（需要管理权限）
        session: 数据库会话

    Returns:
        List[NotificationTemplateResponse]: 模板列表
    """
    templates = crud.get_notification_templates(
        session,
        category=category,
        is_active=is_active,
        skip=skip,
        limit=limit
    )

    # 转换响应格式（解析 variables JSON）
    result = []
    for template in templates:
        variables = None
        if template.variables:
            try:
                variables = json.loads(template.variables)
            except json.JSONDecodeError:
                variables = None

        result.append(NotificationTemplateResponse(
            id=template.id,
            name=template.name,
            title=template.title,
            content=template.content,
            variables=variables,
            category=template.category,
            is_active=template.is_active,
            created_at=template.created_at,
            updated_at=template.updated_at
        ))

    return result


@router.post("/api/notification-templates", response_model=NotificationTemplateResponse, tags=["通知模板"])
async def create_notification_template(
    request: NotificationTemplateCreate,
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    """
    创建通知模板（管理员级别可访问：调度、老板、超级管理员）

    模板支持变量占位符，格式为 {variable_name}
    例如：标题 "请假申请已{status}"，内容 "{user_name}的请假申请已{status}"

    Args:
        request: 模板创建请求
        current_user: 当前登录用户
        session: 数据库会话

    Returns:
        NotificationTemplateResponse: 创建的模板

    Raises:
        HTTPException 400: 模板名称已存在
    """
    # 检查模板名称是否已存在
    existing = crud.get_notification_template_by_name(session, request.name)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="模板名称已存在"
        )

    template = crud.create_notification_template(
        session,
        name=request.name,
        title=request.title,
        content=request.content,
        variables=request.variables,
        category=request.category,
        is_active=request.is_active
    )

    # 解析 variables JSON
    variables = None
    if template.variables:
        try:
            variables = json.loads(template.variables)
        except json.JSONDecodeError:
            variables = None

    return NotificationTemplateResponse(
        id=template.id,
        name=template.name,
        title=template.title,
        content=template.content,
        variables=variables,
        category=template.category,
        is_active=template.is_active,
        created_at=template.created_at,
        updated_at=template.updated_at
    )


@router.get("/api/notification-templates/{template_id}", response_model=NotificationTemplateResponse, tags=["通知模板"])
async def get_notification_template(
    template_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    获取通知模板详情

    Args:
        template_id: 模板ID
        current_user: 当前登录用户
        session: 数据库会话

    Returns:
        NotificationTemplateResponse: 模板详情

    Raises:
        HTTPException 404: 模板不存在
    """
    template = crud.get_notification_template_by_id(session, template_id)
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="模板不存在"
        )

    # 解析 variables JSON
    variables = None
    if template.variables:
        try:
            variables = json.loads(template.variables)
        except json.JSONDecodeError:
            variables = None

    return NotificationTemplateResponse(
        id=template.id,
        name=template.name,
        title=template.title,
        content=template.content,
        variables=variables,
        category=template.category,
        is_active=template.is_active,
        created_at=template.created_at,
        updated_at=template.updated_at
    )


@router.put("/api/notification-templates/{template_id}", response_model=NotificationTemplateResponse, tags=["通知模板"])
async def update_notification_template(
    template_id: int,
    request: NotificationTemplateUpdate,
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    """
    更新通知模板（管理员级别可访问：调度、老板、超级管理员）

    Args:
        template_id: 模板ID
        request: 模板更新请求
        current_user: 当前登录用户
        session: 数据库会话

    Returns:
        NotificationTemplateResponse: 更新后的模板

    Raises:
        HTTPException 404: 模板不存在
        HTTPException 400: 模板名称已存在
    """
    template = crud.get_notification_template_by_id(session, template_id)
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="模板不存在"
        )

    # 如果要更新名称，检查新名称是否已存在
    if request.name and request.name != template.name:
        existing = crud.get_notification_template_by_name(session, request.name)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="模板名称已存在"
            )

    updated = crud.update_notification_template(
        session, template,
        name=request.name,
        title=request.title,
        content=request.content,
        variables=request.variables,
        category=request.category,
        is_active=request.is_active
    )

    # 解析 variables JSON
    variables = None
    if updated.variables:
        try:
            variables = json.loads(updated.variables)
        except json.JSONDecodeError:
            variables = None

    return NotificationTemplateResponse(
        id=updated.id,
        name=updated.name,
        title=updated.title,
        content=updated.content,
        variables=variables,
        category=updated.category,
        is_active=updated.is_active,
        created_at=updated.created_at,
        updated_at=updated.updated_at
    )


@router.delete("/api/notification-templates/{template_id}", response_model=MessageResponse, tags=["通知模板"])
async def delete_notification_template(
    template_id: int,
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    """
    删除通知模板（管理员级别可访问：调度、老板、超级管理员）

    Args:
        template_id: 模板ID
        current_user: 当前登录用户
        session: 数据库会话

    Returns:
        MessageResponse: 删除成功消息

    Raises:
        HTTPException 404: 模板不存在
    """
    template = crud.get_notification_template_by_id(session, template_id)
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="模板不存在"
        )

    crud.delete_notification_template(session, template)
    return MessageResponse(message="模板已删除")


@router.post("/api/notification-templates/{template_id}/preview", tags=["通知模板"])
async def preview_notification_template(
    template_id: int,
    request: dict = None,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    预览通知模板渲染效果

    传入变量值，返回渲染后的标题和内容
    用于发送通知前预览效果

    Args:
        template_id: 模板ID
        request: 请求体，包含 variables 字段
        current_user: 当前登录用户
        session: 数据库会话

    Returns:
        dict: 渲染后的标题和内容

    Raises:
        HTTPException 404: 模板不存在
    """
    template = crud.get_notification_template_by_id(session, template_id)
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="模板不存在"
        )

    # 从请求体中获取变量
    variables = None
    if request:
        variables = request.get("variables", {})

    # 渲染模板
    title, content = crud.render_notification_template(template, variables)

    return {
        "template_id": template_id,
        "template_name": template.name,
        "title": title,
        "content": content,
        "rendered_title": title,
        "rendered_content": content,
        "variables_used": variables or {}
    }


@router.post("/api/notifications/from-template", response_model=MessageResponse)
async def create_notification_from_template(
    request: NotificationFromTemplateCreate,
    current_user: User = Depends(require_management),
    session: Session = Depends(get_session)
):
    """
    使用模板发送通知（管理权限可操作：车队长、调度、老板、超级管理员）

    通过模板ID和变量值创建通知，自动渲染模板内容

    Args:
        request: 模板通知创建请求
        current_user: 当前登录用户
        session: 数据库会话

    Returns:
        MessageResponse: 发送成功消息

    Raises:
        HTTPException 400: 模板不存在或已禁用
    """
    try:
        notifications = crud.create_notification_from_template(
            session,
            user_ids=request.user_ids,
            template_id=request.template_id,
            variables=request.variables,
            sender_id=current_user.id
        )

        return MessageResponse(message=f"通知已发送给 {len(notifications)} 位用户")
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/api/notification-templates/categories", tags=["通知模板"])
async def get_template_categories(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    获取所有模板分类

    返回系统中已有的模板分类列表，用于前端筛选

    Args:
        current_user: 当前登录用户
        session: 数据库会话

    Returns:
        dict: 分类列表
    """
    templates = crud.get_notification_templates(session)

    # 提取所有不重复的分类
    categories = set()
    for template in templates:
        if template.category:
            categories.add(template.category)

    # 分类显示名称映射
    category_names = {
        "attendance": "考勤",
        "leave": "请假",
        "vehicle": "车辆",
        "piece_work": "计件",
        "system": "系统"
    }

    return {
        "categories": [
            {
                "value": cat,
                "label": category_names.get(cat, cat)
            }
            for cat in sorted(categories)
        ]
    }
