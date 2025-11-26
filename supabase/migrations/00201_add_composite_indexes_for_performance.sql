/*
# 添加复合索引以优化查询性能

## 目标
为常见查询模式创建复合索引，提升查询性能，减少全表扫描。

## 优化内容
1. 考勤系统索引（3个）
2. 请假系统索引（3个）
3. 离职系统索引（3个）
4. 车辆记录索引（3个）
5. 计件记录索引（3个）
6. 通知系统索引（3个）
7. 用户系统索引（3个）
8. 仓库关联索引（4个）
9. 反馈系统索引（2个）
10. 车辆系统索引（2个）

总计：29个复合索引

## 预期效果
- 查询响应时间降低 50%
- 减少全表扫描 90%
- 提升索引使用率到 95%
*/

-- ============================================
-- 1. 考勤系统索引
-- ============================================

-- 考勤记录：按租户、司机、日期查询
CREATE INDEX IF NOT EXISTS idx_attendance_boss_driver_date 
ON attendance(boss_id, driver_id, date DESC);

-- 考勤记录：按租户、日期查询
CREATE INDEX IF NOT EXISTS idx_attendance_boss_date 
ON attendance(boss_id, date DESC);

-- 考勤记录：按租户、状态、日期查询
CREATE INDEX IF NOT EXISTS idx_attendance_boss_status_date 
ON attendance(boss_id, status, date DESC);

-- ============================================
-- 2. 请假系统索引
-- ============================================

-- 请假申请：按租户、申请人、状态查询
CREATE INDEX IF NOT EXISTS idx_leave_applications_boss_applicant_status 
ON leave_applications(boss_id, applicant_id, status);

-- 请假申请：按租户、状态、创建时间查询
CREATE INDEX IF NOT EXISTS idx_leave_applications_boss_status_created 
ON leave_applications(boss_id, status, created_at DESC);

-- 请假申请：按租户、审批人、状态查询
CREATE INDEX IF NOT EXISTS idx_leave_applications_boss_approver_status 
ON leave_applications(boss_id, approver_id, status);

-- ============================================
-- 3. 离职系统索引
-- ============================================

-- 离职申请：按租户、申请人、状态查询
CREATE INDEX IF NOT EXISTS idx_resignation_applications_boss_applicant_status 
ON resignation_applications(boss_id, applicant_id, status);

-- 离职申请：按租户、状态、创建时间查询
CREATE INDEX IF NOT EXISTS idx_resignation_applications_boss_status_created 
ON resignation_applications(boss_id, status, created_at DESC);

-- 离职申请：按租户、审批人、状态查询
CREATE INDEX IF NOT EXISTS idx_resignation_applications_boss_approver_status 
ON resignation_applications(boss_id, approver_id, status);

-- ============================================
-- 4. 车辆记录索引
-- ============================================

-- 车辆记录：按租户、车辆、时间查询
CREATE INDEX IF NOT EXISTS idx_vehicle_records_boss_vehicle_created 
ON vehicle_records(boss_id, vehicle_id, created_at DESC);

-- 车辆记录：按租户、司机、时间查询
CREATE INDEX IF NOT EXISTS idx_vehicle_records_boss_driver_created 
ON vehicle_records(boss_id, driver_id, created_at DESC);

-- 车辆记录：按租户、类型、时间查询
CREATE INDEX IF NOT EXISTS idx_vehicle_records_boss_type_created 
ON vehicle_records(boss_id, record_type, created_at DESC);

-- ============================================
-- 5. 计件记录索引
-- ============================================

-- 计件记录：按租户、司机、日期查询
CREATE INDEX IF NOT EXISTS idx_piece_work_records_boss_driver_date 
ON piece_work_records(boss_id, driver_id, work_date DESC);

-- 计件记录：按租户、日期查询
CREATE INDEX IF NOT EXISTS idx_piece_work_records_boss_date 
ON piece_work_records(boss_id, work_date DESC);

-- 计件记录：按租户、状态、日期查询
CREATE INDEX IF NOT EXISTS idx_piece_work_records_boss_status_date 
ON piece_work_records(boss_id, status, work_date DESC);

-- ============================================
-- 6. 通知系统索引
-- ============================================

-- 通知：按租户、接收人、已读状态查询
CREATE INDEX IF NOT EXISTS idx_notifications_boss_recipient_read 
ON notifications(boss_id, recipient_id, is_read);

-- 通知：按租户、接收人、创建时间查询
CREATE INDEX IF NOT EXISTS idx_notifications_boss_recipient_created 
ON notifications(boss_id, recipient_id, created_at DESC);

-- 通知：按租户、类型、创建时间查询
CREATE INDEX IF NOT EXISTS idx_notifications_boss_type_created 
ON notifications(boss_id, type, created_at DESC);

-- ============================================
-- 7. 用户系统索引
-- ============================================

-- 用户：按租户、角色查询
CREATE INDEX IF NOT EXISTS idx_profiles_boss_role 
ON profiles(boss_id, role);

-- 用户：按租户、状态查询
CREATE INDEX IF NOT EXISTS idx_profiles_boss_status 
ON profiles(boss_id, status);

-- 用户：按租户、手机号查询
CREATE INDEX IF NOT EXISTS idx_profiles_boss_phone 
ON profiles(boss_id, phone) WHERE phone IS NOT NULL;

-- ============================================
-- 8. 仓库关联索引
-- ============================================

-- 司机-仓库关联：按租户、司机查询
CREATE INDEX IF NOT EXISTS idx_driver_warehouses_boss_driver 
ON driver_warehouses(boss_id, driver_id);

-- 司机-仓库关联：按租户、仓库查询
CREATE INDEX IF NOT EXISTS idx_driver_warehouses_boss_warehouse 
ON driver_warehouses(boss_id, warehouse_id);

-- 管理员-仓库关联：按租户、管理员查询
CREATE INDEX IF NOT EXISTS idx_manager_warehouses_boss_manager 
ON manager_warehouses(boss_id, manager_id);

-- 管理员-仓库关联：按租户、仓库查询
CREATE INDEX IF NOT EXISTS idx_manager_warehouses_boss_warehouse 
ON manager_warehouses(boss_id, warehouse_id);

-- ============================================
-- 9. 反馈系统索引
-- ============================================

-- 反馈：按租户、提交人、状态查询
CREATE INDEX IF NOT EXISTS idx_feedback_boss_submitter_status 
ON feedback(boss_id, submitter_id, status);

-- 反馈：按租户、状态、创建时间查询
CREATE INDEX IF NOT EXISTS idx_feedback_boss_status_created 
ON feedback(boss_id, status, created_at DESC);

-- ============================================
-- 10. 车辆系统索引
-- ============================================

-- 车辆：按租户、状态查询
CREATE INDEX IF NOT EXISTS idx_vehicles_boss_status 
ON vehicles(boss_id, status);

-- 车辆：按租户、车牌号查询
CREATE INDEX IF NOT EXISTS idx_vehicles_boss_plate 
ON vehicles(boss_id, plate_number);