-- =====================================================
-- 验证 app_user 权限配置
-- =====================================================

-- 1. 检查用户是否存在
SELECT 
    rolname AS "用户名",
    rolsuper AS "超级用户",
    rolcreaterole AS "创建角色权限",
    rolcreatedb AS "创建数据库权限"
FROM pg_roles
WHERE rolname = 'app_user';

-- 2. 统计已授权的表
SELECT COUNT(DISTINCT table_name) AS "已授权表数量"
FROM information_schema.table_privileges
WHERE grantee = 'app_user'
AND table_schema = 'public';

-- 3. 统计已授权的序列
SELECT COUNT(DISTINCT object_name) AS "已授权序列数量"
FROM information_schema.usage_privileges
WHERE grantee = 'app_user'
AND object_schema = 'public'
AND object_type = 'SEQUENCE';

-- 4. 查看具体授权的权限类型
SELECT DISTINCT privilege_type AS "权限类型"
FROM information_schema.table_privileges
WHERE grantee = 'app_user'
AND table_schema = 'public'
ORDER BY privilege_type;

-- 5. 验证禁止的权限（应该返回空）
SELECT 
    CASE 
        WHEN has_table_privilege('app_user', 'users', 'TRUNCATE') THEN '⚠️ 有 TRUNCATE 权限'
        ELSE '✅ 无 TRUNCATE 权限'
    END AS "TRUNCATE检查",
    CASE 
        WHEN pg_has_role('app_user', 'pg_write_server_files', 'USAGE') THEN '⚠️ 有文件写入权限'
        ELSE '✅ 无文件写入权限'
    END AS "文件写入检查";
