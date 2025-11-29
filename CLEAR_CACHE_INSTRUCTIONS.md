# 清除浏览器缓存以解决 lease_admin 错误

## 问题描述

在添加新用户时出现错误：
```
❌ 创建 auth.users 记录失败
错误: invalid input value for enum user_role: "lease_admin"
```

## 可能的原因

虽然数据库中已经移除了 `lease_admin` 角色，但浏览器可能缓存了旧的应用状态或表单数据，导致前端仍在尝试使用这个已删除的角色。

## 解决步骤

### 1. 完全清除浏览器缓存

#### Chrome/Edge 浏览器：
1. 按 `F12` 打开开发者工具
2. 右键点击浏览器刷新按钮
3. 选择"清空缓存并硬性重新加载"

或者：
1. 按 `Ctrl + Shift + Delete`（Windows）或 `Cmd + Shift + Delete`（Mac）
2. 选择"缓存的图片和文件"
3. 时间范围选择"全部时间"
4. 点击"清除数据"

#### Firefox 浏览器：
1. 按 `Ctrl + Shift + Delete`（Windows）或 `Cmd + Shift + Delete`（Mac）
2. 选择"缓存"
3. 时间范围选择"全部"
4. 点击"立即清除"

### 2. 清除应用程序存储

1. 按 `F12` 打开开发者工具
2. 进入"Application"（应用程序）标签（Chrome/Edge）或"Storage"（存储）标签（Firefox）
3. 展开"Local Storage"
4. 右键点击您的网站域名
5. 选择"Clear"（清除）
6. 同样清除"Session Storage"
7. 清除"IndexedDB"（如果有）

### 3. 清除 Service Worker

1. 在开发者工具的"Application"标签中
2. 点击左侧的"Service Workers"
3. 如果有注册的 Service Worker，点击"Unregister"（注销）

### 4. 硬刷新页面

- Windows/Linux：`Ctrl + Shift + R` 或 `Ctrl + F5`
- Mac：`Cmd + Shift + R`

### 5. 重新登录

1. 完全退出登录
2. 关闭浏览器
3. 重新打开浏览器
4. 重新登录系统
5. 尝试添加新用户

## 验证修复

添加新用户时，应该能够成功创建，不再出现 `lease_admin` 错误。

## 如果问题仍然存在

如果清除缓存后问题仍然存在，请检查：

### 1. 检查前端代码中是否硬编码了 'lease_admin'

```bash
cd /workspace/app-7cdqf07mbu9t
grep -rn "lease_admin" src/ --include="*.tsx" --include="*.ts"
```

### 2. 检查数据库中是否有遗留的 'lease_admin' 数据

```sql
-- 检查 auth.users 的 metadata
SELECT id, phone, raw_user_meta_data->>'role' as role 
FROM auth.users 
WHERE raw_user_meta_data->>'role' = 'lease_admin';

-- 检查 public.profiles
SELECT id, name, phone, role::text 
FROM public.profiles 
WHERE role::text = 'lease_admin';
```

### 3. 检查是否有其他浏览器或设备登录

如果您在多个浏览器或设备上登录了系统，请在所有设备上都执行清除缓存的操作。

### 4. 检查是否有浏览器扩展干扰

某些浏览器扩展可能会缓存或修改请求数据。尝试：
1. 使用浏览器的隐身/无痕模式
2. 或者暂时禁用所有浏览器扩展

## 技术说明

`lease_admin` 角色已在数据库迁移 `00416_remove_lease_admin_role.sql` 中被移除。当前有效的角色包括：

- **Public Schema（public.profiles）**：
  - `driver`：司机
  - `manager`：管理员
  - `super_admin`：超级管理员
  - `peer_admin`：平级管理员
  - `boss`：老板

- **租户 Schema（tenant_xxx.profiles）**：
  - `driver`：司机
  - `fleet_leader`：车队长
  - `peer`：平级账号
  - `boss`：老板

## 联系支持

如果按照以上步骤操作后问题仍未解决，请提供：
1. 完整的浏览器控制台日志
2. 网络请求的详细信息（在开发者工具的 Network 标签中）
3. 当前登录用户的手机号
4. 尝试创建的新用户的信息（手机号、角色等）
