"""
CRUD 操作模块
实现数据库的增删改查操作
包含用户、仓库、考勤、计件、请假、车辆、通知等模块的 CRUD
"""

from datetime import datetime, date
from typing import Optional, List, Union
from sqlmodel import Session, select, func
from models import (
    User, Warehouse, WarehouseAssignment, Attendance,
    PieceWorkCategory, PieceWorkRecord, LeaveApplication,
    Vehicle, VehicleDocument, Notification,
    UserRole, LeaveStatus, VehicleStatus, WarehouseType, DriverLicense
)
# 从 common.py 导入密码哈希函数，解决循环导入问题
from common import hash_password
# 导入参数数据类，用于封装多参数函数
from schemas import VehicleCreateParams


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
    from sqlalchemy.orm import selectinload
    
    statement = select(User).options(selectinload(User.driver_license))

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
    driver_type: Optional[str] = None,
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
        driver_type: 司机类型（可选）：pure 或 with_vehicle
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
    if driver_type is not None:
        user.driver_type = driver_type
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
    address: Optional[str] = None,
    warehouse_type: Optional["WarehouseType"] = None
) -> Warehouse:
    """
    创建新仓库
    
    支持设置仓库类型，默认为计件类型（PIECE）。

    Args:
        session: 数据库会话
        name: 仓库名称
        address: 仓库地址（可选）
        warehouse_type: 仓库类型（可选），默认为 PIECE
            - PIECE: 计件类型，预设单位为"件"
            - POINT: 点位类型，预设单位为"点"
            - WHOLE: 整车类型，预设单位为"车"
            - DISTANCE: 距离类型，预设单位为"公里"

    Returns:
        Warehouse: 创建的仓库对象
        
    Requirements:
        - Requirement 1.6: 仓库类型字段默认值为 "piece"
        - Requirement 7.1: API 接口支持创建带类型的仓库
    """
    # 创建仓库对象，如果未指定类型则使用模型默认值（PIECE）
    warehouse = Warehouse(name=name, address=address)
    
    # 如果指定了仓库类型，则设置
    if warehouse_type is not None:
        warehouse.warehouse_type = warehouse_type
        
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
    warehouse_type: Optional["WarehouseType"] = None,
    skip: int = 0,
    limit: int = 100
) -> List[Warehouse]:
    """
    获取仓库列表
    
    支持按启用状态和仓库类型筛选。

    Args:
        session: 数据库会话
        is_active: 按启用状态筛选（可选）
        warehouse_type: 按仓库类型筛选（可选）
            - PIECE: 计件类型
            - POINT: 点位类型
            - WHOLE: 整车类型
            - DISTANCE: 距离类型
        skip: 跳过记录数
        limit: 返回记录数上限

    Returns:
        List[Warehouse]: 仓库列表
        
    Requirements:
        - Requirement 7.3: 支持按 warehouse_type 筛选仓库
    """
    statement = select(Warehouse)

    # 按启用状态筛选
    if is_active is not None:
        statement = statement.where(Warehouse.is_active == is_active)
    
    # 按仓库类型筛选
    # Requirements: 7.3 - 支持按 warehouse_type 筛选仓库
    if warehouse_type is not None:
        statement = statement.where(Warehouse.warehouse_type == warehouse_type)

    statement = statement.offset(skip).limit(limit)
    return list(session.exec(statement).all())


def update_warehouse(
    session: Session,
    warehouse: Warehouse,
    name: Optional[str] = None,
    address: Optional[str] = None,
    is_active: Optional[bool] = None,
    warehouse_type: Optional["WarehouseType"] = None
) -> Warehouse:
    """
    更新仓库信息
    
    支持更新仓库类型。

    Args:
        session: 数据库会话
        warehouse: 要更新的仓库对象
        name: 新名称（可选）
        address: 新地址（可选）
        is_active: 新启用状态（可选）
        warehouse_type: 新仓库类型（可选）
            - PIECE: 计件类型，预设单位为"件"
            - POINT: 点位类型，预设单位为"点"
            - WHOLE: 整车类型，预设单位为"车"
            - DISTANCE: 距离类型，预设单位为"公里"

    Returns:
        Warehouse: 更新后的仓库对象
        
    Requirements:
        - Requirement 2.4: 更新仓库类型时验证并保存新类型
        - Requirement 7.1: API 接口支持更新仓库类型
    """
    # 更新基本信息
    if name is not None:
        warehouse.name = name
    if address is not None:
        warehouse.address = address
    if is_active is not None:
        warehouse.is_active = is_active
    
    # 更新仓库类型
    # Requirements: 2.4, 7.1 - 支持更新仓库类型
    if warehouse_type is not None:
        warehouse.warehouse_type = warehouse_type

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


