"""
测试数据工厂模块
提供创建各种测试数据的工厂类和函数

主要功能：
- UserFactory: 创建各角色用户
- WarehouseFactory: 创建仓库
- VehicleFactory: 创建车辆
- AttendanceFactory: 创建考勤记录
- PieceWorkFactory: 创建计件记录
- LeaveFactory: 创建请假申请
- NotificationFactory: 创建通知
"""

from datetime import datetime, date, timedelta
from typing import Optional, Dict
from sqlmodel import Session
import json
import random
import string

# 导入模型
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models import (
    User, UserRole, Warehouse, WarehouseAssignment,
    Attendance, PieceWorkCategory, PieceWorkRecord,
    LeaveApplication, LeaveType, LeaveStatus,
    Vehicle, VehicleStatus,
    Notification, NotificationTemplate, ScheduledNotification,
    RepeatType, ScheduledNotificationStatus
)
from auth import hash_password


# ==================== 工具函数 ====================

def random_string(length: int = 8) -> str:
    """
    生成随机字符串

    Args:
        length: 字符串长度

    Returns:
        str: 随机字符串
    """
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))


def random_phone() -> str:
    """
    生成随机手机号

    Returns:
        str: 随机手机号（138开头）
    """
    return f"138{random.randint(10000000, 99999999)}"


def random_license_plate() -> str:
    """
    生成随机车牌号

    Returns:
        str: 随机车牌号（如：川A12345）
    """
    provinces = ['川', '京', '沪', '粤', '浙', '苏', '鲁', '豫']
    letters = string.ascii_uppercase
    province = random.choice(provinces)
    letter = random.choice(letters)
    numbers = ''.join(random.choices(string.digits, k=5))
    return f"{province}{letter}{numbers}"


# ==================== 用户工厂 ====================

class UserFactory:
    """
    用户数据工厂
    用于创建各种角色的测试用户
    """

    # 默认测试密码
    DEFAULT_PASSWORD = "test123456"

    @classmethod
    def create(
        cls,
        session: Session,
        username: Optional[str] = None,
        password: Optional[str] = None,
        name: Optional[str] = None,
        phone: Optional[str] = None,
        role: UserRole = UserRole.DRIVER,
        is_active: bool = True
    ) -> User:
        """
        创建用户

        Args:
            session: 数据库会话
            username: 用户名，默认随机生成
            password: 密码，默认使用 DEFAULT_PASSWORD
            name: 姓名，默认随机生成
            phone: 手机号，默认随机生成
            role: 角色，默认司机
            is_active: 是否启用，默认启用

        Returns:
            User: 创建的用户对象
        """
        user = User(
            username=username or f"user_{random_string()}",
            password_hash=hash_password(password or cls.DEFAULT_PASSWORD),
            name=name or f"测试用户_{random_string(4)}",
            phone=phone or random_phone(),
            role=role,
            is_active=is_active
        )
        session.add(user)
        session.commit()
        session.refresh(user)
        return user

    @classmethod
    def create_driver(cls, session: Session, **kwargs) -> User:
        """创建司机用户"""
        kwargs.setdefault('role', UserRole.DRIVER)
        return cls.create(session, **kwargs)

    @classmethod
    def create_manager(cls, session: Session, **kwargs) -> User:
        """创建车队长用户"""
        kwargs.setdefault('role', UserRole.MANAGER)
        return cls.create(session, **kwargs)

    @classmethod
    def create_peer_admin(cls, session: Session, **kwargs) -> User:
        """创建调度用户"""
        kwargs.setdefault('role', UserRole.PEER_ADMIN)
        return cls.create(session, **kwargs)

    @classmethod
    def create_boss(cls, session: Session, **kwargs) -> User:
        """创建老板用户"""
        kwargs.setdefault('role', UserRole.BOSS)
        return cls.create(session, **kwargs)

    @classmethod
    def create_super_admin(cls, session: Session, **kwargs) -> User:
        """
        创建超级管理员用户（已废弃，使用 BOSS 角色代替）
        
        注意：SUPER_ADMIN 角色已被移除，此方法现在创建 BOSS 角色用户
        保留此方法是为了向后兼容现有测试代码
        """
        kwargs.setdefault('role', UserRole.BOSS)
        return cls.create(session, **kwargs)


# ==================== 仓库工厂 ====================

