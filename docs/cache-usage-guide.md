# 智能缓存使用指南

## 概述

本项目实现了一套完整的智能缓存机制，支持数据版本管理和自动失效。当数据更新时，系统会自动增加版本号，确保所有页面都能获取到最新数据。

## 核心功能

### 1. 带版本号的缓存

使用 `setVersionedCache` 和 `getVersionedCache` 函数，缓存数据会自动关联当前的数据版本号。当数据更新时，旧版本的缓存会自动失效。

### 2. 数据版本管理

- **版本号自动递增**：每次数据更新时，调用 `onDataUpdated()` 会自动增加全局版本号
- **缓存自动失效**：当版本号不匹配时，缓存会自动失效并从数据库重新加载
- **实时数据传递**：确保所有页面都能获取到最新的数据

### 3. 缓存分类

系统为不同类型的数据定义了专门的缓存键：

```typescript
export const CACHE_KEYS = {
  // 仪表板缓存
  MANAGER_WAREHOUSES: 'manager_warehouses_cache',
  DASHBOARD_DATA: 'dashboard_data_cache',
  DRIVER_STATS: 'driver_stats_cache',
  SUPER_ADMIN_DASHBOARD: 'super_admin_dashboard_cache',

  // 用户管理缓存
  MANAGER_DRIVERS: 'manager_drivers_cache',
  MANAGER_DRIVER_DETAILS: 'manager_driver_details_cache',
  SUPER_ADMIN_USERS: 'super_admin_users_cache',
  SUPER_ADMIN_USER_DETAILS: 'super_admin_user_details_cache',

  // 仓库管理缓存
  ALL_WAREHOUSES: 'all_warehouses_cache',
  WAREHOUSE_CATEGORIES: 'warehouse_categories_cache',
  WAREHOUSE_ASSIGNMENTS: 'warehouse_assignments_cache',

  // 请假审批缓存
  LEAVE_APPLICATIONS: 'leave_applications_cache',
  LEAVE_DETAILS: 'leave_details_cache',

  // 计件工作缓存
  PIECE_WORK_REPORTS: 'piece_work_reports_cache',
  PIECE_WORK_DETAILS: 'piece_work_details_cache',

  // 司机端缓存
  DRIVER_PROFILE: 'driver_profile_cache',
  DRIVER_VEHICLES: 'driver_vehicles_cache',
  DRIVER_ATTENDANCE: 'driver_attendance_cache',
  DRIVER_LEAVE: 'driver_leave_cache',
  DRIVER_PIECE_WORK: 'driver_piece_work_cache',

  // 数据版本号
  DATA_VERSION: 'data_version_cache'
}
```

## 使用方法

### 1. 在页面中读取缓存数据

```typescript
import { getVersionedCache, setVersionedCache, CACHE_KEYS } from '@/utils/cache'

// 在加载数据的函数中
const loadData = useCallback(async (forceRefresh: boolean = false) => {
  // 如果不是强制刷新，先尝试从缓存加载
  if (!forceRefresh) {
    const cachedData = getVersionedCache<YourDataType[]>(CACHE_KEYS.YOUR_CACHE_KEY)
    
    if (cachedData) {
      console.log('✅ 从缓存加载数据')
      setData(cachedData)
      return
    }
  }

  // 从数据库加载
  try {
    const data = await fetchDataFromDatabase()
    setData(data)
    
    // 缓存数据（5分钟有效期）
    setVersionedCache(CACHE_KEYS.YOUR_CACHE_KEY, data, 5 * 60 * 1000)
  } catch (error) {
    console.error('加载数据失败:', error)
  }
}, [])
```

### 2. 在数据更新时清除缓存

```typescript
import { onDataUpdated, CACHE_KEYS } from '@/utils/cache'

// 在添加、修改、删除数据后
const handleDataUpdate = async () => {
  // 执行数据更新操作
  const success = await updateData(...)
  
  if (success) {
    // 数据更新，增加版本号并清除相关缓存
    onDataUpdated([
      CACHE_KEYS.YOUR_CACHE_KEY_1,
      CACHE_KEYS.YOUR_CACHE_KEY_2
    ])
    
    // 强制刷新数据
    await loadData(true)
  }
}
```

