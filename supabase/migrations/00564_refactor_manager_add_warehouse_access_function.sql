-- 创建manager_has_warehouse_access()函数
CREATE OR REPLACE FUNCTION manager_has_warehouse_access(p_user_id uuid, p_warehouse_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM warehouse_assignments
    WHERE user_id = p_user_id 
      AND warehouse_id = p_warehouse_id
  );
END;
$$;