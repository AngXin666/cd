# 车队管理系统账号权限说明（修正版）

## 一、系统架构说明

### 1.1 数据隔离方式

系统采用 **单一数据库 + boss_id 字段隔离** 的多租户方案：
- 所有租户的数据存储在同一个数据库中
- 通过 `boss_id` 字段区分不同租户的数据
- RLS（行级安全）策略确保数据隔离

**不是**每个租户独立的数据库实例。

### 1.2 账号层级结构

```
租户 A                                租户 B
├── 老板（super_admin）              ├── 老板（super_admin）
│   ├── boss_id: NULL                │   ├── boss_id: NULL
│   └── 权限：管理整个租户            │   └── 权限：管理整个租户
│                                     │
├── 平级账号（peer_admin）            ├── 平级账号（peer_admin）
│   ├── boss_id: 老板A的ID            │   ├── boss_id: 老板B的ID
│   └── 权限：与老板平级              │   └── 权限：与老板平级
│                                     │
├── 车队长（manager）                 ├── 车队长（manager）
│   ├── boss_id: 老板A的ID            │   ├── boss_id: 老板B的ID
│   └── 权限：管理特定仓库            │   └── 权限：管理特定仓库
│                                     │
└── 司机（driver）                    └── 司机（driver）
    ├── boss_id: 老板A的ID                ├── boss_id: 老板B的ID
    └── 权限：查看自己的数据              └── 权限：查看自己的数据
```

## 二、账号权限详细说明

### 2.1 老板账号（super_admin）

**基本信息**：
- `role = 'super_admin'`
- `boss_id = NULL`

**权限范围**：
- ✅ 查看和管理整个租户的所有数据
- ✅ 创建和管理所有角色的账号（平级账号、车队长、司机）
- ✅ 设置系统规则和配置
- ✅ 审批所有请假、离职申请
- ✅ 查看所有统计报表

### 2.2 平级账号（peer_admin）

**基本信息**：
- `role = 'peer_admin'`
- `boss_id = 老板的ID`

**权限范围**：
- ✅ 与老板拥有相同的权限
- ✅ 查看和管理整个租户的所有数据
- ✅ 创建和管理其他账号
- ✅ 审批请假、离职申请
- ✅ 查看所有统计报表

**使用场景**：
- 多个管理者共同管理车队
- 老板授权其他人拥有完全管理权限

### 2.3 车队长账号（manager）

**基本信息**：
- `role = 'manager'`
- `boss_id = 老板的ID`

**权限范围**：
- ✅ 管理特定仓库的司机
- ✅ 查看和管理仓库数据
- ✅ 创建和管理司机账号
- ✅ 审批请假、离职申请
- ✅ 查看仓库统计报表
- ❌ 不能查看其他仓库的数据（除非被分配）
- ❌ 不能创建车队长或平级账号

### 2.4 司机账号（driver）

**基本信息**：
- `role = 'driver'`
- `boss_id = 老板的ID`

**权限范围**：

#### ✅ 可以查看的信息
1. **自己的信息**
   - 个人资料
   - 考勤记录
   - 工资明细
   - 车辆信息
   - 请假、离职申请记录

2. **租户管理员信息**（用于提交申请）
   - 老板信息（姓名、联系方式）
   - 车队长信息（姓名、联系方式）
   - 平级账号信息（姓名、联系方式）

3. **仓库信息**
   - 自己所属仓库的基本信息
   - 仓库规则（请假天数、离职通知期等）

#### ❌ 不能查看的信息
1. **其他司机的信息**
   - ❌ 不能查看其他司机的个人资料
   - ❌ 不能查看其他司机的考勤记录
   - ❌ 不能查看其他司机的工资明细
   - ❌ 不能查看其他司机的车辆信息

2. **其他租户的信息**
   - ❌ 不能查看其他租户的任何数据

#### ✅ 可以执行的操作
1. **个人数据管理**
   - 更新自己的个人资料
   - 打卡考勤
   - 提交计件工作记录
   - 更新车辆信息

2. **申请提交**
   - 提交请假申请
   - 提交离职申请
   - 提交反馈意见

#### ❌ 不能执行的操作
1. **数据管理**
   - ❌ 不能修改其他用户的数据
   - ❌ 不能删除任何数据
   - ❌ 不能创建其他账号

2. **审批操作**
   - ❌ 不能审批任何申请
   - ❌ 不能修改系统规则

## 三、RLS 策略说明

### 3.1 司机查看权限的 RLS 策略

#### 策略 1: 查看自己的信息
```sql
CREATE POLICY "Users can view own profile"
ON profiles
FOR SELECT
USING (auth.uid() = id);
```

#### 策略 2: 查看同租户的管理员
```sql
CREATE POLICY "Drivers can view same tenant admins"
ON profiles
FOR SELECT
USING (
  -- 当前用户是司机
  (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r(role, boss_id)) = 'driver'
  AND (
    -- 可以查看同租户的老板
    (role = 'super_admin' AND id::text = get_current_user_boss_id())
    OR
    -- 可以查看同租户的车队长和平级账号
    (role IN ('manager', 'peer_admin') AND boss_id::text = get_current_user_boss_id())
  )
);
```

