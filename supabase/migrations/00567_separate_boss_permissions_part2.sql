-- 第二部分：修改is_admin()函数

CREATE OR REPLACE FUNCTION is_admin(uid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- 只检查PEER_ADMIN（有完整控制权）
  -- BOSS不再通过is_admin()检查，使用独立的is_boss()
  RETURN EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN user_permission_assignments upa ON upa.user_id = ur.user_id
    JOIN permission_strategies ps ON ps.id = upa.strategy_id
    WHERE ur.user_id = uid 
      AND ur.role = 'PEER_ADMIN'
      AND ps.strategy_name = 'peer_admin_full_control'
      AND ps.is_active = true
  );
END;
$$;