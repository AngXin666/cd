"""
Pydantic 模式模块
定义 API 请求和响应的数据结构
用于数据验证和序列化

注意：枚举类型统一从 models.py 导入，避免重复定义
"""

from datetime import datetime, date
from typing import Optional, List
from enum import Enum
from pydantic import BaseModel, Field
from models import (
    UserRole, 
    LeaveType, 
    LeaveStatus, 
    VehicleStatus, 
    DocumentType,
    RepeatType,
    ScheduledNotificationStatus,
    UpdateType,
    VehicleHistoryActionType
)


# ==================== 认证相关模式 ====================

class LoginRequest(BaseModel):
    """
    登录请求模式
    
    Attributes:
        username: 用户名
        password: 密码
    """
    username: str = Field(..., min_length=1, max_length=50, description="用户名")
    password: str = Field(..., min_length=1, max_length=100, description="密码")


class TokenResponse(BaseModel):
    """
    Token 响应模式
    
    Attributes:
        access_token: JWT 访问令牌
        token_type: 令牌类型，固定为 "bearer"
    """
    access_token: str = Field(..., description="JWT 访问令牌")
    token_type: str = Field(default="bearer", description="令牌类型")


class PasswordChangeRequest(BaseModel):
    """
    修改密码请求模式
    
    Attributes:
        old_password: 旧密码
        new_password: 新密码
    """
    old_password: str = Field(..., min_length=1, description="旧密码")
    new_password: str = Field(..., min_length=6, max_length=100, description="新密码")


# ==================== 用户相关模式 ====================

class UserBase(BaseModel):
    """
    用户基础模式
    包含用户的基本信息字段
    """
    username: str = Field(..., min_length=1, max_length=50, description="用户名")
    name: str = Field(..., min_length=1, max_length=50, description="真实姓名")
    phone: Optional[str] = Field(default=None, max_length=20, description="手机号")
    role: UserRole = Field(default=UserRole.DRIVER, description="用户角色")
    is_active: bool = Field(default=True, description="是否启用")


class UserCreate(UserBase):
    """
    创建用户请求模式
    继承 UserBase，添加密码字段
    """
    password: str = Field(..., min_length=6, max_length=100, description="密码")


class UserUpdate(BaseModel):
    """
    更新用户请求模式
    所有字段可选
    """
    name: Optional[str] = Field(default=None, max_length=50, description="真实姓名")
    phone: Optional[str] = Field(default=None, max_length=20, description="手机号")
    role: Optional[UserRole] = Field(default=None, description="用户角色")
    is_active: Optional[bool] = Field(default=None, description="是否启用")


class DriverInfoUpdate(BaseModel):
    """
    司机信息更新请求模式
    车队长可用，只允许更新姓名和手机号
    Requirements: 1.3 - 车队长更新司机信息
    """
    name: Optional[str] = Field(default=None, max_length=50, description="真实姓名")
    phone: Optional[str] = Field(default=None, max_length=20, description="手机号")


class UserResponse(UserBase):
    """
    用户响应模式
    返回给前端的用户信息
    """
    id: int = Field(..., description="用户ID")
    created_at: datetime = Field(..., description="创建时间")
    
    class Config:
        from_attributes = True


class UserDetailResponse(UserResponse):
    """
    用户详情响应模式
    包含关联的仓库信息
    """
    warehouses: List["WarehouseResponse"] = Field(default=[], description="分配的仓库列表")


# ==================== 仓库相关模式 ====================

class WarehouseBase(BaseModel):
    """
    仓库基础模式
    """
    name: str = Field(..., min_length=1, max_length=100, description="仓库名称")
    address: Optional[str] = Field(default=None, max_length=255, description="仓库地址")
    is_active: bool = Field(default=True, description="是否启用")


class WarehouseCreate(WarehouseBase):
    """创建仓库请求模式"""
    pass


class WarehouseUpdate(BaseModel):
    """
    更新仓库请求模式
    所有字段可选
    """
    name: Optional[str] = Field(default=None, max_length=100, description="仓库名称")
    address: Optional[str] = Field(default=None, max_length=255, description="仓库地址")
    is_active: Optional[bool] = Field(default=None, description="是否启用")


class WarehouseResponse(WarehouseBase):
    """
    仓库响应模式
    """
    id: int = Field(..., description="仓库ID")
    created_at: datetime = Field(..., description="创建时间")
    
    class Config:
        from_attributes = True


class WarehouseAssignRequest(BaseModel):
    """
    仓库分配用户请求模式
    """
    user_ids: List[int] = Field(..., description="要分配的用户ID列表")


class UserWarehouseAssignRequest(BaseModel):
    """
    用户仓库分配请求模式
    用于给用户分配仓库列表
    Requirements: 1.5 - 车队长选择仓库并确认分配
    """
    warehouse_ids: List[int] = Field(..., description="要分配的仓库ID列表")


# ==================== 考勤相关模式 ====================

class AttendanceResponse(BaseModel):
    """
    考勤记录响应模式
    """
    id: int = Field(..., description="记录ID")
    user_id: int = Field(..., description="用户ID")
    work_date: date = Field(..., description="工作日期")
    clock_in: Optional[datetime] = Field(default=None, description="上班打卡时间")
    clock_out: Optional[datetime] = Field(default=None, description="下班打卡时间")
    work_hours: Optional[float] = Field(default=None, description="工作时长（小时）")
    created_at: datetime = Field(..., description="记录创建时间")
    
    # 关联信息
    user_name: Optional[str] = Field(default=None, description="用户姓名")
    
    class Config:
        from_attributes = True


