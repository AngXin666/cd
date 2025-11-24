# 修复 RLS 策略错误

## 问题描述

### 错误信息
```
new row violates row-level security policy for table "profiles"
错误代码: 42501
```

### 错误原因
当普通管理员尝试添加司机时，插入 profiles 表失败，因为 RLS 策略检查失败。

具体原因：
1. `is_manager` 函数的 `search_path` 只包含 `public`
2. 在策略中调用 `is_manager(auth.uid())` 时，函数内部无法找到 `auth` schema
3. 导致策略检查失败，拒绝插入操作

## 解决方案

### 1. 更新 is_manager 函数

**问题**：
- `search_path` 只包含 `public`
- 无法访问 `auth` schema 中的函数和表

**修复**：
```sql
CREATE OR REPLACE FUNCTION is_manager(uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'auth'  -- 添加 auth schema
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = uid AND p.role = 'manager'::user_role
  );
$$;
```

### 2. 更新 is_super_admin 函数

**问题**：
- 没有设置 `search_path`
- 可能导致类似的问题

**修复**：
```sql
CREATE OR REPLACE FUNCTION is_super_admin(uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'auth'  -- 设置 search_path
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = uid AND role = 'super_admin'::user_role
  );
$$;
```

### 3. 验证策略

**策略定义**：
```sql
CREATE POLICY "Managers can insert driver profiles" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    is_manager(auth.uid()) AND role = 'driver'::user_role
  );
```

**策略逻辑**：
1. 检查当前用户是否是普通管理员：`is_manager(auth.uid())`
2. 检查插入的记录角色是否是司机：`role = 'driver'::user_role`
3. 两个条件都满足时，允许插入

## 测试步骤

### 测试 1：验证函数更新

**步骤 1**：检查函数的 search_path

```sql
-- 查看 is_manager 函数的配置
SELECT 
  proname,
  prosecdef,
  proconfig
FROM pg_proc
WHERE proname = 'is_manager';

-- 预期结果：
-- proconfig: ["search_path=public, auth"]
```

**步骤 2**：测试函数是否正常工作

```sql
-- 获取一个普通管理员的 ID
SELECT id, name, role FROM profiles WHERE role = 'manager' LIMIT 1;

-- 假设 ID 是 'xxx-xxx-xxx'
SELECT is_manager('xxx-xxx-xxx'::uuid);
-- 预期结果: true

-- 测试非管理员
SELECT id, name, role FROM profiles WHERE role = 'driver' LIMIT 1;
SELECT is_manager('yyy-yyy-yyy'::uuid);
-- 预期结果: false
```

### 测试 2：普通管理员添加司机

**准备**：
1. 使用普通管理员账号登录
2. 确保账号角色是 'manager'

**步骤**：
1. 进入司机管理页面
2. 点击"添加司机"按钮
3. 填写司机信息：
   - 姓名：测试司机
   - 手机号：13800138999（使用未使用过的手机号）
   - 司机类型：正式司机
4. 点击"添加"按钮

**预期结果**：
- ✅ 创建成功
- ✅ 显示登录信息弹窗
- ✅ 弹窗显示：
  - 登录邮箱：13800138999@fleet.com
  - 默认密码：123456
- ✅ 司机列表中显示新添加的司机

**验证 SQL**：
```sql
-- 验证记录已创建
SELECT 
  au.id as auth_id,
  p.id as profile_id,
  au.email,
  p.phone,
  p.name,
  p.role,
  p.driver_type,
  au.id = p.id as ids_match
FROM auth.users au
JOIN profiles p ON au.id = p.id
WHERE p.phone = '13800138999';

-- 预期结果：
-- - auth_id 和 profile_id 相同
-- - email: 13800138999@fleet.com
-- - phone: 13800138999
-- - role: driver
-- - driver_type: 正式司机
-- - ids_match: true
```

### 测试 3：权限边界测试

**测试 3.1**：普通管理员不能创建管理员

**步骤**：
1. 尝试修改代码，将 role 改为 'manager'
2. 提交创建请求

**预期结果**：
- ❌ 创建失败
- ❌ 错误：违反 RLS 策略
- ✅ 策略正确阻止了非法操作

**测试 3.2**：普通管理员不能创建超级管理员

**步骤**：
1. 尝试修改代码，将 role 改为 'super_admin'
2. 提交创建请求

**预期结果**：
- ❌ 创建失败
- ❌ 错误：违反 RLS 策略
- ✅ 策略正确阻止了非法操作

**测试 3.3**：司机不能创建任何用户

**步骤**：
1. 使用司机账号登录
2. 尝试访问添加司机页面

