# 用户创建问题诊断和修复指南

## 📋 问题描述

新添加的用户无法重置密码，提示"找不到用户ID"。

## 🔍 问题诊断流程

### 步骤1：检查用户数据一致性

运行以下 SQL 查询，检查 `profiles` 表和 `auth.users` 表的数据一致性：

```sql
-- 查询所有司机的数据状态
SELECT 
  p.id,
  p.phone,
  p.name,
  p.role,
  p.login_account,
  p.created_at as profile_created_at,
  a.email as auth_email,
  a.created_at as auth_created_at,
  CASE 
    WHEN a.id IS NULL THEN '❌ auth.users 不存在'
    WHEN a.confirmation_token IS NULL THEN '⚠️ confirmation_token 为 NULL'
    WHEN a.recovery_token IS NULL THEN '⚠️ recovery_token 为 NULL'
    ELSE '✅ auth.users 完整'
  END as status
FROM profiles p
LEFT JOIN auth.users a ON p.id = a.id
WHERE p.role = 'driver'
ORDER BY p.created_at DESC
LIMIT 10;
```

### 步骤2：查找问题用户

#### 2.1 查找缺少 auth.users 记录的司机

```sql
SELECT 
  p.id,
  p.phone,
  p.name,
  p.login_account,
  p.created_at
FROM profiles p
LEFT JOIN auth.users a ON p.id = a.id
WHERE p.role = 'driver'
AND a.id IS NULL
ORDER BY p.created_at DESC;
```

#### 2.2 查找 token 列为 NULL 的用户

```sql
SELECT 
  p.id,
  p.phone,
  p.name,
  a.confirmation_token IS NULL as ct_null,
  a.recovery_token IS NULL as rt_null,
  a.email_change_token_new IS NULL as ect_null,
  a.email_change IS NULL as ec_null
FROM profiles p
INNER JOIN auth.users a ON p.id = a.id
WHERE p.role = 'driver'
AND (
  a.confirmation_token IS NULL 
  OR a.recovery_token IS NULL 
  OR a.email_change_token_new IS NULL 
  OR a.email_change IS NULL
)
ORDER BY p.created_at DESC;
```

### 步骤3：检查浏览器控制台日志

当添加新司机时，打开浏览器的开发者工具（F12），查看控制台日志：

#### 3.1 成功的日志示例

```
================================================================================
🚀 [createDriver] 函数调用开始
⏰ 时间戳: 2025-01-10T15:30:45.123Z
📱 输入参数:
  - 手机号: 13800138000
  - 姓名: 张三
================================================================================

📋 [步骤1] 检查手机号是否已存在
  - 查询条件: phone = 13800138000
  ✅ 手机号可用，继续创建

📋 [步骤2] 创建 profiles 表记录
  ✅ profiles 表记录创建成功
  - 用户ID: 550e8400-e29b-41d4-a716-446655440000
  - 手机号: 13800138000
  - 姓名: 张三

📋 [步骤3] 创建 auth.users 表记录
  - 目标用户ID: 550e8400-e29b-41d4-a716-446655440000
  - 登录邮箱: 13800138000@fleet.com
  - 手机号: 13800138000
  - 默认密码: 123456
  - 使用函数: create_user_auth_account
  - RPC 调用完成
  - 返回数据: {
      "success": true,
      "message": "用户认证账号创建成功",
      "user_id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "13800138000@fleet.com",
      "default_password": "123456"
    }
  ✅ auth.users 记录创建成功
```

#### 3.2 失败的日志示例

```
📋 [步骤3] 创建 auth.users 表记录
  - RPC 调用完成
  - 返回数据: {
      "success": false,
      "error": "权限不足",
      "details": "只有管理员和超级管理员可以创建用户认证账号"
    }
  ❌ 创建 auth.users 记录失败
  错误: 权限不足
  详情: 只有管理员和超级管理员可以创建用户认证账号
  ⚠️ profiles 记录已创建，但 auth.users 记录创建失败
```

## 🛠️ 问题修复方案

