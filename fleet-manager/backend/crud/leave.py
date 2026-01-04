"""
请假 CRUD 操作模块
实现请假申请的增删改查操作
"""

from datetime import datetime, date
from typing import Optional, List
from sqlmodel import Session, select
from models import LeaveApplication, LeaveStatus


def create_leave_application(
    session: Session,
    user_id: int,
    leave_type: str,
    start_date: date,
    end_date: date,
    reason: Optional[str] = None
) -> LeaveApplication:
    """
    创建请假申请

    Args:
        session: 数据库会话
        user_id: 申请人ID
        leave_type: 申请类型
        start_date: 开始日期
        end_date: 结束日期
        reason: 申请原因（可选）

    Returns:
        LeaveApplication: 创建的申请对象
    """
    application = LeaveApplication(
        user_id=user_id,
        leave_type=leave_type,
        start_date=start_date,
        end_date=end_date,
        reason=reason
    )
    session.add(application)
    session.commit()
    session.refresh(application)
    return application


def get_leave_applications(
    session: Session,
    user_id: Optional[int] = None,
    status: Optional[LeaveStatus] = None,
    skip: int = 0,
    limit: int = 100
) -> List[LeaveApplication]:
    """
    获取请假申请列表

    Args:
        session: 数据库会话
        user_id: 按申请人筛选（可选）
        status: 按状态筛选（可选）
        skip: 跳过记录数
        limit: 返回记录数上限

    Returns:
        List[LeaveApplication]: 申请列表
    """
    statement = select(LeaveApplication)

    if user_id is not None:
        statement = statement.where(LeaveApplication.user_id == user_id)
    if status is not None:
        statement = statement.where(LeaveApplication.status == status)

    statement = statement.order_by(LeaveApplication.created_at.desc())
    statement = statement.offset(skip).limit(limit)

    return list(session.exec(statement).all())


def approve_leave_application(
    session: Session,
    application: LeaveApplication,
    approver_id: int,
    status: LeaveStatus,
    approve_remark: Optional[str] = None
) -> LeaveApplication:
    """
    审批请假申请

    Args:
        session: 数据库会话
        application: 申请对象
        approver_id: 审批人ID
        status: 审批状态
        approve_remark: 审批备注（可选）

    Returns:
        LeaveApplication: 更新后的申请对象
    """
    application.status = status
    application.approver_id = approver_id
    application.approve_remark = approve_remark
    application.updated_at = datetime.now()

    session.add(application)
    session.commit()
    session.refresh(application)
    return application
