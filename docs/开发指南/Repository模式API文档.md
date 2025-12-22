# Repository 模式 API 文档

## 概述

Repository 模式是本项目数据访问层的核心架构，提供统一的 CRUD 操作和缓存管理功能。所有数据库访问都应通过 Repository 层进行，以确保缓存一致性和代码可维护性。

### 架构层次

```
页面组件 → Hooks → API 层 → Repository 层 → 缓存层 → Supabase
```

### 核心优势

- **统一的数据访问接口**：所有 Repository 继承自 BaseRepository，提供一致的 CRUD 操作
- **内置缓存管理**：自动处理缓存读取、写入和失效
- **类型安全**：完整的 TypeScript 类型支持
- **日志记录**：内置日志记录，便于调试和监控
- **事件驱动**：支持事件驱动的缓存失效机制

## 可用的 Repository

| Repository | 表名 | 缓存前缀 | TTL | 说明 |
|------------|------|----------|-----|------|
| `usersRepository` | users | users | 5 分钟 | 用户信息 |
| `attendanceRepository` | attendance | attendance | 2 分钟 | 考勤记录 |
| `pieceWorkRepository` | piece_work_records | piece_work | 2 分钟 | 计件记录 |
| `warehousesRepository` | warehouses | warehouses | 10 分钟 | 仓库信息 |
| `warehouseAssignmentsRepository` | warehouse_assignments | warehouse_assignments | 5 分钟 | 仓库分配 |
| `notificationsRepository` | notifications | notifications | 1 分钟 | 通知消息 |
| `vehiclesRepository` | vehicles | vehicles | 5 分钟 | 车辆信息 |
| `driverLicensesRepository` | driver_licenses | driver_licenses | 5 分钟 | 驾驶证信息 |
| `categoryPricesRepository` | category_prices | category_prices | 5 分钟 | 品类价格 |
| `leaveRepository` | leave_applications | leave | 2 分钟 | 请假申请 |
| `resignationApplicationsRepository` | resignation_applications | resignation | 2 分钟 | 离职申请 |
| `categoriesRepository` | piece_work_categories | categories | 10 分钟 | 计件品类 |
| `dashboardRepository` | - | dashboard | 5 分钟 | 仪表板数据 |
| `statsRepository` | - | stats | 5 分钟 | 统计数据 |

## 基础用法

### 导入 Repository

```typescript
import {
  usersRepository,
  attendanceRepository,
  warehousesRepository,
  notificationsRepository
} from '@/db/repositories'
```

### 基本 CRUD 操作

#### 查询单条记录

```typescript
// 根据 ID 获取记录
const user = await usersRepository.getById('user-123')

// 使用查询选项
const user = await usersRepository.getById('user-123', {
  useCache: false,  // 不使用缓存
  cacheTTL: 60000   // 自定义缓存时间（毫秒）
})
```

#### 查询所有记录

```typescript
// 获取所有记录（使用默认缓存）
const users = await usersRepository.getAll()

// 带排序和分页
const users = await usersRepository.getAll({
  orderBy: 'created_at',
  orderDirection: 'desc',
  limit: 20,
  offset: 0
})
```

#### 条件查询

```typescript
// 根据条件查询多条记录
const activeUsers = await usersRepository.findBy({ status: 'active' })

// 根据条件查询单条记录
const user = await usersRepository.findOneBy({ email: 'test@example.com' })
```

#### 创建记录

```typescript
const newUser = await usersRepository.create({
  name: '张三',
  email: 'zhangsan@example.com',
  role: 'driver'
})
// 创建成功后自动清除相关缓存
```

#### 更新记录

```typescript
const updatedUser = await usersRepository.update('user-123', {
  name: '李四'
})
// 更新成功后自动清除相关缓存
```

#### 删除记录

```typescript
const success = await usersRepository.delete('user-123')
// 删除成功后自动清除相关缓存
```

### 批量操作

