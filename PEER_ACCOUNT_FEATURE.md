# 平级账号管理功能

## 功能概述

为租赁管理系统添加了**平级账号**功能，允许每个老板（super_admin）拥有多个平级账号。这些平级账号与主账号共享同一个租户的数据，但拥有独立的登录凭证。

## 使用场景

1. **多人管理**：一个车队可以有多个管理者，每个人都有自己的账号
2. **权限分离**：不同的管理者可以使用不同的账号登录，便于追踪操作记录
3. **灵活配置**：可以为不同的管理者设置不同的月租费用

## 核心概念

### 主账号（Primary Account）
- `main_account_id` 为 `NULL`
- 第一个创建的老板账号
- 可以创建多个平级账号
- 拥有独立的 `tenant_id`

### 平级账号（Peer Account）
- `main_account_id` 指向主账号的 ID
- 与主账号共享相同的 `tenant_id`
- 可以访问主账号租户下的所有数据
- 拥有独立的登录凭证（邮箱和密码）

## 数据库设计

### 迁移 049：添加 main_account_id 字段

```sql
-- 添加 main_account_id 字段
ALTER TABLE profiles
ADD COLUMN main_account_id uuid REFERENCES profiles(id) ON DELETE CASCADE;

-- 创建索引
CREATE INDEX idx_profiles_main_account_id ON profiles(main_account_id);
```

### 约束和触发器

1. **主账号验证触发器**
   - 确保 `main_account_id` 指向的账号是主账号（其 `main_account_id` 为 NULL）
   - 防止创建多层级的账号关系

2. **辅助函数**
   - `get_primary_account_id(account_id)`: 获取主账号 ID
   - `get_all_peer_accounts(account_id)`: 获取所有平级账号（包括主账号）

## API 函数

### 1. createPeerAccount()

创建平级账号，绑定到主账号。

```typescript
async function createPeerAccount(
  mainAccountId: string,
  account: {
    name: string | null
    phone: string | null
    company_name?: string | null
    monthly_fee?: number | null
    notes?: string | null
  },
  email: string,
  password: string
): Promise<Profile | null>
```

**功能**：
- 验证主账号是否存在且为主账号
- 创建认证用户
- 创建 profiles 记录，设置 `main_account_id` 和 `tenant_id`

### 2. getPeerAccounts()

获取主账号的所有平级账号（包括主账号本身）。

```typescript
async function getPeerAccounts(accountId: string): Promise<Profile[]>
```

**功能**：
- 自动识别当前账号是主账号还是平级账号
- 返回主账号和所有平级账号的列表

### 3. isPrimaryAccount()

检查账号是否为主账号。

```typescript
async function isPrimaryAccount(accountId: string): Promise<boolean>
```

## UI 功能

### 租赁管理端 - 老板账号列表

**路径**：`/pages/lease-admin/tenant-list/index`

**新增功能**：

1. **账号类型标识**
   - 主账号：显示蓝色"主账号"标签
   - 平级账号：显示紫色"平级账号"标签

2. **新增老板账号按钮**
   - 仅在主账号卡片上显示
   - 点击后跳转到创建平级账号表单

**界面示例**：

```
┌─────────────────────────────────────┐
│ 测试2  [主账号] [正常]              │
│ 电话：13700000001                   │
│ 公司：测试2                         │
│ 月租：¥1000                         │
│ [详情] [编辑] [停用] [删除]         │
│ [新增老板账号]                      │  ← 仅主账号显示
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 管理员  [平级账号] [正常]           │
│ 电话：13800000001                   │
│ 公司：测试2                         │
│ 月租：¥1000                         │
│ [详情] [编辑] [停用] [删除]         │
└─────────────────────────────────────┘
```

### 租赁管理端 - 创建平级账号表单

**路径**：`/pages/lease-admin/tenant-form/index?mode=create_peer&mainAccountId=xxx`

**表单字段**：

| 字段 | 必填 | 说明 |
|------|------|------|
| 姓名 | ✅ | 平级账号的姓名 |
| 电话 | ✅ | 联系电话 |
| 邮箱 | ✅ | 登录邮箱（独立） |
| 密码 | ✅ | 登录密码（至少6位） |
| 备注 | ❌ | 备注信息 |

