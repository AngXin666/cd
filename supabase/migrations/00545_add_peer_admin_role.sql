/*
# 添加PEER_ADMIN角色和权限控制系统

## 说明
1. 添加PEER_ADMIN角色到user_role枚举
2. 创建权限级别表（permission_levels）
3. 创建PEER_ADMIN权限检查函数
4. 更新RLS策略支持PEER_ADMIN
5. 创建BOSS管理PEER_ADMIN的函数

## 权限说明
- PEER_ADMIN：对等管理员，权限范围与BOSS相同
- 受BOSS控制：BOSS可以创建、管理和删除PEER_ADMIN
- 权限级别：
  - full_control：完整控制权（可以管理所有数据和用户）
  - view_only：仅查看权（只能查看数据，不能修改）

## 执行时间
2025-12-01
*/

-- ============================================
-- 1. 添加PEER_ADMIN角色到枚举
-- ============================================

-- 添加新角色到user_role枚举
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'PEER_ADMIN';

-- ============================================
-- 2. 创建权限级别表
-- ============================================

-- 创建权限级别表
CREATE TABLE IF NOT EXISTS peer_admin_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission_level text NOT NULL DEFAULT 'view_only',
  granted_by uuid NOT NULL REFERENCES users(id),
  granted_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  notes text,
  
  CONSTRAINT valid_permission_level CHECK (permission_level IN ('full_control', 'view_only')),
  CONSTRAINT unique_user_permission UNIQUE (user_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_peer_admin_permissions_user_id ON peer_admin_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_peer_admin_permissions_granted_by ON peer_admin_permissions(granted_by);
CREATE INDEX IF NOT EXISTS idx_peer_admin_permissions_level ON peer_admin_permissions(permission_level);

-- 添加注释
COMMENT ON TABLE peer_admin_permissions IS 'PEER_ADMIN权限级别表';
COMMENT ON COLUMN peer_admin_permissions.user_id IS '用户ID';
COMMENT ON COLUMN peer_admin_permissions.permission_level IS '权限级别：full_control=完整控制权, view_only=仅查看权';
COMMENT ON COLUMN peer_admin_permissions.granted_by IS '授权人ID（BOSS）';
COMMENT ON COLUMN peer_admin_permissions.granted_at IS '授权时间';
COMMENT ON COLUMN peer_admin_permissions.notes IS '备注';

-- 启用RLS
ALTER TABLE peer_admin_permissions ENABLE ROW LEVEL SECURITY;

-- 创建RLS策略
CREATE POLICY "BOSS可以查看所有PEER_ADMIN权限" ON peer_admin_permissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'BOSS'
    )
  );

CREATE POLICY "BOSS可以管理PEER_ADMIN权限" ON peer_admin_permissions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'BOSS'
    )
  );

CREATE POLICY "PEER_ADMIN可以查看自己的权限" ON peer_admin_permissions
  FOR SELECT
  USING (user_id = auth.uid());

-- ============================================
-- 3. 创建PEER_ADMIN权限检查函数
-- ============================================

-- 检查用户是否为PEER_ADMIN
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

COMMENT ON FUNCTION is_peer_admin IS '检查用户是否为PEER_ADMIN';

-- 检查PEER_ADMIN是否有完整控制权
CREATE OR REPLACE FUNCTION peer_admin_has_full_control(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM peer_admin_permissions
    WHERE user_id = p_user_id 
      AND permission_level = 'full_control'
  );
END;
$$;

COMMENT ON FUNCTION peer_admin_has_full_control IS '检查PEER_ADMIN是否有完整控制权';

-- 检查PEER_ADMIN是否只有查看权
CREATE OR REPLACE FUNCTION peer_admin_is_view_only(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM peer_admin_permissions
    WHERE user_id = p_user_id 
      AND permission_level = 'view_only'
  );
END;
$$;

COMMENT ON FUNCTION peer_admin_is_view_only IS '检查PEER_ADMIN是否只有查看权';

-- 检查用户是否为BOSS或有完整控制权的PEER_ADMIN
CREATE OR REPLACE FUNCTION is_boss_or_full_control_peer_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- 检查是否为BOSS
  IF EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = p_user_id AND role = 'BOSS'
  ) THEN
    RETURN true;
  END IF;
  
  -- 检查是否为有完整控制权的PEER_ADMIN
  IF EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN peer_admin_permissions pap ON pap.user_id = ur.user_id
    WHERE ur.user_id = p_user_id 
      AND ur.role = 'PEER_ADMIN'
      AND pap.permission_level = 'full_control'
  ) THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

COMMENT ON FUNCTION is_boss_or_full_control_peer_admin IS '检查用户是否为BOSS或有完整控制权的PEER_ADMIN';

-- ============================================
-- 4. 创建BOSS管理PEER_ADMIN的函数
-- ============================================

