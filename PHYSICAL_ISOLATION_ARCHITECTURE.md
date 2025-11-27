# 物理隔离架构实现方案

## 1. 架构概述

### 1.1 核心理念
```
老板A → Supabase项目A → 数据库A（完全独立）
老板B → Supabase项目B → 数据库B（完全独立）
老板C → Supabase项目C → 数据库C（完全独立）
```

**特点**：
- ✅ 每个老板拥有完全独立的 Supabase 项目
- ✅ 数据在物理上完全隔离
- ✅ **不需要 boss_id 字段**
- ✅ 查询时不需要任何租户过滤条件
- ✅ RLS 策略只关注角色权限

### 1.2 与逻辑隔离的对比

| 特性 | 逻辑隔离 | 物理隔离 |
|------|---------|---------|
| 数据库数量 | 1个共享 | 每个租户1个 |
| boss_id 字段 | ✅ 需要 | ❌ 不需要 |
| RLS 复杂度 | 高（需要租户隔离） | 低（只需角色权限） |
| 数据安全性 | 中（逻辑隔离） | 高（物理隔离） |
| 管理复杂度 | 低 | 中 |
| 成本 | 低 | 高 |

## 2. 数据库结构重构

### 2.1 删除 boss_id 字段

#### 旧的表结构（逻辑隔离）
```sql
CREATE TABLE profiles (
  id uuid PRIMARY KEY,
  name text,
  role user_role,
  boss_id text NOT NULL,  -- ❌ 删除
  phone text,
  email text
);
```

#### 新的表结构（物理隔离）
```sql
CREATE TABLE profiles (
  id uuid PRIMARY KEY,
  name text,
  role user_role,
  -- ✅ 不需要 boss_id
  phone text,
  email text
);
```

### 2.2 需要修改的表

1. **profiles** - 用户信息表
2. **notifications** - 通知表
3. **leave_applications** - 请假申请表
4. **resignation_applications** - 离职申请表
5. **vehicles** - 车辆表
6. **warehouses** - 仓库表
7. **attendance_records** - 考勤记录表
8. **salary_records** - 工资记录表
9. **user_permissions** - 用户权限表
10. **notification_config** - 通知配置表

所有表都需要删除 `boss_id` 字段。

## 3. RLS 策略重构

### 3.1 简化的 RLS 策略

#### 旧的策略（逻辑隔离）
```sql
CREATE POLICY "Boss can view all users"
ON profiles FOR SELECT
USING (
  (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r(role, boss_id)) = 'super_admin'
  AND boss_id = get_current_user_boss_id()  -- ❌ 不需要
);
```

#### 新的策略（物理隔离）
```sql
CREATE POLICY "Boss can view all users"
ON profiles FOR SELECT
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin'
  -- ✅ 只关注角色权限
);
```

### 3.2 profiles 表的新 RLS 策略

```sql
-- 查看权限
CREATE POLICY "Boss and peer admin view all"
ON profiles FOR SELECT
USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('super_admin', 'peer_admin'));

CREATE POLICY "Manager view all"
ON profiles FOR SELECT
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'manager');

CREATE POLICY "Driver view self"
ON profiles FOR SELECT
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'driver' AND id = auth.uid());

CREATE POLICY "Driver view admins"
ON profiles FOR SELECT
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'driver'
  AND role IN ('super_admin', 'peer_admin', 'manager')
);

-- 插入权限
CREATE POLICY "Boss and peer admin insert all"
ON profiles FOR INSERT
WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('super_admin', 'peer_admin'));

CREATE POLICY "Manager insert drivers with permission"
ON profiles FOR INSERT
WITH CHECK (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'manager'
  AND role = 'driver'
  AND EXISTS (
    SELECT 1 FROM user_permissions
    WHERE user_id = auth.uid() AND can_add_driver = true
  )
);

-- 更新权限
CREATE POLICY "Boss and peer admin update all"
ON profiles FOR UPDATE
USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('super_admin', 'peer_admin'))
WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('super_admin', 'peer_admin'));

CREATE POLICY "Manager update drivers with permission"
ON profiles FOR UPDATE
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'manager'
  AND role = 'driver'
  AND EXISTS (
    SELECT 1 FROM user_permissions
    WHERE user_id = auth.uid() AND can_edit_driver = true
  )
)
WITH CHECK (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'manager'
  AND role = 'driver'
);

CREATE POLICY "User update self"
ON profiles FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- 删除权限
CREATE POLICY "Boss and peer admin delete all"
ON profiles FOR DELETE
USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('super_admin', 'peer_admin'));

CREATE POLICY "Manager delete drivers with permission"
ON profiles FOR DELETE
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'manager'
  AND role = 'driver'
  AND EXISTS (
    SELECT 1 FROM user_permissions
    WHERE user_id = auth.uid() AND can_delete_driver = true
  )
);
```

