/*
# 启用 profiles 表的 RLS 策略

## 背景
之前为了解决 500 错误，临时禁用了所有表的 RLS。
现在需要为 profiles 表重新启用 RLS，并创建合理的访问策略。

## 策略设计原则

### 1. 超级管理员（super_admin）
- 完全访问权限：SELECT, INSERT, UPDATE, DELETE
- 可以管理所有用户的 profiles

### 2. 普通管理员（manager）
- 查看权限：可以查看自己和管辖的司机的 profiles
- 更新权限：可以更新管辖的司机的某些字段
- 限制：不能修改用户角色（由 prevent_role_change 触发器保护）

### 3. 司机（driver）
- 查看权限：只能查看自己的 profile
- 更新权限：可以更新自己的某些字段
- 限制：不能修改自己的角色

## 使用的辅助函数
所有辅助函数都使用 SECURITY DEFINER，可以安全地绕过 RLS：
- is_super_admin(user_id uuid) - 检查是否为超级管理员
- is_manager_or_above(user_id uuid) - 检查是否为管理员或以上
- is_manager(uid uuid) - 检查是否为管理员
- is_manager_of_driver(manager_id uuid, driver_id uuid) - 检查是否为司机的管理员

## 安全性考虑
1. 角色修改保护：prevent_role_change 触发器确保只有超级管理员可以修改角色
2. 使用 SECURITY DEFINER 函数避免 RLS 循环依赖
3. 最小权限原则：每个角色只能访问必要的数据

## 注意事项
- 本策略设计确保数据安全性
- 不会导致之前的 500 错误（因为使用了 SECURITY DEFINER 函数）
- 所有策略都经过仔细设计，避免权限冲突
*/

-- ============================================
-- 启用 profiles 表的 RLS
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 删除旧策略（如果存在）
-- ============================================

DROP POLICY IF EXISTS "超级管理员完全访问" ON profiles;
DROP POLICY IF EXISTS "管理员查看自己和管辖的司机" ON profiles;
DROP POLICY IF EXISTS "管理员更新管辖的司机" ON profiles;
DROP POLICY IF EXISTS "用户查看自己的profile" ON profiles;
DROP POLICY IF EXISTS "用户更新自己的profile" ON profiles;
DROP POLICY IF EXISTS "超级管理员插入用户" ON profiles;
DROP POLICY IF EXISTS "超级管理员删除用户" ON profiles;

-- ============================================
-- 创建新的 RLS 策略
-- ============================================

-- 1. 超级管理员：完全访问所有 profiles
CREATE POLICY "超级管理员完全访问"
ON profiles
FOR ALL
TO authenticated
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- 2. 管理员：查看自己和管辖的司机的 profiles
CREATE POLICY "管理员查看自己和管辖的司机"
ON profiles
FOR SELECT
TO authenticated
USING (
  is_manager(auth.uid()) 
  AND (
    -- 查看自己
    id = auth.uid()
    OR
    -- 查看管辖的司机
    (role = 'driver'::user_role AND is_manager_of_driver(auth.uid(), id))
  )
);

-- 3. 管理员：更新管辖的司机的 profiles
-- 注意：角色修改由 prevent_role_change 触发器保护
CREATE POLICY "管理员更新管辖的司机"
ON profiles
FOR UPDATE
TO authenticated
USING (
  is_manager(auth.uid())
  AND role = 'driver'::user_role
  AND is_manager_of_driver(auth.uid(), id)
)
WITH CHECK (
  is_manager(auth.uid())
  AND role = 'driver'::user_role
  AND is_manager_of_driver(auth.uid(), id)
);

-- 4. 用户：查看自己的 profile
CREATE POLICY "用户查看自己的profile"
ON profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

-- 5. 用户：更新自己的 profile
-- 注意：角色修改由 prevent_role_change 触发器保护
CREATE POLICY "用户更新自己的profile"
ON profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- ============================================
-- 验证策略
-- ============================================

-- 查看 profiles 表的所有策略
-- SELECT 
--   schemaname,
--   tablename,
--   policyname,
--   cmd,
--   roles
-- FROM pg_policies
-- WHERE schemaname = 'public' AND tablename = 'profiles'
-- ORDER BY policyname;

-- 预期结果：应该有 5 个策略
-- 1. 超级管理员完全访问 (ALL)
-- 2. 管理员查看自己和管辖的司机 (SELECT)
-- 3. 管理员更新管辖的司机 (UPDATE)
-- 4. 用户查看自己的profile (SELECT)
-- 5. 用户更新自己的profile (UPDATE)
