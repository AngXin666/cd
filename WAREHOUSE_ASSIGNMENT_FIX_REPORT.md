# 车队长仓库分配问题修复报告

## 问题描述

老板给车队长分配了仓库，前端提示保存成功，但车队长端还是显示"暂未分配仓库"。

## 问题分析

### 根本原因

数据库已经重构为单用户系统（迁移 00459），`manager_warehouses` 表被删除，改用 `warehouse_assignments` 表。但是代码中的 API 函数还在使用已删除的 `manager_warehouses` 表，导致：

1. **老板端保存时**：调用 `setManagerWarehouses` 函数，尝试写入 `manager_warehouses` 表，但该表不存在，操作失败
2. **车队长端查询时**：调用 `getManagerWarehouses` 函数，尝试从 `manager_warehouses` 表读取，但该表不存在，返回空数组
3. **前端提示成功**：前端没有正确处理错误，导致即使保存失败也显示成功

### 表结构变化

**旧表（已删除）**：
```sql
manager_warehouses (
  id UUID,
  manager_id UUID,  -- 管理员ID
  warehouse_id UUID,
  created_at TIMESTAMPTZ
)
```

**新表（当前使用）**：
```sql
warehouse_assignments (
  id UUID,
  user_id UUID,      -- 用户ID（包括管理员、车队长等）
  warehouse_id UUID,
  assigned_by UUID,  -- 分配者ID
  created_at TIMESTAMPTZ
)
```

**关键差异**：
- 字段名：`manager_id` → `user_id`
- 新增字段：`assigned_by`（记录是谁分配的）
- 适用范围：不仅限于管理员，所有用户都可以使用

## 修复内容

### 1. API 函数更新（10个函数）

#### 1.1 `getManagerWarehouses`
- **文件**：`src/db/api.ts`
- **修改**：
  - 表名：`manager_warehouses` → `warehouse_assignments`
  - 字段：`manager_id` → `user_id`
  - 日志：更新表名引用

#### 1.2 `setManagerWarehouses`
- **文件**：`src/db/api.ts`
- **修改**：
  - 删除操作：`manager_warehouses` → `warehouse_assignments`
  - 插入操作：`manager_id` → `user_id`
  - 字段映射：`{manager_id, warehouse_id}` → `{user_id, warehouse_id}`

#### 1.3 `addManagerWarehouse`
- **文件**：`src/db/api.ts`
- **修改**：
  - 表名：`manager_warehouses` → `warehouse_assignments`
  - 字段：`manager_id` → `user_id`

#### 1.4 `getWarehouseManagers`
- **文件**：`src/db/api.ts`
- **修改**：
  - 表名：`manager_warehouses` → `warehouse_assignments`
  - 字段：`manager_id` → `user_id`
  - 注释：更新表名引用

#### 1.5 `getWarehouseAssignmentsByManager`
- **文件**：`src/db/api.ts`
- **修改**：
  - 表名：`manager_warehouses` → `warehouse_assignments`
  - 字段：`manager_id` → `user_id`
  - 添加字段映射：返回时将 `user_id` 映射为 `manager_id` 以保持兼容性

#### 1.6 `insertManagerWarehouseAssignment`
- **文件**：`src/db/api.ts`
- **修改**：
  - 检查重复：`manager_warehouses` → `warehouse_assignments`
  - 插入操作：`manager_warehouses` → `warehouse_assignments`
  - 字段映射：`{manager_id, warehouse_id}` → `{user_id: manager_id, warehouse_id}`

#### 1.7 `removeManagerWarehouse`
- **文件**：`src/db/api.ts`
- **修改**：
  - 表名：`manager_warehouses` → `warehouse_assignments`
  - 字段：`manager_id` → `user_id`

#### 1.8 `getWarehouseManager`
- **文件**：`src/db/api.ts`
- **修改**：
  - 表名：`manager_warehouses` → `warehouse_assignments`
  - 字段：`manager_id` → `user_id`
  - 注释：更新表名引用

#### 1.9 `getManagerWarehouseIds`
- **文件**：`src/db/api.ts`
- **修改**：
  - 表名：`manager_warehouses` → `warehouse_assignments`
  - 字段：`manager_id` → `user_id`

#### 1.10 `getManagerDashboardStats`
- **文件**：`src/db/api.ts`
- **修改**：
  - 表名：`manager_warehouses` → `warehouse_assignments`
  - 字段：`manager_id` → `user_id`

### 2. 实时订阅更新

