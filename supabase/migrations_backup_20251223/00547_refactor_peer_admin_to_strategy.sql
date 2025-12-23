/*
# 重构PEER_ADMIN权限为策略模板实现

## 变更说明
将PEER_ADMIN的权限控制从独立权限表改为使用策略模板系统，统一权限管理方式。

## 主要变更
1. 创建user_permission_assignments表（权限映射表）
2. 添加permission_level字段，用于标识角色的不同权限级别
3. 创建PEER_ADMIN的策略模板（full_control和view_only）
4. 迁移现有peer_admin_permissions数据到新表
5. 更新is_admin()等权限检查函数
6. 更新PEER_ADMIN管理函数

## 执行时间
2025-12-01
*/

-- ============================================
-- 1. 创建user_permission_assignments表
-- ============================================

CREATE TABLE IF NOT EXISTS user_permission_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  strategy_id uuid NOT NULL REFERENCES permission_strategies(id) ON DELETE CASCADE,
  permission_level text,
  granted_by uuid NOT NULL REFERENCES users(id),
  granted_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  notes text,
  
  CONSTRAINT unique_user_strategy UNIQUE (user_id, strategy_id)
);

CREATE INDEX IF NOT EXISTS idx_user_permission_assignments_user_id ON user_permission_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permission_assignments_strategy_id ON user_permission_assignments(strategy_id);
CREATE INDEX IF NOT EXISTS idx_user_permission_assignments_permission_level ON user_permission_assignments(permission_level);
CREATE INDEX IF NOT EXISTS idx_user_permission_assignments_granted_by ON user_permission_assignments(granted_by);

COMMENT ON TABLE user_permission_assignments IS '用户权限分配表，用于将策略模板分配给用户';
COMMENT ON COLUMN user_permission_assignments.permission_level IS '权限级别，用于标识角色的不同权限级别（如full_control、view_only等）';

-- ============================================
-- 2. 修改strategy_type约束，添加view_only类型
-- ============================================

-- 删除旧的约束
ALTER TABLE permission_strategies DROP CONSTRAINT IF EXISTS permission_strategies_strategy_type_check;

-- 添加新的约束，包含view_only类型
ALTER TABLE permission_strategies 
ADD CONSTRAINT permission_strategies_strategy_type_check 
CHECK (strategy_type = ANY (ARRAY['all_access'::text, 'managed_resources'::text, 'own_data_only'::text, 'view_only'::text]));

-- 3. 创建PEER_ADMIN的策略模板
-- ============================================

-- 完整控制权策略
INSERT INTO permission_strategies (
  strategy_name,
  strategy_type,
  description,
  select_rule,
  insert_rule,
  update_rule,
  delete_rule,
  is_active
) VALUES (
  'peer_admin_full_control',
  'all_access',
  'PEER_ADMIN的完整控制权限，可以操作所有数据',
  'true',
  'true',
  'true',
  'true',
  true
) ON CONFLICT (strategy_name) DO NOTHING;

-- 仅查看权策略
INSERT INTO permission_strategies (
  strategy_name,
  strategy_type,
  description,
  select_rule,
  insert_rule,
  update_rule,
  delete_rule,
  is_active
) VALUES (
  'peer_admin_view_only',
  'view_only',
  'PEER_ADMIN的仅查看权限，只能查看所有数据，不能修改',
  'true',
  'false',
  'false',
  'false',
  true
) ON CONFLICT (strategy_name) DO NOTHING;

-- ============================================
-- 3. 迁移现有peer_admin_permissions数据
-- ============================================

-- 迁移完整控制权的PEER_ADMIN
INSERT INTO user_permission_assignments (
  user_id,
  strategy_id,
  permission_level,
  granted_by,
  granted_at,
  updated_at,
  notes
)
SELECT 
  pap.user_id,
  ps.id AS strategy_id,
  pap.permission_level,
  pap.granted_by,
  pap.granted_at,
  pap.updated_at,
  pap.notes
