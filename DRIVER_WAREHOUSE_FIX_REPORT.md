# 司机仓库分配修复报告

## 问题描述

在数据库重构为单用户系统后，`driver_warehouses` 表被删除，改用统一的 `warehouse_assignments` 表。但代码中的 API 函数还在使用已删除的 `driver_warehouses` 表，导致：
- 老板端分配仓库给司机时保存失败
- 司机端查询不到分配的仓库数据
- 实时更新功能无法正常工作

## 表结构变化

### 旧表（已删除）
```sql
driver_warehouses (
  id UUID,
  driver_id UUID,
  warehouse_id UUID,
  created_at TIMESTAMPTZ
)
```

### 新表（当前使用）
```sql
warehouse_assignments (
  id UUID,
  warehouse_id UUID,
  user_id UUID,      -- 统一使用 user_id，包括司机、车队长、管理员
  assigned_by UUID,
  created_at TIMESTAMPTZ
)
```

## 修复内容

### 1. API 函数修复（13 个函数）

#### src/db/api.ts
1. **getDriverWarehouses** - 获取司机的仓库列表
   - 表名：`driver_warehouses` → `warehouse_assignments`
   - 字段：`driver_id` → `user_id`

2. **getDriverWarehouseIds** - 获取司机的仓库ID列表
   - 表名：`driver_warehouses` → `warehouse_assignments`
   - 字段：`driver_id` → `user_id`

3. **getDriversByWarehouse** - 获取仓库的司机列表
   - 表名：`driver_warehouses` → `warehouse_assignments`
   - 字段：`driver_id` → `user_id`

4. **insertWarehouseAssignment** - 插入仓库分配记录
   - 表名：`driver_warehouses` → `warehouse_assignments`
   - 字段映射：`driver_id` → `user_id`

5. **removeWarehouseFromDriver** - 移除司机的仓库分配
   - 表名：`driver_warehouses` → `warehouse_assignments`
   - 字段：`driver_id` → `user_id`

6. **getAllDriverWarehouses** - 获取所有司机的仓库分配
   - 表名：`driver_warehouses` → `warehouse_assignments`
   - 添加兼容性映射：`user_id` → `driver_id`

7. **getWarehouseAssignmentsByDriver** - 获取司机的仓库分配记录
   - 表名：`driver_warehouses` → `warehouse_assignments`
   - 字段：`driver_id` → `user_id`
   - 添加兼容性映射

8. **deleteWarehouseAssignmentsByDriver** - 删除司机的所有仓库分配
   - 表名：`driver_warehouses` → `warehouse_assignments`
   - 字段：`driver_id` → `user_id`

9. **updateDriverWarehouses** - 更新司机的仓库分配
   - 表名：`driver_warehouses` → `warehouse_assignments`
   - 字段：`driver_id` → `user_id`

10. **getWarehouseDriverCount** - 获取仓库的司机数量
    - 表名：`driver_warehouses` → `warehouse_assignments`

11. **getWarehouseDashboardStats** - 获取仓库仪表盘统计
    - 表名：`driver_warehouses` → `warehouse_assignments`
    - 字段：`driver_id` → `user_id`

12. **getDriverMonthStats** - 获取司机月度统计
    - 表名：`driver_warehouses` → `warehouse_assignments`
    - 字段：`driver_id` → `user_id`

13. **getManagerMonthStats** - 获取车队长月度统计
    - 表名：`driver_warehouses` → `warehouse_assignments`
    - 字段：`driver_id` → `user_id`

14. **getDriverIdsByWarehouse** - 获取仓库的所有司机ID
    - 表名：`driver_warehouses` → `warehouse_assignments`
    - 字段：`driver_id` → `user_id`

### 2. 实时订阅修复（2 个 Hook）

#### src/hooks/useDriverDashboard.ts
- 频道名：`driver_warehouses_${userId}` → `warehouse_assignments_${userId}`
- 表名：`driver_warehouses` → `warehouse_assignments`
- 过滤字段：`driver_id` → `user_id`

#### src/hooks/useDriverStats.ts
- 表名：`driver_warehouses` → `warehouse_assignments`
- 字段：`driver_id` → `user_id`

### 3. 前端页面修复

#### src/pages/super-admin/user-management/index.tsx
- 更新注释：`driver_warehouses` → `warehouse_assignments`

#### src/services/notificationService.ts
- 表名：`driver_warehouses` → `warehouse_assignments`
- 字段：`driver_id` → `user_id`
- 更新注释

### 4. 兼容性处理

为了保持返回值结构的一致性，在某些函数中添加了字段映射：
```typescript
// 将 user_id 映射为 driver_id，保持兼容性
return data.map(item => ({
  ...item,
  driver_id: item.user_id
}))
```

这样可以确保前端代码不需要修改，仍然可以使用 `driver_id` 字段。

## 验证结果

### 代码检查
```bash
pnpm run lint
```
✅ 通过 - 没有错误

### 引用检查
```bash
grep -r "driver_warehouses" src/
```
✅ 只剩下 2 个缓存键名引用（可以保留）

## 影响范围

### 修复的文件
1. `src/db/api.ts` - 13 个函数
2. `src/hooks/useDriverDashboard.ts` - 1 个订阅
3. `src/hooks/useDriverStats.ts` - 1 个订阅
4. `src/pages/super-admin/user-management/index.tsx` - 1 个注释
5. `src/services/notificationService.ts` - 2 个查询

### 影响的功能
1. ✅ 老板端分配仓库给司机
2. ✅ 司机端查看分配的仓库
3. ✅ 仓库统计数据
4. ✅ 司机月度统计
5. ✅ 车队长月度统计
6. ✅ 实时更新功能
7. ✅ 通知系统

## 测试建议

### 1. 老板端测试
- [ ] 登录老板账号
- [ ] 进入用户管理页面
- [ ] 选择一个司机
- [ ] 分配仓库给司机
- [ ] 验证保存成功
- [ ] 刷新页面，验证数据持久化

### 2. 司机端测试
- [ ] 登录司机账号
- [ ] 进入首页
- [ ] 查看分配的仓库列表
- [ ] 验证仓库信息正确显示

### 3. 实时更新测试
- [ ] 同时打开老板端和司机端
- [ ] 在老板端修改司机的仓库分配
- [ ] 验证司机端实时更新

### 4. 统计数据测试
- [ ] 查看仓库仪表盘
- [ ] 验证司机数量统计正确
- [ ] 查看司机月度统计
- [ ] 验证仓库数量统计正确

## 总结

本次修复成功将所有 `driver_warehouses` 表引用更新为 `warehouse_assignments` 表，确保了：

1. **数据一致性**：所有代码使用统一的表结构
2. **功能完整性**：所有相关功能都已更新
3. **兼容性**：添加了字段映射，保持前端代码兼容
4. **实时性**：更新了实时订阅，确保数据同步
5. **代码质量**：通过了所有 lint 检查

系统现在应该可以正常处理司机仓库分配的所有操作。
