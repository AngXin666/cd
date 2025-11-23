# 车辆历史记录 - 车损照片功能说明

## 功能概述

车辆历史记录页面现在支持分别显示提车时和还车时拍摄的车损照片。

## 实现细节

### 1. 照片命名规则

- **提车时的车损照片**：文件名包含 `pickup_damage`
  - 示例：`pickup_damage_0_1763827031950_abc123.jpg`
  
- **还车时的车损照片**：文件名包含 `return_damage`
  - 示例：`return_damage_0_1763827031950_xyz789.jpg`

### 2. 数据存储

所有车损照片（提车和还车）都存储在 `vehicles` 表的 `damage_photos` 字段中（text[] 数组类型）。

### 3. 页面显示

历史记录页面有三个标签页：

#### 提车信息标签页（绿色）
显示内容：
- ✅ 提车时间
- ✅ 车辆照片（7个角度）
- ✅ 行驶证照片
- ✅ **车损特写（提车时）** - 过滤显示文件名包含 `pickup_damage` 的照片

#### 还车信息标签页（蓝色）
显示内容：
- ✅ 还车时间
- ✅ 还车照片
- ✅ **车损特写（还车时）** - 过滤显示文件名包含 `return_damage` 的照片

#### 实名信息标签页（橙色）
显示内容：
- ✅ 司机个人信息（姓名、电话、邮箱）
- ✅ 身份证照片
- ✅ 驾驶证照片

## 代码实现

### 照片过滤函数

```typescript
// 获取提车时的车损照片
const getPickupDamagePhotos = (): string[] => {
  const allDamagePhotos = getDamagePhotos()
  return allDamagePhotos.filter((url) => url.includes('pickup_damage'))
}

// 获取还车时的车损照片
const getReturnDamagePhotos = (): string[] => {
  const allDamagePhotos = getDamagePhotos()
  return allDamagePhotos.filter((url) => url.includes('return_damage'))
}
```

### 还车时的照片追加逻辑

还车时，新的车损照片会**追加**到现有的 `damage_photos` 数组中，而不是覆盖：

```typescript
// 获取现有的车损照片（包含提车时的照片）
const existingDamagePhotos = vehicle.damage_photos || []
// 合并提车和还车的车损照片
const allDamagePhotos = [...existingDamagePhotos, ...uploadedDamagePhotos]
await updateVehicle(vehicle.id, {
  damage_photos: allDamagePhotos
})
```

## 测试步骤

### 完整流程测试

1. **提车阶段**
   - 登录司机账号
   - 进入"提车录入"页面
   - 填写车辆信息
   - 在"车损特写"部分上传车损照片
   - 提交提车信息
   - ✅ 验证：`damage_photos` 数组中应包含 `pickup_damage` 前缀的照片

2. **还车阶段**
   - 登录同一司机账号
   - 进入"还车"页面
   - 选择要还车的车辆
   - 上传还车照片
   - 在"车损特写"部分上传车损照片
   - 提交还车信息
   - ✅ 验证：`damage_photos` 数组中应同时包含 `pickup_damage` 和 `return_damage` 前缀的照片

3. **查看历史记录**
   - 登录超级管理员账号
   - 进入"车辆管理"页面
   - 点击已还车车辆的"查看历史"按钮
   - 切换到"提车信息"标签页
   - ✅ 验证：应该看到"车损特写（提车时）"部分，显示提车时拍摄的车损照片
   - 切换到"还车信息"标签页
   - ✅ 验证：应该看到"车损特写（还车时）"部分，显示还车时拍摄的车损照片

## 注意事项

### 历史数据问题

⚠️ **重要**：在 2025-11-22 23:57 之前还车的车辆，由于当时的代码会覆盖车损照片，所以这些车辆的历史记录中：
- ❌ 提车时的车损照片已丢失
- ✅ 只保留了还车时的车损照片

### 新数据保证

✅ 从 2025-11-22 23:57 之后的所有还车操作，都会正确保留提车和还车时的车损照片。

## 数据库查询示例

### 查看车辆的所有车损照片

```sql
SELECT 
  plate_number,
  pickup_time,
  return_time,
  damage_photos,
  array_length(damage_photos, 1) as photo_count
FROM vehicles
WHERE damage_photos IS NOT NULL
AND array_length(damage_photos, 1) > 0
ORDER BY pickup_time DESC;
```

### 检查照片类型分布

```sql
SELECT 
  plate_number,
  (SELECT COUNT(*) FROM unnest(damage_photos) AS photo 
   WHERE photo LIKE '%pickup_damage%') as pickup_count,
  (SELECT COUNT(*) FROM unnest(damage_photos) AS photo 
   WHERE photo LIKE '%return_damage%') as return_count
FROM vehicles
WHERE damage_photos IS NOT NULL;
```

## 相关文件

- `/src/pages/super-admin/vehicle-history/index.tsx` - 历史记录页面
- `/src/pages/driver/add-vehicle/index.tsx` - 提车录入页面
- `/src/pages/driver/return-vehicle/index.tsx` - 还车页面
- `/src/db/api.ts` - 数据库API

## 更新日志

- **2025-11-22 23:57**: 修复还车时覆盖车损照片的问题，改为追加模式
- **2025-11-22 22:30**: 在历史记录页面添加提车时的车损照片显示
- **2025-11-22 22:00**: 优化标签页布局和颜色方案
