# 代码迁移计划：从 profiles 视图到新表结构

## 迁移目标

将代码从使用 profiles 视图迁移到直接使用新的表结构（users 和 user_roles）。

## 当前状态

- ✅ 数据库已迁移到新的单用户架构
- ✅ 创建了 profiles 视图作为临时兼容方案
- ⏳ 代码仍在使用 profiles 视图（78 处引用）
- ⏳ 需要将代码迁移到新表结构

## 表结构对比

### 旧结构（profiles 视图）
```sql
profiles (VIEW)
├── id (uuid)
├── name (text)
├── email (text)
├── phone (text)
├── role (text) - 映射后的小写角色名
├── status (text) - 固定为 'active'
├── created_at (timestamptz)
├── updated_at (timestamptz)
└── main_account_id (uuid) - 固定为 NULL
```

### 新结构（实际表）
```sql
users
├── id (uuid)
├── name (text)
├── email (text)
├── phone (text)
├── avatar_url (text)
├── created_at (timestamptz)
└── updated_at (timestamptz)

user_roles
├── user_id (uuid) - 外键到 users.id
├── role (user_role) - ENUM: BOSS, DISPATCHER, DRIVER
└── assigned_at (timestamptz)
```

## 迁移策略

### 阶段 1：分析和分类 ✅

#### 查询类型分类

1. **只查询用户基本信息**（不需要角色）
   - 查询字段：id, name, email, phone
   - 迁移方案：直接使用 users 表
   - 示例：`SELECT name, email FROM profiles WHERE id = ?`
   - 改为：`SELECT name, email FROM users WHERE id = ?`

2. **只查询角色信息**
   - 查询字段：role
   - 迁移方案：使用 user_roles 表
   - 示例：`SELECT role FROM profiles WHERE id = ?`
   - 改为：`SELECT role FROM user_roles WHERE user_id = ?`

3. **同时查询用户信息和角色**
   - 查询字段：name, email, phone, role
   - 迁移方案：使用 JOIN
   - 示例：`SELECT * FROM profiles WHERE id = ?`
   - 改为：`SELECT u.*, ur.role FROM users u LEFT JOIN user_roles ur ON u.id = ur.user_id WHERE u.id = ?`

4. **更新用户信息**
   - 操作：UPDATE
   - 迁移方案：分别更新 users 和 user_roles 表
   - 示例：`UPDATE profiles SET name = ?, role = ? WHERE id = ?`
   - 改为：
     ```sql
     UPDATE users SET name = ? WHERE id = ?;
     UPDATE user_roles SET role = ? WHERE user_id = ?;
     ```

5. **插入用户**
   - 操作：INSERT
   - 迁移方案：分别插入 users 和 user_roles 表
   - 示例：`INSERT INTO profiles (id, name, role) VALUES (?, ?, ?)`
   - 改为：
     ```sql
     INSERT INTO users (id, name) VALUES (?, ?);
     INSERT INTO user_roles (user_id, role) VALUES (?, ?);
     ```

6. **删除用户**
   - 操作：DELETE
   - 迁移方案：级联删除（已配置外键）
   - 示例：`DELETE FROM profiles WHERE id = ?`
   - 改为：`DELETE FROM users WHERE id = ?` （user_roles 会自动删除）

### 阶段 2：角色名映射

#### 旧角色名 → 新角色名

| 旧角色名（小写） | 新角色名（大写） | 说明 |
|----------------|----------------|------|
| driver | DRIVER | 司机 |
| manager | DISPATCHER | 车队长/调度员 |
| super_admin | BOSS | 老板/超级管理员 |
| admin | DISPATCHER | 管理员（映射为调度员） |

#### 代码中的角色比较

**需要更新的模式：**
```typescript
// 旧代码
.eq('role', 'driver')
.eq('role', 'manager')
.eq('role', 'super_admin')

// 新代码
.eq('role', 'DRIVER')
.eq('role', 'DISPATCHER')
.eq('role', 'BOSS')
```

### 阶段 3：迁移步骤

#### 步骤 1：创建辅助函数

创建辅助函数来简化查询：

```typescript
// 查询用户完整信息（包含角色）
async function getUserWithRole(userId: string) {
  const {data, error} = await supabase
    .from('users')
    .select(`
      *,
      user_roles (
        role
      )
    `)
    .eq('id', userId)
    .maybeSingle()
  
  if (error) throw error
  
  return {
    ...data,
    role: data.user_roles?.[0]?.role || null
  }
}

// 更新用户信息（包含角色）
async function updateUserWithRole(userId: string, updates: {
  name?: string
  email?: string
  phone?: string
  role?: UserRole
}) {
  const {role, ...userUpdates} = updates
  
  // 更新用户基本信息
  if (Object.keys(userUpdates).length > 0) {
    const {error: userError} = await supabase
      .from('users')
      .update(userUpdates)
      .eq('id', userId)
    
    if (userError) throw userError
  }
  
  // 更新角色
  if (role) {
    const {error: roleError} = await supabase
      .from('user_roles')
      .update({role})
      .eq('user_id', userId)
    
    if (roleError) throw roleError
  }
}
```

#### 步骤 2：逐个函数迁移

