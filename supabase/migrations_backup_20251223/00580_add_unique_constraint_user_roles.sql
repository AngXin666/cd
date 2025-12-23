/*
# 添加唯一约束确保每个用户只有一个角色

## 说明
- 在 user_roles 表的 user_id 字段上添加唯一约束
- 确保每个用户在 user_roles 表中只能有一条记录
- 防止用户拥有多个角色的情况发生

## 变更内容
1. 添加唯一约束：user_roles.user_id
2. 约束名称：user_roles_user_id_unique

## 注意事项
- 此约束确保系统中每个用户只能有一个角色
- 如果尝试为同一用户插入多个角色，数据库将返回错误
*/

-- 添加唯一约束，确保每个用户只有一个角色
ALTER TABLE user_roles 
ADD CONSTRAINT user_roles_user_id_unique UNIQUE (user_id);