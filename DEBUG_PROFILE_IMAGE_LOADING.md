# 司机个人信息页面图片加载调试指南

## 问题现象

司机个人信息页面显示了证件照片卡片，但图片本身无法加载，显示为空白。

## 已添加的调试功能

### 1. 数据加载日志

在 `loadProfile` 函数中添加了详细的日志输出：

```typescript
// 加载驾驶证信息
const licenseData = await getDriverLicense(user.id)
console.log('驾驶证信息:', licenseData)
console.log('身份证正面路径:', licenseData?.id_card_photo_front)
console.log('身份证背面路径:', licenseData?.id_card_photo_back)
console.log('驾驶证照片路径:', licenseData?.driving_license_photo)
```

### 2. 图片URL生成日志

在 `getImageUrl` 函数中添加了详细的日志输出：

```typescript
const getImageUrl = (path: string | null): string => {
  if (!path) {
    console.log('图片路径为空')
    return ''
  }
  console.log('原始图片路径:', path)
  const bucketName = `${process.env.TARO_APP_APP_ID}_avatars`
  console.log('使用的bucket:', bucketName)
  const {data} = supabase.storage.from(bucketName).getPublicUrl(path)
  console.log('生成的公共URL:', data.publicUrl)
  return data.publicUrl
}
```

### 3. 图片加载状态监控

为每个Image组件添加了 `onLoad` 和 `onError` 事件处理：

```typescript
<Image
  src={getImageUrl(driverLicense.id_card_photo_front)}
  mode="aspectFit"
  className="w-full rounded-lg border border-gray-200"
  style={{height: '200px'}}
  onError={(e) => {
    console.error('身份证正面图片加载失败:', e)
    console.error('图片URL:', getImageUrl(driverLicense.id_card_photo_front))
  }}
  onLoad={() => {
    console.log('身份证正面图片加载成功')
  }}
/>
```

## 调试步骤

### 步骤1：检查控制台日志

1. **打开小程序开发者工具**
2. **进入司机个人信息页面**
3. **查看控制台输出**

#### 预期日志输出：

```
个人资料数据: {id: "xxx", name: "xxx", phone: "xxx", ...}
驾驶证信息: {id: "xxx", driver_id: "xxx", ...}
身份证正面路径: "user_id/id_card_front.jpg"
身份证背面路径: "user_id/id_card_back.jpg"
驾驶证照片路径: "user_id/driving_license.jpg"
原始图片路径: user_id/id_card_front.jpg
使用的bucket: app-7cdqf07mbu9t_avatars
生成的公共URL: https://xxx.supabase.co/storage/v1/object/public/app-7cdqf07mbu9t_avatars/user_id/id_card_front.jpg
身份证正面图片加载成功
```

### 步骤2：分析可能的问题

根据控制台日志，判断问题所在：

#### 情况A：图片路径为空

**日志特征：**
```
驾驶证信息: {id: "xxx", driver_id: "xxx", ...}
身份证正面路径: null
身份证背面路径: null
驾驶证照片路径: null
```

**问题原因：**
- 数据库中没有存储图片路径
- 用户还没有上传证件照片

**解决方案：**
1. 检查数据库 `driver_licenses` 表
2. 确认是否有图片路径数据
3. 如果没有，需要通过车辆管理功能上传证件照片

**SQL查询：**
```sql
SELECT 
  id,
  driver_id,
  id_card_photo_front,
  id_card_photo_back,
  driving_license_photo
FROM driver_licenses
WHERE driver_id = 'your_user_id';
```

#### 情况B：图片路径存在但URL生成失败

**日志特征：**
```
身份证正面路径: user_id/id_card_front.jpg
使用的bucket: app-7cdqf07mbu9t_avatars
生成的公共URL: https://xxx.supabase.co/storage/v1/object/public/app-7cdqf07mbu9t_avatars/user_id/id_card_front.jpg
身份证正面图片加载失败: [Error details]
```

**问题原因：**
- 图片文件不存在于Storage中
- Bucket权限配置问题
- 图片路径格式不正确

**解决方案：**

1. **检查Storage中是否有图片文件**
   - 登录Supabase Dashboard
   - 进入Storage → Buckets → app-7cdqf07mbu9t_avatars
   - 查找对应的图片文件

