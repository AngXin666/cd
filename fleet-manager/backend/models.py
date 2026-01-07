"""
数据库模型模块

定义所有数据库表结构，使用 SQLModel 实现 ORM。
包含 10 个核心数据表：用户、仓库、考勤、计件、请假、车辆、通知等。

枚举处理规范：
1. 所有枚举类定义在 enums.py 中，继承 LowercaseStrEnum
2. 数据库字段使用 str 类型 + sa_column=Column(String(N))
3. 枚举值统一使用小写字符串
4. 代码中可以使用枚举常量（如 LeaveStatus.PENDING.value）进行比较
"""

from datetime import datetime, date
from typing import Optional, List
from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import Column, String

# 从 enums.py 导入所有枚举类型
from enums import (
    UserRole,
    LeaveType,
    LeaveStatus,
    VehicleStatus,
    DocumentType,
    VehicleHistoryActionType,
    WarehouseType,
    normalize_enum_value,
    is_enum_equal,
)

# 重新导出枚举类型，方便其他模块导入
__all__ = [
    "UserRole",
    "LeaveType",
    "LeaveStatus",
    "VehicleStatus",
    "DocumentType",
    "VehicleHistoryActionType",
    "WarehouseType",
    "normalize_enum_value",
    "is_enum_equal",
]


# ==================== 辅助函数 ====================

def normalize_role(role) -> str:
    """
    规范化角色值为小写字符串（向后兼容）
    
    Args:
        role: 角色值，可以是 UserRole 枚举或字符串
        
    Returns:
        小写的角色字符串
    """
    return normalize_enum_value(role)


def is_role(user_role, target_role) -> bool:
    """
    检查用户角色是否匹配目标角色（大小写不敏感，向后兼容）
    
    Args:
        user_role: 用户的角色值（可以是字符串或 UserRole 枚举）
        target_role: 目标角色（可以是字符串或 UserRole 枚举）
        
    Returns:
        是否匹配
    """
    return is_enum_equal(user_role, target_role)


# ==================== 数据库模型定义 ====================

class User(SQLModel, table=True):
    """
    用户表
    存储系统所有用户信息，包括司机、车队长、老板
    """
    __tablename__ = "users"

    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(unique=True, index=True, max_length=50)
    password_hash: str = Field(max_length=255)
    name: str = Field(max_length=50)
    phone: Optional[str] = Field(default=None, max_length=20)
    # 使用字符串类型存储，值为小写
    role: str = Field(default=UserRole.DRIVER.value, sa_column=Column(String(20)))
    # 司机类型：pure（纯司机）或 with_vehicle（带车司机）
    driver_type: Optional[str] = Field(default="pure", sa_column=Column(String(20)))
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

    # 关联关系
    warehouse_assignments: List["WarehouseAssignment"] = Relationship(back_populates="user")
    attendance_records: List["Attendance"] = Relationship(back_populates="user")
    piece_work_records: List["PieceWorkRecord"] = Relationship(back_populates="user")
    leave_applications: List["LeaveApplication"] = Relationship(
        back_populates="user",
        sa_relationship_kwargs={"foreign_keys": "[LeaveApplication.user_id]"}
    )
    vehicles: List["Vehicle"] = Relationship(back_populates="user")
    notifications: List["Notification"] = Relationship(back_populates="user")
    driver_license: Optional["DriverLicense"] = Relationship(back_populates="user")

    @property
    def is_verified(self) -> bool:
        """是否已实名：司机需要有身份证号码，其他角色默认已实名"""
        if normalize_role(self.role) != UserRole.DRIVER.value:
            return True
        return bool(self.driver_license and self.driver_license.id_card_number)


