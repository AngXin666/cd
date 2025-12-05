/*
# RLS策略备份 - 迁移到RBAC前的完整备份

## 目的
在迁移到RBAC模型前，完整备份当前所有表的RLS策略

## 备份时间
2025-12-05

## 备份方法
将所有策略导出为CREATE POLICY语句，方便回滚
*/

-- ============================================
-- 备份方法：导出所有RLS策略到临时表
-- ============================================

-- 创建备份表
CREATE TABLE IF NOT EXISTS rls_policies_backup (
    id SERIAL PRIMARY KEY,
    backup_date TIMESTAMP DEFAULT NOW(),
    table_name TEXT NOT NULL,
    policy_name TEXT NOT NULL,
    policy_command TEXT NOT NULL,
    policy_definition TEXT,
    policy_using TEXT,
    policy_with_check TEXT,
    notes TEXT
);

-- 插入当前所有策略
INSERT INTO rls_policies_backup (table_name, policy_name, policy_command, policy_definition)
SELECT 
    schemaname || '.' || tablename AS table_name,
    policyname AS policy_name,
    cmd AS policy_command,
    qual::text AS policy_using
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 验证备份
DO $$
DECLARE
    backup_count INTEGER;
    current_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO backup_count FROM rls_policies_backup;
    SELECT COUNT(*) INTO current_count FROM pg_policies WHERE schemaname = 'public';
    
    RAISE NOTICE '✅ RLS策略备份完成';
    RAISE NOTICE '📊 当前策略数量: %', current_count;
    RAISE NOTICE '📊 已备份策略数量: %', backup_count;
    
    IF backup_count >= current_count THEN
        RAISE NOTICE '✅ 备份完整';
    ELSE
        RAISE WARNING '⚠️ 备份可能不完整';
    END IF;
END $$;

-- 添加注释
COMMENT ON TABLE rls_policies_backup IS 'RLS策略备份表 - 迁移到RBAC前的完整备份（2025-12-05）';

-- 导出策略详情到日志
DO $$
DECLARE
    policy_rec RECORD;
    table_count INTEGER := 0;
    current_table TEXT := '';
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '📋 详细策略列表:';
    RAISE NOTICE '================================';
    
    FOR policy_rec IN 
        SELECT tablename, policyname, cmd
        FROM pg_policies 
        WHERE schemaname = 'public'
        ORDER BY tablename, policyname
    LOOP
        IF current_table != policy_rec.tablename THEN
            current_table := policy_rec.tablename;
            table_count := table_count + 1;
            RAISE NOTICE '';
            RAISE NOTICE '[%] 表: %', table_count, policy_rec.tablename;
        END IF;
        RAISE NOTICE '  - % (%)', policy_rec.policyname, policy_rec.cmd;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '================================';
    RAISE NOTICE '总计: % 个表，已备份所有策略', table_count;
END $$;
