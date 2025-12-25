"""
数据库模型模块
定义所有数据库表结构，使用 SQLModel 实现 ORM
包含 10 个核心数据表：用户、仓库、考勤、计件、请假、车辆、通知等
"""

from datetime import datetime, date
from enum import Enum
from typing import Optional, List
from sqlmodel import SQLModel, Field, Relationship


# ==================== 枚举类型定义 ====================

class UserRole(str, Enum):
    """
    用户角色枚举
    - DRIVER: 司机，负责打卡、计件、请假、车辆管理
    - MANAGER: 车队长，负责司机管理、审批、统计
    - PEER_ADMIN: 调度，负责协助管理，拥有与老板类似的管理权限
    - BOSS: 老板，负责全局管理、用户管理、仓库管理
    - SUPER_ADMIN: 超级管理员，拥有系统最高权限，可管理所有功能
    """
    DRIVER = "driver"
    MANAGER = "manager"
    PEER_ADMIN = "peer_admin"
    BOSS = "boss"
    SUPER_ADMIN = "super_admin"


class LeaveType(str, Enum):
    """
    请假类型枚举
    - LEAVE: 请假
    - RESIGN: 离职申请
    """
    LEAVE = "leave"
    RESIGN = "resign"


class LeaveStatus(str, Enum):
    """
    请假状态枚举
    - PENDING: 待审批
    - APPROVED: 已批准
    - REJECTED: 已拒绝
    """
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class VehicleStatus(str, Enum):
    """
    车辆状态枚举
    - ACTIVE: 使用中
    - RETURNED: 已归还
    - REVIEWING: 审核中
    """
    ACTIVE = "active"
    RETURNED = "returned"
    REVIEWING = "reviewing"


class DocumentType(str, Enum):
    """
    证件类型枚举
    - LICENSE: 驾驶证
    - REGISTRATION: 行驶证
    - INSURANCE: 保险单
    """
    LICENSE = "license"
    REGISTRATION = "registration"
    INSURANCE = "insurance"


# ==================== 数据库模型定义 ====================

class User(SQLModel, table=True):
    """
    用户表
    存储系统所有用户信息，包括司机、车队长、老板
    
    Attributes:
        id: 主键，自增
        username: 用户名，唯一，用于登录
        password_hash: 密码哈希值
        name: 真实姓名
        phone: 手机号码
        role: 用户角色（司机/车队长/老板）
        is_active: 是否启用
        created_at: 创建时间
        updated_at: 更新时间
    """
    __tablename__ = "users"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(unique=True, index=True, max_length=50)
    password_hash: str = Field(max_length=255)
    name: str = Field(max_length=50)
    phone: Optional[str] = Field(default=None, max_length=20)
    role: UserRole = Field(default=UserRole.DRIVER)
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


class Warehouse(SQLModel, table=True):
    """
    仓库表
    存储仓库/工作地点信息
    
    Attributes:
        id: 主键，自增
        name: 仓库名称
        address: 仓库地址
        is_active: 是否启用
        created_at: 创建时间
    """
    __tablename__ = "warehouses"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=100, index=True)
    address: Optional[str] = Field(default=None, max_length=255)
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.now)
    
    # 关联关系
    assignments: List["WarehouseAssignment"] = Relationship(back_populates="warehouse")
    piece_work_records: List["PieceWorkRecord"] = Relationship(back_populates="warehouse")
    # 新增：仓库下的车辆列表
    vehicles: List["Vehicle"] = Relationship(back_populates="warehouse")


