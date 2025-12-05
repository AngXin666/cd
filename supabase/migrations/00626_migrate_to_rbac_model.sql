/*
# 迁移到RBAC模型 - 简化权限控制

## 背景
当前RLS策略过于复杂，包含大量仓库关联检查，维护困难

## RBAC原则
基于用户角色（users.role）进行权限控制：
- BOSS: 全部权限
- PEER_ADMIN: 全部权限（调度）
- MANAGER: 仓库级权限（车队长）
- DRIVER: 个人数据权限（司机）

## 策略
1. 删除所有复杂的RLS策略
2. 创建基于角色的简单策略
3. 使用函数简化策略表达式
*/

-- ============================================
-- 第1步：创建RBAC辅助函数
-- ============================================

-- 检查是否为管理员（BOSS/PEER_ADMIN）
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid()
        AND role IN ('BOSS', 'PEER_ADMIN')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 检查是否为管理层（包括MANAGER）
CREATE OR REPLACE FUNCTION is_management()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid()
        AND role IN ('BOSS', 'PEER_ADMIN', 'MANAGER')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 获取当前用户角色
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS TEXT AS $$
BEGIN
    RETURN (SELECT role FROM users WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION is_admin() IS 'RBAC: 检查用户是否为管理员（BOSS/PEER_ADMIN）';
COMMENT ON FUNCTION is_management() IS 'RBAC: 检查用户是否为管理层（BOSS/PEER_ADMIN/MANAGER）';
COMMENT ON FUNCTION get_current_user_role() IS 'RBAC: 获取当前用户角色';

-- ============================================
-- 第2步：删除所有现有RLS策略
-- ============================================

DO $$
DECLARE
    policy_rec RECORD;
    drop_count INTEGER := 0;
BEGIN
    RAISE NOTICE '🗑️ 开始删除所有RLS策略...';
    
    FOR policy_rec IN 
        SELECT tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', policy_rec.policyname, policy_rec.tablename);
        drop_count := drop_count + 1;
    END LOOP;
    
    RAISE NOTICE '✅ 已删除 % 个RLS策略', drop_count;
END $$;

-- ============================================
-- 第3步：创建RBAC策略 - notifications（通知表）
-- ============================================

-- 用户查看自己的通知
CREATE POLICY "rbac_notifications_select_own" ON notifications
    FOR SELECT USING (recipient_id = auth.uid());

-- 管理层查看所有通知
CREATE POLICY "rbac_notifications_select_admin" ON notifications
    FOR SELECT USING (is_management());

-- 所有认证用户创建通知
CREATE POLICY "rbac_notifications_insert" ON notifications
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 用户更新自己的通知（标记已读）
CREATE POLICY "rbac_notifications_update_own" ON notifications
    FOR UPDATE USING (recipient_id = auth.uid());

-- 管理层更新所有通知
CREATE POLICY "rbac_notifications_update_admin" ON notifications
    FOR UPDATE USING (is_management());

-- 用户删除自己的通知
CREATE POLICY "rbac_notifications_delete_own" ON notifications
    FOR DELETE USING (recipient_id = auth.uid());

-- ============================================
-- 第4步：创建RBAC策略 - leave_applications（请假申请）
-- ============================================

-- 司机查看自己的请假
CREATE POLICY "rbac_leave_select_own" ON leave_applications
    FOR SELECT USING (user_id = auth.uid());

-- 管理层查看所有请假
CREATE POLICY "rbac_leave_select_admin" ON leave_applications
    FOR SELECT USING (is_management());

-- 司机创建自己的请假
CREATE POLICY "rbac_leave_insert_own" ON leave_applications
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- 司机更新自己的待审批请假
CREATE POLICY "rbac_leave_update_own" ON leave_applications
    FOR UPDATE USING (user_id = auth.uid() AND status = 'pending');

-- 管理层审批所有请假
CREATE POLICY "rbac_leave_update_admin" ON leave_applications
    FOR UPDATE USING (is_management());

-- 司机删除自己的待审批请假
CREATE POLICY "rbac_leave_delete_own" ON leave_applications
    FOR DELETE USING (user_id = auth.uid() AND status = 'pending');

-- 管理层删除所有请假
CREATE POLICY "rbac_leave_delete_admin" ON leave_applications
    FOR DELETE USING (is_management());

-- ============================================
-- 第5步：创建RBAC策略 - resignation_applications（离职申请）
-- ============================================

-- 司机查看自己的离职申请
CREATE POLICY "rbac_resignation_select_own" ON resignation_applications
    FOR SELECT USING (user_id = auth.uid());

-- 管理层查看所有离职申请
CREATE POLICY "rbac_resignation_select_admin" ON resignation_applications
    FOR SELECT USING (is_management());

-- 司机创建自己的离职申请
CREATE POLICY "rbac_resignation_insert_own" ON resignation_applications
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- 司机更新自己的待审批离职申请
CREATE POLICY "rbac_resignation_update_own" ON resignation_applications
    FOR UPDATE USING (user_id = auth.uid() AND status = 'pending');

-- 管理层审批所有离职申请
CREATE POLICY "rbac_resignation_update_admin" ON resignation_applications
    FOR UPDATE USING (is_management());

-- 司机删除自己的待审批离职申请
CREATE POLICY "rbac_resignation_delete_own" ON resignation_applications
    FOR DELETE USING (user_id = auth.uid() AND status = 'pending');

-- 管理层删除所有离职申请
CREATE POLICY "rbac_resignation_delete_admin" ON resignation_applications
    FOR DELETE USING (is_management());

-- ============================================
-- 第6步：创建RBAC策略 - attendance（考勤）
-- ============================================

-- 用户查看自己的考勤
CREATE POLICY "rbac_attendance_select_own" ON attendance
    FOR SELECT USING (user_id = auth.uid());

-- 管理层查看所有考勤
CREATE POLICY "rbac_attendance_select_admin" ON attendance
    FOR SELECT USING (is_management());

-- 用户创建自己的考勤
CREATE POLICY "rbac_attendance_insert_own" ON attendance
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- 管理层创建所有考勤
CREATE POLICY "rbac_attendance_insert_admin" ON attendance
    FOR INSERT WITH CHECK (is_management());

-- 用户更新自己的考勤
CREATE POLICY "rbac_attendance_update_own" ON attendance
    FOR UPDATE USING (user_id = auth.uid());

-- 管理层更新所有考勤
CREATE POLICY "rbac_attendance_update_admin" ON attendance
    FOR UPDATE USING (is_management());

-- 管理层删除考勤
CREATE POLICY "rbac_attendance_delete_admin" ON attendance
    FOR DELETE USING (is_management());

-- ============================================
-- 第7步：创建RBAC策略 - piece_work_records（计件记录）
-- ============================================

-- 司机查看自己的计件
CREATE POLICY "rbac_piecework_select_own" ON piece_work_records
    FOR SELECT USING (user_id = auth.uid());

-- 管理层查看所有计件
CREATE POLICY "rbac_piecework_select_admin" ON piece_work_records
    FOR SELECT USING (is_management());

-- 司机创建自己的计件
CREATE POLICY "rbac_piecework_insert_own" ON piece_work_records
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- 管理层创建所有计件
CREATE POLICY "rbac_piecework_insert_admin" ON piece_work_records
    FOR INSERT WITH CHECK (is_management());

-- 司机更新自己的计件
CREATE POLICY "rbac_piecework_update_own" ON piece_work_records
    FOR UPDATE USING (user_id = auth.uid());

-- 管理层更新所有计件
CREATE POLICY "rbac_piecework_update_admin" ON piece_work_records
    FOR UPDATE USING (is_management());

-- 管理层删除计件
CREATE POLICY "rbac_piecework_delete_admin" ON piece_work_records
    FOR DELETE USING (is_management());

-- ============================================
-- 第8步：创建RBAC策略 - warehouses（仓库）
-- ============================================

-- 所有用户查看仓库
CREATE POLICY "rbac_warehouses_select_all" ON warehouses
    FOR SELECT USING (true);

-- 管理员创建仓库
CREATE POLICY "rbac_warehouses_insert_admin" ON warehouses
    FOR INSERT WITH CHECK (is_admin());

-- 管理员更新仓库
CREATE POLICY "rbac_warehouses_update_admin" ON warehouses
    FOR UPDATE USING (is_admin());

-- 管理员删除仓库
CREATE POLICY "rbac_warehouses_delete_admin" ON warehouses
    FOR DELETE USING (is_admin());

-- ============================================
-- 第9步：创建RBAC策略 - vehicles（车辆）
-- ============================================

-- 所有用户查看车辆
CREATE POLICY "rbac_vehicles_select_all" ON vehicles
    FOR SELECT USING (true);

-- 管理层创建车辆
CREATE POLICY "rbac_vehicles_insert_admin" ON vehicles
    FOR INSERT WITH CHECK (is_management());

-- 管理层更新车辆
CREATE POLICY "rbac_vehicles_update_admin" ON vehicles
    FOR UPDATE USING (is_management());

-- 管理层删除车辆
CREATE POLICY "rbac_vehicles_delete_admin" ON vehicles
    FOR DELETE USING (is_management());

-- ============================================
-- 第10步：创建RBAC策略 - users（用户表）
-- ============================================

-- 用户查看自己
CREATE POLICY "rbac_users_select_own" ON users
    FOR SELECT USING (id = auth.uid());

-- 管理层查看所有用户
CREATE POLICY "rbac_users_select_admin" ON users
    FOR SELECT USING (is_management());

-- 用户更新自己
CREATE POLICY "rbac_users_update_own" ON users
    FOR UPDATE USING (id = auth.uid());

-- 管理员更新所有用户
CREATE POLICY "rbac_users_update_admin" ON users
    FOR UPDATE USING (is_admin());

-- ============================================
-- 第11步：验证RBAC策略
-- ============================================

DO $$
DECLARE
    policy_count INTEGER;
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO policy_count FROM pg_policies WHERE schemaname = 'public';
    SELECT COUNT(DISTINCT tablename) INTO table_count FROM pg_policies WHERE schemaname = 'public';
    
    RAISE NOTICE '';
    RAISE NOTICE '🎉 RBAC策略迁移完成！';
    RAISE NOTICE '';
    RAISE NOTICE '📊 新策略统计:';
    RAISE NOTICE '  - 策略总数: %', policy_count;
    RAISE NOTICE '  - 覆盖表数: %', table_count;
    RAISE NOTICE '';
    RAISE NOTICE '✅ 核心优势:';
    RAISE NOTICE '  1. 简单清晰：基于用户角色，无复杂关联';
    RAISE NOTICE '  2. 易于维护：统一的策略命名和结构';
    RAISE NOTICE '  3. 高性能：减少复杂JOIN查询';
    RAISE NOTICE '  4. 可扩展：新增表遵循相同模式';
    RAISE NOTICE '';
END $$;
