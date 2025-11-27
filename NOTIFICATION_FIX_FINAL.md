# 司机请假通知问题完整修复方案

## 问题现象
司机提交请假申请后：
- ✅ 能看到弹窗提示
- ❌ 通知栏和通知中心没有显示通知记录
- ❌ 日志显示 `bossId: null`，提示"未找到 boss_id，无法发送通知"

## 根本原因

### 问题1：司机的 boss_id 字段为 NULL
**现象**：日志显示 `bossId: null`

**原因**：司机账号创建时，`boss_id` 字段没有正确设置。在多租户系统中，每个用户（除了老板）都应该有一个 `boss_id` 指向其所属的老板账号。

**影响**：
- 无法确定司机属于哪个租户
- 无法查询到该司机的老板、车队长和平级账号
- 通知系统无法正常工作

### 问题2：`getCurrentUserBossId()` 函数没有处理老板账号
**位置**：`src/db/tenantQuery.ts`

**原问题**：
```typescript
export async function getCurrentUserBossId(): Promise<string | null> {
  // ...
  return data?.boss_id || null  // ❌ 如果是老板，boss_id 为 NULL，直接返回 null
}
```

**影响**：老板账号无法获取自己的 boss_id（应该返回自己的 ID）

### 问题3：通知服务中的查询逻辑错误
**位置**：`src/services/notificationService.ts` - `getBoss()` 函数

**原问题**：
```typescript
.eq('boss_id', bossId)  // ❌ 老板的 boss_id 是 NULL，查不到
```

### 问题4：数据库 RLS 策略错误
**位置**：数据库 `notifications` 表的 RLS 策略

**原问题**：
```sql
SELECT p.id 
FROM profiles p
WHERE p.role = 'super_admin'
AND p.boss_id = get_current_user_boss_id()  -- ❌ 老板的 boss_id 是 NULL
```

## 完整修复方案

### 修复1：增强 `getCurrentUserBossId()` 函数
**文件**：`src/db/tenantQuery.ts`

**修复内容**：
```typescript
export async function getCurrentUserBossId(): Promise<string | null> {
  try {
    const {data: {user}} = await supabase.auth.getUser()
    if (!user) {
      console.warn('⚠️ getCurrentUserBossId: 未找到当前用户')
      return null
    }

    console.log('🔍 getCurrentUserBossId: 查询用户信息', {userId: user.id})

    // 从 profiles 表获取用户的 boss_id 和 role
    const {data, error} = await supabase
      .from('profiles')
      .select('boss_id, role, name')
      .eq('id', user.id)
      .maybeSingle()

    if (error || !data) {
      console.error('❌ 获取用户信息失败:', error)
      return null
    }

    console.log('📋 getCurrentUserBossId: 用户信息', {
      userId: user.id,
      name: data.name,
      role: data.role,
      boss_id: data.boss_id
    })

    // ✅ 如果是老板（super_admin），boss_id 为 NULL，返回自己的 ID
    if (!data.boss_id && data.role === 'super_admin') {
      console.log('✅ getCurrentUserBossId: 当前用户是老板，返回自己的 ID', {bossId: user.id})
      return user.id
    }

    if (!data.boss_id) {
      console.warn('⚠️ getCurrentUserBossId: 用户的 boss_id 为 NULL，且不是老板', {
        userId: user.id,
        role: data.role
      })
      return null
    }

    console.log('✅ getCurrentUserBossId: 返回 boss_id', {bossId: data.boss_id})
    return data.boss_id
  } catch (error) {
    console.error('💥 获取 boss_id 异常:', error)
    return null
  }
}
```

**关键改进**：
- ✅ 添加详细的调试日志
- ✅ 查询用户的 `role` 字段
- ✅ 如果是老板（`super_admin`），返回自己的 ID
- ✅ 如果不是老板但 `boss_id` 为 NULL，输出警告

### 修复2：修复通知服务查询逻辑
**文件**：`src/services/notificationService.ts`

