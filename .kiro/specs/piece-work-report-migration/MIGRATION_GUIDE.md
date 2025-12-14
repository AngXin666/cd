# 计件报表页面迁移指南

## 概述

由于计件报表页面文件较大（1141行），完全自动化迁移存在风险。本指南提供详细的手动迁移步骤，确保迁移的准确性和安全性。

## 迁移文件

1. **老板端**: `src/pages/super-admin/piece-work-report/index.tsx`
2. **车队长端**: `src/pages/manager/piece-work-report/index.tsx`

## 迁移步骤

### 步骤 1: 备份原文件

```bash
# 备份老板端
cp src/pages/super-admin/piece-work-report/index.tsx src/pages/super-admin/piece-work-report/index.tsx.backup

# 备份车队长端
cp src/pages/manager/piece-work-report/index.tsx src/pages/manager/piece-work-report/index.tsx.backup
```

### 步骤 2: 修改导入语句

#### 老板端 (src/pages/super-admin/piece-work-report/index.tsx)

**查找**:
```typescript
import * as UsersAPI from '@/db/api/users'
import * as WarehousesAPI from '@/db/api/warehouses'

import type {PieceWorkCategory, PieceWorkRecord, Profile, Warehouse} from '@/db/types'
import {clearVersionedCache, getVersionedCache, setVersionedCache} from '@/utils/cache'
import {getFirstDayOfMonthString, getLocalDateString} from '@/utils/date'
```

**替换为**:
```typescript
import * as WarehousesAPI from '@/db/api/warehouses'

import type {PieceWorkCategory, PieceWorkRecord, Warehouse} from '@/db/types'
import {getFirstDayOfMonthString, getLocalDateString} from '@/utils/date'
import {useUserListCache} from '@/hooks/useUserListCache'
```

**说明**:
- 移除 `UsersAPI` 导入（从 useUserListCache 获取用户数据）
- 移除 `Profile` 类型导入（从 useUserListCache 获取）
- 移除旧缓存函数导入
- 添加 `useUserListCache` Hook 导入

### 步骤 3: 添加文件注释

在文件顶部添加完整的文件说明注释：

```typescript
/**
 * 老板端计件报表页面
 * 显示所有仓库的司机计件工作统计和报表数据
 * 
 * @module pages/super-admin/piece-work-report
 * @feature piece-work-report-migration
 * 
 * 迁移说明：
 * - 使用 useUserListCache Hook 替代旧的缓存函数
 * - 司机列表从 useUserListCache 获取并自动实时更新
 * - 仓库和品类数据保持独立加载
 * - 计件记录数据保持现有的缓存逻辑
 */
```

### 步骤 4: 引入 useUserListCache Hook

**查找**:
```typescript
const SuperAdminPieceWorkReport: React.FC = () => {
  const {user} = useAuth({guard: true})

  // 数据状态
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [drivers, setDrivers] = useState<Profile[]>([])
  const [categories, setCategories] = useState<PieceWorkCategory[]>([])
  const [records, setRecords] = useState<PieceWorkRecord[]>([])
```

**替换为**:
```typescript
const SuperAdminPieceWorkReport: React.FC = () => {
  const {user} = useAuth({guard: true})

  // 使用新的用户列表缓存 Hook
  // 提供用户列表、详情、仓库映射等数据，并支持自动实时更新
  const {users, loading: usersLoading, refresh: refreshUsers, clearCache: clearUsersCache} = useUserListCache()

  // 从用户列表中过滤出司机
  // 使用 useMemo 优化性能，只在 users 变化时重新计算
  const drivers = useMemo(() => users.filter((u) => u.role === 'DRIVER'), [users])

  // 数据状态
  // 注意：仓库和品类数据仍需独立加载，因为 useUserListCache 不提供完整的仓库列表
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [categories, setCategories] = useState<PieceWorkCategory[]>([])
  const [records, setRecords] = useState<PieceWorkRecord[]>([])
```

### 步骤 5: 替换 loadData 函数

