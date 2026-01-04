"""
枚举类型模块

提供统一的枚举基类，确保：
1. 所有枚举值使用小写字符串
2. 数据库存储使用小写值（而非枚举名称）
3. 支持大小写不敏感的值匹配
4. 前端、后端、数据库三端保持一致

使用方法：
1. 所有枚举类继承 LowercaseStrEnum
2. 枚举值必须使用小写字符串
3. 数据库字段使用 str 类型 + sa_column=Column(String(N))

示例：
    class MyStatus(LowercaseStrEnum):
        ACTIVE = "active"
        INACTIVE = "inactive"
"""

from enum import Enum
from typing import Optional, Any


class LowercaseStrEnum(str, Enum):
    """
    小写字符串枚举基类
    
    特性：
    1. 继承 str，可以直接与字符串比较
    2. 枚举值必须是小写字符串
    3. 支持大小写不敏感的值匹配（通过 _missing_ 方法）
    4. 可以直接用于 JSON 序列化
    
    使用规范：
    - 枚举名使用大写（如 PENDING）
    - 枚举值使用小写（如 "pending"）
    - 数据库存储小写值
    """
    
    @classmethod
    def _missing_(cls, value: Any) -> Optional["LowercaseStrEnum"]:
        """
        处理大小写不敏感的枚举值匹配
        
        当传入的值不完全匹配时，尝试转换为小写后匹配。
        这样可以兼容数据库中可能存在的大写值。
        
        Args:
            value: 要匹配的值
            
        Returns:
            匹配的枚举成员，或 None
        """
        if isinstance(value, str):
            lower_value = value.lower()
            for member in cls:
                if member.value == lower_value:
                    return member
        return None
    
    def __str__(self) -> str:
        """返回枚举值（小写字符串）"""
        return self.value
    
    def __repr__(self) -> str:
        """返回枚举的字符串表示"""
        return f"{self.__class__.__name__}.{self.name}"


def normalize_enum_value(value: Any) -> str:
    """
    规范化枚举值为小写字符串
    
    支持：
    - LowercaseStrEnum 枚举
    - 普通字符串（大小写不敏感）
    - 其他类型（转换为字符串后小写）
    
    Args:
        value: 枚举值，可以是枚举或字符串
        
    Returns:
        小写的字符串值
        
    Example:
        >>> normalize_enum_value(UserRole.DRIVER)  # "driver"
        >>> normalize_enum_value("DRIVER")  # "driver"
        >>> normalize_enum_value("driver")  # "driver"
    """
    if isinstance(value, LowercaseStrEnum):
        return value.value
    if isinstance(value, str):
        return value.lower()
    return str(value).lower()


def is_enum_equal(value1: Any, value2: Any) -> bool:
    """
    比较两个枚举值是否相等（大小写不敏感）
    
    Args:
        value1: 第一个值（可以是枚举或字符串）
        value2: 第二个值（可以是枚举或字符串）
        
    Returns:
        是否相等
        
    Example:
        >>> is_enum_equal(UserRole.DRIVER, "driver")  # True
        >>> is_enum_equal("DRIVER", "driver")  # True
        >>> is_enum_equal(UserRole.DRIVER, UserRole.DRIVER)  # True
    """
    return normalize_enum_value(value1) == normalize_enum_value(value2)


# ==================== 用户角色枚举 ====================

class UserRole(LowercaseStrEnum):
    """
    用户角色枚举
    
    - DRIVER: 司机，负责打卡、计件、请假、车辆管理
    - MANAGER: 车队长，负责司机管理、审批、统计
    - PEER_ADMIN: 调度，负责协助管理，拥有与老板类似的管理权限
    - BOSS: 老板，负责全局管理、用户管理、仓库管理，拥有系统最高权限
    """
    DRIVER = "driver"
    MANAGER = "manager"
    PEER_ADMIN = "peer_admin"
    BOSS = "boss"


# ==================== 请假相关枚举 ====================

class LeaveType(LowercaseStrEnum):
    """
    请假类型枚举
    
    - LEAVE: 请假
    - RESIGN: 离职申请
    """
    LEAVE = "leave"
    RESIGN = "resign"


class LeaveStatus(LowercaseStrEnum):
    """
    请假状态枚举
    
    - PENDING: 待审批
    - APPROVED: 已批准
    - REJECTED: 已拒绝
    """
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


# ==================== 车辆相关枚举 ====================

class VehicleStatus(LowercaseStrEnum):
    """
    车辆状态枚举
    
    - ACTIVE: 使用中
    - RETURNED: 已归还
    - REVIEWING: 审核中
    - REJECTED: 审核拒绝
    """
    ACTIVE = "active"
    RETURNED = "returned"
    REVIEWING = "reviewing"
    REJECTED = "rejected"


class DocumentType(LowercaseStrEnum):
    """
    证件类型枚举
    
    - LICENSE: 驾驶证
    - REGISTRATION: 行驶证
    - INSURANCE: 保险单
    """
    LICENSE = "license"
    REGISTRATION = "registration"
    INSURANCE = "insurance"


class VehicleHistoryActionType(LowercaseStrEnum):
    """
    车辆历史操作类型枚举
    
    - PICKUP: 提车操作
    - RETURN: 还车操作
    """
    PICKUP = "pickup"
    RETURN = "return"


# ==================== 仓库相关枚举 ====================

class WarehouseType(LowercaseStrEnum):
    """
    仓库类型枚举
    
    定义仓库的业务分类，每种类型对应预设的计量单位：
    - PIECE: 计件类型，预设单位为"件"
    - POINT: 点位类型，预设单位为"点"
    - WHOLE: 整车类型，预设单位为"车"
    - DISTANCE: 距离类型，预设单位为"公里"
    - CUSTOM: 自定义类型，单位由老板在仓库设置中指定
    """
    PIECE = "piece"
    POINT = "point"
    WHOLE = "whole"
    DISTANCE = "distance"
    CUSTOM = "custom"
