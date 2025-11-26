# 车队管理小程序 RLS 安全审查报告

生成时间: 2025-11-26

## 执行摘要

本报告对车队管理小程序的所有行级安全（RLS）策略进行了全面审查，识别出**3个高危问题**、**5个中危问题**和**8个低危问题**。

### 严重程度分类
- 🔴 **高危**: 可能导致数据泄露或未授权访问
- 🟡 **中危**: 可能影响功能正常运行或数据一致性
- 🟢 **低危**: 最佳实践建议，不影响安全性

---

## 🔴 高危问题

### 1. warehouse_categories 表未启用 RLS

**问题描述**:
- `warehouse_categories` 表没有启用行级安全策略
- 任何认证用户都可以查看、修改、删除所有租户的仓库品类数据

**影响范围**:
- 租户A可以查看租户B的品类和价格信息
- 租户A可以修改或删除租户B的品类数据
- 严重违反多租户隔离原则

**受影响功能**:
- 仓库品类管理
- 计件工资计算
- 品类价格设置

**修复建议**:
```sql
-- 启用 RLS
ALTER TABLE warehouse_categories ENABLE ROW LEVEL SECURITY;

-- 添加租户隔离策略
CREATE POLICY "Users can only access their tenant's categories"
ON warehouse_categories
FOR ALL
TO authenticated
USING (
  tenant_id IN (
    SELECT tenant_id FROM profiles WHERE id = auth.uid()
  )
);

-- 租赁管理员可以访问所有数据
CREATE POLICY "Lease admins can access all categories"
ON warehouse_categories
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'lease_admin'::user_role
  )
);
```

**修复优先级**: ⚠️ **立即修复**

---

### 2. attendance_records 表未启用 RLS

**问题描述**:
- `attendance_records` 表没有启用行级安全策略
- 虽然有9个策略定义，但表本身未启用RLS

**影响范围**:
- 租户间考勤数据可能泄露
- 未授权用户可能访问其他租户的考勤记录

**受影响功能**:
- 考勤打卡
- 考勤统计
- 达标率计算

**修复建议**:
```sql
-- 启用 RLS
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
```

**修复优先级**: ⚠️ **立即修复**

---

### 3. notifications 表的 RLS 策略被禁用

**问题描述**:
- 在迁移文件 `00064_disable_notifications_rls.sql` 中禁用了通知表的RLS
- 所有用户可以查看所有通知，包括其他租户的通知

**影响范围**:
- 租户A可以看到租户B的通知
- 可能泄露敏感业务信息（如请假审批、车辆分配等）

**受影响功能**:
- 通知中心
- 实时通知推送
- 消息提醒

**修复建议**:
```sql
-- 重新启用 RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 添加租户隔离策略
CREATE POLICY "Users can only view their tenant's notifications"
ON notifications
FOR SELECT
TO authenticated
USING (
  recipient_id = auth.uid()
  OR
  tenant_id IN (
    SELECT tenant_id FROM profiles WHERE id = auth.uid()
  )
);

-- 租赁管理员可以查看所有通知
CREATE POLICY "Lease admins can view all notifications"
ON notifications
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'lease_admin'::user_role
  )
);
```

**修复优先级**: ⚠️ **立即修复**

---

## 🟡 中危问题

### 4. profiles 表策略过多（45个策略）

**问题描述**:
- `profiles` 表有45个RLS策略，数量异常多
- 可能存在重复或冲突的策略
- 影响查询性能

**影响范围**:
- 用户登录和权限检查变慢
- 数据库查询性能下降
- 策略维护困难

**修复建议**:
1. 审查所有策略，删除重复的策略
2. 合并功能相似的策略
3. 优化策略逻辑，减少子查询

**修复优先级**: 🔶 **建议尽快修复**

---

### 5. 平级账号的租户隔离问题

**问题描述**:
- 平级账号（`main_account_id` 不为空的 `super_admin`）的租户隔离逻辑复杂
- 在某些表中可能无法正确访问主账号的数据

**影响范围**:
- 平级账号可能无法查看应该有权限的数据
- 可能导致功能异常

**受影响功能**:
- 平级账号的所有管理功能

**修复建议**:
检查所有表的RLS策略，确保平级账号可以访问主账号的数据：
```sql
-- 示例：修复某个表的策略
CREATE POLICY "Peer accounts can access main account data"
ON some_table
FOR ALL
TO authenticated
USING (
  tenant_id IN (
    SELECT p2.tenant_id
    FROM profiles p1
    JOIN profiles p2 ON p1.main_account_id = p2.id
    WHERE p1.id = auth.uid()
  )
);
```

**修复优先级**: 🔶 **建议修复**

---

### 6. SECURITY DEFINER 函数安全风险

**问题描述**:
- 系统中有多个使用 `SECURITY DEFINER` 的函数
- 这些函数以创建者权限运行，可能绕过RLS

**影响范围**:
- 如果函数逻辑有漏洞，可能导致权限提升
- 可能被利用进行未授权操作

**受影响函数**:
- `handle_new_user()`
- `is_admin()`
- `is_manager()`
- `is_super_admin()`
- `is_lease_admin_user()`
- 等等

**修复建议**:
1. 审查所有 `SECURITY DEFINER` 函数的逻辑
2. 确保函数内部有适当的权限检查
3. 考虑使用 `SECURITY INVOKER` 替代（如果可能）
4. 添加 `SET search_path = public` 防止搜索路径攻击

**修复优先级**: 🔶 **建议审查**

---

### 7. 车队长权限范围不明确

**问题描述**:
- 车队长（manager）的权限范围依赖于 `manager_warehouses` 表
- 如果该表数据不正确，可能导致权限异常

