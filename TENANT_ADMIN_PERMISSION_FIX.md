# 租户管理员权限修复总结

## 问题描述

用户反馈：peer（平级账号）和 fleet_leader（车队长）在完整权限的情况下也应该可以创建用户。

但是，之前的修复（迁移 00446）只允许 `public.profiles` 中的 `super_admin` 和 `boss` 创建用户，导致租户系统中的管理员无法创建用户。

## 系统架构分析

### 角色分布

**中央管理系统（public.profiles）**：
- `super_admin`：超级管理员
- `boss`：老板

**租户系统（tenant_xxx.profiles）**：
- `boss`：老板
- `peer`：平级账号
- `fleet_leader`：车队长
- `driver`：司机

### 权限需求

应该允许以下角色创建用户：
1. **中央管理系统**：`super_admin`、`boss`
2. **租户系统**：`boss`、`peer`、`fleet_leader`

不允许 `driver`（司机）创建用户。

## 解决方案

### 迁移 00447：允许租户管理员创建用户

创建迁移文件 `supabase/migrations/00447_allow_tenant_admins_create_users.sql`，修改 `create_user_auth_account_first` 函数，实现两级权限检查。

### 实现逻辑

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

### 关键技术点

1. **动态 SQL**：使用 `EXECUTE format()` 查询租户 Schema
   ```sql
   EXECUTE format('SELECT role FROM %I.profiles WHERE id = $1', tenant_record.schema_name)
   INTO tenant_role USING current_user_id;
   ```

2. **多租户支持**：遍历所有租户 Schema，查找用户角色
   ```sql
   FOR tenant_record IN SELECT schema_name FROM tenants LOOP
     -- 查询租户 Schema
   END LOOP;
   ```

3. **异常处理**：处理租户 Schema 中可能不存在 profiles 表的情况
   ```sql
   EXCEPTION
     WHEN undefined_table THEN
       -- 租户 Schema 中没有 profiles 表，跳过
       NULL;
   ```

4. **详细日志**：添加 RAISE NOTICE 记录权限检查过程
   ```sql
   RAISE NOTICE '权限检查通过：租户 Schema % 中的角色 % 有权创建用户', 
     tenant_record.schema_name, tenant_role;
   ```

## 权限矩阵

| 角色 | Schema | 可以创建用户 |
|------|--------|-------------|
| super_admin | public.profiles | ✅ |
| boss | public.profiles | ✅ |
| boss | tenant_xxx.profiles | ✅ |
| peer | tenant_xxx.profiles | ✅ |
| fleet_leader | tenant_xxx.profiles | ✅ |
| driver | tenant_xxx.profiles | ❌ |

## 测试验证

### 测试场景 1：中央管理员创建用户
- 用户：super_admin（在 public.profiles 中）
- 预期：✅ 可以创建用户

### 测试场景 2：老板创建用户
- 用户：boss（在 public.profiles 中）
- 预期：✅ 可以创建用户

### 测试场景 3：租户老板创建用户
- 用户：boss（在 tenant_xxx.profiles 中）
- 预期：✅ 可以创建用户

### 测试场景 4：平级账号创建用户
- 用户：peer（在 tenant_xxx.profiles 中）
- 预期：✅ 可以创建用户

### 测试场景 5：车队长创建用户
- 用户：fleet_leader（在 tenant_xxx.profiles 中）
- 预期：✅ 可以创建用户

### 测试场景 6：司机尝试创建用户
- 用户：driver（在 tenant_xxx.profiles 中）
- 预期：❌ 权限不足，无法创建用户

## 相关文件

### 迁移文件
- `supabase/migrations/00447_allow_tenant_admins_create_users.sql`

### 文档文件
- `LEASE_ADMIN_ERROR_RESOLUTION_SUMMARY.md`：完整修复总结
- `FINAL_FIX_VERIFICATION.md`：详细验证指南
- `QUICK_FIX_SUMMARY.md`：快速修复总结

## 注意事项

1. **清除浏览器缓存**：修复后必须清除浏览器缓存，确保加载最新代码
2. **重新登录**：建议重新登录以刷新用户权限
3. **日志查看**：可以在数据库日志中查看详细的权限检查过程
4. **性能考虑**：函数会遍历所有租户 Schema，如果租户数量很多，可能会影响性能

## 未来优化建议

1. **缓存用户角色**：可以在用户登录时缓存角色信息，避免每次都查询数据库
2. **索引优化**：为租户 Schema 的 profiles 表添加索引，提高查询性能
3. **权限配置化**：将权限配置存储在数据库中，便于动态调整
4. **审计日志**：记录所有用户创建操作，便于审计和追踪
