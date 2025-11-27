# 免费独立数据库多租户架构方案

## 📋 方案概述

### 核心目标
- ✅ **完全免费**：不产生任何费用
- ✅ **独立数据库**：每个租户拥有独立的物理数据库
- ✅ **易于管理**：集中式管理平台
- ✅ **可扩展**：支持 10+ 租户

### 技术选型

#### 中央管理系统：Supabase（免费版）
- **用途**：管理租户信息、连接信息、系统管理员
- **费用**：$0/月
- **限制**：
  - 500 MB 数据库
  - 1 GB 存储
  - 50,000 月活用户
- **足够用于**：中央管理系统

#### 租户数据库：Neon（免费版）
- **用途**：每个租户的独立数据库
- **费用**：$0/月
- **免费额度**：
  - 3 个项目（每个项目可以创建 10 个分支）
  - 每个分支 = 一个独立数据库
  - 3 GB 存储/项目
  - 100 小时计算时间/月
- **优势**：
  - ✅ 真正的 PostgreSQL
  - ✅ Serverless 架构
  - ✅ 支持 API 创建数据库
  - ✅ 提供连接池
  - ✅ 自动休眠（节省资源）

## 🏗️ 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│              中央管理系统（Supabase 免费版）                  │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  数据库内容：                                                 │
│  • tenants（租户表）                                          │
│  • tenant_connections（租户连接信息 - 加密）                 │
│  • system_admins（系统管理员）                                │
│  • user_credentials（用户认证信息）                           │
│  • audit_logs（审计日志）                                     │
│                                                               │
│  功能：                                                       │
│  • 租户创建和管理                                             │
│  • 通过 Neon API 创建数据库                                   │
│  • 用户认证（JWT）                                            │
│  • 系统监控                                                   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ 管理
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    Neon 项目集群（免费）                      │
└─────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                   Neon 项目 1（免费）                         │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│  主分支（main）：不使用                                        │
│                                                                │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐ │
│  │ 租户1（分支1）  │  │ 租户2（分支2）  │  │ 租户3（分支3）  │ │
│  ├────────────────┤  ├────────────────┤  ├────────────────┤ │
│  │ • profiles     │  │ • profiles     │  │ • profiles     │ │
│  │ • vehicles     │  │ • vehicles     │  │ • vehicles     │ │
│  │ • attendance   │  │ • attendance   │  │ • attendance   │ │
│  │ • warehouses   │  │ • warehouses   │  │ • warehouses   │ │
│  └────────────────┘  └────────────────┘  └────────────────┘ │
│                                                                │
│  每个分支都是独立的数据库，拥有独立的连接字符串                │
│                                                                │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                   Neon 项目 2（免费）                         │
├──────────────────────────────────────────────────────────────┤
│  租户4-6（3个分支）                                            │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                   Neon 项目 3（免费）                         │
├──────────────────────────────────────────────────────────────┤
│  租户7-10（4个分支）                                           │
└──────────────────────────────────────────────────────────────┘

总计：最多支持 30 个租户（3个项目 × 10个分支）
```

## 🗄️ 中央管理系统数据库设计

### 1. tenants（租户表）

```sql
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 基本信息
  company_name TEXT NOT NULL,                 -- 公司名称
  tenant_code TEXT UNIQUE NOT NULL,           -- 租户代码（tenant-001）
  
  -- 联系信息
  contact_name TEXT,                          -- 联系人
  contact_phone TEXT,                         -- 联系电话
  contact_email TEXT,                         -- 联系邮箱
  
  -- Neon 数据库信息
  neon_project_id TEXT NOT NULL,              -- Neon 项目 ID
  neon_branch_id TEXT UNIQUE NOT NULL,        -- Neon 分支 ID
  neon_branch_name TEXT NOT NULL,             -- Neon 分支名称
  database_host TEXT NOT NULL,                -- 数据库主机
  database_name TEXT NOT NULL,                -- 数据库名称
  
  -- 状态和配额
  status TEXT NOT NULL DEFAULT 'active',      -- active, suspended, deleted
  max_users INTEGER DEFAULT 50,
  max_vehicles INTEGER DEFAULT 100,
  
  -- 时间
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  activated_at TIMESTAMPTZ,
  expired_at TIMESTAMPTZ,
  
  -- 其他
  notes TEXT,
  metadata JSONB
);

