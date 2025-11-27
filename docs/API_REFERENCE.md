# API 参考文档

## 目录
- [概述](#概述)
- [认证系统](#认证系统)
- [租户管理](#租户管理)
- [用户管理](#用户管理)
- [车辆管理](#车辆管理)
- [仓库管理](#仓库管理)
- [考勤管理](#考勤管理)
- [请假管理](#请假管理)
- [计件管理](#计件管理)
- [通知系统](#通知系统)
- [辅助函数](#辅助函数)

---

## 概述

车队管家小程序采用**物理隔离架构**，每个租户拥有独立的数据库 Schema。系统自动处理租户隔离，开发者无需手动添加租户过滤条件。

### 核心原则

✅ **推荐做法**：
```typescript
// 直接查询，物理隔离自动生效
const { data } = await supabase.from('warehouses').select('*')
```

❌ **避免做法**：
```typescript
// 不需要手动添加 boss_id 过滤
const { data } = await supabase
  .from('warehouses')
  .select('*')
  .eq('boss_id', bossId) // ❌ 不需要
```

### 导入方式

```typescript
// 导入 Supabase 客户端
import { supabase } from '@/client/supabase'

// 导入数据库 API
import {
  getAllWarehouses,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse
} from '@/db/api'

// 导入通知 API
import {
  createNotification,
  getNotifications,
  markNotificationAsRead
} from '@/db/notificationApi'
```

---

## 认证系统

### useAuth Hook

```typescript
import { useAuth } from 'miaoda-auth-taro'

const MyComponent: React.FC = () => {
  const { user, isAuthenticated, login, logout, getAccessToken } = useAuth()
  
  // 使用认证状态
  if (!isAuthenticated) {
    return <View>请先登录</View>
  }
  
  return <View>欢迎，{user?.email}</View>
}
```

#### 参数

```typescript
interface UseAuthOptions {
  guard?: boolean  // 启用路由守卫，未登录时自动跳转到登录页
}
```

#### 返回值

```typescript
interface AuthContextValue {
  user: User | null                    // 当前用户对象
  isAuthenticated: boolean             // 是否已登录
  login: () => void                    // 跳转到登录页
  logout: () => void                   // 退出登录
  getAccessToken: () => Promise<string | null>  // 获取访问令牌
}
```

### 获取当前用户信息

```typescript
import { getCurrentUserRoleAndTenant } from '@/db/tenant-utils'

const userInfo = await getCurrentUserRoleAndTenant()
// 返回：{ role: 'driver' | 'manager' | 'super_admin', tenantId: string, schemaName: string }
```

---

## 租户管理

### 创建租户

通过 Edge Function 创建租户：

```typescript
const response = await fetch(`${supabaseUrl}/functions/v1/create-tenant`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${supabaseKey}`
  },
  body: JSON.stringify({
    company_name: '测试公司',
    contact_name: '张三',
    contact_phone: '13800138000',
    contact_email: 'test@example.com',
    boss_name: '李老板',
    boss_phone: '13900139000',
    boss_email: 'boss@example.com',
    boss_password: 'Test123456'
  })
})

const result = await response.json()
// 返回：{ success: true, tenant: {...}, message: '租户创建成功' }
```

### 获取租户列表

```typescript
import { getAllTenants } from '@/db/api'

const tenants = await getAllTenants()
// 返回：Tenant[]
```

### 更新租户信息

```typescript
import { updateTenant } from '@/db/api'

await updateTenant(tenantId, {
  company_name: '新公司名称',
  status: 'active'
})
```

### 删除租户

```typescript
import { deleteTenant } from '@/db/api'

await deleteTenant(tenantId)
```

---

## 用户管理

### 获取所有用户

```typescript
import { getAllProfiles } from '@/db/api'

const users = await getAllProfiles()
// 返回：Profile[]
```

### 获取当前用户信息

```typescript
import { getCurrentUserProfile } from '@/db/api'

const profile = await getCurrentUserProfile()
// 返回：Profile | null
```

### 创建用户

```typescript
import { createProfile } from '@/db/api'

await createProfile({
  name: '张三',
  phone: '13800138000',
  email: 'zhangsan@example.com',
  role: 'driver',
  status: 'active'
})
```

### 更新用户信息

```typescript
import { updateProfile } from '@/db/api'

await updateProfile(userId, {
  name: '李四',
  status: 'inactive'
})
```

### 删除用户

```typescript
import { deleteProfile } from '@/db/api'

await deleteProfile(userId)
```

### 用户角色

```typescript
type UserRole = 'boss' | 'peer' | 'fleet_leader' | 'driver'

// boss: 老板，拥有所有权限
// peer: 平级账号，权限由 permission_type 决定
// fleet_leader: 车队长，管理指定范围的数据
// driver: 司机，只能查看和管理自己的数据
```

---

## 车辆管理

### 获取所有车辆

```typescript
import { getAllVehicles } from '@/db/api'

const vehicles = await getAllVehicles()
// 返回：Vehicle[]
```

### 获取指定司机的车辆

```typescript
import { getVehiclesByDriver } from '@/db/api'

const vehicles = await getVehiclesByDriver(driverId)
// 返回：Vehicle[]
```

### 创建车辆

```typescript
import { createVehicle } from '@/db/api'

await createVehicle({
  plate_number: '京A12345',
  driver_id: driverId,
  warehouse_id: warehouseId,
  status: 'active'
})
```

### 更新车辆信息

```typescript
import { updateVehicle } from '@/db/api'

await updateVehicle(vehicleId, {
  driver_id: newDriverId,
  status: 'inactive'
})
```

### 删除车辆

```typescript
import { deleteVehicle } from '@/db/api'

await deleteVehicle(vehicleId)
```

---

## 仓库管理

### 获取所有仓库

```typescript
import { getAllWarehouses } from '@/db/api'

const warehouses = await getAllWarehouses()
// 返回：Warehouse[]
```

### 获取活跃仓库

```typescript
import { getActiveWarehouses } from '@/db/api'

const warehouses = await getActiveWarehouses()
// 返回：Warehouse[]
```

### 创建仓库

```typescript
import { createWarehouse } from '@/db/api'

await createWarehouse({
  name: '北京仓库',
  is_active: true
})
```

### 更新仓库信息

```typescript
import { updateWarehouse } from '@/db/api'

await updateWarehouse(warehouseId, {
  name: '上海仓库',
  is_active: false
})
```

### 删除仓库

```typescript
import { deleteWarehouse } from '@/db/api'

await deleteWarehouse(warehouseId)
```

---

## 考勤管理

### 获取考勤记录

```typescript
import { getAttendanceRecords } from '@/db/api'

const records = await getAttendanceRecords()
// 返回：Attendance[]
```

### 获取指定用户的考勤记录

```typescript
import { getAttendanceByUser } from '@/db/api'

const records = await getAttendanceByUser(userId)
// 返回：Attendance[]
```

### 打卡

```typescript
import { createAttendance } from '@/db/api'

await createAttendance({
  user_id: userId,
  check_in_time: new Date().toISOString(),
  status: 'normal'
})
```

### 更新考勤记录

```typescript
import { updateAttendance } from '@/db/api'

await updateAttendance(attendanceId, {
  check_out_time: new Date().toISOString(),
  status: 'late'
})
```

---

## 请假管理

### 获取请假申请

```typescript
import { getLeaveRequests } from '@/db/api'

const requests = await getLeaveRequests()
// 返回：LeaveRequest[]
```

### 获取指定用户的请假申请

```typescript
import { getLeaveRequestsByUser } from '@/db/api'

const requests = await getLeaveRequestsByUser(userId)
// 返回：LeaveRequest[]
```

### 创建请假申请

```typescript
import { createLeaveRequest } from '@/db/api'

await createLeaveRequest({
  user_id: userId,
  start_date: '2025-11-28',
  end_date: '2025-11-30',
  reason: '家庭事务',
  status: 'pending'
})
```

### 审批请假申请

```typescript
import { updateLeaveRequest } from '@/db/api'

await updateLeaveRequest(requestId, {
  status: 'approved'  // 或 'rejected'
})
```

---

## 计件管理

### 获取计件记录

```typescript
import { getPieceworkRecords } from '@/db/api'

const records = await getPieceworkRecords()
// 返回：PieceworkRecord[]
```

### 获取指定用户的计件记录

```typescript
import { getPieceworkRecordsByUser } from '@/db/api'

const records = await getPieceworkRecordsByUser(userId)
// 返回：PieceworkRecord[]
```

### 创建计件记录

```typescript
import { createPieceworkRecord } from '@/db/api'

await createPieceworkRecord({
  user_id: userId,
  work_date: '2025-11-27',
  quantity: 100,
  unit_price: 0.5,
  total_amount: 50,
  notes: '正常工作'
})
```

### 更新计件记录

```typescript
import { updatePieceworkRecord } from '@/db/api'

await updatePieceworkRecord(recordId, {
  quantity: 120,
  total_amount: 60
})
```

---

## 通知系统

### 创建通知

```typescript
import { createNotification } from '@/db/notificationApi'

await createNotification({
  receiver_id: userId,
  title: '系统通知',
  content: '您有一条新消息',
  type: 'system'
})
```

### 获取通知列表

```typescript
import { getNotifications } from '@/db/notificationApi'

const notifications = await getNotifications(userId, 20)
// 返回：Notification[]
```

### 标记通知为已读

```typescript
import { markNotificationAsRead } from '@/db/notificationApi'

await markNotificationAsRead(notificationId, userId)
```

### 获取未读通知数量

```typescript
import { getUnreadNotificationCount } from '@/db/notificationApi'

const count = await getUnreadNotificationCount(userId)
// 返回：number
```

### 通知类型

```typescript
type NotificationType = 'system' | 'leave_request' | 'vehicle_approval' | 'attendance' | 'piecework'

// system: 系统通知
// leave_request: 请假申请通知
// vehicle_approval: 车辆审核通知
// attendance: 考勤通知
// piecework: 计件通知
```

---

## 辅助函数

### 租户工具

```typescript
import {
  getCurrentUserRoleAndTenant,
  getTenantSchemaName,
  setTenantContext
} from '@/db/tenant-utils'

// 获取当前用户角色和租户信息
const userInfo = await getCurrentUserRoleAndTenant()

// 获取租户 Schema 名称
const schemaName = await getTenantSchemaName()

// 设置租户上下文
await setTenantContext(schemaName)
```

### 数据库辅助函数

```typescript
// 在租户 Schema 中插入 profile
const result = await supabase.rpc('insert_tenant_profile', {
  p_schema_name: 'tenant_001',
  p_user_id: userId,
  p_name: '张三',
  p_phone: '13800138000',
  p_email: 'zhangsan@example.com',
  p_role: 'driver'
})

// 在租户 Schema 中插入通知
const result = await supabase.rpc('insert_notification', {
  p_schema_name: 'tenant_001',
  p_sender_id: senderId,
  p_receiver_id: receiverId,
  p_title: '测试通知',
  p_content: '这是一条测试通知',
  p_type: 'system'
})

// 查询租户 Schema 中的通知
const result = await supabase.rpc('get_notifications', {
  p_schema_name: 'tenant_001',
  p_receiver_id: userId,
  p_limit: 20
})

// 标记通知为已读
const result = await supabase.rpc('mark_notification_read', {
  p_schema_name: 'tenant_001',
  p_notification_id: notificationId,
  p_user_id: userId
})
```

---

## 错误处理

### 标准错误处理模式

```typescript
import Taro from '@tarojs/taro'

try {
  const result = await someApiFunction()
  
  if (!result) {
    throw new Error('操作失败')
  }
  
  Taro.showToast({
    title: '操作成功',
    icon: 'success'
  })
} catch (error) {
  console.error('操作失败:', error)
  Taro.showToast({
    title: error.message || '操作失败',
    icon: 'error'
  })
}
```

### 常见错误码

| 错误码 | 说明 | 解决方案 |
|--------|------|---------|
| PGRST116 | 未找到记录 | 检查查询条件是否正确 |
| PGRST202 | 未找到函数 | 检查 RPC 函数名称是否正确 |
| 42501 | 权限不足 | 检查 RLS 策略和用户权限 |
| 23505 | 唯一约束冲突 | 检查是否有重复数据 |

---

## 最佳实践

### 1. 使用封装的 API 函数

✅ **推荐**：
```typescript
import { getAllWarehouses } from '@/db/api'
const warehouses = await getAllWarehouses()
```

❌ **不推荐**：
```typescript
const { data } = await supabase.from('warehouses').select('*')
```

### 2. 错误处理

✅ **推荐**：
```typescript
try {
  const result = await createWarehouse(data)
  Taro.showToast({ title: '创建成功', icon: 'success' })
} catch (error) {
  console.error('创建失败:', error)
  Taro.showToast({ title: '创建失败', icon: 'error' })
}
```

### 3. 数据验证

✅ **推荐**：
```typescript
if (!data.name || !data.phone) {
  Taro.showToast({ title: '请填写必填项', icon: 'none' })
  return
}

await createProfile(data)
```

### 4. 使用 TypeScript 类型

✅ **推荐**：
```typescript
import type { Warehouse, Profile, Vehicle } from '@/db/types'

const warehouse: Warehouse = {
  id: '...',
  name: '北京仓库',
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
}
```

---

## 相关文档

- [用户手册](./USER_MANUAL.md)
- [开发者指南](./DEVELOPER_GUIDE.md)
- [数据库架构](./DATABASE_ARCHITECTURE.md)
- [权限系统](./PERMISSION_SYSTEM.md)

---

## 更新日志

### 2025-11-27
- 创建完整的 API 参考文档
- 添加所有主要功能的 API 说明
- 添加错误处理和最佳实践指南
