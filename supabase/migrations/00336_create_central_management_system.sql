/*
# 创建中央管理系统数据库结构

## 1. 新建表

### tenants（租户表）
- id (uuid, 主键)
- company_name (text, 公司名称)
- tenant_code (text, 租户代码，唯一)
- contact_name (text, 联系人)
- contact_phone (text, 联系电话)
- contact_email (text, 联系邮箱)
- status (text, 状态：active/suspended/deleted)
- max_users (integer, 最大用户数)
- max_vehicles (integer, 最大车辆数)
- created_at (timestamptz, 创建时间)
- updated_at (timestamptz, 更新时间)
- activated_at (timestamptz, 激活时间)
- expired_at (timestamptz, 过期时间)
- notes (text, 备注)

### user_credentials（用户认证信息表）
- id (uuid, 主键)
- tenant_id (uuid, 外键 -> tenants)
- phone (text, 手机号，唯一)
- email (text, 邮箱，唯一)
- password_hash (text, 密码哈希)
- name (text, 姓名)
- role (text, 角色：boss/manager/driver)
- status (text, 状态：active/inactive)
- created_at (timestamptz, 创建时间)
- updated_at (timestamptz, 更新时间)
- last_login_at (timestamptz, 最后登录时间)

### system_admins（系统管理员表）
- id (uuid, 主键)
- name (text, 姓名)
- email (text, 邮箱，唯一)
- phone (text, 手机号)
- password_hash (text, 密码哈希)
- role (text, 角色：admin/super_admin)
- status (text, 状态：active/inactive)
- created_at (timestamptz, 创建时间)
- updated_at (timestamptz, 更新时间)
- last_login_at (timestamptz, 最后登录时间)

### tenant_modules（租户模块配置表）
- id (uuid, 主键)
- tenant_id (uuid, 外键 -> tenants)
- module_name (text, 模块名称)
- module_display_name (text, 模块显示名称)
- is_enabled (boolean, 是否启用)
- config (jsonb, 模块配置)
- created_at (timestamptz, 创建时间)
- updated_at (timestamptz, 更新时间)

### audit_logs（审计日志表）
- id (uuid, 主键)
- tenant_id (uuid, 外键 -> tenants)
- admin_id (uuid, 外键 -> system_admins)
- action (text, 操作类型)
- action_category (text, 操作分类)
- details (jsonb, 操作详情)
- ip_address (text, IP地址)
- user_agent (text, User Agent)
- status (text, 状态：success/failed)
- error_message (text, 错误信息)
- created_at (timestamptz, 创建时间)

## 2. 安全策略
- 所有表启用 RLS
- 暂时允许所有操作（后续会添加具体策略）

## 3. 索引
- 为常用查询字段创建索引
*/

-- 1. 创建租户表
CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  tenant_code TEXT UNIQUE NOT NULL,
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  max_users INTEGER DEFAULT 50,
  max_vehicles INTEGER DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  activated_at TIMESTAMPTZ,
  expired_at TIMESTAMPTZ,
  notes TEXT
);

CREATE INDEX idx_tenants_status ON public.tenants(status);
CREATE INDEX idx_tenants_tenant_code ON public.tenants(tenant_code);

COMMENT ON TABLE public.tenants IS '租户表 - 存储所有租户的基本信息';

-- 2. 创建用户认证信息表
CREATE TABLE IF NOT EXISTS public.user_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  phone TEXT,
  email TEXT,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ,
  CONSTRAINT check_login_method CHECK (phone IS NOT NULL OR email IS NOT NULL)
);

CREATE UNIQUE INDEX idx_user_credentials_phone ON public.user_credentials(phone) WHERE phone IS NOT NULL;
CREATE UNIQUE INDEX idx_user_credentials_email ON public.user_credentials(email) WHERE email IS NOT NULL;
CREATE INDEX idx_user_credentials_tenant_id ON public.user_credentials(tenant_id);
CREATE INDEX idx_user_credentials_status ON public.user_credentials(status);

COMMENT ON TABLE public.user_credentials IS '用户认证信息表 - 存储所有用户的登录凭证';

-- 3. 创建系统管理员表
CREATE TABLE IF NOT EXISTS public.system_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

CREATE INDEX idx_system_admins_email ON public.system_admins(email);
CREATE INDEX idx_system_admins_status ON public.system_admins(status);

COMMENT ON TABLE public.system_admins IS '系统管理员表';

-- 4. 创建租户模块配置表
CREATE TABLE IF NOT EXISTS public.tenant_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  module_name TEXT NOT NULL,
  module_display_name TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, module_name)
);

CREATE INDEX idx_tenant_modules_tenant_id ON public.tenant_modules(tenant_id);
CREATE INDEX idx_tenant_modules_is_enabled ON public.tenant_modules(is_enabled);

COMMENT ON TABLE public.tenant_modules IS '租户模块配置表';

-- 5. 创建审计日志表
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  admin_id UUID REFERENCES public.system_admins(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  action_category TEXT,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  status TEXT DEFAULT 'success',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_tenant_id ON public.audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_admin_id ON public.audit_logs(admin_id);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

COMMENT ON TABLE public.audit_logs IS '审计日志表';

-- 6. 启用 RLS（暂时允许所有操作）
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 暂时允许所有操作（开发阶段）
CREATE POLICY "允许所有操作_tenants" ON public.tenants FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "允许所有操作_user_credentials" ON public.user_credentials FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "允许所有操作_system_admins" ON public.system_admins FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "允许所有操作_tenant_modules" ON public.tenant_modules FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "允许所有操作_audit_logs" ON public.audit_logs FOR ALL USING (true) WITH CHECK (true);