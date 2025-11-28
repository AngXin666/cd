/*
# 修复 insert_tenant_profile 函数的角色类型问题

## 问题描述
- 租户 Schema 中的 profiles 表的 role 字段是 TEXT 类型，不是 user_role 枚举类型
- 函数错误地尝试将 TEXT 转换为 user_role 枚举类型
- 导致插入失败：column "role" of relation "profiles" does not exist

## 解决方案
- 移除类型转换，直接使用 TEXT 类型
- 租户 Schema 中的 profiles 表使用 TEXT + CHECK 约束来限制角色值

## 修改内容
- 更新 insert_tenant_profile 函数
- 移除 ::user_role 类型转换
*/

-- 删除旧函数
DROP FUNCTION IF EXISTS public.insert_tenant_profile(TEXT, UUID, TEXT, TEXT, TEXT, TEXT);

-- 创建修复后的函数
CREATE OR REPLACE FUNCTION public.insert_tenant_profile(
  p_schema_name TEXT,
  p_user_id UUID,
  p_name TEXT,
  p_phone TEXT,
  p_email TEXT,
  p_role TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 在租户 Schema 中插入 profile
  -- 租户 Schema 的 profiles 表使用 TEXT 类型的 role 字段
  EXECUTE format('
    INSERT INTO %I.profiles (id, name, phone, email, role, status)
    VALUES ($1, $2, $3, $4, $5, $6)
  ', p_schema_name)
  USING p_user_id, p_name, p_phone, p_email, p_role, 'active';
  
  RETURN jsonb_build_object('success', true);
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

COMMENT ON FUNCTION public.insert_tenant_profile(TEXT, UUID, TEXT, TEXT, TEXT, TEXT) IS '在租户 Schema 中插入用户 profile（使用 TEXT 类型的 role）';