class WarehouseFactory:
    """
    仓库数据工厂
    用于创建测试仓库
    """

    @classmethod
    def create(
        cls,
        session: Session,
        name: Optional[str] = None,
        address: Optional[str] = None,
        is_active: bool = True
    ) -> Warehouse:
        """
        创建仓库

        Args:
            session: 数据库会话
            name: 仓库名称，默认随机生成
            address: 仓库地址，默认随机生成
            is_active: 是否启用，默认启用

        Returns:
            Warehouse: 创建的仓库对象
        """
        warehouse = Warehouse(
            name=name or f"仓库_{random_string(4)}",
            address=address or f"测试地址_{random_string(6)}",
            is_active=is_active
        )
        session.add(warehouse)
        session.commit()
        session.refresh(warehouse)
        return warehouse

    @classmethod
    def assign_user(
        cls,
        session: Session,
        user: User,
        warehouse: Warehouse
    ) -> WarehouseAssignment:
        """
        将用户分配到仓库

        Args:
            session: 数据库会话
            user: 用户对象
            warehouse: 仓库对象

        Returns:
            WarehouseAssignment: 分配记录
        """
        assignment = WarehouseAssignment(
            user_id=user.id,
            warehouse_id=warehouse.id
        )
        session.add(assignment)
        session.commit()
        session.refresh(assignment)
        return assignment


# ==================== 车辆工厂 ====================

class VehicleFactory:
    """
    车辆数据工厂
    用于创建测试车辆
    """

    @classmethod
    def create(
        cls,
        session: Session,
        user: User,
        warehouse: Optional[Warehouse] = None,
        license_plate: Optional[str] = None,
        brand: Optional[str] = None,
        model: Optional[str] = None,
        color: Optional[str] = None,
        status: VehicleStatus = VehicleStatus.REVIEWING,
        ownership_type: str = "company"
    ) -> Vehicle:
        """
        创建车辆

        Args:
            session: 数据库会话
            user: 车主用户
            warehouse: 所属仓库（可选）
            license_plate: 车牌号，默认随机生成
            brand: 品牌，默认随机
            model: 型号，默认随机
            color: 颜色，默认随机
            status: 状态，默认审核中
            ownership_type: 所有权类型，默认公司车辆

        Returns:
            Vehicle: 创建的车辆对象
        """
        brands = ['丰田', '本田', '大众', '比亚迪', '特斯拉']
        colors = ['白色', '黑色', '银色', '红色', '蓝色']

        vehicle = Vehicle(
            user_id=user.id,
            warehouse_id=warehouse.id if warehouse else None,
            license_plate=license_plate or random_license_plate(),
            brand=brand or random.choice(brands),
            model=model or f"型号_{random_string(3)}",
            color=color or random.choice(colors),
            status=status,
            ownership_type=ownership_type
        )
        session.add(vehicle)
        session.commit()
        session.refresh(vehicle)
        return vehicle

    @classmethod
    def create_with_lease(
        cls,
        session: Session,
        user: User,
        warehouse: Optional[Warehouse] = None,
        monthly_rent: float = 3000.0,
        lease_days: int = 365
    ) -> Vehicle:
        """
        创建带租赁信息的车辆

        Args:
            session: 数据库会话
            user: 车主用户
            warehouse: 所属仓库
            monthly_rent: 月租金
            lease_days: 租赁天数

        Returns:
            Vehicle: 创建的车辆对象
        """
        vehicle = cls.create(
            session, user, warehouse,
            status=VehicleStatus.ACTIVE,
            ownership_type="leased"
        )

        # 更新租赁信息
        vehicle.lessor_name = "测试出租方"
        vehicle.lessor_contact = random_phone()
        vehicle.lessee_name = user.name
        vehicle.lessee_contact = user.phone
        vehicle.monthly_rent = monthly_rent
        vehicle.lease_start_date = date.today()
        vehicle.lease_end_date = date.today() + timedelta(days=lease_days)
        vehicle.rent_payment_day = 1

        session.add(vehicle)
        session.commit()
        session.refresh(vehicle)
        return vehicle


# ==================== 考勤工厂 ====================

