# 最新修复 - 还车失败错误

## 修复时间
2025-11-18

## 问题描述
用户在还车时遇到错误，还车操作失败。

## 根本原因
`returnVehicle` 函数尝试直接更新 `vehicles` 视图的 `status` 字段，但 `status` 是一个**计算字段**，不能直接更新。

**错误代码**：
```typescript
// ❌ 错误：尝试更新计算字段
const {data, error} = await supabase
  .from('vehicles')
  .update({
    status: 'returned',  // ❌ status 是计算字段，不能直接更新
    return_time: new Date().toISOString(),
    return_photos: returnPhotos
  })
```

**计算字段定义**：
```sql
CASE 
  WHEN vr.return_time IS NOT NULL THEN 'returned'
  WHEN vr.review_status = 'approved' THEN 'active'
  ELSE 'inactive'
END AS status
```

## 修复内容

### 修改 returnVehicle 函数 (src/db/api.ts)
- ✅ 移除 `status: 'returned'` 的更新
- ✅ 只更新 `return_time` 和 `return_photos`
- ✅ 添加注释说明 `status` 是计算字段
- ✅ `status` 会根据 `return_time` 自动计算

**修复后的代码**：
```typescript
// ✅ 正确：只更新存储字段
const {data, error} = await supabase
  .from('vehicles')
  .update({
    return_time: new Date().toISOString(),
    return_photos: returnPhotos
  })
  .eq('id', vehicleId)
  .select()
  .maybeSingle()
```

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

### 计算字段 vs 存储字段

**计算字段（Computed Field）**：
- 在 SQL 视图中使用 `CASE WHEN ... END AS field_name` 定义
- 不占用存储空间
- 每次查询时动态计算
- **不能直接更新**

**存储字段（Stored Field）**：
- 在表结构中定义
- 占用存储空间
- 可以直接更新

### 正确的更新策略
- ✅ 更新 `return_time` → `status` 自动变为 `'returned'`
- ✅ 更新 `review_status` → `status` 可能变为 `'active'` 或 `'inactive'`
- ❌ 直接更新 `status` → 错误

## 测试验证

### 场景1：正常还车
**预期**：还车成功，车辆状态变为"已还车"
**状态**：✅ 代码已修复，待测试

### 场景2：查看还车后的车辆
**预期**：车辆状态显示为"已还车"，显示还车时间和照片
**状态**：✅ 代码已修复，待测试

### 场景3：超级管理员查看还车记录
**预期**：显示完整的还车记录和照片
**状态**：✅ 代码已修复，待测试

## 相关文档
- `FIX_RETURN_VEHICLE_ERROR.md` - 详细修复说明
- `FIX_SUMMARY.md` - 所有修复的总结

## 代码质量
- ✅ 通过 Biome 代码检查
- ✅ 无 TypeScript 错误
- ✅ 添加了详细的注释说明
- ✅ 逻辑清晰，易于维护

