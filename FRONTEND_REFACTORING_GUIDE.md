# 前端代码重构指南 - 删除 boss_id

## 重构原则

### 1. 删除所有 boss_id 相关代码
- 删除 `getCurrentUserBossId()` 函数调用
- 删除查询中的 `.eq('boss_id', bossId)` 过滤条件
- 删除插入数据时的 `boss_id` 字段
- 删除函数参数中的 `bossId`

### 2. 简化查询逻辑
```typescript
// ❌ 旧代码（逻辑隔离）
const bossId = await getCurrentUserBossId(user.id)
const {data: drivers} = await supabase
  .from('profiles')
  .select('*')
  .eq('role', 'driver')
  .eq('boss_id', bossId)  // ❌ 删除

// ✅ 新代码（物理隔离）
const {data: drivers} = await supabase
  .from('profiles')
  .select('*')
  .eq('role', 'driver')
  // ✅ 不需要 boss_id 过滤
```

### 3. 简化插入逻辑
```typescript
// ❌ 旧代码（逻辑隔离）
const bossId = await getCurrentUserBossId(user.id)
await supabase
  .from('profiles')
  .insert({
    name: '司机A',
    role: 'driver',
    boss_id: bossId  // ❌ 删除
  })

// ✅ 新代码（物理隔离）
await supabase
  .from('profiles')
  .insert({
    name: '司机A',
    role: 'driver'
    // ✅ 不需要 boss_id
  })
```

## 需要修改的文件

### 1. src/db/api.ts

#### 1.1 删除 getCurrentUserBossId() 函数
```typescript
// ❌ 删除整个函数
export async function getCurrentUserBossId(userId: string): Promise<string | null> {
  // ...
}
```

#### 1.2 更新所有 API 函数

**示例 1：createAttendanceRecord()**
```typescript
// ❌ 旧代码
export async function createAttendanceRecord(input: AttendanceRecordInput) {
  // 1. 获取当前用户
  const {data: {user}} = await supabase.auth.getUser()
  if (!user) throw new Error('未登录')

  // 2. 获取当前用户的 boss_id
  const {data: profile} = await supabase
    .from('profiles')
    .select('boss_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.boss_id) {
    console.error('创建打卡记录失败: 无法获取 boss_id')
    return {data: null, error: new Error('无法获取 boss_id')}
  }

  // 3. 插入考勤记录（自动添加 boss_id）
  const {data, error} = await supabase
    .from('attendance')
    .insert({
      ...input,
      boss_id: profile.boss_id
    })
    .select()
    .maybeSingle()

  return {data, error}
}

// ✅ 新代码
export async function createAttendanceRecord(input: AttendanceRecordInput) {
  // 1. 获取当前用户
  const {data: {user}} = await supabase.auth.getUser()
  if (!user) throw new Error('未登录')

  // 2. 插入考勤记录（不需要 boss_id）
  const {data, error} = await supabase
    .from('attendance')
    .insert(input)
    .select()
    .maybeSingle()

  return {data, error}
}
```

**示例 2：createWarehouse()**
```typescript
// ❌ 旧代码
export async function createWarehouse(input: WarehouseInput) {
  const {data: {user}} = await supabase.auth.getUser()
  if (!user) throw new Error('未登录')

  const {data: profile} = await supabase
    .from('profiles')
    .select('boss_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.boss_id) {
    console.error('创建仓库失败: 无法获取 boss_id')
    return {data: null, error: new Error('无法获取 boss_id')}
  }

  const {data, error} = await supabase
    .from('warehouses')
    .insert({
      ...input,
      boss_id: profile.boss_id
    })
    .select()
    .maybeSingle()

  return {data, error}
}

// ✅ 新代码
export async function createWarehouse(input: WarehouseInput) {
  const {data: {user}} = await supabase.auth.getUser()
  if (!user) throw new Error('未登录')

  const {data, error} = await supabase
    .from('warehouses')
    .insert(input)
    .select()
    .maybeSingle()

  return {data, error}
}
```

