# 多租户系统使用指南

## 概述

车队管家小程序现已支持多租户架构，允许多个独立的租户（车队）使用同一个应用，每个租户拥有独立的数据库和配置。

## 架构说明

### 三层架构

1. **中央管理层（Public Schema）**
   - 存储所有租户的配置信息
   - 管理租户的创建、暂停、激活、删除
   - 只有超级管理员可以访问

2. **租户数据层（Tenant Schemas）**
   - 每个租户拥有独立的 Schema
   - 物理隔离，确保数据安全
   - 租户之间数据完全隔离

3. **应用层**
   - 用户登录后自动加载所属租户的配置
   - 动态创建租户专属的 Supabase 客户端
   - 所有数据操作自动路由到正确的租户数据库

## 核心功能

### 1. 租户配置管理

超级管理员可以通过"租户配置管理"页面管理所有租户：

- **创建租户**：添加新的租户配置
- **编辑租户**：修改租户名称和数据库配置
- **暂停租户**：临时禁用租户访问
- **激活租户**：恢复租户访问
- **删除租户**：永久删除租户（软删除）

### 2. 动态客户端创建

系统会根据用户所属租户自动创建专属的 Supabase 客户端：

```typescript
import {getTenantSupabaseClient} from '@/client/tenantSupabaseManager'

// 获取当前租户的客户端
const client = await getTenantSupabaseClient()

// 使用客户端查询数据
const {data} = await client.from('warehouses').select('*')
```

### 3. 多租户认证

用户登录后，系统会自动：

1. 获取用户所属租户的配置
2. 创建租户专属的 Supabase 客户端
3. 缓存配置和客户端，提高性能
4. 显示欢迎消息

## 数据库结构

### tenant_configs 表

存储所有租户的配置信息：

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 租户ID |
| tenant_name | text | 租户名称 |
| schema_name | text | Schema 名称（唯一） |
| supabase_url | text | Supabase URL |
| supabase_anon_key | text | Supabase 匿名密钥 |
| status | text | 状态：active, suspended, deleted |
| created_at | timestamptz | 创建时间 |
| updated_at | timestamptz | 更新时间 |

### 辅助函数

- `get_tenant_config(user_id)` - 获取用户所属租户的配置
- `get_all_tenant_configs()` - 获取所有租户配置（仅超级管理员）

## 使用示例

### 1. 创建新租户

```typescript
import {createTenantConfig} from '@/db/tenantConfigApi'

const newTenant = await createTenantConfig({
  tenant_name: '张三车队',
  schema_name: 'tenant_zhangsan',
  supabase_url: 'https://xxx.supabase.co',
  supabase_anon_key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
})
```

### 2. 获取租户配置

```typescript
import {getUserTenantConfig} from '@/db/tenantConfigApi'

const config = await getUserTenantConfig(userId)
console.log('租户名称:', config.tenant_name)
console.log('Schema:', config.schema_name)
```

### 3. 使用租户客户端

```typescript
import {getTenantSupabaseClient} from '@/client/tenantSupabaseManager'

// 获取租户客户端
const client = await getTenantSupabaseClient()

// 查询数据（自动路由到正确的租户数据库）
const {data: warehouses} = await client.from('warehouses').select('*')
const {data: drivers} = await client.from('drivers').select('*')
```

### 4. 使用多租户认证上下文

```typescript
import {useMultiTenantAuth} from '@/contexts/MultiTenantAuthContext'

const MyComponent: React.FC = () => {
  const {user, tenantConfig, tenantClient, refreshTenantConfig} = useMultiTenantAuth()

  if (!user) {
    return <Text>请先登录</Text>
  }

  return (
    <View>
      <Text>当前用户: {user.email}</Text>
      <Text>所属租户: {tenantConfig?.tenant_name}</Text>
    </View>
  )
}
```

## 权限控制

### RLS 策略

- **超级管理员**：可以查看和管理所有租户配置
- **普通用户**：只能通过 `get_tenant_config` 函数获取自己所属租户的配置
- **租户配置表**：启用 RLS，确保数据安全

### 访问控制

```sql
-- 超级管理员可以查看所有租户配置
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
```

