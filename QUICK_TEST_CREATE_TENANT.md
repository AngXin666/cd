# 快速测试：创建老板账号（406 错误已修复）

## 修复说明

已应用四个修复来解决 406 错误：

1. **038** - 修复租赁管理员更新老板账号策略（移除 tenant_id 检查）
2. **039** - 修复租户数据隔离策略的 NULL 比较问题
3. **040** - 修复 is_lease_admin_user 函数的枚举类型问题
4. **041** - 清理失败的创建记录 + 前端代码改为直接插入 profiles 记录

## 根本原因

原代码等待触发器创建 profiles 记录，但触发器只在用户确认邮箱后才执行。
现在改为直接插入 profiles 记录，不再依赖触发器。

## 测试目的

验证 406 错误已完全修复，可以成功创建新的老板账号。

## 测试步骤

### 1. 登录租赁管理员

- 邮箱：`admin888@fleet.com`
- 密码：`hye19911206`

### 2. 进入老板账号管理

1. 点击底部"租赁端"标签
2. 点击"老板账号列表"

### 3. 创建新老板账号

1. 点击"新增老板账号"按钮
2. 填写信息：
   - **姓名**：测试老板3
   - **手机号**：13900000003
   - **邮箱**：boss3@fleet.com
   - **密码**：123456
   - 公司名称：测试公司3
   - 月租费用：1000
3. 点击"提交"

### 4. 验证结果

**成功标志**：
- ✅ 显示"创建成功"提示
- ✅ 自动返回老板账号列表
- ✅ 新老板出现在列表中
- ✅ 浏览器控制台没有 406 错误

**失败标志**：
- ❌ 显示"创建失败"提示
- ❌ 浏览器控制台出现 406 错误
- ❌ 没有返回列表页面

### 5. 验证新老板登录

1. 退出租赁管理员账号
2. 使用新老板账号登录：
   - 账号：`boss3@fleet.com`
   - 密码：`123456`
3. 验证：
   - ✅ 成功登录
   - ✅ 进入老板工作台
   - ✅ 可以看到空的数据列表（新租户没有数据）

## 数据库验证

如果需要在数据库层面验证，可以执行：

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
  status,
  created_at
FROM profiles
WHERE email = 'boss3@fleet.com';

-- 验证 tenant_id 是否正确设置为自己的 id
-- 应该看到 tenant_id = id
```

## 问题排查

### 如果仍然出现 406 错误

1. **检查迁移是否应用**：
   ```sql
   -- 查看 RLS 策略
   SELECT policyname, cmd, qual
   FROM pg_policies
   WHERE tablename = 'profiles'
   ORDER BY policyname;
   ```

2. **检查租赁管理员角色**：
   ```sql
   -- 确认 admin888 是 lease_admin
   SELECT id, name, phone, role
   FROM profiles
   WHERE phone = 'admin888';
   ```

3. **查看浏览器控制台**：
   - 打开开发者工具（F12）
   - 查看 Console 标签的错误信息
   - 查看 Network 标签的请求详情

### 如果创建成功但无法登录

1. **检查认证用户是否创建**：
   ```sql
   -- 查看 auth.users 表
   SELECT id, email, confirmed_at
   FROM auth.users
   WHERE email = 'boss3@fleet.com';
   ```

2. **检查 profiles 记录**：
   ```sql
   -- 确认 profiles 记录存在
   SELECT id, email, role, tenant_id
   FROM profiles
   WHERE email = 'boss3@fleet.com';
   ```

## 相关文档

- [多租户功能实现完成](./MULTI_TENANT_IMPLEMENTATION_COMPLETE.md)
- [修复 406 错误详细说明](./MULTI_TENANT_FIX_406_ERROR.md)
- [多租户功能测试指南](./MULTI_TENANT_TEST_GUIDE.md)
- [多租户功能使用说明](./MULTI_TENANT_USAGE.md)

## 更新时间

2025-11-25 20:30:00 (UTC+8)
