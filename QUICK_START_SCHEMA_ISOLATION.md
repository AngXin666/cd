# 独立数据库隔离 - 快速入门

## 🎯 什么是独立数据库隔离？

每个租户（老板）拥有**完全独立的数据库 Schema**，数据物理隔离，互不干扰。

### 简单对比

**之前（RLS 模式）：**
```
所有租户的数据混在一起 → 用 boss_id 区分 → 容易出错 ❌
```

**现在（Schema 模式）：**
```
每个租户独立的数据库 → 物理隔离 → 绝对安全 ✅
```

## 🚀 如何使用

### 1. 在任何页面查询数据

```typescript
import { getTenantSupabaseClient } from '@/client/tenant-supabase'

// 获取租户客户端
const client = await getTenantSupabaseClient()

// 查询数据（自动查询当前租户的数据）
const { data } = await client.from('warehouses').select('*')
```

就这么简单！**不需要过滤 boss_id，不需要担心数据泄露。**

### 2. 在登录后初始化

```typescript
import { TenantSchemaManager } from '@/client/tenant-supabase'

// 用户登录成功后
await TenantSchemaManager.initSession()
```

### 3. 新租户注册时

```typescript
import { TenantSchemaManager } from '@/client/tenant-supabase'

// 新老板注册成功后
await TenantSchemaManager.createSchema(bossId)
```

## ✅ 核心优势

### 1. 绝对安全
- ✅ 每个租户的数据在独立的 Schema 中
- ✅ 物理隔离，无法跨租户访问
- ✅ 即使代码出错也不会泄露数据

### 2. 代码简单
- ✅ 不需要 `boss_id` 字段
- ✅ 不需要 RLS 策略
- ✅ 不需要在每个查询中过滤

### 3. 性能更好
- ✅ 无需检查 `boss_id`
- ✅ 无 RLS 策略开销
- ✅ 查询更快

## 📊 代码对比

### 查询数据

**之前：**
```typescript
// ❌ 需要手动过滤 boss_id，容易忘记
const { data } = await supabase
  .from('warehouses')
  .select('*')
  .eq('boss_id', currentBossId)  // 容易出错
```

**现在：**
```typescript
// ✅ 自动查询当前租户的数据
const client = await getTenantSupabaseClient()
const { data } = await client.from('warehouses').select('*')
```

### 插入数据

**之前：**
```typescript
// ❌ 需要手动设置 boss_id
const { data } = await supabase
  .from('warehouses')
  .insert({
    name: '新仓库',
    boss_id: currentBossId  // 容易忘记
  })
```

**现在：**
```typescript
// ✅ 自动插入到当前租户的 Schema
const client = await getTenantSupabaseClient()
const { data } = await client
  .from('warehouses')
  .insert({ name: '新仓库' })  // 无需 boss_id
```

## 🎉 已完成的工作

- ✅ 为 4 个现有租户创建了独立的 Schema
- ✅ 数据已迁移到各租户的 Schema
- ✅ 创建了租户客户端包装器
- ✅ 提供了完整的使用文档

## 📚 更多文档

- [完整使用指南](docs/TENANT_ISOLATION_GUIDE.md)
- [实施总结](SCHEMA_ISOLATION_SUMMARY.md)
- [实施进度](TODO_SCHEMA_ISOLATION.md)

## 💡 记住这三点

1. **使用租户客户端** - `getTenantSupabaseClient()`
2. **登录后初始化** - `TenantSchemaManager.initSession()`
3. **新租户创建 Schema** - `TenantSchemaManager.createSchema()`

就这么简单！🎊
