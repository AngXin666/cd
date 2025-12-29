# 错误处理代码冗余报告

## 概述

本报告分析了 `fleet-manager/backend` 目录下的错误处理代码，识别重复模式并提出优化建议。

**分析日期**: 2024-12-29  
**分析范围**: `main.py`, `crud.py`, `auth.py`

---

## 1. 错误处理模式分析

### 1.1 HTTPException 使用统计

| 错误类型 | 状态码 | 出现次数 | 典型场景 |
|---------|--------|---------|---------|
| 资源不存在 | 404 | 40+ | 用户、仓库、车辆、记录等不存在 |
| 权限不足 | 403 | 10+ | 无权访问资源、仓库权限检查 |
| 请求无效 | 400 | 15+ | 重复数据、业务规则违反 |
| 认证失败 | 401 | 3 | 登录失败、Token 无效 |

### 1.2 重复的错误处理模式

#### 模式 1: 资源不存在检查（最常见）

**重复代码示例**:
```python
# 用户不存在检查 - 出现 8+ 次
user = crud.get_user_by_id(session, user_id)
if not user:
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="用户不存在"
    )

# 仓库不存在检查 - 出现 10+ 次
warehouse = crud.get_warehouse_by_id(session, warehouse_id)
if not warehouse:
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="仓库不存在"
    )

# 车辆不存在检查 - 出现 15+ 次
vehicle = session.get(crud.Vehicle, vehicle_id)
if not vehicle:
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="车辆不存在"
    )

# 计件记录不存在检查 - 出现 3+ 次
record = session.get(crud.PieceWorkRecord, record_id)
if not record:
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="计件记录不存在"
    )

# 申请不存在检查 - 出现 2+ 次
application = session.get(crud.LeaveApplication, application_id)
if not application:
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="申请不存在"
    )

# 通知不存在检查 - 出现 2+ 次
notification = session.get(crud.Notification, notification_id)
if not notification:
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="通知不存在"
    )
```

**影响**: 代码重复约 100+ 行

#### 模式 2: 权限检查（已部分优化）

**已优化的部分**:
- `auth.py` 中已实现 `PermissionError` 统一异常类
- `check_resource_ownership()` 统一资源所有权检查
- `check_vehicle_ownership()` 统一车辆所有权检查
- `require_super_admin_for_high_roles()` 统一高权限角色检查
- `check_manager_warehouse_access()` 统一车队长仓库权限检查

**仍有重复的部分**:
```python
# 仓库访问权限检查 - 出现 2+ 次
if current_user.role == UserRole.DRIVER:
    user_warehouses = crud.get_user_warehouses(session, current_user.id)
    user_warehouse_ids = [w.id for w in user_warehouses]
    if warehouse_id not in user_warehouse_ids:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权访问该仓库"
        )
```

#### 模式 3: 业务规则验证

**重复代码示例**:
```python
# 重复数据检查 - 出现 3+ 次
existing = crud.get_user_by_username(session, request.username)
if existing:
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="用户名已存在"
    )

# 车牌号重复检查
if existing:
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="车牌号已存在"
    )

# 状态检查 - 出现 2+ 次
if application.status != LeaveStatus.PENDING:
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="该申请已审批"
    )
```

---

## 2. 优化建议

### 2.1 创建通用资源获取函数（推荐）

**建议在 `crud.py` 或新建 `helpers.py` 中添加**:

```python
from typing import TypeVar, Type, Optional
from fastapi import HTTPException, status
from sqlmodel import Session

T = TypeVar('T')

def get_or_404(
    session: Session,
    model: Type[T],
    id: int,
    error_message: str = None
) -> T:
    """
    获取资源，如果不存在则抛出 404 错误
    
    Args:
        session: 数据库会话
        model: 模型类
        id: 资源 ID
        error_message: 自定义错误信息
        
    Returns:
        资源对象
        
    Raises:
        HTTPException: 资源不存在时抛出 404
    """
    resource = session.get(model, id)
    if not resource:
        model_name = model.__name__
        message = error_message or f"{model_name}不存在"
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=message
        )
    return resource


def get_user_or_404(session: Session, user_id: int) -> User:
    """获取用户，不存在则抛出 404"""
    return get_or_404(session, User, user_id, "用户不存在")


def get_warehouse_or_404(session: Session, warehouse_id: int) -> Warehouse:
    """获取仓库，不存在则抛出 404"""
    return get_or_404(session, Warehouse, warehouse_id, "仓库不存在")


def get_vehicle_or_404(session: Session, vehicle_id: int) -> Vehicle:
    """获取车辆，不存在则抛出 404"""
    return get_or_404(session, Vehicle, vehicle_id, "车辆不存在")
```

