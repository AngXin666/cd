"""
通用辅助函数模块
提供资源获取、分页、响应构建等通用功能

本模块包含以下功能：
1. 资源获取函数 - get_or_404 系列函数，用于获取资源或返回 404 错误
2. 分页函数 - paginate_query，用于通用分页查询
3. 响应构建函数 - build_user_response、build_vehicle_response 等
4. 验证函数 - check_unique_or_400，用于检查字段唯一性

Requirements: 7.1, 7.2, 7.3
"""

from typing import TypeVar, Type, Optional, Any, Dict, List
from fastapi import HTTPException
from sqlmodel import Session, select, func

# 泛型类型变量，用于 get_or_404 函数
T = TypeVar('T')


# ============ 仓库类型映射 ============

# 延迟导入 WarehouseType 枚举，避免循环依赖
def _get_warehouse_type_enum():
    """
    延迟获取 WarehouseType 枚举
    
    避免模块级别的循环导入问题。
    
    Returns:
        WarehouseType: 仓库类型枚举类
    """
    from models import WarehouseType
    return WarehouseType


# 仓库类型到预设单位的映射
# piece→件, point→点, whole→车, distance→公里
# Requirements: 1.2, 1.3, 1.4, 1.5
WAREHOUSE_TYPE_UNIT_MAP: Dict[str, str] = {
    "piece": "件",      # 计件类型 → 件
    "point": "点",      # 点位类型 → 点
    "whole": "车",      # 整车类型 → 车
    "distance": "公里",  # 距离类型 → 公里
}

# 仓库类型显示名称映射
# Requirements: 1.1
WAREHOUSE_TYPE_DISPLAY_MAP: Dict[str, str] = {
    "piece": "计件",     # 计件类型
    "point": "点位",     # 点位类型
    "whole": "整车",     # 整车类型
    "distance": "距离",  # 距离类型
}


def get_warehouse_preset_unit(warehouse_type: Any) -> str:
    """
    获取仓库类型对应的预设单位
    
    根据仓库类型返回对应的计量单位字符串。
    支持传入 WarehouseType 枚举值或字符串类型。
    
    Args:
        warehouse_type: 仓库类型，可以是 WarehouseType 枚举值或字符串
            - WarehouseType.PIECE 或 "piece" → "件"
            - WarehouseType.POINT 或 "point" → "点"
            - WarehouseType.WHOLE 或 "whole" → "车"
            - WarehouseType.DISTANCE 或 "distance" → "公里"
    
    Returns:
        str: 预设单位字符串，如果类型无效则返回默认值 "件"
    
    Example:
        >>> from models import WarehouseType
        >>> get_warehouse_preset_unit(WarehouseType.PIECE)
        '件'
        >>> get_warehouse_preset_unit("point")
        '点'
        >>> get_warehouse_preset_unit(WarehouseType.DISTANCE)
        '公里'
    
    Requirements: 1.2, 1.3, 1.4, 1.5
    """
    # 如果是枚举类型，获取其值
    if hasattr(warehouse_type, 'value'):
        type_value = warehouse_type.value
    else:
        type_value = str(warehouse_type)
    
    # 从映射中获取单位，默认返回 "件"
    return WAREHOUSE_TYPE_UNIT_MAP.get(type_value, "件")


def get_warehouse_type_display_name(warehouse_type: Any) -> str:
    """
    获取仓库类型的显示名称
    
    根据仓库类型返回对应的中文显示名称。
    支持传入 WarehouseType 枚举值或字符串类型。
    
    Args:
        warehouse_type: 仓库类型，可以是 WarehouseType 枚举值或字符串
            - WarehouseType.PIECE 或 "piece" → "计件"
            - WarehouseType.POINT 或 "point" → "点位"
            - WarehouseType.WHOLE 或 "whole" → "整车"
            - WarehouseType.DISTANCE 或 "distance" → "距离"
    
    Returns:
        str: 显示名称字符串，如果类型无效则返回 "未知"
    
    Example:
        >>> from models import WarehouseType
        >>> get_warehouse_type_display_name(WarehouseType.PIECE)
        '计件'
        >>> get_warehouse_type_display_name("whole")
        '整车'
    
    Requirements: 1.1
    """
    # 如果是枚举类型，获取其值
    if hasattr(warehouse_type, 'value'):
        type_value = warehouse_type.value
    else:
        type_value = str(warehouse_type)
    
    # 从映射中获取显示名称，默认返回 "未知"
    return WAREHOUSE_TYPE_DISPLAY_MAP.get(type_value, "未知")


# ============ 资源获取函数 ============

def get_or_404(
    session: Session,
    model: Type[T],
    id: int,
    error_message: str = None
) -> T:
    """
    获取资源或返回 404 错误

    通用的资源获取函数，根据 ID 从数据库获取指定模型的记录。
    如果记录不存在，则抛出 HTTP 404 异常。

    Args:
        session: 数据库会话对象
        model: SQLModel 模型类（如 User, Vehicle, Warehouse）
        id: 资源的主键 ID
        error_message: 自定义错误消息，如果为 None 则使用默认消息

    Returns:
        T: 查询到的资源对象

    Raises:
        HTTPException: 当资源不存在时抛出 404 错误

    Example:
        >>> user = get_or_404(session, User, 1)
        >>> vehicle = get_or_404(session, Vehicle, 10, "车辆不存在")

    Requirements: 7.1
    """
    obj = session.get(model, id)
    if obj is None:
        # 使用自定义消息或默认消息
        message = error_message or f"{model.__name__} not found"
        raise HTTPException(status_code=404, detail=message)
    return obj


def get_user_or_404(session: Session, user_id: int) -> "User":
    """
    获取用户或返回 404 错误

    便捷函数，用于获取用户记录。

    Args:
        session: 数据库会话对象
        user_id: 用户 ID

    Returns:
        User: 用户对象

    Raises:
        HTTPException: 当用户不存在时抛出 404 错误

    Requirements: 7.1
    """
    # 延迟导入避免循环依赖
    from models import User
    return get_or_404(session, User, user_id, "用户不存在")


def get_vehicle_or_404(session: Session, vehicle_id: int) -> "Vehicle":
    """
    获取车辆或返回 404 错误

    便捷函数，用于获取车辆记录。

    Args:
        session: 数据库会话对象
        vehicle_id: 车辆 ID

    Returns:
        Vehicle: 车辆对象

    Raises:
        HTTPException: 当车辆不存在时抛出 404 错误

    Requirements: 7.1
    """
    # 延迟导入避免循环依赖
    from models import Vehicle
    return get_or_404(session, Vehicle, vehicle_id, "车辆不存在")


def get_warehouse_or_404(session: Session, warehouse_id: int) -> "Warehouse":
    """
    获取仓库或返回 404 错误

    便捷函数，用于获取仓库记录。

    Args:
        session: 数据库会话对象
        warehouse_id: 仓库 ID

    Returns:
        Warehouse: 仓库对象

    Raises:
        HTTPException: 当仓库不存在时抛出 404 错误

    Requirements: 7.1
    """
    # 延迟导入避免循环依赖
    from models import Warehouse
    return get_or_404(session, Warehouse, warehouse_id, "仓库不存在")