**修复内容**：
```typescript
async function getBoss(bossId: string): Promise<NotificationRecipient | null> {
  try {
    logger.info('查询老板账号', {bossId})

    const {data, error} = await supabase
      .from('profiles')
      .select('id, name, role')
      .eq('id', bossId)  // ✅ 直接用 bossId 查询
      .eq('role', 'super_admin')
      .maybeSingle()

    if (error) {
      logger.error('查询老板账号失败', error)
      return null
    }

    if (data) {
      logger.info('找到老板账号', {id: data.id, name: data.name})
      return {id: data.id, name: data.name, role: data.role}
    }

    logger.warn('⚠️ 未找到老板账号')
    return null
  } catch (error) {
    logger.error('查询老板账号异常', error)
    return null
  }
}
```

### 修复3：修复通知API的 boss_id 处理
**文件**：`src/db/notificationApi.ts`

**修复内容**：
```typescript
export async function createNotifications(
  notifications: Omit<Notification, 'id' | 'created_at' | 'is_read' | 'boss_id'>[]
): Promise<boolean> {
  try {
    logger.db('批量创建通知', 'notifications', {count: notifications.length})

    const {
      data: {user}
    } = await supabase.auth.getUser()

    if (!user) {
      logger.error('批量创建通知失败：未找到当前用户')
      return false
    }

    console.log('📝 当前用户信息', {userId: user.id})

    const {data: senderProfile} = await supabase
      .from('profiles')
      .select('boss_id, role, name')
      .eq('id', user.id)
      .maybeSingle()

    console.log('👤 发送者profile信息', senderProfile)

    // ✅ 如果是老板，使用自己的 ID 作为 boss_id
    let bossId = senderProfile?.boss_id
    if (!bossId && senderProfile?.role === 'super_admin') {
      bossId = user.id
      logger.info('✅ 当前用户是老板，使用自己的ID作为boss_id', {bossId})
    }

    if (!bossId) {
      logger.error('批量创建通知失败：无法获取当前用户的 boss_id', {
        userId: user.id,
        role: senderProfile?.role
      })
      return false
    }

    // 添加 boss_id 到每个通知
    const notificationsWithBossId = notifications.map((notification) => ({
      ...notification,
      boss_id: bossId,
      is_read: false
    }))

    console.log('📤 准备插入通知数据', {count: notificationsWithBossId.length, data: notificationsWithBossId})

    const {error} = await supabase.from('notifications').insert(notificationsWithBossId)

    if (error) {
      logger.error('批量创建通知失败', error)
      return false
    }

    logger.info('✅ 批量通知创建成功', {count: notifications.length})
    return true
  } catch (error) {
    logger.error('批量创建通知异常', error)
    return false
  }
}
```

### 修复4：修复数据库 RLS 策略
**文件**：`supabase/migrations/99999_fix_driver_notification_creation_policy_v2.sql`

**修复内容**：
```sql
-- 删除旧的司机创建通知策略
DROP POLICY IF EXISTS "Drivers can create notifications" ON notifications;

-- 创建新的司机创建通知策略（修复老板查询条件和类型转换）
CREATE POLICY "Drivers can create notifications"
ON notifications FOR INSERT
TO authenticated
WITH CHECK (
  boss_id = get_current_user_boss_id() 
  AND is_driver(auth.uid())
  AND recipient_id IN (
    -- 可以给自己的车队长发送通知
    SELECT DISTINCT mw.manager_id 
    FROM driver_warehouses dw
    JOIN manager_warehouses mw ON dw.warehouse_id = mw.warehouse_id
    WHERE dw.driver_id = auth.uid()
    AND dw.boss_id = get_current_user_boss_id()
    
    UNION
    
    -- ✅ 可以给老板发送通知（修复：直接返回老板的 ID）
    SELECT get_current_user_boss_id()::uuid
    
    UNION
    
    -- 可以给平级账号发送通知
    SELECT p.id 
    FROM profiles p
    WHERE p.role = 'peer_admin'
    AND p.boss_id = get_current_user_boss_id()
  )
);
```

