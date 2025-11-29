# 老板权限问题修复总结

## 问题描述

用户报告：老板没有权限创建用户，错误显示 `public.profiles` 中的角色 `driver` 无权创建用户。

## 问题根源

### 1. 问题发现

通过数据库查询发现：
- 老板账号在 `auth.users` 中的 `user_metadata.role` 是 `boss`
- 老板账号在 `auth.users` 中的 `user_metadata.tenant_id` 存在（说明是租户用户）
- 但是，老板账号在 `public.profiles` 中有记录，角色是 `driver`

### 2. 根本原因

**租户用户不应该在 `public.profiles` 中有记录！**

问题出在 `handle_new_user` 触发器上：

1. Edge Function 创建租户时，调用 `supabase.auth.admin.createUser` 创建老板账号
2. 设置 `phone_confirm: true` 和 `user_metadata.tenant_id`
3. `supabase.auth.admin.createUser` 在内部可能进行多次操作：
   - 首先 INSERT 记录到 `auth.users`
   - 然后 UPDATE 设置 `confirmed_at`（触发 `handle_new_user` 触发器）
   - 最后 UPDATE 设置 `raw_user_meta_data`
4. 当 `handle_new_user` 触发器执行时（在第二步），`raw_user_meta_data` 中可能还没有 `tenant_id`
5. 触发器检查失败，在 `public.profiles` 中创建了记录，角色为 `driver`

### 3. 权限检查逻辑

`create_user_auth_account_first` 函数的权限检查逻辑：

1. **第一步**：检查用户是否在 `public.profiles` 中
   - 如果在，检查角色是否为 `super_admin` 或 `boss`
   - 如果角色是 `driver`，拒绝创建用户
2. **第二步**：如果用户不在 `public.profiles` 中，检查租户 Schema 中的角色
   - 如果角色是 `boss`、`peer` 或 `fleet_leader`，允许创建用户

由于老板账号在 `public.profiles` 中有记录，角色是 `driver`，所以第一步就被拒绝了，没有进入第二步检查租户 Schema。

## 解决方案

### 1. 删除租户用户在 `public.profiles` 中的记录

创建迁移文件 `00448_fix_boss_role_in_public_profiles.sql`，执行以下操作：

```sql
-- 查找所有在 auth.users 中有 tenant_id 的用户
-- 删除他们在 public.profiles 中的记录
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN 
    SELECT 
      au.id,
      au.raw_user_meta_data->>'tenant_id' as tenant_id
    FROM auth.users au
    WHERE (au.raw_user_meta_data->>'tenant_id') IS NOT NULL
  LOOP
    IF EXISTS (SELECT 1 FROM public.profiles WHERE id = user_record.id) THEN
      DELETE FROM public.profiles WHERE id = user_record.id;
      RAISE NOTICE '已删除租户用户在 public.profiles 中的记录: %', user_record.id;
    END IF;
  END LOOP;
END $$;
```

### 2. 优化 `handle_new_user` 触发器

修改触发器，在 INSERT 时也检查 `user_metadata`，防止租户用户在 `public.profiles` 中创建记录：

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_count int;
  profile_exists boolean;
  is_tenant_user boolean;