FROM peer_admin_permissions pap
JOIN permission_strategies ps ON ps.strategy_name = 'peer_admin_full_control'
WHERE pap.permission_level = 'full_control'
ON CONFLICT (user_id, strategy_id) DO NOTHING;

-- 迁移仅查看权的PEER_ADMIN
INSERT INTO user_permission_assignments (
  user_id,
  strategy_id,
  permission_level,
  granted_by,
  granted_at,
  updated_at,
  notes
)
SELECT 
  pap.user_id,
  ps.id AS strategy_id,
  pap.permission_level,
  pap.granted_by,
  pap.granted_at,
  pap.updated_at,
  pap.notes
FROM peer_admin_permissions pap
JOIN permission_strategies ps ON ps.strategy_name = 'peer_admin_view_only'
WHERE pap.permission_level = 'view_only'
ON CONFLICT (user_id, strategy_id) DO NOTHING;

-- ============================================
-- 4. 更新权限检查函数
-- ============================================

-- 删除旧的is_admin函数并重新创建
DROP FUNCTION IF EXISTS is_admin(uuid) CASCADE;

CREATE OR REPLACE FUNCTION is_admin(uid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- 检查是否为BOSS
  IF EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = uid AND role = 'BOSS'
  ) THEN
    RETURN true;
  END IF;
  
  -- 检查是否为有完整控制权的PEER_ADMIN（通过策略模板）
  IF EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN user_permission_assignments upa ON upa.user_id = ur.user_id
    JOIN permission_strategies ps ON ps.id = upa.strategy_id
    WHERE ur.user_id = uid 
      AND ur.role = 'PEER_ADMIN'
      AND ps.strategy_name = 'peer_admin_full_control'
      AND ps.is_active = true
  ) THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

COMMENT ON FUNCTION is_admin(uuid) IS '检查用户是否为管理员（BOSS或有完整控制权的PEER_ADMIN）';

-- 更新is_peer_admin函数
DROP FUNCTION IF EXISTS is_peer_admin(uuid) CASCADE;

CREATE OR REPLACE FUNCTION is_peer_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = p_user_id AND role = 'PEER_ADMIN'
  );
END;
$$;

COMMENT ON FUNCTION is_peer_admin(uuid) IS '检查用户是否为PEER_ADMIN';

-- 更新peer_admin_has_full_control函数
DROP FUNCTION IF EXISTS peer_admin_has_full_control(uuid) CASCADE;

CREATE OR REPLACE FUNCTION peer_admin_has_full_control(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_permission_assignments upa
    JOIN permission_strategies ps ON ps.id = upa.strategy_id
    WHERE upa.user_id = p_user_id 
      AND ps.strategy_name = 'peer_admin_full_control'
      AND ps.is_active = true
  );
END;
$$;

COMMENT ON FUNCTION peer_admin_has_full_control(uuid) IS '检查PEER_ADMIN是否有完整控制权';

-- 更新peer_admin_is_view_only函数
DROP FUNCTION IF EXISTS peer_admin_is_view_only(uuid) CASCADE;

CREATE OR REPLACE FUNCTION peer_admin_is_view_only(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_permission_assignments upa
    JOIN permission_strategies ps ON ps.id = upa.strategy_id
    WHERE upa.user_id = p_user_id 
      AND ps.strategy_name = 'peer_admin_view_only'
      AND ps.is_active = true
  );
END;
$$;

COMMENT ON FUNCTION peer_admin_is_view_only(uuid) IS '检查PEER_ADMIN是否只有查看权';

-- ============================================
-- 5. 更新PEER_ADMIN管理函数
-- ============================================

-- 删除旧的create_peer_admin函数并重新创建
DROP FUNCTION IF EXISTS create_peer_admin(uuid, text, uuid, text) CASCADE;

