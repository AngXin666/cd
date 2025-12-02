
/*
# 删除部门相关表

## 删除的表
1. user_departments - 用户部门关联表
2. departments - 部门表

## 说明
这两个表在代码中未被使用，可以安全删除。
删除顺序：先删除user_departments（有外键依赖），再删除departments。

## 影响
- 无代码影响（代码中未使用这些表）
- 删除所有部门相关数据
*/

-- 1. 删除user_departments表（先删除有外键依赖的表）
DROP TABLE IF EXISTS user_departments CASCADE;

-- 2. 删除departments表
DROP TABLE IF EXISTS departments CASCADE;
