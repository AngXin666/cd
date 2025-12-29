"""
SSE 事件属性测试
Property-Based Testing for SSE Event System

**Feature: unified-realtime-system**

测试属性：
- Property 1: 事件类型分发正确性 (Validates: Requirements 1.1, 1.2)
- Property 2: 事件负载完整性 (Validates: Requirements 2.2, 3.2, 4.3, 5.3, 6.2, 7.2)
- Property 3: 事件路由正确性 (Validates: Requirements 8.1, 8.2, 8.3)
- Property 4: 车辆审批事件触发 (Validates: Requirements 2.1, 2.4)
- Property 5: 请假审批事件触发 (Validates: Requirements 3.1, 3.4)
- Property 6: 计件记录事件触发 (Validates: Requirements 4.1, 4.2)
- Property 7: 仓库分配事件触发 (Validates: Requirements 5.1, 5.2)

本模块使用 hypothesis 进行属性测试，验证：
1. 任意事件类型都能正确格式化为 SSE 消息 (Requirements 1.1, 1.2)
2. 车辆更新事件负载包含所有必需字段 (Requirements 2.2)
3. 请假更新事件负载包含所有必需字段 (Requirements 3.2)
4. 计件更新事件负载包含所有必需字段 (Requirements 4.3)
5. 仓库分配更新事件负载包含所有必需字段 (Requirements 5.3)
6. 权限更新事件负载包含所有必需字段 (Requirements 6.2)
7. 用户更新事件负载包含所有必需字段 (Requirements 7.2)
8. 事件只推送给目标用户 (Requirements 8.1, 8.2, 8.3)
9. 仓库分配事件正确触发并推送给目标用户 (Requirements 5.1, 5.2)
"""

from datetime import datetime, date
from typing import Dict, List, Any, Optional
from hypothesis import given, strategies as st, settings, assume
import json

# 导入事件模块
from events import SSEEvent, SSEEventType


# ==================== 数据生成策略 ====================

# 车辆状态枚举（与 models.py 中的 VehicleStatus 保持一致）
VEHICLE_STATUSES = ["active", "returned", "reviewing"]

# 请假状态枚举
LEAVE_STATUSES = ["pending", "approved", "rejected"]

# 请假类型枚举
LEAVE_TYPES = ["leave", "resignation"]

# 计件记录状态枚举
PIECE_WORK_STATUSES = ["pending", "approved", "rejected"]

# 用户角色枚举
USER_ROLES = ["driver", "manager", "boss"]

# 事件动作类型
EVENT_ACTIONS = ["create", "update", "delete"]


def vehicle_data_strategy():
    """
    生成车辆数据的策略
    
    生成符合 VehicleUpdateEvent 接口的车辆数据
    Requirements: 2.2 - 车辆事件负载包含完整数据
    """
    return st.fixed_dictionaries({
        "action": st.sampled_from(EVENT_ACTIONS),
        "vehicle": st.fixed_dictionaries({
            "id": st.integers(min_value=1, max_value=10000),
            "license_plate": st.text(
                alphabet=st.sampled_from("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"),
                min_size=5,
                max_size=10
            ),
            "brand": st.text(min_size=1, max_size=20).filter(lambda x: x.strip() != ""),
            "model": st.text(min_size=1, max_size=20).filter(lambda x: x.strip() != ""),
            "color": st.text(min_size=1, max_size=10).filter(lambda x: x.strip() != ""),
            "status": st.sampled_from(VEHICLE_STATUSES),
            "user_id": st.integers(min_value=1, max_value=10000),
            "updated_at": st.just(datetime.now().isoformat())
        })
    })


def leave_data_strategy():
    """
    生成请假数据的策略
    
    生成符合 LeaveUpdateEvent 接口的请假数据
    Requirements: 3.2 - 请假事件负载包含完整数据
    """
    return st.fixed_dictionaries({
        "action": st.sampled_from(["create", "update"]),
        "leave": st.fixed_dictionaries({
            "id": st.integers(min_value=1, max_value=10000),
            "user_id": st.integers(min_value=1, max_value=10000),
            "leave_type": st.sampled_from(LEAVE_TYPES),
            "start_date": st.just(date.today().isoformat()),
            "end_date": st.just(date.today().isoformat()),
            "status": st.sampled_from(LEAVE_STATUSES),
            "approver_id": st.one_of(st.none(), st.integers(min_value=1, max_value=10000)),
            "approve_remark": st.one_of(st.none(), st.text(min_size=0, max_size=100)),
            "updated_at": st.just(datetime.now().isoformat())
        })
    })


def piece_work_data_strategy():
    """
    生成计件数据的策略
    
    生成符合 PieceWorkUpdateEvent 接口的计件数据
    Requirements: 4.3 - 计件事件负载包含完整数据
    """
    return st.fixed_dictionaries({
        "action": st.sampled_from(["create", "update"]),
        "record": st.fixed_dictionaries({
            "id": st.integers(min_value=1, max_value=10000),
            "user_id": st.integers(min_value=1, max_value=10000),
            "user_name": st.text(min_size=1, max_size=20).filter(lambda x: x.strip() != ""),
            "warehouse_id": st.integers(min_value=1, max_value=1000),
            "warehouse_name": st.text(min_size=1, max_size=50).filter(lambda x: x.strip() != ""),
            "category_id": st.integers(min_value=1, max_value=100),
            "category_name": st.text(min_size=1, max_size=30).filter(lambda x: x.strip() != ""),
            "quantity": st.integers(min_value=1, max_value=10000),
            "amount": st.floats(min_value=0.01, max_value=100000.0, allow_nan=False, allow_infinity=False),
            "work_date": st.just(date.today().isoformat()),
            "status": st.sampled_from(PIECE_WORK_STATUSES)
        })
    })


def assignment_data_strategy():
    """
    生成仓库分配数据的策略
    
    生成符合 AssignmentUpdateEvent 接口的仓库分配数据
    Requirements: 5.3 - 仓库分配事件负载包含完整数据
    """
    # 生成仓库列表
    warehouse_strategy = st.fixed_dictionaries({
        "id": st.integers(min_value=1, max_value=1000),
        "name": st.text(min_size=1, max_size=50).filter(lambda x: x.strip() != ""),
        "address": st.text(min_size=0, max_size=100)
    })
    
    return st.fixed_dictionaries({
        "user_id": st.integers(min_value=1, max_value=10000),
        "assignment_type": st.sampled_from(["driver", "manager"]),
        "warehouses": st.lists(warehouse_strategy, min_size=0, max_size=10)
    })


def permission_data_strategy():
    """
    生成权限数据的策略
    
    生成符合 PermissionUpdateEvent 接口的权限数据
    Requirements: 6.2 - 权限事件负载包含完整数据
    """
    return st.fixed_dictionaries({
        "user_id": st.integers(min_value=1, max_value=10000),
        "permissions": st.fixed_dictionaries({
            "can_approve_leave": st.booleans(),
            "can_approve_vehicle": st.booleans(),
            "can_manage_piece_work": st.booleans(),
            "can_manage_users": st.booleans(),
            "can_manage_warehouses": st.booleans()
        })
    })


def user_data_strategy():
    """
    生成用户状态数据的策略
    
    生成符合 UserUpdateEvent 接口的用户数据
    Requirements: 7.2 - 用户事件负载包含完整数据
    """
    return st.fixed_dictionaries({
        "action": st.sampled_from(["update", "disable"]),
        "user": st.fixed_dictionaries({
            "id": st.integers(min_value=1, max_value=10000),
            "role": st.sampled_from(USER_ROLES),
            "is_active": st.booleans(),
            "updated_at": st.just(datetime.now().isoformat())
        })
    })


# ==================== 属性测试 ====================

# ==================== Property 1: 事件类型分发正确性 ====================

def format_sse_message(event: SSEEvent) -> str:
    """
    将 SSE 事件格式化为 SSE 消息字符串
    
    模拟后端 notification_event_generator 中的消息格式化逻辑
    格式：event: <事件类型>\ndata: <JSON数据>\n\n
    
    Args:
        event: SSE 事件对象
        
    Returns:
        str: 格式化后的 SSE 消息字符串
    """
    event_type = event.event_type.value
    event_data = event.data
    return f"event: {event_type}\ndata: {json.dumps(event_data, ensure_ascii=False, default=str)}\n\n"


def parse_sse_message(message: str) -> Dict[str, Any]:
    """
    解析 SSE 消息字符串
    
    从 SSE 消息中提取事件类型和数据
    
    Args:
        message: SSE 消息字符串
        
    Returns:
        Dict[str, Any]: 包含 event_type 和 data 的字典
    """
    lines = message.strip().split('\n')
    result = {}
    
    for line in lines:
        if line.startswith('event: '):
            result['event_type'] = line[7:]  # 去掉 'event: ' 前缀
        elif line.startswith('data: '):
            result['data'] = json.loads(line[6:])  # 去掉 'data: ' 前缀并解析 JSON
    
    return result


# 所有业务事件类型列表
ALL_BUSINESS_EVENT_TYPES = [
    SSEEventType.VEHICLE_UPDATE,
    SSEEventType.LEAVE_UPDATE,
    SSEEventType.PIECE_WORK_UPDATE,
    SSEEventType.ASSIGNMENT_UPDATE,
    SSEEventType.PERMISSION_UPDATE,
    SSEEventType.USER_UPDATE,
]

# 所有事件类型列表（包括系统事件）
ALL_EVENT_TYPES = [
    SSEEventType.NOTIFICATION,
    SSEEventType.HEARTBEAT,
] + ALL_BUSINESS_EVENT_TYPES


@settings(max_examples=100, deadline=10000)
@given(
    event_type=st.sampled_from(ALL_EVENT_TYPES),
    data=st.dictionaries(
        keys=st.text(min_size=1, max_size=20).filter(lambda x: x.strip() != "" and x.isidentifier()),
        values=st.one_of(
            st.integers(min_value=-10000, max_value=10000),
            st.text(min_size=0, max_size=50),
            st.booleans(),
            st.floats(min_value=-1000, max_value=1000, allow_nan=False, allow_infinity=False),
            st.none()
        ),
        min_size=0,
        max_size=10
    )
)
def test_property_event_type_dispatch_correctness(event_type: SSEEventType, data: Dict[str, Any]):
    """
    **Feature: unified-realtime-system, Property 1: 事件类型分发正确性**
    **Validates: Requirements 1.1, 1.2**
    
    属性：任意事件类型都能正确格式化为 SSE 消息
    
    验证：
    - 任意事件类型都能生成有效的 SSE 消息格式
    - SSE 消息包含正确的 event 和 data 字段
    - 解析后的事件类型与原始类型一致
    - 解析后的数据与原始数据一致
    """
    # 创建 SSE 事件
    event = SSEEvent(
        event_type=event_type,
        target_user_ids=[1],
        data=data
    )
    
    # 格式化为 SSE 消息
    sse_message = format_sse_message(event)
    
    # 验证 SSE 消息格式
    # SSE 消息应该以 "event: " 开头
    assert sse_message.startswith("event: "), \
        f"SSE 消息应以 'event: ' 开头，实际为: {sse_message[:20]}"
    
    # SSE 消息应该包含 "\ndata: "
    assert "\ndata: " in sse_message, \
        f"SSE 消息应包含 '\\ndata: '，实际为: {sse_message}"
    
    # SSE 消息应该以 "\n\n" 结尾
    assert sse_message.endswith("\n\n"), \
        f"SSE 消息应以 '\\n\\n' 结尾，实际为: {sse_message[-10:]}"
    
    # 解析 SSE 消息
    parsed = parse_sse_message(sse_message)
    
    # 验证解析后的事件类型正确
    assert parsed["event_type"] == event_type.value, \
        f"解析后的事件类型应为 {event_type.value}，实际为 {parsed['event_type']}"
    
    # 验证解析后的数据正确
    assert parsed["data"] == data, \
        f"解析后的数据应与原始数据一致"


@settings(max_examples=100, deadline=10000)
@given(
    event_type=st.sampled_from(ALL_BUSINESS_EVENT_TYPES)
)
def test_property_business_event_type_values(event_type: SSEEventType):
    """
    **Feature: unified-realtime-system, Property 1: 事件类型分发正确性 - 事件类型值**
    **Validates: Requirements 1.1, 1.2**
    
    属性：所有业务事件类型都有正确的字符串值
    
    验证：
    - 事件类型的 value 属性是有效的字符串
    - 事件类型值符合命名规范（小写字母和下划线）
    """
    # 获取事件类型值
    type_value = event_type.value
    
    # 验证是字符串
    assert isinstance(type_value, str), \
        f"事件类型值应为字符串，实际为 {type(type_value)}"
    
    # 验证非空
    assert len(type_value) > 0, \
        "事件类型值不应为空"
    
    # 验证命名规范（小写字母和下划线）
    assert type_value.islower() or '_' in type_value, \
        f"事件类型值应为小写字母和下划线，实际为 {type_value}"
    
    # 验证不包含空格
    assert ' ' not in type_value, \
        f"事件类型值不应包含空格，实际为 {type_value}"


@settings(max_examples=50, deadline=10000)
@given(
    event_type=st.sampled_from(ALL_EVENT_TYPES),
    special_chars=st.text(
        alphabet=st.sampled_from('中文测试数据特殊字符!@#$%^&*()[]{}|;:,.<>?'),
        min_size=1,
        max_size=20
    )
)
def test_property_sse_message_unicode_support(event_type: SSEEventType, special_chars: str):
    """
    **Feature: unified-realtime-system, Property 1: 事件类型分发正确性 - Unicode 支持**
    **Validates: Requirements 1.1, 1.2**
    
    属性：SSE 消息格式化支持 Unicode 字符（包括中文）
    
    验证：
    - 包含中文和特殊字符的数据能正确格式化
    - 格式化后的消息能正确解析回原始数据
    """
    # 创建包含特殊字符的数据
    data = {
        "message": special_chars,
        "title": f"测试标题: {special_chars[:5]}",
        "id": 12345
    }
    
    # 创建 SSE 事件
    event = SSEEvent(
        event_type=event_type,
        target_user_ids=[1],
        data=data
    )
    
    # 格式化为 SSE 消息
    sse_message = format_sse_message(event)
    
    # 验证消息格式正确
    assert sse_message.startswith("event: "), \
        "SSE 消息应以 'event: ' 开头"
    assert "\ndata: " in sse_message, \
        "SSE 消息应包含 '\\ndata: '"
    
    # 解析消息
    parsed = parse_sse_message(sse_message)
    
    # 验证数据正确还原
    assert parsed["data"]["message"] == special_chars, \
        f"特殊字符应正确还原，原始: {special_chars}，解析后: {parsed['data']['message']}"
    assert parsed["data"]["title"] == data["title"], \
        "标题应正确还原"


