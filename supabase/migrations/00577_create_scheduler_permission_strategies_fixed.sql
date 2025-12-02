/*
# 创建调度权限策略（修正版）

## 功能描述
为调度角色创建两种权限策略：
1. scheduler_full_control：完整控制权，和老板一样拥有全系统访问权限
2. scheduler_view_only：仅查看权，只能查看数据，无任何修改权限

## 变更内容
1. 创建 scheduler_full_control 权限策略
2. 创建 scheduler_view_only 权限策略
3. 创建权限检查辅助函数
4. 为调度添加RLS策略

## 安全性
- 基于 permission_strategies 表管理权限
- 使用 SECURITY DEFINER 确保安全执行
- 支持动态权限分配
*/

-- ============================================
-- 第一部分：创建调度权限策略
-- ============================================

-- 插入调度完整控制权策略
INSERT INTO permission_strategies (
  strategy_name,
  strategy_type,
  description,
  select_rule,
  insert_rule,
  update_rule,
  delete_rule,
  is_active
)
VALUES (
  'scheduler_full_control',
  'full_control',
  '调度完整控制权：拥有和老板一样的全系统访问权限，可以进行所有操作',
  'true',
  'true',
  'true',
  'true',
  true
) ON CONFLICT (strategy_name) DO NOTHING;

-- 插入调度仅查看权策略
INSERT INTO permission_strategies (
  strategy_name,
  strategy_type,
  description,
  select_rule,
  insert_rule,
  update_rule,
  delete_rule,
  is_active
)
VALUES (
  'scheduler_view_only',
  'view_only',
  '调度仅查看权：只能查看数据，无任何修改权限',
  'true',
  'false',
  'false',
  'false',
  true
) ON CONFLICT (strategy_name) DO NOTHING;

-- ============================================
-- 第二部分：创建权限检查辅助函数
-- ============================================

-- 检查调度是否拥有完整控制权
CREATE OR REPLACE FUNCTION scheduler_has_full_control(uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_permission_assignments upa
    JOIN permission_strategies ps ON ps.id = upa.strategy_id
    WHERE upa.user_id = uid
      AND ps.strategy_name = 'scheduler_full_control'
      AND ps.is_active = true
  );
$$;

-- 检查调度是否仅有查看权
CREATE OR REPLACE FUNCTION scheduler_is_view_only(uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_permission_assignments upa
    JOIN permission_strategies ps ON ps.id = upa.strategy_id
    WHERE upa.user_id = uid
      AND ps.strategy_name = 'scheduler_view_only'
      AND ps.is_active = true
  );
$$;

-- ============================================
-- 第三部分：为调度添加RLS策略
-- ============================================

-- 调度（完整控制权）可以查看所有用户
CREATE POLICY "调度（完整控制权）可以查看所有用户" ON users
  FOR SELECT
  USING (scheduler_has_full_control(auth.uid()));

-- 调度（完整控制权）可以更新所有用户
CREATE POLICY "调度（完整控制权）可以更新所有用户" ON users
  FOR UPDATE
  USING (scheduler_has_full_control(auth.uid()));

-- 调度（完整控制权）可以插入用户
CREATE POLICY "调度（完整控制权）可以插入用户" ON users
  FOR INSERT
  WITH CHECK (scheduler_has_full_control(auth.uid()));

-- 调度（完整控制权）可以删除用户
CREATE POLICY "调度（完整控制权）可以删除用户" ON users
  FOR DELETE
  USING (scheduler_has_full_control(auth.uid()));

-- 调度（仅查看权）可以查看所有用户
CREATE POLICY "调度（仅查看权）可以查看所有用户" ON users
  FOR SELECT
  USING (scheduler_is_view_only(auth.uid()));

-- 调度（完整控制权）可以查看所有用户角色
CREATE POLICY "调度（完整控制权）可以查看所有用户角色" ON user_roles
  FOR SELECT
  USING (scheduler_has_full_control(auth.uid()));

-- 调度（仅查看权）可以查看所有用户角色
CREATE POLICY "调度（仅查看权）可以查看所有用户角色" ON user_roles
  FOR SELECT
  USING (scheduler_is_view_only(auth.uid()));

-- 调度（完整控制权）可以查看所有仓库分配
CREATE POLICY "调度（完整控制权）可以查看所有仓库分配" ON warehouse_assignments
  FOR SELECT
  USING (scheduler_has_full_control(auth.uid()));

-- 调度（完整控制权）可以管理仓库分配
CREATE POLICY "调度（完整控制权）可以管理仓库分配" ON warehouse_assignments
  FOR ALL
  USING (scheduler_has_full_control(auth.uid()));

-- 调度（完整控制权）可以查看所有仓库
CREATE POLICY "调度（完整控制权）可以查看所有仓库" ON warehouses
  FOR SELECT
  USING (scheduler_has_full_control(auth.uid()));

-- 调度（完整控制权）可以管理仓库
CREATE POLICY "调度（完整控制权）可以管理仓库" ON warehouses
  FOR ALL
  USING (scheduler_has_full_control(auth.uid()));

-- 调度（仅查看权）可以查看所有仓库
CREATE POLICY "调度（仅查看权）可以查看所有仓库" ON warehouses
  FOR SELECT
  USING (scheduler_is_view_only(auth.uid()));

-- 调度（完整控制权）可以查看所有车辆
CREATE POLICY "调度（完整控制权）可以查看所有车辆" ON vehicles
  FOR SELECT
  USING (scheduler_has_full_control(auth.uid()));

-- 调度（完整控制权）可以管理车辆
CREATE POLICY "调度（完整控制权）可以管理车辆" ON vehicles
  FOR ALL
  USING (scheduler_has_full_control(auth.uid()));

-- 调度（仅查看权）可以查看所有车辆
CREATE POLICY "调度（仅查看权）可以查看所有车辆" ON vehicles
  FOR SELECT
  USING (scheduler_is_view_only(auth.uid()));

-- 调度（完整控制权）可以查看所有请假申请
CREATE POLICY "调度（完整控制权）可以查看所有请假申请" ON leave_requests
  FOR SELECT
  USING (scheduler_has_full_control(auth.uid()));

-- 调度（完整控制权）可以管理请假申请
CREATE POLICY "调度（完整控制权）可以管理请假申请" ON leave_requests
  FOR ALL
  USING (scheduler_has_full_control(auth.uid()));

-- 调度（仅查看权）可以查看所有请假申请
CREATE POLICY "调度（仅查看权）可以查看所有请假申请" ON leave_requests
  FOR SELECT
  USING (scheduler_is_view_only(auth.uid()));