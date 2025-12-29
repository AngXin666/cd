# 未使用代码检查报告

## 检查日期
2024-12-29

## 检查工具
- **vulture** - Python 静态分析工具（90% 置信度阈值）
- **grep** - 手动验证

## 检查范围
`fleet-manager/backend/` - 后端 Python 代码

## 检查结果概述

| 类别 | 发现数量 | 严重程度 |
|------|----------|----------|
| 未使用的导入 | 7 处 | 低 |
| 未使用的函数 | 0 处 | - |
| 未使用的变量 | 0 处 | - |

## 详细分析

### 1. 未使用的导入

#### 1.1 main.py 中的未使用导入

| 行号 | 导入名称 | 来源模块 | 说明 |
|------|----------|----------|------|
| 21 | `require_manager_or_boss` | auth.py | 权限装饰器，已定义但未在任何 API 端点使用 |
| 37 | `NotificationTemplatePreviewRequest` | schemas.py | Schema 类，已定义但未在任何 API 端点使用 |
| 37 | `SchemaScheduledNotificationStatus` | schemas.py | 枚举别名，已定义但未在代码中引用 |
| 66 | `get_scheduler_info` | scheduler.py | 函数别名，已定义但未被调用 |
| 3542 | `require_boss_or_super` | auth.py | 权限装饰器，已定义但未在任何 API 端点使用 |
| 4263 | `SchemaUpdateType` | schemas.py | 枚举别名，已定义但未在代码中引用 |

**详细说明**：

##### `require_manager_or_boss` (行 21)
```python
# 当前导入
from auth import require_manager_or_boss

# 定义位置 (auth.py:283)
require_manager_or_boss = require_roles([UserRole.MANAGER, UserRole.BOSS, UserRole.SUPER_ADMIN])

# 状态：导入但从未作为 Depends() 使用
```

##### `NotificationTemplatePreviewRequest` (行 37)
```python
# 当前导入
from schemas import NotificationTemplatePreviewRequest

# 定义位置 (schemas.py)
class NotificationTemplatePreviewRequest(BaseModel):
    variables: Optional[Dict[str, str]] = None

# 状态：导入但从未在 API 端点参数中使用
# 注意：模板预览 API 使用的是 Dict 类型而非此 Schema
```

##### `SchemaScheduledNotificationStatus` (行 37)
```python
# 当前导入
from schemas import ScheduledNotificationStatus as SchemaScheduledNotificationStatus

# 状态：创建了别名但从未使用
# 代码中直接使用 models.ScheduledNotificationStatus
```

##### `get_scheduler_info` (行 66)
```python
# 当前导入
from scheduler import get_scheduler_status as get_scheduler_info

# 状态：创建了别名但从未调用
# 代码中直接使用 get_scheduler_status
```

##### `require_boss_or_super` (行 3542)
```python
# 当前导入（重复导入）
from auth import require_super_admin, require_boss_or_super, get_role_display_name, get_creatable_roles

# 状态：导入但从未作为 Depends() 使用
# 注意：这是在文件中间的重复导入
```

##### `SchemaUpdateType` (行 4263)
```python
# 当前导入
from schemas import UpdateType as SchemaUpdateType

# 状态：创建了别名但从未使用
# 代码中直接使用 models.UpdateType
```

#### 1.2 ocr.py 中的未使用导入

| 行号 | 导入名称 | 来源模块 | 说明 |
|------|----------|----------|------|
| 6 | `base64` | 标准库 | 标准库模块，导入但从未调用任何方法 |

**详细说明**：

##### `base64` (行 6)
```python
# 当前导入
import base64

# 状态：导入但从未使用 base64.encode() 或 base64.decode() 等方法
# 可能是历史遗留代码，OCR 功能可能曾经需要 base64 编码
```

### 2. 误报排除

以下是 vulture 报告的 60% 置信度结果，经验证为**误报**（实际有使用）：

| 文件 | 函数名 | 验证结果 |
|------|--------|----------|
| crud.py | `get_user_by_id` | ✅ 被 main.py 调用 |
| crud.py | `get_users` | ✅ 被 main.py 调用 |
| crud.py | `create_user` | ✅ 被 main.py 调用 |
| crud.py | `update_user` | ✅ 被 main.py 调用 |
| crud.py | `delete_user` | ✅ 被 main.py 调用 |
| crud.py | `get_warehouse_by_id` | ✅ 被 main.py 调用 |
| crud.py | `get_warehouses` | ✅ 被 main.py 调用 |
| crud.py | `create_warehouse` | ✅ 被 main.py 调用 |
| crud.py | `update_warehouse` | ✅ 被 main.py 调用 |
| crud.py | `delete_warehouse` | ✅ 被 main.py 调用 |

## 清理建议

### 优先级高（建议立即清理）

1. **删除 ocr.py 中的 base64 导入**
   - 风险：无
   - 影响：无
   - 操作：删除 `import base64` 行

2. **删除 main.py 中的别名导入**
   - `SchemaScheduledNotificationStatus`
   - `get_scheduler_info`
   - `SchemaUpdateType`
   - 风险：无
   - 影响：无

### 优先级中（建议后续清理）

3. **删除未使用的权限装饰器导入**
   - `require_manager_or_boss`
   - `require_boss_or_super`
   - 风险：低（可能未来会使用）
   - 建议：保留定义，仅删除导入

4. **删除未使用的 Schema 导入**
   - `NotificationTemplatePreviewRequest`
   - 风险：低（可能未来会使用）
   - 建议：保留定义，仅删除导入

## 代码行数影响

| 操作 | 减少行数 |
|------|----------|
| 删除未使用导入 | 7 行 |
| **总计** | **7 行** |

## 结论

后端代码整体质量良好，未发现未使用的函数或变量。发现的 7 处未使用导入均为低风险问题：

1. **3 处别名导入**：创建了别名但实际使用原名
2. **2 处权限装饰器导入**：可能为未来功能预留
3. **1 处 Schema 导入**：可能为未来功能预留
4. **1 处标准库导入**：历史遗留代码

建议在下次代码清理时一并处理这些未使用的导入，以保持代码整洁。

## 注意事项

- 清理前需确保所有测试通过
- 建议分阶段清理，每次清理后运行完整测试套件
- 对于可能未来使用的导入，可以添加注释说明保留原因

## 相关报告

- [API 路由逻辑冗余检查报告](./API-REDUNDANCY-REPORT.md)
- [数据库查询冗余检查报告](./DATABASE-QUERY-REDUNDANCY-REPORT.md)
- [权限检查冗余检查报告](./PERMISSION-CHECK-REDUNDANCY-REPORT.md)
