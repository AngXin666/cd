# 数据缓存 Hooks 使用指南

## 概述

本项目实现了一套**全局的数据缓存和实时更新系统**，适用于所有数据加载场景。通过使用缓存 Hooks，可以显著提升应用性能和用户体验。

## 核心特性

- ✅ **智能缓存**: 30 分钟长缓存，自动过期管理
- ✅ **实时更新**: 数据变更后自动刷新（Supabase Realtime + 轮询降级）
- ✅ **离线支持**: 网络失败时显示缓存数据
- ✅ **性能优化**: 缓存加载 < 100ms，首次加载 < 2s
- ✅ **多端支持**: H5、微信小程序、Android APP

## 已集成页面

以下页面已成功集成全局缓存系统：

1. **老板端用户管理页面** (`src/pages/super-admin/user-management/index.tsx`)
   - 使用 `useUserListCache` Hook
   - 缓存用户列表、用户详情、仓库分配信息
   - 实时监听 users、warehouse_assignments、vehicles 表

2. **车队长端司机管理页面** (`src/pages/manager/driver-management/index.tsx`)
   - 使用 `useDriverListCache` Hook
   - 自动过滤司机角色
   - 实时监听相关表变更

3. **老板端仓库管理页面** (`src/pages/super-admin/warehouse-management/index.tsx`)
   - 使用 `useWarehousesCache` Hook
   - 缓存仓库基础数据，本地加载详细信息（考勤规则）
   - 实时监听 warehouses 表

4. **老板端车辆管理页面** (`src/pages/super-admin/vehicle-management/index.tsx`)
   - 使用 `useVehiclesCache` Hook
   - 缓存车辆基础数据，本地加载详细信息（司机信息、历史记录）
   - 实时监听 vehicles 表

5. **老板端首页** (`src/pages/super-admin/index.tsx`)
   - 使用 `useWarehousesCache` Hook 缓存仓库列表
   - 使用 `useSuperAdminDashboard` Hook 缓存仪表板数据
   - 使用 `useDriverStats` Hook 缓存司机统计数据
   - 实时监听多个表的变更

6. **车队长端首页** (`src/pages/manager/index.tsx`)
   - 使用 `useWarehousesData` Hook 缓存仓库列表（10分钟缓存）
   - 使用 `useDashboardData` Hook 缓存仪表板数据
   - 使用 `useDriverStats` Hook 缓存司机统计数据
   - 实时监听多个表的变更

7. **司机端车辆列表页面** (`src/pages/driver/vehicle-list/index.tsx`)
   - 使用 `useVehiclesCache(driverId)` Hook
   - 支持管理员查看特定司机的车辆
   - 页面显示时自动刷新缓存
   - 实时监听 vehicles 表变更

## 核心组件

### 1. 缓存管理器 (`cacheManager`)

底层缓存管理器，提供统一的缓存读写接口。

```typescript
import {cacheManager, CACHE_KEYS} from '@/utils/cacheManager'

// 写入缓存
cacheManager.set(CACHE_KEYS.WAREHOUSES, data, 30 * 60 * 1000)

// 读取缓存
const cached = cacheManager.get(CACHE_KEYS.WAREHOUSES)

// 清除缓存
cacheManager.invalidate([CACHE_KEYS.WAREHOUSES])

// 清除所有缓存
cacheManager.clear()
```

### 2. 通用缓存 Hook (`useDataCache`)

通用的数据缓存 Hook，适用于任何数据类型。

```typescript
import {useDataCache} from '@/hooks/useDataCache'

const {data, loading, error, fromCache, refresh, clearCache} = useDataCache({
  cacheKey: 'my_data',
  loadData: async () => await API.getData(),
  realtimeTables: ['my_table'],
  cacheTTL: 30 * 60 * 1000 // 30 分钟
})
```

## 专用 Hooks

### 用户列表缓存 (`useUserListCache`)

**适用场景**: 老板端用户管理页面

```typescript
import {useUserListCache} from '@/hooks/useUserListCache'

const {
  users,                  // 用户列表（所有角色）
  userDetails,            // 用户详情映射
  userWarehouseIdsMap,    // 用户仓库映射
  loading,                // 加载状态
  error,                  // 错误信息
  fromCache,              // 是否来自缓存
  refresh,                // 刷新数据
  clearCache              // 清除缓存
} = useUserListCache()

// 数据变更后刷新
const handleAddUser = async () => {
  await UsersAPI.createUser(...)
  clearCache()
  await refresh()
}
```

