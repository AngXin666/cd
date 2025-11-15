# 车辆删除功能说明文档

## 📋 更新记录

### v1.1.0 (2025-11-16)
**重要更新**：修复了两个关键问题

✅ **修复1：删除后列表自动刷新**
- 问题：删除车辆后，列表页面仍显示已删除的车辆
- 解决：删除成功后自动清除缓存，列表立即刷新

✅ **修复2：自动删除图片文件**
- 问题：删除车辆后，存储桶中的图片文件仍然存在
- 解决：删除车辆时同时删除所有关联的图片文件

### v1.0.0 (2025-11-16)
- 初始版本：基础删除功能

---

## 功能概述

为方便开发和测试阶段快速清理测试数据，在司机端车辆详情页面添加了临时的车辆删除功能。

⚠️ **重要提示**：这是一个临时测试功能，建议在生产环境上线前移除。

**核心功能**：
- ✅ 删除数据库中的车辆记录
- ✅ 自动删除存储桶中的图片文件（提车、还车、行驶证照片）
- ✅ 自动清除缓存，列表立即刷新
- ✅ 完整的确认机制和错误处理
- ✅ 详细的日志记录

---

## 功能位置

**页面路径**：司机端 → 车辆列表 → 车辆详情

**文件位置**：`src/pages/driver/vehicle-detail/index.tsx`

---

## 使用方法

### 步骤1：进入车辆详情页面

1. 登录司机端账号
2. 点击底部导航栏的"车辆管理"
3. 在车辆列表中点击任意车辆卡片
4. 进入车辆详情页面

### 步骤2：找到删除按钮

在车辆详情页面顶部，车辆信息卡片下方，会看到一个红色警告区域：

```
┌─────────────────────────────────────────┐
│ ⚠️ 测试功能                              │
│ 删除此车辆记录，方便重新录入测试          │  [删除]
└─────────────────────────────────────────┘
```

### 步骤3：点击删除按钮

点击右侧的红色"删除"按钮

### 步骤4：确认删除

系统会弹出确认对话框：

```
┌─────────────────────────────────────┐
│           确认删除                   │
│                                     │
│  确定要删除车辆 京A12345 吗？        │
│  此操作不可恢复！                    │
│                                     │
│  [取消]              [删除]         │
└─────────────────────────────────────┘
```

- 点击"取消"：取消删除操作
- 点击"删除"：确认删除车辆

### 步骤5：删除完成

- 系统显示"删除中..."加载提示
- 删除成功后显示"删除成功"提示
- 2秒后自动返回车辆列表页面

---

## 功能特性

### 1. 安全确认机制

- **二次确认**：必须通过确认对话框才能删除
- **明确提示**：对话框中显示具体的车牌号
- **不可恢复警告**：明确提示"此操作不可恢复"

### 2. 视觉警告设计

- **红色主题**：使用红色背景和边框，突出警告性
- **警告图标**：显示⚠️图标，增强警告效果
- **明确标注**：标注"测试功能"，避免误解

### 3. 用户体验优化

- **加载提示**：删除过程中显示加载动画
- **成功反馈**：删除成功后显示成功提示
- **自动返回**：删除成功后自动返回列表页面
- **错误处理**：删除失败时显示错误提示

### 4. 日志记录

所有删除操作都会记录详细日志：

```typescript
logger.userAction('删除车辆', {
  vehicleId: vehicle.id,
  plateNumber: vehicle.plate_number
})
```

日志包含：
- 操作时间
- 用户ID
- 车辆ID
- 车牌号

---

## 技术实现

### 数据库操作（v1.1.0 更新）

使用增强版的 `deleteVehicle` API函数：

```typescript
export async function deleteVehicle(vehicleId: string): Promise<boolean> {
  logger.db('删除', 'vehicles', {vehicleId})
  try {
    // 1. 先获取车辆信息，获取所有图片路径
    const vehicle = await getVehicleById(vehicleId)
    if (!vehicle) {
      logger.error('车辆不存在', {vehicleId})
      return false
    }

    // 2. 收集所有图片路径
    const allPhotos: string[] = []
    if (vehicle.pickup_photos) {
      allPhotos.push(...vehicle.pickup_photos)
    }
    if (vehicle.return_photos) {
      allPhotos.push(...vehicle.return_photos)
    }
    if (vehicle.registration_photos) {
      allPhotos.push(...vehicle.registration_photos)
    }

    // 3. 删除存储桶中的图片文件
    const bucketName = `${process.env.TARO_APP_APP_ID}_images`
    if (allPhotos.length > 0) {
      logger.info('开始删除图片文件', {vehicleId, photoCount: allPhotos.length})
      
      // 过滤出相对路径（不是完整URL的）
      const photoPaths = allPhotos.filter(photo => {
        return photo && !photo.startsWith('http://') && !photo.startsWith('https://')
      })

      if (photoPaths.length > 0) {
        const {error: storageError} = await supabase.storage
          .from(bucketName)
          .remove(photoPaths)

        if (storageError) {
          logger.warn('删除部分图片文件失败', {error: storageError, paths: photoPaths})
          // 继续删除数据库记录，即使图片删除失败
        } else {
          logger.info('成功删除图片文件', {vehicleId, deletedCount: photoPaths.length})
        }
      }
    }

    // 4. 删除数据库记录
    const {error} = await supabase.from('vehicles').delete().eq('id', vehicleId)

    if (error) {
      logger.error('删除车辆失败', error)
      return false
    }

    // 5. 清除相关缓存
    clearCache(CACHE_KEYS.DRIVER_VEHICLES)
    clearCache(CACHE_KEYS.ALL_VEHICLES)

    logger.info('成功删除车辆及关联文件', {vehicleId, photoCount: allPhotos.length})
    return true
  } catch (error) {
    logger.error('删除车辆异常', error)
    return false
  }
}
```