def assign_warehouses_to_user(
    session: Session,
    user_id: int,
    warehouse_ids: List[int]
) -> List[WarehouseAssignment]:
    """
    给用户分配仓库（替换现有分配）

    Args:
        session: 数据库会话
        user_id: 用户ID
        warehouse_ids: 仓库ID列表

    Returns:
        List[WarehouseAssignment]: 创建的分配记录列表

    Requirements: 1.5 - 车队长选择仓库并确认分配
    """
    # 删除用户现有的所有仓库分配
    existing_assignments = session.exec(
        select(WarehouseAssignment).where(WarehouseAssignment.user_id == user_id)
    ).all()

    for assignment in existing_assignments:
        session.delete(assignment)

    # 创建新的分配记录
    new_assignments = []
    for warehouse_id in warehouse_ids:
        assignment = WarehouseAssignment(
            user_id=user_id,
            warehouse_id=warehouse_id
        )
        session.add(assignment)
        new_assignments.append(assignment)

    session.commit()
    return new_assignments


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
    user_ids: Optional[List[int]] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    skip: int = 0,
    limit: int = 100
) -> List[Attendance]:
    """
    获取考勤记录列表
    支持按单个用户或用户列表筛选

    Args:
        session: 数据库会话
        user_id: 按单个用户筛选（可选，优先级高于 user_ids）
        user_ids: 按用户ID列表筛选（可选，用于按仓库筛选时）
        start_date: 开始日期（可选）
        end_date: 结束日期（可选）
        skip: 跳过记录数
        limit: 返回记录数上限

    Returns:
        List[Attendance]: 考勤记录列表

    Requirements: 1.1 - 支持按用户列表筛选考勤记录
    """
    statement = select(Attendance)

    # user_id 优先于 user_ids（单用户筛选优先）
    if user_id is not None:
        statement = statement.where(Attendance.user_id == user_id)
    elif user_ids is not None and len(user_ids) > 0:
        # 按用户ID列表筛选（用于按仓库筛选时）
        statement = statement.where(Attendance.user_id.in_(user_ids))

    # 日期范围筛选
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
    unit_price: float = 0.0,
    unit: str = "件",
    warehouse_id: Optional[int] = None,
    driver_only_price: float = 0.0,
    with_vehicle_price: float = 0.0,
    upstairs_price: Optional[float] = None,
    sorting_price: Optional[float] = None
) -> PieceWorkCategory:
    """
    创建计件分类

    Args:
        session: 数据库会话
        name: 分类名称
        unit_price: 基础单价（兼容旧数据）
        unit: 计量单位（由仓库类型决定）
        warehouse_id: 关联仓库ID
        driver_only_price: 纯司机单价
        with_vehicle_price: 带车司机单价
        upstairs_price: 上楼单价（可选）
        sorting_price: 分拣单价（可选）

    Returns:
        PieceWorkCategory: 创建的分类对象

    Requirements: 3.1 - 支持多种单价配置
    """
    category = PieceWorkCategory(
        name=name,
        warehouse_id=warehouse_id,
        unit_price=unit_price,
        driver_only_price=driver_only_price,
        with_vehicle_price=with_vehicle_price,
        unit=unit,
        upstairs_price=upstairs_price,
        sorting_price=sorting_price
    )
    session.add(category)
    session.commit()
    session.refresh(category)
    return category


def get_piece_work_categories(
    session: Session,
    is_active: Optional[bool] = None,
    unit: Optional[str] = None,
    warehouse_id: Optional[int] = None
) -> List[PieceWorkCategory]:
    """
    获取计件分类列表
    
    支持按启用状态、单位和仓库筛选。

    Args:
        session: 数据库会话
        is_active: 按启用状态筛选（可选）
        unit: 按计量单位筛选（可选），如 "件"、"点"、"车"、"公里"
        warehouse_id: 按仓库ID筛选（可选）

    Returns:
        List[PieceWorkCategory]: 分类列表
        
    Requirements:
        - Requirement 7.4: 支持按单位筛选品类
    """
    statement = select(PieceWorkCategory)

    # 按启用状态筛选
    if is_active is not None:
        statement = statement.where(PieceWorkCategory.is_active == is_active)
    
    # 按单位筛选
    # Requirements: 7.4 - 支持按单位筛选品类
    if unit is not None:
        statement = statement.where(PieceWorkCategory.unit == unit)
    
    # 按仓库ID筛选
    if warehouse_id is not None:
        statement = statement.where(PieceWorkCategory.warehouse_id == warehouse_id)

    return list(session.exec(statement).all())


