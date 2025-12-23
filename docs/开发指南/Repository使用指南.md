# Repository 使用指南

## 概述

本指南介绍如何在项目中使用 Repository 模式进行数据访问，包括如何创建新的 Repository、配置缓存以及最佳实践。

## 目录

1. [如何创建新的 Repository](#如何创建新的-repository)
2. [如何配置缓存](#如何配置缓存)
3. [最佳实践](#最佳实践)
4. [常见问题](#常见问题)

---

## 如何创建新的 Repository

### 步骤 1：定义实体类型

首先，在 `src/db/types.ts` 或 Repository 文件中定义实体类型：

```typescript
/**
 * 订单实体类型
 */
export interface OrderEntity {
  id: string
  user_id: string
  warehouse_id: string
  status: 'pending' | 'processing' | 'completed' | 'cancelled'
  total_amount: number
  created_at: string
  updated_at: string
}
```

### 步骤 2：创建 Repository 类

在 `src/db/repositories/` 目录下创建新的 Repository 文件：

```typescript
/**
 * 订单 Repository
 * 提供订单数据的 CRUD 操作和缓存管理
 *
 * @module db/repositories/OrdersRepository
 */

import { BaseRepository, type QueryOptions } from './BaseRepository'

/**
 * 订单实体类型
 */
interface OrderEntity {
  id: string
  user_id: string
  warehouse_id: string
  status: 'pending' | 'processing' | 'completed' | 'cancelled'
  total_amount: number
  created_at: string
  updated_at: string
}

/**
 * 订单 Repository 类
 * 继承 BaseRepository，提供订单特定的查询方法
 */
export class OrdersRepository extends BaseRepository<OrderEntity> {
  constructor() {
    super({
      tableName: 'orders',           // 数据库表名
      cachePrefix: 'orders',         // 缓存键前缀
      defaultTTL: 5 * 60 * 1000,     // 默认缓存 5 分钟
      enableCache: true              // 启用缓存
    })
  }

  // ==================== 自定义查询方法 ====================

  /**
   * 获取用户的订单列表
   *
   * @param userId - 用户 ID
   * @param options - 查询选项
   * @returns 订单列表
   */
  async getByUserId(userId: string, options: QueryOptions = {}): Promise<OrderEntity[]> {
    const { useCache = true, cacheTTL } = options
    const cacheKey = this.getCacheKey(`user_${userId}`)

    // 尝试从缓存获取
    if (useCache) {
      const cached = this.getFromCache<OrderEntity[]>(cacheKey)
      if (cached) {
        return cached
      }
    }

    // 从数据库查询
    this.logger.debug('查询用户订单', { userId })
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      this.logger.error('查询用户订单失败', { userId, error: error.message })
      return []
    }

    const result = Array.isArray(data) ? data : []

    // 缓存结果
    if (useCache) {
      this.setToCache(cacheKey, result, cacheTTL)
    }

    return result as OrderEntity[]
  }

  /**
   * 获取仓库的订单列表
   *
   * @param warehouseId - 仓库 ID
   * @param status - 可选的状态过滤
   * @returns 订单列表
   */
  async getByWarehouseId(
    warehouseId: string,
    status?: OrderEntity['status']
  ): Promise<OrderEntity[]> {
    const cacheKey = this.getCacheKey(`warehouse_${warehouseId}_${status || 'all'}`)

    // 尝试从缓存获取
    const cached = this.getFromCache<OrderEntity[]>(cacheKey)
    if (cached) {
      return cached
    }

    // 构建查询
    let query = this.supabase
      .from(this.tableName)
      .select('*')
      .eq('warehouse_id', warehouseId)

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) {
      this.logger.error('查询仓库订单失败', { warehouseId, error: error.message })
      return []
    }

    const result = Array.isArray(data) ? data : []
    this.setToCache(cacheKey, result)

    return result as OrderEntity[]
  }

  /**
   * 更新订单状态
   *
   * @param orderId - 订单 ID
   * @param status - 新状态
   * @returns 更新后的订单
   */
  async updateStatus(
    orderId: string,
    status: OrderEntity['status']
  ): Promise<OrderEntity | null> {
    return this.update(orderId, { status })
  }
}

// ==================== 单例导出 ====================

/**
 * OrdersRepository 单例实例
 */
export const ordersRepository = new OrdersRepository()
```

### 步骤 3：在 index.ts 中导出

更新 `src/db/repositories/index.ts`：

```typescript
// 导出 OrdersRepository
export { OrdersRepository, ordersRepository } from './OrdersRepository'
```

### 步骤 4：创建 API 层函数（可选）

如果需要在 API 层提供更高级的封装，在 `src/db/api/` 目录下创建：

```typescript
/**
 * 订单 API 函数
 * 提供订单相关的业务逻辑封装
 *
 * @module db/api/orders
 */

import { ordersRepository } from '@/db/repositories'
import { eventBus } from '@/utils/eventBus'

/**
 * 获取用户订单列表
 */
export async function getUserOrders(userId: string) {
  return ordersRepository.getByUserId(userId)
}

/**
 * 创建新订单
 */
export async function createOrder(orderData: {
  user_id: string
  warehouse_id: string
  total_amount: number
}) {
  const order = await ordersRepository.create({
    ...orderData,
    status: 'pending'
  })

  if (order) {
    // 发布事件通知
    eventBus.publish('order:created', { orderId: order.id })
  }

  return order
}

/**
 * 更新订单状态
 */
export async function updateOrderStatus(
  orderId: string,
  status: 'processing' | 'completed' | 'cancelled'
) {
  const order = await ordersRepository.updateStatus(orderId, status)

  if (order) {
    eventBus.publish('order:updated', { orderId, status })
  }

  return order
}
```

---

## 统一数据获取模式

### 仓库-司机关系获取（推荐模式）

当需要获取仓库与司机的关联关系时，使用以下统一模式：

```typescript
/**
 * 加载数据并构建仓库-司机映射
 */
const loadData = async () => {
  // 1. 获取所有仓库-司机分配关系
  const allDriverWarehouses = await WarehousesAPI.getAllDriverWarehouses()

  // 2. 构建 warehouseDriversMap 映射（仓库 → 司机列表）
  const warehouseDriversMapping = new Map<string, string[]>()
  for (const assignment of allDriverWarehouses) {
    if (!warehouseDriversMapping.has(assignment.warehouse_id)) {
      warehouseDriversMapping.set(assignment.warehouse_id, [])
    }
    warehouseDriversMapping.get(assignment.warehouse_id)!.push(assignment.user_id)
  }
  setWarehouseDriversMap(warehouseDriversMapping)

  // 3. 获取其他数据...
}

/**
 * 按仓库筛选司机
 */
const getDriversByWarehouse = (warehouseId: string) => {
  const assignedDriverIds = warehouseDriversMap.get(warehouseId) || []
  return drivers.filter(d => assignedDriverIds.includes(d.id))
}
```

#### 使用此模式的页面

| 页面 | 用途 |
|------|------|
| `super-admin/leave-approval` | 按仓库筛选请假司机 |
| `super-admin/piece-work-report` | 按仓库筛选计件司机 |
| `super-admin/user-management` | 显示用户关联的仓库 |
| `manager/piece-work-report` | 按仓库筛选计件司机 |

---

## 各角色数据获取规范

### 仓库列表获取

根据用户角色使用不同的 API 获取仓库列表：

| 角色 | API 方法 | 说明 |
|------|---------|------|
| BOSS (super-admin) | `WarehousesAPI.getAllWarehouses()` | 获取所有仓库 |
| MANAGER | `WarehousesAPI.getManagerWarehouses(userId)` | 获取管理员负责的仓库 |
| DRIVER | `WarehousesAPI.getDriverWarehouses(userId)` | 获取司机分配的仓库 |

```typescript
// BOSS 角色示例
const loadWarehousesForBoss = async () => {
  const warehouses = await WarehousesAPI.getAllWarehouses()
  // 或使用 getAllWarehousesWithRules() 获取含规则的仓库
  setWarehouses(warehouses)
}

// MANAGER 角色示例
const loadWarehousesForManager = async (userId: string) => {
  const warehouses = await WarehousesAPI.getManagerWarehouses(userId)
  setWarehouses(warehouses)
}

// DRIVER 角色示例
const loadWarehousesForDriver = async (userId: string) => {
  const warehouses = await WarehousesAPI.getDriverWarehouses(userId)
  setWarehouses(warehouses)
}
```

### 司机列表获取

根据使用场景选择合适的 API：

| 场景 | API 方法 | 说明 |
|------|---------|------|
| 获取所有司机 | `UsersAPI.getDriverProfiles()` | 基本司机信息 |
| 获取司机含实名 | `UsersAPI.getAllDriversWithRealName()` | 包含驾驶证实名信息 |
| 获取特定仓库司机 | `WarehousesAPI.getDriversByWarehouse(warehouseId)` | 按仓库筛选 |
| 获取所有用户 | `UsersAPI.getAllProfiles()` | 所有角色用户 |

```typescript
// 获取所有司机（基本信息）
const loadDrivers = async () => {
  const drivers = await UsersAPI.getDriverProfiles()
  setDrivers(drivers)
}

// 获取司机含实名信息（用于显示真实姓名）
const loadDriversWithRealName = async () => {
  const drivers = await UsersAPI.getAllDriversWithRealName()
  setDrivers(drivers)
}

// 获取特定仓库的司机
const loadWarehouseDrivers = async (warehouseId: string) => {
  const drivers = await WarehousesAPI.getDriversByWarehouse(warehouseId)
  setDrivers(drivers)
}
```

### 当前用户信息获取

| 场景 | 方法 | 说明 |
|------|------|------|
| 基本认证信息 | `useAuth()` Hook | 来自 Supabase Auth |
| 完整用户信息 | `useUserContext()` Hook | 包含 role, name, phone 等 |
| 用户档案 | `UsersAPI.getCurrentUserProfile()` | 获取当前用户档案 |
| 用户档案含实名 | `UsersAPI.getCurrentUserWithRealName()` | 包含驾驶证实名 |
| 用户权限 | `UsersAPI.getCurrentUserPermissions()` | 获取权限配置 |

```typescript
// 在组件中获取当前用户
const MyComponent = () => {
  const { user } = useAuth()           // 基本认证信息
  const { userInfo } = useUserContext() // 完整用户信息
  
  // 根据角色加载数据
  useEffect(() => {
    if (userInfo?.role === 'BOSS') {
      loadDataForBoss()
    } else if (userInfo?.role === 'MANAGER') {
      loadDataForManager(user.id)
    } else if (userInfo?.role === 'DRIVER') {
      loadDataForDriver(user.id)
    }
  }, [userInfo])
}
```

---

## Repository 缓存 TTL 配置参考

| Repository | TTL | 说明 |
|------------|-----|------|
| WarehousesRepository | 10 分钟 | 仓库信息变化不频繁 |
| WarehouseAssignmentsRepository | 5 分钟 | 仓库分配关系 |
| UsersRepository | 5 分钟 | 用户信息 |
| VehiclesRepository | 5 分钟 | 车辆信息 |
| CategoriesRepository | 10 分钟 | 品类信息 |
| AttendanceRepository | 2 分钟 | 考勤记录变化频繁 |
| PieceWorkRepository | 2 分钟 | 计件记录变化频繁 |
| LeaveRepository | 2 分钟 | 请假申请变化频繁 |
| NotificationsRepository | 1 分钟 | 通知需要及时更新 |

---

## 如何配置缓存

### 缓存配置选项

在创建 Repository 时，可以配置以下缓存选项：

```typescript
super({
  tableName: 'orders',
  cachePrefix: 'orders',
  defaultTTL: 5 * 60 * 1000,  // 默认缓存时间（毫秒）
  enableCache: true           // 是否启用缓存
})
```

### 缓存时间建议

根据数据的更新频率选择合适的 TTL：

| 数据类型 | 建议 TTL | 原因 |
|---------|---------|------|
| 用户信息 | 5 分钟 | 变化不频繁 |
| 仓库信息 | 10 分钟 | 很少变化 |
| 考勤记录 | 2 分钟 | 需要较新数据 |
| 计件记录 | 2 分钟 | 需要较新数据 |
| 通知消息 | 1 分钟 | 实时性要求高 |
| 配置信息 | 30 分钟 | 几乎不变 |

### 查询时自定义缓存

```typescript
// 使用默认缓存
const orders = await ordersRepository.getByUserId('user-123')

// 禁用缓存（获取最新数据）
const orders = await ordersRepository.getByUserId('user-123', {
  useCache: false
})

// 自定义缓存时间
const orders = await ordersRepository.getByUserId('user-123', {
  cacheTTL: 10 * 60 * 1000  // 10 分钟
})
```

### 手动管理缓存

```typescript
// 清除该 Repository 的所有缓存
ordersRepository.clearAllCache()

// 清除特定 key 的缓存
ordersRepository.clearCacheByKey('user_user-123')

// 清除特定用户相关的缓存
ordersRepository.clearCacheByUser('user-123')
```

### 事件驱动缓存失效

配置事件与缓存的映射关系，在 `CacheEventSubscriber.ts` 中添加：

```typescript
// 在 EVENT_CACHE_MAPPING 中添加
'order:created': ['orders'],
'order:updated': ['orders'],
```

---

## 最佳实践

### 🚨 重要：不要使用页面级缓存

> **强制规则**：所有缓存必须由 Repository 层统一管理，页面组件不应该实现自己的缓存逻辑！

#### 为什么不要使用页面级缓存？

1. **缓存不一致**：页面级缓存和 Repository 缓存可能存储不同版本的数据
2. **重复缓存**：同一数据被缓存两次，浪费内存
3. **失效困难**：数据更新时需要同时清除多处缓存
4. **维护复杂**：每个页面都有自己的缓存逻辑，难以统一管理

#### 错误示例（不要这样做）

```typescript
// ❌ 错误：在页面中实现自己的缓存
import { getVersionedCache, setVersionedCache } from '@/utils/cache'

const loadData = async () => {
  // 不要这样做！
  const cached = getVersionedCache('page_data_key')
  if (cached) {
    setData(cached)
    return
  }
  
  const data = await SomeAPI.getData()
  setVersionedCache('page_data_key', data)
  setData(data)
}
```

#### 正确示例

```typescript
// ✅ 正确：直接调用 API，让 Repository 层管理缓存
const loadData = async () => {
  const data = await SomeAPI.getData()  // Repository 层已有缓存
  setData(data)
}

// ✅ 正确：需要强制刷新时，使用 useCache: false
const handleRefresh = async () => {
  const data = await SomeAPI.getData({ useCache: false })
  setData(data)
}
```

#### 已移除页面级缓存的页面

以下页面已完成页面级缓存移除，可作为参考：
- `super-admin/user-management` - 用户管理
- `manager/piece-work-report` - 件数报表
- `manager/driver-management` - 司机管理
- `driver/vehicle-list` - 车辆列表

---

### 1. 始终使用 Repository 访问数据

```typescript
// ✅ 正确
const users = await usersRepository.getAll()

// ❌ 错误
const { data } = await supabase.from('users').select('*')
```

### 2. 在 API 层封装业务逻辑

```typescript
// ✅ 正确：API 层处理业务逻辑
export async function createOrderWithNotification(orderData) {
  const order = await ordersRepository.create(orderData)
  if (order) {
    await notificationsRepository.create({
      recipient_id: orderData.user_id,
      type: 'order_created',
      content: `订单 ${order.id} 已创建`
    })
  }
  return order
}

// ❌ 错误：在页面组件中直接处理
const handleCreateOrder = async () => {
  const order = await ordersRepository.create(orderData)
  await notificationsRepository.create(...)  // 不应该在组件中
}
```

### 3. 合理使用缓存

```typescript
// ✅ 正确：对于实时性要求高的数据，禁用缓存
const latestNotifications = await notificationsRepository.getByUser(userId, {
  useCache: false
})

// ✅ 正确：对于变化不频繁的数据，使用较长缓存
const warehouses = await warehousesRepository.getAllWarehouses({
  cacheTTL: 30 * 60 * 1000
})
```

### 4. 写操作后发布事件

```typescript
// ✅ 正确：写操作后发布事件，触发相关缓存失效
export async function updateWarehouse(id: string, data: Partial<Warehouse>) {
  const result = await warehousesRepository.update(id, data)
  if (result) {
    eventBus.publish('warehouse:updated', { warehouseId: id })
  }
  return result
}
```

### 5. 使用类型安全

```typescript
// ✅ 正确：定义明确的类型
interface OrderEntity {
  id: string
  status: 'pending' | 'processing' | 'completed'
}

// ✅ 正确：使用泛型
class OrdersRepository extends BaseRepository<OrderEntity> {
  // ...
}
```

### 6. 添加完整的日志

```typescript
// ✅ 正确：使用 logger 记录关键操作
async getByUserId(userId: string): Promise<OrderEntity[]> {
  this.logger.debug('查询用户订单', { userId })
  
  const { data, error } = await this.supabase
    .from(this.tableName)
    .select('*')
    .eq('user_id', userId)

  if (error) {
    this.logger.error('查询用户订单失败', { userId, error: error.message })
    return []
  }

  this.logger.debug('查询完成', { count: data?.length })
  return data as OrderEntity[]
}
```

### 7. 处理错误情况

```typescript
// ✅ 正确：优雅处理错误
const user = await usersRepository.getById('user-123')
if (!user) {
  // 处理用户不存在的情况
  showToast({ title: '用户不存在', icon: 'error' })
  return
}

// ❌ 错误：假设数据一定存在
const user = await usersRepository.getById('user-123')
console.log(user.name)  // 可能报错
```

---

## 常见问题

### Q1: 什么时候应该禁用缓存？

**A**: 以下情况建议禁用缓存：
- 需要获取最新数据（如刷新操作）
- 数据变化非常频繁
- 对数据实时性要求极高

```typescript
// 刷新时禁用缓存
const handleRefresh = async () => {
  const data = await repository.getAll({ useCache: false })
}
```

### Q2: 如何处理跨 Repository 的缓存失效？

**A**: 使用事件驱动机制：

```typescript
// 1. 在 CacheEventSubscriber.ts 中配置映射
'warehouse:updated': ['warehouses', 'warehouse_assignments']

// 2. 在写操作后发布事件
eventBus.publish('warehouse:updated', { warehouseId })
```

### Q3: 缓存数据和数据库数据不一致怎么办？

**A**: 
1. 确保所有写操作都通过 Repository 进行
2. 写操作后会自动清除缓存
3. 如果仍有问题，可以手动清除缓存：

```typescript
repository.clearAllCache()
```

### Q4: 如何调试缓存问题？

**A**: 
1. 查看控制台日志（Repository 会记录缓存命中/未命中）
2. 使用缓存统计：

```typescript
const stats = repository.getCacheStats()
console.log(`命中率: ${(stats.hitRate * 100).toFixed(2)}%`)
```

### Q5: 如何在测试中模拟 Repository？

**A**: 使用 Jest mock：

```typescript
jest.mock('@/db/repositories', () => ({
  usersRepository: {
    getById: jest.fn().mockResolvedValue({ id: 'user-123', name: '测试用户' }),
    getAll: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockResolvedValue({ id: 'new-user' }),
  }
}))
```

---

## 相关文档

- [Repository 模式 API 文档](./Repository模式API文档.md)
- [Realtime 缓存失效文档](./Realtime缓存失效文档.md)
- [全局缓存系统使用指南](./全局缓存系统使用指南.md)