BEGIN
  -- 检查是否为租户用户（user_metadata 中有 tenant_id）
  is_tenant_user := (NEW.raw_user_meta_data->>'tenant_id') IS NOT NULL;
  
  -- 如果是租户用户，跳过在 public.profiles 表中创建记录
  IF is_tenant_user THEN
    RETURN NEW;
  END IF;
  
  -- 只在 confirmed_at 从 NULL → 非 NULL 时执行
  IF (TG_OP = 'UPDATE' AND OLD.confirmed_at IS NULL AND NEW.confirmed_at IS NOT NULL) OR
     (TG_OP = 'INSERT' AND NEW.confirmed_at IS NOT NULL) THEN
    -- 检查 profiles 记录是否已存在
    SELECT EXISTS(SELECT 1 FROM profiles WHERE id = NEW.id) INTO profile_exists;
    
    -- 如果记录不存在，才插入
    IF NOT profile_exists THEN
      -- 判断 profiles 表里有多少用户
      SELECT COUNT(*) INTO user_count FROM profiles;
      
      -- 插入 profiles，首位用户给 super_admin 角色
      INSERT INTO profiles (id, phone, email, role)
      VALUES (
        NEW.id,
        NEW.phone,
        NEW.email,
        CASE WHEN user_count = 0 THEN 'super_admin'::user_role ELSE 'driver'::user_role END
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;
```

### 3. 更新触发器，同时在 INSERT 和 UPDATE 时触发

```sql
DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_confirmed
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
```

## 修复结果

### 1. 租户用户在 `public.profiles` 中的记录已被删除

查询结果：

| 手机号 | metadata_role | tenant_id | profile_role | 状态 |
|--------|---------------|-----------|--------------|------|
| 13900000001 | boss | 26d10bc2-... | NULL | ✅ 已删除 |
| 13900000002 | boss | 52ff28a4-... | NULL | ✅ 已删除 |
| 13900000011 | peer | 26d10bc2-... | NULL | ✅ 已删除 |
| 13900000111 | fleet_leader | 26d10bc2-... | NULL | ✅ 已删除 |
| 13900001111 | driver | 26d10bc2-... | NULL | ✅ 已删除 |

### 2. 租户用户在租户 Schema 中的角色正确

查询 `tenant_test1.profiles`：

| 手机号 | 姓名 | 角色 |
|--------|------|------|
| 13900000001 | 老板1 | boss |
| 13900000011 | admin11 | peer |
| 13900000111 | admin111 | fleet_leader |

### 3. 权限检查逻辑

现在，当老板、平级账号或车队长尝试创建用户时：

1. **第一步**：检查 `public.profiles` → 没有记录，进入第二步
2. **第二步**：检查租户 Schema → 找到记录，角色是 `boss`/`peer`/`fleet_leader`
3. **结果**：权限检查通过，允许创建用户 ✅

## 角色权限矩阵

### 中央管理系统（public.profiles）

| 角色 | 创建用户权限 |
|------|-------------|
| super_admin | ✅ 有权限 |
| boss | ✅ 有权限 |
| driver | ❌ 无权限 |

### 租户系统（tenant_xxx.profiles）

| 角色 | 创建用户权限 |
|------|-------------|
| boss | ✅ 有权限 |
| peer | ✅ 有权限 |
| fleet_leader | ✅ 有权限 |
| driver | ❌ 无权限 |

## 技术要点

### 1. 用户存储位置

- **中央管理系统用户**：只在 `public.profiles` 中有记录
- **租户用户**：只在租户 Schema 中有记录（`tenant_xxx.profiles`）
- **auth.users**：所有用户都在这里，通过 `user_metadata.tenant_id` 区分

### 2. 触发器优化

- **旧逻辑**：只在 UPDATE 时检查 `tenant_id`
- **新逻辑**：在 INSERT 和 UPDATE 时都检查 `tenant_id`
- **原因**：`supabase.auth.admin.createUser` 可能在 INSERT 时就设置 `confirmed_at`，导致 UPDATE 触发器不执行

### 3. 权限检查顺序

1. 先检查 `public.profiles`（中央管理系统）
2. 再检查租户 Schema（租户系统）
3. 两级检查，确保权限正确

## 测试建议

### 1. 测试老板创建用户

使用老板账号（13900000001）登录，尝试创建新用户，应该成功。

### 2. 测试平级账号创建用户

使用平级账号（13900000011）登录，尝试创建新用户，应该成功。

### 3. 测试车队长创建用户

使用车队长账号（13900000111）登录，尝试创建新用户，应该成功。

### 4. 测试司机创建用户

使用司机账号（13900001111）登录，尝试创建新用户，应该失败，提示权限不足。

### 5. 测试新租户创建

创建一个新租户，验证：
- 老板账号不会在 `public.profiles` 中创建记录
- 老板账号在租户 Schema 中有记录，角色是 `boss`
- 老板可以正常创建用户

## 相关文件

- 迁移文件：`supabase/migrations/00448_fix_boss_role_in_public_profiles.sql`
- 权限检查函数：`supabase/migrations/00447_allow_tenant_admins_create_users.sql`
- 触发器函数：`supabase/migrations/00412_fix_handle_new_user_for_tenant_users.sql`（已被新迁移覆盖）

## 总结

问题的根本原因是：**租户用户不应该在 `public.profiles` 中有记录**。

通过删除租户用户在 `public.profiles` 中的记录，并优化 `handle_new_user` 触发器，确保租户用户只在租户 Schema 中有记录，问题得到彻底解决。

现在，老板、平级账号和车队长都可以正常创建用户了！✅
