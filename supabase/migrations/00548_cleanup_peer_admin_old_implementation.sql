/*
# 清理PEER_ADMIN旧实现

## 清理内容
1. 删除peer_admin_permissions表
2. 删除相关触发器函数
3. 清理不再使用的代码

## 说明
由于已经将PEER_ADMIN权限迁移到策略模板系统（user_permission_assignments表），
现在可以安全地删除旧的独立权限表和相关功能。

## 执行时间
2025-12-01
*/

-- ============================================
-- 1. 删除触发器
-- ============================================

-- 删除审计日志触发器
DROP TRIGGER IF EXISTS trigger_audit_peer_admin_permission_change ON peer_admin_permissions;

-- 删除自动更新触发器
DROP TRIGGER IF EXISTS trigger_update_peer_admin_permissions_updated_at ON peer_admin_permissions;

-- ============================================
-- 2. 删除触发器函数
-- ============================================

-- 删除审计日志函数
DROP FUNCTION IF EXISTS audit_peer_admin_permission_change() CASCADE;

-- 删除自动更新函数
DROP FUNCTION IF EXISTS update_peer_admin_permissions_updated_at() CASCADE;

-- ============================================
-- 3. 删除peer_admin_permissions表
-- ============================================

-- 删除表（会自动删除所有索引和约束）
DROP TABLE IF EXISTS peer_admin_permissions CASCADE;

-- ============================================
-- 4. 验证清理结果
-- ============================================

-- 验证表已删除
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name = 'peer_admin_permissions'
  ) THEN
    RAISE EXCEPTION 'peer_admin_permissions表删除失败';
  END IF;
  
  RAISE NOTICE 'peer_admin_permissions表已成功删除';
END $$;

-- 验证触发器函数已删除
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'audit_peer_admin_permission_change'
  ) THEN
    RAISE EXCEPTION 'audit_peer_admin_permission_change函数删除失败';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'update_peer_admin_permissions_updated_at'
  ) THEN
    RAISE EXCEPTION 'update_peer_admin_permissions_updated_at函数删除失败';
  END IF;
  
  RAISE NOTICE '所有相关函数已成功删除';
END $$;