def get_notification_or_404(session: Session, notification_id: int) -> "Notification":
    """
    获取通知或返回 404 错误

    便捷函数，用于获取通知记录。

    Args:
        session: 数据库会话对象
        notification_id: 通知 ID

    Returns:
        Notification: 通知对象

    Raises:
        HTTPException: 当通知不存在时抛出 404 错误

    Requirements: 7.1
    """
    # 延迟导入避免循环依赖
    from models import Notification
    return get_or_404(session, Notification, notification_id, "通知不存在")


def get_scheduled_notification_or_404(
    session: Session,
    scheduled_notification_id: int
) -> "ScheduledNotification":
    """
    获取定时通知或返回 404 错误

    便捷函数，用于获取定时通知记录。

    Args:
        session: 数据库会话对象
        scheduled_notification_id: 定时通知 ID

    Returns:
        ScheduledNotification: 定时通知对象

    Raises:
        HTTPException: 当定时通知不存在时抛出 404 错误

    Requirements: 7.1
    """
    # 延迟导入避免循环依赖
    from models import ScheduledNotification
    return get_or_404(
        session,
        ScheduledNotification,
        scheduled_notification_id,
        "定时通知不存在"
    )


def get_leave_application_or_404(
    session: Session,
    leave_id: int
) -> "LeaveApplication":
    """
    获取请假申请或返回 404 错误

    便捷函数，用于获取请假申请记录。

    Args:
        session: 数据库会话对象
        leave_id: 请假申请 ID

    Returns:
        LeaveApplication: 请假申请对象

    Raises:
        HTTPException: 当请假申请不存在时抛出 404 错误

    Requirements: 7.1
    """
    # 延迟导入避免循环依赖
    from models import LeaveApplication
    return get_or_404(session, LeaveApplication, leave_id, "请假申请不存在")


def get_piece_work_record_or_404(
    session: Session,
    record_id: int
) -> "PieceWorkRecord":
    """
    获取计件记录或返回 404 错误

    便捷函数，用于获取计件记录。

    Args:
        session: 数据库会话对象
        record_id: 计件记录 ID

    Returns:
        PieceWorkRecord: 计件记录对象

    Raises:
        HTTPException: 当计件记录不存在时抛出 404 错误

    Requirements: 7.1
    """
    # 延迟导入避免循环依赖
    from models import PieceWorkRecord
    return get_or_404(session, PieceWorkRecord, record_id, "计件记录不存在")


def get_attendance_or_404(session: Session, attendance_id: int) -> "Attendance":
    """
    获取考勤记录或返回 404 错误

    便捷函数，用于获取考勤记录。

    Args:
        session: 数据库会话对象
        attendance_id: 考勤记录 ID

    Returns:
        Attendance: 考勤记录对象

    Raises:
        HTTPException: 当考勤记录不存在时抛出 404 错误

    Requirements: 7.1
    """
    # 延迟导入避免循环依赖
    from models import Attendance
    return get_or_404(session, Attendance, attendance_id, "考勤记录不存在")


# ============ 分页函数 ============

def paginate_query(
    session: Session,
    query,
    page: int = 1,
    page_size: int = 20
) -> Dict[str, Any]:
    """
    通用分页查询

    对 SQLModel 查询进行分页处理，返回分页结果和元数据。

    Args:
        session: 数据库会话对象
        query: SQLModel 查询对象（select 语句）
        page: 页码，从 1 开始，默认为 1
        page_size: 每页数量，默认为 20

    Returns:
        Dict[str, Any]: 包含以下字段的字典：
            - items: 当前页的数据列表
            - total: 总记录数
            - page: 当前页码
            - page_size: 每页数量
            - pages: 总页数

    Example:
        >>> query = select(User).where(User.is_active == True)
        >>> result = paginate_query(session, query, page=1, page_size=10)
        >>> print(result["total"])  # 总记录数
        >>> print(result["items"])  # 当前页数据

    Requirements: 7.2
    """
    # 参数验证：确保页码和每页数量为正整数
    if page < 1:
        page = 1
    if page_size < 1:
        page_size = 20

    # 计算总数：使用子查询统计记录数
    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    # 计算分页偏移量
    offset = (page - 1) * page_size

    # 执行分页查询
    items = session.exec(query.offset(offset).limit(page_size)).all()

    # 计算总页数（向上取整）
    pages = (total + page_size - 1) // page_size if total > 0 else 0

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": pages
    }


# ============ 响应构建函数 ============

def build_user_response(
    user: "User",
    include_warehouses: bool = False
) -> Dict[str, Any]:
    """
    构建用户响应对象

    将用户模型对象转换为 API 响应格式的字典。

    Args:
        user: 用户对象
        include_warehouses: 是否包含仓库信息，默认为 False

    Returns:
        Dict[str, Any]: 用户响应字典，包含以下字段：
            - id: 用户 ID
            - username: 用户名
            - name: 真实姓名
            - phone: 手机号码
            - role: 用户角色
            - is_active: 是否启用
            - created_at: 创建时间
            - warehouses: 仓库列表（可选）

    Example:
        >>> response = build_user_response(user, include_warehouses=True)
        >>> print(response["name"])

    Requirements: 7.3
    """
    response = {
        "id": user.id,
        "username": user.username,
        "name": user.name,
        "phone": user.phone,
        "role": user.role.value if hasattr(user.role, 'value') else user.role,
        "is_active": user.is_active,
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }

    # 如果需要包含仓库信息
    if include_warehouses and hasattr(user, 'warehouse_assignments'):
        response["warehouses"] = [
            {
                "id": assignment.warehouse.id,
                "name": assignment.warehouse.name
            }
            for assignment in user.warehouse_assignments
            if assignment.warehouse is not None
        ]

    return response


def build_vehicle_response(
    vehicle: "Vehicle",
    include_user: bool = True,
    include_warehouse: bool = False
) -> Dict[str, Any]:
    """
    构建车辆响应对象

    将车辆模型对象转换为 API 响应格式的字典。

    Args:
        vehicle: 车辆对象
        include_user: 是否包含用户信息，默认为 True
        include_warehouse: 是否包含仓库信息，默认为 False

    Returns:
        Dict[str, Any]: 车辆响应字典，包含以下字段：
            - id: 车辆 ID
            - license_plate: 车牌号
            - brand: 品牌
            - model: 型号
            - color: 颜色
            - status: 车辆状态
            - ownership_type: 所有权类型
            - created_at: 创建时间
            - updated_at: 更新时间
            - user_id: 用户 ID
            - user_name: 用户姓名（可选）
            - warehouse_id: 仓库 ID
            - warehouse_name: 仓库名称（可选）

    Example:
        >>> response = build_vehicle_response(vehicle, include_user=True)
        >>> print(response["license_plate"])

    Requirements: 7.3
    """
    response = {
        "id": vehicle.id,
        "license_plate": vehicle.license_plate,
        "brand": vehicle.brand,
        "model": vehicle.model,
        "color": vehicle.color,
        "status": vehicle.status.value if hasattr(vehicle.status, 'value') else vehicle.status,
        "ownership_type": vehicle.ownership_type,
        "user_id": vehicle.user_id,
        "warehouse_id": vehicle.warehouse_id,
        "created_at": vehicle.created_at.isoformat() if vehicle.created_at else None,
        "updated_at": vehicle.updated_at.isoformat() if vehicle.updated_at else None,
    }

    # 如果需要包含用户信息
    if include_user and vehicle.user is not None:
        response["user_name"] = vehicle.user.name

    # 如果需要包含仓库信息
    if include_warehouse and vehicle.warehouse is not None:
        response["warehouse_name"] = vehicle.warehouse.name

    return response