**查找整个 `loadData` 函数**:
```typescript
  // 加载基础数据（带缓存）
  const loadData = useCallback(async () => {
    if (!user?.id) return

    try {
      // 尝试从缓存加载仓库数据
      const cacheKey = 'super_admin_piece_work_base_data'
      const cached = getVersionedCache<{
        warehouses: Warehouse[]
        drivers: Profile[]
        categories: PieceWorkCategory[]
      }>(cacheKey)

      if (cached) {
        setWarehouses(cached.warehouses)
        setDrivers(cached.drivers)
        setCategories(cached.categories)
        return
      }

      // 加载所有仓库
      const warehousesData = await WarehousesAPI.getAllWarehouses()
      setWarehouses(warehousesData)

      // 加载所有司机
      const driversData = await UsersAPI.getDriverProfiles()
      setDrivers(driversData)

      // 加载所有品类
      const categoriesData = await PieceworkAPI.getActiveCategories()
      setCategories(categoriesData)

      // 保存到缓存（5分钟有效期）
      setVersionedCache(
        cacheKey,
        {
          warehouses: warehousesData,
          drivers: driversData,
          categories: categoriesData
        },
        5 * 60 * 1000
      )
    } catch (error) {
      console.error('加载数据失败:', error)
      Taro.showToast({
        title: '加载数据失败',
        icon: 'error',
        duration: 2000
      })
    }
  }, [user?.id])
```

**替换为**:
```typescript
  /**
   * 加载基础数据（仓库和品类）
   * 
   * 注意：
   * - 司机数据已从 useUserListCache 获取，不需要在这里加载
   * - 仓库数据需要完整的仓库列表，useUserListCache 只提供用户-仓库映射
   * - 品类数据与用户缓存无关，需要独立加载
   */
  const loadBaseData = useCallback(async () => {
    if (!user?.id) return

    try {
      // 并行加载仓库和品类数据
      const [warehousesData, categoriesData] = await Promise.all([
        WarehousesAPI.getAllWarehouses(),
        PieceworkAPI.getActiveCategories()
      ])

      setWarehouses(warehousesData)
      setCategories(categoriesData)
    } catch (error) {
      console.error('加载基础数据失败:', error)
      Taro.showToast({
        title: '加载数据失败',
        icon: 'error',
        duration: 2000
      })
    }
  }, [user?.id])
```

### 步骤 6: 移除 loadRecords 中的旧缓存调用

**查找 `loadRecords` 函数中的缓存相关代码**:
```typescript
      // 生成缓存键（包含仓库ID、日期范围）
      const cacheKey = `super_admin_piece_work_records_${warehouse.id}_${actualStartDate}_${actualEndDate}`
      const cached = getVersionedCache<PieceWorkRecord[]>(cacheKey)

      let data: PieceWorkRecord[] = []

      if (cached) {
        data = cached
      } else {
        data = await PieceworkAPI.getPieceWorkRecordsByWarehouse(warehouse.id, actualStartDate, actualEndDate)
        // 保存到缓存（3分钟有效期）
        setVersionedCache(cacheKey, data, 3 * 60 * 1000)
      }
```

**替换为**:
```typescript
      // 加载计件记录
      const data = await PieceworkAPI.getPieceWorkRecordsByWarehouse(warehouse.id, actualStartDate, actualEndDate)
```

**说明**: 简化代码，移除缓存逻辑。如果需要缓存，可以后续优化。

### 步骤 7: 移除 preloadOtherWarehouses 函数

**删除整个 `preloadOtherWarehouses` 函数**（约50行代码）

**删除对应的 useEffect**:
```typescript
  // 在当前仓库数据加载完成后，预加载其他仓库数据
  useEffect(() => {
    if (records.length > 0 && warehouses.length > 1) {
      preloadOtherWarehouses()
    }
  }, [records.length, warehouses.length, preloadOtherWarehouses])
```

### 步骤 8: 更新 useEffect 调用

**查找**:
```typescript
  useEffect(() => {
    loadData()
  }, [loadData])
```

**替换为**:
```typescript
  // 初始加载基础数据
  useEffect(() => {
    loadBaseData()
  }, [loadBaseData])
```

### 步骤 9: 更新 useDidShow

**查找**:
```typescript
  useDidShow(() => {
    // 清除缓存，强制重新加载最新数据
    clearVersionedCache('super_admin_piece_work_base_data')
    // 清除所有计件记录缓存
    warehouses.forEach((warehouse) => {
      const today = new Date().toISOString().split('T')[0]
      const actualStartDate = startDate <= today ? startDate : today
      const actualEndDate = endDate >= today ? endDate : today
      clearVersionedCache(`super_admin_piece_work_records_${warehouse.id}_${actualStartDate}_${actualEndDate}`)
    })
    loadData()
    loadRecords()
  })
```

**替换为**:
```typescript
  /**
   * 页面显示时的处理
   * 
   * 注意：
   * - useUserListCache 会自动处理实时更新，不需要手动清除缓存
   * - 只需重新加载计件记录即可
   */
  useDidShow(() => {
    // 重新加载计件记录（用户数据会自动更新）
    loadRecords()
  })
```

### 步骤 10: 更新 usePullDownRefresh

