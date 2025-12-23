-- 车队管家数据库初始化脚本
-- 用于 PostgreSQL 生产环境
-- 
-- 使用方法：
--   psql -U fleet -d fleet_manager -f init-db.sql

-- ============================================
-- 创建扩展
-- ============================================
-- UUID 扩展（如果需要）
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 创建索引（性能优化）
-- ============================================

-- 用户表索引
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- 仓库分配表索引
CREATE INDEX IF NOT EXISTS idx_warehouse_assignments_user_id ON warehouse_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_assignments_warehouse_id ON warehouse_assignments(warehouse_id);

-- 考勤表索引
CREATE INDEX IF NOT EXISTS idx_attendance_user_id ON attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_work_date ON attendance(work_date);
CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON attendance(user_id, work_date);

-- 计件记录表索引
CREATE INDEX IF NOT EXISTS idx_piece_work_records_user_id ON piece_work_records(user_id);
CREATE INDEX IF NOT EXISTS idx_piece_work_records_work_date ON piece_work_records(work_date);
CREATE INDEX IF NOT EXISTS idx_piece_work_records_category_id ON piece_work_records(category_id);

-- 请假申请表索引
CREATE INDEX IF NOT EXISTS idx_leave_applications_user_id ON leave_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_leave_applications_status ON leave_applications(status);
CREATE INDEX IF NOT EXISTS idx_leave_applications_approver_id ON leave_applications(approver_id);

-- 车辆表索引
CREATE INDEX IF NOT EXISTS idx_vehicles_user_id ON vehicles(user_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_license_plate ON vehicles(license_plate);

-- 通知表索引
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- ============================================
-- 创建默认管理员账户（如果不存在）
-- ============================================
-- 注意：密码哈希需要在应用层生成
-- 默认密码：admin123
-- 此处仅作为示例，实际部署时应通过应用创建

-- ============================================
-- 数据库维护函数
-- ============================================

-- 清理过期通知（保留 30 天）
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM notifications 
    WHERE created_at < NOW() - INTERVAL '30 days' 
    AND is_read = true;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 统计用户考勤
CREATE OR REPLACE FUNCTION get_user_attendance_stats(
    p_user_id INTEGER,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE (
    total_days INTEGER,
    work_days INTEGER,
    total_hours NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (p_end_date - p_start_date + 1)::INTEGER as total_days,
        COUNT(*)::INTEGER as work_days,
        COALESCE(SUM(work_hours), 0)::NUMERIC as total_hours
    FROM attendance
    WHERE user_id = p_user_id
    AND work_date BETWEEN p_start_date AND p_end_date;
END;
$$ LANGUAGE plpgsql;

-- 统计用户计件
CREATE OR REPLACE FUNCTION get_user_piece_work_stats(
    p_user_id INTEGER,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE (
    total_quantity INTEGER,
    total_amount NUMERIC,
    category_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(quantity), 0)::INTEGER as total_quantity,
        COALESCE(SUM(amount), 0)::NUMERIC as total_amount,
        COUNT(DISTINCT category_id)::INTEGER as category_count
    FROM piece_work_records
    WHERE user_id = p_user_id
    AND work_date BETWEEN p_start_date AND p_end_date;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 完成提示
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '数据库初始化完成！';
    RAISE NOTICE '请通过应用创建管理员账户';
END $$;