def build_warehouse_response(warehouse: "Warehouse") -> Dict[str, Any]:
    """
    构建仓库响应对象

    将仓库模型对象转换为 API 响应格式的字典。

    Args:
        warehouse: 仓库对象

    Returns:
        Dict[str, Any]: 仓库响应字典，包含以下字段：
            - id: 仓库 ID
            - name: 仓库名称
            - address: 仓库地址
            - is_active: 是否启用
            - created_at: 创建时间

    Example:
        >>> response = build_warehouse_response(warehouse)
        >>> print(response["name"])

    Requirements: 7.3
    """
    return {
        "id": warehouse.id,
        "name": warehouse.name,
        "address": warehouse.address,
        "is_active": warehouse.is_active,
        "created_at": warehouse.created_at.isoformat() if warehouse.created_at else None,
    }


def build_notification_response(notification: "Notification") -> Dict[str, Any]:
    """
    构建通知响应对象

    将通知模型对象转换为 API 响应格式的字典。

    Args:
        notification: 通知对象

    Returns:
        Dict[str, Any]: 通知响应字典，包含以下字段：
            - id: 通知 ID
            - user_id: 用户 ID
            - title: 通知标题
            - content: 通知内容
            - is_read: 是否已读
            - sender_id: 发送者 ID
            - created_at: 创建时间

    Example:
        >>> response = build_notification_response(notification)
        >>> print(response["title"])

    Requirements: 7.3
    """
    return {
        "id": notification.id,
        "user_id": notification.user_id,
        "title": notification.title,
        "content": notification.content,
        "is_read": notification.is_read,
        "sender_id": notification.sender_id,
        "created_at": notification.created_at.isoformat() if notification.created_at else None,
    }


# ============ 验证函数 ============

def check_unique_or_400(
    session: Session,
    model: Type[T],
    field_name: str,
    value: Any,
    exclude_id: int = None,
    error_message: str = None
) -> None:
    """
    检查字段唯一性或返回 400 错误

    验证指定模型的某个字段值是否唯一。如果已存在相同值的记录，
    则抛出 HTTP 400 异常。

    Args:
        session: 数据库会话对象
        model: SQLModel 模型类
        field_name: 要检查的字段名
        value: 字段值
        exclude_id: 排除的记录 ID（用于更新时排除自身）
        error_message: 自定义错误消息

    Raises:
        HTTPException: 当字段值已存在时抛出 400 错误

    Example:
        >>> # 创建用户时检查用户名唯一性
        >>> check_unique_or_400(session, User, "username", "admin")
        >>>
        >>> # 更新用户时检查用户名唯一性（排除自身）
        >>> check_unique_or_400(session, User, "username", "admin", exclude_id=1)

    Requirements: 7.3
    """
    # 构建查询：查找具有相同字段值的记录
    query = select(model).where(getattr(model, field_name) == value)

    # 如果指定了排除 ID，则排除该记录（用于更新操作）
    if exclude_id is not None:
        query = query.where(model.id != exclude_id)

    # 执行查询
    existing = session.exec(query).first()

    # 如果存在相同值的记录，抛出 400 错误
    if existing is not None:
        message = error_message or f"{field_name} 已存在"
        raise HTTPException(status_code=400, detail=message)


def check_user_exists_or_400(
    session: Session,
    username: str,
    exclude_id: int = None
) -> None:
    """
    检查用户名是否已存在

    便捷函数，用于检查用户名唯一性。

    Args:
        session: 数据库会话对象
        username: 用户名
        exclude_id: 排除的用户 ID（用于更新时）

    Raises:
        HTTPException: 当用户名已存在时抛出 400 错误

    Requirements: 7.3
    """
    # 延迟导入避免循环依赖
    from models import User
    check_unique_or_400(
        session,
        User,
        "username",
        username,
        exclude_id=exclude_id,
        error_message="用户名已存在"
    )


def check_license_plate_exists_or_400(
    session: Session,
    license_plate: str,
    exclude_id: int = None
) -> None:
    """
    检查车牌号是否已存在

    便捷函数，用于检查车牌号唯一性。

    Args:
        session: 数据库会话对象
        license_plate: 车牌号
        exclude_id: 排除的车辆 ID（用于更新时）

    Raises:
        HTTPException: 当车牌号已存在时抛出 400 错误

    Requirements: 7.3
    """
    # 延迟导入避免循环依赖
    from models import Vehicle
    check_unique_or_400(
        session,
        Vehicle,
        "license_plate",
        license_plate,
        exclude_id=exclude_id,
        error_message="车牌号已存在"
    )


# ============ 车辆历史辅助函数 ============

# 照片字段名称列表，按固定顺序存储
VEHICLE_PHOTO_FIELDS = [
    "left_front",   # 索引 0: 左前
    "right_front",  # 索引 1: 右前
    "left_rear",    # 索引 2: 左后
    "right_rear",   # 索引 3: 右后
    "dashboard",    # 索引 4: 仪表盘
    "rear_door",    # 索引 5: 后门
    "cargo_box"     # 索引 6: 货箱
]


def parse_vehicle_photos(photos_json: Optional[str]) -> Optional[Dict[str, Any]]:
    """
    解析车辆照片 JSON 字符串

    将存储在数据库中的照片 JSON 字符串解析为结构化的照片对象。
    照片数组按固定顺序存储：左前、右前、左后、右后、仪表盘、后门、货箱。

    Args:
        photos_json: 照片 JSON 字符串，格式为数组

    Returns:
        Optional[Dict[str, Any]]: 解析后的照片字典，包含以下字段：
            - left_front: 左前照片 URL
            - right_front: 右前照片 URL
            - left_rear: 左后照片 URL
            - right_rear: 右后照片 URL
            - dashboard: 仪表盘照片 URL
            - rear_door: 后门照片 URL
            - cargo_box: 货箱照片 URL
        如果解析失败或输入为空，返回 None

    Example:
        >>> photos = parse_vehicle_photos('["url1", "url2", ...]')
        >>> print(photos["left_front"])

    Requirements: 2.1
    """
    import json

    # 如果输入为空，直接返回 None
    if not photos_json:
        return None

    try:
        photos_list = json.loads(photos_json)

        # 验证是否为数组且长度足够
        if not isinstance(photos_list, list) or len(photos_list) < 7:
            return None

        # 使用字段名称列表和 zip 构建字典，降低复杂度
        return {
            field: photos_list[i]
            for i, field in enumerate(VEHICLE_PHOTO_FIELDS)
        }
    except json.JSONDecodeError:
        # JSON 解析失败，返回 None
        return None