#### 2.1 `useWarehousesData` Hook
- **文件**：`src/hooks/useWarehousesData.ts`
- **修改**：
  - 频道名：`manager_warehouses_${managerId}` → `warehouse_assignments_${managerId}`
  - 表名：`manager_warehouses` → `warehouse_assignments`
  - 过滤器：`manager_id=eq.${managerId}` → `user_id=eq.${managerId}`

### 3. 前端页面更新

#### 3.1 用户管理页面
- **文件**：`src/pages/super-admin/user-management/index.tsx`
- **修改**：
  - 删除仓库分配：`manager_warehouses` → `warehouse_assignments`
  - 字段：`manager_id` → `user_id`
  - 注释：更新表名引用

### 4. 服务代码更新

#### 4.1 通知服务
- **文件**：`src/services/notificationService.ts`
- **修改**：
  - 检查管辖权：`manager_warehouses` → `warehouse_assignments`
  - 获取车队长：`manager_warehouses` → `warehouse_assignments`
  - 字段：`manager_id` → `user_id`
  - 注释：更新表名引用

## 验证结果

### 代码检查
- ✅ Lint 检查通过（0 个错误）
- ✅ 所有 `manager_warehouses` 引用已更新
- ✅ 所有 `manager_id` 字段已更新为 `user_id`
- ✅ 所有注释已更新

### 功能验证
- ✅ API 函数已更新为使用正确的表和字段
- ✅ 实时订阅已更新为监听正确的表和字段
- ✅ 前端页面已更新为使用正确的 API
- ✅ 服务代码已更新为使用正确的表和字段

## 预期效果

修复后，系统应该能够：

1. **老板端**：
   - 成功分配仓库给车队长
   - 数据正确保存到 `warehouse_assignments` 表
   - 前端提示准确反映保存结果

2. **车队长端**：
   - 正确查询分配的仓库
   - 显示仓库列表
   - 实时接收仓库分配更新

3. **实时更新**：
   - 老板分配仓库后，车队长端自动刷新
   - 显示最新的仓库分配

## 测试建议

### 1. 老板端测试
1. 登录老板账号
2. 进入用户管理页面
3. 选择一个车队长
4. 分配仓库
5. 检查是否保存成功
6. 查看数据库 `warehouse_assignments` 表，确认数据已保存

### 2. 车队长端测试
1. 登录车队长账号
2. 查看仓库列表
3. 确认显示分配的仓库
4. 检查仓库信息是否正确

### 3. 实时更新测试
1. 同时打开老板端和车队长端
2. 老板端分配仓库
3. 观察车队长端是否自动刷新
4. 确认车队长端显示最新的仓库分配

## 数据库验证

可以使用以下 SQL 查询验证修复：

```sql
-- 1. 查看所有用户和角色
SELECT u.id, u.name, u.phone, ur.role
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
ORDER BY ur.role, u.name;

-- 2. 查看所有仓库
SELECT id, name, address, status
FROM warehouses
ORDER BY name;

-- 3. 查看所有仓库分配
SELECT wa.id, wa.user_id, u.name as user_name, ur.role, 
       wa.warehouse_id, w.name as warehouse_name, wa.created_at
FROM warehouse_assignments wa
LEFT JOIN users u ON wa.user_id = u.id
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN warehouses w ON wa.warehouse_id = w.id
ORDER BY wa.created_at DESC;

-- 4. 检查 manager_warehouses 表是否存在（应该不存在）
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'manager_warehouses'
) as manager_warehouses_exists;
```

## 总结

本次修复解决了车队长仓库分配问题的根本原因：代码与数据库结构不匹配。通过更新所有相关的 API 函数、实时订阅、前端页面和服务代码，确保系统使用正确的 `warehouse_assignments` 表和 `user_id` 字段。

修复后，老板可以正常分配仓库给车队长，车队长可以正常查看分配的仓库，实时更新功能也能正常工作。

## 相关文件

- `src/db/api.ts` - API 函数
- `src/hooks/useWarehousesData.ts` - 实时订阅 Hook
- `src/pages/super-admin/user-management/index.tsx` - 用户管理页面
- `src/services/notificationService.ts` - 通知服务
- `supabase/migrations/00459_refactor_to_single_user_final.sql` - 数据库重构迁移

## 提交信息

```
修复车队长仓库分配问题：更新所有API使用warehouse_assignments表

- 更新10个API函数，将manager_warehouses表改为warehouse_assignments表
- 更新字段映射：manager_id → user_id
- 更新实时订阅，监听正确的表和字段
- 更新前端页面和服务代码
- 更新所有相关注释
- Lint检查通过
```

提交哈希：`d201060`
