# 车队管家小程序 - 故障排查指南

## 图片加载问题

### 问题：图片加载失败

#### 症状
日志中出现类似以下错误：
```
❌ [ERROR] 提车照片加载失败 {photo: 'https://backend.appmiaoda.com/...', index: 9}
```

#### 可能原因

1. **图片文件不存在**
   - 图片已被删除
   - 上传失败但记录了路径
   - 路径拼写错误

2. **网络问题**
   - 网络连接不稳定
   - 服务器暂时不可用
   - DNS解析失败

3. **权限问题**
   - 存储桶权限配置错误
   - RLS策略限制访问
   - 文件访问权限不足

4. **跨域问题（CORS）**
   - 存储桶未配置CORS
   - 域名不在白名单中

5. **图片格式问题**
   - 文件损坏
   - 格式不支持
   - 文件大小超限

#### 排查步骤

##### 1. 检查图片URL是否有效

在浏览器中直接访问图片URL：
```
https://backend.appmiaoda.com/projects/supabase244.../vehicles/vehicle_cargo_box_1763226676682_i783go.jpg
```

**预期结果**：
- ✅ 图片正常显示 → 可能是小程序环境问题
- ❌ 404错误 → 图片文件不存在
- ❌ 403错误 → 权限问题
- ❌ CORS错误 → 跨域配置问题

##### 2. 检查存储桶配置

登录Supabase控制台，检查存储桶设置：

```sql
-- 检查存储桶是否存在
SELECT * FROM storage.buckets WHERE name = 'app-7cdqf07mbu9t_vehicles';

-- 检查文件是否存在
SELECT * FROM storage.objects 
WHERE bucket_id = 'app-7cdqf07mbu9t_vehicles' 
AND name LIKE '%vehicle_cargo_box_1763226676682_i783go.jpg%';
```

##### 3. 检查RLS策略

```sql
-- 查看存储桶的RLS策略
SELECT * FROM storage.policies 
WHERE bucket_id = 'app-7cdqf07mbu9t_vehicles';
```

确保有公开读取策略：
```sql
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'app-7cdqf07mbu9t_vehicles' );
```

##### 4. 检查CORS配置

在Supabase控制台 → Storage → Configuration → CORS，确保配置了：
```json
{
  "allowedOrigins": ["*"],
  "allowedMethods": ["GET", "HEAD"],
  "allowedHeaders": ["*"],
  "maxAge": 3600
}
```

##### 5. 检查图片上传记录

查看数据库中的图片路径：
```sql
SELECT id, plate_number, pickup_photos 
FROM vehicles 
WHERE pickup_photos @> ARRAY['vehicle_cargo_box_1763226676682_i783go.jpg'];
```

#### 解决方案

##### 方案1：重新上传图片

如果图片文件不存在，需要重新上传：

1. 进入"车辆列表"
2. 找到对应车辆
3. 如果状态是"需补录"，点击"补录图片"
4. 重新上传缺失的图片

##### 方案2：修复存储桶权限

```sql
-- 启用公开访问
UPDATE storage.buckets 
SET public = true 
WHERE name = 'app-7cdqf07mbu9t_vehicles';

-- 添加公开读取策略
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'app-7cdqf07mbu9t_vehicles' );
```

##### 方案3：清理无效记录

如果图片确实不存在且无法恢复，可以清理数据库记录：

```sql
-- 查看有问题的记录
SELECT id, plate_number, pickup_photos 
FROM vehicles 
WHERE 'vehicle_cargo_box_1763226676682_i783go.jpg' = ANY(pickup_photos);

-- 手动移除无效路径（谨慎操作）
UPDATE vehicles 
SET pickup_photos = array_remove(pickup_photos, 'vehicle_cargo_box_1763226676682_i783go.jpg')
WHERE 'vehicle_cargo_box_1763226676682_i783go.jpg' = ANY(pickup_photos);
```

##### 方案4：添加图片重试机制

在代码中添加自动重试：

```tsx
const [retryCount, setRetryCount] = useState<Record<string, number>>({})

const handleImageError = (photoKey: string, photoUrl: string) => {
  const count = retryCount[photoKey] || 0
  
  if (count < 3) {
    // 最多重试3次
    setRetryCount({...retryCount, [photoKey]: count + 1})
    logger.warn('图片加载失败，正在重试', {photoKey, photoUrl, retryCount: count + 1})
    
    // 延迟重试
    setTimeout(() => {
      // 触发重新渲染
      setRetryCount({...retryCount, [photoKey]: count + 1})
    }, 1000 * (count + 1))
  } else {
    logger.error('图片加载失败，已达最大重试次数', {photoKey, photoUrl})
  }
}
```

#### 预防措施

