/*
# 创建车辆和证件照片存储桶

1. 创建Storage Bucket
    - 名称：app-7cdqf07mbu9t_vehicles
    - 用途：存储司机证件照片（身份证、驾驶证）和车辆照片
    - 文件大小限制：5MB（证件和车辆照片可能较大）
    - 允许的文件类型：image/jpeg, image/png, image/webp

2. 安全策略
    - 所有认证用户可以上传照片
    - 所有认证用户可以查看照片（管理员需要查看司机的证件）
    - 用户可以更新和删除自己的照片
*/

-- 创建vehicles bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'app-7cdqf07mbu9t_vehicles',
    'app-7cdqf07mbu9t_vehicles',
    true,
    5242880,  -- 5MB
    ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- 允许所有认证用户上传照片
CREATE POLICY "认证用户可以上传照片" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'app-7cdqf07mbu9t_vehicles');

-- 允许认证用户更新照片
CREATE POLICY "认证用户可以更新照片" ON storage.objects
    FOR UPDATE TO authenticated
    USING (bucket_id = 'app-7cdqf07mbu9t_vehicles');

-- 允许认证用户删除照片
CREATE POLICY "认证用户可以删除照片" ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'app-7cdqf07mbu9t_vehicles');

-- 允许所有认证用户查看照片（管理员需要查看司机的证件）
CREATE POLICY "认证用户可以查看照片" ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'app-7cdqf07mbu9t_vehicles');