class WarehouseAssignment(SQLModel, table=True):
    """
    用户-仓库关联表
    记录用户分配到哪个仓库工作
    
    Attributes:
        id: 主键，自增
        user_id: 用户ID（外键）
        warehouse_id: 仓库ID（外键）
        created_at: 分配时间
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
    
    Attributes:
        id: 主键，自增
        user_id: 用户ID（外键）
        work_date: 工作日期
        clock_in: 上班打卡时间
        clock_out: 下班打卡时间
        work_hours: 工作时长（小时）
        created_at: 记录创建时间
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
    
    Attributes:
        id: 主键，自增
        name: 分类名称
        unit_price: 单价（元/件）
        unit: 计量单位（如：件、箱、趟）
        is_active: 是否启用
        created_at: 创建时间
    """
    __tablename__ = "piece_work_categories"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=50, index=True)
    unit_price: float = Field(default=0.0)
    unit: str = Field(default="件", max_length=20)
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.now)
    
    # 关联关系
    records: List["PieceWorkRecord"] = Relationship(back_populates="category")


class PieceWorkRecord(SQLModel, table=True):
    """
    计件记录表
    记录司机的计件工作详情
    
    Attributes:
        id: 主键，自增
        user_id: 用户ID（外键）
        category_id: 分类ID（外键）
        warehouse_id: 仓库ID（外键）
        work_date: 工作日期
        quantity: 数量
        amount: 金额（数量 × 单价）
        remark: 备注
        created_at: 记录创建时间
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
    
    Attributes:
        id: 主键，自增
        user_id: 申请人ID（外键）
        leave_type: 申请类型（请假/离职）
        start_date: 开始日期
        end_date: 结束日期
        reason: 申请原因
        status: 审批状态
        approver_id: 审批人ID（外键）
        approve_remark: 审批备注
        created_at: 申请时间
        updated_at: 更新时间
    """
    __tablename__ = "leave_applications"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    leave_type: LeaveType = Field(default=LeaveType.LEAVE)
    start_date: date
    end_date: date
    reason: Optional[str] = Field(default=None, max_length=500)
    status: LeaveStatus = Field(default=LeaveStatus.PENDING, index=True)
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
    记录司机的车辆信息，包含租赁相关字段和还车/提车照片
    
    Attributes:
        id: 主键，自增
        user_id: 车主ID（外键）
        warehouse_id: 所属仓库ID（外键）
        license_plate: 车牌号，唯一
        brand: 品牌
        model: 型号
        color: 颜色
        status: 车辆状态
        ownership_type: 所有权类型（company=公司车辆, personal=个人车辆, leased=租赁车辆）
        lessor_name: 出租方名称
        lessor_contact: 出租方联系方式
        lessee_name: 承租方名称
        lessee_contact: 承租方联系方式
        monthly_rent: 月租金（元）
        lease_start_date: 租赁开始日期
        lease_end_date: 租赁结束日期
        rent_payment_day: 每月租金缴纳日（1-31）
        pickup_photos: 提车照片JSON数组
        pickup_time: 提车时间
        return_photos: 还车照片JSON数组
        damage_photos: 车损照片JSON数组
        return_time: 还车时间
        created_at: 创建时间
        updated_at: 更新时间
    """
    __tablename__ = "vehicles"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    # 新增：所属仓库ID（外键关联仓库）
    warehouse_id: Optional[int] = Field(default=None, foreign_key="warehouses.id", index=True, description="所属仓库ID")
    license_plate: str = Field(unique=True, index=True, max_length=20)
    brand: Optional[str] = Field(default=None, max_length=50)
    model: Optional[str] = Field(default=None, max_length=50)
    color: Optional[str] = Field(default=None, max_length=20)
    status: VehicleStatus = Field(default=VehicleStatus.REVIEWING)
    # 所有权类型：company=公司车辆, personal=个人车辆, leased=租赁车辆
    ownership_type: Optional[str] = Field(default="company", max_length=20)
    # 租赁信息 - 出租方
    lessor_name: Optional[str] = Field(default=None, max_length=100)
    lessor_contact: Optional[str] = Field(default=None, max_length=50)
    # 租赁信息 - 承租方
    lessee_name: Optional[str] = Field(default=None, max_length=100)
    lessee_contact: Optional[str] = Field(default=None, max_length=50)
    # 租赁信息 - 租金
    monthly_rent: Optional[float] = Field(default=None)
    lease_start_date: Optional[date] = Field(default=None)
    lease_end_date: Optional[date] = Field(default=None)
    rent_payment_day: Optional[int] = Field(default=None)  # 每月缴纳日（1-31）
    # 新增：提车照片和时间
    pickup_photos: Optional[str] = Field(default=None, description="提车照片JSON数组")
    pickup_time: Optional[datetime] = Field(default=None, description="提车时间")
    # 新增：还车照片和时间
    return_photos: Optional[str] = Field(default=None, description="还车照片JSON数组（7张）")
    damage_photos: Optional[str] = Field(default=None, description="车损照片JSON数组（最多9张）")
    return_time: Optional[datetime] = Field(default=None, description="还车时间")
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
    存储车辆相关证件信息（驾驶证、行驶证、保险等）
    
    Attributes:
        id: 主键，自增
        vehicle_id: 车辆ID（外键）
        doc_type: 证件类型
        file_url: 证件图片URL
        expiry_date: 过期日期
        supplemented_photos: 补录照片元数据（JSON格式）
        created_at: 上传时间
        updated_at: 更新时间
    """
    __tablename__ = "vehicle_documents"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    vehicle_id: int = Field(foreign_key="vehicles.id", index=True)
    doc_type: DocumentType
    file_url: Optional[str] = Field(default=None, max_length=500)
    expiry_date: Optional[date] = Field(default=None)
    # 补录照片元数据，存储格式：{ "field_index": { field, index, supplemented_at, original_url, supplement_count } }
    supplemented_photos: Optional[str] = Field(default=None, description="补录照片元数据（JSON格式）")
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    
    # 关联关系
    vehicle: Optional[Vehicle] = Relationship(back_populates="documents")