def parse_damage_photos(damage_photos_json: Optional[str]) -> Optional[List[str]]:
    """
    解析车损照片 JSON 字符串

    将存储在数据库中的车损照片 JSON 字符串解析为照片 URL 列表。

    Args:
        damage_photos_json: 车损照片 JSON 字符串，格式为数组

    Returns:
        Optional[List[str]]: 解析后的车损照片 URL 列表
        如果解析失败或输入为空，返回 None

    Example:
        >>> damage_photos = parse_damage_photos('["url1", "url2"]')
        >>> print(damage_photos[0])

    Requirements: 2.1
    """
    import json

    # 如果输入为空，直接返回 None
    if not damage_photos_json:
        return None

    try:
        return json.loads(damage_photos_json)
    except json.JSONDecodeError:
        # JSON 解析失败，返回 None
        return None


def build_vehicle_history_entry(
    record: "VehicleHistory",
    user: Optional["User"],
    photos_dict: Optional[Dict[str, Any]],
    damage_photos_list: Optional[List[str]]
) -> Dict[str, Any]:
    """
    构建单条车辆历史记录响应

    将车辆历史记录模型对象转换为 API 响应格式的字典。

    Args:
        record: 车辆历史记录对象
        user: 关联的用户对象（可能为 None）
        photos_dict: 解析后的照片字典（可能为 None）
        damage_photos_list: 解析后的车损照片列表（可能为 None）

    Returns:
        Dict[str, Any]: 车辆历史记录响应字典，包含以下字段：
            - id: 记录 ID
            - vehicle_id: 车辆 ID
            - user_id: 用户 ID
            - user_name: 用户姓名
            - action_type: 操作类型（pickup/return）
            - action_time: 操作时间
            - photos: 照片对象
            - damage_photos: 车损照片列表
            - remark: 备注
            - created_at: 创建时间

    Example:
        >>> entry = build_vehicle_history_entry(record, user, photos, damage_photos)
        >>> print(entry["action_type"])

    Requirements: 2.1
    """
    return {
        "id": record.id,
        "vehicle_id": record.vehicle_id,
        "user_id": record.user_id,
        "user_name": user.name if user else None,
        "action_type": record.action_type.value if hasattr(record.action_type, 'value') else record.action_type,
        "action_time": record.action_time.isoformat() if record.action_time else None,
        "photos": photos_dict,
        "damage_photos": damage_photos_list,
        "remark": record.remark,
        "created_at": record.created_at.isoformat() if record.created_at else None
    }


def build_vehicle_history_response(
    record: "VehicleHistory",
    session: Session
) -> Dict[str, Any]:
    """
    构建完整的车辆历史记录响应

    从数据库记录构建完整的 API 响应，包括解析照片和获取用户信息。

    Args:
        record: 车辆历史记录对象
        session: 数据库会话对象

    Returns:
        Dict[str, Any]: 完整的车辆历史记录响应字典

    Example:
        >>> response = build_vehicle_history_response(record, session)
        >>> print(response["user_name"])

    Requirements: 2.1
    """
    # 延迟导入避免循环依赖
    import crud

    # 获取用户信息
    user = crud.get_user_by_id(session, record.user_id) if record.user_id else None

    # 解析照片
    photos_dict = parse_vehicle_photos(record.photos)
    damage_photos_list = parse_damage_photos(record.damage_photos)

    # 构建响应
    return build_vehicle_history_entry(record, user, photos_dict, damage_photos_list)


# ============ 定时通知辅助函数 ============

def serialize_to_json(value: Any) -> Optional[str]:
    """
    将值序列化为 JSON 字符串

    用于将 Python 对象（如 dict、list）序列化为 JSON 字符串存储到数据库。

    Args:
        value: 要序列化的值，可以是 dict、list 或其他 JSON 可序列化类型

    Returns:
        Optional[str]: JSON 字符串，如果输入为 None 则返回 None

    Example:
        >>> serialize_to_json({"key": "value"})
        '{"key": "value"}'
        >>> serialize_to_json([1, 2, 3])
        '[1, 2, 3]'
        >>> serialize_to_json(None)
        None

    Requirements: 2.2
    """
    import json

    if value is None:
        return None
    return json.dumps(value, ensure_ascii=False)


def apply_scheduled_notification_updates(
    scheduled: "ScheduledNotification",
    updates: Dict[str, Any]
) -> None:
    """
    应用定时通知的字段更新

    将更新字典中的非 None 值应用到定时通知对象上。
    自动处理 JSON 序列化字段（variables、target_user_ids、target_roles、weekdays）。

    Args:
        scheduled: 定时通知对象
        updates: 更新字典，键为字段名，值为新值（None 表示不更新）

    Returns:
        None: 直接修改 scheduled 对象

    Example:
        >>> updates = {"name": "新名称", "title": "新标题", "variables": {"key": "value"}}
        >>> apply_scheduled_notification_updates(scheduled, updates)

    Requirements: 2.2
    """
    # 需要 JSON 序列化的字段列表
    json_fields = {"variables", "target_user_ids", "target_roles", "weekdays"}

    # 遍历更新字典，应用非 None 的值
    for field_name, value in updates.items():
        if value is not None:
            # 如果是 JSON 字段，先序列化
            if field_name in json_fields:
                value = serialize_to_json(value)
            # 设置属性值
            setattr(scheduled, field_name, value)


def update_notification_next_execute_time(
    scheduled: "ScheduledNotification",
    new_scheduled_time: Any
) -> None:
    """
    更新定时通知的下次执行时间

    当更新计划时间时，如果任务还未执行过，同步更新下次执行时间。

    Args:
        scheduled: 定时通知对象
        new_scheduled_time: 新的计划时间

    Returns:
        None: 直接修改 scheduled 对象

    Example:
        >>> from datetime import datetime
        >>> update_notification_next_execute_time(scheduled, datetime.now())

    Requirements: 2.2
    """
    if new_scheduled_time is not None:
        scheduled.scheduled_time = new_scheduled_time
        # 如果任务还未执行，更新下次执行时间
        if scheduled.execution_count == 0:
            scheduled.next_execute_at = new_scheduled_time


# ============ 创建定时通知辅助函数 ============

def validate_scheduled_notification_create(
    request: Any,
    session: Session
) -> None:
    """
    验证创建定时通知的请求参数

    检查创建定时通知时的必要条件：
    1. 必须指定模板ID或通知标题
    2. 必须指定目标用户ID或目标角色
    3. 如果指定了模板，验证模板存在且启用

    Args:
        request: 创建定时通知请求对象，包含以下属性：
            - template_id: 模板ID（可选）
            - title: 通知标题（可选）
            - target_user_ids: 目标用户ID列表（可选）
            - target_roles: 目标角色列表（可选）
        session: 数据库会话对象

    Raises:
        HTTPException: 验证失败时抛出 400 或 404 错误

    Example:
        >>> validate_scheduled_notification_create(request, session)

    Requirements: 2.3
    """
    # 延迟导入避免循环依赖
    import crud

    # 验证：必须指定模板或标题
    if not request.template_id and not request.title:
        raise HTTPException(
            status_code=400,
            detail="必须指定模板ID或通知标题"
        )

    # 验证：必须指定目标用户
    if not request.target_user_ids and not request.target_roles:
        raise HTTPException(
            status_code=400,
            detail="必须指定目标用户ID或目标角色"
        )

    # 验证模板是否存在且启用
    if request.template_id:
        template = crud.get_notification_template_by_id(session, request.template_id)
        if not template:
            raise HTTPException(
                status_code=404,
                detail="模板不存在"
            )
        if not template.is_active:
            raise HTTPException(
                status_code=400,
                detail="模板已禁用"
            )


