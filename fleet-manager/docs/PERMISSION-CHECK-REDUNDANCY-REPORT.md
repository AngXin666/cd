# 权限检查代码冗余分析报告

## 概述

本报告分析了 `fleet-manager/backend` 中权限检查代码的使用情况，识别重复模式并提出优化建议。

## 分析日期

2024-12-29

## 权限检查架构

### 1. 统一权限检查函数（auth.py）

项目已经实现了一套统一的权限检查函数，位于 `auth.py`：

| 函数名 | 用途 | 使用次数 |
|--------|------|----------|
| `check_resource_ownership` | 检查资源所有权（通用） | 4 次 |
| `check_vehicle_ownership` | 检查车辆所有权（封装） | 10 次 |
| `require_super_admin_for_high_roles` | 高权限角色操作检查 | 4 次 |
| `check_manager_warehouse_access` | 车队长仓库权限检查 | 1 次 |
| `has_management_permission` | 检查是否有管理权限 | 2 次 |

### 2. 预定义角色检查依赖（auth.py）

| 依赖名 | 允许的角色 | 使用场景 |
|--------|-----------|----------|
| `require_super_admin` | SUPER_ADMIN | 超级管理员专属操作 |
| `require_boss` | BOSS | 老板专属操作 |
| `require_boss_or_super` | BOSS, SUPER_ADMIN | 老板或超管操作 |
| `require_admin` | PEER_ADMIN, BOSS, SUPER_ADMIN | 管理员级别操作 |
| `require_manager_or_boss` | MANAGER, BOSS | 车队长或老板操作 |
| `require_management` | MANAGER, PEER_ADMIN, BOSS, SUPER_ADMIN | 管理权限操作 |
| `require_any_role` | 所有角色 | 仅需登录 |

## 重复模式分析

### 模式 1：司机只能查看自己的记录

**出现位置**（7 处）：
```python
# 权限控制：司机只能查看自己的记录
if current_user.role == UserRole.DRIVER:
    user_id = current_user.id
```

**出现在以下 API**：
1. `GET /api/attendance` - 考勤记录列表（第 863 行）
2. `GET /api/piece-work/records` - 计件记录列表（第 1006 行）
3. `GET /api/piece-work/stats` - 计件统计（第 1140 行）
4. `GET /api/leave` - 请假申请列表（第 1286 行）
5. `GET /api/vehicles` - 车辆列表（第 1536 行）

**评估**：
- ✅ **不是冗余**：这是一种合理的权限过滤模式
- ✅ **代码简洁**：每处只有 2 行代码
- ✅ **语义清晰**：直接表达业务逻辑
- ⚠️ **可优化**：可以提取为辅助函数，但收益不大

### 模式 2：车队长仓库权限检查

**出现位置**（2 处）：
```python
if current_user.role == UserRole.MANAGER:
    check_manager_warehouse_access(current_user, user, session)
```

**出现在以下 API**：
1. `PUT /api/users/{user_id}/driver-info` - 更新司机信息（第 384 行）
2. `POST /api/users/{user_id}/warehouses` - 分配仓库（第 428 行，内联实现）

**评估**：
- ✅ **已统一**：使用了 `check_manager_warehouse_access` 函数
- ⚠️ **部分内联**：第 428 行的仓库分配有额外的内联检查逻辑

### 模式 3：司机访问仓库权限检查

**出现位置**（1 处）：
```python
if current_user.role == UserRole.DRIVER:
    user_warehouses = crud.get_user_warehouses(session, current_user.id)
    user_warehouse_ids = [w.id for w in user_warehouses]
    if warehouse_id not in user_warehouse_ids:
        raise HTTPException(status_code=403, detail="无权访问该仓库")
```

**出现在以下 API**：
1. `GET /api/warehouses/{warehouse_id}/vehicles` - 仓库车辆列表（第 725 行）

**评估**：
- ⚠️ **可提取**：可以提取为 `check_driver_warehouse_access` 函数
- ⚠️ **使用 HTTPException**：未使用统一的 `PermissionError`

## 冗余问题汇总

### 问题 1：司机仓库访问检查未统一

**位置**：`main.py` 第 725-735 行

**当前代码**：
```python
if current_user.role == UserRole.DRIVER:
    user_warehouses = crud.get_user_warehouses(session, current_user.id)
    user_warehouse_ids = [w.id for w in user_warehouses]
    if warehouse_id not in user_warehouse_ids:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权访问该仓库"
        )
```

**问题**：
1. 使用 `HTTPException` 而非统一的 `PermissionError`
2. 未提取为可复用函数
3. 错误代码不统一

**建议**：提取为 `check_driver_warehouse_access` 函数

### 问题 2：车队长仓库分配权限检查内联

**位置**：`main.py` 第 428-446 行

**当前代码**：
```python
if current_user.role == UserRole.MANAGER:
    if user.role != UserRole.DRIVER:
        raise PermissionError(
            error_code=PermissionErrorCode.ROLE_INSUFFICIENT,
            message="车队长只能给司机分配仓库"
        )
    
    manager_warehouses = crud.get_user_warehouses(session, current_user.id)
    manager_warehouse_ids = set(w.id for w in manager_warehouses)
    
    requested_warehouse_ids = set(request.warehouse_ids)
    if not requested_warehouse_ids.issubset(manager_warehouse_ids):
        raise PermissionError(
            error_code=PermissionErrorCode.WAREHOUSE_NOT_ACCESSIBLE,
            message="只能分配您管理的仓库"
        )
```