```typescript
// 批量创建
const newUsers = await usersRepository.createMany([
  { name: '张三', email: 'zhangsan@example.com' },
  { name: '李四', email: 'lisi@example.com' }
])

// 批量删除
const success = await usersRepository.deleteMany(['user-1', 'user-2'])
```

### 统计和检查

```typescript
// 统计记录数量
const total = await usersRepository.count()
const activeCount = await usersRepository.count({ status: 'active' })

// 检查记录是否存在
const exists = await usersRepository.exists('user-123')
```

## 缓存管理

### 缓存配置

每个 Repository 在创建时配置缓存参数：

```typescript
class AttendanceRepository extends BaseRepository<AttendanceEntity> {
  constructor() {
    super({
      tableName: 'attendance',
      cachePrefix: 'attendance',
      defaultTTL: 2 * 60 * 1000,  // 2 分钟
      enableCache: true           // 启用缓存
    })
  }
}
```

### 缓存失效机制

#### 1. 自动失效（写操作后）

所有写操作（create、update、delete）成功后会自动清除相关缓存：

```typescript
// 更新用户后，用户相关的所有缓存自动失效
await usersRepository.update('user-123', { name: '新名字' })
// 下次查询会从数据库获取最新数据
```

#### 2. 手动清除缓存

```typescript
// 清除该 Repository 的所有缓存
usersRepository.clearAllCache()

// 清除特定 key 的缓存
usersRepository.clearCacheByKey('id_user-123')

// 清除特定用户相关的缓存
notificationsRepository.clearCacheByUser('user-123')
```

#### 3. 事件驱动缓存失效

通过 eventBus 订阅数据变更事件，自动清除相关缓存：

```typescript
import { initCacheEventSubscriber } from '@/db/repositories'

// 初始化事件订阅（应用启动时调用）
initCacheEventSubscriber()
```

事件与缓存的映射关系：

| 事件类型 | 清除的缓存 |
|---------|-----------|
| `attendance:updated` | attendance |
| `piece_work:updated` | piece_work |
| `warehouse:updated` | warehouses, warehouse_assignments |
| `notification:created` | notifications |
| `vehicle:updated` | vehicles |
| `leave:updated` | leave |

### 缓存统计

```typescript
// 获取缓存统计信息
const stats = usersRepository.getCacheStats()
console.log(`命中率: ${(stats.hitRate * 100).toFixed(2)}%`)
console.log(`命中次数: ${stats.hits}`)
console.log(`未命中次数: ${stats.misses}`)

// 重置统计信息
usersRepository.resetCacheStats()
```

## 特定 Repository API

### AttendanceRepository

```typescript
import { attendanceRepository } from '@/db/repositories'

// 获取用户今日考勤
const today = await attendanceRepository.getTodayAttendance('user-123')

// 获取用户月度考勤
const monthly = await attendanceRepository.getMonthlyAttendance('user-123', 2024, 12)

// 获取考勤统计
const stats = await attendanceRepository.getAttendanceStats('user-123', '2024-12-01', '2024-12-31')
```

### PieceWorkRepository

```typescript
import { pieceWorkRepository } from '@/db/repositories'

// 获取用户计件记录
const records = await pieceWorkRepository.getByUser('user-123', '2024-12-01', '2024-12-31')

// 获取仓库计件记录
const warehouseRecords = await pieceWorkRepository.getByWarehouse('warehouse-123')
```

### WarehousesRepository

```typescript
import { warehousesRepository } from '@/db/repositories'

// 获取所有仓库
const warehouses = await warehousesRepository.getAllWarehouses()

// 获取司机的仓库列表
const driverWarehouses = await warehousesRepository.getDriverWarehouses('driver-123')

// 获取管理员的仓库列表
const managerWarehouses = await warehousesRepository.getManagerWarehouses('manager-123')
```

### NotificationsRepository

