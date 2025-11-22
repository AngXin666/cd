/*
# 允许管理员插入新司机记录

## 问题描述
当前的 RLS 策略只允许超级管理员插入新的 profiles 记录。
普通管理员（manager）无法创建新的司机账号，导致以下错误：
```
new row violates row-level security policy for table "profiles"
```

## 解决方案
添加新的 RLS 策略，允许管理员插入新的司机记录。

## 策略设计

### 管理员插入司机的权限
- 管理员可以插入新的司机记录
- 只能插入 role = 'driver' 的记录
- 不能插入其他角色（manager, super_admin）的记录

## 安全性考虑
1. 使用 WITH CHECK 确保只能插入司机角色
2. 防止管理员创建其他管理员或超级管理员
3. 保持最小权限原则

## 测试场景
1. 管理员应该能够创建新司机
2. 管理员不应该能够创建新管理员
3. 管理员不应该能够创建新超级管理员
*/

-- ============================================
-- 删除旧策略（如果存在）
-- ============================================

DROP POLICY IF EXISTS "管理员插入司机" ON profiles;

-- ============================================
-- 创建新的 INSERT 策略
-- ============================================

-- 管理员：插入新的司机记录
CREATE POLICY "管理员插入司机"
ON profiles
FOR INSERT
TO authenticated
WITH CHECK (
  -- 当前用户必须是管理员
  is_manager(auth.uid())
  AND
  -- 只能插入司机角色的记录
  role = 'driver'::user_role
);

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

-- 预期结果：应该包含新的策略
-- - 管理员插入司机 (INSERT)