CREATE INDEX idx_tenants_status ON public.tenants(status);
CREATE INDEX idx_tenants_tenant_code ON public.tenants(tenant_code);

COMMENT ON TABLE public.tenants IS '租户表';
```

### 2. tenant_connections（租户连接信息表）

```sql
CREATE TABLE public.tenant_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- 数据库连接信息（加密存储）
  connection_string TEXT NOT NULL,            -- 完整连接字符串（加密）
  database_user TEXT NOT NULL,                -- 数据库用户名（加密）
  database_password TEXT NOT NULL,            -- 数据库密码（加密）
  
  -- 状态
  is_active BOOLEAN DEFAULT true,
  last_health_check TIMESTAMPTZ,
  health_status TEXT DEFAULT 'unknown',
  
  -- 时间
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.tenant_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "只有系统管理员可以访问" ON public.tenant_connections
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.system_admins
      WHERE id = auth.uid() AND status = 'active'
    )
  );

COMMENT ON TABLE public.tenant_connections IS '租户连接信息表（加密）';
```

### 3. user_credentials（用户认证信息表）

```sql
CREATE TABLE public.user_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- 登录凭证
  phone TEXT,                                 -- 手机号
  email TEXT,                                 -- 邮箱
  password_hash TEXT NOT NULL,                -- 密码哈希（bcrypt）
  
  -- 用户信息
  name TEXT NOT NULL,
  role TEXT NOT NULL,                         -- boss, manager, driver
  
  -- 在租户数据库中的 ID
  tenant_user_id UUID,                        -- 在租户数据库 profiles 表中的 ID
  
  -- 状态
  status TEXT DEFAULT 'active',
  
  -- 时间
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ,
  
  -- 约束：手机号或邮箱至少有一个
  CONSTRAINT check_login_method CHECK (phone IS NOT NULL OR email IS NOT NULL),
  -- 手机号全局唯一
  CONSTRAINT unique_phone UNIQUE (phone),
  -- 邮箱全局唯一
  CONSTRAINT unique_email UNIQUE (email)
);

CREATE INDEX idx_user_credentials_phone ON public.user_credentials(phone);
CREATE INDEX idx_user_credentials_email ON public.user_credentials(email);
CREATE INDEX idx_user_credentials_tenant_id ON public.user_credentials(tenant_id);

COMMENT ON TABLE public.user_credentials IS '用户认证信息表 - 存储所有用户的登录凭证';
```

### 4. system_admins（系统管理员表）

```sql
CREATE TABLE public.system_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 基本信息
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  password_hash TEXT NOT NULL,                -- 密码哈希
  
  -- 角色
  role TEXT NOT NULL DEFAULT 'admin',
  
  -- 状态
  status TEXT NOT NULL DEFAULT 'active',
  
  -- 时间
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

CREATE INDEX idx_system_admins_email ON public.system_admins(email);

COMMENT ON TABLE public.system_admins IS '系统管理员表';
```

### 5. tenant_modules（租户模块配置表）

```sql
CREATE TABLE public.tenant_modules (
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

COMMENT ON TABLE public.tenant_modules IS '租户模块配置表';
```

### 6. audit_logs（审计日志表）

```sql
CREATE TABLE public.audit_logs (
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
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

COMMENT ON TABLE public.audit_logs IS '审计日志表';
```

## 🔐 认证系统设计

### JWT 认证方案

由于不使用 Supabase Auth，需要自己实现 JWT 认证。

#### JWT Payload 结构

```typescript
interface JWTPayload {
  userId: string              // 用户 ID（在 user_credentials 表中）
  tenantId: string            // 租户 ID
  tenantUserId: string        // 在租户数据库中的用户 ID
  role: string                // 用户角色
  phone?: string              // 手机号
  email?: string              // 邮箱
  name: string                // 姓名
  iat: number                 // 签发时间
  exp: number                 // 过期时间
}
```

#### 认证流程

```
[用户输入手机号/邮箱 + 密码]
         ↓
[查询 user_credentials 表]
         ↓
[验证密码（bcrypt.compare）]
         ↓
[生成 JWT Token]
         ↓
[返回 Token + 用户信息]
         ↓
[前端保存 Token]
         ↓
[后续请求携带 Token]
         ↓
[验证 Token]
         ↓
[从 Token 中获取租户 ID]
         ↓
[连接到租户数据库]
```

### 密码加密

使用 bcrypt 加密密码：

```typescript
import bcrypt from 'bcryptjs'

// 加密密码
async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10)
  return bcrypt.hash(password, salt)
}

