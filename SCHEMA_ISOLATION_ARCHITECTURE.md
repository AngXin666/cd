# Schema 隔离多租户架构设计方案

## 📋 方案概述

### 核心理念
采用 **PostgreSQL Schema 隔离** 方案，在单个 Supabase 数据库中为每个租户创建独立的 Schema，实现数据完全隔离。

### 方案优势
1. ✅ **完全免费**：只需一个 Supabase 项目（$0/月）
2. ✅ **数据隔离**：每个租户拥有独立的命名空间
3. ✅ **安全可靠**：通过 RLS 策略确保跨租户访问被阻止
4. ✅ **性能优异**：同一数据库内，查询效率高
5. ✅ **管理简单**：统一的备份、监控和维护
6. ✅ **创建快速**：秒级创建新租户（创建 Schema）
7. ✅ **易于扩展**：支持 10-100+ 租户

## 🏗️ 整体架构图

```
┌─────────────────────────────────────────────────────────────────────┐
│                      Supabase 数据库实例                              │
│                    (单个项目，完全免费)                               │
└─────────────────────────────────────────────────────────────────────┘
                                │
                ┌───────────────┴───────────────┐
                │                               │
┌───────────────▼──────────────┐   ┌───────────▼──────────────────────┐
│   public schema              │   │   租户 Schema 集群                │
│   (中央管理系统)              │   │                                   │
├──────────────────────────────┤   ├───────────────────────────────────┤
│                              │   │                                   │
│ 📊 中央管理表：               │   │ 🏢 tenant_001 schema             │
│  • tenants                   │   │   ├─ profiles (用户表)            │
│  • tenant_schemas            │   │   ├─ vehicles (车辆表)            │
│  • system_admins             │   │   ├─ attendance (考勤表)          │
│  • tenant_modules            │   │   ├─ warehouses (仓库表)          │
│  • audit_logs                │   │   └─ ... (其他业务表)             │
│                              │   │                                   │
│ 🔧 管理函数：                 │   │ 🏢 tenant_002 schema             │
│  • create_tenant_schema()    │   │   ├─ profiles                    │
│  • init_tenant_tables()      │   │   ├─ vehicles                    │
│  • set_current_tenant()      │   │   └─ ...                         │
│  • get_tenant_by_user()      │   │                                   │
│                              │   │ 🏢 tenant_003 schema             │
│ 🔐 RLS 策略：                 │   │   └─ ...                         │
│  • 系统管理员全局访问         │   │                                   │
│  • 租户用户只能访问自己的     │   │ 🏢 tenant_xxx schema             │
│    Schema                    │   │   └─ ...                         │
│                              │   │                                   │
└──────────────────────────────┘   └───────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                        数据流向示意图                                 │
└─────────────────────────────────────────────────────────────────────┘

[用户登录]
    ↓
[验证身份] → 查询 public.profiles
    ↓
[获取租户信息] → 查询 public.tenants
    ↓
[设置 Schema] → SET search_path TO tenant_xxx, public
    ↓
[执行业务查询] → 自动路由到 tenant_xxx.profiles
    ↓
[返回结果] → 只返回当前租户的数据
```

## 🗄️ 数据库设计

### 1. public schema（中央管理系统）

#### 1.1 tenants（租户表）

```sql
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 基本信息
  company_name TEXT NOT NULL,                 -- 公司名称
  tenant_code TEXT UNIQUE NOT NULL,           -- 租户代码（tenant-001）
  schema_name TEXT UNIQUE NOT NULL,           -- Schema 名称（tenant_001）
  
  -- 联系信息
  contact_name TEXT,                          -- 联系人姓名
  contact_phone TEXT,                         -- 联系电话
  contact_email TEXT,                         -- 联系邮箱
  
  -- 状态和配额
  status TEXT NOT NULL DEFAULT 'active',      -- active, creating, suspended, deleted
  max_users INTEGER DEFAULT 50,               -- 最大用户数
  max_vehicles INTEGER DEFAULT 100,           -- 最大车辆数
  
  -- 时间信息
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  activated_at TIMESTAMPTZ,                   -- 激活时间
  expired_at TIMESTAMPTZ,                     -- 过期时间
  
  -- 其他
  notes TEXT,                                 -- 备注
  metadata JSONB DEFAULT '{}'                 -- 元数据
);

-- 索引
CREATE INDEX idx_tenants_status ON public.tenants(status);
CREATE INDEX idx_tenants_schema_name ON public.tenants(schema_name);
CREATE INDEX idx_tenants_expired_at ON public.tenants(expired_at);

-- 注释
COMMENT ON TABLE public.tenants IS '租户表 - 存储所有租户的基本信息';
COMMENT ON COLUMN public.tenants.schema_name IS 'PostgreSQL Schema 名称';
```

