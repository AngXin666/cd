/*
# 添加 profiles 表的 INSERT 策略

## 说明
修复管理员无法添加新用户的问题。添加 INSERT 策略，允许超级管理员插入新的用户记录。

## 策略详情
1. 超级管理员可以插入新的用户记录（profiles 表）
2. 这个策略允许超级管理员通过管理界面添加新用户

## 安全考虑
- 只有超级管理员可以插入新用户
- 普通用户和管理员不能直接插入 profiles 记录
- 新用户的创建由超级管理员控制
*/

-- ============================================
-- profiles 表 INSERT 策略
-- ============================================

-- 超级管理员可以插入新用户
DROP POLICY IF EXISTS "Super admins can insert profiles" ON profiles;
CREATE POLICY "Super admins can insert profiles"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (is_super_admin(auth.uid()));
