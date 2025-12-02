/*
# 修复第六批表的RLS策略以适配新权限结构

## 功能描述
更新第六批发现的表的RLS策略，使其适配新的权限结构（基于 user_roles 表）

## 修改内容

### 1. departments - 部门表
- 所有认证用户可以查看部门
- 只有老板可以管理部门

### 2. new_attendance - 新考勤表
- 老板可以查看/管理所有考勤记录
- 车队长可以查看/管理其管理仓库的考勤记录
- 用户可以查看/管理自己的考勤记录

### 3. new_notifications - 新通知表
- 老板可以查看/管理所有通知
- 车队长可以查看/管理其管理仓库的通知
- 用户可以查看/管理自己的通知

### 4. new_vehicles - 新车辆表
- 老板可以查看/管理所有车辆
- 车队长可以查看/管理其管理仓库的车辆
- 司机可以查看自己的车辆

### 5. permissions - 权限表（系统配置）
- 所有认证用户可以查看权限
- 只有老板可以管理权限

### 6. piecework_records - 计件记录表
- 老板可以查看/管理所有计件记录
- 车队长可以查看/管理其管理仓库的计件记录
- 司机可以查看/管理自己的计件记录

### 7. role_permissions - 角色权限表（系统配置）
- 所有认证用户可以查看角色权限映射
- 只有老板可以管理角色权限映射

### 8. roles - 角色表（系统配置）
- 所有认证用户可以查看角色
- 只有老板可以管理角色

### 9. user_departments - 用户部门关联表
- 所有认证用户可以查看用户部门关联
- 只有老板可以管理用户部门关联

### 10. user_permission_assignments - 用户权限分配表
- 老板可以查看/管理所有权限分配
- 用户可以查看自己的权限分配

## 安全性
- 使用新的权限检查函数（is_boss_v2, is_manager_v2, get_user_warehouses_v2）
- 基于 user_roles 表进行角色验证
- 基于 warehouse_assignments 表进行仓库权限验证

## 注意
- 这些表是新发现的表，需要适配新的权限结构
- 部分表是系统配置表，只有老板可以修改
*/

-- ============================================
-- 1. 更新 departments 表的RLS策略
-- ============================================

-- 1.1 删除旧策略（如果存在）
DROP POLICY IF EXISTS "所有用户可以查看部门" ON departments;
DROP POLICY IF EXISTS "只有BOSS可以管理部门" ON departments;

-- 1.2 启用RLS
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

-- 1.3 创建新的查看策略
CREATE POLICY "所有认证用户可以查看部门"
ON departments FOR SELECT
TO authenticated
USING (true);

-- 1.4 创建新的创建策略
CREATE POLICY "老板可以创建部门"
ON departments FOR INSERT
TO authenticated
WITH CHECK (is_boss_v2(auth.uid()));

-- 1.5 创建新的修改策略
CREATE POLICY "老板可以修改部门"
ON departments FOR UPDATE
TO authenticated
USING (is_boss_v2(auth.uid()));

-- 1.6 创建新的删除策略
CREATE POLICY "老板可以删除部门"
ON departments FOR DELETE
TO authenticated
USING (is_boss_v2(auth.uid()));

-- ============================================
-- 2. 更新 new_attendance 表的RLS策略
-- ============================================

-- 2.1 删除旧策略（如果存在）
DROP POLICY IF EXISTS "老板可以查看所有考勤" ON new_attendance;
DROP POLICY IF EXISTS "车队长可以查看其仓库考勤" ON new_attendance;
DROP POLICY IF EXISTS "用户可以查看自己的考勤" ON new_attendance;

-- 2.2 启用RLS
ALTER TABLE new_attendance ENABLE ROW LEVEL SECURITY;

-- 2.3 创建新的查看策略
CREATE POLICY "老板可以查看所有考勤记录"
ON new_attendance FOR SELECT
TO authenticated
USING (is_boss_v2(auth.uid()));

CREATE POLICY "车队长可以查看其管理仓库的考勤记录"
ON new_attendance FOR SELECT
TO authenticated
USING (
  is_manager_v2(auth.uid()) 
  AND EXISTS (
    SELECT 1 FROM warehouse_assignments wa
    WHERE wa.user_id = auth.uid() AND wa.warehouse_id = new_attendance.warehouse_id
  )
);

