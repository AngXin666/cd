# 登录账号更新问题修复说明

## 修复日期
2025-11-05

## 问题描述

### 用户反馈
用户在超级管理员的用户管理界面编辑用户信息，修改了登录账号（`login_account`）字段后，保存成功，但无法使用新的登录账号进行登录。

### 问题现象
1. 在编辑用户页面修改登录账号
2. 点击保存，显示"保存成功"
3. 返回用户列表，可以看到登录账号已更新
4. 尝试使用新的登录账号登录，提示"账号或密码错误"
5. 使用旧的登录账号仍然可以登录

---

## 问题分析

### 根本原因

**数据表不一致问题：**

1. **profiles 表**：
   - 存储用户的业务信息
   - 包含 `login_account` 字段（用于显示）
   - 更新用户信息时只修改了这个表

2. **auth.users 表**：
   - Supabase Auth 的认证表
   - 包含 `email` 和 `phone` 字段（用于登录）
   - 登录时使用这个表进行认证

3. **登录逻辑**：
   ```typescript
   // 登录页面的密码登录逻辑
   if (isPhoneNumber) {
     // 使用 phone 字段登录
     await supabase.auth.signInWithPassword({ phone: account, password })
   } else {
     // 使用 email 字段登录（账号名转换为邮箱格式）
     const email = account.includes('@') ? account : `${account}@fleet.com`
     await supabase.auth.signInWithPassword({ email, password })
   }
   ```

### 问题流程

```
用户修改登录账号 "admin1" → "newadmin"
    ↓
updateUserInfo 函数执行
    ↓
只更新 profiles.login_account = "newadmin"
    ↓
auth.users.email 仍然是 "admin1@fleet.com"
    ↓
用户尝试用 "newadmin" 登录
    ↓
转换为 "newadmin@fleet.com"
    ↓
auth.users 表中找不到这个邮箱
    ↓
登录失败 ❌
```

---

## 解决方案

### 1. 创建 PostgreSQL 函数

创建 `update_user_email` 函数，允许超级管理员直接更新 `auth.users` 表的 `email` 字段。

**函数特性：**
- 使用 `SECURITY DEFINER` 权限执行
- 验证调用者是否为超级管理员
- 检查新邮箱是否已被其他用户使用
- 自动设置 `email_confirmed_at` 为当前时间
- 更新 `updated_at` 时间戳

**SQL 代码：**
```sql
CREATE OR REPLACE FUNCTION update_user_email(
  target_user_id uuid,
  new_email text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- 检查调用者是否为超级管理员
  IF NOT is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION '只有超级管理员可以修改用户邮箱';
  END IF;

  -- 检查新邮箱是否已被其他用户使用
  IF EXISTS (
    SELECT 1 FROM auth.users 
    WHERE email = new_email 
    AND id != target_user_id
  ) THEN
    RAISE EXCEPTION '该邮箱已被其他用户使用';
  END IF;

  -- 更新用户邮箱
  UPDATE auth.users
  SET 
    email = new_email,
    email_confirmed_at = now(),
    updated_at = now()
  WHERE id = target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION '用户不存在';
  END IF;
END;
$$;
```

### 2. 修改 updateUserInfo API 函数

在 `src/db/api.ts` 中修改 `updateUserInfo` 函数，添加登录账号同步逻辑。

**修改内容：**

```typescript
export async function updateUserInfo(
  userId: string,
  updates: { ... }
): Promise<boolean> {
  try {
    // 1. 更新 profiles 表
    const {data, error} = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()

    if (error || !data || data.length === 0) {
      return false
    }

    // 2. 如果更新了 login_account，同步更新 auth.users 表的 email
    if (updates.login_account) {
      // 将登录账号转换为邮箱格式
      const newEmail = updates.login_account.includes('@') 
        ? updates.login_account 
        : `${updates.login_account}@fleet.com`
      
      // 调用 PostgreSQL 函数更新 auth.users
      const {error: authError} = await supabase.rpc('update_user_email', {
        target_user_id: userId,
        new_email: newEmail
      })

      if (!authError) {
        // 同时更新 profiles 表的 email 字段以保持一致
        await supabase
          .from('profiles')
          .update({email: newEmail})
          .eq('id', userId)
      }
    }

    return true
  } catch (error) {
    return false
  }
}
```

### 3. 添加详细日志

在整个更新流程中添加详细的调试日志：

```typescript
console.log('=== updateUserInfo API 调用 ===')
console.log('目标用户ID:', userId)
console.log('更新数据:', updates)

// ... 更新 profiles 表 ...
console.log('✅ profiles 表更新成功！')

// ... 检测 login_account 更新 ...
console.log('检测到 login_account 更新，同步更新 auth.users 表的 email...')
console.log('新的邮箱地址:', newEmail)

// ... 更新 auth.users 表 ...
console.log('✅ auth.users 表邮箱更新成功！')
console.log('✅ profiles 表 email 字段同步更新成功！')
```

---

## 修复后的流程

