# 中央管理系统管理员账号设置

## 账号信息
- **手机号**：13800000001
- **密码**：hye19911206
- **角色**：中央管理系统管理员

## 创建方式

由于 Supabase 的安全限制，无法直接通过 SQL 创建 auth.users 记录。请使用以下两种方式之一创建账号：

### 方式一：通过小程序注册（推荐）

1. 打开小程序，进入登录页面
2. 点击"注册"或"手机号登录"
3. 输入手机号：**13800000001**
4. 输入密码：**hye19911206**
5. 完成注册

系统会自动检测到这个手机号，并将其添加到 `system_admins` 表中。

### 方式二：通过 Supabase Dashboard 创建

1. 登录 Supabase Dashboard
2. 进入项目的 Authentication 页面
3. 点击 "Add user" 按钮
4. 选择 "Create new user"
5. 填写信息：
   - Phone: **13800000001**
   - Password: **hye19911206**
   - Auto Confirm User: **勾选**
6. 点击 "Create user"

创建成功后，系统会自动通过触发器将该用户添加到 `system_admins` 表中。

## 验证

创建账号后，使用手机号 **13800000001** 和密码 **hye19911206** 登录小程序。

登录成功后，系统会自动识别为中央管理系统管理员，并跳转到**租户管理页面**。

## 功能权限

中央管理系统管理员拥有以下权限：

- ✅ 查看所有租户列表
- ✅ 创建新租户（自动化部署）
- ✅ 编辑租户信息
- ✅ 更新租户租期
- ✅ 停用/启用租户
- ✅ 删除租户（包括所有数据）

## 技术说明

系统已经创建了以下机制：

1. **触发器**：`on_auth_user_created_sync_system_admin`
   - 当手机号为 13800000001 的用户注册时，自动添加到 `system_admins` 表

2. **登录检测**：`src/pages/index/index.tsx`
   - 登录后自动检测用户是否在 `system_admins` 表中
   - 如果是系统管理员，跳转到 `/pages/central-admin/tenants/index`

3. **路由配置**：`src/app.config.ts`
   - 已添加中央管理系统路由：
     - `/pages/central-admin/tenants/index` - 租户列表
     - `/pages/central-admin/tenant-create/index` - 创建租户

## 故障排除

### 问题：登录后没有跳转到租户管理页面

**解决方案**：
1. 检查 `system_admins` 表中是否有该用户记录：
   ```sql
   SELECT * FROM system_admins WHERE phone = '13800000001';
   ```

2. 如果没有记录，手动添加：
   ```sql
   INSERT INTO system_admins (id, name, email, phone, status)
   SELECT id, '中央管理员', 'central-admin@system.local', '13800000001', 'active'
   FROM auth.users
   WHERE phone = '13800000001';
   ```

### 问题：无法创建租户

**解决方案**：
1. 检查数据库函数是否存在：
   ```sql
   SELECT * FROM pg_proc WHERE proname = 'create_tenant_schema';
   ```

2. 如果不存在，重新运行迁移脚本：
   ```bash
   # 查看迁移文件
   ls supabase/migrations/
   ```

## 安全建议

⚠️ **重要**：创建账号后，建议立即修改密码！

1. 登录小程序
2. 进入"我的"页面
3. 点击"设置" → "修改密码"
4. 输入新密码并保存