2. **检查Bucket权限**
   ```sql
   -- 查看bucket配置
   SELECT * FROM storage.buckets WHERE id = 'app-7cdqf07mbu9t_avatars';
   
   -- 查看RLS策略
   SELECT * FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%avatars%';
   ```

3. **验证图片URL是否可访问**
   - 复制控制台中的公共URL
   - 在浏览器中直接访问
   - 如果返回404，说明文件不存在
   - 如果返回403，说明权限问题

#### 情况C：Bucket名称错误

**日志特征：**
```
使用的bucket: undefined_avatars
或
使用的bucket: app-7cdqf07mbu9t_driver_images
```

**问题原因：**
- 环境变量未正确配置
- 使用了错误的bucket名称

**解决方案：**

1. **检查环境变量**
   ```bash
   # 查看.env文件
   cat .env | grep TARO_APP_APP_ID
   ```
   
   应该输出：
   ```
   TARO_APP_APP_ID=app-7cdqf07mbu9t
   ```

2. **确认bucket名称**
   - 正确的bucket名称：`app-7cdqf07mbu9t_avatars`
   - 错误的bucket名称：`app-7cdqf07mbu9t_driver_images`

#### 情况D：图片路径格式错误

**日志特征：**
```
身份证正面路径: https://xxx.supabase.co/storage/...
或
身份证正面路径: app-7cdqf07mbu9t_avatars/user_id/file.jpg
```

**问题原因：**
- 数据库中存储了完整URL而不是相对路径
- 路径包含了bucket名称

**正确的路径格式：**
```
user_id/filename.jpg
```

**错误的路径格式：**
```
❌ https://xxx.supabase.co/storage/v1/object/public/app-7cdqf07mbu9t_avatars/user_id/filename.jpg
❌ app-7cdqf07mbu9t_avatars/user_id/filename.jpg
❌ /user_id/filename.jpg
```

**解决方案：**
```sql
-- 更新错误的路径格式
UPDATE driver_licenses
SET 
  id_card_photo_front = regexp_replace(id_card_photo_front, '^.*/([^/]+/[^/]+)$', '\1'),
  id_card_photo_back = regexp_replace(id_card_photo_back, '^.*/([^/]+/[^/]+)$', '\1'),
  driving_license_photo = regexp_replace(driving_license_photo, '^.*/([^/]+/[^/]+)$', '\1')
WHERE 
  id_card_photo_front LIKE '%http%' OR
  id_card_photo_back LIKE '%http%' OR
  driving_license_photo LIKE '%http%';
```

### 步骤3：验证图片上传流程

如果数据库中没有图片路径，需要检查图片上传功能：

#### 检查图片上传代码

**文件：** `src/utils/imageUtils.ts`

