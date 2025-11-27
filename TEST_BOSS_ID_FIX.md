# boss_id 自动设置功能测试指南

## 测试目标
验证以下功能是否正常工作：
1. ✅ 现有用户的 `boss_id` 已正确设置
2. ✅ 创建新用户时自动设置 `boss_id`
3. ✅ 司机请假申请通知正常发送

## 测试环境准备

### 1. 确认数据库迁移已应用
```sql
-- 检查迁移文件是否已应用
SELECT * FROM _migrations 
WHERE name LIKE '%boss_id%' 
ORDER BY created_at DESC;
```

应该看到以下迁移：
- `99997_allow_null_boss_id_for_super_admin`
- `99998_auto_set_boss_id_for_new_users`

### 2. 确认触发器已创建
```sql
-- 检查触发器
SELECT 
  trigger_name, 
  event_manipulation, 
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trigger_auto_set_boss_id';
```

应该看到：
- `trigger_name`: `trigger_auto_set_boss_id`
- `event_manipulation`: `INSERT`
- `event_object_table`: `profiles`

## 测试用例

### 测试1：验证现有数据
**目的**: 确认所有现有用户的 `boss_id` 已正确设置

**步骤**:
```sql
-- 查询所有用户的 boss_id 设置情况
SELECT 
  id, 
  name, 
  role, 
  boss_id,
  CASE 
    WHEN role = 'super_admin' AND boss_id IS NULL THEN '✅ 正确'
    WHEN role != 'super_admin' AND boss_id IS NOT NULL THEN '✅ 正确'
    ELSE '❌ 错误'
  END as status
FROM profiles
ORDER BY role, name;
```

**预期结果**:
- 所有用户的 `status` 列都显示 "✅ 正确"
- `super_admin` 的 `boss_id` 为 `NULL`
- 其他角色的 `boss_id` 不为 `NULL`

**实际结果**:
```
记录测试结果...
```

---

### 测试2：创建新司机（自动设置 boss_id）
**目的**: 验证创建新司机时自动设置 `boss_id`

**步骤1**: 通过应用界面创建新司机
1. 以老板或车队长身份登录
2. 进入"司机管理"页面
3. 点击"添加司机"
4. 填写信息：
   - 手机号：`13900000001`
   - 姓名：`测试司机001`
   - 司机类型：纯司机
5. 点击"创建"

**步骤2**: 查询数据库验证
```sql
-- 查询新创建的司机
SELECT id, name, role, boss_id
FROM profiles
WHERE phone = '13900000001';
```

**预期结果**:
- `boss_id` 不为 `NULL`
- `boss_id` 等于老板的 ID

**实际结果**:
```
记录测试结果...
```

---

### 测试3：直接插入数据库（触发器测试）
**目的**: 验证数据库触发器是否正常工作

**步骤**:
```sql
-- 直接插入新司机（不设置 boss_id）
INSERT INTO profiles (id, phone, name, role, email)
VALUES (
  gen_random_uuid(),
  '13900000002',
  '测试司机002',
  'driver',
  '13900000002@fleet.com'
)
RETURNING id, name, role, boss_id;
```

**预期结果**:
- 返回的记录中 `boss_id` 不为 `NULL`
- `boss_id` 等于老板的 ID
- 控制台输出：`✅ 自动设置 boss_id: xxx (用户: 测试司机002, 角色: driver)`

**实际结果**:
```
记录测试结果...
```

---

### 测试4：创建新车队长（自动设置 boss_id）
**目的**: 验证创建新车队长时自动设置 `boss_id`

**步骤1**: 通过应用界面创建新车队长
1. 以老板身份登录
2. 进入"车队长管理"页面
3. 点击"添加车队长"
4. 填写信息：
   - 手机号：`13900000003`
   - 姓名：`测试车队长001`
5. 点击"创建"

**步骤2**: 查询数据库验证
```sql
-- 查询新创建的车队长
SELECT id, name, role, boss_id
FROM profiles
WHERE phone = '13900000003';
```

**预期结果**:
- `boss_id` 不为 `NULL`
- `boss_id` 等于老板的 ID

**实际结果**:
```
记录测试结果...
```

---

### 测试5：司机请假申请通知
**目的**: 验证司机请假申请通知是否正常发送

**步骤1**: 以司机身份提交请假申请
1. 以司机身份登录（例如：`13900000001`）
2. 进入"请假申请"页面
3. 填写请假信息：
   - 请假类型：事假
   - 请假天数：1天
   - 事由：测试请假通知
4. 点击"提交"
5. 打开浏览器开发者工具（F12），查看控制台日志

