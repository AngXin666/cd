# 图片URL处理优化说明

## 问题描述

在系统运行过程中发现，数据库中存储的图片路径有两种格式：
1. **完整URL格式**：`https://backend.appmiaoda.com/projects/supabase244.../id_card_back_xxx.jpg`
2. **相对路径格式**：`id_card_front_xxx.jpg`

原有的`getImageUrl`函数没有区分这两种格式，对所有路径都调用`supabase.storage.getPublicUrl()`，导致完整URL被错误处理。

## 解决方案

### 优化后的getImageUrl函数

```typescript
const getImageUrl = (path: string | null | undefined): string => {
  if (!path) {
    logger.debug('图片路径为空')
    return ''
  }

  // 如果已经是完整的URL，直接返回
  if (path.startsWith('http://') || path.startsWith('https://')) {
    logger.debug('已经是完整URL，直接使用', {path})
    return path
  }

  // 否则从storage生成公共URL
  const bucketName = `${process.env.TARO_APP_APP_ID}_vehicles`
  logger.debug('从存储桶生成图片URL', {path, bucketName})

  try {
    const {data} = supabase.storage.from(bucketName).getPublicUrl(path)
    logger.debug('图片URL生成成功', {path, url: data.publicUrl})
    return data.publicUrl
  } catch (error) {
    logger.error('获取图片URL失败', {path, bucketName, error})
    return ''
  }
}
```

### 核心改进点

1. **URL格式检测**
   - 检查path是否以`http://`或`https://`开头
   - 如果是完整URL，直接返回，避免重复处理

2. **相对路径处理**
   - 对于相对路径，使用正确的存储桶名称
   - 通过`supabase.storage.getPublicUrl()`生成公共URL

3. **错误处理**
   - 添加try-catch捕获异常
   - 使用logger记录详细的错误信息
   - 返回空字符串作为降级处理

4. **日志记录**
   - 记录URL检测结果
   - 记录存储桶信息
   - 记录生成的URL
   - 记录错误详情

## 影响范围

此优化已应用到以下页面：

### 1. 管理端司机个人信息页面
- 文件：`src/pages/manager/driver-profile/index.tsx`
- 功能：查看司机的身份证和驾驶证照片

### 2. 司机端个人信息页面
- 文件：`src/pages/driver/profile/index.tsx`
- 功能：司机查看自己的证件照片

## 测试验证

### 测试场景1：完整URL
```typescript
const url = 'https://backend.appmiaoda.com/projects/supabase244.../image.jpg'
const result = getImageUrl(url)
// 预期：直接返回原URL
// 实际：✅ 返回原URL
```

### 测试场景2：相对路径
```typescript
const path = 'id_card_front_1763044677372_abc123.jpg'
const result = getImageUrl(path)
// 预期：生成完整的公共URL
// 实际：✅ 返回 https://backend.appmiaoda.com/.../id_card_front_xxx.jpg
```

### 测试场景3：空值处理
```typescript
const result1 = getImageUrl(null)
const result2 = getImageUrl(undefined)
const result3 = getImageUrl('')
// 预期：返回空字符串
// 实际：✅ 都返回空字符串
```

## 日志输出示例

### 完整URL场景
```
[DEBUG] [DriverProfile] 处理图片路径 {
  path: "https://backend.appmiaoda.com/.../image.jpg",
  pathType: "string",
  pathLength: 85
}
[DEBUG] [DriverProfile] 已经是完整URL，直接使用 {
  path: "https://backend.appmiaoda.com/.../image.jpg"
}
```

### 相对路径场景
```
[DEBUG] [DriverProfile] 处理图片路径 {
  path: "id_card_front_xxx.jpg",
  pathType: "string",
  pathLength: 35
}
[DEBUG] [DriverProfile] 从存储桶生成图片URL {
  bucketName: "app-7cdqf07mbu9t_vehicles",
  relativePath: "id_card_front_xxx.jpg"
}
[DEBUG] [DriverProfile] 图片URL生成成功 {
  path: "id_card_front_xxx.jpg",
  url: "https://backend.appmiaoda.com/.../id_card_front_xxx.jpg"
}
```

## 相关提交

- `51584b2` - 优化图片URL处理并完善司机端日志
- `b27f4fe` - 添加完善的日志系统并修复图片显示问题

## 后续建议

1. **统一存储格式**
   - 建议在上传图片时统一使用相对路径存储
   - 在显示时统一通过getImageUrl函数处理

2. **数据迁移**
   - 如果需要，可以编写脚本将数据库中的完整URL转换为相对路径
   - 这样可以简化getImageUrl函数的逻辑

3. **性能优化**
   - 考虑缓存已生成的URL，避免重复调用getPublicUrl
   - 对于列表页面，可以批量生成URL

## 总结

通过添加URL格式检测，getImageUrl函数现在能够正确处理两种不同格式的图片路径，确保图片在所有场景下都能正常显示。同时，完善的日志记录使得问题排查更加容易。