@settings(max_examples=50, deadline=10000)
@given(
    event_type=st.sampled_from(ALL_EVENT_TYPES),
    nested_data=st.fixed_dictionaries({
        "level1": st.fixed_dictionaries({
            "level2": st.fixed_dictionaries({
                "value": st.integers(min_value=1, max_value=1000),
                "name": st.text(min_size=1, max_size=10).filter(lambda x: x.strip() != "")
            }),
            "list": st.lists(st.integers(min_value=1, max_value=100), min_size=0, max_size=5)
        }),
        "simple": st.text(min_size=1, max_size=20).filter(lambda x: x.strip() != "")
    })
)
def test_property_sse_message_nested_data(event_type: SSEEventType, nested_data: Dict[str, Any]):
    """
    **Feature: unified-realtime-system, Property 1: 事件类型分发正确性 - 嵌套数据**
    **Validates: Requirements 1.1, 1.2**
    
    属性：SSE 消息格式化支持嵌套数据结构
    
    验证：
    - 嵌套的字典和列表能正确格式化
    - 格式化后的消息能正确解析回原始嵌套结构
    """
    # 创建 SSE 事件
    event = SSEEvent(
        event_type=event_type,
        target_user_ids=[1],
        data=nested_data
    )
    
    # 格式化为 SSE 消息
    sse_message = format_sse_message(event)
    
    # 解析消息
    parsed = parse_sse_message(sse_message)
    
    # 验证嵌套结构正确还原
    assert parsed["data"] == nested_data, \
        f"嵌套数据应正确还原"
    
    # 验证深层嵌套值
    assert parsed["data"]["level1"]["level2"]["value"] == nested_data["level1"]["level2"]["value"], \
        "深层嵌套值应正确还原"
    assert parsed["data"]["level1"]["list"] == nested_data["level1"]["list"], \
        "嵌套列表应正确还原"


@settings(max_examples=100, deadline=10000)
@given(
    event_type=st.sampled_from(ALL_EVENT_TYPES)
)
def test_property_sse_message_empty_data(event_type: SSEEventType):
    """
    **Feature: unified-realtime-system, Property 1: 事件类型分发正确性 - 空数据**
    **Validates: Requirements 1.1, 1.2**
    
    属性：SSE 消息格式化支持空数据
    
    验证：
    - 空字典数据能正确格式化
    - 格式化后的消息能正确解析
    """
    # 创建空数据的 SSE 事件
    event = SSEEvent(
        event_type=event_type,
        target_user_ids=[1],
        data={}
    )
    
    # 格式化为 SSE 消息
    sse_message = format_sse_message(event)
    
    # 验证消息格式正确
    assert sse_message.startswith("event: "), \
        "SSE 消息应以 'event: ' 开头"
    assert "\ndata: {}" in sse_message, \
        "空数据应格式化为 '{}'"
    
    # 解析消息
    parsed = parse_sse_message(sse_message)
    
    # 验证空数据正确还原
    assert parsed["data"] == {}, \
        "空数据应正确还原为空字典"


@settings(max_examples=50, deadline=10000)
@given(
    event_type=st.sampled_from(ALL_BUSINESS_EVENT_TYPES),
    target_user_ids=st.lists(
        st.integers(min_value=1, max_value=10000),
        min_size=1,
        max_size=10,
        unique=True
    )
)
def test_property_sse_event_target_users_preserved(
    event_type: SSEEventType,
    target_user_ids: List[int]
):
    """
    **Feature: unified-realtime-system, Property 1: 事件类型分发正确性 - 目标用户保留**
    **Validates: Requirements 1.1, 1.2**
    
    属性：SSE 事件的目标用户列表在序列化过程中保持不变
    
    验证：
    - 创建事件时指定的目标用户列表在 to_dict() 后保持一致
    - 目标用户列表的顺序和内容都正确
    """
    # 创建 SSE 事件
    event = SSEEvent(
        event_type=event_type,
        target_user_ids=target_user_ids,
        data={"test": "data"}
    )
    
    # 序列化事件
    serialized = event.to_dict()
    
    # 验证目标用户列表保持一致
    assert serialized["target_user_ids"] == target_user_ids, \
        f"目标用户列表应保持一致，原始: {target_user_ids}，序列化后: {serialized['target_user_ids']}"
    
    # 验证列表长度一致
    assert len(serialized["target_user_ids"]) == len(target_user_ids), \
        "目标用户列表长度应一致"


# ==================== Property 2: 事件负载完整性 ====================

@settings(max_examples=50, deadline=10000)
@given(vehicle_data=vehicle_data_strategy())
def test_property_vehicle_event_payload_completeness(vehicle_data: Dict[str, Any]):
    """
    **Feature: unified-realtime-system, Property 2: 事件负载完整性 - 车辆更新**
    **Validates: Requirements 2.2**
    
    属性：任意车辆数据序列化为事件负载后，应该包含所有必需字段
    
    验证：
    - action 字段存在且为有效值
    - vehicle 对象包含 id, license_plate, brand, model, color, status, user_id, updated_at
    """
    # 创建 SSE 事件
    event = SSEEvent(
        event_type=SSEEventType.VEHICLE_UPDATE,
        target_user_ids=[1],
        data=vehicle_data
    )
    
    # 序列化事件
    serialized = event.to_dict()
    
    # 验证事件类型
    assert serialized["event_type"] == "vehicle_update", \
        f"事件类型应为 vehicle_update，实际为 {serialized['event_type']}"
    
    # 验证数据负载存在
    assert "data" in serialized, "序列化结果应包含 data 字段"
    data = serialized["data"]
    
    # 验证 action 字段
    assert "action" in data, "车辆事件应包含 action 字段"
    assert data["action"] in EVENT_ACTIONS, \
        f"action 应为有效值，实际为 {data['action']}"
    
    # 验证 vehicle 对象
    assert "vehicle" in data, "车辆事件应包含 vehicle 对象"
    vehicle = data["vehicle"]
    
    # 验证车辆必需字段
    required_fields = ["id", "license_plate", "brand", "model", "color", "status", "user_id", "updated_at"]
    for field in required_fields:
        assert field in vehicle, f"车辆对象应包含 {field} 字段"
    
    # 验证字段类型
    assert isinstance(vehicle["id"], int), "id 应为整数"
    assert isinstance(vehicle["license_plate"], str), "license_plate 应为字符串"
    assert isinstance(vehicle["status"], str), "status 应为字符串"
    assert vehicle["status"] in VEHICLE_STATUSES, \
        f"status 应为有效状态，实际为 {vehicle['status']}"


@settings(max_examples=50, deadline=10000)
@given(leave_data=leave_data_strategy())
def test_property_leave_event_payload_completeness(leave_data: Dict[str, Any]):
    """
    **Feature: unified-realtime-system, Property 2: 事件负载完整性 - 请假更新**
    **Validates: Requirements 3.2**
    
    属性：任意请假数据序列化为事件负载后，应该包含所有必需字段
    
    验证：
    - action 字段存在且为有效值
    - leave 对象包含 id, user_id, leave_type, status, start_date, end_date 等
    """
    # 创建 SSE 事件
    event = SSEEvent(
        event_type=SSEEventType.LEAVE_UPDATE,
        target_user_ids=[1],
        data=leave_data
    )
    
    # 序列化事件
    serialized = event.to_dict()
    
    # 验证事件类型
    assert serialized["event_type"] == "leave_update", \
        f"事件类型应为 leave_update，实际为 {serialized['event_type']}"
    
    # 验证数据负载
    data = serialized["data"]
    
    # 验证 action 字段
    assert "action" in data, "请假事件应包含 action 字段"
    
    # 验证 leave 对象
    assert "leave" in data, "请假事件应包含 leave 对象"
    leave = data["leave"]
    
    # 验证请假必需字段
    required_fields = ["id", "user_id", "leave_type", "start_date", "end_date", "status", "updated_at"]
    for field in required_fields:
        assert field in leave, f"请假对象应包含 {field} 字段"
    
    # 验证字段类型和值
    assert isinstance(leave["id"], int), "id 应为整数"
    assert isinstance(leave["user_id"], int), "user_id 应为整数"
    assert leave["leave_type"] in LEAVE_TYPES, \
        f"leave_type 应为有效类型，实际为 {leave['leave_type']}"
    assert leave["status"] in LEAVE_STATUSES, \
        f"status 应为有效状态，实际为 {leave['status']}"


@settings(max_examples=50, deadline=10000)
@given(piece_work_data=piece_work_data_strategy())
def test_property_piece_work_event_payload_completeness(piece_work_data: Dict[str, Any]):
    """
    **Feature: unified-realtime-system, Property 2: 事件负载完整性 - 计件更新**
    **Validates: Requirements 4.3**
    
    属性：任意计件数据序列化为事件负载后，应该包含所有必需字段
    
    验证：
    - action 字段存在且为有效值
    - record 对象包含 id, user_id, user_name, warehouse_id, category_id, quantity, amount 等
    """
    # 创建 SSE 事件
    event = SSEEvent(
        event_type=SSEEventType.PIECE_WORK_UPDATE,
        target_user_ids=[1],
        data=piece_work_data
    )
    
    # 序列化事件
    serialized = event.to_dict()
    
    # 验证事件类型
    assert serialized["event_type"] == "piece_work_update", \
        f"事件类型应为 piece_work_update，实际为 {serialized['event_type']}"
    
    # 验证数据负载
    data = serialized["data"]
    
    # 验证 action 字段
    assert "action" in data, "计件事件应包含 action 字段"
    
    # 验证 record 对象
    assert "record" in data, "计件事件应包含 record 对象"
    record = data["record"]
    
    # 验证计件必需字段
    required_fields = [
        "id", "user_id", "user_name", "warehouse_id", "warehouse_name",
        "category_id", "category_name", "quantity", "amount", "work_date", "status"
    ]
    for field in required_fields:
        assert field in record, f"计件对象应包含 {field} 字段"
    
    # 验证字段类型
    assert isinstance(record["id"], int), "id 应为整数"
    assert isinstance(record["quantity"], int), "quantity 应为整数"
    assert isinstance(record["amount"], (int, float)), "amount 应为数字"
    assert record["amount"] >= 0, "amount 应为非负数"


@settings(max_examples=50, deadline=10000)
@given(assignment_data=assignment_data_strategy())
def test_property_assignment_event_payload_completeness(assignment_data: Dict[str, Any]):
    """
    **Feature: unified-realtime-system, Property 2: 事件负载完整性 - 仓库分配更新**
    **Validates: Requirements 5.3**
    
    属性：任意仓库分配数据序列化为事件负载后，应该包含所有必需字段
    
    验证：
    - user_id 字段存在
    - assignment_type 字段存在且为有效值
    - warehouses 数组存在，每个仓库包含 id, name, address
    """
    # 创建 SSE 事件
    event = SSEEvent(
        event_type=SSEEventType.ASSIGNMENT_UPDATE,
        target_user_ids=[1],
        data=assignment_data
    )
    
    # 序列化事件
    serialized = event.to_dict()
    
    # 验证事件类型
    assert serialized["event_type"] == "assignment_update", \
        f"事件类型应为 assignment_update，实际为 {serialized['event_type']}"
    
    # 验证数据负载
    data = serialized["data"]
    
    # 验证必需字段
    assert "user_id" in data, "仓库分配事件应包含 user_id 字段"
    assert isinstance(data["user_id"], int), "user_id 应为整数"
    
    assert "assignment_type" in data, "仓库分配事件应包含 assignment_type 字段"
    assert data["assignment_type"] in ["driver", "manager"], \
        f"assignment_type 应为 driver 或 manager，实际为 {data['assignment_type']}"
    
    assert "warehouses" in data, "仓库分配事件应包含 warehouses 字段"
    assert isinstance(data["warehouses"], list), "warehouses 应为数组"
    
    # 验证每个仓库对象
    for warehouse in data["warehouses"]:
        assert "id" in warehouse, "仓库对象应包含 id 字段"
        assert "name" in warehouse, "仓库对象应包含 name 字段"
        assert "address" in warehouse, "仓库对象应包含 address 字段"
        assert isinstance(warehouse["id"], int), "仓库 id 应为整数"


@settings(max_examples=50, deadline=10000)
@given(permission_data=permission_data_strategy())
def test_property_permission_event_payload_completeness(permission_data: Dict[str, Any]):
    """
    **Feature: unified-realtime-system, Property 2: 事件负载完整性 - 权限更新**
    **Validates: Requirements 6.2**
    
    属性：任意权限数据序列化为事件负载后，应该包含所有必需字段
    
    验证：
    - user_id 字段存在
    - permissions 对象存在，包含各项权限的布尔值
    """
    # 创建 SSE 事件
    event = SSEEvent(
        event_type=SSEEventType.PERMISSION_UPDATE,
        target_user_ids=[1],
        data=permission_data
    )
    
    # 序列化事件
    serialized = event.to_dict()
    
    # 验证事件类型
    assert serialized["event_type"] == "permission_update", \
        f"事件类型应为 permission_update，实际为 {serialized['event_type']}"
    
    # 验证数据负载
    data = serialized["data"]
    
    # 验证必需字段
    assert "user_id" in data, "权限事件应包含 user_id 字段"
    assert isinstance(data["user_id"], int), "user_id 应为整数"
    
    assert "permissions" in data, "权限事件应包含 permissions 字段"
    permissions = data["permissions"]
    assert isinstance(permissions, dict), "permissions 应为对象"
    
    # 验证权限字段
    permission_fields = [
        "can_approve_leave",
        "can_approve_vehicle",
        "can_manage_piece_work",
        "can_manage_users",
        "can_manage_warehouses"
    ]
    for field in permission_fields:
        assert field in permissions, f"权限对象应包含 {field} 字段"
        assert isinstance(permissions[field], bool), f"{field} 应为布尔值"


