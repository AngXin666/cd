# 独立数据库多租户架构设计方案

## 📋 架构概述

### 核心理念
每个租户拥有**完全独立的 Supabase 项目**，实现真正的物理隔离：
- ✅ 独立的 PostgreSQL 数据库
- ✅ 独立的 API 端点
- ✅ 独立的存储空间
- ✅ 独立的认证系统
- ✅ 独立的备份和恢复

### 架构优势
1. **完全隔离**：租户之间零数据交叉
2. **独立扩展**：每个租户可以独立升级配置
3. **安全性高**：一个租户的安全问题不影响其他租户
4. **合规性好**：满足数据主权和隐私要求
5. **故障隔离**：一个租户的故障不影响其他租户

## 🏗️ 整体架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        中央管理系统                               │
│                   (Supabase Project: Central)                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  数据库内容：                                                     │
│  • tenants (租户表)                                               │
│  • tenant_connections (租户连接信息表 - 加密)                    │
│  • system_admins (系统管理员表)                                   │
│  • audit_logs (审计日志表)                                        │
│  • tenant_modules (租户模块配置表)                                │
│                                                                   │
│  功能：                                                           │
│  • 租户创建和管理                                                 │
│  • 通过 Supabase Management API 创建新项目                       │
│  • 存储和管理租户连接信息                                         │
│  • 系统监控和审计                                                 │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ 管理
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                         租户项目集群                              │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────────┐  ┌──────────────────────────┐
│   租户1 Supabase 项目     │  │   租户2 Supabase 项目     │
│  (Project: tenant-001)    │  │  (Project: tenant-002)    │
├──────────────────────────┤  ├──────────────────────────┤
│                          │  │                          │
│  独立数据库：             │  │  独立数据库：             │
│  • profiles              │  │  • profiles              │
│  • vehicles              │  │  • vehicles              │
│  • attendance            │  │  • attendance            │
│  • warehouses            │  │  • warehouses            │
│  • ...                   │  │  • ...                   │
│                          │  │                          │
│  独立 API：               │  │  独立 API：               │
│  • REST API              │  │  • REST API              │
│  • Realtime              │  │  • Realtime              │
│  • Storage               │  │  • Storage               │
│                          │  │                          │
│  独立认证：               │  │  独立认证：               │
│  • Auth Users            │  │  • Auth Users            │
│  • JWT Tokens            │  │  • JWT Tokens            │
│                          │  │                          │
└──────────────────────────┘  └──────────────────────────┘

┌──────────────────────────┐  ┌──────────────────────────┐
│   租户3 Supabase 项目     │  │   租户N Supabase 项目     │
│  (Project: tenant-003)    │  │  (Project: tenant-xxx)    │
└──────────────────────────┘  └──────────────────────────┘
```

## 🗄️ 中央管理系统数据库设计

### 1. tenants（租户表）

```sql
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 基本信息
  company_name TEXT NOT NULL,                 -- 公司名称
  tenant_code TEXT UNIQUE NOT NULL,           -- 租户代码（如：tenant-001）
  
  -- 联系信息
  contact_name TEXT,                          -- 联系人姓名
  contact_phone TEXT,                         -- 联系电话
  contact_email TEXT,                         -- 联系邮箱
  
  -- Supabase 项目信息
  supabase_project_id TEXT UNIQUE,            -- Supabase 项目 ID
  supabase_project_ref TEXT UNIQUE,           -- Supabase 项目引用
  project_region TEXT DEFAULT 'ap-northeast-1', -- 项目区域
  
  -- 状态和配额
  status TEXT NOT NULL DEFAULT 'active',      -- 状态：active, suspended, deleted
  plan_type TEXT DEFAULT 'free',              -- 计划类型：free, pro, enterprise
  max_users INTEGER DEFAULT 50,               -- 最大用户数
  max_vehicles INTEGER DEFAULT 100,           -- 最大车辆数
  storage_limit_gb INTEGER DEFAULT 1,         -- 存储限制（GB）
  
  -- 时间信息
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  activated_at TIMESTAMPTZ,                   -- 激活时间
  expired_at TIMESTAMPTZ,                     -- 过期时间
  
  -- 其他
  notes TEXT,                                 -- 备注
  metadata JSONB                              -- 元数据
);

-- 索引
CREATE INDEX idx_tenants_status ON public.tenants(status);
CREATE INDEX idx_tenants_tenant_code ON public.tenants(tenant_code);
CREATE INDEX idx_tenants_expired_at ON public.tenants(expired_at);

-- 注释
COMMENT ON TABLE public.tenants IS '租户表 - 存储所有租户的基本信息';
COMMENT ON COLUMN public.tenants.supabase_project_id IS 'Supabase 项目的唯一 ID';
COMMENT ON COLUMN public.tenants.tenant_code IS '租户代码，用于生成项目名称';
```

### 2. tenant_connections（租户连接信息表）

```sql
CREATE TABLE public.tenant_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- 连接信息（加密存储）
  supabase_url TEXT NOT NULL,                 -- Supabase API URL
  supabase_anon_key TEXT NOT NULL,            -- Supabase Anon Key（加密）
  supabase_service_key TEXT NOT NULL,         -- Supabase Service Key（加密）
  
  -- 数据库连接信息（可选，用于直接连接）
  database_url TEXT,                          -- 数据库连接字符串（加密）
  
  -- 状态
  is_active BOOLEAN DEFAULT true,
  last_health_check TIMESTAMPTZ,              -- 最后健康检查时间
  health_status TEXT DEFAULT 'unknown',       -- 健康状态：healthy, unhealthy, unknown
  
  -- 时间
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 启用 RLS
ALTER TABLE public.tenant_connections ENABLE ROW LEVEL SECURITY;

