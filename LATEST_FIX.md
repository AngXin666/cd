# 最新修复 - 添加车辆图片上传错误提示

## 修复时间
2025-11-18

## 问题描述
**用户反馈**：
- 小程序司机端添加车辆时，录入照片失败
- 错误提示："上传 driving_license_main照片失败"
- 错误消息使用英文字段名，不够用户友好
- 没有显示具体的失败原因

## 根本原因
1. **错误消息不友好**：直接使用英文字段名 `driving_license_main`，用户不知道这是什么照片
2. **缺少详细日志**：文件读取失败时，没有记录文件路径和错误消息
3. **Supabase 错误信息不完整**：没有记录 bucket、文件名、文件大小等关键信息

## 修复内容

### 1. 添加字段名到中文名称的映射 (src/pages/driver/add-vehicle/index.tsx)
```typescript
const PHOTO_NAME_MAP: Record<string, string> = {
  driving_license_main: '行驶证主页',
  driving_license_sub: '行驶证副页',
  driving_license_sub_back: '行驶证副页背页',
  left_front: '左前45°',
  right_front: '右前45°',
  left_rear: '左后45°',
  right_rear: '右后45°',
  dashboard: '仪表盘',
  rear_door: '后门',
  cargo_box: '货箱',
  id_card_front: '身份证正面',
  driver_license_main: '驾驶证主页',
  driver_license_sub: '驾驶证副页'
}
```

### 2. 改进上传照片的错误消息
```typescript
// ✅ 修复后
const photoName = PHOTO_NAME_MAP[key] || key
console.log(`📤 开始上传 ${photoName}...`)

const uploadedPath = await uploadImageToStorage(path, BUCKET_NAME, fileName, needLandscape)
if (!uploadedPath) {
  console.error(`❌ ${photoName} 上传失败`)
  throw new Error(`上传 ${photoName} 失败，请检查网络连接后重试`)
}
console.log(`✅ ${photoName} 上传成功`)
```

### 3. 改进文件读取错误处理 (src/utils/imageUtils.ts)
```typescript
fail: (err) => {
  console.error('❌ 文件读取失败:', err)
  console.error('❌ 文件路径:', compressedPath)
  reject(new Error(`文件读取失败: ${err.errMsg || '未知错误'}`))
}
```

### 4. 改进 Supabase 上传错误日志
```typescript
console.log('📤 上传文件到 Supabase Storage...')
console.log('📦 Bucket:', bucketName)
console.log('📄 文件名:', fileName)
console.log('📏 文件大小:', fileContent.byteLength, 'bytes')

if (error) {
  console.error('❌ Supabase Storage 上传失败')
  console.error('❌ 错误代码:', error.statusCode)
  console.error('❌ 错误消息:', error.message)
  console.error('❌ 错误详情:', JSON.stringify(error))
  return null
}
```

## 修复效果

### 修复前
**错误消息**：
```
上传 driving_license_main照片失败
```

### 修复后
**错误消息**：
```
上传 行驶证主页 失败，请检查网络连接后重试
```

**改进**：
- ✅ 使用中文名称
- ✅ 用户友好
- ✅ 提示解决方法

### 日志输出改进

**修复后的完整日志**：
```
📤 开始上传 行驶证主页...
📤 开始上传图片: vehicle_driving_license_main_xxx.jpg
📍 当前环境: 小程序
📁 原始图片路径: wxfile://tmp_xxx.jpg
📱 小程序环境：使用小程序专用上传流程
✅ 图片压缩完成，压缩后路径: wxfile://tmp_yyy.jpg
📖 读取文件内容...
✅ 文件读取成功
✅ 文件大小: 245678 bytes
📤 上传文件到 Supabase Storage...
📦 Bucket: app-7cdqf07mbu9t_vehicles
📄 文件名: vehicle_driving_license_main_xxx.jpg
📏 文件大小: 245678 bytes
✅ 图片上传成功: https://xxx.supabase.co/storage/v1/object/public/...
✅ 行驶证主页 上传成功
```

## 测试验证

### 场景1：正常上传
**预期**：所有照片上传成功，显示详细日志
**状态**：✅ 代码已修复，待测试

### 场景2：网络错误
**预期**：显示"上传 行驶证主页 失败，请检查网络连接后重试"
**状态**：✅ 代码已修复，待测试

### 场景3：文件读取失败
**预期**：控制台显示详细的文件路径和错误信息
**状态**：✅ 代码已修复，待测试

## 相关文档
- `FIX_ADD_VEHICLE_UPLOAD_ERROR.md` - 详细修复说明
- `FIX_MINIPROGRAM_RETURN_VEHICLE.md` - 小程序还车失败修复
- `FIX_SUMMARY.md` - 所有修复的总结

## 代码质量
- ✅ 通过 Biome 代码检查
- ✅ 无 TypeScript 错误
- ✅ 添加了详细的日志输出
- ✅ 改进了错误消息
- ✅ 逻辑清晰，易于维护



