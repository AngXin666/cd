CREATE OR REPLACE FUNCTION create_tenant_schema(p_schema_name TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- 1. 创建 Schema
  EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', p_schema_name);
  
  -- 2. 创建 profiles 表（新增 permission_type 和 managed_by 字段）
  EXECUTE format('
    CREATE TABLE %I.profiles (
      id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      role TEXT NOT NULL DEFAULT ''driver'',
      permission_type TEXT DEFAULT ''full'',
      status TEXT DEFAULT ''active'',
      vehicle_plate TEXT,
      warehouse_ids UUID[],
      managed_by UUID,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      
      CONSTRAINT valid_role CHECK (role IN (''boss'', ''peer'', ''fleet_leader'', ''driver'')),
      CONSTRAINT valid_permission CHECK (permission_type IN (''full'', ''readonly'')),
      CONSTRAINT valid_status CHECK (status IN (''active'', ''inactive''))
    );
    CREATE INDEX idx_profiles_role ON %I.profiles(role);
    CREATE INDEX idx_profiles_status ON %I.profiles(status);
    CREATE INDEX idx_profiles_permission_type ON %I.profiles(permission_type);
    CREATE INDEX idx_profiles_managed_by ON %I.profiles(managed_by);
    
    COMMENT ON COLUMN %I.profiles.role IS ''角色：boss=老板, peer=平级账号, fleet_leader=车队长, driver=司机'';
    COMMENT ON COLUMN %I.profiles.permission_type IS ''权限类型：full=完整权限, readonly=只读权限'';
    COMMENT ON COLUMN %I.profiles.warehouse_ids IS ''管辖的仓库ID列表（车队长使用）'';
    COMMENT ON COLUMN %I.profiles.managed_by IS ''管理者ID（用于车队长的管辖关系）'';
  ', p_schema_name, p_schema_name, p_schema_name, p_schema_name, p_schema_name, 
     p_schema_name, p_schema_name, p_schema_name, p_schema_name);
  
  -- 3. 创建 vehicles 表
  EXECUTE format('
    CREATE TABLE %I.vehicles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      plate_number TEXT UNIQUE NOT NULL,
      driver_id UUID REFERENCES %I.profiles(id),
      warehouse_id UUID,
      status TEXT DEFAULT ''active'',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      
      CONSTRAINT valid_vehicle_status CHECK (status IN (''active'', ''inactive'', ''maintenance''))
    );
    CREATE INDEX idx_vehicles_driver_id ON %I.vehicles(driver_id);
    CREATE INDEX idx_vehicles_warehouse_id ON %I.vehicles(warehouse_id);
    
    COMMENT ON COLUMN %I.vehicles.warehouse_id IS ''所属仓库ID（用于车队长管辖范围）'';
  ', p_schema_name, p_schema_name, p_schema_name, p_schema_name, p_schema_name);
  
  -- 4. 创建 attendance 表
  EXECUTE format('
    CREATE TABLE %I.attendance (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES %I.profiles(id),
      check_in_time TIMESTAMPTZ,
      check_out_time TIMESTAMPTZ,
      status TEXT DEFAULT ''normal'',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      
      CONSTRAINT valid_attendance_status CHECK (status IN (''normal'', ''late'', ''absent'', ''leave''))
    );
    CREATE INDEX idx_attendance_user_id ON %I.attendance(user_id);
    CREATE INDEX idx_attendance_check_in_time ON %I.attendance(check_in_time);
  ', p_schema_name, p_schema_name, p_schema_name, p_schema_name);
  
  -- 5. 创建 warehouses 表
  EXECUTE format('
    CREATE TABLE %I.warehouses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  ', p_schema_name);
  
  -- 6. 创建 leave_requests 表
  EXECUTE format('
    CREATE TABLE %I.leave_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES %I.profiles(id),
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      reason TEXT,
      status TEXT DEFAULT ''pending'',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      
      CONSTRAINT valid_leave_status CHECK (status IN (''pending'', ''approved'', ''rejected''))
    );
    CREATE INDEX idx_leave_requests_user_id ON %I.leave_requests(user_id);
    CREATE INDEX idx_leave_requests_status ON %I.leave_requests(status);
  ', p_schema_name, p_schema_name, p_schema_name, p_schema_name);
  
  -- 7. 创建 piecework_records 表
  EXECUTE format('
    CREATE TABLE %I.piecework_records (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES %I.profiles(id),
      work_date DATE NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price DECIMAL(10,2) NOT NULL,
      total_amount DECIMAL(10,2) NOT NULL,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX idx_piecework_records_user_id ON %I.piecework_records(user_id);
    CREATE INDEX idx_piecework_records_work_date ON %I.piecework_records(work_date);
  ', p_schema_name, p_schema_name, p_schema_name, p_schema_name);
  
  -- 8. 创建辅助函数：检查用户是否有完整权限
  EXECUTE format('
    CREATE OR REPLACE FUNCTION %I.has_full_permission(user_id UUID)
    RETURNS BOOLEAN
    LANGUAGE sql
    SECURITY DEFINER
    STABLE
    AS $func$
      SELECT EXISTS (
        SELECT 1 FROM %I.profiles
        WHERE id = user_id
          AND role IN (''boss'', ''peer'', ''fleet_leader'')
          AND permission_type = ''full''
          AND status = ''active''
      );
    $func$;
  ', p_schema_name, p_schema_name);
  
  -- 9. 创建辅助函数：检查用户是否可以查看某个用户
  EXECUTE format('
    CREATE OR REPLACE FUNCTION %I.can_view_user(viewer_id UUID, target_user_id UUID)
    RETURNS BOOLEAN
    LANGUAGE sql
    SECURITY DEFINER
    STABLE
    AS $func$
      SELECT EXISTS (
        SELECT 1 FROM %I.profiles viewer
        LEFT JOIN %I.profiles target ON target.id = target_user_id
        WHERE viewer.id = viewer_id
          AND viewer.status = ''active''
          AND (
            -- 老板和完整/只读权限平级账号可以查看所有用户
            (viewer.role IN (''boss'', ''peer''))
            OR
            -- 车队长可以查看管辖范围内的用户
            (viewer.role = ''fleet_leader'' AND target.warehouse_ids && viewer.warehouse_ids)
            OR
            -- 司机只能查看自己
            (viewer.role = ''driver'' AND viewer.id = target_user_id)
          )
      );
    $func$;
  ', p_schema_name, p_schema_name, p_schema_name);
  
  -- 10. 创建辅助函数：检查用户是否可以管理某个用户
  EXECUTE format('
    CREATE OR REPLACE FUNCTION %I.can_manage_user(manager_id UUID, target_user_id UUID)
    RETURNS BOOLEAN
    LANGUAGE sql
    SECURITY DEFINER
    STABLE
    AS $func$
      SELECT EXISTS (
        SELECT 1 FROM %I.profiles manager
        LEFT JOIN %I.profiles target ON target.id = target_user_id
        WHERE manager.id = manager_id
          AND manager.status = ''active''
          AND manager.permission_type = ''full''
          AND (
            -- 老板和完整权限平级账号可以管理所有用户
            (manager.role IN (''boss'', ''peer''))
            OR
            -- 完整权限车队长可以管理管辖范围内的用户
            (manager.role = ''fleet_leader'' AND target.warehouse_ids && manager.warehouse_ids)
          )
      );
    $func$;
  ', p_schema_name, p_schema_name, p_schema_name);
  
  -- 11. 设置 profiles 表的 RLS 策略
  EXECUTE format('ALTER TABLE %I.profiles ENABLE ROW LEVEL SECURITY', p_schema_name);
  
  -- 策略1：查看用户
  EXECUTE format('
    DROP POLICY IF EXISTS "查看用户" ON %I.profiles;
    CREATE POLICY "查看用户" ON %I.profiles
      FOR SELECT TO authenticated
      USING (%I.can_view_user(auth.uid(), id));
  ', p_schema_name, p_schema_name, p_schema_name);
  
  -- 策略2：更新用户
  EXECUTE format('
    DROP POLICY IF EXISTS "更新用户" ON %I.profiles;
    CREATE POLICY "更新用户" ON %I.profiles
      FOR UPDATE TO authenticated
      USING (
        -- 可以更新自己的信息
        auth.uid() = id
        OR
        -- 或者有管理权限
        %I.can_manage_user(auth.uid(), id)
      );
  ', p_schema_name, p_schema_name, p_schema_name);
  
  -- 策略3：插入用户
  EXECUTE format('
    DROP POLICY IF EXISTS "插入用户" ON %I.profiles;
    CREATE POLICY "插入用户" ON %I.profiles
      FOR INSERT TO authenticated
      WITH CHECK (%I.has_full_permission(auth.uid()));
  ', p_schema_name, p_schema_name, p_schema_name);
  
  -- 策略4：删除用户
  EXECUTE format('
    DROP POLICY IF EXISTS "删除用户" ON %I.profiles;
    CREATE POLICY "删除用户" ON %I.profiles
      FOR DELETE TO authenticated
      USING (%I.can_manage_user(auth.uid(), id));
  ', p_schema_name, p_schema_name, p_schema_name);
  
  -- 12. 设置 vehicles 表的 RLS 策略
  EXECUTE format('ALTER TABLE %I.vehicles ENABLE ROW LEVEL SECURITY', p_schema_name);
  
  EXECUTE format('
    DROP POLICY IF EXISTS "查看车辆" ON %I.vehicles;
    CREATE POLICY "查看车辆" ON %I.vehicles
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM %I.profiles p
          WHERE p.id = auth.uid()
            AND p.status = ''active''
            AND (
              -- 老板和平级账号可以查看所有车辆
              p.role IN (''boss'', ''peer'')
              OR
              -- 车队长可以查看管辖范围内的车辆
              (p.role = ''fleet_leader'' AND warehouse_id = ANY(p.warehouse_ids))
              OR
              -- 司机可以查看自己的车辆
              (p.role = ''driver'' AND driver_id = auth.uid())
            )
        )
      );
  ', p_schema_name, p_schema_name, p_schema_name);
  
  EXECUTE format('
    DROP POLICY IF EXISTS "管理车辆" ON %I.vehicles;
    CREATE POLICY "管理车辆" ON %I.vehicles
      FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM %I.profiles p
          WHERE p.id = auth.uid()
            AND p.status = ''active''
            AND p.permission_type = ''full''
            AND (
              -- 老板和完整权限平级账号可以管理所有车辆
              p.role IN (''boss'', ''peer'')
              OR
              -- 完整权限车队长可以管理管辖范围内的车辆
              (p.role = ''fleet_leader'' AND warehouse_id = ANY(p.warehouse_ids))
            )
        )
      );
  ', p_schema_name, p_schema_name, p_schema_name);
  
  -- 13. 设置 attendance 表的 RLS 策略
  EXECUTE format('ALTER TABLE %I.attendance ENABLE ROW LEVEL SECURITY', p_schema_name);
  
  EXECUTE format('
    DROP POLICY IF EXISTS "查看考勤" ON %I.attendance;
    CREATE POLICY "查看考勤" ON %I.attendance
      FOR SELECT TO authenticated
      USING (
        -- 可以查看自己的考勤
        user_id = auth.uid()
        OR
        -- 或者有查看权限
        EXISTS (
          SELECT 1 FROM %I.profiles manager
          LEFT JOIN %I.profiles target ON target.id = user_id
          WHERE manager.id = auth.uid()
            AND manager.status = ''active''
            AND (
              manager.role IN (''boss'', ''peer'')
              OR
              (manager.role = ''fleet_leader'' AND target.warehouse_ids && manager.warehouse_ids)
            )
        )
      );
  ', p_schema_name, p_schema_name, p_schema_name, p_schema_name);
  
  EXECUTE format('
    DROP POLICY IF EXISTS "管理考勤" ON %I.attendance;
    CREATE POLICY "管理考勤" ON %I.attendance
      FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM %I.profiles manager
          LEFT JOIN %I.profiles target ON target.id = user_id
          WHERE manager.id = auth.uid()
            AND manager.status = ''active''
            AND manager.permission_type = ''full''
            AND (
              manager.role IN (''boss'', ''peer'')
              OR
              (manager.role = ''fleet_leader'' AND target.warehouse_ids && manager.warehouse_ids)
            )
        )
      );
  ', p_schema_name, p_schema_name, p_schema_name, p_schema_name);
  
  -- 14. 设置 warehouses 表的 RLS 策略
  EXECUTE format('ALTER TABLE %I.warehouses ENABLE ROW LEVEL SECURITY', p_schema_name);
  
  EXECUTE format('
    DROP POLICY IF EXISTS "查看仓库" ON %I.warehouses;
    CREATE POLICY "查看仓库" ON %I.warehouses
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM %I.profiles p
          WHERE p.id = auth.uid()
            AND p.status = ''active''
            AND (
              -- 老板和平级账号可以查看所有仓库
              p.role IN (''boss'', ''peer'')
              OR
              -- 车队长可以查看管辖的仓库
              (p.role = ''fleet_leader'' AND id = ANY(p.warehouse_ids))
            )
        )
      );
  ', p_schema_name, p_schema_name, p_schema_name);
  
  EXECUTE format('
    DROP POLICY IF EXISTS "管理仓库" ON %I.warehouses;
    CREATE POLICY "管理仓库" ON %I.warehouses
      FOR ALL TO authenticated
      USING (%I.has_full_permission(auth.uid()) AND EXISTS (
        SELECT 1 FROM %I.profiles p
        WHERE p.id = auth.uid() AND p.role IN (''boss'', ''peer'')
      ));
  ', p_schema_name, p_schema_name, p_schema_name, p_schema_name);
  
  -- 15. 设置 leave_requests 表的 RLS 策略
  EXECUTE format('ALTER TABLE %I.leave_requests ENABLE ROW LEVEL SECURITY', p_schema_name);
  
  EXECUTE format('
    DROP POLICY IF EXISTS "查看请假申请" ON %I.leave_requests;
    CREATE POLICY "查看请假申请" ON %I.leave_requests
      FOR SELECT TO authenticated
      USING (
        -- 可以查看自己的请假申请
        user_id = auth.uid()
        OR
        -- 或者有查看权限
        EXISTS (
          SELECT 1 FROM %I.profiles manager
          LEFT JOIN %I.profiles target ON target.id = user_id
          WHERE manager.id = auth.uid()
            AND manager.status = ''active''
            AND (
              manager.role IN (''boss'', ''peer'')
              OR
              (manager.role = ''fleet_leader'' AND target.warehouse_ids && manager.warehouse_ids)
            )
        )
      );
  ', p_schema_name, p_schema_name, p_schema_name, p_schema_name);
  
  EXECUTE format('
    DROP POLICY IF EXISTS "创建请假申请" ON %I.leave_requests;
    CREATE POLICY "创建请假申请" ON %I.leave_requests
      FOR INSERT TO authenticated
      WITH CHECK (user_id = auth.uid());
  ', p_schema_name, p_schema_name);
  
  EXECUTE format('
    DROP POLICY IF EXISTS "审批请假申请" ON %I.leave_requests;
    CREATE POLICY "审批请假申请" ON %I.leave_requests
      FOR UPDATE TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM %I.profiles manager
          LEFT JOIN %I.profiles target ON target.id = user_id
          WHERE manager.id = auth.uid()
            AND manager.status = ''active''
            AND manager.permission_type = ''full''
            AND (
              manager.role IN (''boss'', ''peer'')
              OR
              (manager.role = ''fleet_leader'' AND target.warehouse_ids && manager.warehouse_ids)
            )
        )
      );
  ', p_schema_name, p_schema_name, p_schema_name, p_schema_name);
  
  -- 16. 设置 piecework_records 表的 RLS 策略
  EXECUTE format('ALTER TABLE %I.piecework_records ENABLE ROW LEVEL SECURITY', p_schema_name);
  
  EXECUTE format('
    DROP POLICY IF EXISTS "查看计件记录" ON %I.piecework_records;
    CREATE POLICY "查看计件记录" ON %I.piecework_records
      FOR SELECT TO authenticated
      USING (
        -- 可以查看自己的计件记录
        user_id = auth.uid()
        OR
        -- 或者有查看权限
        EXISTS (
          SELECT 1 FROM %I.profiles manager
          LEFT JOIN %I.profiles target ON target.id = user_id
          WHERE manager.id = auth.uid()
            AND manager.status = ''active''
            AND (
              manager.role IN (''boss'', ''peer'')
              OR
              (manager.role = ''fleet_leader'' AND target.warehouse_ids && manager.warehouse_ids)
            )
        )
      );
  ', p_schema_name, p_schema_name, p_schema_name, p_schema_name);
  
  EXECUTE format('
    DROP POLICY IF EXISTS "管理计件记录" ON %I.piecework_records;
    CREATE POLICY "管理计件记录" ON %I.piecework_records
      FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM %I.profiles manager
          LEFT JOIN %I.profiles target ON target.id = user_id
          WHERE manager.id = auth.uid()
            AND manager.status = ''active''
            AND manager.permission_type = ''full''
            AND (
              manager.role IN (''boss'', ''peer'')
              OR
              (manager.role = ''fleet_leader'' AND target.warehouse_ids && manager.warehouse_ids)
            )
        )
      );
  ', p_schema_name, p_schema_name, p_schema_name, p_schema_name);
  
  RETURN jsonb_build_object('success', true, 'schema_name', p_schema_name);
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

COMMENT ON FUNCTION create_tenant_schema(TEXT) IS '创建租户 Schema 和所有必需的表，包含完整的角色权限 RLS 策略';