-- RLS 策略：只有系统管理员可以访问
CREATE POLICY "只有系统管理员可以访问连接信息" ON public.tenant_connections
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.system_admins
      WHERE id = auth.uid() AND status = 'active'
    )
  );

-- 注释
COMMENT ON TABLE public.tenant_connections IS '租户连接信息表 - 存储租户 Supabase 项目的连接信息（加密）';
COMMENT ON COLUMN public.tenant_connections.supabase_anon_key IS '匿名密钥 - 使用 pgcrypto 加密';
COMMENT ON COLUMN public.tenant_connections.supabase_service_key IS '服务密钥 - 使用 pgcrypto 加密';
```

### 3. tenant_modules（租户模块配置表）

```sql
CREATE TABLE public.tenant_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- 模块信息
  module_name TEXT NOT NULL,                  -- 模块名称：vehicles, attendance, warehouses 等
  module_display_name TEXT NOT NULL,          -- 模块显示名称
  is_enabled BOOLEAN DEFAULT true,            -- 是否启用
  
  -- 配置
  config JSONB DEFAULT '{}',                  -- 模块配置（JSON格式）
  
  -- 数据库表
  required_tables TEXT[],                     -- 需要的数据库表
  migration_version TEXT,                     -- 迁移版本
  
  -- 时间
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  enabled_at TIMESTAMPTZ,                     -- 启用时间
  
  UNIQUE(tenant_id, module_name)
);

-- 索引
CREATE INDEX idx_tenant_modules_tenant_id ON public.tenant_modules(tenant_id);
CREATE INDEX idx_tenant_modules_is_enabled ON public.tenant_modules(is_enabled);

