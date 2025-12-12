/*
# 修复普通管理员编辑司机信息的权限检查

## 问题描述
当前的 RLS 策略允许所有普通管理员更新司机信息，但没有检查 manager_permissions 表中的 can_edit_user_info 权限。
这导致即使管理员没有被授予"修改司机信息"权限，也能通过直接调用数据库更新司机信息。

## 当前策略问题
```sql
CREATE POLICY "普通管理员可以更新司机" ON profiles
    FOR UPDATE TO authenticated
    USING (
        is_manager_or_above(auth.uid()) 
        AND role = 'driver'::user_role
    )
```
这个策略只检查了角色，没有检查权限设置。

## 解决方案
修改 UPDATE 策略，添加对 manager_permissions.can_edit_user_info 的检查：
1. 超级管理员：可以更新所有用户（不变）
2. 普通管理员：必须同时满足：
   - 是管理员角色
   - 目标用户是司机
   - 在 manager_permissions 表中 can_edit_user_info = true
3. 普通用户：可以更新自己的信息（不变）

## 修改内容
- 删除旧的"普通管理员可以更新司机"策略
- 创建新的策略，添加权限检查
*/

-- ============================================
-- 删除旧的策略
-- ============================================

DROP POLICY IF EXISTS "普通管理员可以更新司机" ON profiles;

-- ============================================
-- 创建新的策略，添加权限检查
-- ============================================

-- 普通管理员可以更新司机信息（需要有 can_edit_user_info 权限）
CREATE POLICY "普通管理员可以更新司机（需权限）" ON profiles
    FOR UPDATE TO authenticated
    USING (
        -- 调用者必须是管理员
        is_manager_or_above(auth.uid())
        -- 目标用户必须是司机
        AND role = 'driver'::user_role
        -- 管理员必须有编辑用户信息的权限
        AND EXISTS (
            SELECT 1 FROM manager_permissions
            WHERE manager_id = auth.uid()
            AND COALESCE(can_edit_user_info, false) = true
        )
    )
    WITH CHECK (
        -- 同样的检查应用于更新后的数据
        is_manager_or_above(auth.uid())
        AND role = 'driver'::user_role
        AND EXISTS (
            SELECT 1 FROM manager_permissions
            WHERE manager_id = auth.uid()
            AND COALESCE(can_edit_user_info, false) = true
        )
    );

-- ============================================
-- 添加策略注释
-- ============================================

COMMENT ON POLICY "普通管理员可以更新司机（需权限）" ON profiles IS 
'普通管理员只能更新司机的信息，且必须在 manager_permissions 表中拥有 can_edit_user_info 权限';

-- ============================================
-- 验证策略
-- ============================================

-- 查看 profiles 表的所有 UPDATE 策略
-- SELECT policyname, cmd, qual, with_check 
-- FROM pg_policies 
-- WHERE tablename = 'profiles' AND cmd = 'UPDATE'
-- ORDER BY policyname;
