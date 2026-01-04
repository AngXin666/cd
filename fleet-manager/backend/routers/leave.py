"""
请假管理路由模块
提供请假申请的创建、查询、审批等功能
"""

from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import Session

from database import get_session
from models import User, UserRole, LeaveStatus, LeaveApplication, is_role
from auth import get_current_user, require_management, require_active_user, check_resource_ownership
from schemas import (
    LeaveApplicationCreate, LeaveApproveRequest, LeaveApplicationResponse
)
import crud
from events import emit_leave_update


# ==================== 创建路由器 ====================
router = APIRouter(prefix="/api/leave", tags=["请假管理"])


# ==================== 请假 API ====================

@router.get("", response_model=List[LeaveApplicationResponse])
async def get_leave_applications(
    user_id: Optional[int] = None,
    leave_status: Optional[LeaveStatus] = Query(None, alias="status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    获取请假申请列表
    - 司机只能查看自己的申请
    - 车队长只能查看其管辖仓库内司机的申请
    - 老板/调度可以查看所有申请

    Args:
        user_id: 按用户ID过滤（可选）
        leave_status: 按申请状态过滤（可选）
        skip: 跳过记录数，默认0
        limit: 返回记录数上限，默认100，最大1000
        current_user: 当前登录用户
        session: 数据库会话

    Returns:
        List[LeaveApplicationResponse]: 请假申请列表
    """
    # 权限控制：司机只能查看自己的申请
    if is_role(current_user.role, UserRole.DRIVER):
        user_id = current_user.id

    applications = crud.get_leave_applications(
        session,
        user_id=user_id,
        status=leave_status,
        skip=skip,
        limit=limit
    )

    # 车队长权限过滤：只能看到其管辖仓库内司机的申请
    if is_role(current_user.role, UserRole.MANAGER):
        # 获取车队长管辖的仓库
        manager_warehouses = crud.get_user_warehouses(session, current_user.id)
        manager_warehouse_ids = set(w.id for w in manager_warehouses)
        
        # 获取这些仓库内的所有司机ID
        managed_driver_ids = set()
        for warehouse_id in manager_warehouse_ids:
            warehouse_users = crud.get_warehouse_users(session, warehouse_id)
            for user in warehouse_users:
                if is_role(user.role, UserRole.DRIVER):
                    managed_driver_ids.add(user.id)
        
        # 过滤只保留管辖范围内司机的申请
        applications = [app for app in applications if app.user_id in managed_driver_ids]

    # 构建响应（添加关联信息）
    result = []
    for app in applications:
        user = crud.get_user_by_id(session, app.user_id)
        approver = crud.get_user_by_id(session, app.approver_id) if app.approver_id else None
        
        # 获取申请人所属仓库名称
        warehouse_name = None
        if user:
            user_warehouses = crud.get_user_warehouses(session, user.id)
            if user_warehouses:
                # 取第一个仓库名称（如果有多个仓库，用逗号分隔）
                warehouse_name = ", ".join(w.name for w in user_warehouses)

        result.append(LeaveApplicationResponse(
            id=app.id,
            user_id=app.user_id,
            leave_type=app.leave_type,
            start_date=app.start_date,
            end_date=app.end_date,
            reason=app.reason,
            status=app.status,
            approver_id=app.approver_id,
            approve_remark=app.approve_remark,
            created_at=app.created_at,
            updated_at=app.updated_at,
            user_name=user.name if user else None,
            approver_name=approver.name if approver else None,
            warehouse_name=warehouse_name
        ))

    return result


@router.post("", response_model=LeaveApplicationResponse)
async def create_leave_application(
    request: LeaveApplicationCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    提交请假申请（司机操作）
    创建申请后自动发送通知给管理员

    禁用用户无法提交请假申请。
    不允许提交与已有申请（待审批/已批准）日期重叠的请假。

    Args:
        request: 请假申请数据
        current_user: 当前登录用户
        session: 数据库会话

    Returns:
        LeaveApplicationResponse: 创建的请假申请

    Raises:
        PermissionError: 用户已被禁用
        HTTPException 400: 请假日期与已有申请重叠

    Requirements: 8.1, 12.3 - 禁用用户无法进行数据录入操作
    """
    # 检查用户是否激活（禁用用户无法提交请假申请）
    require_active_user(current_user)

    # 检查是否与已有申请（待审批/已批准）日期重叠
    existing_applications = crud.get_leave_applications(
        session,
        user_id=current_user.id,
        skip=0,
        limit=1000
    )
    
    for app in existing_applications:
        # 只检查待审批和已批准的申请
        if app.status not in [LeaveStatus.PENDING, LeaveStatus.APPROVED]:
            continue
        
        # 检查日期是否重叠：新申请的开始日期 <= 已有申请的结束日期 且 新申请的结束日期 >= 已有申请的开始日期
        if request.start_date <= app.end_date and request.end_date >= app.start_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"请假日期与已有申请重叠（{app.start_date} 至 {app.end_date}）"
            )

    application = crud.create_leave_application(
        session,
        user_id=current_user.id,
        leave_type=request.leave_type,
        start_date=request.start_date,
        end_date=request.end_date,
        reason=request.reason
    )

    # 发送审批通知给管辖车队长、调度、老板
    leave_type_text = "请假" if request.leave_type == "leave" else "离职"
    ref_type = "leave" if request.leave_type == "leave" else "resign"
    content = f"{current_user.name} 提交了{leave_type_text}申请，日期：{request.start_date} 至 {request.end_date}"
    if request.reason:
        content += f"，原因：{request.reason}"
    crud.create_approval_notification(
        session,
        applicant_id=current_user.id,
        ref_type=ref_type,
        ref_id=application.id,
        title=f"新的{leave_type_text}申请",
        content=content
    )

    return LeaveApplicationResponse(
        id=application.id,
        user_id=application.user_id,
        leave_type=application.leave_type,
        start_date=application.start_date,
        end_date=application.end_date,
        reason=application.reason,
        status=application.status,
        approver_id=application.approver_id,
        approve_remark=application.approve_remark,
        created_at=application.created_at,
        updated_at=application.updated_at,
        user_name=current_user.name,
        approver_name=None
    )


@router.get("/{application_id}", response_model=LeaveApplicationResponse)
async def get_leave_application(
    application_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    获取请假申请详情

    Args:
        application_id: 申请ID
        current_user: 当前登录用户
        session: 数据库会话

    Returns:
        LeaveApplicationResponse: 请假申请详情

    Raises:
        HTTPException 404: 申请不存在
        HTTPException 403: 无权查看该申请
    """
    application = session.get(LeaveApplication, application_id)
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="申请不存在"
        )

    # 权限控制：使用统一的资源所有权检查
    check_resource_ownership(application, current_user, "请假申请")

    user = crud.get_user_by_id(session, application.user_id)
    approver = crud.get_user_by_id(session, application.approver_id) if application.approver_id else None

    return LeaveApplicationResponse(
        id=application.id,
        user_id=application.user_id,
        leave_type=application.leave_type,
        start_date=application.start_date,
        end_date=application.end_date,
        reason=application.reason,
        status=application.status,
        approver_id=application.approver_id,
        approve_remark=application.approve_remark,
        created_at=application.created_at,
        updated_at=application.updated_at,
        user_name=user.name if user else None,
        approver_name=approver.name if approver else None
    )


@router.put("/{application_id}/approve", response_model=LeaveApplicationResponse)
async def approve_leave_application(
    application_id: int,
    request: LeaveApproveRequest,
    current_user: User = Depends(require_management),
    session: Session = Depends(get_session)
):
    """
    审批请假申请（管理权限可操作：车队长、调度、老板、超级管理员）
    审批完成后会触发 leave_update 事件，通知申请人和相关车队长

    Requirements: 3.1, 3.4 - 请假审批实时数据同步

    Args:
        application_id: 申请ID
        request: 审批请求数据
        current_user: 当前登录用户（必须具有管理权限）
        session: 数据库会话

    Returns:
        LeaveApplicationResponse: 审批后的请假申请

    Raises:
        HTTPException 404: 申请不存在
        HTTPException 400: 该申请已审批
    """
    application = session.get(LeaveApplication, application_id)
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="申请不存在"
        )

    # 检查是否已审批
    if application.status != LeaveStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="该申请已审批"
        )

    # 执行审批
    updated = crud.approve_leave_application(
        session,
        application,
        approver_id=current_user.id,
        status=request.status,
        approve_remark=request.approve_remark
    )

    user = crud.get_user_by_id(session, updated.user_id)
    
    # 发送审批完成通知给所有相关人员
    leave_type_text = "请假" if updated.leave_type == "leave" else "离职"
    ref_type = "leave" if updated.leave_type == "leave" else "resign"
    status_text = "批准" if request.status == LeaveStatus.APPROVED else "拒绝"
    result = "approved" if request.status == LeaveStatus.APPROVED else "rejected"
    
    result_content = f"{user.name if user else '用户'} 的{leave_type_text}申请已被 {current_user.name} {status_text}"
    if request.approve_remark:
        result_content += f"，备注：{request.approve_remark}"
    
    crud.complete_approval(
        session,
        ref_type=ref_type,
        ref_id=application.id,
        result=result,
        approver_id=current_user.id,
        applicant_id=updated.user_id,
        result_title=f"{leave_type_text}申请已{status_text}",
        result_content=result_content
    )

    # 触发请假更新事件
    _emit_leave_update_event(session, updated)

    return LeaveApplicationResponse(
        id=updated.id,
        user_id=updated.user_id,
        leave_type=updated.leave_type,
        start_date=updated.start_date,
        end_date=updated.end_date,
        reason=updated.reason,
        status=updated.status,
        approver_id=updated.approver_id,
        approve_remark=updated.approve_remark,
        created_at=updated.created_at,
        updated_at=updated.updated_at,
        user_name=user.name if user else None,
        approver_name=current_user.name
    )


# ==================== 辅助函数 ====================

def _emit_leave_update_event(session: Session, updated: LeaveApplication) -> None:
    """
    触发请假更新事件

    向申请人和车队长推送审批结果
    Requirements: 3.1, 3.4 - 向申请人和车队长推送审批结果

    Args:
        session: 数据库会话
        updated: 更新后的请假申请
    """
    # 构建目标用户列表：申请人 + 对应仓库的车队长
    target_user_ids = [updated.user_id]  # 首先添加申请人

    # 获取申请人分配的仓库
    applicant_warehouses = crud.get_user_warehouses(session, updated.user_id)

    # 获取这些仓库的所有车队长
    for warehouse in applicant_warehouses:
        warehouse_users = crud.get_warehouse_users(session, warehouse.id)
        for warehouse_user in warehouse_users:
            # 只添加车队长角色的用户
            if is_role(warehouse_user.role, UserRole.MANAGER) and warehouse_user.id not in target_user_ids:
                target_user_ids.append(warehouse_user.id)

    # 触发请假更新事件
    # 注意：leave_type 和 status 现在是字符串类型，不需要调用 .value
    emit_leave_update(
        leave_id=updated.id,
        user_id=updated.user_id,
        leave_type=updated.leave_type,
        start_date=updated.start_date.isoformat(),
        end_date=updated.end_date.isoformat(),
        reason=updated.reason,
        status=updated.status,
        approver_id=updated.approver_id,
        approve_remark=updated.approve_remark,
        created_at=updated.created_at.isoformat(),
        updated_at=updated.updated_at.isoformat(),
        target_user_ids=target_user_ids,
        action="update"
    )
