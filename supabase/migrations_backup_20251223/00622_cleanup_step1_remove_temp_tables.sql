/*
# 数据库优化 Step 1: 删除临时测试表

## 目标
从52张表减少到48张（删除4张临时表）

## 删除的表
1. new_attendance - 考勤迁移临时表
2. new_notifications - 通知迁移临时表
3. new_vehicles - 车辆迁移临时表
4. new_warehouses - 仓库迁移临时表

## 影响评估
这些表都是历史迁移过程中的临时表，当前代码未引用，可安全删除
*/

-- 删除临时表（带依赖清理）
DROP TABLE IF EXISTS new_attendance CASCADE;
DROP TABLE IF EXISTS new_notifications CASCADE;
DROP TABLE IF EXISTS new_vehicles CASCADE;
DROP TABLE IF EXISTS new_warehouses CASCADE;

-- 验证删除
DO $$
DECLARE
    temp_table_count integer;
BEGIN
    SELECT COUNT(*) INTO temp_table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name LIKE 'new_%';
    
    IF temp_table_count = 0 THEN
        RAISE NOTICE '✅ 所有临时表已删除';
    ELSE
        RAISE WARNING '⚠️ 仍有 % 个临时表未删除', temp_table_count;
    END IF;
END $$;