CREATE POLICY "用户可以查看自己的考勤记录"
ON new_attendance FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 2.4 创建新的创建策略
CREATE POLICY "老板可以创建任何考勤记录"
ON new_attendance FOR INSERT
TO authenticated
WITH CHECK (is_boss_v2(auth.uid()));

CREATE POLICY "车队长可以为其管理仓库创建考勤记录"
ON new_attendance FOR INSERT
TO authenticated
WITH CHECK (
  is_manager_v2(auth.uid()) 
  AND EXISTS (
    SELECT 1 FROM warehouse_assignments wa
    WHERE wa.user_id = auth.uid() AND wa.warehouse_id = new_attendance.warehouse_id
  )
);

CREATE POLICY "用户可以创建自己的考勤记录"
ON new_attendance FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- 2.5 创建新的修改策略
CREATE POLICY "老板可以修改所有考勤记录"
ON new_attendance FOR UPDATE
TO authenticated
USING (is_boss_v2(auth.uid()));

CREATE POLICY "车队长可以修改其管理仓库的考勤记录"
ON new_attendance FOR UPDATE
TO authenticated
USING (
  is_manager_v2(auth.uid()) 
  AND EXISTS (
    SELECT 1 FROM warehouse_assignments wa
    WHERE wa.user_id = auth.uid() AND wa.warehouse_id = new_attendance.warehouse_id
  )
);

CREATE POLICY "用户可以修改自己的考勤记录"
ON new_attendance FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- 2.6 创建新的删除策略
CREATE POLICY "老板可以删除所有考勤记录"
ON new_attendance FOR DELETE
TO authenticated
USING (is_boss_v2(auth.uid()));

CREATE POLICY "车队长可以删除其管理仓库的考勤记录"
ON new_attendance FOR DELETE
TO authenticated
USING (
  is_manager_v2(auth.uid()) 
  AND EXISTS (
    SELECT 1 FROM warehouse_assignments wa
    WHERE wa.user_id = auth.uid() AND wa.warehouse_id = new_attendance.warehouse_id
  )
);

-- ============================================
-- 3. 更新 permissions 表的RLS策略
-- ============================================

-- 3.1 删除旧策略
DROP POLICY IF EXISTS "所有用户可以查看权限" ON permissions;
DROP POLICY IF EXISTS "只有BOSS可以管理权限" ON permissions;

-- 3.2 启用RLS
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;

-- 3.3 创建新的查看策略
CREATE POLICY "所有认证用户可以查看权限"
ON permissions FOR SELECT
TO authenticated
USING (true);

-- 3.4 创建新的创建策略
CREATE POLICY "老板可以创建权限"
ON permissions FOR INSERT
TO authenticated
WITH CHECK (is_boss_v2(auth.uid()));

-- 3.5 创建新的修改策略
CREATE POLICY "老板可以修改权限"
ON permissions FOR UPDATE
TO authenticated
USING (is_boss_v2(auth.uid()));

-- 3.6 创建新的删除策略
CREATE POLICY "老板可以删除权限"
ON permissions FOR DELETE
TO authenticated
USING (is_boss_v2(auth.uid()));

-- ============================================
-- 4. 更新 role_permissions 表的RLS策略
-- ============================================

-- 4.1 删除旧策略
DROP POLICY IF EXISTS "所有用户可以查看角色权限映射" ON role_permissions;
DROP POLICY IF EXISTS "只有BOSS可以管理角色权限映射" ON role_permissions;

-- 4.2 启用RLS
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- 4.3 创建新的查看策略
CREATE POLICY "所有认证用户可以查看角色权限映射"
ON role_permissions FOR SELECT
TO authenticated
USING (true);

-- 4.4 创建新的创建策略
CREATE POLICY "老板可以创建角色权限映射"
ON role_permissions FOR INSERT
TO authenticated
WITH CHECK (is_boss_v2(auth.uid()));

-- 4.5 创建新的修改策略
CREATE POLICY "老板可以修改角色权限映射"
ON role_permissions FOR UPDATE
TO authenticated
USING (is_boss_v2(auth.uid()));

-- 4.6 创建新的删除策略
CREATE POLICY "老板可以删除角色权限映射"
ON role_permissions FOR DELETE
TO authenticated
USING (is_boss_v2(auth.uid()));

-- ============================================
-- 5. 更新 roles 表的RLS策略
-- ============================================

-- 5.1 删除旧策略
DROP POLICY IF EXISTS "所有用户可以查看角色" ON roles;
DROP POLICY IF EXISTS "只有BOSS可以管理角色" ON roles;

