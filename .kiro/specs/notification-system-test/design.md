# Design Document

## Overview

本设计文档描述通知系统的全面测试方案，包括单元测试、集成测试和端到端测试。测试重点关注：
1. 各业务场景是否正确触发通知
2. 通知内容是否准确
3. 审批完成后原通知状态是否正确更新
4. 通知的 CRUD 操作是否正常

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    通知系统测试架构                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │  请假通知   │    │  车辆通知   │    │  分配通知   │     │
│  │  测试模块   │    │  测试模块   │    │  测试模块   │     │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘     │
│         │                  │                  │             │
│         └──────────────────┼──────────────────┘             │
│                            │                                │
│                   ┌────────▼────────┐                       │
│                   │  通知 CRUD 层   │                       │
│                   │  (notifications)│                       │
│                   └────────┬────────┘                       │
│                            │                                │
│                   ┌────────▼────────┐                       │
│                   │   数据库层      │                       │
│                   │  (SQLite/Test)  │                       │
│                   └─────────────────┘                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. 测试数据工厂 (TestDataFactory)

```python
class TestDataFactory:
    """测试数据工厂，用于创建测试所需的用户、仓库、车辆等数据"""
    
    def create_driver(name: str, warehouse_id: int = None) -> User:
        """创建司机用户"""
        pass
    
    def create_manager(name: str, warehouse_id: int = None) -> User:
        """创建车队长用户"""
        pass
    
    def create_dispatcher(name: str) -> User:
        """创建调度用户"""
        pass
    
    def create_boss(name: str) -> User:
        """创建老板用户"""
        pass
    
    def create_warehouse(name: str) -> Warehouse:
        """创建仓库"""
        pass
    
    def assign_user_to_warehouse(user_id: int, warehouse_id: int) -> None:
        """分配用户到仓库"""
        pass
```

### 2. 通知断言工具 (NotificationAssertions)

```python
class NotificationAssertions:
    """通知断言工具，用于验证通知的创建和更新"""
    
    def assert_notification_created(
        user_id: int,
        title: str,
        ref_type: str = None,
        ref_id: int = None,
        status: str = None
    ) -> Notification:
        """断言通知已创建"""
        pass
    
    def assert_notification_status_updated(
        ref_type: str,
        ref_id: int,
        expected_status: str
    ) -> List[Notification]:
        """断言通知状态已更新"""
        pass
    
    def assert_notifications_sent_to_admins(
        title: str,
        include_manager: bool = True
    ) -> List[Notification]:
        """断言通知已发送给管理员"""
        pass
```

## Data Models

### 测试用例数据结构

```python
@dataclass
class NotificationTestCase:
    """通知测试用例"""
    name: str                    # 测试用例名称
    scenario: str                # 测试场景
    trigger_action: Callable     # 触发动作
    expected_recipients: List[int]  # 预期接收者ID列表
    expected_title: str          # 预期标题
    expected_ref_type: str       # 预期关联类型
    expected_status: str         # 预期状态
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: 审批通知状态一致性

*For any* 审批类通知（请假/离职/车辆），当审批完成时，所有匹配 ref_type 和 ref_id 且 status 为 "pending" 的通知都应该被更新为审批结果状态

**Validates: Requirements 1.3, 1.4, 2.3, 2.4, 3.3, 3.4, 9.1, 9.2, 9.3**

### Property 2: 通知接收者完整性

*For any* 审批申请（请假/离职/车辆），创建的通知应该发送给所有管辖该申请人的车队长、调度和老板

**Validates: Requirements 1.1, 2.1, 3.1**

### Property 3: 通知内容准确性

*For any* 通知，其 title、content、ref_type、ref_id 应该与触发事件的业务数据一致

**Validates: Requirements 4.3, 5.3, 6.3, 7.2**

### Property 4: 通知已读状态管理

*For any* 新创建的通知，is_read 应该为 false；标记已读后，is_read 应该为 true

**Validates: Requirements 8.1, 8.2**

### Property 5: 审批结果通知完整性

*For any* 审批完成操作，应该创建结果通知发送给申请人和所有原审批通知的接收者

**Validates: Requirements 1.5, 2.5, 3.5, 9.4**

## Error Handling

### 测试异常场景

1. **用户不存在**: 测试向不存在的用户发送通知时的行为
2. **重复审批**: 测试对已审批的申请再次审批时的行为
3. **无管辖关系**: 测试司机没有分配仓库时的通知发送行为
4. **数据库错误**: 测试数据库操作失败时的错误处理

## Testing Strategy

### 测试框架

- **pytest**: Python 测试框架
- **pytest-asyncio**: 异步测试支持
- **hypothesis**: 属性测试库（可选）

### 测试分类

#### 1. 单元测试 (Unit Tests)

测试 `crud/notifications.py` 中的各个函数：

- `create_notification`: 创建单个通知
- `create_notifications_batch`: 批量创建通知
- `notify_admins`: 发送给管理员
- `get_managers_for_user`: 获取管辖车队长
- `create_approval_notification`: 创建审批通知
- `complete_approval`: 完成审批
- `get_notifications`: 获取通知列表
- `mark_notification_as_read`: 标记已读
- `get_unread_count`: 获取未读数量

#### 2. 集成测试 (Integration Tests)

测试完整的业务流程：

- 请假申请 → 审批 → 通知状态更新
- 离职申请 → 审批 → 通知状态更新
- 车辆添加 → 审核 → 通知状态更新
- 司机类型修改 → 通知创建
- 仓库分配 → 通知创建

#### 3. 端到端测试 (E2E Tests)

通过 API 测试完整流程：

- POST /api/leave → PUT /api/leave/{id}/approve → 验证通知
- POST /api/vehicles → PUT /api/vehicles/{id}/review → 验证通知
- PUT /api/users/{id} (driver_type) → 验证通知
- POST /api/users/{id}/warehouses → 验证通知
- POST /api/warehouses/{id}/assign → 验证通知

### 测试配置

```python
# pytest.ini 配置
[pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
asyncio_mode = auto
```

### 测试数据隔离

每个测试使用独立的数据库会话，测试完成后回滚事务，确保测试之间互不影响。