class Warehouse(SQLModel, table=True):
    """
    仓库表
    存储仓库/工作地点信息
    """
    __tablename__ = "warehouses"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=100, index=True)
    address: Optional[str] = Field(default=None, max_length=255)
    # 仓库类型：piece=计件, point=点位, whole=整车, distance=距离, custom=自定义
    warehouse_type: str = Field(
        default=WarehouseType.PIECE.value,
        sa_column=Column(String(20)),
        description="仓库类型"
    )
    # 自定义单位（仅 custom 类型使用）
    custom_unit: Optional[str] = Field(
        default=None,
        max_length=20,
        description="自定义单位名称（仅 custom 类型使用）"
    )
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.now)

    # 关联关系
    assignments: List["WarehouseAssignment"] = Relationship(back_populates="warehouse")
    piece_work_records: List["PieceWorkRecord"] = Relationship(back_populates="warehouse")
    vehicles: List["Vehicle"] = Relationship(back_populates="warehouse")


class WarehouseAssignment(SQLModel, table=True):
    """
    用户-仓库关联表
    记录用户分配到哪个仓库工作
    """
    __tablename__ = "warehouse_assignments"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    warehouse_id: int = Field(foreign_key="warehouses.id", index=True)
    created_at: datetime = Field(default_factory=datetime.now)

    # 关联关系
    user: Optional[User] = Relationship(back_populates="warehouse_assignments")
    warehouse: Optional[Warehouse] = Relationship(back_populates="assignments")


class Attendance(SQLModel, table=True):
    """
    考勤记录表
    记录司机的上班/下班打卡信息
    """
    __tablename__ = "attendance"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    work_date: date = Field(index=True)
    clock_in: Optional[datetime] = Field(default=None)
    clock_out: Optional[datetime] = Field(default=None)
    work_hours: Optional[float] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.now)

    # 关联关系
    user: Optional[User] = Relationship(back_populates="attendance_records")


class PieceWorkCategory(SQLModel, table=True):
    """
    计件分类表
    定义计件工作的分类和单价
    每个品类关联到一个仓库
    """
    __tablename__ = "piece_work_categories"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=50, index=True)
    # 关联仓库ID
    warehouse_id: Optional[int] = Field(default=None, foreign_key="warehouses.id", index=True)
    unit_price: float = Field(default=0.0, description="基础单价（元/件）- 兼容旧数据")
    # 纯司机单价
    driver_only_price: float = Field(default=0.0, description="纯司机单价（元/件）")
    # 带车司机单价
    with_vehicle_price: float = Field(default=0.0, description="带车司机单价（元/件）")
    upstairs_price: Optional[float] = Field(default=None, description="上楼单价（元/件）")
    sorting_price: Optional[float] = Field(default=None, description="分拣单价（元/件）")
    unit: str = Field(default="件", max_length=20)
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.now)

    # 关联关系
    records: List["PieceWorkRecord"] = Relationship(back_populates="category")


class PieceWorkRecord(SQLModel, table=True):
    """
    计件记录表
    记录司机的计件工作详情
    """
    __tablename__ = "piece_work_records"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    category_id: int = Field(foreign_key="piece_work_categories.id", index=True)
    warehouse_id: Optional[int] = Field(default=None, foreign_key="warehouses.id", index=True)
    work_date: date = Field(index=True)
    quantity: int = Field(default=0)
    amount: float = Field(default=0.0)
    remark: Optional[str] = Field(default=None, max_length=255)
    created_at: datetime = Field(default_factory=datetime.now)

    # 关联关系
    user: Optional[User] = Relationship(back_populates="piece_work_records")
    category: Optional[PieceWorkCategory] = Relationship(back_populates="records")
    warehouse: Optional[Warehouse] = Relationship(back_populates="piece_work_records")


class LeaveApplication(SQLModel, table=True):
    """
    请假/离职申请表
    记录司机的请假和离职申请
    """
    __tablename__ = "leave_applications"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    # 请假类型：leave=请假, resign=离职
    leave_type: str = Field(default=LeaveType.LEAVE.value, sa_column=Column(String(20)))
    start_date: date
    end_date: date
    reason: Optional[str] = Field(default=None, max_length=500)
    # 审批状态：pending=待审批, approved=已批准, rejected=已拒绝
    status: str = Field(default=LeaveStatus.PENDING.value, sa_column=Column(String(20), index=True))
    approver_id: Optional[int] = Field(default=None, foreign_key="users.id")
    approve_remark: Optional[str] = Field(default=None, max_length=255)
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

    # 关联关系
    user: Optional[User] = Relationship(
        back_populates="leave_applications",
        sa_relationship_kwargs={"foreign_keys": "[LeaveApplication.user_id]"}
    )