def update_piece_work_category(
    session: Session,
    category: PieceWorkCategory,
    name: Optional[str] = None,
    unit_price: Optional[float] = None,
    unit: Optional[str] = None,
    is_active: Optional[bool] = None,
    upstairs_price: Optional[float] = None,
    sorting_price: Optional[float] = None,
    driver_only_price: Optional[float] = None,
    with_vehicle_price: Optional[float] = None
) -> PieceWorkCategory:
    """
    更新计件分类

    Args:
        session: 数据库会话
        category: 要更新的分类对象
        name: 新名称（可选）
        unit_price: 新基础单价（可选）
        unit: 新单位（可选）
        is_active: 新启用状态（可选）
        upstairs_price: 新上楼单价（可选）
        sorting_price: 新分拣单价（可选）
        driver_only_price: 纯司机单价（可选）
        with_vehicle_price: 带车司机单价（可选）

    Returns:
        PieceWorkCategory: 更新后的分类对象

    Requirements: 3.2 - 支持编辑品类配置
    """
    if name is not None:
        category.name = name
    if unit_price is not None:
        category.unit_price = unit_price
    if unit is not None:
        category.unit = unit
    if is_active is not None:
        category.is_active = is_active
    if upstairs_price is not None:
        category.upstairs_price = upstairs_price
    if sorting_price is not None:
        category.sorting_price = sorting_price
    if driver_only_price is not None:
        category.driver_only_price = driver_only_price
    if with_vehicle_price is not None:
        category.with_vehicle_price = with_vehicle_price

    session.add(category)
    session.commit()
    session.refresh(category)
    return category


def delete_piece_work_category(
    session: Session,
    category_id: int
) -> bool:
    """
    删除计件分类

    Args:
        session: 数据库会话
        category_id: 分类ID

    Returns:
        bool: 是否删除成功

    Raises:
        ValueError: 如果分类有关联的计件记录，则不允许删除

    Requirements: 3.3, 3.4 - 删除品类功能和约束检查
    """
    # 检查分类是否存在
    category = session.get(PieceWorkCategory, category_id)
    if not category:
        return False

    # 检查是否有关联的计件记录
    statement = select(PieceWorkRecord).where(PieceWorkRecord.category_id == category_id)
    records = session.exec(statement).first()
    if records:
        raise ValueError("该品类已有计件记录，无法删除")

    # 删除分类
    session.delete(category)
    session.commit()
    return True