def parse_scheduled_notification_json_fields(
    scheduled: "ScheduledNotification"
) -> Dict[str, Any]:
    """
    解析定时通知的 JSON 字段

    将定时通知对象中的 JSON 字符串字段解析为 Python 对象。

    Args:
        scheduled: 定时通知对象

    Returns:
        Dict[str, Any]: 包含解析后字段的字典：
            - target_user_ids: 目标用户ID列表
            - target_roles: 目标角色列表
            - variables: 模板变量字典
            - weekdays: 每周重复的星期几列表

    Example:
        >>> fields = parse_scheduled_notification_json_fields(scheduled)
        >>> print(fields["target_user_ids"])

    Requirements: 2.3
    """
    import json

    return {
        "target_user_ids": json.loads(scheduled.target_user_ids) if scheduled.target_user_ids else None,
        "target_roles": json.loads(scheduled.target_roles) if scheduled.target_roles else None,
        "variables": json.loads(scheduled.variables) if scheduled.variables else None,
        "weekdays": json.loads(scheduled.weekdays) if scheduled.weekdays else None
    }


def build_scheduled_notification_response(
    scheduled: "ScheduledNotification",
    session: Session,
    creator_name: Optional[str] = None
) -> Dict[str, Any]:
    """
    构建定时通知响应对象

    将定时通知模型对象转换为 API 响应格式的字典。

    Args:
        scheduled: 定时通知对象
        session: 数据库会话对象
        creator_name: 创建者姓名（可选，如果不提供则从数据库查询）

    Returns:
        Dict[str, Any]: 定时通知响应字典

    Example:
        >>> response = build_scheduled_notification_response(scheduled, session)
        >>> print(response["name"])

    Requirements: 2.3
    """
    # 延迟导入避免循环依赖
    import crud

    # 解析 JSON 字段
    json_fields = parse_scheduled_notification_json_fields(scheduled)

    # 获取模板名称
    template_name = None
    if scheduled.template_id:
        template = crud.get_notification_template_by_id(session, scheduled.template_id)
        if template:
            template_name = template.name

    # 获取创建者姓名（如果未提供）
    if creator_name is None and scheduled.creator_id:
        creator = crud.get_user_by_id(session, scheduled.creator_id)
        if creator:
            creator_name = creator.name

    # 计算目标用户数量
    target_user_count = crud.get_target_user_count(
        session,
        json_fields["target_user_ids"],
        json_fields["target_roles"]
    )

    return {
        "id": scheduled.id,
        "name": scheduled.name,
        "template_id": scheduled.template_id,
        "template_name": template_name,
        "title": scheduled.title,
        "content": scheduled.content,
        "variables": json_fields["variables"],
        "target_user_ids": json_fields["target_user_ids"],
        "target_roles": json_fields["target_roles"],
        "target_user_count": target_user_count,
        "scheduled_time": scheduled.scheduled_time,
        "repeat_type": scheduled.repeat_type.value if hasattr(scheduled.repeat_type, 'value') else scheduled.repeat_type,
        "repeat_interval": scheduled.repeat_interval,
        "repeat_end_date": scheduled.repeat_end_date,
        "weekdays": json_fields["weekdays"],
        "monthly_day": scheduled.monthly_day,
        "status": scheduled.status.value if hasattr(scheduled.status, 'value') else scheduled.status,
        "last_executed_at": scheduled.last_executed_at,
        "next_execute_at": scheduled.next_execute_at,
        "execution_count": scheduled.execution_count,
        "creator_id": scheduled.creator_id,
        "creator_name": creator_name,
        "created_at": scheduled.created_at,
        "updated_at": scheduled.updated_at
    }


# ============ 取消定时通知辅助函数 ============

def validate_scheduled_notification_cancellable(
    scheduled: "ScheduledNotification"
) -> None:
    """
    验证定时通知是否可以取消

    检查定时通知的状态，只有处于 PENDING 或 ACTIVE 状态的通知才能取消。

    Args:
        scheduled: 定时通知对象

    Raises:
        HTTPException: 当通知已完成或已取消时抛出 400 错误

    Example:
        >>> validate_scheduled_notification_cancellable(scheduled)

    Requirements: 2.6
    """
    # 延迟导入避免循环依赖
    from models import ScheduledNotificationStatus

    # 不可取消的状态列表
    non_cancellable_statuses = [
        ScheduledNotificationStatus.COMPLETED,
        ScheduledNotificationStatus.CANCELLED
    ]

    if scheduled.status in non_cancellable_statuses:
        raise HTTPException(
            status_code=400,
            detail="该定时通知已完成或已取消"
        )


# ============ 计件记录辅助函数 ============

def get_piece_work_related_info(
    session: Session,
    record: "PieceWorkRecord"
) -> Dict[str, Any]:
    """
    获取计件记录的关联信息

    获取计件记录关联的用户、分类和仓库信息，用于构建响应或触发事件。

    Args:
        session: 数据库会话对象
        record: 计件记录对象

    Returns:
        Dict[str, Any]: 包含关联信息的字典：
            - user: 用户对象（可能为 None）
            - category: 分类对象（可能为 None）
            - warehouse: 仓库对象（可能为 None）

    Example:
        >>> info = get_piece_work_related_info(session, record)
        >>> print(info["user"].name if info["user"] else "未知")

    Requirements: 2.4
    """
    # 延迟导入避免循环依赖
    import crud
    from models import PieceWorkCategory

    # 获取用户信息
    user = crud.get_user_by_id(session, record.user_id) if record.user_id else None

    # 获取分类信息
    category = session.get(PieceWorkCategory, record.category_id) if record.category_id else None

    # 获取仓库信息
    warehouse = crud.get_warehouse_by_id(session, record.warehouse_id) if record.warehouse_id else None

    return {
        "user": user,
        "category": category,
        "warehouse": warehouse
    }


def get_piece_work_target_user_ids(
    session: Session,
    record: "PieceWorkRecord"
) -> List[int]:
    """
    获取计件更新事件的目标用户ID列表

    构建计件更新事件的目标用户列表，包括：
    1. 计件记录的所有者（司机）
    2. 对应仓库的所有车队长

    Args:
        session: 数据库会话对象
        record: 计件记录对象

    Returns:
        List[int]: 目标用户ID列表

    Example:
        >>> target_ids = get_piece_work_target_user_ids(session, record)
        >>> print(target_ids)  # [10, 5, 6]

    Requirements: 2.4
    """
    # 延迟导入避免循环依赖
    import crud
    from models import UserRole

    # 首先添加司机
    target_user_ids = [record.user_id]

    # 如果有仓库，获取该仓库的所有车队长
    if record.warehouse_id:
        warehouse_users = crud.get_warehouse_users(session, record.warehouse_id)
        for warehouse_user in warehouse_users:
            # 只添加车队长角色的用户（使用 normalize_role 进行大小写不敏感比较）
            from models import normalize_role
            if normalize_role(warehouse_user.role) == "manager" and warehouse_user.id not in target_user_ids:
                target_user_ids.append(warehouse_user.id)

    return target_user_ids


