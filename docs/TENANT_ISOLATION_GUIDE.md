# 独立数据库隔离使用指南

## 概述

本系统采用 **PostgreSQL Schema 隔离** 实现真正的多租户数据隔离。每个租户（老板）拥有独立的 Schema，数据完全隔离，无需 RLS 策略和 boss_id 字段。

## 架构说明

### 传统方案 vs 独立数据库方案

| 特性 | 传统 RLS 方案 | 独立数据库方案 |
|------|--------------|---------------|
| 数据隔离 | 逻辑隔离（RLS） | 物理隔离（Schema） |
| 需要 boss_id | ✅ 是 | ❌ 否 |
| 需要 RLS 策略 | ✅ 是 | ❌ 否 |
| 跨租户泄露风险 | ⚠️ 中等 | ✅ 极低 |
| 查询性能 | ⚠️ 需检查 boss_id | ✅ 无额外开销 |
| 实施复杂度 | ⚠️ 复杂 | ✅ 简单 |

### Schema 命名规则

每个租户的 Schema 命名格式：`tenant_<boss_id>`

例如：
- 老板 ID: `29659703-7b22-40c3-b9c0-b56b05060fa0`
- Schema 名称: `tenant_29659703_7b22_40c3_b9c0_b56b05060fa0`

## 使用方法

### 1. 在应用代码中使用

#### 方式一：使用租户客户端（推荐）

```typescript
import { getTenantSupabaseClient } from '@/client/tenant-supabase'

// 获取自动配置了租户 Schema 的客户端
const client = await getTenantSupabaseClient()

// 查询数据（自动从当前租户的 Schema 中查询）
const { data: warehouses } = await client
  .from('warehouses')
  .select('*')

// 插入数据（自动插入到当前租户的 Schema）
const { data, error } = await client
  .from('warehouses')
  .insert({ name: '新仓库' })
```

#### 方式二：手动初始化会话

```typescript
import { TenantSchemaManager } from '@/client/tenant-supabase'
import { supabase } from '@/client/supabase'

// 在用户登录后初始化租户会话
await TenantSchemaManager.initSession()

// 之后的所有查询都会自动使用租户 Schema
const { data } = await supabase.from('warehouses').select('*')
```

### 2. 在页面组件中使用

```typescript
import React, { useEffect, useState } from 'react'
import { getTenantSupabaseClient } from '@/client/tenant-supabase'

const WarehousePage: React.FC = () => {
  const [warehouses, setWarehouses] = useState([])

  useEffect(() => {
    loadWarehouses()
  }, [])

  const loadWarehouses = async () => {
    // 使用租户客户端
    const client = await getTenantSupabaseClient()
    const { data } = await client.from('warehouses').select('*')
    setWarehouses(data || [])
  }

  return (
    <View>
      {warehouses.map(w => (
        <Text key={w.id}>{w.name}</Text>
      ))}
    </View>
  )
}
```

### 3. 新租户注册时创建 Schema

```typescript
import { TenantSchemaManager } from '@/client/tenant-supabase'

// 在新老板注册成功后
const handleBossRegistration = async (bossId: string) => {
  // 创建租户的独立 Schema
  const success = await TenantSchemaManager.createSchema(bossId)
  
  if (success) {
    console.log('✅ 租户 Schema 创建成功')
  } else {
    console.error('❌ 租户 Schema 创建失败')
  }
}
```

## 数据库操作

### 查看所有租户 Schema

```sql
SELECT schema_name
FROM information_schema.schemata
WHERE schema_name LIKE 'tenant_%'
ORDER BY schema_name;
```

### 查看特定租户的数据

```sql
-- 设置 search_path
SET search_path TO tenant_29659703_7b22_40c3_b9c0_b56b05060fa0, public;

-- 查询数据
SELECT * FROM warehouses;
SELECT * FROM profiles;
```

### 为新租户创建 Schema

```sql
-- 调用函数创建 Schema
SELECT create_tenant_schema('新老板的UUID');
```

### 迁移租户数据

```sql
-- 如果需要手动迁移数据
SELECT migrate_tenant_data('租户UUID');
```

## 最佳实践

### 1. 始终使用租户客户端

❌ **错误做法**：
```typescript
import { supabase } from '@/client/supabase'

// 直接使用 supabase 客户端会查询 public schema
const { data } = await supabase.from('warehouses').select('*')
```

✅ **正确做法**：
```typescript
import { getTenantSupabaseClient } from '@/client/tenant-supabase'

// 使用租户客户端会自动查询租户 Schema
const client = await getTenantSupabaseClient()
const { data } = await client.from('warehouses').select('*')
```

### 2. 在登录后初始化会话

```typescript
import { TenantSchemaManager } from '@/client/tenant-supabase'

// 在用户登录成功后
const handleLoginSuccess = async () => {
  // 初始化租户会话
  await TenantSchemaManager.initSession()
  
  // 跳转到主页
  Taro.switchTab({ url: '/pages/home/index' })
}
```

### 3. 错误处理

```typescript
const loadData = async () => {
  try {
    const client = await getTenantSupabaseClient()
    const { data, error } = await client.from('warehouses').select('*')
    
    if (error) {
      console.error('查询失败:', error)
      Taro.showToast({
        title: '加载数据失败',
        icon: 'error'
      })
      return
    }
    
    setWarehouses(data)
  } catch (error) {
    console.error('异常:', error)
  }
}
```

## 迁移指南

### 从 RLS 模式迁移到 Schema 模式

1. **数据已自动迁移** - 所有租户数据已迁移到各自的 Schema
2. **更新代码** - 将所有 `supabase` 替换为 `getTenantSupabaseClient()`
3. **移除 boss_id** - 不再需要在查询中过滤 boss_id
4. **移除 RLS 依赖** - 不再需要依赖 RLS 策略

### 代码迁移示例

**迁移前：**
```typescript
// 需要手动过滤 boss_id
const { data } = await supabase
  .from('warehouses')
  .select('*')
  .eq('boss_id', currentBossId)
```

**迁移后：**
```typescript
// 自动查询当前租户的数据
const client = await getTenantSupabaseClient()
const { data } = await client
  .from('warehouses')
  .select('*')
```

## 常见问题

### Q: 为什么查询不到数据？

A: 确保已经调用 `getTenantSupabaseClient()` 或 `TenantSchemaManager.initSession()`。

### Q: 如何查看当前使用的 Schema？

A: 使用以下代码：
```typescript
import { TenantSchemaManager } from '@/client/tenant-supabase'

const schema = await TenantSchemaManager.getSchema()
console.log('当前 Schema:', schema)
```

### Q: 新租户注册后看不到数据？

A: 确保在注册流程中调用了 `TenantSchemaManager.createSchema(bossId)`。

### Q: 如何备份租户数据？

A: 使用 pg_dump 备份特定 Schema：
```bash
pg_dump -n tenant_xxx -f tenant_xxx_backup.sql
```

## 技术支持

如有问题，请查看：
- [TODO_SCHEMA_ISOLATION.md](../TODO_SCHEMA_ISOLATION.md) - 实施进度
- [数据库迁移文件](../supabase/migrations/) - 迁移脚本