class Notification(SQLModel, table=True):
    """
    通知消息表
    存储系统通知和消息
    
    Attributes:
        id: 主键，自增
        user_id: 接收用户ID（外键）
        title: 通知标题
        content: 通知内容
        is_read: 是否已读
        sender_id: 发送者ID（可选）
        template_id: 使用的模板ID（可选）
        created_at: 发送时间
    """
    __tablename__ = "notifications"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    title: str = Field(max_length=100)
    content: Optional[str] = Field(default=None, max_length=1000)
    is_read: bool = Field(default=False, index=True)
    sender_id: Optional[int] = Field(default=None)
    template_id: Optional[int] = Field(default=None, foreign_key="notification_templates.id")
    created_at: datetime = Field(default_factory=datetime.now)
    
    # 关联关系
    user: Optional[User] = Relationship(back_populates="notifications")
    template: Optional["NotificationTemplate"] = Relationship(back_populates="notifications")


class NotificationTemplate(SQLModel, table=True):
    """
    通知模板表
    存储可复用的通知模板，支持变量替换
    
    Attributes:
        id: 主键，自增
        name: 模板名称，唯一标识
        title: 通知标题模板，支持变量如 {user_name}
        content: 通知内容模板，支持变量如 {date}、{amount}
        variables: 模板变量说明（JSON格式），如 {"user_name": "用户姓名", "date": "日期"}
        category: 模板分类，如 attendance（考勤）、leave（请假）、vehicle（车辆）
        is_active: 是否启用
        created_at: 创建时间
        updated_at: 更新时间
    """
    __tablename__ = "notification_templates"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(unique=True, index=True, max_length=50, description="模板名称")
    title: str = Field(max_length=100, description="通知标题模板")
    content: str = Field(max_length=2000, description="通知内容模板")
    variables: Optional[str] = Field(default=None, description="模板变量说明（JSON格式）")
    category: Optional[str] = Field(default=None, max_length=50, index=True, description="模板分类")
    is_active: bool = Field(default=True, description="是否启用")
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    
    # 关联关系
    notifications: List["Notification"] = Relationship(back_populates="template")
    scheduled_notifications: List["ScheduledNotification"] = Relationship(back_populates="template")


