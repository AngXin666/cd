# 简化版 Schema 隔离多租户架构方案

## 📋 方案概述

### 核心功能
1. ✅ **创建租户** - 自动化部署（创建 Schema、表结构、老板账号）
2. ✅ **管理租期** - 设置和管理租户的有效期
3. ✅ **停用账号** - 暂停租户使用
4. ✅ **删除账号** - 删除租户及其所有数据

### 简化内容
- ❌ 移除模块配置表（tenant_modules）
- ❌ 移除审计日志表（audit_logs）
- ❌ 移除模块动态配置功能
- ✅ 保留核心租户管理功能

## 🏗️ 简化架构图

```
┌─────────────────────────────────────────────────────────────┐
│              Supabase 数据库实例（免费）                      │
└─────────────────────────────────────────────────────────────┘
                        │
        ┌───────────────┴───────────────┐
        │                               │
┌───────▼──────────┐         ┌─────────▼─────────────────┐
│  public schema   │         │   租户 Schema 集群         │
│  (中央管理)       │         │                           │
├──────────────────┤         ├───────────────────────────┤
│                  │         │                           │
│ 📊 核心表：       │         │ 🏢 tenant_001 schema     │
│  • tenants       │         │   ├─ profiles            │
│  • system_admins │         │   ├─ vehicles            │
│                  │         │   ├─ attendance          │
│ 🔧 核心函数：     │         │   ├─ warehouses          │
│  • create_tenant │         │   └─ ...                 │
│  • delete_tenant │         │                           │
│                  │         │ 🏢 tenant_002 schema     │
│                  │         │   └─ ...                 │
│                  │         │                           │
└──────────────────┘         └───────────────────────────┘
```

## 🗄️ 数据库设计

### 1. tenants（租户表）

```sql
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 基本信息
  company_name TEXT NOT NULL,                 -- 公司名称
  tenant_code TEXT UNIQUE NOT NULL,           -- 租户代码（tenant-001）
  schema_name TEXT UNIQUE NOT NULL,           -- Schema 名称（tenant_001）
  
  -- 联系信息
  contact_name TEXT,                          -- 联系人
  contact_phone TEXT,                         -- 联系电话
  contact_email TEXT,                         -- 联系邮箱
  
  -- 状态和租期
  status TEXT NOT NULL DEFAULT 'active',      -- active, suspended, deleted
  expired_at TIMESTAMPTZ,                     -- 过期时间
  
  -- 老板账号信息
  boss_user_id UUID,                          -- 老板的 auth.users.id
  boss_name TEXT,                             -- 老板姓名
  boss_phone TEXT,                            -- 老板手机号
  boss_email TEXT,                            -- 老板邮箱
  
  -- 时间
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_tenants_status ON public.tenants(status);
CREATE INDEX idx_tenants_schema_name ON public.tenants(schema_name);
CREATE INDEX idx_tenants_expired_at ON public.tenants(expired_at);
```

### 2. system_admins（系统管理员表）

