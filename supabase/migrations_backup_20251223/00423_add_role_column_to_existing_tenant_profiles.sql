/*
# 给现有租户的 profiles 表添加 role 列

## 问题描述
- 现有租户（tenant_001）的 profiles 表没有 role 列
- 导致 insert_tenant_profile 函数插入失败
- 错误信息：column "role" of relation "profiles" does not exist

## 解决方案
- 给所有现有租户的 profiles 表添加 role 列
- 设置默认值为 'driver'
- 添加 CHECK 约束限制角色值

## 修改内容
- 遍历所有租户 Schema
- 给每个 Schema 的 profiles 表添加 role 列
*/

DO $$
DECLARE
  v_tenant RECORD;
  v_column_exists BOOLEAN;
BEGIN
  -- 遍历所有租户
  FOR v_tenant IN 
    SELECT schema_name 
    FROM public.tenants 
    WHERE status = 'active' AND schema_name IS NOT NULL
  LOOP
    -- 检查 role 列是否已存在
    SELECT EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_schema = v_tenant.schema_name 
        AND table_name = 'profiles' 
        AND column_name = 'role'
    ) INTO v_column_exists;
    
    -- 如果列不存在，添加它
    IF NOT v_column_exists THEN
      RAISE NOTICE '给租户 % 的 profiles 表添加 role 列', v_tenant.schema_name;
      
      -- 添加 role 列
      EXECUTE format('
        ALTER TABLE %I.profiles 
        ADD COLUMN role TEXT NOT NULL DEFAULT ''driver''
      ', v_tenant.schema_name);
      
      -- 添加 CHECK 约束
      EXECUTE format('
        ALTER TABLE %I.profiles 
        ADD CONSTRAINT valid_role CHECK (role IN (''boss'', ''peer'', ''fleet_leader'', ''driver''))
      ', v_tenant.schema_name);
      
      -- 创建索引
      EXECUTE format('
        CREATE INDEX idx_profiles_role ON %I.profiles(role)
      ', v_tenant.schema_name);
      
      -- 添加注释
      EXECUTE format('
        COMMENT ON COLUMN %I.profiles.role IS ''角色：boss=老板, peer=平级账号, fleet_leader=车队长, driver=司机''
      ', v_tenant.schema_name);
      
      RAISE NOTICE '✅ 租户 % 的 profiles 表 role 列添加成功', v_tenant.schema_name;
    ELSE
      RAISE NOTICE 'ℹ️ 租户 % 的 profiles 表已有 role 列，跳过', v_tenant.schema_name;
    END IF;
  END LOOP;
  
  RAISE NOTICE '✅ 所有租户的 profiles 表 role 列检查完成';
END $$;