class AttendanceFactory:
    """
    考勤数据工厂
    用于创建测试考勤记录
    """

    @classmethod
    def create(
        cls,
        session: Session,
        user: User,
        work_date: Optional[date] = None,
        clock_in: Optional[datetime] = None,
        clock_out: Optional[datetime] = None
    ) -> Attendance:
        """
        创建考勤记录

        Args:
            session: 数据库会话
            user: 用户对象
            work_date: 工作日期，默认今天
            clock_in: 上班打卡时间
            clock_out: 下班打卡时间

        Returns:
            Attendance: 创建的考勤记录
        """
        work_date = work_date or date.today()

        # 计算工时
        work_hours = None
        if clock_in and clock_out:
            delta = clock_out - clock_in
            work_hours = delta.total_seconds() / 3600

        attendance = Attendance(
            user_id=user.id,
            work_date=work_date,
            clock_in=clock_in,
            clock_out=clock_out,
            work_hours=work_hours
        )
        session.add(attendance)
        session.commit()
        session.refresh(attendance)
        return attendance

    @classmethod
    def create_full_day(
        cls,
        session: Session,
        user: User,
        work_date: Optional[date] = None
    ) -> Attendance:
        """
        创建完整的一天考勤记录（上下班都打卡）

        Args:
            session: 数据库会话
            user: 用户对象
            work_date: 工作日期

        Returns:
            Attendance: 创建的考勤记录
        """
        work_date = work_date or date.today()
        clock_in = datetime.combine(work_date, datetime.min.time().replace(hour=8))
        clock_out = datetime.combine(work_date, datetime.min.time().replace(hour=18))

        return cls.create(session, user, work_date, clock_in, clock_out)


# ==================== 计件工厂 ====================

class PieceWorkFactory:
    """
    计件数据工厂
    用于创建测试计件分类和记录
    """

    @classmethod
    def create_category(
        cls,
        session: Session,
        name: Optional[str] = None,
        unit_price: float = 1.0,
        upstairs_price: Optional[float] = None,
        sorting_price: Optional[float] = None,
        unit: str = "件",
        is_active: bool = True
    ) -> PieceWorkCategory:
        """
        创建计件分类

        Args:
            session: 数据库会话
            name: 分类名称
            unit_price: 基础单价
            upstairs_price: 上楼单价
            sorting_price: 分拣单价
            unit: 计量单位
            is_active: 是否启用

        Returns:
            PieceWorkCategory: 创建的分类对象
        """
        category = PieceWorkCategory(
            name=name or f"分类_{random_string(4)}",
            unit_price=unit_price,
            upstairs_price=upstairs_price,
            sorting_price=sorting_price,
            unit=unit,
            is_active=is_active
        )
        session.add(category)
        session.commit()
        session.refresh(category)
        return category

    @classmethod
    def create_record(
        cls,
        session: Session,
        user: User,
        category: PieceWorkCategory,
        warehouse: Optional[Warehouse] = None,
        work_date: Optional[date] = None,
        quantity: int = 100
    ) -> PieceWorkRecord:
        """
        创建计件记录

        Args:
            session: 数据库会话
            user: 用户对象
            category: 计件分类
            warehouse: 仓库（可选）
            work_date: 工作日期
            quantity: 数量

        Returns:
            PieceWorkRecord: 创建的计件记录
        """
        work_date = work_date or date.today()
        amount = quantity * category.unit_price

        record = PieceWorkRecord(
            user_id=user.id,
            category_id=category.id,
            warehouse_id=warehouse.id if warehouse else None,
            work_date=work_date,
            quantity=quantity,
            amount=amount
        )
        session.add(record)
        session.commit()
        session.refresh(record)
        return record


# ==================== 请假工厂 ====================

class LeaveFactory:
    """
    请假数据工厂
    用于创建测试请假申请
    """

    @classmethod
    def create(
        cls,
        session: Session,
        user: User,
        leave_type: LeaveType = LeaveType.LEAVE,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        reason: Optional[str] = None,
        status: LeaveStatus = LeaveStatus.PENDING
    ) -> LeaveApplication:
        """
        创建请假申请

        Args:
            session: 数据库会话
            user: 申请人
            leave_type: 请假类型
            start_date: 开始日期
            end_date: 结束日期
            reason: 请假原因
            status: 审批状态

        Returns:
            LeaveApplication: 创建的请假申请
        """
        start_date = start_date or date.today() + timedelta(days=1)
        end_date = end_date or start_date + timedelta(days=1)

        leave = LeaveApplication(
            user_id=user.id,
            leave_type=leave_type,
            start_date=start_date,
            end_date=end_date,
            reason=reason or "测试请假原因",
            status=status
        )
        session.add(leave)
        session.commit()
        session.refresh(leave)
        return leave

    @classmethod
    def create_resign(cls, session: Session, user: User, **kwargs) -> LeaveApplication:
        """创建离职申请"""
        kwargs.setdefault('leave_type', LeaveType.RESIGN)
        kwargs.setdefault('reason', "测试离职原因")
        return cls.create(session, user, **kwargs)


# ==================== 通知工厂 ====================

