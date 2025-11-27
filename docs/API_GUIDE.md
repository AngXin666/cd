# API 使用指南

## 概述

本文档介绍车队管家小程序的数据库 API 使用方法。系统采用物理隔离架构，每个租户拥有独立的数据库 Schema，无需在代码中手动添加 `boss_id` 过滤条件。

## 核心原则

### ✅ 推荐做法
```typescript
// 直接查询，物理隔离自动生效
const { data } = await supabase.from('warehouses').select('*')
```

### ❌ 避免做法
```typescript
// 不需要手动添加 boss_id 过滤
const { data } = await supabase
  .from('warehouses')
  .select('*')
  .eq('boss_id', bossId) // ❌ 不需要
```

## 数据库客户端

### 导入 Supabase 客户端
```typescript
import { supabase } from '@/client/supabase'
```

### 使用数据库 API
所有数据库操作都通过 `src/db/api.ts` 中的函数进行：

```typescript
import {
  getAllWarehouses,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse
} from '@/db/api'
```

## 常用 API 函数

### 仓库管理

#### 获取所有仓库
```typescript
const warehouses = await getAllWarehouses()
```

#### 创建仓库
```typescript
const warehouse = await createWarehouse({
  name: '仓库名称',
  address: '仓库地址',
  capacity: 100
})
```

#### 更新仓库
```typescript
await updateWarehouse(warehouseId, {
  name: '新名称',
  capacity: 150
})
```

#### 删除仓库
```typescript
await deleteWarehouse(warehouseId)
```

### 司机管理

#### 获取所有司机
```typescript
const drivers = await getAllDrivers()
```

#### 创建司机
```typescript
const driver = await createDriver({
  name: '司机姓名',
  phone: '13800138000',
  license_number: 'A1234567'
})
```

#### 更新司机信息
```typescript
await updateDriver(driverId, {
  name: '新姓名',
  phone: '13900139000'
})
```

#### 删除司机
```typescript
await deleteDriver(driverId)
```

### 车辆管理

#### 获取所有车辆
```typescript
const vehicles = await getAllVehicles()
```

#### 创建车辆
```typescript
const vehicle = await createVehicle({
  plate_number: '京A12345',
  model: '东风天龙',
  driver_id: driverId
})
```

#### 更新车辆信息
```typescript
await updateVehicle(vehicleId, {
  plate_number: '京B67890',
  model: '解放J6'
})
```

#### 删除车辆
```typescript
await deleteVehicle(vehicleId)
```

### 请假管理

#### 获取所有请假申请
```typescript
const leaves = await getAllLeaves()
```

#### 创建请假申请
```typescript
const leave = await createLeave({
  driver_id: driverId,
  start_date: '2025-11-10',
  end_date: '2025-11-12',
  reason: '家中有事'
})
```

#### 审批请假
```typescript
await approveLeave(leaveId, {
  status: 'approved',
  reviewer_comment: '同意'
})
```

#### 拒绝请假
```typescript
await rejectLeave(leaveId, {
  status: 'rejected',
  reviewer_comment: '人手不足，不予批准'
})
```

### 通知管理

#### 获取所有通知
```typescript
const notifications = await getAllNotifications()
```

#### 创建通知
```typescript
const notification = await createNotification({
  title: '通知标题',
  content: '通知内容',
  type: 'system',
  target_users: [userId1, userId2]
})
```

#### 标记通知为已读
```typescript
await markNotificationAsRead(notificationId)
```

#### 删除通知
```typescript
await deleteNotification(notificationId)
```

## 错误处理

所有 API 函数都会返回数据或抛出错误。建议使用 try-catch 进行错误处理：

```typescript
try {
  const warehouses = await getAllWarehouses()
  // 处理数据
} catch (error) {
  console.error('获取仓库列表失败:', error)
  Taro.showToast({
    title: '获取数据失败',
    icon: 'none'
  })
}
```

## 数据类型

所有数据类型定义在 `src/db/types.ts` 中：

```typescript
import type {
  Warehouse,
  Driver,
  Vehicle,
  Leave,
  Notification
} from '@/db/types'
```

### 示例类型定义

```typescript
interface Warehouse {
  id: string
  name: string
  address: string
  capacity: number
  created_at: string
  updated_at: string
}

interface Driver {
  id: string
  name: string
  phone: string
  license_number: string
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}

interface Vehicle {
  id: string
  plate_number: string
  model: string
  driver_id: string | null
  status: 'available' | 'in_use' | 'maintenance'
  created_at: string
  updated_at: string
}
```

## 最佳实践

### 1. 使用封装的 API 函数
始终使用 `src/db/api.ts` 中的函数，而不是直接调用 Supabase 客户端：

```typescript
// ✅ 推荐
const warehouses = await getAllWarehouses()

// ❌ 不推荐
const { data } = await supabase.from('warehouses').select('*')
```

### 2. 类型安全
使用 TypeScript 类型确保数据安全：

```typescript
import type { Warehouse } from '@/db/types'

const warehouse: Warehouse = await createWarehouse({
  name: '仓库A',
  address: '北京市朝阳区',
  capacity: 100
})
```

### 3. 错误处理
始终处理可能的错误：

```typescript
try {
  const result = await createWarehouse(data)
  Taro.showToast({ title: '创建成功', icon: 'success' })
} catch (error) {
  console.error('创建失败:', error)
  Taro.showToast({ title: '创建失败', icon: 'none' })
}
```

### 4. 数据验证
在调用 API 之前验证数据：

```typescript
if (!name || !address) {
  Taro.showToast({ title: '请填写完整信息', icon: 'none' })
  return
}

await createWarehouse({ name, address, capacity })
```

## 权限控制

系统使用 Row Level Security (RLS) 策略进行权限控制：

- **司机**：只能查看和修改自己的数据
- **管理员**：可以查看和修改所有数据
- **超级管理员**：拥有完全控制权限

权限检查在数据库层面自动进行，无需在代码中手动检查。

## 性能优化

### 1. 使用 select 指定字段
```typescript
// ✅ 只查询需要的字段
const { data } = await supabase
  .from('warehouses')
  .select('id, name, address')

// ❌ 查询所有字段
const { data } = await supabase
  .from('warehouses')
  .select('*')
```

### 2. 使用分页
```typescript
const { data } = await supabase
  .from('warehouses')
  .select('*')
  .range(0, 9) // 获取前 10 条
```

### 3. 使用索引
数据库已为常用查询字段创建索引，无需额外配置。

## 常见问题

### Q: 为什么不需要 boss_id 过滤？
A: 系统采用物理隔离架构，每个租户拥有独立的数据库 Schema，查询自动限制在当前租户的数据范围内。

### Q: 如何切换租户？
A: 系统根据登录用户自动确定租户，无需手动切换。

### Q: 如何处理跨租户数据？
A: 物理隔离架构不支持跨租户数据访问，这是设计上的安全特性。

### Q: 如何备份数据？
A: 每个租户的数据在独立的 Schema 中，可以单独备份和恢复。

## 相关文档

- [数据库架构](../supabase/migrations/README.md) - 数据库表结构和迁移
- [类型定义](../src/db/types.ts) - TypeScript 类型定义
- [API 实现](../src/db/api.ts) - API 函数实现
- [物理隔离架构指南](TENANT_ISOLATION_GUIDE.md) - 架构详细说明

## 更新日志

### 2025-11-05
- ✅ 完成 boss_id 删除工作
- ✅ 简化所有 API 函数
- ✅ 更新文档和示例代码
