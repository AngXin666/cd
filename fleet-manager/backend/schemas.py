"""
Pydantic 模式模块
定义 API 请求和响应的数据结构
用于数据验证和序列化

注意：枚举类型统一从 models.py 导入，避免重复定义
"""

from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel, Field
from models import (
    UserRole,
    LeaveType,
    LeaveStatus,
    VehicleStatus,
    DocumentType,
    VehicleHistoryActionType,
    WarehouseType
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
    driver_type: Optional[str] = Field(default=None, description="司机类型：pure（纯司机）或 with_vehicle（带车司机）")
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
    is_verified: bool = Field(default=False, description="是否已实名认证（司机有身份证号码即为已实名）")
    driver_type: Optional[str] = Field(default="pure", description="司机类型：pure（纯司机）或 with_vehicle（带车司机）")

    class Config:
        from_attributes = True


class UserDetailResponse(UserResponse):
    """
    用户详情响应模式
    包含关联的仓库信息
    """
    warehouses: List["WarehouseResponse"] = Field(default=[], description="分配的仓库列表")


# ==================== 仓库相关模式 ====================
# 仓库管理相关的请求和响应模式
# 支持仓库类型分类功能（计件/点位/整车/距离）
# Requirements: Requirement 1, 2, 7


class WarehouseBase(BaseModel):
    """
    仓库基础模式
    
    定义仓库的基本信息字段，作为创建和响应模式的基类。
    支持五种仓库类型，每种类型对应预设的计量单位。
    
    Attributes:
        name: 仓库名称，必填，长度 1-100 字符
        address: 仓库地址，可选，最大 255 字符
        is_active: 是否启用，默认 True
        warehouse_type: 仓库类型枚举值，默认为 PIECE（计件）
            - PIECE: 计件类型，预设单位为"件"
            - POINT: 点位类型，预设单位为"点"
            - WHOLE: 整车类型，预设单位为"车"
            - DISTANCE: 距离类型，预设单位为"公里"
            - CUSTOM: 自定义类型，单位由 custom_unit 字段指定
        custom_unit: 自定义单位名称，仅 CUSTOM 类型使用
        
    Requirements:
        - Requirement 1.1: 支持四种仓库类型
        - Requirement 1.2-1.5: 每种类型对应预设单位
        - Requirement 1.6: 仓库类型字段默认值为 "piece"
        - Requirement 4.1: 支持自定义类型和自定义单位
        
    Example:
        >>> warehouse = WarehouseBase(
        ...     name="北京仓库",
        ...     address="北京市朝阳区",
        ...     warehouse_type=WarehouseType.PIECE
        ... )
        >>> custom_warehouse = WarehouseBase(
        ...     name="特殊仓库",
        ...     warehouse_type=WarehouseType.CUSTOM,
        ...     custom_unit="箱"
        ... )
    """
    # 仓库名称，必填字段
    name: str = Field(..., min_length=1, max_length=100, description="仓库名称")
    # 仓库地址，可选字段
    address: Optional[str] = Field(default=None, max_length=255, description="仓库地址")
    # 是否启用，默认启用
    is_active: bool = Field(default=True, description="是否启用")
    # 仓库类型字段，默认为计件类型
    # 支持五种类型：piece=计件, point=点位, whole=整车, distance=距离, custom=自定义
    # Requirements: 1.1-1.6, 4.1 - 支持五种仓库类型，默认为 piece
    warehouse_type: WarehouseType = Field(
        default=WarehouseType.PIECE,
        description="仓库类型：piece=计件, point=点位, whole=整车, distance=距离, custom=自定义"
    )
    # 自定义单位名称（仅 custom 类型使用）
    # Requirements: 4.1 - 支持自定义单位
    custom_unit: Optional[str] = Field(
        default=None,
        max_length=20,
        description="自定义单位名称（仅 custom 类型使用）"
    )


class WarehouseCreate(WarehouseBase):
    """
    创建仓库请求模式
    
    继承 WarehouseBase，用于创建新仓库时的请求数据验证。
    支持设置仓库类型，默认为计件类型。
    支持同时创建品类和设置司机价格。
    
    继承字段:
        name: 仓库名称（必填，1-100 字符）
        address: 仓库地址（可选，最大 255 字符）
        is_active: 是否启用（默认 True）
        warehouse_type: 仓库类型（默认 WarehouseType.PIECE）
        custom_unit: 自定义单位名称（仅 custom 类型使用）
        
    新增字段:
        category_name: 品类名称（可选）
        driver_only_price: 纯司机单价（可选）
        with_vehicle_price: 带车司机单价（可选）
        
    Requirements: 
        - Requirement 1.6: 仓库类型字段默认值为 "piece"
        - Requirement 2.3: 创建新仓库时默认类型为"计件"
        - Requirement 4.1: 支持自定义类型和自定义单位
        - Requirement 7.1: API 接口支持创建带类型的仓库
        
    Example:
        >>> create_data = WarehouseCreate(
        ...     name="上海仓库",
        ...     address="上海市浦东新区",
        ...     warehouse_type=WarehouseType.POINT,
        ...     category_name="搬运",
        ...     driver_only_price=10.0,
        ...     with_vehicle_price=15.0
        ... )
        >>> custom_data = WarehouseCreate(
        ...     name="特殊仓库",
        ...     warehouse_type=WarehouseType.CUSTOM,
        ...     custom_unit="箱"
        ... )
    """
    # 品类名称（可选）
    category_name: Optional[str] = Field(
        default=None,
        max_length=100,
        description="品类名称"
    )
    # 纯司机单价（可选）
    driver_only_price: Optional[float] = Field(
        default=None,
        ge=0,
        description="纯司机单价"
    )
    # 带车司机单价（可选）
    with_vehicle_price: Optional[float] = Field(
        default=None,
        ge=0,
        description="带车司机单价"
    )


class WarehouseUpdate(BaseModel):
    """
    更新仓库请求模式
    
    用于更新仓库信息时的请求数据验证。
    所有字段均为可选，只更新提供的字段。
    支持更新仓库类型和自定义单位。
    
    Attributes:
        name: 仓库名称（可选，最大 100 字符）
        address: 仓库地址（可选，最大 255 字符）
        is_active: 是否启用（可选）
        warehouse_type: 仓库类型（可选），支持更新为以下值：
            - piece: 计件类型
            - point: 点位类型
            - whole: 整车类型
            - distance: 距离类型
            - custom: 自定义类型
        custom_unit: 自定义单位名称（可选，仅 custom 类型使用）
        
    Requirements:
        - Requirement 2.4: 更新仓库类型时验证并保存新类型
        - Requirement 4.1: 支持自定义类型和自定义单位
        - Requirement 7.1: API 接口支持更新仓库类型
        
    Example:
        >>> update_data = WarehouseUpdate(
        ...     warehouse_type=WarehouseType.WHOLE
        ... )
        >>> custom_update = WarehouseUpdate(
        ...     warehouse_type=WarehouseType.CUSTOM,
        ...     custom_unit="箱"
        ... )
    """
    # 仓库名称，可选更新
    name: Optional[str] = Field(default=None, max_length=100, description="仓库名称")
    # 仓库地址，可选更新
    address: Optional[str] = Field(default=None, max_length=255, description="仓库地址")
    # 是否启用，可选更新
    is_active: Optional[bool] = Field(default=None, description="是否启用")
    # 仓库类型字段，支持更新仓库类型
    # Requirements: 2.4, 4.1, 7.1 - 支持更新仓库类型和自定义类型
    warehouse_type: Optional[WarehouseType] = Field(
        default=None,
        description="仓库类型：piece=计件, point=点位, whole=整车, distance=距离, custom=自定义"
    )
    # 自定义单位名称（仅 custom 类型使用）
    # Requirements: 4.1 - 支持自定义单位
    custom_unit: Optional[str] = Field(
        default=None,
        max_length=20,
        description="自定义单位名称（仅 custom 类型使用）"
    )


class WarehouseResponse(WarehouseBase):
    """
    仓库响应模式
    
    返回给前端的仓库信息，包含仓库类型和预设单位。
    继承 WarehouseBase 的所有字段，并添加 id、created_at 和 preset_unit。
    
    Attributes:
        id: 仓库ID，主键
        name: 仓库名称（继承自 WarehouseBase）
        address: 仓库地址（继承自 WarehouseBase）
        is_active: 是否启用（继承自 WarehouseBase）
        warehouse_type: 仓库类型（继承自 WarehouseBase）
        custom_unit: 自定义单位名称（继承自 WarehouseBase，仅 custom 类型使用）
        preset_unit: 预设单位，根据仓库类型自动计算
            - piece → "件"
            - point → "点"
            - whole → "车"
            - distance → "公里"
            - custom → custom_unit 字段值
        created_at: 创建时间
        
    Requirements:
        - Requirement 4.1: 支持自定义类型和自定义单位
        - Requirement 7.1: API 返回包含 warehouse_type 字段
        - Requirement 7.2: API 返回包含 preset_unit 字段（基于仓库类型计算）
        
    Example:
        >>> response = WarehouseResponse(
        ...     id=1,
        ...     name="北京仓库",
        ...     warehouse_type=WarehouseType.PIECE,
        ...     preset_unit="件",
        ...     created_at=datetime.now()
        ... )
        >>> custom_response = WarehouseResponse(
        ...     id=2,
        ...     name="特殊仓库",
        ...     warehouse_type=WarehouseType.CUSTOM,
        ...     custom_unit="箱",
        ...     preset_unit="箱",
        ...     created_at=datetime.now()
        ... )
    """
    # 仓库ID，主键
    id: int = Field(..., description="仓库ID")
    # 创建时间
    created_at: datetime = Field(..., description="创建时间")
    # 预设单位字段（计算字段）
    # 根据 warehouse_type 自动计算：piece→件, point→点, whole→车, distance→公里, custom→custom_unit
    # Requirements: 7.2 - API 返回预设单位
    preset_unit: str = Field(default="件", description="预设单位，根据仓库类型自动计算")

    class Config:
        """Pydantic 配置类"""
        # 允许从 ORM 模型属性创建
        from_attributes = True

    @classmethod
    def from_warehouse(cls, warehouse: "Warehouse") -> "WarehouseResponse":
        """
        从 Warehouse 模型对象创建响应对象
        
        工厂方法，用于将数据库模型对象转换为 API 响应对象。
        自动根据仓库类型计算 preset_unit 字段值。
        对于 custom 类型，使用 custom_unit 字段值作为 preset_unit。
        
        Args:
            warehouse: Warehouse 数据库模型对象，包含仓库的所有信息
            
        Returns:
            WarehouseResponse: API 响应对象，包含计算后的 preset_unit
            
        Raises:
            ImportError: 当无法导入 helpers 模块时抛出
            
        Example:
            >>> from models import Warehouse, WarehouseType
            >>> warehouse = Warehouse(
            ...     id=1,
            ...     name="测试仓库",
            ...     warehouse_type=WarehouseType.PIECE
            ... )
            >>> response = WarehouseResponse.from_warehouse(warehouse)
            >>> print(response.preset_unit)  # 输出: "件"
            >>> custom_warehouse = Warehouse(
            ...     id=2,
            ...     name="特殊仓库",
            ...     warehouse_type=WarehouseType.CUSTOM,
            ...     custom_unit="箱"
            ... )
            >>> response = WarehouseResponse.from_warehouse(custom_warehouse)
            >>> print(response.preset_unit)  # 输出: "箱"
            
        Requirements: 
            - Requirement 4.1: 支持自定义类型和自定义单位
            - Requirement 7.2: API 返回预设单位
            
        Note:
            使用延迟导入避免循环依赖问题
        """
        # 延迟导入避免循环依赖
        from helpers import get_warehouse_unit
        
        # 创建响应对象，自动计算预设单位
        # 对于 custom 类型，get_warehouse_unit 会返回 custom_unit 字段值
        return cls(
            id=warehouse.id,
            name=warehouse.name,
            address=warehouse.address,
            is_active=warehouse.is_active,
            warehouse_type=warehouse.warehouse_type,
            custom_unit=warehouse.custom_unit,
            preset_unit=get_warehouse_unit(warehouse),
            created_at=warehouse.created_at
        )


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
    支持纯司机单价、带车司机单价配置
    """
    name: str = Field(..., min_length=1, max_length=50, description="分类名称")
    warehouse_id: Optional[int] = Field(default=None, description="关联仓库ID")
    unit_price: float = Field(default=0.0, ge=0, description="基础单价（元/件）- 兼容旧数据")
    driver_only_price: float = Field(default=0.0, ge=0, description="纯司机单价（元/件）")
    with_vehicle_price: float = Field(default=0.0, ge=0, description="带车司机单价（元/件）")
    upstairs_price: Optional[float] = Field(default=None, ge=0, description="上楼单价（元/件）")
    sorting_price: Optional[float] = Field(default=None, ge=0, description="分拣单价（元/件）")
    unit: str = Field(default="件", max_length=20, description="计量单位")
    is_active: bool = Field(default=True, description="是否启用")


class PieceWorkCategoryCreate(BaseModel):
    """
    创建计件分类请求模式
    
    当 unit 未指定时，将自动使用关联仓库的预设单位。
    Requirements: 2.1, 2.2 - 品类单位继承仓库预设单位
    """
    name: str = Field(..., min_length=1, max_length=50, description="分类名称")
    warehouse_id: int = Field(..., description="关联仓库ID")
    driver_only_price: float = Field(default=0.0, ge=0, description="纯司机单价（元/件）")
    with_vehicle_price: float = Field(default=0.0, ge=0, description="带车司机单价（元/件）")
    unit: Optional[str] = Field(default=None, max_length=20, description="计量单位，不指定则继承仓库预设单位")


class PieceWorkCategoryUpdate(BaseModel):
    """
    更新计件分类请求模式
    """
    name: Optional[str] = Field(default=None, max_length=50, description="分类名称")
    driver_only_price: Optional[float] = Field(default=None, ge=0, description="纯司机单价")
    with_vehicle_price: Optional[float] = Field(default=None, ge=0, description="带车司机单价")
    upstairs_price: Optional[float] = Field(default=None, ge=0, description="上楼单价")
    sorting_price: Optional[float] = Field(default=None, ge=0, description="分拣单价")
    unit: Optional[str] = Field(default=None, max_length=20, description="计量单位")
    is_active: Optional[bool] = Field(default=None, description="是否启用")


class PieceWorkCategoryResponse(BaseModel):
    """
    计件分类响应模式
    """
    id: int = Field(..., description="分类ID")
    name: str = Field(..., description="分类名称")
    warehouse_id: Optional[int] = Field(default=None, description="关联仓库ID")
    unit_price: float = Field(default=0.0, description="基础单价（元/件）")
    driver_only_price: float = Field(default=0.0, description="纯司机单价（元/件）")
    with_vehicle_price: float = Field(default=0.0, description="带车司机单价（元/件）")
    upstairs_price: Optional[float] = Field(default=None, description="上楼单价（元/件）")
    sorting_price: Optional[float] = Field(default=None, description="分拣单价（元/件）")
    unit: str = Field(default="件", description="计量单位")
    is_active: bool = Field(default=True, description="是否启用")
    created_at: datetime = Field(..., description="创建时间")
    # 关联信息
    warehouse_name: Optional[str] = Field(default=None, description="仓库名称")

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
    
    用于返回计件记录的统计数据，包括总数量、总金额、记录数和单位信息。
    
    Attributes:
        total_quantity: 总数量
        total_amount: 总金额
        record_count: 记录数
        unit: 计量单位（如 "件"、"点"、"车"、"公里"），根据仓库类型自动确定
        warehouse_type: 仓库类型（可选，当按仓库筛选时返回）
        warehouse_type_display: 仓库类型显示名称（可选）
    
    Requirements: 6.1 - 数据统计单位显示
    """
    total_quantity: int = Field(..., description="总数量")
    total_amount: float = Field(..., description="总金额")
    record_count: int = Field(..., description="记录数")
    unit: Optional[str] = Field(
        default="件",
        description="计量单位，根据仓库类型自动确定（件/点/车/公里）"
    )
    warehouse_type: Optional[str] = Field(
        default=None,
        description="仓库类型（piece/point/whole/distance）"
    )
    warehouse_type_display: Optional[str] = Field(
        default=None,
        description="仓库类型显示名称（计件/点位/整车/距离）"
    )


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
    warehouse_name: Optional[str] = Field(default=None, description="申请人所属仓库名称")

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
    包含租赁相关字段、车辆照片、行驶证照片、提车照片和司机证件信息
    
    Attributes:
        ownership_type: 所有权类型（company/personal/leased）
        lessor_name: 出租方名称
        lessor_contact: 出租方联系方式
        lessee_name: 承租方名称
        lessee_contact: 承租方联系方式
        monthly_rent: 月租金（元）
        lease_start_date: 租赁开始日期
        lease_end_date: 租赁结束日期
        rent_payment_day: 每月租金缴纳日（1-31）
        left_front_photo: 左前照片URL
        right_front_photo: 右前照片URL
        left_rear_photo: 左后照片URL
        right_rear_photo: 右后照片URL
        dashboard_photo: 仪表盘照片URL
        rear_door_photo: 后门照片URL
        cargo_box_photo: 货箱照片URL
        driving_license_main_photo: 行驶证主页照片URL
        driving_license_sub_photo: 行驶证副页照片URL
        driving_license_sub_back_photo: 行驶证副页背面照片URL
        pickup_photos: 提车照片数组
        registration_photos: 行驶证照片数组
        damage_photos: 车损照片数组
        pickup_time: 提车时间
        
        # 司机证件信息（可选，用于车辆录入时同时保存司机证件）
        driver_id_card_number: 司机身份证号码
        driver_id_card_name: 司机身份证姓名
        driver_id_card_photo_front: 司机身份证正面照片URL
        driver_id_card_photo_back: 司机身份证背面照片URL
        driver_license_number: 司机驾驶证号码
        driver_license_class: 司机驾驶证类型
        driver_license_valid_from: 司机驾驶证有效期起始日期
        driver_license_valid_to: 司机驾驶证有效期截止日期
        driver_license_photo: 司机驾驶证照片URL
        
    Requirements: 10.4 - 在创建车辆时同时保存司机证件信息
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
    
    # 车辆照片（7张基本照片）
    left_front_photo: Optional[str] = Field(default=None, max_length=500, description="左前照片URL")
    right_front_photo: Optional[str] = Field(default=None, max_length=500, description="右前照片URL")
    left_rear_photo: Optional[str] = Field(default=None, max_length=500, description="左后照片URL")
    right_rear_photo: Optional[str] = Field(default=None, max_length=500, description="右后照片URL")
    dashboard_photo: Optional[str] = Field(default=None, max_length=500, description="仪表盘照片URL")
    rear_door_photo: Optional[str] = Field(default=None, max_length=500, description="后门照片URL")
    cargo_box_photo: Optional[str] = Field(default=None, max_length=500, description="货箱照片URL")
    
    # 行驶证照片（3张）
    driving_license_main_photo: Optional[str] = Field(default=None, max_length=500, description="行驶证主页照片URL")
    driving_license_sub_photo: Optional[str] = Field(default=None, max_length=500, description="行驶证副页照片URL")
    driving_license_sub_back_photo: Optional[str] = Field(default=None, max_length=500, description="行驶证副页背面照片URL")
    
    # 照片数组
    pickup_photos: Optional[List[str]] = Field(default=None, description="提车照片数组（7张车辆照片）")
    registration_photos: Optional[List[str]] = Field(default=None, description="行驶证照片数组")
    damage_photos: Optional[List[str]] = Field(default=None, description="车损照片数组")
    
    # 提车时间
    pickup_time: Optional[datetime] = Field(default=None, description="提车时间")
    
    # 司机证件信息（可选，用于车辆录入时同时保存司机证件）
    # Requirements: 10.4 - 在创建车辆时同时保存司机证件信息
    driver_id_card_number: Optional[str] = Field(default=None, max_length=18, description="司机身份证号码")
    driver_id_card_name: Optional[str] = Field(default=None, max_length=50, description="司机身份证姓名")
    driver_id_card_photo_front: Optional[str] = Field(default=None, max_length=500, description="司机身份证正面照片URL")
    driver_id_card_photo_back: Optional[str] = Field(default=None, max_length=500, description="司机身份证背面照片URL")
    driver_license_number: Optional[str] = Field(default=None, max_length=18, description="司机驾驶证号码")
    driver_license_class: Optional[str] = Field(default=None, max_length=10, description="司机驾驶证类型（如：C1、B2、A2等）")
    driver_license_valid_from: Optional[date] = Field(default=None, description="司机驾驶证有效期起始日期")
    driver_license_valid_to: Optional[date] = Field(default=None, description="司机驾驶证有效期截止日期")
    driver_license_photo: Optional[str] = Field(default=None, max_length=500, description="司机驾驶证照片URL")


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


class NotificationResponse(BaseModel):
    """
    通知响应模式
    支持审批类通知的业务关联字段
    """
    id: int = Field(..., description="通知ID")
    user_id: int = Field(..., description="接收用户ID")
    title: str = Field(..., description="通知标题")
    content: Optional[str] = Field(default=None, description="通知内容")
    is_read: bool = Field(..., description="是否已读")
    sender_id: Optional[int] = Field(default=None, description="发送者ID")
    # 审批类通知的业务关联字段
    ref_type: Optional[str] = Field(default=None, description="关联类型：leave/resign/vehicle")
    ref_id: Optional[int] = Field(default=None, description="关联业务ID")
    status: Optional[str] = Field(default=None, description="审批状态：pending/approved/rejected")
    created_at: datetime = Field(..., description="发送时间")
    updated_at: Optional[datetime] = Field(default=None, description="更新时间")

    class Config:
        from_attributes = True


class UnreadCountResponse(BaseModel):
    """
    未读通知数量响应模式
    """
    count: int = Field(..., description="未读数量")



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


# ==================== 内部参数数据类 ====================
# 用于封装 CRUD 函数的多参数，减少函数签名复杂度


class VehicleCreateParams(BaseModel):
    """
    车辆创建参数数据类
    用于封装 create_vehicle 的参数
    减少函数参数数量，提高代码可读性

    Attributes:
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
    """
    # 必填字段
    user_id: int = Field(..., description="车主ID")
    license_plate: str = Field(..., min_length=1, max_length=20, description="车牌号")

    # 基本信息
    brand: Optional[str] = Field(default=None, max_length=50, description="品牌")
    model: Optional[str] = Field(default=None, max_length=50, description="型号")
    color: Optional[str] = Field(default=None, max_length=20, description="颜色")
    ownership_type: str = Field(default="company", description="所有权类型：company/personal/leased")

    # 租赁信息
    lessor_name: Optional[str] = Field(default=None, max_length=100, description="出租方名称")
    lessor_contact: Optional[str] = Field(default=None, max_length=50, description="出租方联系方式")
    lessee_name: Optional[str] = Field(default=None, max_length=100, description="承租方名称")
    lessee_contact: Optional[str] = Field(default=None, max_length=50, description="承租方联系方式")
    monthly_rent: Optional[float] = Field(default=None, ge=0, description="月租金（元）")
    lease_start_date: Optional[date] = Field(default=None, description="租赁开始日期")
    lease_end_date: Optional[date] = Field(default=None, description="租赁结束日期")
    rent_payment_day: Optional[int] = Field(default=None, ge=1, le=31, description="每月租金缴纳日（1-31）")

    # 车辆照片（7张基本照片）
    left_front_photo: Optional[str] = Field(default=None, max_length=500, description="左前照片URL")
    right_front_photo: Optional[str] = Field(default=None, max_length=500, description="右前照片URL")
    left_rear_photo: Optional[str] = Field(default=None, max_length=500, description="左后照片URL")
    right_rear_photo: Optional[str] = Field(default=None, max_length=500, description="右后照片URL")
    dashboard_photo: Optional[str] = Field(default=None, max_length=500, description="仪表盘照片URL")
    rear_door_photo: Optional[str] = Field(default=None, max_length=500, description="后门照片URL")
    cargo_box_photo: Optional[str] = Field(default=None, max_length=500, description="货箱照片URL")

    # 行驶证照片（3张）
    driving_license_main_photo: Optional[str] = Field(default=None, max_length=500, description="行驶证主页照片URL")
    driving_license_sub_photo: Optional[str] = Field(default=None, max_length=500, description="行驶证副页照片URL")
    driving_license_sub_back_photo: Optional[str] = Field(default=None, max_length=500, description="行驶证副页背面照片URL")

    # 照片数组
    pickup_photos: Optional[List[str]] = Field(default=None, description="提车照片数组（7张车辆照片）")
    registration_photos: Optional[List[str]] = Field(default=None, description="行驶证照片数组")
    damage_photos: Optional[List[str]] = Field(default=None, description="车损照片数组")

    # 提车时间
    pickup_time: Optional[datetime] = Field(default=None, description="提车时间")

    @classmethod
    def from_create_request(cls, request: "VehicleCreate", user_id: int) -> "VehicleCreateParams":
        """
        从创建请求构建参数对象

        Args:
            request: 创建请求对象
            user_id: 车主ID

        Returns:
            VehicleCreateParams: 参数对象
        """
        return cls(
            user_id=user_id,
            license_plate=request.license_plate,
            brand=request.brand,
            model=request.model,
            color=request.color,
            ownership_type=request.ownership_type or "company",
            lessor_name=request.lessor_name,
            lessor_contact=request.lessor_contact,
            lessee_name=request.lessee_name,
            lessee_contact=request.lessee_contact,
            monthly_rent=request.monthly_rent,
            lease_start_date=request.lease_start_date,
            lease_end_date=request.lease_end_date,
            rent_payment_day=request.rent_payment_day,
            # 车辆照片
            left_front_photo=request.left_front_photo,
            right_front_photo=request.right_front_photo,
            left_rear_photo=request.left_rear_photo,
            right_rear_photo=request.right_rear_photo,
            dashboard_photo=request.dashboard_photo,
            rear_door_photo=request.rear_door_photo,
            cargo_box_photo=request.cargo_box_photo,
            # 行驶证照片
            driving_license_main_photo=request.driving_license_main_photo,
            driving_license_sub_photo=request.driving_license_sub_photo,
            driving_license_sub_back_photo=request.driving_license_sub_back_photo,
            # 照片数组
            pickup_photos=request.pickup_photos,
            registration_photos=request.registration_photos,
            damage_photos=request.damage_photos,
            # 提车时间
            pickup_time=request.pickup_time
        )


# ==================== 司机证件相关模式 ====================
# 用于司机证件信息的创建、更新和响应
# Requirements: 4.5, 4.6, 4.7 - 司机个人档案页面显示身份证号、驾驶证类型、驾驶证有效期


class DriverLicenseBase(BaseModel):
    """
    司机证件基础模式
    包含身份证和驾驶证的基本信息字段

    Attributes:
        # 身份证信息
        id_card_number: 身份证号码（18位）
        id_card_name: 身份证姓名
        id_card_photo_front: 身份证正面照片URL
        id_card_photo_back: 身份证背面照片URL
        
        # 驾驶证信息
        license_number: 驾驶证号码
        license_class: 驾驶证类型（如：C1、B2、A2等）
        valid_from: 驾驶证有效期起始日期
        valid_to: 驾驶证有效期截止日期
        driving_license_photo: 驾驶证照片URL
    """
    # 身份证信息
    id_card_number: Optional[str] = Field(
        default=None, 
        max_length=18, 
        description="身份证号码（18位）"
    )
    id_card_name: Optional[str] = Field(
        default=None, 
        max_length=50, 
        description="身份证姓名"
    )
    id_card_photo_front: Optional[str] = Field(
        default=None, 
        max_length=500, 
        description="身份证正面照片URL"
    )
    id_card_photo_back: Optional[str] = Field(
        default=None, 
        max_length=500, 
        description="身份证背面照片URL"
    )
    
    # 驾驶证信息
    license_number: Optional[str] = Field(
        default=None, 
        max_length=18, 
        description="驾驶证号码"
    )
    license_class: Optional[str] = Field(
        default=None, 
        max_length=10, 
        description="驾驶证类型（如：C1、B2、A2等）"
    )
    valid_from: Optional[date] = Field(
        default=None, 
        description="驾驶证有效期起始日期"
    )
    valid_to: Optional[date] = Field(
        default=None, 
        description="驾驶证有效期截止日期"
    )
    driving_license_photo: Optional[str] = Field(
        default=None, 
        max_length=500, 
        description="驾驶证照片URL"
    )


class DriverLicenseCreate(DriverLicenseBase):
    """
    创建司机证件请求模式
    继承 DriverLicenseBase，用于创建新的司机证件记录
    
    注意：user_id 通过 URL 路径参数传递，不在请求体中
    
    Requirements: 4.5, 4.6, 4.7 - 支持保存身份证号、驾驶证类型、驾驶证有效期
    """
    pass


class DriverLicenseUpdate(BaseModel):
    """
    更新司机证件请求模式
    所有字段可选，只更新提供的字段

    Attributes:
        # 身份证信息
        id_card_number: 身份证号码（可选）
        id_card_name: 身份证姓名（可选）
        id_card_photo_front: 身份证正面照片URL（可选）
        id_card_photo_back: 身份证背面照片URL（可选）
        
        # 驾驶证信息
        license_number: 驾驶证号码（可选）
        license_class: 驾驶证类型（可选）
        valid_from: 驾驶证有效期起始日期（可选）
        valid_to: 驾驶证有效期截止日期（可选）
        driving_license_photo: 驾驶证照片URL（可选）
    """
    # 身份证信息
    id_card_number: Optional[str] = Field(
        default=None, 
        max_length=18, 
        description="身份证号码"
    )
    id_card_name: Optional[str] = Field(
        default=None, 
        max_length=50, 
        description="身份证姓名"
    )
    id_card_photo_front: Optional[str] = Field(
        default=None, 
        max_length=500, 
        description="身份证正面照片URL"
    )
    id_card_photo_back: Optional[str] = Field(
        default=None, 
        max_length=500, 
        description="身份证背面照片URL"
    )
    
    # 驾驶证信息
    license_number: Optional[str] = Field(
        default=None, 
        max_length=18, 
        description="驾驶证号码"
    )
    license_class: Optional[str] = Field(
        default=None, 
        max_length=10, 
        description="驾驶证类型"
    )
    valid_from: Optional[date] = Field(
        default=None, 
        description="驾驶证有效期起始日期"
    )
    valid_to: Optional[date] = Field(
        default=None, 
        description="驾驶证有效期截止日期"
    )
    driving_license_photo: Optional[str] = Field(
        default=None, 
        max_length=500, 
        description="驾驶证照片URL"
    )


class DriverLicenseResponse(DriverLicenseBase):
    """
    司机证件响应模式
    返回给前端的司机证件信息，包含完整的证件数据

    Attributes:
        id: 证件记录ID
        user_id: 用户ID
        # 继承自 DriverLicenseBase 的所有字段
        id_card_number_masked: 部分隐藏的身份证号（如：110***********1234）
        created_at: 创建时间
        updated_at: 更新时间

    Requirements: 4.5 - 显示身份证号（部分隐藏）
    """
    id: int = Field(..., description="证件记录ID")
    user_id: int = Field(..., description="用户ID")
    # 部分隐藏的身份证号，用于前端显示
    id_card_number_masked: Optional[str] = Field(
        default=None, 
        description="部分隐藏的身份证号（如：110***********1234）"
    )
    created_at: datetime = Field(..., description="创建时间")
    updated_at: datetime = Field(..., description="更新时间")

    class Config:
        """Pydantic 配置类"""
        from_attributes = True

    @classmethod
    def from_driver_license(cls, license_obj: "DriverLicense") -> "DriverLicenseResponse":
        """
        从 DriverLicense 模型对象创建响应对象
        
        工厂方法，用于将数据库模型对象转换为 API 响应对象。
        自动计算 id_card_number_masked 字段值。
        
        Args:
            license_obj: DriverLicense 数据库模型对象
            
        Returns:
            DriverLicenseResponse: API 响应对象，包含部分隐藏的身份证号
            
        Example:
            >>> from models import DriverLicense
            >>> license = DriverLicense(
            ...     id=1,
            ...     user_id=1,
            ...     id_card_number="110101199001011234"
            ... )
            >>> response = DriverLicenseResponse.from_driver_license(license)
            >>> print(response.id_card_number_masked)  # 输出: "110***********1234"
        """
        # 计算部分隐藏的身份证号
        masked_id_card = None
        if license_obj.id_card_number and len(license_obj.id_card_number) >= 6:
            # 显示前3位和后4位，中间用*号替代
            id_card = license_obj.id_card_number
            masked_id_card = f"{id_card[:3]}{'*' * (len(id_card) - 7)}{id_card[-4:]}"
        
        return cls(
            id=license_obj.id,
            user_id=license_obj.user_id,
            # 身份证信息
            id_card_number=license_obj.id_card_number,
            id_card_name=license_obj.id_card_name,
            id_card_photo_front=license_obj.id_card_photo_front,
            id_card_photo_back=license_obj.id_card_photo_back,
            id_card_number_masked=masked_id_card,
            # 驾驶证信息
            license_number=license_obj.license_number,
            license_class=license_obj.license_class,
            valid_from=license_obj.valid_from,
            valid_to=license_obj.valid_to,
            driving_license_photo=license_obj.driving_license_photo,
            # 时间戳
            created_at=license_obj.created_at,
            updated_at=license_obj.updated_at
        )


# ==================== 应用版本相关模式 ====================
# 用于热更新功能的版本检查、创建和响应
# Requirements: 8.1, 8.4, 8.5 - 版本检查响应格式


class VersionCheckRequest(BaseModel):
    """
    版本检查请求模式
    客户端发送当前版本信息，服务端返回是否有更新
    
    Attributes:
        current_version: 当前版本名称，如 "1.2.0"
        current_version_code: 当前版本号（整数），如 120
        platform: 平台类型，支持 android、ios、h5
        
    Requirements: 1.3 - 版本检查请求包含当前版本号、版本名称和平台信息
    
    Example:
        >>> request = VersionCheckRequest(
        ...     current_version="1.2.0",
        ...     current_version_code=120,
        ...     platform="android"
        ... )
    """
    current_version: str = Field(
        ..., 
        min_length=1, 
        max_length=20, 
        description="当前版本名称，如 '1.2.0'"
    )
    current_version_code: int = Field(
        ..., 
        ge=0, 
        description="当前版本号（整数），如 120"
    )
    platform: str = Field(
        ..., 
        min_length=1, 
        max_length=20, 
        description="平台类型：android、ios、h5"
    )


class VersionCheckResponse(BaseModel):
    """
    版本检查响应模式
    返回是否有更新及更新详情
    
    Attributes:
        has_update: 是否有可用更新
        update_type: 更新类型，"wgt"（热更新）或 "apk"（整包更新）
        latest_version: 最新版本名称
        latest_version_code: 最新版本号
        download_url: 更新包下载地址
        file_size: 文件大小（字节）
        md5: MD5 校验值
        description: 更新说明
        is_force_update: 是否强制更新
        
    Requirements: 
        - 8.1: 返回 JSON 格式的版本检查响应
        - 8.2: 有可用更新时返回 has_update: true 和更新详情
        - 8.3: 无可用更新时返回 has_update: false
        - 8.4: 响应中包含 update_type 字段，值为 "wgt" 或 "apk"
        - 8.5: 返回 latest_version、latest_version_code、download_url、
               file_size、md5、description、is_force_update 字段
    
    Example:
        >>> # 有更新时的响应
        >>> response = VersionCheckResponse(
        ...     has_update=True,
        ...     update_type="wgt",
        ...     latest_version="1.3.0",
        ...     latest_version_code=130,
        ...     download_url="https://example.com/update.wgt",
        ...     file_size=1024000,
        ...     md5="abc123...",
        ...     description="修复了一些问题",
        ...     is_force_update=False
        ... )
        >>> # 无更新时的响应
        >>> response = VersionCheckResponse(has_update=False)
    """
    has_update: bool = Field(..., description="是否有可用更新")
    update_type: Optional[str] = Field(
        default=None, 
        description="更新类型：'wgt'（热更新）或 'apk'（整包更新）"
    )
    latest_version: Optional[str] = Field(
        default=None, 
        description="最新版本名称"
    )
    latest_version_code: Optional[int] = Field(
        default=None, 
        description="最新版本号"
    )
    download_url: Optional[str] = Field(
        default=None, 
        description="更新包下载地址"
    )
    file_size: Optional[int] = Field(
        default=None, 
        description="文件大小（字节）"
    )
    md5: Optional[str] = Field(
        default=None, 
        description="MD5 校验值"
    )
    description: Optional[str] = Field(
        default=None, 
        description="更新说明"
    )
    is_force_update: bool = Field(
        default=False, 
        description="是否强制更新"
    )


class VersionCreate(BaseModel):
    """
    创建版本请求模式
    管理员发布新版本时使用
    
    Attributes:
        version_name: 版本名称，如 "1.3.0"
        version_code: 版本号（整数），如 130
        platform: 平台类型：android、ios
        update_type: 更新类型：wgt（热更新）、apk（整包更新）
        download_url: 下载地址
        file_size: 文件大小（字节）
        md5: MD5 校验值
        description: 更新说明（可选）
        is_force_update: 是否强制更新，默认 False
        min_compatible_version: 最低兼容版本号，默认 0
        
    Requirements: 
        - 6.4: 发布新版本时支持上传 wgt 包和 APK 文件
        - 7.2: 存储版本号、版本名称、更新类型、下载地址、MD5 校验值、
               更新内容、是否强制更新、发布时间
    
    Example:
        >>> create_data = VersionCreate(
        ...     version_name="1.3.0",
        ...     version_code=130,
        ...     platform="android",
        ...     update_type="wgt",
        ...     download_url="https://example.com/update.wgt",
        ...     file_size=1024000,
        ...     md5="abc123def456...",
        ...     description="1. 修复了登录问题\n2. 优化了性能",
        ...     is_force_update=False,
        ...     min_compatible_version=100
        ... )
    """
    version_name: str = Field(
        ..., 
        min_length=1, 
        max_length=20, 
        description="版本名称，如 '1.3.0'"
    )
    version_code: int = Field(
        ..., 
        ge=1, 
        description="版本号（整数），如 130"
    )
    platform: str = Field(
        ..., 
        min_length=1, 
        max_length=20, 
        description="平台类型：android、ios"
    )
    update_type: str = Field(
        ..., 
        min_length=1, 
        max_length=10, 
        description="更新类型：wgt（热更新）、apk（整包更新）"
    )
    download_url: str = Field(
        ..., 
        min_length=1, 
        max_length=500, 
        description="下载地址"
    )
    file_size: int = Field(
        ..., 
        ge=0, 
        description="文件大小（字节）"
    )
    md5: str = Field(
        ..., 
        min_length=1, 
        max_length=64, 
        description="MD5 校验值"
    )
    description: Optional[str] = Field(
        default=None, 
        max_length=2000, 
        description="更新说明"
    )
    is_force_update: bool = Field(
        default=False, 
        description="是否强制更新"
    )
    min_compatible_version: int = Field(
        default=0, 
        ge=0, 
        description="最低兼容版本号，低于此版本必须整包更新"
    )


class VersionResponse(BaseModel):
    """
    版本响应模式
    返回版本详细信息
    
    Attributes:
        id: 版本ID
        version_name: 版本名称
        version_code: 版本号
        platform: 平台类型
        update_type: 更新类型
        download_url: 下载地址
        file_size: 文件大小（字节）
        md5: MD5 校验值
        description: 更新说明
        is_force_update: 是否强制更新
        min_compatible_version: 最低兼容版本号
        download_count: 下载次数
        is_active: 是否启用
        created_at: 创建时间
        created_by: 创建人ID
        
    Requirements:
        - 6.5: 存储版本历史记录，包括版本号、更新内容、发布时间、下载次数
        - 7.1: 将版本信息存储在数据库中
        - 7.2: 包含版本号、版本名称、更新类型、下载地址、MD5 校验值、
               更新内容、是否强制更新、发布时间
    
    Example:
        >>> response = VersionResponse(
        ...     id=1,
        ...     version_name="1.3.0",
        ...     version_code=130,
        ...     platform="android",
        ...     update_type="wgt",
        ...     download_url="https://example.com/update.wgt",
        ...     file_size=1024000,
        ...     md5="abc123def456...",
        ...     description="修复了一些问题",
        ...     is_force_update=False,
        ...     min_compatible_version=100,
        ...     download_count=1000,
        ...     is_active=True,
        ...     created_at=datetime.now(),
        ...     created_by=1
        ... )
    """
    id: int = Field(..., description="版本ID")
    version_name: str = Field(..., description="版本名称")
    version_code: int = Field(..., description="版本号")
    platform: str = Field(..., description="平台类型")
    update_type: str = Field(..., description="更新类型")
    download_url: str = Field(..., description="下载地址")
    file_size: int = Field(..., description="文件大小（字节）")
    md5: str = Field(..., description="MD5 校验值")
    description: Optional[str] = Field(default=None, description="更新说明")
    is_force_update: bool = Field(..., description="是否强制更新")
    min_compatible_version: int = Field(..., description="最低兼容版本号")
    download_count: int = Field(default=0, description="下载次数")
    is_active: bool = Field(default=True, description="是否启用")
    created_at: datetime = Field(..., description="创建时间")
    created_by: Optional[int] = Field(default=None, description="创建人ID")

    class Config:
        """Pydantic 配置类"""
        from_attributes = True


class AppUpdateUploadResponse(BaseModel):
    """
    应用更新包上传响应模式
    返回上传成功后的更新包信息
    
    Attributes:
        success: 是否上传成功
        url: 更新包访问URL
        filename: 文件名
        file_size: 文件大小（字节）
        md5: MD5 校验值
        update_type: 更新类型（wgt/apk）
        
    Requirements:
        - 6.4: 发布新版本时支持上传 wgt 包和 APK 文件
    
    Example:
        >>> response = AppUpdateUploadResponse(
        ...     success=True,
        ...     url="/uploads/app_updates/update_1.3.0.wgt",
        ...     filename="update_1.3.0.wgt",
        ...     file_size=1024000,
        ...     md5="abc123def456...",
        ...     update_type="wgt"
        ... )
    """
    success: bool = Field(..., description="是否上传成功")
    url: str = Field(..., description="更新包访问URL")
    filename: str = Field(..., description="文件名")
    file_size: int = Field(..., description="文件大小（字节）")
    md5: str = Field(..., description="MD5 校验值")
    update_type: str = Field(..., description="更新类型（wgt/apk）")
