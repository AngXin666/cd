# 审核端"一键锁定"功能说明

## 📅 功能添加日期
2025-11-16

## 🎯 功能目标

为超级管理员提供一键锁定功能，在审核车辆时可以快速锁定所有合格照片，同时保留需要补录的照片供司机修改。

## 💡 功能背景

### 原有审核流程的痛点

1. **逐张锁定效率低**：
   - 审核员需要逐张点击照片进行锁定
   - 如果有10张照片，需要点击10次
   - 操作繁琐，容易遗漏

2. **部分补录场景复杂**：
   - 有些照片合格，有些需要补录
   - 需要先标记需要补录的，再逐张锁定合格的
   - 操作步骤多，容易出错

3. **审核状态不明确**：
   - 锁定和审核通过是两个独立操作
   - 审核员需要记住哪些照片已锁定
   - 容易造成混淆

### 用户需求

> "审核端可以除了标记的要补录的以后一键锁定"

**需求分析**：
- 标记需要补录的照片后
- 一键锁定其他所有合格照片
- 简化审核流程，提高效率

## 🚀 功能特性

### 1. 智能识别

**自动识别需要锁定的照片**：
```typescript
// 遍历所有照片字段
PHOTO_FIELDS.forEach(({field}) => {
  const photos = vehicle[field] || []
  const lockedIndices: number[] = []

  photos.forEach((_, index) => {
    // 如果不在需要补录列表中，则锁定
    if (!requiredPhotos.includes(`${field}[${index}]`)) {
      lockedIndices.push(index)
      totalLockedCount++
    }
  })

  if (lockedIndices.length > 0) {
    lockedPhotosData[field] = lockedIndices
  }
})
```

**识别逻辑**：
- ✅ 未标记需要补录的照片 → 锁定
- ❌ 已标记需要补录的照片 → 不锁定

### 2. 批量锁定

**一键完成所有锁定操作**：
```typescript
const lockedPhotosData: LockedPhotos = {
  pickup_photos: [0, 1, 2, 3, 4, 5, 6],  // 锁定所有7张提车照片
  registration_photos: [0, 1]             // 锁定2张行驶证照片，保留1张待补录
}

await lockVehiclePhotos(vehicle.id, user.id, reviewNotes, lockedPhotosData)
```

**锁定效果**：
- 所有合格照片立即锁定
- 司机无法修改或删除已锁定照片
- 保留需要补录的照片供司机修改

### 3. 清晰反馈

**操作前确认**：
```
┌─────────────────────────────┐
│      确认一键锁定            │
├─────────────────────────────┤
│ 将锁定 7 张照片，            │
│ 保留 3 张待补录              │
├─────────────────────────────┤
│  [取消]        [确定]        │
└─────────────────────────────┘
```

**操作后提示**：
```
✓ 锁定成功
```

### 4. 审核状态更新

**自动更新审核信息**：
```typescript
{
  review_status: 'approved',           // 审核状态：已通过
  locked_photos: lockedPhotosData,     // 已锁定的照片信息
  review_notes: notes,                 // 审核备注
  reviewed_at: new Date().toISOString(), // 审核时间
  reviewed_by: reviewerId,             // 审核人ID
  updated_at: new Date().toISOString()  // 更新时间
}
```

## 📱 用户界面

### 按钮布局

**修改前**（两个按钮并排）：
```
┌─────────────────────────────────┐
│  [要求补录]    [通过审核]        │
│  (红色)        (绿色)            │
└─────────────────────────────────┘
```

**修改后**（三个按钮，两行布局）：
```
┌─────────────────────────────────┐
│  [要求补录] (红色，全宽)         │
│  [一键锁定] [通过审核]           │
│  (蓝色)     (绿色)               │
└─────────────────────────────────┘
```

### 按钮样式

#### 要求补录按钮
- **颜色**：红色渐变（from-red-500 to-red-600）
- **图标**：i-mdi-alert-circle（警告圆圈）
- **位置**：第一行，全宽
- **功能**：标记需要补录的照片并通知司机

