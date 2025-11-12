# 修复个人信息页面证件照片无法加载问题

## 问题描述

用户反馈在司机个人信息页面中，身份证和驾驶证的证件照片无法正常加载显示。

## 问题分析

### 根本原因

**Bucket名称错误**

个人信息页面使用的bucket名称与实际存在的bucket不匹配：

```typescript
// ❌ 错误的bucket名称
const {data} = supabase.storage
  .from(`${process.env.TARO_APP_APP_ID}_driver_images`)
  .getPublicUrl(path)

// ✅ 正确的bucket名称
const {data} = supabase.storage
  .from(`${process.env.TARO_APP_APP_ID}_avatars`)
  .getPublicUrl(path)
```

### 问题定位过程

1. **检查bucket配置**
   - 查看 `supabase/migrations/16_create_avatars_bucket.sql`
   - 发现系统中只创建了 `app-7cdqf07mbu9t_avatars` bucket
   - 没有 `app-7cdqf07mbu9t_driver_images` bucket

2. **对比其他页面**
   - 检查 `src/db/api.ts` 中的图片上传函数
   - 发现所有图片上传都使用 `app-7cdqf07mbu9t_avatars` bucket
   - 确认个人信息页面使用了错误的bucket名称

3. **验证修复方案**
   - 将个人信息页面的bucket名称改为 `app-7cdqf07mbu9t_avatars`
   - 与系统其他部分保持一致

## 修复方案

### 修改内容

**文件：** `src/pages/driver/profile/index.tsx`

**修改位置：** `getImageUrl` 函数

**修改前：**
```typescript
const getImageUrl = (path: string | null): string => {
  if (!path) return ''
  const {data} = supabase.storage
    .from(`${process.env.TARO_APP_APP_ID}_driver_images`)
    .getPublicUrl(path)
  return data.publicUrl
}
```

**修改后：**
```typescript
const getImageUrl = (path: string | null): string => {
  if (!path) return ''
  const {data} = supabase.storage
    .from(`${process.env.TARO_APP_APP_ID}_avatars`)
    .getPublicUrl(path)
  return data.publicUrl
}
```

### 修复效果

1. **图片正常加载**
   - 身份证正面照片可以正常显示
   - 身份证背面照片可以正常显示
   - 驾驶证照片可以正常显示

2. **功能完整性**
   - 图片点击预览功能正常
   - 多图切换功能正常
   - 图片缩放功能正常

3. **系统一致性**
   - 与其他页面使用相同的bucket
   - 与图片上传功能保持一致
   - 符合系统整体架构设计

## 技术细节

### Supabase Storage Bucket

**系统中的Bucket配置：**

```sql
-- 创建avatars bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'app-7cdqf07mbu9t_avatars',
    'app-7cdqf07mbu9t_avatars',
    true,
    1048576,  -- 1MB
    ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO NOTHING;
```

**Bucket特性：**
- **名称：** `app-7cdqf07mbu9t_avatars`
- **公开访问：** `true`（所有人可以查看）
- **文件大小限制：** 1MB
- **允许的文件类型：** JPEG, PNG, WEBP

### 图片URL生成流程

```typescript
// 1. 从数据库获取图片路径
const licenseData = await getDriverLicense(user.id)
// licenseData.id_card_photo_front = "user123/id_card_front.jpg"

// 2. 生成公共URL
const imageUrl = getImageUrl(licenseData.id_card_photo_front)
// imageUrl = "https://xxx.supabase.co/storage/v1/object/public/app-7cdqf07mbu9t_avatars/user123/id_card_front.jpg"

// 3. 在Image组件中使用
<Image src={imageUrl} mode="aspectFit" />
```

### 图片存储路径格式

**数据库中存储的路径：**
```
user_id/filename.ext
```

**示例：**
```
550e8400-e29b-41d4-a716-446655440000/id_card_front.jpg
550e8400-e29b-41d4-a716-446655440000/id_card_back.jpg
550e8400-e29b-41d4-a716-446655440000/driving_license.jpg
```

