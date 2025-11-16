# 车辆列表缓存同步问题修复

## 📅 修复日期
2025-11-16

## 🐛 问题描述

### 用户反馈
> "在司机端我的车辆查看详情里面删除了车辆，但是我的车辆列表还是有这个车辆"

### 问题表现
1. 司机在"我的车辆"详情页删除车辆
2. 删除成功，显示"删除成功"提示
3. 返回"我的车辆"列表页
4. **问题**：列表中仍然显示已删除的车辆
5. 需要等待3分钟缓存过期，或手动刷新才能看到正确的列表

### 影响范围
- 所有车辆修改操作（添加、更新、删除、审核等）
- 司机端和管理端的车辆列表
- 用户体验严重受影响

## 🔍 根本原因分析

### 1. 缓存键不匹配

**列表页使用的缓存键**（动态）：
```typescript
// src/pages/driver/vehicle-list/index.tsx
const cacheKey = `driver_vehicles_${driverId}`
// 例如：driver_vehicles_123e4567-e89b-12d3-a456-426614174000
```

**API清除的缓存键**（固定）：
```typescript
// src/db/api.ts (修复前)
clearCache(CACHE_KEYS.DRIVER_VEHICLES)
// 实际值：driver_vehicles_cache
```

**问题**：
- 列表页的缓存键包含司机ID，每个司机都有独立的缓存
- API清除的是固定的缓存键，与列表页的缓存键不匹配
- 导致删除操作后，缓存没有被清除

### 2. 缓存清除不完整

**修复前的情况**：
```typescript
// 只有deleteVehicle函数清除了缓存
export async function deleteVehicle(vehicleId: string): Promise<boolean> {
  // ... 删除逻辑 ...
  clearCache(CACHE_KEYS.DRIVER_VEHICLES)  // ❌ 缓存键不匹配
  clearCache(CACHE_KEYS.ALL_VEHICLES)
  return true
}

// 其他函数都没有清除缓存
export async function insertVehicle(vehicle: VehicleInput): Promise<Vehicle | null> {
  // ... 添加逻辑 ...
  // ❌ 没有清除缓存
  return data
}

export async function updateVehicle(vehicleId: string, updates: VehicleUpdate): Promise<Vehicle | null> {
  // ... 更新逻辑 ...
  // ❌ 没有清除缓存
  return data
}
```

### 3. 缓存机制说明

**车辆列表的缓存逻辑**：
```typescript
// src/pages/driver/vehicle-list/index.tsx
const loadVehicles = useCallback(async () => {
  const cacheKey = `driver_vehicles_${driverId}`
  const cached = getVersionedCache<Vehicle[]>(cacheKey)

  if (cached) {
    // ✅ 如果缓存存在且有效（3分钟内），直接使用缓存
    logger.info('✅ 使用缓存的车辆列表', {driverId, vehicleCount: cached.length})
    data = cached
  } else {
    // 🔄 缓存不存在或已过期，从数据库加载
    logger.info('🔄 从数据库加载车辆列表', {driverId})
    data = await getDriverVehicles(driverId)
    // 保存到缓存（3分钟有效期）
    setVersionedCache(cacheKey, data, 3 * 60 * 1000)
  }

  setVehicles(data)
}, [user, targetDriverId, isManagerView])
```

**问题流程**：
```
1. 用户查看车辆列表
   → 从数据库加载数据
   → 保存到缓存：driver_vehicles_123e4567...

2. 用户进入详情页删除车辆
   → 数据库删除成功
   → 清除缓存：driver_vehicles_cache ❌（缓存键不匹配）
   → 实际缓存：driver_vehicles_123e4567... 仍然存在

3. 用户返回列表页
   → useDidShow触发loadVehicles
   → 检查缓存：driver_vehicles_123e4567... 存在且有效
   → 使用缓存数据 ❌（包含已删除的车辆）
   → 显示错误的列表
```

## ✅ 解决方案

### 1. 新增通用缓存清除函数

**文件**：`src/utils/cache.ts`

