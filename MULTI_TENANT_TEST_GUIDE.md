# 多租户功能测试指南

## 测试准备

### 测试账号

1. **租赁管理员**
   - 账号：admin888
   - 密码：hye19911206
   - 用途：管理所有租户

2. **现有老板账号**
   - 账号：admin
   - 密码：123456
   - 用途：测试现有租户功能

## 测试步骤

### 第一步：验证现有数据隔离

1. 使用 admin 账号登录
2. 查看车辆列表、仓库列表、司机列表
3. 记录数据数量

### 第二步：创建新租户

1. 使用 admin888 账号登录
2. 进入"老板账号列表"
3. 点击"新增老板账号"
4. 填写信息：
   - 姓名：测试老板2
   - 手机号：13900000001
   - 公司名称：测试公司2
   - 月租费用：1000
5. 提交创建

### 第三步：为新租户创建认证账号

由于新租户还没有认证账号，需要手动创建：

```sql
-- 在数据库中执行（或通过 Supabase Dashboard）
-- 1. 查找新创建的租户ID
SELECT id, name, phone, tenant_id FROM profiles WHERE phone = '13900000001';

-- 2. 为新租户创建认证账号（使用 Supabase Auth API 或 Dashboard）
-- 邮箱：13900000001@fleet.com
-- 密码：123456
```

### 第四步：测试新租户登录

1. 退出当前账号
2. 使用新租户账号登录：
   - 账号：13900000001
   - 密码：123456
3. 验证登录成功后进入老板工作台

### 第五步：新租户创建数据

1. 在新租户账号下创建：
   - 添加1个仓库
   - 添加1个司机
   - 添加1辆车辆
2. 记录创建的数据

### 第六步：验证数据隔离

1. 退出新租户账号
2. 使用 admin 账号重新登录
3. 验证：
   - ✅ 看不到新租户创建的仓库
   - ✅ 看不到新租户创建的司机
   - ✅ 看不到新租户创建的车辆
4. 使用新租户账号重新登录
5. 验证：
   - ✅ 看不到 admin 租户的数据
   - ✅ 只能看到自己创建的数据

### 第七步：验证租赁管理员权限

1. 使用 admin888 账号登录
2. 进入"老板账号列表"
3. 验证：
   - ✅ 可以看到所有老板账号（admin 和 测试老板2）
   - ✅ 可以编辑任何老板账号
   - ✅ 可以停用/启用任何老板账号

## 数据库验证

### 验证 tenant_id 设置

```sql
-- 查看所有用户的 tenant_id
SELECT 
  id,
  name,
  phone,
  role,
  tenant_id,
  CASE 
    WHEN role = 'super_admin' AND tenant_id = id THEN '✅ 正确'
    WHEN role IN ('manager', 'driver') AND tenant_id IS NOT NULL THEN '✅ 正确'
    WHEN role = 'lease_admin' AND tenant_id IS NULL THEN '✅ 正确'
    ELSE '❌ 错误'
  END as status
FROM profiles
ORDER BY role, created_at;
```

### 验证数据隔离

```sql
-- 查看每个租户的数据统计
SELECT 
  p.name as tenant_name,
  p.id as tenant_id,
  (SELECT COUNT(*) FROM profiles WHERE tenant_id = p.id) as users_count,
  (SELECT COUNT(*) FROM vehicles WHERE tenant_id = p.id) as vehicles_count,
  (SELECT COUNT(*) FROM warehouses WHERE tenant_id = p.id) as warehouses_count
FROM profiles p
WHERE p.role = 'super_admin'
ORDER BY p.created_at;
```

### 验证 RLS 策略

```sql
-- 测试 RLS 策略（需要以不同用户身份执行）
-- 1. 以租户A的身份查询
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claim.sub TO '<租户A的UUID>';

SELECT COUNT(*) FROM vehicles; -- 应该只返回租户A的车辆数量

-- 2. 以租户B的身份查询
SET LOCAL request.jwt.claim.sub TO '<租户B的UUID>';

SELECT COUNT(*) FROM vehicles; -- 应该只返回租户B的车辆数量

-- 3. 以租赁管理员身份查询
SET LOCAL request.jwt.claim.sub TO '<lease_admin的UUID>';

SELECT COUNT(*) FROM vehicles; -- 应该返回所有车辆数量
```