**完整的公共URL：**
```
https://[project-ref].supabase.co/storage/v1/object/public/app-7cdqf07mbu9t_avatars/[user_id]/[filename]
```

## 相关代码位置

### 图片上传（正确使用avatars bucket）

**文件：** `src/db/api.ts`

```typescript
export async function uploadAvatar(file: File | Blob, userId: string): Promise<string | null> {
  const fileName = `${userId}/${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`
  
  const {data, error} = await supabase.storage
    .from('app-7cdqf07mbu9t_avatars')  // ✅ 正确使用avatars bucket
    .upload(fileName, fileContent, {
      contentType: 'image/jpeg',
      upsert: false
    })
  
  if (error) {
    console.error('上传头像失败:', error)
    return null
  }
  
  const {data: urlData} = supabase.storage
    .from('app-7cdqf07mbu9t_avatars')  // ✅ 正确使用avatars bucket
    .getPublicUrl(fileName)
  
  return urlData.publicUrl
}
```

### 图片工具函数（正确使用avatars bucket）

**文件：** `src/utils/imageUtils.ts`

```typescript
export async function uploadImage(
  file: UploadFileInput,
  bucketName: string = `${process.env.TARO_APP_APP_ID}_avatars`  // ✅ 默认使用avatars bucket
): Promise<UploadResult> {
  // ...
  const {data, error} = await supabase.storage
    .from(bucketName)
    .upload(fileName, fileContent)
  // ...
}
```

## 测试验证

### 测试场景

1. **有完整证件信息的用户**
   - ✅ 身份证正面照片正常显示
   - ✅ 身份证背面照片正常显示
   - ✅ 驾驶证照片正常显示

2. **部分证件信息的用户**
   - ✅ 有照片的证件正常显示
   - ✅ 没有照片的证件不显示卡片

3. **没有证件信息的用户**
   - ✅ 不显示证件照片卡片
   - ✅ 页面其他功能正常

### 测试步骤

1. **登录司机账号**
   ```
   进入小程序 → 登录 → 选择司机角色
   ```

2. **进入个人信息页面**
   ```
   首页 → 个人中心 → 个人信息
   ```

3. **验证图片加载**
   ```
   - 检查身份证正面是否显示
   - 检查身份证背面是否显示
   - 检查驾驶证照片是否显示
   ```

4. **测试图片预览**
   ```
   - 点击任意证件照片
   - 验证预览功能是否正常
   - 测试左右滑动切换图片
   ```

### 预期结果

- ✅ 所有证件照片正常加载
- ✅ 图片清晰可见
- ✅ 点击预览功能正常
- ✅ 多图切换功能正常
- ✅ 无控制台错误

## 影响范围

### 受影响的功能

1. **司机个人信息页面**
   - 身份证照片显示
   - 驾驶证照片显示
   - 证件照片预览

### 不受影响的功能

1. **其他页面的图片功能**
   - 车辆管理的图片上传和显示
   - 用户头像上传和显示
   - 其他图片相关功能

2. **数据存储**
   - 数据库中的图片路径不需要修改
   - Storage中的图片文件不需要迁移
   - 只是修正了读取时使用的bucket名称

## 注意事项

### 1. Bucket命名规范

**系统统一使用：**
```
{APP_ID}_avatars
```

**不要使用：**
```
{APP_ID}_driver_images  ❌
{APP_ID}_vehicle_images ❌
{APP_ID}_images         ❌
```

### 2. 图片路径格式

**正确格式：**
```typescript
// 数据库中存储相对路径
id_card_photo_front: "user_id/filename.jpg"

// 使用getPublicUrl获取完整URL
const url = supabase.storage
  .from('app-7cdqf07mbu9t_avatars')
  .getPublicUrl(path)
```

**错误格式：**
```typescript
// ❌ 不要在数据库中存储完整URL
id_card_photo_front: "https://xxx.supabase.co/storage/..."

// ❌ 不要包含bucket名称
id_card_photo_front: "app-7cdqf07mbu9t_avatars/user_id/filename.jpg"
```

### 3. 环境变量

**确保.env文件中配置正确：**
```env
TARO_APP_APP_ID=app-7cdqf07mbu9t
TARO_APP_SUPABASE_URL=https://xxx.supabase.co
TARO_APP_SUPABASE_ANON_KEY=xxx
```

### 4. 图片上传时的bucket选择

**所有图片上传都应使用avatars bucket：**
```typescript
// ✅ 正确
await supabase.storage
  .from(`${process.env.TARO_APP_APP_ID}_avatars`)
  .upload(path, file)

// ❌ 错误
await supabase.storage
  .from(`${process.env.TARO_APP_APP_ID}_driver_images`)
  .upload(path, file)
```

## 后续优化建议

### 1. 创建统一的图片工具函数

**建议创建：** `src/utils/storageHelper.ts`

```typescript
import {supabase} from '@/client/supabase'

const BUCKET_NAME = `${process.env.TARO_APP_APP_ID}_avatars`

/**
 * 获取图片公共URL
 */
export function getImagePublicUrl(path: string | null): string {
  if (!path) return ''
  const {data} = supabase.storage.from(BUCKET_NAME).getPublicUrl(path)
  return data.publicUrl
}

/**
 * 上传图片
 */
export async function uploadImage(
  file: File | Blob,
  path: string
): Promise<string | null> {
  const {data, error} = await supabase.storage
    .from(BUCKET_NAME)
    .upload(path, file)
  
  if (error) {
    console.error('上传图片失败:', error)
    return null
  }
  
  return getImagePublicUrl(data.path)
}

/**
 * 删除图片
 */
export async function deleteImage(path: string): Promise<boolean> {
  const {error} = await supabase.storage
    .from(BUCKET_NAME)
    .remove([path])
  
  if (error) {
    console.error('删除图片失败:', error)
    return false
  }
  
  return true
}
```

### 2. 在所有页面中使用统一的工具函数

```typescript
// ✅ 推荐做法
import {getImagePublicUrl} from '@/utils/storageHelper'

const imageUrl = getImagePublicUrl(driverLicense.id_card_photo_front)

// ❌ 不推荐（容易出错）
const {data} = supabase.storage
  .from(`${process.env.TARO_APP_APP_ID}_avatars`)
  .getPublicUrl(path)
```

### 3. 添加图片加载错误处理

```typescript
<Image
  src={getImageUrl(driverLicense.id_card_photo_front)}
  mode="aspectFit"
  onError={() => {
    console.error('图片加载失败')
    // 显示默认图片或错误提示
  }}
/>
```

### 4. 添加图片加载状态

```typescript
const [imageLoading, setImageLoading] = useState(true)

<Image
  src={getImageUrl(driverLicense.id_card_photo_front)}
  mode="aspectFit"
  onLoad={() => setImageLoading(false)}
  onError={() => setImageLoading(false)}
/>

{imageLoading && <View>加载中...</View>}
```

## 总结

### 问题根源
- 使用了不存在的bucket名称 `app-7cdqf07mbu9t_driver_images`
- 应该使用系统统一的bucket名称 `app-7cdqf07mbu9t_avatars`

### 解决方案
- 修改 `getImageUrl` 函数中的bucket名称
- 与系统其他部分保持一致

### 修复效果
- ✅ 证件照片正常加载
- ✅ 图片预览功能正常
- ✅ 系统一致性提升
- ✅ 无新增错误

### 经验教训
1. **统一命名规范**：系统中所有图片存储应使用统一的bucket
2. **代码复用**：应该创建统一的工具函数，避免重复代码
3. **充分测试**：新功能开发时应该测试所有相关功能
4. **文档完善**：应该在文档中明确说明bucket的使用规范