class TodayAttendanceResponse(BaseModel):
    """
    今日打卡状态响应模式
    """
    has_clocked_in: bool = Field(..., description="是否已上班打卡")
    has_clocked_out: bool = Field(..., description="是否已下班打卡")
    clock_in_time: Optional[datetime] = Field(default=None, description="上班打卡时间")
    clock_out_time: Optional[datetime] = Field(default=None, description="下班打卡时间")
    work_hours: Optional[float] = Field(default=None, description="工作时长")


# ==================== 计件相关模式 ====================

class PieceWorkCategoryBase(BaseModel):
    """
    计件分类基础模式
    支持基础单价、上楼单价、分拣单价配置
    Requirements: 3.1 - 支持多种单价配置
    """
    name: str = Field(..., min_length=1, max_length=50, description="分类名称")
    unit_price: float = Field(..., ge=0, description="基础单价（元/件）")
    upstairs_price: Optional[float] = Field(default=None, ge=0, description="上楼单价（元/件）")
    sorting_price: Optional[float] = Field(default=None, ge=0, description="分拣单价（元/件）")
    unit: str = Field(default="件", max_length=20, description="计量单位")
    is_active: bool = Field(default=True, description="是否启用")


class PieceWorkCategoryCreate(PieceWorkCategoryBase):
    """创建计件分类请求模式"""
    pass


class PieceWorkCategoryUpdate(BaseModel):
    """
    更新计件分类请求模式
    Requirements: 3.2 - 支持编辑品类配置
    """
    name: Optional[str] = Field(default=None, max_length=50, description="分类名称")
    unit_price: Optional[float] = Field(default=None, ge=0, description="基础单价")
    upstairs_price: Optional[float] = Field(default=None, ge=0, description="上楼单价")
    sorting_price: Optional[float] = Field(default=None, ge=0, description="分拣单价")
    unit: Optional[str] = Field(default=None, max_length=20, description="计量单位")
    is_active: Optional[bool] = Field(default=None, description="是否启用")


class PieceWorkCategoryResponse(PieceWorkCategoryBase):
    """
    计件分类响应模式
    """
    id: int = Field(..., description="分类ID")
    created_at: datetime = Field(..., description="创建时间")
    
    class Config:
        from_attributes = True


class PieceWorkRecordCreate(BaseModel):
    """
    创建计件记录请求模式
    """
    category_id: int = Field(..., description="分类ID")
    warehouse_id: Optional[int] = Field(default=None, description="仓库ID")
    work_date: date = Field(..., description="工作日期")
    quantity: int = Field(..., ge=1, description="数量")
    remark: Optional[str] = Field(default=None, max_length=255, description="备注")


class PieceWorkRecordUpdate(BaseModel):
    """
    更新计件记录请求模式
    """
    quantity: Optional[int] = Field(default=None, ge=1, description="数量")
    remark: Optional[str] = Field(default=None, max_length=255, description="备注")


class PieceWorkRecordResponse(BaseModel):
    """
    计件记录响应模式
    """
    id: int = Field(..., description="记录ID")
    user_id: int = Field(..., description="用户ID")
    category_id: int = Field(..., description="分类ID")
    warehouse_id: Optional[int] = Field(default=None, description="仓库ID")
    work_date: date = Field(..., description="工作日期")
    quantity: int = Field(..., description="数量")
    amount: float = Field(..., description="金额")
    remark: Optional[str] = Field(default=None, description="备注")
    created_at: datetime = Field(..., description="创建时间")
    
    # 关联信息
    user_name: Optional[str] = Field(default=None, description="用户姓名")
    category_name: Optional[str] = Field(default=None, description="分类名称")
    warehouse_name: Optional[str] = Field(default=None, description="仓库名称")
    
    class Config:
        from_attributes = True


class PieceWorkStatsResponse(BaseModel):
    """
    计件统计响应模式
    """
    total_quantity: int = Field(..., description="总数量")
    total_amount: float = Field(..., description="总金额")
    record_count: int = Field(..., description="记录数")


# ==================== 请假相关模式 ====================

class LeaveApplicationCreate(BaseModel):
    """
    创建请假申请请求模式
    """
    leave_type: LeaveType = Field(default=LeaveType.LEAVE, description="申请类型")
    start_date: date = Field(..., description="开始日期")
    end_date: date = Field(..., description="结束日期")
    reason: Optional[str] = Field(default=None, max_length=500, description="申请原因")


class LeaveApproveRequest(BaseModel):
    """
    审批请假申请请求模式
    """
    status: LeaveStatus = Field(..., description="审批状态（approved/rejected）")
    approve_remark: Optional[str] = Field(default=None, max_length=255, description="审批备注")


class LeaveApplicationResponse(BaseModel):
    """
    请假申请响应模式
    """
    id: int = Field(..., description="申请ID")
    user_id: int = Field(..., description="申请人ID")
    leave_type: LeaveType = Field(..., description="申请类型")
    start_date: date = Field(..., description="开始日期")
    end_date: date = Field(..., description="结束日期")
    reason: Optional[str] = Field(default=None, description="申请原因")
    status: LeaveStatus = Field(..., description="审批状态")
    approver_id: Optional[int] = Field(default=None, description="审批人ID")
    approve_remark: Optional[str] = Field(default=None, description="审批备注")
    created_at: datetime = Field(..., description="申请时间")
    updated_at: datetime = Field(..., description="更新时间")
    
    # 关联信息
    user_name: Optional[str] = Field(default=None, description="申请人姓名")
    approver_name: Optional[str] = Field(default=None, description="审批人姓名")
    
    class Config:
        from_attributes = True


# ==================== 车辆相关模式 ====================

