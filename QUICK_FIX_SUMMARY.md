# lease_admin 错误快速修复总结

## 问题
老板在老板端添加用户时出现错误：`invalid input value for enum user_role: "lease_admin"`

## 根本原因
`create_user_auth_account_first` 函数在权限检查时引用了已删除的 `lease_admin` 角色，导致 PostgreSQL 尝试将字符串转换为枚举类型时失败。

## 最终修复

经过三次迁移，最终实现了完整的权限检查：

### 迁移 00445
移除 `lease_admin` 角色引用

### 迁移 00446
使用正确的 public 角色（super_admin 和 boss）

### 迁移 00447（最终版本）
实现两级权限检查，允许租户管理员创建用户：

```sql
-- 第一级：检查 public.profiles
SELECT role INTO current_user_role FROM profiles WHERE id = current_user_id;

IF current_user_role IS NOT NULL THEN
  -- 用户在 public.profiles 中
  IF current_user_role IN ('super_admin', 'boss') THEN
    has_permission := true;
  END IF;
ELSE
  -- 第二级：检查租户 Schema
  FOR tenant_record IN SELECT schema_name FROM tenants LOOP
    EXECUTE format('SELECT role FROM %I.profiles WHERE id = $1', tenant_record.schema_name)
    INTO tenant_role USING current_user_id;
    
    IF tenant_role IN ('boss', 'peer', 'fleet_leader') THEN
      has_permission := true;
      EXIT;
    END IF;
  END LOOP;
END IF;
```

**关键改进**：
- 支持 public.profiles 中的 super_admin 和 boss
- 支持租户 Schema 中的 boss、peer 和 fleet_leader
- 使用动态 SQL 查询租户 Schema
- 添加详细的日志记录

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
3. **两级权限检查**：
   - 第一级：检查 `public.profiles` 中的角色（super_admin、boss）
   - 第二级：检查租户 Schema 中的角色（boss、peer、fleet_leader）
4. **动态 SQL**：使用 `EXECUTE format()` 查询租户 Schema
5. **角色映射**：前端 `manager` 映射为租户 Schema 的 `fleet_leader`
6. **多租户架构**：每个租户有独立的 Schema，支持独立的角色管理

## 成功标准

- ✅ 可以成功添加司机
- ✅ 可以成功添加管理员
- ✅ 没有出现 lease_admin 相关错误
- ✅ 数据库中的角色正确