## 4. 前端代码重构

### 4.1 删除 boss_id 相关逻辑

#### 旧的代码（逻辑隔离）
```typescript
// ❌ 删除
const bossId = await getCurrentUserBossId(user.id)

// ❌ 删除
const {data: drivers} = await supabase
  .from('profiles')
  .select('*')
  .eq('role', 'driver')
  .eq('boss_id', bossId)  // ❌ 删除
```

#### 新的代码（物理隔离）
```typescript
// ✅ 不需要 boss_id
const {data: drivers} = await supabase
  .from('profiles')
  .select('*')
  .eq('role', 'driver')
  // ✅ 不需要 boss_id 过滤
```

### 4.2 更新 API 调用

#### 旧的 API 调用
```typescript
// ❌ 删除 boss_id 参数
export async function createDriver(driverData: any, bossId: string) {
  const {data, error} = await supabase
    .from('profiles')
    .insert({
      ...driverData,
      boss_id: bossId  // ❌ 删除
    })
}
```

#### 新的 API 调用
```typescript
// ✅ 不需要 boss_id 参数
export async function createDriver(driverData: any) {
  const {data, error} = await supabase
    .from('profiles')
    .insert({
      ...driverData
      // ✅ 不需要 boss_id
    })
}
```

## 5. 租户管理系统

### 5.1 中央管理系统

由于每个老板有独立的 Supabase 项目，需要一个中央管理系统来管理所有租户。

#### 租户配置表（存储在中央数据库）
```sql
CREATE TABLE tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  supabase_url text NOT NULL,
  supabase_anon_key text NOT NULL,
  admin_email text,
  admin_phone text,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  is_active boolean DEFAULT true
);
```

### 5.2 登录流程

```typescript
// 1. 用户输入账号密码
const phone = '13800138000'
const password = '123456'

// 2. 查询中央数据库，获取租户信息
const {data: tenant} = await centralSupabase
  .from('tenants')
  .select('*')
  .eq('admin_phone', phone)
  .maybeSingle()

if (!tenant) {
  throw new Error('租户不存在')
}

// 3. 使用租户的 Supabase 配置创建客户端
const tenantSupabase = createClient(
  tenant.supabase_url,
  tenant.supabase_anon_key
)

// 4. 使用租户的 Supabase 客户端登录
const {data: user, error} = await tenantSupabase.auth.signInWithPassword({
  phone,
  password
})

// 5. 保存租户配置到本地存储
localStorage.setItem('tenant_config', JSON.stringify({
  supabase_url: tenant.supabase_url,
  supabase_anon_key: tenant.supabase_anon_key
}))
```

### 5.3 Supabase 客户端初始化

```typescript
// src/client/supabase.ts
import {createClient} from '@supabase/supabase-js'

// 从本地存储获取租户配置
function getTenantConfig() {
  const config = localStorage.getItem('tenant_config')
  if (config) {
    return JSON.parse(config)
  }
  
  // 默认配置（用于首次登录）
  return {
    supabase_url: process.env.TARO_APP_SUPABASE_URL,
    supabase_anon_key: process.env.TARO_APP_SUPABASE_ANON_KEY
  }
}

const config = getTenantConfig()
export const supabase = createClient(
  config.supabase_url,
  config.supabase_anon_key
)
```

