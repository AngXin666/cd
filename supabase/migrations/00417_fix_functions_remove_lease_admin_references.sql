/*
# 修复函数中的 lease_admin 引用

## 背景
删除 lease_admin 角色后，需要更新所有引用该角色的函数和触发器。

## 变更内容
1. 更新 auto_set_tenant_id 函数
2. 更新 auto_set_profile_tenant_id 函数

## 注意事项
- 删除所有 lease_admin 相关的逻辑
- 简化 tenant_id 的自动设置逻辑
*/

-- 1. 更新 auto_set_tenant_id 函数
CREATE OR REPLACE FUNCTION auto_set_tenant_id()
RETURNS TRIGGER AS $$
DECLARE
  user_role user_role;
  user_tenant_id uuid;
BEGIN
  -- 获取当前用户的角色和tenant_id
  SELECT p.role, p.tenant_id
  INTO user_role, user_tenant_id
  FROM profiles p
  WHERE p.id = auth.uid();

  -- 设置tenant_id
  NEW.tenant_id := user_tenant_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. 更新 auto_set_profile_tenant_id 函数
CREATE OR REPLACE FUNCTION auto_set_profile_tenant_id()
RETURNS TRIGGER AS $$
DECLARE
  creator_role user_role;
  creator_tenant_id uuid;
BEGIN
  -- 获取创建者的角色和tenant_id
  SELECT p.role, p.tenant_id
  INTO creator_role, creator_tenant_id
  FROM profiles p
  WHERE p.id = auth.uid();

  -- 如果新用户是super_admin，tenant_id设置为自己的id
  IF NEW.role = 'super_admin'::user_role THEN
    NEW.tenant_id := NEW.id;
  -- 否则，使用创建者的tenant_id
  ELSE
    NEW.tenant_id := creator_tenant_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION auto_set_tenant_id IS '自动设置记录的 tenant_id 为当前用户的 tenant_id';
COMMENT ON FUNCTION auto_set_profile_tenant_id IS '自动设置新用户的 tenant_id';