**函数实现**：
```typescript
/**
 * 清除所有匹配前缀的缓存
 * @param prefix 缓存键前缀
 */
export function clearCacheByPrefix(prefix: string): void {
  try {
    // 获取所有存储键
    const info = Taro.getStorageInfoSync()
    const keys = info.keys || []
    let clearedCount = 0

    // 遍历所有键，删除匹配前缀的缓存
    keys.forEach((key) => {
      if (key.startsWith(prefix)) {
        Taro.removeStorageSync(key)
        clearedCount++
      }
    })

    console.log(`🗑️ [缓存] 已清除 ${clearedCount} 个前缀为 "${prefix}" 的缓存`)
  } catch (error) {
    console.error(`❌ [缓存] 清除前缀缓存失败: ${prefix}`, error)
  }
}
```

**功能说明**：
- 接受一个前缀参数（如`driver_vehicles_`）
- 遍历所有存储键，找到所有匹配前缀的键
- 删除所有匹配的缓存
- 记录清除的缓存数量

**使用示例**：
```typescript
// 清除所有司机的车辆列表缓存
clearCacheByPrefix('driver_vehicles_')

// 会清除：
// - driver_vehicles_123e4567-e89b-12d3-a456-426614174000
// - driver_vehicles_987f6543-e21c-34d5-b678-537625285111
// - driver_vehicles_456a7890-e12b-45c6-d789-648736396222
// ... 等所有匹配的缓存
```

### 2. 更新所有车辆修改API

**修改文件**：`src/db/api.ts`

**修改的函数列表**（共10个）：
```typescript
✅ insertVehicle()          // 添加车辆
✅ updateVehicle()          // 更新车辆信息
✅ deleteVehicle()          // 删除车辆
✅ returnVehicle()          // 还车录入
✅ lockPhoto()              // 锁定单张照片
✅ unlockPhoto()            // 解锁单张照片
✅ approveVehicle()         // 通过审核
✅ lockVehiclePhotos()      // 一键锁定照片
✅ requireSupplement()      // 要求补录
✅ submitVehicleForReview() // 提交审核
```

**修改模式**（统一）：
```typescript
// 修复前
export async function someVehicleFunction(...): Promise<...> {
  // ... 业务逻辑 ...
  
  if (error) {
    return false/null
  }
  
  // ❌ 没有清除缓存或缓存键不匹配
  
  return true/data
}

// 修复后
export async function someVehicleFunction(...): Promise<...> {
  // ... 业务逻辑 ...
  
  if (error) {
    return false/null
  }
  
  // ✅ 清除相关缓存
  clearCacheByPrefix('driver_vehicles_')  // 清除所有司机的车辆列表缓存
  clearCache(CACHE_KEYS.ALL_VEHICLES)     // 清除全局车辆缓存
  
  return true/data
}
```

**具体示例**：

#### 示例1：deleteVehicle（删除车辆）
```typescript
export async function deleteVehicle(vehicleId: string): Promise<boolean> {
  logger.db('删除', 'vehicles', {vehicleId})
  try {
    // 1. 获取车辆信息
    const vehicle = await getVehicleById(vehicleId)
    if (!vehicle) {
      logger.error('车辆不存在', {vehicleId})
      return false
    }

    // 2. 删除存储桶中的图片文件
    // ... 图片删除逻辑 ...

    // 3. 删除数据库记录
    const {error} = await supabase.from('vehicles').delete().eq('id', vehicleId)

    if (error) {
      logger.error('删除车辆失败', error)
      return false
    }

    // 4. ✅ 清除相关缓存
    clearCacheByPrefix('driver_vehicles_')  // 清除所有司机的车辆列表缓存
    clearCache(CACHE_KEYS.ALL_VEHICLES)     // 清除全局车辆缓存

    logger.info('成功删除车辆及关联文件', {vehicleId})
    return true
  } catch (error) {
    logger.error('删除车辆异常', error)
    return false
  }
}
```

