# 清理孤立 Schema 说明

## 问题发现

在测试 PostgreSQL Schema 功能时，发现数据库中存在一些孤立的 Schema：
- `tenant_29659703_7b22_40c3_b9c0_b56b05060fa0`
- `tenant_75b2aa94_ed8e_4e54_be74_531e6cda332b`
- `tenant_87153444_c31f_420e_9e29_3a01c50ce40a`
- `tenant_9e04dfd6_9b18_4e00_992f_bcfb73a86900`
- `tenant_d79327e9_69b4_42b7_b1b4_5d13de6e9814`

## 问题分析

### 1. 什么是孤立 Schema？

孤立 Schema 是指：
- 数据库中存在 Schema
- 但 `tenants` 表中没有对应的租户记录
- 这些 Schema 无法通过正常的租户管理界面访问和管理

### 2. 产生原因

可能的原因：
1. **测试遗留**：之前测试时创建的 Schema，但没有清理
2. **创建失败**：创建租户时，Schema 创建成功，但后续步骤失败，导致租户记录未保存
3. **删除不完整**：删除租户时，只删除了租户记录，但没有删除 Schema

### 3. 命名格式问题

这些孤立 Schema 的命名格式不符合当前系统的标准：
- **孤立 Schema 格式**：`tenant_<uuid>` （如 `tenant_29659703_7b22_40c3_b9c0_b56b05060fa0`）
- **当前标准格式**：`tenant_001`, `tenant_002`, `tenant_003`, ...

说明这些 Schema 是旧版本系统创建的。

---

## 清理过程

### 1. 验证租户记录

```sql
SELECT id, company_name, tenant_code, schema_name
FROM tenants
ORDER BY created_at DESC;
```

**结果**：tenants 表为空，确认没有租户记录

### 2. 查询所有租户 Schema

```sql
SELECT schema_name
FROM information_schema.schemata
WHERE schema_name LIKE 'tenant_%'
ORDER BY schema_name;
```

**结果**：发现 5 个孤立的 Schema

### 3. 逐个删除孤立 Schema

```sql
-- 删除第 1 个
SELECT delete_tenant_schema('tenant_29659703_7b22_40c3_b9c0_b56b05060fa0');

-- 删除第 2 个
SELECT delete_tenant_schema('tenant_75b2aa94_ed8e_4e54_be74_531e6cda332b');

-- 删除第 3 个
SELECT delete_tenant_schema('tenant_87153444_c31f_420e_9e29_3a01c50ce40a');

-- 删除第 4 个
SELECT delete_tenant_schema('tenant_9e04dfd6_9b18_4e00_992f_bcfb73a86900');

-- 删除第 5 个
SELECT delete_tenant_schema('tenant_d79327e9_69b4_42b7_b1b4_5d13de6e9814');
```

**结果**：所有 Schema 删除成功

### 4. 验证清理结果

```sql
SELECT schema_name
FROM information_schema.schemata
WHERE schema_name LIKE 'tenant_%'
ORDER BY schema_name;
```

**结果**：✅ 没有租户 Schema，清理完成

---

## 清理结果

### ✅ 清理完成

- **删除的 Schema 数量**：5 个
- **清理后的状态**：数据库中没有租户 Schema
- **tenants 表状态**：空
- **系统状态**：干净，可以开始创建新租户

---

## 预防措施

### 1. 完善删除流程

确保删除租户时，按照正确的顺序执行：
1. 删除老板账号（如果存在）
2. 删除 Schema（如果存在）← **必须执行**
3. 删除租户记录

### 2. 事务处理

创建租户时使用事务，确保要么全部成功，要么全部回滚：
```typescript
try {
  // 1. 创建租户记录
  // 2. 创建 Schema
  // 3. 创建老板账号
  // 4. 创建老板 profile
  // 5. 更新租户记录
} catch (error) {
  // 回滚：删除已创建的资源
  await supabase.rpc('delete_tenant_schema', {p_schema_name: schemaName})
  await supabase.from('tenants').delete().eq('id', tenantId)
}
```

### 3. 定期检查

定期检查是否有孤立的 Schema：
```sql
-- 查找孤立的 Schema
SELECT s.schema_name
FROM information_schema.schemata s
WHERE s.schema_name LIKE 'tenant_%'
  AND NOT EXISTS (
    SELECT 1 FROM tenants t
    WHERE t.schema_name = s.schema_name
  );
```

### 4. 空值检查

删除租户时，检查 `schema_name` 是否为 null：
```typescript
if (tenant.schema_name) {
  await supabase.rpc('delete_tenant_schema', {
    p_schema_name: tenant.schema_name
  })
} else {
  console.log('ℹ️ 租户没有 Schema，跳过删除')
}
```

---

## 相关修复

### Bug 修复：删除租户时的 Schema 错误

在清理过程中，发现了删除租户时的一个 Bug：
- **问题**：删除没有 Schema 的租户时，会出现 "null values cannot be formatted as an SQL identifier" 错误
- **原因**：没有检查 `schema_name` 是否为 null
- **修复**：在删除 Schema 之前，先检查 `schema_name` 是否存在

详见：[BUGFIX_DELETE_TENANT.md](BUGFIX_DELETE_TENANT.md)

---

## 总结

### ✅ 清理完成

1. **发现问题**：数据库中存在 5 个孤立的 Schema
2. **分析原因**：测试遗留或创建失败导致
3. **执行清理**：使用 `delete_tenant_schema()` 函数逐个删除
4. **验证结果**：所有孤立 Schema 已清理完毕
5. **预防措施**：完善删除流程，添加空值检查

### 📊 清理统计

- **清理前**：5 个孤立 Schema
- **清理后**：0 个孤立 Schema
- **清理时间**：2025-11-27
- **清理状态**：✅ 完成

---

**清理人员**：秒哒 AI  
**清理日期**：2025-11-27  
**清理状态**：✅ 完成
