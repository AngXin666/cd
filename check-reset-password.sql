-- ============================================
-- 重置密码功能诊断SQL脚本
-- ============================================

-- 1. 检查所有用户及其角色
SELECT 
    '=== 所有用户列表 ===' as info;
    
SELECT 
    p.id,
    p.name,
    p.phone,
    p.email,
    p.role,
    p.created_at,
    CASE 
        WHEN p.role = 'super_admin' THEN '✅ 超级管理员'
        WHEN p.role = 'manager' THEN '👤 普通管理员'
        WHEN p.role = 'driver' THEN '🚗 司机'
        ELSE '❓ 未知角色'
    END as role_display
FROM profiles p
ORDER BY p.created_at;

-- 2. 检查auth.users表中的用户
SELECT 
    '=== Auth用户列表 ===' as info;
    
SELECT 
    au.id,
    au.email,
    au.phone,
    au.created_at,
    au.confirmed_at,
    CASE 
        WHEN au.confirmed_at IS NOT NULL THEN '✅ 已确认'
        ELSE '❌ 未确认'
    END as status
FROM auth.users au
ORDER BY au.created_at;

-- 3. 检查profiles表的RLS策略
SELECT 
    '=== Profiles表的RLS策略 ===' as info;
    
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;

-- 4. 检查是否有超级管理员
SELECT 
    '=== 超级管理员检查 ===' as info;
    
SELECT 
    COUNT(*) as super_admin_count,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ 存在超级管理员'
        ELSE '❌ 没有超级管理员！需要手动设置'
    END as status
FROM profiles 
WHERE role = 'super_admin';

-- 5. 显示第一个注册的用户（应该是超级管理员）
SELECT 
    '=== 第一个注册的用户 ===' as info;
    
SELECT 
    p.id,
    p.name,
    p.phone,
    p.email,
    p.role,
    CASE 
        WHEN p.role = 'super_admin' THEN '✅ 正确：第一个用户是超级管理员'
        ELSE '❌ 错误：第一个用户不是超级管理员'
    END as check_result
FROM profiles p
ORDER BY p.created_at
LIMIT 1;

-- 6. 检查user_role枚举类型
SELECT 
    '=== 用户角色枚举类型 ===' as info;
    
SELECT 
    enumlabel as role_value
FROM pg_enum
WHERE enumtypid = 'user_role'::regtype
ORDER BY enumsortorder;

-- ============================================
-- 修复脚本（如果需要）
-- ============================================

-- 如果没有超级管理员，取消下面的注释并执行：
-- 方案1: 将第一个用户设置为超级管理员
/*
UPDATE profiles 
SET role = 'super_admin' 
WHERE id = (
    SELECT id FROM profiles 
    ORDER BY created_at 
    LIMIT 1
);
*/

-- 方案2: 将特定用户设置为超级管理员（替换YOUR_USER_ID）
/*
UPDATE profiles 
SET role = 'super_admin' 
WHERE id = 'YOUR_USER_ID';
*/

-- 方案3: 将特定手机号的用户设置为超级管理员（替换YOUR_PHONE）
/*
UPDATE profiles 
SET role = 'super_admin' 
WHERE phone = 'YOUR_PHONE';
*/

-- ============================================
-- 验证修复结果
-- ============================================

-- 执行修复后，运行此查询验证
/*
SELECT 
    '=== 验证修复结果 ===' as info;
    
SELECT 
    id,
    name,
    phone,
    email,
    role,
    CASE 
        WHEN role = 'super_admin' THEN '✅ 成功设置为超级管理员'
        ELSE '❌ 仍然不是超级管理员'
    END as result
FROM profiles
WHERE role = 'super_admin';
*/