### 方案1：为缺少 auth.users 记录的用户创建记录

如果发现有用户在 `profiles` 表中存在，但在 `auth.users` 表中不存在，使用以下方法修复：

#### 方法A：使用 SQL 批量修复

```sql
-- 为所有缺少 auth.users 记录的司机创建记录
DO $$
DECLARE
  missing_user RECORD;
  result json;
BEGIN
  FOR missing_user IN 
    SELECT p.id, p.phone, p.email, p.login_account
    FROM profiles p
    LEFT JOIN auth.users a ON p.id = a.id
    WHERE p.role = 'driver'
    AND a.id IS NULL
  LOOP
    -- 使用 create_user_auth_account 函数创建记录
    SELECT create_user_auth_account(
      missing_user.id,
      COALESCE(missing_user.login_account, missing_user.email, missing_user.phone || '@fleet.com'),
      missing_user.phone
    ) INTO result;
    
    RAISE NOTICE '为用户 % (%) 创建 auth.users 记录: %', 
      missing_user.phone, missing_user.id, result;
  END LOOP;
END $$;
```

#### 方法B：为单个用户创建记录

```sql
-- 替换 USER_ID、USER_EMAIL、USER_PHONE 为实际值
SELECT create_user_auth_account(
  'USER_ID'::uuid,
  'USER_EMAIL',
  'USER_PHONE'
);
```

### 方案2：修复 token 列为 NULL 的用户

如果发现有用户的 token 列为 NULL，运行以下 SQL：

```sql
-- 更新所有 token 列为 NULL 的用户
UPDATE auth.users
SET 
  confirmation_token = COALESCE(confirmation_token, ''),
  recovery_token = COALESCE(recovery_token, ''),
  email_change_token_new = COALESCE(email_change_token_new, ''),
  email_change = COALESCE(email_change, '')
WHERE 
  confirmation_token IS NULL 
  OR recovery_token IS NULL 
  OR email_change_token_new IS NULL 
  OR email_change IS NULL;
```

### 方案3：通过前端页面修复

1. 使用超级管理员账号登录
2. 进入"用户管理"页面
3. 找到问题用户
4. 点击"编辑"
5. 修改"登录账号"字段（即使不改变值，也要点击保存）
6. 点击"保存"
7. 系统会自动调用 `update_user_email` 函数创建或更新 `auth.users` 记录

## 📊 用户创建流程分析

### 完整流程图

```
前端：添加司机
    ↓
调用 createDriver(phone, name)
    ↓
步骤1：检查手机号是否已存在
    ↓ (手机号可用)
步骤2：在 profiles 表中创建记录
    ↓ (返回 user_id)
步骤3：调用 create_user_auth_account RPC 函数
    ↓
数据库函数：create_user_auth_account
    ↓
检查调用者权限（manager 或 super_admin）
    ↓ (权限通过)
检查 auth.users 表中是否已存在该 user_id
    ↓ (不存在)
在 auth.users 表中插入记录
    - id: user_id
    - email: phone@fleet.com
    - phone: phone
    - encrypted_password: crypt('123456', gen_salt('bf'))
    - confirmation_token: ''
    - recovery_token: ''
    - email_change_token_new: ''
    - email_change: ''
    - confirmed_at: now()
    ↓
返回成功结果
    ↓
前端显示创建成功
```

### 关键检查点

#### 检查点1：profiles 表记录是否创建成功

```sql
SELECT * FROM profiles WHERE phone = '13800138000';
```

**预期结果**：
- 应该有一条记录
- `id` 字段应该是一个 UUID
- `role` 字段应该是 'driver'
- `login_account` 字段应该是 'phone@fleet.com'

#### 检查点2：auth.users 表记录是否创建成功

```sql
SELECT 
  id, 
  email, 
  phone, 
  email_confirmed_at, 
  phone_confirmed_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  confirmed_at
FROM auth.users 
WHERE phone = '13800138000';
```

