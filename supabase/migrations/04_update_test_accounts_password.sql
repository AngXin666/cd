/*
# 更新测试账号密码

将测试账号的密码更新为正确的bcrypt哈希值。
密码：123456
bcrypt哈希：$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy

## 更新的账号
- admin (超级管理员)
- admin1 (司机)
- admin2 (普通管理员)
*/

-- 更新所有测试账号的密码为 "123456" 的正确bcrypt哈希
UPDATE auth.users 
SET encrypted_password = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'
WHERE phone IN ('admin', 'admin1', 'admin2');
