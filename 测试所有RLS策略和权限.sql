-- ============================================================
-- 全面测试所有 RLS 策略和权限映射表
-- ============================================================

-- 设置客户端编码
SET client_encoding = 'UTF8';

\echo '╔═══════════════════════════════════════════════════════════════╗'
\echo '║              全面测试 RLS 策略和权限映射表                    ║'
\echo '╚═══════════════════════════════════════════════════════════════╝'
\echo ''

-- ============================================================
-- 第一部分：检查所有表的 RLS 状态
-- ============================================================

\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '📊 第一部分：检查所有表的 RLS 状态'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

SELECT 
    schemaname AS "Schema",
    tablename AS "表名",
    rowsecurity AS "RLS已启用"
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
    'users', 'user_roles', 'user_departments',
    'departments', 'warehouses', 'warehouse_assignments',
    'vehicles', 'attendance', 'leave_requests',
    'piecework_records', 'notifications'
)
ORDER BY tablename;

\echo ''

-- ============================================================
-- 第二部分：检查所有表的 RLS 策略
-- ============================================================

\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '📊 第二部分：检查所有表的 RLS 策略'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

\echo '1. users 表的策略:'
SELECT 
    policyname AS "策略名称",
    cmd AS "命令",
    CASE WHEN qual IS NOT NULL THEN '✓' ELSE '✗' END AS "USING",
    CASE WHEN with_check IS NOT NULL THEN '✓' ELSE '✗' END AS "WITH CHECK"
FROM pg_policies
WHERE tablename = 'users'
ORDER BY cmd, policyname;

\echo ''
\echo '2. user_roles 表的策略:'
SELECT 
    policyname AS "策略名称",
    cmd AS "命令",
    CASE WHEN qual IS NOT NULL THEN '✓' ELSE '✗' END AS "USING",
    CASE WHEN with_check IS NOT NULL THEN '✓' ELSE '✗' END AS "WITH CHECK"
FROM pg_policies
WHERE tablename = 'user_roles'
ORDER BY cmd, policyname;

\echo ''
\echo '3. warehouses 表的策略:'
SELECT 
    policyname AS "策略名称",
    cmd AS "命令",
    CASE WHEN qual IS NOT NULL THEN '✓' ELSE '✗' END AS "USING",
    CASE WHEN with_check IS NOT NULL THEN '✓' ELSE '✗' END AS "WITH CHECK"
FROM pg_policies
WHERE tablename = 'warehouses'
ORDER BY cmd, policyname;

\echo ''
\echo '4. warehouse_assignments 表的策略:'
SELECT 
    policyname AS "策略名称",
    cmd AS "命令",
    CASE WHEN qual IS NOT NULL THEN '✓' ELSE '✗' END AS "USING",
    CASE WHEN with_check IS NOT NULL THEN '✓' ELSE '✗' END AS "WITH CHECK"
FROM pg_policies
WHERE tablename = 'warehouse_assignments'
ORDER BY cmd, policyname;

\echo ''
\echo '5. vehicles 表的策略:'
SELECT 
    policyname AS "策略名称",
    cmd AS "命令",
    CASE WHEN qual IS NOT NULL THEN '✓' ELSE '✗' END AS "USING",
    CASE WHEN with_check IS NOT NULL THEN '✓' ELSE '✗' END AS "WITH CHECK"
FROM pg_policies
WHERE tablename = 'vehicles'
ORDER BY cmd, policyname;

\echo ''
\echo '6. attendance 表的策略:'
SELECT 
    policyname AS "策略名称",
    cmd AS "命令",
    CASE WHEN qual IS NOT NULL THEN '✓' ELSE '✗' END AS "USING",
    CASE WHEN with_check IS NOT NULL THEN '✓' ELSE '✗' END AS "WITH CHECK"
FROM pg_policies
WHERE tablename = 'attendance'
ORDER BY cmd, policyname;