### 司机列表缓存 (`useDriverListCache`)

**适用场景**: 车队长端司机管理页面

```typescript
import {useDriverListCache} from '@/hooks/useDriverListCache'

const {
  drivers,                // 司机列表（只包含 DRIVER 角色）
  userDetails,            // 用户详情映射
  userWarehouseIdsMap,    // 用户仓库映射
  loading,                // 加载状态
  error,                  // 错误信息
  fromCache,              // 是否来自缓存
  refresh,                // 刷新数据
  clearCache              // 清除缓存
} = useDriverListCache()

// 添加司机后刷新
const handleAddDriver = async () => {
  await UsersAPI.createUser(...)
  clearCache()
  await refresh()
}
```

### 仓库列表缓存 (`useWarehousesCache`)

```typescript
import {useWarehousesCache} from '@/hooks/useWarehousesCache'

const {data: warehouses, loading, refresh, clearCache} = useWarehousesCache()

// 添加仓库后刷新
const handleAddWarehouse = async () => {
  await WarehousesAPI.createWarehouse(...)
  clearCache()
  await refresh()
}
```

### 车辆列表缓存 (`useVehiclesCache`)

```typescript
import {useVehiclesCache} from '@/hooks/useVehiclesCache'

// 获取所有车辆
const {data: vehicles, loading} = useVehiclesCache()

// 获取特定司机的车辆
const {data: driverVehicles} = useVehiclesCache('driver-id-123')
```

### 仪表板数据缓存 (`useDashboardCache`)

```typescript
import {useDashboardCache} from '@/hooks/useDashboardCache'

const {data: dashboardStats, loading, refresh} = useDashboardCache({
  warehouseId: 'warehouse-123',
  loadData: async () => await StatsAPI.getDashboardStats('warehouse-123')
})
```

## 使用模式

### 模式 1：基本使用

```typescript
function MyComponent() {
  const {data, loading, error} = useDataCache({
    cacheKey: 'my_data',
    loadData: async () => await API.getData()
  })

  if (loading) return <Loading />
  if (error) return <Error message={error.message} />
  
  return <DataList data={data} />
}
```

### 模式 2：数据变更后刷新

```typescript
function UserManagement() {
  const {users, loading, refresh, clearCache} = useUserListCache()

  const handleAddUser = async (userData) => {
    try {
      await UsersAPI.createUser(userData)
      // 清除缓存并刷新
      clearCache()
      await refresh()
      showToast({title: '添加成功', icon: 'success'})
    } catch (error) {
      showToast({title: '添加失败', icon: 'error'})
    }
  }

  return <UserList users={users} onAdd={handleAddUser} />
}
```

### 模式 3：离线模式提示

```typescript
function DataView() {
  const {data, loading, error, fromCache} = useDataCache({
    cacheKey: 'my_data',
    loadData: async () => await API.getData()
  })

  return (
    <View>
      {fromCache && error && (
        <View className="offline-tip">
          显示的是离线数据，请检查网络连接
        </View>
      )}
      <DataList data={data} />
    </View>
  )
}
```

### 模式 4：手动刷新

```typescript
function DataView() {
  const {data, loading, refresh} = useDataCache({
    cacheKey: 'my_data',
    loadData: async () => await API.getData()
  })

  return (
    <View>
      <Button onClick={refresh} loading={loading}>
        刷新
      </Button>
      <DataList data={data} />
    </View>
  )
}
```

## 实时更新

所有缓存 Hooks 都支持实时更新。当数据库数据变更时，会自动清除缓存并重新加载。

### 工作原理

1. **Supabase Realtime**: 优先使用 Realtime 监听数据库变更
2. **轮询降级**: Realtime 失败时自动降级到轮询模式（30 秒间隔）
3. **自动重连**: 定期尝试重新连接 Realtime（5 分钟间隔）

### 监听的表

- `users`: 用户数据变更
- `warehouse_assignments`: 仓库分配变更
- `vehicles`: 车辆数据变更
- `warehouses`: 仓库数据变更
- `attendance`: 考勤数据变更
- `piece_work_records`: 计件数据变更
- `leave_applications`: 请假申请变更

