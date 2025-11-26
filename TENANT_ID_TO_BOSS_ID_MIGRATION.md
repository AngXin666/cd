# tenant_id 到 boss_id 迁移方案

## 一、现状分析

### 1.1 字段对比

| 字段名 | 类型 | 用途 | 示例 |
|--------|------|------|------|
| `tenant_id` | uuid | 指向主账号的外键 | `75b2aa94-ed8e-4e54-be74-531e6cda332b` |
| `boss_id` | text | 租户唯一标识符 | `BOSS_1764145957063_60740476` |

### 1.2 tenant_id 的语义

**超级管理员（主账号）**：
- `tenant_id` = 自己的 `id`
- 表示自己是主账号

**平级账号**：
- `tenant_id` = 主账号的 `id`
- 表示属于某个主账号

**下属用户（管理员、司机）**：
- `tenant_id` = 所属超级管理员的 `id`
- 表示属于某个租户

### 1.3 boss_id 的语义

**所有用户**：
- `boss_id` = 租户的唯一标识符
- 同一租户的所有用户共享相同的 `boss_id`
- 不同租户的 `boss_id` 完全不同

### 1.4 数据示例

```
超级管理员 A:
  id: 75b2aa94-ed8e-4e54-be74-531e6cda332b
  tenant_id: 75b2aa94-ed8e-4e54-be74-531e6cda332b (指向自己)
  boss_id: BOSS_1764145957063_60740476

超级管理员 B (平级账号):
  id: 7718e31c-f386-4af1-9be8-a4b64a844abb
  tenant_id: 29659703-7b22-40c3-b9c0-b56b05060fa0 (指向主账号)
  boss_id: BOSS_1764145957063_29235549 (与主账号相同)

管理员 C:
  id: xxx
  tenant_id: 75b2aa94-ed8e-4e54-be74-531e6cda332b (指向超级管理员 A)
  boss_id: BOSS_1764145957063_60740476 (与超级管理员 A 相同)
```

## 二、迁移策略

### 2.1 核心原则

1. **保留 boss_id 作为租户标识**
   - boss_id 是更好的设计，全局唯一，不依赖用户 ID
   - boss_id 格式统一，易于识别和管理

2. **逐步替换 tenant_id**
   - 应用层代码全部改为使用 boss_id
   - 数据库查询全部改为使用 boss_id
   - RLS 策略已经使用 boss_id

3. **最终删除 tenant_id**
   - 在所有代码都迁移完成后
   - 删除数据库中的 tenant_id 字段
   - 删除相关的外键约束

### 2.2 迁移步骤

#### 阶段 1：应用层代码迁移（本次实施）

**步骤 1：创建租户上下文管理**
- 创建 `TenantContext.tsx`
- 提供 `useTenant()` hook
- 在 `App.tsx` 中集成

**步骤 2：创建查询包装函数**
- 创建 `tenantQuery.ts`
- 提供 `getCurrentUserBossId()` 函数
- 提供 `createTenantQuery()` 函数
- 提供 `insertWithTenant()` 函数

**步骤 3：替换 API 函数中的 tenant_id**
- 将所有 `tenant_id` 查询改为 `boss_id` 查询
- 将所有 `tenant_id` 插入改为 `boss_id` 插入
- 更新类型定义

**步骤 4：更新类型定义**
- 为所有接口添加 `boss_id` 字段
- 保留 `tenant_id` 字段（标记为 deprecated）
- 后续逐步删除 `tenant_id`

#### 阶段 2：数据库清理（后续实施）

**步骤 1：验证所有代码都不再使用 tenant_id**
```bash
grep -r "tenant_id" --include="*.ts" --include="*.tsx" .
```

**步骤 2：删除 tenant_id 字段**
```sql
ALTER TABLE profiles DROP COLUMN tenant_id;
ALTER TABLE warehouses DROP COLUMN tenant_id;
-- ... 其他表
```