**问题**：
1. 逻辑较复杂，未提取为函数
2. 与 `check_manager_warehouse_access` 功能部分重叠

**建议**：提取为 `check_manager_warehouse_assignment` 函数

## 优化建议

### 建议 1：添加司机仓库访问检查函数

在 `auth.py` 中添加：

```python
def check_driver_warehouse_access(
    driver: User,
    warehouse_id: int,
    session: Session
) -> None:
    """
    检查司机是否有权访问指定仓库
    
    Args:
        driver: 司机用户
        warehouse_id: 仓库ID
        session: 数据库会话
    
    Raises:
        PermissionError: 当司机无权访问该仓库时
    """
    import crud
    
    # 非司机角色直接通过
    if driver.role != UserRole.DRIVER:
        return
    
    # 获取司机分配的仓库
    user_warehouses = crud.get_user_warehouses(session, driver.id)
    user_warehouse_ids = set(w.id for w in user_warehouses)
    
    if warehouse_id not in user_warehouse_ids:
        logger.warning(
            f"权限拒绝: 司机 {driver.id} 尝试访问未分配的仓库 {warehouse_id}"
        )
        raise PermissionError(
            error_code=PermissionErrorCode.WAREHOUSE_NOT_ACCESSIBLE,
            message="无权访问该仓库"
        )
```

### 建议 2：添加车队长仓库分配检查函数

在 `auth.py` 中添加：

```python
def check_manager_warehouse_assignment(
    manager: User,
    target_user: User,
    warehouse_ids: List[int],
    session: Session
) -> None:
    """
    检查车队长是否有权给目标用户分配指定仓库
    
    Args:
        manager: 车队长用户
        target_user: 目标用户
        warehouse_ids: 要分配的仓库ID列表
        session: 数据库会话
    
    Raises:
        PermissionError: 当车队长无权执行分配时
    """
    import crud
    
    # 非车队长角色直接通过
    if manager.role != UserRole.MANAGER:
        return
    
    # 车队长只能给司机分配仓库
    if target_user.role != UserRole.DRIVER:
        raise PermissionError(
            error_code=PermissionErrorCode.ROLE_INSUFFICIENT,
            message="车队长只能给司机分配仓库"
        )
    
    # 获取车队长管理的仓库
    manager_warehouses = crud.get_user_warehouses(session, manager.id)
    manager_warehouse_ids = set(w.id for w in manager_warehouses)
    
    # 检查请求的仓库是否都在车队长管理范围内
    requested_warehouse_ids = set(warehouse_ids)
    if not requested_warehouse_ids.issubset(manager_warehouse_ids):
        raise PermissionError(
            error_code=PermissionErrorCode.WAREHOUSE_NOT_ACCESSIBLE,
            message="只能分配您管理的仓库"
        )
```

### 建议 3：添加司机记录过滤辅助函数（可选）

```python
def filter_user_id_for_driver(
    current_user: User,
    user_id: Optional[int]
) -> Optional[int]:
    """
    为司机角色过滤 user_id 参数
    
    司机只能查看自己的记录，其他角色可以查看指定用户或所有用户的记录。
    
    Args:
        current_user: 当前用户
        user_id: 请求的用户ID（可选）
    
    Returns:
        过滤后的 user_id
    """
    if current_user.role == UserRole.DRIVER:
        return current_user.id
    return user_id
```

## 优化优先级

| 优先级 | 问题 | 影响范围 | 建议 |
|--------|------|----------|------|
| 高 | 司机仓库访问检查未统一 | 1 处 | 提取函数并使用 PermissionError |
| 中 | 车队长仓库分配检查内联 | 1 处 | 提取函数 |
| 低 | 司机记录过滤重复 | 5 处 | 可选优化，当前代码已足够清晰 |

## 总结

### 优点

1. **已有统一的权限检查框架**：`auth.py` 中定义了完整的权限检查函数和错误类型
2. **错误代码统一**：使用 `PermissionErrorCode` 枚举定义错误类型
3. **预定义角色依赖**：提供了多种预定义的角色检查依赖
4. **日志记录完善**：权限拒绝时记录详细日志

### 需要改进

1. **1 处使用 HTTPException 而非 PermissionError**：仓库车辆列表 API
2. **1 处复杂逻辑未提取**：车队长仓库分配权限检查
3. **5 处简单重复**：司机记录过滤（可选优化）

### 代码质量评分

| 指标 | 评分 | 说明 |
|------|------|------|
| 统一性 | 8/10 | 大部分使用统一函数，少数例外 |
| 可维护性 | 9/10 | 权限逻辑集中在 auth.py |
| 可读性 | 9/10 | 函数命名清晰，注释完整 |
| 可扩展性 | 9/10 | 易于添加新的权限检查 |

**总体评价**：权限检查代码质量良好，已有统一的框架，仅有少量可优化的地方。