class VehicleBase(BaseModel):
    """
    车辆基础模式
    """
    license_plate: str = Field(..., min_length=1, max_length=20, description="车牌号")
    brand: Optional[str] = Field(default=None, max_length=50, description="品牌")
    model: Optional[str] = Field(default=None, max_length=50, description="型号")
    color: Optional[str] = Field(default=None, max_length=20, description="颜色")


class VehicleCreate(VehicleBase):
    """
    创建车辆请求模式
    包含租赁相关字段
    """
    ownership_type: Optional[str] = Field(default="company", description="所有权类型：company/personal/leased")
    # 租赁信息
    lessor_name: Optional[str] = Field(default=None, max_length=100, description="出租方名称")
    lessor_contact: Optional[str] = Field(default=None, max_length=50, description="出租方联系方式")
    lessee_name: Optional[str] = Field(default=None, max_length=100, description="承租方名称")
    lessee_contact: Optional[str] = Field(default=None, max_length=50, description="承租方联系方式")
    monthly_rent: Optional[float] = Field(default=None, ge=0, description="月租金（元）")
    lease_start_date: Optional[date] = Field(default=None, description="租赁开始日期")
    lease_end_date: Optional[date] = Field(default=None, description="租赁结束日期")
    rent_payment_day: Optional[int] = Field(default=None, ge=1, le=31, description="每月租金缴纳日（1-31）")


class VehicleUpdate(BaseModel):
    """
    更新车辆请求模式
    """
    brand: Optional[str] = Field(default=None, max_length=50, description="品牌")
    model: Optional[str] = Field(default=None, max_length=50, description="型号")
    color: Optional[str] = Field(default=None, max_length=20, description="颜色")
    ownership_type: Optional[str] = Field(default=None, description="所有权类型：company/personal/leased")


class VehicleLeaseUpdate(BaseModel):
    """
    更新车辆租赁信息请求模式
    专门用于更新租赁相关字段
    """
    lessor_name: Optional[str] = Field(default=None, max_length=100, description="出租方名称")
    lessor_contact: Optional[str] = Field(default=None, max_length=50, description="出租方联系方式")
    lessee_name: Optional[str] = Field(default=None, max_length=100, description="承租方名称")
    lessee_contact: Optional[str] = Field(default=None, max_length=50, description="承租方联系方式")
    monthly_rent: Optional[float] = Field(default=None, ge=0, description="月租金（元）")
    lease_start_date: Optional[date] = Field(default=None, description="租赁开始日期")
    lease_end_date: Optional[date] = Field(default=None, description="租赁结束日期")
    rent_payment_day: Optional[int] = Field(default=None, ge=1, le=31, description="每月租金缴纳日（1-31）")


class VehicleReviewRequest(BaseModel):
    """
    车辆审核请求模式
    """
    status: VehicleStatus = Field(..., description="审核状态")


class VehicleResponse(VehicleBase):
    """
    车辆响应模式
    """
    id: int = Field(..., description="车辆ID")
    user_id: int = Field(..., description="车主ID")
    status: VehicleStatus = Field(..., description="车辆状态")
    ownership_type: Optional[str] = Field(default=None, description="所有权类型")
    created_at: datetime = Field(..., description="创建时间")
    updated_at: datetime = Field(..., description="更新时间")
    
    # 关联信息
    user_name: Optional[str] = Field(default=None, description="车主姓名")
    
    class Config:
        from_attributes = True


class VehicleLeaseResponse(BaseModel):
    """
    车辆租赁信息响应模式
    """
    id: int = Field(..., description="车辆ID")
    license_plate: str = Field(..., description="车牌号")
    ownership_type: Optional[str] = Field(default=None, description="所有权类型")
    # 租赁信息
    lessor_name: Optional[str] = Field(default=None, description="出租方名称")
    lessor_contact: Optional[str] = Field(default=None, description="出租方联系方式")
    lessee_name: Optional[str] = Field(default=None, description="承租方名称")
    lessee_contact: Optional[str] = Field(default=None, description="承租方联系方式")
    monthly_rent: Optional[float] = Field(default=None, description="月租金（元）")
    lease_start_date: Optional[date] = Field(default=None, description="租赁开始日期")
    lease_end_date: Optional[date] = Field(default=None, description="租赁结束日期")
    rent_payment_day: Optional[int] = Field(default=None, description="每月租金缴纳日（1-31）")
    # 计算字段
    next_payment_date: Optional[date] = Field(default=None, description="下一个租金缴纳日期")
    days_until_payment: Optional[int] = Field(default=None, description="距离下次缴纳的天数")
    lease_status: Optional[str] = Field(default=None, description="租赁状态：active/expired/not_started")
    
    class Config:
        from_attributes = True


class VehicleLeaseReminderResponse(BaseModel):
    """
    租金提醒响应模式
    用于返回即将到期的租金缴纳提醒
    """
    id: int = Field(..., description="车辆ID")
    license_plate: str = Field(..., description="车牌号")
    brand: Optional[str] = Field(default=None, description="品牌")
    model: Optional[str] = Field(default=None, description="型号")
    user_id: int = Field(..., description="车主ID")
    user_name: Optional[str] = Field(default=None, description="车主姓名")
    lessor_name: Optional[str] = Field(default=None, description="出租方名称")
    monthly_rent: Optional[float] = Field(default=None, description="月租金（元）")
    next_payment_date: Optional[date] = Field(default=None, description="下一个租金缴纳日期")
    days_until_payment: int = Field(..., description="距离下次缴纳的天数")
    
    class Config:
        from_attributes = True


class VehicleDetailResponse(VehicleResponse):
    """
    车辆详情响应模式
    包含证件信息
    """
    documents: List["VehicleDocumentResponse"] = Field(default=[], description="证件列表")