### 3. 使用 useDidShow 确保数据最新

```typescript
import { useDidShow } from '@tarojs/taro'

// 在页面组件中
useDidShow(() => {
  // 页面显示时加载数据（会自动检查缓存版本）
  loadData()
})
```

## 实际案例

### 案例1：管理员端司机管理

```typescript
// 加载司机列表
const loadDrivers = useCallback(
  async (forceRefresh: boolean = false) => {
    // 如果不是强制刷新，先尝试从缓存加载
    if (!forceRefresh) {
      const cachedDrivers = getVersionedCache<DriverWithRealName[]>(CACHE_KEYS.MANAGER_DRIVERS)
      const cachedDetails = getVersionedCache<Map<string, DriverDetailInfo>>(CACHE_KEYS.MANAGER_DRIVER_DETAILS)

      if (cachedDrivers && cachedDetails) {
        setDrivers(cachedDrivers)
        setDriverDetails(new Map(Object.entries(cachedDetails)))
        return
      }
    }

    // 从数据库加载
    const driverList = await getAllDriversWithRealName()
    setDrivers(driverList)
    
    // 缓存数据
    setVersionedCache(CACHE_KEYS.MANAGER_DRIVERS, driverList, 5 * 60 * 1000)
  },
  []
)

// 添加司机成功后
const handleAddDriver = async () => {
  const success = await createDriver(...)
  
  if (success) {
    // 数据更新，增加版本号并清除相关缓存
    onDataUpdated([CACHE_KEYS.MANAGER_DRIVERS, CACHE_KEYS.MANAGER_DRIVER_DETAILS])
    loadDrivers(true)
  }
}

// 页面显示时刷新数据
useDidShow(() => {
  loadDrivers()
})
```

### 案例2：超级管理员端用户管理

```typescript
// 加载用户列表
const loadUsers = useCallback(
  async (forceRefresh: boolean = false) => {
    if (!forceRefresh) {
      const cachedUsers = getVersionedCache<UserWithRealName[]>(CACHE_KEYS.SUPER_ADMIN_USERS)
      
      if (cachedUsers) {
        setUsers(cachedUsers)
        return
      }
    }

    const users = await getAllUsers()
    setUsers(users)
    setVersionedCache(CACHE_KEYS.SUPER_ADMIN_USERS, users, 5 * 60 * 1000)
  },
  []
)

// 修改用户角色后
const handleRoleChange = async () => {
  const success = await updateUserRole(...)
  
  if (success) {
    onDataUpdated([CACHE_KEYS.SUPER_ADMIN_USERS, CACHE_KEYS.SUPER_ADMIN_USER_DETAILS])
    loadUsers(true)
  }
}
```

## 缓存策略

### 1. 缓存有效期

- **默认有效期**：5分钟（300秒）
- **可自定义**：根据数据更新频率调整

```typescript
// 短期缓存（1分钟）
setVersionedCache(key, data, 60 * 1000)

// 中期缓存（5分钟，默认）
setVersionedCache(key, data, 5 * 60 * 1000)

// 长期缓存（30分钟）
setVersionedCache(key, data, 30 * 60 * 1000)
```

### 2. 缓存失效条件

缓存会在以下情况下自动失效：

1. **超过有效期**：缓存时间超过设定的 TTL
2. **版本号不匹配**：数据版本号发生变化
3. **手动清除**：调用 `clearCache()` 或 `onDataUpdated()`

### 3. 强制刷新

在某些情况下需要强制刷新数据：

```typescript
// 用户主动刷新（下拉刷新）
usePullDownRefresh(() => {
  loadData(true)  // forceRefresh = true
  Taro.stopPullDownRefresh()
})

// 数据更新后
onDataUpdated([...cacheKeys])
loadData(true)
```

## 最佳实践

### 1. 合理使用缓存

- ✅ **适合缓存**：列表数据、统计数据、配置信息
- ❌ **不适合缓存**：实时数据、敏感信息、一次性数据

