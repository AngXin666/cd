# lease_admin 错误快速修复总结

## 问题
老板在老板端添加用户时出现错误：`invalid input value for enum user_role: "lease_admin"`

## 根本原因
`create_user_auth_account_first` 函数在权限检查时引用了已删除的 `lease_admin` 角色，导致 PostgreSQL 尝试将字符串转换为枚举类型时失败。

## 最终修复
创建迁移 `00446_fix_create_user_auth_correct_roles.sql`，修正权限检查逻辑：

```sql
-- 修复前（错误）
IF current_user_role NOT IN ('lease_admin', 'super_admin', 'manager') THEN
  RAISE EXCEPTION '权限不足：只有管理员可以创建用户';
END IF;

-- 修复后（正确）
IF current_user_role NOT IN ('super_admin', 'boss') THEN
  RAISE EXCEPTION '权限不足：只有超级管理员和老板可以创建用户';
END IF;
```

## 系统角色定义

### 中央管理系统（public.profiles）
- `super_admin`：超级管理员
- `boss`：老板

### 租户系统（tenant_xxx.profiles）
- `boss`：老板
- `peer`：平级账号
- `fleet_leader`：车队长
- `driver`：司机

## 验证步骤

1. **清除浏览器缓存**（必须！）
   - 按 F12 打开开发者工具
   - 右键点击刷新按钮
   - 选择"清空缓存并硬性重新加载"

2. **重新登录**
   - 退出当前登录
   - 重新登录老板账号

3. **测试添加用户**
   - 进入"用户管理"页面
   - 点击"添加用户"
   - 填写信息并提交
   - 应该显示"添加成功"

## 相关文档

- `LEASE_ADMIN_ERROR_RESOLUTION_SUMMARY.md`：完整修复总结
- `FINAL_FIX_VERIFICATION.md`：详细验证指南
- `TEST_USER_CREATION.md`：测试用例
- `CLEAR_CACHE_INSTRUCTIONS.md`：清除缓存指南

## 技术要点

1. **枚举类型限制**：PostgreSQL 枚举类型只接受预定义的值
2. **隐式类型转换**：比较时会尝试将字符串转换为枚举类型
3. **权限检查位置**：`create_user_auth_account_first` 函数检查 `public.profiles` 中的角色
4. **角色映射**：前端 `manager` 映射为租户 Schema 的 `fleet_leader`

## 成功标准

- ✅ 可以成功添加司机
- ✅ 可以成功添加管理员
- ✅ 没有出现 lease_admin 相关错误
- ✅ 数据库中的角色正确