@settings(max_examples=50, deadline=10000)
@given(user_data=user_data_strategy())
def test_property_user_event_payload_completeness(user_data: Dict[str, Any]):
    """
    **Feature: unified-realtime-system, Property 2: 事件负载完整性 - 用户更新**
    **Validates: Requirements 7.2**
    
    属性：任意用户数据序列化为事件负载后，应该包含所有必需字段
    
    验证：
    - action 字段存在且为有效值
    - user 对象包含 id, role, is_active, updated_at
    """
    # 创建 SSE 事件
    event = SSEEvent(
        event_type=SSEEventType.USER_UPDATE,
        target_user_ids=[1],
        data=user_data
    )
    
    # 序列化事件
    serialized = event.to_dict()
    
    # 验证事件类型
    assert serialized["event_type"] == "user_update", \
        f"事件类型应为 user_update，实际为 {serialized['event_type']}"
    
    # 验证数据负载
    data = serialized["data"]
    
    # 验证 action 字段
    assert "action" in data, "用户事件应包含 action 字段"
    assert data["action"] in ["update", "disable"], \
        f"action 应为 update 或 disable，实际为 {data['action']}"
    
    # 验证 user 对象
    assert "user" in data, "用户事件应包含 user 对象"
    user = data["user"]
    
    # 验证用户必需字段
    required_fields = ["id", "role", "is_active", "updated_at"]
    for field in required_fields:
        assert field in user, f"用户对象应包含 {field} 字段"
    
    # 验证字段类型
    assert isinstance(user["id"], int), "id 应为整数"
    assert user["role"] in USER_ROLES, \
        f"role 应为有效角色，实际为 {user['role']}"
    assert isinstance(user["is_active"], bool), "is_active 应为布尔值"


@settings(max_examples=50, deadline=10000)
@given(
    event_type=st.sampled_from([
        SSEEventType.VEHICLE_UPDATE,
        SSEEventType.LEAVE_UPDATE,
        SSEEventType.PIECE_WORK_UPDATE,
        SSEEventType.ASSIGNMENT_UPDATE,
        SSEEventType.PERMISSION_UPDATE,
        SSEEventType.USER_UPDATE
    ]),
    target_user_ids=st.lists(st.integers(min_value=1, max_value=10000), min_size=1, max_size=10)
)
def test_property_sse_event_serialization_completeness(
    event_type: SSEEventType,
    target_user_ids: List[int]
):
    """
    **Feature: unified-realtime-system, Property 2: 事件负载完整性 - 通用序列化**
    **Validates: Requirements 2.2, 3.2, 4.3, 5.3, 6.2, 7.2**
    
    属性：任意 SSE 事件序列化后，应该包含所有基础字段
    
    验证：
    - event_type 字段存在且正确
    - target_user_ids 字段存在且为数组
    - data 字段存在
    - created_at 字段存在且为有效时间格式
    """
    # 创建 SSE 事件
    event = SSEEvent(
        event_type=event_type,
        target_user_ids=target_user_ids,
        data={"test": "data"}
    )
    
    # 序列化事件
    serialized = event.to_dict()
    
    # 验证基础字段存在
    assert "event_type" in serialized, "序列化结果应包含 event_type 字段"
    assert "target_user_ids" in serialized, "序列化结果应包含 target_user_ids 字段"
    assert "data" in serialized, "序列化结果应包含 data 字段"
    assert "created_at" in serialized, "序列化结果应包含 created_at 字段"
    
    # 验证 event_type 值正确
    assert serialized["event_type"] == event_type.value, \
        f"event_type 应为 {event_type.value}，实际为 {serialized['event_type']}"
    
    # 验证 target_user_ids 是数组
    assert isinstance(serialized["target_user_ids"], list), \
        "target_user_ids 应为数组"
    assert serialized["target_user_ids"] == target_user_ids, \
        "target_user_ids 应与输入一致"
    
    # 验证 created_at 是有效的 ISO 格式时间
    try:
        datetime.fromisoformat(serialized["created_at"])
    except ValueError:
        assert False, f"created_at 应为有效的 ISO 时间格式，实际为 {serialized['created_at']}"
    
    # 验证可以 JSON 序列化
    try:
        json.dumps(serialized)
    except (TypeError, ValueError) as e:
        assert False, f"序列化结果应可以 JSON 编码，错误: {e}"


# ==================== Property 3: 事件路由正确性测试 ====================

@settings(max_examples=100, deadline=10000)
@given(
    target_user_ids=st.lists(
        st.integers(min_value=1, max_value=1000),
        min_size=1,
        max_size=10,
        unique=True
    ),
    non_target_user_ids=st.lists(
        st.integers(min_value=1001, max_value=2000),
        min_size=1,
        max_size=10,
        unique=True
    ),
    event_type=st.sampled_from([
        SSEEventType.VEHICLE_UPDATE,
        SSEEventType.LEAVE_UPDATE,
        SSEEventType.PIECE_WORK_UPDATE,
        SSEEventType.ASSIGNMENT_UPDATE,
        SSEEventType.PERMISSION_UPDATE,
        SSEEventType.USER_UPDATE
    ])
)
def test_property_event_routing_correctness(
    target_user_ids: List[int],
    non_target_user_ids: List[int],
    event_type: SSEEventType
):
    """
    **Feature: unified-realtime-system, Property 3: 事件路由正确性**
    **Validates: Requirements 8.1, 8.2, 8.3**
    
    属性：事件只推送给目标用户，不推送给无关用户
    
    验证：
    - 目标用户能够收到推送的事件
    - 非目标用户不会收到任何事件
    - 事件内容与推送的内容一致
    """
    # 导入事件队列函数
    from events import push_event, pop_events, clear_queue
    
    # 清空队列，确保测试环境干净
    clear_queue()
    
    # 创建测试事件
    test_data = {"test_key": "test_value", "event_id": 12345}
    event = SSEEvent(
        event_type=event_type,
        target_user_ids=target_user_ids,
        data=test_data
    )
    
    # 推送事件
    push_event(event)
    
    # 验证目标用户能收到事件
    for user_id in target_user_ids:
        events = pop_events(user_id)
        assert len(events) == 1, \
            f"目标用户 {user_id} 应该收到 1 个事件，实际收到 {len(events)} 个"
        
        received_event = events[0]
        assert received_event.event_type == event_type, \
            f"事件类型应为 {event_type}，实际为 {received_event.event_type}"
        assert received_event.data == test_data, \
            f"事件数据应与推送数据一致"
    
    # 验证非目标用户不会收到事件
    for user_id in non_target_user_ids:
        events = pop_events(user_id)
        assert len(events) == 0, \
            f"非目标用户 {user_id} 不应该收到任何事件，实际收到 {len(events)} 个"
    
    # 清理测试环境
    clear_queue()


@settings(max_examples=100, deadline=10000)
@given(
    user_id=st.integers(min_value=1, max_value=10000),
    num_events=st.integers(min_value=1, max_value=20)
)
def test_property_event_queue_fifo_order(user_id: int, num_events: int):
    """
    **Feature: unified-realtime-system, Property 3: 事件路由正确性 - FIFO 顺序**
    **Validates: Requirements 8.1, 8.2**
    
    属性：事件队列按照先进先出（FIFO）顺序推送
    
    验证：
    - 多个事件推送后，pop_events 返回的顺序与推送顺序一致
    """
    from events import push_event, pop_events, clear_queue
    
    # 清空队列
    clear_queue()
    
    # 推送多个事件
    pushed_events = []
    for i in range(num_events):
        event = SSEEvent(
            event_type=SSEEventType.NOTIFICATION,
            target_user_ids=[user_id],
            data={"sequence": i, "message": f"Event {i}"}
        )
        push_event(event)
        pushed_events.append(event)
    
    # 获取事件
    received_events = pop_events(user_id)
    
    # 验证数量一致
    assert len(received_events) == num_events, \
        f"应该收到 {num_events} 个事件，实际收到 {len(received_events)} 个"
    
    # 验证顺序一致（FIFO）
    for i, (pushed, received) in enumerate(zip(pushed_events, received_events)):
        assert received.data["sequence"] == i, \
            f"第 {i} 个事件的 sequence 应为 {i}，实际为 {received.data['sequence']}"
        assert received.data == pushed.data, \
            f"第 {i} 个事件的数据应与推送数据一致"
    
    # 清理
    clear_queue()


@settings(max_examples=50, deadline=10000)
@given(
    user_id=st.integers(min_value=1, max_value=10000)
)
def test_property_event_queue_pop_clears_queue(user_id: int):
    """
    **Feature: unified-realtime-system, Property 3: 事件路由正确性 - 队列清空**
    **Validates: Requirements 8.2**
    
    属性：pop_events 后队列应该被清空
    
    验证：
    - 第一次 pop_events 返回所有事件
    - 第二次 pop_events 返回空列表
    """
    from events import push_event, pop_events, clear_queue, get_queue_size
    
    # 清空队列
    clear_queue()
    
    # 推送事件
    event = SSEEvent(
        event_type=SSEEventType.VEHICLE_UPDATE,
        target_user_ids=[user_id],
        data={"test": "data"}
    )
    push_event(event)
    
    # 验证队列有事件
    assert get_queue_size(user_id) == 1, "推送后队列应有 1 个事件"
    
    # 第一次 pop
    events = pop_events(user_id)
    assert len(events) == 1, "第一次 pop 应返回 1 个事件"
    
    # 验证队列已清空
    assert get_queue_size(user_id) == 0, "pop 后队列应为空"
    
    # 第二次 pop 应返回空列表
    events_again = pop_events(user_id)
    assert len(events_again) == 0, "第二次 pop 应返回空列表"
    
    # 清理
    clear_queue()


@settings(max_examples=50, deadline=10000)
@given(
    user_id=st.integers(min_value=1, max_value=10000),
    num_events=st.integers(min_value=101, max_value=150)
)
def test_property_event_queue_overflow_protection(user_id: int, num_events: int):
    """
    **Feature: unified-realtime-system, Property 3: 事件路由正确性 - 溢出保护**
    **Validates: Requirements 8.1, 8.4**
    
    属性：队列溢出时丢弃最旧的事件，保留最新的事件
    
    验证：
    - 推送超过 MAX_QUEUE_SIZE (100) 个事件后，队列大小不超过 100
    - 保留的是最新的 100 个事件
    """
    from events import push_event, pop_events, clear_queue, get_queue_size, MAX_QUEUE_SIZE
    
    # 清空队列
    clear_queue()
    
    # 推送超过限制的事件
    for i in range(num_events):
        event = SSEEvent(
            event_type=SSEEventType.NOTIFICATION,
            target_user_ids=[user_id],
            data={"sequence": i}
        )
        push_event(event)
    
    # 验证队列大小不超过限制
    queue_size = get_queue_size(user_id)
    assert queue_size <= MAX_QUEUE_SIZE, \
        f"队列大小应不超过 {MAX_QUEUE_SIZE}，实际为 {queue_size}"
    
    # 获取事件
    events = pop_events(user_id)
    
    # 验证保留的是最新的事件
    assert len(events) == MAX_QUEUE_SIZE, \
        f"应该保留 {MAX_QUEUE_SIZE} 个事件，实际保留 {len(events)} 个"
    
    # 验证最旧的事件被丢弃（sequence 从 num_events - MAX_QUEUE_SIZE 开始）
    expected_start_sequence = num_events - MAX_QUEUE_SIZE
    for i, event in enumerate(events):
        expected_sequence = expected_start_sequence + i
        assert event.data["sequence"] == expected_sequence, \
            f"第 {i} 个事件的 sequence 应为 {expected_sequence}，实际为 {event.data['sequence']}"
    
    # 清理
    clear_queue()


@settings(max_examples=100, deadline=10000)
@given(
    user_ids=st.lists(
        st.integers(min_value=1, max_value=1000),
        min_size=2,
        max_size=10,
        unique=True
    ),
    event_type=st.sampled_from([
        SSEEventType.VEHICLE_UPDATE,
        SSEEventType.LEAVE_UPDATE,
        SSEEventType.PIECE_WORK_UPDATE
    ])
)
def test_property_event_broadcast_to_multiple_users(
    user_ids: List[int],
    event_type: SSEEventType
):
    """
    **Feature: unified-realtime-system, Property 3: 事件路由正确性 - 多用户广播**
    **Validates: Requirements 8.1, 8.3**
    
    属性：一个事件可以同时推送给多个目标用户
    
    验证：
    - 所有目标用户都能收到相同的事件
    - 事件内容对所有用户一致
    """
    from events import push_event, pop_events, clear_queue
    
    # 清空队列
    clear_queue()
    
    # 创建事件，目标为多个用户
    test_data = {"broadcast_id": 99999, "message": "Broadcast message"}
    event = SSEEvent(
        event_type=event_type,
        target_user_ids=user_ids,
        data=test_data
    )
    
    # 推送事件
    push_event(event)
    
    # 验证所有目标用户都收到事件
    for user_id in user_ids:
        events = pop_events(user_id)
        assert len(events) == 1, \
            f"用户 {user_id} 应该收到 1 个事件，实际收到 {len(events)} 个"
        
        received_event = events[0]
        assert received_event.event_type == event_type, \
            f"用户 {user_id} 收到的事件类型应为 {event_type}"
        assert received_event.data == test_data, \
            f"用户 {user_id} 收到的事件数据应与推送数据一致"
    
    # 清理
    clear_queue()


@settings(max_examples=50, deadline=10000)
@given(
    user_id=st.integers(min_value=1, max_value=10000)
)
def test_property_empty_target_users_no_effect(user_id: int):
    """
    **Feature: unified-realtime-system, Property 3: 事件路由正确性 - 空目标用户**
    **Validates: Requirements 8.4**
    
    属性：目标用户列表为空时，事件不会推送给任何人
    
    验证：
    - 空目标用户列表的事件不会影响任何用户的队列
    """
    from events import push_event, pop_events, clear_queue, get_queue_size
    
    # 清空队列
    clear_queue()
    
    # 创建空目标用户的事件
    event = SSEEvent(
        event_type=SSEEventType.NOTIFICATION,
        target_user_ids=[],  # 空目标用户列表
        data={"test": "data"}
    )
    
    # 推送事件
    push_event(event)
    
    # 验证任意用户都不会收到事件
    events = pop_events(user_id)
    assert len(events) == 0, \
        f"空目标用户的事件不应该推送给任何人，用户 {user_id} 收到 {len(events)} 个事件"
    
    # 清理
    clear_queue()


