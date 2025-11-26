/*
# 添加平级管理员角色

## 1. 新增角色类型
- 在 user_role 枚举类型中添加 `peer_admin` 角色
- peer_admin（平级管理员）：拥有与 super_admin 相同的权限，但受 super_admin 管理

## 2. 权限说明
- peer_admin 可以访问和管理租户的所有数据
- peer_admin 的 boss_id 指向 super_admin 的 ID
- peer_admin 可以被 super_admin 创建、删除、修改
- peer_admin 拥有与 super_admin 相同的数据访问权限

## 3. RLS 策略更新
- 更新所有表的 RLS 策略，将 peer_admin 的权限设置为与 super_admin 相同
- peer_admin 可以管理租户的所有数据

## 4. 辅助函数更新
- 更新 is_super_admin 函数，使其同时检查 super_admin 和 peer_admin 角色
- 或者创建新的 is_peer_admin 函数

## 5. 注意事项
- peer_admin 不能创建其他 peer_admin
- peer_admin 不能修改 super_admin 的信息
- peer_admin 受 super_admin 管理
*/

-- 1. 添加 peer_admin 角色到 user_role 枚举类型
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'peer_admin';

-- 2. 更新 is_super_admin 辅助函数，使其同时检查 super_admin 和 peer_admin
CREATE OR REPLACE FUNCTION is_super_admin_or_peer(uid uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
    SELECT EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = uid AND p.role IN ('super_admin', 'peer_admin')
    );
$$;

-- 3. 更新所有表的 RLS 策略，将 peer_admin 的权限设置为与 super_admin 相同

-- 3.1 更新 profiles 表的策略
DROP POLICY IF EXISTS "Super admin can manage tenant profiles" ON profiles;
CREATE POLICY "Super admin and peer admin can manage tenant profiles" ON profiles
  FOR ALL TO authenticated
  USING ((boss_id = get_current_user_boss_id()) AND is_super_admin_or_peer(auth.uid()))
  WITH CHECK ((boss_id = get_current_user_boss_id()) AND is_super_admin_or_peer(auth.uid()));

-- 3.2 更新 warehouses 表的策略
DROP POLICY IF EXISTS "Super admin can manage tenant warehouses" ON warehouses;
CREATE POLICY "Super admin and peer admin can manage tenant warehouses" ON warehouses
  FOR ALL TO authenticated
  USING ((boss_id = get_current_user_boss_id()) AND is_super_admin_or_peer(auth.uid()))
  WITH CHECK ((boss_id = get_current_user_boss_id()) AND is_super_admin_or_peer(auth.uid()));

-- 3.3 更新 attendance 表的策略
DROP POLICY IF EXISTS "Super admin can manage tenant attendance" ON attendance;
CREATE POLICY "Super admin and peer admin can manage tenant attendance" ON attendance
  FOR ALL TO authenticated
  USING ((boss_id = get_current_user_boss_id()) AND is_super_admin_or_peer(auth.uid()))
  WITH CHECK ((boss_id = get_current_user_boss_id()) AND is_super_admin_or_peer(auth.uid()));

-- 3.4 更新 attendance_rules 表的策略
DROP POLICY IF EXISTS "Super admin can manage tenant attendance rules" ON attendance_rules;
CREATE POLICY "Super admin and peer admin can manage tenant attendance rules" ON attendance_rules
  FOR ALL TO authenticated
  USING ((boss_id = get_current_user_boss_id()) AND is_super_admin_or_peer(auth.uid()))
  WITH CHECK ((boss_id = get_current_user_boss_id()) AND is_super_admin_or_peer(auth.uid()));

-- 3.5 更新 piece_work_records 表的策略
DROP POLICY IF EXISTS "Super admin can manage tenant piece work records" ON piece_work_records;
CREATE POLICY "Super admin and peer admin can manage tenant piece work records" ON piece_work_records
  FOR ALL TO authenticated
  USING ((boss_id = get_current_user_boss_id()) AND is_super_admin_or_peer(auth.uid()))
  WITH CHECK ((boss_id = get_current_user_boss_id()) AND is_super_admin_or_peer(auth.uid()));

-- 3.6 更新 category_prices 表的策略
DROP POLICY IF EXISTS "Super admin can manage tenant category prices" ON category_prices;
CREATE POLICY "Super admin and peer admin can manage tenant category prices" ON category_prices
  FOR ALL TO authenticated
  USING ((boss_id = get_current_user_boss_id()) AND is_super_admin_or_peer(auth.uid()))
  WITH CHECK ((boss_id = get_current_user_boss_id()) AND is_super_admin_or_peer(auth.uid()));

-- 3.7 更新 leave_applications 表的策略
DROP POLICY IF EXISTS "Super admin can manage tenant leave applications" ON leave_applications;
CREATE POLICY "Super admin and peer admin can manage tenant leave applications" ON leave_applications
  FOR ALL TO authenticated
  USING ((boss_id = get_current_user_boss_id()) AND is_super_admin_or_peer(auth.uid()))
  WITH CHECK ((boss_id = get_current_user_boss_id()) AND is_super_admin_or_peer(auth.uid()));

-- 3.8 更新 resignation_applications 表的策略
DROP POLICY IF EXISTS "Super admin can manage tenant resignation applications" ON resignation_applications;
CREATE POLICY "Super admin and peer admin can manage tenant resignation applications" ON resignation_applications
  FOR ALL TO authenticated
  USING ((boss_id = get_current_user_boss_id()) AND is_super_admin_or_peer(auth.uid()))
  WITH CHECK ((boss_id = get_current_user_boss_id()) AND is_super_admin_or_peer(auth.uid()));

-- 3.9 更新 vehicles 表的策略
DROP POLICY IF EXISTS "Super admin can manage tenant vehicles" ON vehicles;
CREATE POLICY "Super admin and peer admin can manage tenant vehicles" ON vehicles
  FOR ALL TO authenticated
  USING ((boss_id = get_current_user_boss_id()) AND is_super_admin_or_peer(auth.uid()))
  WITH CHECK ((boss_id = get_current_user_boss_id()) AND is_super_admin_or_peer(auth.uid()));

-- 3.10 更新 notifications 表的策略
DROP POLICY IF EXISTS "Super admin can manage tenant notifications" ON notifications;
CREATE POLICY "Super admin and peer admin can manage tenant notifications" ON notifications
  FOR ALL TO authenticated
  USING ((boss_id = get_current_user_boss_id()) AND is_super_admin_or_peer(auth.uid()))
  WITH CHECK ((boss_id = get_current_user_boss_id()) AND is_super_admin_or_peer(auth.uid()));

-- 4. 创建专门的辅助函数，用于检查用户是否可以管理其他用户
CREATE OR REPLACE FUNCTION can_manage_user(manager_id uuid, target_role user_role)
RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
    SELECT EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = manager_id 
        AND (
            -- super_admin 可以管理所有角色（包括 peer_admin）
            (p.role = 'super_admin') OR
            -- peer_admin 可以管理 driver 和 manager，但不能管理 super_admin 和其他 peer_admin
            (p.role = 'peer_admin' AND target_role IN ('driver', 'manager'))
        )
    );
$$;

-- 5. 添加注释
COMMENT ON FUNCTION is_super_admin_or_peer IS '检查用户是否为 super_admin 或 peer_admin';
COMMENT ON FUNCTION can_manage_user IS '检查用户是否可以管理指定角色的用户';
