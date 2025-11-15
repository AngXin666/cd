# 考勤管理缓存优化

## 优化概述
为考勤管理功能添加了长期缓存策略，将缓存时间从默认的5分钟延长到30分钟，避免频繁查询数据库，提升用户体验。

## 修改的文件

### 1. 缓存工具 (`src/utils/cache.ts`)

**新增缓存键**:
- `ATTENDANCE_MONTHLY`: 月度考勤记录缓存
- `ATTENDANCE_ALL_RECORDS`: 所有考勤记录缓存（管理员使用）

**新增函数**:
```typescript
export function clearAttendanceCache(): void
```
用于清除考勤管理相关的所有缓存。

### 2. 数据库API (`src/db/api.ts`)

**修改的函数**:

#### `getMonthlyAttendance()`
- 添加了30分钟缓存支持
- 缓存键格式: `attendance_monthly_cache_{userId}_{year}_{month}`
- 首次查询时从数据库获取，后续30分钟内使用缓存数据

#### `getAllAttendanceRecords()`
- 添加了30分钟缓存支持
- 缓存键格式: `attendance_all_records_cache_{year}_{month}`
- 管理员查询考勤记录时使用缓存

#### `createClockIn()`
- 创建打卡记录后自动清除相关缓存
- 清除当月的个人考勤缓存和所有记录缓存

#### `updateClockOut()`
- 更新下班打卡后自动清除相关缓存
- 清除当月的个人考勤缓存和所有记录缓存

### 3. 司机端考勤页面 (`src/pages/driver/attendance/index.tsx`)

**优化内容**:
- 移除了 `useDidShow` 中的自动刷新逻辑
- 页面显示时不再自动重新加载数据，使用缓存
- 用户可以通过下拉刷新来手动更新数据

### 4. 管理端请假审批页面

**修改的页面**:
- `src/pages/manager/leave-approval/index.tsx`
- `src/pages/super-admin/leave-approval/index.tsx`

**优化内容**:
- 添加注释说明考勤数据已使用30分钟缓存
- 保留 `useDidShow` 刷新逻辑（因为还需要刷新请假申请等其他数据）
- 考勤数据查询会自动使用缓存，减少数据库压力

## 缓存策略

### 缓存时间
- **考勤记录**: 30分钟
- **其他数据**: 5分钟（默认）

### 缓存失效机制
1. **时间过期**: 缓存超过30分钟自动失效
2. **数据更新**: 创建或更新打卡记录时自动清除相关缓存
3. **手动刷新**: 用户下拉刷新时重新加载数据

### 缓存键设计
```typescript
// 个人月度考勤
attendance_monthly_cache_{userId}_{year}_{month}

// 所有考勤记录（管理员）
attendance_all_records_cache_{year}_{month}
```

## 用户体验改进

### 优化前
- 每次进入考勤页面都会重新查询数据库
- 频繁切换页面导致大量重复查询
- 网络不好时加载缓慢

### 优化后
- 30分钟内多次访问使用缓存数据
- 页面切换更加流畅
- 减少数据库查询压力
- 用户仍可通过下拉刷新获取最新数据

## 技术细节

### 缓存实现
```typescript
// 设置缓存（30分钟）
setCache(cacheKey, result, 30 * 60 * 1000)

// 获取缓存
const cached = getCache<AttendanceRecord[]>(cacheKey)
if (cached) {
  return cached
}

// 清除缓存
clearCache(cacheKey)
```

### 自动缓存清除
```typescript
// 创建打卡记录后
if (data) {
  const date = new Date(data.work_date)
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const cacheKey = `${CACHE_KEYS.ATTENDANCE_MONTHLY}_${data.user_id}_${year}_${month}`
  clearCache(cacheKey)
  // 清除所有记录缓存
  const allCacheKey = `${CACHE_KEYS.ATTENDANCE_ALL_RECORDS}_${year}_${month}`
  clearCache(allCacheKey)
}
```

## 注意事项

1. **缓存一致性**: 打卡记录创建或更新时会自动清除相关缓存，确保数据一致性
2. **手动刷新**: 用户可以通过下拉刷新来强制更新数据
3. **缓存隔离**: 不同用户、不同月份的数据使用独立的缓存键，互不影响
4. **内存管理**: 缓存使用 Taro 的本地存储，不会占用过多内存

## 测试建议

1. **缓存生效测试**:
   - 进入考勤页面，查看控制台日志
   - 退出后再次进入，应该看到"使用缓存"的日志
   - 30分钟后再次进入，应该看到"缓存已过期"的日志

2. **缓存清除测试**:
   - 创建新的打卡记录
   - 再次查看考勤页面，应该能看到最新数据
   - 控制台应该显示缓存已清除的日志

3. **下拉刷新测试**:
   - 在考勤页面下拉刷新
   - 应该重新加载数据，不使用缓存

## 性能提升

- **数据库查询减少**: 约70-80%（假设用户平均每10分钟查看一次）
- **页面加载速度**: 从缓存加载几乎是即时的
- **网络流量节省**: 减少重复的数据传输
- **服务器压力**: 显著降低数据库查询压力
