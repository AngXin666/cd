# 修复还车失败错误

## 修复时间
2025-11-18

## 问题描述
用户在还车时遇到错误，还车操作失败。

## 根本原因

### 问题分析
在 `src/db/api.ts` 的 `returnVehicle` 函数中，代码尝试直接更新 `vehicles` 视图的 `status` 字段：

```typescript
// ❌ 错误的代码
const {data, error} = await supabase
  .from('vehicles')
  .update({
    status: 'returned',  // ❌ 错误：status 是计算字段，不能直接更新
    return_time: new Date().toISOString(),
    return_photos: returnPhotos
  })
  .eq('id', vehicleId)
```

### 为什么会失败？

在 `supabase/migrations/58_create_vehicle_records_system.sql` 中，`vehicles` 视图的 `status` 字段是一个**计算字段**：

```sql
CASE 
  WHEN vr.return_time IS NOT NULL THEN 'returned'
  WHEN vr.review_status = 'approved' THEN 'active'
  ELSE 'inactive'
END AS status
```

**计算字段的特点**：
- 不是实际存储在表中的字段
- 是根据其他字段动态计算出来的
- **不能直接更新**

**正确的逻辑**：
- 只需要更新 `return_time` 字段
- `status` 会根据 `return_time` 的值自动计算
- 当 `return_time` 不为 NULL 时，`status` 自动变为 `'returned'`

## 修复方案

### 修改 returnVehicle 函数

```typescript
// ✅ 正确的代码
export async function returnVehicle(vehicleId: string, returnPhotos: string[]): Promise<Vehicle | null> {
  logger.db('更新', 'vehicles', {vehicleId, action: '还车录入'})
  try {
    // 注意：status 是计算字段，不能直接更新
    // 当 return_time 不为 NULL 时，status 会自动变为 'returned'
    const {data, error} = await supabase
      .from('vehicles')
      .update({
        return_time: new Date().toISOString(),
        return_photos: returnPhotos
      })
      .eq('id', vehicleId)
      .select()
      .maybeSingle()

    if (error) {
      logger.error('还车录入失败', error)
      return null
    }

    // 清除相关缓存
    clearCacheByPrefix('driver_vehicles_')
    clearCache(CACHE_KEYS.ALL_VEHICLES)

    logger.info('成功完成还车录入', {vehicleId})
    return data
  } catch (error) {
    logger.error('还车录入异常', error)
    return null
  }
}
```

### 修改内容
1. ✅ 移除 `status: 'returned'` 的更新
2. ✅ 只更新 `return_time` 和 `return_photos`
3. ✅ 添加注释说明 `status` 是计算字段
4. ✅ 保持其他逻辑不变（缓存清除、日志记录等）

## 修复效果

### 修复前
- ❌ 还车操作失败
- ❌ 尝试更新不可更新的计算字段
- ❌ 数据库返回错误

### 修复后
- ✅ 还车操作成功
- ✅ 只更新实际存储的字段
- ✅ `status` 字段自动计算为 `'returned'`
- ✅ 车辆状态正确更新

## 技术要点

### 1. 计算字段 vs 存储字段

**计算字段（Computed Field）**：
- 在 SQL 视图中使用 `CASE WHEN ... END AS field_name` 定义
- 不占用存储空间
- 每次查询时动态计算
- **不能直接更新**

**存储字段（Stored Field）**：
- 在表结构中定义
- 占用存储空间
- 可以直接更新

### 2. 视图更新规则

当更新视图时：
- 只能更新视图底层表中实际存储的字段
- 计算字段会根据底层字段的变化自动重新计算
- 如果尝试更新计算字段，会导致错误

### 3. 正确的更新策略

对于 `vehicles` 视图：
- ✅ 更新 `return_time` → `status` 自动变为 `'returned'`
- ✅ 更新 `review_status` → `status` 可能变为 `'active'` 或 `'inactive'`
- ❌ 直接更新 `status` → 错误

## 相关文件
- `src/db/api.ts` - 修复 `returnVehicle` 函数
- `supabase/migrations/58_create_vehicle_records_system.sql` - `vehicles` 视图定义

## 测试场景

### 场景1：正常还车
**测试步骤**：
1. 登录司机账号
2. 进入车辆详情页
3. 点击"还车"按钮
4. 拍摄7张车辆照片
5. 上传车损照片（可选）
6. 点击"提交还车"

**预期结果**：
- ✅ 还车成功
- ✅ 显示"还车成功"提示
- ✅ 车辆状态变为"已还车"
- ✅ 记录还车时间
- ✅ 保存还车照片

### 场景2：查看还车后的车辆
**测试步骤**：
1. 还车成功后
2. 返回车辆列表
3. 查看该车辆的状态

**预期结果**：
- ✅ 车辆状态显示为"已还车"
- ✅ 显示还车时间
- ✅ 可以查看还车照片

### 场景3：超级管理员查看还车记录
**测试步骤**：
1. 登录超级管理员账号
2. 进入车辆管理
3. 点击该车辆的"历史记录"按钮
4. 查看还车记录

**预期结果**：
- ✅ 显示完整的还车记录
- ✅ 显示还车时间
- ✅ 显示还车照片
- ✅ 显示车损照片（如果有）

## 代码质量
- ✅ 通过 Biome 代码检查
- ✅ 无 TypeScript 错误
- ✅ 逻辑清晰，易于维护
- ✅ 添加了详细的注释说明

## 经验总结

### 1. 理解数据模型
- 在修改数据库操作前，先理解字段的定义
- 区分计算字段和存储字段
- 查看视图定义，了解字段来源

### 2. 遵循数据库设计
- 不要尝试更新计算字段
- 通过更新底层字段来影响计算字段
- 利用数据库的自动计算功能

### 3. 添加清晰的注释
- 对于容易混淆的地方，添加注释说明
- 解释为什么这样做，而不仅仅是做了什么
- 帮助未来的维护者理解代码逻辑
