/*
# 修复 insert_tenant_profile 函数的角色类型转换问题

## 问题描述
- 函数在插入 profile 时，role 字段类型不匹配
- 数据库表的 role 字段是 user_role 枚举类型
- 函数传递的是 TEXT 类型，需要显式转换

## 解决方案
- 在 INSERT 语句中使用 CAST 将 TEXT 转换为 user_role 枚举类型
- 使用 $5::user_role 语法进行显式类型转换

## 修改内容
- 更新 insert_tenant_profile 函数
- 添加类型转换：p_role::user_role
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
  -- 使用 ::user_role 显式转换角色类型
  EXECUTE format('
    INSERT INTO %I.profiles (id, name, phone, email, role, status)
    VALUES ($1, $2, $3, $4, $5::user_role, $6)
  ', p_schema_name)
  USING p_user_id, p_name, p_phone, p_email, p_role, 'active';
  
  RETURN jsonb_build_object('success', true);
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

COMMENT ON FUNCTION public.insert_tenant_profile(TEXT, UUID, TEXT, TEXT, TEXT, TEXT) IS '在租户 Schema 中插入用户 profile（修复角色类型转换）';
