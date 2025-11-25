# 超级管理员仓库访问权限快速参考

## 问题
用户管理页面中，超级管理员无法读取仓库和用户信息。

## 原因
RLS 策略缺少超级管理员查看所有仓库分配的权限。

## 解决方案
为 `driver_warehouses` 和 `manager_warehouses` 表添加超级管理员查看权限策略。

## 新增策略

### driver_warehouses 表
```sql
CREATE POLICY "Super admins can view all driver warehouse assignments"
ON driver_warehouses
FOR SELECT
TO authenticated
USING (is_super_admin(auth.uid()));
```

### manager_warehouses 表
```sql
CREATE POLICY "Super admins can view all manager warehouse assignments"
ON manager_warehouses
FOR SELECT
TO authenticated
USING (is_super_admin(auth.uid()));
```

## 影响范围

### 受益功能
- ✅ 用户管理页面可以正常加载
- ✅ 超级管理员可以查看所有用户的仓库分配
- ✅ 仓库筛选功能正常工作

### 不受影响
- ✅ 司机权限不变（只能查看自己的）
- ✅ 管理员权限不变（只能查看自己管理的仓库）
- ✅ 租户数据隔离仍然有效

## 测试验证

### 测试 1：查询司机的仓库分配
```sql
SELECT 
  dw.driver_id,
  p.name as driver_name,
  dw.warehouse_id,
  w.name as warehouse_name
FROM driver_warehouses dw
JOIN profiles p ON p.id = dw.driver_id
LEFT JOIN warehouses w ON w.id = dw.warehouse_id
ORDER BY p.name;
```

### 测试 2：查询管理员的仓库分配
```sql
SELECT 
  mw.manager_id,
  p.name as manager_name,
  mw.warehouse_id,
  w.name as warehouse_name
FROM manager_warehouses mw
JOIN profiles p ON p.id = mw.manager_id
LEFT JOIN warehouses w ON w.id = mw.warehouse_id
ORDER BY p.name;
```

## 相关文件
- `supabase/migrations/00146_fix_super_admin_warehouse_access.sql`
- `FIX_SUPER_ADMIN_WAREHOUSE_ACCESS.md`

## 提交记录
```
818a39f - 修复超级管理员无法读取仓库和用户的问题
```

---

**修复日期**：2025-11-25  
**状态**：✅ 已完成