**预期结果**：
- 应该有一条记录
- `id` 字段应该与 profiles 表中的 `id` 一致
- `email` 字段应该是 'phone@fleet.com'
- `phone` 字段应该是 '13800138000'
- `confirmation_token` 应该是空字符串（不是 NULL）
- `recovery_token` 应该是空字符串（不是 NULL）
- `email_change_token_new` 应该是空字符串（不是 NULL）
- `email_change` 应该是空字符串（不是 NULL）
- `confirmed_at` 应该不为 NULL

#### 检查点3：两个表的 ID 是否一致

```sql
SELECT 
  p.id as profile_id,
  a.id as auth_id,
  p.id = a.id as ids_match
FROM profiles p
LEFT JOIN auth.users a ON p.id = a.id
WHERE p.phone = '13800138000';
```

**预期结果**：
- `ids_match` 应该是 `true`

## 🔧 重置密码功能分析

### reset_user_password_by_admin 函数逻辑

```sql
CREATE OR REPLACE FUNCTION reset_user_password_by_admin(
  target_user_id uuid,
  new_password text DEFAULT '123456'
)
RETURNS json
AS $$
BEGIN
  -- 1. 检查调用者是否已登录
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('success', false, 'error', '未授权');
  END IF;
  
  -- 2. 检查调用者是否为超级管理员
  IF (SELECT role FROM profiles WHERE id = auth.uid()) != 'super_admin' THEN
    RETURN json_build_object('success', false, 'error', '权限不足');
  END IF;
  
  -- 3. 检查目标用户是否存在于 auth.users 表中 ⚠️ 关键检查点
  IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id = target_user_id) THEN
    RETURN json_build_object('success', false, 'error', '用户不存在');
  END IF;
  
  -- 4. 更新密码
  UPDATE auth.users
  SET encrypted_password = crypt(new_password, gen_salt('bf'))
  WHERE id = target_user_id;
  
  RETURN json_build_object('success', true);
END;
$$;
```

### 为什么会出现"找不到用户ID"错误

**原因**：`reset_user_password_by_admin` 函数在第3步检查用户是否存在于 `auth.users` 表中。

**问题场景**：
1. 用户在 `profiles` 表中存在
2. 但在 `auth.users` 表中不存在（因为 `create_user_auth_account` 函数执行失败）
3. 重置密码时，函数检查 `auth.users` 表，发现用户不存在
4. 返回错误："用户不存在，未找到指定的用户ID"

### 解决方案

**方案A**：修复数据，为缺少 `auth.users` 记录的用户创建记录（推荐）

```sql
-- 为特定用户创建 auth.users 记录
SELECT create_user_auth_account(
  '<user_id>'::uuid,
  '<phone>@fleet.com',
  '<phone>'
);
```

**方案B**：修改 `reset_user_password_by_admin` 函数，自动创建缺失的 `auth.users` 记录

```sql
-- 修改函数，如果 auth.users 记录不存在，自动创建
CREATE OR REPLACE FUNCTION reset_user_password_by_admin(
  target_user_id uuid,
  new_password text DEFAULT '123456'
)
RETURNS json
AS $$
DECLARE
  user_phone text;
  user_email text;
  auth_user_exists boolean;
BEGIN
  -- ... 权限检查 ...
  
  -- 检查 auth.users 记录是否存在
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = target_user_id) 
  INTO auth_user_exists;
  
  IF NOT auth_user_exists THEN
    -- 从 profiles 表获取用户信息
    SELECT phone, email INTO user_phone, user_email
    FROM profiles
    WHERE id = target_user_id;
    
    IF user_phone IS NULL AND user_email IS NULL THEN
      RETURN json_build_object('success', false, 'error', '用户不存在');
    END IF;
    
    -- 自动创建 auth.users 记录
    PERFORM create_user_auth_account(
      target_user_id,
      COALESCE(user_email, user_phone || '@fleet.com'),
      user_phone
    );
  END IF;
  
  -- 更新密码
  UPDATE auth.users
  SET encrypted_password = crypt(new_password, gen_salt('bf'))
  WHERE id = target_user_id;
  
  RETURN json_build_object('success', true);
END;
$$;
```

