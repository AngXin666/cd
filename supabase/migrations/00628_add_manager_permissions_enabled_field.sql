-- 添加 manager_permissions_enabled 字段到 users 表
-- 用于控制 MANAGER/PEER_ADMIN 角色的权限级别
-- true = full_control（完整权限）
-- false = view_only（仅查看权限）
-- 默认为 true（完整权限）

-- 检查字段是否已存在，如果不存在则添加
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'manager_permissions_enabled'
    ) THEN
        ALTER TABLE public.users 
        ADD COLUMN manager_permissions_enabled BOOLEAN DEFAULT true;
        
        COMMENT ON COLUMN public.users.manager_permissions_enabled IS 
            '管理员权限启用状态：true=完整权限(full_control)，false=仅查看权限(view_only)，默认为true';
        
        RAISE NOTICE 'Column manager_permissions_enabled added to users table';
    ELSE
        RAISE NOTICE 'Column manager_permissions_enabled already exists in users table';
    END IF;
END $$;

-- 为现有的 MANAGER 和 PEER_ADMIN 用户设置默认值为 true（完整权限）
UPDATE public.users 
SET manager_permissions_enabled = true 
WHERE role IN ('MANAGER', 'PEER_ADMIN') 
AND manager_permissions_enabled IS NULL;

-- 添加索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_users_manager_permissions_enabled 
ON public.users(manager_permissions_enabled) 
WHERE role IN ('MANAGER', 'PEER_ADMIN');
