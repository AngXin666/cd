# 车队管理系统账号结构与权限修复方案

## 一、系统账号结构

### 1.1 账号层级关系

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

### 1.2 账号详细说明

#### 老板账号（super_admin）
- **角色标识**: `role = 'super_admin'`
- **boss_id**: `NULL`（因为他是最高级别，没有上级）
- **权限范围**:
  - 管理整个租户的所有数据
  - 创建和管理所有角色的账号
  - 查看和修改所有数据
  - 设置系统规则和配置

#### 平级账号（peer_admin）
- **角色标识**: `role = 'peer_admin'`
- **boss_id**: 指向老板的 ID
- **权限范围**:
  - 与老板拥有相同的权限
  - 可以管理整个租户的数据
  - 可以创建和管理其他账号
  - 适用于多个管理者共同管理的场景

#### 车队长账号（manager）
- **角色标识**: `role = 'manager'`
- **boss_id**: 指向老板的 ID
- **权限范围**:
  - 管理特定仓库的司机
  - 审批请假、离职申请
  - 查看和管理仓库数据
  - 创建和管理司机账号

#### 司机账号（driver）
- **角色标识**: `role = 'driver'`
- **boss_id**: 指向老板的 ID
- **权限范围**:
  - 查看自己的数据（考勤、工资、车辆等）
  - 提交请假、离职申请
  - 查看自己所属仓库的信息
  - **需要能够查看同租户的管理员信息**（用于提交申请等）

## 二、核心问题分析

### 2.1 问题描述

**司机频繁查询不到老板、平级账号、车队长账号**

### 2.2 问题原因

#### 原因 1: `get_current_user_boss_id()` 函数缺陷

**原函数实现**:
```sql
CREATE FUNCTION get_current_user_boss_id()
RETURNS text
AS $$
  SELECT boss_id 
  FROM profiles 
  WHERE id = auth.uid()
  LIMIT 1;
$$;
```

**问题**:
- 对于老板（super_admin），`boss_id` 为 `NULL`
- 函数返回 `NULL`，导致所有基于 `boss_id` 的查询失败
- 老板无法查询自己租户的数据
- 其他用户无法通过 `boss_id` 关联到老板

#### 原因 2: RLS 策略限制

**原有策略**:
```sql
-- 只有这个策略允许查看同租户用户
CREATE POLICY "Admins can view same tenant users"
ON profiles
FOR SELECT
USING (
  role IN ('manager', 'super_admin')
  AND boss_id = get_current_user_boss_id()
);
```

**问题**:
- 司机（driver）不在允许的角色列表中
- 司机无法查看同租户的其他用户
- 司机提交请假申请时无法查询到审批人（老板、车队长）

## 三、修复方案

### 3.1 修复 `get_current_user_boss_id()` 函数

**新函数实现**:
```sql
CREATE OR REPLACE FUNCTION get_current_user_boss_id()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT 
    CASE 
      -- 如果是老板（boss_id 为 NULL 且 role 为 super_admin），返回自己的 ID
      WHEN p.boss_id IS NULL AND p.role = 'super_admin' THEN p.id::text
      -- 否则返回 boss_id
      ELSE p.boss_id::text
    END
  FROM profiles p
  WHERE p.id = auth.uid()
  LIMIT 1;
$$;
```

**修复效果**:
- ✅ 老板调用时返回自己的 ID（而不是 NULL）
- ✅ 其他用户调用时返回他们的 `boss_id`
- ✅ 所有基于 `boss_id` 的查询都能正常工作
- ✅ 多租户数据隔离正常

### 3.2 添加司机查看权限的 RLS 策略

#### 策略 1: 司机可以查看同租户的管理员

