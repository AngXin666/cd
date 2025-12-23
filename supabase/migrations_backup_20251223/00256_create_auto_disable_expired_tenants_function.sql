/*
# 创建自动停用过期租户的函数

## 功能
1. 检查所有租户的租约到期时间
2. 如果租约到期超过1天，自动停用该租户的所有账号（除了司机）
3. 司机账号不受影响，可以继续登录

## 停用规则
- 老板账号（super_admin，main_account_id IS NULL）：停用
- 平级账号（super_admin，main_account_id IS NOT NULL）：停用
- 车队长账号（admin）：停用
- 司机账号（driver）：不停用

## 使用方法
手动调用：SELECT disable_expired_tenants();
或设置定时任务每天自动执行
*/

-- 创建自动停用过期租户的函数
CREATE OR REPLACE FUNCTION disable_expired_tenants()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  expired_lease RECORD;
  affected_count int := 0;
  total_disabled int := 0;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '🔍 开始检查过期租户';
  RAISE NOTICE '检查时间: %', NOW();
  RAISE NOTICE '========================================';
  
  -- 查找所有过期的租约（到期日期 < 今天）
  FOR expired_lease IN
    SELECT 
      l.id as lease_id,
      l.boss_id,
      l.lease_end_date,
      p.name as boss_name,
      p.phone as boss_phone,
      p.status as current_status
    FROM leases l
    JOIN profiles p ON l.boss_id = p.id
    WHERE l.lease_end_date < CURRENT_DATE  -- 到期日期小于今天
      AND p.status = 'active'  -- 只处理当前状态为 active 的账号
      AND p.role = 'super_admin'
      AND p.main_account_id IS NULL  -- 只查找主账号
    ORDER BY l.lease_end_date
  LOOP
    RAISE NOTICE '';
    RAISE NOTICE '📋 发现过期租户:';
    RAISE NOTICE '  - 老板: % (%)', expired_lease.boss_name, expired_lease.boss_phone;
    RAISE NOTICE '  - 租约到期日期: %', expired_lease.lease_end_date;
    RAISE NOTICE '  - 已过期天数: %', CURRENT_DATE - expired_lease.lease_end_date;
    
    -- 停用该租户的所有账号（除了司机）
    -- 包括：主账号、平级账号、车队长
    WITH disabled_accounts AS (
      UPDATE profiles
      SET 
        status = 'inactive',
        updated_at = NOW()
      WHERE (
        -- 主账号
        (id = expired_lease.boss_id AND role = 'super_admin')
        OR
        -- 平级账号
        (main_account_id = expired_lease.boss_id AND role = 'super_admin')
        OR
        -- 车队长（boss_id 指向主账号）
        (boss_id = expired_lease.boss_id AND role = 'admin')
      )
      AND status = 'active'  -- 只停用当前为 active 的账号
      RETURNING id, name, role
    )
    SELECT COUNT(*) INTO affected_count FROM disabled_accounts;
    
    total_disabled := total_disabled + affected_count;
    
    RAISE NOTICE '  ✅ 已停用 % 个账号（老板、平级账号、车队长）', affected_count;
    RAISE NOTICE '  ℹ️  司机账号不受影响，可以继续登录';
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ 检查完成';
  RAISE NOTICE '总共停用账号数: %', total_disabled;
  RAISE NOTICE '========================================';
  
  RETURN jsonb_build_object(
    'success', true,
    'message', '过期租户检查完成',
    'total_disabled', total_disabled,
    'check_time', NOW()
  );
END;
$$;

-- 添加函数注释
COMMENT ON FUNCTION disable_expired_tenants() IS '自动停用过期租户的账号（老板、平级账号、车队长），司机不受影响';