@settings(max_examples=50, deadline=10000)
@given(
    user_id=st.integers(min_value=1, max_value=10000),
    event_types=st.lists(
        st.sampled_from([
            SSEEventType.VEHICLE_UPDATE,
            SSEEventType.LEAVE_UPDATE,
            SSEEventType.PIECE_WORK_UPDATE,
            SSEEventType.ASSIGNMENT_UPDATE,
            SSEEventType.PERMISSION_UPDATE,
            SSEEventType.USER_UPDATE
        ]),
        min_size=1,
        max_size=6
    )
)
def test_property_multiple_event_types_routing(user_id: int, event_types: List[SSEEventType]):
    """
    **Feature: unified-realtime-system, Property 3: 事件路由正确性 - 多类型事件**
    **Validates: Requirements 8.1, 8.2, 8.3**
    
    属性：不同类型的事件都能正确路由到目标用户
    
    验证：
    - 多种类型的事件都能推送到同一用户
    - 事件类型在接收时保持正确
    """
    from events import push_event, pop_events, clear_queue
    
    # 清空队列
    clear_queue()
    
    # 推送多种类型的事件
    for i, event_type in enumerate(event_types):
        event = SSEEvent(
            event_type=event_type,
            target_user_ids=[user_id],
            data={"index": i, "type": event_type.value}
        )
        push_event(event)
    
    # 获取事件
    events = pop_events(user_id)
    
    # 验证数量一致
    assert len(events) == len(event_types), \
        f"应该收到 {len(event_types)} 个事件，实际收到 {len(events)} 个"
    
    # 验证事件类型正确
    for i, (expected_type, received_event) in enumerate(zip(event_types, events)):
        assert received_event.event_type == expected_type, \
            f"第 {i} 个事件类型应为 {expected_type}，实际为 {received_event.event_type}"
        assert received_event.data["type"] == expected_type.value, \
            f"第 {i} 个事件数据中的 type 应为 {expected_type.value}"
    
    # 清理
    clear_queue()


# ==================== Property 4: 车辆审批事件触发 ====================

@settings(max_examples=100, deadline=10000)
@given(
    vehicle_id=st.integers(min_value=1, max_value=100000),
    license_plate=st.text(
        alphabet=st.sampled_from("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789京沪粤苏浙鲁川陕"),
        min_size=5,
        max_size=10
    ).filter(lambda x: x.strip() != ""),
    brand=st.one_of(st.none(), st.text(min_size=1, max_size=20).filter(lambda x: x.strip() != "")),
    model=st.one_of(st.none(), st.text(min_size=1, max_size=20).filter(lambda x: x.strip() != "")),
    color=st.one_of(st.none(), st.text(min_size=1, max_size=10).filter(lambda x: x.strip() != "")),
    status=st.sampled_from(VEHICLE_STATUSES),
    user_id=st.integers(min_value=1, max_value=100000),
    warehouse_id=st.one_of(st.none(), st.integers(min_value=1, max_value=10000)),
    ownership_type=st.one_of(st.none(), st.sampled_from(["company", "personal", "rental"])),
    target_user_id=st.integers(min_value=1, max_value=100000),
    action=st.sampled_from(EVENT_ACTIONS)
)
def test_property_vehicle_approval_event_trigger(
    vehicle_id: int,
    license_plate: str,
    brand: Optional[str],
    model: Optional[str],
    color: Optional[str],
    status: str,
    user_id: int,
    warehouse_id: Optional[int],
    ownership_type: Optional[str],
    target_user_id: int,
    action: str
):
    """
    **Feature: unified-realtime-system, Property 4: 车辆审批事件触发**
    **Validates: Requirements 2.1, 2.4**
    
    属性：任意车辆审批操作，系统应该向车辆所有者推送包含完整车辆数据的 vehicle_update 事件
    
    验证：
    - emit_vehicle_update 调用后，目标用户队列中有事件
    - 事件类型为 vehicle_update
    - 事件负载包含完整的车辆数据（id, license_plate, brand, model, color, status, user_id 等）
    - 事件只推送给目标用户（车辆所有者）
    """
    from events import emit_vehicle_update, pop_events, clear_queue, get_queue_size
    
    # 清空队列，确保测试环境干净
    clear_queue()
    
    # 生成时间戳
    created_at = datetime.now().isoformat()
    updated_at = datetime.now().isoformat()
    
    # 调用 emit_vehicle_update 触发车辆更新事件
    emit_vehicle_update(
        vehicle_id=vehicle_id,
        license_plate=license_plate,
        brand=brand,
        model=model,
        color=color,
        status=status,
        user_id=user_id,
        warehouse_id=warehouse_id,
        ownership_type=ownership_type,
        created_at=created_at,
        updated_at=updated_at,
        target_user_id=target_user_id,
        action=action
    )
    
    # 验证目标用户队列中有事件
    queue_size = get_queue_size(target_user_id)
    assert queue_size == 1, \
        f"目标用户 {target_user_id} 的队列应有 1 个事件，实际有 {queue_size} 个"
    
    # 获取事件
    events = pop_events(target_user_id)
    assert len(events) == 1, \
        f"应该收到 1 个事件，实际收到 {len(events)} 个"
    
    event = events[0]
    
    # 验证事件类型
    assert event.event_type == SSEEventType.VEHICLE_UPDATE, \
        f"事件类型应为 VEHICLE_UPDATE，实际为 {event.event_type}"
    
    # 验证事件数据结构
    assert "action" in event.data, "事件数据应包含 action 字段"
    assert event.data["action"] == action, \
        f"action 应为 {action}，实际为 {event.data['action']}"
    
    assert "vehicle" in event.data, "事件数据应包含 vehicle 对象"
    vehicle = event.data["vehicle"]
    
    # 验证车辆数据完整性（Requirements 2.2）
    assert vehicle["id"] == vehicle_id, \
        f"vehicle.id 应为 {vehicle_id}，实际为 {vehicle['id']}"
    assert vehicle["license_plate"] == license_plate, \
        f"vehicle.license_plate 应为 {license_plate}，实际为 {vehicle['license_plate']}"
    assert vehicle["brand"] == brand, \
        f"vehicle.brand 应为 {brand}，实际为 {vehicle['brand']}"
    assert vehicle["model"] == model, \
        f"vehicle.model 应为 {model}，实际为 {vehicle['model']}"
    assert vehicle["color"] == color, \
        f"vehicle.color 应为 {color}，实际为 {vehicle['color']}"
    assert vehicle["status"] == status, \
        f"vehicle.status 应为 {status}，实际为 {vehicle['status']}"
    assert vehicle["user_id"] == user_id, \
        f"vehicle.user_id 应为 {user_id}，实际为 {vehicle['user_id']}"
    assert vehicle["warehouse_id"] == warehouse_id, \
        f"vehicle.warehouse_id 应为 {warehouse_id}，实际为 {vehicle['warehouse_id']}"
    assert vehicle["ownership_type"] == ownership_type, \
        f"vehicle.ownership_type 应为 {ownership_type}，实际为 {vehicle['ownership_type']}"
    assert vehicle["created_at"] == created_at, \
        f"vehicle.created_at 应为 {created_at}，实际为 {vehicle['created_at']}"
    assert vehicle["updated_at"] == updated_at, \
        f"vehicle.updated_at 应为 {updated_at}，实际为 {vehicle['updated_at']}"
    
    # 清理测试环境
    clear_queue()


@settings(max_examples=50, deadline=10000)
@given(
    vehicle_id=st.integers(min_value=1, max_value=100000),
    license_plate=st.text(
        alphabet=st.sampled_from("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"),
        min_size=5,
        max_size=10
    ).filter(lambda x: x.strip() != ""),
    target_user_id=st.integers(min_value=1, max_value=1000),
    non_target_user_id=st.integers(min_value=1001, max_value=2000)
)
def test_property_vehicle_event_only_to_owner(
    vehicle_id: int,
    license_plate: str,
    target_user_id: int,
    non_target_user_id: int
):
    """
    **Feature: unified-realtime-system, Property 4: 车辆审批事件触发 - 仅推送给车主**
    **Validates: Requirements 2.1, 2.4**
    
    属性：车辆审批事件只推送给车辆所有者，不推送给其他用户
    
    验证：
    - 目标用户（车辆所有者）能收到事件
    - 非目标用户不会收到任何事件
    """
    from events import emit_vehicle_update, pop_events, clear_queue
    
    # 清空队列
    clear_queue()
    
    # 触发车辆更新事件
    emit_vehicle_update(
        vehicle_id=vehicle_id,
        license_plate=license_plate,
        brand="测试品牌",
        model="测试型号",
        color="白色",
        status="active",
        user_id=target_user_id,
        warehouse_id=1,
        ownership_type="company",
        created_at=datetime.now().isoformat(),
        updated_at=datetime.now().isoformat(),
        target_user_id=target_user_id,
        action="update"
    )
    
    # 验证目标用户收到事件
    target_events = pop_events(target_user_id)
    assert len(target_events) == 1, \
        f"目标用户 {target_user_id} 应该收到 1 个事件，实际收到 {len(target_events)} 个"
    
    # 验证非目标用户没有收到事件
    non_target_events = pop_events(non_target_user_id)
    assert len(non_target_events) == 0, \
        f"非目标用户 {non_target_user_id} 不应该收到任何事件，实际收到 {len(non_target_events)} 个"
    
    # 清理
    clear_queue()


@settings(max_examples=50, deadline=10000)
@given(
    vehicle_id=st.integers(min_value=1, max_value=100000),
    license_plate=st.text(
        alphabet=st.sampled_from("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"),
        min_size=5,
        max_size=10
    ).filter(lambda x: x.strip() != ""),
    target_user_id=st.integers(min_value=1, max_value=100000),
    status=st.sampled_from(["active", "returned", "reviewing"])
)
def test_property_vehicle_approval_status_change(
    vehicle_id: int,
    license_plate: str,
    target_user_id: int,
    status: str
):
    """
    **Feature: unified-realtime-system, Property 4: 车辆审批事件触发 - 状态变更**
    **Validates: Requirements 2.1, 2.4**
    
    属性：车辆审批状态变更时，事件负载中的状态字段正确反映新状态
    
    验证：
    - 审批通过（active）、拒绝（returned）、审核中（reviewing）状态都能正确推送
    - 事件中的 status 字段与审批结果一致
    """
    from events import emit_vehicle_update, pop_events, clear_queue
    
    # 清空队列
    clear_queue()
    
    # 触发车辆更新事件（模拟审批操作）
    emit_vehicle_update(
        vehicle_id=vehicle_id,
        license_plate=license_plate,
        brand="测试品牌",
        model="测试型号",
        color="白色",
        status=status,  # 审批后的状态
        user_id=target_user_id,
        warehouse_id=1,
        ownership_type="company",
        created_at=datetime.now().isoformat(),
        updated_at=datetime.now().isoformat(),
        target_user_id=target_user_id,
        action="update"
    )
    
    # 获取事件
    events = pop_events(target_user_id)
    assert len(events) == 1, "应该收到 1 个事件"
    
    event = events[0]
    
    # 验证状态字段正确
    assert event.data["vehicle"]["status"] == status, \
        f"车辆状态应为 {status}，实际为 {event.data['vehicle']['status']}"
    
    # 验证状态是有效的审批状态
    assert status in VEHICLE_STATUSES, \
        f"状态 {status} 应为有效的车辆状态"
    
    # 清理
    clear_queue()


@settings(max_examples=50, deadline=10000)
@given(
    vehicle_id=st.integers(min_value=1, max_value=100000),
    license_plate=st.text(
        alphabet=st.sampled_from("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789京沪粤苏浙鲁川陕"),
        min_size=5,
        max_size=10
    ).filter(lambda x: x.strip() != ""),
    target_user_id=st.integers(min_value=1, max_value=100000),
    num_approvals=st.integers(min_value=2, max_value=5)
)
def test_property_multiple_vehicle_approvals(
    vehicle_id: int,
    license_plate: str,
    target_user_id: int,
    num_approvals: int
):
    """
    **Feature: unified-realtime-system, Property 4: 车辆审批事件触发 - 多次审批**
    **Validates: Requirements 2.1, 2.4**
    
    属性：多次车辆审批操作，每次都会生成独立的事件
    
    验证：
    - 多次调用 emit_vehicle_update 会生成多个事件
    - 每个事件都是独立的，包含对应的审批数据
    """
    from events import emit_vehicle_update, pop_events, clear_queue, get_queue_size
    
    # 清空队列
    clear_queue()
    
    # 模拟多次审批操作
    statuses = ["reviewing", "active", "returned", "reviewing", "active"][:num_approvals]
    
    for i, approval_status in enumerate(statuses):
        emit_vehicle_update(
            vehicle_id=vehicle_id,
            license_plate=license_plate,
            brand=f"品牌{i}",
            model=f"型号{i}",
            color="白色",
            status=approval_status,
            user_id=target_user_id,
            warehouse_id=1,
            ownership_type="company",
            created_at=datetime.now().isoformat(),
            updated_at=datetime.now().isoformat(),
            target_user_id=target_user_id,
            action="update"
        )
    
    # 验证队列中有正确数量的事件
    queue_size = get_queue_size(target_user_id)
    assert queue_size == num_approvals, \
        f"队列应有 {num_approvals} 个事件，实际有 {queue_size} 个"
    
    # 获取所有事件
    events = pop_events(target_user_id)
    assert len(events) == num_approvals, \
        f"应该收到 {num_approvals} 个事件，实际收到 {len(events)} 个"
    
    # 验证每个事件的状态与对应的审批状态一致
    for i, (event, expected_status) in enumerate(zip(events, statuses)):
        assert event.data["vehicle"]["status"] == expected_status, \
            f"第 {i+1} 个事件的状态应为 {expected_status}，实际为 {event.data['vehicle']['status']}"
        assert event.data["vehicle"]["brand"] == f"品牌{i}", \
            f"第 {i+1} 个事件的品牌应为 '品牌{i}'"
    
    # 清理
    clear_queue()


