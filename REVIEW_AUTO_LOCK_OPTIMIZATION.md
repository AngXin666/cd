# 审核自动锁定功能优化

## 问题背景
原有的审核流程中，管理员需要：
1. 标记需要补录的照片
2. 点击"要求补录"按钮
3. 如果需要锁定其他照片，还需要单独点击"一键锁定"按钮

这个流程比较繁琐，需要两步操作。

## 优化方案
将"要求补录"和"锁定其他照片"合并为一个操作：
- 当管理员标记需要补录的照片并点击"要求补录"时，系统自动锁定所有未标记需要补录的照片
- 移除"一键锁定"按钮，简化界面和操作流程

## 实现细节

### 1. 修改`handleRequireSupplement`函数
**文件**: `src/pages/super-admin/vehicle-review-detail/index.tsx`

在要求补录时，自动计算并锁定所有未标记需要补录的照片：

```typescript
// 计算需要锁定的照片（所有未标记需要补录的照片）
const lockedPhotosData: LockedPhotos = {}
let totalLockedCount = 0

PHOTO_FIELDS.forEach(({field}) => {
  const photos = vehicle[field] || []
  const lockedIndices: number[] = []

  photos.forEach((_, index) => {
    const photoKey = `${field}_${index}`
    // 如果不在需要补录列表中，则锁定
    if (!requiredPhotos.includes(photoKey)) {
      lockedIndices.push(index)
      totalLockedCount++
    }
  })

  if (lockedIndices.length > 0) {
    lockedPhotosData[field] = lockedIndices
  }
})
```

### 2. 更新数据库操作
在要求补录后，如果有需要锁定的照片，则更新`locked_photos`字段：

```typescript
// 如果有需要锁定的照片，则锁定它们
if (totalLockedCount > 0) {
  const {error: lockError} = await supabase
    .from('vehicles')
    .update({
      locked_photos: lockedPhotosData,
      updated_at: new Date().toISOString()
    })
    .eq('id', vehicle.id)

  if (lockError) {
    logger.error('锁定照片失败', lockError)
    throw new Error('锁定照片失败')
  }
}
```

### 3. 移除"一键锁定"功能
- 删除`handleLockAll`函数
- 删除"一键锁定"按钮
- 移除`lockVehiclePhotos`导入
- 调整底部按钮布局，只保留"要求补录"和"通过审核"两个按钮

### 4. 优化用户提示
修改确认对话框，明确告知用户将同时锁定其他照片：

```typescript
Taro.showModal({
  title: '确认要求补录',
  content: `将要求司机补录 ${requiredPhotos.length} 张图片，同时自动锁定其他 ${totalLockedCount} 张照片`,
  // ...
})
```

## 优化效果

### 操作流程简化
**优化前**：
1. 标记需要补录的照片
2. 点击"要求补录"
3. 点击"一键锁定"（如果需要）

**优化后**：
1. 标记需要补录的照片
2. 点击"要求补录"（自动锁定其他照片）

### 界面简化
- 底部操作按钮从3个减少到2个
- 布局更加简洁，操作更加直观

### 用户体验提升
- 减少操作步骤，提高效率
- 避免遗漏锁定操作
- 明确的提示信息，用户清楚知道将要执行的操作

## 相关文件
- `src/pages/super-admin/vehicle-review-detail/index.tsx` - 审核详情页面
- `src/db/api.ts` - 数据库操作函数（`requireSupplement`、`supplementPhoto`等）

## 测试建议
1. 测试标记需要补录的照片后，点击"要求补录"，验证：
   - 需要补录的照片正确保存到`required_photos`字段
   - 其他照片正确锁定到`locked_photos`字段
   - 车辆状态正确更新为"需要补录"
2. 测试司机端补录照片流程，验证：
   - 只能补录标记的照片
   - 锁定的照片无法修改
   - 补录完成后可以重新提交审核

## 注意事项
1. 确保`photoKey`格式一致性：使用`${field}_${index}`格式
2. 在补录照片时，正确解析`photoKey`：使用`lastIndexOf('_')`而不是`split('_')`
3. 清除相关缓存，确保数据同步
