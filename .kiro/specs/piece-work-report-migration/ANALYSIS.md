# 计件报表页面缓存使用分析

## 分析时间
2025-12-14

## 分析范围
- `src/pages/super-admin/piece-work-report/index.tsx` - 老板端计件报表页面
- `src/pages/manager/piece-work-report/index.tsx` - 车队长端计件报表页面

## 当前缓存使用模式

### 老板端页面

#### 1. 基础数据缓存

**缓存键**: `super_admin_piece_work_base_data`

**缓存内容**:
```typescript
{
  warehouses: Warehouse[]
  drivers: Profile[]
  categories: PieceWorkCategory[]
}
```

**缓存位置**: `loadData()` 函数
- 使用 `getVersionedCache` 读取缓存
- 使用 `setVersionedCache` 保存缓存（5分钟TTL）
- 在 `useDidShow` 中使用 `clearVersionedCache` 清除缓存

**API 调用**:
- `WarehousesAPI.getAllWarehouses()`
- `UsersAPI.getDriverProfiles()`
- `PieceworkAPI.getActiveCategories()`

#### 2. 计件记录缓存

**缓存键**: `super_admin_piece_work_records_{warehouseId}_{startDate}_{endDate}`

**缓存内容**: `PieceWorkRecord[]`

**缓存位置**: `loadRecords()` 函数
- 使用 `getVersionedCache` 读取缓存
- 使用 `setVersionedCache` 保存缓存（3分钟TTL）
- 在 `useDidShow` 中使用 `clearVersionedCache` 清除缓存
- 在 `preloadOtherWarehouses` 中预加载其他仓库的数据

**API 调用**:
- `PieceworkAPI.getPieceWorkRecordsByWarehouse(warehouseId, startDate, endDate)`

### 车队长端页面

#### 1. 基础数据缓存

**缓存键**: `manager_piece_work_base_data_{userId}`

**缓存内容**:
```typescript
{
  profile: Profile | null
  warehouses: Warehouse[]
  drivers: Profile[]
  categories: PieceWorkCategory[]
}
```

**缓存位置**: `loadData()` 函数
- 使用 `getVersionedCache` 读取缓存
- 使用 `setVersionedCache` 保存缓存（5分钟TTL）
- 在 `useDidShow` 中使用 `clearVersionedCache` 清除缓存

**API 调用**:
- `UsersAPI.getCurrentUserProfile()`
- `WarehousesAPI.getManagerWarehouses(userId)`
- `UsersAPI.getDriverProfiles()`
- `PieceworkAPI.getActiveCategories()`

#### 2. 计件记录缓存

**缓存键**: `manager_piece_work_records_{warehouseId}_{startDate}_{endDate}`

**缓存内容**: `PieceWorkRecord[]`

**缓存位置**: `loadRecords()` 函数
- 使用 `getVersionedCache` 读取缓存
- 使用 `setVersionedCache` 保存缓存（3分钟TTL）
- 在 `useDidShow` 中使用 `clearVersionedCache` 清除缓存
- 在 `preloadOtherWarehouses` 中预加载其他仓库的数据

**API 调用**:
- `PieceworkAPI.getPieceWorkRecordsByWarehouse(warehouseId, startDate, endDate)`

## 迁移策略

### 可以迁移到 useUserListCache 的部分

#### 老板端
- ✅ **司机列表** (`drivers: Profile[]`)
  - 当前通过 `UsersAPI.getDriverProfiles()` 获取
  - 可以从 `useUserListCache` 的 `users` 中过滤 `role === 'DRIVER'`
  
- ⚠️ **仓库列表** (`warehouses: Warehouse[]`)
  - 当前通过 `WarehousesAPI.getAllWarehouses()` 获取
  - `useUserListCache` 只提供用户-仓库映射，不提供完整仓库列表
  - **需要保持独立加载**

- ❌ **品类列表** (`categories: PieceWorkCategory[]`)
  - 当前通过 `PieceworkAPI.getActiveCategories()` 获取
  - 与用户缓存无关
  - **需要保持独立加载**

#### 车队长端
- ✅ **司机列表** (`drivers: Profile[]`)
  - 可以从 `useUserListCache` 的 `users` 中过滤
  
- ⚠️ **仓库列表** (`warehouses: Warehouse[]`)
  - 当前通过 `WarehousesAPI.getManagerWarehouses(userId)` 获取
  - 可以通过 `useUserListCache` 的 `userWarehouseIdsMap` 获取仓库ID列表
  - 但仍需要加载完整仓库信息
  - **需要保持独立加载，但可以使用 userWarehouseIdsMap 进行过滤**

