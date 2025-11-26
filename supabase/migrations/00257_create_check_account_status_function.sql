/*
# 创建账号状态检查函数

## 功能
检查用户账号是否可以登录，并返回相应的状态信息。

## 返回值
- can_login: 是否可以登录
- status: 账号状态
- message: 提示信息
- role: 用户角色
- boss_id: 所属老板ID
- lease_end_date: 租约到期日期
*/

-- 创建账号状态检查函数
CREATE OR REPLACE FUNCTION check_account_status(user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_profile RECORD;
  main_account_profile RECORD;
  lease_info RECORD;
  result jsonb;
BEGIN
  -- 获取用户信息
  SELECT 
    id,
    name,
    phone,
    role,
    status,
    boss_id,
    main_account_id
  INTO user_profile
  FROM profiles
  WHERE id = user_id;
  
  -- 用户不存在
  IF user_profile IS NULL THEN
    RETURN jsonb_build_object(
      'can_login', false,
      'status', 'not_found',
      'message', '用户不存在'
    );
  END IF;
  
  -- 司机角色：不受租约限制，只检查账号状态
  IF user_profile.role = 'driver' THEN
    IF user_profile.status = 'active' THEN
      RETURN jsonb_build_object(
        'can_login', true,
        'status', 'active',
        'message', '登录成功',
        'role', 'driver'
      );
    ELSE
      RETURN jsonb_build_object(
        'can_login', false,
        'status', 'inactive',
        'message', '您的账号已被停用，请联系管理员',
        'role', 'driver'
      );
    END IF;
  END IF;
  
  -- 其他角色（super_admin、admin、lease_admin）：需要检查租约状态
  
  -- 确定主账号ID（用于查询租约）
  DECLARE
    tenant_boss_id uuid;
  BEGIN
    IF user_profile.role = 'super_admin' THEN
      -- 主账号或平级账号
      IF user_profile.main_account_id IS NOT NULL THEN
        -- 平级账号，使用主账号ID
        tenant_boss_id := user_profile.main_account_id;
      ELSE
        -- 主账号，使用自己的ID
        tenant_boss_id := user_profile.id;
      END IF;
    ELSIF user_profile.role = 'admin' THEN
      -- 车队长，使用 boss_id
      tenant_boss_id := user_profile.boss_id;
    ELSIF user_profile.role = 'lease_admin' THEN
      -- 租赁管理员，不受租约限制
      IF user_profile.status = 'active' THEN
        RETURN jsonb_build_object(
          'can_login', true,
          'status', 'active',
          'message', '登录成功',
          'role', 'lease_admin'
        );
      ELSE
        RETURN jsonb_build_object(
          'can_login', false,
          'status', 'inactive',
          'message', '您的账号已被停用',
          'role', 'lease_admin'
        );
      END IF;
    END IF;
    
    -- 查询租约信息
    SELECT 
      id,
      lease_end_date,
      monthly_fee
    INTO lease_info
    FROM leases
    WHERE boss_id = tenant_boss_id
    ORDER BY lease_end_date DESC
    LIMIT 1;
    
    -- 没有租约信息
    IF lease_info IS NULL THEN
      RETURN jsonb_build_object(
        'can_login', false,
        'status', 'no_lease',
        'message', '未找到租约信息，请联系管理员',
        'role', user_profile.role
      );
    END IF;
    
    -- 检查账号状态
    IF user_profile.status = 'inactive' THEN
      -- 账号已停用，检查是否因为租约过期
      IF lease_info.lease_end_date < CURRENT_DATE THEN
        -- 租约已过期
        IF user_profile.role = 'super_admin' AND user_profile.main_account_id IS NULL THEN
          -- 主账号（老板）
          RETURN jsonb_build_object(
            'can_login', false,
            'status', 'expired',
            'message', '您的账号已过期，请续费使用',
            'role', 'super_admin',
            'is_main_account', true,
            'lease_end_date', lease_info.lease_end_date
          );
        ELSE
          -- 平级账号或车队长
          RETURN jsonb_build_object(
            'can_login', false,
            'status', 'expired',
            'message', '您的账号已过期，请联系老板续费使用',
            'role', user_profile.role,
            'is_main_account', false,
            'lease_end_date', lease_info.lease_end_date
          );
        END IF;
      ELSE
        -- 租约未过期，但账号被停用（其他原因）
        RETURN jsonb_build_object(
          'can_login', false,
          'status', 'inactive',
          'message', '您的账号已被停用，请联系管理员',
          'role', user_profile.role
        );
      END IF;
    ELSE
      -- 账号状态为 active
      RETURN jsonb_build_object(
        'can_login', true,
        'status', 'active',
        'message', '登录成功',
        'role', user_profile.role,
        'lease_end_date', lease_info.lease_end_date
      );
    END IF;
  END;
END;
$$;

-- 添加函数注释
COMMENT ON FUNCTION check_account_status(uuid) IS '检查账号状态，返回是否可以登录及相应的提示信息';
