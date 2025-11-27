/*
# 修复中央管理员账号的 email

## 说明
将 email 从 central-admin@system.local 改为 13800000001@fleet.com
以匹配登录页面的 email 转换逻辑

## 问题
登录页面会将手机号转换为 {phone}@fleet.com 格式
但创建账号时使用的是 central-admin@system.local
导致登录时 email 不匹配

## 解决方案
统一使用 {phone}@fleet.com 格式
*/

-- 更新 email
UPDATE auth.users
SET 
  email = '13800000001@fleet.com',
  updated_at = NOW()
WHERE phone = '13800000001';

-- 同步更新 system_admins 表
UPDATE system_admins
SET 
  email = '13800000001@fleet.com',
  updated_at = NOW()
WHERE phone = '13800000001';

-- 验证更新
SELECT id, phone, email FROM auth.users WHERE phone = '13800000001';
SELECT id, phone, email FROM system_admins WHERE phone = '13800000001';
