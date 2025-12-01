-- 检查当前 notifications 表的所有 RLS 策略
SELECT 
    schemaname AS "Schema",
    tablename AS "表名",
    policyname AS "策略名称",
    permissive AS "类型",
    roles AS "角色",
    cmd AS "命令",
    qual AS "USING条件",
    with_check AS "WITH CHECK条件"
FROM pg_policies
WHERE tablename = 'notifications'
ORDER BY cmd, policyname;

-- 检查 is_admin 函数
SELECT 
    proname AS "函数名",
    pg_get_functiondef(oid) AS "函数定义"
FROM pg_proc
WHERE proname = 'is_admin';

-- 检查 is_admin_user 函数
SELECT 
    proname AS "函数名",
    pg_get_functiondef(oid) AS "函数定义"
FROM pg_proc
WHERE proname = 'is_admin_user';

-- 测试当前用户是否为管理员
DO $$
DECLARE
    v_user_id uuid;
    v_is_admin_result boolean;
    v_is_admin_user_result boolean;
BEGIN
    -- 获取第一个 BOSS 用户
    SELECT user_id INTO v_user_id
    FROM user_roles
    WHERE role = 'BOSS'
    LIMIT 1;
    
    IF v_user_id IS NULL THEN
        RAISE NOTICE '❌ 未找到 BOSS 用户';
        RETURN;
    END IF;
    
    RAISE NOTICE '✅ 测试用户 ID: %', v_user_id;
    
    -- 测试 is_admin 函数
    BEGIN
        SELECT is_admin(v_user_id) INTO v_is_admin_result;
        RAISE NOTICE '✅ is_admin() 结果: %', v_is_admin_result;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ is_admin() 函数不存在或执行失败: %', SQLERRM;
    END;
    
    -- 测试 is_admin_user 函数
    BEGIN
        SELECT is_admin_user(v_user_id) INTO v_is_admin_user_result;
        RAISE NOTICE '✅ is_admin_user() 结果: %', v_is_admin_user_result;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ is_admin_user() 函数不存在或执行失败: %', SQLERRM;
    END;
    
    -- 测试直接查询 profiles
    BEGIN
        SELECT EXISTS (
            SELECT 1 FROM profiles
            WHERE id = v_user_id
            AND role IN ('BOSS', 'MANAGER')
        ) INTO v_is_admin_result;
        RAISE NOTICE '✅ 直接查询 profiles 结果: %', v_is_admin_result;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ 直接查询 profiles 失败: %', SQLERRM;
    END;
    
    -- 测试直接查询 user_roles
    BEGIN
        SELECT EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = v_user_id
            AND role IN ('BOSS', 'MANAGER')
        ) INTO v_is_admin_result;
        RAISE NOTICE '✅ 直接查询 user_roles 结果: %', v_is_admin_result;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ 直接查询 user_roles 失败: %', SQLERRM;
    END;
END $$;
