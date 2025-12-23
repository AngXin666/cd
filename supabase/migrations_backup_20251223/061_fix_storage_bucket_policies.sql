/*
# 修复存储桶策略安全漏洞

## 问题描述
1. 存在大量重复的存储桶策略（20个策略）
2. 没有实现租户隔离，任何认证用户都可以访问所有文件
3. 存在多个重复的存储桶（avatars, app-7cdqf07mbu9t_avatars, vehicle_photos, app-7cdqf07mbu9t_vehicles）

## 安全风险
- 租户A可以查看、修改、删除租户B的文件
- 没有权限控制
- 数据泄露风险

## 修复方案
1. 删除所有旧的重复策略
2. 删除重复的存储桶（保留 app-7cdqf07mbu9t_* 命名的桶）
3. 创建新的策略，实现租户隔离：
   - 同租户用户可以查看、上传、更新、删除文件
   - 租赁管理员可以查看所有文件
   - 使用文件路径中的 tenant_id 进行隔离

## 文件路径规范
- 头像：{tenant_id}/{user_id}/avatar.jpg
- 车辆照片：{tenant_id}/{vehicle_id}/photo.jpg
*/

-- ============================================================================
-- 1. 删除所有旧的存储桶策略
-- ============================================================================

-- 删除 avatars 桶的策略
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public avatars are viewable by everyone" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;

-- 删除 vehicle_photos 桶的策略
DROP POLICY IF EXISTS "Authenticated users can upload vehicle photos" ON storage.objects;
DROP POLICY IF EXISTS "Public vehicle photos are viewable by everyone" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own vehicle photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own vehicle photos" ON storage.objects;

-- 删除 app-7cdqf07mbu9t_avatars 桶的旧策略
DROP POLICY IF EXISTS "所有人可以查看头像" ON storage.objects;
DROP POLICY IF EXISTS "用户可以上传头像" ON storage.objects;
DROP POLICY IF EXISTS "用户可以删除自己的头像" ON storage.objects;
DROP POLICY IF EXISTS "用户可以更新自己的头像" ON storage.objects;

-- 删除 app-7cdqf07mbu9t_vehicles 桶的旧策略
DROP POLICY IF EXISTS "所有人可以查看车辆照片" ON storage.objects;
DROP POLICY IF EXISTS "认证用户可以上传照片" ON storage.objects;
DROP POLICY IF EXISTS "认证用户可以上传车辆照片" ON storage.objects;
DROP POLICY IF EXISTS "用户可以删除自己的车辆照片" ON storage.objects;
DROP POLICY IF EXISTS "认证用户可以删除照片" ON storage.objects;
DROP POLICY IF EXISTS "用户可以更新自己的车辆照片" ON storage.objects;
DROP POLICY IF EXISTS "认证用户可以更新照片" ON storage.objects;
DROP POLICY IF EXISTS "认证用户可以查看照片" ON storage.objects;

-- ============================================================================
-- 2. 删除重复的存储桶
-- ============================================================================

-- 删除旧的存储桶（如果存在）
DELETE FROM storage.buckets WHERE id = 'avatars';
DELETE FROM storage.buckets WHERE id = 'vehicle_photos';

-- ============================================================================
-- 3. 创建辅助函数：从文件路径提取租户ID
-- ============================================================================

CREATE OR REPLACE FUNCTION storage.get_tenant_id_from_path(file_path text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  tenant_id_str text;
BEGIN
  -- 文件路径格式: {tenant_id}/{user_id}/filename
  -- 提取第一个路径段作为 tenant_id
  tenant_id_str := split_part(file_path, '/', 1);
  
  -- 验证是否为有效的 UUID
  IF tenant_id_str ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN tenant_id_str::uuid;
  END IF;
  
  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION storage.get_tenant_id_from_path(text) IS '从存储文件路径中提取租户ID';

-- ============================================================================
-- 4. 创建新的存储桶策略 - app-7cdqf07mbu9t_avatars
-- ============================================================================

-- 4.1 查看策略：同租户用户可以查看
CREATE POLICY "同租户用户可以查看头像" ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'app-7cdqf07mbu9t_avatars'
    AND (
      -- 租赁管理员可以查看所有头像
      is_lease_admin()
      OR
      -- 同租户用户可以查看
      storage.get_tenant_id_from_path(name) = get_user_tenant_id()
    )
  );

