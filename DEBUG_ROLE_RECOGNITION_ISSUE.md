# 角色识别问题调试指南

## 问题描述
所有角色账号都被识别成司机（driver）。

## 可能的原因

### 1. 数据库权限问题
**症状**：查询 `public.profiles` 或租户 Schema 时返回权限错误

**检查方法**：
1. 打开浏览器开发者工具（F12）
2. 切换到 Console 标签页
3. 查找以下日志：
   ```
   [getCurrentUserRoleAndTenant] 查询 public.profiles 出错: {...}
   ```

**解决方案**：
- 检查 Supabase RLS（Row Level Security）策略
- 确保用户有权限查询 `public.profiles` 表
- 确保用户有权限查询租户 Schema 中的 `profiles` 表

### 2. 租户 Schema 不存在
**症状**：查询租户 Schema 时返回 Schema 不存在的错误

**检查方法**：
1. 查看控制台日志：
   ```
   [getCurrentUserRoleAndTenant] 查询租户 Schema: tenant_xxx
   [getCurrentUserRoleAndTenant] 查询租户 tenant_xxx 失败: {...}
   ```

**解决方案**：
- 检查租户是否已正确创建
- 检查租户 Schema 是否存在
- 使用 Supabase SQL Editor 执行：
  ```sql
  SELECT schema_name FROM information_schema.schemata 
  WHERE schema_name LIKE 'tenant_%';
  ```

### 3. 用户数据不存在
**症状**：用户既不在 `public.profiles` 中，也不在任何租户 Schema 中

**检查方法**：
1. 查看控制台日志：
   ```
   [getCurrentUserRoleAndTenant] 在 public.profiles 中未找到用户
   [getCurrentUserRoleAndTenant] 在所有 Schema 中都未找到用户
   ```

**解决方案**：
- 检查用户是否已正确注册
- 检查用户的 profile 记录是否已创建
- 使用 Supabase SQL Editor 执行：
  ```sql
  -- 查询 public.profiles
  SELECT * FROM public.profiles WHERE id = '用户ID';
  
  -- 查询租户 Schema（替换 tenant_xxx 为实际的 Schema 名称）
  SELECT * FROM tenant_xxx.profiles WHERE id = '用户ID';
  ```

### 4. 角色字段值不正确
**症状**：用户存在，但角色字段的值不是预期的枚举值

**检查方法**：
1. 查看控制台日志：
   ```
   [getCurrentUserRoleAndTenant] 在 public.profiles 中找到用户，角色: xxx
   ```
2. 检查角色值是否为以下之一：
   - `driver`（司机）
   - `manager`（车队长）
   - `super_admin`（超级管理员）
   - `peer_admin`（平级账号）
   - `boss`（老板）

**解决方案**：
- 使用 Supabase SQL Editor 更新用户角色：
  ```sql
  -- 更新 public.profiles 中的用户角色
  UPDATE public.profiles 
  SET role = 'super_admin'::user_role 
  WHERE id = '用户ID';
  
  -- 更新租户 Schema 中的用户角色
  UPDATE tenant_xxx.profiles 
  SET role = 'boss'::user_role 
  WHERE id = '用户ID';
  ```

### 5. 函数执行异常
**症状**：函数执行过程中抛出异常，被最外层 catch 块捕获

**检查方法**：
1. 查看控制台日志：
   ```
   [getCurrentUserRoleAndTenant] 发生错误: Error: ...
   ```

**解决方案**：
- 根据错误信息排查具体问题
- 检查网络连接
- 检查 Supabase 服务状态

---

## 调试步骤

### 步骤1：检查控制台日志
1. 打开浏览器开发者工具（F12）
2. 切换到 Console 标签页
3. 刷新页面或重新登录
4. 查找以 `[getCurrentUserRoleAndTenant]` 开头的日志

### 步骤2：分析日志内容
根据日志内容，确定问题所在：

#### 情况A：在 public.profiles 中找到用户
```
[getCurrentUserRoleAndTenant] 在 public.profiles 中找到用户，角色: super_admin
```
- ✅ 正常情况
- 用户是中央用户（super_admin 或 peer_admin）
- 应该使用 `public` Schema

#### 情况B：在租户 Schema 中找到用户
```
[getCurrentUserRoleAndTenant] 在 public.profiles 中未找到用户，查询租户信息
[getCurrentUserRoleAndTenant] 找到租户列表，数量: 1
[getCurrentUserRoleAndTenant] 查询租户 Schema: tenant_xxx
[getCurrentUserRoleAndTenant] 在租户 tenant_xxx 中找到用户，角色: boss
```
- ✅ 正常情况
- 用户是租户用户（boss、manager、driver）
- 应该使用租户 Schema

