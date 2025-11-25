# 修复创建老板账号 406 错误

## 问题描述

创建老板账号时出现 406 (Not Acceptable) 错误：

```
PATCH https://backend.appmiaoda.com/projects/.../rest/v1/profiles?id=eq.xxx&select=* 406 (Not Acceptable)
```

## 问题原因

1. **创建流程**：
   - 租赁管理员使用 `supabase.auth.signUp()` 创建认证用户
   - 触发器自动创建 `profiles` 记录（此时 `tenant_id` 为 NULL）
   - 尝试更新 `profiles` 记录设置租赁信息和 `tenant_id`

2. **权限问题**：
   - 旧的 RLS 策略"租赁管理员更新老板账号"的 USING 条件包含了对 `tenant_id` 的检查
   - 新创建的记录 `tenant_id` 为 NULL，不满足策略条件
   - 导致更新操作被拒绝

## 解决方案

### 修改 RLS 策略

创建迁移 `038_fix_lease_admin_update_new_tenant.sql`，修改策略：

**旧策略（有问题）：**
```sql
CREATE POLICY "租赁管理员更新老板账号" ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    is_lease_admin_user(auth.uid()) 
    AND role = 'super_admin'::user_role
    AND tenant_id IS NOT NULL  -- 这个条件导致无法更新新记录
  );
```

**新策略（已修复）：**
```sql
CREATE POLICY "租赁管理员更新老板账号" ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    is_lease_admin_user(auth.uid()) 
    AND role = 'super_admin'::user_role
    -- 移除了 tenant_id 的检查，允许更新所有 super_admin 记录
  )
  WITH CHECK (
    role = 'super_admin'::user_role
  );
```

## 修复步骤

1. **应用数据库迁移**：
   ```bash
   # 迁移已自动应用
   supabase/migrations/038_fix_lease_admin_update_new_tenant.sql
   ```

2. **验证修复**：
   - 使用租赁管理员账号（admin888 / hye19911206）登录
   - 尝试创建新的老板账号
   - 填写所有必填信息（姓名、手机、邮箱、密码）
   - 提交后应该成功创建

## 创建流程说明

### 正确的创建流程

1. **前端提交**：
   ```typescript
   createTenant(
     {
       name: '测试老板',
       phone: '13900000001',
       email: 'boss@example.com',
       role: 'super_admin',
       company_name: '测试公司',
       // ... 其他字段
       tenant_id: null
     },
     'boss@example.com',
     '123456'
   )
   ```

2. **后端处理**：
   ```typescript
   // 步骤1: 创建认证用户
   const {data: authData} = await supabase.auth.signUp({
     email,
     password,
     options: {
       data: {
         name: tenant.name,
         phone: tenant.phone,
         role: 'super_admin'
       }
     }
   })
   
   // 步骤2: 等待触发器创建 profiles 记录
   await new Promise(resolve => setTimeout(resolve, 1000))
   
   // 步骤3: 更新 profiles 记录（现在可以成功）
   const {data: profileData} = await supabase
     .from('profiles')
     .update({
       name: tenant.name,
       phone: tenant.phone,
       email: email,
       company_name: tenant.company_name,
       lease_start_date: tenant.lease_start_date,
       lease_end_date: tenant.lease_end_date,
       monthly_fee: tenant.monthly_fee,
       notes: tenant.notes,
       status: 'active',
       tenant_id: authData.user.id  // 设置为自己的 id
     })
     .eq('id', authData.user.id)
     .select()
     .maybeSingle()
   ```

3. **数据库触发器**：
   - `handle_new_user()` 触发器在 `auth.users` 表插入时触发
   - 自动创建 `profiles` 记录
   - 如果是第一个用户，设置 `role` 为 `admin`
   - 否则根据创建者的角色设置

## 测试验证

### 测试步骤

1. **登录租赁管理员**：
   - 账号：admin888
   - 密码：hye19911206

2. **创建新老板账号**：
   - 姓名：测试老板3
   - 手机：13900000003
   - 邮箱：boss3@fleet.com
   - 密码：123456
   - 公司名称：测试公司3

3. **验证结果**：
   - 创建成功，显示"创建成功"提示
   - 返回老板账号列表
   - 新老板出现在列表中

4. **验证登录**：
   - 退出租赁管理员账号
   - 使用新老板账号登录（boss3@fleet.com / 123456）
   - 成功进入老板工作台

### 数据库验证

```sql
-- 查看新创建的老板账号
SELECT 
  id,
  name,
  email,
  phone,
  role,
  tenant_id,
  company_name,
  status
FROM profiles
WHERE email = 'boss3@fleet.com';

-- 验证 tenant_id 是否正确设置为自己的 id
-- 应该看到 tenant_id = id
```

## 相关文件

- **数据库迁移**：`supabase/migrations/038_fix_lease_admin_update_new_tenant.sql`
- **API 函数**：`src/db/api.ts` - `createTenant()`
- **前端页面**：`src/pages/lease-admin/tenant-form/index.tsx`

## 注意事项

1. **密码要求**：
   - 最少 6 位字符
   - 前端会验证密码长度

2. **邮箱唯一性**：
   - 邮箱必须唯一
   - 如果邮箱已存在，创建会失败

3. **等待时间**：
   - 创建认证用户后等待 1 秒
   - 确保触发器有足够时间创建 profiles 记录

4. **错误处理**：
   - 如果创建失败，会显示"创建失败"提示
   - 检查浏览器控制台查看详细错误信息

## 总结

通过修改 RLS 策略，移除了对 `tenant_id` 的检查，允许租赁管理员更新所有 super_admin 记录，包括刚创建的 `tenant_id` 为 NULL 的记录。这样就解决了 406 错误，使创建老板账号功能正常工作。

## 更新时间

2025-11-25 20:00:00 (UTC+8)
