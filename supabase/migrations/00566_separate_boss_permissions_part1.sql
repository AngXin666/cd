-- 第一部分：创建is_boss()函数

CREATE OR REPLACE FUNCTION is_boss(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = p_user_id AND role = 'BOSS'
  );
END;
$$;