# 考勤功能优化需求

## 概述

优化考勤统计功能，支持按仓库筛选考勤记录，筛选逻辑基于用户的仓库分配（`WarehouseAssignment`）。

## 背景

### 当前系统架构

1. **仓库分配机制**
   - `WarehouseAssignment` 表：记录用户分配到哪个仓库工作
   - 管理员可以给用户分配一个或多个仓库
   - 通过 `crud.get_user_warehouses(session, user_id)` 获取用户分配的仓库列表
   - 通过 `crud.get_warehouse_users(session, warehouse_id)` 获取仓库下的用户列表

2. **考勤记录**
   - `Attendance` 表只有 `user_id`，没有 `warehouse_id` 字段
   - 打卡不关联仓库（这是正确的设计，保持不变）

3. **计件记录**
   - `PieceWorkRecord` 表有 `warehouse_id` 字段
   - 计件需要选择仓库（保持不变）

### 当前问题

- 考勤列表 API 不支持按仓库筛选
- 管理员无法按仓库查看考勤统计
- 车队长无法只查看自己管理仓库的司机考勤

## 需求描述

### 需求 1：考勤列表支持按仓库筛选

**用户故事**：作为管理员/车队长，我希望能按仓库筛选考勤记录，方便查看特定仓库的考勤情况。

**期望行为**：
- 考勤列表 API 新增 `warehouse_id` 参数
- 传入 `warehouse_id` 时，返回该仓库分配的所有用户的考勤记录
- 筛选逻辑基于 `WarehouseAssignment` 表，而非考勤记录本身

**影响范围**：
- 后端：`fleet-manager/backend/routers/attendance.py`
- 后端：`fleet-manager/backend/crud.py`

### 需求 2：角色权限控制

**用户故事**：作为管理员，我希望不同角色有不同的考勤查看权限。

**期望行为**：
- **司机**：只能查看自己的考勤记录
- **车队长**：只能查看自己管理仓库的司机考勤，指定非管理仓库时返回 403 错误
- **调度**：可以查看所有仓库的考勤，支持按仓库筛选
- **老板**：可以查看所有仓库的考勤，支持按仓库筛选

**影响范围**：
- 后端：`fleet-manager/backend/routers/attendance.py`

## 验收标准

### AC1：考勤列表按仓库筛选
- [ ] 考勤列表 API 支持 `warehouse_id` 参数
- [ ] 传入 `warehouse_id` 时，返回该仓库分配用户的考勤记录
- [ ] 不传 `warehouse_id` 时，保持原有逻辑

### AC2：角色权限控制
- [ ] 司机只能查看自己的考勤记录
- [ ] 车队长只能查看自己管理仓库的司机考勤
- [ ] 车队长指定非管理仓库时返回 403 错误
- [ ] 调度可以查看所有仓库的考勤
- [ ] 老板可以查看所有仓库的考勤

## 技术约束

- **不修改数据库表结构**：`Attendance` 表不添加 `warehouse_id` 字段
- **不新增 API**：复用现有 `GET /api/attendance` API，只新增参数
- **保持 API 兼容性**：新增参数为可选，不影响现有调用
- **复用现有 CRUD 函数**：使用 `crud.get_warehouse_users()` 获取仓库用户

## 相关文件

### 后端
- `fleet-manager/backend/routers/attendance.py` - 考勤路由
- `fleet-manager/backend/crud.py` - CRUD 操作（`get_warehouse_users`, `get_user_warehouses`）
- `fleet-manager/backend/models.py` - 数据模型

## 不在本次范围内

- 打卡功能修改（当前打卡不需要选择仓库，保持不变）
- 计件功能修改（计件需要选择仓库，保持不变）
- 前端页面修改（如需要，后续单独处理）

---

## 附加需求：删除超级管理员角色

### 需求 3：移除超级管理员角色

**用户故事**：作为项目维护者，我希望移除不需要的超级管理员角色，简化权限体系。

**期望行为**：
- 从 `UserRole` 枚举中删除 `SUPER_ADMIN`
- 删除所有超级管理员相关的权限判断代码
- 删除默认超级管理员账号创建逻辑
- 更新相关测试用例

**影响范围**：
- `fleet-manager/backend/models.py` - 删除 `SUPER_ADMIN` 枚举值
- `fleet-manager/backend/crud.py` - 删除默认超级管理员创建逻辑
- `fleet-manager/backend/helpers.py` - 更新权限判断逻辑
- `fleet-manager/backend/routers/*.py` - 更新所有涉及超级管理员的路由
- `fleet-manager/backend/tests/*.py` - 删除超级管理员相关测试

### AC3：超级管理员角色移除
- [ ] `UserRole` 枚举中不再包含 `SUPER_ADMIN`
- [ ] 所有权限判断代码中不再引用 `SUPER_ADMIN`
- [ ] 默认账号创建逻辑中不再创建超级管理员
- [ ] 相关测试用例已更新或删除
- [ ] 项目正常运行，无报错