def get_piece_work_category_by_id(
    session: Session,
    category_id: int
) -> Optional[PieceWorkCategory]:
    """
    根据ID获取计件分类

    Args:
        session: 数据库会话
        category_id: 分类ID

    Returns:
        Optional[PieceWorkCategory]: 分类对象，不存在则返回 None
    """
    return session.get(PieceWorkCategory, category_id)


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
    
    统计计件记录的总数量、总金额和记录数。
    如果指定了仓库，还会返回该仓库的预设单位和类型信息。

    Args:
        session: 数据库会话
        user_id: 按用户筛选（可选）
        warehouse_id: 按仓库筛选（可选）
        start_date: 开始日期（可选）
        end_date: 结束日期（可选）

    Returns:
        dict: 统计结果，包含以下字段：
            - total_quantity: 总数量
            - total_amount: 总金额
            - record_count: 记录数
            - unit: 计量单位（根据仓库类型确定，默认为"件"）
            - warehouse_type: 仓库类型（如果指定了仓库）
            - warehouse_type_display: 仓库类型显示名称（如果指定了仓库）
    
    Requirements: 6.1 - 数据统计单位显示
    """
    # 导入辅助函数
    from helpers import get_warehouse_preset_unit, get_warehouse_type_display_name
    
    # 构建统计查询
    statement = select(
        func.sum(PieceWorkRecord.quantity).label("total_quantity"),
        func.sum(PieceWorkRecord.amount).label("total_amount"),
        func.count(PieceWorkRecord.id).label("record_count")
    )

    # 应用筛选条件
    if user_id is not None:
        statement = statement.where(PieceWorkRecord.user_id == user_id)
    if warehouse_id is not None:
        statement = statement.where(PieceWorkRecord.warehouse_id == warehouse_id)
    if start_date is not None:
        statement = statement.where(PieceWorkRecord.work_date >= start_date)
    if end_date is not None:
        statement = statement.where(PieceWorkRecord.work_date <= end_date)

    # 执行查询
    result = session.exec(statement).first()

    # 构建基础响应
    stats = {
        "total_quantity": result.total_quantity or 0,
        "total_amount": result.total_amount or 0,
        "record_count": result.record_count or 0,
        "unit": "件",  # 默认单位
        "warehouse_type": None,
        "warehouse_type_display": None
    }
    
    # 如果指定了仓库，获取仓库的预设单位和类型信息
    if warehouse_id is not None:
        warehouse = get_warehouse_by_id(session, warehouse_id)
        if warehouse:
            # 获取仓库类型对应的预设单位
            stats["unit"] = get_warehouse_preset_unit(warehouse.warehouse_type)
            # 获取仓库类型值
            stats["warehouse_type"] = (
                warehouse.warehouse_type.value 
                if hasattr(warehouse.warehouse_type, 'value') 
                else str(warehouse.warehouse_type)
            )
            # 获取仓库类型显示名称
            stats["warehouse_type_display"] = get_warehouse_type_display_name(
                warehouse.warehouse_type
            )
    
    return stats


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
    rent_payment_day: Optional[int] = None,
    # 车辆照片（7张基本照片）
    left_front_photo: Optional[str] = None,
    right_front_photo: Optional[str] = None,
    left_rear_photo: Optional[str] = None,
    right_rear_photo: Optional[str] = None,
    dashboard_photo: Optional[str] = None,
    rear_door_photo: Optional[str] = None,
    cargo_box_photo: Optional[str] = None,
    # 行驶证照片（3张）
    driving_license_main_photo: Optional[str] = None,
    driving_license_sub_photo: Optional[str] = None,
    driving_license_sub_back_photo: Optional[str] = None,
    # 照片数组
    pickup_photos: Optional[List[str]] = None,
    registration_photos: Optional[List[str]] = None,
    damage_photos: Optional[List[str]] = None,
    # 提车时间
    pickup_time: Optional[datetime] = None
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
        left_front_photo: 左前照片URL（可选）
        right_front_photo: 右前照片URL（可选）
        left_rear_photo: 左后照片URL（可选）
        right_rear_photo: 右后照片URL（可选）
        dashboard_photo: 仪表盘照片URL（可选）
        rear_door_photo: 后门照片URL（可选）
        cargo_box_photo: 货箱照片URL（可选）
        driving_license_main_photo: 行驶证主页照片URL（可选）
        driving_license_sub_photo: 行驶证副页照片URL（可选）
        driving_license_sub_back_photo: 行驶证副页背面照片URL（可选）
        pickup_photos: 提车照片数组（可选）
        registration_photos: 行驶证照片数组（可选）
        damage_photos: 车损照片数组（可选）
        pickup_time: 提车时间（可选）

    Returns:
        Vehicle: 创建的车辆对象
    """
    import json
    
    # 将照片数组转换为 JSON 字符串
    pickup_photos_json = json.dumps(pickup_photos) if pickup_photos else None
    registration_photos_json = json.dumps(registration_photos) if registration_photos else None
    damage_photos_json = json.dumps(damage_photos) if damage_photos else None
    
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
        rent_payment_day=rent_payment_day,
        # 车辆照片
        left_front_photo=left_front_photo,
        right_front_photo=right_front_photo,
        left_rear_photo=left_rear_photo,
        right_rear_photo=right_rear_photo,
        dashboard_photo=dashboard_photo,
        rear_door_photo=rear_door_photo,
        cargo_box_photo=cargo_box_photo,
        # 行驶证照片
        driving_license_main_photo=driving_license_main_photo,
        driving_license_sub_photo=driving_license_sub_photo,
        driving_license_sub_back_photo=driving_license_sub_back_photo,
        # 照片数组（JSON格式）
        pickup_photos=pickup_photos_json,
        registration_photos=registration_photos_json,
        damage_photos=damage_photos_json,
        # 提车时间
        pickup_time=pickup_time
    )
    session.add(vehicle)
    session.commit()
    session.refresh(vehicle)
    return vehicle


