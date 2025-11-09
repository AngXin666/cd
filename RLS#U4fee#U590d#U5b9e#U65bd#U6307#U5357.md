# RLS策略修复实施指南

## 快速开始

本指南将帮助您快速应用RLS策略修复，解决发现的安全问题。

---

## 🚨 紧急修复（必须立即执行）

### 修复1：profiles 表权限提升漏洞

**问题**：普通管理员可以将自己提升为超级管理员  
**风险等级**：🔴 严重  
**修复文件**：`supabase/migrations/25_fix_profiles_permission_escalation.sql`

#### 应用方法

**方法1：使用代码工具（推荐）**

在您的应用代码中调用 `supabase_apply_migration` 工具：

```typescript
import { supabase_apply_migration } from '@/tools/supabase';

// 应用迁移
await supabase_apply_migration({
  name: '25_fix_profiles_permission_escalation',
  query: `
    -- 复制 supabase/migrations/25_fix_profiles_permission_escalation.sql 的内容
  `
});
```

**方法2：手动执行（备选）**

1. 登录 Supabase 控制台
2. 进入 SQL Editor
3. 复制 `supabase/migrations/25_fix_profiles_permission_escalation.sql` 的内容
4. 粘贴并执行

#### 验证修复

执行以下SQL验证修复是否成功：

```sql
-- 1. 检查策略是否正确创建
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'profiles' 
ORDER BY policyname;

-- 预期结果：应该看到以下策略
-- - 管理员可以创建司机账号
-- - 管理员可以更新司机档案
-- - 管理员可以删除司机账号
-- - 超级管理员拥有完全访问权限
-- - 用户可以查看自己的档案
-- - 用户可以更新自己的档案
-- - 允许匿名用户创建profile
-- - 允许认证用户创建自己的profile

-- 2. 检查触发器是否创建
SELECT tgname 
FROM pg_trigger 
WHERE tgrelid = 'profiles'::regclass;

-- 预期结果：应该看到 check_role_change 触发器
```

#### 功能测试

**测试1：普通管理员无法提升权限**
1. 使用普通管理员账号登录
2. 尝试修改自己的角色为超级管理员
3. **预期结果**：操作失败，提示"只有超级管理员可以修改用户角色"

**测试2：普通管理员只能管理司机**
1. 使用普通管理员账号登录
2. 尝试创建司机账号 → 应该成功
3. 尝试创建管理员账号 → 应该失败
4. 尝试删除超级管理员账号 → 应该失败

---

### 修复2：piece_work_records 表策略清理

**问题**：策略重复定义，命名不一致  
**风险等级**：🟡 中等  
**修复文件**：`supabase/migrations/26_cleanup_piece_work_policies.sql`

#### 应用方法

**方法1：使用代码工具（推荐）**

```typescript
import { supabase_apply_migration } from '@/tools/supabase';

// 应用迁移
await supabase_apply_migration({
  name: '26_cleanup_piece_work_policies',
  query: `
    -- 复制 supabase/migrations/26_cleanup_piece_work_policies.sql 的内容
  `
});
```

**方法2：手动执行（备选）**

1. 登录 Supabase 控制台
2. 进入 SQL Editor
3. 复制 `supabase/migrations/26_cleanup_piece_work_policies.sql` 的内容
4. 粘贴并执行

#### 验证修复

执行以下SQL验证修复是否成功：

```sql
-- 检查策略数量和命名
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'piece_work_records' 
ORDER BY policyname;

-- 预期结果：应该有 9 个策略，全部使用中文命名
-- 1. 超级管理员拥有完整权限
-- 2. 管理员可以查看管辖仓库的计件记录
-- 3. 管理员可以创建管辖仓库的计件记录
-- 4. 管理员可以更新管辖仓库的计件记录
-- 5. 管理员可以删除管辖仓库的计件记录
-- 6. 用户可以查看自己的计件记录
-- 7. 用户可以创建自己的计件记录
-- 8. 用户可以更新自己的计件记录
-- 9. 用户可以删除自己的计件记录
```

#### 功能测试

**测试1：超级管理员权限**
1. 使用超级管理员账号登录
2. 查看所有计件记录 → 应该成功
3. 创建、更新、删除任意计件记录 → 应该成功

**测试2：普通管理员权限**
1. 使用普通管理员账号登录
2. 查看管辖仓库的计件记录 → 应该成功
3. 查看非管辖仓库的计件记录 → 应该失败
4. 创建、更新、删除管辖仓库的计件记录 → 应该成功

**测试3：司机权限**
1. 使用司机账号登录
2. 查看自己的计件记录 → 应该成功
3. 创建、更新、删除自己的计件记录 → 应该成功
4. 查看其他司机的计件记录 → 应该失败

---

## 📋 完整实施清单

### 准备工作
- [ ] 备份当前数据库
- [ ] 通知所有管理员即将进行系统维护
- [ ] 准备回滚方案

### 执行修复
- [ ] 应用 `25_fix_profiles_permission_escalation.sql`
- [ ] 验证 profiles 表策略
- [ ] 测试 profiles 表权限
- [ ] 应用 `26_cleanup_piece_work_policies.sql`
- [ ] 验证 piece_work_records 表策略
- [ ] 测试 piece_work_records 表权限