**示例 3：assignDriverToWarehouse()**
```typescript
// ❌ 旧代码
export async function assignDriverToWarehouse(driverId: string, warehouseId: string) {
  // 1. 检查司机是否存在并获取其 boss_id
  const {data: driver} = await supabase
    .from('profiles')
    .select('boss_id, name')
    .eq('id', driverId)
    .maybeSingle()

  if (!driver) {
    return {data: null, error: new Error('司机不存在')}
  }

  // 2. 检查仓库是否存在并获取其 boss_id
  const {data: warehouse} = await supabase
    .from('warehouses')
    .select('is_active, name, boss_id')
    .eq('id', warehouseId)
    .maybeSingle()

  if (!warehouse) {
    return {data: null, error: new Error('仓库不存在')}
  }

  // 3. 检查 boss_id 是否匹配
  if (driver.boss_id !== warehouse.boss_id) {
    return {
      data: null,
      error: new Error('司机和仓库不属于同一租户')
    }
  }

  // 4. 插入关联
  const {data, error} = await supabase
    .from('driver_warehouses')
    .insert({
      driver_id: driverId,
      warehouse_id: warehouseId
    })
    .select()
    .maybeSingle()

  return {data, error}
}

// ✅ 新代码
export async function assignDriverToWarehouse(driverId: string, warehouseId: string) {
  // 1. 检查司机是否存在
  const {data: driver} = await supabase
    .from('profiles')
    .select('name')
    .eq('id', driverId)
    .maybeSingle()

  if (!driver) {
    return {data: null, error: new Error('司机不存在')}
  }

  // 2. 检查仓库是否存在
  const {data: warehouse} = await supabase
    .from('warehouses')
    .select('is_active, name')
    .eq('id', warehouseId)
    .maybeSingle()

  if (!warehouse) {
    return {data: null, error: new Error('仓库不存在')}
  }

  // 3. 插入关联（不需要检查 boss_id）
  const {data, error} = await supabase
    .from('driver_warehouses')
    .insert({
      driver_id: driverId,
      warehouse_id: warehouseId
    })
    .select()
    .maybeSingle()

  return {data, error}
}
```

### 2. src/db/notificationApi.ts

#### 2.1 更新 sendNotificationToAdmins()
```typescript
// ❌ 旧代码
export async function sendNotificationToAdmins(
  bossId: string,  // ❌ 删除参数
  senderId: string,
  senderName: string,
  senderRole: string,
  type: NotificationType,
  title: string,
  content: string,
  warehouseId?: string
) {
  // 1. 获取通知接收者
  const {data: recipients} = await supabase.rpc('get_notification_recipients', {
    p_boss_id: bossId,  // ❌ 删除参数
    p_notification_type: type,
    p_warehouse_id: warehouseId
  })

  // 2. 批量发送通知
  const notifications = recipients.map(recipient => ({
    recipient_id: recipient.recipient_id,
    sender_id: senderId,
    sender_name: senderName,
    sender_role: senderRole,
    type,
    title,
    content,
    boss_id: bossId,  // ❌ 删除字段
    is_read: false
  }))

  await supabase.from('notifications').insert(notifications)
}

// ✅ 新代码
export async function sendNotificationToAdmins(
  senderId: string,
  senderName: string,
  senderRole: string,
  type: NotificationType,
  title: string,
  content: string,
  warehouseId?: string
) {
  // 1. 获取通知接收者
  const {data: recipients} = await supabase.rpc('get_notification_recipients', {
    p_notification_type: type,
    p_warehouse_id: warehouseId
  })

  // 2. 批量发送通知
  const notifications = recipients.map(recipient => ({
    recipient_id: recipient.recipient_id,
    sender_id: senderId,
    sender_name: senderName,
    sender_role: senderRole,
    type,
    title,
    content,
    is_read: false
  }))

  await supabase.from('notifications').insert(notifications)
}
```

### 3. src/pages/driver/leave/apply/index.tsx

#### 3.1 更新请假申请提交逻辑
```typescript
// ❌ 旧代码
const handleSubmit = async () => {
  try {
    // 获取 boss_id
    const bossId = await getCurrentUserBossId(user.id)
    if (!bossId) {
      showToast({title: '无法获取租户信息', icon: 'none'})
      return
    }

    // 提交请假申请
    const {data, error} = await supabase
      .from('leave_applications')
      .insert({
        user_id: user.id,
        warehouse_id: warehouseId,
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        reason: reason,
        boss_id: bossId  // ❌ 删除
      })

    if (error) throw error

    // 发送通知
    await sendNotificationToAdmins(
      bossId,  // ❌ 删除参数
      user.id,
      user.name,
      'driver',
      'leave_request',
      '请假申请',
      `${user.name} 提交了请假申请`,
      warehouseId
    )

    showToast({title: '提交成功', icon: 'success'})
  } catch (error) {
    console.error('提交失败:', error)
    showToast({title: '提交失败', icon: 'none'})
  }
}

// ✅ 新代码
const handleSubmit = async () => {
  try {
    // 提交请假申请（不需要 boss_id）
    const {data, error} = await supabase
      .from('leave_applications')
      .insert({
        user_id: user.id,
        warehouse_id: warehouseId,
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        reason: reason
      })

    if (error) throw error

    // 发送通知（不需要 boss_id 参数）
    await sendNotificationToAdmins(
      user.id,
      user.name,
      'driver',
      'leave_request',
      '请假申请',
      `${user.name} 提交了请假申请`,
      warehouseId
    )

    showToast({title: '提交成功', icon: 'success'})
  } catch (error) {
    console.error('提交失败:', error)
    showToast({title: '提交失败', icon: 'none'})
  }
}
```

