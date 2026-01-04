"""
计件 CRUD 操作模块
实现计件分类和计件记录的增删改查操作
"""

from datetime import date
from typing import Optional, List
from sqlmodel import Session, select, func
from models import PieceWorkCategory, PieceWorkRecord


def create_piece_work_category(
    session: Session,
    name: str,
    warehouse_id: int,
    driver_only_price: float = 0.0,
    with_vehicle_price: float = 0.0,
    unit: str = "件",
    unit_price: float = 0.0,
    upstairs_price: Optional[float] = None,
    sorting_price: Optional[float] = None
) -> PieceWorkCategory:
    """
    创建计件分类

    Args:
        session: 数据库会话
        name: 分类名称
        warehouse_id: 关联仓库ID
        driver_only_price: 纯司机单价
        with_vehicle_price: 带车司机单价
        unit: 计量单位
        unit_price: 基础单价（兼容旧数据）
        upstairs_price: 上楼单价（可选）
        sorting_price: 分拣单价（可选）

    Returns:
        PieceWorkCategory: 创建的分类对象
    """
    category = PieceWorkCategory(
        name=name,
        warehouse_id=warehouse_id,
        driver_only_price=driver_only_price,
        with_vehicle_price=with_vehicle_price,
        unit_price=unit_price,
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

    Args:
        session: 数据库会话
        is_active: 按启用状态筛选（可选）
        unit: 按计量单位筛选（可选）
        warehouse_id: 按仓库ID筛选（可选）

    Returns:
        List[PieceWorkCategory]: 分类列表
    """
    statement = select(PieceWorkCategory)

    if is_active is not None:
        statement = statement.where(PieceWorkCategory.is_active == is_active)
    
    if unit is not None:
        statement = statement.where(PieceWorkCategory.unit == unit)
    
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
    """
    category = session.get(PieceWorkCategory, category_id)
    if not category:
        return False

    # 检查是否有关联的计件记录
    statement = select(PieceWorkRecord).where(PieceWorkRecord.category_id == category_id)
    records = session.exec(statement).first()
    if records:
        raise ValueError("该品类已有计件记录，无法删除")

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
    category = session.get(PieceWorkCategory, category_id)
    unit_price = category.unit_price if category else 0
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
        dict: 统计结果
    """
    from helpers import get_warehouse_preset_unit, get_warehouse_type_display_name
    from crud.warehouses import get_warehouse_by_id
    
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

    stats = {
        "total_quantity": result.total_quantity or 0,
        "total_amount": result.total_amount or 0,
        "record_count": result.record_count or 0,
        "unit": "件",
        "warehouse_type": None,
        "warehouse_type_display": None
    }
    
    if warehouse_id is not None:
        warehouse = get_warehouse_by_id(session, warehouse_id)
        if warehouse:
            stats["unit"] = get_warehouse_preset_unit(warehouse.warehouse_type)
            stats["warehouse_type"] = (
                warehouse.warehouse_type.value 
                if hasattr(warehouse.warehouse_type, 'value') 
                else str(warehouse.warehouse_type)
            )
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
    if quantity is not None:
        record.quantity = quantity
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
