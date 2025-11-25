# 修复创建老板账号主键冲突错误

## 问题描述

在创建老板账号时，遇到以下错误：

```
创建老板账号 profiles 记录失败: {
  code: '23505',
  details: null,
  hint: null,
  message: 'duplicate key value violates unique constraint "profiles_pkey"'
}
```

## 错误分析

### 错误代码说明
- **23505**: PostgreSQL 唯一约束违反错误
- **profiles_pkey**: profiles 表的主键约束
- 这意味着尝试插入的记录的主键（id）已经存在

### 问题根源

在 `createTenant` 函数中，存在以下执行流程：

```typescript
// 1. 创建认证用户
const {data: authData} = await supabase.auth.signUp({...})

// 2. 确认用户邮箱
await supabase.rpc('confirm_user_email', {user_id: authData.user.id})
// ⚠️ 这一步会触发 handle_new_user 触发器
// 触发器会自动创建 profiles 记录（id = authData.user.id）

// 3. 手动插入 profiles 记录
await supabase.from('profiles').insert({
  id: authData.user.id,  // ❌ 这个 id 已经被触发器创建了！
  // ...其他字段
})
// ❌ 导致主键冲突错误
```

### 触发器逻辑

查看 `supabase/migrations/044_fix_handle_new_user_trigger_duplicate.sql`：

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- 只在 confirmed_at 从 NULL → 非 NULL 时执行
  IF OLD.confirmed_at IS NULL AND NEW.confirmed_at IS NOT NULL THEN
    -- 检查 profiles 记录是否已存在
    SELECT EXISTS(SELECT 1 FROM profiles WHERE id = NEW.id) INTO profile_exists;
    
    -- 如果记录不存在，才插入
    IF NOT profile_exists THEN
      INSERT INTO profiles (id, phone, email, role)
      VALUES (NEW.id, NEW.phone, NEW.email, ...);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
```

**关键点**：
1. 当调用 `confirm_user_email` 时，会将 `confirmed_at` 从 NULL 设置为当前时间
2. 这会触发 `handle_new_user` 触发器
3. 触发器会自动创建 profiles 记录
4. 然后代码又尝试手动插入相同 id 的记录
5. 导致主键冲突

## 解决方案

### 修改策略

将 `createTenant` 函数的实现改为与 `createPeerAccount` 一致的方式：

1. **先创建认证用户**
2. **确认邮箱（触发器自动创建 profiles 记录）**
3. **等待触发器完成**
4. **使用 UPDATE 更新记录**（而不是 INSERT）

### 修改前的代码

```typescript
// 2. 自动确认用户邮箱（调用数据库函数）
const {error: confirmError} = await supabase.rpc('confirm_user_email', {
  user_id: authData.user.id
})

if (confirmError) {
  console.error('确认用户邮箱失败:', confirmError)
  // 不返回 null，继续创建 profiles 记录
}

// 3. 直接插入 profiles 记录（不依赖触发器）
const {data: profileData, error: profileError} = await supabase
  .from('profiles')
  .insert({  // ❌ INSERT 导致冲突
    id: authData.user.id,
    name: tenant.name,
    // ...其他字段
  })
  .select()
  .maybeSingle()
```

### 修改后的代码

```typescript
// 2. 自动确认用户邮箱（这会触发 handle_new_user 触发器创建基础 profiles 记录）
const {error: confirmError} = await supabase.rpc('confirm_user_email', {
  user_id: authData.user.id
})

if (confirmError) {
  console.error('确认用户邮箱失败:', confirmError)
  return null  // ✅ 失败时直接返回
}

// 3. 等待触发器创建 profiles 记录（短暂延迟）
await new Promise((resolve) => setTimeout(resolve, 500))

// 4. 更新 profiles 记录，设置老板账号相关字段
const {data: profileData, error: profileError} = await supabase
  .from('profiles')
  .update({  // ✅ UPDATE 而不是 INSERT
    name: tenant.name,
    phone: tenant.phone,
    email: email,
    role: 'super_admin' as UserRole,
    company_name: tenant.company_name,
    lease_start_date: tenant.lease_start_date,
    lease_end_date: tenant.lease_end_date,
    monthly_fee: tenant.monthly_fee,
    notes: tenant.notes,
    status: 'active',
    tenant_id: authData.user.id
  })
  .eq('id', authData.user.id)  // ✅ 使用 WHERE 条件
  .select()
  .maybeSingle()