## 性能指标

- **缓存加载时间**: < 100ms
- **首次加载时间**: < 2s（50 个用户）
- **实时更新延迟**: < 500ms
- **缓存命中率**: > 80%（正常使用场景）

## 缓存策略

### 缓存有效期

- **用户列表**: 30 分钟
- **仓库列表**: 30 分钟
- **车辆列表**: 30 分钟
- **仪表板数据**: 5 分钟（更新频繁）

### 缓存失效时机

1. **手动清除**: 调用 `clearCache()`
2. **数据变更**: 实时监听到变更事件
3. **过期时间**: 超过缓存有效期
4. **版本升级**: 应用版本更新
5. **用户登出**: 清除所有缓存

## 最佳实践

### 1. 数据变更后立即刷新

```typescript
// ✅ 正确
const handleUpdate = async () => {
  await API.updateData(...)
  clearCache()
  await refresh()
}

// ❌ 错误（忘记刷新）
const handleUpdate = async () => {
  await API.updateData(...)
  // 缺少 clearCache() 和 refresh()
}
```

### 2. 使用专用 Hook 而不是通用 Hook

```typescript
// ✅ 推荐（使用专用 Hook）
const {data: warehouses} = useWarehousesCache()

// ⚠️ 不推荐（使用通用 Hook）
const {data: warehouses} = useDataCache({
  cacheKey: 'warehouses',
  loadData: async () => await WarehousesAPI.getAllWarehouses()
})
```

### 3. 处理加载和错误状态

```typescript
// ✅ 正确
const {data, loading, error} = useDataCache(...)

if (loading) return <Loading />
if (error) return <Error message={error.message} />
return <DataView data={data} />

// ❌ 错误（未处理状态）
const {data} = useDataCache(...)
return <DataView data={data} /> // data 可能为 null
```

### 4. 显示离线数据提示

```typescript
// ✅ 正确
const {data, error, fromCache} = useDataCache(...)

return (
  <View>
    {fromCache && error && <OfflineTip />}
    <DataView data={data} />
  </View>
)
```

## 调试

### 查看缓存状态

在开发环境中，可以在浏览器控制台查看缓存日志：

```
[CacheManager] 缓存已写入: super_admin_users, TTL: 1800000ms
[useDataCache] 从缓存加载: super_admin_users
[RealtimeListener] 数据变更: UPDATE users
[useDataCache] 清除缓存: super_admin_users
```

### 手动清除缓存

```typescript
import {cacheManager} from '@/utils/cacheManager'

// 清除所有缓存
cacheManager.clear()
```

## 常见问题

### Q: 为什么数据没有实时更新？

A: 检查以下几点：
1. 确保 `realtimeEnabled` 为 `true`（默认）
2. 检查 Supabase Realtime 连接状态
3. 确认监听的表名正确
4. 查看控制台是否有错误日志

### Q: 如何禁用缓存？

A: 设置 `cacheEnabled: false`

```typescript
const {data} = useDataCache({
  cacheKey: 'my_data',
  loadData: async () => await API.getData(),
  cacheEnabled: false // 禁用缓存
})
```

### Q: 如何调整缓存有效期？

A: 设置 `cacheTTL` 参数

```typescript
const {data} = useDataCache({
  cacheKey: 'my_data',
  loadData: async () => await API.getData(),
  cacheTTL: 10 * 60 * 1000 // 10 分钟
})
```

### Q: 如何在多个组件间共享缓存？

A: 使用相同的 `cacheKey` 即可自动共享缓存

```typescript
// 组件 A
const {data} = useDataCache({cacheKey: 'shared_data', ...})

// 组件 B（自动共享缓存）
const {data} = useDataCache({cacheKey: 'shared_data', ...})
```

## 总结

通过使用这套全局缓存系统，你可以：

1. **提升性能**: 缓存加载 < 100ms，减少网络请求
2. **实时同步**: 数据变更后自动更新，无需手动刷新
3. **离线支持**: 网络失败时仍可显示缓存数据
4. **简化代码**: 统一的 API，减少重复代码
5. **易于维护**: 集中管理缓存逻辑，便于调试和优化

开始使用吧！🚀