class RepeatType(str, Enum):
    """
    定时通知重复类型枚举
    - ONCE: 仅执行一次
    - DAILY: 每天重复
    - WEEKLY: 每周重复
    - MONTHLY: 每月重复
    """
    ONCE = "once"
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"


class ScheduledNotificationStatus(str, Enum):
    """
    定时通知状态枚举
    - PENDING: 待执行
    - ACTIVE: 执行中（用于重复任务）
    - COMPLETED: 已完成
    - CANCELLED: 已取消
    - FAILED: 执行失败
    """
    PENDING = "pending"
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    FAILED = "failed"


class ScheduledNotification(SQLModel, table=True):
    """
    定时通知表
    存储定时发送的通知任务，支持一次性和重复发送
    
    Attributes:
        id: 主键，自增
        name: 任务名称，用于标识和管理
        template_id: 使用的通知模板ID（可选，如果不使用模板则直接使用 title/content）
        title: 通知标题（如果不使用模板）
        content: 通知内容（如果不使用模板）
        variables: 模板变量值（JSON格式），用于替换模板中的变量
        target_user_ids: 目标用户ID列表（JSON格式），如 [1, 2, 3]
        target_roles: 目标角色列表（JSON格式），如 ["driver", "manager"]，发送给指定角色的所有用户
        scheduled_time: 计划发送时间（首次发送时间）
        repeat_type: 重复类型（once/daily/weekly/monthly）
        repeat_interval: 重复间隔（如每2天、每3周）
        repeat_end_date: 重复结束日期（可选，不设置则无限重复）
        weekdays: 每周重复时的星期几（JSON格式），如 [1, 3, 5] 表示周一、周三、周五
        monthly_day: 每月重复时的日期（1-31）
        status: 任务状态
        last_executed_at: 上次执行时间
        next_execute_at: 下次执行时间
        execution_count: 已执行次数
        creator_id: 创建者ID
        created_at: 创建时间
        updated_at: 更新时间
    """
    __tablename__ = "scheduled_notifications"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=100, index=True, description="任务名称")
    
    # 通知内容（可以使用模板或直接指定）
    template_id: Optional[int] = Field(default=None, foreign_key="notification_templates.id", description="模板ID")
    title: Optional[str] = Field(default=None, max_length=100, description="通知标题（不使用模板时）")
    content: Optional[str] = Field(default=None, max_length=2000, description="通知内容（不使用模板时）")
    variables: Optional[str] = Field(default=None, description="模板变量值（JSON格式）")
    
    # 目标用户
    target_user_ids: Optional[str] = Field(default=None, description="目标用户ID列表（JSON格式）")
    target_roles: Optional[str] = Field(default=None, description="目标角色列表（JSON格式）")
    
    # 定时规则
    scheduled_time: datetime = Field(description="计划发送时间（首次发送时间）")
    repeat_type: RepeatType = Field(default=RepeatType.ONCE, description="重复类型")
    repeat_interval: int = Field(default=1, ge=1, description="重复间隔")
    repeat_end_date: Optional[date] = Field(default=None, description="重复结束日期")
    weekdays: Optional[str] = Field(default=None, description="每周重复的星期几（JSON格式，1-7）")
    monthly_day: Optional[int] = Field(default=None, ge=1, le=31, description="每月重复的日期")
    
    # 状态和执行信息
    status: ScheduledNotificationStatus = Field(default=ScheduledNotificationStatus.PENDING, index=True)
    last_executed_at: Optional[datetime] = Field(default=None, description="上次执行时间")
    next_execute_at: Optional[datetime] = Field(default=None, index=True, description="下次执行时间")
    execution_count: int = Field(default=0, description="已执行次数")
    
    # 创建者和时间戳
    creator_id: Optional[int] = Field(default=None, foreign_key="users.id", description="创建者ID")
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    
    # 关联关系
    template: Optional["NotificationTemplate"] = Relationship(back_populates="scheduled_notifications")


