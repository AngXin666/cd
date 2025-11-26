# 自动创建租户 Schema 测试指南

## 功能说明

当租赁系统管理员创建新的租户（老板）时，系统会**自动为该租户创建独立的数据库 Schema**。

## 自动化流程

```
创建租户 → 插入 profiles 记录 → 触发器检测到 role = super_admin 
→ 自动调用 create_tenant_schema() → 创建独立 Schema 和所有表
```

## 测试步骤

### 1. 登录租赁管理员账号

使用租赁管理员账号登录系统。

### 2. 进入租户管理页面

导航到：租赁管理 → 租户列表 → 创建租户

### 3. 填写租户信息

- **姓名**：测试老板
- **手机号**：13900000099（使用未注册的手机号）
- **密码**：123456
- **确认密码**：123456
- **公司名称**：测试公司
- **租赁开始日期**：选择当前日期
- **租赁结束日期**：选择未来日期
- **月租金**：1000
- **备注**：自动创建 Schema 测试

### 4. 提交创建

点击"提交"按钮，系统会：
1. 创建认证用户（auth.users）
2. 创建 profiles 记录（role = super_admin）
3. **触发器自动创建租户 Schema**
4. 在 Schema 中创建所有业务表
5. 创建默认仓库

### 5. 验证 Schema 创建

#### 方法一：查看数据库日志

在 Supabase Dashboard 的 SQL Editor 中执行：

```sql
-- 查看所有租户 Schema
SELECT schema_name
FROM information_schema.schemata
WHERE schema_name LIKE 'tenant_%'
ORDER BY schema_name DESC
LIMIT 5;
```

应该能看到新创建的 Schema，格式为：`tenant_<uuid>`

#### 方法二：验证 Schema 中的表

```sql
-- 替换为实际的 Schema 名称
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'tenant_xxx'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

应该能看到以下表：
- warehouses
- profiles
- attendance
- piece_work_records
- 等等...

#### 方法三：验证数据迁移

```sql
-- 查看新租户 Schema 中的数据
SET search_path TO tenant_xxx, public;

SELECT * FROM warehouses;  -- 应该有一个默认仓库
SELECT * FROM profiles;    -- 应该有老板的记录
```

## 预期结果

✅ **成功标志：**
1. 租户创建成功，显示"创建成功"提示
2. 数据库中创建了新的 tenant_xxx Schema
3. Schema 中包含所有业务表
4. 默认仓库已创建并分配给老板

❌ **失败情况：**
1. 如果手机号已存在，显示"该手机号已被注册"
2. 如果 Schema 创建失败，会在数据库日志中看到警告（但不影响用户创建）

## 触发器详情

### 触发器名称
`trigger_auto_create_tenant_schema`

### 触发条件
- 表：`profiles`
- 时机：`AFTER INSERT`
- 条件：`NEW.role = 'super_admin'`

### 执行逻辑
```sql
-- 1. 检测到新老板注册
IF NEW.role = 'super_admin' THEN
  -- 2. 构造 Schema 名称
  schema_name := 'tenant_' || replace(NEW.id::text, '-', '_');
  
  -- 3. 调用创建函数
  PERFORM create_tenant_schema(NEW.id::text);
  
  -- 4. 记录日志
  RAISE NOTICE '✅ 租户 Schema 创建成功: %', schema_name;
END IF;
```

## 故障排查

### 问题1：Schema 没有创建

**可能原因：**
- 触发器未启用
- 创建函数出错

**解决方法：**
```sql
-- 检查触发器是否存在
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'trigger_auto_create_tenant_schema';

-- 手动创建 Schema
SELECT create_tenant_schema('租户UUID');
```

### 问题2：Schema 创建了但没有表

**可能原因：**
- create_tenant_schema() 函数执行失败

**解决方法：**
```sql
-- 查看函数定义
\df+ create_tenant_schema

-- 手动执行函数并查看错误
SELECT create_tenant_schema('租户UUID');
```

### 问题3：租户创建成功但无法登录

**可能原因：**
- 邮箱未确认
- 密码设置失败

**解决方法：**
```sql
-- 检查用户状态
SELECT id, email, phone, confirmed_at
FROM auth.users
WHERE phone = '13900000099';

-- 手动确认邮箱
SELECT confirm_user_email('用户UUID');
```

## 相关文档

- [独立数据库隔离架构](../SCHEMA_ISOLATION_SUMMARY.md)
- [快速入门指南](../QUICK_START_SCHEMA_ISOLATION.md)
- [使用指南](TENANT_ISOLATION_GUIDE.md)

## 技术支持

如遇问题，请查看：
1. Supabase Dashboard 的 Logs 页面
2. 数据库触发器日志
3. 应用控制台日志