**关键改进**：
- ✅ 使用 `get_current_user_boss_id()::uuid` 直接返回老板的 ID
- ✅ 修复类型转换问题（TEXT → UUID）

## 数据修复：设置司机的 boss_id

### 问题诊断
如果日志显示 `bossId: null`，说明司机账号的 `boss_id` 字段为 NULL。需要手动修复数据。

### 修复步骤

#### 1. 查询当前系统中的老板账号
```sql
SELECT id, name, role, boss_id 
FROM profiles 
WHERE role = 'super_admin';
```

#### 2. 查询所有 boss_id 为 NULL 的司机
```sql
SELECT id, name, role, boss_id 
FROM profiles 
WHERE role = 'driver' AND boss_id IS NULL;
```

#### 3. 更新司机的 boss_id
假设老板的 ID 是 `xxx-xxx-xxx`，执行以下 SQL：

```sql
-- 更新所有司机的 boss_id
UPDATE profiles 
SET boss_id = 'xxx-xxx-xxx'  -- 替换为实际的老板 ID
WHERE role = 'driver' AND boss_id IS NULL;
```

#### 4. 验证修复结果
```sql
-- 检查是否还有 boss_id 为 NULL 的司机
SELECT id, name, role, boss_id 
FROM profiles 
WHERE role = 'driver' AND boss_id IS NULL;

-- 应该返回 0 条记录
```

### 自动修复脚本（可选）
如果系统中只有一个老板，可以使用以下 SQL 自动修复：

```sql
-- 自动将所有司机的 boss_id 设置为系统中唯一的老板 ID
UPDATE profiles 
SET boss_id = (
  SELECT id 
  FROM profiles 
  WHERE role = 'super_admin' 
  LIMIT 1
)
WHERE role = 'driver' AND boss_id IS NULL;
```

## 测试步骤

### 1. 数据准备
- ✅ 确保司机的 `boss_id` 已正确设置
- ✅ 确保有一个老板账号（super_admin）
- ✅ 确保有至少一个平级账号（peer_admin）
- ✅ 确保有至少一个车队长（manager）
- ✅ 确保司机已分配到车队长管辖的仓库

### 2. 执行测试
1. 以司机身份登录
2. 打开浏览器开发者工具（F12），切换到 Console 标签页
3. 提交一个请假申请
4. 观察控制台日志输出

### 3. 验证结果

#### 预期日志输出：
```
🔍 getCurrentUserBossId: 查询用户信息 {userId: "xxx"}
📋 getCurrentUserBossId: 用户信息 {userId: "xxx", name: "司机姓名", role: "driver", boss_id: "yyy"}
✅ getCurrentUserBossId: 返回 boss_id {bossId: "yyy"}

🔍 调试信息 - 开始发送通知
  - driverId: xxx
  - driverName: 司机姓名
  - bossId: yyy  // ✅ 不再是 null
  - applicationId: zzz

🚀 开始发送司机提交申请通知

步骤1: 获取老板账号
  查询老板账号 {bossId: yyy}
  找到老板账号 {id: yyy, name: 老板姓名}
  ✅ 已添加老板到通知列表

步骤2: 获取平级账号
  查询平级账号 {bossId: yyy}
  找到平级账号 {count: n}
  ✅ 已添加 n 个平级账号到通知列表

步骤3: 获取司机的车队长
  查询司机的车队长 {driverId: xxx, bossId: yyy}
  司机仓库查询结果 {count: n, data: [...]}
  找到车队长 {id: zzz, name: 车队长姓名}
  车队长去重后数量 {count: n}
  ✅ 已添加 n 个车队长到通知列表

📋 去重后的通知接收者列表 (共 n 人): [...]

📤 准备发送通知 {count: n, notifications: [...]}

📬 批量创建通知
  📝 当前用户信息 {userId: xxx}
  👤 发送者profile信息 {boss_id: yyy, role: driver, name: 司机姓名}
  📤 准备插入通知数据 {count: n, data: [...]}
  ✅ 批量通知创建成功 {count: n}

✅ 司机提交申请通知发送成功，共 n 条

📬 通知发送结果: true
✅ 请假申请提交成功，已发送通知给老板、平级账号和车队长
```

