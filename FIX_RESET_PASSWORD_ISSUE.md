# 修复重置密码"用户不存在"问题

## 📋 问题描述

新添加的司机用户在重置密码时显示"用户不存在，未找到指定的用户ID"。

## 🔍 问题分析

### 问题根源

当通过 `createDriver` 函数创建新司机时：

1. **步骤1**：在 `profiles` 表中创建记录 ✅
2. **步骤2**：调用 `update_user_email` 函数创建 `auth.users` 记录
3. **步骤3**：`update_user_email` 函数触发 `handle_new_user` 触发器

**问题出现在步骤2和步骤3之间**：

- `update_user_email` 函数会在 `auth.users` 表中插入记录
- 但是插入操作使用了 `INSERT ... ON CONFLICT (id) DO UPDATE`
- 这意味着如果 ID 已存在，会执行 UPDATE 而不是 INSERT
- **关键问题**：`handle_new_user` 触发器只在 `confirmed_at` 从 NULL 变为非 NULL 时触发
- 但是 `update_user_email` 函数在插入时直接设置了 `email_confirmed_at = now()`
- 这导致触发器的触发条件不满足！

### 触发器触发条件

```sql
-- handle_new_user 触发器的触发条件
IF OLD.confirmed_at IS NULL AND NEW.confirmed_at IS NOT NULL THEN
  -- 执行插入 profiles 的逻辑
END IF;
```

但是 `update_user_email` 函数在 INSERT 时：
- OLD.confirmed_at 不存在（因为是 INSERT 操作）
- NEW.confirmed_at 直接设置为 now()
- 触发器不会执行！

### 数据不一致的情况

可能出现以下情况：

1. **profiles 表有记录，auth.users 表没有记录**
   - 原因：`update_user_email` 函数执行失败
   - 结果：无法登录，无法重置密码

2. **profiles 表有记录，auth.users 表有记录，但 email_confirmed_at 为 NULL**
   - 原因：某些异常情况
   - 结果：可能无法登录

3. **auth.users 表的 ID 与 profiles 表的 ID 不一致**
   - 原因：数据同步问题
   - 结果：数据关联错误

## 🛠️ 解决方案

### 方案1：修复 handle_new_user 触发器（推荐）

修改触发器，使其在 INSERT 操作时也能正确执行。

#### 实现步骤

1. 修改触发器函数，处理 INSERT 和 UPDATE 两种情况
2. 在 INSERT 时，检查 `email_confirmed_at` 或 `phone_confirmed_at` 是否不为 NULL
3. 在 UPDATE 时，保持原有逻辑

#### SQL 代码

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    user_count int;
    profile_exists boolean;
BEGIN
    -- 检查 profiles 表中是否已存在该用户
    SELECT EXISTS (
        SELECT 1 FROM profiles WHERE id = NEW.id
    ) INTO profile_exists;
    
    -- 如果 profiles 已存在，跳过插入
    IF profile_exists THEN
        RAISE NOTICE '✅ profiles 记录已存在，跳过插入 (id: %)', NEW.id;
        RETURN NEW;
    END IF;
    
    -- 判断是否需要创建 profiles 记录
    -- 情况1：INSERT 操作，且 email_confirmed_at 或 phone_confirmed_at 不为 NULL
    -- 情况2：UPDATE 操作，且 confirmed_at 从 NULL 变为非 NULL
    IF (TG_OP = 'INSERT' AND (NEW.email_confirmed_at IS NOT NULL OR NEW.phone_confirmed_at IS NOT NULL))
       OR (TG_OP = 'UPDATE' AND OLD.confirmed_at IS NULL AND NEW.confirmed_at IS NOT NULL) THEN
        
        -- 判断 profiles 表里有多少用户
        SELECT COUNT(*) INTO user_count FROM profiles;
        
        -- 插入 profiles，首位用户给 super_admin 角色
        INSERT INTO profiles (id, phone, email, role)
        VALUES (
            NEW.id,
            NEW.phone,
            NEW.email,
            CASE WHEN user_count = 0 THEN 'super_admin'::user_role ELSE 'driver'::user_role END
        )
        ON CONFLICT (id) DO NOTHING;
        
        RAISE NOTICE '✅ profiles 记录创建成功 (id: %)', NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$;
