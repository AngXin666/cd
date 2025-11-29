# 从 profiles 视图迁移到 users/user_roles 表

## 迁移日期
2025-11-30

## 迁移目标

将代码从使用 `profiles` 视图迁移到直接使用 `users` 和 `user_roles` 表，提升代码质量和性能。

## 当前状态

### 数据库结构

**users 表**：
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT UNIQUE,
  email TEXT,
  name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**user_roles 表**：
```sql
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role)
);
```

**profiles 视图**（临时兼容方案）：
```sql
CREATE OR REPLACE VIEW profiles AS
SELECT 
  u.id,
  u.name,
  u.email,
  u.phone,
  ur.role,
  'active'::text AS status,
  u.created_at,
  u.updated_at,
  NULL::uuid AS main_account_id
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id;
```

### 代码使用情况

- **类型定义**：`Profile` 接口（兼容旧代码）
- **API 函数**：大量使用 `profiles` 视图
- **页面代码**：70+ 个文件使用 `Profile` 类型

## 迁移计划

### 阶段 1：准备工作（已完成）

- [x] 分析数据库结构
- [x] 分析代码使用情况
- [x] 创建迁移计划文档

### 阶段 2：更新类型定义

- [ ] 创建新的 `UserWithRole` 类型
- [ ] 保留 `Profile` 类型作为别名（向后兼容）
- [ ] 更新导出

### 阶段 3：更新 API 函数

#### 3.1 用户管理 API（users.ts）

需要更新的函数：
- [ ] `getCurrentUserProfile()` - 改为查询 users + user_roles
- [ ] `getAllUsers()` - 改为查询 users + user_roles
- [ ] `getUserById()` - 改为查询 users + user_roles
- [ ] `getAllDrivers()` - 改为查询 users + user_roles
- [ ] `getAllManagers()` - 改为查询 users + user_roles
- [ ] `updateUserInfo()` - 改为更新 users 表
- [ ] `updateUserRole()` - 改为更新 user_roles 表
- [ ] `createUser()` - 改为插入 users + user_roles

#### 3.2 其他 API 模块

- [ ] 检查所有 API 模块中使用 `profiles` 的地方
- [ ] 逐个更新为使用 `users` + `user_roles`

### 阶段 4：更新页面代码

- [ ] 更新类型导入（从 `Profile` 到 `UserWithRole`）
- [ ] 测试所有页面功能

### 阶段 5：清理工作

- [ ] 删除 `profiles` 视图
- [ ] 删除 `Profile` 类型别名
- [ ] 更新文档

### 阶段 6：测试验证

- [ ] 运行 lint 测试
- [ ] 测试所有核心功能
- [ ] 验证数据一致性

## 迁移策略

### 1. 渐进式迁移

采用渐进式迁移策略，逐步替换代码：

1. **第一步**：创建新的类型定义，保留旧类型作为别名
2. **第二步**：更新 API 函数，使用新的查询方式
3. **第三步**：更新页面代码，使用新的类型
4. **第四步**：删除旧的视图和类型别名

### 2. 向后兼容

在迁移过程中保持向后兼容：

- 保留 `Profile` 类型作为 `UserWithRole` 的别名
- API 函数返回相同的数据结构
- 确保所有现有功能正常工作

### 3. 测试驱动

每个阶段完成后都要进行测试：

- 运行 lint 测试
- 测试核心功能
- 验证数据一致性

## 技术细节

### 查询方式对比

**旧方式（使用 profiles 视图）**：
```typescript
const { data, error } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', userId)
  .single()
```

**新方式（使用 users + user_roles）**：
```typescript
const { data, error } = await supabase
  .from('users')
  .select(`
    *,
    user_roles (
      role
    )
  `)
  .eq('id', userId)
  .single()

// 转换数据结构
const userWithRole = {
  ...data,
  role: data.user_roles?.[0]?.role || null
}
```

### 类型定义对比

**旧类型（Profile）**：
```typescript
export interface Profile {
  id: string
  phone: string | null
  email: string | null
  name: string
  role: UserRole
  avatar_url: string | null
  created_at: string
  updated_at: string
}
```

**新类型（UserWithRole）**：
```typescript
export interface UserWithRole {
  id: string
  phone: string | null
  email: string | null
  name: string
  role: UserRole | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

// 向后兼容
export type Profile = UserWithRole
```

## 预期收益

### 1. 性能提升

- ✅ 减少视图查询开销
- ✅ 直接查询表，性能更好
- ✅ 更好的查询优化

### 2. 代码质量提升

- ✅ 更清晰的数据模型
- ✅ 更好的类型安全
- ✅ 更易于维护

### 3. 灵活性提升

- ✅ 支持多角色用户
- ✅ 更灵活的权限管理
- ✅ 更容易扩展

## 风险评估

### 潜在风险

1. **数据不一致**
   - 风险：迁移过程中可能出现数据不一致
   - 缓解：每个阶段都进行测试验证

2. **功能中断**
   - 风险：迁移过程中可能影响现有功能
   - 缓解：采用渐进式迁移，保持向后兼容

3. **性能问题**
   - 风险：新的查询方式可能影响性能
   - 缓解：优化查询，添加索引

### 回滚计划

如果迁移出现问题，可以快速回滚：

1. 保留 `profiles` 视图
2. 恢复旧的 API 函数
3. 恢复旧的类型定义

## 时间估算

- **阶段 1**：准备工作 - 已完成
- **阶段 2**：更新类型定义 - 30 分钟
- **阶段 3**：更新 API 函数 - 2 小时
- **阶段 4**：更新页面代码 - 1 小时
- **阶段 5**：清理工作 - 30 分钟
- **阶段 6**：测试验证 - 1 小时

**总计**：约 5 小时

## 执行计划

### 立即执行

1. 更新类型定义
2. 更新 API 函数
3. 运行测试

### 后续执行

1. 更新页面代码
2. 清理工作
3. 最终测试

---

**迁移状态**：🚀 准备开始
**开始日期**：2025-11-30
**预计完成**：2025-11-30