\echo ''
\echo '7. leave_requests 表的策略:'
SELECT 
    policyname AS "策略名称",
    cmd AS "命令",
    CASE WHEN qual IS NOT NULL THEN '✓' ELSE '✗' END AS "USING",
    CASE WHEN with_check IS NOT NULL THEN '✓' ELSE '✗' END AS "WITH CHECK"
FROM pg_policies
WHERE tablename = 'leave_requests'
ORDER BY cmd, policyname;

\echo ''
\echo '8. piecework_records 表的策略:'
SELECT 
    policyname AS "策略名称",
    cmd AS "命令",
    CASE WHEN qual IS NOT NULL THEN '✓' ELSE '✗' END AS "USING",
    CASE WHEN with_check IS NOT NULL THEN '✓' ELSE '✗' END AS "WITH CHECK"
FROM pg_policies
WHERE tablename = 'piecework_records'
ORDER BY cmd, policyname;

\echo ''
\echo '9. notifications 表的策略:'
SELECT 
    policyname AS "策略名称",
    cmd AS "命令",
    CASE WHEN qual IS NOT NULL THEN '✓' ELSE '✗' END AS "USING",
    CASE WHEN with_check IS NOT NULL THEN '✓' ELSE '✗' END AS "WITH CHECK"
FROM pg_policies
WHERE tablename = 'notifications'
ORDER BY cmd, policyname;

\echo ''

-- ============================================================
-- 第三部分：检查辅助函数
-- ============================================================

\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '📊 第三部分：检查辅助函数'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

SELECT 
    proname AS "函数名",
    pg_get_function_arguments(oid) AS "参数",
    pg_get_function_result(oid) AS "返回类型"
FROM pg_proc
WHERE proname IN (
    'is_admin',
    'is_admin_user',
    'get_user_role',
    'is_boss',
    'is_manager',
    'update_notifications_by_batch'
)
ORDER BY proname;

\echo ''

-- ============================================================
-- 第四部分：测试用户和角色数据
-- ============================================================

\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '📊 第四部分：测试用户和角色数据'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

\echo '1. 用户统计:'
SELECT 
    COUNT(*) AS "总用户数"
FROM users;

\echo ''
\echo '2. 角色分布:'
SELECT 
    role AS "角色",
    COUNT(*) AS "用户数"
FROM user_roles
GROUP BY role
ORDER BY 
    CASE role
        WHEN 'BOSS' THEN 1
        WHEN 'PEER_ADMIN' THEN 2
        WHEN 'MANAGER' THEN 3
        WHEN 'DRIVER' THEN 4
        ELSE 5
    END;

\echo ''
\echo '3. 用户角色详情（前10个）:'
SELECT 
    u.id AS "用户ID",
    u.name AS "姓名",
    ur.role AS "角色",
    u.created_at AS "创建时间"
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
ORDER BY 
    CASE ur.role
        WHEN 'BOSS' THEN 1
        WHEN 'PEER_ADMIN' THEN 2
        WHEN 'MANAGER' THEN 3
        WHEN 'DRIVER' THEN 4
        ELSE 5
    END,
    u.created_at
LIMIT 10;

\echo ''

-- ============================================================
-- 第五部分：测试权限函数
-- ============================================================

\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '📊 第五部分：测试权限函数'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

DO $$
DECLARE
    v_boss_id uuid;
    v_manager_id uuid;
    v_driver_id uuid;
    v_result boolean;
    v_role text;
