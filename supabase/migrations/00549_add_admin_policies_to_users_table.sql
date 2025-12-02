/*
# 为users表添加管理员RLS策略

## 问题描述
users表缺少管理员（BOSS和PEER_ADMIN）的RLS策略，导致：
- 老板端看不到司机列表
- 车队长端看不到司机列表

## 解决方案
为users表添加以下RLS策略：
1. 管理员可以查看所有用户
2. 管理员可以管理所有用户

## 执行时间
2025-12-01
*/

-- ============================================
-- 1. 为users表添加管理员查看策略
-- ============================================

-- 管理员可以查看所有用户
CREATE POLICY "管理员可以查看所有用户" ON users
  FOR SELECT
  USING (is_admin(auth.uid()));

-- ============================================
-- 2. 为users表添加管理员管理策略
-- ============================================

-- 管理员可以插入用户
CREATE POLICY "管理员可以插入用户" ON users
  FOR INSERT
  WITH CHECK (is_admin(auth.uid()));

-- 管理员可以更新所有用户
CREATE POLICY "管理员可以更新所有用户" ON users
  FOR UPDATE
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- 管理员可以删除所有用户
CREATE POLICY "管理员可以删除所有用户" ON users
  FOR DELETE
  USING (is_admin(auth.uid()));

-- ============================================
-- 3. 验证策略
-- ============================================

-- 验证策略已创建
DO $$
DECLARE
  policy_count int;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'users'
    AND policyname IN (
      '管理员可以查看所有用户',
      '管理员可以插入用户',
      '管理员可以更新所有用户',
      '管理员可以删除所有用户'
    );
  
  IF policy_count < 4 THEN
    RAISE EXCEPTION '管理员策略创建失败，只创建了%个策略', policy_count;
  END IF;
  
  RAISE NOTICE '成功创建%个管理员策略', policy_count;
END $$;