#### 检查通知中心：
- ✅ 老板账号的通知中心显示请假申请通知
- ✅ 平级账号的通知中心显示请假申请通知
- ✅ 车队长的通知中心显示请假申请通知
- ✅ 通知内容正确：包含司机姓名、请假类型、请假时间、请假事由

#### 检查数据库：
```sql
-- 查询最近创建的通知
SELECT * FROM notifications 
ORDER BY created_at DESC 
LIMIT 10;

-- 应该能看到刚刚创建的通知记录
```

## 常见问题排查

### 问题1：日志显示 `bossId: null`
**原因**：司机的 `boss_id` 字段为 NULL

**解决方案**：按照"数据修复"章节的步骤，手动设置司机的 `boss_id`

### 问题2：日志显示"未找到老板账号"
**原因**：
1. 老板账号不存在
2. 老板账号的 `role` 不是 `super_admin`
3. 司机的 `boss_id` 指向了错误的用户

**解决方案**：
```sql
-- 检查老板账号
SELECT id, name, role, boss_id 
FROM profiles 
WHERE role = 'super_admin';

-- 检查司机的 boss_id 是否正确
SELECT p1.id as driver_id, p1.name as driver_name, p1.boss_id,
       p2.id as boss_id, p2.name as boss_name, p2.role as boss_role
FROM profiles p1
LEFT JOIN profiles p2 ON p1.boss_id = p2.id
WHERE p1.role = 'driver';
```

### 问题3：通知创建失败，提示 RLS 策略错误
**原因**：数据库 RLS 策略没有更新

**解决方案**：
1. 确认迁移文件已应用：`supabase/migrations/99999_fix_driver_notification_creation_policy_v2.sql`
2. 如果没有应用，手动执行迁移文件中的 SQL

### 问题4：通知创建成功，但通知中心看不到
**原因**：
1. 通知查询的 RLS 策略有问题
2. 前端查询逻辑有问题

**解决方案**：
```sql
-- 检查通知是否真的创建了
SELECT * FROM notifications 
WHERE recipient_id = 'xxx'  -- 替换为接收者的 ID
ORDER BY created_at DESC;

-- 检查 RLS 策略
SELECT * FROM pg_policies 
WHERE tablename = 'notifications';
```

## 总结

本次修复涉及以下几个关键点：

1. **数据完整性**：确保所有用户（除老板外）都有正确的 `boss_id`
2. **函数增强**：`getCurrentUserBossId()` 函数正确处理老板账号
3. **查询逻辑**：通知服务中的查询逻辑正确处理老板账号
4. **RLS 策略**：数据库 RLS 策略正确处理老板账号的查询
5. **调试日志**：添加详细的调试日志，方便问题排查

修复后，司机提交请假申请时，系统会：
- ✅ 正确获取司机的 `boss_id`
- ✅ 正确查询到老板、平级账号和车队长
- ✅ 成功创建通知记录到数据库
- ✅ 通知中心正确显示通知
- ✅ 输出详细的调试日志

## 相关文件

- `src/db/tenantQuery.ts` - 租户查询工具（包含 `getCurrentUserBossId()` 函数）
- `src/services/notificationService.ts` - 通知服务
- `src/db/notificationApi.ts` - 通知API
- `src/pages/driver/leave/apply/index.tsx` - 司机请假申请页面
- `supabase/migrations/99999_fix_driver_notification_creation_policy_v2.sql` - RLS 策略修复迁移文件
