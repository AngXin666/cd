# 车队管家系统架构最终说明

## 1. 核心问题回答

### 问题：为什么还需要 boss_id？

**简短回答**：
- 当前系统使用**逻辑隔离架构**（所有数据在同一个数据库中）
- `boss_id` 字段用于**标识数据归属**，而不是用于 RLS 策略过滤
- RLS 策略只关注**角色权限**，不关注 `boss_id`

## 2. 系统架构说明

### 2.1 当前架构：逻辑隔离

```
┌─────────────────────────────────────────┐
│      Supabase 项目（单一数据库）         │
├─────────────────────────────────────────┤
│  profiles 表                            │
│  ┌────────┬────────┬──────┬──────────┐ │
│  │ id     │ name   │ role │ boss_id  │ │
│  ├────────┼────────┼──────┼──────────┤ │
│  │ uuid-1 │ 老板A  │ boss │ uuid-1   │ │ ← 租户A
│  │ uuid-2 │ 司机A1 │ drv  │ uuid-1   │ │
│  │ uuid-3 │ 司机A2 │ drv  │ uuid-1   │ │
│  ├────────┼────────┼──────┼──────────┤ │
│  │ uuid-4 │ 老板B  │ boss │ uuid-4   │ │ ← 租户B
│  │ uuid-5 │ 司机B1 │ drv  │ uuid-4   │ │
│  └────────┴────────┴──────┴──────────┘ │
└─────────────────────────────────────────┘
```

**特点**：
- 所有租户的数据存储在同一个数据库中
- 通过 `boss_id` 字段标识数据归属
- 通过 RLS 策略确保数据安全

### 2.2 boss_id 的作用

#### 作用 1：标识数据归属
```sql
-- 标识这个司机属于哪个老板
INSERT INTO profiles (id, name, role, boss_id)
VALUES ('uuid-2', '司机A1', 'driver', 'uuid-1')
                                        ↑
                                   标识归属
```

#### 作用 2：数据关联查询
```typescript
// 应用层查询：获取当前老板的所有司机
const {data: drivers} = await supabase
  .from('profiles')
  .select('*')
  .eq('role', 'driver')
  .eq('boss_id', currentUser.boss_id)  // 需要 boss_id
```

#### 作用 3：权限判断
```typescript
// 判断两个用户是否属于同一租户
function isSameTenant(user1, user2) {
  return user1.boss_id === user2.boss_id
}
```

## 3. RLS 策略的设计

### 3.1 核心原则

**RLS 策略只关注角色权限，不关注 boss_id**

为什么？因为 RLS 策略是基于当前登录用户的，Supabase 会自动处理数据隔离。

### 3.2 示例说明

#### 场景：老板A 查询司机

```typescript
// 老板A 登录后查询司机
const {data: drivers} = await supabase
  .from('profiles')
  .select('*')
  .eq('role', 'driver')
```

**RLS 策略**：
```sql
CREATE POLICY "Boss can view all users"
ON profiles FOR SELECT
USING (
  (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r(role, boss_id)) = 'super_admin'
);
```

**执行流程**：
1. Supabase 识别当前用户：`auth.uid() = 'uuid-1'`（老板A）
2. 调用 `get_user_role_and_boss('uuid-1')`，返回 `role = 'super_admin'`
3. RLS 策略判断：`role = 'super_admin'` ✅ 通过
4. 返回查询结果

**关键点**：
- ❌ RLS 策略中没有使用 `boss_id` 过滤
- ✅ 只判断了用户的角色
- ✅ 但应用层查询时添加了 `boss_id` 过滤

### 3.3 为什么应用层需要添加 boss_id 过滤？

**原因**：确保数据隔离！

```typescript
// ❌ 错误：没有 boss_id 过滤
const {data: drivers} = await supabase
  .from('profiles')
  .select('*')
  .eq('role', 'driver')
// 问题：会返回所有老板的司机（如果 RLS 策略允许）

// ✅ 正确：添加 boss_id 过滤
const {data: drivers} = await supabase
  .from('profiles')
  .select('*')
  .eq('role', 'driver')
  .eq('boss_id', currentUser.boss_id)
// 正确：只返回当前老板的司机
```

## 4. 司机权限隔离