class VehicleDocumentCreate(BaseModel):
    """
    创建车辆证件请求模式
    """
    doc_type: DocumentType = Field(..., description="证件类型")
    file_url: Optional[str] = Field(default=None, max_length=500, description="证件图片URL")
    expiry_date: Optional[date] = Field(default=None, description="过期日期")


class VehicleDocumentResponse(BaseModel):
    """
    车辆证件响应模式
    """
    id: int = Field(..., description="证件ID")
    vehicle_id: int = Field(..., description="车辆ID")
    doc_type: DocumentType = Field(..., description="证件类型")
    file_url: Optional[str] = Field(default=None, description="证件图片URL")
    expiry_date: Optional[date] = Field(default=None, description="过期日期")
    supplemented_photos: Optional[dict] = Field(default=None, description="补录照片元数据")
    created_at: datetime = Field(..., description="上传时间")
    updated_at: Optional[datetime] = Field(default=None, description="更新时间")
    
    class Config:
        from_attributes = True


# ==================== 补录照片相关模式 ====================

class SupplementedPhotoMeta(BaseModel):
    """
    补录照片元数据模式
    存储单张补录照片的详细信息
    
    Attributes:
        field: 照片字段名，如 "pickup_photos"
        index: 照片在数组中的索引
        supplemented_at: 补录时间戳（ISO 8601 格式）
        original_url: 原始照片URL（如果有）
        supplement_count: 补录次数（累计）
    """
    field: str = Field(..., description="照片字段名")
    index: int = Field(..., ge=0, description="照片在数组中的索引")
    supplemented_at: str = Field(..., description="补录时间戳（ISO 8601 格式）")
    original_url: Optional[str] = Field(default=None, description="原始照片URL")
    supplement_count: int = Field(default=1, ge=1, description="补录次数（累计）")


class SupplementPhotoRequest(BaseModel):
    """
    补录照片请求模式
    用于提交补录照片
    
    Attributes:
        field: 照片字段名，如 "pickup_photos"、"return_photos" 等
        index: 照片在数组中的索引
        new_url: 新照片的URL
    """
    field: str = Field(..., min_length=1, max_length=50, description="照片字段名")
    index: int = Field(..., ge=0, description="照片在数组中的索引")
    new_url: str = Field(..., min_length=1, max_length=500, description="新照片的URL")


class SupplementedPhotosResponse(BaseModel):
    """
    补录照片响应模式
    返回车辆的所有补录照片元数据
    
    Attributes:
        vehicle_id: 车辆ID
        supplemented_photos: 补录照片元数据字典，键为 "{field}_{index}"
    """
    vehicle_id: int = Field(..., description="车辆ID")
    supplemented_photos: dict = Field(default={}, description="补录照片元数据，键为 '{field}_{index}'")
    
    class Config:
        from_attributes = True


# ==================== 通知相关模式 ====================

class NotificationCreate(BaseModel):
    """
    创建通知请求模式
    """
    user_ids: List[int] = Field(..., min_length=1, description="接收用户ID列表")
    title: str = Field(..., min_length=1, max_length=100, description="通知标题")
    content: Optional[str] = Field(default=None, max_length=1000, description="通知内容")
    template_id: Optional[int] = Field(default=None, description="使用的模板ID")


class NotificationFromTemplateCreate(BaseModel):
    """
    使用模板创建通知请求模式
    通过模板ID和变量值创建通知
    """
    user_ids: List[int] = Field(..., min_length=1, description="接收用户ID列表")
    template_id: int = Field(..., description="模板ID")
    variables: Optional[dict] = Field(default={}, description="模板变量值，如 {'user_name': '张三', 'date': '2024-01-01'}")


class NotificationResponse(BaseModel):
    """
    通知响应模式
    """
    id: int = Field(..., description="通知ID")
    user_id: int = Field(..., description="接收用户ID")
    title: str = Field(..., description="通知标题")
    content: Optional[str] = Field(default=None, description="通知内容")
    is_read: bool = Field(..., description="是否已读")
    sender_id: Optional[int] = Field(default=None, description="发送者ID")
    template_id: Optional[int] = Field(default=None, description="使用的模板ID")
    created_at: datetime = Field(..., description="发送时间")
    
    class Config:
        from_attributes = True


class UnreadCountResponse(BaseModel):
    """
    未读通知数量响应模式
    """
    count: int = Field(..., description="未读数量")


# ==================== 通知模板相关模式 ====================

class NotificationTemplateBase(BaseModel):
    """
    通知模板基础模式
    
    Attributes:
        name: 模板名称，唯一标识
        title: 通知标题模板，支持变量如 {user_name}
        content: 通知内容模板，支持变量如 {date}、{amount}
        variables: 模板变量说明，如 {"user_name": "用户姓名", "date": "日期"}
        category: 模板分类，如 attendance（考勤）、leave（请假）、vehicle（车辆）
        is_active: 是否启用
    """
    name: str = Field(..., min_length=1, max_length=50, description="模板名称")
    title: str = Field(..., min_length=1, max_length=100, description="通知标题模板")
    content: str = Field(..., min_length=1, max_length=2000, description="通知内容模板")
    variables: Optional[dict] = Field(default=None, description="模板变量说明")
    category: Optional[str] = Field(default=None, max_length=50, description="模板分类")
    is_active: bool = Field(default=True, description="是否启用")


class NotificationTemplateCreate(NotificationTemplateBase):
    """
    创建通知模板请求模式
    继承 NotificationTemplateBase
    """
    pass


class NotificationTemplateUpdate(BaseModel):
    """
    更新通知模板请求模式
    所有字段可选
    """
    name: Optional[str] = Field(default=None, max_length=50, description="模板名称")
    title: Optional[str] = Field(default=None, max_length=100, description="通知标题模板")
    content: Optional[str] = Field(default=None, max_length=2000, description="通知内容模板")
    variables: Optional[dict] = Field(default=None, description="模板变量说明")
    category: Optional[str] = Field(default=None, max_length=50, description="模板分类")
    is_active: Optional[bool] = Field(default=None, description="是否启用")