def build_piece_work_record_response(
    record: "PieceWorkRecord",
    user: Optional["User"],
    category: Optional["PieceWorkCategory"],
    warehouse: Optional["Warehouse"]
) -> Dict[str, Any]:
    """
    构建计件记录响应对象

    将计件记录模型对象转换为 API 响应格式的字典。

    Args:
        record: 计件记录对象
        user: 用户对象（可能为 None）
        category: 分类对象（可能为 None）
        warehouse: 仓库对象（可能为 None）

    Returns:
        Dict[str, Any]: 计件记录响应字典

    Example:
        >>> response = build_piece_work_record_response(record, user, category, warehouse)
        >>> print(response["amount"])

    Requirements: 2.4
    """
    return {
        "id": record.id,
        "user_id": record.user_id,
        "category_id": record.category_id,
        "warehouse_id": record.warehouse_id,
        "work_date": record.work_date,
        "quantity": record.quantity,
        "amount": record.amount,
        "remark": record.remark,
        "created_at": record.created_at,
        "user_name": user.name if user else None,
        "category_name": category.name if category else None,
        "warehouse_name": warehouse.name if warehouse else None
    }


# ============ 权限验证辅助函数 ============

def validate_role_permissions_update(
    role: "UserRole",
    permissions: set
) -> None:
    """
    验证角色权限更新请求

    检查权限更新请求的有效性：
    1. 老板和超级管理员的权限不可修改
    2. 验证权限键是否有效
    3. 验证权限组合的合理性

    Args:
        role: 用户角色
        permissions: 权限集合

    Raises:
        HTTPException: 验证失败时抛出 400 错误

    Example:
        >>> validate_role_permissions_update(UserRole.MANAGER, {"leave.view_all", "leave.approve"})

    Requirements: 2.5, 3.1 - 删除超级管理员后，老板成为最高权限角色
    """
    # 延迟导入避免循环依赖
    from models import UserRole, normalize_role

    # 老板的权限不可修改（老板是系统最高权限角色）
    # 使用 normalize_role 进行大小写不敏感比较
    if normalize_role(role) == "boss":
        raise HTTPException(
            status_code=400,
            detail="老板的权限不可修改"
        )


def validate_permission_keys(permissions: set, all_keys: set) -> None:
    """
    验证权限键是否有效

    检查请求中的权限键是否都在有效权限键列表中。

    Args:
        permissions: 请求的权限集合
        all_keys: 所有有效的权限键集合

    Raises:
        HTTPException: 当存在无效权限键时抛出 400 错误

    Example:
        >>> validate_permission_keys({"leave.view", "invalid.key"}, {"leave.view", "leave.approve"})
        HTTPException: 无效的权限键: invalid.key

    Requirements: 2.5
    """
    invalid_keys = [k for k in permissions if k not in all_keys]
    if invalid_keys:
        raise HTTPException(
            status_code=400,
            detail=f"无效的权限键: {', '.join(invalid_keys)}"
        )


def validate_permission_combinations(permissions: set) -> None:
    """
    验证权限组合的合理性

    检查权限组合是否符合业务规则：
    1. 如果有审批权限，必须有查看权限
    2. 如果有管理权限，必须有查看权限

    Args:
        permissions: 权限集合

    Raises:
        HTTPException: 当权限组合不合理时抛出 400 错误

    Example:
        >>> validate_permission_combinations({"leave.approve"})
        HTTPException: 审批请假需要查看所有请假权限

    Requirements: 2.5
    """
    # 权限依赖规则：{需要的权限: (依赖的权限, 错误消息)}
    permission_dependencies = {
        "leave.approve": ("leave.view_all", "审批请假需要查看所有请假权限"),
        "warehouse.manage": ("warehouse.view", "管理仓库需要查看仓库权限"),
        "user.manage": ("user.view", "管理用户需要查看用户权限"),
    }

    # 检查每个权限依赖
    for perm, (required_perm, error_msg) in permission_dependencies.items():
        if perm in permissions and required_perm not in permissions:
            raise HTTPException(
                status_code=400,
                detail=error_msg
            )


# ============ 车辆分配辅助函数 ============

def validate_vehicle_assignment(
    session: Session,
    vehicle_id: int,
    user_id: int,
    warehouse_id: Optional[int] = None
) -> tuple:
    """
    验证车辆分配请求的有效性

    检查车辆分配请求中的所有实体是否存在：
    1. 验证车辆存在
    2. 验证目标用户存在
    3. 验证仓库存在（如果提供了 warehouse_id）

    Args:
        session: 数据库会话对象
        vehicle_id: 车辆 ID
        user_id: 目标用户 ID
        warehouse_id: 仓库 ID（可选）

    Returns:
        tuple: (vehicle, target_user, warehouse) 三元组
            - vehicle: 车辆对象
            - target_user: 目标用户对象
            - warehouse: 仓库对象（如果未提供 warehouse_id 则为 None）

    Raises:
        HTTPException: 当任何实体不存在时抛出 404 错误

    Example:
        >>> vehicle, user, warehouse = validate_vehicle_assignment(session, 1, 10, 5)
        >>> print(vehicle.license_plate)

    Requirements: 3.1
    """
    # 延迟导入避免循环依赖
    import crud
    from models import Vehicle

    # 1. 验证车辆存在
    vehicle = session.get(Vehicle, vehicle_id)
    if vehicle is None:
        raise HTTPException(
            status_code=404,
            detail="车辆不存在"
        )

    # 2. 验证目标用户存在
    target_user = crud.get_user_by_id(session, user_id)
    if target_user is None:
        raise HTTPException(
            status_code=404,
            detail="目标用户不存在"
        )

    # 3. 验证仓库存在（如果提供了 warehouse_id）
    warehouse = None
    if warehouse_id is not None:
        warehouse = crud.get_warehouse_by_id(session, warehouse_id)
        if warehouse is None:
            raise HTTPException(
                status_code=404,
                detail="仓库不存在"
            )

    return vehicle, target_user, warehouse


def update_vehicle_for_assignment(
    vehicle: "Vehicle",
    user_id: int,
    warehouse_id: Optional[int] = None
) -> "datetime":
    """
    更新车辆的分配信息

    更新车辆的用户ID、仓库ID（如果提供）、状态和提车时间。

    Args:
        vehicle: 车辆对象
        user_id: 目标用户 ID
        warehouse_id: 仓库 ID（可选）

    Returns:
        datetime: 提车时间

    Example:
        >>> pickup_time = update_vehicle_for_assignment(vehicle, 10, 5)
        >>> print(pickup_time)

    Requirements: 3.1
    """
    from datetime import datetime
    from models import VehicleStatus

    # 更新仓库ID（如果提供）
    if warehouse_id is not None:
        vehicle.warehouse_id = warehouse_id

    # 更新用户ID
    vehicle.user_id = user_id

    # 更新状态为 active
    vehicle.status = VehicleStatus.ACTIVE

    # 记录提车时间
    pickup_time = datetime.now()
    vehicle.pickup_time = pickup_time

    # 更新时间戳
    vehicle.updated_at = datetime.now()

    return pickup_time