def create_vehicle_with_params(
    session: Session,
    params: VehicleCreateParams
) -> Vehicle:
    """
    使用参数数据类创建车辆
    封装多参数为单一参数对象，简化函数调用

    Args:
        session: 数据库会话
        params: 车辆创建参数对象，包含所有创建所需的参数

    Returns:
        Vehicle: 创建的车辆对象

    Requirements: 4.2
    """
    # 调用原有函数，保持向后兼容
    return create_vehicle(
        session=session,
        user_id=params.user_id,
        license_plate=params.license_plate,
        brand=params.brand,
        model=params.model,
        color=params.color,
        ownership_type=params.ownership_type,
        lessor_name=params.lessor_name,
        lessor_contact=params.lessor_contact,
        lessee_name=params.lessee_name,
        lessee_contact=params.lessee_contact,
        monthly_rent=params.monthly_rent,
        lease_start_date=params.lease_start_date,
        lease_end_date=params.lease_end_date,
        rent_payment_day=params.rent_payment_day,
        # 车辆照片
        left_front_photo=params.left_front_photo,
        right_front_photo=params.right_front_photo,
        left_rear_photo=params.left_rear_photo,
        right_rear_photo=params.right_rear_photo,
        dashboard_photo=params.dashboard_photo,
        rear_door_photo=params.rear_door_photo,
        cargo_box_photo=params.cargo_box_photo,
        # 行驶证照片
        driving_license_main_photo=params.driving_license_main_photo,
        driving_license_sub_photo=params.driving_license_sub_photo,
        driving_license_sub_back_photo=params.driving_license_sub_back_photo,
        # 照片数组
        pickup_photos=params.pickup_photos,
        registration_photos=params.registration_photos,
        damage_photos=params.damage_photos,
        # 提车时间
        pickup_time=params.pickup_time
    )


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
        Vehicle.monthly_rent is not None,
        Vehicle.monthly_rent > 0,
        Vehicle.rent_payment_day is not None
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
    sender_id: Optional[int] = None,
    ref_type: Optional[str] = None,
    ref_id: Optional[int] = None,
    status: Optional[str] = None
) -> Notification:
    """
    创建通知

    Args:
        session: 数据库会话
        user_id: 接收用户ID
        title: 通知标题
        content: 通知内容（可选）
        sender_id: 发送者ID（可选）
        ref_type: 关联类型（可选）：leave/resign/vehicle
        ref_id: 关联业务ID（可选）
        status: 审批状态（可选）：pending/approved/rejected

    Returns:
        Notification: 创建的通知对象
    """
    notification = Notification(
        user_id=user_id,
        title=title,
        content=content,
        sender_id=sender_id,
        ref_type=ref_type,
        ref_id=ref_id,
        status=status
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
    sender_id: Optional[int] = None,
    ref_type: Optional[str] = None,
    ref_id: Optional[int] = None,
    status: Optional[str] = None
) -> List[Notification]:
    """
    批量创建通知（发送给多个用户）

    Args:
        session: 数据库会话
        user_ids: 接收用户ID列表
        title: 通知标题
        content: 通知内容（可选）
        sender_id: 发送者ID（可选）
        ref_type: 关联类型（可选）：leave/resign/vehicle
        ref_id: 关联业务ID（可选）
        status: 审批状态（可选）：pending/approved/rejected

    Returns:
        List[Notification]: 创建的通知对象列表
    """
    notifications = []
    for user_id in user_ids:
        notification = Notification(
            user_id=user_id,
            title=title,
            content=content,
            sender_id=sender_id,
            ref_type=ref_type,
            ref_id=ref_id,
            status=status
        )
        session.add(notification)
        notifications.append(notification)

    session.commit()

    # 刷新所有通知对象
    for notification in notifications:
        session.refresh(notification)

    return notifications