class UpdateType(str, Enum):
    """
    更新类型枚举
    - OPTIONAL: 可选更新，用户可以选择跳过
    - RECOMMENDED: 推荐更新，提示用户更新但可跳过
    - REQUIRED: 强制更新，必须更新才能使用
    """
    OPTIONAL = "optional"
    RECOMMENDED = "recommended"
    REQUIRED = "required"


class AppVersion(SQLModel, table=True):
    """
    应用版本表
    存储应用版本信息，用于热更新检测和管理
    
    Attributes:
        id: 主键，自增
        version: 版本号，如 "1.0.0"，唯一
        version_code: 版本代码，整数，用于比较版本大小
        update_type: 更新类型（可选/推荐/强制）
        title: 更新标题
        description: 更新说明
        download_url: 更新包下载地址
        file_size: 更新包大小（字节）
        file_hash: 更新包哈希值（用于校验）
        min_version: 最低支持版本（低于此版本必须更新）
        platform: 平台类型（android/ios/h5/all）
        is_active: 是否启用
        publish_time: 发布时间
        created_at: 创建时间
        updated_at: 更新时间
        creator_id: 创建者ID
    """
    __tablename__ = "app_versions"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    version: str = Field(unique=True, index=True, max_length=20, description="版本号，如 1.0.0")
    version_code: int = Field(index=True, description="版本代码，用于比较版本大小")
    update_type: UpdateType = Field(default=UpdateType.OPTIONAL, description="更新类型")
    title: str = Field(max_length=100, description="更新标题")
    description: Optional[str] = Field(default=None, max_length=2000, description="更新说明")
    download_url: Optional[str] = Field(default=None, max_length=500, description="更新包下载地址")
    file_size: Optional[int] = Field(default=None, description="更新包大小（字节）")
    file_hash: Optional[str] = Field(default=None, max_length=64, description="更新包哈希值")
    min_version: Optional[str] = Field(default=None, max_length=20, description="最低支持版本")
    platform: str = Field(default="all", max_length=20, description="平台类型（android/ios/h5/all）")
    is_active: bool = Field(default=True, description="是否启用")
    publish_time: Optional[datetime] = Field(default=None, description="发布时间")
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    creator_id: Optional[int] = Field(default=None, foreign_key="users.id", description="创建者ID")


# ==================== 车辆历史记录相关 ====================

class VehicleHistoryActionType(str, Enum):
    """
    车辆历史操作类型枚举
    - PICKUP: 提车操作
    - RETURN: 还车操作
    """
    PICKUP = "pickup"
    RETURN = "return"


class VehicleHistory(SQLModel, table=True):
    """
    车辆使用历史表
    记录车辆的每次提车和还车操作，包含照片、时间、司机信息
    
    Attributes:
        id: 主键，自增
        vehicle_id: 车辆ID（外键）
        user_id: 司机ID（外键）
        action_type: 操作类型（pickup=提车, return=还车）
        action_time: 操作时间
        photos: 照片JSON数组（7张基本照片）
        damage_photos: 车损照片JSON数组
        remark: 备注
        created_at: 记录创建时间
    
    Requirements: 15.2, 15.3
    """
    __tablename__ = "vehicle_history"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    vehicle_id: int = Field(foreign_key="vehicles.id", index=True, description="车辆ID")
    user_id: int = Field(foreign_key="users.id", index=True, description="司机ID")
    action_type: VehicleHistoryActionType = Field(description="操作类型：pickup=提车, return=还车")
    action_time: datetime = Field(description="操作时间")
    photos: Optional[str] = Field(default=None, description="照片JSON数组（7张基本照片）")
    damage_photos: Optional[str] = Field(default=None, description="车损照片JSON数组")
    remark: Optional[str] = Field(default=None, max_length=500, description="备注")
    created_at: datetime = Field(default_factory=datetime.now)
    
    # 关联关系（可选，用于 ORM 查询）
    # 注意：这里不添加 back_populates 以避免循环引用问题