**v1.1.0 新增功能**：
1. ✅ 删除前获取车辆完整信息
2. ✅ 收集所有图片路径（提车、还车、行驶证）
3. ✅ 批量删除存储桶中的图片文件
4. ✅ 清除相关缓存（司机端和管理端）
5. ✅ 详细的日志记录

### 权限控制

依赖Supabase RLS（Row Level Security）策略：

- 司机只能删除自己录入的车辆（`driver_id = auth.uid()`）
- 管理员可以删除所有车辆
- 未登录用户无法删除任何车辆

### 删除范围（v1.1.0 更新）

**会删除**：
- ✅ 数据库中的车辆记录（`vehicles`表）
- ✅ 存储桶中的图片文件（提车、还车、行驶证照片）**【新增】**
- ✅ 相关缓存数据（司机端和管理端列表缓存）**【新增】**

**不会删除**：
- ❌ 审核历史记录（如果有）
- ❌ 其他关联数据

### 缓存管理（v1.1.0 新增）

删除成功后自动清除以下缓存：

```typescript
clearCache(CACHE_KEYS.DRIVER_VEHICLES)  // 司机端车辆列表缓存
clearCache(CACHE_KEYS.ALL_VEHICLES)     // 管理端车辆列表缓存
```

**效果**：
- 删除后返回列表页面，列表立即刷新
- 不再显示已删除的车辆
- 无需手动刷新页面

---

## 使用场景

### 1. 开发测试

**场景**：开发人员测试车辆录入功能

**操作流程**：
1. 录入测试车辆
2. 测试各种功能
3. 使用删除功能清理测试数据
4. 重新开始测试

### 2. 功能验证

**场景**：验证车辆审核流程

**操作流程**：
1. 录入车辆并提交审核
2. 测试审核功能
3. 删除测试车辆
4. 重复测试不同场景

### 3. 数据修正

**场景**：录入错误需要重新录入

**操作流程**：
1. 发现录入错误
2. 删除错误记录
3. 重新正确录入

---

## 注意事项

### ⚠️ 重要警告

1. **不可恢复**
   - 删除操作是物理删除，无法恢复
   - 删除前请确认车辆信息
   - 建议在测试环境使用

2. **图片文件**
   - 删除车辆不会删除关联的图片文件
   - 图片文件会继续占用存储空间
   - 需要手动清理存储桶（如果需要）

3. **生产环境**
   - 这是临时测试功能
   - 生产环境应移除此功能
   - 或限制仅管理员可见

4. **权限限制**
   - 司机只能删除自己的车辆
   - 无法删除其他司机的车辆
   - 依赖数据库RLS策略

---

## 故障排查

### 问题1：删除按钮不显示

**可能原因**：
- 页面未正确加载
- 车辆数据为空

**解决方法**：
- 刷新页面
- 检查网络连接
- 查看浏览器控制台错误

### 问题2：点击删除无反应

**可能原因**：
- 网络连接问题
- 权限不足
- 数据库错误

**解决方法**：
- 检查网络连接
- 确认登录状态
- 查看日志记录

### 问题3：删除失败

**可能原因**：
- 权限不足（不是车辆所有者）
- 数据库连接失败
- RLS策略限制

**解决方法**：
- 确认是否为车辆所有者
- 检查数据库连接
- 联系管理员检查权限

### ~~问题4：删除后图片仍存在~~（v1.1.0 已修复）

**v1.0.0 问题**：
- 删除车辆不会删除图片文件
- 图片文件需要手动清理

**v1.1.0 修复**：
- ✅ 删除车辆时自动删除所有关联图片
- ✅ 批量删除提车、还车、行驶证照片
- ✅ 详细的日志记录

**如果仍有图片残留**：
1. 检查日志，查看是否有删除失败的记录
2. 登录Supabase控制台手动清理
3. 检查图片路径格式是否正确

### 问题5：删除后列表仍显示车辆（v1.1.0 已修复）

