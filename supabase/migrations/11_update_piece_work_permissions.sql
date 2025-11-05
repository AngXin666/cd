/*
# 更新计件记录权限策略

## 变更说明
修改计件数据的权责关系，确保数据的准确性：
- 用户（司机）拥有对自己计件数据的录入、修改和删除权限
- 普通管理员和超级管理员仅可查看计件数据，不能修改或删除

## 权限策略
1. 删除原有的管理员写入策略
2. 添加用户自己管理自己数据的策略：
   - 用户可以插入自己的计件记录
   - 用户可以更新自己的计件记录
   - 用户可以删除自己的计件记录
3. 保留查看策略：
   - 用户可以查看自己的记录
   - 管理员可以查看其管辖仓库的记录
   - 超级管理员可以查看所有记录

## 注意事项
- 此变更将移除管理员直接录入和修改计件数据的权限
- 管理员只能通过数据汇总功能查看计件数据
*/

-- 删除原有的管理员和超级管理员的插入、更新、删除策略
DROP POLICY IF EXISTS "Managers can insert piece work records for their warehouses" ON piece_work_records;
DROP POLICY IF EXISTS "Super admins can insert any piece work records" ON piece_work_records;
DROP POLICY IF EXISTS "Managers can update piece work records for their warehouses" ON piece_work_records;
DROP POLICY IF EXISTS "Super admins can update any piece work records" ON piece_work_records;
DROP POLICY IF EXISTS "Managers can delete piece work records for their warehouses" ON piece_work_records;
DROP POLICY IF EXISTS "Super admins can delete any piece work records" ON piece_work_records;

-- 添加用户自己管理自己数据的策略
CREATE POLICY "Users can insert their own piece work records" ON piece_work_records
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own piece work records" ON piece_work_records
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own piece work records" ON piece_work_records
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id);
