/*
# 创建存储桶

## 说明
创建 Supabase Storage 存储桶，用于存储用户上传的文件。

## 存储桶列表

### 1. avatars（头像存储桶）
用于存储用户头像图片。

**配置**：
- 公开访问：是
- 文件大小限制：1MB
- 允许的文件类型：image/jpeg, image/png, image/gif, image/webp

### 2. vehicle_photos（车辆照片存储桶）
用于存储车辆相关照片（提车照、还车照、行驶证照等）。

**配置**：
- 公开访问：是
- 文件大小限制：1MB
- 允许的文件类型：image/jpeg, image/png, image/webp

## 安全策略
- 所有认证用户可以上传文件
- 所有人可以读取文件（公开访问）
- 只有文件所有者和管理员可以删除文件
*/

-- ============================================
-- 创建 avatars 存储桶
-- ============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  1048576, -- 1MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================
-- 创建 vehicle_photos 存储桶
-- ============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vehicle_photos',
  'vehicle_photos',
  true,
  1048576, -- 1MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================
-- avatars 存储桶策略
-- ============================================

-- 允许所有人读取头像
DROP POLICY IF EXISTS "Public avatars are viewable by everyone" ON storage.objects;
CREATE POLICY "Public avatars are viewable by everyone"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- 允许认证用户上传头像
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars');

-- 允许用户更新自己的头像
DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
CREATE POLICY "Users can update their own avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 允许用户删除自己的头像
DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;
CREATE POLICY "Users can delete their own avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================
-- vehicle_photos 存储桶策略
-- ============================================

-- 允许所有人读取车辆照片
DROP POLICY IF EXISTS "Public vehicle photos are viewable by everyone" ON storage.objects;
CREATE POLICY "Public vehicle photos are viewable by everyone"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'vehicle_photos');

-- 允许认证用户上传车辆照片
DROP POLICY IF EXISTS "Authenticated users can upload vehicle photos" ON storage.objects;
CREATE POLICY "Authenticated users can upload vehicle photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'vehicle_photos');

-- 允许用户更新自己的车辆照片
DROP POLICY IF EXISTS "Users can update their own vehicle photos" ON storage.objects;
CREATE POLICY "Users can update their own vehicle photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'vehicle_photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 允许用户删除自己的车辆照片
DROP POLICY IF EXISTS "Users can delete their own vehicle photos" ON storage.objects;
CREATE POLICY "Users can delete their own vehicle photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'vehicle_photos' AND auth.uid()::text = (storage.foldername(name))[1]);