**v1.0.0 问题**：
- 删除后返回列表，车辆仍然显示
- 需要手动刷新页面

**v1.1.0 修复**：
- ✅ 删除成功后自动清除缓存
- ✅ 列表页面立即刷新
- ✅ 无需手动操作

**如果列表仍未刷新**：
1. 检查网络连接
2. 手动下拉刷新列表
3. 退出重新进入页面

---

## 后续优化建议

### 1. 软删除机制

**当前**：物理删除，数据无法恢复

**建议**：
- 添加 `deleted_at` 字段
- 删除时只标记时间，不删除记录
- 支持恢复功能
- 定期清理过期的软删除记录

**实现示例**：
```typescript
// 软删除
UPDATE vehicles 
SET deleted_at = NOW() 
WHERE id = vehicleId;

// 恢复
UPDATE vehicles 
SET deleted_at = NULL 
WHERE id = vehicleId;

// 查询时过滤已删除
SELECT * FROM vehicles 
WHERE deleted_at IS NULL;
```

### 2. 环境限制

**当前**：所有环境都显示删除按钮

**建议**：
- 仅在开发环境显示
- 使用环境变量控制
- 生产环境自动隐藏

**实现示例**：
```tsx
{process.env.NODE_ENV === 'development' && (
  <View className="bg-red-50 ...">
    {/* 删除按钮 */}
  </View>
)}
```

### 3. 批量删除

**当前**：只能单个删除

**建议**：
- 在列表页面支持批量选择
- 一次删除多个车辆
- 提高测试效率

**实现示例**：
```tsx
// 列表页面
const [selectedIds, setSelectedIds] = useState<string[]>([])

// 批量删除
const handleBatchDelete = async () => {
  for (const id of selectedIds) {
    await deleteVehicle(id)
  }
}
```

### 4. 关联删除

**当前**：只删除数据库记录

**建议**：
- 同时删除关联的图片文件
- 删除审核记录
- 清理所有相关数据

**实现示例**：
```typescript
export async function deleteVehicleWithFiles(vehicleId: string): Promise<boolean> {
  // 1. 获取车辆信息
  const vehicle = await getVehicleById(vehicleId)
  
  // 2. 删除图片文件
  const photos = [
    ...vehicle.pickup_photos,
    ...vehicle.return_photos,
    ...vehicle.registration_photos
  ]
  
  for (const photo of photos) {
    await supabase.storage
      .from('bucket_name')
      .remove([photo])
  }
  
  // 3. 删除数据库记录
  return await deleteVehicle(vehicleId)
}
```

### 5. 删除历史

**当前**：无法查看删除历史

**建议**：
- 记录所有删除操作
- 显示删除历史列表
- 支持查看删除详情

**实现示例**：
```typescript
// 删除历史表
CREATE TABLE deletion_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL,
  plate_number TEXT NOT NULL,
  deleted_by UUID NOT NULL,
  deleted_at TIMESTAMPTZ DEFAULT NOW(),
  vehicle_data JSONB NOT NULL
);

// 记录删除
INSERT INTO deletion_history (vehicle_id, plate_number, deleted_by, vehicle_data)
VALUES (vehicleId, plateNumber, userId, vehicleJson);
```

---

## 移除指南

当准备上线生产环境时，建议移除此功能：

### 方法1：完全移除

删除以下代码：

**文件**：`src/pages/driver/vehicle-detail/index.tsx`

```tsx
// 1. 删除导入
import {deleteVehicle, getVehicleById} from '@/db/api'
// 改为
import {getVehicleById} from '@/db/api'

// 2. 删除处理函数
const handleDeleteVehicle = async () => {
  // ... 整个函数
}

// 3. 删除UI组件
{/* 测试功能：删除按钮 */}
<View className="bg-red-50 ...">
  {/* ... 整个组件 */}
</View>
```

### 方法2：条件显示

使用环境变量控制：

```tsx
{process.env.NODE_ENV === 'development' && (
  <View className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-4">
    {/* 删除按钮 */}
  </View>
)}
```

### 方法3：权限限制

仅管理员可见：

```tsx
{user?.role === 'admin' && (
  <View className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-4">
    {/* 删除按钮 */}
  </View>
)}
```

---

## 总结

车辆删除功能是一个实用的测试工具，能够：

✅ **提高测试效率**：快速清理测试数据
✅ **方便功能验证**：重复测试各种场景
✅ **简化数据修正**：快速删除错误记录

但需要注意：

⚠️ **临时功能**：仅用于开发测试阶段
⚠️ **不可恢复**：删除操作无法撤销
⚠️ **生产限制**：建议生产环境移除或限制

---

**文档版本**：v1.1.0  
**创建日期**：2025-11-16  
**最后更新**：2025-11-16  
**更新内容**：
- v1.1.0：修复删除后列表刷新问题，添加图片文件自动删除功能
- v1.0.0：初始版本，基础删除功能