-- 4.2 上传策略：同租户用户可以上传
CREATE POLICY "同租户用户可以上传头像" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'app-7cdqf07mbu9t_avatars'
    AND storage.get_tenant_id_from_path(name) = get_user_tenant_id()
  );

-- 4.3 更新策略：同租户用户可以更新
CREATE POLICY "同租户用户可以更新头像" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'app-7cdqf07mbu9t_avatars'
    AND storage.get_tenant_id_from_path(name) = get_user_tenant_id()
  )
  WITH CHECK (
    bucket_id = 'app-7cdqf07mbu9t_avatars'
    AND storage.get_tenant_id_from_path(name) = get_user_tenant_id()
  );

-- 4.4 删除策略：同租户用户可以删除
CREATE POLICY "同租户用户可以删除头像" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'app-7cdqf07mbu9t_avatars'
    AND storage.get_tenant_id_from_path(name) = get_user_tenant_id()
  );

-- ============================================================================
-- 5. 创建新的存储桶策略 - app-7cdqf07mbu9t_vehicles
-- ============================================================================

-- 5.1 查看策略：同租户用户可以查看
CREATE POLICY "同租户用户可以查看车辆照片" ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'app-7cdqf07mbu9t_vehicles'
    AND (
      -- 租赁管理员可以查看所有车辆照片
      is_lease_admin()
      OR
      -- 同租户用户可以查看
      storage.get_tenant_id_from_path(name) = get_user_tenant_id()
    )
  );

-- 5.2 上传策略：同租户用户可以上传
CREATE POLICY "同租户用户可以上传车辆照片" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'app-7cdqf07mbu9t_vehicles'
    AND storage.get_tenant_id_from_path(name) = get_user_tenant_id()
  );

-- 5.3 更新策略：同租户用户可以更新
CREATE POLICY "同租户用户可以更新车辆照片" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'app-7cdqf07mbu9t_vehicles'
    AND storage.get_tenant_id_from_path(name) = get_user_tenant_id()
  )
  WITH CHECK (
    bucket_id = 'app-7cdqf07mbu9t_vehicles'
    AND storage.get_tenant_id_from_path(name) = get_user_tenant_id()
  );

-- 5.4 删除策略：同租户用户可以删除
CREATE POLICY "同租户用户可以删除车辆照片" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'app-7cdqf07mbu9t_vehicles'
    AND storage.get_tenant_id_from_path(name) = get_user_tenant_id()
  );

-- ============================================================================
-- 6. 添加策略注释
-- ============================================================================

COMMENT ON POLICY "同租户用户可以查看头像" ON storage.objects IS '同租户用户可以查看头像，租赁管理员可以查看所有头像';
COMMENT ON POLICY "同租户用户可以上传头像" ON storage.objects IS '同租户用户可以上传头像到自己租户的目录';
COMMENT ON POLICY "同租户用户可以更新头像" ON storage.objects IS '同租户用户可以更新自己租户的头像';
COMMENT ON POLICY "同租户用户可以删除头像" ON storage.objects IS '同租户用户可以删除自己租户的头像';

COMMENT ON POLICY "同租户用户可以查看车辆照片" ON storage.objects IS '同租户用户可以查看车辆照片，租赁管理员可以查看所有车辆照片';
COMMENT ON POLICY "同租户用户可以上传车辆照片" ON storage.objects IS '同租户用户可以上传车辆照片到自己租户的目录';
COMMENT ON POLICY "同租户用户可以更新车辆照片" ON storage.objects IS '同租户用户可以更新自己租户的车辆照片';
COMMENT ON POLICY "同租户用户可以删除车辆照片" ON storage.objects IS '同租户用户可以删除自己租户的车辆照片';
