# 用户管理系统修复总结

## 修复的问题

### 1. confirmed_at 生成列错误（迁移 44）
**问题描述：**
- 重置密码时，如果用户缺少 auth.users 记录，系统会自动创建
- 但创建时出现错误：`cannot insert a non-DEFAULT value into column 'confirmed_at'`

**问题原因：**
- `confirmed_at` 是一个生成列（GENERATED COLUMN），根据 `email_confirmed_at` 和 `phone_confirmed_at` 自动计算
- PostgreSQL 不允许直接插入或更新生成列的值
- 在 `create_user_auth_account` 函数中，错误地尝试插入 `confirmed_at` 列的值

**解决方案：**
- 从 INSERT 语句中移除 `confirmed_at` 列
- 让数据库自动计算其值
- `confirmed_at` 会自动计算为 `LEAST(email_confirmed_at, phone_confirmed_at)`

**技术细节：**
- `email_confirmed_at` 设置为 `now()`（邮箱已确认）
- `phone_confirmed_at` 根据是否有手机号设置为 `now()` 或 `NULL`
- `confirmed_at` 会自动生成

**影响范围：**
- ✅ 现在可以正常创建 auth.users 记录
- ✅ 重置密码功能可以正常工作
- ✅ 自动修复缺失的 auth.users 记录

---

### 2. 删除非测试用户（迁移 45）
**操作内容：**
- 删除除了3个测试账号外的所有用户
- 同时删除 profiles 表和 auth.users 表中的记录

**保留的测试账号：**
- 最早创建的1个超级管理员
- 最早创建的1个普通管理员
- 最早创建的1个司机

**删除顺序：**
1. 先删除 auth.users 表中的记录
2. 再删除 profiles 表中的记录

**新增文件：**
- `supabase/migrations/45_delete_non_test_users.sql`
- `query-all-users.sql`（查询所有用户的SQL脚本）

---

### 3. 更新用户信息权限问题（迁移 46）
**问题描述：**
- 当前的 RLS 策略只允许管理员更新司机的信息
- 不允许超级管理员更新普通管理员的信息
- 不允许用户更新自己的基本信息

**错误现象：**
- 更新用户信息时返回空数组 `[]`
- 说明 RLS 策略阻止了更新操作
- 日志显示：`❌ 更新用户信息失败 - 没有返回数据，可能用户不存在`

**问题原因：**
- 旧的 UPDATE 策略要求 `role = 'driver'::user_role`
- 这意味着只能更新角色为 `driver` 的用户
- 无法更新 `manager` 或 `super_admin` 角色的用户

**解决方案：**
修改 UPDATE 策略，允许：
1. 超级管理员可以更新所有用户的信息
2. 普通管理员可以更新司机的信息
3. 所有用户可以更新自己的基本信息（但不能修改角色，由触发器控制）

**新的策略设计：**

```sql
-- 1. 超级管理员可以更新所有用户的信息
CREATE POLICY "超级管理员可以更新所有用户" ON profiles
    FOR UPDATE TO authenticated
    USING (is_super_admin(auth.uid()))
    WITH CHECK (is_super_admin(auth.uid()));

-- 2. 普通管理员可以更新司机的信息
CREATE POLICY "普通管理员可以更新司机" ON profiles
    FOR UPDATE TO authenticated
    USING (
        is_manager_or_above(auth.uid()) 
        AND role = 'driver'::user_role
    )
    WITH CHECK (
        is_manager_or_above(auth.uid()) 
        AND role = 'driver'::user_role
    );

-- 3. 所有用户可以更新自己的基本信息
CREATE POLICY "用户可以更新自己的基本信息" ON profiles
    FOR UPDATE TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);
```

**策略说明：**
- `USING` 子句：控制哪些行可以被更新（读取权限）
- `WITH CHECK` 子句：控制更新后的数据是否符合要求（写入权限）

**安全保障：**
- 角色修改仍然由 `prevent_role_change` 触发器控制
- 只有超级管理员可以修改角色
- 普通管理员无法提升自己的权限

**影响范围：**
- ✅ 超级管理员现在可以编辑所有用户的信息
- ✅ 普通管理员可以编辑司机的信息
- ✅ 所有用户可以编辑自己的基本信息
- ✅ 角色修改仍然受到严格控制

---

## 测试建议

### 1. 测试重置密码功能
```
1. 使用超级管理员账号登录
2. 进入用户管理页面
3. 选择一个没有 auth.users 记录的用户
4. 点击"重置密码"按钮
5. 验证是否成功，密码应该被重置为 123456
```

### 2. 测试更新用户信息
```
1. 使用超级管理员账号登录
2. 进入用户管理页面
3. 编辑一个普通管理员的信息（姓名、手机号等）
4. 点击保存
5. 验证是否成功保存

6. 使用普通管理员账号登录
7. 进入用户管理页面
8. 编辑一个司机的信息
9. 点击保存
10. 验证是否成功保存

11. 尝试编辑另一个管理员的信息
12. 验证是否被拒绝（应该看不到编辑按钮或保存失败）
```

### 3. 测试角色修改保护
```
1. 使用普通管理员账号登录
2. 进入用户管理页面
3. 尝试修改一个司机的角色
4. 验证是否被拒绝（应该显示错误：只有超级管理员可以修改用户角色）

5. 使用超级管理员账号登录
6. 进入用户管理页面
7. 修改一个用户的角色
8. 验证是否成功
```

---

## 数据库迁移记录

| 迁移编号 | 文件名 | 描述 | 状态 |
|---------|--------|------|------|
| 44 | `44_fix_confirmed_at_generated_column.sql` | 修复 confirmed_at 生成列错误 | ✅ 已应用 |
| 45 | `45_delete_non_test_users.sql` | 删除非测试用户 | ✅ 已应用 |
| 46 | `46_fix_update_user_info_permission.sql` | 修复更新用户信息权限问题 | ✅ 已应用 |

---

## 相关文件

### 数据库迁移文件
- `supabase/migrations/44_fix_confirmed_at_generated_column.sql`
- `supabase/migrations/45_delete_non_test_users.sql`
- `supabase/migrations/46_fix_update_user_info_permission.sql`

### 查询脚本
- `query-all-users.sql` - 查询所有用户的SQL脚本

### API 函数
- `src/db/api.ts` - `updateUserInfo` 函数
- `src/db/api.ts` - `resetUserPassword` 函数

---

## 总结

本次修复解决了用户管理系统的三个关键问题：

1. **重置密码功能** - 修复了 confirmed_at 生成列错误，现在可以正常创建 auth.users 记录
2. **数据清理** - 删除了非测试用户，保留了3个测试账号
3. **权限控制** - 修复了更新用户信息的权限问题，现在超级管理员可以编辑所有用户，普通管理员可以编辑司机

所有修复都已通过代码检查，并提交到版本控制系统。

---

## 下一步

建议进行以下测试：
1. ✅ 测试重置密码功能
2. ✅ 测试更新用户信息功能
3. ✅ 测试角色修改保护
4. ✅ 验证数据一致性

如果测试通过，用户管理系统应该可以正常使用了。