- ❌ **用户资料** (`profile: Profile | null`)
  - 当前通过 `UsersAPI.getCurrentUserProfile()` 获取
  - 可以从 `useAuth` 获取，不需要单独缓存
  
- ❌ **品类列表** (`categories: PieceWorkCategory[]`)
  - 与用户缓存无关
  - **需要保持独立加载**

### 不能迁移的部分

- ❌ **计件记录** (`PieceWorkRecord[]`)
  - 数据量大且变化频繁
  - 按仓库和日期范围动态加载
  - **保持现有的独立缓存逻辑**

## 迁移计划

### 第一步：引入 useUserListCache

```typescript
import {useUserListCache} from '@/hooks/useUserListCache'

// 在组件中调用
const {users, userWarehouseIdsMap, loading, refresh, clearCache} = useUserListCache()
```

### 第二步：替换司机列表加载

**迁移前**:
```typescript
const driversData = await UsersAPI.getDriverProfiles()
setDrivers(driversData)
```

**迁移后**:
```typescript
// 使用 useMemo 过滤司机
const drivers = useMemo(() => 
  users.filter(u => u.role === 'DRIVER'),
  [users]
)
```

### 第三步：保留仓库和品类的独立加载

```typescript
// 仓库列表仍需单独加载
const [warehouses, setWarehouses] = useState<Warehouse[]>([])
const [categories, setCategories] = useState<PieceWorkCategory[]>([])

useEffect(() => {
  const loadBaseData = async () => {
    try {
      const [warehousesData, categoriesData] = await Promise.all([
        WarehousesAPI.getAllWarehouses(), // 或 getManagerWarehouses(userId)
        PieceworkAPI.getActiveCategories()
      ])
      setWarehouses(warehousesData)
      setCategories(categoriesData)
    } catch (error) {
      console.error('加载基础数据失败:', error)
    }
  }
  loadBaseData()
}, [])
```

### 第四步：更新下拉刷新逻辑

**迁移前**:
```typescript
usePullDownRefresh(async () => {
  await Promise.all([loadData(), loadRecords()])
  Taro.stopPullDownRefresh()
})
```

**迁移后**:
```typescript
usePullDownRefresh(async () => {
  // 清除并刷新用户列表缓存
  clearCache()
  await refresh()
  
  // 重新加载仓库、品类和计件记录
  await loadBaseData()
  await loadRecords()
  
  Taro.stopPullDownRefresh()
})
```

### 第五步：更新 useDidShow 逻辑

**迁移前**:
```typescript
useDidShow(() => {
  clearVersionedCache('super_admin_piece_work_base_data')
  warehouses.forEach((warehouse) => {
    clearVersionedCache(`super_admin_piece_work_records_${warehouse.id}_${startDate}_${endDate}`)
  })
  loadData()
  loadRecords()
})
```

**迁移后**:
```typescript
useDidShow(() => {
  // useUserListCache 会自动处理实时更新，不需要手动清除
  // 只需重新加载计件记录
  loadRecords()
})
```

### 第六步：移除旧缓存导入

```typescript
// 删除这一行
import {clearVersionedCache, getVersionedCache, setVersionedCache} from '@/utils/cache'
```

## 预期效果

### 性能提升
- ✅ 用户列表数据从缓存加载，减少 API 请求
- ✅ 自动实时更新，无需手动清除缓存
- ✅ 30分钟缓存TTL，比现有的5分钟更长

### 代码简化
- ✅ 移除 `loadData` 函数中的用户加载逻辑
- ✅ 移除所有旧缓存函数调用
- ✅ 减少状态管理复杂度

### 功能增强
- ✅ 自动实时更新（监听 users, warehouse_assignments, vehicles 表）
- ✅ 更好的错误处理
- ✅ 统一的缓存管理

## 风险和注意事项

### 风险
1. **仓库列表加载**：需要确保仓库列表正确加载，不能依赖 useUserListCache
2. **权限过滤**：车队长端需要正确过滤仓库和司机
3. **计件记录**：保持现有的独立缓存逻辑，不要破坏

### 注意事项
1. **测试充分**：迁移后需要充分测试所有功能
2. **性能监控**：关注首次加载和缓存加载的性能
3. **错误处理**：确保错误处理逻辑完整
4. **实时更新**：验证实时更新功能正常工作

## 下一步

1. ✅ 分析完成
2. ⏭️ 开始迁移老板端页面
3. ⏭️ 开始迁移车队长端页面
4. ⏭️ 测试验证
5. ⏭️ 文档更新