// 验证密码
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}
```

## 🚀 Neon 集成方案

### Neon API 使用

#### 1. 创建 Neon 项目

```typescript
// src/services/neon-api.ts

const NEON_API_URL = 'https://console.neon.tech/api/v2'
const NEON_API_KEY = process.env.NEON_API_KEY!  // 从 Neon Dashboard 获取

interface CreateProjectResult {
  success: boolean
  project?: {
    id: string
    name: string
    region_id: string
    created_at: string
  }
  error?: string
}

export async function createNeonProject(
  projectName: string
): Promise<CreateProjectResult> {
  try {
    const response = await fetch(`${NEON_API_URL}/projects`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NEON_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        project: {
          name: projectName,
          region_id: 'aws-ap-southeast-1'  // 新加坡区域
        }
      })
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(`创建项目失败: ${error.message}`)
    }
    
    const data = await response.json()
    
    return {
      success: true,
      project: data.project
    }
  } catch (error) {
    console.error('创建 Neon 项目失败:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    }
  }
}
```

#### 2. 创建数据库分支（租户数据库）

```typescript
interface CreateBranchResult {
  success: boolean
  branch?: {
    id: string
    name: string
    parent_id: string
    created_at: string
  }
  connection?: {
    host: string
    database: string
    user: string
    password: string
    connection_string: string
  }
  error?: string
}

export async function createTenantBranch(
  projectId: string,
  branchName: string
): Promise<CreateBranchResult> {
  try {
    // 1. 创建分支
    const branchResponse = await fetch(
      `${NEON_API_URL}/projects/${projectId}/branches`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${NEON_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          branch: {
            name: branchName
          }
        })
      }
    )
    
    if (!branchResponse.ok) {
      const error = await branchResponse.json()
      throw new Error(`创建分支失败: ${error.message}`)
    }
    
    const branchData = await branchResponse.json()
    const branch = branchData.branch
    
    console.log('✅ 分支创建成功:', branch.id)
    
    // 2. 获取连接信息
    const connectionResponse = await fetch(
      `${NEON_API_URL}/projects/${projectId}/connection_uri?branch_id=${branch.id}`,
      {
        headers: {
          'Authorization': `Bearer ${NEON_API_KEY}`
        }
      }
    )
    
    if (!connectionResponse.ok) {
      throw new Error('获取连接信息失败')
    }
    
    const connectionData = await connectionResponse.json()
    const connectionString = connectionData.uri
    
    // 解析连接字符串
    const url = new URL(connectionString)
    
    return {
      success: true,
      branch: branch,
      connection: {
        host: url.hostname,
        database: url.pathname.slice(1),
        user: url.username,
        password: url.password,
        connection_string: connectionString
      }
    }
  } catch (error) {
    console.error('创建租户分支失败:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    }
  }
}
```

#### 3. 初始化租户数据库

```typescript
import { Client } from 'pg'

interface InitializeTenantDatabaseInput {
  connectionString: string
  modules: string[]
}

export async function initializeTenantDatabase(
  input: InitializeTenantDatabaseInput
): Promise<void> {
  const client = new Client({
    connectionString: input.connectionString,
    ssl: { rejectUnauthorized: false }
  })
  
  try {
    await client.connect()
    console.log('✅ 连接到租户数据库')
    
    // 1. 创建基础表
    await createBaseTables(client)
    
    // 2. 根据模块创建表
    for (const moduleName of input.modules) {
      await createModuleTables(client, moduleName)
    }
    
    console.log('✅ 租户数据库初始化完成')
  } finally {
    await client.end()
  }
}

async function createBaseTables(client: Client): Promise<void> {
  const sql = `
    -- 用户表
    CREATE TABLE IF NOT EXISTS public.profiles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      role TEXT NOT NULL DEFAULT 'driver',
      status TEXT DEFAULT 'active',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
    CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
  `
  
  await client.query(sql)
  console.log('✅ 基础表创建成功')
}