CREATE OR REPLACE FUNCTION create_peer_admin(
  p_user_id uuid,
  p_permission_level text,
  p_boss_id uuid,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_strategy_id uuid;
  v_assignment_id uuid;
BEGIN
  -- 检查操作者是否为BOSS
  IF NOT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = p_boss_id AND role = 'BOSS'
  ) THEN
    RAISE EXCEPTION '只有BOSS可以创建PEER_ADMIN';
  END IF;
  
  -- 检查用户是否存在
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_user_id) THEN
    RAISE EXCEPTION '用户不存在';
  END IF;
  
  -- 检查权限级别是否有效
  IF p_permission_level NOT IN ('full_control', 'view_only') THEN
    RAISE EXCEPTION '无效的权限级别';
  END IF;
  
  -- 检查用户是否已经是PEER_ADMIN
  IF EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = p_user_id AND role = 'PEER_ADMIN'
  ) THEN
    RAISE EXCEPTION '用户已经是PEER_ADMIN';
  END IF;
  
  -- 获取对应的策略ID
  SELECT id INTO v_strategy_id
  FROM permission_strategies
  WHERE strategy_name = CASE 
    WHEN p_permission_level = 'full_control' THEN 'peer_admin_full_control'
    WHEN p_permission_level = 'view_only' THEN 'peer_admin_view_only'
  END
  AND is_active = true;
  
  IF v_strategy_id IS NULL THEN
    RAISE EXCEPTION '找不到对应的权限策略';
  END IF;
  
  -- 添加PEER_ADMIN角色
  INSERT INTO user_roles (user_id, role)
  VALUES (p_user_id, 'PEER_ADMIN');
  
  -- 创建权限分配记录
  INSERT INTO user_permission_assignments (
    user_id, 
    strategy_id, 
    permission_level,
    granted_by, 
    notes
  )
  VALUES (
    p_user_id, 
    v_strategy_id, 
    p_permission_level,
    p_boss_id, 
    p_notes
  )
  RETURNING id INTO v_assignment_id;
  
  RETURN v_assignment_id;
END;
$$;

COMMENT ON FUNCTION create_peer_admin(uuid, text, uuid, text) IS '创建PEER_ADMIN（仅BOSS可用）';

-- 删除旧的update_peer_admin_permission函数并重新创建
DROP FUNCTION IF EXISTS update_peer_admin_permission(uuid, text, uuid, text) CASCADE;

CREATE OR REPLACE FUNCTION update_peer_admin_permission(
  p_user_id uuid,
  p_permission_level text,
  p_boss_id uuid,
  p_notes text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_strategy_id uuid;
  v_new_strategy_id uuid;
BEGIN
  -- 检查操作者是否为BOSS
  IF NOT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = p_boss_id AND role = 'BOSS'
  ) THEN
    RAISE EXCEPTION '只有BOSS可以更新PEER_ADMIN权限';
  END IF;
  
  -- 检查用户是否为PEER_ADMIN
  IF NOT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = p_user_id AND role = 'PEER_ADMIN'
  ) THEN
    RAISE EXCEPTION '用户不是PEER_ADMIN';
  END IF;
  
  -- 检查权限级别是否有效
  IF p_permission_level NOT IN ('full_control', 'view_only') THEN
    RAISE EXCEPTION '无效的权限级别';
  END IF;
  
  -- 获取旧的策略ID
  SELECT upa.strategy_id INTO v_old_strategy_id
  FROM user_permission_assignments upa
  JOIN permission_strategies ps ON ps.id = upa.strategy_id
  WHERE upa.user_id = p_user_id
    AND ps.strategy_name IN ('peer_admin_full_control', 'peer_admin_view_only')
  LIMIT 1;
  
  -- 获取新的策略ID
  SELECT id INTO v_new_strategy_id
  FROM permission_strategies
  WHERE strategy_name = CASE 
    WHEN p_permission_level = 'full_control' THEN 'peer_admin_full_control'
    WHEN p_permission_level = 'view_only' THEN 'peer_admin_view_only'
  END
  AND is_active = true;
  
  IF v_new_strategy_id IS NULL THEN
    RAISE EXCEPTION '找不到对应的权限策略';
  END IF;
  
  -- 如果策略相同，只更新备注
  IF v_old_strategy_id = v_new_strategy_id THEN
    UPDATE user_permission_assignments
    SET 
      updated_at = now(),
      notes = COALESCE(p_notes, notes)
    WHERE user_id = p_user_id AND strategy_id = v_old_strategy_id;
  ELSE
    -- 删除旧的权限分配
    DELETE FROM user_permission_assignments
    WHERE user_id = p_user_id AND strategy_id = v_old_strategy_id;
    
    -- 创建新的权限分配
    INSERT INTO user_permission_assignments (
      user_id,
      strategy_id,
      permission_level,
      granted_by,
      notes
    )
    VALUES (
      p_user_id,
      v_new_strategy_id,
      p_permission_level,
      p_boss_id,
      p_notes
    );
  END IF;
  
  RETURN true;