class Vehicle(SQLModel, table=True):
    """
    车辆信息表
    记录司机的车辆信息
    """
    __tablename__ = "vehicles"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    warehouse_id: Optional[int] = Field(default=None, foreign_key="warehouses.id", index=True)
    license_plate: str = Field(unique=True, index=True, max_length=20)
    brand: Optional[str] = Field(default=None, max_length=50)
    model: Optional[str] = Field(default=None, max_length=50)
    color: Optional[str] = Field(default=None, max_length=20)
    # 车辆状态：active=使用中, returned=已归还, reviewing=审核中, rejected=审核拒绝
    status: str = Field(default=VehicleStatus.REVIEWING.value, sa_column=Column(String(20)))
    # 所有权类型：company=公司车辆, personal=个人车辆, leased=租赁车辆
    ownership_type: Optional[str] = Field(default="company", max_length=20)
    # 租赁信息
    lessor_name: Optional[str] = Field(default=None, max_length=100)
    lessor_contact: Optional[str] = Field(default=None, max_length=50)
    lessee_name: Optional[str] = Field(default=None, max_length=100)
    lessee_contact: Optional[str] = Field(default=None, max_length=50)
    monthly_rent: Optional[float] = Field(default=None)
    lease_start_date: Optional[date] = Field(default=None)
    lease_end_date: Optional[date] = Field(default=None)
    rent_payment_day: Optional[int] = Field(default=None)
    # 车辆照片
    left_front_photo: Optional[str] = Field(default=None, max_length=500)
    right_front_photo: Optional[str] = Field(default=None, max_length=500)
    left_rear_photo: Optional[str] = Field(default=None, max_length=500)
    right_rear_photo: Optional[str] = Field(default=None, max_length=500)
    dashboard_photo: Optional[str] = Field(default=None, max_length=500)
    rear_door_photo: Optional[str] = Field(default=None, max_length=500)
    cargo_box_photo: Optional[str] = Field(default=None, max_length=500)
    # 行驶证照片
    driving_license_main_photo: Optional[str] = Field(default=None, max_length=500)
    driving_license_sub_photo: Optional[str] = Field(default=None, max_length=500)
    driving_license_sub_back_photo: Optional[str] = Field(default=None, max_length=500)
    registration_photos: Optional[str] = Field(default=None)
    # 提车/还车照片
    pickup_photos: Optional[str] = Field(default=None)
    pickup_time: Optional[datetime] = Field(default=None)
    return_photos: Optional[str] = Field(default=None)
    damage_photos: Optional[str] = Field(default=None)
    return_time: Optional[datetime] = Field(default=None)
    # 时间戳
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

    # 关联关系
    user: Optional[User] = Relationship(back_populates="vehicles")
    documents: List["VehicleDocument"] = Relationship(back_populates="vehicle")
    warehouse: Optional[Warehouse] = Relationship(back_populates="vehicles")


class VehicleDocument(SQLModel, table=True):
    """
    车辆证件表
    存储车辆相关证件信息
    """
    __tablename__ = "vehicle_documents"

    id: Optional[int] = Field(default=None, primary_key=True)
    vehicle_id: int = Field(foreign_key="vehicles.id", index=True)
    # 证件类型：license=驾驶证, registration=行驶证, insurance=保险单
    doc_type: str = Field(sa_column=Column(String(20)))
    file_url: Optional[str] = Field(default=None, max_length=500)
    expiry_date: Optional[date] = Field(default=None)
    supplemented_photos: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

    # 关联关系
    vehicle: Optional[Vehicle] = Relationship(back_populates="documents")