**重要说明**：
- ✅ 司机可以查看同租户的老板、车队长、平级账号
- ❌ 司机**不能**查看同租户的其他司机
- ❌ 司机**不能**查看其他租户的任何用户

### 3.2 为什么司机需要查看管理员信息？

1. **提交请假申请**
   - 需要知道审批人是谁
   - 需要设置 `boss_id` 字段

2. **提交离职申请**
   - 需要知道审批人是谁
   - 需要设置 `boss_id` 字段

3. **查看审批进度**
   - 需要知道申请提交给了谁
   - 需要联系审批人

4. **日常沟通**
   - 需要知道车队长的联系方式
   - 需要知道老板的联系方式

## 四、核心修复说明

### 4.1 修复的问题

1. ✅ **修复了 `get_current_user_boss_id()` 函数**
   - 对老板返回自己的 ID（而不是 NULL）
   - 对其他用户返回 `boss_id`
   - 所有查询都能正常工作

2. ✅ **添加了司机查看管理员的 RLS 策略**
   - 司机可以查看同租户的老板、车队长、平级账号
   - 司机**不能**查看其他司机

3. ✅ **修复了代码层面的 `boss_id` 设置**
   - `createDriver()` 和 `createUser()` 函数显式设置 `boss_id`
   - 根据当前用户的角色自动计算新用户的 `boss_id`

4. ✅ **添加了数据库触发器作为兜底机制**（可选）
   - 在代码遗漏时自动设置 `boss_id`
   - 支持多租户系统

### 4.2 删除的错误策略

❌ **删除了"司机可以查看同租户其他司机"的策略**
- 这个策略是错误的
- 司机不应该能够查看其他司机的信息
- 已通过迁移文件删除

## 五、测试验证

### 5.1 司机查看权限测试

#### 测试 1: 司机查看自己的信息
```sql
-- 以司机身份登录
SELECT * FROM profiles WHERE id = auth.uid();
-- 预期结果：✅ 返回自己的信息
```

#### 测试 2: 司机查看管理员信息
```sql
-- 以司机身份登录
SELECT * FROM profiles 
WHERE 
  (role = 'super_admin' AND id::text = get_current_user_boss_id())
  OR
  (role IN ('manager', 'peer_admin') AND boss_id::text = get_current_user_boss_id());
-- 预期结果：✅ 返回同租户的老板、车队长、平级账号
```

#### 测试 3: 司机尝试查看其他司机
```sql
-- 以司机身份登录
SELECT * FROM profiles 
WHERE role = 'driver' AND id != auth.uid();
-- 预期结果：❌ 返回空结果（不能查看其他司机）
```

#### 测试 4: 司机提交请假申请
```typescript
// 司机提交请假申请
const bossId = await getCurrentUserBossId(user.id)
console.log('boss_id:', bossId) // 应该输出老板的ID

const {data, error} = await supabase
  .from('leave_applications')
  .insert({
    user_id: user.id,
    boss_id: bossId,
    start_date: '2025-01-01',
    end_date: '2025-01-03',
    reason: '测试请假',
    status: 'pending'
  })
// 预期结果：✅ 成功插入
```

### 5.2 多租户隔离测试

#### 测试 1: 租户 A 的司机查询
```sql
-- 租户 A 的司机登录
SELECT * FROM profiles WHERE boss_id::text = get_current_user_boss_id();
-- 预期结果：✅ 只返回租户 A 的管理员（不包括其他司机）
```

#### 测试 2: 租户 B 的司机查询
```sql
-- 租户 B 的司机登录
SELECT * FROM profiles WHERE boss_id::text = get_current_user_boss_id();
-- 预期结果：✅ 只返回租户 B 的管理员（不包括其他司机）
```

## 六、总结

### 6.1 系统架构
- 单一数据库 + `boss_id` 字段隔离
- RLS 策略确保数据安全
- 不是每个租户独立的数据库实例

### 6.2 司机权限
- ✅ 可以查看自己的信息
- ✅ 可以查看同租户的管理员（老板、车队长、平级账号）
- ❌ **不能**查看同租户的其他司机
- ❌ **不能**查看其他租户的任何数据

### 6.3 核心修复
- ✅ 修复了 `get_current_user_boss_id()` 函数
- ✅ 添加了司机查看管理员的 RLS 策略
- ✅ 删除了错误的"司机查看其他司机"策略
- ✅ 修复了代码层面的 `boss_id` 设置

### 6.4 触发器说明
- 触发器作为安全兜底机制（可选）
- 代码层面已经正确设置 `boss_id`
- 可以根据需要保留或删除触发器

**司机查询不到老板、平级账号、车队长账号的问题已完全解决！**
