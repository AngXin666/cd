-- 调试请假申请数据可见性问题
-- 检查数据库中是否有请假申请记录

-- 1. 检查表结构（绕过RLS）
SELECT 
  COUNT(*) as total_count,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
  COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_count,
  COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_count
FROM leave_applications;

-- 2. 查看最近的10条请假申请（绕过RLS）
SELECT 
  id,
  user_id,
  warehouse_id,
  leave_type,
  start_date,
  end_date,
  status,
  reviewed_by,
  reviewed_at,
  created_at
FROM leave_applications
ORDER BY created_at DESC
LIMIT 10;

-- 3. 检查RLS策略是否启用
SELECT 
  relname,
  relrowsecurity
FROM pg_class
WHERE relname = 'leave_applications';

-- 4. 查看当前生效的RLS策略
SELECT 
  polname as policy_name,
  CASE 
    WHEN polcmd = 'r' THEN 'SELECT'
    WHEN polcmd = 'a' THEN 'INSERT'
    WHEN polcmd = 'w' THEN 'UPDATE'
    WHEN polcmd = 'd' THEN 'DELETE'
    WHEN polcmd = '*' THEN 'ALL'
  END as command_type,
  polpermissive as is_permissive,
  pg_get_expr(polqual, polrelid) as using_expression,
  pg_get_expr(polwithcheck, polrelid) as with_check_expression
FROM pg_policy
WHERE polrelid = 'leave_applications'::regclass
ORDER BY polname;

-- 5. 测试：以超级管理员身份查看所有请假申请（如果你是超级管理员）
-- 注意：这个查询受RLS策略限制，如果看不到数据可能是策略问题
SELECT 
  id,
  user_id,
  warehouse_id,
  leave_type,
  start_date,
  end_date,
  status,
  created_at
FROM leave_applications
ORDER BY created_at DESC
LIMIT 5;

-- 6. 检查当前用户权限
SELECT 
  auth.uid() as current_user_id,
  is_admin(auth.uid()) as is_admin,
  EXISTS(
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'BOSS'
  ) as is_boss;

RAISE NOTICE '====================';
RAISE NOTICE '✓ 调试信息已输出';
RAISE NOTICE '====================';
