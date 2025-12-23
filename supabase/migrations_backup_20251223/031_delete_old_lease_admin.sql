/*
# 删除旧的租赁管理员账号

>15766121960的租赁管理员账号

## 操作步骤
- 删除profiles表中的记录
- 删除auth.users表中的认证记录
*/

-- 删除旧的租赁管理员账号
DO $$
DECLARE
  old_user_id uuid;
BEGIN
  -- 从profiles表中查找旧账号的user_id
  SELECT id INTO old_user_id
  FROM profiles
  WHERE phone = '15766121960' AND role = 'lease_admin'::user_role;

  -- 如果找到了，先删除profiles记录
  IF old_user_id IS NOT NULL THEN
    DELETE FROM profiles WHERE id = old_user_id;
    
    -- 删除auth.users中的记录
    DELETE FROM auth.users WHERE id = old_user_id;
    
    RAISE NOTICE '已删除旧的租赁管理员账号: %', old_user_id;
  ELSE
    RAISE NOTICE '未找到手机号为15766121960的租赁管理员账号';
  END IF;
END $$;
