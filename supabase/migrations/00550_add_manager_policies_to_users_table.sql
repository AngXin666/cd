/*
# 为users表添加MANAGER（车队长）RLS策略

## 问题描述
车队长（MANAGER角色）无法查看下面的司机，原因是：
- is_admin()函数只检查BOSS和PEER_ADMIN
- users表的RLS策略只使用is_admin()检查
- MANAGER角色无法通过权限检查

## 解决方案
为users表添加MANAGER的RLS策略，允许MANAGER查看所有用户。

## 执行时间
2025-12-01
*/

-- ============================================
-- 1. 创建is_manager()辅助函数
-- ============================================

CREATE OR REPLACE FUNCTION is_manager(uid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = uid AND role = 'MANAGER'
  );
END;
$$;

COMMENT ON FUNCTION is_manager(uuid) IS '检查用户是否为MANAGER（车队长）';

-- ============================================
-- 2. 为users表添加MANAGER查看策略
-- ============================================

-- MANAGER可以查看所有用户
CREATE POLICY "MANAGER可以查看所有用户" ON users
  FOR SELECT
  USING (is_manager(auth.uid()));

-- ============================================
-- 3. 为users表添加MANAGER管理策略
-- ============================================

-- MANAGER可以插入用户（用于添加司机）
CREATE POLICY "MANAGER可以插入用户" ON users
  FOR INSERT
  WITH CHECK (is_manager(auth.uid()));

-- MANAGER可以更新所有用户
CREATE POLICY "MANAGER可以更新所有用户" ON users
  FOR UPDATE
  USING (is_manager(auth.uid()))
  WITH CHECK (is_manager(auth.uid()));

-- MANAGER可以删除用户
CREATE POLICY "MANAGER可以删除用户" ON users
  FOR DELETE
  USING (is_manager(auth.uid()));

-- ============================================
-- 4. 验证策略
-- ============================================

-- 验证is_manager函数已创建
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'is_manager'
  ) THEN
    RAISE EXCEPTION 'is_manager函数创建失败';
  END IF;
  
  RAISE NOTICE 'is_manager函数创建成功';
END $$;

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
      'MANAGER可以查看所有用户',
      'MANAGER可以插入用户',
      'MANAGER可以更新所有用户',
      'MANAGER可以删除用户'
    );
  
  IF policy_count < 4 THEN
    RAISE EXCEPTION 'MANAGER策略创建失败，只创建了%个策略', policy_count;
  END IF;
  
  RAISE NOTICE '成功创建%个MANAGER策略', policy_count;
END $$;