**步骤 3：清理相关的外键约束和索引**

## 三、应用层代码迁移详情

### 3.1 需要替换的文件

根据 grep 结果，以下文件需要修改：

**核心文件**：
- `src/db/api.ts` - 主要的 API 函数文件（约 700 处）
- `src/db/types.ts` - 类型定义文件

**页面文件**：
- `src/pages/lease-admin/tenant-form/index.tsx`
- `src/pages/lease-admin/lease-list/index.tsx`

### 3.2 替换模式

**模式 1：查询时使用 tenant_id**
```typescript
// 修改前
.eq('tenant_id', tenantId)

// 修改后
.eq('boss_id', bossId)
```

**模式 2：插入时设置 tenant_id**
```typescript
// 修改前
{
  ...data,
  tenant_id: authData.user.id
}

// 修改后
{
  ...data,
  boss_id: await getCurrentUserBossId()
}
```

**模式 3：从 profile 获取 tenant_id**
```typescript
// 修改前
const {data: profile} = await supabase
  .from('profiles')
  .select('tenant_id')
  .eq('id', user.id)
  .maybeSingle()

// 修改后
const {data: profile} = await supabase
  .from('profiles')
  .select('boss_id')
  .eq('id', user.id)
  .maybeSingle()
```

**模式 4：类型定义**
```typescript
// 修改前
export interface Profile {
  id: string
  tenant_id: string
  // ...
}

// 修改后
export interface Profile {
  id: string
  boss_id: string
  /** @deprecated 使用 boss_id 代替 */
  tenant_id?: string
  // ...
}
```

## 四、实施计划

### 4.1 本次实施内容

✅ **创建基础设施**
- [x] 创建 `TenantContext.tsx`
- [x] 创建 `tenantQuery.ts`
- [x] 在 `App.tsx` 中集成

✅ **替换 API 函数**
- [x] 替换 `src/db/api.ts` 中的所有 `tenant_id`
- [x] 更新查询逻辑
- [x] 更新插入逻辑

✅ **更新类型定义**
- [x] 更新 `src/db/types.ts`
- [x] 为所有接口添加 `boss_id`
- [x] 标记 `tenant_id` 为 deprecated

✅ **更新页面代码**
- [x] 更新租赁管理相关页面
- [x] 替换所有 `tenant_id` 引用

✅ **测试验证**
- [x] 运行 lint 检查
- [x] 验证编译通过
- [x] 测试核心功能

### 4.2 后续工作

⏳ **数据库清理**（暂不实施）
- [ ] 验证所有代码都不再使用 tenant_id
- [ ] 删除 tenant_id 字段
- [ ] 清理外键约束

## 五、风险控制

### 5.1 回滚方案

如果出现问题，可以快速回滚：

```bash
# 回滚代码
git revert {commit_hash}

# 数据库不需要回滚（tenant_id 字段仍然存在）
```

### 5.2 兼容性保证

- 保留 tenant_id 字段，确保向后兼容
- 标记为 deprecated，提示开发者使用 boss_id
- 逐步迁移，降低风险

## 六、总结

### 6.1 为什么要迁移

1. **boss_id 设计更好**
   - 全局唯一，不依赖用户 ID
   - 格式统一，易于识别
   - 支持分布式环境

2. **tenant_id 存在问题**
   - 依赖用户 ID，耦合度高
   - 平级账号的 tenant_id 指向主账号，逻辑复杂
   - 不利于系统扩展

3. **统一租户标识**
   - 避免混淆
   - 简化代码逻辑
   - 提高可维护性

### 6.2 迁移收益

✅ **代码更清晰**
- 统一使用 boss_id
- 减少概念混淆
- 提高可读性

✅ **系统更安全**
- boss_id 不暴露用户 ID
- 更好的数据隔离
- 降低安全风险

✅ **扩展性更好**
- 支持更灵活的租户管理
- 易于添加新功能
- 便于系统升级
