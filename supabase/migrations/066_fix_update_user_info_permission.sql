/*
# 修复更新用户信息权限问题

## 问题描述
当前的 RLS 策略只允许管理员更新司机的信息，但不允许：
1. 超级管理员更新普通管理员的信息
2. 用户更新自己的基本信息

这导致在用户管理页面编辑普通管理员信息时失败。

## 错误现象
更新用户信息时返回空数组 []，说明 RLS 策略阻止了更新操作。

## 解决方案
修改 UPDATE 策略，允许：
1. 超级管理员可以更新所有用户的信息
2. 普通管理员可以更新司机的信息
3. 所有用户可以更新自己的基本信息（但不能修改角色，由触发器控制）

## 策略设计
- USING 子句：控制哪些行可以被更新（读取权限）
- WITH CHECK 子句：控制更新后的数据是否符合要求（写入权限）

## 注意事项
- 角色修改仍然由 prevent_role_change 触发器控制
- 只有超级管理员可以修改角色
*/

-- ============================================
-- 删除旧的更新策略
-- ============================================

DROP POLICY IF EXISTS "管理员可以更新司机档案" ON profiles;
DROP POLICY IF EXISTS "用户可以更新自己的档案" ON profiles;

-- ============================================
-- 创建新的更新策略
-- ============================================

-- 1. 超级管理员可以更新所有用户的信息
CREATE POLICY "超级管理员可以更新所有用户" ON profiles
    FOR UPDATE TO authenticated
    USING (is_super_admin(auth.uid()))
    WITH CHECK (is_super_admin(auth.uid()));

-- 2. 普通管理员可以更新司机的信息
CREATE POLICY "普通管理员可以更新司机" ON profiles
    FOR UPDATE TO authenticated
    USING (
        is_manager_or_above(auth.uid()) 
        AND role = 'driver'::user_role
    )
    WITH CHECK (
        is_manager_or_above(auth.uid()) 
        AND role = 'driver'::user_role
    );

-- 3. 所有用户可以更新自己的基本信息（但不能修改角色，由触发器控制）
CREATE POLICY "用户可以更新自己的基本信息" ON profiles
    FOR UPDATE TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- ============================================
-- 验证策略
-- ============================================

-- 查看 profiles 表的所有 UPDATE 策略
-- SELECT policyname, cmd, qual, with_check 
-- FROM pg_policies 
-- WHERE tablename = 'profiles' AND cmd = 'UPDATE'
-- ORDER BY policyname;

COMMENT ON POLICY "超级管理员可以更新所有用户" ON profiles IS '超级管理员可以更新所有用户的信息，包括角色';
COMMENT ON POLICY "普通管理员可以更新司机" ON profiles IS '普通管理员只能更新司机的信息，不能修改角色';
COMMENT ON POLICY "用户可以更新自己的基本信息" ON profiles IS '所有用户可以更新自己的基本信息，但不能修改角色（由触发器控制）';