**自动继承的字段**：
- **公司名称**：自动继承主账号的公司名称（不显示输入框）
- **月租费用**：自动继承主账号的月租费用（不显示输入框）
- **租赁开始日期**：继承主账号的租赁开始日期
- **租赁结束日期**：继承主账号的租赁结束日期

**特殊说明**：
- 创建平级账号时，表单只显示必要的个人信息字段
- 公司相关信息（公司名称、月租费用、租赁日期）全部自动继承，无需手动输入
- `tenant_id` 自动设置为主账号的 `tenant_id`
- `main_account_id` 自动设置为主账号的 ID

## 数据隔离

### 租户隔离

平级账号与主账号共享相同的 `tenant_id`，因此：

✅ **可以访问**：
- 主账号租户下的所有司机
- 主账号租户下的所有车辆
- 主账号租户下的所有计件记录
- 主账号租户下的所有仓库
- 主账号租户下的所有管理员

❌ **不能访问**：
- 其他租户的任何数据

### 权限说明

平级账号与主账号拥有**相同的权限**：
- 角色都是 `super_admin`
- 可以管理司机、车辆、计件记录等
- 可以查看统计数据和报表

## 使用流程

### 1. 创建主账号

租赁管理员创建第一个老板账号：

1. 进入"老板账号管理"
2. 点击"新增老板账号"
3. 填写表单（包括租赁日期）
4. 提交创建

**结果**：
- 创建一个主账号（`main_account_id` 为 NULL）
- 自动设置 `tenant_id` 为自己的 ID

### 2. 创建平级账号

为主账号创建平级账号：

1. 在老板账号列表中找到主账号
2. 点击主账号卡片上的"新增老板账号"按钮
3. 填写平级账号信息
4. 提交创建

**结果**：
- 创建一个平级账号（`main_account_id` 指向主账号）
- 自动设置 `tenant_id` 为主账号的 `tenant_id`
- 可以使用独立的邮箱和密码登录

### 3. 登录和使用

平级账号登录后：

1. 使用自己的邮箱和密码登录
2. 进入老板端界面
3. 可以看到主账号租户下的所有数据
4. 可以进行所有管理操作

## 技术细节

### 数据库约束

1. **外键约束**
   ```sql
   main_account_id uuid REFERENCES profiles(id) ON DELETE CASCADE
   ```
   - 当主账号被删除时，所有平级账号也会被删除

2. **触发器验证**
   ```sql
   CREATE TRIGGER check_main_account_is_primary_trigger
     BEFORE INSERT OR UPDATE ON profiles
     FOR EACH ROW
     EXECUTE FUNCTION check_main_account_is_primary();
   ```
   - 防止创建多层级的账号关系
   - 确保 `main_account_id` 指向的是主账号

### 查询优化

1. **索引**
   ```sql
   CREATE INDEX idx_profiles_main_account_id ON profiles(main_account_id);
   ```
   - 加速平级账号查询

2. **辅助函数**
   - 使用 PostgreSQL 函数简化查询逻辑
   - 提高代码复用性

## 测试场景

### 场景 1：创建平级账号

**步骤**：
1. 租赁管理员登录
2. 创建主账号"测试公司"
3. 为"测试公司"创建平级账号"财务经理"
4. 为"测试公司"创建平级账号"运营经理"

**验证**：
- ✅ 三个账号都可以独立登录
- ✅ 三个账号看到的数据完全相同
- ✅ 三个账号都可以管理司机、车辆等

### 场景 2：数据隔离

**步骤**：
1. 主账号"测试公司"创建司机"张三"
2. 平级账号"财务经理"登录
3. 查看司机列表

**验证**：
- ✅ "财务经理"可以看到司机"张三"
- ✅ "财务经理"可以编辑司机"张三"的信息

### 场景 3：删除主账号

**步骤**：
1. 租赁管理员删除主账号"测试公司"

**验证**：
- ✅ 所有平级账号（"财务经理"、"运营经理"）也被删除
- ✅ 租户下的所有数据（司机、车辆等）也被删除

## 注意事项

