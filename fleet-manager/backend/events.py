"""
SSE 事件类型和数据结构模块
定义统一实时更新系统的事件类型枚举和事件数据类

本模块是统一实时更新系统的核心组件，负责：
1. 定义所有 SSE 事件类型（SSEEventType 枚举）
2. 定义事件数据结构（SSEEvent 数据类）
3. 提供事件队列管理功能（push_event, pop_events）
4. 提供业务事件触发器（emit_vehicle_update, emit_leave_update, emit_piece_work_update）

Requirements: 1.1, 1.3 - 扩展 SSE 事件类型，支持多种业务事件
"""

from datetime import datetime
from enum import Enum
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, field


class SSEEventType(str, Enum):
    """
    SSE 事件类型枚举
    
    定义系统支持的所有 SSE 事件类型
    Requirements: 1.3 - 新增事件类型定义
    """
    NOTIFICATION = "notification"
    HEARTBEAT = "heartbeat"
    VEHICLE_UPDATE = "vehicle_update"
    LEAVE_UPDATE = "leave_update"
    PIECE_WORK_UPDATE = "piece_work_update"
    ASSIGNMENT_UPDATE = "assignment_update"
    PERMISSION_UPDATE = "permission_update"
    USER_UPDATE = "user_update"


@dataclass
class SSEEvent:
    """
    SSE 事件数据类
    Requirements: 1.1 - 事件数据结构定义
    """
    event_type: SSEEventType
    target_user_ids: List[int]
    data: Dict[str, Any]
    created_at: datetime = field(default_factory=datetime.now)
    
    def to_dict(self) -> Dict[str, Any]:
        """将事件转换为字典格式"""
        return {
            "event_type": self.event_type.value,
            "target_user_ids": self.target_user_ids,
            "data": self.data,
            "created_at": self.created_at.isoformat()
        }


# 全局事件队列
_event_queue: Dict[int, List[SSEEvent]] = {}
MAX_QUEUE_SIZE = 100


def push_event(event: SSEEvent) -> None:
    """将事件推送到目标用户的队列"""
    for user_id in event.target_user_ids:
        if user_id not in _event_queue:
            _event_queue[user_id] = []
        if len(_event_queue[user_id]) >= MAX_QUEUE_SIZE:
            _event_queue[user_id].pop(0)
        _event_queue[user_id].append(event)


def pop_events(user_id: int) -> List[SSEEvent]:
    """获取并清空用户的事件队列"""
    events = _event_queue.get(user_id, [])
    _event_queue[user_id] = []
    return events


def get_queue_size(user_id: int) -> int:
    """获取用户事件队列的当前大小"""
    return len(_event_queue.get(user_id, []))


def clear_queue(user_id: Optional[int] = None) -> None:
    """清空事件队列"""
    global _event_queue
    if user_id is not None:
        _event_queue[user_id] = []
    else:
        _event_queue = {}


def emit_vehicle_update(
    vehicle_id: int,
    license_plate: str,
    brand: Optional[str],
    model: Optional[str],
    color: Optional[str],
    status: str,
    user_id: int,
    warehouse_id: Optional[int],
    ownership_type: Optional[str],
    created_at: str,
    updated_at: str,
    target_user_id: int,
    action: str = "update"
) -> None:
    """
    触发车辆更新事件
    Requirements: 2.1, 2.2, 2.4 - 车辆审批实时数据同步
    """
    vehicle_data = {
        "id": vehicle_id,
        "license_plate": license_plate,
        "brand": brand,
        "model": model,
        "color": color,
        "status": status,
        "user_id": user_id,
        "warehouse_id": warehouse_id,
        "ownership_type": ownership_type,
        "created_at": created_at,
        "updated_at": updated_at
    }
    event_data = {"action": action, "vehicle": vehicle_data}
    event = SSEEvent(
        event_type=SSEEventType.VEHICLE_UPDATE,
        target_user_ids=[target_user_id],
        data=event_data
    )
    push_event(event)