**使用示例**:
```python
# 优化前
user = crud.get_user_by_id(session, user_id)
if not user:
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="用户不存在"
    )

# 优化后
user = get_user_or_404(session, user_id)
```

**预计减少代码**: 约 80-100 行

### 2.2 创建通用唯一性检查函数

```python
def check_unique_or_400(
    session: Session,
    model: Type[T],
    field_name: str,
    field_value: Any,
    error_message: str = None
) -> None:
    """
    检查字段唯一性，如果已存在则抛出 400 错误
    
    Args:
        session: 数据库会话
        model: 模型类
        field_name: 字段名
        field_value: 字段值
        error_message: 自定义错误信息
        
    Raises:
        HTTPException: 字段值已存在时抛出 400
    """
    statement = select(model).where(getattr(model, field_name) == field_value)
    existing = session.exec(statement).first()
    if existing:
        message = error_message or f"{field_name}已存在"
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message
        )
```

### 2.3 创建通用仓库权限检查函数

```python
def check_warehouse_access(
    session: Session,
    current_user: User,
    warehouse_id: int
) -> None:
    """
    检查用户是否有权访问仓库
    
    管理角色可以访问所有仓库，司机只能访问分配的仓库
    
    Args:
        session: 数据库会话
        current_user: 当前用户
        warehouse_id: 仓库 ID
        
    Raises:
        HTTPException: 无权访问时抛出 403
    """
    # 管理角色可以访问所有仓库
    if has_management_permission(current_user.role):
        return
    
    # 司机只能访问分配的仓库
    user_warehouses = crud.get_user_warehouses(session, current_user.id)
    user_warehouse_ids = [w.id for w in user_warehouses]
    
    if warehouse_id not in user_warehouse_ids:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权访问该仓库"
        )
```

---

## 3. 现有优化成果

### 3.1 已实现的统一错误处理（auth.py）

| 函数名 | 功能 | 使用场景 |
|-------|------|---------|
| `PermissionError` | 统一权限错误异常类 | 所有权限相关错误 |
| `check_resource_ownership()` | 资源所有权检查 | 计件记录、通知等 |
| `check_vehicle_ownership()` | 车辆所有权检查 | 车辆相关操作 |
| `require_super_admin_for_high_roles()` | 高权限角色操作检查 | 用户管理 |
| `check_manager_warehouse_access()` | 车队长仓库权限检查 | 司机管理 |
| `require_roles()` | 角色权限装饰器 | API 访问控制 |

### 3.2 预定义的角色检查依赖

| 依赖名 | 允许的角色 |
|-------|-----------|
| `require_super_admin` | SUPER_ADMIN |
| `require_boss` | BOSS |
| `require_boss_or_super` | BOSS, SUPER_ADMIN |
| `require_admin` | PEER_ADMIN, BOSS, SUPER_ADMIN |
| `require_manager_or_boss` | MANAGER, BOSS |
| `require_management` | MANAGER, PEER_ADMIN, BOSS, SUPER_ADMIN |

---

## 4. 优化优先级

### 高优先级（建议立即实施）

1. **创建 `get_or_404()` 通用函数**
   - 影响范围: 40+ 处代码
   - 预计减少代码: 80-100 行
   - 实施难度: 低

2. **创建资源特定的获取函数**
   - `get_user_or_404()`
   - `get_warehouse_or_404()`
   - `get_vehicle_or_404()`
   - `get_record_or_404()`

### 中优先级（建议后续实施）