```

## 关键改进点

### 1. 操作类型变更
- **修改前**: 使用 `insert()` 插入新记录
- **修改后**: 使用 `update()` 更新已存在的记录

### 2. 错误处理改进
- **修改前**: 确认邮箱失败时继续执行（注释说"不返回 null"）
- **修改后**: 确认邮箱失败时直接返回 null，避免后续错误

### 3. 添加延迟等待
- **修改后**: 添加 500ms 延迟，确保触发器有足够时间完成
- 这与 `createPeerAccount` 函数保持一致

### 4. 注释更新
- **修改前**: "直接插入 profiles 记录（不依赖触发器）"
- **修改后**: "更新 profiles 记录，设置老板账号相关字段"
- 注释更准确地反映了实际逻辑

## 实现一致性

修改后，`createTenant` 和 `createPeerAccount` 两个函数的实现逻辑完全一致：

| 步骤 | createTenant | createPeerAccount |
|------|--------------|-------------------|
| 1 | 创建认证用户 | 创建认证用户 |
| 2 | 确认邮箱（触发器创建记录） | 确认邮箱（触发器创建记录） |
| 3 | 等待 500ms | 等待 500ms |
| 4 | UPDATE 更新记录 | UPDATE 更新记录 |

## 测试验证

### 测试步骤

1. **清理测试数据**（如果需要）
   ```sql
   -- 删除测试用户的 profiles 记录
   DELETE FROM profiles WHERE phone = '测试手机号';
   
   -- 删除测试用户的 auth 记录
   DELETE FROM auth.users WHERE phone = '测试手机号';
   ```

2. **创建新的老板账号**
   - 在租赁管理页面点击"新增老板账号"
   - 填写必填信息：
     - 姓名
     - 手机号
     - 密码
     - 确认密码
     - 公司名称（可选）
     - 租赁费用（可选）
   - 点击"创建账号"

3. **验证结果**
   - ✅ 不应该出现主键冲突错误
   - ✅ 应该成功创建账号
   - ✅ 可以使用新账号登录
   - ✅ profiles 表中应该有完整的记录

### 预期行为

```
✅ 创建认证用户成功
✅ 确认用户邮箱成功
✅ 触发器创建基础 profiles 记录
✅ 等待 500ms
✅ 更新 profiles 记录成功
✅ 返回完整的 Profile 对象
```

## 相关文件

- `src/db/api.ts` - `createTenant` 函数（第 6417-6490 行）
- `src/db/api.ts` - `createPeerAccount` 函数（第 6496-6602 行）
- `supabase/migrations/044_fix_handle_new_user_trigger_duplicate.sql` - 触发器定义

## 技术细节

### 为什么需要延迟？

```typescript
await new Promise((resolve) => setTimeout(resolve, 500))
```

- 触发器在数据库事务中异步执行
- 虽然 `confirm_user_email` RPC 调用会等待，但触发器可能还在执行
- 500ms 延迟确保触发器有足够时间完成 INSERT 操作
- 这是一个保守的等待时间，在大多数情况下足够

### 为什么使用 UPDATE 而不是 UPSERT？

- **UPSERT** (INSERT ... ON CONFLICT DO UPDATE) 需要处理冲突
- **UPDATE** 更简单直接，因为我们知道记录已经存在
- **UPDATE** 的语义更清晰：我们是在更新触发器创建的记录

### 触发器创建的默认值

触发器创建的 profiles 记录包含：
- `id`: 从 auth.users.id 复制
- `phone`: 从 auth.users.phone 复制
- `email`: 从 auth.users.email 复制
- `role`: 根据用户数量决定（首位用户为 super_admin，其他为 driver）

UPDATE 操作会覆盖这些字段，并添加额外的字段：
- `company_name`
- `lease_start_date`
- `lease_end_date`
- `monthly_fee`
- `notes`
- `status`
- `tenant_id`

## 总结

这个修复解决了创建老板账号时的主键冲突问题，通过：

1. ✅ 改用 UPDATE 而不是 INSERT
2. ✅ 正确处理触发器的执行时序
3. ✅ 与 createPeerAccount 保持实现一致性
4. ✅ 改进错误处理逻辑
5. ✅ 更新注释以反映实际逻辑

修改后的代码更加健壮，避免了主键冲突错误，同时保持了代码的一致性和可维护性。
