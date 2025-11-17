# 修复超级管理员无法查看停用车辆的问题

## 问题描述

'EOF''

## 问题原因

 `src/db/api.ts` 的 `getAllVehiclesWithDrivers()` 函数中，查询条件包含了 `.is('return_time', null)`，这会过滤掉所有已还车（停用）的车辆记录。

### 问题代码
```typescript
const {data: vehiclesData, error: vehiclesError} = await supabase
  .from('vehicles')
  .select('*')
  .is('return_time', null) // ❌ 这里过滤掉了已还车的记录
  .order('plate_number', {ascending: true})
  .order('pickup_time', {ascending: false})
```

## 解决方案

> `.is('return_time', null)` 限制，让超级管理员能够查看所有状态的车辆。

### 修改后的代码
```typescript
const {data: vehiclesData, error: vehiclesError} = await supabase
  .from('vehicles')
  .select('*')
  // ✅ 移除 return_time 限制，超级管理员应该能看到所有车辆
  .order('plate_number', {ascending: true})
  .order('pickup_time', {ascending: false})
```

## 修改内容

### 1. 移除查询限制
- **位置**：`src/db/api.ts` 第4064行
- **修改**：删除 `.is('return_time', null)` 条件
- **效果**：查询将返回所有车辆记录，包括已还车（停用）的车辆

### 2. 更新日志信息
- **位置**：`src/db/api.ts` 第4124-4130行
- **修改**：更新日志描述和统计信息
- **新增统计**：
  - `returned`: 已还车的车辆数量
  - `active`: 使用中的车辆数量

### 修改前后对比

#### 修改前
```typescript
logger.info('开始查询所有车辆及司机信息（仅最新记录，排除已还车）')
// ...
logger.info(`成功获取所有车辆列表（仅最新记录，排除已还车），共 ${vehicles.length} 辆`, {
  count: vehicles.length,
  withDriver: vehicles.filter((v) => v.driver_id).length,
  withoutDriver: vehicles.filter((v) => !v.driver_id).length
})
```

#### 修改后
```typescript
logger.info('开始查询所有车辆及司机信息（包括所有状态的车辆）')
// ...
logger.info(`成功获取所有车辆列表（包括所有状态），共 ${vehicles.length} 辆`, {
  count: vehicles.length,
  withDriver: vehicles.filter((v) => v.driver_id).length,
  withoutDriver: vehicles.filter((v) => !v.driver_id).length,
  returned: vehicles.filter((v) => v.return_time).length,
  active: vehicles.filter((v) => !v.return_time).length
})
```

## 影响范围

### 受影响的页面
- ✅ 超级管理员 - 车辆管理页面 (`/pages/super-admin/vehicle-management/index.tsx`)

### 受影响的功能
- ✅ 车辆列表显示
- ✅ 车辆搜索
- ✅ 车辆统计

### 不受影响的功能
- ✅ 司机端车辆列表（使用不同的API）
- ✅ 普通管理员车辆查看（使用不同的API）
- ✅ 车辆详情页面

## 测试验证

### 测试步骤
1. ✅ 以超级管理员身份登录
2. ✅ 进入车辆管理页面
3. ✅ 验证能看到所有车辆，包括：
   - 使用中的车辆（status = 'in_use'）
   - 已还车的车辆（status = 'returned'）
   - 停用的车辆（status = 'inactive'）
4. ✅ 验证车辆状态标签正确显示
5. ✅ 验证搜索功能正常工作
6. ✅ 验证车辆统计数据正确

### 预期结果
- 超级管理员能看到所有车辆，包括停用的车辆
- 车辆列表显示正确的状态标签
- 搜索功能能搜索到停用的车辆
- 统计数据包含所有状态的车辆

## 车辆状态说明

### 车辆状态类型
1. **使用中** (`in_use`)
   - `return_time` 为 `null`
   - 车辆正在被司机使用

2. **已还车** (`returned`)
   - `return_time` 不为 `null`
   - 车辆已归还，但可能会再次分配

3. **停用** (`inactive`)
   - `return_time` 不为 `null`
   - 车辆已停用，不再使用

### 状态显示逻辑
--------，状态标签会根据以下逻辑显示：
- 如果 `review_status === 'need_supplement'`：显示"需补录"（红色）
- 如果 `status === 'returned'` 或 `status === 'inactive'`：显示"已停用"（灰色）
- 如果 `status === 'in_use'`：显示"使用中"（绿色）
- 其他情况：显示"草稿"（黄色）

## 数据一致性

### 查询逻辑
```typescript
// 获取每辆车的最新记录
.order('plate_number', {ascending: true})
.order('pickup_time', {ascending: false})

// 按车牌号去重，只保留每辆车的最新记录
const latestVehiclesMap = new Map()
vehiclesData.forEach((vehicle: any) => {
  if (!latestVehiclesMap.has(vehicle.plate_number)) {
    latestVehiclesMap.set(vehicle.plate_number, vehicle)
  }
})
```

git config --global user.name miaoda
- 每辆车只显示一次（最新记录）
- 包括所有状态的车辆
- 数据按车牌号排序

## 性能影响

### 查询性能
- **修改前**：查询时过滤 `return_time IS NULL`，数据量较小
- **修改后**：查询所有记录，数据量可能增加
- **影响评估**：轻微，因为：
  1. 仍然使用索引排序
  2. 在应用层进行去重
  3. 超级管理员需要看到完整数据

### 缓存策略
- 缓存时间：5分钟
- 缓存键：`super_admin_all_vehicles`
- 缓存失效：车辆数据更新时自动清除

## 相关文件

- ✅ `src/db/api.ts` - `getAllVehiclesWithDrivers()` 函数
- ✅ `src/pages/super-admin/vehicle-management/index.tsx` - 车辆管理页面

## 总结

 **问题已解决**：移除查询限制，超级管理员现在能看到所有车辆
 **数据完整性**：包括使用中、已还车和停用的车辆
 **日志优化**：添加更详细的统计信息
 **性能可控**：轻微的性能影响，可接受

---
**修复时间**：2025-11-17
**状态**：✅ 已完成
**影响范围**：超级管理员车辆管理功能
