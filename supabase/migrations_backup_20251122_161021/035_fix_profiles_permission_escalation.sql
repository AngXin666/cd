/*
# 修复 profiles 表的权限提升漏洞

## 问题描述
当前普通管理员可以修改任何用户的角色，包括将自己提升为超级管理员，这是一个严重的安全漏洞。

## 修复内容
1. 删除过度开放的策略
2. 创建更严格的策略，限制普通管理员只能管理司机账号
3. 添加触发器防止非超级管理员修改角色字段

## 新策略
- 管理员可以创建司机账号（不能创建管理员或超级管理员）
- 管理员可以更新司机档案（不能修改角色）
- 管理员可以删除司机账号（不能删除管理员或超级管理员）
- 添加触发器防止角色修改

## 安全性
- ✅ 普通管理员无法提升自己的权限
- ✅ 普通管理员无法删除管理员或超级管理员
- ✅ 只有超级管理员可以修改用户角色
*/

-- ============================================
-- 第一步：删除过度开放的策略
-- ============================================

DROP POLICY IF EXISTS "管理员可以更新所有用户" ON profiles;
DROP POLICY IF EXISTS "管理员可以删除用户" ON profiles;
DROP POLICY IF EXISTS "管理员可以创建用户" ON profiles;
DROP POLICY IF EXISTS "管理员可以修改司机档案" ON profiles;

-- ============================================
-- 第二步：创建更严格的策略
-- ============================================

-- 1. 管理员可以创建司机账号（只能创建司机角色）
CREATE POLICY "管理员可以创建司机账号" ON profiles
    FOR INSERT TO authenticated
    WITH CHECK (
        is_manager_or_above(auth.uid()) 
        AND role = 'driver'::user_role
    );

-- 2. 管理员可以更新司机档案（只能更新司机，且不能修改角色）
CREATE POLICY "管理员可以更新司机档案" ON profiles
    FOR UPDATE TO authenticated
    USING (
        is_manager_or_above(auth.uid()) 
        AND role = 'driver'::user_role
    )
    WITH CHECK (
        is_manager_or_above(auth.uid()) 
        AND role = 'driver'::user_role
    );

-- 3. 管理员可以删除司机账号（只能删除司机）
CREATE POLICY "管理员可以删除司机账号" ON profiles
    FOR DELETE TO authenticated
    USING (
        is_manager_or_above(auth.uid()) 
        AND role = 'driver'::user_role
    );

-- ============================================
-- 第三步：添加触发器防止角色修改
-- ============================================

-- 创建触发器函数：防止非超级管理员修改角色
CREATE OR REPLACE FUNCTION prevent_role_change()
RETURNS TRIGGER AS $$
BEGIN
    -- 如果角色发生变化
    IF OLD.role IS DISTINCT FROM NEW.role THEN
        -- 只有超级管理员可以修改角色
        IF NOT is_super_admin(auth.uid()) THEN
            RAISE EXCEPTION '只有超级管理员可以修改用户角色';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 绑定触发器到 profiles 表
DROP TRIGGER IF EXISTS check_role_change ON profiles;
CREATE TRIGGER check_role_change
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION prevent_role_change();

-- ============================================
-- 第四步：验证策略
-- ============================================

-- 查看 profiles 表的所有策略
-- SELECT policyname, cmd, qual, with_check 
-- FROM pg_policies 
-- WHERE tablename = 'profiles' 
-- ORDER BY policyname;
