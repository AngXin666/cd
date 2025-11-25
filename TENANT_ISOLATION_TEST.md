# 租户数据隔离测试指南

## 测试目的

验证多租户数据隔离功能是否正常工作，确保：
1. 不同老板之间的数据完全隔离
2. 老板只能看到自己租户下的数据
3. 租赁管理员可以管理所有租户

## 测试前准备

### 1. 确认已应用的迁移

```sql
-- 查看迁移历史
SELECT * FROM supabase_migrations.schema_migrations
WHERE version IN ('045', '046')
ORDER BY version;
```

应该看到：
- ✅ 045_fix_super_admin_tenant_isolation
- ✅ 046_fix_remaining_cross_tenant_policies

### 2. 准备测试账号

需要以下账号：
- **租赁管理员**：admin888@fleet.com / 123456
- **老板 A**：13800000001@fleet.com / 123456
- **老板 B**：13700000001@163.com / 123456

## 测试步骤

### 阶段 1：老板 A 创建测试数据

#### 1.1 登录老板 A 账号
- 邮箱：13800000001@fleet.com
- 密码：123456

#### 1.2 创建仓库
1. 进入"仓库管理"
2. 点击"新增仓库"
3. 填写信息：
   - 仓库名称：测试仓库A
   - 地址：北京市朝阳区
4. 提交

#### 1.3 创建司机
1. 进入"司机管理"
2. 点击"新增司机"
3. 填写信息：
   - 姓名：张三
   - 手机号：13900000001
   - 邮箱：zhangsan@test.com
   - 密码：123456
   - 所属仓库：测试仓库A
4. 提交

#### 1.4 创建车辆
1. 进入"车辆管理"
2. 点击"新增车辆"
3. 填写信息：
   - 车牌号：京A12345
   - 所属司机：张三
   - 所属仓库：测试仓库A
4. 提交

#### 1.5 创建计件记录
1. 进入"计件管理"
2. 点击"新增计件"
3. 填写信息：
   - 司机：张三
   - 仓库：测试仓库A
   - 数量：100
   - 单价：10
4. 提交

#### 1.6 记录创建的数据

记下以下信息：
- 仓库名称：测试仓库A
- 司机姓名：张三
- 车牌号：京A12345
- 计件数量：100

### 阶段 2：老板 B 查看数据（验证隔离）

#### 2.1 退出老板 A 账号
点击右上角退出按钮

#### 2.2 登录老板 B 账号
- 邮箱：13700000001@163.com
- 密码：123456

#### 2.3 检查各个数据列表

**仓库管理**：
- ❌ 不应该看到"测试仓库A"
- ✅ 应该看到空列表或只有老板 B 自己的仓库

**司机管理**：
- ❌ 不应该看到"张三"
- ✅ 应该看到空列表或只有老板 B 自己的司机

**车辆管理**：
- ❌ 不应该看到"京A12345"
- ✅ 应该看到空列表或只有老板 B 自己的车辆

**计件管理**：
- ❌ 不应该看到张三的计件记录
- ✅ 应该看到空列表或只有老板 B 自己的计件记录

#### 2.4 验证结果

如果老板 B 能看到老板 A 的任何数据，说明数据隔离失败！

### 阶段 3：老板 B 创建自己的数据

#### 3.1 创建仓库
- 仓库名称：测试仓库B
- 地址：上海市浦东新区

#### 3.2 创建司机
- 姓名：李四
- 手机号：13900000002
- 邮箱：lisi@test.com
- 密码：123456
- 所属仓库：测试仓库B

#### 3.3 创建车辆
- 车牌号：沪B67890
- 所属司机：李四
- 所属仓库：测试仓库B

#### 3.4 创建计件记录
- 司机：李四
- 仓库：测试仓库B
- 数量：200
- 单价：15

### 阶段 4：老板 A 再次查看（验证双向隔离）

#### 4.1 退出老板 B 账号

#### 4.2 登录老板 A 账号
- 邮箱：13800000001@fleet.com
- 密码：123456

#### 4.3 检查数据列表

**仓库管理**：
- ✅ 应该看到"测试仓库A"
- ❌ 不应该看到"测试仓库B"

**司机管理**：
- ✅ 应该看到"张三"
- ❌ 不应该看到"李四"

**车辆管理**：
- ✅ 应该看到"京A12345"
- ❌ 不应该看到"沪B67890"

**计件管理**：
- ✅ 应该看到张三的计件记录（100件）
- ❌ 不应该看到李四的计件记录（200件）

### 阶段 5：租赁管理员查看（验证全局访问）

#### 5.1 退出老板 A 账号

#### 5.2 登录租赁管理员账号
- 手机号：admin888
- 密码：123456

#### 5.3 查看老板账号列表

进入"租赁管理" → "老板账号管理"

应该看到：
- ✅ 老板 A（13800000001@fleet.com）
- ✅ 老板 B（13700000001@163.com）
- ✅ 可以查看每个老板的详细信息

## 数据库验证

### 验证 tenant_id 设置

```sql
-- 查看所有老板的 tenant_id
SELECT 
  id,
  name,
  email,
  role,
  tenant_id,
  id = tenant_id as tenant_id_correct
FROM profiles
WHERE role = 'super_admin'::user_role
ORDER BY created_at;

-- 应该看到每个老板的 tenant_id = id
```

### 验证司机的 tenant_id