class NotificationTemplateResponse(NotificationTemplateBase):
    """
    通知模板响应模式
    """
    id: int = Field(..., description="模板ID")
    created_at: datetime = Field(..., description="创建时间")
    updated_at: datetime = Field(..., description="更新时间")
    
    class Config:
        from_attributes = True


class NotificationTemplatePreviewRequest(BaseModel):
    """
    预览通知模板请求模式
    用于预览模板渲染后的效果
    """
    template_id: int = Field(..., description="模板ID")
    variables: Optional[dict] = Field(default={}, description="模板变量值")


# ==================== 通用响应模式 ====================

class MessageResponse(BaseModel):
    """
    通用消息响应模式
    """
    message: str = Field(..., description="消息内容")


class PaginatedResponse(BaseModel):
    """
    分页响应模式
    """
    total: int = Field(..., description="总数量")
    page: int = Field(..., description="当前页码")
    page_size: int = Field(..., description="每页数量")
    items: List = Field(..., description="数据列表")


# 更新前向引用
UserDetailResponse.model_rebuild()
VehicleDetailResponse.model_rebuild()


# ==================== OCR 相关模式 ====================

class OCRDrivingLicenseRequest(BaseModel):
    """
    驾驶证识别请求模式
    
    Attributes:
        image: 图片数据，支持 Base64 编码或图片 URL
    """
    image: str = Field(..., min_length=1, description="图片数据（Base64 或 URL）")


class OCRDrivingLicenseData(BaseModel):
    """
    驾驶证识别结果数据模式
    """
    name: Optional[str] = Field(default=None, description="姓名")
    sex: Optional[str] = Field(default=None, description="性别")
    nationality: Optional[str] = Field(default=None, description="国籍")
    address: Optional[str] = Field(default=None, description="住址")
    birthday: Optional[str] = Field(default=None, description="出生日期")
    issue_date: Optional[str] = Field(default=None, description="初次领证日期")
    vehicle_type: Optional[str] = Field(default=None, description="准驾车型")
    license_number: Optional[str] = Field(default=None, description="证号")
    valid_from: Optional[str] = Field(default=None, description="有效期起始")
    valid_to: Optional[str] = Field(default=None, description="有效期截止")


class OCRDrivingLicenseResponse(BaseModel):
    """
    驾驶证识别响应模式
    """
    success: bool = Field(..., description="是否识别成功")
    data: Optional[OCRDrivingLicenseData] = Field(default=None, description="识别结果数据")
    error: Optional[str] = Field(default=None, description="错误信息")


class OCRStatusResponse(BaseModel):
    """
    OCR 服务状态响应模式
    """
    configured: bool = Field(..., description="是否已配置 OCR 服务")
    provider: str = Field(default="baidu", description="OCR 服务提供商")


# ==================== 定时通知相关模式 ====================
# 注意：RepeatType 和 ScheduledNotificationStatus 枚举已从 models.py 导入，避免重复定义


class ScheduledNotificationBase(BaseModel):
    """
    定时通知基础模式
    
    Attributes:
        name: 任务名称
        template_id: 模板ID（可选）
        title: 通知标题（不使用模板时）
        content: 通知内容（不使用模板时）
        variables: 模板变量值
        target_user_ids: 目标用户ID列表
        target_roles: 目标角色列表
        scheduled_time: 计划发送时间
        repeat_type: 重复类型
        repeat_interval: 重复间隔
        repeat_end_date: 重复结束日期
        weekdays: 每周重复的星期几
        monthly_day: 每月重复的日期
    """
    name: str = Field(..., min_length=1, max_length=100, description="任务名称")
    template_id: Optional[int] = Field(default=None, description="模板ID")
    title: Optional[str] = Field(default=None, max_length=100, description="通知标题（不使用模板时）")
    content: Optional[str] = Field(default=None, max_length=2000, description="通知内容（不使用模板时）")
    variables: Optional[dict] = Field(default=None, description="模板变量值")
    target_user_ids: Optional[List[int]] = Field(default=None, description="目标用户ID列表")
    target_roles: Optional[List[str]] = Field(default=None, description="目标角色列表")
    scheduled_time: datetime = Field(..., description="计划发送时间")
    repeat_type: RepeatType = Field(default=RepeatType.ONCE, description="重复类型")
    repeat_interval: int = Field(default=1, ge=1, description="重复间隔")
    repeat_end_date: Optional[date] = Field(default=None, description="重复结束日期")
    weekdays: Optional[List[int]] = Field(default=None, description="每周重复的星期几（1-7）")
    monthly_day: Optional[int] = Field(default=None, ge=1, le=31, description="每月重复的日期")


class ScheduledNotificationCreate(ScheduledNotificationBase):
    """
    创建定时通知请求模式
    继承 ScheduledNotificationBase
    """
    pass


class ScheduledNotificationUpdate(BaseModel):
    """
    更新定时通知请求模式
    所有字段可选
    """
    name: Optional[str] = Field(default=None, max_length=100, description="任务名称")
    template_id: Optional[int] = Field(default=None, description="模板ID")
    title: Optional[str] = Field(default=None, max_length=100, description="通知标题")
    content: Optional[str] = Field(default=None, max_length=2000, description="通知内容")
    variables: Optional[dict] = Field(default=None, description="模板变量值")
    target_user_ids: Optional[List[int]] = Field(default=None, description="目标用户ID列表")
    target_roles: Optional[List[str]] = Field(default=None, description="目标角色列表")
    scheduled_time: Optional[datetime] = Field(default=None, description="计划发送时间")
    repeat_type: Optional[RepeatType] = Field(default=None, description="重复类型")
    repeat_interval: Optional[int] = Field(default=None, ge=1, description="重复间隔")
    repeat_end_date: Optional[date] = Field(default=None, description="重复结束日期")
    weekdays: Optional[List[int]] = Field(default=None, description="每周重复的星期几（1-7）")
    monthly_day: Optional[int] = Field(default=None, ge=1, le=31, description="每月重复的日期")
    status: Optional[ScheduledNotificationStatus] = Field(default=None, description="任务状态")


