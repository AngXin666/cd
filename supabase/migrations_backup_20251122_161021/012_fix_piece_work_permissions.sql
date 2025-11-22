/*
# 修复计件记录权限策略

## 变更说明
彻底删除管理员的写入权限，确保只有用户本人可以录入和修改计件数据

## 权限策略
1. 删除所有管理员的插入、更新、删除策略
2. 保留用户自己管理自己数据的策略
3. 保留查看策略
*/

-- 删除管理员的插入、更新、删除策略
DROP POLICY IF EXISTS "管理员可以插入管辖仓库的计件记录" ON piece_work_records;
DROP POLICY IF EXISTS "管理员可以更新管辖仓库的计件记录" ON piece_work_records;
DROP POLICY IF EXISTS "管理员可以删除管辖仓库的计件记录" ON piece_work_records;

-- 删除超级管理员的ALL策略，重新创建为只读策略
DROP POLICY IF EXISTS "超级管理员可以管理所有计件记录" ON piece_work_records;

-- 为超级管理员创建只读策略
CREATE POLICY "超级管理员可以查看所有计件记录" ON piece_work_records
    FOR SELECT TO authenticated
    USING (is_super_admin(auth.uid()));