END;
$$;

COMMENT ON FUNCTION update_peer_admin_permission(uuid, text, uuid, text) IS '更新PEER_ADMIN权限级别（仅BOSS可用）';

-- 删除旧的remove_peer_admin函数并重新创建
DROP FUNCTION IF EXISTS remove_peer_admin(uuid, uuid) CASCADE;

CREATE OR REPLACE FUNCTION remove_peer_admin(
  p_user_id uuid,
  p_boss_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 检查操作者是否为BOSS
  IF NOT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = p_boss_id AND role = 'BOSS'
  ) THEN
    RAISE EXCEPTION '只有BOSS可以删除PEER_ADMIN';
  END IF;
  
  -- 检查用户是否为PEER_ADMIN
  IF NOT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = p_user_id AND role = 'PEER_ADMIN'
  ) THEN
    RAISE EXCEPTION '用户不是PEER_ADMIN';
  END IF;
  
  -- 删除权限分配（会自动级联删除）
  DELETE FROM user_permission_assignments upa
  USING permission_strategies ps
  WHERE upa.strategy_id = ps.id
    AND upa.user_id = p_user_id
    AND ps.strategy_name IN ('peer_admin_full_control', 'peer_admin_view_only');
  
  -- 删除PEER_ADMIN角色
  DELETE FROM user_roles
  WHERE user_id = p_user_id AND role = 'PEER_ADMIN';
  
  RETURN true;
END;
$$;

COMMENT ON FUNCTION remove_peer_admin(uuid, uuid) IS '删除PEER_ADMIN（仅BOSS可用）';

-- 删除旧的get_all_peer_admins函数并重新创建
DROP FUNCTION IF EXISTS get_all_peer_admins(uuid) CASCADE;

CREATE OR REPLACE FUNCTION get_all_peer_admins(p_boss_id uuid)
RETURNS TABLE (
  user_id uuid,
  user_name text,
  user_phone text,
  user_email text,
  permission_level text,
  granted_by uuid,
  granted_by_name text,
  granted_at timestamptz,
  notes text
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- 检查操作者是否为BOSS
  IF NOT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = p_boss_id AND role = 'BOSS'
  ) THEN
    RAISE EXCEPTION '只有BOSS可以查看PEER_ADMIN列表';
  END IF;
  
  RETURN QUERY
  SELECT
    u.id AS user_id,
    u.name AS user_name,
    u.phone AS user_phone,
    u.email AS user_email,
    upa.permission_level,
    upa.granted_by,
    boss.name AS granted_by_name,
    upa.granted_at,
    upa.notes
  FROM users u
  JOIN user_roles ur ON ur.user_id = u.id
  JOIN user_permission_assignments upa ON upa.user_id = u.id
  JOIN permission_strategies ps ON ps.id = upa.strategy_id
  LEFT JOIN users boss ON boss.id = upa.granted_by
  WHERE ur.role = 'PEER_ADMIN'
    AND ps.strategy_name IN ('peer_admin_full_control', 'peer_admin_view_only')
  ORDER BY upa.granted_at DESC;
END;
$$;

COMMENT ON FUNCTION get_all_peer_admins(uuid) IS '获取所有PEER_ADMIN列表（仅BOSS可用）';

-- 删除旧的get_peer_admin_permission函数并重新创建
DROP FUNCTION IF EXISTS get_peer_admin_permission(uuid) CASCADE;