#### 1.2 tenant_modules（租户模块配置表）

```sql
CREATE TABLE public.tenant_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- 模块信息
  module_name TEXT NOT NULL,                  -- vehicles, attendance, warehouses 等
  module_display_name TEXT NOT NULL,          -- 车辆管理、考勤管理等
  is_enabled BOOLEAN DEFAULT true,            -- 是否启用
  
  -- 配置
  config JSONB DEFAULT '{}',                  -- 模块配置
  required_tables TEXT[],                     -- 需要的数据库表
  
  -- 时间
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  enabled_at TIMESTAMPTZ,                     -- 启用时间
  
  UNIQUE(tenant_id, module_name)
);

CREATE INDEX idx_tenant_modules_tenant_id ON public.tenant_modules(tenant_id);

COMMENT ON TABLE public.tenant_modules IS '租户模块配置表';
```

#### 1.3 system_admins（系统管理员表）

```sql
CREATE TABLE public.system_admins (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 基本信息
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  
  -- 角色
  role TEXT NOT NULL DEFAULT 'admin',         -- admin, super_admin
  
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

#### 1.4 audit_logs（审计日志表）

```sql
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 关联信息
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  admin_id UUID REFERENCES public.system_admins(id) ON DELETE SET NULL,
  
  -- 操作信息
  action TEXT NOT NULL,                       -- create_tenant, update_config 等
  action_category TEXT,                       -- tenant, module, config
  resource_type TEXT,                         -- tenant, schema, table
  resource_id TEXT,                           -- 资源 ID
  
  -- 详情
  details JSONB,                              -- 操作详情
  old_value JSONB,                            -- 旧值
  new_value JSONB,                            -- 新值
  
  -- 请求信息
  ip_address TEXT,
  user_agent TEXT,
  
  -- 结果
  status TEXT DEFAULT 'success',              -- success, failed
  error_message TEXT,
  
  -- 时间
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_tenant_id ON public.audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

COMMENT ON TABLE public.audit_logs IS '审计日志表';
```

### 2. 租户 Schema 结构（tenant_xxx）

每个租户 Schema 包含以下标准表：

#### 2.1 profiles（用户表）

```sql
CREATE TABLE tenant_xxx.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 基本信息
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  
  -- 角色
  role TEXT NOT NULL DEFAULT 'driver',        -- boss, manager, driver
  
  -- 状态
  status TEXT DEFAULT 'active',
  
  -- 车辆信息（司机）
  vehicle_plate TEXT,                         -- 车牌号
  
  -- 仓库信息（管理员）
  warehouse_ids UUID[],                       -- 管理的仓库 ID 列表
  
  -- 时间
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_profiles_role ON tenant_xxx.profiles(role);
CREATE INDEX idx_profiles_status ON tenant_xxx.profiles(status);
```

#### 2.2 vehicles（车辆表）

```sql
CREATE TABLE tenant_xxx.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  plate_number TEXT UNIQUE NOT NULL,          -- 车牌号
  driver_id UUID REFERENCES tenant_xxx.profiles(id),
  
  status TEXT DEFAULT 'active',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_vehicles_driver_id ON tenant_xxx.vehicles(driver_id);
```

#### 2.3 attendance（考勤表）

```sql
CREATE TABLE tenant_xxx.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  user_id UUID REFERENCES tenant_xxx.profiles(id),
  check_in_time TIMESTAMPTZ,
  check_out_time TIMESTAMPTZ,
  
  status TEXT DEFAULT 'normal',               -- normal, late, early_leave
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_attendance_user_id ON tenant_xxx.attendance(user_id);
CREATE INDEX idx_attendance_check_in_time ON tenant_xxx.attendance(check_in_time);
```

#### 2.4 warehouses（仓库表）

```sql
CREATE TABLE tenant_xxx.warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 🔧 核心数据库函数