@settings(max_examples=50, deadline=10000)
@given(
    vehicle_id=st.integers(min_value=1, max_value=100000),
    license_plate=st.text(
        alphabet=st.sampled_from("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"),
        min_size=5,
        max_size=10
    ).filter(lambda x: x.strip() != ""),
    target_user_id=st.integers(min_value=1, max_value=100000)
)
def test_property_vehicle_event_serializable(
    vehicle_id: int,
    license_plate: str,
    target_user_id: int
):
    """
    **Feature: unified-realtime-system, Property 4: 车辆审批事件触发 - 可序列化**
    **Validates: Requirements 2.1, 2.4**
    
    属性：车辆审批事件可以正确序列化为 JSON 格式
    
    验证：
    - 事件可以通过 to_dict() 序列化
    - 序列化后的数据可以通过 json.dumps() 编码
    - 编码后的 JSON 可以正确解码回原始数据
    """
    from events import emit_vehicle_update, pop_events, clear_queue
    
    # 清空队列
    clear_queue()
    
    # 触发车辆更新事件
    emit_vehicle_update(
        vehicle_id=vehicle_id,
        license_plate=license_plate,
        brand="测试品牌",
        model="测试型号",
        color="白色",
        status="active",
        user_id=target_user_id,
        warehouse_id=1,
        ownership_type="company",
        created_at=datetime.now().isoformat(),
        updated_at=datetime.now().isoformat(),
        target_user_id=target_user_id,
        action="update"
    )
    
    # 获取事件
    events = pop_events(target_user_id)
    assert len(events) == 1, "应该收到 1 个事件"
    
    event = events[0]
    
    # 验证可以序列化
    serialized = event.to_dict()
    assert isinstance(serialized, dict), "to_dict() 应返回字典"
    
    # 验证可以 JSON 编码
    try:
        json_str = json.dumps(serialized, ensure_ascii=False)
        assert isinstance(json_str, str), "json.dumps() 应返回字符串"
    except (TypeError, ValueError) as e:
        assert False, f"事件应可以 JSON 编码，错误: {e}"
    
    # 验证可以 JSON 解码
    try:
        decoded = json.loads(json_str)
        assert decoded == serialized, "JSON 解码后应与原始数据一致"
    except json.JSONDecodeError as e:
        assert False, f"JSON 应可以解码，错误: {e}"
    
    # 验证解码后的数据结构正确
    assert decoded["event_type"] == "vehicle_update", \
        "解码后的 event_type 应为 vehicle_update"
    assert decoded["data"]["vehicle"]["id"] == vehicle_id, \
        "解码后的 vehicle.id 应正确"
    assert decoded["data"]["vehicle"]["license_plate"] == license_plate, \
        "解码后的 vehicle.license_plate 应正确"
    
    # 清理
    clear_queue()


# ==================== Property 5: 请假审批事件触发 ====================

@settings(max_examples=100, deadline=10000)
@given(
    leave_id=st.integers(min_value=1, max_value=100000),
    user_id=st.integers(min_value=1, max_value=100000),
    leave_type=st.sampled_from(LEAVE_TYPES),
    start_date=st.just(date.today().isoformat()),
    end_date=st.just(date.today().isoformat()),
    status=st.sampled_from(LEAVE_STATUSES),
    reason=st.one_of(st.none(), st.text(min_size=1, max_size=100).filter(lambda x: x.strip() != "")),
    approver_id=st.one_of(st.none(), st.integers(min_value=1, max_value=100000)),
    approve_remark=st.one_of(st.none(), st.text(min_size=0, max_size=200)),
    target_user_ids=st.lists(
        st.integers(min_value=1, max_value=100000),
        min_size=1,
        max_size=5,
        unique=True
    ),
    action=st.sampled_from(["create", "update"])
)
def test_property_leave_approval_event_trigger(
    leave_id: int,
    user_id: int,
    leave_type: str,
    start_date: str,
    end_date: str,
    status: str,
    reason: Optional[str],
    approver_id: Optional[int],
    approve_remark: Optional[str],
    target_user_ids: List[int],
    action: str
):
    """
    **Feature: unified-realtime-system, Property 5: 请假审批事件触发**
    **Validates: Requirements 3.1, 3.4**
    
    属性：任意请假审批操作，系统应该向申请人推送包含完整申请数据的 leave_update 事件
    
    验证：
    - emit_leave_update 调用后，目标用户队列中有事件
    - 事件类型为 leave_update
    - 事件负载包含完整的请假数据（id, user_id, leave_type, status, approver_id 等）
    - 事件推送给所有目标用户（申请人 + 车队长）
    """
    from events import emit_leave_update, pop_events, clear_queue, get_queue_size
    
    # 清空队列，确保测试环境干净
    clear_queue()
    
    # 生成时间戳
    created_at = datetime.now().isoformat()
    updated_at = datetime.now().isoformat()
    
    # 调用 emit_leave_update 触发请假更新事件
    emit_leave_update(
        leave_id=leave_id,
        user_id=user_id,
        leave_type=leave_type,
        start_date=start_date,
        end_date=end_date,
        status=status,
        reason=reason,
        approver_id=approver_id,
        approve_remark=approve_remark,
        created_at=created_at,
        updated_at=updated_at,
        target_user_ids=target_user_ids,
        action=action
    )
    
    # 验证所有目标用户队列中都有事件
    for target_user_id in target_user_ids:
        queue_size = get_queue_size(target_user_id)
        assert queue_size == 1, \
            f"目标用户 {target_user_id} 的队列应有 1 个事件，实际有 {queue_size} 个"
        
        # 获取事件
        events = pop_events(target_user_id)
        assert len(events) == 1, \
            f"应该收到 1 个事件，实际收到 {len(events)} 个"
        
        event = events[0]
        
        # 验证事件类型
        assert event.event_type == SSEEventType.LEAVE_UPDATE, \
            f"事件类型应为 LEAVE_UPDATE，实际为 {event.event_type}"
        
        # 验证事件数据结构
        assert "action" in event.data, "事件数据应包含 action 字段"
        assert event.data["action"] == action, \
            f"action 应为 {action}，实际为 {event.data['action']}"
        
        assert "leave" in event.data, "事件数据应包含 leave 对象"
        leave = event.data["leave"]
        
        # 验证请假数据完整性（Requirements 3.2）
        assert leave["id"] == leave_id, \
            f"leave.id 应为 {leave_id}，实际为 {leave['id']}"
        assert leave["user_id"] == user_id, \
            f"leave.user_id 应为 {user_id}，实际为 {leave['user_id']}"
        assert leave["leave_type"] == leave_type, \
            f"leave.leave_type 应为 {leave_type}，实际为 {leave['leave_type']}"
        assert leave["start_date"] == start_date, \
            f"leave.start_date 应为 {start_date}，实际为 {leave['start_date']}"
        assert leave["end_date"] == end_date, \
            f"leave.end_date 应为 {end_date}，实际为 {leave['end_date']}"
        assert leave["status"] == status, \
            f"leave.status 应为 {status}，实际为 {leave['status']}"
        assert leave["reason"] == reason, \
            f"leave.reason 应为 {reason}，实际为 {leave['reason']}"
        assert leave["approver_id"] == approver_id, \
            f"leave.approver_id 应为 {approver_id}，实际为 {leave['approver_id']}"
        assert leave["approve_remark"] == approve_remark, \
            f"leave.approve_remark 应为 {approve_remark}，实际为 {leave['approve_remark']}"
        assert leave["created_at"] == created_at, \
            f"leave.created_at 应为 {created_at}，实际为 {leave['created_at']}"
        assert leave["updated_at"] == updated_at, \
            f"leave.updated_at 应为 {updated_at}，实际为 {leave['updated_at']}"
    
    # 清理测试环境
    clear_queue()


@settings(max_examples=50, deadline=10000)
@given(
    leave_id=st.integers(min_value=1, max_value=100000),
    applicant_id=st.integers(min_value=1, max_value=1000),
    manager_id=st.integers(min_value=1001, max_value=2000),
    non_target_user_id=st.integers(min_value=2001, max_value=3000)
)
def test_property_leave_event_to_applicant_and_manager(
    leave_id: int,
    applicant_id: int,
    manager_id: int,
    non_target_user_id: int
):
    """
    **Feature: unified-realtime-system, Property 5: 请假审批事件触发 - 推送给申请人和车队长**
    **Validates: Requirements 3.1, 3.4**
    
    属性：请假审批事件推送给申请人和对应仓库的车队长，不推送给其他用户
    
    验证：
    - 申请人能收到事件
    - 车队长能收到事件
    - 非目标用户不会收到任何事件
    """
    from events import emit_leave_update, pop_events, clear_queue
    
    # 清空队列
    clear_queue()
    
    # 目标用户：申请人 + 车队长
    target_user_ids = [applicant_id, manager_id]
    
    # 触发请假更新事件
    emit_leave_update(
        leave_id=leave_id,
        user_id=applicant_id,
        leave_type="leave",
        start_date=date.today().isoformat(),
        end_date=date.today().isoformat(),
        status="approved",
        reason="家中有事",
        approver_id=manager_id,
        approve_remark="同意",
        created_at=datetime.now().isoformat(),
        updated_at=datetime.now().isoformat(),
        target_user_ids=target_user_ids,
        action="update"
    )
    
    # 验证申请人收到事件
    applicant_events = pop_events(applicant_id)
    assert len(applicant_events) == 1, \
        f"申请人 {applicant_id} 应该收到 1 个事件，实际收到 {len(applicant_events)} 个"
    
    # 验证车队长收到事件
    manager_events = pop_events(manager_id)
    assert len(manager_events) == 1, \
        f"车队长 {manager_id} 应该收到 1 个事件，实际收到 {len(manager_events)} 个"
    
    # 验证非目标用户没有收到事件
    non_target_events = pop_events(non_target_user_id)
    assert len(non_target_events) == 0, \
        f"非目标用户 {non_target_user_id} 不应该收到任何事件，实际收到 {len(non_target_events)} 个"
    
    # 清理
    clear_queue()


@settings(max_examples=50, deadline=10000)
@given(
    leave_id=st.integers(min_value=1, max_value=100000),
    user_id=st.integers(min_value=1, max_value=100000),
    status=st.sampled_from(["pending", "approved", "rejected"])
)
def test_property_leave_approval_status_change(
    leave_id: int,
    user_id: int,
    status: str
):
    """
    **Feature: unified-realtime-system, Property 5: 请假审批事件触发 - 状态变更**
    **Validates: Requirements 3.1, 3.4**
    
    属性：请假审批状态变更时，事件负载中的状态字段正确反映新状态
    
    验证：
    - 待审批（pending）、已通过（approved）、已拒绝（rejected）状态都能正确推送
    - 事件中的 status 字段与审批结果一致
    """
    from events import emit_leave_update, pop_events, clear_queue
    
    # 清空队列
    clear_queue()
    
    # 触发请假更新事件（模拟审批操作）
    emit_leave_update(
        leave_id=leave_id,
        user_id=user_id,
        leave_type="leave",
        start_date=date.today().isoformat(),
        end_date=date.today().isoformat(),
        status=status,  # 审批后的状态
        reason="测试原因",
        approver_id=100 if status != "pending" else None,
        approve_remark="审批备注" if status != "pending" else None,
        created_at=datetime.now().isoformat(),
        updated_at=datetime.now().isoformat(),
        target_user_ids=[user_id],
        action="update"
    )
    
    # 获取事件
    events = pop_events(user_id)
    assert len(events) == 1, "应该收到 1 个事件"
    
    event = events[0]
    
    # 验证状态字段正确
    assert event.data["leave"]["status"] == status, \
        f"请假状态应为 {status}，实际为 {event.data['leave']['status']}"
    
    # 验证状态是有效的审批状态
    assert status in LEAVE_STATUSES, \
        f"状态 {status} 应为有效的请假状态"
    
    # 清理
    clear_queue()


@settings(max_examples=50, deadline=10000)
@given(
    leave_id=st.integers(min_value=1, max_value=100000),
    user_id=st.integers(min_value=1, max_value=100000),
    leave_type=st.sampled_from(["leave", "resignation"])
)
def test_property_leave_type_correctness(
    leave_id: int,
    user_id: int,
    leave_type: str
):
    """
    **Feature: unified-realtime-system, Property 5: 请假审批事件触发 - 请假类型**
    **Validates: Requirements 3.1, 3.4**
    
    属性：不同类型的请假申请（请假/离职）都能正确推送
    
    验证：
    - 普通请假（leave）和离职申请（resignation）都能正确推送
    - 事件中的 leave_type 字段与申请类型一致
    """
    from events import emit_leave_update, pop_events, clear_queue
    
    # 清空队列
    clear_queue()
    
    # 触发请假更新事件
    emit_leave_update(
        leave_id=leave_id,
        user_id=user_id,
        leave_type=leave_type,
        start_date=date.today().isoformat(),
        end_date=date.today().isoformat(),
        status="pending",
        reason="测试原因",
        approver_id=None,
        approve_remark=None,
        created_at=datetime.now().isoformat(),
        updated_at=datetime.now().isoformat(),
        target_user_ids=[user_id],
        action="create"
    )
    
    # 获取事件
    events = pop_events(user_id)
    assert len(events) == 1, "应该收到 1 个事件"
    
    event = events[0]
    
    # 验证请假类型字段正确
    assert event.data["leave"]["leave_type"] == leave_type, \
        f"请假类型应为 {leave_type}，实际为 {event.data['leave']['leave_type']}"
    
    # 验证类型是有效的请假类型
    assert leave_type in LEAVE_TYPES, \
        f"类型 {leave_type} 应为有效的请假类型"
    
    # 清理
    clear_queue()


@settings(max_examples=50, deadline=10000)
@given(
    user_id=st.integers(min_value=1, max_value=100000),
    num_applications=st.integers(min_value=2, max_value=5)
)
def test_property_multiple_leave_applications(
    user_id: int,
    num_applications: int
):
    """
    **Feature: unified-realtime-system, Property 5: 请假审批事件触发 - 多次申请**
    **Validates: Requirements 3.1, 3.4**
    
    属性：多次请假申请操作，每次都会生成独立的事件
    
    验证：
    - 多次调用 emit_leave_update 会生成多个事件
    - 每个事件都是独立的，包含对应的申请数据
    """
    from events import emit_leave_update, pop_events, clear_queue, get_queue_size
    
    # 清空队列
    clear_queue()
    
    # 模拟多次请假申请
    statuses = ["pending", "approved", "rejected", "pending", "approved"][:num_applications]
    
    for i, leave_status in enumerate(statuses):
        emit_leave_update(
            leave_id=i + 1,
            user_id=user_id,
            leave_type="leave",
            start_date=date.today().isoformat(),
            end_date=date.today().isoformat(),
            status=leave_status,
            reason=f"原因{i}",
            approver_id=100 if leave_status != "pending" else None,
            approve_remark=f"备注{i}" if leave_status != "pending" else None,
            created_at=datetime.now().isoformat(),
            updated_at=datetime.now().isoformat(),
            target_user_ids=[user_id],
            action="update" if leave_status != "pending" else "create"
        )
    
    # 验证队列中有正确数量的事件
    queue_size = get_queue_size(user_id)
    assert queue_size == num_applications, \
        f"队列应有 {num_applications} 个事件，实际有 {queue_size} 个"
    
    # 获取所有事件
    events = pop_events(user_id)
    assert len(events) == num_applications, \
        f"应该收到 {num_applications} 个事件，实际收到 {len(events)} 个"
    
    # 验证每个事件的状态与对应的申请状态一致
    for i, (event, expected_status) in enumerate(zip(events, statuses)):
        assert event.data["leave"]["status"] == expected_status, \
            f"第 {i+1} 个事件的状态应为 {expected_status}，实际为 {event.data['leave']['status']}"
        assert event.data["leave"]["id"] == i + 1, \
            f"第 {i+1} 个事件的 ID 应为 {i + 1}"
    
    # 清理
    clear_queue()