#### 示例2：insertVehicle（添加车辆）
```typescript
export async function insertVehicle(vehicle: VehicleInput): Promise<Vehicle | null> {
  logger.db('插入', 'vehicles', {plate: vehicle.plate_number})
  try {
    const {data, error} = await supabase.from('vehicles').insert(vehicle).select().maybeSingle()

    if (error) {
      logger.error('添加车辆失败', error)
      return null
    }

    // ✅ 清除相关缓存
    clearCacheByPrefix('driver_vehicles_')
    clearCache(CACHE_KEYS.ALL_VEHICLES)

    logger.info('成功添加车辆', {vehicleId: data?.id, plate: data?.plate_number})
    return data
  } catch (error) {
    logger.error('添加车辆异常', error)
    return null
  }
}
```

#### 示例3：lockPhoto（锁定单张照片）
```typescript
export async function lockPhoto(vehicleId: string, photoField: string, photoIndex: number): Promise<boolean> {
  try {
    logger.db('锁定图片', 'vehicles', {vehicleId, photoField, photoIndex})

    // 获取当前的 locked_photos
    const {data: vehicle, error: fetchError} = await supabase
      .from('vehicles')
      .select('locked_photos')
      .eq('id', vehicleId)
      .maybeSingle()

    if (fetchError || !vehicle) {
      logger.error('获取车辆信息失败', fetchError)
      return false
    }

    const lockedPhotos = vehicle.locked_photos || {}
    const fieldLocks = lockedPhotos[photoField] || []

    // 如果该索引尚未锁定，则添加
    if (!fieldLocks.includes(photoIndex)) {
      fieldLocks.push(photoIndex)
      lockedPhotos[photoField] = fieldLocks

      const {error: updateError} = await supabase
        .from('vehicles')
        .update({
          locked_photos: lockedPhotos,
          updated_at: new Date().toISOString()
        })
        .eq('id', vehicleId)

      if (updateError) {
        logger.error('锁定图片失败', updateError)
        return false
      }

      // ✅ 清除相关缓存
      clearCacheByPrefix('driver_vehicles_')
      clearCache(CACHE_KEYS.ALL_VEHICLES)
    }

    logger.info('锁定图片成功', {vehicleId, photoField, photoIndex})
    return true
  } catch (error) {
    logger.error('锁定图片异常', error)
    return false
  }
}
```

### 3. 导入更新

**文件**：`src/db/api.ts`

**修改前**：
```typescript
import {CACHE_KEYS, clearCache, getCache, setCache} from '@/utils/cache'
```

**修改后**：
```typescript
import {CACHE_KEYS, clearCache, clearCacheByPrefix, getCache, setCache} from '@/utils/cache'
```

## 🧪 测试验证

### 测试场景1：删除车辆

**操作步骤**：
1. 司机登录，进入"我的车辆"列表页
2. 点击某个车辆，进入详情页
3. 点击"删除车辆"按钮
4. 确认删除
5. 等待删除成功提示
6. 自动返回列表页

**预期结果**：
- ✅ 列表中不再显示已删除的车辆
- ✅ 无需等待或手动刷新
- ✅ 数据立即同步

**修复前**：
```
列表页显示：
- 车辆A（已删除，但仍显示）❌
- 车辆B
- 车辆C
```

**修复后**：
```
列表页显示：
- 车辆B ✅
- 车辆C ✅
```

### 测试场景2：添加车辆

**操作步骤**：
1. 司机登录，进入"我的车辆"列表页
2. 点击"添加车辆"按钮
3. 填写车辆信息，上传照片
4. 提交保存
5. 返回列表页

**预期结果**：
- ✅ 列表中立即显示新添加的车辆
- ✅ 车辆信息正确
- ✅ 无需刷新

### 测试场景3：审核操作

**操作步骤**：
1. 管理员审核车辆，通过审核
2. 司机查看"我的车辆"列表

**预期结果**：
- ✅ 列表中显示最新的审核状态
- ✅ 审核状态从"待审核"变为"已通过"
- ✅ 数据实时同步

### 测试场景4：更新车辆信息

**操作步骤**：
1. 司机修改车辆信息（如车牌号）
2. 保存修改
3. 返回列表页

**预期结果**：
- ✅ 列表中显示更新后的车辆信息
- ✅ 车牌号等信息已更新
- ✅ 无需刷新

