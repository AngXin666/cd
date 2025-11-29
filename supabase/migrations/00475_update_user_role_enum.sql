/*
# 更新用户角色枚举类型

## 说明
将用户角色从 BOSS, DISPATCHER, DRIVER 更新为 SUPER_ADMIN, MANAGER, DRIVER

## 变更内容
1. 更新所有使用旧角色名称的记录
2. 删除旧的枚举值
3. 添加新的枚举值

## 注意事项
- 此迁移会更新所有现有数据
- BOSS → SUPER_ADMIN
- DISPATCHER → MANAGER
- DRIVER → DRIVER（保持不变）
*/

-- 1. 首先将所有表中的 role 列临时改为 text 类型
ALTER TABLE users ALTER COLUMN role TYPE text;
ALTER TABLE user_role_assignments ALTER COLUMN role TYPE text;

-- 2. 更新所有使用旧角色名称的记录
UPDATE users SET role = 'SUPER_ADMIN' WHERE role = 'BOSS';
UPDATE users SET role = 'MANAGER' WHERE role = 'DISPATCHER';

UPDATE user_role_assignments SET role = 'SUPER_ADMIN' WHERE role = 'BOSS';
UPDATE user_role_assignments SET role = 'MANAGER' WHERE role = 'DISPATCHER';

-- 3. 删除旧的枚举类型
DROP TYPE IF EXISTS user_role CASCADE;

-- 4. 创建新的枚举类型
CREATE TYPE user_role AS ENUM ('SUPER_ADMIN', 'MANAGER', 'DRIVER');

-- 5. 将列改回枚举类型
ALTER TABLE users ALTER COLUMN role TYPE user_role USING role::user_role;
ALTER TABLE user_role_assignments ALTER COLUMN role TYPE user_role USING role::user_role;
