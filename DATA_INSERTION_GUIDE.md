# 数据插入详细说明

## 📋 概述

本文档详细说明车队管家小程序中添加司机功能的数据插入流程，包括数据流向、表结构、字段说明、触发器逻辑等。

---

## 🔄 数据流程图

```
┌─────────────────────────────────────────────────────────────────┐
│                        添加司机流程                              │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  步骤1: 前端输入验证                                             │
│  - 验证手机号格式（11位数字）                                    │
│  - 验证姓名不为空                                                │
│  - 显示加载提示                                                  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  步骤2: 调用 createDriver 函数                                   │
│  - 输入参数: phone, name                                         │
│  - 函数位置: src/db/api.ts                                       │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  步骤3: 检查手机号是否已存在                                     │
│  - 查询 profiles 表                                              │
│  - 条件: phone = 输入的手机号                                    │
│  - 如果存在: 返回 null，显示错误提示                             │
│  - 如果不存在: 继续下一步                                        │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  步骤4: 插入 profiles 表记录                                     │
│  - 表名: profiles                                                │
│  - 插入字段:                                                     │
│    * phone: 手机号                                               │
│    * name: 姓名                                                  │
│    * role: 'driver'（固定值）                                    │
│    * login_account: '{phone}@fleet.com'                          │
│    * email: '{phone}@fleet.com'                                  │
│  - 自动生成字段:                                                 │
│    * id: UUID（数据库自动生成）                                  │
│    * created_at: 当前时间（数据库自动生成）                      │
│    * updated_at: 当前时间（数据库自动生成）                      │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  步骤5: 调用 update_user_email 函数                              │
│  - 函数类型: PostgreSQL 存储过程（RPC）                          │
│  - 输入参数:                                                     │
│    * target_user_id: 步骤4生成的用户ID                           │
│    * new_email: '{phone}@fleet.com'                              │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  步骤6: 插入 auth.users 表记录                                   │
│  - 表名: auth.users（Supabase 认证表）                           │
│  - 插入字段:                                                     │
│    * id: 与 profiles 表相同的 UUID                               │
│    * email: '{phone}@fleet.com'                                  │
│    * encrypted_password: crypt('123456', gen_salt('bf'))         │
│    * phone: 手机号                                               │
│    * email_confirmed_at: 当前时间                                │
│    * phone_confirmed_at: 当前时间（如果有手机号）                │
│    * created_at: 当前时间                                        │
│    * updated_at: 当前时间                                        │
│    * aud: 'authenticated'                                        │
│    * role: 'authenticated'                                       │
│    * raw_app_meta_data: '{"provider":"email","providers":["email"]}'│
│    * raw_user_meta_data: '{}'                                    │
│    * is_super_admin: false                                       │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  步骤7: 触发器检查（handle_new_user）                            │
│  - 触发时机: auth.users 表 UPDATE 操作                           │
│  - 触发条件: confirmed_at 从 NULL 变为非 NULL                    │
│  - 操作:                                                         │
│    * 检查 profiles 表中是否已存在该用户ID                        │
│    * 如果已存在: 跳过插入，避免主键冲突                          │
│    * 如果不存在: 插入 profiles 表记录                            │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  步骤8: 返回结果                                                 │
│  - 成功: 返回 Profile 对象                                       │
│  - 失败: 返回 null                                               │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  步骤9: 前端显示结果                                             │
│  - 成功: 显示详细信息弹窗                                        │
│    * 姓名                                                        │
│    * 手机号码                                                    │
│    * 司机类型                                                    │
│    * 登录账号                                                    │
│    * 默认密码                                                    │
│    * 车牌号码                                                    │
│  - 失败: 显示错误提示                                            │
│  - 刷新司机列表                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 数据库表结构

### 1. profiles 表

#### 表说明
存储用户的基本信息和扩展信息。

#### 表结构

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | uuid | PRIMARY KEY | gen_random_uuid() | 用户唯一标识 |
| phone | text | UNIQUE | NULL | 手机号 |
| email | text | UNIQUE | NULL | 邮箱 |
| name | text | | NULL | 姓名 |
| role | user_role | NOT NULL | 'driver' | 用户角色 |
| avatar_url | text | | NULL | 头像URL |
| nickname | text | | NULL | 昵称 |
| address_province | text | | NULL | 省份 |
| address_city | text | | NULL | 城市 |
| address_district | text | | NULL | 区县 |
| address_detail | text | | NULL | 详细地址 |
| emergency_contact_name | text | | NULL | 紧急联系人姓名 |
| emergency_contact_phone | text | | NULL | 紧急联系人电话 |
| login_account | text | UNIQUE | NULL | 登录账号 |
| vehicle_plate | text | | NULL | 车牌号 |
| join_date | date | | NULL | 入职日期 |
| created_at | timestamptz | NOT NULL | now() | 创建时间 |
| updated_at | timestamptz | NOT NULL | now() | 更新时间 |

#### 用户角色枚举（user_role）

```sql
CREATE TYPE user_role AS ENUM ('driver', 'manager', 'super_admin');
```

- `driver`: 司机
- `manager`: 普通管理员
- `super_admin`: 超级管理员

#### 添加司机时插入的字段

```typescript
{
  phone: '13800138000',              // 手机号（必填）
  name: '张三',                      // 姓名（必填）
  role: 'driver',                    // 角色（固定值）
  login_account: '13800138000@fleet.com',  // 登录账号（自动生成）
  email: '13800138000@fleet.com'     // 邮箱（自动生成）
}
```

#### 数据库自动生成的字段

```typescript
{
  id: '550e8400-e29b-41d4-a716-446655440000',  // UUID（自动生成）
  created_at: '2025-01-10T10:30:45.456Z',      // 创建时间（自动生成）
  updated_at: '2025-01-10T10:30:45.456Z'       // 更新时间（自动生成）
}
```

#### 完整的插入记录示例

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "phone": "13800138000",
  "email": "13800138000@fleet.com",
  "name": "张三",
  "role": "driver",
  "avatar_url": null,
  "nickname": null,
  "address_province": null,
  "address_city": null,
  "address_district": null,
  "address_detail": null,
  "emergency_contact_name": null,
  "emergency_contact_phone": null,
  "login_account": "13800138000@fleet.com",
  "vehicle_plate": null,
  "join_date": null,
  "created_at": "2025-01-10T10:30:45.456Z",
  "updated_at": "2025-01-10T10:30:45.456Z"
}
```