```sql
-- 查看所有司机的 tenant_id
SELECT 
  p.id,
  p.name,
  p.phone,
  p.role,
  p.tenant_id,
  boss.name as boss_name,
  boss.email as boss_email
FROM profiles p
LEFT JOIN profiles boss ON boss.id = p.tenant_id
WHERE p.role = 'driver'::user_role
ORDER BY p.tenant_id, p.created_at;

-- 验证：
-- - 张三的 tenant_id = 老板 A 的 id
-- - 李四的 tenant_id = 老板 B 的 id
```

### 验证车辆的 tenant_id

```sql
-- 查看所有车辆的 tenant_id
SELECT 
  v.id,
  v.license_number,
  v.tenant_id,
  p.name as driver_name,
  boss.name as boss_name
FROM vehicles v
LEFT JOIN profiles p ON p.id = v.user_id
LEFT JOIN profiles boss ON boss.id = v.tenant_id
ORDER BY v.tenant_id, v.created_at;

-- 验证：
-- - 京A12345 的 tenant_id = 老板 A 的 id
-- - 沪B67890 的 tenant_id = 老板 B 的 id
```

### 验证计件记录的 tenant_id

```sql
-- 查看所有计件记录的 tenant_id
SELECT 
  pw.id,
  pw.quantity,
  pw.unit_price,
  pw.tenant_id,
  p.name as driver_name,
  boss.name as boss_name
FROM piece_work_records pw
LEFT JOIN profiles p ON p.id = pw.user_id
LEFT JOIN profiles boss ON boss.id = pw.tenant_id
ORDER BY pw.tenant_id, pw.created_at;

-- 验证：
-- - 张三的计件记录 tenant_id = 老板 A 的 id
-- - 李四的计件记录 tenant_id = 老板 B 的 id
```

### 验证 RLS 策略

```sql
-- 查看 vehicles 表的策略
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'vehicles'
ORDER BY policyname;

-- 应该看到：
-- ✅ "租户数据隔离 - vehicles"
-- ❌ 不应该有 "Super admins can manage all vehicles"
-- ❌ 不应该有 "Authenticated users can view vehicles"
```

```sql
-- 查看 piece_work_records 表的策略
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'piece_work_records'
ORDER BY policyname;

-- 应该看到：
-- ✅ "租户数据隔离 - piece_work_records"
-- ❌ 不应该有 "Super admins can view all piece work records"
```

## 测试结果判定

### ✅ 测试通过

所有以下条件都满足：
1. 老板 A 只能看到自己的数据（张三、京A12345、测试仓库A）
2. 老板 B 只能看到自己的数据（李四、沪B67890、测试仓库B）
3. 老板 A 看不到老板 B 的数据
4. 老板 B 看不到老板 A 的数据
5. 租赁管理员可以看到所有老板账号
6. 数据库中所有数据的 tenant_id 正确设置
7. RLS 策略中没有跨租户访问的策略

### ❌ 测试失败

如果出现以下任何情况：
1. 老板 A 能看到老板 B 的数据
2. 老板 B 能看到老板 A 的数据
3. 数据的 tenant_id 设置错误
4. RLS 策略中仍有跨租户访问的策略

## 故障排除

### 问题 1：老板能看到其他老板的数据

**检查步骤**：

1. 验证 RLS 策略是否正确：
```sql
-- 查找所有可能导致跨租户访问的策略
SELECT 
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND (
    policyname LIKE '%Super admin%'
    OR policyname LIKE '%Authenticated%'
  )
ORDER BY tablename, policyname;

-- 如果有结果，说明还有跨租户访问的策略需要删除
```

2. 验证 get_user_tenant_id() 函数：
```sql
-- 测试函数返回值
SELECT 
  auth.uid() as current_user_id,
  get_user_tenant_id() as tenant_id,
  p.role,
  p.tenant_id as profile_tenant_id
FROM profiles p
WHERE p.id = auth.uid();

-- 对于 super_admin，tenant_id 应该等于 current_user_id
```

### 问题 2：数据的 tenant_id 为 NULL

**原因**：创建数据时没有设置 tenant_id

**解决方案**：
1. 检查触发器是否存在
2. 手动更新 tenant_id：
```sql
-- 更新车辆的 tenant_id
UPDATE vehicles
SET tenant_id = (
  SELECT tenant_id FROM profiles WHERE id = vehicles.user_id
)
WHERE tenant_id IS NULL;

-- 更新计件记录的 tenant_id
UPDATE piece_work_records
SET tenant_id = (
  SELECT tenant_id FROM profiles WHERE id = piece_work_records.user_id
)
WHERE tenant_id IS NULL;
```

### 问题 3：租赁管理员看不到所有租户

**检查步骤**：

1. 验证租赁管理员角色：
```sql
SELECT id, phone, role
FROM profiles
WHERE phone = 'admin888';

-- role 应该是 'lease_admin'
```

2. 验证 is_lease_admin() 函数：
```sql
-- 测试函数
SELECT is_lease_admin() as is_lease_admin;

-- 应该返回 true
```

## 相关文档

- [租户数据隔离问题修复总结](./TENANT_ISOLATION_FIX.md)
- [多租户功能实现完成](./MULTI_TENANT_IMPLEMENTATION_COMPLETE.md)
- [快速测试指南](./QUICK_TEST_CREATE_TENANT.md)

## 更新时间

2025-11-25 22:30:00 (UTC+8)
