"""
初始化数据模块
创建默认管理员账号和计件分类
"""

from sqlmodel import Session

from models import UserRole
from crud.users import create_user, get_user_by_username
from crud.piece_work import create_piece_work_category, get_piece_work_categories


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
        create_user(
            session,
            username="driver",
            password="driver123",
            name="测试司机",
            role=UserRole.DRIVER
        )
        print("✅ 已创建默认司机账号: driver / driver123")

    # 检查是否已有司机2账号
    driver2 = get_user_by_username(session, "driver2")
    if not driver2:
        create_user(
            session,
            username="driver2",
            password="driver123",
            name="司机小王",
            role=UserRole.DRIVER
        )
        print("✅ 已创建默认司机2账号: driver2 / driver123")

    # 检查是否已有司机3账号
    driver3 = get_user_by_username(session, "driver3")
    if not driver3:
        create_user(
            session,
            username="driver3",
            password="driver123",
            name="司机小李",
            role=UserRole.DRIVER
        )
        print("✅ 已创建默认司机3账号: driver3 / driver123")

    # 不再自动创建计件分类，因为分类需要关联仓库
    # 用户需要先创建仓库，然后在仓库中创建分类
    print("ℹ️  计件分类需要在创建仓库后手动添加")