---

### 2. auth.users 表

#### 表说明
Supabase 认证系统的用户表，存储登录凭证和认证信息。

#### 表结构（主要字段）

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | uuid | PRIMARY KEY | | 用户唯一标识（与 profiles.id 相同） |
| instance_id | uuid | | | 实例ID |
| email | text | UNIQUE | | 邮箱 |
| encrypted_password | text | | | 加密后的密码 |
| email_confirmed_at | timestamptz | | | 邮箱确认时间 |
| phone | text | UNIQUE | | 手机号 |
| phone_confirmed_at | timestamptz | | | 手机号确认时间 |
| created_at | timestamptz | NOT NULL | now() | 创建时间 |
| updated_at | timestamptz | NOT NULL | now() | 更新时间 |
| aud | text | | | 受众（audience） |
| role | text | | | 角色 |
| raw_app_meta_data | jsonb | | | 应用元数据 |
| raw_user_meta_data | jsonb | | | 用户元数据 |
| is_super_admin | boolean | | false | 是否为超级管理员 |

#### 添加司机时插入的字段

```typescript
{
  id: '550e8400-e29b-41d4-a716-446655440000',  // 与 profiles.id 相同
  instance_id: '00000000-0000-0000-0000-000000000000',
  email: '13800138000@fleet.com',
  encrypted_password: '$2a$10$...',  // bcrypt 加密后的密码（123456）
  email_confirmed_at: '2025-01-10T10:30:45.456Z',
  phone: '13800138000',
  phone_confirmed_at: '2025-01-10T10:30:45.456Z',
  created_at: '2025-01-10T10:30:45.456Z',
  updated_at: '2025-01-10T10:30:45.456Z',
  aud: 'authenticated',
  role: 'authenticated',
  raw_app_meta_data: {
    provider: 'email',
    providers: ['email']
  },
  raw_user_meta_data: {},
  is_super_admin: false
}
```

#### 密码加密说明

默认密码 `123456` 使用 bcrypt 算法加密：

```sql
extensions.crypt('123456', extensions.gen_salt('bf'))
```

- 算法：bcrypt
- 盐值：自动生成
- 加密后的密码格式：`$2a$10$...`（60个字符）

---

## 🔧 数据库函数和触发器

### 1. createDriver 函数（前端）

#### 函数签名

```typescript
export async function createDriver(
  phone: string, 
  name: string
): Promise<Profile | null>
```

#### 函数位置
`src/db/api.ts`

#### 函数逻辑

```typescript
// 1. 检查手机号是否已存在
const {data: existingProfiles, error: checkError} = await supabase
  .from('profiles')
  .select('*')
  .eq('phone', phone)
  .maybeSingle()

if (existingProfiles) {
  return null  // 手机号已存在
}

// 2. 插入 profiles 表记录
const {data, error} = await supabase
  .from('profiles')
  .insert({
    phone,
    name,
    role: 'driver',
    login_account: `${phone}@fleet.com`,
    email: `${phone}@fleet.com`
  })
  .select()
  .maybeSingle()

if (error || !data) {
  return null  // 插入失败
}

// 3. 创建 auth.users 表记录
const {error: authError} = await supabase.rpc('update_user_email', {
  target_user_id: data.id,
  new_email: `${phone}@fleet.com`
})

// 4. 返回结果
return data as Profile
```