-- 注释
COMMENT ON TABLE public.tenant_modules IS '租户模块配置表 - 管理每个租户启用的功能模块';
```

### 4. system_admins（系统管理员表）

```sql
CREATE TABLE public.system_admins (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 基本信息
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  
  -- 角色和权限
  role TEXT NOT NULL DEFAULT 'admin',         -- admin, super_admin
  permissions JSONB DEFAULT '[]',             -- 权限列表
  
  -- 状态
  status TEXT NOT NULL DEFAULT 'active',      -- active, inactive, suspended
  
  -- 时间
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

-- 索引
CREATE INDEX idx_system_admins_email ON public.system_admins(email);
CREATE INDEX idx_system_admins_status ON public.system_admins(status);

-- 注释
COMMENT ON TABLE public.system_admins IS '系统管理员表 - 管理中央管理系统的管理员';
```

### 5. audit_logs（审计日志表）

```sql
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 关联信息
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  admin_id UUID REFERENCES public.system_admins(id) ON DELETE SET NULL,
  
  -- 操作信息
  action TEXT NOT NULL,                       -- 操作类型
  action_category TEXT,                       -- 操作分类：tenant, module, config 等
  resource_type TEXT,                         -- 资源类型
  resource_id TEXT,                           -- 资源 ID
  
  -- 详情
  details JSONB,                              -- 操作详情
  old_value JSONB,                            -- 旧值
  new_value JSONB,                            -- 新值
  
  -- 请求信息
  ip_address TEXT,                            -- IP 地址
  user_agent TEXT,                            -- User Agent
  
  -- 结果
  status TEXT DEFAULT 'success',              -- success, failed
  error_message TEXT,                         -- 错误信息
  
  -- 时间
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_audit_logs_tenant_id ON public.audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_admin_id ON public.audit_logs(admin_id);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- 注释
COMMENT ON TABLE public.audit_logs IS '审计日志表 - 记录所有系统操作';
```

### 6. tenant_boss_accounts（租户老板账号表）

```sql
CREATE TABLE public.tenant_boss_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- 账号信息
  email TEXT,                                 -- 邮箱
  phone TEXT,                                 -- 手机号
  name TEXT NOT NULL,                         -- 姓名
  
  -- 在租户项目中的用户 ID
  tenant_user_id UUID,                        -- 在租户 Supabase 项目中的 auth.users.id
  
  -- 状态
  status TEXT DEFAULT 'active',               -- active, inactive
  
  -- 时间
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 注释
COMMENT ON TABLE public.tenant_boss_accounts IS '租户老板账号表 - 记录每个租户的老板账号信息';
```

## 🔐 数据加密方案

### 使用 pgcrypto 扩展加密敏感信息

```sql
-- 启用 pgcrypto 扩展
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 创建加密密钥（存储在环境变量中）
-- ENCRYPTION_KEY 应该是一个强密码，存储在 Supabase 的 Vault 中

-- 加密函数
CREATE OR REPLACE FUNCTION encrypt_text(plain_text TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN encode(
    pgp_sym_encrypt(
      plain_text,
      current_setting('app.encryption_key')
    ),
    'base64'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 解密函数
CREATE OR REPLACE FUNCTION decrypt_text(encrypted_text TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN pgp_sym_decrypt(
    decode(encrypted_text, 'base64'),
    current_setting('app.encryption_key')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 使用示例
-- 插入时加密
INSERT INTO tenant_connections (tenant_id, supabase_anon_key)
VALUES (
  'xxx-xxx-xxx',
  encrypt_text('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...')
);

-- 查询时解密
SELECT 
  tenant_id,
  decrypt_text(supabase_anon_key) as anon_key
FROM tenant_connections
WHERE tenant_id = 'xxx-xxx-xxx';
```

## 🚀 租户自动化创建流程

### 完整流程图

```
┌─────────────────────────────────────────────────────────────┐
│                    租户创建流程                               │
└─────────────────────────────────────────────────────────────┘

[1. 管理员填写表单]
   • 公司名称
   • 联系信息
   • 配额设置
   • 功能模块
   • 老板账号
         ↓
[2. 前端验证]
   • 表单验证
   • 重复检查
         ↓
[3. 调用后端 API]
   POST /api/tenants/create
         ↓
[4. 创建租户记录]
   • 生成租户代码（tenant-001）
   • 插入 tenants 表
   • 状态：creating
         ↓
[5. 调用 Supabase Management API]
   • 创建新的 Supabase 项目
   • 项目名称：fleet-tenant-001
   • 区域：ap-northeast-1
   • 计划：Free/Pro
         ↓
[6. 等待项目创建完成]
   • 轮询项目状态
   • 获取项目 URL 和 Keys
         ↓
[7. 保存连接信息]
   • 加密 anon_key
   • 加密 service_key
   • 插入 tenant_connections 表
         ↓
[8. 初始化数据库]
   • 连接到新项目
   • 执行迁移脚本
   • 创建表结构
   • 设置 RLS 策略
         ↓
[9. 根据模块配置创建表]
   • 车辆管理 → vehicles 表
   • 考勤管理 → attendance 表
   • 仓库管理 → warehouses 表
   • ...
         ↓
[10. 创建老板账号]
   • 调用租户项目的 Auth API
   • 创建 auth.users 记录
   • 创建 profiles 记录
   • 角色：boss
         ↓
[11. 保存老板账号信息]
   • 插入 tenant_boss_accounts 表
   • 记录 tenant_user_id
         ↓
[12. 更新租户状态]
   • 状态：active
   • 激活时间：NOW()
         ↓
[13. 记录审计日志]
   • 操作：create_tenant
   • 详情：完整信息
         ↓
[14. 发送通知]
   • 邮件通知老板
   • 包含登录信息
         ↓
[15. 返回结果]
   • 租户信息
   • 老板账号
   • 登录地址
```

### 核心 API 实现

#### 1. 创建租户 API

```typescript
// src/api/tenants/create.ts

import { supabase } from '@/client/supabase'  // 中央管理系统的 supabase
import { createSupabaseProject } from '@/services/supabase-management'
import { initializeTenantDatabase } from '@/services/tenant-init'
import { createTenantBossAccount } from '@/services/tenant-auth'

interface CreateTenantInput {
  // 基本信息
  companyName: string
  contactName: string
  contactPhone: string
  contactEmail?: string
  
  // 配额
  maxUsers: number
  maxVehicles: number
  expiredAt: string
  
  // 功能模块
  modules: string[]  // ['vehicles', 'attendance', 'warehouses', ...]
  
  // 老板账号
  bossEmail?: string
  bossPhone?: string
  bossPassword: string
  bossName: string
  
  // 项目配置
  projectRegion?: string
  planType?: 'free' | 'pro'
}

interface CreateTenantResult {
  success: boolean
  tenant: {
    id: string
    tenantCode: string
    companyName: string
    supabaseUrl: string
  }
  bossAccount: {
    email?: string
    phone?: string
    loginUrl: string
  }
  error?: string
}

export async function createTenant(
  input: CreateTenantInput
): Promise<CreateTenantResult> {
  try {
    console.log('🚀 开始创建租户:', input.companyName)
    
    // 1. 生成租户代码
    const tenantCode = await generateTenantCode()
    console.log('📝 生成租户代码:', tenantCode)
    
    // 2. 创建租户记录
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        company_name: input.companyName,
        tenant_code: tenantCode,
        contact_name: input.contactName,
        contact_phone: input.contactPhone,
        contact_email: input.contactEmail,
        max_users: input.maxUsers,
        max_vehicles: input.maxVehicles,
        expired_at: input.expiredAt,
        plan_type: input.planType || 'free',
        project_region: input.projectRegion || 'ap-northeast-1',
        status: 'creating'
      })
      .select()
      .single()
    
    if (tenantError) throw tenantError
    console.log('✅ 租户记录创建成功:', tenant.id)
    
    // 3. 调用 Supabase Management API 创建项目
    console.log('🔧 开始创建 Supabase 项目...')
    const projectResult = await createSupabaseProject({
      name: `fleet-${tenantCode}`,
      organization_id: process.env.SUPABASE_ORG_ID!,
      region: input.projectRegion || 'ap-northeast-1',
      plan: input.planType || 'free'
    })
    
    if (!projectResult.success) {
      throw new Error(`创建 Supabase 项目失败: ${projectResult.error}`)
    }
    
    console.log('✅ Supabase 项目创建成功:', projectResult.project.id)
    
    // 4. 更新租户记录
    await supabase
      .from('tenants')
      .update({
        supabase_project_id: projectResult.project.id,
        supabase_project_ref: projectResult.project.ref
      })
      .eq('id', tenant.id)
    
    // 5. 保存连接信息（加密）
    console.log('🔐 保存连接信息...')
    await supabase
      .from('tenant_connections')
      .insert({
        tenant_id: tenant.id,
        supabase_url: projectResult.project.endpoint,
        supabase_anon_key: await encryptText(projectResult.project.anon_key),
        supabase_service_key: await encryptText(projectResult.project.service_key),
        is_active: true,
        health_status: 'healthy'
      })
    
    console.log('✅ 连接信息保存成功')
    
    // 6. 初始化数据库
    console.log('📊 开始初始化数据库...')
    await initializeTenantDatabase({
      supabaseUrl: projectResult.project.endpoint,
      supabaseServiceKey: projectResult.project.service_key,
      modules: input.modules
    })
    
    console.log('✅ 数据库初始化成功')
    
    // 7. 创建老板账号
    console.log('👤 创建老板账号...')
    const bossResult = await createTenantBossAccount({
      supabaseUrl: projectResult.project.endpoint,
      supabaseServiceKey: projectResult.project.service_key,
      email: input.bossEmail,
      phone: input.bossPhone,
      password: input.bossPassword,
      name: input.bossName
    })
    
    if (!bossResult.success) {
      throw new Error(`创建老板账号失败: ${bossResult.error}`)
    }
    
    console.log('✅ 老板账号创建成功:', bossResult.userId)
    
    // 8. 保存老板账号信息
    await supabase
      .from('tenant_boss_accounts')
      .insert({
        tenant_id: tenant.id,
        email: input.bossEmail,
        phone: input.bossPhone,
        name: input.bossName,
        tenant_user_id: bossResult.userId,
        status: 'active'
      })
    
    // 9. 保存模块配置
    console.log('📦 保存模块配置...')
    const moduleRecords = input.modules.map(moduleName => ({
      tenant_id: tenant.id,
      module_name: moduleName,
      module_display_name: getModuleDisplayName(moduleName),
      is_enabled: true,
      enabled_at: new Date().toISOString()
    }))
    
    await supabase
      .from('tenant_modules')
      .insert(moduleRecords)
    
    // 10. 更新租户状态为 active
    await supabase
      .from('tenants')
      .update({
        status: 'active',
        activated_at: new Date().toISOString()
      })
      .eq('id', tenant.id)
    
    // 11. 记录审计日志
    await supabase
      .from('audit_logs')
      .insert({
        tenant_id: tenant.id,
        admin_id: (await supabase.auth.getUser()).data.user?.id,
        action: 'create_tenant',
        action_category: 'tenant',
        resource_type: 'tenant',
        resource_id: tenant.id,
        details: {
          company_name: input.companyName,
          tenant_code: tenantCode,
          modules: input.modules
        },
        status: 'success'
      })
    
    console.log('🎉 租户创建完成!')
    
    // 12. 返回结果
    return {
      success: true,
      tenant: {
        id: tenant.id,
        tenantCode: tenantCode,
        companyName: input.companyName,
        supabaseUrl: projectResult.project.endpoint
      },
      bossAccount: {
        email: input.bossEmail,
        phone: input.bossPhone,
        loginUrl: `${projectResult.project.endpoint}/auth/v1/login`
      }
    }
    
  } catch (error) {
    console.error('❌ 创建租户失败:', error)
    
    // 记录失败日志
    await supabase
      .from('audit_logs')
      .insert({
        admin_id: (await supabase.auth.getUser()).data.user?.id,
        action: 'create_tenant',
        action_category: 'tenant',
        details: { company_name: input.companyName },
        status: 'failed',
        error_message: error instanceof Error ? error.message : String(error)
      })
    
    return {
      success: false,
      error: error instanceof Error ? error.message : '创建租户失败'
    } as CreateTenantResult
  }
}

// 生成租户代码
async function generateTenantCode(): Promise<string> {
  const { count } = await supabase
    .from('tenants')
    .select('*', { count: 'exact', head: true })
  
  const nextNumber = (count || 0) + 1
  return `tenant-${String(nextNumber).padStart(3, '0')}`
}

// 获取模块显示名称
function getModuleDisplayName(moduleName: string): string {
  const moduleNames: Record<string, string> = {
    vehicles: '车辆管理',
    attendance: '考勤管理',
    warehouses: '仓库管理',
    leave: '请假管理',
    piecework: '计件工资',
    violations: '违章管理',
    maintenance: '维修管理'
  }
  return moduleNames[moduleName] || moduleName
}

// 加密文本
async function encryptText(text: string): Promise<string> {
  const { data, error } = await supabase.rpc('encrypt_text', {
    plain_text: text
  })
  if (error) throw error
  return data
}
```

#### 2. Supabase Management API 服务

```typescript
// src/services/supabase-management.ts

interface CreateProjectInput {
  name: string
  organization_id: string
  region: string
  plan: 'free' | 'pro'
}

interface CreateProjectResult {
  success: boolean
  project?: {
    id: string
    ref: string
    name: string
    endpoint: string
    anon_key: string
    service_key: string
  }
  error?: string
}

export async function createSupabaseProject(
  input: CreateProjectInput
): Promise<CreateProjectResult> {
  try {
    // Supabase Management API 端点
    const managementApiUrl = 'https://api.supabase.com/v1'
    const accessToken = process.env.SUPABASE_ACCESS_TOKEN!
    
    // 1. 创建项目
    const createResponse = await fetch(`${managementApiUrl}/projects`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: input.name,
        organization_id: input.organization_id,
        region: input.region,
        plan: input.plan,
        db_pass: generateStrongPassword()  // 生成强密码
      })
    })
    
    if (!createResponse.ok) {
      const error = await createResponse.json()
      throw new Error(`创建项目失败: ${error.message}`)
    }
    
    const project = await createResponse.json()
    console.log('✅ 项目创建请求已提交:', project.id)
    
    // 2. 等待项目创建完成（轮询状态）
    console.log('⏳ 等待项目创建完成...')
    let attempts = 0
    const maxAttempts = 60  // 最多等待 5 分钟
    
    while (attempts < maxAttempts) {
      await sleep(5000)  // 等待 5 秒
      
      const statusResponse = await fetch(
        `${managementApiUrl}/projects/${project.id}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      )
      
      if (!statusResponse.ok) {
        throw new Error('获取项目状态失败')
      }
      
      const projectStatus = await statusResponse.json()
      
      if (projectStatus.status === 'ACTIVE_HEALTHY') {
        console.log('✅ 项目创建完成并且健康')
        
        // 3. 获取项目 API Keys
        const keysResponse = await fetch(
          `${managementApiUrl}/projects/${project.id}/api-keys`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          }
        )
        
        if (!keysResponse.ok) {
          throw new Error('获取 API Keys 失败')
        }
        
        const keys = await keysResponse.json()
        
        return {
          success: true,
          project: {
            id: project.id,
            ref: project.ref,
            name: project.name,
            endpoint: `https://${project.ref}.supabase.co`,
            anon_key: keys.find((k: any) => k.name === 'anon')?.api_key || '',
            service_key: keys.find((k: any) => k.name === 'service_role')?.api_key || ''
          }
        }
      }
      
      if (projectStatus.status === 'INACTIVE' || projectStatus.status === 'UNHEALTHY') {
        throw new Error(`项目状态异常: ${projectStatus.status}`)
      }
      
      attempts++
      console.log(`⏳ 等待中... (${attempts}/${maxAttempts})`)
    }
    
    throw new Error('项目创建超时')
    
  } catch (error) {
    console.error('❌ 创建 Supabase 项目失败:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    }
  }
}