**影响范围**:
- 车队长可能无法访问应该管理的仓库
- 或者可以访问不应该管理的仓库

**受影响功能**:
- 车队长的所有管理功能

**修复建议**:
1. 添加数据一致性检查
2. 确保 `manager_warehouses` 表的数据正确性
3. 添加触发器自动维护关联关系

**修复优先级**: 🔶 **建议优化**

---

### 8. 存储桶（Storage Bucket）权限过于宽松

**问题描述**:
- 所有认证用户都可以上传头像和车辆照片
- 没有租户隔离
- 没有文件大小限制

**影响范围**:
- 租户A可以看到租户B的照片
- 可能被滥用上传大文件

**受影响功能**:
- 头像上传
- 车辆照片上传
- 行驶证照片上传

**修复建议**:
```sql
-- 添加租户隔离
CREATE POLICY "Users can only access their tenant's files"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] IN (
    SELECT tenant_id::text FROM profiles WHERE id = auth.uid()
  )
);

-- 添加文件大小限制（在应用层）
```

**修复优先级**: 🔶 **建议优化**

---

## 🟢 低危问题

### 9. 策略命名不一致

**问题描述**:
- 不同表的策略命名风格不统一
- 有些使用 "Users can..."，有些使用 "Super admins can..."

**影响**: 维护困难，但不影响安全性

**修复建议**: 统一命名规范

---

### 10. 缺少策略注释

**问题描述**:
- 大部分策略没有注释说明用途

**影响**: 维护困难，但不影响安全性

**修复建议**: 为所有策略添加注释

---

### 11. 重复的策略定义

**问题描述**:
- 某些策略在多个迁移文件中重复定义
- 例如 `fix_category_prices_rls_for_managers` 系列

**影响**: 可能导致策略冲突

**修复建议**: 清理重复的策略定义

---

### 12. 缺少审计日志

**问题描述**:
- 没有记录敏感操作的审计日志
- 无法追踪谁修改了什么数据

**影响**: 安全事件难以追溯

**修复建议**: 添加审计日志表和触发器

---

### 13. 缺少数据备份策略

**问题描述**:
- 没有定期备份策略
- 数据丢失风险

**影响**: 数据安全风险

**修复建议**: 配置自动备份

---

### 14. 缺少性能监控

**问题描述**:
- 没有监控RLS策略的性能影响

**影响**: 可能存在性能瓶颈

**修复建议**: 添加性能监控

---

### 15. 缺少定期安全审查

**问题描述**:
- 没有定期审查RLS策略的机制

**影响**: 安全漏洞可能长期存在

**修复建议**: 建立定期审查流程

---

### 16. 缺少安全测试

**问题描述**:
- 没有自动化的安全测试

**影响**: 新的安全漏洞可能被引入

**修复建议**: 添加安全测试用例

---

## 修复优先级总结

### 立即修复（高危）
1. ✅ **warehouse_categories 表启用 RLS**
2. ✅ **attendance_records 表启用 RLS**
3. ✅ **notifications 表重新启用 RLS**

### 尽快修复（中危）
4. 🔶 **清理 profiles 表的重复策略**
5. 🔶 **修复平级账号的租户隔离**
6. 🔶 **审查 SECURITY DEFINER 函数**
7. 🔶 **优化车队长权限范围**
8. 🔶 **加强存储桶权限控制**

### 建议优化（低危）
9-16. 🟢 **改进维护性和可追溯性**

---

## 详细策略清单

### profiles 表（45个策略）
⚠️ **策略过多，需要清理**

### vehicles 表（9个策略）
✅ 策略合理

### warehouses 表（8个策略）
✅ 策略合理

### warehouse_categories 表（0个策略）
🔴 **未启用RLS，高危！**

### attendance_records 表（9个策略）
🔴 **未启用RLS，高危！**

### attendance_rules 表（2个策略）
✅ 策略合理

### piece_work_records 表（11个策略）
✅ 策略合理

### leave_applications 表（11个策略）
✅ 策略合理

### driver_licenses 表（8个策略）
✅ 策略合理

### driver_warehouses 表（2个策略）
✅ 策略合理

### manager_warehouses 表（2个策略）
✅ 策略合理

### notifications 表
🔴 **RLS被禁用，高危！**

### vehicle_records 表
✅ 策略合理

### leases 表
✅ 策略合理（已修复）

---

## 建议的修复脚本

请查看以下修复脚本文件：
- `supabase/migrations/053_fix_warehouse_categories_rls.sql`
- `supabase/migrations/054_fix_attendance_records_rls.sql`
- `supabase/migrations/055_fix_notifications_rls.sql`

---

## 结论

车队管理小程序的RLS策略整体设计合理，但存在**3个高危安全漏洞**需要立即修复：

1. **warehouse_categories 表未启用RLS** - 可能导致租户间数据泄露
2. **attendance_records 表未启用RLS** - 可能导致考勤数据泄露
3. **notifications 表RLS被禁用** - 可能导致通知数据泄露

建议**立即修复**这3个高危问题，然后逐步优化中危和低危问题。

---

## 附录：RLS 最佳实践

1. **默认拒绝**: 所有表都应该启用RLS，默认拒绝所有访问
2. **最小权限原则**: 只授予必要的权限
3. **租户隔离**: 确保多租户数据完全隔离
4. **性能优化**: 避免复杂的子查询，使用索引
5. **定期审查**: 每季度审查一次RLS策略
6. **安全测试**: 添加自动化安全测试
7. **审计日志**: 记录所有敏感操作
8. **文档化**: 为所有策略添加注释

---

**报告生成时间**: 2025-11-26
**审查人员**: AI Assistant
**下次审查时间**: 2026-02-26