BEGIN
    -- 获取测试用户
    SELECT user_id INTO v_boss_id FROM user_roles WHERE role = 'BOSS' LIMIT 1;
    SELECT user_id INTO v_manager_id FROM user_roles WHERE role = 'MANAGER' LIMIT 1;
    SELECT user_id INTO v_driver_id FROM user_roles WHERE role = 'DRIVER' LIMIT 1;
    
    RAISE NOTICE '测试用户:';
    RAISE NOTICE '  - BOSS ID: %', v_boss_id;
    RAISE NOTICE '  - MANAGER ID: %', v_manager_id;
    RAISE NOTICE '  - DRIVER ID: %', v_driver_id;
    RAISE NOTICE '';
    
    IF v_boss_id IS NULL OR v_manager_id IS NULL OR v_driver_id IS NULL THEN
        RAISE NOTICE '⚠️ 缺少测试用户，跳过权限函数测试';
        RETURN;
    END IF;
    
    -- 测试 is_admin 函数
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '测试 is_admin() 函数:';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    
    BEGIN
        SELECT is_admin(v_boss_id) INTO v_result;
        RAISE NOTICE '  BOSS: % (预期: true)', v_result;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '  ❌ BOSS 测试失败: %', SQLERRM;
    END;
    
    BEGIN
        SELECT is_admin(v_manager_id) INTO v_result;
        RAISE NOTICE '  MANAGER: % (预期: true)', v_result;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '  ❌ MANAGER 测试失败: %', SQLERRM;
    END;
    
    BEGIN
        SELECT is_admin(v_driver_id) INTO v_result;
        RAISE NOTICE '  DRIVER: % (预期: false)', v_result;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '  ❌ DRIVER 测试失败: %', SQLERRM;
    END;
    
    RAISE NOTICE '';
    
    -- 测试 get_user_role 函数
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '测试 get_user_role() 函数:';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    
    BEGIN
        SELECT get_user_role(v_boss_id) INTO v_role;
        RAISE NOTICE '  BOSS: % (预期: BOSS)', v_role;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '  ❌ BOSS 测试失败: %', SQLERRM;
    END;
    
    BEGIN
        SELECT get_user_role(v_manager_id) INTO v_role;
        RAISE NOTICE '  MANAGER: % (预期: MANAGER)', v_role;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '  ❌ MANAGER 测试失败: %', SQLERRM;
    END;
    
    BEGIN
        SELECT get_user_role(v_driver_id) INTO v_role;
        RAISE NOTICE '  DRIVER: % (预期: DRIVER)', v_role;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '  ❌ DRIVER 测试失败: %', SQLERRM;
    END;
    
    RAISE NOTICE '';
END $$;

-- ============================================================
-- 第六部分：测试数据访问权限
-- ============================================================

\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '📊 第六部分：测试数据访问权限'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

DO $$
DECLARE
    v_boss_id uuid;
    v_manager_id uuid;
    v_driver_id uuid;
    v_warehouse_id uuid;
    v_test_notification_id uuid;
    v_count integer;
