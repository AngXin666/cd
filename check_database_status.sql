-- 检查数据库当前状态
-- 用于验证 migration 修复后的数据库配置

-- 1. 检查所有表的 RLS 状态
SELECT 
    schemaname,
    tablename,
    CASE 
        WHEN rowsecurity THEN '✅ 启用'
        ELSE '❌ 禁用'
    END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename IN (
        'profiles',
        'driver_warehouses',
        'manager_warehouses',
        'warehouses',
        'attendance',
        'piece_work_records',
        'leave_applications',
        'feedback',
        'vehicles',
        'vehicle_records'
    )
ORDER BY tablename;

-- 2. 检查 driver_warehouses 表的策略
SELECT 
    policyname as "策略名称",
    cmd as "操作类型",
    CASE 
        WHEN permissive = 'PERMISSIVE' THEN '允许'
        ELSE '限制'
    END as "策略类型",
    roles as "适用角色"
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename = 'driver_warehouses'
ORDER BY policyname;

-- 3. 检查是否存在测试账号
SELECT 
    id,
    phone,
    email,
    role,
    real_name,
    created_at
FROM profiles
WHERE phone IN ('13800000000', '13800000001', '13800000002')
ORDER BY phone;

-- 4. 检查仓库数据
SELECT 
    id,
    name,
    address,
    is_active,
    daily_target,
    created_at
FROM warehouses
ORDER BY created_at
LIMIT 5;

-- 5. 检查司机仓库分配情况
SELECT 
    dw.id,
    p.phone as "司机手机号",
    p.real_name as "司机姓名",
    w.name as "仓库名称",
    dw.created_at as "分配时间"
FROM driver_warehouses dw
LEFT JOIN profiles p ON dw.driver_id = p.id
LEFT JOIN warehouses w ON dw.warehouse_id = w.id
ORDER BY dw.created_at DESC
LIMIT 10;

-- 6. 检查管理员仓库分配情况
SELECT 
    mw.id,
    p.phone as "管理员手机号",
    p.real_name as "管理员姓名",
    w.name as "仓库名称",
    mw.created_at as "分配时间"
FROM manager_warehouses mw
LEFT JOIN profiles p ON mw.manager_id = p.id
LEFT JOIN warehouses w ON mw.warehouse_id = w.id
ORDER BY mw.created_at DESC
LIMIT 10;

-- 7. 检查是否存在 notifications 表（排查之前的错误）
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications'
) as "notifications表是否存在";

-- 8. 检查所有表的列表
SELECT 
    table_name as "表名",
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as "字段数"
FROM information_schema.tables t
WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
ORDER BY table_name;