CREATE OR REPLACE FUNCTION get_peer_admin_permission(p_user_id uuid)
RETURNS TABLE (
  user_id uuid,
  permission_level text,
  granted_by uuid,
  granted_by_name text,
  granted_at timestamptz,
  updated_at timestamptz,
  notes text
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    upa.user_id,
    upa.permission_level,
    upa.granted_by,
    u.name AS granted_by_name,
    upa.granted_at,
    upa.updated_at,
    upa.notes
  FROM user_permission_assignments upa
  JOIN permission_strategies ps ON ps.id = upa.strategy_id
  LEFT JOIN users u ON u.id = upa.granted_by
  WHERE upa.user_id = p_user_id
    AND ps.strategy_name IN ('peer_admin_full_control', 'peer_admin_view_only')
  LIMIT 1;
END;
$$;

COMMENT ON FUNCTION get_peer_admin_permission(uuid) IS '获取PEER_ADMIN权限详情';

-- ============================================
-- 6. 创建触发器
-- ============================================

-- 自动更新updated_at
CREATE OR REPLACE FUNCTION update_user_permission_assignments_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_user_permission_assignments_updated_at ON user_permission_assignments;
CREATE TRIGGER trigger_update_user_permission_assignments_updated_at
  BEFORE UPDATE ON user_permission_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_user_permission_assignments_updated_at();

-- 审计日志
CREATE OR REPLACE FUNCTION audit_user_permission_assignment_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_strategy_name text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT strategy_name INTO v_strategy_name
    FROM permission_strategies
    WHERE id = NEW.strategy_id;
    
    PERFORM log_permission_change(
      'peer_admin_created',
      NEW.user_id,
      NULL,
      jsonb_build_object(
        'permission_level', NEW.permission_level,
        'strategy_name', v_strategy_name,
        'granted_by', NEW.granted_by
      ),
      format('创建PEER_ADMIN，权限级别：%s', NEW.permission_level)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.permission_level IS DISTINCT FROM NEW.permission_level THEN
      PERFORM log_permission_change(
        'peer_admin_permission_changed',
        NEW.user_id,
        jsonb_build_object('permission_level', OLD.permission_level),
        jsonb_build_object('permission_level', NEW.permission_level),
        format('PEER_ADMIN权限级别从 %s 变更为 %s', OLD.permission_level, NEW.permission_level)
      );
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    SELECT strategy_name INTO v_strategy_name
    FROM permission_strategies
    WHERE id = OLD.strategy_id;
    
    PERFORM log_permission_change(
      'peer_admin_removed',
      OLD.user_id,
      jsonb_build_object(
        'permission_level', OLD.permission_level,
        'strategy_name', v_strategy_name,
        'granted_by', OLD.granted_by
      ),
      NULL,
      '删除PEER_ADMIN'
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trigger_audit_user_permission_assignment_change ON user_permission_assignments;
CREATE TRIGGER trigger_audit_user_permission_assignment_change
  AFTER INSERT OR UPDATE OR DELETE ON user_permission_assignments
  FOR EACH ROW
  EXECUTE FUNCTION audit_user_permission_assignment_change();

-- ============================================
-- 7. 创建RLS策略
-- ============================================

ALTER TABLE user_permission_assignments ENABLE ROW LEVEL SECURITY;

-- BOSS可以查看所有权限分配
CREATE POLICY "BOSS可以查看所有权限分配" ON user_permission_assignments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'BOSS'
    )
  );

-- BOSS可以管理所有权限分配
CREATE POLICY "BOSS可以管理所有权限分配" ON user_permission_assignments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'BOSS'
    )
  );

-- 用户可以查看自己的权限分配
CREATE POLICY "用户可以查看自己的权限分配" ON user_permission_assignments
  FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================
-- 8. 添加约束确保策略名称唯一
-- ============================================

-- 为permission_strategies表添加唯一约束（如果不存在）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'permission_strategies_strategy_name_key'
  ) THEN
    ALTER TABLE permission_strategies 
    ADD CONSTRAINT permission_strategies_strategy_name_key UNIQUE (strategy_name);
  END IF;
END $$;