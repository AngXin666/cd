# 验证码登录快速测试指南

## 测试目的
验证修复后的验证码登录功能是否正常工作，不再出现约束错误。

## 测试前准备

### 1. 确认数据库已更新
```sql
-- 检查触发器函数是否已更新
SELECT 
    proname,
    prosrc
FROM pg_proc
WHERE proname = 'handle_new_user';
```

应该看到函数中包含 `driver_type` 字段的处理。

### 2. 清理测试数据（可选）
如果需要测试首位用户注册为超级管理员：

```sql
-- 警告：这会删除所有用户数据！
-- 仅在测试环境中使用！
DELETE FROM profiles;
DELETE FROM auth.users;
```

## 测试步骤

### 测试 1：首位用户注册（超级管理员）

**前提条件**：数据库中没有任何用户

**步骤**：
1. 打开小程序登录页面
2. 输入手机号：`15766121960`（或其他测试手机号）
3. 点击"获取验证码"
4. 输入收到的验证码
5. 点击"登录"

**预期结果**：
- ✅ 登录成功，没有错误
- ✅ 自动跳转到超级管理员首页
- ✅ 可以看到所有管理功能

**数据验证**：
```sql
SELECT id, phone, role, driver_type, created_at
FROM profiles
ORDER BY created_at DESC
LIMIT 1;
```

应该显示：
- `role = 'super_admin'`
- `driver_type = NULL`

### 测试 2：普通用户注册（司机）

**前提条件**：已有超级管理员

**步骤**：
1. 退出当前账号
2. 返回登录页面
3. 输入新的手机号：`13800138001`
4. 点击"获取验证码"
5. 输入收到的验证码
6. 点击"登录"

**预期结果**：
- ✅ 登录成功，没有错误
- ✅ 自动跳转到司机端首页
- ✅ 可以看到司机功能（打卡、计件等）

**数据验证**：
```sql
SELECT id, phone, role, driver_type, created_at
FROM profiles
ORDER BY created_at DESC
LIMIT 1;
```

应该显示：
- `role = 'driver'`
- `driver_type = 'company'`

### 测试 3：多个用户连续注册

**步骤**：
重复测试 2，使用不同的手机号：
- `13800138002`
- `13800138003`
- `13800138004`

**预期结果**：
- ✅ 所有用户都注册成功
- ✅ 没有出现约束错误
- ✅ 所有用户都是司机角色
- ✅ 所有用户的 `driver_type = 'company'`

**数据验证**：
```sql
SELECT 
    phone,
    role,
    driver_type,
    created_at
FROM profiles
WHERE role = 'driver'
ORDER BY created_at DESC;
```

### 测试 4：已注册用户再次登录

**步骤**：
1. 使用已注册的手机号登录
2. 输入验证码
3. 点击"登录"

**预期结果**：
- ✅ 登录成功
- ✅ 不会创建重复的 profile 记录
- ✅ 数据保持不变

**数据验证**：
```sql
-- 检查是否有重复记录
SELECT 
    phone,
    COUNT(*) as count
FROM profiles
GROUP BY phone
HAVING COUNT(*) > 1;
```

应该返回空结果（没有重复）。

## 错误检查

### 如果仍然出现约束错误

**检查 1：触发器是否更新**
```sql
SELECT prosrc
FROM pg_proc
WHERE proname = 'handle_new_user';
```

应该包含：
```sql
CASE WHEN new_role = 'driver'::user_role THEN 'company'::driver_type ELSE NULL END
```

**检查 2：约束是否存在**
```sql
SELECT 
    conname,
    pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conname = 'check_driver_type_only_for_drivers';
```

**检查 3：查看详细错误日志**
打开浏览器控制台，查看完整的错误信息。

### 如果登录后角色不正确

**检查用户数量**：
```sql
SELECT COUNT(*) FROM profiles;
```

- 如果是 0，下一个用户应该是 super_admin
- 如果 > 0，下一个用户应该是 driver

## 浏览器控制台检查

### 成功的日志
```
✅ 验证码验证成功
✅ 用户信息已创建
✅ 跳转到首页
```

### 失败的日志
```
❌ POST .../auth/v1/verify 500 (Internal Server Error)
❌ ERROR: new row for relation "profiles" violates check constraint
```

如果看到失败日志，说明修复未生效，需要检查：
1. 数据库迁移是否已应用
2. 触发器函数是否已更新
3. 约束条件是否正确

## 完整测试流程

### 1. 清理环境（可选）
```sql
-- 仅在测试环境！
DELETE FROM profiles;
DELETE FROM auth.users;
```

### 2. 测试首位用户
- 手机号：`15766121960`
- 预期：super_admin, driver_type=NULL

### 3. 测试普通用户
- 手机号：`13800138001`
- 预期：driver, driver_type=company

### 4. 测试批量注册
- 手机号：`13800138002` ~ `13800138005`
- 预期：全部成功，都是 driver

### 5. 测试重复登录
- 使用已注册手机号
- 预期：登录成功，无重复记录

### 6. 验证数据
```sql
SELECT 
    phone,
    role,
    driver_type,
    created_at
FROM profiles
ORDER BY created_at;
```

## 预期数据结构

| phone | role | driver_type | 说明 |
|-------|------|-------------|------|
| 15766121960 | super_admin | NULL | 首位用户 |
| 13800138001 | driver | company | 普通用户 |
| 13800138002 | driver | company | 普通用户 |
| 13800138003 | driver | company | 普通用户 |

## 成功标准

- ✅ 所有用户都能成功注册
- ✅ 没有出现 500 错误
- ✅ 没有约束错误
- ✅ 首位用户是超级管理员
- ✅ 其他用户是司机
- ✅ 所有司机都有 driver_type
- ✅ 非司机没有 driver_type
- ✅ 重复登录不会创建重复记录

## 故障排除

### 问题 1：仍然出现约束错误
**解决方案**：
1. 检查迁移是否已应用
2. 手动运行迁移 SQL
3. 重启应用服务器

### 问题 2：用户角色不正确
**解决方案**：
1. 检查 profiles 表中的用户数量
2. 确认触发器逻辑正确
3. 查看触发器执行日志

### 问题 3：driver_type 为 NULL
**解决方案**：
1. 确认触发器已更新
2. 检查 CASE 语句逻辑
3. 手动更新现有记录：
```sql
UPDATE profiles
SET driver_type = 'company'
WHERE role = 'driver' AND driver_type IS NULL;
```

## 测试完成检查清单

- [ ] 首位用户注册成功（super_admin）
- [ ] 普通用户注册成功（driver）
- [ ] 多个用户连续注册成功
- [ ] 重复登录不创建重复记录
- [ ] 所有司机都有 driver_type
- [ ] 非司机没有 driver_type
- [ ] 没有约束错误
- [ ] 数据结构正确

## 测试报告模板

```
测试日期：2025-11-05
测试人员：[姓名]
测试环境：[开发/测试/生产]

测试结果：
✅ 首位用户注册：成功
✅ 普通用户注册：成功
✅ 批量注册：成功
✅ 重复登录：成功
✅ 数据验证：正确

问题记录：
[如有问题，记录在此]

结论：
验证码登录功能正常，约束错误已修复。
```

## 相关文档
- `VERIFICATION_CODE_LOGIN_FIX.md` - 详细修复说明
- `supabase/migrations/48_fix_driver_type_constraint_on_registration.sql` - 迁移文件