def notify_admins(
    session: Session,
    title: str,
    content: str,
    sender_id: Optional[int] = None,
    include_manager: bool = True
) -> List[Notification]:
    """
    发送通知给所有管理员（简化版）
    
    一行代码即可发送通知给所有管理员，无需手动筛选用户。

    Args:
        session: 数据库会话
        title: 通知标题
        content: 通知内容
        sender_id: 发送者ID（可选）
        include_manager: 是否包含车队长，默认 True
            - True: 发送给车队长、调度、老板
            - False: 只发送给调度、老板

    Returns:
        List[Notification]: 创建的通知列表

    Example:
        # 请假申请通知（发给车队长、调度、老板）
        crud.notify_admins(session, "新的请假申请", f"{user.name} 提交了请假申请", sender_id=user.id)
        
        # 车辆审核通知（只发给调度、老板）
        crud.notify_admins(session, "新的车辆审核", f"{user.name} 添加了新车辆", sender_id=user.id, include_manager=False)
    """
    try:
        # 确定目标角色
        if include_manager:
            target_roles = [UserRole.MANAGER.value, UserRole.PEER_ADMIN.value, UserRole.BOSS.value]
        else:
            target_roles = [UserRole.PEER_ADMIN.value, UserRole.BOSS.value]
        
        # 获取所有激活的管理员用户
        admin_users = get_users(session, is_active=True, skip=0, limit=1000)
        admin_ids = [u.id for u in admin_users if u.role in target_roles]
        
        if not admin_ids:
            return []
        
        # 批量创建通知
        return create_notifications_batch(
            session,
            user_ids=admin_ids,
            title=title,
            content=content,
            sender_id=sender_id
        )
    except Exception as e:
        # 通知发送失败不影响主流程
        print(f"发送管理员通知失败: {e}")
        return []


def get_managers_for_user(session: Session, user_id: int) -> List[User]:
    """
    获取管辖某用户的车队长列表
    
    通过用户的仓库分配，找到同样分配到这些仓库的车队长。
    
    Args:
        session: 数据库会话
        user_id: 用户ID
        
    Returns:
        List[User]: 管辖该用户的车队长列表
    """
    # 1. 获取用户分配的仓库ID列表
    user_warehouses = get_user_warehouses(session, user_id)
    warehouse_ids = [w.id for w in user_warehouses]
    
    if not warehouse_ids:
        return []
    
    # 2. 查找分配到这些仓库的车队长
    statement = (
        select(User)
        .join(WarehouseAssignment)
        .where(
            WarehouseAssignment.warehouse_id.in_(warehouse_ids),
            User.role == UserRole.MANAGER.value,
            User.is_active == True
        )
        .distinct()
    )
    
    return list(session.exec(statement).all())


def create_approval_notification(
    session: Session,
    applicant_id: int,
    ref_type: str,
    ref_id: int,
    title: str,
    content: str
) -> List[Notification]:
    """
    创建审批通知
    
    自动发送给：
    1. 管辖申请人的车队长（通过仓库分配确定）
    2. 所有调度（peer_admin）
    3. 所有老板（boss）
    
    Args:
        session: 数据库会话
        applicant_id: 申请人ID
        ref_type: 关联类型（leave/vehicle/resign）
        ref_id: 关联业务ID
        title: 通知标题
        content: 通知内容
        
    Returns:
        List[Notification]: 创建的通知列表
    """
    try:
        # 1. 获取管辖申请人的车队长
        managers = get_managers_for_user(session, applicant_id)
        manager_ids = [m.id for m in managers]
        
        # 2. 获取所有调度和老板
        all_users = get_users(session, is_active=True, skip=0, limit=1000)
        admin_ids = [
            u.id for u in all_users 
            if u.role in [UserRole.PEER_ADMIN.value, UserRole.BOSS.value]
        ]
        
        # 3. 合并去重
        recipient_ids = list(set(manager_ids + admin_ids))
        
        if not recipient_ids:
            return []
        
        # 4. 批量创建通知（带业务关联）
        notifications = []
        for user_id in recipient_ids:
            notification = Notification(
                user_id=user_id,
                title=title,
                content=content,
                sender_id=applicant_id,
                ref_type=ref_type,
                ref_id=ref_id,
                status="pending"
            )
            session.add(notification)
            notifications.append(notification)
        
        session.commit()
        for n in notifications:
            session.refresh(n)
        
        return notifications
    except Exception as e:
        print(f"创建审批通知失败: {e}")
        return []