---

### 2. update_user_email 函数（数据库）

#### 函数签名

```sql
CREATE OR REPLACE FUNCTION update_user_email(
  target_user_id uuid,
  new_email text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
```

#### 函数位置
`supabase/migrations/38_update_user_email_with_default_password.sql`

#### 函数逻辑

```sql
BEGIN
  -- 1. 检查调用者是否为超级管理员
  IF NOT is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION '只有超级管理员可以修改用户邮箱';
  END IF;

  -- 2. 检查新邮箱是否已被其他用户使用
  IF EXISTS (
    SELECT 1 FROM auth.users 
    WHERE email = new_email 
    AND id != target_user_id
  ) THEN
    RAISE EXCEPTION '该邮箱已被其他用户使用';
  END IF;

  -- 3. 检查用户是否在 auth.users 表中存在
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE id = target_user_id
  ) INTO user_exists;

  IF user_exists THEN
    -- 用户存在，直接更新邮箱
    UPDATE auth.users
    SET 
      email = new_email,
      email_confirmed_at = now(),
      updated_at = now()
    WHERE id = target_user_id;
  ELSE
    -- 用户不存在，创建新的 auth.users 记录
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      phone,
      phone_confirmed_at,
      created_at,
      updated_at,
      aud,
      role,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin
    ) VALUES (
      target_user_id,
      '00000000-0000-0000-0000-000000000000',
      new_email,
      extensions.crypt('123456', extensions.gen_salt('bf')),  -- 默认密码
      now(),
      user_phone,
      CASE WHEN user_phone IS NOT NULL THEN now() ELSE NULL END,
      now(),
      now(),
      'authenticated',
      'authenticated',
      '{"provider":"email","providers":["email"]}',
      '{}',
      false
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      email_confirmed_at = EXCLUDED.email_confirmed_at,
      updated_at = EXCLUDED.updated_at;
  END IF;
END;
```

---

### 3. handle_new_user 触发器

#### 触发器定义

```sql
CREATE TRIGGER on_auth_user_confirmed
    AFTER UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();
```

#### 触发时机
- 表：`auth.users`
- 操作：`UPDATE`
- 条件：`confirmed_at` 从 `NULL` 变为非 `NULL`

#### 触发器函数

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
    -- 只在 confirmed_at 从 NULL → 非 NULL 时执行
    IF OLD.confirmed_at IS NULL AND NEW.confirmed_at IS NOT NULL THEN
        -- 检查 profiles 表中是否已存在该用户
        SELECT EXISTS (
            SELECT 1 FROM profiles WHERE id = NEW.id
        ) INTO profile_exists;
        
        -- 如果 profiles 已存在，跳过插入
        IF profile_exists THEN
            RAISE NOTICE '✅ profiles 记录已存在，跳过插入 (id: %)', NEW.id;
            RETURN NEW;
        END IF;
        
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

#### 触发器逻辑说明

1. **触发条件检查**
   - 只在 `confirmed_at` 从 `NULL` 变为非 `NULL` 时执行
   - 这通常发生在用户首次确认邮箱或手机号时

2. **profiles 存在性检查**
   - 检查 `profiles` 表中是否已存在该用户ID
   - 如果已存在，跳过插入，避免主键冲突
   - 这是为了解决 `createDriver` 函数先创建 `profiles` 记录的情况

3. **角色分配逻辑**
   - 如果 `profiles` 表为空（第一个用户），分配 `super_admin` 角色
   - 否则分配 `driver` 角色

4. **冲突处理**
   - 使用 `ON CONFLICT (id) DO NOTHING` 作为额外保护
   - 即使检查失败，也不会导致错误

---

## 🔍 数据验证方法

### 方法1：查询 profiles 表

```sql
-- 查询最新创建的司机
SELECT * FROM profiles 
WHERE role = 'driver' 
ORDER BY created_at DESC 
LIMIT 10;

-- 查询特定手机号的司机
SELECT * FROM profiles 
WHERE phone = '13800138000';

-- 查询特定ID的司机
SELECT * FROM profiles 
WHERE id = '550e8400-e29b-41d4-a716-446655440000';
```

### 方法2：查询 auth.users 表