```

### 方案2：修复现有数据

为已经创建但缺少 `auth.users` 记录的用户补充记录。

#### SQL 代码

```sql
-- 查找缺少 auth.users 记录的用户
SELECT 
  p.id,
  p.phone,
  p.name,
  p.email,
  p.login_account
FROM profiles p
LEFT JOIN auth.users a ON p.id = a.id
WHERE a.id IS NULL
AND p.role = 'driver';

-- 为缺少 auth.users 记录的用户创建记录
-- 注意：需要超级管理员权限执行
DO $$
DECLARE
  missing_user RECORD;
BEGIN
  FOR missing_user IN 
    SELECT p.id, p.phone, p.email, p.login_account
    FROM profiles p
    LEFT JOIN auth.users a ON p.id = a.id
    WHERE a.id IS NULL
    AND p.role = 'driver'
  LOOP
    -- 使用 update_user_email 函数创建 auth.users 记录
    -- 注意：这需要以超级管理员身份执行
    PERFORM update_user_email(
      missing_user.id,
      COALESCE(missing_user.login_account, missing_user.email, missing_user.phone || '@fleet.com')
    );
    
    RAISE NOTICE '✅ 为用户 % 创建了 auth.users 记录', missing_user.id;
  END LOOP;
END $$;
```

### 方案3：增强 createDriver 函数的错误处理

在 `createDriver` 函数中添加更详细的错误处理和重试逻辑。

#### 实现步骤

1. 在调用 `update_user_email` 后，验证 `auth.users` 记录是否创建成功
2. 如果创建失败，记录详细的错误信息
3. 提供重试机制或手动修复指引

#### TypeScript 代码

```typescript
// 在 createDriver 函数中添加验证逻辑
export async function createDriver(phone: string, name: string): Promise<Profile | null> {
  // ... 前面的代码 ...

  // 步骤3: 创建 auth.users 表记录
  console.log('📋 [步骤3] 创建 auth.users 表记录')
  const loginEmail = `${phone}@fleet.com`
  
  try {
    const {data: rpcData, error: authError} = await supabase.rpc('update_user_email', {
      target_user_id: data.id,
      new_email: loginEmail
    })

    if (authError) {
      console.error('  ❌ 创建 auth.users 记录失败')
      console.error('  错误详情:', JSON.stringify(authError, null, 2))
    } else {
      console.log('  ✅ auth.users 记录创建成功')
      
      // 验证记录是否真的创建成功
      const {data: authUser, error: checkError} = await supabase
        .from('auth.users')
        .select('id, email')
        .eq('id', data.id)
        .maybeSingle()
      
      if (checkError || !authUser) {
        console.error('  ⚠️ 警告：auth.users 记录验证失败')
        console.error('  用户可能无法使用密码登录')
        console.error('  建议：在用户管理页面重新设置登录账号')
      } else {
        console.log('  ✅ auth.users 记录验证成功')
        console.log('  - 用户ID:', authUser.id)
        console.log('  - 邮箱:', authUser.email)
      }
    }
  } catch (authError) {
    console.error('  ❌ 创建 auth.users 记录异常')
    console.error('  异常详情:', authError)
  }

  return data as Profile
}
```

## 📝 实施步骤

### 步骤1：检查数据完整性

运行以下 SQL 查询，检查是否有用户缺少 `auth.users` 记录：

```sql
-- 查找缺少 auth.users 记录的司机
SELECT 
  p.id,
  p.phone,
  p.name,
  p.email,
  p.login_account,
  p.created_at
