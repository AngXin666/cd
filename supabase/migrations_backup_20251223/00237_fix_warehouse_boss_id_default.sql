/*
# 修复仓库创建时的 boss_id 默认值

## 问题描述
创建仓库时，由于 boss_id 字段是 NOT NULL 但没有默认值，导致插入失败并违反 RLS 策略。

## 解决方案
为 warehouses 表的 boss_id 字段添加默认值，自动使用当前用户的 boss_id。

## 变更内容
1. 修改 warehouses 表的 boss_id 字段，添加默认值为 get_current_user_boss_id()
2. 这样在创建仓库时，如果没有显式提供 boss_id，会自动使用当前用户的 boss_id

## 影响范围
- 仅影响新创建的仓库记录
- 不影响现有数据
- 确保 RLS 策略能够正确验证
*/

-- 为 warehouses 表的 boss_id 字段添加默认值
ALTER TABLE warehouses 
ALTER COLUMN boss_id SET DEFAULT get_current_user_boss_id();