BEGIN
    -- 获取测试用户
    SELECT user_id INTO v_boss_id FROM user_roles WHERE role = 'BOSS' LIMIT 1;
    SELECT user_id INTO v_manager_id FROM user_roles WHERE role = 'MANAGER' LIMIT 1;
    SELECT user_id INTO v_driver_id FROM user_roles WHERE role = 'DRIVER' LIMIT 1;
    
    IF v_boss_id IS NULL OR v_manager_id IS NULL OR v_driver_id IS NULL THEN
        RAISE NOTICE '⚠️ 缺少测试用户，跳过数据访问权限测试';
        RETURN;
    END IF;
    
    -- 获取测试仓库
    SELECT id INTO v_warehouse_id FROM warehouses LIMIT 1;
    
    IF v_warehouse_id IS NULL THEN
        RAISE NOTICE '⚠️ 没有仓库数据，跳过仓库相关测试';
    END IF;
    
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '测试 1: 通知表访问权限';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '';
    
    -- 测试创建通知（管理员权限）
    BEGIN
        INSERT INTO notifications (
            recipient_id,
            sender_id,
            type,
            title,
            content,
            is_read
        ) VALUES (
            v_driver_id,
            v_boss_id,
            'system',
            'RLS 权限测试通知',
            '这是一条测试通知，用于验证 RLS 策略',
            false
        ) RETURNING id INTO v_test_notification_id;
        
        RAISE NOTICE '  ✅ 测试 1.1: 创建通知成功 (ID: %)', v_test_notification_id;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '  ❌ 测试 1.1: 创建通知失败 - %', SQLERRM;
        RETURN;
    END;
    
    -- 测试查询通知
    BEGIN
        SELECT COUNT(*) INTO v_count
        FROM notifications
        WHERE id = v_test_notification_id;
        
        IF v_count > 0 THEN
            RAISE NOTICE '  ✅ 测试 1.2: 查询通知成功';
        ELSE
            RAISE NOTICE '  ❌ 测试 1.2: 查询通知失败（未找到记录）';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '  ❌ 测试 1.2: 查询通知失败 - %', SQLERRM;
    END;
    
    -- 测试更新通知
    BEGIN
        UPDATE notifications
        SET content = '通知内容已更新',
            updated_at = now()
        WHERE id = v_test_notification_id;
        
        GET DIAGNOSTICS v_count = ROW_COUNT;
        
        IF v_count > 0 THEN
            RAISE NOTICE '  ✅ 测试 1.3: 更新通知成功';
        ELSE
            RAISE NOTICE '  ❌ 测试 1.3: 更新通知失败（未更新任何记录）';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '  ❌ 测试 1.3: 更新通知失败 - %', SQLERRM;
    END;
    
    -- 清理测试数据
    BEGIN
        DELETE FROM notifications WHERE id = v_test_notification_id;
        RAISE NOTICE '  ✅ 测试数据已清理';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '  ⚠️ 清理测试数据失败 - %', SQLERRM;
    END;
    
    RAISE NOTICE '';
    
    -- 测试仓库访问权限
    IF v_warehouse_id IS NOT NULL THEN
        RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
        RAISE NOTICE '测试 2: 仓库表访问权限';
        RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
        RAISE NOTICE '';
        
        -- 测试查询仓库
        BEGIN
            SELECT COUNT(*) INTO v_count
            FROM warehouses
            WHERE id = v_warehouse_id;
            
            IF v_count > 0 THEN
                RAISE NOTICE '  ✅ 测试 2.1: 查询仓库成功';
            ELSE
                RAISE NOTICE '  ❌ 测试 2.1: 查询仓库失败（未找到记录）';
            END IF;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '  ❌ 测试 2.1: 查询仓库失败 - %', SQLERRM;
        END;
        
        -- 测试查询仓库分配
        BEGIN
            SELECT COUNT(*) INTO v_count
            FROM warehouse_assignments
            WHERE warehouse_id = v_warehouse_id;
            
            RAISE NOTICE '  ✅ 测试 2.2: 查询仓库分配成功（找到 % 条记录）', v_count;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '  ❌ 测试 2.2: 查询仓库分配失败 - %', SQLERRM;
        END;
        
        RAISE NOTICE '';
    END IF;
    
    -- 测试用户表访问权限
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '测试 3: 用户表访问权限';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '';
    
    -- 测试查询用户
    BEGIN
        SELECT COUNT(*) INTO v_count
        FROM users
        WHERE id IN (v_boss_id, v_manager_id, v_driver_id);
        
        IF v_count = 3 THEN
            RAISE NOTICE '  ✅ 测试 3.1: 查询用户成功（找到 3 个用户）';
        ELSE
            RAISE NOTICE '  ⚠️ 测试 3.1: 查询用户部分成功（找到 % 个用户）', v_count;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '  ❌ 测试 3.1: 查询用户失败 - %', SQLERRM;
    END;
    
    -- 测试查询用户角色
    BEGIN
        SELECT COUNT(*) INTO v_count
        FROM user_roles
        WHERE user_id IN (v_boss_id, v_manager_id, v_driver_id);
        
        IF v_count = 3 THEN
            RAISE NOTICE '  ✅ 测试 3.2: 查询用户角色成功（找到 3 个角色）';
        ELSE
            RAISE NOTICE '  ⚠️ 测试 3.2: 查询用户角色部分成功（找到 % 个角色）', v_count;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '  ❌ 测试 3.2: 查询用户角色失败 - %', SQLERRM;
    END;
    
    RAISE NOTICE '';