按照以下顺序迁移：

1. **用户管理函数**（优先级：高）
   - getUserProfile
   - updateUserProfile
   - createUser
   - deleteUser

2. **角色查询函数**（优先级：高）
   - getUserRole
   - checkUserRole
   - getUsersByRole

3. **业务查询函数**（优先级：中）
   - 考勤相关查询
   - 请假相关查询
   - 计件相关查询

4. **统计函数**（优先级：中）
   - 仪表板统计
   - 报表生成

5. **其他函数**（优先级：低）
   - 辅助函数
   - 工具函数

#### 步骤 3：更新角色名

使用 sed 批量替换角色名：

```bash
# 替换 driver
sed -i "s/.eq('role', 'driver')/.eq('role', 'DRIVER')/g" src/db/api.ts

# 替换 manager
sed -i "s/.eq('role', 'manager')/.eq('role', 'DISPATCHER')/g" src/db/api.ts

# 替换 super_admin
sed -i "s/.eq('role', 'super_admin')/.eq('role', 'BOSS')/g" src/db/api.ts

# 替换 admin
sed -i "s/.eq('role', 'admin')/.eq('role', 'DISPATCHER')/g" src/db/api.ts
```

#### 步骤 4：测试验证

每迁移一个函数，都要：
1. 运行 `pnpm run lint` 检查语法错误
2. 测试该函数的功能
3. 验证数据正确性
4. 记录迁移结果

### 阶段 4：清理工作

迁移完成后：
1. 删除 profiles 视图
2. 更新文档
3. 清理临时代码
4. 运行完整测试

## 风险评估

### 高风险项

1. **角色名不匹配**
   - 风险：旧代码使用小写，新代码使用大写
   - 缓解：使用 sed 批量替换，确保一致性

2. **JOIN 查询复杂**
   - 风险：需要同时查询两个表
   - 缓解：创建辅助函数简化查询

3. **更新操作复杂**
   - 风险：需要分别更新两个表
   - 缓解：使用事务确保数据一致性

### 中风险项

1. **字段缺失**
   - 风险：新表可能缺少某些字段（如 status, main_account_id）
   - 缓解：使用固定值或 NULL

2. **性能影响**
   - 风险：JOIN 查询可能比视图慢
   - 缓解：添加索引，优化查询

### 低风险项

1. **类型定义**
   - 风险：TypeScript 类型可能不匹配
   - 缓解：更新类型定义

2. **测试覆盖**
   - 风险：可能遗漏某些边缘情况
   - 缓解：完善测试用例

## 预期收益

### 短期收益

1. **代码更清晰**
   - 直接使用实际表，逻辑更清晰
   - 减少了视图的抽象层

2. **性能提升**
   - 减少了视图的开销
   - 可以更好地优化查询

3. **维护性提高**
   - 代码与数据库结构一致
   - 更容易理解和维护

### 长期收益

1. **架构简化**
   - 完成从多租户到单用户的迁移
   - 删除临时兼容方案

2. **扩展性提高**
   - 更容易添加新功能
   - 更灵活的数据模型

3. **代码质量提升**
   - 统一的角色命名
   - 更好的类型安全

## 时间估算

| 阶段 | 预计时间 | 说明 |
|------|---------|------|
| 阶段 1：分析和分类 | 30 分钟 | 已完成 |
| 阶段 2：创建辅助函数 | 1 小时 | 编写和测试 |
| 阶段 3：迁移函数 | 3-4 小时 | 78 处引用 |
| 阶段 4：更新角色名 | 30 分钟 | 批量替换 |
| 阶段 5：测试验证 | 2 小时 | 完整测试 |
| 阶段 6：清理工作 | 1 小时 | 删除视图和文档 |
| **总计** | **8-9 小时** | 一个工作日 |

## 迁移检查清单

### 准备工作
- [x] 分析当前代码结构
- [x] 确定迁移策略
- [x] 创建迁移计划
- [ ] 备份当前代码

### 迁移工作
- [ ] 创建辅助函数
- [ ] 迁移用户管理函数
- [ ] 迁移角色查询函数
- [ ] 迁移业务查询函数
- [ ] 迁移统计函数
- [ ] 更新角色名
- [ ] 运行 lint 检查
- [ ] 修复所有错误

### 测试工作
- [ ] 测试用户登录
- [ ] 测试用户管理
- [ ] 测试角色权限
- [ ] 测试考勤功能
- [ ] 测试请假功能
- [ ] 测试计件功能
- [ ] 测试仪表板
- [ ] 测试报表

### 清理工作
- [ ] 删除 profiles 视图
- [ ] 更新文档
- [ ] 清理临时代码
- [ ] 提交代码

## 回滚计划

如果迁移失败，可以：
1. 恢复备份的代码
2. 保留 profiles 视图
3. 继续使用旧代码
4. 分析失败原因
5. 制定新的迁移计划

## 总结

这是一个复杂但必要的迁移工作。通过分阶段、有计划地执行，我们可以安全地将代码迁移到新的表结构，完成从多租户到单用户架构的最后一步。

---

**文档版本**：1.0  
**创建时间**：2025-11-29 23:45  
**预计完成时间**：2025-11-30
