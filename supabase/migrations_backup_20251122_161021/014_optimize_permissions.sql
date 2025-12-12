/*
# 优化权限管理系统

## 权限层级定义
1. 超级管理员：拥有系统的完整权限，包括所有操作的查看、修改、删除和新增
2. 普通管理员：权限严格限定于查看计件考勤数据，不具备任何新增、修改或删除数据的权限
3. 用户：允许修改自身历史计件数据，但无权修改或删除其他用户的数据

## 核心权限控制规则
1. 计件考勤数据模块权限：
   - 普通管理员：仅开放"查看/读取"权限
   - 禁止普通管理员进行数据的新增、修改（编辑）、删除操作
2. 用户历史数据修改权限：
   - 用户本人有权修改属于自己的过往计件记录
3. 删除操作安全机制：
   - 系统中所有删除操作必须在前端触发二次确认流程

## 变更内容
1. 恢复超级管理员对计件记录的完整权限（包括删除）
2. 保持普通管理员只读权限
3. 保持用户对自己数据的完整权限
4. 为考勤记录添加类似的权限控制
*/

-- ============================================
-- 计件记录权限优化
-- ============================================

-- 删除超级管理员的只读策略
DROP POLICY IF EXISTS "超级管理员可以查看所有计件记录" ON piece_work_records;

-- 为超级管理员创建完整权限策略
CREATE POLICY "超级管理员拥有完整权限" ON piece_work_records
    FOR ALL TO authenticated
    USING (is_super_admin(auth.uid()))
    WITH CHECK (is_super_admin(auth.uid()));

-- 确保普通管理员只有查看权限（通过管辖仓库）
DROP POLICY IF EXISTS "管理员可以查看管辖仓库的计件记录" ON piece_work_records;

CREATE POLICY "管理员可以查看管辖仓库的计件记录" ON piece_work_records
    FOR SELECT TO authenticated
    USING (
        is_manager(auth.uid()) AND
        EXISTS (
            SELECT 1 FROM manager_warehouses mw
            WHERE mw.manager_id = auth.uid()
            AND mw.warehouse_id = piece_work_records.warehouse_id
        )
    );

-- 确保用户可以管理自己的计件记录
DROP POLICY IF EXISTS "用户可以查看自己的计件记录" ON piece_work_records;
DROP POLICY IF EXISTS "用户可以插入自己的计件记录" ON piece_work_records;
DROP POLICY IF EXISTS "用户可以更新自己的计件记录" ON piece_work_records;
DROP POLICY IF EXISTS "用户可以删除自己的计件记录" ON piece_work_records;

CREATE POLICY "用户可以查看自己的计件记录" ON piece_work_records
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "用户可以插入自己的计件记录" ON piece_work_records
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户可以更新自己的计件记录" ON piece_work_records
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户可以删除自己的计件记录" ON piece_work_records
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

-- ============================================
-- 考勤记录权限优化
-- ============================================

-- 为超级管理员创建完整权限策略
DROP POLICY IF EXISTS "超级管理员可以管理所有考勤记录" ON attendance_records;

CREATE POLICY "超级管理员拥有完整权限" ON attendance_records
    FOR ALL TO authenticated
    USING (is_super_admin(auth.uid()))
    WITH CHECK (is_super_admin(auth.uid()));

-- 确保普通管理员只有查看权限（通过管辖仓库）
DROP POLICY IF EXISTS "管理员可以查看管辖仓库的考勤记录" ON attendance_records;

CREATE POLICY "管理员可以查看管辖仓库的考勤记录" ON attendance_records
    FOR SELECT TO authenticated
    USING (
        is_manager(auth.uid()) AND
        EXISTS (
            SELECT 1 FROM manager_warehouses mw
            WHERE mw.manager_id = auth.uid()
            AND mw.warehouse_id = attendance_records.warehouse_id
        )
    );

-- 确保用户可以管理自己的考勤记录
DROP POLICY IF EXISTS "用户可以查看自己的考勤记录" ON attendance_records;
DROP POLICY IF EXISTS "用户可以插入自己的考勤记录" ON attendance_records;
DROP POLICY IF EXISTS "用户可以更新自己的考勤记录" ON attendance_records;
DROP POLICY IF EXISTS "用户可以删除自己的考勤记录" ON attendance_records;

CREATE POLICY "用户可以查看自己的考勤记录" ON attendance_records
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "用户可以插入自己的考勤记录" ON attendance_records
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户可以更新自己的考勤记录" ON attendance_records
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户可以删除自己的考勤记录" ON attendance_records
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id);