## 📝 预防措施

### 1. 增强 createDriver 函数的错误处理

在 `src/db/api.ts` 中，增强 `createDriver` 函数的错误处理：

```typescript
export async function createDriver(phone: string, name: string): Promise<Profile | null> {
  // ... 前面的代码 ...
  
  // 步骤3: 创建 auth.users 表记录
  const {data: rpcData, error: authError} = await supabase.rpc('create_user_auth_account', {
    target_user_id: data.id,
    user_email: loginEmail,
    user_phone: phone
  })
  
  // 验证 auth.users 记录是否创建成功
  if (authError || (rpcData && rpcData.success === false)) {
    console.error('❌ auth.users 记录创建失败')
    
    // 删除 profiles 记录，保持数据一致性
    await supabase.from('profiles').delete().eq('id', data.id)
    
    return null
  }
  
  // 双重验证：检查 auth.users 表中是否真的有记录
  const {data: authUser} = await supabase
    .from('auth.users')
    .select('id')
    .eq('id', data.id)
    .maybeSingle()
  
  if (!authUser) {
    console.error('⚠️ auth.users 记录验证失败')
    
    // 删除 profiles 记录
    await supabase.from('profiles').delete().eq('id', data.id)
    
    return null
  }
  
  return data as Profile
}
```

### 2. 定期检查数据一致性

创建一个定时任务或管理员工具，定期检查数据一致性：

```sql
-- 每天运行一次，检查数据一致性
SELECT 
  COUNT(*) as total_drivers,
  COUNT(a.id) as drivers_with_auth,
  COUNT(*) - COUNT(a.id) as drivers_without_auth
FROM profiles p
LEFT JOIN auth.users a ON p.id = a.id
WHERE p.role = 'driver';
```

如果发现 `drivers_without_auth > 0`，发送告警通知管理员。

### 3. 添加数据库约束

虽然不能直接在 `profiles` 表中添加外键约束（因为 `auth.users` 表在不同的 schema 中），但可以创建一个触发器来确保数据一致性：

```sql
-- 创建触发器，确保 profiles 记录创建后，auth.users 记录也必须存在
CREATE OR REPLACE FUNCTION check_auth_user_exists()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- 延迟检查，给 create_user_auth_account 函数时间执行
  PERFORM pg_sleep(1);
  
  -- 检查 auth.users 记录是否存在
  IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id = NEW.id) THEN
    RAISE WARNING 'auth.users 记录不存在，用户ID: %', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER check_auth_user_after_insert
AFTER INSERT ON profiles
FOR EACH ROW
WHEN (NEW.role = 'driver')
EXECUTE FUNCTION check_auth_user_exists();
```

## 💡 总结

### 问题根源

1. **权限问题**：`update_user_email` 函数只允许超级管理员调用，导致普通管理员创建的司机缺少 `auth.users` 记录
2. **数据完整性问题**：`create_user_auth_account` 函数执行失败时，`profiles` 记录已创建，但 `auth.users` 记录未创建
3. **历史数据问题**：修复之前创建的用户，`auth.users` 记录中的 token 列为 NULL

### 解决方案

1. **创建专门的函数**：`create_user_auth_account` 允许管理员和超级管理员都可以调用
2. **完善数据结构**：添加所有必需的列，并设置合适的默认值
3. **修复历史数据**：运行数据迁移，更新所有现有用户的数据
4. **增强错误处理**：在 `createDriver` 函数中添加验证和回滚逻辑

### 验证清单

- [ ] 检查 `profiles` 表中是否有司机记录
- [ ] 检查 `auth.users` 表中是否有对应的记录
- [ ] 检查两个表的 `id` 是否一致
- [ ] 检查 `auth.users` 表中的 token 列是否为空字符串（不是 NULL）
- [ ] 测试新创建的司机是否可以登录
- [ ] 测试新创建的司机是否可以重置密码
- [ ] 检查浏览器控制台日志，确认 `create_user_auth_account` 函数执行成功
