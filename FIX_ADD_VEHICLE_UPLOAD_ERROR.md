# 修复添加车辆图片上传错误提示

## 修复时间
2025-11-18

## 问题描述
**用户反馈**：
- 小程序司机端添加车辆时，录入照片失败
- 错误提示："上传 driving_license_main照片失败"
- 错误消息使用英文字段名，不够用户友好
- 没有显示具体的失败原因

## 问题分析

### 1. 错误消息不友好
**原代码**：
```typescript
if (!uploadedPath) {
  throw new Error(`上传${key}照片失败`)  // key = "driving_license_main"
}
```

**问题**：
- 直接使用英文字段名 `driving_license_main`
- 用户看到的是"上传 driving_license_main照片失败"
- 不够用户友好，用户不知道这是什么照片

### 2. 缺少详细的错误日志
**原代码**：
```typescript
fail: (err) => {
  console.error('❌ 文件读取失败:', err)
  reject(err)
}
```

**问题**：
- 错误信息不够详细
- 没有记录文件路径
- 没有提取错误消息

### 3. Supabase 上传错误信息不完整
**原代码**：
```typescript
if (error) {
  console.error('❌ 上传图片失败:', error)
  console.error('❌ 错误详情:', JSON.stringify(error))
  return null
}
```

**问题**：
- 没有记录 bucket 名称
- 没有记录文件名
- 没有记录文件大小
- 没有单独提取错误代码和错误消息

## 修复方案

### 1. 添加字段名到中文名称的映射

```typescript
/**
 * 字段名到中文名称的映射
 */
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

**修改前**：
```typescript
const uploadedPath = await uploadImageToStorage(path, BUCKET_NAME, fileName, needLandscape)
if (!uploadedPath) {
  throw new Error(`上传${key}照片失败`)  // ❌ 使用英文字段名
}
```

**修改后**：
```typescript
const photoName = PHOTO_NAME_MAP[key] || key
console.log(`📤 开始上传 ${photoName}...`)

const uploadedPath = await uploadImageToStorage(path, BUCKET_NAME, fileName, needLandscape)
if (!uploadedPath) {
  console.error(`❌ ${photoName} 上传失败`)
  throw new Error(`上传 ${photoName} 失败，请检查网络连接后重试`)  // ✅ 使用中文名称
}
console.log(`✅ ${photoName} 上传成功`)
```

### 3. 改进文件读取错误处理

**修改前**：
```typescript
fail: (err) => {
  console.error('❌ 文件读取失败:', err)
  reject(err)
}
```

**修改后**：
```typescript
fail: (err) => {
  console.error('❌ 文件读取失败:', err)
  console.error('❌ 文件路径:', compressedPath)
  reject(new Error(`文件读取失败: ${err.errMsg || '未知错误'}`))
}
```

### 4. 改进 Supabase 上传错误日志

**修改前**：
```typescript
console.log('📤 上传文件到 Supabase Storage...')
const {data, error} = await supabase.storage.from(bucketName).upload(fileName, fileContent, {
  contentType: 'image/jpeg',
  upsert: false
})

if (error) {
  console.error('❌ 上传图片失败:', error)
  console.error('❌ 错误详情:', JSON.stringify(error))
  return null
}
```

**修改后**：
```typescript
console.log('📤 上传文件到 Supabase Storage...')
console.log('📦 Bucket:', bucketName)
console.log('📄 文件名:', fileName)
console.log('📏 文件大小:', fileContent.byteLength, 'bytes')

const {data, error} = await supabase.storage.from(bucketName).upload(fileName, fileContent, {
  contentType: 'image/jpeg',
  upsert: false
})