class ScheduledNotificationResponse(BaseModel):
    """
    定时通知响应模式
    """
    id: int = Field(..., description="任务ID")
    name: str = Field(..., description="任务名称")
    template_id: Optional[int] = Field(default=None, description="模板ID")
    template_name: Optional[str] = Field(default=None, description="模板名称")
    title: Optional[str] = Field(default=None, description="通知标题")
    content: Optional[str] = Field(default=None, description="通知内容")
    variables: Optional[dict] = Field(default=None, description="模板变量值")
    target_user_ids: Optional[List[int]] = Field(default=None, description="目标用户ID列表")
    target_roles: Optional[List[str]] = Field(default=None, description="目标角色列表")
    target_user_count: int = Field(default=0, description="目标用户数量")
    scheduled_time: datetime = Field(..., description="计划发送时间")
    repeat_type: str = Field(..., description="重复类型")
    repeat_interval: int = Field(default=1, description="重复间隔")
    repeat_end_date: Optional[date] = Field(default=None, description="重复结束日期")
    weekdays: Optional[List[int]] = Field(default=None, description="每周重复的星期几")
    monthly_day: Optional[int] = Field(default=None, description="每月重复的日期")
    status: str = Field(..., description="任务状态")
    last_executed_at: Optional[datetime] = Field(default=None, description="上次执行时间")
    next_execute_at: Optional[datetime] = Field(default=None, description="下次执行时间")
    execution_count: int = Field(default=0, description="已执行次数")
    creator_id: Optional[int] = Field(default=None, description="创建者ID")
    creator_name: Optional[str] = Field(default=None, description="创建者姓名")
    created_at: datetime = Field(..., description="创建时间")
    updated_at: datetime = Field(..., description="更新时间")
    
    class Config:
        from_attributes = True


class ScheduledNotificationExecuteRequest(BaseModel):
    """
    手动执行定时通知请求模式
    用于立即执行一个定时通知任务
    """
    pass  # 不需要额外参数，通过 URL 路径传递任务ID


class SchedulerStatusResponse(BaseModel):
    """
    调度器状态响应模式
    """
    is_running: bool = Field(..., description="调度器是否运行中")
    pending_tasks: int = Field(..., description="待执行任务数")
    active_tasks: int = Field(..., description="活跃任务数")
    next_execution: Optional[datetime] = Field(default=None, description="下一个执行时间")


# ==================== 应用版本（热更新）模式 ====================
# 注意：UpdateType 枚举已从 models.py 导入，避免重复定义


class AppVersionBase(BaseModel):
    """
    应用版本基础模式
    
    Attributes:
        version: 版本号，如 "1.0.0"
        version_code: 版本代码，整数
        update_type: 更新类型
        title: 更新标题
        description: 更新说明
        download_url: 更新包下载地址
        file_size: 更新包大小（字节）
        file_hash: 更新包哈希值
        min_version: 最低支持版本
        platform: 平台类型
    """
    version: str = Field(..., min_length=1, max_length=20, description="版本号，如 1.0.0")
    version_code: int = Field(..., ge=1, description="版本代码，用于比较版本大小")
    update_type: UpdateType = Field(default=UpdateType.OPTIONAL, description="更新类型")
    title: str = Field(..., min_length=1, max_length=100, description="更新标题")
    description: Optional[str] = Field(default=None, max_length=2000, description="更新说明")
    download_url: Optional[str] = Field(default=None, max_length=500, description="更新包下载地址")
    file_size: Optional[int] = Field(default=None, ge=0, description="更新包大小（字节）")
    file_hash: Optional[str] = Field(default=None, max_length=64, description="更新包哈希值")
    min_version: Optional[str] = Field(default=None, max_length=20, description="最低支持版本")
    platform: str = Field(default="all", max_length=20, description="平台类型（android/ios/h5/all）")


class AppVersionCreate(AppVersionBase):
    """
    创建应用版本请求模式
    继承 AppVersionBase
    """
    is_active: bool = Field(default=True, description="是否启用")
    publish_time: Optional[datetime] = Field(default=None, description="发布时间")


class AppVersionUpdate(BaseModel):
    """
    更新应用版本请求模式
    所有字段可选
    """
    version: Optional[str] = Field(default=None, max_length=20, description="版本号")
    version_code: Optional[int] = Field(default=None, ge=1, description="版本代码")
    update_type: Optional[UpdateType] = Field(default=None, description="更新类型")
    title: Optional[str] = Field(default=None, max_length=100, description="更新标题")
    description: Optional[str] = Field(default=None, max_length=2000, description="更新说明")
    download_url: Optional[str] = Field(default=None, max_length=500, description="更新包下载地址")
    file_size: Optional[int] = Field(default=None, ge=0, description="更新包大小（字节）")
    file_hash: Optional[str] = Field(default=None, max_length=64, description="更新包哈希值")
    min_version: Optional[str] = Field(default=None, max_length=20, description="最低支持版本")
    platform: Optional[str] = Field(default=None, max_length=20, description="平台类型")
    is_active: Optional[bool] = Field(default=None, description="是否启用")
    publish_time: Optional[datetime] = Field(default=None, description="发布时间")


