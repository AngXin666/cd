-- 测试车辆审核通知触发器
-- 本文件用于手动测试通知系统是否正常工作

-- 1. 查看当前通知数量
SELECT COUNT(*) as total_notifications FROM notifications;

-- 2. 查看所有用户及其角色
SELECT id, name, role, phone FROM profiles ORDER BY role, name;

-- 3. 查看所有车辆及其审核状态
SELECT 
  id,
  COALESCE(plate_number, license_plate) as plate,
  review_status,
  user_id,
  reviewed_by,
  warehouse_id
FROM vehicles
ORDER BY created_at DESC
LIMIT 10;

-- 4. 模拟司机提交审核（将车辆状态改为 pending_review）
-- 注意：替换 <vehicle_id> 为实际的车辆ID
-- UPDATE vehicles 
-- SET review_status = 'pending_review'
-- WHERE id = '<vehicle_id>';

-- 5. 查看生成的通知
SELECT 
  n.id,
  n.type,
  n.title,
  n.message,
  n.is_read,
  n.created_at,
  p.name as receiver_name,
  p.role as receiver_role
FROM notifications n
JOIN profiles p ON p.id = n.user_id
ORDER BY n.created_at DESC
LIMIT 20;

-- 6. 模拟管理员审核通过
-- 注意：替换 <vehicle_id> 和 <manager_id> 为实际的ID
-- UPDATE vehicles 
-- SET 
--   review_status = 'approved',
--   reviewed_by = '<manager_id>',
--   reviewed_at = NOW()
-- WHERE id = '<vehicle_id>';

-- 7. 模拟需补录
-- 注意：替换 <vehicle_id> 和 <manager_id> 为实际的ID
-- UPDATE vehicles 
-- SET 
--   review_status = 'need_supplement',
--   reviewed_by = '<manager_id>',
--   reviewed_at = NOW(),
--   review_notes = '请补充行驶证照片'
-- WHERE id = '<vehicle_id>';

-- 8. 查看特定用户的通知
-- 注意：替换 <user_id> 为实际的用户ID
-- SELECT 
--   id,
--   type,
--   title,
--   message,
--   is_read,
--   created_at
-- FROM notifications
-- WHERE user_id = '<user_id>'
-- ORDER BY created_at DESC;

-- 9. 查看未读通知数量（按用户分组）
SELECT 
  p.name,
  p.role,
  COUNT(*) as unread_count
FROM notifications n
JOIN profiles p ON p.id = n.user_id
WHERE n.is_read = false
GROUP BY p.id, p.name, p.role
ORDER BY unread_count DESC;

-- 10. 清理测试通知（谨慎使用）
-- DELETE FROM notifications WHERE created_at > NOW() - INTERVAL '1 hour';
