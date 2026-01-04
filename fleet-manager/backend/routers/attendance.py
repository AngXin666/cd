"""
考勤打卡路由模块
提供上班打卡、下班打卡、获取今日打卡状态、获取考勤记录列表等 API

Requirements: 9.1 - 提取考勤打卡路由到独立模块
"""

from datetime import date
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import Session

from database import get_session
from models import User, UserRole, is_role
from auth import get_current_user, require_active_user
import crud
from schemas import (
    AttendanceResponse,
    TodayAttendanceResponse
)


# 创建考勤路由器
router = APIRouter(
    prefix="/api/attendance",
    tags=["考勤管理"]
)


@router.post("/clock-in", response_model=AttendanceResponse)
async def clock_in(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    上班打卡（司机操作）

    禁用用户无法进行打卡操作。

    Args:
        current_user: 当前登录用户
        session: 数据库会话

    Returns:
        AttendanceResponse: 打卡记录响应

    Raises:
        PermissionError: 用户已被禁用

    Requirements: 8.1, 12.3 - 禁用用户无法进行数据录入操作
    """
    # 检查用户是否激活（禁用用户无法打卡）
    require_active_user(current_user)

    attendance = crud.clock_in(session, current_user.id)

    # 构建响应
    return AttendanceResponse(
        id=attendance.id,
        user_id=attendance.user_id,
        work_date=attendance.work_date,
        clock_in=attendance.clock_in,
        clock_out=attendance.clock_out,
        work_hours=attendance.work_hours,
        created_at=attendance.created_at,
        user_name=current_user.name
    )


@router.post("/clock-out", response_model=AttendanceResponse)
async def clock_out(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    下班打卡（司机操作）

    禁用用户无法进行打卡操作。

    Args:
        current_user: 当前登录用户
        session: 数据库会话

    Returns:
        AttendanceResponse: 打卡记录响应

    Raises:
        HTTPException 400: 今天还没有上班打卡
        PermissionError: 用户已被禁用

    Requirements: 8.1, 12.3 - 禁用用户无法进行数据录入操作
    """
    # 检查用户是否激活（禁用用户无法打卡）
    require_active_user(current_user)

    attendance = crud.clock_out(session, current_user.id)

    if not attendance:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="今天还没有上班打卡，请先上班打卡"
        )

    return AttendanceResponse(
        id=attendance.id,
        user_id=attendance.user_id,
        work_date=attendance.work_date,
        clock_in=attendance.clock_in,
        clock_out=attendance.clock_out,
        work_hours=attendance.work_hours,
        created_at=attendance.created_at,
        user_name=current_user.name
    )


@router.get("/today", response_model=TodayAttendanceResponse)
async def get_today_attendance(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    获取今日打卡状态

    Args:
        current_user: 当前登录用户
        session: 数据库会话

    Returns:
        TodayAttendanceResponse: 今日打卡状态响应
    """
    attendance = crud.get_today_attendance(session, current_user.id)

    if not attendance:
        return TodayAttendanceResponse(
            has_clocked_in=False,
            has_clocked_out=False,
            clock_in_time=None,
            clock_out_time=None,
            work_hours=None
        )

    return TodayAttendanceResponse(
        has_clocked_in=attendance.clock_in is not None,
        has_clocked_out=attendance.clock_out is not None,
        clock_in_time=attendance.clock_in,
        clock_out_time=attendance.clock_out,
        work_hours=attendance.work_hours
    )


@router.get("", response_model=List[AttendanceResponse])
async def get_attendance_records(
    user_id: Optional[int] = None,
    warehouse_id: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    获取考勤记录列表
    
    权限控制：
    - 司机：只能查看自己的记录，忽略 warehouse_id 参数
    - 车队长：只能查看自己管理仓库的司机考勤，可按仓库筛选
    - 调度/老板：可以查看所有，支持按仓库筛选

    Args:
        user_id: 用户ID过滤（可选）
        warehouse_id: 仓库ID过滤（可选），按仓库分配的用户筛选
        start_date: 开始日期过滤（可选）
        end_date: 结束日期过滤（可选）
        skip: 跳过记录数
        limit: 返回记录数上限
        current_user: 当前登录用户
        session: 数据库会话

    Returns:
        List[AttendanceResponse]: 考勤记录列表

    Raises:
        HTTPException 403: 车队长访问非管理仓库时返回

    Requirements: 1.1, 2.1 - 考勤列表支持按仓库筛选和角色权限控制
    """
    # 用于按用户列表筛选
    user_ids_filter = None

    # 权限控制：司机只能查看自己的记录
    if is_role(current_user.role, UserRole.DRIVER):
        user_id = current_user.id
        # 司机忽略 warehouse_id 参数

    # 权限控制：车队长只能查看自己管理仓库的司机
    elif is_role(current_user.role, UserRole.MANAGER):
        # 获取车队长管理的仓库
        manager_warehouses = crud.get_user_warehouses(session, current_user.id)
        manager_warehouse_ids = [w.id for w in manager_warehouses]

        # 如果指定了仓库，验证是否在管理范围内
        if warehouse_id and warehouse_id not in manager_warehouse_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="无权查看该仓库的考勤记录"
            )

        # 获取允许查看的用户列表
        target_warehouse_ids = [warehouse_id] if warehouse_id else manager_warehouse_ids
        allowed_user_ids = set()
        for wid in target_warehouse_ids:
            warehouse_users = crud.get_warehouse_users(session, wid)
            for user in warehouse_users:
                allowed_user_ids.add(user.id)

        # 如果指定了 user_id，验证是否在允许范围内
        if user_id:
            if user_id not in allowed_user_ids:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="无权查看该用户的考勤记录"
                )
        else:
            # 使用用户列表筛选
            user_ids_filter = list(allowed_user_ids) if allowed_user_ids else None

    # 调度和老板：可以查看所有，支持按仓库筛选
    # 注意：current_user.role 是字符串，需要与枚举值比较
    elif current_user.role in [UserRole.BOSS.value, UserRole.PEER_ADMIN.value]:
        if warehouse_id:
            # 获取该仓库的用户列表
            warehouse_users = crud.get_warehouse_users(session, warehouse_id)
            user_ids_filter = [u.id for u in warehouse_users]

    # 查询考勤记录
    records = crud.get_attendance_records(
        session,
        user_id=user_id,
        user_ids=user_ids_filter,
        start_date=start_date,
        end_date=end_date,
        skip=skip,
        limit=limit
    )

    # 构建响应（添加用户姓名）
    result = []
    for record in records:
        user = crud.get_user_by_id(session, record.user_id)
        result.append(AttendanceResponse(
            id=record.id,
            user_id=record.user_id,
            work_date=record.work_date,
            clock_in=record.clock_in,
            clock_out=record.clock_out,
            work_hours=record.work_hours,
            created_at=record.created_at,
            user_name=user.name if user else None
        ))

    return result