@settings(max_examples=50, deadline=10000)
@given(
    leave_id=st.integers(min_value=1, max_value=100000),
    user_id=st.integers(min_value=1, max_value=100000),
    reason=st.text(
        alphabet=st.sampled_from('中文测试数据特殊字符!@#$%^&*()[]{}|;:,.<>?'),
        min_size=1,
        max_size=50
    )
)
def test_property_leave_event_serializable(
    leave_id: int,
    user_id: int,
    reason: str
):
    """
    **Feature: unified-realtime-system, Property 5: 请假审批事件触发 - 可序列化**
    **Validates: Requirements 3.1, 3.4**
    
    属性：请假审批事件可以正确序列化为 JSON 格式，包括中文和特殊字符
    
    验证：
    - 事件可以通过 to_dict() 序列化
    - 序列化后的数据可以通过 json.dumps() 编码
    - 编码后的 JSON 可以正确解码回原始数据
    - 中文和特殊字符能正确处理
    """
    from events import emit_leave_update, pop_events, clear_queue
    
    # 清空队列
    clear_queue()
    
    # 触发请假更新事件（包含中文和特殊字符）
    emit_leave_update(
        leave_id=leave_id,
        user_id=user_id,
        leave_type="leave",
        start_date=date.today().isoformat(),
        end_date=date.today().isoformat(),
        status="pending",
        reason=reason,  # 包含中文和特殊字符
        approver_id=None,
        approve_remark=None,
        created_at=datetime.now().isoformat(),
        updated_at=datetime.now().isoformat(),
        target_user_ids=[user_id],
        action="create"
    )
    
    # 获取事件
    events = pop_events(user_id)
    assert len(events) == 1, "应该收到 1 个事件"
    
    event = events[0]
    
    # 验证可以序列化
    serialized = event.to_dict()
    assert isinstance(serialized, dict), "to_dict() 应返回字典"
    
    # 验证可以 JSON 编码
    try:
        json_str = json.dumps(serialized, ensure_ascii=False)
        assert isinstance(json_str, str), "json.dumps() 应返回字符串"
    except (TypeError, ValueError) as e:
        assert False, f"事件应可以 JSON 编码，错误: {e}"
    
    # 验证可以 JSON 解码
    try:
        decoded = json.loads(json_str)
        assert decoded == serialized, "JSON 解码后应与原始数据一致"
    except json.JSONDecodeError as e:
        assert False, f"JSON 应可以解码，错误: {e}"
    
    # 验证解码后的数据结构正确
    assert decoded["event_type"] == "leave_update", \
        "解码后的 event_type 应为 leave_update"
    assert decoded["data"]["leave"]["id"] == leave_id, \
        "解码后的 leave.id 应正确"
    assert decoded["data"]["leave"]["reason"] == reason, \
        "解码后的 leave.reason 应正确（包括中文和特殊字符）"
    
    # 清理
    clear_queue()


# ==================== Property 6: 计件记录事件触发 ====================

@settings(max_examples=100, deadline=10000)
@given(
    record_id=st.integers(min_value=1, max_value=100000),
    user_id=st.integers(min_value=1, max_value=100000),
    user_name=st.text(min_size=1, max_size=20).filter(lambda x: x.strip() != ""),
    warehouse_id=st.one_of(st.none(), st.integers(min_value=1, max_value=10000)),
    warehouse_name=st.one_of(st.none(), st.text(min_size=1, max_size=50).filter(lambda x: x.strip() != "")),
    category_id=st.integers(min_value=1, max_value=1000),
    category_name=st.text(min_size=1, max_size=30).filter(lambda x: x.strip() != ""),
    quantity=st.integers(min_value=1, max_value=10000),
    amount=st.floats(min_value=0.01, max_value=100000.0, allow_nan=False, allow_infinity=False),
    work_date=st.just(date.today().isoformat()),
    remark=st.one_of(st.none(), st.text(min_size=0, max_size=200)),
    target_user_ids=st.lists(
        st.integers(min_value=1, max_value=100000),
        min_size=1,
        max_size=5,
        unique=True
    ),
    action=st.sampled_from(["create", "update"])
)
def test_property_piece_work_event_trigger(
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
    target_user_ids: List[int],
    action: str
):
    """
    **Feature: unified-realtime-system, Property 6: 计件记录事件触发**
    **Validates: Requirements 4.1, 4.2**
    
    属性：任意计件记录操作，系统应该向目标用户推送包含完整计件数据的 piece_work_update 事件
    
    验证：
    - emit_piece_work_update 调用后，目标用户队列中有事件
    - 事件类型为 piece_work_update
    - 事件负载包含完整的计件数据（id, user_id, user_name, warehouse_id, category_id, quantity, amount 等）
    - 事件推送给所有目标用户（司机 + 对应仓库车队长）
    """
    from events import emit_piece_work_update, pop_events, clear_queue, get_queue_size
    
    # 清空队列，确保测试环境干净
    clear_queue()
    
    # 生成时间戳
    created_at = datetime.now().isoformat()
    
    # 调用 emit_piece_work_update 触发计件更新事件
    emit_piece_work_update(
        record_id=record_id,
        user_id=user_id,
        user_name=user_name,
        warehouse_id=warehouse_id,
        warehouse_name=warehouse_name,
        category_id=category_id,
        category_name=category_name,
        quantity=quantity,
        amount=amount,
        work_date=work_date,
        remark=remark,
        created_at=created_at,
        target_user_ids=target_user_ids,
        action=action
    )
    
    # 验证所有目标用户队列中都有事件
    for target_user_id in target_user_ids:
        queue_size = get_queue_size(target_user_id)
        assert queue_size == 1, \
            f"目标用户 {target_user_id} 的队列应有 1 个事件，实际有 {queue_size} 个"
        
        # 获取事件
        events = pop_events(target_user_id)
        assert len(events) == 1, \
            f"应该收到 1 个事件，实际收到 {len(events)} 个"
        
        event = events[0]
        
        # 验证事件类型
        assert event.event_type == SSEEventType.PIECE_WORK_UPDATE, \
            f"事件类型应为 PIECE_WORK_UPDATE，实际为 {event.event_type}"
        
        # 验证事件数据结构
        assert "action" in event.data, "事件数据应包含 action 字段"
        assert event.data["action"] == action, \
            f"action 应为 {action}，实际为 {event.data['action']}"
        
        assert "record" in event.data, "事件数据应包含 record 对象"
        record = event.data["record"]
        
        # 验证计件数据完整性（Requirements 4.3）
        assert record["id"] == record_id, \
            f"record.id 应为 {record_id}，实际为 {record['id']}"
        assert record["user_id"] == user_id, \
            f"record.user_id 应为 {user_id}，实际为 {record['user_id']}"
        assert record["user_name"] == user_name, \
            f"record.user_name 应为 {user_name}，实际为 {record['user_name']}"
        assert record["warehouse_id"] == warehouse_id, \
            f"record.warehouse_id 应为 {warehouse_id}，实际为 {record['warehouse_id']}"
        assert record["warehouse_name"] == warehouse_name, \
            f"record.warehouse_name 应为 {warehouse_name}，实际为 {record['warehouse_name']}"
        assert record["category_id"] == category_id, \
            f"record.category_id 应为 {category_id}，实际为 {record['category_id']}"
        assert record["category_name"] == category_name, \
            f"record.category_name 应为 {category_name}，实际为 {record['category_name']}"
        assert record["quantity"] == quantity, \
            f"record.quantity 应为 {quantity}，实际为 {record['quantity']}"
        assert record["amount"] == amount, \
            f"record.amount 应为 {amount}，实际为 {record['amount']}"
        assert record["work_date"] == work_date, \
            f"record.work_date 应为 {work_date}，实际为 {record['work_date']}"
        assert record["remark"] == remark, \
            f"record.remark 应为 {remark}，实际为 {record['remark']}"
        assert record["created_at"] == created_at, \
            f"record.created_at 应为 {created_at}，实际为 {record['created_at']}"
    
    # 清理测试环境
    clear_queue()


@settings(max_examples=50, deadline=10000)
@given(
    record_id=st.integers(min_value=1, max_value=100000),
    driver_id=st.integers(min_value=1, max_value=1000),
    manager_id=st.integers(min_value=1001, max_value=2000),
    non_target_user_id=st.integers(min_value=2001, max_value=3000)
)
def test_property_piece_work_event_to_driver_and_manager(
    record_id: int,
    driver_id: int,
    manager_id: int,
    non_target_user_id: int
):
    """
    **Feature: unified-realtime-system, Property 6: 计件记录事件触发 - 推送给司机和车队长**
    **Validates: Requirements 4.1, 4.2**
    
    属性：计件记录事件推送给司机和对应仓库的车队长，不推送给其他用户
    
    验证：
    - 司机能收到事件（Requirements 4.2 - 车队长审批后推送给司机）
    - 车队长能收到事件（Requirements 4.1 - 司机提交后推送给车队长）
    - 非目标用户不会收到任何事件
    """
    from events import emit_piece_work_update, pop_events, clear_queue
    
    # 清空队列
    clear_queue()
    
    # 目标用户：司机 + 车队长
    target_user_ids = [driver_id, manager_id]
    
    # 触发计件更新事件（模拟司机提交计件记录）
    emit_piece_work_update(
        record_id=record_id,
        user_id=driver_id,
        user_name="测试司机",
        warehouse_id=1,
        warehouse_name="测试仓库",
        category_id=1,
        category_name="搬运",
        quantity=100,
        amount=500.0,
        work_date=date.today().isoformat(),
        remark="正常工作",
        created_at=datetime.now().isoformat(),
        target_user_ids=target_user_ids,
        action="create"
    )
    
    # 验证司机收到事件
    driver_events = pop_events(driver_id)
    assert len(driver_events) == 1, \
        f"司机 {driver_id} 应该收到 1 个事件，实际收到 {len(driver_events)} 个"
    
    # 验证车队长收到事件
    manager_events = pop_events(manager_id)
    assert len(manager_events) == 1, \
        f"车队长 {manager_id} 应该收到 1 个事件，实际收到 {len(manager_events)} 个"
    
    # 验证非目标用户没有收到事件
    non_target_events = pop_events(non_target_user_id)
    assert len(non_target_events) == 0, \
        f"非目标用户 {non_target_user_id} 不应该收到任何事件，实际收到 {len(non_target_events)} 个"
    
    # 清理
    clear_queue()


@settings(max_examples=50, deadline=10000)
@given(
    record_id=st.integers(min_value=1, max_value=100000),
    user_id=st.integers(min_value=1, max_value=100000),
    action=st.sampled_from(["create", "update"])
)
def test_property_piece_work_action_correctness(
    record_id: int,
    user_id: int,
    action: str
):
    """
    **Feature: unified-realtime-system, Property 6: 计件记录事件触发 - 操作类型**
    **Validates: Requirements 4.1, 4.2**
    
    属性：计件记录的创建和更新操作都能正确推送
    
    验证：
    - 创建操作（create）：司机提交新记录时触发（Requirements 4.1）
    - 更新操作（update）：车队长审批/修改记录时触发（Requirements 4.2）
    - 事件中的 action 字段与操作类型一致
    """
    from events import emit_piece_work_update, pop_events, clear_queue
    
    # 清空队列
    clear_queue()
    
    # 触发计件更新事件
    emit_piece_work_update(
        record_id=record_id,
        user_id=user_id,
        user_name="测试用户",
        warehouse_id=1,
        warehouse_name="测试仓库",
        category_id=1,
        category_name="搬运",
        quantity=50,
        amount=250.0,
        work_date=date.today().isoformat(),
        remark=None,
        created_at=datetime.now().isoformat(),
        target_user_ids=[user_id],
        action=action
    )
    
    # 获取事件
    events = pop_events(user_id)
    assert len(events) == 1, "应该收到 1 个事件"
    
    event = events[0]
    
    # 验证 action 字段正确
    assert event.data["action"] == action, \
        f"action 应为 {action}，实际为 {event.data['action']}"
    
    # 验证 action 是有效的操作类型
    assert action in ["create", "update"], \
        f"action {action} 应为有效的操作类型"
    
    # 清理
    clear_queue()


@settings(max_examples=50, deadline=10000)
@given(
    user_id=st.integers(min_value=1, max_value=100000),
    num_records=st.integers(min_value=2, max_value=5)
)
def test_property_multiple_piece_work_records(
    user_id: int,
    num_records: int
):
    """
    **Feature: unified-realtime-system, Property 6: 计件记录事件触发 - 多次提交**
    **Validates: Requirements 4.1, 4.2**
    
    属性：多次计件记录操作，每次都会生成独立的事件
    
    验证：
    - 多次调用 emit_piece_work_update 会生成多个事件
    - 每个事件都是独立的，包含对应的记录数据
    """
    from events import emit_piece_work_update, pop_events, clear_queue, get_queue_size
    
    # 清空队列
    clear_queue()
    
    # 模拟多次计件记录提交
    actions = ["create", "update", "create", "update", "create"][:num_records]
    
    for i, record_action in enumerate(actions):
        emit_piece_work_update(
            record_id=i + 1,
            user_id=user_id,
            user_name=f"司机{i}",
            warehouse_id=1,
            warehouse_name="测试仓库",
            category_id=i + 1,
            category_name=f"分类{i}",
            quantity=(i + 1) * 10,
            amount=(i + 1) * 50.0,
            work_date=date.today().isoformat(),
            remark=f"备注{i}",
            created_at=datetime.now().isoformat(),
            target_user_ids=[user_id],
            action=record_action
        )
    
    # 验证队列中有正确数量的事件
    queue_size = get_queue_size(user_id)
    assert queue_size == num_records, \
        f"队列应有 {num_records} 个事件，实际有 {queue_size} 个"
    
    # 获取所有事件
    events = pop_events(user_id)
    assert len(events) == num_records, \
        f"应该收到 {num_records} 个事件，实际收到 {len(events)} 个"
    
    # 验证每个事件的数据与对应的记录一致
    for i, (event, expected_action) in enumerate(zip(events, actions)):
        assert event.data["action"] == expected_action, \
            f"第 {i+1} 个事件的 action 应为 {expected_action}，实际为 {event.data['action']}"
        assert event.data["record"]["id"] == i + 1, \
            f"第 {i+1} 个事件的 record.id 应为 {i + 1}"
        assert event.data["record"]["quantity"] == (i + 1) * 10, \
            f"第 {i+1} 个事件的 quantity 应为 {(i + 1) * 10}"
    
    # 清理
    clear_queue()