#### 一键锁定按钮
- **颜色**：蓝色渐变（from-blue-500 to-blue-600）
- **图标**：i-mdi-lock（锁定）
- **位置**：第二行，左侧
- **功能**：锁定所有未标记需要补录的照片

#### 通过审核按钮
- **颜色**：绿色渐变（from-green-500 to-green-600）
- **图标**：i-mdi-check-circle（勾选圆圈）
- **位置**：第二行，右侧
- **功能**：通过审核（要求所有照片都合格）

### 交互效果

**按钮状态**：
- **正常状态**：渐变背景，白色文字
- **按下状态**：缩小效果（active:scale-95）
- **禁用状态**：灰色，不可点击

**过渡动画**：
```css
transition-all  /* 平滑过渡所有属性 */
```

## 🔄 使用流程

### 场景1：部分照片需要补录

**步骤**：
1. 审核员查看车辆照片
2. 发现3张照片不合格，点击"标记需要补录"
3. 填写审核备注，说明需要补录的原因
4. 点击"一键锁定"按钮
5. 系统提示：`将锁定 7 张照片，保留 3 张待补录`
6. 确认后，系统锁定7张合格照片
7. 司机收到通知，只能修改标记的3张照片

**数据变化**：
```typescript
// 锁定前
{
  review_status: 'pending_review',
  locked_photos: {},
  required_photos: ['pickup_photos[0]', 'pickup_photos[1]', 'registration_photos[2]']
}

// 锁定后
{
  review_status: 'approved',
  locked_photos: {
    pickup_photos: [2, 3, 4, 5, 6],      // 锁定5张提车照片
    registration_photos: [0, 1]           // 锁定2张行驶证照片
  },
  required_photos: ['pickup_photos[0]', 'pickup_photos[1]', 'registration_photos[2]']
}
```

### 场景2：所有照片都合格

**步骤**：
1. 审核员查看车辆照片
2. 所有照片都合格，未标记任何照片
3. 点击"一键锁定"按钮
4. 系统提示：`将锁定 10 张照片`
5. 确认后，系统锁定所有照片
6. 车辆审核通过，照片全部锁定

**数据变化**：
```typescript
// 锁定前
{
  review_status: 'pending_review',
  locked_photos: {},
  required_photos: []
}

// 锁定后
{
  review_status: 'approved',
  locked_photos: {
    pickup_photos: [0, 1, 2, 3, 4, 5, 6],  // 锁定所有7张提车照片
    registration_photos: [0, 1, 2]          // 锁定所有3张行驶证照片
  },
  required_photos: []
}
```

### 场景3：没有可锁定的照片

**步骤**：
1. 审核员查看车辆照片
2. 所有照片都标记为需要补录
3. 点击"一键锁定"按钮
4. 系统提示：`没有可以锁定的照片`
5. 操作取消

**提示逻辑**：
```typescript
if (totalLockedCount === 0) {
  Taro.showModal({
    title: '提示',
    content: '没有可以锁定的照片',
    showCancel: false
  })
  return
}
```

## 🔧 技术实现

### 1. API函数

**文件**：`src/db/api.ts`

**函数签名**：
```typescript
export async function lockVehiclePhotos(
  vehicleId: string,
  reviewerId: string,
  notes: string,
  lockedPhotos: LockedPhotos
): Promise<boolean>
```

**参数说明**：
- `vehicleId`：车辆ID
- `reviewerId`：审核人ID
- `notes`：审核备注
- `lockedPhotos`：已锁定的照片信息

**返回值**：
- `true`：锁定成功
- `false`：锁定失败

