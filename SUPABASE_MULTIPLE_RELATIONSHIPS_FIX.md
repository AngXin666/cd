# Supabase 多重关系查询错误修复

## 问题描述

**错误信息**：
```
[getCurrentUserWithRealName] 查询用户档案失败: {
  code: 'PGRST201',
  details: Array(2),
  hint: "Try changing 'driver_licenses' to one of the following...",
  message: "Could not embed because more than one relationship was found for 'profiles' and 'driver_licenses'"
}
```

**症状**：
- 用户管理页面无法加载
- 司机管理页面无法加载
- 请假审批页面无法加载
- 所有调用 `getCurrentUserWithRealName()` 的功能都失败

## 问题分析

### 根本原因

`driver_licenses` 表有**两个外键**指向 `profiles` 表：

```sql
-- 外键 1：司机 ID
ALTER TABLE driver_licenses
  ADD CONSTRAINT driver_licenses_driver_id_fkey
  FOREIGN KEY (driver_id) REFERENCES profiles(id);

-- 外键 2：租户 ID
ALTER TABLE driver_licenses
  ADD CONSTRAINT driver_licenses_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES profiles(id);
```

### 查询代码的问题

原始查询代码：

```typescript
const {data, error} = await supabase
  .from('profiles')
  .select(`
    *,
    driver_licenses (
      id_card_name
    )
  `)
  .eq('id', user.id)
  .maybeSingle()
```

**问题**：
- Supabase 不知道应该使用哪个外键关系
- `driver_licenses.driver_id → profiles.id` ？
- `driver_licenses.tenant_id → profiles.id` ？

### Supabase 的行为

当存在多个外键关系时，Supabase 会：
1. 检测到歧义
2. 返回 `PGRST201` 错误
3. 提示需要明确指定使用哪个关系

## 解决方案

### 修复代码

在查询中明确指定使用 `driver_id` 外键关系：

```typescript
const {data, error} = await supabase
  .from('profiles')
  .select(`
    *,
    driver_licenses!driver_licenses_driver_id_fkey (
      id_card_name
    )
  `)
  .eq('id', user.id)
  .maybeSingle()
```

**语法说明**：
- `driver_licenses!driver_licenses_driver_id_fkey` 
- `!` 后面是外键约束的名称
- 明确告诉 Supabase 使用 `driver_id` 关系

### 修改的文件

**文件**：`src/db/api.ts`

**函数**：`getCurrentUserWithRealName()`

**修改内容**：
```diff
- driver_licenses (
+ driver_licenses!driver_licenses_driver_id_fkey (
    id_card_name
  )
```

## 验证修复

### 1. 测试用户管理页面

1. 登录老板账号
2. 进入"用户管理"页面
3. 验证页面正常加载，显示用户列表

### 2. 测试司机管理页面

1. 登录车队长账号
2. 进入"司机管理"页面
3. 验证页面正常加载，显示司机列表

### 3. 测试请假审批页面

1. 登录老板账号
2. 进入"请假审批"页面
3. 验证页面正常加载，显示请假申请列表

### 4. 检查控制台日志

查看浏览器控制台，应该看到：
```
[getCurrentUserWithRealName] 开始获取当前用户（含真实姓名）
[getCurrentUserWithRealName] 当前用户ID: xxx
[getCurrentUserWithRealName] 成功获取用户档案: {id: xxx, name: xxx, real_name: xxx, role: xxx}
```

不应该再看到 `PGRST201` 错误。

## 技术细节

### 如何查找外键约束名称

```sql
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'driver_licenses'
ORDER BY tc.constraint_name;
```

**结果**：
| constraint_name | column_name | foreign_table_name | foreign_column_name |
|----------------|-------------|-------------------|-------------------|
| driver_licenses_driver_id_fkey | driver_id | profiles | id |
| driver_licenses_tenant_id_fkey | tenant_id | profiles | id |

### Supabase 关系查询语法

**基本语法**：
```typescript
.select('*, related_table(columns)')
```

**明确指定外键**：
```typescript
.select('*, related_table!foreign_key_name(columns)')
```

**示例**：
```typescript
// ❌ 错误：有歧义
.select('*, driver_licenses(id_card_name)')

// ✅ 正确：明确指定外键
.select('*, driver_licenses!driver_licenses_driver_id_fkey(id_card_name)')
```

### 为什么会有两个外键？

`driver_licenses` 表的设计：

```sql
CREATE TABLE driver_licenses (
  id uuid PRIMARY KEY,
  driver_id uuid REFERENCES profiles(id),  -- 司机 ID
  tenant_id uuid REFERENCES profiles(id),  -- 租户 ID（老板 ID）
  id_card_name text,                       -- 真实姓名
  ...
);
```

**两个外键的用途**：
1. **driver_id**：指向司机的 profiles 记录
2. **tenant_id**：指向老板的 profiles 记录（用于租户隔离）

**为什么都指向 profiles？**
- 司机是 profiles 表的一条记录（role = 'driver'）
- 老板也是 profiles 表的一条记录（role = 'super_admin'）
- 所以两个外键都指向同一个表

## 其他可能受影响的查询

### 检查所有关联查询

搜索所有可能有类似问题的查询：

```bash
grep -r "driver_licenses (" src/db/api.ts
```

### 其他可能有多重关系的表

检查是否有其他表也有多个外键指向同一个表：

```sql
SELECT 
  tc.table_name,
  COUNT(*) as fk_count,
  STRING_AGG(tc.constraint_name, ', ') as constraints
FROM information_schema.table_constraints AS tc
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND ccu.table_name = 'profiles'
GROUP BY tc.table_name
HAVING COUNT(*) > 1
ORDER BY fk_count DESC;
```

**可能需要检查的表**：
- driver_warehouses（driver_id 和 tenant_id）
- manager_warehouses（manager_id 和 tenant_id）
- vehicles（user_id 和 tenant_id）
- piece_work_records（user_id 和 tenant_id）

## 预防措施

### 1. 代码规范

当查询有多个外键指向同一个表时，**始终明确指定外键名称**：

```typescript
// ✅ 好的做法
.select('*, related_table!foreign_key_name(columns)')

// ❌ 不好的做法
.select('*, related_table(columns)')  // 可能有歧义
```

### 2. 数据库设计

如果可能，避免多个外键指向同一个表。考虑：
- 使用视图
- 使用计算字段
- 重新设计表结构

### 3. 测试

在开发阶段测试所有关联查询，确保没有歧义错误。

## 相关文档

- [多租户功能完整修复总结](./MULTI_TENANT_COMPLETE_FIX.md)
- [司机仓库分配问题修复](./DRIVER_WAREHOUSE_ASSIGNMENT_FIX.md)
- [Supabase 文档：关系查询](https://supabase.com/docs/guides/api/joins-and-nested-tables)

## 更新时间

2025-11-25 23:45:00 (UTC+8)