@settings(max_examples=50, deadline=10000)
@given(
    record_id=st.integers(min_value=1, max_value=100000),
    user_id=st.integers(min_value=1, max_value=100000),
    category_name=st.text(
        alphabet=st.sampled_from('中文测试数据特殊字符搬运装卸分拣!@#$%'),
        min_size=1,
        max_size=20
    ),
    remark=st.text(
        alphabet=st.sampled_from('中文备注测试数据特殊字符!@#$%^&*()'),
        min_size=1,
        max_size=50
    )
)
def test_property_piece_work_event_serializable(
    record_id: int,
    user_id: int,
    category_name: str,
    remark: str
):
    """
    **Feature: unified-realtime-system, Property 6: 计件记录事件触发 - 可序列化**
    **Validates: Requirements 4.1, 4.2**
    
    属性：计件记录事件可以正确序列化为 JSON 格式，包括中文和特殊字符
    
    验证：
    - 事件可以通过 to_dict() 序列化
    - 序列化后的数据可以通过 json.dumps() 编码
    - 编码后的 JSON 可以正确解码回原始数据
    - 中文和特殊字符能正确处理
    """
    from events import emit_piece_work_update, pop_events, clear_queue
    
    # 清空队列
    clear_queue()
    
    # 触发计件更新事件（包含中文和特殊字符）
    emit_piece_work_update(
        record_id=record_id,
        user_id=user_id,
        user_name="张三",
        warehouse_id=1,
        warehouse_name="北京仓库",
        category_id=1,
        category_name=category_name,  # 包含中文和特殊字符
        quantity=100,
        amount=500.0,
        work_date=date.today().isoformat(),
        remark=remark,  # 包含中文和特殊字符
        created_at=datetime.now().isoformat(),
        target_user_ids=[user_id],
        action="create"
    )
    
    # 获取事件
    events = pop_events(user_id)
    assert len(events) == 1, "应该收到 1 个事件"
    
    event = events[0]
    
    # 验证可以序列化
    serialized = event.to_dict()
    assert isinstance(serialized, dict), "to_dict() 应返回字典"
    
    # 验证可以 JSON 编码
    try:
        json_str = json.dumps(serialized, ensure_ascii=False)
        assert isinstance(json_str, str), "json.dumps() 应返回字符串"
    except (TypeError, ValueError) as e:
        assert False, f"事件应可以 JSON 编码，错误: {e}"
    
    # 验证可以 JSON 解码
    try:
        decoded = json.loads(json_str)
        assert decoded == serialized, "JSON 解码后应与原始数据一致"
    except json.JSONDecodeError as e:
        assert False, f"JSON 应可以解码，错误: {e}"
    
    # 验证解码后的数据结构正确
    assert decoded["event_type"] == "piece_work_update", \
        "解码后的 event_type 应为 piece_work_update"
    assert decoded["data"]["record"]["id"] == record_id, \
        "解码后的 record.id 应正确"
    assert decoded["data"]["record"]["category_name"] == category_name, \
        "解码后的 record.category_name 应正确（包括中文和特殊字符）"
    assert decoded["data"]["record"]["remark"] == remark, \
        "解码后的 record.remark 应正确（包括中文和特殊字符）"
    
    # 清理
    clear_queue()


@settings(max_examples=50, deadline=10000)
@given(
    record_id=st.integers(min_value=1, max_value=100000),
    user_id=st.integers(min_value=1, max_value=100000),
    quantity=st.integers(min_value=1, max_value=10000),
    amount=st.floats(min_value=0.01, max_value=100000.0, allow_nan=False, allow_infinity=False)
)
def test_property_piece_work_quantity_and_amount(
    record_id: int,
    user_id: int,
    quantity: int,
    amount: float
):
    """
    **Feature: unified-realtime-system, Property 6: 计件记录事件触发 - 数量和金额**
    **Validates: Requirements 4.1, 4.2**
    
    属性：计件记录的数量和金额字段正确传递
    
    验证：
    - quantity 字段为正整数
    - amount 字段为正浮点数
    - 数值在事件传递过程中保持精度
    """
    from events import emit_piece_work_update, pop_events, clear_queue
    
    # 清空队列
    clear_queue()
    
    # 触发计件更新事件
    emit_piece_work_update(
        record_id=record_id,
        user_id=user_id,
        user_name="测试司机",
        warehouse_id=1,
        warehouse_name="测试仓库",
        category_id=1,
        category_name="搬运",
        quantity=quantity,
        amount=amount,
        work_date=date.today().isoformat(),
        remark=None,
        created_at=datetime.now().isoformat(),
        target_user_ids=[user_id],
        action="create"
    )
    
    # 获取事件
    events = pop_events(user_id)
    assert len(events) == 1, "应该收到 1 个事件"
    
    event = events[0]
    record = event.data["record"]
    
    # 验证数量字段
    assert record["quantity"] == quantity, \
        f"quantity 应为 {quantity}，实际为 {record['quantity']}"
    assert isinstance(record["quantity"], int), \
        "quantity 应为整数类型"
    assert record["quantity"] > 0, \
        "quantity 应为正数"
    
    # 验证金额字段
    assert record["amount"] == amount, \
        f"amount 应为 {amount}，实际为 {record['amount']}"
    assert isinstance(record["amount"], (int, float)), \
        "amount 应为数字类型"
    assert record["amount"] > 0, \
        "amount 应为正数"
    
    # 清理
    clear_queue()


# ==================== Property 7: 仓库分配事件触发 ====================

@settings(max_examples=100, deadline=10000)
@given(
    user_id=st.integers(min_value=1, max_value=100000),
    warehouses=st.lists(
        st.fixed_dictionaries({
            "id": st.integers(min_value=1, max_value=10000),
            "name": st.text(min_size=1, max_size=50).filter(lambda x: x.strip() != ""),
            "address": st.text(min_size=0, max_size=100)
        }),
        min_size=0,
        max_size=10
    ),
    assignment_type=st.sampled_from(["driver", "manager"])
)
def test_property_assignment_event_trigger(
    user_id: int,
    warehouses: List[Dict[str, Any]],
    assignment_type: str
):
    """
    **Feature: unified-realtime-system, Property 7: 仓库分配事件触发**
    **Validates: Requirements 5.1, 5.2**
    
    属性：任意仓库分配变更，系统应该向被分配用户推送包含完整仓库列表的 assignment_update 事件
    
    验证：
    - emit_assignment_update 调用后，目标用户队列中有事件
    - 事件类型为 assignment_update
    - 事件负载包含完整的仓库分配数据（user_id, assignment_type, warehouses）
    - 事件只推送给被分配的用户
    """
    from events import emit_assignment_update, pop_events, clear_queue, get_queue_size
    
    # 清空队列，确保测试环境干净
    clear_queue()
    
    # 调用 emit_assignment_update 触发仓库分配更新事件
    emit_assignment_update(
        user_id=user_id,
        warehouses=warehouses,
        assignment_type=assignment_type
    )
    
    # 验证目标用户队列中有事件
    queue_size = get_queue_size(user_id)
    assert queue_size == 1, \
        f"目标用户 {user_id} 的队列应有 1 个事件，实际有 {queue_size} 个"
    
    # 获取事件
    events = pop_events(user_id)
    assert len(events) == 1, \
        f"应该收到 1 个事件，实际收到 {len(events)} 个"
    
    event = events[0]
    
    # 验证事件类型
    assert event.event_type == SSEEventType.ASSIGNMENT_UPDATE, \
        f"事件类型应为 ASSIGNMENT_UPDATE，实际为 {event.event_type}"
    
    # 验证事件数据结构（Requirements 5.3）
    assert "user_id" in event.data, "事件数据应包含 user_id 字段"
    assert event.data["user_id"] == user_id, \
        f"user_id 应为 {user_id}，实际为 {event.data['user_id']}"
    
    assert "assignment_type" in event.data, "事件数据应包含 assignment_type 字段"
    assert event.data["assignment_type"] == assignment_type, \
        f"assignment_type 应为 {assignment_type}，实际为 {event.data['assignment_type']}"
    
    assert "warehouses" in event.data, "事件数据应包含 warehouses 字段"
    assert isinstance(event.data["warehouses"], list), "warehouses 应为数组"
    assert len(event.data["warehouses"]) == len(warehouses), \
        f"warehouses 长度应为 {len(warehouses)}，实际为 {len(event.data['warehouses'])}"
    
    # 验证每个仓库对象的完整性
    for i, (expected_wh, actual_wh) in enumerate(zip(warehouses, event.data["warehouses"])):
        assert actual_wh["id"] == expected_wh["id"], \
            f"第 {i+1} 个仓库的 id 应为 {expected_wh['id']}，实际为 {actual_wh['id']}"
        assert actual_wh["name"] == expected_wh["name"], \
            f"第 {i+1} 个仓库的 name 应为 {expected_wh['name']}，实际为 {actual_wh['name']}"
        assert actual_wh["address"] == expected_wh["address"], \
            f"第 {i+1} 个仓库的 address 应为 {expected_wh['address']}，实际为 {actual_wh['address']}"
    
    # 清理测试环境
    clear_queue()


@settings(max_examples=50, deadline=10000)
@given(
    target_user_id=st.integers(min_value=1, max_value=1000),
    non_target_user_id=st.integers(min_value=1001, max_value=2000),
    warehouses=st.lists(
        st.fixed_dictionaries({
            "id": st.integers(min_value=1, max_value=10000),
            "name": st.text(min_size=1, max_size=50).filter(lambda x: x.strip() != ""),
            "address": st.text(min_size=0, max_size=100)
        }),
        min_size=1,
        max_size=5
    )
)
def test_property_assignment_event_only_to_target_user(
    target_user_id: int,
    non_target_user_id: int,
    warehouses: List[Dict[str, Any]]
):
    """
    **Feature: unified-realtime-system, Property 7: 仓库分配事件触发 - 仅推送给目标用户**
    **Validates: Requirements 5.1, 5.2**
    
    属性：仓库分配事件只推送给被分配的用户，不推送给其他用户
    
    验证：
    - 目标用户（被分配仓库的用户）能收到事件
    - 非目标用户不会收到任何事件
    """
    from events import emit_assignment_update, pop_events, clear_queue
    
    # 清空队列
    clear_queue()
    
    # 触发仓库分配更新事件
    emit_assignment_update(
        user_id=target_user_id,
        warehouses=warehouses,
        assignment_type="driver"
    )
    
    # 验证目标用户收到事件
    target_events = pop_events(target_user_id)
    assert len(target_events) == 1, \
        f"目标用户 {target_user_id} 应该收到 1 个事件，实际收到 {len(target_events)} 个"
    
    # 验证非目标用户没有收到事件
    non_target_events = pop_events(non_target_user_id)
    assert len(non_target_events) == 0, \
        f"非目标用户 {non_target_user_id} 不应该收到任何事件，实际收到 {len(non_target_events)} 个"
    
    # 清理
    clear_queue()


@settings(max_examples=50, deadline=10000)
@given(
    user_id=st.integers(min_value=1, max_value=100000),
    assignment_type=st.sampled_from(["driver", "manager"])
)
def test_property_assignment_type_correctness(
    user_id: int,
    assignment_type: str
):
    """
    **Feature: unified-realtime-system, Property 7: 仓库分配事件触发 - 分配类型**
    **Validates: Requirements 5.1, 5.2**
    
    属性：不同类型的仓库分配（司机/车队长）都能正确推送
    
    验证：
    - 司机分配（driver）：Requirements 5.1 - 管理员修改司机的仓库分配
    - 车队长分配（manager）：Requirements 5.2 - 管理员修改车队长的仓库分配
    - 事件中的 assignment_type 字段与分配类型一致
    """
    from events import emit_assignment_update, pop_events, clear_queue
    
    # 清空队列
    clear_queue()
    
    # 触发仓库分配更新事件
    warehouses = [
        {"id": 1, "name": "测试仓库1", "address": "测试地址1"},
        {"id": 2, "name": "测试仓库2", "address": "测试地址2"}
    ]
    
    emit_assignment_update(
        user_id=user_id,
        warehouses=warehouses,
        assignment_type=assignment_type
    )
    
    # 获取事件
    events = pop_events(user_id)
    assert len(events) == 1, "应该收到 1 个事件"
    
    event = events[0]
    
    # 验证分配类型字段正确
    assert event.data["assignment_type"] == assignment_type, \
        f"assignment_type 应为 {assignment_type}，实际为 {event.data['assignment_type']}"
    
    # 验证分配类型是有效值
    assert assignment_type in ["driver", "manager"], \
        f"assignment_type {assignment_type} 应为有效的分配类型"
    
    # 清理
    clear_queue()


@settings(max_examples=50, deadline=10000)
@given(
    user_id=st.integers(min_value=1, max_value=100000)
)
def test_property_assignment_empty_warehouses(user_id: int):
    """
    **Feature: unified-realtime-system, Property 7: 仓库分配事件触发 - 空仓库列表**
    **Validates: Requirements 5.1, 5.2**
    
    属性：仓库分配可以是空列表（表示取消所有仓库分配）
    
    验证：
    - 空仓库列表能正确推送
    - 事件中的 warehouses 字段为空数组
    """
    from events import emit_assignment_update, pop_events, clear_queue
    
    # 清空队列
    clear_queue()
    
    # 触发仓库分配更新事件（空仓库列表）
    emit_assignment_update(
        user_id=user_id,
        warehouses=[],  # 空仓库列表
        assignment_type="driver"
    )
    
    # 获取事件
    events = pop_events(user_id)
    assert len(events) == 1, "应该收到 1 个事件"
    
    event = events[0]
    
    # 验证仓库列表为空
    assert event.data["warehouses"] == [], \
        f"warehouses 应为空数组，实际为 {event.data['warehouses']}"
    assert isinstance(event.data["warehouses"], list), \
        "warehouses 应为数组类型"
    
    # 清理
    clear_queue()