### 4.1 RLS 策略

```sql
-- 策略 1: 司机可以查看自己
CREATE POLICY "Driver view self"
ON profiles FOR SELECT
USING (
  (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r(role, boss_id)) = 'driver'
  AND id = auth.uid()
);

-- 策略 2: 司机可以查看管理员
CREATE POLICY "Driver view admins only"
ON profiles FOR SELECT
USING (
  (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r(role, boss_id)) = 'driver'
  AND role IN ('super_admin', 'peer_admin', 'manager')
);
```

### 4.2 为什么司机不能查看其他司机？

**原因**：RLS 策略限制了！

```typescript
// 司机A1 登录后查询其他司机
const {data: otherDrivers} = await supabase
  .from('profiles')
  .select('*')
  .eq('role', 'driver')
  .neq('id', currentUser.id)
```

**RLS 策略判断**：
1. 当前用户是司机：`role = 'driver'` ✅
2. 查询的是其他司机：`role = 'driver'` ✅
3. 但是 RLS 策略只允许司机查看：
   - 自己：`id = auth.uid()` ❌（不是自己）
   - 管理员：`role IN ('super_admin', 'peer_admin', 'manager')` ❌（不是管理员）
4. 结果：返回空数组 ✅

**关键点**：
- ❌ 没有使用 `boss_id` 过滤
- ✅ 只使用了角色权限判断
- ✅ 司机不能查看其他司机

## 5. 总结

### 5.1 boss_id 的必要性

| 场景 | 是否需要 boss_id | 说明 |
|------|-----------------|------|
| 数据表字段 | ✅ 需要 | 标识数据归属 |
| RLS 策略 | ❌ 不需要 | 只关注角色权限 |
| 应用层查询 | ✅ 需要 | 确保数据隔离 |
| 权限判断 | ✅ 需要 | 判断是否同一租户 |

### 5.2 当前系统的优势

1. **简化的 RLS 策略**
   - 只关注角色权限
   - 不需要复杂的 boss_id 过滤
   - 易于理解和维护

2. **严格的司机隔离**
   - 司机只能查看自己
   - 司机可以查看管理员
   - 司机不能查看其他司机

3. **灵活的权限配置**
   - 每个老板可以为车队长设置不同的权限
   - 权限配置存储在数据库中
   - 易于管理和修改

### 5.3 最佳实践

#### RLS 策略：只关注角色权限
```sql
CREATE POLICY "Boss can view all"
ON profiles FOR SELECT
USING (
  (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r(role, boss_id)) = 'super_admin'
  -- ❌ 不需要：AND boss_id = get_current_user_boss_id()
);
```

#### 应用层查询：添加 boss_id 过滤
```typescript
const {data} = await supabase
  .from('profiles')
  .select('*')
  .eq('boss_id', currentUser.boss_id)  // ✅ 需要
```

#### 数据插入：设置 boss_id
```typescript
await supabase
  .from('profiles')
  .insert({
    name: '司机A1',
    role: 'driver',
    boss_id: currentUser.boss_id  // ✅ 需要
  })
```

## 6. 常见问题

### Q1: 为什么不直接使用物理隔离架构（每个老板一个数据库）？

**答案**：
- 成本高：每个 Supabase 项目单独计费
- 管理复杂：需要管理多个项目
- 不适合 SaaS 应用

### Q2: boss_id 字段可以删除吗？

**答案**：
- ❌ 不可以
- 需要 boss_id 标识数据归属
- 需要 boss_id 进行数据关联查询

### Q3: RLS 策略中为什么不使用 boss_id 过滤？

**答案**：
- RLS 策略基于当前登录用户
- 只需要判断角色权限
- 应用层查询时会添加 boss_id 过滤

### Q4: 如何确保数据安全？

**答案**：
- RLS 策略：限制用户只能访问有权限的数据
- 应用层过滤：添加 boss_id 过滤确保数据隔离
- 双重保护：RLS + 应用层

## 7. 下一步工作

1. ✅ 创建权限管理系统
2. ✅ 简化 RLS 策略
3. ✅ 严格的司机权限隔离
4. ⏳ 在前端实现权限配置界面
5. ⏳ 在前端实现通知系统
6. ⏳ 测试所有权限场景
