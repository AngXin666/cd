/*
# 删除非测试账号

## 删除范围
保留测试账号：
- admin (超级管理员)
- admin1 (测试司机)
- 15766121961 (邱吉兴 - 普通管理员)

删除账号：
- 15766121960 (司机)
- 18503816960 (司机)
- 13927308879 (司机)

## 操作步骤
1. 删除关联的计件记录
2. 删除关联的考勤记录
3. 删除关联的请假记录
4. 删除关联的仓库关系
5. 删除 profiles 记录
6. 删除 auth.users 记录
*/

-- ============================================
-- 定义要删除的用户 ID
-- ============================================

-- 创建临时表存储要删除的用户 ID
CREATE TEMP TABLE users_to_delete AS
SELECT id FROM profiles
WHERE phone IN ('15766121960', '18503816960', '13927308879');

-- ============================================
-- 第一步：删除关联的计件记录
-- ============================================

DELETE FROM piece_work_records
WHERE user_id IN (SELECT id FROM users_to_delete);

-- ============================================
-- 第二步：删除关联的考勤记录
-- ============================================

DELETE FROM attendance_records
WHERE user_id IN (SELECT id FROM users_to_delete);

-- ============================================
-- 第三步：删除关联的请假记录
-- ============================================

DELETE FROM leave_applications
WHERE user_id IN (SELECT id FROM users_to_delete);

-- ============================================
-- 第四步：删除关联的仓库关系
-- ============================================

-- 删除司机仓库关系
DELETE FROM driver_warehouses
WHERE driver_id IN (SELECT id FROM users_to_delete);

-- 删除管理员仓库关系
DELETE FROM manager_warehouses
WHERE manager_id IN (SELECT id FROM users_to_delete);

-- ============================================
-- 第五步：删除 profiles 记录
-- ============================================

DELETE FROM profiles
WHERE id IN (SELECT id FROM users_to_delete);

-- ============================================
-- 第六步：删除 auth.users 记录
-- ============================================

DELETE FROM auth.users
WHERE id IN (SELECT id FROM users_to_delete);

-- ============================================
-- 验证删除结果
-- ============================================

-- 检查剩余用户
DO $$
DECLARE
    remaining_count int;
BEGIN
    SELECT COUNT(*) INTO remaining_count FROM profiles;
    RAISE NOTICE '剩余用户数量: %', remaining_count;
    
    -- 显示剩余用户
    RAISE NOTICE '剩余用户列表:';
    FOR rec IN 
        SELECT phone, name, role FROM profiles ORDER BY created_at
    LOOP
        RAISE NOTICE '  - % (%, %)', rec.phone, rec.name, rec.role;
    END LOOP;
END $$;

-- ============================================
-- 完成
-- ============================================

-- 输出完成信息
DO $$
BEGIN
    RAISE NOTICE '非测试账号删除完成';
    RAISE NOTICE '1. 删除了关联的计件记录';
    RAISE NOTICE '2. 删除了关联的考勤记录';
    RAISE NOTICE '3. 删除了关联的请假记录';
    RAISE NOTICE '4. 删除了关联的仓库关系';
    RAISE NOTICE '5. 删除了 profiles 记录';
    RAISE NOTICE '6. 删除了 auth.users 记录';
    RAISE NOTICE '7. 保留了 3 个测试账号';
END $$;
