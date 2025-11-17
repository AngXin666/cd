# 修复草稿图片持久化问题

## 问题描述
`wx://tmp_xxxxx`）
2. **小程序退出清理**：当小程序退出或被系统回收后，临时文件会被自动清理
3. **路径无效**：再次进入时，保存的临时路径已经失效，导致图片无法加载

## 解决方案

### 1. 图片持久化
Taro.saveFile API 将临时文件保存到本地持久化存储
 */
async function saveTempFileToPersistent(tempFilePath: string): Promise<string> {
  // 检查是否为临时路径
  if (!tempFilePath.includes('tmp') && !tempFilePath.includes('temp')) {
    return tempFilePath
  }

  // 使用 saveFile 持久化
  const result = await Taro.saveFile({
    tempFilePath: tempFilePath
  })

  return result.savedFilePath
}
```

### 2. 批量处理
git config --global user.name miaoda

```typescript
// 单张图片
if (draft.registration_front_photo) {
  persistedDraft.registration_front_photo = await saveTempFileToPersistent(
    draft.registration_front_photo
  )
}

// 图片数组
if (draft.vehicle_photos && draft.vehicle_photos.length > 0) {
  persistedDraft.vehicle_photos = await persistImagePaths(draft.vehicle_photos)
}
```

### 3. 图片验证
#

 */
async function isFileValid(filePath: string): Promise<boolean> {
  if (!filePath) return false

  try {
    const fs = Taro.getFileSystemManager()
    const result = await fs.access({path: filePath})
    return result.errMsg === 'access:ok'
  } catch (_error) {
    return false
  }
}
```

### 4. 自动清理
git --no-pager config --global user.name miaoda

```typescript
// 验证单张图片
if (draft.registration_front_photo) {
  const isValid = await isFileValid(draft.registration_front_photo)
  if (!isValid) {
    logger.warn('行驶证主页图片无效', {path: draft.registration_front_photo})
    cleanedDraft.registration_front_photo = undefined
  }
}

// 验证图片数组
if (draft.vehicle_photos && draft.vehicle_photos.length > 0) {
  cleanedDraft.vehicle_photos = await cleanInvalidPaths(draft.vehicle_photos)
}
```

## 修改的文件

### src/utils/draftUtils.ts
- ✅ 添加 `saveTempFileToPersistent()` - 图片持久化函数
- ✅ 添加 `persistImagePaths()` - 批量持久化函数
- ✅ 添加 `isFileValid()` - 文件验证函数
- ✅ 添加 `cleanInvalidPaths()` - 清理无效路径函数
- ✅ 添加 `getPhotoCount()` - 统计图片数量函数
- ✅ 更新 `saveDraft()` - 保存时持久化所有图片
- ✅ 更新 `getDraft()` - 读取时验证所有图片
- ✅ 添加详细的日志记录

## 功能特性

### 1. 自动持久化
- 保存草稿时自动将临时图片转换为持久化文件
- 支持单张图片和图片数组
- 失败时保留原路径，不影响其他功能

### 2. 智能验证
- 读取草稿时自动验证所有图片文件
- 清理无效的图片路径
- 记录详细的验证日志

### 3. 详细日志
- 保存时记录图片数量
- 读取时记录验证结果
- 清理时记录无效图片

### 4. 向后兼容
- 兼容已有的临时路径
- 兼容已持久化的路径
- 不影响现有功能

## 使用示例

### 保存草稿
```typescript
// 自动持久化所有图片
await saveDraft('add', user.id, {
  plate_number: '粤A12345',
  registration_front_photo: 'wx://tmp_xxxxx',  // 临时路径
  vehicle_photos: [
    'wx://tmp_yyyyy',  // 临时路径
    'wx://tmp_zzzzz'   // 临时路径
  ]
})

// 保存后的草稿
// {
//   plate_number: '粤A12345',
//   registration_front_photo: 'wxfile://xxxxx',  // 持久化路径
//   vehicle_photos: [
//     'wxfile://yyyyy',  // 持久化路径
//     'wxfile://zzzzz'   // 持久化路径
//   ]
// }
```

### 读取草稿
```typescript
// 自动验证所有图片
const draft = await getDraft('add', user.id)

// 如果图片文件不存在，自动清理
// {
//   plate_number: '粤A12345',
//   registration_front_photo: 'wxfile://xxxxx',  // 有效
//   vehicle_photos: [
//     undefined,  // 无效，已清理
//     'wxfile://zzzzz'  // 有效
//   ]
// }
```

## 日志示例

### 保存草稿
```
[DraftUtils] 开始保存草稿 {type: 'add', userId: 'xxx'}
[DraftUtils] 图片已持久化 {tempPath: 'wx://tmp_xxxxx', savedPath: 'wxfile://xxxxx'}
[DraftUtils] 草稿已保存 {key: 'vehicle_draft_add_xxx', photoCount: 10}
```

### 读取草稿
```
[DraftUtils] 草稿已读取 {key: 'vehicle_draft_add_xxx', photoCount: 10}
[DraftUtils] ⚠️ 行驶证主页图片无效 {path: 'wx://tmp_xxxxx'}
[DraftUtils] ⚠️ 图片文件无效，已清除 {path: 'wx://tmp_yyyyy'}
[DraftUtils] 草稿已验证 {
  key: 'vehicle_draft_add_xxx',
  originalPhotoCount: 10,
  cleanedPhotoCount: 8
}
```

## 测试验证

### 测试场景1：正常保存和恢复
1. 司机端进入车辆录入页面
2. 拍摄多张照片
3. 填写部分信息
4. 退出小程序
5. 再次进入车辆录入页面
6. **预期结果**：所有图片正常显示

### 测试场景2：图片文件被清理
1. 司机端进入车辆录入页面
2. 拍摄多张照片
3. 保存草稿
4. 手动清理小程序缓存
5. 再次进入车辆录入页面
6. **预期结果**：无效图片被清理，不显示损坏图标

### 测试场景3：混合路径
1. 草稿中包含临时路径和持久化路径
2. 读取草稿
3. **预期结果**：临时路径被持久化，持久化路径保持不变

## 性能优化

### 1. 异步处理
- 图片持久化采用异步处理
- 不阻塞主线程
- 提升用户体验

### 2. 批量操作
- 批量持久化图片数组
- 批量验证图片数组
- 减少函数调用次数

### 3. 智能判断
- 只持久化临时路径
- 跳过已持久化的路径
- 避免重复操作

## 注意事项

### 1. 存储空间
- 持久化文件会占用本地存储空间
- 建议定期清理过期草稿
- 当前设置：7天自动清理

### 2. 文件系统限制
- 微信小程序本地存储有限制（通常10MB）
- 图片过多可能导致存储不足
- 建议限制草稿中的图片数量

### 3. 兼容性
- 仅支持微信小程序环境
- H5环境需要不同的实现方式
- 当前实现已考虑跨平台兼容

## 后续优化建议

### 1. 图片压缩
- 在持久化前压缩图片
- 减少存储空间占用
- 提升加载速度

### 2. 云端备份
- 将草稿上传到云端
- 支持跨设备恢复
- 避免本地存储限制

### 3. 增量保存
- 只保存变化的图片
- 减少持久化操作
- 提升保存速度

---
**修复时间**：2025-11-18
**状态**：✅ 已完成
**影响范围**：司机端车辆录入自动保存功能