def complete_approval(
    session: Session,
    ref_type: str,
    ref_id: int,
    result: str,
    approver_id: int,
    applicant_id: int,
    result_title: str,
    result_content: str
) -> List[Notification]:
    """
    完成审批，更新所有相关通知并发送结果通知
    
    1. 更新所有相关 pending 通知的状态
    2. 给所有之前收到通知的管理员发送结果通知
    3. 给申请人发送结果通知
    
    Args:
        session: 数据库会话
        ref_type: 关联类型（leave/vehicle/resign）
        ref_id: 关联业务ID
        result: 审批结果（approved/rejected）
        approver_id: 审批人ID
        applicant_id: 申请人ID
        result_title: 结果通知标题
        result_content: 结果通知内容
        
    Returns:
        List[Notification]: 新创建的结果通知列表
    """
    from datetime import datetime
    
    try:
        # 1. 查找所有相关的 pending 通知
        statement = select(Notification).where(
            Notification.ref_type == ref_type,
            Notification.ref_id == ref_id,
            Notification.status == "pending"
        )
        pending_notifications = list(session.exec(statement).all())
        
        # 2. 更新所有 pending 通知的状态
        notified_user_ids = set()
        for notification in pending_notifications:
            notification.status = result
            notification.updated_at = datetime.now()
            session.add(notification)
            notified_user_ids.add(notification.user_id)
        
        # 3. 添加申请人到通知列表
        notified_user_ids.add(applicant_id)
        
        # 4. 给所有相关人员发送结果通知
        result_notifications = []
        for user_id in notified_user_ids:
            notification = Notification(
                user_id=user_id,
                title=result_title,
                content=result_content,
                sender_id=approver_id,
                ref_type=ref_type,
                ref_id=ref_id,
                status=result
            )
            session.add(notification)
            result_notifications.append(notification)
        
        session.commit()
        for n in result_notifications:
            session.refresh(n)
        
        return result_notifications
    except Exception as e:
        print(f"完成审批通知失败: {e}")
        return []


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
        Notification.is_read.is_(False)
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

    Requirements: 3.1 - 删除超级管理员角色后，老板成为最高权限角色
    """
    # 检查是否已有老板管理员
    admin = get_user_by_username(session, "admin")
    if not admin:
        # 创建默认老板管理员账号（系统最高权限）
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


# ==================== 司机证件 CRUD ====================
# 用于管理司机的身份证和驾驶证信息
# Requirements: 4.5, 4.6, 4.7 - 司机个人档案页面显示身份证号、驾驶证类型、驾驶证有效期


def get_driver_license_by_user_id(session: Session, user_id: int) -> Optional[DriverLicense]:
    """
    根据用户ID获取司机证件信息
    
    由于 user_id 是唯一的，每个用户最多只有一条证件记录

    Args:
        session: 数据库会话
        user_id: 用户ID

    Returns:
        DriverLicense: 司机证件对象，不存在则返回 None
        
    Requirements: 4.5, 4.6, 4.7 - 获取司机证件信息用于个人档案页面显示
    """
    statement = select(DriverLicense).where(DriverLicense.user_id == user_id)
    return session.exec(statement).first()


def create_driver_license(
    session: Session,
    user_id: int,
    id_card_number: Optional[str] = None,
    id_card_name: Optional[str] = None,
    id_card_photo_front: Optional[str] = None,
    id_card_photo_back: Optional[str] = None,
    license_number: Optional[str] = None,
    license_class: Optional[str] = None,
    valid_from: Optional[date] = None,
    valid_to: Optional[date] = None,
    driving_license_photo: Optional[str] = None
) -> DriverLicense:
    """
    创建司机证件记录
    
    为指定用户创建新的证件记录，包含身份证和驾驶证信息

    Args:
        session: 数据库会话
        user_id: 用户ID
        id_card_number: 身份证号码（可选）
        id_card_name: 身份证姓名（可选）
        id_card_photo_front: 身份证正面照片URL（可选）
        id_card_photo_back: 身份证背面照片URL（可选）
        license_number: 驾驶证号码（可选）
        license_class: 驾驶证类型（可选）
        valid_from: 驾驶证有效期起始日期（可选）
        valid_to: 驾驶证有效期截止日期（可选）
        driving_license_photo: 驾驶证照片URL（可选）

    Returns:
        DriverLicense: 创建的司机证件对象
        
    Requirements: 4.5, 4.6, 4.7 - 保存司机证件信息
    """
    driver_license = DriverLicense(
        user_id=user_id,
        id_card_number=id_card_number,
        id_card_name=id_card_name,
        id_card_photo_front=id_card_photo_front,
        id_card_photo_back=id_card_photo_back,
        license_number=license_number,
        license_class=license_class,
        valid_from=valid_from,
        valid_to=valid_to,
        driving_license_photo=driving_license_photo
    )
    session.add(driver_license)
    session.commit()
    session.refresh(driver_license)
    return driver_license


def update_driver_license(
    session: Session,
    driver_license: DriverLicense,
    id_card_number: Optional[str] = None,
    id_card_name: Optional[str] = None,
    id_card_photo_front: Optional[str] = None,
    id_card_photo_back: Optional[str] = None,
    license_number: Optional[str] = None,
    license_class: Optional[str] = None,
    valid_from: Optional[date] = None,
    valid_to: Optional[date] = None,
    driving_license_photo: Optional[str] = None
) -> DriverLicense:
    """
    更新司机证件信息
    
    只更新提供的字段，未提供的字段保持不变

    Args:
        session: 数据库会话
        driver_license: 要更新的司机证件对象
        id_card_number: 身份证号码（可选）
        id_card_name: 身份证姓名（可选）
        id_card_photo_front: 身份证正面照片URL（可选）
        id_card_photo_back: 身份证背面照片URL（可选）
        license_number: 驾驶证号码（可选）
        license_class: 驾驶证类型（可选）
        valid_from: 驾驶证有效期起始日期（可选）
        valid_to: 驾驶证有效期截止日期（可选）
        driving_license_photo: 驾驶证照片URL（可选）

    Returns:
        DriverLicense: 更新后的司机证件对象
        
    Requirements: 4.5, 4.6, 4.7 - 更新司机证件信息
    """
    # 只更新提供的字段
    if id_card_number is not None:
        driver_license.id_card_number = id_card_number
    if id_card_name is not None:
        driver_license.id_card_name = id_card_name
    if id_card_photo_front is not None:
        driver_license.id_card_photo_front = id_card_photo_front
    if id_card_photo_back is not None:
        driver_license.id_card_photo_back = id_card_photo_back
    if license_number is not None:
        driver_license.license_number = license_number
    if license_class is not None:
        driver_license.license_class = license_class
    if valid_from is not None:
        driver_license.valid_from = valid_from
    if valid_to is not None:
        driver_license.valid_to = valid_to
    if driving_license_photo is not None:
        driver_license.driving_license_photo = driving_license_photo
    
    # 更新时间戳
    driver_license.updated_at = datetime.now()
    
    session.add(driver_license)
    session.commit()
    session.refresh(driver_license)
    return driver_license


def create_or_update_driver_license(
    session: Session,
    user_id: int,
    id_card_number: Optional[str] = None,
    id_card_name: Optional[str] = None,
    id_card_photo_front: Optional[str] = None,
    id_card_photo_back: Optional[str] = None,
    license_number: Optional[str] = None,
    license_class: Optional[str] = None,
    valid_from: Optional[date] = None,
    valid_to: Optional[date] = None,
    driving_license_photo: Optional[str] = None
) -> DriverLicense:
    """
    创建或更新司机证件信息
    
    如果用户已有证件记录则更新，否则创建新记录
    这是一个便捷方法，用于 POST API 的 upsert 操作

    Args:
        session: 数据库会话
        user_id: 用户ID
        id_card_number: 身份证号码（可选）
        id_card_name: 身份证姓名（可选）
        id_card_photo_front: 身份证正面照片URL（可选）
        id_card_photo_back: 身份证背面照片URL（可选）
        license_number: 驾驶证号码（可选）
        license_class: 驾驶证类型（可选）
        valid_from: 驾驶证有效期起始日期（可选）
        valid_to: 驾驶证有效期截止日期（可选）
        driving_license_photo: 驾驶证照片URL（可选）

    Returns:
        DriverLicense: 创建或更新后的司机证件对象
        
    Requirements: 4.5, 4.6, 4.7 - 创建或更新司机证件信息
    """
    # 检查是否已存在证件记录
    existing = get_driver_license_by_user_id(session, user_id)
    
    if existing:
        # 更新现有记录
        return update_driver_license(
            session, existing,
            id_card_number=id_card_number,
            id_card_name=id_card_name,
            id_card_photo_front=id_card_photo_front,
            id_card_photo_back=id_card_photo_back,
            license_number=license_number,
            license_class=license_class,
            valid_from=valid_from,
            valid_to=valid_to,
            driving_license_photo=driving_license_photo
        )
    else:
        # 创建新记录
        return create_driver_license(
            session, user_id,
            id_card_number=id_card_number,
            id_card_name=id_card_name,
            id_card_photo_front=id_card_photo_front,
            id_card_photo_back=id_card_photo_back,
            license_number=license_number,
            license_class=license_class,
            valid_from=valid_from,
            valid_to=valid_to,
            driving_license_photo=driving_license_photo
        )