class Notification(SQLModel, table=True):
    """
    通知消息表
    存储系统通知和消息，支持审批类通知的业务关联
    """
    __tablename__ = "notifications"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    title: str = Field(max_length=100)
    content: Optional[str] = Field(default=None, max_length=1000)
    is_read: bool = Field(default=False, index=True)
    sender_id: Optional[int] = Field(default=None)
    
    # 审批类通知的业务关联字段
    ref_type: Optional[str] = Field(default=None, sa_column=Column(String(20), index=True))
    # 关联类型：leave（请假）/resign（离职）/vehicle（车辆）
    
    ref_id: Optional[int] = Field(default=None, index=True)
    # 关联业务ID（请假申请ID/车辆ID）
    
    status: Optional[str] = Field(default=None, sa_column=Column(String(20)))
    # 审批状态：pending（待审批）/approved（已批准）/rejected（已拒绝）
    
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: Optional[datetime] = Field(default=None)

    # 关联关系
    user: Optional[User] = Relationship(back_populates="notifications")



class VehicleHistory(SQLModel, table=True):
    """
    车辆使用历史表
    记录车辆的每次提车和还车操作
    """
    __tablename__ = "vehicle_history"

    id: Optional[int] = Field(default=None, primary_key=True)
    vehicle_id: int = Field(foreign_key="vehicles.id", index=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    # 操作类型：pickup=提车, return=还车
    action_type: str = Field(sa_column=Column(String(20)))
    action_time: datetime
    photos: Optional[str] = Field(default=None)
    damage_photos: Optional[str] = Field(default=None)
    remark: Optional[str] = Field(default=None, max_length=500)
    created_at: datetime = Field(default_factory=datetime.now)


class DriverLicense(SQLModel, table=True):
    """
    司机证件信息表
    存储司机的身份证和驾驶证信息
    """
    __tablename__ = "driver_licenses"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", unique=True, index=True)
    # 身份证信息
    id_card_number: Optional[str] = Field(default=None, max_length=18)
    id_card_name: Optional[str] = Field(default=None, max_length=50)
    id_card_photo_front: Optional[str] = Field(default=None, max_length=500)
    id_card_photo_back: Optional[str] = Field(default=None, max_length=500)
    # 驾驶证信息
    license_number: Optional[str] = Field(default=None, max_length=18)
    license_class: Optional[str] = Field(default=None, max_length=10)
    valid_from: Optional[date] = Field(default=None)
    valid_to: Optional[date] = Field(default=None)
    driving_license_photo: Optional[str] = Field(default=None, max_length=500)
    # 时间戳
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

    # 关联关系
    user: Optional[User] = Relationship(back_populates="driver_license")


class AppVersion(SQLModel, table=True):
    """
    应用版本表
    存储应用版本信息，支持热更新（wgt）和整包更新（apk）
    用于版本检查、更新下载和版本历史管理
    """
    __tablename__ = "app_versions"

    id: Optional[int] = Field(default=None, primary_key=True)
    # 版本名称，如 "1.2.0"
    version_name: str = Field(max_length=20, index=True)
    # 版本号（整数），用于比较版本新旧，如 120
    version_code: int = Field(index=True)
    # 平台：android, ios
    platform: str = Field(sa_column=Column(String(20), index=True))
    # 更新类型：wgt（热更新）, apk（整包更新）
    update_type: str = Field(sa_column=Column(String(10)))
    # 下载地址
    download_url: str = Field(max_length=500)
    # 文件大小（字节）
    file_size: int = Field(default=0)
    # MD5 校验值
    md5: str = Field(max_length=32)
    # 更新说明
    description: Optional[str] = Field(default=None, max_length=1000)
    # 是否强制更新
    is_force_update: bool = Field(default=False)
    # 最低兼容版本号，低于此版本必须整包更新
    min_compatible_version: int = Field(default=0)
    # 下载次数统计
    download_count: int = Field(default=0)
    # 是否启用
    is_active: bool = Field(default=True)
    # 创建时间
    created_at: datetime = Field(default_factory=datetime.now)
    # 创建人ID
    created_by: Optional[int] = Field(default=None, foreign_key="users.id")