// 生成强密码
function generateStrongPassword(): string {
  const length = 32
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
  let password = ''
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length))
  }
  return password
}

// 睡眠函数
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
```

#### 3. 租户数据库初始化服务

```typescript
// src/services/tenant-init.ts

import { createClient } from '@supabase/supabase-js'

interface InitializeDatabaseInput {
  supabaseUrl: string
  supabaseServiceKey: string
  modules: string[]
}

export async function initializeTenantDatabase(
  input: InitializeDatabaseInput
): Promise<void> {
  // 创建租户项目的 Supabase 客户端
  const tenantSupabase = createClient(
    input.supabaseUrl,
    input.supabaseServiceKey
  )
  
  console.log('📊 开始初始化租户数据库')
  
  // 1. 创建基础表结构
  await createBaseTables(tenantSupabase)
  
  // 2. 根据模块创建对应的表
  for (const moduleName of input.modules) {
    await createModuleTables(tenantSupabase, moduleName)
  }
  
  // 3. 设置 RLS 策略
  await setupRLSPolicies(tenantSupabase)
  
  console.log('✅ 租户数据库初始化完成')
}

// 创建基础表
async function createBaseTables(supabase: any): Promise<void> {
  const sql = `
    -- 用户表
    CREATE TABLE IF NOT EXISTS public.profiles (
      id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      role TEXT NOT NULL DEFAULT 'driver',
      status TEXT DEFAULT 'active',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    -- 启用 RLS
    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
    
    -- 创建索引
    CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
    CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
  `
  
  await supabase.rpc('exec_sql', { sql })
}

