/*
# 添加 MANAGER 角色枚举值

## 背景
代码中使用 MANAGER 角色，但数据库枚举中只有 DISPATCHER。
为了保持代码和数据库的一致性，添加 MANAGER 枚举值，并将现有的 DISPATCHER 数据迁移到 MANAGER。

## 操作
1. 添加 MANAGER 枚举值到 user_role 类型
2. 将所有 DISPATCHER 角色更新为 MANAGER
3. 保留 DISPATCHER 枚举值以备将来使用

## 注意事项
- MANAGER 代表车队长/管理员角色
- DISPATCHER 代表调度员角色（目前未使用）
- BOSS 代表老板/超级管理员角色
- DRIVER 代表司机角色
*/

-- 1. 添加 MANAGER 枚举值
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'MANAGER';

-- 2. 将所有 DISPATCHER 角色更新为 MANAGER
UPDATE user_roles 
SET role = 'MANAGER'::user_role 
WHERE role = 'DISPATCHER'::user_role;