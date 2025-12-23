
/*
# 统一邮箱格式为 @fleet.com

## 背景
系统中存在使用 @phone.local 格式的账号，需要统一更新为 @fleet.com 格式，以保持一致性和向后兼容性。

## 更新内容
1. 将所有 @phone.local 格式的邮箱更新为 @fleet.com
2. 只更新虚拟邮箱，不影响真实邮箱地址
3. 确保邮箱格式统一，避免登录问题

## 影响范围
- auth.users 表中使用 @phone.local 的账号

## 注意事项
- 只更新 @phone.local 格式的邮箱
- 不更新其他真实邮箱地址
- 更新后账号可以正常使用手机号登录
*/

-- 更新 auth.users 表中的邮箱格式
UPDATE auth.users
SET email = REPLACE(email, '@phone.local', '@fleet.com')
WHERE email LIKE '%@phone.local';