**查找**:
```typescript
  // 下拉刷新
  usePullDownRefresh(async () => {
    await Promise.all([loadData(), loadRecords()])
    Taro.stopPullDownRefresh()
  })
```

**替换为**:
```typescript
  /**
   * 下拉刷新处理
   * 
   * 刷新流程：
   * 1. 清除用户列表缓存
   * 2. 刷新用户数据
   * 3. 重新加载基础数据（仓库、品类）
   * 4. 重新加载计件记录
   */
  usePullDownRefresh(async () => {
    try {
      // 清除并刷新用户列表缓存
      clearUsersCache()
      await refreshUsers()

      // 重新加载基础数据和计件记录
      await Promise.all([loadBaseData(), loadRecords()])
    } finally {
      Taro.stopPullDownRefresh()
    }
  })
```

### 步骤 11: 添加函数注释

为所有主要函数添加 JSDoc 注释（如果还没有的话）：

```typescript
/**
 * 处理仓库切换
 * @param e - Swiper 切换事件
 */
const handleWarehouseChange = useCallback((e: any) => {
  // ...
}, [])

/**
 * 添加计件记录
 */
const handleAddRecord = () => {
  // ...
}

/**
 * 查看司机详情
 * @param driverId - 司机ID
 */
const handleViewDriverDetail = (driverId: string) => {
  // ...
}

/**
 * 获取仓库名称
 * @param warehouseId - 仓库ID
 * @returns 仓库名称
 */
const getWarehouseName = useCallback(
  (warehouseId: string) => {
    // ...
  },
  [warehouses]
)
```

## 车队长端迁移

车队长端的迁移步骤与老板端类似，主要区别：

1. **缓存键不同**: `manager_piece_work_base_data_{userId}` → 移除
2. **仓库加载**: `WarehousesAPI.getManagerWarehouses(userId)` → 保持不变
3. **用户资料**: 移除 `profile` 状态，从 `useAuth` 获取

### 车队长端特殊步骤

**loadData 函数替换**:

```typescript
  /**
   * 加载基础数据（仓库和品类）
   * 
   * 注意：
   * - 司机数据已从 useUserListCache 获取
   * - 车队长只能看到自己管理的仓库
   */
  const loadBaseData = useCallback(async () => {
    if (!user?.id) return

    try {
      // 并行加载仓库和品类数据
      const [warehousesData, categoriesData] = await Promise.all([
        WarehousesAPI.getManagerWarehouses(user.id), // 车队长只加载自己管理的仓库
        PieceworkAPI.getActiveCategories()
      ])

      setWarehouses(warehousesData)
      setCategories(categoriesData)
    } catch (error) {
      console.error('加载基础数据失败:', error)
      Taro.showToast({
        title: '加载数据失败',
        icon: 'error',
        duration: 2000
      })
    }
  }, [user?.id])
```

## 验证清单

迁移完成后，请验证以下内容：

### 代码检查
- [ ] 所有旧缓存函数调用已移除
- [ ] 所有函数都有 JSDoc 注释
- [ ] 复杂逻辑都有行内注释
- [ ] 代码通过 lint 检查

### 功能测试
- [ ] 页面正常加载
- [ ] 切换仓库功能正常
- [ ] 修改日期范围功能正常
- [ ] 下拉刷新功能正常
- [ ] 司机列表显示正确
- [ ] 计件数据显示正确
- [ ] 无控制台错误

### 性能测试
- [ ] 首次加载时间 < 2秒
- [ ] 缓存加载时间 < 500ms
- [ ] 切换仓库响应时间 < 300ms

## 回滚方案

如果迁移出现问题，可以快速回滚：

```bash
# 回滚老板端
cp src/pages/super-admin/piece-work-report/index.tsx.backup src/pages/super-admin/piece-work-report/index.tsx

# 回滚车队长端
cp src/pages/manager/piece-work-report/index.tsx.backup src/pages/manager/piece-work-report/index.tsx
```

## 注意事项

1. **一次只迁移一个文件**：先完成老板端，测试通过后再迁移车队长端
2. **保留备份**：在确认迁移成功前，不要删除备份文件
3. **充分测试**：每个步骤完成后都要测试，确保功能正常
4. **提交前检查**：确保所有注释都已添加，文档都已更新

## 完成标志

迁移完成的标志：

1. ✅ 所有旧缓存函数调用已移除
2. ✅ 所有代码都有完整注释
3. ✅ 所有功能测试通过
4. ✅ 性能指标达标
5. ✅ 文档已同步更新
6. ✅ 代码通过 lint 检查