## 预期结果

### 数据隔离

- ✅ 租户A无法看到租户B的任何数据
- ✅ 租户B无法看到租户A的任何数据
- ✅ 每个租户只能看到自己的数据

### 自动设置 tenant_id

- ✅ 新创建的用户自动设置正确的 tenant_id
- ✅ 新创建的业务数据自动设置正确的 tenant_id
- ✅ super_admin 的 tenant_id 等于自己的 id

### 租赁管理员权限

- ✅ 可以看到所有租户的数据
- ✅ 可以管理所有老板账号
- ✅ 可以创建新的老板账号

## 常见问题

### Q1: 新创建的租户无法登录？

**A:** 需要先为新租户创建认证账号。可以通过以下方式：
1. 使用 Supabase Dashboard 创建用户
2. 使用 Supabase Auth API 创建用户
3. 实现注册功能（推荐）

### Q2: 租户看到了其他租户的数据？

**A:** 检查以下几点：
1. 确认 RLS 策略已启用
2. 确认 tenant_id 字段已正确设置
3. 确认触发器已创建
4. 检查数据库日志

### Q3: 租赁管理员看不到某些租户的数据？

**A:** 检查：
1. 确认 is_lease_admin() 函数返回 true
2. 确认 RLS 策略包含 is_lease_admin() 条件
3. 检查租赁管理员的 role 是否为 'lease_admin'

### Q4: 创建数据时 tenant_id 为 NULL？

**A:** 检查：
1. 确认触发器已创建
2. 确认当前用户的 tenant_id 已设置
3. 检查触发器函数逻辑

## 性能测试

### 查询性能

```sql
-- 测试索引是否生效
EXPLAIN ANALYZE
SELECT * FROM vehicles WHERE tenant_id = '<某个UUID>';

-- 应该看到 "Index Scan using idx_vehicles_tenant_id"
```

### 大数据量测试

```sql
-- 创建测试数据
DO $$
DECLARE
  tenant_id uuid := '<某个租户的UUID>';
  i integer;
BEGIN
  FOR i IN 1..1000 LOOP
    INSERT INTO vehicles (
      tenant_id,
      plate_number,
      brand,
      model,
      status
    ) VALUES (
      tenant_id,
      'TEST' || i,
      '测试品牌',
      '测试型号',
      'active'
    );
  END LOOP;
END $$;

-- 测试查询性能
EXPLAIN ANALYZE
SELECT * FROM vehicles WHERE tenant_id = '<某个UUID>';
```

## 回滚方案

如果需要回滚多租户功能：

```sql
-- 1. 删除 RLS 策略
DROP POLICY IF EXISTS "租户数据隔离 - profiles" ON profiles;
-- ... 删除其他表的策略

-- 2. 删除触发器
DROP TRIGGER IF EXISTS auto_set_tenant_id_trigger ON profiles;
-- ... 删除其他表的触发器

-- 3. 删除函数
DROP FUNCTION IF EXISTS get_user_tenant_id();
DROP FUNCTION IF EXISTS is_lease_admin();
DROP FUNCTION IF EXISTS auto_set_tenant_id();
DROP FUNCTION IF EXISTS auto_set_tenant_id_for_profile();

-- 4. 删除 tenant_id 字段（可选，会丢失数据）
ALTER TABLE profiles DROP COLUMN IF EXISTS tenant_id;
-- ... 删除其他表的 tenant_id 字段
```

## 总结

多租户功能已完整实现，包括：
- ✅ 数据库层面的数据隔离
- ✅ 自动设置 tenant_id
- ✅ 行级安全策略
- ✅ 租赁管理员特权
- ✅ 性能优化（索引）

建议在生产环境部署前进行充分测试。
