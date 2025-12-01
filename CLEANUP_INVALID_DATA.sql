-- 清理数据库中的无效数据
-- 这个脚本用于检查和清理 leave_applications 表中的无效记录

-- 1. 检查是否有无效的 ID
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
WHERE 
  id = 'anon'::uuid  -- 检查 ID 是否为 'anon'
  OR user_id = 'anon'::uuid  -- 检查 user_id 是否为 'anon'
  OR LENGTH(id::text) < 10  -- 检查 ID 长度是否异常
ORDER BY created_at DESC;

-- 2. 检查所有请假申请的 ID 格式
SELECT 
  id,
  user_id,
  leave_type,
  start_date,
  end_date,
  status,
  created_at,
  LENGTH(id::text) as id_length,
  LENGTH(user_id::text) as user_id_length
FROM leave_applications
ORDER BY created_at DESC
LIMIT 20;

-- 3. 检查通知表中是否有无效的 related_id
SELECT 
  id,
  recipient_id,
  type,
  title,
  related_id,
  approval_status,
  created_at,
  LENGTH(related_id::text) as related_id_length
FROM notifications
WHERE 
  type IN ('leave_application_submitted', 'leave_approved', 'leave_rejected')
  AND (
    related_id = 'anon'::uuid
    OR LENGTH(related_id::text) < 10
  )
ORDER BY created_at DESC;

-- 4. 如果发现无效数据，可以使用以下语句删除
-- 注意：执行删除操作前请先备份数据！

-- 删除 ID 为 'anon' 的请假申请
-- DELETE FROM leave_applications WHERE id = 'anon'::uuid;

-- 删除 user_id 为 'anon' 的请假申请
-- DELETE FROM leave_applications WHERE user_id = 'anon'::uuid;

-- 删除 related_id 为 'anon' 的通知
-- DELETE FROM notifications WHERE related_id = 'anon'::uuid;

-- 5. 验证数据完整性
-- 检查是否有孤立的通知（related_id 指向不存在的请假申请）
SELECT 
  n.id as notification_id,
  n.recipient_id,
  n.type,
  n.title,
  n.related_id,
  n.created_at,
  CASE 
    WHEN la.id IS NULL THEN '请假申请不存在'
    ELSE '请假申请存在'
  END as status
FROM notifications n
LEFT JOIN leave_applications la ON n.related_id = la.id
WHERE 
  n.type IN ('leave_application_submitted', 'leave_approved', 'leave_rejected')
  AND la.id IS NULL
ORDER BY n.created_at DESC;

-- 6. 统计信息
SELECT 
  '请假申请总数' as metric,
  COUNT(*) as count
FROM leave_applications
UNION ALL
SELECT 
  '待审批的请假申请' as metric,
  COUNT(*) as count
FROM leave_applications
WHERE status = 'pending'
UNION ALL
SELECT 
  '请假相关通知总数' as metric,
  COUNT(*) as count
FROM notifications
WHERE type IN ('leave_application_submitted', 'leave_approved', 'leave_rejected')
UNION ALL
SELECT 
  '待处理的请假通知' as metric,
  COUNT(*) as count
FROM notifications
WHERE 
  type IN ('leave_application_submitted', 'leave_approved', 'leave_rejected')
  AND approval_status = 'pending';