## 6. 环境变量配置

### 6.1 中央管理系统配置

```env
# 中央管理系统的 Supabase 配置
TARO_APP_CENTRAL_SUPABASE_URL=https://central.supabase.co
TARO_APP_CENTRAL_SUPABASE_ANON_KEY=central_anon_key
```

### 6.2 租户配置（动态获取）

租户的 Supabase 配置不再存储在 `.env` 文件中，而是从中央管理系统动态获取。

## 7. 数据迁移步骤

### 7.1 创建新的数据库迁移

```sql
-- 1. 删除所有 boss_id 字段
ALTER TABLE profiles DROP COLUMN IF EXISTS boss_id;
ALTER TABLE notifications DROP COLUMN IF EXISTS boss_id;
ALTER TABLE leave_applications DROP COLUMN IF EXISTS boss_id;
ALTER TABLE resignation_applications DROP COLUMN IF EXISTS boss_id;
ALTER TABLE vehicles DROP COLUMN IF EXISTS boss_id;
ALTER TABLE warehouses DROP COLUMN IF EXISTS boss_id;
ALTER TABLE attendance_records DROP COLUMN IF EXISTS boss_id;
ALTER TABLE salary_records DROP COLUMN IF EXISTS boss_id;
ALTER TABLE user_permissions DROP COLUMN IF EXISTS boss_id;
ALTER TABLE notification_config DROP COLUMN IF EXISTS boss_id;

-- 2. 删除 boss_id 相关的函数
DROP FUNCTION IF EXISTS get_current_user_boss_id();
DROP FUNCTION IF EXISTS get_user_role_and_boss(uuid);

-- 3. 创建简化的辅助函数
CREATE OR REPLACE FUNCTION get_user_role(p_user_id uuid)
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT role FROM profiles WHERE id = p_user_id;
$$;
```

### 7.2 更新 RLS 策略

删除所有旧的 RLS 策略，创建新的简化策略（见第3节）。

## 8. 优势与挑战

### 8.1 优势

1. **数据完全隔离**
   - 每个租户的数据在物理上完全隔离
   - 不存在数据泄露的风险

2. **简化的 RLS 策略**
   - 不需要复杂的租户隔离逻辑
   - 只关注角色权限
   - 易于理解和维护

3. **更好的性能**
   - 每个租户有独立的数据库
   - 不需要在大表中过滤数据
   - 查询性能更好

4. **灵活的扩展**
   - 可以为不同租户配置不同的数据库规格
   - 可以独立升级或迁移租户

### 8.2 挑战

1. **管理复杂度**
   - 需要管理多个 Supabase 项目
   - 需要中央管理系统

2. **成本**
   - 每个 Supabase 项目单独计费
   - 成本较高

3. **登录流程**
   - 需要先查询中央数据库获取租户配置
   - 登录流程稍微复杂

## 9. 实施计划

### 9.1 第一阶段：数据库重构
1. ✅ 创建数据库迁移，删除所有 boss_id 字段
2. ✅ 更新 RLS 策略
3. ✅ 删除 boss_id 相关函数

### 9.2 第二阶段：前端重构
1. ⏳ 更新所有 API 调用，删除 boss_id 参数
2. ⏳ 更新所有查询逻辑，删除 boss_id 过滤
3. ⏳ 更新类型定义，删除 boss_id 字段

### 9.3 第三阶段：租户管理系统
1. ⏳ 创建中央管理系统
2. ⏳ 实现租户配置管理
3. ⏳ 更新登录流程

### 9.4 第四阶段：测试与部署
1. ⏳ 测试所有功能
2. ⏳ 数据迁移
3. ⏳ 部署上线

## 10. 总结

物理隔离架构提供了最高级别的数据安全和隔离，但也带来了更高的管理复杂度和成本。对于车队管理系统这种对数据安全要求较高的应用，物理隔离架构是一个很好的选择。

通过删除所有 boss_id 字段和简化 RLS 策略，系统将变得更加简洁和易于维护。
