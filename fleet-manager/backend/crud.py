"""
CRUD 操作模块
实现数据库的增删改查操作
包含用户、仓库、考勤、计件、请假、车辆、通知、定时通知等模块的 CRUD
"""

from datetime import datetime, date
from typing import Optional, List
from sqlmodel import Session, select, func
from database import engine
from models import (
    User, Warehouse, WarehouseAssignment, Attendance,
    PieceWorkCategory, PieceWorkRecord, LeaveApplication,
    Vehicle, VehicleDocument, Notification, NotificationTemplate,
    ScheduledNotification, RepeatType, ScheduledNotificationStatus,
    UserRole, LeaveStatus, VehicleStatus
)
from auth import hash_password


# ==================== 用户 CRUD ====================

def create_user(
    session: Session,
    username: str,
    password: str,
    name: str,
    phone: Optional[str] = None,
    role: UserRole = UserRole.DRIVER
) -> User:
    """
    创建新用户
    
    Args:
        session: 数据库会话
        username: 用户名
        password: 明文密码
        name: 真实姓名
        phone: 手机号（可选）
        role: 用户角色，默认为司机
        
    Returns:
        User: 创建的用户对象
    """
    user = User(
        username=username,
        password_hash=hash_password(password),
        name=name,
        phone=phone,
        role=role
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def get_user_by_id(session: Session, user_id: int) -> Optional[User]:
    """
    根据ID获取用户
    
    Args:
        session: 数据库会话
        user_id: 用户ID
        
    Returns:
        User: 用户对象，不存在则返回 None
    """
    return session.get(User, user_id)


def get_user_by_username(session: Session, username: str) -> Optional[User]:
    """
    根据用户名获取用户
    
    Args:
        session: 数据库会话
        username: 用户名
        
    Returns:
        User: 用户对象，不存在则返回 None
    """
    statement = select(User).where(User.username == username)
    return session.exec(statement).first()


def get_users(
    session: Session,
    role: Optional[UserRole] = None,
    is_active: Optional[bool] = None,
    skip: int = 0,
    limit: int = 100
) -> List[User]:
    """
    获取用户列表
    
    Args:
        session: 数据库会话
        role: 按角色筛选（可选）
        is_active: 按启用状态筛选（可选）
        skip: 跳过记录数
        limit: 返回记录数上限
        
    Returns:
        List[User]: 用户列表
    """
    statement = select(User)
    
    # 应用筛选条件
    if role is not None:
        statement = statement.where(User.role == role)
    if is_active is not None:
        statement = statement.where(User.is_active == is_active)
    
    # 分页
    statement = statement.offset(skip).limit(limit)
    
    return list(session.exec(statement).all())


def update_user(
    session: Session,
    user: User,
    name: Optional[str] = None,
    phone: Optional[str] = None,
    role: Optional[UserRole] = None,
    is_active: Optional[bool] = None
) -> User:
    """
    更新用户信息
    
    Args:
        session: 数据库会话
        user: 要更新的用户对象
        name: 新姓名（可选）
        phone: 新手机号（可选）
        role: 新角色（可选）
        is_active: 新启用状态（可选）
        
    Returns:
        User: 更新后的用户对象
    """
    if name is not None:
        user.name = name
    if phone is not None:
        user.phone = phone
    if role is not None:
        user.role = role
    if is_active is not None:
        user.is_active = is_active
    
    user.updated_at = datetime.now()
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def delete_user(session: Session, user: User) -> None:
    """
    删除用户
    
    Args:
        session: 数据库会话
        user: 要删除的用户对象
    """
    session.delete(user)
    session.commit()


def change_user_password(session: Session, user: User, new_password: str) -> User:
    """
    修改用户密码
    
    Args:
        session: 数据库会话
        user: 用户对象
        new_password: 新密码（明文）
        
    Returns:
        User: 更新后的用户对象
    """
    user.password_hash = hash_password(new_password)
    user.updated_at = datetime.now()
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


# ==================== 仓库 CRUD ====================

def create_warehouse(
    session: Session,
    name: str,
    address: Optional[str] = None
) -> Warehouse:
    """
    创建新仓库
    
    Args:
        session: 数据库会话
        name: 仓库名称
        address: 仓库地址（可选）
        
    Returns:
        Warehouse: 创建的仓库对象
    """
    warehouse = Warehouse(name=name, address=address)
    session.add(warehouse)
    session.commit()
    session.refresh(warehouse)
    return warehouse


def get_warehouse_by_id(session: Session, warehouse_id: int) -> Optional[Warehouse]:
    """
    根据ID获取仓库
    
    Args:
        session: 数据库会话
        warehouse_id: 仓库ID
        
    Returns:
        Warehouse: 仓库对象，不存在则返回 None
    """
    return session.get(Warehouse, warehouse_id)


def get_warehouses(
    session: Session,
    is_active: Optional[bool] = None,
    skip: int = 0,
    limit: int = 100
) -> List[Warehouse]:
    """
    获取仓库列表
    
    Args:
        session: 数据库会话
        is_active: 按启用状态筛选（可选）
        skip: 跳过记录数
        limit: 返回记录数上限
        
    Returns:
        List[Warehouse]: 仓库列表
    """
    statement = select(Warehouse)
    
    if is_active is not None:
        statement = statement.where(Warehouse.is_active == is_active)
    
    statement = statement.offset(skip).limit(limit)
    return list(session.exec(statement).all())


def update_warehouse(
    session: Session,
    warehouse: Warehouse,
    name: Optional[str] = None,
    address: Optional[str] = None,
    is_active: Optional[bool] = None
) -> Warehouse:
    """
    更新仓库信息
    
    Args:
        session: 数据库会话
        warehouse: 要更新的仓库对象
        name: 新名称（可选）
        address: 新地址（可选）
        is_active: 新启用状态（可选）
        
    Returns:
        Warehouse: 更新后的仓库对象
    """
    if name is not None:
        warehouse.name = name
    if address is not None:
        warehouse.address = address
    if is_active is not None:
        warehouse.is_active = is_active
    
    session.add(warehouse)
    session.commit()
    session.refresh(warehouse)
    return warehouse


def delete_warehouse(session: Session, warehouse: Warehouse) -> None:
    """
    删除仓库
    
    Args:
        session: 数据库会话
        warehouse: 要删除的仓库对象
    """
    session.delete(warehouse)
    session.commit()


def assign_users_to_warehouse(
    session: Session,
    warehouse_id: int,
    user_ids: List[int]
) -> List[WarehouseAssignment]:
    """
    将用户分配到仓库
    
    Args:
        session: 数据库会话
        warehouse_id: 仓库ID
        user_ids: 用户ID列表
        
    Returns:
        List[WarehouseAssignment]: 创建的分配记录列表
    """
    assignments = []
    for user_id in user_ids:
        # 检查是否已分配
        existing = session.exec(
            select(WarehouseAssignment).where(
                WarehouseAssignment.user_id == user_id,
                WarehouseAssignment.warehouse_id == warehouse_id
            )
        ).first()
        
        if not existing:
            assignment = WarehouseAssignment(
                user_id=user_id,
                warehouse_id=warehouse_id
            )
            session.add(assignment)
            assignments.append(assignment)
    
    session.commit()
    return assignments


def get_user_warehouses(session: Session, user_id: int) -> List[Warehouse]:
    """
    获取用户分配的仓库列表
    
    Args:
        session: 数据库会话
        user_id: 用户ID
        
    Returns:
        List[Warehouse]: 仓库列表
    """
    statement = (
        select(Warehouse)
        .join(WarehouseAssignment)
        .where(WarehouseAssignment.user_id == user_id)
    )
    return list(session.exec(statement).all())


def get_warehouse_users(session: Session, warehouse_id: int) -> List[User]:
    """
    获取仓库下的用户列表
    
    Args:
        session: 数据库会话
        warehouse_id: 仓库ID
        
    Returns:
        List[User]: 用户列表
    """
    statement = (
        select(User)
        .join(WarehouseAssignment)
        .where(WarehouseAssignment.warehouse_id == warehouse_id)
    )
    return list(session.exec(statement).all())


# ==================== 考勤 CRUD ====================

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
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    skip: int = 0,
    limit: int = 100
) -> List[Attendance]:
    """
    获取考勤记录列表
    
    Args:
        session: 数据库会话
        user_id: 按用户筛选（可选）
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
    if start_date is not None:
        statement = statement.where(Attendance.work_date >= start_date)
    if end_date is not None:
        statement = statement.where(Attendance.work_date <= end_date)
    
    # 按日期倒序
    statement = statement.order_by(Attendance.work_date.desc())
    statement = statement.offset(skip).limit(limit)
    
    return list(session.exec(statement).all())


# ==================== 计件分类 CRUD ====================

def create_piece_work_category(
    session: Session,
    name: str,
    unit_price: float,
    unit: str = "件"
) -> PieceWorkCategory:
    """
    创建计件分类
    
    Args:
        session: 数据库会话
        name: 分类名称
        unit_price: 单价
        unit: 计量单位
        
    Returns:
        PieceWorkCategory: 创建的分类对象
    """
    category = PieceWorkCategory(
        name=name,
        unit_price=unit_price,
        unit=unit
    )
    session.add(category)
    session.commit()
    session.refresh(category)
    return category


def get_piece_work_categories(
    session: Session,
    is_active: Optional[bool] = None
) -> List[PieceWorkCategory]:
    """
    获取计件分类列表
    
    Args:
        session: 数据库会话
        is_active: 按启用状态筛选（可选）
        
    Returns:
        List[PieceWorkCategory]: 分类列表
    """
    statement = select(PieceWorkCategory)
    
    if is_active is not None:
        statement = statement.where(PieceWorkCategory.is_active == is_active)
    
    return list(session.exec(statement).all())


def update_piece_work_category(
    session: Session,
    category: PieceWorkCategory,
    name: Optional[str] = None,
    unit_price: Optional[float] = None,
    unit: Optional[str] = None,
    is_active: Optional[bool] = None
) -> PieceWorkCategory:
    """
    更新计件分类
    
    Args:
        session: 数据库会话
        category: 要更新的分类对象
        name: 新名称（可选）
        unit_price: 新单价（可选）
        unit: 新单位（可选）
        is_active: 新启用状态（可选）
        
    Returns:
        PieceWorkCategory: 更新后的分类对象
    """
    if name is not None:
        category.name = name
    if unit_price is not None:
        category.unit_price = unit_price
    if unit is not None:
        category.unit = unit
    if is_active is not None:
        category.is_active = is_active
    
    session.add(category)
    session.commit()
    session.refresh(category)
    return category


# ==================== 计件记录 CRUD ====================

def create_piece_work_record(
    session: Session,
    user_id: int,
    category_id: int,
    work_date: date,
    quantity: int,
    warehouse_id: Optional[int] = None,
    remark: Optional[str] = None
) -> PieceWorkRecord:
    """
    创建计件记录
    
    Args:
        session: 数据库会话
        user_id: 用户ID
        category_id: 分类ID
        work_date: 工作日期
        quantity: 数量
        warehouse_id: 仓库ID（可选）
        remark: 备注（可选）
        
    Returns:
        PieceWorkRecord: 创建的记录对象
    """
    # 获取分类单价
    category = session.get(PieceWorkCategory, category_id)
    unit_price = category.unit_price if category else 0
    
    # 计算金额
    amount = quantity * unit_price
    
    record = PieceWorkRecord(
        user_id=user_id,
        category_id=category_id,
        warehouse_id=warehouse_id,
        work_date=work_date,
        quantity=quantity,
        amount=amount,
        remark=remark
    )
    session.add(record)
    session.commit()
    session.refresh(record)
    return record


def get_piece_work_records(
    session: Session,
    user_id: Optional[int] = None,
    warehouse_id: Optional[int] = None,
    category_id: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    skip: int = 0,
    limit: int = 100
) -> List[PieceWorkRecord]:
    """
    获取计件记录列表
    
    Args:
        session: 数据库会话
        user_id: 按用户筛选（可选）
        warehouse_id: 按仓库筛选（可选）
        category_id: 按分类筛选（可选）
        start_date: 开始日期（可选）
        end_date: 结束日期（可选）
        skip: 跳过记录数
        limit: 返回记录数上限
        
    Returns:
        List[PieceWorkRecord]: 记录列表
    """
    statement = select(PieceWorkRecord)
    
    if user_id is not None:
        statement = statement.where(PieceWorkRecord.user_id == user_id)
    if warehouse_id is not None:
        statement = statement.where(PieceWorkRecord.warehouse_id == warehouse_id)
    if category_id is not None:
        statement = statement.where(PieceWorkRecord.category_id == category_id)
    if start_date is not None:
        statement = statement.where(PieceWorkRecord.work_date >= start_date)
    if end_date is not None:
        statement = statement.where(PieceWorkRecord.work_date <= end_date)
    
    # 按日期倒序
    statement = statement.order_by(PieceWorkRecord.work_date.desc())
    statement = statement.offset(skip).limit(limit)
    
    return list(session.exec(statement).all())


def get_piece_work_stats(
    session: Session,
    user_id: Optional[int] = None,
    warehouse_id: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None
) -> dict:
    """
    获取计件统计
    
    Args:
        session: 数据库会话
        user_id: 按用户筛选（可选）
        warehouse_id: 按仓库筛选（可选）
        start_date: 开始日期（可选）
        end_date: 结束日期（可选）
        
    Returns:
        dict: 统计结果，包含 total_quantity, total_amount, record_count
    """
    statement = select(
        func.sum(PieceWorkRecord.quantity).label("total_quantity"),
        func.sum(PieceWorkRecord.amount).label("total_amount"),
        func.count(PieceWorkRecord.id).label("record_count")
    )
    
    if user_id is not None:
        statement = statement.where(PieceWorkRecord.user_id == user_id)
    if warehouse_id is not None:
        statement = statement.where(PieceWorkRecord.warehouse_id == warehouse_id)
    if start_date is not None:
        statement = statement.where(PieceWorkRecord.work_date >= start_date)
    if end_date is not None:
        statement = statement.where(PieceWorkRecord.work_date <= end_date)
    
    result = session.exec(statement).first()
    
    return {
        "total_quantity": result.total_quantity or 0,
        "total_amount": result.total_amount or 0,
        "record_count": result.record_count or 0
    }


def update_piece_work_record(
    session: Session,
    record: PieceWorkRecord,
    quantity: Optional[int] = None,
    remark: Optional[str] = None
) -> PieceWorkRecord:
    """
    更新计件记录
    
    Args:
        session: 数据库会话
        record: 计件记录对象
        quantity: 新数量（可选）
        remark: 新备注（可选）
        
    Returns:
        PieceWorkRecord: 更新后的记录对象
    """
    # 更新数量时需要重新计算金额
    if quantity is not None:
        record.quantity = quantity
        # 获取分类单价重新计算金额
        category = session.get(PieceWorkCategory, record.category_id)
        unit_price = category.unit_price if category else 0
        record.amount = quantity * unit_price
    
    if remark is not None:
        record.remark = remark
    
    session.add(record)
    session.commit()
    session.refresh(record)
    return record


def delete_piece_work_record(session: Session, record: PieceWorkRecord) -> None:
    """
    删除计件记录
    
    Args:
        session: 数据库会话
        record: 计件记录对象
    """
    session.delete(record)
    session.commit()


# ==================== 请假 CRUD ====================

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
    
    # 按创建时间倒序
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


# ==================== 车辆 CRUD ====================

def create_vehicle(
    session: Session,
    user_id: int,
    license_plate: str,
    brand: Optional[str] = None,
    model: Optional[str] = None,
    color: Optional[str] = None,
    ownership_type: Optional[str] = "company",
    lessor_name: Optional[str] = None,
    lessor_contact: Optional[str] = None,
    lessee_name: Optional[str] = None,
    lessee_contact: Optional[str] = None,
    monthly_rent: Optional[float] = None,
    lease_start_date: Optional[date] = None,
    lease_end_date: Optional[date] = None,
    rent_payment_day: Optional[int] = None
) -> Vehicle:
    """
    创建车辆
    
    Args:
        session: 数据库会话
        user_id: 车主ID
        license_plate: 车牌号
        brand: 品牌（可选）
        model: 型号（可选）
        color: 颜色（可选）
        ownership_type: 所有权类型（可选，默认 company）
        lessor_name: 出租方名称（可选）
        lessor_contact: 出租方联系方式（可选）
        lessee_name: 承租方名称（可选）
        lessee_contact: 承租方联系方式（可选）
        monthly_rent: 月租金（可选）
        lease_start_date: 租赁开始日期（可选）
        lease_end_date: 租赁结束日期（可选）
        rent_payment_day: 每月租金缴纳日（可选）
        
    Returns:
        Vehicle: 创建的车辆对象
    """
    vehicle = Vehicle(
        user_id=user_id,
        license_plate=license_plate,
        brand=brand,
        model=model,
        color=color,
        status=VehicleStatus.REVIEWING,  # 新车辆默认待审核
        ownership_type=ownership_type,
        lessor_name=lessor_name,
        lessor_contact=lessor_contact,
        lessee_name=lessee_name,
        lessee_contact=lessee_contact,
        monthly_rent=monthly_rent,
        lease_start_date=lease_start_date,
        lease_end_date=lease_end_date,
        rent_payment_day=rent_payment_day
    )
    session.add(vehicle)
    session.commit()
    session.refresh(vehicle)
    return vehicle


def get_vehicles(
    session: Session,
    user_id: Optional[int] = None,
    status: Optional[VehicleStatus] = None,
    skip: int = 0,
    limit: int = 100
) -> List[Vehicle]:
    """
    获取车辆列表
    
    Args:
        session: 数据库会话
        user_id: 按车主筛选（可选）
        status: 按状态筛选（可选）
        skip: 跳过记录数
        limit: 返回记录数上限
        
    Returns:
        List[Vehicle]: 车辆列表
    """
    statement = select(Vehicle)
    
    if user_id is not None:
        statement = statement.where(Vehicle.user_id == user_id)
    if status is not None:
        statement = statement.where(Vehicle.status == status)
    
    statement = statement.offset(skip).limit(limit)
    return list(session.exec(statement).all())


def get_all_vehicles(
    session: Session,
    warehouse_id: Optional[int] = None,
    status: Optional[VehicleStatus] = None,
    skip: int = 0,
    limit: int = 100
) -> List[Vehicle]:
    """
    获取所有车辆列表（管理员用）
    支持按仓库和状态过滤
    
    Args:
        session: 数据库会话
        warehouse_id: 按仓库筛选（可选）
        status: 按状态筛选（可选）
        skip: 跳过记录数
        limit: 返回记录数上限
        
    Returns:
        List[Vehicle]: 车辆列表
    """
    statement = select(Vehicle)
    
    # 按仓库过滤
    if warehouse_id is not None:
        statement = statement.where(Vehicle.warehouse_id == warehouse_id)
    # 按状态过滤
    if status is not None:
        statement = statement.where(Vehicle.status == status)
    
    # 按创建时间倒序排列
    statement = statement.order_by(Vehicle.created_at.desc())
    # 分页
    statement = statement.offset(skip).limit(limit)
    
    return list(session.exec(statement).all())


def get_warehouse_vehicles(
    session: Session,
    warehouse_id: int,
    status: Optional[VehicleStatus] = None,
    skip: int = 0,
    limit: int = 100
) -> List[Vehicle]:
    """
    获取指定仓库的车辆列表
    用于车队长查看本仓库的车辆
    
    Args:
        session: 数据库会话
        warehouse_id: 仓库ID（必需）
        status: 按状态筛选（可选）
        skip: 跳过记录数
        limit: 返回记录数上限
        
    Returns:
        List[Vehicle]: 该仓库的车辆列表
    """
    # 构建查询语句，按仓库ID过滤
    statement = select(Vehicle).where(Vehicle.warehouse_id == warehouse_id)
    
    # 按状态过滤（可选）
    if status is not None:
        statement = statement.where(Vehicle.status == status)
    
    # 按创建时间倒序排列
    statement = statement.order_by(Vehicle.created_at.desc())
    # 分页
    statement = statement.offset(skip).limit(limit)
    
    return list(session.exec(statement).all())


def update_vehicle(
    session: Session,
    vehicle: Vehicle,
    brand: Optional[str] = None,
    model: Optional[str] = None,
    color: Optional[str] = None,
    ownership_type: Optional[str] = None
) -> Vehicle:
    """
    更新车辆信息
    
    Args:
        session: 数据库会话
        vehicle: 要更新的车辆对象
        brand: 新品牌（可选）
        model: 新型号（可选）
        color: 新颜色（可选）
        ownership_type: 新所有权类型（可选）
        
    Returns:
        Vehicle: 更新后的车辆对象
    """
    if brand is not None:
        vehicle.brand = brand
    if model is not None:
        vehicle.model = model
    if color is not None:
        vehicle.color = color
    if ownership_type is not None:
        vehicle.ownership_type = ownership_type
    
    vehicle.updated_at = datetime.now()
    session.add(vehicle)
    session.commit()
    session.refresh(vehicle)
    return vehicle


def update_vehicle_lease(
    session: Session,
    vehicle: Vehicle,
    lessor_name: Optional[str] = None,
    lessor_contact: Optional[str] = None,
    lessee_name: Optional[str] = None,
    lessee_contact: Optional[str] = None,
    monthly_rent: Optional[float] = None,
    lease_start_date: Optional[date] = None,
    lease_end_date: Optional[date] = None,
    rent_payment_day: Optional[int] = None
) -> Vehicle:
    """
    更新车辆租赁信息
    
    Args:
        session: 数据库会话
        vehicle: 要更新的车辆对象
        lessor_name: 出租方名称（可选）
        lessor_contact: 出租方联系方式（可选）
        lessee_name: 承租方名称（可选）
        lessee_contact: 承租方联系方式（可选）
        monthly_rent: 月租金（可选）
        lease_start_date: 租赁开始日期（可选）
        lease_end_date: 租赁结束日期（可选）
        rent_payment_day: 每月租金缴纳日（可选）
        
    Returns:
        Vehicle: 更新后的车辆对象
    """
    if lessor_name is not None:
        vehicle.lessor_name = lessor_name
    if lessor_contact is not None:
        vehicle.lessor_contact = lessor_contact
    if lessee_name is not None:
        vehicle.lessee_name = lessee_name
    if lessee_contact is not None:
        vehicle.lessee_contact = lessee_contact
    if monthly_rent is not None:
        vehicle.monthly_rent = monthly_rent
    if lease_start_date is not None:
        vehicle.lease_start_date = lease_start_date
    if lease_end_date is not None:
        vehicle.lease_end_date = lease_end_date
    if rent_payment_day is not None:
        vehicle.rent_payment_day = rent_payment_day
    
    vehicle.updated_at = datetime.now()
    session.add(vehicle)
    session.commit()
    session.refresh(vehicle)
    return vehicle


def get_vehicle_lease_info(session: Session, vehicle_id: int) -> Optional[Vehicle]:
    """
    获取车辆租赁信息
    
    Args:
        session: 数据库会话
        vehicle_id: 车辆ID
        
    Returns:
        Vehicle: 车辆对象（包含租赁信息），不存在则返回 None
    """
    return session.get(Vehicle, vehicle_id)


def get_vehicles_with_lease_reminders(
    session: Session,
    days_ahead: int = 7
) -> List[Vehicle]:
    """
    获取即将到期的租金提醒列表
    返回在指定天数内需要缴纳租金的车辆
    
    Args:
        session: 数据库会话
        days_ahead: 提前多少天提醒，默认7天
        
    Returns:
        List[Vehicle]: 需要提醒的车辆列表
    """
    today = date.today()
    
    # 查询有租赁信息的车辆
    statement = select(Vehicle).where(
        Vehicle.monthly_rent != None,
        Vehicle.monthly_rent > 0,
        Vehicle.rent_payment_day != None
    )
    
    vehicles = list(session.exec(statement).all())
    
    # 过滤出即将到期的车辆
    reminders = []
    for vehicle in vehicles:
        next_payment = calculate_next_payment_date(
            vehicle.lease_start_date,
            vehicle.rent_payment_day
        )
        if next_payment:
            days_until = (next_payment - today).days
            if 0 <= days_until <= days_ahead:
                reminders.append(vehicle)
    
    return reminders


def calculate_next_payment_date(
    lease_start_date: Optional[date],
    rent_payment_day: Optional[int]
) -> Optional[date]:
    """
    计算下一个租金缴纳日期
    
    Args:
        lease_start_date: 租赁开始日期
        rent_payment_day: 每月缴纳日（1-31）
        
    Returns:
        date: 下一个缴纳日期，如果无法计算则返回 None
    """
    if not rent_payment_day:
        return None
    
    today = date.today()
    current_year = today.year
    current_month = today.month
    
    # 处理缴纳日超过当月天数的情况
    import calendar
    days_in_month = calendar.monthrange(current_year, current_month)[1]
    payment_day = min(rent_payment_day, days_in_month)
    
    # 计算当月的缴纳日期
    current_month_payment = date(current_year, current_month, payment_day)
    
    # 如果当月的缴纳日期还未到，返回当月的缴纳日期
    if current_month_payment >= today:
        return current_month_payment
    
    # 否则返回下个月的缴纳日期
    if current_month == 12:
        next_month = 1
        next_year = current_year + 1
    else:
        next_month = current_month + 1
        next_year = current_year
    
    days_in_next_month = calendar.monthrange(next_year, next_month)[1]
    payment_day = min(rent_payment_day, days_in_next_month)
    
    return date(next_year, next_month, payment_day)


def review_vehicle(
    session: Session,
    vehicle: Vehicle,
    status: VehicleStatus
) -> Vehicle:
    """
    审核车辆
    
    Args:
        session: 数据库会话
        vehicle: 车辆对象
        status: 新状态
        
    Returns:
        Vehicle: 更新后的车辆对象
    """
    vehicle.status = status
    vehicle.updated_at = datetime.now()
    session.add(vehicle)
    session.commit()
    session.refresh(vehicle)
    return vehicle


def create_vehicle_document(
    session: Session,
    vehicle_id: int,
    doc_type: str,
    file_url: Optional[str] = None,
    expiry_date: Optional[date] = None
) -> VehicleDocument:
    """
    创建车辆证件
    
    Args:
        session: 数据库会话
        vehicle_id: 车辆ID
        doc_type: 证件类型
        file_url: 证件图片URL（可选）
        expiry_date: 过期日期（可选）
        
    Returns:
        VehicleDocument: 创建的证件对象
    """
    document = VehicleDocument(
        vehicle_id=vehicle_id,
        doc_type=doc_type,
        file_url=file_url,
        expiry_date=expiry_date
    )
    session.add(document)
    session.commit()
    session.refresh(document)
    return document


# ==================== 补录照片 CRUD ====================

def get_or_create_vehicle_document(session: Session, vehicle_id: int) -> VehicleDocument:
    """
    获取或创建车辆证件记录
    用于存储补录照片元数据
    
    Args:
        session: 数据库会话
        vehicle_id: 车辆ID
        
    Returns:
        VehicleDocument: 车辆证件对象
    """
    import json
    from models import DocumentType
    
    # 查找现有的证件记录（使用 LICENSE 类型作为默认）
    statement = select(VehicleDocument).where(
        VehicleDocument.vehicle_id == vehicle_id,
        VehicleDocument.doc_type == DocumentType.LICENSE
    )
    document = session.exec(statement).first()
    
    if not document:
        # 创建新的证件记录
        document = VehicleDocument(
            vehicle_id=vehicle_id,
            doc_type=DocumentType.LICENSE,
            supplemented_photos="{}"
        )
        session.add(document)
        session.commit()
        session.refresh(document)
    
    return document


def supplement_vehicle_photo(
    session: Session,
    vehicle_id: int,
    field: str,
    index: int,
    new_url: str
) -> dict:
    """
    补录车辆照片
    记录补录照片的元数据，包括补录时间、原始URL、补录次数等
    
    Args:
        session: 数据库会话
        vehicle_id: 车辆ID
        field: 照片字段名（如 "pickup_photos"）
        index: 照片在数组中的索引
        new_url: 新照片的URL
        
    Returns:
        dict: 更新后的补录照片元数据字典
    """
    import json
    
    # 获取或创建证件记录
    document = get_or_create_vehicle_document(session, vehicle_id)
    
    # 解析现有的补录照片元数据
    supplemented_photos = {}
    if document.supplemented_photos:
        try:
            supplemented_photos = json.loads(document.supplemented_photos)
        except json.JSONDecodeError:
            supplemented_photos = {}
    
    # 生成照片键
    photo_key = f"{field}_{index}"
    
    # 获取现有的补录信息（如果有）
    existing_meta = supplemented_photos.get(photo_key, {})
    supplement_count = existing_meta.get("supplement_count", 0) + 1
    
    # 更新补录元数据
    supplemented_photos[photo_key] = {
        "field": field,
        "index": index,
        "supplemented_at": datetime.now().isoformat(),
        "original_url": existing_meta.get("original_url") or new_url,  # 保留最初的原始URL
        "supplement_count": supplement_count
    }
    
    # 保存更新
    document.supplemented_photos = json.dumps(supplemented_photos, ensure_ascii=False)
    document.updated_at = datetime.now()
    session.add(document)
    session.commit()
    session.refresh(document)
    
    return supplemented_photos


def get_supplemented_photos(session: Session, vehicle_id: int) -> dict:
    """
    获取车辆的补录照片元数据
    
    Args:
        session: 数据库会话
        vehicle_id: 车辆ID
        
    Returns:
        dict: 补录照片元数据字典，键为 "{field}_{index}"
    """
    import json
    from models import DocumentType
    
    # 查找证件记录
    statement = select(VehicleDocument).where(
        VehicleDocument.vehicle_id == vehicle_id,
        VehicleDocument.doc_type == DocumentType.LICENSE
    )
    document = session.exec(statement).first()
    
    if not document or not document.supplemented_photos:
        return {}
    
    try:
        return json.loads(document.supplemented_photos)
    except json.JSONDecodeError:
        return {}


def clear_supplemented_photo(
    session: Session,
    vehicle_id: int,
    field: str,
    index: int
) -> dict:
    """
    清除指定照片的补录标记
    
    Args:
        session: 数据库会话
        vehicle_id: 车辆ID
        field: 照片字段名
        index: 照片在数组中的索引
        
    Returns:
        dict: 更新后的补录照片元数据字典
    """
    import json
    from models import DocumentType
    
    # 查找证件记录
    statement = select(VehicleDocument).where(
        VehicleDocument.vehicle_id == vehicle_id,
        VehicleDocument.doc_type == DocumentType.LICENSE
    )
    document = session.exec(statement).first()
    
    if not document or not document.supplemented_photos:
        return {}
    
    try:
        supplemented_photos = json.loads(document.supplemented_photos)
    except json.JSONDecodeError:
        return {}
    
    # 删除指定的补录标记
    photo_key = f"{field}_{index}"
    if photo_key in supplemented_photos:
        del supplemented_photos[photo_key]
    
    # 保存更新
    document.supplemented_photos = json.dumps(supplemented_photos, ensure_ascii=False)
    document.updated_at = datetime.now()
    session.add(document)
    session.commit()
    session.refresh(document)
    
    return supplemented_photos

def create_notification(
    session: Session,
    user_id: int,
    title: str,
    content: Optional[str] = None,
    sender_id: Optional[int] = None
) -> Notification:
    """
    创建通知
    
    Args:
        session: 数据库会话
        user_id: 接收用户ID
        title: 通知标题
        content: 通知内容（可选）
        sender_id: 发送者ID（可选）
        
    Returns:
        Notification: 创建的通知对象
    """
    notification = Notification(
        user_id=user_id,
        title=title,
        content=content,
        sender_id=sender_id
    )
    session.add(notification)
    session.commit()
    session.refresh(notification)
    return notification


def create_notifications_batch(
    session: Session,
    user_ids: List[int],
    title: str,
    content: Optional[str] = None,
    sender_id: Optional[int] = None
) -> List[Notification]:
    """
    批量创建通知（发送给多个用户）
    
    Args:
        session: 数据库会话
        user_ids: 接收用户ID列表
        title: 通知标题
        content: 通知内容（可选）
        sender_id: 发送者ID（可选）
        
    Returns:
        List[Notification]: 创建的通知对象列表
    """
    notifications = []
    for user_id in user_ids:
        notification = Notification(
            user_id=user_id,
            title=title,
            content=content,
            sender_id=sender_id
        )
        session.add(notification)
        notifications.append(notification)
    
    session.commit()
    
    # 刷新所有通知对象
    for notification in notifications:
        session.refresh(notification)
    
    return notifications


def get_notifications(
    session: Session,
    user_id: int,
    is_read: Optional[bool] = None,
    skip: int = 0,
    limit: int = 100
) -> List[Notification]:
    """
    获取用户的通知列表
    
    Args:
        session: 数据库会话
        user_id: 用户ID
        is_read: 按已读状态筛选（可选）
        skip: 跳过记录数
        limit: 返回记录数上限
        
    Returns:
        List[Notification]: 通知列表
    """
    statement = select(Notification).where(Notification.user_id == user_id)
    
    if is_read is not None:
        statement = statement.where(Notification.is_read == is_read)
    
    # 按创建时间倒序
    statement = statement.order_by(Notification.created_at.desc())
    statement = statement.offset(skip).limit(limit)
    
    return list(session.exec(statement).all())


def mark_notification_as_read(session: Session, notification: Notification) -> Notification:
    """
    标记通知为已读
    
    Args:
        session: 数据库会话
        notification: 通知对象
        
    Returns:
        Notification: 更新后的通知对象
    """
    notification.is_read = True
    session.add(notification)
    session.commit()
    session.refresh(notification)
    return notification


def get_unread_count(session: Session, user_id: int) -> int:
    """
    获取用户未读通知数量
    
    Args:
        session: 数据库会话
        user_id: 用户ID
        
    Returns:
        int: 未读通知数量
    """
    statement = select(func.count(Notification.id)).where(
        Notification.user_id == user_id,
        Notification.is_read == False
    )
    return session.exec(statement).first() or 0


def get_new_notifications(
    session: Session,
    user_id: int,
    after_id: int = 0
) -> List[Notification]:
    """
    获取用户的新通知（ID 大于指定值的通知）
    用于 SSE 实时推送，获取增量通知
    
    Args:
        session: 数据库会话
        user_id: 用户ID
        after_id: 上次接收的最后一条通知ID，返回 ID 大于此值的通知
        
    Returns:
        List[Notification]: 新通知列表，按 ID 升序排列
    """
    statement = select(Notification).where(
        Notification.user_id == user_id,
        Notification.id > after_id
    ).order_by(Notification.id.asc())
    
    return list(session.exec(statement).all())


# ==================== 初始化数据 ====================

def init_default_data(session: Session) -> None:
    """
    初始化默认数据
    创建默认管理员账号和计件分类
    
    Args:
        session: 数据库会话
    """
    # 检查是否已有超级管理员
    super_admin = get_user_by_username(session, "superadmin")
    if not super_admin:
        # 创建默认超级管理员账号
        create_user(
            session,
            username="superadmin",
            password="super123",
            name="超级管理员",
            role=UserRole.SUPER_ADMIN
        )
        print("✅ 已创建默认超级管理员账号: superadmin / super123")
    
    # 检查是否已有老板管理员
    admin = get_user_by_username(session, "admin")
    if not admin:
        # 创建默认老板管理员账号
        create_user(
            session,
            username="admin",
            password="admin123",
            name="系统管理员",
            role=UserRole.BOSS
        )
        print("✅ 已创建默认老板管理员账号: admin / admin123")
    
    # 检查是否已有调度账号
    peer_admin = get_user_by_username(session, "dispatcher")
    if not peer_admin:
        # 创建默认调度账号
        create_user(
            session,
            username="dispatcher",
            password="dispatch123",
            name="调度员",
            role=UserRole.PEER_ADMIN
        )
        print("✅ 已创建默认调度账号: dispatcher / dispatch123")
    
    # 检查是否已有车队长账号
    manager = get_user_by_username(session, "manager")
    if not manager:
        # 创建默认车队长账号
        create_user(
            session,
            username="manager",
            password="manager123",
            name="车队长",
            role=UserRole.MANAGER
        )
        print("✅ 已创建默认车队长账号: manager / manager123")
    
    # 检查是否已有司机账号
    driver = get_user_by_username(session, "driver")
    if not driver:
        # 创建默认司机账号
        create_user(
            session,
            username="driver",
            password="driver123",
            name="测试司机",
            role=UserRole.DRIVER
        )
        print("✅ 已创建默认司机账号: driver / driver123")
    
    # 检查是否已有计件分类
    categories = get_piece_work_categories(session)
    if not categories:
        # 创建默认计件分类
        default_categories = [
            ("装车", 10.0, "车"),
            ("卸车", 8.0, "车"),
            ("搬运", 5.0, "件"),
            ("分拣", 3.0, "件"),
        ]
        for name, price, unit in default_categories:
            create_piece_work_category(session, name, price, unit)
        print("✅ 已创建默认计件分类")
    
    # 检查是否已有通知模板
    templates = get_notification_templates(session)
    if not templates:
        # 创建默认通知模板
        init_default_notification_templates(session)
        print("✅ 已创建默认通知模板")


# ==================== 通知模板 CRUD ====================

def create_notification_template(
    session: Session,
    name: str,
    title: str,
    content: str,
    variables: Optional[dict] = None,
    category: Optional[str] = None,
    is_active: bool = True
) -> NotificationTemplate:
    """
    创建通知模板
    
    Args:
        session: 数据库会话
        name: 模板名称（唯一标识）
        title: 通知标题模板
        content: 通知内容模板
        variables: 模板变量说明（可选）
        category: 模板分类（可选）
        is_active: 是否启用，默认 True
        
    Returns:
        NotificationTemplate: 创建的模板对象
    """
    import json
    
    # 将变量字典转换为 JSON 字符串存储
    variables_json = json.dumps(variables, ensure_ascii=False) if variables else None
    
    template = NotificationTemplate(
        name=name,
        title=title,
        content=content,
        variables=variables_json,
        category=category,
        is_active=is_active
    )
    session.add(template)
    session.commit()
    session.refresh(template)
    return template


def get_notification_template_by_id(
    session: Session,
    template_id: int
) -> Optional[NotificationTemplate]:
    """
    根据ID获取通知模板
    
    Args:
        session: 数据库会话
        template_id: 模板ID
        
    Returns:
        NotificationTemplate: 模板对象，不存在则返回 None
    """
    return session.get(NotificationTemplate, template_id)


def get_notification_template_by_name(
    session: Session,
    name: str
) -> Optional[NotificationTemplate]:
    """
    根据名称获取通知模板
    
    Args:
        session: 数据库会话
        name: 模板名称
        
    Returns:
        NotificationTemplate: 模板对象，不存在则返回 None
    """
    statement = select(NotificationTemplate).where(NotificationTemplate.name == name)
    return session.exec(statement).first()


def get_notification_templates(
    session: Session,
    category: Optional[str] = None,
    is_active: Optional[bool] = None,
    skip: int = 0,
    limit: int = 100
) -> List[NotificationTemplate]:
    """
    获取通知模板列表
    
    Args:
        session: 数据库会话
        category: 按分类筛选（可选）
        is_active: 按启用状态筛选（可选）
        skip: 跳过记录数
        limit: 返回记录数上限
        
    Returns:
        List[NotificationTemplate]: 模板列表
    """
    statement = select(NotificationTemplate)
    
    if category is not None:
        statement = statement.where(NotificationTemplate.category == category)
    if is_active is not None:
        statement = statement.where(NotificationTemplate.is_active == is_active)
    
    # 按创建时间倒序
    statement = statement.order_by(NotificationTemplate.created_at.desc())
    statement = statement.offset(skip).limit(limit)
    
    return list(session.exec(statement).all())


def update_notification_template(
    session: Session,
    template: NotificationTemplate,
    name: Optional[str] = None,
    title: Optional[str] = None,
    content: Optional[str] = None,
    variables: Optional[dict] = None,
    category: Optional[str] = None,
    is_active: Optional[bool] = None
) -> NotificationTemplate:
    """
    更新通知模板
    
    Args:
        session: 数据库会话
        template: 要更新的模板对象
        name: 新名称（可选）
        title: 新标题模板（可选）
        content: 新内容模板（可选）
        variables: 新变量说明（可选）
        category: 新分类（可选）
        is_active: 新启用状态（可选）
        
    Returns:
        NotificationTemplate: 更新后的模板对象
    """
    import json
    
    if name is not None:
        template.name = name
    if title is not None:
        template.title = title
    if content is not None:
        template.content = content
    if variables is not None:
        template.variables = json.dumps(variables, ensure_ascii=False)
    if category is not None:
        template.category = category
    if is_active is not None:
        template.is_active = is_active
    
    template.updated_at = datetime.now()
    session.add(template)
    session.commit()
    session.refresh(template)
    return template


def delete_notification_template(session: Session, template: NotificationTemplate) -> None:
    """
    删除通知模板
    
    Args:
        session: 数据库会话
        template: 要删除的模板对象
    """
    session.delete(template)
    session.commit()


def render_notification_template(
    template: NotificationTemplate,
    variables: Optional[dict] = None
) -> tuple:
    """
    渲染通知模板
    将模板中的变量占位符替换为实际值
    
    Args:
        template: 模板对象
        variables: 变量值字典，如 {"user_name": "张三", "date": "2024-01-01"}
        
    Returns:
        tuple: (渲染后的标题, 渲染后的内容)
    """
    title = template.title
    content = template.content
    
    if variables:
        # 替换标题中的变量
        for key, value in variables.items():
            placeholder = "{" + key + "}"
            title = title.replace(placeholder, str(value))
        
        # 替换内容中的变量
        for key, value in variables.items():
            placeholder = "{" + key + "}"
            content = content.replace(placeholder, str(value))
    
    return title, content


def create_notification_from_template(
    session: Session,
    user_ids: List[int],
    template_id: int,
    variables: Optional[dict] = None,
    sender_id: Optional[int] = None
) -> List[Notification]:
    """
    使用模板创建通知
    
    Args:
        session: 数据库会话
        user_ids: 接收用户ID列表
        template_id: 模板ID
        variables: 模板变量值（可选）
        sender_id: 发送者ID（可选）
        
    Returns:
        List[Notification]: 创建的通知对象列表
        
    Raises:
        ValueError: 当模板不存在或未启用时抛出
    """
    # 获取模板
    template = get_notification_template_by_id(session, template_id)
    if not template:
        raise ValueError(f"模板不存在: {template_id}")
    if not template.is_active:
        raise ValueError(f"模板已禁用: {template.name}")
    
    # 渲染模板
    title, content = render_notification_template(template, variables)
    
    # 批量创建通知
    notifications = []
    for user_id in user_ids:
        notification = Notification(
            user_id=user_id,
            title=title,
            content=content,
            sender_id=sender_id,
            template_id=template_id
        )
        session.add(notification)
        notifications.append(notification)
    
    session.commit()
    
    # 刷新所有通知对象
    for notification in notifications:
        session.refresh(notification)
    
    return notifications


def init_default_notification_templates(session: Session) -> None:
    """
    初始化默认通知模板
    创建系统常用的通知模板
    
    Args:
        session: 数据库会话
    """
    default_templates = [
        # 考勤相关模板
        {
            "name": "attendance_reminder",
            "title": "打卡提醒",
            "content": "亲爱的{user_name}，今天还没有打卡哦，请记得打卡！",
            "variables": {"user_name": "用户姓名"},
            "category": "attendance"
        },
        {
            "name": "attendance_success",
            "title": "打卡成功",
            "content": "{user_name}，您已于{time}成功{action}打卡。",
            "variables": {"user_name": "用户姓名", "time": "打卡时间", "action": "上班/下班"},
            "category": "attendance"
        },
        # 请假相关模板
        {
            "name": "leave_submitted",
            "title": "请假申请已提交",
            "content": "您的请假申请（{start_date}至{end_date}）已提交，请等待审批。",
            "variables": {"start_date": "开始日期", "end_date": "结束日期"},
            "category": "leave"
        },
        {
            "name": "leave_approved",
            "title": "请假申请已批准",
            "content": "您的请假申请（{start_date}至{end_date}）已被批准。{remark}",
            "variables": {"start_date": "开始日期", "end_date": "结束日期", "remark": "审批备注"},
            "category": "leave"
        },
        {
            "name": "leave_rejected",
            "title": "请假申请已拒绝",
            "content": "您的请假申请（{start_date}至{end_date}）已被拒绝。原因：{remark}",
            "variables": {"start_date": "开始日期", "end_date": "结束日期", "remark": "拒绝原因"},
            "category": "leave"
        },
        {
            "name": "leave_pending_approval",
            "title": "有新的请假申请待审批",
            "content": "{user_name}提交了请假申请（{start_date}至{end_date}），请及时审批。",
            "variables": {"user_name": "申请人姓名", "start_date": "开始日期", "end_date": "结束日期"},
            "category": "leave"
        },
        # 车辆相关模板
        {
            "name": "vehicle_submitted",
            "title": "车辆信息已提交",
            "content": "您的车辆（{license_plate}）信息已提交，请等待审核。",
            "variables": {"license_plate": "车牌号"},
            "category": "vehicle"
        },
        {
            "name": "vehicle_approved",
            "title": "车辆审核通过",
            "content": "您的车辆（{license_plate}）已通过审核，可以正常使用。",
            "variables": {"license_plate": "车牌号"},
            "category": "vehicle"
        },
        {
            "name": "vehicle_rejected",
            "title": "车辆审核未通过",
            "content": "您的车辆（{license_plate}）审核未通过。原因：{remark}",
            "variables": {"license_plate": "车牌号", "remark": "拒绝原因"},
            "category": "vehicle"
        },
        {
            "name": "rent_reminder",
            "title": "租金缴纳提醒",
            "content": "您的车辆（{license_plate}）租金将于{payment_date}到期，金额{amount}元，请及时缴纳。",
            "variables": {"license_plate": "车牌号", "payment_date": "缴纳日期", "amount": "租金金额"},
            "category": "vehicle"
        },
        # 计件相关模板
        {
            "name": "piece_work_recorded",
            "title": "计件记录已保存",
            "content": "您在{date}的计件记录已保存：{category} {quantity}{unit}，金额{amount}元。",
            "variables": {"date": "工作日期", "category": "分类名称", "quantity": "数量", "unit": "单位", "amount": "金额"},
            "category": "piece_work"
        },
        # 系统通知模板
        {
            "name": "system_announcement",
            "title": "系统公告",
            "content": "{content}",
            "variables": {"content": "公告内容"},
            "category": "system"
        },
        {
            "name": "welcome",
            "title": "欢迎加入",
            "content": "欢迎{user_name}加入车队管家系统！如有问题请联系管理员。",
            "variables": {"user_name": "用户姓名"},
            "category": "system"
        }
    ]
    
    for template_data in default_templates:
        # 检查模板是否已存在
        existing = get_notification_template_by_name(session, template_data["name"])
        if not existing:
            create_notification_template(
                session,
                name=template_data["name"],
                title=template_data["title"],
                content=template_data["content"],
                variables=template_data["variables"],
                category=template_data["category"]
            )


# ==================== 定时通知 CRUD ====================


def create_scheduled_notification(
    session: Session,
    name: str,
    scheduled_time: datetime,
    template_id: Optional[int] = None,
    title: Optional[str] = None,
    content: Optional[str] = None,
    variables: Optional[dict] = None,
    target_user_ids: Optional[List[int]] = None,
    target_roles: Optional[List[str]] = None,
    repeat_type: RepeatType = RepeatType.ONCE,
    repeat_interval: int = 1,
    repeat_end_date: Optional[date] = None,
    weekdays: Optional[List[int]] = None,
    monthly_day: Optional[int] = None,
    creator_id: Optional[int] = None
) -> ScheduledNotification:
    """
    创建定时通知任务
    
    Args:
        session: 数据库会话
        name: 任务名称
        scheduled_time: 计划发送时间
        template_id: 模板ID（可选）
        title: 通知标题（不使用模板时）
        content: 通知内容（不使用模板时）
        variables: 模板变量值（可选）
        target_user_ids: 目标用户ID列表（可选）
        target_roles: 目标角色列表（可选）
        repeat_type: 重复类型，默认为一次性
        repeat_interval: 重复间隔，默认为1
        repeat_end_date: 重复结束日期（可选）
        weekdays: 每周重复的星期几（可选）
        monthly_day: 每月重复的日期（可选）
        creator_id: 创建者ID（可选）
        
    Returns:
        ScheduledNotification: 创建的定时通知对象
    """
    import json
    
    # 序列化 JSON 字段
    variables_json = json.dumps(variables, ensure_ascii=False) if variables else None
    target_user_ids_json = json.dumps(target_user_ids) if target_user_ids else None
    target_roles_json = json.dumps(target_roles) if target_roles else None
    weekdays_json = json.dumps(weekdays) if weekdays else None
    
    # 计算下次执行时间
    next_execute_at = scheduled_time
    
    # 确定初始状态
    status = ScheduledNotificationStatus.PENDING
    if repeat_type != RepeatType.ONCE:
        status = ScheduledNotificationStatus.ACTIVE
    
    scheduled = ScheduledNotification(
        name=name,
        template_id=template_id,
        title=title,
        content=content,
        variables=variables_json,
        target_user_ids=target_user_ids_json,
        target_roles=target_roles_json,
        scheduled_time=scheduled_time,
        repeat_type=repeat_type,
        repeat_interval=repeat_interval,
        repeat_end_date=repeat_end_date,
        weekdays=weekdays_json,
        monthly_day=monthly_day,
        status=status,
        next_execute_at=next_execute_at,
        creator_id=creator_id
    )
    
    session.add(scheduled)
    session.commit()
    session.refresh(scheduled)
    return scheduled


def get_scheduled_notification_by_id(
    session: Session,
    scheduled_id: int
) -> Optional[ScheduledNotification]:
    """
    根据ID获取定时通知
    
    Args:
        session: 数据库会话
        scheduled_id: 定时通知ID
        
    Returns:
        ScheduledNotification: 定时通知对象，不存在则返回 None
    """
    return session.get(ScheduledNotification, scheduled_id)


def get_scheduled_notifications(
    session: Session,
    status: Optional[ScheduledNotificationStatus] = None,
    creator_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100
) -> List[ScheduledNotification]:
    """
    获取定时通知列表
    
    Args:
        session: 数据库会话
        status: 按状态筛选（可选）
        creator_id: 按创建者筛选（可选）
        skip: 跳过记录数
        limit: 返回记录数
        
    Returns:
        List[ScheduledNotification]: 定时通知列表
    """
    statement = select(ScheduledNotification)
    
    if status is not None:
        statement = statement.where(ScheduledNotification.status == status)
    if creator_id is not None:
        statement = statement.where(ScheduledNotification.creator_id == creator_id)
    
    # 按下次执行时间排序
    statement = statement.order_by(ScheduledNotification.next_execute_at.asc())
    statement = statement.offset(skip).limit(limit)
    
    return list(session.exec(statement).all())


def get_pending_scheduled_notifications(
    session: Session,
    before_time: Optional[datetime] = None
) -> List[ScheduledNotification]:
    """
    获取待执行的定时通知
    
    Args:
        session: 数据库会话
        before_time: 在此时间之前需要执行的任务（可选，默认为当前时间）
        
    Returns:
        List[ScheduledNotification]: 待执行的定时通知列表
    """
    if before_time is None:
        before_time = datetime.now()
    
    statement = select(ScheduledNotification).where(
        ScheduledNotification.status.in_([
            ScheduledNotificationStatus.PENDING,
            ScheduledNotificationStatus.ACTIVE
        ]),
        ScheduledNotification.next_execute_at <= before_time
    ).order_by(ScheduledNotification.next_execute_at.asc())
    
    return list(session.exec(statement).all())


def update_scheduled_notification(
    session: Session,
    scheduled: ScheduledNotification,
    name: Optional[str] = None,
    template_id: Optional[int] = None,
    title: Optional[str] = None,
    content: Optional[str] = None,
    variables: Optional[dict] = None,
    target_user_ids: Optional[List[int]] = None,
    target_roles: Optional[List[str]] = None,
    scheduled_time: Optional[datetime] = None,
    repeat_type: Optional[RepeatType] = None,
    repeat_interval: Optional[int] = None,
    repeat_end_date: Optional[date] = None,
    weekdays: Optional[List[int]] = None,
    monthly_day: Optional[int] = None,
    status: Optional[ScheduledNotificationStatus] = None
) -> ScheduledNotification:
    """
    更新定时通知
    
    Args:
        session: 数据库会话
        scheduled: 定时通知对象
        其他参数: 要更新的字段（可选）
        
    Returns:
        ScheduledNotification: 更新后的定时通知对象
    """
    import json
    
    if name is not None:
        scheduled.name = name
    if template_id is not None:
        scheduled.template_id = template_id
    if title is not None:
        scheduled.title = title
    if content is not None:
        scheduled.content = content
    if variables is not None:
        scheduled.variables = json.dumps(variables, ensure_ascii=False)
    if target_user_ids is not None:
        scheduled.target_user_ids = json.dumps(target_user_ids)
    if target_roles is not None:
        scheduled.target_roles = json.dumps(target_roles)
    if scheduled_time is not None:
        scheduled.scheduled_time = scheduled_time
        # 如果任务还未执行，更新下次执行时间
        if scheduled.execution_count == 0:
            scheduled.next_execute_at = scheduled_time
    if repeat_type is not None:
        scheduled.repeat_type = repeat_type
    if repeat_interval is not None:
        scheduled.repeat_interval = repeat_interval
    if repeat_end_date is not None:
        scheduled.repeat_end_date = repeat_end_date
    if weekdays is not None:
        scheduled.weekdays = json.dumps(weekdays)
    if monthly_day is not None:
        scheduled.monthly_day = monthly_day
    if status is not None:
        scheduled.status = status
    
    scheduled.updated_at = datetime.now()
    
    session.add(scheduled)
    session.commit()
    session.refresh(scheduled)
    return scheduled


def delete_scheduled_notification(session: Session, scheduled: ScheduledNotification) -> None:
    """
    删除定时通知
    
    Args:
        session: 数据库会话
        scheduled: 定时通知对象
    """
    session.delete(scheduled)
    session.commit()


def cancel_scheduled_notification(
    session: Session,
    scheduled: ScheduledNotification
) -> ScheduledNotification:
    """
    取消定时通知
    
    Args:
        session: 数据库会话
        scheduled: 定时通知对象
        
    Returns:
        ScheduledNotification: 更新后的定时通知对象
    """
    scheduled.status = ScheduledNotificationStatus.CANCELLED
    scheduled.updated_at = datetime.now()
    
    session.add(scheduled)
    session.commit()
    session.refresh(scheduled)
    return scheduled


def calculate_next_execute_time(
    scheduled: ScheduledNotification,
    from_time: Optional[datetime] = None
) -> Optional[datetime]:
    """
    计算下次执行时间
    
    Args:
        scheduled: 定时通知对象
        from_time: 从哪个时间开始计算（可选，默认为当前时间）
        
    Returns:
        datetime: 下次执行时间，如果任务已结束则返回 None
    """
    import json
    from datetime import timedelta
    from calendar import monthrange
    
    if from_time is None:
        from_time = datetime.now()
    
    # 一次性任务不需要计算下次执行时间
    if scheduled.repeat_type == RepeatType.ONCE:
        return None
    
    # 检查是否已过结束日期
    if scheduled.repeat_end_date and from_time.date() > scheduled.repeat_end_date:
        return None
    
    # 获取基准时间（上次执行时间或计划时间）
    base_time = scheduled.last_executed_at or scheduled.scheduled_time
    
    # 根据重复类型计算下次执行时间
    if scheduled.repeat_type == RepeatType.DAILY:
        # 每天重复
        next_time = base_time + timedelta(days=scheduled.repeat_interval)
        
    elif scheduled.repeat_type == RepeatType.WEEKLY:
        # 每周重复
        if scheduled.weekdays:
            weekdays = json.loads(scheduled.weekdays)
            # 找到下一个符合条件的星期几
            current_weekday = base_time.isoweekday()
            days_ahead = None
            
            for wd in sorted(weekdays):
                if wd > current_weekday:
                    days_ahead = wd - current_weekday
                    break
            
            if days_ahead is None:
                # 下周的第一个符合条件的日期
                days_ahead = 7 - current_weekday + min(weekdays)
            
            next_time = base_time + timedelta(days=days_ahead)
        else:
            # 没有指定星期几，按间隔周数计算
            next_time = base_time + timedelta(weeks=scheduled.repeat_interval)
            
    elif scheduled.repeat_type == RepeatType.MONTHLY:
        # 每月重复
        target_day = scheduled.monthly_day or base_time.day
        
        # 计算下个月
        next_month = base_time.month + scheduled.repeat_interval
        next_year = base_time.year
        
        while next_month > 12:
            next_month -= 12
            next_year += 1
        
        # 处理月末日期（如31号在2月）
        max_day = monthrange(next_year, next_month)[1]
        actual_day = min(target_day, max_day)
        
        next_time = base_time.replace(
            year=next_year,
            month=next_month,
            day=actual_day
        )
    else:
        return None
    
    # 确保下次执行时间在当前时间之后
    while next_time <= from_time:
        if scheduled.repeat_type == RepeatType.DAILY:
            next_time += timedelta(days=scheduled.repeat_interval)
        elif scheduled.repeat_type == RepeatType.WEEKLY:
            next_time += timedelta(weeks=scheduled.repeat_interval)
        elif scheduled.repeat_type == RepeatType.MONTHLY:
            next_month = next_time.month + scheduled.repeat_interval
            next_year = next_time.year
            while next_month > 12:
                next_month -= 12
                next_year += 1
            max_day = monthrange(next_year, next_month)[1]
            actual_day = min(scheduled.monthly_day or next_time.day, max_day)
            next_time = next_time.replace(year=next_year, month=next_month, day=actual_day)
    
    # 检查是否超过结束日期
    if scheduled.repeat_end_date and next_time.date() > scheduled.repeat_end_date:
        return None
    
    return next_time


def execute_scheduled_notification(
    session: Session,
    scheduled: ScheduledNotification
) -> List[Notification]:
    """
    执行定时通知任务
    
    Args:
        session: 数据库会话
        scheduled: 定时通知对象
        
    Returns:
        List[Notification]: 创建的通知列表
    """
    import json
    
    # 获取目标用户列表
    target_user_ids = []
    
    # 从指定的用户ID列表获取
    if scheduled.target_user_ids:
        target_user_ids.extend(json.loads(scheduled.target_user_ids))
    
    # 从指定的角色获取用户
    if scheduled.target_roles:
        roles = json.loads(scheduled.target_roles)
        for role_str in roles:
            try:
                role = UserRole(role_str)
                users = get_users(session, role=role, is_active=True, limit=10000)
                target_user_ids.extend([u.id for u in users])
            except ValueError:
                pass  # 忽略无效的角色
    
    # 去重
    target_user_ids = list(set(target_user_ids))
    
    if not target_user_ids:
        # 没有目标用户，标记为失败
        scheduled.status = ScheduledNotificationStatus.FAILED
        scheduled.updated_at = datetime.now()
        session.add(scheduled)
        session.commit()
        return []
    
    # 获取通知内容
    title = scheduled.title
    content = scheduled.content
    variables = json.loads(scheduled.variables) if scheduled.variables else None
    
    # 如果使用模板，渲染模板
    if scheduled.template_id:
        template = get_notification_template_by_id(session, scheduled.template_id)
        if template and template.is_active:
            title, content = render_notification_template(template, variables)
    
    if not title:
        # 没有标题，标记为失败
        scheduled.status = ScheduledNotificationStatus.FAILED
        scheduled.updated_at = datetime.now()
        session.add(scheduled)
        session.commit()
        return []
    
    # 创建通知
    notifications = create_notifications_batch(
        session,
        user_ids=target_user_ids,
        title=title,
        content=content,
        sender_id=scheduled.creator_id
    )
    
    # 更新执行信息
    scheduled.last_executed_at = datetime.now()
    scheduled.execution_count += 1
    
    # 计算下次执行时间
    if scheduled.repeat_type == RepeatType.ONCE:
        scheduled.status = ScheduledNotificationStatus.COMPLETED
        scheduled.next_execute_at = None
    else:
        next_time = calculate_next_execute_time(scheduled)
        if next_time:
            scheduled.next_execute_at = next_time
        else:
            # 没有下次执行时间，任务完成
            scheduled.status = ScheduledNotificationStatus.COMPLETED
            scheduled.next_execute_at = None
    
    scheduled.updated_at = datetime.now()
    session.add(scheduled)
    session.commit()
    session.refresh(scheduled)
    
    return notifications


def get_scheduler_status(session: Session) -> dict:
    """
    获取调度器状态
    
    Args:
        session: 数据库会话
        
    Returns:
        dict: 调度器状态信息
    """
    # 统计待执行任务数
    pending_count = session.exec(
        select(func.count(ScheduledNotification.id)).where(
            ScheduledNotification.status == ScheduledNotificationStatus.PENDING
        )
    ).one()
    
    # 统计活跃任务数
    active_count = session.exec(
        select(func.count(ScheduledNotification.id)).where(
            ScheduledNotification.status == ScheduledNotificationStatus.ACTIVE
        )
    ).one()
    
    # 获取下一个执行时间
    next_scheduled = session.exec(
        select(ScheduledNotification).where(
            ScheduledNotification.status.in_([
                ScheduledNotificationStatus.PENDING,
                ScheduledNotificationStatus.ACTIVE
            ]),
            ScheduledNotification.next_execute_at.isnot(None)
        ).order_by(ScheduledNotification.next_execute_at.asc()).limit(1)
    ).first()
    
    next_execution = next_scheduled.next_execute_at if next_scheduled else None
    
    return {
        "pending_tasks": pending_count,
        "active_tasks": active_count,
        "next_execution": next_execution
    }


def get_target_user_count(
    session: Session,
    target_user_ids: Optional[List[int]] = None,
    target_roles: Optional[List[str]] = None
) -> int:
    """
    计算目标用户数量
    
    Args:
        session: 数据库会话
        target_user_ids: 目标用户ID列表
        target_roles: 目标角色列表
        
    Returns:
        int: 目标用户数量
    """
    user_ids = set()
    
    if target_user_ids:
        user_ids.update(target_user_ids)
    
    if target_roles:
        for role_str in target_roles:
            try:
                role = UserRole(role_str)
                users = get_users(session, role=role, is_active=True, limit=10000)
                user_ids.update([u.id for u in users])
            except ValueError:
                pass
    
    return len(user_ids)


# ==================== 应用版本（热更新）CRUD ====================

from models import AppVersion, UpdateType


def create_app_version(
    session: Session,
    version: str,
    version_code: int,
    title: str,
    update_type: UpdateType = UpdateType.OPTIONAL,
    description: Optional[str] = None,
    download_url: Optional[str] = None,
    file_size: Optional[int] = None,
    file_hash: Optional[str] = None,
    min_version: Optional[str] = None,
    platform: str = "all",
    is_active: bool = True,
    publish_time: Optional[datetime] = None,
    creator_id: Optional[int] = None
) -> AppVersion:
    """
    创建应用版本
    
    Args:
        session: 数据库会话
        version: 版本号，如 "1.0.0"
        version_code: 版本代码
        title: 更新标题
        update_type: 更新类型
        description: 更新说明
        download_url: 下载地址
        file_size: 文件大小
        file_hash: 文件哈希
        min_version: 最低支持版本
        platform: 平台类型
        is_active: 是否启用
        publish_time: 发布时间
        creator_id: 创建者ID
        
    Returns:
        AppVersion: 创建的版本对象
    """
    app_version = AppVersion(
        version=version,
        version_code=version_code,
        update_type=update_type,
        title=title,
        description=description,
        download_url=download_url,
        file_size=file_size,
        file_hash=file_hash,
        min_version=min_version,
        platform=platform,
        is_active=is_active,
        publish_time=publish_time or datetime.now(),
        creator_id=creator_id
    )
    session.add(app_version)
    session.commit()
    session.refresh(app_version)
    return app_version


def get_app_version_by_id(session: Session, version_id: int) -> Optional[AppVersion]:
    """
    根据ID获取应用版本
    
    Args:
        session: 数据库会话
        version_id: 版本ID
        
    Returns:
        AppVersion: 版本对象，不存在则返回 None
    """
    return session.get(AppVersion, version_id)


def get_app_version_by_version(session: Session, version: str) -> Optional[AppVersion]:
    """
    根据版本号获取应用版本
    
    Args:
        session: 数据库会话
        version: 版本号
        
    Returns:
        AppVersion: 版本对象，不存在则返回 None
    """
    statement = select(AppVersion).where(AppVersion.version == version)
    return session.exec(statement).first()


def get_app_versions(
    session: Session,
    platform: Optional[str] = None,
    is_active: Optional[bool] = None,
    skip: int = 0,
    limit: int = 100
) -> List[AppVersion]:
    """
    获取应用版本列表
    
    Args:
        session: 数据库会话
        platform: 按平台筛选
        is_active: 按启用状态筛选
        skip: 跳过记录数
        limit: 返回记录数
        
    Returns:
        List[AppVersion]: 版本列表
    """
    statement = select(AppVersion)
    
    if platform is not None:
        statement = statement.where(
            (AppVersion.platform == platform) | (AppVersion.platform == "all")
        )
    if is_active is not None:
        statement = statement.where(AppVersion.is_active == is_active)
    
    # 按版本代码倒序
    statement = statement.order_by(AppVersion.version_code.desc())
    statement = statement.offset(skip).limit(limit)
    
    return list(session.exec(statement).all())


def get_latest_app_version(
    session: Session,
    platform: str = "all"
) -> Optional[AppVersion]:
    """
    获取最新的应用版本
    
    Args:
        session: 数据库会话
        platform: 平台类型
        
    Returns:
        AppVersion: 最新版本对象，不存在则返回 None
    """
    statement = select(AppVersion).where(
        AppVersion.is_active == True,
        (AppVersion.platform == platform) | (AppVersion.platform == "all")
    ).order_by(AppVersion.version_code.desc()).limit(1)
    
    return session.exec(statement).first()


def update_app_version(
    session: Session,
    app_version: AppVersion,
    version: Optional[str] = None,
    version_code: Optional[int] = None,
    update_type: Optional[UpdateType] = None,
    title: Optional[str] = None,
    description: Optional[str] = None,
    download_url: Optional[str] = None,
    file_size: Optional[int] = None,
    file_hash: Optional[str] = None,
    min_version: Optional[str] = None,
    platform: Optional[str] = None,
    is_active: Optional[bool] = None,
    publish_time: Optional[datetime] = None
) -> AppVersion:
    """
    更新应用版本
    
    Args:
        session: 数据库会话
        app_version: 版本对象
        其他参数: 要更新的字段
        
    Returns:
        AppVersion: 更新后的版本对象
    """
    if version is not None:
        app_version.version = version
    if version_code is not None:
        app_version.version_code = version_code
    if update_type is not None:
        app_version.update_type = update_type
    if title is not None:
        app_version.title = title
    if description is not None:
        app_version.description = description
    if download_url is not None:
        app_version.download_url = download_url
    if file_size is not None:
        app_version.file_size = file_size
    if file_hash is not None:
        app_version.file_hash = file_hash
    if min_version is not None:
        app_version.min_version = min_version
    if platform is not None:
        app_version.platform = platform
    if is_active is not None:
        app_version.is_active = is_active
    if publish_time is not None:
        app_version.publish_time = publish_time
    
    app_version.updated_at = datetime.now()
    session.add(app_version)
    session.commit()
    session.refresh(app_version)
    return app_version


def delete_app_version(session: Session, app_version: AppVersion) -> None:
    """
    删除应用版本
    
    Args:
        session: 数据库会话
        app_version: 版本对象
    """
    session.delete(app_version)
    session.commit()


def check_app_update(
    session: Session,
    current_version: str,
    current_version_code: Optional[int] = None,
    platform: str = "all"
) -> dict:
    """
    检查应用更新
    
    Args:
        session: 数据库会话
        current_version: 当前版本号
        current_version_code: 当前版本代码
        platform: 平台类型
        
    Returns:
        dict: 更新检查结果
    """
    # 获取最新版本
    latest = get_latest_app_version(session, platform)
    
    if not latest:
        return {
            "has_update": False,
            "update_type": None,
            "latest_version": None,
            "latest_version_code": None,
            "title": None,
            "description": None,
            "download_url": None,
            "file_size": None,
            "file_hash": None,
            "is_force_update": False
        }
    
    # 比较版本
    has_update = False
    is_force_update = False
    
    if current_version_code is not None:
        # 使用版本代码比较
        has_update = latest.version_code > current_version_code
    else:
        # 使用版本号比较
        has_update = compare_versions(current_version, latest.version) < 0
    
    if not has_update:
        return {
            "has_update": False,
            "update_type": None,
            "latest_version": latest.version,
            "latest_version_code": latest.version_code,
            "title": None,
            "description": None,
            "download_url": None,
            "file_size": None,
            "file_hash": None,
            "is_force_update": False
        }
    
    # 检查是否强制更新
    if latest.update_type == UpdateType.REQUIRED:
        is_force_update = True
    elif latest.min_version:
        # 检查当前版本是否低于最低支持版本
        if current_version_code is not None:
            # 需要获取 min_version 对应的 version_code
            min_ver = get_app_version_by_version(session, latest.min_version)
            if min_ver and current_version_code < min_ver.version_code:
                is_force_update = True
        else:
            if compare_versions(current_version, latest.min_version) < 0:
                is_force_update = True
    
    return {
        "has_update": True,
        "update_type": latest.update_type.value,
        "latest_version": latest.version,
        "latest_version_code": latest.version_code,
        "title": latest.title,
        "description": latest.description,
        "download_url": latest.download_url,
        "file_size": latest.file_size,
        "file_hash": latest.file_hash,
        "is_force_update": is_force_update
    }


def compare_versions(v1: str, v2: str) -> int:
    """
    比较两个版本号
    
    Args:
        v1: 版本号1
        v2: 版本号2
        
    Returns:
        int: -1 表示 v1 < v2, 0 表示相等, 1 表示 v1 > v2
    """
    def parse_version(v: str) -> List[int]:
        """解析版本号为数字列表"""
        parts = v.split(".")
        result = []
        for part in parts:
            try:
                result.append(int(part))
            except ValueError:
                # 处理带有字母的版本号，如 "1.0.0-beta"
                num_part = ""
                for c in part:
                    if c.isdigit():
                        num_part += c
                    else:
                        break
                result.append(int(num_part) if num_part else 0)
        return result
    
    parts1 = parse_version(v1)
    parts2 = parse_version(v2)
    
    # 补齐长度
    max_len = max(len(parts1), len(parts2))
    parts1.extend([0] * (max_len - len(parts1)))
    parts2.extend([0] * (max_len - len(parts2)))
    
    # 逐位比较
    for p1, p2 in zip(parts1, parts2):
        if p1 < p2:
            return -1
        elif p1 > p2:
            return 1
    
    return 0


# ==================== 车辆历史 CRUD ====================

from models import VehicleHistory, VehicleHistoryActionType


def create_vehicle_history(
    session: Session,
    vehicle_id: int,
    user_id: int,
    action_type: VehicleHistoryActionType,
    action_time: datetime,
    photos: Optional[str] = None,
    damage_photos: Optional[str] = None,
    remark: Optional[str] = None
) -> VehicleHistory:
    """
    创建车辆历史记录
    记录车辆的提车或还车操作
    
    Args:
        session: 数据库会话
        vehicle_id: 车辆ID
        user_id: 司机ID
        action_type: 操作类型（pickup=提车, return=还车）
        action_time: 操作时间
        photos: 照片JSON数组（7张基本照片）
        damage_photos: 车损照片JSON数组
        remark: 备注
        
    Returns:
        VehicleHistory: 创建的历史记录对象
        
    Requirements: 15.2, 15.3
    """
    history = VehicleHistory(
        vehicle_id=vehicle_id,
        user_id=user_id,
        action_type=action_type,
        action_time=action_time,
        photos=photos,
        damage_photos=damage_photos,
        remark=remark
    )
    session.add(history)
    session.commit()
    session.refresh(history)
    return history


def get_vehicle_history_by_id(
    session: Session,
    history_id: int
) -> Optional[VehicleHistory]:
    """
    根据ID获取车辆历史记录
    
    Args:
        session: 数据库会话
        history_id: 历史记录ID
        
    Returns:
        VehicleHistory: 历史记录对象，不存在则返回 None
    """
    return session.get(VehicleHistory, history_id)


def get_vehicle_history(
    session: Session,
    vehicle_id: int,
    action_type: Optional[VehicleHistoryActionType] = None,
    skip: int = 0,
    limit: int = 20
) -> List[VehicleHistory]:
    """
    获取车辆的使用历史列表
    返回指定车辆的所有提车和还车记录
    
    Args:
        session: 数据库会话
        vehicle_id: 车辆ID
        action_type: 按操作类型筛选（可选）
        skip: 跳过记录数，默认0
        limit: 返回记录数上限，默认20
        
    Returns:
        List[VehicleHistory]: 历史记录列表，按操作时间倒序排列
        
    Requirements: 15.1, 15.2, 15.3, 15.4
    """
    statement = select(VehicleHistory).where(VehicleHistory.vehicle_id == vehicle_id)
    
    # 按操作类型筛选（可选）
    if action_type is not None:
        statement = statement.where(VehicleHistory.action_type == action_type)
    
    # 按操作时间倒序排列
    statement = statement.order_by(VehicleHistory.action_time.desc())
    # 分页
    statement = statement.offset(skip).limit(limit)
    
    return list(session.exec(statement).all())


def get_vehicle_history_count(
    session: Session,
    vehicle_id: int,
    action_type: Optional[VehicleHistoryActionType] = None
) -> int:
    """
    获取车辆历史记录总数
    用于分页
    
    Args:
        session: 数据库会话
        vehicle_id: 车辆ID
        action_type: 按操作类型筛选（可选）
        
    Returns:
        int: 历史记录总数
        
    Requirements: 15.4
    """
    statement = select(func.count(VehicleHistory.id)).where(
        VehicleHistory.vehicle_id == vehicle_id
    )
    
    if action_type is not None:
        statement = statement.where(VehicleHistory.action_type == action_type)
    
    return session.exec(statement).first() or 0


def get_user_vehicle_history(
    session: Session,
    user_id: int,
    skip: int = 0,
    limit: int = 20
) -> List[VehicleHistory]:
    """
    获取用户的车辆使用历史
    返回指定用户的所有提车和还车记录
    
    Args:
        session: 数据库会话
        user_id: 用户ID
        skip: 跳过记录数
        limit: 返回记录数上限
        
    Returns:
        List[VehicleHistory]: 历史记录列表
    """
    statement = select(VehicleHistory).where(
        VehicleHistory.user_id == user_id
    ).order_by(VehicleHistory.action_time.desc()).offset(skip).limit(limit)
    
    return list(session.exec(statement).all())
