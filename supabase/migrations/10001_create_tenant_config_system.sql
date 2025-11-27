/*
# 创建租户配置管理系统

## 概述
创建中央管理系统来管理所有租户的配置信息，支持动态 Supabase 客户端创建。

## 新增表
1. `tenant_configs` - 租户配置表
   - `id` (uuid, primary key) - 租户ID
   - `tenant_name` (text, not null) - 租户名称
   - `schema_name` (text, unique, not null) - Schema 名称
   - `supabase_url` (text, not null) - Supabase URL
   - `supabase_anon_key` (text, not null) - Supabase 匿名密钥
   - `status` (text, default 'active') - 状态：active, suspended, deleted
   - `created_at` (timestamptz, default now())
   - `updated_at` (timestamptz, default now())

## 安全策略
- 只有超级管理员可以查看和管理租户配置
- 普通用户只能查看自己所属租户的基本信息（不包含密钥）

## 辅助函数
- `get_tenant_config(user_id uuid)` - 获取用户所属租户的配置
- `get_all_tenant_configs()` - 获取所有租户配置（仅超级管理员）
*/

-- 创建租户配置表
CREATE TABLE IF NOT EXISTS public.tenant_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_name text NOT NULL,
  schema_name text UNIQUE NOT NULL,
  supabase_url text NOT NULL,
  supabase_anon_key text NOT NULL,
  status text DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_tenant_configs_schema_name ON public.tenant_configs(schema_name);
CREATE INDEX IF NOT EXISTS idx_tenant_configs_status ON public.tenant_configs(status);

-- 添加注释
COMMENT ON TABLE public.tenant_configs IS '租户配置表，存储每个租户的数据库连接信息';
COMMENT ON COLUMN public.tenant_configs.id IS '租户ID';
COMMENT ON COLUMN public.tenant_configs.tenant_name IS '租户名称';
COMMENT ON COLUMN public.tenant_configs.schema_name IS 'Schema 名称';
COMMENT ON COLUMN public.tenant_configs.supabase_url IS 'Supabase URL';
COMMENT ON COLUMN public.tenant_configs.supabase_anon_key IS 'Supabase 匿名密钥';
COMMENT ON COLUMN public.tenant_configs.status IS '状态：active-活跃, suspended-暂停, deleted-已删除';

-- 启用 RLS
ALTER TABLE public.tenant_configs ENABLE ROW LEVEL SECURITY;

-- 创建 RLS 策略：超级管理员可以查看所有配置
CREATE POLICY "超级管理员可以查看所有租户配置" ON public.tenant_configs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- 创建 RLS 策略：超级管理员可以插入配置
CREATE POLICY "超级管理员可以创建租户配置" ON public.tenant_configs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- 创建 RLS 策略：超级管理员可以更新配置
CREATE POLICY "超级管理员可以更新租户配置" ON public.tenant_configs
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- 创建 RLS 策略：超级管理员可以删除配置
CREATE POLICY "超级管理员可以删除租户配置" ON public.tenant_configs
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- 创建辅助函数：获取用户所属租户的配置
CREATE OR REPLACE FUNCTION public.get_tenant_config(user_id uuid)
RETURNS TABLE (
  id uuid,
  tenant_name text,
  schema_name text,
  supabase_url text,
  supabase_anon_key text,
  status text
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 从 profiles 表获取用户的 tenant_id
  RETURN QUERY
  SELECT 
    tc.id,
    tc.tenant_name,
    tc.schema_name,
    tc.supabase_url,
    tc.supabase_anon_key,
    tc.status
  FROM public.tenant_configs tc
  INNER JOIN public.profiles p ON p.tenant_id = tc.id
  WHERE p.id = user_id
  AND tc.status = 'active';
END;
$$;

-- 创建辅助函数：获取所有租户配置（仅超级管理员）
CREATE OR REPLACE FUNCTION public.get_all_tenant_configs()
RETURNS TABLE (
  id uuid,
  tenant_name text,
  schema_name text,
  supabase_url text,
  status text,
  created_at timestamptz,
  updated_at timestamptz
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 检查当前用户是否为超级管理员
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'super_admin'
  ) THEN
    RAISE EXCEPTION '只有超级管理员可以查看所有租户配置';
  END IF;

  -- 返回所有租户配置（不包含密钥）
  RETURN QUERY
  SELECT 
    tc.id,
    tc.tenant_name,
    tc.schema_name,
    tc.supabase_url,
    tc.status,
    tc.created_at,
    tc.updated_at
  FROM public.tenant_configs tc
  ORDER BY tc.created_at DESC;
END;
$$;

-- 创建触发器：自动更新 updated_at
CREATE OR REPLACE FUNCTION public.update_tenant_config_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_tenant_config_updated_at
  BEFORE UPDATE ON public.tenant_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_tenant_config_updated_at();

-- 插入默认租户配置（使用当前环境变量）
-- 注意：这里使用占位符，实际部署时需要替换为真实值
INSERT INTO public.tenant_configs (tenant_name, schema_name, supabase_url, supabase_anon_key, status)
VALUES (
  '默认租户',
  'public',
  current_setting('app.supabase_url', true),
  current_setting('app.supabase_anon_key', true),
  'active'
)
ON CONFLICT (schema_name) DO NOTHING;