class AppVersionResponse(BaseModel):
    """
    应用版本响应模式
    """
    id: int = Field(..., description="版本ID")
    version: str = Field(..., description="版本号")
    version_code: int = Field(..., description="版本代码")
    update_type: str = Field(..., description="更新类型")
    title: str = Field(..., description="更新标题")
    description: Optional[str] = Field(default=None, description="更新说明")
    download_url: Optional[str] = Field(default=None, description="更新包下载地址")
    file_size: Optional[int] = Field(default=None, description="更新包大小（字节）")
    file_hash: Optional[str] = Field(default=None, description="更新包哈希值")
    min_version: Optional[str] = Field(default=None, description="最低支持版本")
    platform: str = Field(..., description="平台类型")
    is_active: bool = Field(..., description="是否启用")
    publish_time: Optional[datetime] = Field(default=None, description="发布时间")
    created_at: datetime = Field(..., description="创建时间")
    updated_at: datetime = Field(..., description="更新时间")
    creator_id: Optional[int] = Field(default=None, description="创建者ID")
    creator_name: Optional[str] = Field(default=None, description="创建者姓名")
    
    class Config:
        from_attributes = True


class AppVersionCheckRequest(BaseModel):
    """
    检查更新请求模式
    """
    current_version: str = Field(..., min_length=1, max_length=20, description="当前版本号")
    current_version_code: Optional[int] = Field(default=None, ge=0, description="当前版本代码")
    platform: str = Field(default="all", max_length=20, description="平台类型")


class AppVersionCheckResponse(BaseModel):
    """
    检查更新响应模式
    """
    has_update: bool = Field(..., description="是否有更新")
    update_type: Optional[str] = Field(default=None, description="更新类型")
    latest_version: Optional[str] = Field(default=None, description="最新版本号")
    latest_version_code: Optional[int] = Field(default=None, description="最新版本代码")
    title: Optional[str] = Field(default=None, description="更新标题")
    description: Optional[str] = Field(default=None, description="更新说明")
    download_url: Optional[str] = Field(default=None, description="下载地址")
    file_size: Optional[int] = Field(default=None, description="文件大小")
    file_hash: Optional[str] = Field(default=None, description="文件哈希")
    is_force_update: bool = Field(default=False, description="是否强制更新")


# ==================== 车辆还车/分配相关模式 ====================

class VehicleReturnRequest(BaseModel):
    """
    还车请求模式
    用于司机提交还车信息和照片
    
    Attributes:
        return_photos: 还车照片URL数组，必须包含7张照片
        damage_photos: 车损照片URL数组，无数量限制
        return_time: 还车时间，可选，默认为当前时间
        remark: 备注信息
    """
    return_photos: List[str] = Field(
        ..., 
        min_length=7, 
        max_length=7, 
        description="还车照片URL（必须7张：左前、右前、左后、右后、仪表盘、后门、货箱）"
    )
    damage_photos: Optional[List[str]] = Field(
        default=None, 
        description="车损照片URL（无数量限制）"
    )
    return_time: Optional[datetime] = Field(
        default=None, 
        description="还车时间，不填则使用当前时间"
    )
    remark: Optional[str] = Field(
        default=None, 
        max_length=500, 
        description="备注"
    )


class VehicleAssignRequest(BaseModel):
    """
    分配车辆请求模式
    用于管理员将车辆分配给指定司机
    
    Attributes:
        user_id: 目标司机ID
        warehouse_id: 仓库ID，可选
    """
    user_id: int = Field(..., description="目标司机ID")
    warehouse_id: Optional[int] = Field(default=None, description="仓库ID")


class ImageUploadResponse(BaseModel):
    """
    图片上传响应模式
    返回上传成功后的图片信息
    
    Attributes:
        success: 是否上传成功
        url: 图片访问URL
        filename: 文件名
        size: 文件大小（字节）
    """
    success: bool = Field(..., description="是否成功")
    url: str = Field(..., description="图片访问URL")
    filename: str = Field(..., description="文件名")
    size: int = Field(..., description="文件大小（字节）")


class VehicleReturnResponse(BaseModel):
    """
    还车响应模式
    返回还车操作的结果
    
    Attributes:
        id: 车辆ID
        license_plate: 车牌号
        status: 车辆状态
        return_time: 还车时间
        return_photos: 还车照片URL列表
        damage_photos: 车损照片URL列表
    """
    id: int = Field(..., description="车辆ID")
    license_plate: str = Field(..., description="车牌号")
    status: VehicleStatus = Field(..., description="车辆状态")
    return_time: Optional[datetime] = Field(default=None, description="还车时间")
    return_photos: Optional[List[str]] = Field(default=None, description="还车照片URL列表")
    damage_photos: Optional[List[str]] = Field(default=None, description="车损照片URL列表")
    
    class Config:
        from_attributes = True


class VehicleAssignResponse(BaseModel):
    """
    分配车辆响应模式
    返回分配操作的结果
    
    Attributes:
        id: 车辆ID
        license_plate: 车牌号
        user_id: 车主ID
        user_name: 车主姓名
        warehouse_id: 仓库ID
        warehouse_name: 仓库名称
        status: 车辆状态
    """
    id: int = Field(..., description="车辆ID")
    license_plate: str = Field(..., description="车牌号")
    user_id: int = Field(..., description="车主ID")
    user_name: Optional[str] = Field(default=None, description="车主姓名")
    warehouse_id: Optional[int] = Field(default=None, description="仓库ID")
    warehouse_name: Optional[str] = Field(default=None, description="仓库名称")
    status: VehicleStatus = Field(..., description="车辆状态")
    
    class Config:
        from_attributes = True