FROM profiles p
LEFT JOIN auth.users a ON p.id = a.id
WHERE p.role = 'driver'
AND a.id IS NULL
ORDER BY p.created_at DESC;
```

### 步骤2：修复现有数据

如果发现有用户缺少 `auth.users` 记录，使用以下方法修复：

#### 方法A：通过 Supabase 控制台

1. 登录 Supabase 控制台
2. 进入 SQL Editor
3. 以超级管理员身份执行以下 SQL：

```sql
-- 为特定用户创建 auth.users 记录
-- 替换 USER_ID_HERE 为实际的用户ID
-- 替换 USER_EMAIL_HERE 为实际的邮箱
SELECT update_user_email(
  'USER_ID_HERE'::uuid,
  'USER_EMAIL_HERE'
);
```

#### 方法B：通过前端页面

1. 使用超级管理员账号登录
2. 进入"用户管理"页面
3. 找到问题用户
4. 点击"编辑"
5. 修改"登录账号"字段（即使不改变值，也要点击保存）
6. 点击"保存"
7. 系统会自动调用 `update_user_email` 函数创建 `auth.users` 记录

### 步骤3：应用修复方案1（修改触发器）

创建新的迁移文件：

```bash
# 创建迁移文件
touch supabase/migrations/39_fix_handle_new_user_trigger.sql
```

在迁移文件中添加以下内容：

```sql
/*
# 修复 handle_new_user 触发器

## 问题
触发器只在 UPDATE 操作且 confirmed_at 从 NULL 变为非 NULL 时触发
但 update_user_email 函数在 INSERT 时直接设置 email_confirmed_at = now()
导致触发器不执行，profiles 记录不会被创建

## 解决方案
修改触发器，使其在以下情况下都能执行：
1. INSERT 操作，且 email_confirmed_at 或 phone_confirmed_at 不为 NULL
2. UPDATE 操作，且 confirmed_at 从 NULL 变为非 NULL

## 修改内容
- 添加 TG_OP 判断
- 处理 INSERT 和 UPDATE 两种情况
- 保持原有的 profiles 存在性检查
*/

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    user_count int;
    profile_exists boolean;
BEGIN
    -- 检查 profiles 表中是否已存在该用户
    SELECT EXISTS (
        SELECT 1 FROM profiles WHERE id = NEW.id
    ) INTO profile_exists;
    
    -- 如果 profiles 已存在，跳过插入
    IF profile_exists THEN
        RAISE NOTICE '✅ profiles 记录已存在，跳过插入 (id: %)', NEW.id;
        RETURN NEW;
    END IF;
    
    -- 判断是否需要创建 profiles 记录
    -- 情况1：INSERT 操作，且 email_confirmed_at 或 phone_confirmed_at 不为 NULL
    -- 情况2：UPDATE 操作，且 confirmed_at 从 NULL 变为非 NULL
    IF (TG_OP = 'INSERT' AND (NEW.email_confirmed_at IS NOT NULL OR NEW.phone_confirmed_at IS NOT NULL))
       OR (TG_OP = 'UPDATE' AND OLD.confirmed_at IS NULL AND NEW.confirmed_at IS NOT NULL) THEN
        
        -- 判断 profiles 表里有多少用户
        SELECT COUNT(*) INTO user_count FROM profiles;
        
        -- 插入 profiles，首位用户给 super_admin 角色
        INSERT INTO profiles (id, phone, email, role)
        VALUES (
            NEW.id,
            NEW.phone,
            NEW.email,
            CASE WHEN user_count = 0 THEN 'super_admin'::user_role ELSE 'driver'::user_role END
        )
        ON CONFLICT (id) DO NOTHING;
        
        RAISE NOTICE '✅ profiles 记录创建成功 (id: %)', NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$;