class NotificationFactory:
    """
    通知数据工厂
    用于创建测试通知
    """

    @classmethod
    def create(
        cls,
        session: Session,
        user: User,
        title: Optional[str] = None,
        content: Optional[str] = None,
        is_read: bool = False,
        sender_id: Optional[int] = None
    ) -> Notification:
        """
        创建通知

        Args:
            session: 数据库会话
            user: 接收用户
            title: 通知标题
            content: 通知内容
            is_read: 是否已读
            sender_id: 发送者ID

        Returns:
            Notification: 创建的通知对象
        """
        notification = Notification(
            user_id=user.id,
            title=title or f"测试通知_{random_string(4)}",
            content=content or "这是一条测试通知内容",
            is_read=is_read,
            sender_id=sender_id
        )
        session.add(notification)
        session.commit()
        session.refresh(notification)
        return notification

    @classmethod
    def create_template(
        cls,
        session: Session,
        name: Optional[str] = None,
        title: str = "通知标题",
        content: str = "通知内容",
        variables: Optional[Dict[str, str]] = None,
        category: Optional[str] = None,
        is_active: bool = True
    ) -> NotificationTemplate:
        """
        创建通知模板

        Args:
            session: 数据库会话
            name: 模板名称
            title: 标题模板
            content: 内容模板
            variables: 变量说明
            category: 分类
            is_active: 是否启用

        Returns:
            NotificationTemplate: 创建的模板对象
        """
        template = NotificationTemplate(
            name=name or f"template_{random_string(6)}",
            title=title,
            content=content,
            variables=json.dumps(variables) if variables else None,
            category=category,
            is_active=is_active
        )
        session.add(template)
        session.commit()
        session.refresh(template)
        return template


# ==================== 版本工厂 ====================

# ==================== 定时通知工厂 ====================

class ScheduledNotificationFactory:
    """
    定时通知数据工厂
    用于创建测试定时通知
    """

    @classmethod
    def create(
        cls,
        session: Session,
        name: Optional[str] = None,
        title: Optional[str] = None,
        content: Optional[str] = None,
        scheduled_time: Optional[datetime] = None,
        repeat_type: RepeatType = RepeatType.ONCE,
        status: ScheduledNotificationStatus = ScheduledNotificationStatus.PENDING,
        target_user_ids: Optional[str] = None,
        target_roles: Optional[str] = None,
        creator_id: Optional[int] = None
    ) -> ScheduledNotification:
        """
        创建定时通知

        Args:
            session: 数据库会话
            name: 任务名称，默认随机生成
            title: 通知标题
            content: 通知内容
            scheduled_time: 计划发送时间，默认1小时后
            repeat_type: 重复类型，默认一次性
            status: 状态，默认待执行
            target_user_ids: 目标用户ID列表（JSON格式）
            target_roles: 目标角色列表（JSON格式）
            creator_id: 创建者ID

        Returns:
            ScheduledNotification: 创建的定时通知对象
        """
        # 默认发送时间为1小时后
        if scheduled_time is None:
            scheduled_time = datetime.now() + timedelta(hours=1)

        notification = ScheduledNotification(
            name=name or f"定时通知_{random_string(6)}",
            title=title or f"测试通知_{random_string(4)}",
            content=content or "这是一条测试定时通知内容",
            scheduled_time=scheduled_time,
            repeat_type=repeat_type,
            status=status,
            target_user_ids=target_user_ids,
            target_roles=target_roles,
            creator_id=creator_id,
            next_execute_at=scheduled_time
        )
        session.add(notification)
        session.commit()
        session.refresh(notification)
        return notification

    @classmethod
    def create_daily(
        cls,
        session: Session,
        name: Optional[str] = None,
        **kwargs
    ) -> ScheduledNotification:
        """创建每日重复的定时通知"""
        kwargs.setdefault('repeat_type', RepeatType.DAILY)
        kwargs.setdefault('name', name or f"每日通知_{random_string(4)}")
        return cls.create(session, **kwargs)

    @classmethod
    def create_weekly(
        cls,
        session: Session,
        name: Optional[str] = None,
        weekdays: str = "[1,3,5]",
        **kwargs
    ) -> ScheduledNotification:
        """创建每周重复的定时通知"""
        kwargs.setdefault('repeat_type', RepeatType.WEEKLY)
        kwargs.setdefault('name', name or f"每周通知_{random_string(4)}")
        notification = cls.create(session, **kwargs)
        notification.weekdays = weekdays
        session.add(notification)
        session.commit()
        session.refresh(notification)
        return notification
