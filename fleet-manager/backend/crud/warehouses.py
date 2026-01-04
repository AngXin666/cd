"""
仓库 CRUD 操作模块
实现仓库的增删改查操作
"""

from typing import Optional, List
from sqlmodel import Session, select
from models import User, Warehouse, WarehouseAssignment, WarehouseType


def create_warehouse(
    session: Session,
    name: str,
    address: Optional[str] = None,
    warehouse_type: Optional[WarehouseType] = None
) -> Warehouse:
    """
    创建新仓库
    
    支持设置仓库类型，默认为计件类型（PIECE）。

    Args:
        session: 数据库会话
        name: 仓库名称
        address: 仓库地址（可选）
        warehouse_type: 仓库类型（可选），默认为 PIECE

    Returns:
        Warehouse: 创建的仓库对象
    """
    warehouse = Warehouse(name=name, address=address)
    
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
    warehouse_type: Optional[WarehouseType] = None,
    skip: int = 0,
    limit: int = 100
) -> List[Warehouse]:
    """
    获取仓库列表

    Args:
        session: 数据库会话
        is_active: 按启用状态筛选（可选）
        warehouse_type: 按仓库类型筛选（可选）
        skip: 跳过记录数
        limit: 返回记录数上限

    Returns:
        List[Warehouse]: 仓库列表
    """
    statement = select(Warehouse)

    if is_active is not None:
        statement = statement.where(Warehouse.is_active == is_active)
    
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
    warehouse_type: Optional[WarehouseType] = None
) -> Warehouse:
    """
    更新仓库信息

    Args:
        session: 数据库会话
        warehouse: 要更新的仓库对象
        name: 新名称（可选）
        address: 新地址（可选）
        is_active: 新启用状态（可选）
        warehouse_type: 新仓库类型（可选）

    Returns:
        Warehouse: 更新后的仓库对象
    """
    if name is not None:
        warehouse.name = name
    if address is not None:
        warehouse.address = address
    if is_active is not None:
        warehouse.is_active = is_active
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
