/*
 * 完全禁用所有表的 RLS - 全面迁移到应用层权限控制
 * 
 * 背景：
 * 项目已实现完整的应用层权限控制系统（PermissionService + permissionMiddleware）
 * 不再需要数据库层 RLS 策略，全部由应用层统一管理
 * 
 * 优势：
 * 1. 权限逻辑集中在应用层，便于维护和调试
 * 2. 消除 RLS 策略带来的性能开销
 * 3. 避免 RLS 策略冲突和 42501 错误
 * 4. 简化数据库架构
 */

-- ============================================
-- 第1步：禁用所有表的 RLS
-- ============================================

DO $$
DECLARE
    table_record RECORD;
    disabled_count INTEGER := 0;
BEGIN
    RAISE NOTICE '🔄 开始禁用所有表的 RLS...';
    RAISE NOTICE '';
    
    FOR table_record IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND rowsecurity = true
        ORDER BY tablename
    LOOP
        EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', table_record.tablename);
        RAISE NOTICE '  ✅ 已禁用: %', table_record.tablename;
        disabled_count := disabled_count + 1;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ 共禁用 % 个表的 RLS', disabled_count;
END $$;

-- ============================================
-- 第2步：删除所有 RLS 策略
-- ============================================

DO $$
DECLARE
    policy_record RECORD;
    deleted_count INTEGER := 0;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🗑️ 删除所有 RLS 策略...';
    RAISE NOTICE '';
    
    FOR policy_record IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public'
        ORDER BY tablename, policyname
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 
                      policy_record.policyname, 
                      policy_record.tablename);
        deleted_count := deleted_count + 1;
    END LOOP;
    
    RAISE NOTICE '✅ 共删除 % 个策略', deleted_count;
END $$;

-- ============================================
-- 第3步：添加表注释说明
-- ============================================

DO $$
DECLARE
    table_record RECORD;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '📝 更新表注释...';
    RAISE NOTICE '';
    
    FOR table_record IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY tablename
    LOOP
        EXECUTE format('COMMENT ON TABLE %I IS %L', 
                      table_record.tablename,
                      'RLS已禁用 - 应用层权限控制 (PermissionService)');
    END LOOP;
    
    RAISE NOTICE '✅ 表注释已更新';
END $$;

-- ============================================
-- 第4步：验证最终状态
-- ============================================

DO $$
DECLARE
    rls_enabled_count INTEGER;
    policy_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 RLS 完全禁用完成！';
    RAISE NOTICE '';
    RAISE NOTICE '================================';
    
    -- 检查是否还有启用 RLS 的表
    SELECT COUNT(*) INTO rls_enabled_count
    FROM pg_tables
    WHERE schemaname = 'public'
    AND rowsecurity = true;
    
    -- 检查是否还有剩余策略
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public';
    
    IF rls_enabled_count > 0 THEN
        RAISE NOTICE '⚠️  仍有 % 个表启用了 RLS', rls_enabled_count;
    ELSE
        RAISE NOTICE '✅ 所有表的 RLS 已禁用';
    END IF;
    
    IF policy_count > 0 THEN
        RAISE NOTICE '⚠️  仍有 % 个 RLS 策略残留', policy_count;
    ELSE
        RAISE NOTICE '✅ 所有 RLS 策略已删除';
    END IF;
    
    RAISE NOTICE '================================';
    RAISE NOTICE '';
    RAISE NOTICE '💡 权限控制已完全迁移到应用层';
    RAISE NOTICE '📍 PermissionService: /src/services/permission-service.ts';
    RAISE NOTICE '📍 PermissionConfig: /src/config/permission-config.ts';
    RAISE NOTICE '📍 Middleware: /src/db/middleware/permissionMiddleware.ts';
    RAISE NOTICE '';
END $$;