def create_vehicle_pickup_history(
    session: Session,
    vehicle: "Vehicle",
    user_id: int,
    pickup_time: "datetime",
    operator_name: str
) -> None:
    """
    创建车辆提车历史记录

    为车辆分配操作创建提车历史记录。

    Args:
        session: 数据库会话对象
        vehicle: 车辆对象
        user_id: 目标用户 ID
        pickup_time: 提车时间
        operator_name: 操作者姓名

    Returns:
        None

    Example:
        >>> create_vehicle_pickup_history(session, vehicle, 10, pickup_time, "管理员")

    Requirements: 3.1, 15.2
    """
    # 延迟导入避免循环依赖
    import crud
    from models import VehicleHistoryActionType

    try:
        # 获取提车照片（如果有）
        pickup_photos_json = vehicle.pickup_photos

        crud.create_vehicle_history(
            session,
            vehicle_id=vehicle.id,
            user_id=user_id,
            action_type=VehicleHistoryActionType.PICKUP,
            action_time=pickup_time,
            photos=pickup_photos_json,
            damage_photos=None,
            remark=f"由 {operator_name} 分配"
        )
    except Exception as e:
        # 历史记录创建失败不影响分配操作
        print(f"创建提车历史记录失败: {e}")


def send_vehicle_assignment_notification(
    session: Session,
    vehicle: "Vehicle",
    target_user_id: int,
    operator: "User"
) -> None:
    """
    发送车辆分配通知给目标司机

    创建并发送车辆分配通知给被分配车辆的司机。

    Args:
        session: 数据库会话对象
        vehicle: 车辆对象
        target_user_id: 目标用户 ID
        operator: 操作者用户对象

    Returns:
        None

    Example:
        >>> send_vehicle_assignment_notification(session, vehicle, 10, current_user)

    Requirements: 3.1
    """
    # 延迟导入避免循环依赖
    import crud

    try:
        title = "车辆分配通知"
        content = f"管理员 {operator.name} 已将车辆 {vehicle.license_plate} 分配给您"
        if vehicle.brand:
            content += f"，品牌：{vehicle.brand}"
        if vehicle.model:
            content += f"，型号：{vehicle.model}"
        content += "。"

        crud.create_notifications_batch(
            session,
            user_ids=[target_user_id],
            title=title,
            content=content,
            sender_id=operator.id
        )
    except Exception as e:
        # 通知发送失败不影响分配操作
        print(f"发送车辆分配通知失败: {e}")


def build_vehicle_assignment_response(
    vehicle: "Vehicle",
    target_user: "User"
) -> Dict[str, Any]:
    """
    构建车辆分配响应对象

    将车辆分配结果转换为 API 响应格式的字典。

    Args:
        vehicle: 车辆对象
        target_user: 目标用户对象

    Returns:
        Dict[str, Any]: 车辆分配响应字典

    Example:
        >>> response = build_vehicle_assignment_response(vehicle, target_user)
        >>> print(response["license_plate"])

    Requirements: 3.1
    """
    return {
        "id": vehicle.id,
        "user_id": vehicle.user_id,
        "license_plate": vehicle.license_plate,
        "brand": vehicle.brand,
        "model": vehicle.model,
        "color": vehicle.color,
        "status": vehicle.status.value if hasattr(vehicle.status, 'value') else vehicle.status,
        "ownership_type": vehicle.ownership_type,
        "created_at": vehicle.created_at,
        "updated_at": vehicle.updated_at,
        "user_name": target_user.name
    }


# ============ SSE 通知流辅助函数 ============

def validate_sse_token(token: Optional[str]) -> int:
    """
    验证 SSE 连接的 Token

    SSE 不支持 Authorization header，需要通过 query 参数传递 token。
    此函数验证 token 的有效性并返回用户 ID。

    Args:
        token: JWT Token 字符串

    Returns:
        int: 用户 ID

    Raises:
        HTTPException: 当 token 无效或缺失时抛出 401 错误

    Example:
        >>> user_id = validate_sse_token("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...")
        >>> print(user_id)  # 10

    Requirements: 3.2
    """
    # 延迟导入避免循环依赖
    from auth import decode_token

    # 检查 token 是否存在
    if not token:
        raise HTTPException(
            status_code=401,
            detail="缺少认证 Token"
        )

    # 验证 Token
    try:
        payload = decode_token(token)
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=401,
                detail="无效的 Token"
            )
        return int(user_id)
    except Exception:
        raise HTTPException(
            status_code=401,
            detail="Token 验证失败"
        )


def validate_sse_user(session: Session, user_id: int) -> "User":
    """
    验证 SSE 连接的用户

    检查用户是否存在且处于活跃状态。

    Args:
        session: 数据库会话对象
        user_id: 用户 ID

    Returns:
        User: 用户对象

    Raises:
        HTTPException: 当用户不存在或已禁用时抛出 401 错误

    Example:
        >>> user = validate_sse_user(session, 10)
        >>> print(user.name)

    Requirements: 3.2
    """
    # 延迟导入避免循环依赖
    import crud

    user = crud.get_user_by_id(session, user_id)
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=401,
            detail="用户不存在或已禁用"
        )
    return user


def build_notification_event_data(notifications: List) -> List[Dict[str, Any]]:
    """
    构建通知事件数据

    将通知对象列表转换为 SSE 事件数据格式。

    Args:
        notifications: 通知对象列表

    Returns:
        List[Dict[str, Any]]: 通知数据列表

    Example:
        >>> data = build_notification_event_data(notifications)
        >>> print(data[0]["title"])

    Requirements: 3.2
    """
    return [
        {
            "id": n.id,
            "title": n.title,
            "content": n.content,
            "is_read": n.is_read,
            "created_at": n.created_at.isoformat() if n.created_at else None
        }
        for n in notifications
    ]


def build_heartbeat_data(unread_count: int, timestamp: float) -> Dict[str, Any]:
    """
    构建心跳事件数据

    创建 SSE 心跳事件的数据结构。

    Args:
        unread_count: 未读通知数量
        timestamp: 当前时间戳

    Returns:
        Dict[str, Any]: 心跳数据字典

    Example:
        >>> data = build_heartbeat_data(5, time.time())
        >>> print(data["unread_count"])  # 5

    Requirements: 3.2
    """
    return {
        "type": "heartbeat",
        "unread_count": unread_count,
        "timestamp": timestamp
    }


def format_sse_event(event_type: str, data: Any) -> str:
    """
    格式化 SSE 事件消息

    将事件类型和数据格式化为 SSE 协议格式的字符串。

    Args:
        event_type: 事件类型（如 notification, heartbeat, vehicle_update）
        data: 事件数据（将被 JSON 序列化）

    Returns:
        str: SSE 格式的事件字符串

    Example:
        >>> msg = format_sse_event("notification", [{"id": 1, "title": "测试"}])
        >>> print(msg)  # "event: notification\ndata: [{"id": 1, "title": "测试"}]\n\n"

    Requirements: 3.2
    """
    import json
    return f"event: {event_type}\ndata: {json.dumps(data, ensure_ascii=False, default=str)}\n\n"


# ============ 车辆还车辅助函数 ============

