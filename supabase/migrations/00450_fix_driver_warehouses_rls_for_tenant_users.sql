/*
# 修复 driver_warehouses 和 manager_warehouses 表的 RLS 策略，允许租户用户插入数据

## 问题描述
租户用户（boss、peer、fleet_leader）尝试插入数据到 `public.driver_warehouses` 表时，违反了 RLS 策略。

## 根本原因
1. 租户用户不在 `public.profiles` 中，只在租户 Schema 中有记录
2. `is_admin()` 和 `is_manager()` 函数只检查 `public.profiles` 表
3. RLS 策略使用这些函数，导致租户用户无法插入数据

## 解决方案
1. 创建新函数 `is_tenant_admin()`，检查用户是否在任何租户 Schema 中有管理员权限
2. 更新 `driver_warehouses` 和 `manager_warehouses` 表的 RLS 策略，允许租户管理员插入数据

## 安全考虑
- 租户管理员（boss、peer、fleet_leader）应该可以管理自己租户的数据
- 司机（driver）不应该有权限插入数据
- 中央管理员（super_admin）应该可以管理所有数据

*/

-- 创建函数：检查用户是否在任何租户 Schema 中有管理员权限
CREATE OR REPLACE FUNCTION is_tenant_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  tenant_record RECORD;
  user_role text;
BEGIN
  -- 首先检查 public.profiles 中的角色
  SELECT role INTO user_role
  FROM profiles
  WHERE id = p_user_id;
  
  IF user_role IN ('super_admin', 'boss') THEN
    RETURN true;
  END IF;
  
  -- 检查租户 Schema 中的角色
  FOR tenant_record IN 
    SELECT schema_name 
    FROM tenants 
    WHERE schema_name IS NOT NULL
  LOOP
    BEGIN
      EXECUTE format(
        'SELECT role FROM %I.profiles WHERE id = $1',
        tenant_record.schema_name
      ) INTO user_role USING p_user_id;
      
      IF user_role IN ('boss', 'peer', 'fleet_leader') THEN
        RETURN true;
      END IF;
    EXCEPTION
      WHEN undefined_table THEN
        -- 租户 Schema 中没有 profiles 表，跳过
        CONTINUE;
      WHEN OTHERS THEN
        -- 其他错误，跳过
        CONTINUE;
    END;
  END LOOP;
  
  RETURN false;
END;
$$;

-- 删除旧的 RLS 策略
DROP POLICY IF EXISTS "Admins and managers can manage driver warehouses" ON driver_warehouses;
DROP POLICY IF EXISTS "Admins can manage driver warehouses" ON driver_warehouses;
DROP POLICY IF EXISTS "Admins and managers can manage manager warehouses" ON manager_warehouses;
DROP POLICY IF EXISTS "Admins can manage manager warehouses" ON manager_warehouses;

-- 创建新的 RLS 策略：允许租户管理员管理 driver_warehouses
CREATE POLICY "Tenant admins can manage driver warehouses"
ON driver_warehouses
FOR ALL
TO public
USING (is_tenant_admin(auth.uid()))
WITH CHECK (is_tenant_admin(auth.uid()));

-- 创建新的 RLS 策略：允许租户管理员管理 manager_warehouses
CREATE POLICY "Tenant admins can manage manager warehouses"
ON manager_warehouses
FOR ALL
TO public
USING (is_tenant_admin(auth.uid()))
WITH CHECK (is_tenant_admin(auth.uid()));

-- 保留原有的 SELECT 策略
-- driver_warehouses 的 SELECT 策略已经存在，不需要修改
-- manager_warehouses 的 SELECT 策略已经存在，不需要修改
