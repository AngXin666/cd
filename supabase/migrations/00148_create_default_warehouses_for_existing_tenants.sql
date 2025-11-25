
/*
# 为现有的老板账号创建默认仓库

## 问题
新建的老板账号没有自动创建默认仓库，导致用户管理页面没有仓库显示。

## 解决方案
1. 为所有没有仓库的老板账号创建默认仓库
2. 自动分配仓库给老板

## 影响范围
- 为所有主账号（老板）创建默认仓库
- 自动分配仓库到 manager_warehouses 表
*/

-- 为所有没有仓库的主账号（老板）创建默认仓库
DO $$
DECLARE
  tenant_record RECORD;
  new_warehouse_id uuid;
BEGIN
  -- 查找所有主账号（老板）：role = 'super_admin' AND main_account_id IS NULL
  FOR tenant_record IN 
    SELECT 
      p.id,
      p.name,
      p.company_name,
      p.tenant_id
    FROM profiles p
    WHERE p.role = 'super_admin'::user_role
      AND p.main_account_id IS NULL
      -- 只处理没有仓库的老板
      AND NOT EXISTS (
        SELECT 1 FROM manager_warehouses mw WHERE mw.manager_id = p.id
      )
  LOOP
    -- 创建默认仓库
    INSERT INTO warehouses (name, tenant_id, is_active)
    VALUES (
      COALESCE(tenant_record.company_name, tenant_record.name) || '的仓库',
      tenant_record.tenant_id,
      true
    )
    RETURNING id INTO new_warehouse_id;

    -- 分配仓库给老板
    INSERT INTO manager_warehouses (manager_id, warehouse_id, tenant_id)
    VALUES (
      tenant_record.id,
      new_warehouse_id,
      tenant_record.tenant_id
    );

    RAISE NOTICE '为老板 % (ID: %) 创建了默认仓库 (ID: %)', 
      tenant_record.name, tenant_record.id, new_warehouse_id;
  END LOOP;
END $$;
