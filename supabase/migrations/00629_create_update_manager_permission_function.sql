-- 创建 update_manager_permission RPC 函数
-- 用于更新车队长的权限启用状态
-- 如果 manager_permissions_enabled 字段不存在，会先添加该字段

-- 首先确保字段存在
DO $
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
    END IF;
END $;

-- 为现有的 MANAGER 和 PEER_ADMIN 用户设置默认值为 true（完整权限）
UPDATE public.users 
SET manager_permissions_enabled = true 
WHERE role IN ('MANAGER', 'PEER_ADMIN') 
AND manager_permissions_enabled IS NULL;

-- 创建或替换 RPC 函数
CREATE OR REPLACE FUNCTION update_manager_permission(
    p_user_id UUID,
    p_enabled BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- 更新用户的权限启用状态
    UPDATE public.users
    SET 
        manager_permissions_enabled = p_enabled,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    -- 返回是否更新成功
    RETURN FOUND;
END;
$$;

-- 授予执行权限
GRANT EXECUTE ON FUNCTION update_manager_permission(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION update_manager_permission(UUID, BOOLEAN) TO service_role;

-- 添加索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_users_manager_permissions_enabled 
ON public.users(manager_permissions_enabled) 
WHERE role IN ('MANAGER', 'PEER_ADMIN');