-- 确保触发器绑定到 auth.users 表的 INSERT 和 UPDATE 操作
DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_confirmed
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- 添加注释
COMMENT ON FUNCTION handle_new_user IS '当 auth.users 表插入或更新记录时，自动在 profiles 表中创建对应记录';
COMMENT ON TRIGGER on_auth_user_confirmed ON auth.users IS '触发器：在 auth.users 表插入或更新时执行 handle_new_user 函数';
```

### 步骤4：应用迁移

使用 Supabase CLI 或控制台应用迁移：

```bash
# 如果使用 Supabase CLI
supabase db push

# 或者在 Supabase 控制台的 SQL Editor 中执行迁移文件的内容
```

### 步骤5：验证修复

1. 创建一个新的测试司机
2. 检查 `profiles` 和 `auth.users` 表中是否都有记录
3. 尝试重置密码，验证是否成功
4. 使用新密码登录，验证是否成功

## 🔍 验证方法

### 方法1：SQL 查询

```sql
-- 查询特定用户的完整信息
SELECT 
  p.id,
  p.phone,
  p.name,
  p.role,
  p.login_account,
  p.email as profile_email,
  p.created_at as profile_created_at,
  a.email as auth_email,
  a.phone as auth_phone,
  a.email_confirmed_at,
  a.phone_confirmed_at,
  a.created_at as auth_created_at,
  CASE 
    WHEN a.id IS NULL THEN '❌ auth.users 记录不存在'
    ELSE '✅ auth.users 记录存在'
  END as auth_status
FROM profiles p
LEFT JOIN auth.users a ON p.id = a.id
WHERE p.phone = '13800138000';  -- 替换为实际的手机号
```

### 方法2：前端测试

1. 使用超级管理员账号登录
2. 进入"用户管理"页面
3. 找到新创建的司机
4. 点击"重置密码"按钮
5. 如果显示"密码已重置为 123456"，说明修复成功
6. 如果显示"用户不存在"，说明问题仍然存在

### 方法3：登录测试

1. 退出当前账号
2. 使用新创建的司机账号登录
3. 账号：手机号 或 手机号@fleet.com
4. 密码：123456
5. 如果登录成功，说明 `auth.users` 记录正常

## 📊 问题预防

### 1. 增强日志记录

在 `createDriver` 函数中添加更详细的日志，记录每个步骤的结果。

### 2. 添加数据验证

在创建用户后，验证 `profiles` 和 `auth.users` 表中的记录是否一致。

### 3. 定期检查数据完整性

定期运行以下 SQL 查询，检查是否有数据不一致的情况：

```sql
-- 查找 profiles 中存在但 auth.users 中不存在的用户
SELECT COUNT(*) as missing_auth_users
FROM profiles p
LEFT JOIN auth.users a ON p.id = a.id
WHERE a.id IS NULL;

-- 查找 auth.users 中存在但 profiles 中不存在的用户
SELECT COUNT(*) as missing_profiles
FROM auth.users a
LEFT JOIN profiles p ON a.id = p.id
WHERE p.id IS NULL;
```

### 4. 添加自动修复机制

创建一个定时任务或管理员工具，自动检测并修复数据不一致的情况。

## 📚 相关文档

- [调试日志使用指南](./DEBUG_LOG_GUIDE.md)
- [数据插入详细说明](./DATA_INSERTION_GUIDE.md)
- [用户创建和登录流程优化总结](./USER_CREATION_AND_LOGIN_OPTIMIZATION.md)

## 💡 总结

问题的根本原因是 `handle_new_user` 触发器的触发条件不适用于 `update_user_email` 函数的 INSERT 操作。

**推荐的解决方案**：
1. 修改 `handle_new_user` 触发器，使其支持 INSERT 操作
2. 为现有的问题用户手动创建 `auth.users` 记录
3. 增强日志记录和数据验证

**预防措施**：
1. 定期检查数据完整性
2. 添加自动修复机制
3. 在创建用户后验证数据一致性
