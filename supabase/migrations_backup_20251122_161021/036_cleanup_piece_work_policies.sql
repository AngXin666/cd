/*
# 清理计件记录表的重复策略

## 问题描述
piece_work_records 表在多个迁移文件中重复定义了相同的策略，导致：
1. 策略命名不一致（有英文有中文）
2. 策略功能重复
3. 维护困难，容易产生遗漏

## 修复内容
1. 删除所有旧策略
2. 重新创建清晰的策略
3. 统一使用中文命名
4. 确保策略逻辑清晰准确

## 新策略列表
1. 超级管理员拥有完整权限
2. 管理员可以查看管辖仓库的计件记录
3. 管理员可以创建管辖仓库的计件记录
4. 管理员可以更新管辖仓库的计件记录
5. 管理员可以删除管辖仓库的计件记录
6. 用户可以查看自己的计件记录
7. 用户可以创建自己的计件记录
8. 用户可以更新自己的计件记录
9. 用户可以删除自己的计件记录
*/

-- ============================================
-- 第一步：删除所有旧策略
-- ============================================

DROP POLICY IF EXISTS "超级管理员可以管理所有计件记录" ON piece_work_records;
DROP POLICY IF EXISTS "超级管理员可以查看所有计件记录" ON piece_work_records;
DROP POLICY IF EXISTS "超级管理员拥有完整权限" ON piece_work_records;
DROP POLICY IF EXISTS "管理员可以查看管辖仓库的计件记录" ON piece_work_records;
DROP POLICY IF EXISTS "管理员可以插入管辖仓库的计件记录" ON piece_work_records;
DROP POLICY IF EXISTS "管理员可以更新管辖仓库的计件记录" ON piece_work_records;
DROP POLICY IF EXISTS "管理员可以删除管辖仓库的计件记录" ON piece_work_records;
DROP POLICY IF EXISTS "司机可以查看自己的计件记录" ON piece_work_records;
DROP POLICY IF EXISTS "用户可以查看自己的计件记录" ON piece_work_records;
DROP POLICY IF EXISTS "用户可以插入自己的计件记录" ON piece_work_records;
DROP POLICY IF EXISTS "用户可以更新自己的计件记录" ON piece_work_records;
DROP POLICY IF EXISTS "用户可以删除自己的计件记录" ON piece_work_records;
DROP POLICY IF EXISTS "Users can insert their own piece work records" ON piece_work_records;
DROP POLICY IF EXISTS "Users can update their own piece work records" ON piece_work_records;
DROP POLICY IF EXISTS "Users can delete their own piece work records" ON piece_work_records;

-- ============================================
-- 第二步：重新创建清晰的策略
-- ============================================

-- 1. 超级管理员拥有完整权限
CREATE POLICY "超级管理员拥有完整权限" ON piece_work_records
    FOR ALL TO authenticated
    USING (is_super_admin(auth.uid()))
    WITH CHECK (is_super_admin(auth.uid()));

-- 2. 普通管理员可以查看管辖仓库的计件记录
CREATE POLICY "管理员可以查看管辖仓库的计件记录" ON piece_work_records
    FOR SELECT TO authenticated
    USING (
        is_manager(auth.uid()) 
        AND EXISTS (
            SELECT 1 FROM manager_warehouses mw
            WHERE mw.manager_id = auth.uid() 
            AND mw.warehouse_id = piece_work_records.warehouse_id
        )
    );

-- 3. 普通管理员可以创建管辖仓库的计件记录
CREATE POLICY "管理员可以创建管辖仓库的计件记录" ON piece_work_records
    FOR INSERT TO authenticated
    WITH CHECK (
        is_manager(auth.uid()) 
        AND EXISTS (
            SELECT 1 FROM manager_warehouses mw
            WHERE mw.manager_id = auth.uid() 
            AND mw.warehouse_id = piece_work_records.warehouse_id
        )
    );

-- 4. 普通管理员可以更新管辖仓库的计件记录
CREATE POLICY "管理员可以更新管辖仓库的计件记录" ON piece_work_records
    FOR UPDATE TO authenticated
    USING (
        is_manager(auth.uid()) 
        AND EXISTS (
            SELECT 1 FROM manager_warehouses mw
            WHERE mw.manager_id = auth.uid() 
            AND mw.warehouse_id = piece_work_records.warehouse_id
        )
    )
    WITH CHECK (
        is_manager(auth.uid()) 
        AND EXISTS (
            SELECT 1 FROM manager_warehouses mw
            WHERE mw.manager_id = auth.uid() 
            AND mw.warehouse_id = piece_work_records.warehouse_id
        )
    );

-- 5. 普通管理员可以删除管辖仓库的计件记录
CREATE POLICY "管理员可以删除管辖仓库的计件记录" ON piece_work_records
    FOR DELETE TO authenticated
    USING (
        is_manager(auth.uid()) 
        AND EXISTS (
            SELECT 1 FROM manager_warehouses mw
            WHERE mw.manager_id = auth.uid() 
            AND mw.warehouse_id = piece_work_records.warehouse_id
        )
    );

-- 6. 用户可以查看自己的计件记录
CREATE POLICY "用户可以查看自己的计件记录" ON piece_work_records
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

-- 7. 用户可以创建自己的计件记录
CREATE POLICY "用户可以创建自己的计件记录" ON piece_work_records
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- 8. 用户可以更新自己的计件记录
CREATE POLICY "用户可以更新自己的计件记录" ON piece_work_records
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 9. 用户可以删除自己的计件记录
CREATE POLICY "用户可以删除自己的计件记录" ON piece_work_records
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

-- ============================================
-- 第三步：验证策略
-- ============================================

-- 查看 piece_work_records 表的所有策略
-- SELECT policyname, cmd 
-- FROM pg_policies 
-- WHERE tablename = 'piece_work_records' 
-- ORDER BY policyname;

-- 预期结果：应该有 9 个策略，全部使用中文命名