if (error) {
  console.error('❌ Supabase Storage 上传失败')
  console.error('❌ 错误代码:', error.statusCode)
  console.error('❌ 错误消息:', error.message)
  console.error('❌ 错误详情:', JSON.stringify(error))
  return null
}
```

## 修改的文件

### 1. src/pages/driver/add-vehicle/index.tsx
- ✅ 添加 `PHOTO_NAME_MAP` 字段名映射
- ✅ 改进上传车辆照片的错误消息
- ✅ 改进上传驾驶员证件照片的错误消息
- ✅ 添加上传进度日志

### 2. src/utils/imageUtils.ts
- ✅ 改进文件读取错误处理
- ✅ 添加详细的文件路径日志
- ✅ 改进 Supabase 上传错误日志
- ✅ 添加 bucket、文件名、文件大小日志

## 修复效果

### 修复前
**错误消息**：
```
上传 driving_license_main照片失败
```

**问题**：
- 使用英文字段名
- 不够用户友好
- 没有提示解决方法

### 修复后
**错误消息**：
```
上传 行驶证主页 失败，请检查网络连接后重试
```

**改进**：
- ✅ 使用中文名称
- ✅ 用户友好
- ✅ 提示解决方法

### 日志输出

**修复前**：
```
📤 开始上传图片: vehicle_driving_license_main_1234567890_abc123.jpg
📍 当前环境: 小程序
📁 原始图片路径: wxfile://tmp_xxx.jpg
📱 小程序环境：使用小程序专用上传流程
✅ 图片压缩完成，压缩后路径: wxfile://tmp_yyy.jpg
📖 读取文件内容...
❌ 文件读取失败: [object Object]
```

**修复后**：
```
📤 开始上传 行驶证主页...
📤 开始上传图片: vehicle_driving_license_main_1234567890_abc123.jpg
📍 当前环境: 小程序
📁 原始图片路径: wxfile://tmp_xxx.jpg
📱 小程序环境：使用小程序专用上传流程
✅ 图片压缩完成，压缩后路径: wxfile://tmp_yyy.jpg
📖 读取文件内容...
❌ 文件读取失败: {errMsg: "readFile:fail..."}
❌ 文件路径: wxfile://tmp_yyy.jpg
❌ 行驶证主页 上传失败
```

## 调试指南

### 1. 查看控制台日志
打开微信开发者工具的控制台，查看详细的上传日志：

**正常流程**：
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

**失败场景1：文件读取失败**：
```
📤 开始上传 行驶证主页...
📤 开始上传图片: vehicle_driving_license_main_xxx.jpg
📍 当前环境: 小程序
📁 原始图片路径: wxfile://tmp_xxx.jpg
📱 小程序环境：使用小程序专用上传流程
✅ 图片压缩完成，压缩后路径: wxfile://tmp_yyy.jpg
📖 读取文件内容...
❌ 文件读取失败: {errMsg: "readFile:fail file not exist"}
❌ 文件路径: wxfile://tmp_yyy.jpg
❌ 行驶证主页 上传失败
```

**失败场景2：Supabase 上传失败**：
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
❌ Supabase Storage 上传失败
❌ 错误代码: 403
❌ 错误消息: Bucket not found
❌ 错误详情: {"statusCode":403,"error":"Bucket not found","message":"Bucket not found"}
❌ 行驶证主页 上传失败
```

### 2. 常见错误及解决方法

#### 错误1：文件读取失败
**错误消息**：`文件读取失败: readFile:fail file not exist`

**原因**：
- 临时文件已被删除
- 文件路径错误

**解决方法**：
- 重新拍摄照片
- 检查文件路径是否正确

#### 错误2：Bucket 不存在
**错误消息**：`Bucket not found`

**原因**：
- Supabase Storage bucket 未创建
- Bucket 名称错误

**解决方法**：
- 检查 Supabase 控制台，确认 bucket 存在
- 检查 bucket 名称是否正确

#### 错误3：权限不足
**错误消息**：`Permission denied`

**原因**：
- Bucket 权限配置错误
- 用户没有上传权限

**解决方法**：
- 检查 Supabase Storage bucket 的权限策略
- 确保用户有上传权限

#### 错误4：文件过大
**错误消息**：`File size exceeds limit`

**原因**：
- 文件大小超过 bucket 限制
- 压缩失败

**解决方法**：
- 检查图片压缩是否成功
- 调整压缩质量参数

## 测试场景

### 场景1：正常上传
**测试步骤**：
1. 打开小程序
2. 进入添加车辆页面
3. 拍摄行驶证主页照片
4. 点击"识别驾驶证"
5. 继续完成其他步骤
6. 点击"提交审核"

**预期结果**：
- 所有照片上传成功
- 显示"提交成功"提示
- 控制台显示详细的上传日志

### 场景2：网络错误
**测试步骤**：
1. 关闭网络连接
2. 尝试上传照片

**预期结果**：
- 显示"上传 行驶证主页 失败，请检查网络连接后重试"
- 控制台显示详细的错误信息

### 场景3：文件读取失败
**测试步骤**：
1. 拍摄照片后，等待一段时间（让临时文件过期）
2. 尝试上传照片

**预期结果**：
- 显示"上传 行驶证主页 失败，请检查网络连接后重试"
- 控制台显示"文件读取失败"错误

## 代码质量
- ✅ 通过 Biome 代码检查
- ✅ 无 TypeScript 错误
- ✅ 添加了详细的日志输出
- ✅ 改进了错误消息
- ✅ 逻辑清晰，易于维护

## 经验总结

### 1. 用户友好的错误消息
- 使用中文名称，而不是英文字段名
- 提供解决方法的提示
- 避免技术术语

### 2. 详细的错误日志
- 记录关键参数（文件路径、bucket、文件名、文件大小）
- 单独提取错误代码和错误消息
- 使用 emoji 让日志更易读

### 3. 错误处理最佳实践
- 捕获所有可能的错误
- 提供清晰的错误信息
- 记录足够的上下文信息
- 帮助用户和开发者快速定位问题

### 4. 调试技巧
- 添加详细的日志输出
- 记录每个步骤的执行情况
- 输出关键数据的类型和大小
- 使用 emoji 让日志更易读