## 📊 修复效果对比

### 修复前

| 操作 | 列表刷新 | 用户体验 |
|------|---------|---------|
| 删除车辆 | ❌ 不刷新 | 😞 差 |
| 添加车辆 | ❌ 不刷新 | 😞 差 |
| 更新车辆 | ❌ 不刷新 | 😞 差 |
| 审核操作 | ❌ 不刷新 | 😞 差 |

**问题**：
- 需要等待3分钟缓存过期
- 或者手动刷新页面
- 数据不一致，容易混淆

### 修复后

| 操作 | 列表刷新 | 用户体验 |
|------|---------|---------|
| 删除车辆 | ✅ 立即刷新 | 😊 优秀 |
| 添加车辆 | ✅ 立即刷新 | 😊 优秀 |
| 更新车辆 | ✅ 立即刷新 | 😊 优秀 |
| 审核操作 | ✅ 立即刷新 | 😊 优秀 |

**改进**：
- 数据实时同步
- 无需等待或手动刷新
- 用户体验大幅提升

## 💡 技术亮点

### 1. 通用解决方案

**clearCacheByPrefix函数**：
- 不仅适用于车辆模块
- 可以用于其他需要清除动态缓存的场景
- 提高代码复用性

**应用场景**：
```typescript
// 清除司机的车辆列表缓存
clearCacheByPrefix('driver_vehicles_')

// 清除管理员的仓库缓存
clearCacheByPrefix('manager_warehouses_')

// 清除用户详情缓存
clearCacheByPrefix('user_details_')
```

### 2. 完整覆盖

**所有修改车辆的函数都清除缓存**：
- 添加车辆 ✅
- 更新车辆 ✅
- 删除车辆 ✅
- 还车录入 ✅
- 锁定照片 ✅
- 解锁照片 ✅
- 审核操作 ✅
- 提交审核 ✅

**确保数据一致性**：
- 任何修改操作都会清除缓存
- 下次查询时会从数据库加载最新数据
- 避免数据不一致问题

### 3. 性能优化

**只清除相关缓存**：
```typescript
// ✅ 只清除车辆相关的缓存
clearCacheByPrefix('driver_vehicles_')  // 清除司机的车辆列表
clearCache(CACHE_KEYS.ALL_VEHICLES)     // 清除全局车辆列表

// ❌ 不会清除其他模块的缓存
// - 考勤记录缓存
// - 请假申请缓存
// - 计件工作缓存
// ... 等其他缓存不受影响
```

**性能影响**：
- 清除缓存操作很快（毫秒级）
- 不影响其他模块的性能
- 下次查询时才会重新加载数据

### 4. 易于维护

**统一的缓存清除逻辑**：
```typescript
// 所有函数都使用相同的缓存清除代码
clearCacheByPrefix('driver_vehicles_')
clearCache(CACHE_KEYS.ALL_VEHICLES)
```

**维护优势**：
- 代码一致性高
- 容易理解和修改
- 降低维护成本

## 📝 总结

### 问题本质
- 缓存键不匹配导致缓存无法被清除
- 缓存清除不完整导致数据不一致

### 解决方案
- 新增通用的clearCacheByPrefix函数
- 更新所有修改车辆的API函数，添加缓存清除逻辑

### 修复效果
- ✅ 数据实时同步
- ✅ 用户体验大幅提升
- ✅ 系统一致性增强
- ✅ 代码质量提高

### 技术价值
- 🎯 通用解决方案，可复用
- 🎯 完整覆盖，无遗漏
- 🎯 性能优化，不影响其他模块
- 🎯 易于维护，代码一致

---

**修复版本**：v2.2.1  
**修复日期**：2025-11-16  
**开发人员**：Miaoda AI Assistant

## 📚 相关文档

- [TODO.md](./TODO.md) - 项目任务清单
- [ONE_CLICK_LOCK_FEATURE.md](./ONE_CLICK_LOCK_FEATURE.md) - 一键锁定功能说明
- [提车照片分离修复](./PICKUP_PHOTOS_SEPARATION_FIX.md) - 照片分类修复