## 性能优化

### 1. 客户端缓存

系统会缓存已创建的 Supabase 客户端，避免重复创建：

```typescript
// 第一次调用：创建客户端并缓存
const client1 = await getTenantSupabaseClient()

// 第二次调用：直接从缓存获取
const client2 = await getTenantSupabaseClient()

// client1 === client2 (同一个实例)
```

### 2. 配置缓存

租户配置会缓存到本地存储，减少网络请求：

```typescript
// 第一次：从服务器获取并缓存
const config1 = await getTenantConfig(userId)

// 第二次：从本地缓存获取
const config2 = await getTenantConfig(userId)
```

### 3. 清除缓存

需要时可以手动清除缓存：

```typescript
import {clearClientCache, switchTenant} from '@/client/tenantSupabaseManager'

// 清除所有客户端缓存
clearClientCache()

// 切换租户（会自动清除缓存）
await switchTenant(userId)
```

## 最佳实践

### 1. 始终使用租户客户端

```typescript
// ✅ 推荐：使用租户客户端
const client = await getTenantSupabaseClient()
const {data} = await client.from('warehouses').select('*')

// ❌ 不推荐：直接使用全局客户端（可能访问错误的数据库）
import {supabase} from '@/client/supabase'
const {data} = await supabase.from('warehouses').select('*')
```

### 2. 错误处理

```typescript
try {
  const client = await getTenantSupabaseClient()
  const {data, error} = await client.from('warehouses').select('*')
  
  if (error) {
    throw error
  }
  
  return data
} catch (error) {
  console.error('查询失败:', error)
  Taro.showToast({
    title: '查询失败',
    icon: 'none'
  })
  return []
}
```

### 3. 登录后刷新配置

```typescript
const {refreshTenantConfig} = useMultiTenantAuth()

// 用户信息更新后，刷新租户配置
await refreshTenantConfig()
```

## 故障排查

### 问题 1：未找到租户配置

**原因**：用户的 `tenant_id` 未设置或配置不存在

**解决方案**：
1. 检查 `profiles` 表中用户的 `tenant_id` 字段
2. 确认 `tenant_configs` 表中存在对应的配置
3. 检查配置的 `status` 是否为 `active`

### 问题 2：无法访问租户数据

**原因**：客户端未正确创建或配置错误

**解决方案**：
1. 检查租户配置中的 `supabase_url` 和 `supabase_anon_key` 是否正确
2. 清除缓存并重新登录
3. 检查网络连接

### 问题 3：权限不足

**原因**：RLS 策略限制访问

**解决方案**：
1. 确认用户角色正确
2. 检查 RLS 策略配置
3. 使用 `SECURITY DEFINER` 函数绕过 RLS

## 迁移指南

### 从单租户迁移到多租户

1. **创建租户配置**

```sql
INSERT INTO public.tenant_configs (tenant_name, schema_name, supabase_url, supabase_anon_key)
VALUES ('默认租户', 'public', 'https://xxx.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
```

2. **更新用户的 tenant_id**

```sql
UPDATE public.profiles
SET tenant_id = (SELECT id FROM public.tenant_configs WHERE schema_name = 'public')
WHERE tenant_id IS NULL;
```

3. **更新代码**

```typescript
// 旧代码
import {supabase} from '@/client/supabase'
const {data} = await supabase.from('warehouses').select('*')

// 新代码
import {getTenantSupabaseClient} from '@/client/tenantSupabaseManager'
const client = await getTenantSupabaseClient()
const {data} = await client.from('warehouses').select('*')
```

## 相关文档

- [物理隔离架构指南](docs/TENANT_ISOLATION_GUIDE.md)
- [API 使用指南](docs/API_GUIDE.md)
- [数据库架构](supabase/migrations/README.md)
- [boss_id 删除报告](BOSS_ID_REMOVAL_REPORT.md)

## 更新日志

### 2025-11-05
- ✅ 创建租户配置管理系统
- ✅ 实现动态 Supabase 客户端创建
- ✅ 更新登录流程支持多租户
- ✅ 添加租户配置管理页面
- ✅ 创建多租户认证上下文
- ✅ 完善文档和示例代码