def emit_leave_update(
    leave_id: int,
    user_id: int,
    leave_type: str,
    start_date: str,
    end_date: str,
    status: str,
    reason: Optional[str],
    approver_id: Optional[int],
    approve_remark: Optional[str],
    created_at: str,
    updated_at: str,
    target_user_ids: List[int],
    action: str = "update"
) -> None:
    """
    触发请假更新事件
    Requirements: 3.1, 3.2, 3.4 - 请假审批实时数据同步
    """
    leave_data = {
        "id": leave_id,
        "user_id": user_id,
        "leave_type": leave_type,
        "start_date": start_date,
        "end_date": end_date,
        "status": status,
        "reason": reason,
        "approver_id": approver_id,
        "approve_remark": approve_remark,
        "created_at": created_at,
        "updated_at": updated_at
    }
    event_data = {"action": action, "leave": leave_data}
    event = SSEEvent(
        event_type=SSEEventType.LEAVE_UPDATE,
        target_user_ids=target_user_ids,
        data=event_data
    )
    push_event(event)



def emit_piece_work_update(
    record_id: int,
    user_id: int,
    user_name: str,
    warehouse_id: Optional[int],
    warehouse_name: Optional[str],
    category_id: int,
    category_name: str,
    quantity: int,
    amount: float,
    work_date: str,
    remark: Optional[str],
    created_at: str,
    target_user_ids: List[int],
    action: str = "create"
) -> None:
    """
    触发计件更新事件
    
    当计件记录发生变化（如司机提交新记录、车队长审批/修改记录）时，
    向相关用户推送包含完整计件数据的 piece_work_update 事件。
    
    目标用户包括：
    - 司机（user_id）：接收自己计件记录的审批结果
    - 对应仓库的车队长：接收新的计件记录通知
    
    Requirements: 4.1, 4.2, 4.3 - 计件记录实时数据同步
    
    Args:
        record_id: 计件记录ID
        user_id: 司机ID
        user_name: 司机姓名
        warehouse_id: 仓库ID（可选）
        warehouse_name: 仓库名称（可选）
        category_id: 计件分类ID
        category_name: 计件分类名称
        quantity: 数量
        amount: 金额
        work_date: 工作日期（ISO格式字符串）
        remark: 备注（可选）
        created_at: 创建时间（ISO格式字符串）
        target_user_ids: 目标用户ID列表（司机 + 对应仓库车队长）
        action: 操作类型，默认为 "create"，可选值：create/update
        
    Example:
        >>> emit_piece_work_update(
        ...     record_id=1,
        ...     user_id=10,
        ...     user_name="张三",
        ...     warehouse_id=1,
        ...     warehouse_name="北京仓库",
        ...     category_id=1,
        ...     category_name="搬运",
        ...     quantity=100,
        ...     amount=500.0,
        ...     work_date="2025-12-27",
        ...     remark="正常工作",
        ...     created_at="2025-12-27T10:00:00",
        ...     target_user_ids=[10, 5, 6],
        ...     action="create"
        ... )
    """
    # 构建完整的计件记录数据负载
    # Requirements: 4.3 - 事件负载包含完整的计件记录数据
    record_data = {
        "id": record_id,
        "user_id": user_id,
        "user_name": user_name,
        "warehouse_id": warehouse_id,
        "warehouse_name": warehouse_name,
        "category_id": category_id,
        "category_name": category_name,
        "quantity": quantity,
        "amount": amount,
        "work_date": work_date,
        "remark": remark,
        "created_at": created_at,
        "status": "submitted"
    }
    
    # 构建事件负载
    event_data = {
        "action": action,
        "record": record_data
    }
    
    # 创建 SSE 事件
    event = SSEEvent(
        event_type=SSEEventType.PIECE_WORK_UPDATE,
        target_user_ids=target_user_ids,
        data=event_data
    )
    
    # 推送事件到队列
    push_event(event)