### 1. 创建租户 Schema

```sql
CREATE OR REPLACE FUNCTION public.create_tenant_schema(
  p_schema_name TEXT,
  p_modules TEXT[]
) RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_module TEXT;
BEGIN
  -- 1. 创建 Schema
  EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', p_schema_name);
  
  -- 2. 创建基础表（profiles）
  EXECUTE format('
    CREATE TABLE %I.profiles (
      id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      role TEXT NOT NULL DEFAULT ''driver'',
      status TEXT DEFAULT ''active'',
      vehicle_plate TEXT,
      warehouse_ids UUID[],
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    CREATE INDEX idx_profiles_role ON %I.profiles(role);
    CREATE INDEX idx_profiles_status ON %I.profiles(status);
  ', p_schema_name, p_schema_name, p_schema_name);
  
  -- 3. 根据模块创建表
  FOREACH v_module IN ARRAY p_modules
  LOOP
    PERFORM public.create_module_tables(p_schema_name, v_module);
  END LOOP;
  
  -- 4. 设置 RLS 策略
  PERFORM public.setup_tenant_rls(p_schema_name);
  
  v_result := jsonb_build_object(
    'success', true,
    'schema_name', p_schema_name,
    'message', 'Schema 创建成功'
  );
  
  RETURN v_result;
  
EXCEPTION WHEN OTHERS THEN
  v_result := jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 2. 创建模块表

```sql
CREATE OR REPLACE FUNCTION public.create_module_tables(
  p_schema_name TEXT,
  p_module_name TEXT
) RETURNS VOID AS $$
BEGIN
  CASE p_module_name
    WHEN 'vehicles' THEN
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.vehicles (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          plate_number TEXT UNIQUE NOT NULL,
          driver_id UUID REFERENCES %I.profiles(id),
          status TEXT DEFAULT ''active'',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_vehicles_driver_id ON %I.vehicles(driver_id);
      ', p_schema_name, p_schema_name, p_schema_name);
      
    WHEN 'attendance' THEN
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.attendance (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES %I.profiles(id),
          check_in_time TIMESTAMPTZ,
          check_out_time TIMESTAMPTZ,
          status TEXT DEFAULT ''normal'',
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_attendance_user_id ON %I.attendance(user_id);
        CREATE INDEX IF NOT EXISTS idx_attendance_check_in_time ON %I.attendance(check_in_time);
      ', p_schema_name, p_schema_name, p_schema_name, p_schema_name);
      
    WHEN 'warehouses' THEN
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.warehouses (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      ', p_schema_name);
      
    -- 其他模块...
    ELSE
      RAISE NOTICE '未知模块: %', p_module_name;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 3. 设置 RLS 策略

```sql
CREATE OR REPLACE FUNCTION public.setup_tenant_rls(
  p_schema_name TEXT
) RETURNS VOID AS $$
BEGIN
  -- profiles 表的 RLS
  EXECUTE format('ALTER TABLE %I.profiles ENABLE ROW LEVEL SECURITY', p_schema_name);
  
  EXECUTE format('
    CREATE POLICY "用户可以查看所有用户" ON %I.profiles
      FOR SELECT TO authenticated
      USING (true);
  ', p_schema_name);
  
  EXECUTE format('
    CREATE POLICY "用户可以更新自己的信息" ON %I.profiles
      FOR UPDATE TO authenticated
      USING (auth.uid() = id);
  ', p_schema_name);
  
  EXECUTE format('
    CREATE POLICY "老板可以管理所有用户" ON %I.profiles
      FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM %I.profiles
          WHERE id = auth.uid() AND role = ''boss''
        )
      );
  ', p_schema_name, p_schema_name);
  
  -- 其他表的 RLS 策略...
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 4. 设置当前租户

```sql
CREATE OR REPLACE FUNCTION public.set_current_tenant(p_tenant_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_schema_name TEXT;
BEGIN
  -- 获取租户的 Schema 名称
  SELECT schema_name INTO v_schema_name
  FROM public.tenants
  WHERE id = p_tenant_id AND status = 'active';
  
  IF v_schema_name IS NULL THEN
    RAISE EXCEPTION '租户不存在或已停用';
  END IF;
  
  -- 设置 search_path
  EXECUTE format('SET search_path TO %I, public', v_schema_name);
  
  RETURN v_schema_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 5. 获取用户所属租户

```sql
CREATE OR REPLACE FUNCTION public.get_user_tenant()
RETURNS TABLE (
  tenant_id UUID,
  schema_name TEXT,
  company_name TEXT,
  role TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id as tenant_id,
    t.schema_name,
    t.company_name,
    p.role
  FROM public.tenants t
  CROSS JOIN LATERAL (
    SELECT role FROM public.profiles WHERE id = auth.uid()
    UNION ALL
    -- 遍历所有租户 Schema 查找用户
    SELECT role FROM tenant_001.profiles WHERE id = auth.uid()
    -- ... 需要动态生成
  ) p
  WHERE t.status = 'active'
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## 🚀 租户自动化创建流程

### 流程图

```
┌─────────────────────────────────────────────────────────────┐
│                    租户自动化创建流程                          │
└─────────────────────────────────────────────────────────────┘

[1. 管理员填写表单]
   • 公司名称
   • 联系信息
   • 配额设置
   • 功能模块选择
   • 老板账号信息
         ↓
[2. 前端验证]
   • 表单完整性
   • 数据格式
   • 重复检查
         ↓
[3. 生成租户代码]
   • tenant-001, tenant-002, ...
   • Schema 名称：tenant_001, tenant_002, ...
         ↓
[4. 创建租户记录]
   • 插入 public.tenants 表
   • 状态：creating
         ↓
[5. 调用 create_tenant_schema()]
   • 创建 Schema
   • 创建基础表（profiles）
   • 根据模块创建业务表
   • 设置 RLS 策略
         ↓
[6. 创建老板账号]
   • 调用 Supabase Auth API
   • 创建 auth.users 记录
   • 在租户 Schema 创建 profiles 记录
   • 角色：boss
         ↓
[7. 保存模块配置]
   • 插入 public.tenant_modules 表
   • 记录启用的模块
         ↓
[8. 更新租户状态]
   • 状态：active
   • 激活时间：NOW()
         ↓
[9. 记录审计日志]
   • 操作：create_tenant
   • 详情：完整信息
         ↓
[10. 返回结果]
   • 租户信息
   • 老板账号
   • 登录地址
         ↓
[完成] ✅
```

### 时间估算

- **Schema 创建**：< 1 秒
- **表结构初始化**：1-2 秒
- **老板账号创建**：1-2 秒
- **总计**：约 3-5 秒

## 🔌 前端集成方案

### 1. 设置当前租户 Schema

```typescript
// src/services/tenant-context.ts

import { supabase } from '@/client/supabase'

/**
 * 设置当前用户的租户上下文
 */
export async function setTenantContext(): Promise<void> {
  try {
    // 1. 获取当前用户
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('未登录')
    }
    
    // 2. 获取用户所属租户
    const { data: tenantInfo, error } = await supabase
      .rpc('get_user_tenant')
      .maybeSingle()
    
    if (error || !tenantInfo) {
      throw new Error('未找到租户信息')
    }
    
    // 3. 设置 Schema
    await supabase.rpc('set_current_tenant', {
      p_tenant_id: tenantInfo.tenant_id
    })
    
    console.log('✅ 租户上下文设置成功:', tenantInfo.schema_name)
    
    // 4. 保存到本地存储
    localStorage.setItem('current_tenant', JSON.stringify(tenantInfo))
    
  } catch (error) {
    console.error('❌ 设置租户上下文失败:', error)
    throw error
  }
}

/**
 * 获取当前租户信息
 */
export function getCurrentTenant(): any {
  const tenantStr = localStorage.getItem('current_tenant')
  return tenantStr ? JSON.parse(tenantStr) : null
}
```

### 2. 数据查询（自动路由到租户 Schema）

```typescript
// src/db/api.ts

import { supabase } from '@/client/supabase'

/**
 * 获取所有用户
 * 自动查询当前租户 Schema 的 profiles 表
 */
export async function getAllUsers() {
  // 由于已经设置了 search_path，这里会自动查询 tenant_xxx.profiles
  const { data, error } = await supabase
    .from('profiles')  // 实际查询：tenant_xxx.profiles
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('获取用户列表失败:', error)
    return []
  }
  
  return data || []
}

/**
 * 获取所有车辆
 */
export async function getAllVehicles() {
  const { data, error } = await supabase
    .from('vehicles')  // 实际查询：tenant_xxx.vehicles
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('获取车辆列表失败:', error)
    return []
  }
  
  return data || []
}
```

## 📱 中央管理系统界面设计

### 1. 租户列表页面

**路由**：`/pages/central-admin/tenants/index`

**功能**：
- 显示所有租户列表
- 搜索租户
- 创建新租户
- 查看租户详情
- 快速操作（续费、停用、删除）

### 2. 租户创建页面

**路由**：`/pages/central-admin/tenant-create/index`

**功能**：
- 填写租户基本信息
- 设置配额限制
- 选择功能模块
- 创建老板账号
- 自动化部署

### 3. 租户详情页面

**路由**：`/pages/central-admin/tenant-detail/index`

**功能**：
- 查看租户基本信息
- 查看使用统计
- 查看功能模块状态
- 编辑租户信息
- 管理模块配置

### 4. 模块配置页面

**路由**：`/pages/central-admin/module-config/index`

**功能**：
- 启用/禁用功能模块
- 配置模块参数
- 动态创建/删除数据表

## 💰 成本分析

### 完全免费方案

#### Supabase 免费版
- **费用**：$0/月
- **限制**：
  - 500 MB 数据库
  - 1 GB 存储
  - 50,000 月活用户
  - 2 GB 带宽
- **足够用于**：
  - 10-20 个租户
  - 每个租户 50 个用户
  - 总计 500-1000 个用户

### 扩展方案

如果需要更多资源，可以升级到 Pro Plan：
- **费用**：$25/月
- **包含**：
  - 8 GB 数据库
  - 100 GB 存储
  - 100,000 月活用户
  - 250 GB 带宽
- **可支持**：100+ 租户

## 📊 方案对比

| 特性 | Schema 隔离 | 独立 Supabase 项目 | Neon 免费方案 |
|------|------------|-------------------|--------------|
| 成本 | **$0/月** ✅ | $225-275/月 | $0/月 |
| 数据隔离 | ⭐⭐⭐⭐⭐ ✅ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 管理复杂度 | ⭐⭐⭐⭐⭐ ✅ | ⭐⭐⭐ | ⭐⭐⭐ |
| 创建速度 | **秒级** ✅ | 3-5分钟 | 10-30秒 |
| 认证系统 | **Supabase Auth** ✅ | Supabase Auth | 自建 JWT |
| 支持租户数 | **10-100+** ✅ | 无限 | 30（免费） |
| 性能 | **⭐⭐⭐⭐⭐** ✅ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| 备份恢复 | **统一备份** ✅ | 独立备份 | 独立备份 |

## ⚠️ 注意事项

### 1. Schema 数量限制

PostgreSQL 理论上支持无限 Schema，但实际受系统资源限制：
- **10-50 个租户**：完全没问题
- **50-100 个租户**：需要监控性能
- **100+ 个租户**：建议升级到 Pro Plan 或考虑分库

### 2. 查询性能

- 同一数据库内的查询效率很高
- 需要合理使用索引
- 定期清理无用数据

### 3. 备份策略

- Supabase 提供自动备份
- 可以按 Schema 导出数据
- 建议定期备份重要租户

### 4. 监控告警

- 监控数据库大小
- 监控查询性能
- 设置告警阈值

## 🎯 总结

### 推荐理由

**Schema 隔离方案是最适合您需求的方案**：

1. ✅ **完全免费**：$0/月
2. ✅ **数据完全隔离**：每个租户独立 Schema
3. ✅ **管理简单**：统一的数据库管理
4. ✅ **创建快速**：秒级创建新租户
5. ✅ **性能优异**：同一数据库内查询
6. ✅ **易于扩展**：支持 10-100+ 租户
7. ✅ **使用 Supabase Auth**：无需自建认证
8. ✅ **统一备份**：简化运维

### 实施优势

- **开发效率高**：利用现有 Supabase 基础设施
- **运维成本低**：无需管理多个数据库
- **用户体验好**：快速创建租户
- **安全可靠**：RLS 策略确保数据隔离

---

**文档版本**：v1.0  
**创建日期**：2025-11-27  
**状态**：推荐实施 ✅