class VehicleListResponse(BaseModel):
    """
    车辆列表响应模式
    用于返回车辆列表查询结果
    
    Attributes:
        id: 车辆ID
        license_plate: 车牌号
        brand: 品牌
        model: 型号
        color: 颜色
        status: 车辆状态
        user_id: 车主ID
        user_name: 车主姓名
        warehouse_id: 仓库ID
        warehouse_name: 仓库名称
        created_at: 创建时间
    """
    id: int = Field(..., description="车辆ID")
    license_plate: str = Field(..., description="车牌号")
    brand: Optional[str] = Field(default=None, description="品牌")
    model: Optional[str] = Field(default=None, description="型号")
    color: Optional[str] = Field(default=None, description="颜色")
    status: VehicleStatus = Field(..., description="车辆状态")
    user_id: int = Field(..., description="车主ID")
    user_name: Optional[str] = Field(default=None, description="车主姓名")
    warehouse_id: Optional[int] = Field(default=None, description="仓库ID")
    warehouse_name: Optional[str] = Field(default=None, description="仓库名称")
    created_at: datetime = Field(..., description="创建时间")
    
    class Config:
        from_attributes = True


# ==================== 车辆历史相关模式 ====================
# 注意：VehicleHistoryActionType 枚举已从 models.py 导入，避免重复定义


class VehicleHistoryPhotos(BaseModel):
    """
    车辆历史照片模式
    按角度组织的7张基本照片
    
    Attributes:
        left_front: 左前照片URL
        right_front: 右前照片URL
        left_rear: 左后照片URL
        right_rear: 右后照片URL
        dashboard: 仪表盘照片URL
        rear_door: 后门照片URL
        cargo_box: 货箱照片URL
    """
    left_front: Optional[str] = Field(default=None, description="左前照片URL")
    right_front: Optional[str] = Field(default=None, description="右前照片URL")
    left_rear: Optional[str] = Field(default=None, description="左后照片URL")
    right_rear: Optional[str] = Field(default=None, description="右后照片URL")
    dashboard: Optional[str] = Field(default=None, description="仪表盘照片URL")
    rear_door: Optional[str] = Field(default=None, description="后门照片URL")
    cargo_box: Optional[str] = Field(default=None, description="货箱照片URL")


class VehicleHistoryResponse(BaseModel):
    """
    车辆历史记录响应模式
    返回单条车辆使用历史记录
    
    Attributes:
        id: 记录ID
        vehicle_id: 车辆ID
        user_id: 司机ID
        user_name: 司机姓名
        action_type: 操作类型（pickup=提车, return=还车）
        action_time: 操作时间
        photos: 7张基本照片（按角度组织）
        damage_photos: 车损照片数组
        remark: 备注
        created_at: 记录创建时间
    
    Requirements: 15.1, 15.2, 15.3
    """
    id: int = Field(..., description="记录ID")
    vehicle_id: int = Field(..., description="车辆ID")
    user_id: int = Field(..., description="司机ID")
    user_name: Optional[str] = Field(default=None, description="司机姓名")
    action_type: VehicleHistoryActionType = Field(..., description="操作类型")
    action_time: datetime = Field(..., description="操作时间")
    photos: Optional[VehicleHistoryPhotos] = Field(default=None, description="7张基本照片")
    damage_photos: Optional[List[str]] = Field(default=None, description="车损照片数组")
    remark: Optional[str] = Field(default=None, description="备注")
    created_at: datetime = Field(..., description="记录创建时间")
    
    class Config:
        from_attributes = True


class VehicleHistoryListResponse(BaseModel):
    """
    车辆历史列表响应模式
    返回分页的车辆历史记录列表
    
    Attributes:
        total: 总记录数
        items: 历史记录列表
    
    Requirements: 15.4
    """
    total: int = Field(..., description="总记录数")
    items: List[VehicleHistoryResponse] = Field(..., description="历史记录列表")


# ==================== 权限配置相关模式 ====================

class RolePermissionBase(BaseModel):
    """
    角色权限基础模式
    
    Attributes:
        role: 用户角色
        permissions: 权限键列表
    """
    role: UserRole = Field(..., description="用户角色")
    permissions: List[str] = Field(..., description="权限键列表")


class RolePermissionUpdate(BaseModel):
    """
    更新角色权限请求模式
    
    Attributes:
        permissions: 权限键列表
    """
    permissions: List[str] = Field(..., description="权限键列表")


class RolePermissionResponse(RolePermissionBase):
    """
    角色权限响应模式
    """
    updated_at: Optional[datetime] = Field(default=None, description="更新时间")
    
    class Config:
        from_attributes = True


class PermissionItem(BaseModel):
    """
    权限项模式
    
    Attributes:
        key: 权限键
        name: 权限名称
        description: 权限描述
        group: 权限分组
    """
    key: str = Field(..., description="权限键")
    name: str = Field(..., description="权限名称")
    description: str = Field(..., description="权限描述")
    group: str = Field(..., description="权限分组")


class PermissionGroupResponse(BaseModel):
    """
    权限分组响应模式
    
    Attributes:
        key: 分组键
        name: 分组名称
        icon: 分组图标
        permissions: 权限列表
    """
    key: str = Field(..., description="分组键")
    name: str = Field(..., description="分组名称")
    icon: str = Field(..., description="分组图标")
    permissions: List[PermissionItem] = Field(..., description="权限列表")


class AllPermissionsResponse(BaseModel):
    """
    所有权限响应模式
    
    Attributes:
        groups: 权限分组列表
        role_permissions: 各角色的权限配置
    """
    groups: List[PermissionGroupResponse] = Field(..., description="权限分组列表")
    role_permissions: dict = Field(..., description="各角色的权限配置")