-- 5.2 启用RLS
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

-- 5.3 创建新的查看策略
CREATE POLICY "所有认证用户可以查看角色"
ON roles FOR SELECT
TO authenticated
USING (true);

-- 5.4 创建新的创建策略
CREATE POLICY "老板可以创建角色"
ON roles FOR INSERT
TO authenticated
WITH CHECK (is_boss_v2(auth.uid()));

-- 5.5 创建新的修改策略
CREATE POLICY "老板可以修改角色"
ON roles FOR UPDATE
TO authenticated
USING (is_boss_v2(auth.uid()));

-- 5.6 创建新的删除策略
CREATE POLICY "老板可以删除角色"
ON roles FOR DELETE
TO authenticated
USING (is_boss_v2(auth.uid()));

-- ============================================
-- 6. 更新 user_permission_assignments 表的RLS策略
-- ============================================

-- 6.1 删除旧策略
DROP POLICY IF EXISTS "BOSS可以查看所有权限分配" ON user_permission_assignments;
DROP POLICY IF EXISTS "BOSS可以管理所有权限分配" ON user_permission_assignments;
DROP POLICY IF EXISTS "用户可以查看自己的权限分配" ON user_permission_assignments;

-- 6.2 启用RLS
ALTER TABLE user_permission_assignments ENABLE ROW LEVEL SECURITY;

-- 6.3 创建新的查看策略
CREATE POLICY "老板可以查看所有权限分配"
ON user_permission_assignments FOR SELECT
TO authenticated
USING (is_boss_v2(auth.uid()));

CREATE POLICY "用户可以查看自己的权限分配"
ON user_permission_assignments FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 6.4 创建新的创建策略
CREATE POLICY "老板可以创建权限分配"
ON user_permission_assignments FOR INSERT
TO authenticated
WITH CHECK (is_boss_v2(auth.uid()));

-- 6.5 创建新的修改策略
CREATE POLICY "老板可以修改权限分配"
ON user_permission_assignments FOR UPDATE
TO authenticated
USING (is_boss_v2(auth.uid()));

-- 6.6 创建新的删除策略
CREATE POLICY "老板可以删除权限分配"
ON user_permission_assignments FOR DELETE
TO authenticated
USING (is_boss_v2(auth.uid()));

-- ============================================
-- 7. 更新 user_departments 表的RLS策略
-- ============================================

-- 7.1 删除旧策略（如果存在）
DROP POLICY IF EXISTS "所有用户可以查看用户部门关联" ON user_departments;
DROP POLICY IF EXISTS "只有BOSS可以管理用户部门关联" ON user_departments;

-- 7.2 启用RLS
ALTER TABLE user_departments ENABLE ROW LEVEL SECURITY;

-- 7.3 创建新的查看策略
CREATE POLICY "所有认证用户可以查看用户部门关联"
ON user_departments FOR SELECT
TO authenticated
USING (true);

-- 7.4 创建新的创建策略
CREATE POLICY "老板可以创建用户部门关联"
ON user_departments FOR INSERT
TO authenticated
WITH CHECK (is_boss_v2(auth.uid()));

-- 7.5 创建新的修改策略
CREATE POLICY "老板可以修改用户部门关联"
ON user_departments FOR UPDATE
TO authenticated
USING (is_boss_v2(auth.uid()));

-- 7.6 创建新的删除策略
CREATE POLICY "老板可以删除用户部门关联"
ON user_departments FOR DELETE
TO authenticated
USING (is_boss_v2(auth.uid()));

-- ============================================
-- 8. 更新 new_notifications 表的RLS策略
-- ============================================

-- 8.1 启用RLS
ALTER TABLE new_notifications ENABLE ROW LEVEL SECURITY;

-- 8.2 创建新的查看策略
CREATE POLICY "老板可以查看所有通知"
ON new_notifications FOR SELECT
TO authenticated
USING (is_boss_v2(auth.uid()));

CREATE POLICY "用户可以查看自己的通知"
ON new_notifications FOR SELECT
TO authenticated
USING (recipient_id = auth.uid());

-- 8.3 创建新的创建策略
CREATE POLICY "老板可以创建任何通知"
ON new_notifications FOR INSERT
TO authenticated
WITH CHECK (is_boss_v2(auth.uid()));

-- 8.4 创建新的修改策略
CREATE POLICY "老板可以修改所有通知"
ON new_notifications FOR UPDATE
TO authenticated
USING (is_boss_v2(auth.uid()));