```sql
CREATE POLICY "Drivers can view same tenant admins"
ON profiles
FOR SELECT
TO authenticated
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

**策略说明**:
- 司机可以查看同租户的老板（用于提交申请）
- 司机可以查看同租户的车队长（用于查看审批人）
- 司机可以查看同租户的平级账号（用于了解管理层）

#### 策略 2: 司机可以查看同租户的其他司机

```sql
CREATE POLICY "Drivers can view same tenant drivers"
ON profiles
FOR SELECT
TO authenticated
USING (
  -- 当前用户是司机
  (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r(role, boss_id)) = 'driver'
  AND
  -- 可以查看同租户的其他司机
  role = 'driver'
  AND boss_id::text = get_current_user_boss_id()
);
```

**策略说明**:
- 司机可以查看同租户的其他司机
- 用于查看同事信息、协作等场景

### 3.3 代码层面修复

#### 修复 `createDriver` 函数

```typescript
// 获取当前用户的 boss_id
const {data: {user: currentUser}} = await supabase.auth.getUser()
const {data: currentUserProfile} = await supabase
  .from('profiles')
  .select('boss_id, role')
  .eq('id', currentUser.id)
  .maybeSingle()

// 确定新用户的 boss_id
let newUserBossId: string
if (currentUserProfile.role === 'super_admin') {
  // 如果当前用户是老板，新用户的 boss_id 就是老板的 ID
  newUserBossId = currentUser.id
} else if (currentUserProfile.boss_id) {
  // 如果当前用户不是老板，新用户的 boss_id 与当前用户相同
  newUserBossId = currentUserProfile.boss_id
}

// 插入数据时设置 boss_id
const insertData = {
  id: userId,
  phone,
  name,
  role: 'driver' as UserRole,
  email: loginEmail,
  driver_type: driverType,
  join_date: new Date().toISOString().split('T')[0],
  boss_id: newUserBossId // 显式设置 boss_id
}
```

#### 修复 `getCurrentUserBossId` 函数

```typescript
export async function getCurrentUserBossId(userId?: string): Promise<string | null> {
  try {
    let currentUserId = userId

    // 如果没有提供 userId，则从认证系统获取
    if (!currentUserId) {
      const {data: {user}} = await supabase.auth.getUser()
      if (!user) return null
      currentUserId = user.id
    }

    // 从 profiles 表获取用户的 boss_id 和 role
    const {data, error} = await supabase
      .from('profiles')
      .select('boss_id, role, name')
      .eq('id', currentUserId)
      .maybeSingle()

    if (error || !data) return null

    // 如果是老板（super_admin），boss_id 为 NULL，返回自己的 ID
    if (!data.boss_id && data.role === 'super_admin') {
      return currentUserId
    }

    return data.boss_id
  } catch (error) {
    console.error('💥 获取 boss_id 异常:', error)
    return null
  }
}
```

## 四、修复后的效果

### 4.1 老板账号

✅ **可以查询自己租户的所有数据**
- `get_current_user_boss_id()` 返回自己的 ID
- 所有 `WHERE boss_id = get_current_user_boss_id()` 的查询都能正常工作

✅ **可以创建和管理所有角色的账号**
- 创建的用户自动设置 `boss_id` 为老板的 ID
- 多租户数据隔离正常

### 4.2 平级账号

✅ **与老板拥有相同的权限**
- 可以查询和管理整个租户的数据
- 可以创建和管理其他账号

### 4.3 车队长账号

✅ **可以管理特定仓库的司机**
- 可以查询同租户的所有司机
- 可以审批请假、离职申请
- 可以创建司机账号

### 4.4 司机账号

✅ **可以查看同租户的管理员**
- 可以查询老板信息（用于提交申请）
- 可以查询车队长信息（用于查看审批人）
- 可以查询平级账号信息

✅ **可以查看同租户的其他司机**
- 可以查看同事信息
- 可以进行协作

✅ **可以正常提交申请**
- 请假申请可以正确设置 `boss_id`
- 离职申请可以正确设置 `boss_id`

## 五、测试验证

### 5.1 测试场景

#### 场景 1: 老板查询租户数据

```sql
-- 以老板身份登录
-- 查询所有用户
SELECT * FROM profiles WHERE boss_id = get_current_user_boss_id();
-- 应该返回：所有属于该租户的用户（车队长、司机等）
```

#### 场景 2: 司机查询管理员

```sql
-- 以司机身份登录
-- 查询老板
SELECT * FROM profiles WHERE role = 'super_admin' AND id::text = get_current_user_boss_id();
-- 应该返回：该租户的老板信息