def emit_assignment_update(
    user_id: int,
    warehouses: List[Dict[str, Any]],
    assignment_type: str = "driver"
) -> None:
    """
    触发仓库分配更新事件
    
    当管理员修改用户的仓库分配时，向该用户推送包含完整仓库列表的
    assignment_update 事件，让用户无需手动刷新即可看到最新的仓库分配。
    
    目标用户：被分配仓库的用户（司机或车队长）
    
    Requirements: 5.1, 5.2, 5.3 - 仓库分配实时数据同步
    
    Args:
        user_id: 被分配仓库的用户ID
        warehouses: 完整的仓库对象列表，每个仓库包含：
            - id: 仓库ID
            - name: 仓库名称
            - address: 仓库地址（可选）
        assignment_type: 分配类型，"driver" 表示司机分配，"manager" 表示车队长分配
        
    Example:
        >>> emit_assignment_update(
        ...     user_id=10,
        ...     warehouses=[
        ...         {"id": 1, "name": "北京仓库", "address": "北京市朝阳区"},
        ...         {"id": 2, "name": "上海仓库", "address": "上海市浦东新区"}
        ...     ],
        ...     assignment_type="driver"
        ... )
    """
    # 构建事件负载
    # Requirements: 5.3 - 事件负载包含用户ID、分配类型、完整的仓库对象列表
    event_data = {
        "user_id": user_id,
        "assignment_type": assignment_type,
        "warehouses": warehouses
    }
    
    # 创建 SSE 事件
    event = SSEEvent(
        event_type=SSEEventType.ASSIGNMENT_UPDATE,
        target_user_ids=[user_id],
        data=event_data
    )
    
    # 推送事件到队列
    push_event(event)


def emit_permission_update(
    user_id: int,
    permissions: List[str]
) -> None:
    """
    触发权限更新事件
    
    当老板修改用户角色的权限配置时，向该角色的所有用户推送包含完整权限数据的
    permission_update 事件，让用户无需手动刷新即可看到最新的权限状态。
    
    目标用户：被修改权限的用户（车队长或调度）
    
    Requirements: 6.1, 6.2 - 权限变更实时数据同步
    
    Args:
        user_id: 被修改权限的用户ID
        permissions: 完整的权限键列表，包含该用户拥有的所有权限
            例如：["attendance.clock", "attendance.view_own", "piece_work.entry", ...]
        
    Example:
        >>> emit_permission_update(
        ...     user_id=10,
        ...     permissions=[
        ...         "attendance.clock",
        ...         "attendance.view_own",
        ...         "piece_work.entry",
        ...         "piece_work.view_own",
        ...         "leave.apply",
        ...         "leave.view_own"
        ...     ]
        ... )
    """
    # 构建事件负载
    # Requirements: 6.2 - 事件负载包含用户ID、完整的权限对象
    event_data = {
        "user_id": user_id,
        "permissions": permissions
    }
    
    # 创建 SSE 事件
    event = SSEEvent(
        event_type=SSEEventType.PERMISSION_UPDATE,
        target_user_ids=[user_id],
        data=event_data
    )
    
    # 推送事件到队列
    push_event(event)


def emit_user_update(
    user_id: int,
    role: str,
    is_active: bool,
    updated_at: str,
    action: str = "update"
) -> None:
    """
    触发用户状态更新事件
    
    当管理员修改用户的角色或状态（启用/禁用）时，向该用户推送 user_update 事件，
    让用户及时了解账号状态变更。如果账号被禁用，前端应强制登出用户。
    
    目标用户：被修改状态的用户
    
    Requirements: 7.1, 7.2 - 用户状态实时通知
    
    Args:
        user_id: 被修改状态的用户ID
        role: 用户角色（driver/manager/dispatcher/boss/super_admin）
        is_active: 用户是否启用
        updated_at: 更新时间（ISO格式字符串）
        action: 操作类型，默认为 "update"，可选值：
            - "update": 用户信息更新（角色变更等）
            - "disable": 用户被禁用
        
    Example:
        >>> emit_user_update(
        ...     user_id=10,
        ...     role="driver",
        ...     is_active=True,
        ...     updated_at="2025-12-27T10:00:00",
        ...     action="update"
        ... )
        
        >>> # 用户被禁用时
        >>> emit_user_update(
        ...     user_id=10,
        ...     role="driver",
        ...     is_active=False,
        ...     updated_at="2025-12-27T10:00:00",
        ...     action="disable"
        ... )
    """
    # 构建用户状态数据负载
    # Requirements: 7.2 - 事件负载包含用户ID、变更类型、新的状态值
    user_data = {
        "id": user_id,
        "role": role,
        "is_active": is_active,
        "updated_at": updated_at
    }
    
    # 构建事件负载
    event_data = {
        "action": action,
        "user": user_data
    }
    
    # 创建 SSE 事件
    event = SSEEvent(
        event_type=SSEEventType.USER_UPDATE,
        target_user_ids=[user_id],
        data=event_data
    )
    
    # 推送事件到队列
    push_event(event)