```typescript
import { notificationsRepository } from '@/db/repositories'

// 获取用户通知
const notifications = await notificationsRepository.getByUser('user-123', 20)

// 获取未读通知数量
const unreadCount = await notificationsRepository.getUnreadCount('user-123')

// 标记通知为已读
await notificationsRepository.markAsRead('notification-123')

// 标记所有通知为已读
await notificationsRepository.markAllAsRead('user-123')
```

### VehiclesRepository

```typescript
import { vehiclesRepository } from '@/db/repositories'

// 获取司机的车辆
const vehicles = await vehiclesRepository.getByDriverId('driver-123')

// 获取车辆详情（包含司机信息）
const vehicleWithDriver = await vehiclesRepository.getWithDriverDetails('vehicle-123')

// 获取所有车辆（包含司机信息）
const allVehicles = await vehiclesRepository.getAllWithDrivers()
```

### UsersRepository

```typescript
import { usersRepository, convertUserToProfile } from '@/db/repositories'

// 获取所有用户
const users = await usersRepository.getAllUsers()

// 按角色获取用户
const drivers = await usersRepository.getByRole('DRIVER')
const managers = await usersRepository.getByRole('MANAGER')

// 获取用户角色
const role = await usersRepository.getRole('user-123')

// 转换为 Profile 格式（兼容旧代码）
const profile = convertUserToProfile(user)
```

## 查询选项

所有查询方法都支持 `QueryOptions` 参数：

```typescript
interface QueryOptions {
  /** 是否使用缓存，默认 true */
  useCache?: boolean
  /** 自定义缓存 TTL（毫秒） */
  cacheTTL?: number
  /** 排序字段 */
  orderBy?: string
  /** 排序方向 */
  orderDirection?: 'asc' | 'desc'
  /** 查询限制数量 */
  limit?: number
  /** 查询偏移量 */
  offset?: number
}
```

使用示例：

```typescript
const users = await usersRepository.getAll({
  useCache: true,
  cacheTTL: 10 * 60 * 1000,  // 10 分钟
  orderBy: 'created_at',
  orderDirection: 'desc',
  limit: 50,
  offset: 0
})
```

## 错误处理

Repository 方法在发生错误时会：
1. 记录错误日志
2. 返回 `null`（单条记录）或空数组（多条记录）
3. 不抛出异常（除非是严重错误）

```typescript
const user = await usersRepository.getById('invalid-id')
if (!user) {
  // 处理用户不存在的情况
  console.log('用户不存在')
}
```

## 最佳实践

### 1. 始终使用 Repository 访问数据

```typescript
// ✅ 正确：使用 Repository
const users = await usersRepository.getAll()

// ❌ 错误：直接使用 Supabase
const { data } = await supabase.from('users').select('*')
```

### 2. 写操作后不需要手动清除缓存

```typescript
// ✅ 正确：Repository 会自动清除缓存
await usersRepository.update('user-123', { name: '新名字' })

// ❌ 不必要：手动清除缓存
await usersRepository.update('user-123', { name: '新名字' })
usersRepository.clearAllCache()  // 不需要，已自动清除
```

### 3. 合理使用缓存选项

```typescript
// 对于实时性要求高的数据，禁用缓存
const latestNotifications = await notificationsRepository.getByUser('user-123', 10, {
  useCache: false
})

// 对于变化不频繁的数据，使用较长的缓存时间
const warehouses = await warehousesRepository.getAllWarehouses({
  cacheTTL: 30 * 60 * 1000  // 30 分钟
})
```

### 4. 使用事件驱动缓存失效

```typescript
import { eventBus } from '@/utils/eventBus'

// 在数据变更后发布事件
await someApiFunction()
eventBus.publish('warehouse:updated', { warehouseId: 'warehouse-123' })
```

## 相关文档

- [Repository 使用指南](./Repository使用指南.md)
- [Realtime 缓存失效文档](./Realtime缓存失效文档.md)
- [全局缓存系统使用指南](./全局缓存系统使用指南.md)
