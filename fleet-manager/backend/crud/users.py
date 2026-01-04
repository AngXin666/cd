"""
用户 CRUD 操作模块
实现用户的增删改查操作
"""

from datetime import datetime
from typing import Optional, List
from sqlmodel import Session, select
from models import User, UserRole
from common import hash_password


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