### 2. 及时更新版本号

在以下操作后必须调用 `onDataUpdated()`：

- 添加数据
- 修改数据
- 删除数据
- 批量操作
- 管理员修改设置

### 3. 使用 useDidShow 钩子

```typescript
useDidShow(() => {
  // 页面显示时自动检查缓存版本并加载数据
  loadData()
})
```

### 4. 处理 Map 类型数据

Map 类型需要转换为普通对象才能缓存：

```typescript
// 缓存 Map
const detailsObj = Object.fromEntries(detailsMap)
setVersionedCache(key, detailsObj, ttl)

// 读取 Map
const cachedDetails = getVersionedCache<Record<string, DetailType>>(key)
if (cachedDetails) {
  const detailsMap = new Map(Object.entries(cachedDetails))
  setDetails(detailsMap)
}
```

### 5. 日志记录

使用 console.log 记录缓存操作，便于调试：

```typescript
console.log('✅ 从缓存加载数据')
console.log('📈 数据版本号已更新')
console.log('🔄 数据更新，已清除缓存')
```

## 工具函数参考

### 核心函数

```typescript
// 设置带版本号的缓存
setVersionedCache<T>(key: string, data: T, ttl?: number): void

// 获取带版本号的缓存
getVersionedCache<T>(key: string): T | null

// 数据更新时调用（增加版本号并清除缓存）
onDataUpdated(cacheKeys?: string[]): void

// 获取当前数据版本号
getDataVersion(): number

// 增加数据版本号
incrementDataVersion(): void

// 清除指定缓存
clearCache(key: string): void

// 清除所有缓存
clearAllCache(): void
```

### 专用清除函数

```typescript
// 清除管理员端司机缓存
clearManagerDriversCache(): void

// 清除超级管理员端用户缓存
clearSuperAdminUsersCache(): void

// 清除仓库相关缓存
clearWarehouseCache(): void

// 清除请假审批缓存
clearLeaveCache(): void

// 清除计件工作缓存
clearPieceWorkCache(): void

// 清除司机端缓存
clearDriverCache(driverId?: string): void
```

## 注意事项

1. **版本号是全局的**：所有缓存共享同一个版本号，任何数据更新都会使所有缓存失效
2. **缓存键必须唯一**：使用 `CACHE_KEYS` 常量确保键名不冲突
3. **Map 类型需要转换**：Taro 的存储 API 不支持直接存储 Map，需要转换为普通对象
4. **异步操作要处理错误**：缓存操作可能失败，需要 try-catch 处理
5. **不要缓存敏感信息**：密码、token 等敏感数据不应该缓存

## 性能优化效果

使用智能缓存后的性能提升：

- ✅ **减少数据库查询**：首次加载后，5分钟内无需重复查询
- ✅ **提升页面响应速度**：从缓存加载数据几乎是瞬时的
- ✅ **降低服务器负载**：减少不必要的 API 调用
- ✅ **改善用户体验**：页面切换更流畅，无需等待加载
- ✅ **保证数据一致性**：版本号机制确保数据始终是最新的

## 故障排查

### 问题1：缓存没有生效

**可能原因**：
- 缓存键名错误
- TTL 设置过短
- 版本号不匹配

**解决方法**：
- 检查 `CACHE_KEYS` 是否正确
- 增加 TTL 时间
- 查看控制台日志，确认版本号

### 问题2：数据不是最新的

**可能原因**：
- 数据更新后没有调用 `onDataUpdated()`
- 缓存没有正确清除

**解决方法**：
- 在所有数据更新操作后调用 `onDataUpdated()`
- 使用 `forceRefresh=true` 强制刷新

### 问题3：Map 类型缓存失败

**可能原因**：
- 直接缓存 Map 对象

**解决方法**：
- 使用 `Object.fromEntries()` 转换为普通对象
- 读取时使用 `new Map(Object.entries())` 转换回 Map

## 总结

智能缓存机制通过版本号管理实现了数据的自动失效和实时更新，在提升性能的同时保证了数据的一致性。正确使用缓存可以显著改善用户体验，减少服务器负载。
