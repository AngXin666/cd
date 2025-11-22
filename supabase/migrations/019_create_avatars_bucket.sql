/*
# 创建头像存储桶

1. 创建Storage Bucket
    - 名称：app-7cdqf07mbu9t_avatars
    - 用途：存储用户头像
    - 文件大小限制：1MB
    - 允许的文件类型：image/jpeg, image/png, image/webp

2. 安全策略
    - 所有用户可以上传自己的头像
    - 所有人可以查看头像（公开访问）
*/

-- 创建avatars bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'app-7cdqf07mbu9t_avatars',
    'app-7cdqf07mbu9t_avatars',
    true,
    1048576,
    ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- 允许所有认证用户上传头像
CREATE POLICY "用户可以上传头像" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'app-7cdqf07mbu9t_avatars' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- 允许用户更新自己的头像
CREATE POLICY "用户可以更新自己的头像" ON storage.objects
    FOR UPDATE TO authenticated
    USING (
        bucket_id = 'app-7cdqf07mbu9t_avatars' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- 允许用户删除自己的头像
CREATE POLICY "用户可以删除自己的头像" ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id = 'app-7cdqf07mbu9t_avatars' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- 允许所有人查看头像（公开访问）
CREATE POLICY "所有人可以查看头像" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'app-7cdqf07mbu9t_avatars');