**预期结果**：
- ❌ 无法访问页面（前端权限控制）
- 或者
- ❌ 创建失败（后端 RLS 策略阻止）

### 测试 4：超级管理员权限

**步骤**：
1. 使用超级管理员账号登录
2. 进入用户管理页面
3. 添加新用户（任意角色）

**预期结果**：
- ✅ 可以创建任意角色的用户
- ✅ 司机、普通管理员、超级管理员都可以创建

## 技术细节

### search_path 的作用

**定义**：
- `search_path` 指定了 PostgreSQL 查找对象（表、函数等）的 schema 顺序
- 类似于操作系统的 PATH 环境变量

**示例**：
```sql
-- 没有 search_path 或只有 public
SET search_path TO 'public';
SELECT uid();  -- 错误：函数不存在

-- 添加 auth schema
SET search_path TO 'public', 'auth';
SELECT uid();  -- 成功：找到 auth.uid()
```

### SECURITY DEFINER 的作用

**定义**：
- `SECURITY DEFINER` 表示函数以定义者（创建者）的权限执行
- 而不是以调用者的权限执行

**用途**：
- 允许普通用户执行需要更高权限的操作
- 类似于 Linux 的 setuid

**示例**：
```sql
-- 普通用户无法直接查询 auth.users
SELECT * FROM auth.users;  -- 错误：权限不足

-- 但可以通过 SECURITY DEFINER 函数间接访问
SELECT is_manager(auth.uid());  -- 成功：函数以超级用户权限执行
```

### RLS 策略的执行流程

**流程**：
1. 用户尝试插入记录到 profiles 表
2. PostgreSQL 检查所有 INSERT 策略
3. 对于 "Managers can insert driver profiles" 策略：
   - 调用 `is_manager(auth.uid())`
   - 函数以 SECURITY DEFINER 权限执行
   - 函数内部查询 profiles 表
   - 返回 true 或 false
4. 检查 `role = 'driver'::user_role`
5. 如果两个条件都满足，允许插入
6. 否则，拒绝插入并返回错误

**关键点**：
- `auth.uid()` 返回当前登录用户的 ID
- `is_manager` 函数检查该 ID 对应的用户是否是管理员
- 策略确保只有管理员可以插入司机记录

## 常见问题

### Q1：为什么需要 SECURITY DEFINER？

**A**：
- 普通用户没有权限直接查询 profiles 表（受 RLS 保护）
- 使用 SECURITY DEFINER 后，函数以超级用户权限执行
- 可以绕过 RLS 限制，查询所有记录
- 但函数的逻辑是安全的，只返回 true/false

### Q2：为什么需要设置 search_path？

**A**：
- PostgreSQL 默认只在 public schema 中查找对象
- `auth.uid()` 函数在 auth schema 中
- 如果不设置 search_path，函数找不到 auth.uid()
- 导致策略检查失败

### Q3：如何调试 RLS 策略？

**A**：
1. 检查策略定义：
```sql
SELECT * FROM pg_policies WHERE tablename = 'profiles';
```

2. 测试函数：
```sql
SELECT is_manager(auth.uid());
```

3. 查看当前用户：
```sql
SELECT auth.uid(), current_user;
```

4. 临时禁用 RLS（仅用于调试）：
```sql
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
-- 测试插入
-- ...
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
```

### Q4：如何确保策略安全？

**A**：
1. **最小权限原则**：
   - 普通管理员只能创建司机
   - 不能创建管理员或超级管理员

2. **双重检查**：
   - 检查调用者身份：`is_manager(auth.uid())`
   - 检查插入数据：`role = 'driver'::user_role`

3. **使用 ENUM 类型**：
   - `user_role` 是 ENUM 类型
   - 防止插入无效的角色值

4. **审计日志**：
   - 记录所有创建操作
   - 便于追踪和审计

## 相关文件

- `supabase/migrations/018_fix_manager_insert_policy.sql` - 修复策略
- `supabase/migrations/019_fix_is_manager_search_path.sql` - 修复 is_manager 函数
- `supabase/migrations/020_fix_is_super_admin_search_path.sql` - 修复 is_super_admin 函数
- `src/db/api.ts` - createDriver 函数
- `docs/修复RLS策略错误.md` - 本文档

## 总结

通过以下措施解决了 RLS 策略错误：

1. ✅ 更新 `is_manager` 函数，添加 `auth` schema 到 `search_path`
2. ✅ 更新 `is_super_admin` 函数，设置正确的 `search_path`
3. ✅ 验证策略定义正确
4. ✅ 提供详细的测试步骤
5. ✅ 确保权限边界清晰

现在，普通管理员可以成功添加司机，同时保持了系统的安全性。
