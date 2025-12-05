/*
# 数据库优化 Step 2: 简化权限系统

## 目标
从13张权限表减少到2张核心表

## 保留的表（2张）
1. users - 包含role字段（BOSS/PEER_ADMIN/MANAGER/DRIVER）
2. user_roles - 用户角色映射表（如需多角色支持）

## 删除的表（11张）
权限系统过度设计，实际使用基于users.role的简单判断即可

## 策略
保留基于 users.role 的RLS策略，删除复杂的权限表结构
*/

-- 1. 删除过度设计的权限表
DROP TABLE IF EXISTS permission_strategies CASCADE;
DROP TABLE IF EXISTS resource_permissions CASCADE;
DROP TABLE IF EXISTS role_permission_mappings CASCADE;
DROP TABLE IF EXISTS role_permissions CASCADE;
DROP TABLE IF EXISTS permissions CASCADE;
DROP TABLE IF EXISTS peer_admin_permissions CASCADE;
DROP TABLE IF EXISTS user_permission_assignments CASCADE;
DROP TABLE IF EXISTS user_permission_cache CASCADE;
DROP TABLE IF EXISTS user_permissions CASCADE;
DROP TABLE IF EXISTS permission_audit_logs CASCADE;
DROP TABLE IF EXISTS security_audit_log CASCADE;

-- 2. 保留必要的表
-- ✅ users (包含role字段)
-- ✅ user_roles (多角色映射，如果需要的话)
-- ✅ roles (角色定义表，仅存储角色元数据)

-- 3. 验证清理结果
DO $$
DECLARE
    permission_table_count integer;
    total_tables integer;
BEGIN
    -- 统计权限相关表
    SELECT COUNT(*) INTO permission_table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND (
        table_name LIKE '%permission%'
        OR table_name LIKE '%audit%'
    );
    
    -- 统计总表数
    SELECT COUNT(*) INTO total_tables
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE';
    
    RAISE NOTICE '📊 剩余权限相关表: % 个', permission_table_count;
    RAISE NOTICE '📊 数据库总表数: % 个', total_tables;
    
    IF permission_table_count <= 3 THEN
        RAISE NOTICE '✅ 权限系统已成功简化';
    ELSE
        RAISE WARNING '⚠️ 仍有较多权限表: %', permission_table_count;
    END IF;
END $$;

COMMENT ON TABLE users IS '用户表 - 使用role字段进行权限控制（BOSS/PEER_ADMIN/MANAGER/DRIVER）';
COMMENT ON TABLE user_roles IS '用户角色映射表 - 支持一个用户拥有多个角色的场景';
