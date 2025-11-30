/*
# 修复计件记录 RLS 策略

## 问题
1. `is_boss` 函数使用旧的 profiles 表和旧的角色系统（lease_admin, peer_admin）
2. piece_work_records 表缺少管理员、车队长、老板的查看和管理策略
3. 导致管理员、车队长、老板无法查看司机的计件记录

## 修复内容
1. 更新 `is_boss` 函数，使用新的 user_roles 表和 BOSS 角色
2. 创建 `is_dispatcher` 函数，检查用户是否是调度员
3. 删除旧的 RLS 策略
4. 创建新的 RLS 策略：
   - 管理员（BOSS, MANAGER）可以查看、创建、更新、删除所有计件记录
   - 调度员（DISPATCHER）可以查看、创建、更新、删除所有计件记录
   - 司机（DRIVER）只能查看、创建、更新自己的计件记录

## 安全性
- BOSS 和 MANAGER 拥有完全权限
- DISPATCHER 拥有完全权限
- DRIVER 只能管理自己的记录
*/

-- 1. 删除旧的 is_boss 函数
DROP FUNCTION IF EXISTS is_boss(uuid);

-- 2. 创建新的 is_boss 函数，使用新的 user_roles 表
CREATE OR REPLACE FUNCTION is_boss(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = uid AND ur.role = 'BOSS'
    );
$$;

COMMENT ON FUNCTION is_boss IS '检查用户是否是老板（BOSS 角色）';

-- 3. 创建 is_dispatcher 函数
CREATE OR REPLACE FUNCTION is_dispatcher(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = uid AND ur.role = 'DISPATCHER'
    );
$$;

COMMENT ON FUNCTION is_dispatcher IS '检查用户是否是调度员（DISPATCHER 角色）';

-- 4. 删除所有旧的 RLS 策略
DROP POLICY IF EXISTS "Admins and bosses can manage piece work records" ON piece_work_records;
DROP POLICY IF EXISTS "Admins and bosses can view all piece work records" ON piece_work_records;
DROP POLICY IF EXISTS "Admins can manage piece work records" ON piece_work_records;
DROP POLICY IF EXISTS "Admins can view all piece work records" ON piece_work_records;
DROP POLICY IF EXISTS "Users can view own piece work records" ON piece_work_records;
DROP POLICY IF EXISTS "Drivers can create own piece work records" ON piece_work_records;
DROP POLICY IF EXISTS "Drivers can update own piece work records" ON piece_work_records;

-- 5. 创建新的 RLS 策略

-- 5.1 管理员（BOSS, MANAGER, DISPATCHER）可以查看所有计件记录
CREATE POLICY "Admins can view all piece work records" ON piece_work_records
  FOR SELECT 
  TO public
  USING (
    is_boss(auth.uid()) OR 
    is_manager(auth.uid()) OR 
    is_dispatcher(auth.uid())
  );

-- 5.2 管理员（BOSS, MANAGER, DISPATCHER）可以创建计件记录
CREATE POLICY "Admins can create piece work records" ON piece_work_records
  FOR INSERT 
  TO public
  WITH CHECK (
    is_boss(auth.uid()) OR 
    is_manager(auth.uid()) OR 
    is_dispatcher(auth.uid())
  );

-- 5.3 管理员（BOSS, MANAGER, DISPATCHER）可以更新所有计件记录
CREATE POLICY "Admins can update all piece work records" ON piece_work_records
  FOR UPDATE 
  TO public
  USING (
    is_boss(auth.uid()) OR 
    is_manager(auth.uid()) OR 
    is_dispatcher(auth.uid())
  )
  WITH CHECK (
    is_boss(auth.uid()) OR 
    is_manager(auth.uid()) OR 
    is_dispatcher(auth.uid())
  );

-- 5.4 管理员（BOSS, MANAGER, DISPATCHER）可以删除所有计件记录
CREATE POLICY "Admins can delete all piece work records" ON piece_work_records
  FOR DELETE 
  TO public
  USING (
    is_boss(auth.uid()) OR 
    is_manager(auth.uid()) OR 
    is_dispatcher(auth.uid())
  );

-- 5.5 司机可以查看自己的计件记录
CREATE POLICY "Drivers can view own piece work records" ON piece_work_records
  FOR SELECT 
  TO public
  USING (user_id = auth.uid());

-- 5.6 司机可以创建自己的计件记录
CREATE POLICY "Drivers can create own piece work records" ON piece_work_records
  FOR INSERT 
  TO public
  WITH CHECK (user_id = auth.uid());

-- 5.7 司机可以更新自己的计件记录
CREATE POLICY "Drivers can update own piece work records" ON piece_work_records
  FOR UPDATE 
  TO public
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