### 后续验证
- [ ] 使用不同角色账号测试所有功能
- [ ] 检查应用日志是否有权限错误
- [ ] 确认所有用户可以正常使用系统

### 完成确认
- [ ] 所有测试通过
- [ ] 无权限错误
- [ ] 系统运行正常
- [ ] 更新文档

---

## 🔄 回滚方案

如果修复后出现问题，可以按以下步骤回滚：

### 回滚修复1：profiles 表

```sql
-- 1. 删除新策略
DROP POLICY IF EXISTS "管理员可以创建司机账号" ON profiles;
DROP POLICY IF EXISTS "管理员可以更新司机档案" ON profiles;
DROP POLICY IF EXISTS "管理员可以删除司机账号" ON profiles;

-- 2. 删除触发器
DROP TRIGGER IF EXISTS check_role_change ON profiles;
DROP FUNCTION IF EXISTS prevent_role_change();

-- 3. 恢复旧策略
CREATE POLICY "管理员可以创建用户" ON profiles
    FOR INSERT TO authenticated
    WITH CHECK (is_manager_or_above(auth.uid()));

CREATE POLICY "管理员可以更新所有用户" ON profiles
    FOR UPDATE TO authenticated
    USING (is_manager_or_above(auth.uid()))
    WITH CHECK (is_manager_or_above(auth.uid()));

CREATE POLICY "管理员可以删除用户" ON profiles
    FOR DELETE TO authenticated
    USING (is_manager_or_above(auth.uid()));
```

### 回滚修复2：piece_work_records 表

```sql
-- 删除新策略
DROP POLICY IF EXISTS "超级管理员拥有完整权限" ON piece_work_records;
DROP POLICY IF EXISTS "管理员可以查看管辖仓库的计件记录" ON piece_work_records;
DROP POLICY IF EXISTS "管理员可以创建管辖仓库的计件记录" ON piece_work_records;
DROP POLICY IF EXISTS "管理员可以更新管辖仓库的计件记录" ON piece_work_records;
DROP POLICY IF EXISTS "管理员可以删除管辖仓库的计件记录" ON piece_work_records;
DROP POLICY IF EXISTS "用户可以查看自己的计件记录" ON piece_work_records;
DROP POLICY IF EXISTS "用户可以创建自己的计件记录" ON piece_work_records;
DROP POLICY IF EXISTS "用户可以更新自己的计件记录" ON piece_work_records;
DROP POLICY IF EXISTS "用户可以删除自己的计件记录" ON piece_work_records;

-- 恢复旧策略（从 15_fix_super_admin_permissions.sql）
CREATE POLICY "超级管理员拥有完整权限" ON piece_work_records
    FOR ALL TO authenticated
    USING (is_super_admin(auth.uid()))
    WITH CHECK (is_super_admin(auth.uid()));

-- ... 恢复其他旧策略 ...
```

---

## ⚠️ 注意事项

### 执行前
1. **备份数据库**：确保可以回滚
2. **选择低峰时段**：减少对用户的影响
3. **通知用户**：提前告知系统维护时间

### 执行中
1. **逐个应用**：先应用修复1，测试通过后再应用修复2
2. **及时验证**：每个修复应用后立即验证
3. **记录日志**：记录执行过程和结果

### 执行后
1. **全面测试**：使用不同角色测试所有功能
2. **监控日志**：观察是否有权限错误
3. **收集反馈**：询问用户是否有异常

---

## 📞 问题反馈

如果在实施过程中遇到问题，请检查：

### 常见问题

**问题1：策略创建失败**
- 原因：可能存在同名策略
- 解决：先删除旧策略再创建新策略

**问题2：触发器创建失败**
- 原因：可能存在同名触发器或函数
- 解决：先删除旧触发器和函数

**问题3：权限测试失败**
- 原因：策略可能未生效或逻辑错误
- 解决：检查策略定义，确认辅助函数正常工作

**问题4：用户无法正常使用**
- 原因：策略过于严格
- 解决：检查策略逻辑，必要时回滚

---

## 📊 预期效果

### 修复前
- ❌ 普通管理员可以提升自己为超级管理员
- ❌ 策略重复，命名混乱
- ❌ 维护困难，容易出错

### 修复后
- ✅ 权限严格控制，无法越权
- ✅ 策略清晰明确，易于维护
- ✅ 安全性显著提升

### 性能影响
- 对系统性能无明显影响
- RLS 策略在数据库层面执行，效率高
- 用户体验无变化

---

## 🎯 成功标准

修复成功的标准：

1. ✅ 所有策略正确创建
2. ✅ 触发器正常工作
3. ✅ 权限测试全部通过
4. ✅ 用户可以正常使用系统
5. ✅ 无权限错误日志
6. ✅ 安全漏洞已修复

---

## 📖 相关文档

- `RLS策略审查总结.md` - 审查总结（简版）
- `RLS_POLICY_AUDIT_REPORT.md` - 完整审查报告（详版）
- `supabase/migrations/25_fix_profiles_permission_escalation.sql` - 修复文件1
- `supabase/migrations/26_cleanup_piece_work_policies.sql` - 修复文件2

---

**实施时间建议**：选择系统使用低峰时段，预计总耗时30分钟  
**风险等级**：中等（已提供完整回滚方案）  
**建议执行人员**：系统管理员或数据库管理员