**实现逻辑**：
```typescript
export async function lockVehiclePhotos(
  vehicleId: string,
  reviewerId: string,
  notes: string,
  lockedPhotos: LockedPhotos
): Promise<boolean> {
  try {
    logger.db('一键锁定车辆照片', 'vehicles', {vehicleId, reviewerId, notes, lockedPhotos})

    const {error} = await supabase
      .from('vehicles')
      .update({
        review_status: 'approved',
        locked_photos: lockedPhotos,
        review_notes: notes,
        reviewed_at: new Date().toISOString(),
        reviewed_by: reviewerId,
        updated_at: new Date().toISOString()
      })
      .eq('id', vehicleId)

    if (error) {
      logger.error('一键锁定车辆照片失败', error)
      return false
    }

    logger.info('一键锁定车辆照片成功', {vehicleId})
    return true
  } catch (error) {
    logger.error('一键锁定车辆照片异常', error)
    return false
  }
}
```

### 2. 页面处理函数

**文件**：`src/pages/super-admin/vehicle-review-detail/index.tsx`

**函数签名**：
```typescript
const handleLockAll = async () => Promise<void>
```

**实现逻辑**：
```typescript
const handleLockAll = async () => {
  if (!vehicle || !user) return

  // 1. 计算需要锁定的照片
  const lockedPhotosData: LockedPhotos = {}
  let totalLockedCount = 0

  PHOTO_FIELDS.forEach(({field}) => {
    const photos = vehicle[field] || []
    const lockedIndices: number[] = []

    photos.forEach((_, index) => {
      // 如果不在需要补录列表中，则锁定
      if (!requiredPhotos.includes(`${field}[${index}]`)) {
        lockedIndices.push(index)
        totalLockedCount++
      }
    })

    if (lockedIndices.length > 0) {
      lockedPhotosData[field] = lockedIndices
    }
  })

  // 2. 检查是否有可锁定的照片
  if (totalLockedCount === 0) {
    Taro.showModal({
      title: '提示',
      content: '没有可以锁定的照片',
      showCancel: false
    })
    return
  }

  // 3. 显示确认对话框
  const supplementCount = requiredPhotos.length

  Taro.showModal({
    title: '确认一键锁定',
    content: `将锁定 ${totalLockedCount} 张照片${supplementCount > 0 ? `，保留 ${supplementCount} 张待补录` : ''}`,
    success: async (res) => {
      if (res.confirm) {
        setSubmitting(true)
        Taro.showLoading({title: '锁定中...'})

        try {
          // 4. 调用API锁定照片
          const success = await lockVehiclePhotos(vehicle.id, user.id, reviewNotes, lockedPhotosData)
          if (success) {
            Taro.hideLoading()
            Taro.showToast({title: '锁定成功', icon: 'success'})
            setTimeout(() => {
              Taro.navigateBack()
            }, 1500)
          } else {
            throw new Error('锁定失败')
          }
        } catch (error) {
          logger.error('一键锁定失败', error)
          Taro.hideLoading()
          Taro.showToast({title: '操作失败', icon: 'none'})
        } finally {
          setSubmitting(false)
        }
      }
    }
  })
}
```

### 3. UI组件

**按钮组件**：
```tsx
<Button
  className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 rounded-lg break-keep text-sm shadow-md active:scale-95 transition-all"
  size="default"
  onClick={handleLockAll}
  disabled={submitting}>
  <View className="flex items-center justify-center">
    <View className="i-mdi-lock text-lg mr-2"></View>
    <Text className="font-medium">一键锁定</Text>
  </View>
</Button>
```

**样式说明**：
- `flex-1`：占据剩余空间
- `bg-gradient-to-r from-blue-500 to-blue-600`：蓝色渐变背景
- `text-white`：白色文字
- `py-3`：垂直内边距
- `rounded-lg`：圆角
- `break-keep`：防止文字换行
- `text-sm`：小号字体
- `shadow-md`：中等阴影
- `active:scale-95`：按下时缩小
- `transition-all`：平滑过渡

## 📊 数据结构

### LockedPhotos类型

**定义**：
```typescript
export interface LockedPhotos {
  pickup_photos?: number[]        // 已锁定的提车照片索引
  return_photos?: number[]        // 已锁定的还车照片索引
  registration_photos?: number[]  // 已锁定的行驶证照片索引
}
```