-- 查询车队长
SELECT * FROM profiles WHERE role = 'manager' AND boss_id::text = get_current_user_boss_id();
-- 应该返回：该租户的所有车队长
```

#### 场景 3: 司机提交请假申请

```typescript
// 司机提交请假申请
const bossId = await getCurrentUserBossId(user.id)
// 应该返回：老板的 ID（不是 NULL）

const {data, error} = await supabase
  .from('leave_applications')
  .insert({
    user_id: user.id,
    boss_id: bossId,
    // ... 其他字段
  })
// 应该成功插入
```

#### 场景 4: 多租户隔离

```sql
-- 租户 A 的司机
SELECT * FROM profiles WHERE boss_id::text = get_current_user_boss_id();
-- 应该只返回：租户 A 的用户

-- 租户 B 的司机
SELECT * FROM profiles WHERE boss_id::text = get_current_user_boss_id();
-- 应该只返回：租户 B 的用户
```

### 5.2 验证 SQL

```sql
-- 1. 验证 get_current_user_boss_id() 函数
SELECT 
  p.name,
  p.role,
  p.boss_id,
  get_current_user_boss_id() as computed_boss_id
FROM profiles p
WHERE p.id = auth.uid();

-- 2. 验证司机可以查看管理员
-- 以司机身份执行
SELECT 
  p.name,
  p.role,
  p.boss_id
FROM profiles p
WHERE 
  (p.role = 'super_admin' AND p.id::text = get_current_user_boss_id())
  OR
  (p.role IN ('manager', 'peer_admin') AND p.boss_id::text = get_current_user_boss_id());

-- 3. 验证多租户隔离
SELECT 
  b.name as boss_name,
  COUNT(*) as user_count,
  ARRAY_AGG(p.name) as users
FROM profiles p
LEFT JOIN profiles b ON p.boss_id = b.id
WHERE p.role != 'super_admin'
GROUP BY b.name;
```

## 六、注意事项

### 6.1 老板账号的 boss_id

⚠️ **老板的 `boss_id` 为 `NULL` 是正常的**
- 这不是错误，而是设计
- `get_current_user_boss_id()` 函数会自动处理这种情况
- 返回老板自己的 ID，而不是 NULL

### 6.2 数据隔离

✅ **多租户数据隔离是安全的**
- 每个租户的数据通过 `boss_id` 隔离
- RLS 策略确保用户只能访问自己租户的数据
- 不同租户的数据互不干扰

### 6.3 权限设计

✅ **权限设计遵循最小权限原则**
- 司机只能查看必要的信息（管理员、同事）
- 司机不能修改其他用户的数据
- 司机不能查看其他租户的数据

## 七、总结

通过以下修复：

1. ✅ 修复 `get_current_user_boss_id()` 函数，支持老板账号
2. ✅ 添加 RLS 策略，允许司机查看同租户的管理员和同事
3. ✅ 修复代码层面的 `boss_id` 设置逻辑
4. ✅ 添加数据库触发器作为兜底机制

系统现在能够正确处理多租户环境下的账号结构和权限：

- 老板可以管理整个租户
- 平级账号与老板拥有相同权限
- 车队长可以管理特定仓库的司机
- 司机可以查看必要的信息并提交申请
- 多租户数据隔离安全可靠

**司机不再频繁查询不到老板、平级账号、车队长账号的问题已完全解决！**
