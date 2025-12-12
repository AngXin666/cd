/*
# 禁用 profiles 表的 RLS 策略

## 背景
根据用户需求，需要删除 profiles 表的所有行级安全策略（RLS）。

## 变更内容
1. 删除所有 profiles 表的 RLS 策略
2. 禁用 profiles 表的 RLS

## 影响
- profiles 表将不再受 RLS 保护
- 所有认证用户都可以访问和修改 profiles 表的所有数据
- 应用层需要自行控制访问权限

## 安全提示
禁用 RLS 后，数据库层面将不再限制用户访问，请确保应用层有足够的权限控制。
*/

-- ============================================
-- 删除所有 profiles 表的 RLS 策略
-- ============================================

DROP POLICY IF EXISTS "超级管理员可以更新所有用户" ON profiles;
DROP POLICY IF EXISTS "普通管理员可以更新司机" ON profiles;
DROP POLICY IF EXISTS "普通管理员可以更新司机（需权限）" ON profiles;
DROP POLICY IF EXISTS "用户可以更新自己的基本信息" ON profiles;
DROP POLICY IF EXISTS "用户可以更新自己的档案" ON profiles;
DROP POLICY IF EXISTS "用户可以查看自己的档案" ON profiles;
DROP POLICY IF EXISTS "管理员可以修改司机档案" ON profiles;
DROP POLICY IF EXISTS "管理员可以创建司机账号" ON profiles;
DROP POLICY IF EXISTS "管理员可以删除司机账号" ON profiles;
DROP POLICY IF EXISTS "管理员可以更新司机档案" ON profiles;
DROP POLICY IF EXISTS "管理员可以查看所有档案" ON profiles;
DROP POLICY IF EXISTS "超级管理员拥有完全访问权限" ON profiles;

-- 删除其他可能存在的策略
DROP POLICY IF EXISTS "允许匿名用户创建profile" ON profiles;
DROP POLICY IF EXISTS "允许认证用户创建自己的profile" ON profiles;
DROP POLICY IF EXISTS "用户可以更新自己的profile" ON profiles;
DROP POLICY IF EXISTS "用户可以查看自己的profile" ON profiles;
DROP POLICY IF EXISTS "管理员可以创建用户" ON profiles;
DROP POLICY IF EXISTS "管理员可以删除用户" ON profiles;
DROP POLICY IF EXISTS "管理员可以更新所有用户" ON profiles;
DROP POLICY IF EXISTS "管理员可以查看所有用户" ON profiles;
DROP POLICY IF EXISTS "管理员可以查看管辖仓库的司机档案" ON profiles;
DROP POLICY IF EXISTS "管理员可以查看管辖仓库的司机" ON profiles;
DROP POLICY IF EXISTS "管理员可以修改管辖仓库的司机" ON profiles;

-- ============================================
-- 禁用 profiles 表的 RLS
-- ============================================

ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- ============================================
-- 验证
-- ============================================

-- 查看 profiles 表的 RLS 状态
-- SELECT tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE tablename = 'profiles';

-- 查看 profiles 表的所有策略（应该为空）
-- SELECT policyname, cmd 
-- FROM pg_policies 
-- WHERE tablename = 'profiles';