```typescript
export async function uploadImage(
  file: UploadFileInput,
  bucketName: string = `${process.env.TARO_APP_APP_ID}_avatars`
): Promise<UploadResult> {
  // 确保使用正确的bucket名称
  console.log('上传到bucket:', bucketName)
  
  // 生成文件路径
  const fileName = `${userId}/${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`
  console.log('文件路径:', fileName)
  
  // 上传文件
  const {data, error} = await supabase.storage
    .from(bucketName)
    .upload(fileName, fileContent)
  
  if (error) {
    console.error('上传失败:', error)
    return {success: false, error: error.message}
  }
  
  console.log('上传成功，路径:', data.path)
  return {success: true, path: data.path}
}
```

#### 验证上传后的数据

```sql
-- 查看最近上传的图片记录
SELECT 
  id,
  driver_id,
  id_card_photo_front,
  id_card_photo_back,
  driving_license_photo,
  updated_at
FROM driver_licenses
ORDER BY updated_at DESC
LIMIT 5;
```

### 步骤4：手动测试图片URL

1. **获取图片路径**
   ```sql
   SELECT id_card_photo_front FROM driver_licenses WHERE driver_id = 'your_user_id';
   ```

2. **构造公共URL**
   ```
   https://[project-ref].supabase.co/storage/v1/object/public/app-7cdqf07mbu9t_avatars/[path]
   ```

3. **在浏览器中访问**
   - 如果能看到图片，说明URL正确，问题在前端
   - 如果看不到图片，说明Storage配置或文件有问题

## 常见问题和解决方案

### 问题1：图片上传成功但无法显示

**症状：**
- 上传时显示成功
- 数据库中有路径
- 但页面无法显示

**可能原因：**
1. Bucket的public属性为false
2. RLS策略阻止了访问
3. 图片路径格式不正确

**解决方案：**

```sql
-- 1. 确保bucket是公开的
UPDATE storage.buckets 
SET public = true 
WHERE id = 'app-7cdqf07mbu9t_avatars';

-- 2. 添加公开访问策略
CREATE POLICY "所有人可以查看头像" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'app-7cdqf07mbu9t_avatars');
```

### 问题2：部分图片能显示，部分不能

**症状：**
- 有些用户的图片能显示
- 有些用户的图片不能显示

**可能原因：**
1. 不同用户的图片路径格式不一致
2. 部分图片文件丢失
3. 文件名包含特殊字符

**解决方案：**

```sql
-- 检查路径格式的一致性
SELECT 
  driver_id,
  id_card_photo_front,
  LENGTH(id_card_photo_front) as path_length,
  id_card_photo_front LIKE '%/%' as has_slash,
  id_card_photo_front LIKE 'http%' as is_url
FROM driver_licenses
WHERE id_card_photo_front IS NOT NULL;
```

### 问题3：图片加载很慢

**症状：**
- 图片最终能显示
- 但加载时间很长

**可能原因：**
1. 图片文件太大
2. 网络连接慢
3. Storage服务器响应慢

**解决方案：**

1. **压缩图片**
   ```typescript
   // 在上传前压缩图片
   const compressedImage = await compressImage(file, {
     maxWidth: 1080,
     maxHeight: 1080,
     quality: 0.8
   })
   ```

2. **添加加载状态**
   ```typescript
   const [imageLoading, setImageLoading] = useState(true)
   
   <Image
     src={imageUrl}
     onLoad={() => setImageLoading(false)}
     onError={() => setImageLoading(false)}
   />
   {imageLoading && <View>加载中...</View>}
   ```

### 问题4：图片在开发环境能显示，生产环境不能

**症状：**
- 本地开发时图片正常
- 部署后图片无法显示

**可能原因：**
1. 环境变量配置不同
2. Supabase项目配置不同
3. 域名白名单问题

**解决方案：**

1. **检查生产环境变量**
   ```bash
   # 确认生产环境的.env配置
   TARO_APP_SUPABASE_URL=https://xxx.supabase.co
   TARO_APP_SUPABASE_ANON_KEY=xxx
   TARO_APP_APP_ID=app-7cdqf07mbu9t
   ```

2. **检查Supabase项目设置**
   - 确认使用的是正确的项目
   - 检查API密钥是否正确
   - 验证Storage配置

## 快速诊断清单

使用以下清单快速定位问题：

- [ ] 控制台是否有"驾驶证信息"日志？
- [ ] 图片路径是否为null？
- [ ] 使用的bucket名称是否正确（app-7cdqf07mbu9t_avatars）？
- [ ] 生成的公共URL格式是否正确？
- [ ] 是否有"图片加载失败"错误日志？
- [ ] 在浏览器中直接访问图片URL是否能看到图片？
- [ ] 数据库中的图片路径格式是否正确（user_id/filename.jpg）？
- [ ] Storage中是否存在对应的图片文件？
- [ ] Bucket的public属性是否为true？
- [ ] 是否有公开访问的RLS策略？

## 获取帮助

如果以上步骤都无法解决问题，请提供以下信息：

1. **控制台完整日志**
   - 包括所有console.log和console.error输出

2. **数据库查询结果**
   ```sql
   SELECT * FROM driver_licenses WHERE driver_id = 'your_user_id';
   ```

3. **Storage配置**
   ```sql
   SELECT * FROM storage.buckets WHERE id = 'app-7cdqf07mbu9t_avatars';
   ```

4. **图片URL示例**
   - 提供一个无法加载的图片URL

5. **浏览器访问结果**
   - 直接在浏览器中访问图片URL的结果（200/404/403等）

## 总结

图片无法加载的问题通常由以下几个方面引起：

1. **数据问题**：数据库中没有图片路径或路径格式错误
2. **Storage问题**：图片文件不存在或bucket配置错误
3. **权限问题**：RLS策略阻止了访问或bucket不是公开的
4. **代码问题**：使用了错误的bucket名称或URL生成逻辑有误

通过添加的调试日志，可以快速定位问题所在，然后针对性地解决。