**示例1：部分锁定**
```typescript
{
  pickup_photos: [2, 3, 4, 5, 6],      // 锁定5张提车照片（索引2-6）
  registration_photos: [0, 1]           // 锁定2张行驶证照片（索引0-1）
}
```

**示例2：全部锁定**
```typescript
{
  pickup_photos: [0, 1, 2, 3, 4, 5, 6],  // 锁定所有7张提车照片
  registration_photos: [0, 1, 2]          // 锁定所有3张行驶证照片
}
```

**示例3：空锁定**
```typescript
{}  // 没有锁定任何照片
```

### Vehicle类型更新

**相关字段**：
```typescript
export interface Vehicle {
  // ... 其他字段 ...
  
  // 审核管理字段
  review_status: ReviewStatus           // 审核状态
  locked_photos: LockedPhotos           // 已锁定的图片信息
  required_photos: string[]             // 需要补录的图片字段列表
  review_notes: string | null           // 审核备注
  reviewed_at: string | null            // 审核时间
  reviewed_by: string | null            // 审核人ID
}
```

## 🎨 设计理念

### 1. 用户体验优先

**简化操作流程**：
- 一键完成批量锁定
- 减少点击次数
- 降低操作难度

**清晰的视觉反馈**：
- 蓝色代表锁定操作
- 明确显示锁定数量
- 操作结果即时反馈

### 2. 灵活性

**支持多种场景**：
- 全部锁定：所有照片都合格
- 部分锁定：部分照片需要补录
- 无法锁定：所有照片都需要补录

**保留原有功能**：
- 逐张锁定功能仍然可用
- 标记需要补录功能不变
- 通过审核功能独立存在

### 3. 安全性

**防止误操作**：
- 确认对话框
- 明确提示锁定数量
- 可以取消操作

**操作可追溯**：
- 记录审核人
- 记录审核时间
- 记录审核备注

## 📈 性能优化

### 1. 批量更新

**一次性更新所有锁定信息**：
```typescript
// ✅ 好的做法：一次性更新
await supabase
  .from('vehicles')
  .update({
    review_status: 'approved',
    locked_photos: lockedPhotosData,  // 包含所有锁定信息
    // ... 其他字段
  })
  .eq('id', vehicleId)

// ❌ 不好的做法：逐张更新
for (const index of lockedIndices) {
  await lockPhoto(vehicleId, field, index)  // 多次数据库操作
}
```

**性能对比**：
- 批量更新：1次数据库操作
- 逐张更新：N次数据库操作（N为照片数量）
- 性能提升：N倍

### 2. 前端计算

**在前端计算锁定索引**：
```typescript
// 前端计算
const lockedIndices: number[] = []
photos.forEach((_, index) => {
  if (!requiredPhotos.includes(`${field}[${index}]`)) {
    lockedIndices.push(index)
  }
})

// 一次性发送到后端
await lockVehiclePhotos(vehicleId, reviewerId, notes, lockedPhotosData)
```

**优点**：
- 减少网络请求
- 降低服务器负载
- 提高响应速度

## 🧪 测试场景

### 测试场景1：全部锁定

**前置条件**：
- 车辆有10张照片（7张提车 + 3张行驶证）
- 未标记任何照片需要补录

**操作步骤**：
1. 进入车辆审核详情页面
2. 点击"一键锁定"按钮
3. 确认对话框显示：`将锁定 10 张照片`
4. 点击"确定"

**预期结果**：
- ✅ 显示"锁定成功"提示
- ✅ 所有10张照片被锁定
- ✅ 审核状态变为`approved`
- ✅ 返回上一页

### 测试场景2：部分锁定

**前置条件**：
- 车辆有10张照片（7张提车 + 3张行驶证）
- 标记了3张照片需要补录

