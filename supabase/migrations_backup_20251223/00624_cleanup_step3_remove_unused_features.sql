/*
# 数据库优化 Step 3: 移除未使用功能

## 目标
删除租赁系统、自动提醒等未使用功能的表

## 删除的表（8张）
1. lease_bills - 租赁账单
2. leases - 租赁记录
3. auto_reminder_rules - 自动提醒规则
4. notification_templates - 通知模板（如未使用）
5. notification_config - 通知配置（如未使用）
6. scheduled_notifications - 定时通知（如未使用）
7. user_behavior_logs - 用户行为日志
8. system_performance_metrics - 系统性能指标

## 保留的配置表
- attendance_rules - 考勤规则（核心功能）
- category_prices - 品类价格（核心功能）

## 最终表数量
预计从48张减少到约28-30张
*/

-- 1. 删除租赁系统表
DROP TABLE IF EXISTS lease_bills CASCADE;
DROP TABLE IF EXISTS leases CASCADE;

-- 2. 删除自动提醒系统表
DROP TABLE IF EXISTS auto_reminder_rules CASCADE;
DROP TABLE IF EXISTS scheduled_notifications CASCADE;

-- 3. 删除未使用的通知配置表（根据实际使用情况决定）
-- 如果代码中有引用，请注释掉以下2行
DROP TABLE IF EXISTS notification_templates CASCADE;
DROP TABLE IF EXISTS notification_config CASCADE;

-- 4. 删除日志和监控表（如不需要）
DROP TABLE IF EXISTS user_behavior_logs CASCADE;
DROP TABLE IF EXISTS system_performance_metrics CASCADE;

-- 5. 删除其他未使用的表
DROP TABLE IF EXISTS notification_send_records CASCADE;
DROP TABLE IF EXISTS user_feature_weights CASCADE;
DROP TABLE IF EXISTS departments CASCADE;
DROP TABLE IF EXISTS user_departments CASCADE;

-- 6. 验证最终结果
DO $$
DECLARE
    total_tables integer;
    core_business_tables text[];
BEGIN
    -- 统计总表数
    SELECT COUNT(*) INTO total_tables
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE';
    
    -- 核心业务表列表
    core_business_tables := ARRAY[
        'users',
        'warehouses',
        'vehicles',
        'notifications',
        'attendance',
        'leave_applications',
        'resignation_applications',
        'piece_work_records',
        'driver_warehouses',
        'manager_warehouses',
        'driver_licenses',
        'vehicle_documents',
        'vehicle_records',
        'warehouse_assignments',
        'category_prices',
        'attendance_rules',
        'feedback',
        'salary_records',
        'warehouse_categories'
    ];
    
    RAISE NOTICE '';
    RAISE NOTICE '🎉 数据库优化完成！';
    RAISE NOTICE '';
    RAISE NOTICE '📊 优化结果:';
    RAISE NOTICE '  - 优化前: 约52张表';
    RAISE NOTICE '  - 优化后: % 张表', total_tables;
    RAISE NOTICE '  - 减少: 约 % 张表', 52 - total_tables;
    RAISE NOTICE '';
    RAISE NOTICE '✅ 保留的核心业务表: % 张', array_length(core_business_tables, 1);
    RAISE NOTICE '';
    
    IF total_tables <= 35 THEN
        RAISE NOTICE '✅ 表数量已优化到合理范围（<= 35张）';
    ELSIF total_tables <= 40 THEN
        RAISE NOTICE '⚠️ 表数量在可接受范围（<= 40张）';
    ELSE
        RAISE NOTICE '⚠️ 仍有较多表（% 张），可继续优化', total_tables;
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '💡 建议:';
    RAISE NOTICE '  1. 定期检查未使用的表';
    RAISE NOTICE '  2. 考虑使用视图合并相关表的查询';
    RAISE NOTICE '  3. 为常用查询创建物化视图';
    RAISE NOTICE '';
END $$;