```sql
CREATE TABLE public.system_admins (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 🔧 核心函数

### 1. 创建租户 Schema

```sql
CREATE OR REPLACE FUNCTION public.create_tenant_schema(
  p_schema_name TEXT
) RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- 1. 创建 Schema
  EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', p_schema_name);
  
  -- 2. 创建 profiles 表
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
  ', p_schema_name, p_schema_name);
  
  -- 3. 创建 vehicles 表
  EXECUTE format('
    CREATE TABLE %I.vehicles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      plate_number TEXT UNIQUE NOT NULL,
      driver_id UUID REFERENCES %I.profiles(id),
      status TEXT DEFAULT ''active'',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  ', p_schema_name, p_schema_name);
  
  -- 4. 创建 attendance 表
  EXECUTE format('
    CREATE TABLE %I.attendance (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES %I.profiles(id),
      check_in_time TIMESTAMPTZ,
      check_out_time TIMESTAMPTZ,
      status TEXT DEFAULT ''normal'',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  ', p_schema_name, p_schema_name);
  
  -- 5. 创建 warehouses 表
  EXECUTE format('
    CREATE TABLE %I.warehouses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  ', p_schema_name);
  
  -- 6. 设置 RLS
  EXECUTE format('ALTER TABLE %I.profiles ENABLE ROW LEVEL SECURITY', p_schema_name);
  EXECUTE format('
    CREATE POLICY "用户可以查看所有用户" ON %I.profiles
      FOR SELECT TO authenticated USING (true);
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
  
  RETURN jsonb_build_object('success', true, 'schema_name', p_schema_name);
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 2. 删除租户 Schema

```sql
CREATE OR REPLACE FUNCTION public.delete_tenant_schema(
  p_schema_name TEXT
) RETURNS JSONB AS $$
BEGIN
  -- 删除 Schema（CASCADE 会删除所有表）
  EXECUTE format('DROP SCHEMA IF EXISTS %I CASCADE', p_schema_name);
  
  RETURN jsonb_build_object('success', true, 'message', 'Schema 已删除');
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## 📱 中央管理系统界面

### 1. 租户列表页面

**路由**：`/pages/central-admin/tenants/index`

**功能**：
- 显示所有租户列表
- 搜索租户
- 查看租户状态（正常、即将到期、已过期、已停用）
- 快速操作：
  - 编辑租期
  - 停用/启用
  - 删除

**界面布局**：
```
┌─────────────────────────────────────────────────────┐
│  租户管理                                    [+ 创建] │
├─────────────────────────────────────────────────────┤
│                                                       │
│  [搜索: ____________]                                │
│                                                       │
│  ┌─────────────────────────────────────────────┐   │
│  │ 📦 XX物流公司                                │   │
│  │    租户代码: tenant-001                      │   │
│  │    状态: ✅ 正常                             │   │
│  │    到期时间: 2025-12-31                      │   │
│  │    老板: 张三 (13800138000)                  │   │
│  │    创建时间: 2025-01-15                      │   │
│  │                                              │   │
│  │    [编辑租期] [停用] [删除]                  │   │
│  └─────────────────────────────────────────────┘   │
│                                                       │
│  ┌─────────────────────────────────────────────┐   │
│  │ 📦 YY运输公司                                │   │
│  │    租户代码: tenant-002                      │   │
│  │    状态: ⚠️ 即将到期                         │   │
│  │    到期时间: 2025-06-15 (还有15天)           │   │
│  │    老板: 李四 (13900139000)                  │   │
│  │                                              │   │
│  │    [编辑租期] [停用] [删除]                  │   │
│  └─────────────────────────────────────────────┘   │
│                                                       │
└─────────────────────────────────────────────────────┘
```

### 2. 创建租户页面

**路由**：`/pages/central-admin/tenant-create/index`

**功能**：
- 填写租户基本信息
- 设置租期
- 创建老板账号
- 自动化部署

**界面布局**：
```
┌─────────────────────────────────────────────────────┐
│  创建新租户                                  [返回]   │
├─────────────────────────────────────────────────────┤
│                                                       │
│  基本信息                                             │
│  ┌─────────────────────────────────────────────┐   │
│  │  公司名称: [____________________________]   │   │
│  │  联系人:   [____________________________]   │   │
│  │  联系电话: [____________________________]   │   │
│  │  联系邮箱: [____________________________]   │   │
│  └─────────────────────────────────────────────┘   │
│                                                       │
│  租期设置                                             │
│  ┌─────────────────────────────────────────────┐   │
│  │  有效期至: [2025-12-31]                      │   │
│  └─────────────────────────────────────────────┘   │
│                                                       │
│  老板账号                                             │
│  ┌─────────────────────────────────────────────┐   │
│  │  姓名:     [____________________________]   │   │
│  │  手机号:   [____________________________]   │   │
│  │  邮箱:     [____________________________]   │   │
│  │  密码:     [____________________________]   │   │
│  └─────────────────────────────────────────────┘   │
│                                                       │
│  [取消]                              [创建租户]       │
│                                                       │
└─────────────────────────────────────────────────────┘
```

## 🚀 自动化部署流程

```
[管理员填写表单]
       ↓
[验证表单数据]
       ↓
[生成租户代码] → tenant-001
       ↓
[创建租户记录]
  • 插入 tenants 表
  • 状态: creating
       ↓
[调用 create_tenant_schema()]
  • 创建 Schema (tenant_001)
  • 创建 profiles 表
  • 创建 vehicles 表
  • 创建 attendance 表
  • 创建 warehouses 表
  • 设置 RLS 策略
       ↓
[创建老板账号]
  • 调用 Supabase Auth API
  • 创建 auth.users 记录
  • 在租户 Schema 创建 profiles 记录
       ↓
[更新租户记录]
  • 保存老板账号信息
  • 状态: active
       ↓
[返回结果] ✅
```

**时间**：约 3-5 秒

## 💰 成本

- **Supabase 免费版**：$0/月
- **支持租户数**：10-20 个
- **完全免费** ✅

## 📊 核心功能对比

| 功能 | 完整版 | 简化版 |
|------|--------|--------|
| 创建租户 | ✅ | ✅ |
| 自动化部署 | ✅ | ✅ |
| 管理租期 | ✅ | ✅ |
| 停用账号 | ✅ | ✅ |
| 删除账号 | ✅ | ✅ |
| 模块配置 | ✅ | ❌ |
| 审计日志 | ✅ | ❌ |
| 动态表创建 | ✅ | ❌ |

## 🎯 实施步骤

### 1. 数据库迁移（30分钟）
- ✅ 已完成基础表结构
- [ ] 删除不需要的表（tenant_modules, audit_logs）
- [ ] 简化函数（只保留核心功能）

### 2. 后端 API（1-2小时）
- [ ] `src/db/central-admin-api.ts`
  - [ ] `getAllTenants()` - 获取所有租户
  - [ ] `createTenant()` - 创建租户（自动化部署）
  - [ ] `updateTenantExpiry()` - 更新租期
  - [ ] `suspendTenant()` - 停用租户
  - [ ] `deleteTenant()` - 删除租户

### 3. 前端页面（2-3小时）
- [ ] 租户列表页面
- [ ] 创建租户页面
- [ ] 编辑租期对话框
- [ ] 确认删除对话框

### 4. 路由配置（30分钟）
- [ ] 更新 `app.config.ts`
- [ ] 添加中央管理路由
- [ ] 更新首页跳转逻辑

### 5. 测试（1小时）
- [ ] 创建租户测试
- [ ] 租期管理测试
- [ ] 停用/删除测试

**总计**：5-7 小时

## 📝 注意事项

### 1. 数据安全
- 删除租户会删除所有数据（不可恢复）
- 建议添加二次确认
- 建议添加软删除选项

### 2. 租期管理
- 过期后自动停用
- 提前 7 天提醒
- 支持续期

### 3. 性能
- 10-20 个租户完全没问题
- 查询速度快
- 创建速度快（3-5秒）

---

**文档版本**：v2.0（简化版）  
**创建日期**：2025-11-27  
**状态**：待实施 ✅
