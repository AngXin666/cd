# Bug 修复：删除租户时的 Schema 错误

## 问题描述

删除中央管理系统中预设的模拟租户账号时出现错误：

```
central-admin-api.ts:293 ❌ 删除 Schema 失败: null values cannot be formatted as an SQL identifier
```

## 问题原因

1. **模拟租户没有 Schema**：预设的模拟租户（如测试账号）可能没有 `schema_name` 字段（值为 null）
2. **缺少空值检查**：删除函数在调用 `delete_tenant_schema` RPC 时，没有检查 `schema_name` 是否为 null
3. **SQL 错误**：PostgreSQL 的 RPC 函数无法处理 null 值作为 SQL 标识符

## 解决方案

在删除 Schema 之前，先检查 `schema_name` 是否存在：

```typescript
// 3. 删除 Schema（会删除所有表和数据）
// 只有当 schema_name 存在时才删除 Schema
if (tenant.schema_name) {
  const {data: schemaResult, error: schemaError} = await supabase.rpc('delete_tenant_schema', {
    p_schema_name: tenant.schema_name
  })

  if (schemaError || !schemaResult?.success) {
    console.error('❌ 删除 Schema 失败:', schemaError || schemaResult?.error)
    // 继续执行，不中断
  } else {
    console.log('✅ Schema 删除成功')
  }
} else {
  console.log('ℹ️ 租户没有 Schema，跳过删除')
}
```

## 修改内容

### 文件：`src/db/central-admin-api.ts`

**修改位置**：第 216-231 行

**修改前**：
```typescript
// 3. 删除 Schema（会删除所有表和数据）
const {data: schemaResult, error: schemaError} = await supabase.rpc('delete_tenant_schema', {
  p_schema_name: tenant.schema_name
})

if (schemaError || !schemaResult?.success) {
  console.error('❌ 删除 Schema 失败:', schemaError || schemaResult?.error)
  // 继续执行，不中断
} else {
  console.log('✅ Schema 删除成功')
}
```

**修改后**：
```typescript
// 3. 删除 Schema（会删除所有表和数据）
// 只有当 schema_name 存在时才删除 Schema
if (tenant.schema_name) {
  const {data: schemaResult, error: schemaError} = await supabase.rpc('delete_tenant_schema', {
    p_schema_name: tenant.schema_name
  })

  if (schemaError || !schemaResult?.success) {
    console.error('❌ 删除 Schema 失败:', schemaError || schemaResult?.error)
    // 继续执行，不中断
  } else {
    console.log('✅ Schema 删除成功')
  }
} else {
  console.log('ℹ️ 租户没有 Schema，跳过删除')
}
```

## 影响范围

### 修复的场景
- ✅ 删除没有 Schema 的模拟租户（如测试账号）
- ✅ 删除 `schema_name` 为 null 的租户记录
- ✅ 避免 SQL 标识符错误

### 不影响的场景
- ✅ 删除正常创建的租户（有 Schema）
- ✅ 删除租户的其他步骤（删除老板账号、删除租户记录）

## 测试

### 测试步骤
1. 登录中央管理系统（账号：13800000001，密码：hye19911206）
2. 进入租户管理页面
3. 找到预设的模拟租户（没有 Schema 的租户）
4. 点击"删除"按钮
5. 确认删除

### 预期结果
- ✅ 不再出现 "null values cannot be formatted as an SQL identifier" 错误
- ✅ 控制台显示 "ℹ️ 租户没有 Schema，跳过删除"
- ✅ 租户记录成功删除
- ✅ 删除操作完成

## 相关代码

### 函数：`deleteTenant()`
- **文件**：`src/db/central-admin-api.ts`
- **行数**：189-242
- **功能**：删除租户及其所有相关数据

### 删除流程
1. 查询租户信息
2. 删除老板账号（如果存在）
3. 删除 Schema（如果存在）← **本次修复的位置**
4. 删除租户记录

## 防御性编程

这次修复体现了防御性编程的重要性：

1. **空值检查**：在使用任何可能为 null 的值之前，先检查其是否存在
2. **容错处理**：即使某个步骤失败，也继续执行后续步骤
3. **清晰日志**：提供明确的日志信息，帮助调试

## 相关文档
- [中央管理系统 API](src/db/central-admin-api.ts)
- [租户管理页面](src/pages/central-admin/tenants/index.tsx)
- [README](README.md)

---

**修复时间**：2025-11-27  
**修复人员**：秒哒 AI  
**Bug 严重程度**：中等（影响删除模拟租户功能）  
**修复状态**：✅ 已完成