#### 情况C：查询 public.profiles 出错
```
[getCurrentUserRoleAndTenant] 查询 public.profiles 出错: {code: 'xxx', message: 'xxx'}
```
- ❌ 异常情况
- 可能是权限问题或网络问题
- 需要检查 RLS 策略

#### 情况D：在所有 Schema 中都未找到用户
```
[getCurrentUserRoleAndTenant] 在所有 Schema 中都未找到用户
[getCurrentUserRoleAndTenant] 发生错误: Error: 在所有 Schema 中都未找到用户
```
- ❌ 异常情况
- 用户的 profile 记录不存在
- 需要创建用户的 profile 记录

### 步骤3：使用 SQL 查询验证
使用 Supabase SQL Editor 执行以下查询，验证用户数据：

```sql
-- 1. 查询当前登录用户的 ID
SELECT auth.uid();

-- 2. 查询 public.profiles 中的用户
SELECT * FROM public.profiles WHERE id = auth.uid();

-- 3. 查询所有租户
SELECT id, company_name FROM public.tenants;

-- 4. 查询租户 Schema 中的用户（替换 tenant_xxx 为实际的 Schema 名称）
SELECT * FROM tenant_xxx.profiles WHERE id = auth.uid();

-- 5. 查询所有 Schema
SELECT schema_name FROM information_schema.schemata 
WHERE schema_name LIKE 'tenant_%' OR schema_name = 'public';
```

### 步骤4：修复数据
根据查询结果，修复用户数据：

#### 修复1：创建缺失的 profile 记录
```sql
-- 在 public.profiles 中创建中央用户
INSERT INTO public.profiles (id, name, role, phone)
VALUES (
  '用户ID',
  '用户姓名',
  'super_admin'::user_role,
  '手机号'
);

-- 在租户 Schema 中创建租户用户
INSERT INTO tenant_xxx.profiles (id, name, role, phone)
VALUES (
  '用户ID',
  '用户姓名',
  'boss'::user_role,
  '手机号'
);
```

#### 修复2：更新错误的角色
```sql
-- 更新 public.profiles 中的用户角色
UPDATE public.profiles 
SET role = 'super_admin'::user_role 
WHERE id = '用户ID';

-- 更新租户 Schema 中的用户角色
UPDATE tenant_xxx.profiles 
SET role = 'boss'::user_role 
WHERE id = '用户ID';
```

---

## 常见问题

### Q1：为什么所有用户都被识别为司机？
**A**：这通常是因为 `getCurrentUserRoleAndTenant()` 函数在执行过程中遇到错误，最终在 catch 块中返回了默认值 `{role: 'driver', tenant_id: null}`。

**解决方案**：
1. 检查控制台日志，找到具体的错误信息
2. 根据错误信息排查问题
3. 修复数据或权限问题

### Q2：如何确定用户应该在哪个 Schema 中？
**A**：
- **中央用户**（super_admin、peer_admin）：在 `public.profiles` 中
- **租户用户**（boss、manager、driver）：在 `tenant_{tenant_id}.profiles` 中

### Q3：如何获取租户 ID？
**A**：
```sql
-- 查询所有租户
SELECT id, company_name FROM public.tenants;
```

### Q4：如何生成租户 Schema 名称？
**A**：
- 格式：`tenant_{tenant_id}`
- 将租户 ID 中的 `-` 替换为 `_`
- 例如：租户 ID 为 `123e4567-e89b-12d3-a456-426614174000`
- Schema 名称为 `tenant_123e4567_e89b_12d3_a456_426614174000`

### Q5：如何检查 RLS 策略？
**A**：
```sql
-- 查询 public.profiles 的 RLS 策略
SELECT * FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'public';

-- 查询租户 Schema 的 RLS 策略
SELECT * FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'tenant_xxx';
```

---

## 预防措施

### 1. 确保用户注册时创建 profile 记录
在用户注册时，应该自动创建对应的 profile 记录：

```sql
-- 创建触发器，在用户注册时自动创建 profile
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, phone, email, role)
  VALUES (NEW.id, NEW.phone, NEW.email, 'driver'::user_role);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

### 2. 设置正确的 RLS 策略
确保用户有权限查询自己的 profile：

```sql
-- 允许用户查询自己的 profile
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- 允许管理员查询所有 profile
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );
```

### 3. 定期检查数据完整性
定期执行以下查询，检查是否有用户没有 profile 记录：

```sql
-- 查询没有 profile 的用户
SELECT u.id, u.email, u.phone
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL;
```

---

## 联系支持
如果以上步骤都无法解决问题，请联系技术支持，并提供以下信息：

1. 控制台日志截图
2. 用户 ID
3. 租户 ID（如果是租户用户）
4. SQL 查询结果

---

**文档创建日期**：2025-11-05  
**文档作者**：秒哒 AI 助手
