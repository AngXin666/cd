# lease_admin 错误最终修复验证指南

## 修复完成情况

✅ **已完成的四个关键修复**：

1. ✅ 修复 `insert_tenant_profile` 函数（迁移 00443）
2. ✅ 删除废弃的 lease_admin 函数和策略（迁移 00444）
3. ✅ 修复 `createUser` 函数的角色映射（src/db/api.ts）
4. ✅ 修复 `create_user_auth_account_first` 函数的权限检查（迁移 00445）

## 验证步骤

### 步骤 1：清除浏览器缓存（必须！）

**为什么必须清除缓存？**
- 浏览器可能缓存了旧的 JavaScript 代码
- 旧代码可能仍然使用已删除的 lease_admin 角色

**如何清除缓存？**
参考 `CLEAR_CACHE_INSTRUCTIONS.md` 文档，或按以下步骤操作：

1. 打开浏览器开发者工具（F12）
2. 右键点击刷新按钮
3. 选择"清空缓存并硬性重新加载"
4. 或者：设置 → 隐私和安全 → 清除浏览数据 → 选择"缓存的图片和文件"

### 步骤 2：重新登录系统

1. 退出当前登录
2. 清除浏览器缓存后
3. 重新登录老板账号

### 步骤 3：测试添加用户功能

参考 `TEST_USER_CREATION.md` 文档进行完整测试，或按以下简化步骤：

#### 测试 1：添加司机

1. 进入"用户管理"页面
2. 点击"添加用户"
3. 填写信息：
   - 手机号：13800138001
   - 姓名：测试司机
   - 角色：司机
   - 司机类型：纯司机
   - 仓库：选择至少一个
4. 点击"确认添加"

**预期结果**：
- ✅ 显示"添加成功"
- ✅ 用户列表中出现新用户
- ✅ 控制台日志显示角色映射：`driver -> driver`

#### 测试 2：添加管理员

1. 点击"添加用户"
2. 填写信息：
   - 手机号：13800138002
   - 姓名：测试管理员
   - 角色：管理员
   - 仓库：选择至少一个
3. 点击"确认添加"

**预期结果**：
- ✅ 显示"添加成功"
- ✅ 用户列表中出现新用户
- ✅ 控制台日志显示角色映射：`manager -> fleet_leader`

### 步骤 4：验证数据库记录

在 Supabase 控制台中执行以下 SQL：

```sql
-- 查看最近创建的用户
SELECT id, name, phone, role, status, created_at
FROM tenant_<your_tenant_id>.profiles
ORDER BY created_at DESC
LIMIT 5;
```

**预期结果**：
- 司机的 `role` 应该是 `driver`
- 管理员的 `role` 应该是 `fleet_leader`

## 常见问题

### Q1：仍然出现 "invalid input value for enum user_role: 'lease_admin'" 错误

**解决方案**：
1. 确认已清除浏览器缓存
2. 确认已退出并重新登录
3. 检查是否在使用无痕模式或其他浏览器
4. 尝试完全关闭浏览器后重新打开

### Q2：添加用户成功，但角色显示不正确

**检查步骤**：
1. 打开浏览器控制台
2. 查看 `createUser` 函数的日志
3. 确认角色映射是否正确执行
4. 检查数据库中的实际角色值

### Q3：权限不足错误

**可能原因**：
- 当前登录用户不是老板或管理员角色
- 用户的 metadata 中的角色信息不正确

**解决方案**：
1. 确认当前登录用户的角色
2. 检查 `auth.users` 表中的 `raw_user_meta_data`
3. 如有必要，手动更新用户的 metadata

## 技术说明

### 修复的核心问题

**问题**：PostgreSQL 枚举类型比较时的隐式类型转换

当代码中有类似这样的比较时：
```sql
IF current_user_role NOT IN ('lease_admin', 'super_admin', 'manager') THEN
```

PostgreSQL 会尝试将字符串 `'lease_admin'` 转换为 `user_role` 枚举类型，但由于 `lease_admin` 已从枚举中删除，导致错误。

**解决方案**：移除所有对已删除枚举值的引用

### 角色系统架构

**中央管理系统（public.profiles）**：
```
super_admin → 超级管理员（中央管理员）
boss → 老板（租户信息）
peer_admin → 平级账号
manager → 车队长
driver → 司机
```

**租户系统（tenant_xxx.profiles）**：
```
boss → 老板
peer → 平级账号
fleet_leader → 车队长
driver → 司机
```

**角色映射**：
```
前端 manager → 租户 Schema fleet_leader
前端 driver → 租户 Schema driver
```

## 成功标准

当以下所有条件都满足时，修复验证通过：

- ✅ 可以成功添加司机
- ✅ 可以成功添加管理员
- ✅ 数据库中的角色正确（driver 和 fleet_leader）
- ✅ 没有出现 lease_admin 相关错误
- ✅ 用户可以正常登录
- ✅ 控制台没有错误日志

## 相关文档

- `LEASE_ADMIN_ERROR_RESOLUTION_SUMMARY.md`：完整修复总结
- `TEST_USER_CREATION.md`：详细测试指南
- `CLEAR_CACHE_INSTRUCTIONS.md`：清除缓存指南
- `FIX_LEASE_ADMIN_ERROR.md`：问题诊断过程

## 需要帮助？

如果按照以上步骤操作后问题仍然存在，请提供以下信息：

1. 浏览器控制台的完整错误日志
2. 当前登录用户的角色信息
3. 是否已清除浏览器缓存
4. 是否已重新登录
5. 数据库中的用户记录截图