1. **上传时验证**
   - 上传后立即验证文件是否可访问
   - 记录上传日志
   - 失败时提示用户重试

2. **定期检查**
   - 定期扫描数据库中的图片路径
   - 验证文件是否存在
   - 清理无效记录

3. **备份策略**
   - 定期备份存储桶
   - 保留上传日志
   - 记录文件哈希值

4. **监控告警**
   - 监控图片加载失败率
   - 超过阈值时发送告警
   - 自动生成故障报告

---

## 审核流程问题

### 问题：车辆无法提交审核

#### 症状
点击"提交审核"按钮后，状态没有变化或提示错误。

#### 可能原因
1. 缺少必需的图片
2. 网络请求失败
3. 数据库权限问题
4. 状态不符合要求

#### 排查步骤

1. **检查图片数量**
   ```tsx
   // 提车照片至少1张
   if (!vehicle.pickup_photos || vehicle.pickup_photos.length === 0) {
     showToast('请至少上传1张提车照片')
     return
   }
   
   // 行驶证照片至少1张
   if (!vehicle.registration_photos || vehicle.registration_photos.length === 0) {
     showToast('请至少上传1张行驶证照片')
     return
   }
   ```

2. **检查网络请求**
   - 打开浏览器开发者工具
   - 查看Network标签
   - 检查API请求是否成功

3. **检查数据库日志**
   ```sql
   -- 查看最近的错误日志
   SELECT * FROM logs 
   WHERE level = 'ERROR' 
   ORDER BY created_at DESC 
   LIMIT 10;
   ```

#### 解决方案

1. **补充必需图片**
   - 确保至少有1张提车照片
   - 确保至少有1张行驶证照片

2. **重试提交**
   - 检查网络连接
   - 刷新页面后重试

3. **联系管理员**
   - 如果问题持续存在
   - 提供车辆ID和错误日志

---

## 补录图片问题

### 问题：无法补录图片

#### 症状
在"需补录"状态下，无法上传新图片或提交失败。

#### 可能原因
1. 图片格式不支持
2. 图片大小超限
3. 网络上传失败
4. 存储桶空间不足

#### 排查步骤

1. **检查图片格式**
   - 支持：JPEG、PNG、WEBP
   - 不支持：GIF、BMP、TIFF

2. **检查图片大小**
   - 单张图片最大：5MB
   - 建议大小：< 2MB

3. **检查网络状态**
   - 确保网络连接稳定
   - 避免在弱网环境下上传

#### 解决方案

1. **压缩图片**
   - 使用图片压缩工具
   - 降低图片分辨率
   - 转换为WEBP格式

2. **分批上传**
   - 一次只上传1-2张
   - 等待上传完成后再上传下一批

3. **切换网络**
   - 尝试切换到WiFi
   - 或使用移动数据

---

## 性能问题

### 问题：页面加载缓慢

#### 症状
打开车辆列表或详情页面时，加载时间过长。

#### 可能原因
1. 图片过多或过大
2. 网络速度慢
3. 数据库查询慢
4. 缓存未启用

#### 解决方案

1. **启用图片懒加载**
   ```tsx
   <Image 
     src={imageUrl} 
     mode="aspectFill"
     lazyLoad={true}  // 启用懒加载
   />
   ```

2. **压缩图片**
   - 自动压缩上传的图片
   - 使用缩略图

3. **优化查询**
   - 添加分页
   - 只查询必要字段
   - 使用索引

4. **启用缓存**
   - 缓存车辆列表
   - 缓存图片URL
   - 设置合理的过期时间

---

## 权限问题

### 问题：无权访问某些功能

#### 症状
提示"权限不足"或"无法访问"。

#### 可能原因
1. 用户角色不正确
2. RLS策略限制
3. 未登录或登录过期

#### 排查步骤

1. **检查用户角色**
   ```sql
   SELECT id, phone, role FROM profiles WHERE id = 'user_id';
   ```

2. **检查RLS策略**
   ```sql
   SELECT * FROM vehicles WHERE driver_id = 'user_id';
   ```

3. **检查登录状态**
   - 退出登录
   - 重新登录
   - 清除缓存

#### 解决方案

1. **更新用户角色**
   - 联系管理员
   - 请求分配正确的角色

2. **重新登录**
   - 退出当前账号
   - 重新登录

3. **清除缓存**
   - 清除浏览器缓存
   - 清除小程序缓存

---

## 联系支持

如果以上方法都无法解决问题，请联系技术支持：

**提供以下信息**：
1. 用户ID
2. 车辆ID（如果相关）
3. 错误日志截图
4. 操作步骤
5. 设备信息（手机型号、系统版本）

**联系方式**：
- 在小程序内提交反馈
- 或联系系统管理员

---

**文档版本**: v1.0.0  
**更新日期**: 2025-11-16