1. **主账号不能转换为平级账号**
   - 一旦创建为主账号，`main_account_id` 始终为 NULL

2. **平级账号不能再创建平级账号**
   - 只有主账号可以创建平级账号
   - 防止多层级关系

3. **删除主账号会删除所有平级账号**
   - 使用 `ON DELETE CASCADE` 约束
   - 删除前需要确认

4. **平级账号的 tenant_id 不能修改**
   - 始终与主账号保持一致
   - 确保数据隔离

## 已修复的问题

### 问题 1：主键冲突错误（已修复）

**错误信息**：
```
duplicate key value violates unique constraint "profiles_pkey"
```

**原因**：
- 数据库触发器 `handle_new_user` 在确认邮箱后自动创建 profiles 记录
- `createPeerAccount` 函数又尝试手动插入同一个 ID 的记录

**解决方案**：
- 改为让触发器创建基础 profiles 记录
- 然后通过 UPDATE 操作设置平级账号相关字段
- 添加 500ms 延迟确保触发器执行完成

### 问题 2：邮箱已存在错误（已修复）

**错误信息**：
```
AuthApiError: User already registered
```

**解决方案**：
- 修改 `createPeerAccount` 返回类型为 `Profile | null | 'EMAIL_EXISTS'`
- 捕获邮箱已存在错误并返回特殊标识
- 前端显示友好提示："该邮箱已被注册，请使用其他邮箱"

### 问题 3：平级账号无法获取车队数据（已修复）

**问题描述**：
- 平级账号登录后无法看到主账号租户下的车辆、司机等数据

**原因分析**：
- `get_user_tenant_id()` 函数对所有 `super_admin` 角色都返回 `p.id`
- 平级账号的 role 也是 `super_admin`，但应该返回 `tenant_id` 而不是自己的 id

**解决方案**（迁移 050）：
```sql
CREATE OR REPLACE FUNCTION get_user_tenant_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT 
    CASE 
      -- 主账号：main_account_id 为 NULL 且角色为 super_admin
      WHEN p.role = 'super_admin'::user_role AND p.main_account_id IS NULL THEN p.id
      -- 平级账号和其他角色：使用 tenant_id
      ELSE p.tenant_id
    END
  FROM profiles p
  WHERE p.id = auth.uid();
$$;
```

**修复效果**：
- ✅ 平级账号现在可以访问主账号租户的所有数据
- ✅ 包括车辆、司机、仓库、考勤等所有业务数据
- ✅ 数据隔离仍然有效，不同租户之间数据互不可见

## 相关文件

### 数据库迁移
- `supabase/migrations/049_add_main_account_id_to_profiles.sql` - 添加 main_account_id 字段
- `supabase/migrations/050_fix_peer_account_tenant_access.sql` - 修复平级账号数据访问

### API 函数
- `src/db/api.ts`
  - `createPeerAccount()` - 创建平级账号
  - `getPeerAccounts()` - 获取平级账号列表
  - `isPrimaryAccount()` - 检查是否为主账号

### 类型定义
- `src/db/types.ts`
  - `Profile` 接口（添加 `main_account_id` 字段）

### UI 页面
- `src/pages/lease-admin/tenant-list/index.tsx` - 老板账号列表
- `src/pages/lease-admin/tenant-form/index.tsx` - 创建/编辑表单

## 未来扩展

### 可能的功能扩展

1. **权限细分**
   - 为平级账号设置不同的权限级别
   - 例如：只读权限、财务权限等

2. **账号关系可视化**
   - 显示主账号和平级账号的关系图
   - 便于管理多个平级账号

3. **账号转移**
   - 支持将平级账号转移到其他主账号
   - 支持将平级账号升级为主账号

4. **操作日志**
   - 记录每个账号的操作历史
   - 便于审计和追踪

## 总结

平级账号功能为车队管理系统提供了更灵活的多人管理方案。通过共享 `tenant_id` 实现数据共享，通过独立的登录凭证实现权限分离，满足了实际业务中多人协作管理的需求。

---

**更新时间**：2025-11-25  
**版本**：v1.1  
**最后修复**：修复平级账号无法获取车队数据的问题