// 根据模块创建表
async function createModuleTables(supabase: any, moduleName: string): Promise<void> {
  const moduleSQLMap: Record<string, string> = {
    vehicles: `
      CREATE TABLE IF NOT EXISTS public.vehicles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        plate_number TEXT UNIQUE NOT NULL,
        driver_id UUID REFERENCES public.profiles(id),
        status TEXT DEFAULT 'active',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      
      ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
      CREATE INDEX IF NOT EXISTS idx_vehicles_driver_id ON public.vehicles(driver_id);
    `,
    
    attendance: `
      CREATE TABLE IF NOT EXISTS public.attendance (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES public.profiles(id),
        check_in_time TIMESTAMPTZ,
        check_out_time TIMESTAMPTZ,
        status TEXT DEFAULT 'normal',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      
      ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
      CREATE INDEX IF NOT EXISTS idx_attendance_user_id ON public.attendance(user_id);
      CREATE INDEX IF NOT EXISTS idx_attendance_check_in_time ON public.attendance(check_in_time);
    `,
    
    warehouses: `
      CREATE TABLE IF NOT EXISTS public.warehouses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      
      ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
    `
    
    // ... 其他模块的 SQL
  }
  
  const sql = moduleSQLMap[moduleName]
  if (sql) {
    await supabase.rpc('exec_sql', { sql })
    console.log(`✅ 模块 ${moduleName} 的表创建成功`)
  }
}

