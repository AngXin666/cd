# 用户创建功能测试指南

## 测试目的

验证老板端添加用户功能是否正常工作，确保角色映射正确。

## 测试前准备

1. **清除浏览器缓存**（重要！）
   - 参考 `CLEAR_CACHE_INSTRUCTIONS.md` 文档
   - 清除缓存后重新登录系统

2. **确认登录身份**
   - 使用老板账号登录
   - 确认在老板端界面

## 测试步骤

### 测试1：添加司机

1. 进入"用户管理"页面
2. 点击"添加用户"按钮
3. 填写以下信息：
   - 手机号：输入有效的手机号（例如：13800138001）
   - 姓名：输入司机姓名（例如：张三）
   - 角色：选择"司机"
   - 司机类型：选择"纯司机"或"带车司机"
   - 仓库：至少选择一个仓库
4. 点击"确认添加"
5. **预期结果**：
   - ✅ 显示"添加成功"提示
   - ✅ 用户列表中出现新添加的司机
   - ✅ 控制台日志显示角色映射：`manager -> driver`

### 测试2：添加管理员（车队长）

1. 进入"用户管理"页面
2. 点击"添加用户"按钮
3. 填写以下信息：
   - 手机号：输入有效的手机号（例如：13800138002）
   - 姓名：输入管理员姓名（例如：李四）
   - 角色：选择"管理员"
   - 仓库：至少选择一个仓库
4. 点击"确认添加"
5. **预期结果**：
   - ✅ 显示"添加成功"提示
   - ✅ 用户列表中出现新添加的管理员
   - ✅ 控制台日志显示角色映射：`manager -> fleet_leader`

### 测试3：添加平级账号

1. 进入"用户管理"页面
2. 点击"添加用户"按钮
3. 填写以下信息：
   - 手机号：输入有效的手机号（例如：13800138003）
   - 姓名：输入老板姓名（例如：王五）
   - 角色：选择"老板"
4. 点击"确认添加"
5. **预期结果**：
   - ✅ 显示"添加成功"提示
   - ✅ 用户列表中出现新添加的老板账号

## 验证数据库记录

### 验证租户 Schema 中的记录

在 Supabase 控制台中执行以下 SQL：

```sql
-- 查看租户 Schema 中的用户记录
SELECT id, name, phone, role, status, created_at
FROM tenant_<your_tenant_id>.profiles
ORDER BY created_at DESC
LIMIT 10;
```

**预期结果**：
- 司机的 `role` 字段应该是 `driver`
- 管理员的 `role` 字段应该是 `fleet_leader`
- 老板的 `role` 字段应该是 `boss`

### 验证 user_metadata

```sql
-- 查看用户的 metadata
SELECT id, phone, raw_user_meta_data->>'role' as role, raw_user_meta_data->>'tenant_id' as tenant_id
FROM auth.users
WHERE phone IN ('13800138001', '13800138002', '13800138003')
ORDER BY created_at DESC;
```

**预期结果**：
- 司机和管理员的 `role` 应该是 `driver` 或 `fleet_leader`
- 所有用户的 `tenant_id` 应该与当前租户 ID 一致

## 常见问题排查

### 问题1：仍然出现 "invalid input value for enum user_role: 'lease_admin'" 错误

**解决方案**：
1. 清除浏览器缓存（参考 `CLEAR_CACHE_INSTRUCTIONS.md`）
2. 退出登录
3. 重新登录
4. 再次尝试添加用户

### 问题2：添加用户成功，但角色显示不正确

**检查步骤**：
1. 打开浏览器控制台
2. 查看日志中的角色映射信息
3. 确认 `createUser` 函数中的角色映射逻辑是否正确执行

### 问题3：无法选择仓库

**解决方案**：
1. 确认当前租户至少有一个仓库
2. 检查仓库管理页面，确认仓库数据正常

## 测试完成标准

所有以下条件都满足时，测试通过：

- ✅ 可以成功添加司机，角色为 `driver`
- ✅ 可以成功添加管理员，角色为 `fleet_leader`
- ✅ 可以成功添加平级老板账号
- ✅ 数据库中的记录正确
- ✅ 用户可以正常登录
- ✅ 没有出现 `lease_admin` 相关错误

## 相关文档

- `LEASE_ADMIN_ERROR_RESOLUTION_SUMMARY.md`：修复总结
- `CLEAR_CACHE_INSTRUCTIONS.md`：清除缓存指南
- `FIX_LEASE_ADMIN_ERROR.md`：详细修复过程