### 4. src/contexts/TenantContext.tsx

#### 4.1 删除 boss_id 状态
```typescript
// ❌ 旧代码
interface TenantContextValue {
  bossId: string | null  // ❌ 删除
  setBossId: (id: string | null) => void  // ❌ 删除
}

export const TenantProvider: React.FC<PropsWithChildren> = ({children}) => {
  const [bossId, setBossId] = useState<string | null>(null)  // ❌ 删除

  return (
    <TenantContext.Provider value={{bossId, setBossId}}>
      {children}
    </TenantContext.Provider>
  )
}

// ✅ 新代码
// 如果 TenantContext 只用于管理 boss_id，可以直接删除整个文件
// 如果还有其他用途，只删除 boss_id 相关的状态
```

### 5. src/utils/behaviorTracker.ts

#### 5.1 删除 boss_id 字段
```typescript
// ❌ 旧代码
export async function trackBehavior(
  userId: string,
  eventType: string,
  eventData: any
) {
  const bossId = await getCurrentUserBossId(userId)  // ❌ 删除

  await supabase
    .from('user_behavior_logs')
    .insert({
      user_id: userId,
      boss_id: bossId,  // ❌ 删除
      event_type: eventType,
      event_data: eventData
    })
}

// ✅ 新代码
export async function trackBehavior(
  userId: string,
  eventType: string,
  eventData: any
) {
  await supabase
    .from('user_behavior_logs')
    .insert({
      user_id: userId,
      event_type: eventType,
      event_data: eventData
    })
}
```

## 批量替换命令

### 1. 删除 getCurrentUserBossId() 调用
```bash
# 查找所有使用 getCurrentUserBossId 的文件
grep -r "getCurrentUserBossId" src --include="*.ts" --include="*.tsx"

# 手动删除每个调用
```

### 2. 删除 .eq('boss_id', ...) 过滤条件
```bash
# 查找所有使用 boss_id 过滤的地方
grep -r "\.eq('boss_id'" src --include="*.ts" --include="*.tsx"
grep -r '\.eq("boss_id"' src --include="*.ts" --include="*.tsx"

# 手动删除每个过滤条件
```

### 3. 删除插入数据时的 boss_id 字段
```bash
# 查找所有插入 boss_id 的地方
grep -r "boss_id:" src --include="*.ts" --include="*.tsx"

# 手动删除每个 boss_id 字段
```

## 测试清单

### 1. 功能测试
- [ ] 用户登录
- [ ] 查询数据（确保不会查询到其他租户的数据）
- [ ] 插入数据（确保不需要 boss_id）
- [ ] 更新数据
- [ ] 删除数据

### 2. 权限测试
- [ ] 司机只能查看自己的数据
- [ ] 司机可以查看管理员
- [ ] 司机不能查看其他司机
- [ ] 车队长可以查看所有司机
- [ ] 老板可以查看所有数据

### 3. 通知测试
- [ ] 司机提交请假申请，管理员收到通知
- [ ] 车队长添加司机，老板收到通知
- [ ] 通知接收者正确

## 注意事项

### 1. 数据安全
- ⚠️ 确保 RLS 策略已经更新，防止数据泄露
- ⚠️ 测试所有权限场景

### 2. 向后兼容
- ⚠️ 旧的 API 调用会失败
- ⚠️ 需要同时更新前端和后端代码

### 3. 错误处理
- ⚠️ 删除 boss_id 相关的错误处理逻辑
- ⚠️ 添加新的错误处理逻辑

## 总结

### 核心变化
1. ✅ 删除所有 `getCurrentUserBossId()` 函数调用
2. ✅ 删除查询中的 `.eq('boss_id', bossId)` 过滤条件
3. ✅ 删除插入数据时的 `boss_id` 字段
4. ✅ 删除函数参数中的 `bossId`

### 简化后的代码
- 查询更简单（不需要 boss_id 过滤）
- 插入更简单（不需要 boss_id 字段）
- 函数签名更简单（不需要 bossId 参数）
- RLS 策略更简单（只关注角色权限）

### 预计工作量
- 更新 `src/db/api.ts`：4-6 小时
- 更新其他数据库 API 文件：2-3 小时
- 更新页面组件：2-3 小时
- 测试：2-3 小时

**总计：10-15 小时**