// 设置 RLS 策略
async function setupRLSPolicies(supabase: any): Promise<void> {
  const sql = `
    -- profiles 表的 RLS 策略
    CREATE POLICY "用户可以查看所有用户" ON public.profiles
      FOR SELECT TO authenticated
      USING (true);
    
    CREATE POLICY "用户可以更新自己的信息" ON public.profiles
      FOR UPDATE TO authenticated
      USING (auth.uid() = id);
    
    -- 老板可以管理所有用户
    CREATE POLICY "老板可以管理所有用户" ON public.profiles
      FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid() AND role = 'boss'
        )
      );
  `
  
  await supabase.rpc('exec_sql', { sql })
  console.log('✅ RLS 策略设置完成')
}
```

#### 4. 创建租户老板账号服务

```typescript
// src/services/tenant-auth.ts

import { createClient } from '@supabase/supabase-js'

interface CreateBossAccountInput {
  supabaseUrl: string
  supabaseServiceKey: string
  email?: string
  phone?: string
  password: string
  name: string
}

interface CreateBossAccountResult {
  success: boolean
  userId?: string
  error?: string
}

export async function createTenantBossAccount(
  input: CreateBossAccountInput
): Promise<CreateBossAccountResult> {
  try {
    // 创建租户项目的 Supabase 客户端（使用 service_role key）
    const tenantSupabase = createClient(
      input.supabaseUrl,
      input.supabaseServiceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
    
    // 1. 创建 auth.users 记录
    const { data: authData, error: authError } = await tenantSupabase.auth.admin.createUser({
      email: input.email,
      phone: input.phone,
      password: input.password,
      email_confirm: true,  // 自动确认邮箱
      phone_confirm: true,  // 自动确认手机号
      user_metadata: {
        name: input.name,
        role: 'boss'
      }
    })
    
    if (authError) {
      throw new Error(`创建认证用户失败: ${authError.message}`)
    }
    
    console.log('✅ Auth 用户创建成功:', authData.user.id)
    
    // 2. 创建 profiles 记录
    const { error: profileError } = await tenantSupabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        name: input.name,
        email: input.email,
        phone: input.phone,
        role: 'boss',
        status: 'active'
      })
    
    if (profileError) {
      throw new Error(`创建用户档案失败: ${profileError.message}`)
    }
    
    console.log('✅ Profile 记录创建成功')
    
    return {
      success: true,
      userId: authData.user.id
    }
    
  } catch (error) {
    console.error('❌ 创建老板账号失败:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    }
  }
}
```

## 🔌 前端动态连接实现

### 1. 租户连接管理器

```typescript
// src/services/tenant-connection-manager.ts

import { createClient, SupabaseClient } from '@supabase/supabase-js'

// 租户连接信息缓存
const tenantConnectionCache = new Map<string, SupabaseClient>()

// 中央管理系统的 Supabase 客户端
const centralSupabase = createClient(
  process.env.TARO_APP_SUPABASE_URL!,
  process.env.TARO_APP_SUPABASE_ANON_KEY!
)

/**
 * 获取租户的 Supabase 客户端
 */
export async function getTenantSupabaseClient(
  tenantId: string
): Promise<SupabaseClient | null> {
  try {
    // 1. 检查缓存
    if (tenantConnectionCache.has(tenantId)) {
      console.log('✅ 从缓存获取租户连接:', tenantId)
      return tenantConnectionCache.get(tenantId)!
    }
    
    // 2. 从中央数据库获取连接信息
    console.log('🔍 从数据库获取租户连接信息:', tenantId)
    const { data, error } = await centralSupabase
      .rpc('get_tenant_connection', { p_tenant_id: tenantId })
    
    if (error || !data) {
      console.error('❌ 获取租户连接信息失败:', error)
      return null
    }
    
    // 3. 创建租户的 Supabase 客户端
    const tenantClient = createClient(
      data.supabase_url,
      data.supabase_anon_key  // 已解密
    )
    
    // 4. 缓存连接
    tenantConnectionCache.set(tenantId, tenantClient)
    
    console.log('✅ 租户连接创建成功:', tenantId)
    return tenantClient
    
  } catch (error) {
    console.error('❌ 获取租户连接失败:', error)
    return null
  }
}

