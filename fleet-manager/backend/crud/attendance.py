"""
考勤 CRUD 操作模块
实现考勤打卡的增删改查操作
"""

from datetime import datetime, date
from typing import Optional, List
from sqlmodel import Session, select
from models import Attendance


def clock_in(session: Session, user_id: int) -> Attendance:
    """
    上班打卡

    Args:
        session: 数据库会话
        user_id: 用户ID

    Returns:
        Attendance: 考勤记录对象
    """
    today = date.today()
    now = datetime.now()

    # 检查今天是否已打卡
    existing = session.exec(
        select(Attendance).where(
            Attendance.user_id == user_id,
            Attendance.work_date == today
        )
    ).first()

    if existing:
        # 已有记录，更新上班时间（如果还没打过）
        if existing.clock_in is None:
            existing.clock_in = now
            session.add(existing)
            session.commit()
            session.refresh(existing)
        return existing

    # 创建新记录
    attendance = Attendance(
        user_id=user_id,
        work_date=today,
        clock_in=now
    )
    session.add(attendance)
    session.commit()
    session.refresh(attendance)
    return attendance


def clock_out(session: Session, user_id: int) -> Optional[Attendance]:
    """
    下班打卡

    Args:
        session: 数据库会话
        user_id: 用户ID

    Returns:
        Attendance: 考勤记录对象，如果今天没有上班打卡则返回 None
    """
    today = date.today()
    now = datetime.now()

    # 查找今天的打卡记录
    attendance = session.exec(
        select(Attendance).where(
            Attendance.user_id == user_id,
            Attendance.work_date == today
        )
    ).first()

    if not attendance:
        return None

    # 更新下班时间
    attendance.clock_out = now

    # 计算工作时长（小时）
    if attendance.clock_in:
        delta = now - attendance.clock_in
        attendance.work_hours = round(delta.total_seconds() / 3600, 2)

    session.add(attendance)
    session.commit()
    session.refresh(attendance)
    return attendance


def get_today_attendance(session: Session, user_id: int) -> Optional[Attendance]:
    """
    获取今日打卡状态

    Args:
        session: 数据库会话
        user_id: 用户ID

    Returns:
        Attendance: 今日考勤记录，不存在则返回 None
    """
    today = date.today()
    return session.exec(
        select(Attendance).where(
            Attendance.user_id == user_id,
            Attendance.work_date == today
        )
    ).first()


def get_attendance_records(
    session: Session,
    user_id: Optional[int] = None,
    user_ids: Optional[List[int]] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    skip: int = 0,
    limit: int = 100
) -> List[Attendance]:
    """
    获取考勤记录列表

    Args:
        session: 数据库会话
        user_id: 按单个用户筛选（可选）
        user_ids: 按用户ID列表筛选（可选）
        start_date: 开始日期（可选）
        end_date: 结束日期（可选）
        skip: 跳过记录数
        limit: 返回记录数上限

    Returns:
        List[Attendance]: 考勤记录列表
    """
    statement = select(Attendance)

    if user_id is not None:
        statement = statement.where(Attendance.user_id == user_id)
    elif user_ids is not None and len(user_ids) > 0:
        statement = statement.where(Attendance.user_id.in_(user_ids))

    if start_date is not None:
        statement = statement.where(Attendance.work_date >= start_date)
    if end_date is not None:
        statement = statement.where(Attendance.work_date <= end_date)

    statement = statement.order_by(Attendance.work_date.desc())
    statement = statement.offset(skip).limit(limit)

    return list(session.exec(statement).all())
