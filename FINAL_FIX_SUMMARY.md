# 多租户系统修复总结

## 修复的核心问题

**问题**：司机频繁查询不到老板、平级账号、车队长账号

**原因**：
1. `get_current_user_boss_id()` 函数对老板返回 NULL，导致查询失败
2. RLS 策略不允许司机查看同租户的管理员

## 修复方案

### 1. 修复 `get_current_user_boss_id()` 函数

**修复前**：
```sql
SELECT boss_id FROM profiles WHERE id = auth.uid();
-- 老板返回 NULL
```

**修复后**：
```sql
SELECT 
  CASE 
    WHEN p.boss_id IS NULL AND p.role = 'super_admin' THEN p.id::text
    ELSE p.boss_id::text
  END
FROM profiles p
WHERE p.id = auth.uid();
-- 老板返回自己的 ID
```

### 2. 添加 RLS 策略：司机可以查看管理员

```sql
CREATE POLICY "Drivers can view same tenant admins"
ON profiles
FOR SELECT
USING (
  (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r(role, boss_id)) = 'driver'
  AND (
    (role = 'super_admin' AND id::text = get_current_user_boss_id())
    OR
    (role IN ('manager', 'peer_admin') AND boss_id::text = get_current_user_boss_id())
  )
);
```

### 3. 修复代码层面的 `boss_id` 设置

在 `createDriver()` 和 `createUser()` 函数中显式设置 `boss_id`：

```typescript
// 获取当前用户的角色和 boss_id
const {data: currentUserProfile} = await supabase
  .from('profiles')
  .select('boss_id, role')
  .eq('id', currentUser.id)
  .maybeSingle()

// 确定新用户的 boss_id
let newUserBossId: string
if (currentUserProfile.role === 'super_admin') {
  newUserBossId = currentUser.id
} else if (currentUserProfile.boss_id) {
  newUserBossId = currentUserProfile.boss_id
}
```

## 司机权限说明

### ✅ 司机可以查看
1. 自己的信息（个人资料、考勤、工资等）
2. 同租户的管理员（老板、车队长、平级账号）- 用于提交申请

### ❌ 司机不能查看
1. **其他司机的信息**（个人资料、考勤、工资等）
2. 其他租户的任何数据

## 修复的文件

### 数据库迁移
1. `supabase/migrations/99997_allow_null_boss_id_for_super_admin.sql` - 允许老板的 boss_id 为 NULL
2. `supabase/migrations/99996_update_auto_set_boss_id_for_multi_tenant.sql` - 更新触发器支持多租户
3. `supabase/migrations/99995_fix_get_current_user_boss_id_keep_text_type.sql` - 修复函数和添加 RLS 策略
4. `supabase/migrations/99994_remove_driver_view_other_drivers_policy.sql` - 删除错误的策略

### 代码文件
1. `src/db/api.ts` - 修复 `createDriver()` 和 `createUser()` 函数
2. `src/db/tenant-utils.ts` - 添加 `getCurrentUserBossId()` 函数
3. `src/utils/behaviorTracker.ts` - 修复异步调用
4. `src/utils/performanceMonitor.ts` - 修复异步调用
5. `src/pages/performance-monitor/index.tsx` - 修复类型映射
6. `src/pages/super-admin/user-management/index.tsx` - 修复类型错误

## 关于触发器

### 当前状态
触发器 `auto_set_boss_id()` 已创建，作为安全兜底机制。

### 触发器的作用
- 在代码遗漏时自动设置 `boss_id`
- 支持多租户系统
- 只在 `boss_id` 未设置时才触发

### 是否需要触发器？

**保留触发器的理由**：
- 作为安全兜底机制
- 防止代码遗漏
- 支持其他方式创建用户（数据导入、批量操作）

**删除触发器的理由**：
- 代码层面已经正确设置 `boss_id`
- 触发器增加系统复杂度
- 如果只通过代码创建用户，触发器是多余的

**建议**：保留触发器作为安全兜底，不会影响正常流程。

## 测试验证

### 测试 1: 司机查看管理员
```sql
-- 以司机身份登录
SELECT * FROM profiles 
WHERE 
  (role = 'super_admin' AND id::text = get_current_user_boss_id())
  OR
  (role IN ('manager', 'peer_admin') AND boss_id::text = get_current_user_boss_id());
-- 预期：✅ 返回同租户的老板、车队长、平级账号
```

### 测试 2: 司机尝试查看其他司机
```sql
-- 以司机身份登录
SELECT * FROM profiles 
WHERE role = 'driver' AND id != auth.uid();
-- 预期：❌ 返回空结果（不能查看其他司机）
```

### 测试 3: 司机提交请假申请
```typescript
const bossId = await getCurrentUserBossId(user.id)
console.log('boss_id:', bossId) // 应该输出老板的ID

const {data, error} = await supabase
  .from('leave_applications')
  .insert({
    user_id: user.id,
    boss_id: bossId,
    start_date: '2025-01-01',
    end_date: '2025-01-03',
    reason: '测试请假',
    status: 'pending'
  })
// 预期：✅ 成功插入
```

## 修复效果

✅ **老板账号**
- 可以查询自己租户的所有数据
- `get_current_user_boss_id()` 返回自己的 ID

✅ **司机账号**
- 可以查看同租户的管理员（老板、车队长、平级账号）
- 可以正常提交请假、离职申请
- **不能**查看其他司机的信息

✅ **多租户隔离**
- 每个租户的数据通过 `boss_id` 隔离
- RLS 策略确保数据安全
- 不同租户的数据互不干扰

## 总结

**司机查询不到老板、平级账号、车队长账号的问题已完全解决！**

核心修复：
1. ✅ 修复了 `get_current_user_boss_id()` 函数
2. ✅ 添加了司机查看管理员的 RLS 策略
3. ✅ 删除了错误的"司机查看其他司机"策略
4. ✅ 修复了代码层面的 `boss_id` 设置
5. ✅ 添加了触发器作为安全兜底（可选）

司机现在可以：
- ✅ 查看自己的信息
- ✅ 查看同租户的管理员
- ✅ 正常提交申请
- ❌ 不能查看其他司机