```sql
-- 查询特定邮箱的用户
SELECT id, email, phone, created_at, email_confirmed_at, phone_confirmed_at
FROM auth.users 
WHERE email = '13800138000@fleet.com';

-- 查询特定ID的用户
SELECT id, email, phone, created_at
FROM auth.users 
WHERE id = '550e8400-e29b-41d4-a716-446655440000';
```

### 方法3：联合查询

```sql
-- 查询司机的完整信息（profiles + auth.users）
SELECT 
  p.id,
  p.phone,
  p.name,
  p.role,
  p.login_account,
  p.email,
  p.created_at as profile_created_at,
  a.email as auth_email,
  a.phone as auth_phone,
  a.email_confirmed_at,
  a.phone_confirmed_at,
  a.created_at as auth_created_at
FROM profiles p
LEFT JOIN auth.users a ON p.id = a.id
WHERE p.phone = '13800138000';
```

---

## ⚠️ 常见问题和解决方案

### 问题1：手机号已存在

#### 错误信息
```
⚠️ 手机号已存在
已存在的用户ID: xxx
已存在的用户姓名: xxx
❌ 创建失败：手机号重复
```

#### 原因
- 手机号已被其他用户使用
- `profiles` 表的 `phone` 字段有 `UNIQUE` 约束

#### 解决方法
- 使用其他手机号
- 或删除已存在的用户（如果是测试数据）

---

### 问题2：profiles 主键冲突

#### 错误信息
```
❌ 创建 auth.users 记录失败
错误代码: 23505
错误消息: duplicate key value violates unique constraint "profiles_pkey"
```

#### 原因
- `handle_new_user` 触发器尝试插入已存在的 `profiles` 记录
- 触发器没有正确检查记录是否已存在

#### 解决方法
- 确保 `handle_new_user` 触发器已更新到最新版本
- 参考 `supabase/migrations/36_fix_update_user_email_check_profile_exists.sql`

---

### 问题3：NULL 列扫描错误

#### 错误信息
```
Scan error on column index 8, name 'email_change': 
converting NULL to string is unsupported
```

#### 原因
- `auth.users` 表的某些列不能使用空字符串 `''`
- 必须使用 `NULL` 值

#### 解决方法
- 确保 `update_user_email` 函数已更新到最新版本
- 参考 `supabase/migrations/37_fix_update_user_email_null_columns.sql`

---

### 问题4：权限不足

#### 错误信息
```
❌ 插入失败
错误代码: 42501
错误消息: new row violates row-level security policy for table "profiles"
```

#### 原因
- 当前用户没有插入 `profiles` 表的权限
- RLS（Row Level Security）策略限制

#### 解决方法
- 确保当前用户是超级管理员
- 检查 RLS 策略配置

---

## 📊 数据完整性检查

### 检查1：profiles 和 auth.users 数据一致性

```sql
-- 查找 profiles 中存在但 auth.users 中不存在的记录
SELECT p.id, p.phone, p.name, p.email
FROM profiles p
LEFT JOIN auth.users a ON p.id = a.id
WHERE a.id IS NULL
AND p.role = 'driver';

-- 查找 auth.users 中存在但 profiles 中不存在的记录
SELECT a.id, a.email, a.phone
FROM auth.users a
LEFT JOIN profiles p ON a.id = p.id
WHERE p.id IS NULL;
```

### 检查2：邮箱和登录账号一致性

```sql
-- 查找邮箱和登录账号不一致的记录
SELECT id, phone, email, login_account
FROM profiles
WHERE email != login_account
AND role = 'driver';
```

### 检查3：手机号格式验证

```sql
-- 查找手机号格式不正确的记录
SELECT id, phone, name
FROM profiles
WHERE phone !~ '^1[3-9]\d{9}$'
AND phone IS NOT NULL
AND role = 'driver';
```

---

## 📚 相关文档

- [调试日志使用指南](./DEBUG_LOG_GUIDE.md)
- [用户创建和登录流程优化总结](./USER_CREATION_AND_LOGIN_OPTIMIZATION.md)
- [快速测试指南](./QUICK_TEST_GUIDE.md)

---

## 💡 最佳实践

1. **数据验证**
   - 前端验证：手机号格式、姓名非空
   - 后端验证：手机号唯一性、权限检查

2. **错误处理**
   - 捕获所有可能的错误
   - 提供清晰的错误提示
   - 记录详细的错误日志

3. **数据一致性**
   - 确保 `profiles` 和 `auth.users` 数据同步
   - 使用事务保证数据完整性
   - 定期检查数据一致性

4. **安全性**
   - 使用 bcrypt 加密密码
   - 实施 RLS 策略
   - 限制敏感操作权限

---

## 📞 技术支持

如有问题或需要帮助，请：
1. 查看调试日志
2. 检查数据库记录
3. 参考相关文档
4. 联系开发团队