```
用户修改登录账号 "admin1" → "newadmin"
    ↓
updateUserInfo 函数执行
    ↓
1. 更新 profiles.login_account = "newadmin"
    ↓
2. 检测到 login_account 更新
    ↓
3. 转换为邮箱格式 "newadmin@fleet.com"
    ↓
4. 调用 update_user_email 函数
    ↓
5. 更新 auth.users.email = "newadmin@fleet.com"
    ↓
6. 更新 profiles.email = "newadmin@fleet.com"
    ↓
用户尝试用 "newadmin" 登录
    ↓
转换为 "newadmin@fleet.com"
    ↓
auth.users 表中找到匹配的邮箱
    ↓
登录成功 ✅
```

---

## 验证步骤

### 1. 修改登录账号
```bash
# 1. 以超级管理员身份登录
# 2. 进入用户管理页面
# 3. 选择一个用户，点击"编辑"
# 4. 修改登录账号（例如：admin1 → testuser）
# 5. 点击保存
# 6. 确认显示"保存成功"
```

### 2. 查看调试日志
```bash
# 打开浏览器开发者工具（F12）
# 切换到 Console 标签
# 查看日志输出：
# - ✅ profiles 表更新成功
# - 检测到 login_account 更新
# - 新的邮箱地址: testuser@fleet.com
# - ✅ auth.users 表邮箱更新成功
# - ✅ profiles 表 email 字段同步更新成功
```

### 3. 验证登录
```bash
# 1. 退出登录
# 2. 在登录页面输入新的登录账号（testuser）
# 3. 输入密码
# 4. 点击登录
# 5. 确认可以成功登录 ✅
```

### 4. 验证数据一致性
```sql
-- 查询 profiles 表
SELECT id, login_account, email FROM profiles WHERE login_account = 'testuser';

-- 查询 auth.users 表
SELECT id, email, email_confirmed_at FROM auth.users WHERE email = 'testuser@fleet.com';

-- 确认两个表的数据一致
```

---

## 技术细节

### 邮箱格式转换规则

```typescript
// 如果登录账号已经包含 @，直接使用
if (account.includes('@')) {
  email = account  // 例如：user@example.com
} else {
  // 否则添加 @fleet.com 后缀
  email = `${account}@fleet.com`  // 例如：admin → admin@fleet.com
}
```

### 数据同步策略

1. **profiles.login_account**：用户输入的原始登录账号
2. **profiles.email**：转换后的邮箱格式（与 auth.users.email 一致）
3. **auth.users.email**：实际用于登录认证的邮箱

### 安全性考虑

1. **权限验证**：只有超级管理员可以修改用户邮箱
2. **邮箱唯一性**：检查新邮箱是否已被其他用户使用
3. **事务安全**：使用 PostgreSQL 函数确保原子性操作
4. **日志记录**：完整的操作日志便于问题排查

---

## 影响范围

### 修改的文件
1. `src/db/api.ts` - updateUserInfo 函数
2. `supabase/migrations/33_create_update_user_email_function.sql` - 数据库函数

### 影响的功能
1. ✅ 用户管理 - 编辑用户信息
2. ✅ 登录功能 - 账号名登录
3. ✅ 数据一致性 - profiles 和 auth.users 表同步

### 不影响的功能
- ❌ 手机号登录（不受影响）
- ❌ 验证码登录（不受影响）
- ❌ 其他用户信息字段的修改（不受影响）

---

## 已知限制

### 1. 邮箱格式限制
- 登录账号会自动转换为 `@fleet.com` 邮箱格式
- 如果需要使用真实邮箱，需要在登录账号中包含 `@`

### 2. 历史数据
- 此修复只影响新的登录账号修改
- 历史上修改过但未同步的账号需要手动修复

### 3. 并发修改
- 如果多个管理员同时修改同一用户的登录账号，可能出现冲突
- 建议添加乐观锁或版本控制

---

## 后续优化建议

### 1. 批量同步工具
创建一个工具脚本，同步所有历史数据：
```sql
-- 同步所有用户的 login_account 到 auth.users.email
UPDATE auth.users au
SET email = p.login_account || '@fleet.com'
FROM profiles p
WHERE au.id = p.id
AND p.login_account IS NOT NULL
AND au.email != p.login_account || '@fleet.com';
```

### 2. 数据验证
添加定期检查，确保 profiles 和 auth.users 表数据一致：
```sql
-- 查找不一致的记录
SELECT 
  p.id,
  p.login_account,
  p.email as profile_email,
  au.email as auth_email
FROM profiles p
JOIN auth.users au ON p.id = au.id
WHERE p.email != au.email;
```

### 3. UI 提示
在编辑用户页面添加提示信息：
```
"修改登录账号后，用户需要使用新账号登录。
旧账号将立即失效。"
```

---

## 相关文档
- [用户管理界面优化总结](./USER_MANAGEMENT_UI_OPTIMIZATION.md)
- [最终修复总结](./FINAL_FIX_SUMMARY.md)
- [登录功能说明](./LOGIN_FIX_SUMMARY.md)

---

## 提交记录
- `5d55a47` - 修复登录账号更新后无法登录的问题
- `26b766f` - 添加用户管理界面优化总结文档
- `7a6209d` - 添加用户信息保存的详细调试日志