@settings(max_examples=50, deadline=10000)
@given(
    user_id=st.integers(min_value=1, max_value=100000),
    num_updates=st.integers(min_value=2, max_value=5)
)
def test_property_multiple_assignment_updates(
    user_id: int,
    num_updates: int
):
    """
    **Feature: unified-realtime-system, Property 7: 仓库分配事件触发 - 多次更新**
    **Validates: Requirements 5.1, 5.2**
    
    属性：多次仓库分配更新操作，每次都会生成独立的事件
    
    验证：
    - 多次调用 emit_assignment_update 会生成多个事件
    - 每个事件都是独立的，包含对应的仓库分配数据
    """
    from events import emit_assignment_update, pop_events, clear_queue, get_queue_size
    
    # 清空队列
    clear_queue()
    
    # 模拟多次仓库分配更新
    assignment_types = ["driver", "manager", "driver", "manager", "driver"][:num_updates]
    
    for i, assign_type in enumerate(assignment_types):
        warehouses = [
            {"id": j + 1, "name": f"仓库{i}-{j}", "address": f"地址{i}-{j}"}
            for j in range(i + 1)  # 每次分配不同数量的仓库
        ]
        emit_assignment_update(
            user_id=user_id,
            warehouses=warehouses,
            assignment_type=assign_type
        )
    
    # 验证队列中有正确数量的事件
    queue_size = get_queue_size(user_id)
    assert queue_size == num_updates, \
        f"队列应有 {num_updates} 个事件，实际有 {queue_size} 个"
    
    # 获取所有事件
    events = pop_events(user_id)
    assert len(events) == num_updates, \
        f"应该收到 {num_updates} 个事件，实际收到 {len(events)} 个"
    
    # 验证每个事件的数据与对应的分配一致
    for i, (event, expected_type) in enumerate(zip(events, assignment_types)):
        assert event.data["assignment_type"] == expected_type, \
            f"第 {i+1} 个事件的 assignment_type 应为 {expected_type}，实际为 {event.data['assignment_type']}"
        assert len(event.data["warehouses"]) == i + 1, \
            f"第 {i+1} 个事件的仓库数量应为 {i + 1}，实际为 {len(event.data['warehouses'])}"
    
    # 清理
    clear_queue()


@settings(max_examples=50, deadline=10000)
@given(
    user_id=st.integers(min_value=1, max_value=100000),
    warehouse_name=st.text(
        alphabet=st.sampled_from('中文测试数据仓库名称特殊字符!@#$%^&*()'),
        min_size=1,
        max_size=30
    ),
    warehouse_address=st.text(
        alphabet=st.sampled_from('中文地址测试数据省市区街道号!@#$%'),
        min_size=1,
        max_size=50
    )
)
def test_property_assignment_event_serializable(
    user_id: int,
    warehouse_name: str,
    warehouse_address: str
):
    """
    **Feature: unified-realtime-system, Property 7: 仓库分配事件触发 - 可序列化**
    **Validates: Requirements 5.1, 5.2**
    
    属性：仓库分配事件可以正确序列化为 JSON 格式，包括中文和特殊字符
    
    验证：
    - 事件可以通过 to_dict() 序列化
    - 序列化后的数据可以通过 json.dumps() 编码
    - 编码后的 JSON 可以正确解码回原始数据
    - 中文和特殊字符能正确处理
    """
    from events import emit_assignment_update, pop_events, clear_queue
    
    # 清空队列
    clear_queue()
    
    # 触发仓库分配更新事件（包含中文和特殊字符）
    warehouses = [
        {"id": 1, "name": warehouse_name, "address": warehouse_address},
        {"id": 2, "name": "北京仓库", "address": "北京市朝阳区"}
    ]
    
    emit_assignment_update(
        user_id=user_id,
        warehouses=warehouses,
        assignment_type="driver"
    )
    
    # 获取事件
    events = pop_events(user_id)
    assert len(events) == 1, "应该收到 1 个事件"
    
    event = events[0]
    
    # 验证可以序列化
    serialized = event.to_dict()
    assert isinstance(serialized, dict), "to_dict() 应返回字典"
    
    # 验证可以 JSON 编码
    try:
        json_str = json.dumps(serialized, ensure_ascii=False)
        assert isinstance(json_str, str), "json.dumps() 应返回字符串"
    except (TypeError, ValueError) as e:
        assert False, f"事件应可以 JSON 编码，错误: {e}"
    
    # 验证可以 JSON 解码
    try:
        decoded = json.loads(json_str)
        assert decoded == serialized, "JSON 解码后应与原始数据一致"
    except json.JSONDecodeError as e:
        assert False, f"JSON 应可以解码，错误: {e}"
    
    # 验证解码后的数据结构正确
    assert decoded["event_type"] == "assignment_update", \
        "解码后的 event_type 应为 assignment_update"
    assert decoded["data"]["user_id"] == user_id, \
        "解码后的 user_id 应正确"
    assert decoded["data"]["warehouses"][0]["name"] == warehouse_name, \
        "解码后的仓库名称应正确（包括中文和特殊字符）"
    assert decoded["data"]["warehouses"][0]["address"] == warehouse_address, \
        "解码后的仓库地址应正确（包括中文和特殊字符）"
    
    # 清理
    clear_queue()


@settings(max_examples=50, deadline=10000)
@given(
    user_id=st.integers(min_value=1, max_value=100000),
    num_warehouses=st.integers(min_value=1, max_value=10)
)
def test_property_assignment_warehouse_list_integrity(
    user_id: int,
    num_warehouses: int
):
    """
    **Feature: unified-realtime-system, Property 7: 仓库分配事件触发 - 仓库列表完整性**
    **Validates: Requirements 5.1, 5.2**
    
    属性：仓库分配事件中的仓库列表完整性
    
    验证：
    - 仓库列表中的每个仓库都包含 id, name, address 字段
    - 仓库数量与输入一致
    - 仓库顺序与输入一致
    """
    from events import emit_assignment_update, pop_events, clear_queue
    
    # 清空队列
    clear_queue()
    
    # 生成仓库列表
    warehouses = [
        {"id": i + 1, "name": f"仓库{i+1}", "address": f"地址{i+1}"}
        for i in range(num_warehouses)
    ]
    
    # 触发仓库分配更新事件
    emit_assignment_update(
        user_id=user_id,
        warehouses=warehouses,
        assignment_type="driver"
    )
    
    # 获取事件
    events = pop_events(user_id)
    assert len(events) == 1, "应该收到 1 个事件"
    
    event = events[0]
    received_warehouses = event.data["warehouses"]
    
    # 验证仓库数量一致
    assert len(received_warehouses) == num_warehouses, \
        f"仓库数量应为 {num_warehouses}，实际为 {len(received_warehouses)}"
    
    # 验证每个仓库的完整性和顺序
    for i, (expected_wh, actual_wh) in enumerate(zip(warehouses, received_warehouses)):
        # 验证必需字段存在
        assert "id" in actual_wh, f"第 {i+1} 个仓库应包含 id 字段"
        assert "name" in actual_wh, f"第 {i+1} 个仓库应包含 name 字段"
        assert "address" in actual_wh, f"第 {i+1} 个仓库应包含 address 字段"
        
        # 验证字段值正确
        assert actual_wh["id"] == expected_wh["id"], \
            f"第 {i+1} 个仓库的 id 应为 {expected_wh['id']}，实际为 {actual_wh['id']}"
        assert actual_wh["name"] == expected_wh["name"], \
            f"第 {i+1} 个仓库的 name 应为 {expected_wh['name']}，实际为 {actual_wh['name']}"
        assert actual_wh["address"] == expected_wh["address"], \
            f"第 {i+1} 个仓库的 address 应为 {expected_wh['address']}，实际为 {actual_wh['address']}"
    
    # 清理
    clear_queue()


# ==================== 运行测试 ====================

def run_all_tests():
    """
    运行所有属性测试
    """
    print("=" * 70)
    print("SSE 事件属性测试")
    print("**Feature: unified-realtime-system**")
    print("**Property 1: 事件类型分发正确性 (Validates: Requirements 1.1, 1.2)**")
    print("**Property 2: 事件负载完整性 (Validates: Requirements 2.2, 3.2, 4.3, 5.3, 6.2, 7.2)**")
    print("**Property 3: 事件路由正确性 (Validates: Requirements 8.1, 8.2, 8.3)**")
    print("**Property 4: 车辆审批事件触发 (Validates: Requirements 2.1, 2.4)**")
    print("**Property 5: 请假审批事件触发 (Validates: Requirements 3.1, 3.4)**")
    print("**Property 6: 计件记录事件触发 (Validates: Requirements 4.1, 4.2)**")
    print("**Property 7: 仓库分配事件触发 (Validates: Requirements 5.1, 5.2)**")
    print("=" * 70)
    
    tests = [
        # Property 1: 事件类型分发正确性
        ("事件类型分发正确性 (Req 1.1, 1.2)", test_property_event_type_dispatch_correctness),
        ("业务事件类型值 (Req 1.1, 1.2)", test_property_business_event_type_values),
        ("SSE 消息 Unicode 支持 (Req 1.1, 1.2)", test_property_sse_message_unicode_support),
        ("SSE 消息嵌套数据 (Req 1.1, 1.2)", test_property_sse_message_nested_data),
        ("SSE 消息空数据 (Req 1.1, 1.2)", test_property_sse_message_empty_data),
        ("SSE 事件目标用户保留 (Req 1.1, 1.2)", test_property_sse_event_target_users_preserved),
        # Property 2: 事件负载完整性
        ("车辆事件负载完整性 (Req 2.2)", test_property_vehicle_event_payload_completeness),
        ("请假事件负载完整性 (Req 3.2)", test_property_leave_event_payload_completeness),
        ("计件事件负载完整性 (Req 4.3)", test_property_piece_work_event_payload_completeness),
        ("仓库分配事件负载完整性 (Req 5.3)", test_property_assignment_event_payload_completeness),
        ("权限事件负载完整性 (Req 6.2)", test_property_permission_event_payload_completeness),
        ("用户事件负载完整性 (Req 7.2)", test_property_user_event_payload_completeness),
        ("SSE 事件通用序列化完整性", test_property_sse_event_serialization_completeness),
        # Property 3: 事件路由正确性
        ("事件路由正确性 (Req 8.1, 8.2, 8.3)", test_property_event_routing_correctness),
        ("事件队列 FIFO 顺序 (Req 8.1, 8.2)", test_property_event_queue_fifo_order),
        ("事件队列清空 (Req 8.2)", test_property_event_queue_pop_clears_queue),
        ("事件队列溢出保护 (Req 8.1, 8.4)", test_property_event_queue_overflow_protection),
        ("多用户广播 (Req 8.1, 8.3)", test_property_event_broadcast_to_multiple_users),
        ("空目标用户无效果 (Req 8.4)", test_property_empty_target_users_no_effect),
        ("多类型事件路由 (Req 8.1, 8.2, 8.3)", test_property_multiple_event_types_routing),
        # Property 4: 车辆审批事件触发
        ("车辆审批事件触发 (Req 2.1, 2.4)", test_property_vehicle_approval_event_trigger),
        ("车辆事件仅推送给车主 (Req 2.1, 2.4)", test_property_vehicle_event_only_to_owner),
        ("车辆审批状态变更 (Req 2.1, 2.4)", test_property_vehicle_approval_status_change),
        ("多次车辆审批 (Req 2.1, 2.4)", test_property_multiple_vehicle_approvals),
        ("车辆事件可序列化 (Req 2.1, 2.4)", test_property_vehicle_event_serializable),
        # Property 5: 请假审批事件触发
        ("请假审批事件触发 (Req 3.1, 3.4)", test_property_leave_approval_event_trigger),
        ("请假事件推送给申请人和车队长 (Req 3.1, 3.4)", test_property_leave_event_to_applicant_and_manager),
        ("请假审批状态变更 (Req 3.1, 3.4)", test_property_leave_approval_status_change),
        ("请假类型正确性 (Req 3.1, 3.4)", test_property_leave_type_correctness),
        ("多次请假申请 (Req 3.1, 3.4)", test_property_multiple_leave_applications),
        ("请假事件可序列化 (Req 3.1, 3.4)", test_property_leave_event_serializable),
        # Property 6: 计件记录事件触发
        ("计件记录事件触发 (Req 4.1, 4.2)", test_property_piece_work_event_trigger),
        ("计件事件推送给司机和车队长 (Req 4.1, 4.2)", test_property_piece_work_event_to_driver_and_manager),
        ("计件操作类型正确性 (Req 4.1, 4.2)", test_property_piece_work_action_correctness),
        ("多次计件记录提交 (Req 4.1, 4.2)", test_property_multiple_piece_work_records),
        ("计件事件可序列化 (Req 4.1, 4.2)", test_property_piece_work_event_serializable),
        ("计件数量和金额 (Req 4.1, 4.2)", test_property_piece_work_quantity_and_amount),
        # Property 7: 仓库分配事件触发
        ("仓库分配事件触发 (Req 5.1, 5.2)", test_property_assignment_event_trigger),
        ("仓库分配事件仅推送给目标用户 (Req 5.1, 5.2)", test_property_assignment_event_only_to_target_user),
        ("仓库分配类型正确性 (Req 5.1, 5.2)", test_property_assignment_type_correctness),
        ("仓库分配空仓库列表 (Req 5.1, 5.2)", test_property_assignment_empty_warehouses),
        ("多次仓库分配更新 (Req 5.1, 5.2)", test_property_multiple_assignment_updates),
        ("仓库分配事件可序列化 (Req 5.1, 5.2)", test_property_assignment_event_serializable),
        ("仓库分配仓库列表完整性 (Req 5.1, 5.2)", test_property_assignment_warehouse_list_integrity),
    ]
    
    passed = 0
    failed = 0
    
    for name, test_func in tests:
        print(f"\n--- {name} ---")
        try:
            test_func()
            print(f"  ✅ {name}: PASSED")
            passed += 1
        except Exception as e:
            print(f"  ❌ {name}: FAILED")
            print(f"     错误: {str(e)}")
            failed += 1
    
    print("\n" + "=" * 70)
    print("测试结果汇总")
    print("=" * 70)
    print(f"总测试数: {passed + failed}")
    print(f"通过: {passed}")
    print(f"失败: {failed}")
    
    if failed == 0:
        print("\n🎉 所有属性测试通过！")
    else:
        print(f"\n⚠️ 有 {failed} 个测试失败")
    
    return failed == 0


if __name__ == "__main__":
    run_all_tests()