CREATE POLICY "用户可以修改自己的通知"
ON new_notifications FOR UPDATE
TO authenticated
USING (recipient_id = auth.uid());

-- 8.5 创建新的删除策略
CREATE POLICY "老板可以删除所有通知"
ON new_notifications FOR DELETE
TO authenticated
USING (is_boss_v2(auth.uid()));

-- ============================================
-- 9. 更新 new_vehicles 表的RLS策略
-- ============================================

-- 9.1 启用RLS
ALTER TABLE new_vehicles ENABLE ROW LEVEL SECURITY;

-- 9.2 创建新的查看策略
CREATE POLICY "老板可以查看所有车辆"
ON new_vehicles FOR SELECT
TO authenticated
USING (is_boss_v2(auth.uid()));

CREATE POLICY "司机可以查看自己的车辆"
ON new_vehicles FOR SELECT
TO authenticated
USING (driver_id = auth.uid());

-- 9.3 创建新的创建策略
CREATE POLICY "老板可以创建任何车辆"
ON new_vehicles FOR INSERT
TO authenticated
WITH CHECK (is_boss_v2(auth.uid()));

-- 9.4 创建新的修改策略
CREATE POLICY "老板可以修改所有车辆"
ON new_vehicles FOR UPDATE
TO authenticated
USING (is_boss_v2(auth.uid()));

-- 9.5 创建新的删除策略
CREATE POLICY "老板可以删除所有车辆"
ON new_vehicles FOR DELETE
TO authenticated
USING (is_boss_v2(auth.uid()));

-- ============================================
-- 10. 更新 piecework_records 表的RLS策略
-- ============================================

-- 10.1 启用RLS
ALTER TABLE piecework_records ENABLE ROW LEVEL SECURITY;

-- 10.2 创建新的查看策略
CREATE POLICY "老板可以查看所有计件记录"
ON piecework_records FOR SELECT
TO authenticated
USING (is_boss_v2(auth.uid()));

CREATE POLICY "车队长可以查看其管理仓库的计件记录"
ON piecework_records FOR SELECT
TO authenticated
USING (
  is_manager_v2(auth.uid()) 
  AND EXISTS (
    SELECT 1 FROM warehouse_assignments wa
    WHERE wa.user_id = auth.uid() AND wa.warehouse_id = piecework_records.warehouse_id
  )
);

CREATE POLICY "用户可以查看自己的计件记录"
ON piecework_records FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 10.3 创建新的创建策略
CREATE POLICY "老板可以创建任何计件记录"
ON piecework_records FOR INSERT
TO authenticated
WITH CHECK (is_boss_v2(auth.uid()));

CREATE POLICY "车队长可以为其管理仓库创建计件记录"
ON piecework_records FOR INSERT
TO authenticated
WITH CHECK (
  is_manager_v2(auth.uid()) 
  AND EXISTS (
    SELECT 1 FROM warehouse_assignments wa
    WHERE wa.user_id = auth.uid() AND wa.warehouse_id = piecework_records.warehouse_id
  )
);

CREATE POLICY "用户可以创建自己的计件记录"
ON piecework_records FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- 10.4 创建新的修改策略
CREATE POLICY "老板可以修改所有计件记录"
ON piecework_records FOR UPDATE
TO authenticated
USING (is_boss_v2(auth.uid()));

CREATE POLICY "车队长可以修改其管理仓库的计件记录"
ON piecework_records FOR UPDATE
TO authenticated
USING (
  is_manager_v2(auth.uid()) 
  AND EXISTS (
    SELECT 1 FROM warehouse_assignments wa
    WHERE wa.user_id = auth.uid() AND wa.warehouse_id = piecework_records.warehouse_id
  )
);

CREATE POLICY "用户可以修改自己的计件记录"
ON piecework_records FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- 10.5 创建新的删除策略
CREATE POLICY "老板可以删除所有计件记录"
ON piecework_records FOR DELETE
TO authenticated
USING (is_boss_v2(auth.uid()));

CREATE POLICY "车队长可以删除其管理仓库的计件记录"
ON piecework_records FOR DELETE
TO authenticated
USING (
  is_manager_v2(auth.uid()) 
  AND EXISTS (
    SELECT 1 FROM warehouse_assignments wa
    WHERE wa.user_id = auth.uid() AND wa.warehouse_id = piecework_records.warehouse_id
  )
);