async function createModuleTables(client: Client, moduleName: string): Promise<void> {
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
    `
  }
  
  const sql = moduleSQLMap[moduleName]
  if (sql) {
    await client.query(sql)
    console.log(`✅ 模块 ${moduleName} 的表创建成功`)
  }
}
```

## 🔄 租户创建完整流程

### 流程图

```
[管理员填写表单]
       ↓
[验证表单数据]
       ↓
[生成租户代码] → tenant-001
       ↓
[选择或创建 Neon 项目]
  • 如果现有项目分支数 < 10，使用现有项目
  • 否则创建新项目
       ↓
[调用 Neon API 创建分支]
  • 分支名称：tenant-001
  • 等待创建完成（约 10-30 秒）
       ↓
[获取连接信息]
  • 连接字符串
  • 主机、数据库名、用户名、密码
       ↓
[保存租户记录]
  • 插入 tenants 表
  • 状态：creating
       ↓
[保存连接信息（加密）]
  • 插入 tenant_connections 表
       ↓
[初始化数据库]
  • 连接到租户数据库
  • 创建基础表
  • 根据模块创建表
       ↓
[创建老板账号]
  • 在租户数据库创建 profiles 记录
  • 在中央数据库创建 user_credentials 记录
       ↓
[保存模块配置]
  • 插入 tenant_modules 表
       ↓
[更新租户状态] → active
       ↓
[记录审计日志]
       ↓
[返回创建结果]
```

### 核心 API 实现

```typescript
// src/api/tenants/create.ts

import { supabase } from '@/client/supabase'  // 中央管理系统
import { createTenantBranch } from '@/services/neon-api'
import { initializeTenantDatabase } from '@/services/tenant-init'
import bcrypt from 'bcryptjs'

interface CreateTenantInput {
  companyName: string
  contactName: string
  contactPhone: string
  contactEmail?: string
  maxUsers: number
  maxVehicles: number
  expiredAt: string
  modules: string[]
  bossPhone?: string
  bossEmail?: string
  bossPassword: string
  bossName: string
}

export async function createTenant(input: CreateTenantInput) {
  try {
    console.log('🚀 开始创建租户:', input.companyName)
    
    // 1. 生成租户代码
    const tenantCode = await generateTenantCode()
    console.log('📝 租户代码:', tenantCode)
    
    // 2. 选择或创建 Neon 项目
    const neonProjectId = await selectOrCreateNeonProject()
    console.log('📦 使用 Neon 项目:', neonProjectId)
    
    // 3. 创建 Neon 分支（租户数据库）
    console.log('🔧 创建租户数据库分支...')
    const branchResult = await createTenantBranch(neonProjectId, tenantCode)
    
    if (!branchResult.success || !branchResult.connection) {
      throw new Error('创建数据库分支失败')
    }
    
    console.log('✅ 数据库分支创建成功')
    
    // 4. 创建租户记录
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        company_name: input.companyName,
        tenant_code: tenantCode,
        contact_name: input.contactName,
        contact_phone: input.contactPhone,
        contact_email: input.contactEmail,
        neon_project_id: neonProjectId,
        neon_branch_id: branchResult.branch!.id,
        neon_branch_name: branchResult.branch!.name,
        database_host: branchResult.connection.host,
        database_name: branchResult.connection.database,
        max_users: input.maxUsers,
        max_vehicles: input.maxVehicles,
        expired_at: input.expiredAt,
        status: 'creating'
      })
      .select()
      .single()
    
    if (tenantError) throw tenantError
    console.log('✅ 租户记录创建成功')
    
    // 5. 保存连接信息（加密）
    const encryptedConnection = await encryptText(branchResult.connection.connection_string)
    const encryptedUser = await encryptText(branchResult.connection.user)
    const encryptedPassword = await encryptText(branchResult.connection.password)
    
    await supabase
      .from('tenant_connections')
      .insert({
        tenant_id: tenant.id,
        connection_string: encryptedConnection,
        database_user: encryptedUser,
        database_password: encryptedPassword,
        is_active: true,
        health_status: 'healthy'
      })
    
    console.log('✅ 连接信息保存成功')
    
    // 6. 初始化租户数据库
    console.log('📊 初始化租户数据库...')
    await initializeTenantDatabase({
      connectionString: branchResult.connection.connection_string,
      modules: input.modules
    })
    
    // 7. 创建老板账号
    console.log('👤 创建老板账号...')
    const bossId = await createBossAccount({
      tenantId: tenant.id,
      connectionString: branchResult.connection.connection_string,
      phone: input.bossPhone,
      email: input.bossEmail,
      password: input.bossPassword,
      name: input.bossName
    })
    
    // 8. 保存模块配置
    const moduleRecords = input.modules.map(moduleName => ({
      tenant_id: tenant.id,
      module_name: moduleName,
      module_display_name: getModuleDisplayName(moduleName),
      is_enabled: true
    }))
    
    await supabase
      .from('tenant_modules')
      .insert(moduleRecords)
    
    // 9. 更新租户状态
    await supabase
      .from('tenants')
      .update({
        status: 'active',
        activated_at: new Date().toISOString()
      })
      .eq('id', tenant.id)
    
    // 10. 记录审计日志
    await supabase
      .from('audit_logs')
      .insert({
        tenant_id: tenant.id,
        action: 'create_tenant',
        action_category: 'tenant',
        details: {
          company_name: input.companyName,
          tenant_code: tenantCode
        },
        status: 'success'
      })
    
    console.log('🎉 租户创建完成!')
    
    return {
      success: true,
      tenant: {
        id: tenant.id,
        tenantCode: tenantCode,
        companyName: input.companyName
      },
      bossAccount: {
        phone: input.bossPhone,
        email: input.bossEmail
      }
    }
    
  } catch (error) {
    console.error('❌ 创建租户失败:', error)
    throw error
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

// 选择或创建 Neon 项目
async function selectOrCreateNeonProject(): Promise<string> {
  // 查询现有项目的分支数量
  const { data: tenants } = await supabase
    .from('tenants')
    .select('neon_project_id')
    .not('neon_project_id', 'is', null)
  
  // 统计每个项目的分支数
  const projectBranchCount = new Map<string, number>()
  tenants?.forEach(t => {
    const count = projectBranchCount.get(t.neon_project_id) || 0
    projectBranchCount.set(t.neon_project_id, count + 1)
  })
  
  // 找到分支数 < 10 的项目
  for (const [projectId, count] of projectBranchCount.entries()) {
    if (count < 10) {
      console.log(`✅ 使用现有项目: ${projectId} (${count}/10 分支)`)
      return projectId
    }
  }
  
  // 所有项目都满了，需要创建新项目
  console.log('📦 创建新的 Neon 项目...')
  const projectResult = await createNeonProject(`fleet-project-${Date.now()}`)
  
  if (!projectResult.success || !projectResult.project) {
    throw new Error('创建 Neon 项目失败')
  }
  
  console.log('✅ 新项目创建成功:', projectResult.project.id)
  return projectResult.project.id
}

// 创建老板账号
async function createBossAccount(input: {
  tenantId: string
  connectionString: string
  phone?: string
  email?: string
  password: string
  name: string
}): Promise<string> {
  const { Client } = require('pg')
  const client = new Client({
    connectionString: input.connectionString,
    ssl: { rejectUnauthorized: false }
  })
  
  try {
    await client.connect()
    
    // 1. 在租户数据库创建 profiles 记录
    const bossId = require('uuid').v4()
    await client.query(`
      INSERT INTO public.profiles (id, name, email, phone, role, status)
      VALUES ($1, $2, $3, $4, 'boss', 'active')
    `, [bossId, input.name, input.email, input.phone])
    
    console.log('✅ 租户数据库中的 profile 创建成功')
    
    // 2. 在中央数据库创建 user_credentials 记录
    const passwordHash = await bcrypt.hash(input.password, 10)
    
    await supabase
      .from('user_credentials')
      .insert({
        tenant_id: input.tenantId,
        phone: input.phone,
        email: input.email,
        password_hash: passwordHash,
        name: input.name,
        role: 'boss',
        tenant_user_id: bossId,
        status: 'active'
      })
    
    console.log('✅ 中央数据库中的认证信息创建成功')
    
    return bossId
    
  } finally {
    await client.end()
  }
}

// 加密文本
async function encryptText(text: string): Promise<string> {
  const { data, error } = await supabase.rpc('encrypt_text', {
    plain_text: text
  })
  if (error) throw error
  return data
}

// 获取模块显示名称
function getModuleDisplayName(moduleName: string): string {
  const names: Record<string, string> = {
    vehicles: '车辆管理',
    attendance: '考勤管理',
    warehouses: '仓库管理',
    leave: '请假管理',
    piecework: '计件工资'
  }
  return names[moduleName] || moduleName
}
```

## 🔌 前端连接管理

### 1. 租户连接管理器

```typescript
// src/services/tenant-connection-manager.ts

import { Client } from 'pg'

// 连接缓存
const connectionCache = new Map<string, Client>()

/**
 * 获取租户数据库连接
 */
export async function getTenantConnection(tenantId: string): Promise<Client> {
  // 1. 检查缓存
  if (connectionCache.has(tenantId)) {
    return connectionCache.get(tenantId)!
  }
  
  // 2. 从中央数据库获取连接信息
  const { data, error } = await supabase
    .rpc('get_tenant_connection', { p_tenant_id: tenantId })
  
  if (error || !data) {
    throw new Error('获取租户连接信息失败')
  }
  
  // 3. 创建连接
  const client = new Client({
    connectionString: data.connection_string,  // 已解密
    ssl: { rejectUnauthorized: false }
  })
  
  await client.connect()
  
  // 4. 缓存连接
  connectionCache.set(tenantId, client)
  
  return client
}

/**
 * 清除连接缓存
 */
export async function clearConnectionCache(tenantId?: string): Promise<void> {
  if (tenantId) {
    const client = connectionCache.get(tenantId)
    if (client) {
      await client.end()
      connectionCache.delete(tenantId)
    }
  } else {
    for (const client of connectionCache.values()) {
      await client.end()
    }
    connectionCache.clear()
  }
}
```

### 2. 用户登录流程

```typescript
// src/api/auth/login.ts

import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET!
const JWT_EXPIRES_IN = '7d'

interface LoginInput {
  phone?: string
  email?: string
  password: string
}

interface LoginResult {
  success: boolean
  token?: string
  user?: {
    id: string
    tenantId: string
    name: string
    role: string
  }
  error?: string
}

export async function login(input: LoginInput): Promise<LoginResult> {
  try {
    // 1. 查询用户认证信息
    let query = supabase
      .from('user_credentials')
      .select('*')
      .eq('status', 'active')
    
    if (input.phone) {
      query = query.eq('phone', input.phone)
    } else if (input.email) {
      query = query.eq('email', input.email)
    } else {
      return {
        success: false,
        error: '请提供手机号或邮箱'
      }
    }
    
    const { data: credential, error } = await query.maybeSingle()
    
    if (error || !credential) {
      return {
        success: false,
        error: '用户不存在'
      }
    }
    
    // 2. 验证密码
    const isPasswordValid = await bcrypt.compare(input.password, credential.password_hash)
    
    if (!isPasswordValid) {
      return {
        success: false,
        error: '密码错误'
      }
    }
    
    // 3. 生成 JWT Token
    const payload: JWTPayload = {
      userId: credential.id,
      tenantId: credential.tenant_id,
      tenantUserId: credential.tenant_user_id,
      role: credential.role,
      phone: credential.phone,
      email: credential.email,
      name: credential.name,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60  // 7天
    }
    
    const token = jwt.sign(payload, JWT_SECRET)
    
    // 4. 更新最后登录时间
    await supabase
      .from('user_credentials')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', credential.id)
    
    return {
      success: true,
      token,
      user: {
        id: credential.id,
        tenantId: credential.tenant_id,
        name: credential.name,
        role: credential.role
      }
    }
    
  } catch (error) {
    console.error('登录失败:', error)
    return {
      success: false,
      error: '登录失败'
    }
  }
}

// 验证 Token
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload
  } catch (error) {
    return null
  }
}
```

### 3. 数据查询示例

```typescript
// src/db/api.ts

import { getTenantConnection } from '@/services/tenant-connection-manager'
import Taro from '@tarojs/taro'

/**
 * 获取当前租户连接
 */
async function getCurrentTenantConnection() {
  const token = Taro.getStorageSync('auth_token')
  if (!token) {
    throw new Error('未登录')
  }
  
  const payload = verifyToken(token)
  if (!payload) {
    throw new Error('Token 无效')
  }
  
  return getTenantConnection(payload.tenantId)
}

/**
 * 获取所有车辆
 */
export async function getAllVehicles() {
  const client = await getCurrentTenantConnection()
  
  const result = await client.query(`
    SELECT * FROM public.vehicles
    ORDER BY created_at DESC
  `)
  
  return result.rows
}

/**
 * 获取所有用户
 */
export async function getAllUsers() {
  const client = await getCurrentTenantConnection()
  
  const result = await client.query(`
    SELECT * FROM public.profiles
    ORDER BY created_at DESC
  `)
  
  return result.rows
}
```

## 💰 成本分析

### 完全免费方案

#### 中央管理系统：Supabase 免费版
- **费用**：$0/月
- **限制**：
  - 500 MB 数据库
  - 1 GB 存储
  - 50,000 月活用户
- **足够用于**：管理 10-30 个租户的元数据

#### 租户数据库：Neon 免费版
- **费用**：$0/月
- **免费额度**（每个账号）：
  - 3 个项目
  - 每个项目 10 个分支
  - 3 GB 存储/项目
  - 100 小时计算时间/月/项目
- **可支持**：最多 30 个租户（3 × 10）

### 总成本：$0/月 🎉

### 扩展方案（如果需要更多租户）

如果需要超过 30 个租户，可以：

1. **创建多个 Neon 账号**（免费）
   - 每个账号 3 个项目 × 10 个分支 = 30 个租户
   - 2 个账号 = 60 个租户
   - 完全免费

2. **升级到 Neon Pro**（如果需要更多资源）
   - $19/月/项目
   - 无限分支
   - 10 GB 存储
   - 300 小时计算时间

## 📊 方案对比

| 特性 | Schema 隔离 | Supabase 独立项目 | Neon 免费方案 |
|------|------------|------------------|--------------|
| 成本 | $25/月 | $225-275/月 | **$0/月** ✅ |
| 数据隔离 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ ✅ |
| 管理复杂度 | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| 扩展性 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| 创建速度 | 快（秒级） | 慢（3-5分钟） | 中（10-30秒） |
| 认证系统 | Supabase Auth | Supabase Auth | 自建 JWT |
| 支持租户数 | 无限 | 无限 | 30（免费） |

## ⚠️ 注意事项

### 1. Neon 免费版限制

- **计算时间**：100 小时/月/项目
  - 自动休眠：5 分钟无活动后休眠
  - 唤醒时间：< 1 秒
  - 对于低频使用的租户完全够用

- **存储空间**：3 GB/项目
  - 每个分支共享项目存储
  - 10 个租户 = 每个租户约 300 MB
  - 对于车队管理系统足够

### 2. 认证系统

- 需要自己实现 JWT 认证
- 密码使用 bcrypt 加密
- Token 有效期建议 7 天
- 需要实现 Token 刷新机制

### 3. 数据库连接

- 使用 pg 库连接 PostgreSQL
- 需要实现连接池
- 注意连接数限制

### 4. 备份策略

- Neon 提供自动备份（时间点恢复）
- 建议定期导出重要数据
- 可以使用 pg_dump 导出

## 🚀 实施计划

### 阶段 1：准备工作（1天）

- [ ] 注册 Neon 账号
- [ ] 获取 Neon API Key
- [ ] 设计中央管理系统数据库
- [ ] 准备租户数据库迁移脚本

### 阶段 2：后端开发（5-7天）

- [ ] 实现 Neon API 集成
- [ ] 实现 JWT 认证系统
- [ ] 实现租户创建流程
- [ ] 实现数据库初始化
- [ ] 实现连接管理器

### 阶段 3：前端开发（4-5天）

- [ ] 开发中央管理系统界面
- [ ] 实现登录页面（JWT）
- [ ] 更新数据查询逻辑
- [ ] 实现动态连接切换

### 阶段 4：测试（3-4天）

- [ ] 功能测试
- [ ] 性能测试
- [ ] 安全测试

### 阶段 5：部署（1-2天）

- [ ] 部署中央管理系统
- [ ] 创建测试租户
- [ ] 验证完整流程

### 总计：14-19 天

## 🎯 总结

### 优势
1. ✅ **完全免费**：$0/月
2. ✅ **真正独立**：每个租户独立的物理数据库
3. ✅ **安全隔离**：租户间零数据交叉
4. ✅ **易于扩展**：可支持 30+ 租户（免费）
5. ✅ **PostgreSQL**：完整的 PostgreSQL 功能

### 劣势
1. ❌ **需要自建认证**：不能使用 Supabase Auth
2. ❌ **连接管理复杂**：需要管理多个数据库连接
3. ❌ **计算时间限制**：100 小时/月（但有自动休眠）

### 推荐理由

**这是最适合您需求的方案**：
- ✅ 完全免费
- ✅ 每个租户独立数据库
- ✅ 可支持 10 个租户（您的需求）
- ✅ 可扩展到 30 个租户
- ✅ 真正的 PostgreSQL

---

**文档版本**：v1.0  
**创建日期**：2025-11-27  
**状态**：推荐方案 ✅