3. **创建 `check_unique_or_400()` 函数**
   - 影响范围: 5+ 处代码
   - 预计减少代码: 15-20 行

4. **创建 `check_warehouse_access()` 函数**
   - 影响范围: 3+ 处代码
   - 预计减少代码: 20-30 行

### 低优先级（可选优化）

5. **创建业务规则验证装饰器**
   - 用于状态检查等业务规则
   - 需要更多设计考虑

---

## 5. 实施建议

### 5.1 新建 `helpers.py` 文件

建议在 `fleet-manager/backend/` 目录下新建 `helpers.py` 文件，包含：
- 通用资源获取函数
- 通用唯一性检查函数
- 通用仓库权限检查函数

### 5.2 逐步重构

1. 先在新文件中实现通用函数
2. 在新代码中使用通用函数
3. 逐步重构现有代码
4. 确保所有测试通过

### 5.3 保持向后兼容

- 不删除现有的错误处理代码
- 新函数作为补充，不是替代
- 逐步迁移，避免大规模重构风险

---

## 6. 总结

### 6.1 当前状态

- **优点**: 权限检查已有较好的统一处理（`auth.py`）
- **缺点**: 资源不存在检查存在大量重复代码

### 6.2 优化收益

| 优化项 | 减少代码行数 | 提高可维护性 | 实施难度 |
|-------|-------------|-------------|---------|
| `get_or_404()` | 80-100 行 | 高 | 低 |
| `check_unique_or_400()` | 15-20 行 | 中 | 低 |
| `check_warehouse_access()` | 20-30 行 | 中 | 低 |
| **总计** | **115-150 行** | **高** | **低** |

### 6.3 建议

1. **短期**: 创建 `helpers.py` 并实现 `get_or_404()` 系列函数
2. **中期**: 在新代码中使用通用函数，逐步重构现有代码
3. **长期**: 考虑使用 FastAPI 的依赖注入系统进一步优化

---

## 附录: 重复代码位置清单

### A.1 用户不存在检查位置

| 文件 | 行号 | 函数名 |
|-----|------|-------|
| main.py | 249-253 | `get_user()` |
| main.py | 273-277 | `update_user()` |
| main.py | 331-335 | `delete_user()` |
| main.py | 376-380 | `update_driver_info()` |
| main.py | 421-425 | `assign_warehouses_to_user()` |
| main.py | 508-512 | `get_user_warehouses()` |
| main.py | 2180-2184 | `assign_vehicle()` |

### A.2 仓库不存在检查位置

| 文件 | 行号 | 函数名 |
|-----|------|-------|
| main.py | 559-563 | `create_warehouse()` |
| main.py | 578-582 | `get_warehouse()` |
| main.py | 603-607 | `update_warehouse()` |
| main.py | 628-632 | `delete_warehouse()` |
| main.py | 679-683 | `assign_users_to_warehouse()` |
| main.py | 718-722 | `get_warehouse_users()` |
| main.py | 451-455 | `assign_warehouses_to_user()` |
| main.py | 2189-2193 | `assign_vehicle()` |

### A.3 车辆不存在检查位置

| 文件 | 行号 | 函数名 |
|-----|------|-------|
| main.py | 1727-1731 | `get_vehicle()` |
| main.py | 1765-1769 | `update_vehicle()` |
| main.py | 1817-1821 | `review_vehicle()` |
| main.py | 1870-1874 | `delete_vehicle()` |
| main.py | 1925-1929 | `upload_vehicle_document()` |
| main.py | 1987-1991 | `get_vehicle_documents()` |
| main.py | 2059-2063 | `return_vehicle()` |
| main.py | 2172-2176 | `assign_vehicle()` |
| main.py | 2304-2308 | `get_vehicle_lease()` |
| main.py | 2389-2393 | `update_vehicle_lease()` |
| main.py | 2449-2453 | `get_vehicle_history()` |
| main.py | 2586-2590 | `get_supplemented_photos()` |
| main.py | 2645-2649 | `supplement_photos()` |
| main.py | 2701-2705 | `get_vehicle_lease_reminder()` |

---

*报告生成时间: 2024-12-29*