/**
 * 清除租户连接缓存
 */
export function clearTenantConnectionCache(tenantId?: string): void {
  if (tenantId) {
    tenantConnectionCache.delete(tenantId)
  } else {
    tenantConnectionCache.clear()
  }
}

/**
 * 获取当前用户所属的租户 ID
 */
export async function getCurrentUserTenantId(): Promise<string | null> {
  try {
    const { data: { user } } = await centralSupabase.auth.getUser()
    if (!user) return null
    
    // 从中央数据库查询用户所属的租户
    const { data, error } = await centralSupabase
      .rpc('get_user_tenant_id', { p_user_id: user.id })
    
    if (error || !data) {
      console.error('❌ 获取用户租户 ID 失败:', error)
      return null
    }
    
    return data.tenant_id
    
  } catch (error) {
    console.error('❌ 获取用户租户 ID 失败:', error)
    return null
  }
}
```

### 2. 数据库函数（中央管理系统）

```sql
-- 获取租户连接信息（解密）
CREATE OR REPLACE FUNCTION public.get_tenant_connection(p_tenant_id UUID)
RETURNS TABLE (
  supabase_url TEXT,
  supabase_anon_key TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tc.supabase_url,
    decrypt_text(tc.supabase_anon_key) as supabase_anon_key
  FROM public.tenant_connections tc
  WHERE tc.tenant_id = p_tenant_id
    AND tc.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 获取用户所属的租户 ID
CREATE OR REPLACE FUNCTION public.get_user_tenant_id(p_user_id UUID)
RETURNS TABLE (tenant_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT tba.tenant_id
  FROM public.tenant_boss_accounts tba
  WHERE tba.tenant_user_id = p_user_id
    AND tba.status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 3. 用户登录流程

```typescript
// src/pages/login/index.tsx

import { getTenantSupabaseClient, getCurrentUserTenantId } from '@/services/tenant-connection-manager'
import Taro from '@tarojs/taro'

async function handleLogin(phone: string, password: string) {
  try {
    // 1. 先尝试在中央管理系统登录（系统管理员）
    const { data: centralData, error: centralError } = await centralSupabase.auth.signInWithPassword({
      phone,
      password
    })
    
    if (!centralError && centralData.user) {
      // 是系统管理员，跳转到中央管理系统
      console.log('✅ 系统管理员登录成功')
      Taro.switchTab({ url: '/pages/central-admin/index' })
      return
    }
    
    // 2. 不是系统管理员，查询用户所属的租户
    console.log('🔍 查询用户所属租户...')
    
    // 这里需要一个特殊的查询接口，通过手机号查询租户
    const { data: tenantData, error: tenantError } = await centralSupabase
      .rpc('find_tenant_by_user_phone', { p_phone: phone })
    
    if (tenantError || !tenantData) {
      throw new Error('未找到对应的租户')
    }
    
    console.log('✅ 找到租户:', tenantData.tenant_id)
    
    // 3. 获取租户的 Supabase 客户端
    const tenantClient = await getTenantSupabaseClient(tenantData.tenant_id)
    if (!tenantClient) {
      throw new Error('无法连接到租户数据库')
    }
    
    // 4. 在租户项目中登录
    const { data: userData, error: userError } = await tenantClient.auth.signInWithPassword({
      phone,
      password
    })
    
    if (userError) {
      throw new Error(`登录失败: ${userError.message}`)
    }
    
    console.log('✅ 租户用户登录成功')
    
    // 5. 保存租户 ID 到本地存储
    Taro.setStorageSync('current_tenant_id', tenantData.tenant_id)
    
    // 6. 根据角色跳转
    const { data: profile } = await tenantClient
      .from('profiles')
      .select('role')
      .eq('id', userData.user.id)
      .single()
    
    if (profile?.role === 'boss') {
      Taro.switchTab({ url: '/pages/boss/index' })
    } else if (profile?.role === 'manager') {
      Taro.switchTab({ url: '/pages/manager/index' })
    } else {
      Taro.switchTab({ url: '/pages/driver/index' })
    }
    
  } catch (error) {
    console.error('❌ 登录失败:', error)
    Taro.showToast({
      title: error instanceof Error ? error.message : '登录失败',
      icon: 'none'
    })
  }
}
```

### 4. 数据查询示例

```typescript
// src/db/api.ts

import { getTenantSupabaseClient } from '@/services/tenant-connection-manager'
import Taro from '@tarojs/taro'

/**
 * 获取当前租户的 Supabase 客户端
 */
async function getCurrentTenantClient() {
  const tenantId = Taro.getStorageSync('current_tenant_id')
  if (!tenantId) {
    throw new Error('未找到租户信息')
  }
  
  const client = await getTenantSupabaseClient(tenantId)
  if (!client) {
    throw new Error('无法连接到租户数据库')
  }
  
  return client
}

/**
 * 获取所有车辆
 */
export async function getAllVehicles() {
  const client = await getCurrentTenantClient()
  
  const { data, error } = await client
    .from('vehicles')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('获取车辆列表失败:', error)
    return []
  }
  
  return data || []
}

/**
 * 获取所有用户
 */
export async function getAllUsers() {
  const client = await getCurrentTenantClient()
  
  const { data, error } = await client
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('获取用户列表失败:', error)
    return []
  }
  
  return data || []
}
```

## 💰 成本分析

### Supabase 定价

#### Free Plan（免费版）
- **价格**：$0/月
- **限制**：
  - 2 个项目
  - 500 MB 数据库空间
  - 1 GB 文件存储
  - 50,000 月活用户
  - 2 GB 带宽
- **适用场景**：测试、小型租户

#### Pro Plan（专业版）
- **价格**：$25/月/项目
- **包含**：
  - 8 GB 数据库空间
  - 100 GB 文件存储
  - 100,000 月活用户
  - 250 GB 带宽
- **超出部分**：
  - 数据库：$0.125/GB
  - 存储：$0.021/GB
  - 带宽：$0.09/GB

### 成本估算（10 个租户）

#### 方案 A：全部使用 Free Plan
- **成本**：$0/月
- **限制**：最多 2 个项目（不适用）

#### 方案 B：全部使用 Pro Plan
- **成本**：$25 × 11 = $275/月
  - 1 个中央管理系统
  - 10 个租户项目
- **优势**：性能好，无限制

#### 方案 C：混合方案（推荐）
- **中央管理系统**：Pro Plan ($25/月)
- **小型租户**：Free Plan ($0/月) × 2
- **中大型租户**：Pro Plan ($25/月) × 8
- **总成本**：$25 + $200 = $225/月

### 与 Schema 方案对比

| 方案 | 月成本 | 数据隔离 | 管理复杂度 | 扩展性 |
|------|--------|---------|-----------|--------|
| Schema 隔离 | $25 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| 独立项目 | $225-275 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

## ⚠️ 注意事项与限制

### 1. Supabase Management API 访问

**要求**：
- 需要 Supabase 组织的 Access Token
- 需要有创建项目的权限
- 免费版组织最多 2 个项目

**获取 Access Token**：
1. 登录 Supabase Dashboard
2. 进入 Account Settings
3. 生成 Access Token
4. 保存到环境变量

### 2. 项目创建时间

- 创建一个新项目需要 **3-5 分钟**
- 需要实现异步处理和状态轮询
- 建议显示进度条给用户

### 3. 数据迁移

- 每个租户项目需要独立执行迁移
- 需要维护统一的迁移脚本
- 版本管理很重要

### 4. 连接管理

- 需要管理多个 Supabase 连接
- 建议实现连接池
- 注意内存占用

### 5. 备份策略

- 每个项目独立备份
- Supabase 提供自动备份（Pro Plan）
- 建议定期导出重要数据

## 📊 实施计划

### 阶段 1：准备工作（1-2天）

- [ ] 申请 Supabase 组织账号
- [ ] 获取 Management API Access Token
- [ ] 设计中央管理系统数据库
- [ ] 准备租户数据库迁移脚本

### 阶段 2：后端开发（5-7天）

- [ ] 实现 Supabase Management API 集成
- [ ] 实现租户创建流程
- [ ] 实现数据库初始化服务
- [ ] 实现连接管理器
- [ ] 实现加密/解密服务

### 阶段 3：前端开发（4-5天）

- [ ] 开发中央管理系统界面
  - [ ] 租户列表页面
  - [ ] 租户创建页面
  - [ ] 租户详情页面
  - [ ] 模块配置页面
- [ ] 实现动态连接切换
- [ ] 更新登录流程

### 阶段 4：测试（3-4天）

- [ ] 功能测试
- [ ] 性能测试
- [ ] 安全测试
- [ ] 压力测试

### 阶段 5：部署上线（1-2天）

- [ ] 部署中央管理系统
- [ ] 创建测试租户
- [ ] 验证完整流程
- [ ] 文档编写

### 总计：14-20 天

## 🎯 总结

### 优势
1. ✅ **完全物理隔离**：每个租户独立的数据库和 API
2. ✅ **安全性最高**：租户间零数据交叉
3. ✅ **独立扩展**：每个租户可以独立升级
4. ✅ **故障隔离**：一个租户的问题不影响其他租户
5. ✅ **合规性好**：满足数据主权要求

### 劣势
1. ❌ **成本较高**：每个租户 $25/月（Pro Plan）
2. ❌ **管理复杂**：需要管理多个 Supabase 项目
3. ❌ **创建耗时**：新租户创建需要 3-5 分钟
4. ❌ **连接管理**：需要动态管理多个数据库连接

### 建议

**如果您的场景满足以下条件，推荐使用独立项目方案**：
- ✅ 租户数量不多（10-20 个）
- ✅ 预算充足（$200-500/月）
- ✅ 对数据隔离要求极高
- ✅ 需要独立扩展能力

**否则，建议使用 Schema 隔离方案**：
- ✅ 成本更低（$25/月）
- ✅ 管理更简单
- ✅ 性能更好
- ✅ 同样提供很好的数据隔离

---

**文档版本**：v1.0  
**创建日期**：2025-11-27  
**状态**：待确认