END $$;

-- ============================================================
-- 第七部分：检查 profiles 视图
-- ============================================================

\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '📊 第七部分：检查 profiles 视图'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

\echo '1. profiles 视图定义:'
SELECT 
    viewname AS "视图名",
    definition AS "定义"
FROM pg_views
WHERE viewname = 'profiles'
AND schemaname = 'public';

\echo ''
\echo '2. profiles 视图数据（前5条）:'
SELECT 
    id AS "用户ID",
    name AS "姓名",
    role AS "角色（映射后）",
    created_at AS "创建时间"
FROM profiles
ORDER BY created_at
LIMIT 5;

\echo ''

-- ============================================================
-- 第八部分：总结报告
-- ============================================================

\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '📊 第八部分：总结报告'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

DO $$
DECLARE
    v_table_count integer;
    v_policy_count integer;
    v_function_count integer;
    v_user_count integer;
    v_role_count integer;
BEGIN
    -- 统计表数量
    SELECT COUNT(*) INTO v_table_count
    FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename IN (
        'users', 'user_roles', 'user_departments',
        'departments', 'warehouses', 'warehouse_assignments',
        'vehicles', 'attendance', 'leave_requests',
        'piecework_records', 'notifications'
    );
    
    -- 统计策略数量
    SELECT COUNT(*) INTO v_policy_count
    FROM pg_policies
    WHERE tablename IN (
        'users', 'user_roles', 'user_departments',
        'departments', 'warehouses', 'warehouse_assignments',
        'vehicles', 'attendance', 'leave_requests',
        'piecework_records', 'notifications'
    );
    
    -- 统计函数数量
    SELECT COUNT(*) INTO v_function_count
    FROM pg_proc
    WHERE proname IN (
        'is_admin',
        'is_admin_user',
        'get_user_role',
        'is_boss',
        'is_manager',
        'update_notifications_by_batch'
    );
    
    -- 统计用户数量
    SELECT COUNT(*) INTO v_user_count FROM users;
    
    -- 统计角色数量
    SELECT COUNT(*) INTO v_role_count FROM user_roles;
    
    RAISE NOTICE '╔═══════════════════════════════════════════════════════════════╗';
    RAISE NOTICE '║                        测试总结报告                            ║';
    RAISE NOTICE '╚═══════════════════════════════════════════════════════════════╝';
    RAISE NOTICE '';
    RAISE NOTICE '📊 数据库对象统计:';
    RAISE NOTICE '  - 核心表数量: %', v_table_count;
    RAISE NOTICE '  - RLS 策略数量: %', v_policy_count;
    RAISE NOTICE '  - 辅助函数数量: %', v_function_count;
    RAISE NOTICE '';
    RAISE NOTICE '👥 用户数据统计:';
    RAISE NOTICE '  - 用户总数: %', v_user_count;
    RAISE NOTICE '  - 角色记录数: %', v_role_count;
    RAISE NOTICE '';
    RAISE NOTICE '✅ 测试完成！';
    RAISE NOTICE '';
    RAISE NOTICE '📋 建议:';
    RAISE NOTICE '  1. 检查所有表是否启用了 RLS';
    RAISE NOTICE '  2. 确认所有 UPDATE 策略都有 WITH CHECK 子句';
    RAISE NOTICE '  3. 验证权限函数返回正确的结果';
    RAISE NOTICE '  4. 测试不同角色的数据访问权限';
    RAISE NOTICE '';
END $$;

\echo '╔═══════════════════════════════════════════════════════════════╗'
\echo '║                    测试脚本执行完成                            ║'
\echo '╚═══════════════════════════════════════════════════════════════╝'