**预期日志**:
```
🔍 getCurrentUserBossId: 查询用户信息 {userId: "xxx"}
📋 getCurrentUserBossId: 用户信息 {userId: "xxx", name: "测试司机001", role: "driver", boss_id: "yyy"}
✅ getCurrentUserBossId: 返回 boss_id {bossId: "yyy"}

🔍 调试信息 - 开始发送通知
  - driverId: xxx
  - driverName: 测试司机001
  - bossId: yyy  // ✅ 不再是 null
  - applicationId: zzz

✅ 司机提交申请通知发送成功，共 n 条
```

**步骤2**: 检查通知中心
1. 以老板身份登录
2. 进入"通知中心"
3. 查看是否有新的请假申请通知

**预期结果**:
- ✅ 老板的通知中心显示请假申请通知
- ✅ 通知内容包含：司机姓名、请假类型、请假时间、事由

**步骤3**: 检查车队长通知
1. 以车队长身份登录
2. 进入"通知中心"
3. 查看是否有新的请假申请通知

**预期结果**:
- ✅ 车队长的通知中心显示请假申请通知

**步骤4**: 检查平级账号通知
1. 以平级账号身份登录
2. 进入"通知中心"
3. 查看是否有新的请假申请通知

**预期结果**:
- ✅ 平级账号的通知中心显示请假申请通知

**实际结果**:
```
记录测试结果...
```

---

### 测试6：检查约束（负面测试）
**目的**: 验证数据库约束是否正常工作

**测试6.1**: 尝试创建没有 boss_id 的非老板用户
```sql
-- 尝试插入没有 boss_id 的司机（应该被触发器自动设置）
INSERT INTO profiles (id, phone, name, role, email)
VALUES (
  gen_random_uuid(),
  '13900000004',
  '测试司机003',
  'driver',
  '13900000004@fleet.com'
)
RETURNING id, name, role, boss_id;
```

**预期结果**:
- 插入成功
- `boss_id` 自动设置为老板的 ID

**测试6.2**: 尝试将老板的 boss_id 设置为非 NULL
```sql
-- 尝试将老板的 boss_id 设置为非 NULL（应该失败）
UPDATE profiles 
SET boss_id = gen_random_uuid()
WHERE role = 'super_admin';
```

**预期结果**:
- 更新失败
- 错误信息：`violates check constraint "check_boss_id_for_role"`

**测试6.3**: 尝试将非老板用户的 boss_id 设置为 NULL
```sql
-- 尝试将司机的 boss_id 设置为 NULL（应该失败）
UPDATE profiles 
SET boss_id = NULL
WHERE role = 'driver'
LIMIT 1;
```

**预期结果**:
- 更新失败
- 错误信息：`violates check constraint "check_boss_id_for_role"`

**实际结果**:
```
记录测试结果...
```

---

## 测试总结

### 测试结果汇总
| 测试用例 | 状态 | 备注 |
|---------|------|------|
| 测试1：验证现有数据 | ⬜ 待测试 | |
| 测试2：创建新司机 | ⬜ 待测试 | |
| 测试3：触发器测试 | ⬜ 待测试 | |
| 测试4：创建新车队长 | ⬜ 待测试 | |
| 测试5：请假申请通知 | ⬜ 待测试 | |
| 测试6.1：自动设置 boss_id | ⬜ 待测试 | |
| 测试6.2：老板约束 | ⬜ 待测试 | |
| 测试6.3：非老板约束 | ⬜ 待测试 | |

### 问题记录
```
记录测试过程中发现的问题...
```

### 修复建议
```
记录需要修复的问题和建议...
```

---

## 清理测试数据

测试完成后，清理测试数据：

```sql
-- 删除测试用户
DELETE FROM profiles 
WHERE phone IN (
  '13900000001',
  '13900000002',
  '13900000003',
  '13900000004'
);

-- 删除测试通知
DELETE FROM notifications 
WHERE content LIKE '%测试请假通知%';

-- 删除测试请假申请
DELETE FROM leave_applications 
WHERE reason LIKE '%测试请假通知%';
```

---

## 附录：常用查询

### 查询所有用户的 boss_id
```sql
SELECT id, name, role, boss_id
FROM profiles
ORDER BY role, name;
```

### 查询老板信息
```sql
SELECT id, name, role, boss_id
FROM profiles
WHERE role = 'super_admin';
```

### 查询触发器信息
```sql
SELECT 
  trigger_name, 
  event_manipulation, 
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'profiles';
```

### 查询约束信息
```sql
SELECT 
  constraint_name,
  constraint_type,
  table_name
FROM information_schema.table_constraints
WHERE table_name = 'profiles'
AND constraint_name LIKE '%boss_id%';
```