def validate_return_vehicle_request(
    session: Session,
    vehicle_id: int,
    current_user: "User",
    return_photos: List[str]
) -> "Vehicle":
    """
    验证还车请求的有效性

    检查还车请求中的所有条件：
    1. 验证车辆存在
    2. 验证车辆归属于当前用户
    3. 验证还车照片数量正确（必须为7张）

    Args:
        session: 数据库会话对象
        vehicle_id: 车辆 ID
        current_user: 当前用户对象
        return_photos: 还车照片列表

    Returns:
        Vehicle: 车辆对象

    Raises:
        HTTPException: 当验证失败时抛出相应错误

    Example:
        >>> vehicle = validate_return_vehicle_request(session, 1, user, photos)
        >>> print(vehicle.license_plate)

    Requirements: 3.3
    """
    # 延迟导入避免循环依赖
    from models import Vehicle
    from auth import check_vehicle_ownership

    # 1. 验证车辆存在
    vehicle = session.get(Vehicle, vehicle_id)
    if vehicle is None:
        raise HTTPException(
            status_code=404,
            detail="车辆不存在"
        )

    # 2. 验证车辆归属
    check_vehicle_ownership(vehicle, current_user)

    # 3. 验证还车照片数量（必须为7张）
    if len(return_photos) != 7:
        raise HTTPException(
            status_code=400,
            detail="还车照片必须为7张"
        )

    return vehicle


def update_vehicle_for_return(
    vehicle: "Vehicle",
    return_photos: List[str],
    damage_photos: Optional[List[str]] = None,
    return_time: Optional["datetime"] = None
) -> tuple:
    """
    更新车辆的还车信息

    更新车辆的还车照片、车损照片、还车时间和状态。

    Args:
        vehicle: 车辆对象
        return_photos: 还车照片列表（7张）
        damage_photos: 车损照片列表（可选）
        return_time: 还车时间（可选，默认为当前时间）

    Returns:
        tuple: (return_photos_json, damage_photos_json, actual_return_time)

    Example:
        >>> photos_json, damage_json, time = update_vehicle_for_return(vehicle, photos)
        >>> print(time)

    Requirements: 3.3
    """
    import json
    from datetime import datetime
    from models import VehicleStatus

    # 存储还车照片（JSON 格式）
    return_photos_json = json.dumps(return_photos)
    vehicle.return_photos = return_photos_json

    # 存储车损照片（如果有）
    damage_photos_json = None
    if damage_photos:
        damage_photos_json = json.dumps(damage_photos)
        vehicle.damage_photos = damage_photos_json

    # 记录还车时间
    actual_return_time = return_time if return_time else datetime.now()
    vehicle.return_time = actual_return_time

    # 更新车辆状态为 returned
    vehicle.status = VehicleStatus.RETURNED

    # 更新时间戳
    vehicle.updated_at = datetime.now()

    return return_photos_json, damage_photos_json, actual_return_time


def create_vehicle_return_history(
    session: Session,
    vehicle: "Vehicle",
    user_id: int,
    return_time: "datetime",
    return_photos_json: str,
    damage_photos_json: Optional[str] = None,
    remark: Optional[str] = None
) -> None:
    """
    创建车辆还车历史记录

    为还车操作创建历史记录。

    Args:
        session: 数据库会话对象
        vehicle: 车辆对象
        user_id: 用户 ID
        return_time: 还车时间
        return_photos_json: 还车照片 JSON 字符串
        damage_photos_json: 车损照片 JSON 字符串（可选）
        remark: 备注（可选）

    Returns:
        None

    Example:
        >>> create_vehicle_return_history(session, vehicle, 10, time, photos_json)

    Requirements: 3.3, 15.2
    """
    # 延迟导入避免循环依赖
    import crud
    from models import VehicleHistoryActionType

    try:
        crud.create_vehicle_history(
            session,
            vehicle_id=vehicle.id,
            user_id=user_id,
            action_type=VehicleHistoryActionType.RETURN,
            action_time=return_time,
            photos=return_photos_json,
            damage_photos=damage_photos_json,
            remark=remark
        )
    except Exception as e:
        # 历史记录创建失败不影响还车操作
        print(f"创建还车历史记录失败: {e}")


def build_vehicle_return_response(
    vehicle: "Vehicle",
    session: Session
) -> Dict[str, Any]:
    """
    构建车辆还车响应对象

    将还车结果转换为 API 响应格式的字典。

    Args:
        vehicle: 车辆对象
        session: 数据库会话对象

    Returns:
        Dict[str, Any]: 车辆还车响应字典

    Example:
        >>> response = build_vehicle_return_response(vehicle, session)
        >>> print(response["status"])

    Requirements: 3.3
    """
    # 延迟导入避免循环依赖
    import crud

    # 获取车主信息用于响应
    user = crud.get_user_by_id(session, vehicle.user_id) if vehicle.user_id else None

    return {
        "id": vehicle.id,
        "user_id": vehicle.user_id,
        "license_plate": vehicle.license_plate,
        "brand": vehicle.brand,
        "model": vehicle.model,
        "color": vehicle.color,
        "status": vehicle.status.value if hasattr(vehicle.status, 'value') else vehicle.status,
        "ownership_type": vehicle.ownership_type,
        "created_at": vehicle.created_at,
        "updated_at": vehicle.updated_at,
        "user_name": user.name if user else None
    }


# ============ 仓库品类单位验证辅助函数 ============

def validate_category_unit_for_warehouse(
    session: Session,
    category_id: int,
    warehouse_id: int
) -> None:
    """
    验证品类单位是否与仓库类型匹配
    
    在创建计件记录时，验证所选品类的单位是否与仓库的预设单位一致。
    如果不匹配，抛出 HTTP 400 错误。
    
    Args:
        session: 数据库会话对象
        category_id: 品类 ID
        warehouse_id: 仓库 ID
    
    Raises:
        HTTPException: 当品类单位与仓库类型不匹配时抛出 400 错误
        HTTPException: 当品类或仓库不存在时抛出 404 错误
    
    Example:
        >>> # 假设仓库类型为 PIECE（预设单位为"件"），品类单位为"件"
        >>> validate_category_unit_for_warehouse(session, category_id=1, warehouse_id=1)
        >>> # 验证通过，无异常
        
        >>> # 假设仓库类型为 PIECE（预设单位为"件"），品类单位为"点"
        >>> validate_category_unit_for_warehouse(session, category_id=2, warehouse_id=1)
        >>> # 抛出 HTTPException 400
    
    Requirements: 3.1 - 品类单位限制
    """
    # 延迟导入避免循环依赖
    import crud
    from models import PieceWorkCategory
    
    # 1. 获取品类信息
    category = session.get(PieceWorkCategory, category_id)
    if category is None:
        raise HTTPException(
            status_code=404,
            detail="计件分类不存在"
        )
    
    # 2. 获取仓库信息
    warehouse = crud.get_warehouse_by_id(session, warehouse_id)
    if warehouse is None:
        raise HTTPException(
            status_code=404,
            detail="仓库不存在"
        )
    
    # 3. 获取仓库的预设单位
    warehouse_preset_unit = get_warehouse_preset_unit(warehouse.warehouse_type)
    
    # 4. 比较品类单位与仓库预设单位
    if category.unit != warehouse_preset_unit:
        raise HTTPException(
            status_code=400,
            detail=f"品类单位「{category.unit}」与仓库预设单位「{warehouse_preset_unit}」不匹配。"
                   f"该仓库类型为「{get_warehouse_type_display_name(warehouse.warehouse_type)}」，"
                   f"只能录入单位为「{warehouse_preset_unit}」的品类。"
        )