-- 创建PEER_ADMIN
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
  v_permission_id uuid;
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
  
  -- 添加PEER_ADMIN角色
  INSERT INTO user_roles (user_id, role)
  VALUES (p_user_id, 'PEER_ADMIN');
  
  -- 创建权限记录
  INSERT INTO peer_admin_permissions (user_id, permission_level, granted_by, notes)
  VALUES (p_user_id, p_permission_level, p_boss_id, p_notes)
  RETURNING id INTO v_permission_id;
  
  RETURN v_permission_id;
END;
$$;

COMMENT ON FUNCTION create_peer_admin IS '创建PEER_ADMIN（仅BOSS可用）';

-- 更新PEER_ADMIN权限级别
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
  
  -- 更新权限级别
  UPDATE peer_admin_permissions
  SET 
    permission_level = p_permission_level,
    updated_at = now(),
    notes = COALESCE(p_notes, notes)
  WHERE user_id = p_user_id;
  
  RETURN true;
END;
$$;

COMMENT ON FUNCTION update_peer_admin_permission IS '更新PEER_ADMIN权限级别（仅BOSS可用）';

-- 删除PEER_ADMIN
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
  
  -- 删除PEER_ADMIN角色
  DELETE FROM user_roles
  WHERE user_id = p_user_id AND role = 'PEER_ADMIN';
  
  -- 删除权限记录（通过外键自动删除）
  -- DELETE FROM peer_admin_permissions WHERE user_id = p_user_id;
  
  RETURN true;
END;
$$;

COMMENT ON FUNCTION remove_peer_admin IS '删除PEER_ADMIN（仅BOSS可用）';

-- 获取所有PEER_ADMIN列表
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
    pap.permission_level,
    pap.granted_by,
    boss.name AS granted_by_name,
    pap.granted_at,
    pap.notes
  FROM users u
  JOIN user_roles ur ON ur.user_id = u.id
  JOIN peer_admin_permissions pap ON pap.user_id = u.id
  LEFT JOIN users boss ON boss.id = pap.granted_by
  WHERE ur.role = 'PEER_ADMIN'
  ORDER BY pap.granted_at DESC;
END;
$$;

COMMENT ON FUNCTION get_all_peer_admins IS '获取所有PEER_ADMIN列表（仅BOSS可用）';

-- 获取PEER_ADMIN权限详情
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
    pap.user_id,
    pap.permission_level,
    pap.granted_by,
    u.name AS granted_by_name,
    pap.granted_at,
    pap.updated_at,
    pap.notes
  FROM peer_admin_permissions pap
  LEFT JOIN users u ON u.id = pap.granted_by
  WHERE pap.user_id = p_user_id;
END;
$$;

COMMENT ON FUNCTION get_peer_admin_permission IS '获取PEER_ADMIN权限详情';

-- ============================================
-- 5. 更新现有的is_admin函数以支持PEER_ADMIN
-- ============================================

-- 更新is_admin函数，使其包含有完整控制权的PEER_ADMIN
CREATE OR REPLACE FUNCTION is_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- 检查是否为BOSS
  IF EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = p_user_id AND role = 'BOSS'
  ) THEN
    RETURN true;
  END IF;
  
  -- 检查是否为有完整控制权的PEER_ADMIN
  IF EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN peer_admin_permissions pap ON pap.user_id = ur.user_id
    WHERE ur.user_id = p_user_id 
      AND ur.role = 'PEER_ADMIN'
      AND pap.permission_level = 'full_control'
  ) THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

COMMENT ON FUNCTION is_admin IS '检查用户是否为管理员（BOSS或有完整控制权的PEER_ADMIN）';

-- ============================================
-- 6. 创建触发器自动更新updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_peer_admin_permissions_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_peer_admin_permissions_updated_at ON peer_admin_permissions;
CREATE TRIGGER trigger_update_peer_admin_permissions_updated_at
  BEFORE UPDATE ON peer_admin_permissions
  FOR EACH ROW
  EXECUTE FUNCTION update_peer_admin_permissions_updated_at();

-- ============================================
-- 7. 创建审计日志
-- ============================================

-- 记录PEER_ADMIN权限变更
CREATE OR REPLACE FUNCTION audit_peer_admin_permission_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_permission_change(
      'peer_admin_created',
      NEW.user_id,
      NULL,
      jsonb_build_object(
        'permission_level', NEW.permission_level,
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
    PERFORM log_permission_change(
      'peer_admin_removed',
      OLD.user_id,
      jsonb_build_object(
        'permission_level', OLD.permission_level,
        'granted_by', OLD.granted_by
      ),
      NULL,
      '删除PEER_ADMIN'
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trigger_audit_peer_admin_permission_change ON peer_admin_permissions;
CREATE TRIGGER trigger_audit_peer_admin_permission_change
  AFTER INSERT OR UPDATE OR DELETE ON peer_admin_permissions
  FOR EACH ROW
  EXECUTE FUNCTION audit_peer_admin_permission_change();