**操作步骤**：
1. 进入车辆审核详情页面
2. 标记3张照片需要补录
3. 点击"一键锁定"按钮
4. 确认对话框显示：`将锁定 7 张照片，保留 3 张待补录`
5. 点击"确定"

**预期结果**：
- ✅ 显示"锁定成功"提示
- ✅ 7张合格照片被锁定
- ✅ 3张需要补录的照片未锁定
- ✅ 审核状态变为`approved`
- ✅ 返回上一页

### 测试场景3：无法锁定

**前置条件**：
- 车辆有10张照片（7张提车 + 3张行驶证）
- 所有照片都标记为需要补录

**操作步骤**：
1. 进入车辆审核详情页面
2. 标记所有照片需要补录
3. 点击"一键锁定"按钮

**预期结果**：
- ✅ 显示"没有可以锁定的照片"提示
- ✅ 操作取消
- ✅ 审核状态不变
- ✅ 停留在当前页面

### 测试场景4：网络错误

**前置条件**：
- 车辆有10张照片
- 网络连接异常

**操作步骤**：
1. 进入车辆审核详情页面
2. 点击"一键锁定"按钮
3. 确认对话框点击"确定"
4. 网络请求失败

**预期结果**：
- ✅ 显示"操作失败"提示
- ✅ 锁定状态未改变
- ✅ 审核状态不变
- ✅ 停留在当前页面

## 💡 最佳实践

### 1. 审核流程建议

**推荐流程**：
```
1. 查看所有照片
   ↓
2. 标记需要补录的照片（如果有）
   ↓
3. 填写审核备注
   ↓
4. 点击"一键锁定"
   ↓
5. 确认锁定信息
   ↓
6. 完成审核
```

**不推荐流程**：
```
❌ 先逐张锁定，再标记需要补录
❌ 不填写审核备注就锁定
❌ 锁定后再修改需要补录的照片
```

### 2. 审核备注建议

**好的审核备注**：
```
✅ "提车照片清晰，行驶证信息完整，已锁定所有照片"
✅ "左前照片模糊需要重拍，其他照片已锁定"
✅ "行驶证副页背面缺失，需要补录，其他照片合格"
```

**不好的审核备注**：
```
❌ "通过"（太简单）
❌ "不合格"（没有说明原因）
❌ ""（空白）
```

### 3. 操作建议

**锁定前**：
- ✅ 仔细检查所有照片
- ✅ 确认标记的需要补录照片正确
- ✅ 填写详细的审核备注

**锁定后**：
- ✅ 确认锁定成功提示
- ✅ 通知司机补录照片（如果有）
- ✅ 跟踪补录进度

## 🎉 总结

### 功能价值

**提高效率**：
- ⚡ 一键操作代替逐张锁定
- ⚡ 减少操作步骤
- ⚡ 节省审核时间

**降低错误**：
- 🛡️ 批量锁定更安全
- 🛡️ 减少遗漏
- 🛡️ 防止误操作

**灵活审核**：
- 🎯 支持全部锁定
- 🎯 支持部分锁定
- 🎯 保留需要补录的照片

**用户体验**：
- 😊 操作简单直观
- 😊 反馈清晰明确
- 😊 界面美观友好

### 技术亮点

**代码质量**：
- ✅ 类型安全（TypeScript）
- ✅ 错误处理完善
- ✅ 日志记录详细

**性能优化**：
- ✅ 批量更新
- ✅ 前端计算
- ✅ 减少网络请求

**可维护性**：
- ✅ 代码结构清晰
- ✅ 函数职责单一
- ✅ 易于扩展

---

**功能版本**：v2.2.0  
**添加日期**：2025-11-16  
**开发人员**：Miaoda AI Assistant

## 📚 相关文档

- [TODO.md](./TODO.md) - 项目任务清单
- [提车照片分离修复](./PICKUP_PHOTOS_SEPARATION_FIX.md) - 照片分类修复
- [图片加载失败修复](./IMAGE_LOADING_ROOT_CAUSE_FIX.md) - 图片URL处理修复
