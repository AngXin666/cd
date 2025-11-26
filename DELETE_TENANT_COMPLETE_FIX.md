# 租赁端删除老板账号功能完整修复

## 📋 问题描述

用户报告了以下问题：

### 问题 1：显示删除成功但账号仍然存在
**现象**：点击删除按钮后，前端显示"删除成功"，但刷新页面后发现账号还在。

**原因**：租赁管理员（lease_admin）没有删除 profiles 表中 super_admin 角色用户的权限。

### 问题 2：删除失败提示"无法删除：每个老板号必须保留至少一个仓库"
**现象**：删除操作被数据库触发器阻止。

**原因**：数据库中有一个触发器 `prevent_delete_last_warehouse()`，阻止删除租户的最后一个仓库，导致整个删除操作失败。

### 问题 3：缺少详细的删除日志
**现象**：用户不知道删除了哪些数据。

**原因**：删除函数只返回 boolean 值，没有返回详细的删除信息。

## ✅ 完整修复方案

### 修复 1：添加租赁管理员删除权限

**文件**：`supabase/migrations/00999_add_lease_admin_delete_permission.sql`

**内容**：
```sql
-- 添加租赁管理员删除老板账号的权限
CREATE POLICY "租赁管理员可以删除老板账号" ON profiles
  FOR DELETE TO authenticated
  USING (
    -- 当前用户必须是租赁管理员
    is_lease_admin_user(auth.uid())
    AND
    -- 只能删除老板账号（super_admin）
    role = 'super_admin'::user_role
  );
```

**效果**：
- ✅ 租赁管理员可以删除老板账号
- ✅ 只能删除 super_admin 角色的用户
- ✅ 删除会自动级联到所有关联数据

### 修复 2：修改仓库删除约束

**文件**：`supabase/migrations/01000_fix_delete_last_warehouse_for_lease_admin.sql`

**内容**：
```sql
CREATE OR REPLACE FUNCTION prevent_delete_last_warehouse()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  warehouse_count INT;
  is_lease_admin_user BOOLEAN;
  tenant_exists BOOLEAN;
BEGIN
  -- 检查当前用户是否为租赁管理员
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'lease_admin'::user_role
  ) INTO is_lease_admin_user;

  -- 如果是租赁管理员，允许删除
  IF is_lease_admin_user THEN
    RETURN OLD;
  END IF;

  -- 检查租户是否还存在
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = OLD.boss_id
  ) INTO tenant_exists;

  -- 如果租户不存在或正在被删除，允许删除仓库
  IF NOT tenant_exists THEN
    RETURN OLD;
  END IF;

  -- 统计该租户的仓库数量
  SELECT COUNT(*) INTO warehouse_count
  FROM warehouses
  WHERE boss_id = OLD.boss_id;

  -- 如果只剩一个仓库，阻止删除
  IF warehouse_count <= 1 THEN
    RAISE EXCEPTION '无法删除：每个老板号必须保留至少一个仓库';
  END IF;

  RETURN OLD;
END;
$$;
```

**效果**：
- ✅ 租赁管理员可以删除租户的所有仓库
- ✅ 普通用户仍然受到"至少保留一个仓库"的限制
- ✅ 删除租户时不会被仓库约束阻止

### 修复 3：创建带详细日志的删除函数

**文件**：`src/db/api.ts`

**新增类型**：
```typescript
export interface DeleteTenantResult {
  success: boolean
  message: string
  deletedData?: {
    tenant: string
    peerAccounts: number
    managers: number
    drivers: number
    vehicles: number
    warehouses: number
    attendance: number
    leaves: number
    pieceWorks: number
    notifications: number
    total: number
  }
  error?: string
}
```

**新增函数**：
```typescript
export async function deleteTenantWithLog(id: string): Promise<DeleteTenantResult>
```

**功能**：
1. ✅ 验证租户身份和权限
2. ✅ 统计将要删除的所有数据
3. ✅ 执行删除操作
4. ✅ 验证删除是否成功
5. ✅ 返回详细的删除结果

### 修复 4：更新前端页面显示详细日志

**文件**：`src/pages/lease-admin/tenant-list/index.tsx`

**删除前确认**：
```
⚠️ 危险操作

删除租户：张三
手机号：13800000001

将同时删除：
• 平级账号：2 个
• 车队长：5 名
• 该租户下的所有司机
• 所有车辆、仓库数据
• 所有考勤、请假记录

此操作不可恢复！
```

**删除成功提示**：
```
✅ 删除成功

已删除：
• 租户：张三 (13800000001)
• 平级账号：2 个
• 车队长：5 名
• 司机：20 名
• 车辆：15 辆
• 仓库：3 个
• 考勤记录：1250 条
• 请假记录：45 条
• 计件记录：380 条
• 通知：120 条

总计删除：1341 条记录
```

**删除失败提示**：
```
❌ 删除失败

原因：查询租户信息失败
详情：Network error
```

## 🔧 技术实现细节

### 1. 权限控制

**RLS 策略**：
- 租赁管理员可以删除 super_admin 角色的用户
- 使用 `is_lease_admin_user(auth.uid())` 函数验证身份
- 只允许删除主账号，不允许直接删除平级账号

**触发器修改**：
- 租赁管理员不受"至少保留一个仓库"的限制
- 级联删除时自动跳过仓库约束检查

### 2. 级联删除

**数据库设计**：
所有关联表都设置了 `ON DELETE CASCADE`：

```sql
-- 示例
ALTER TABLE profiles 
ADD COLUMN boss_id uuid 
REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE vehicles 
ADD COLUMN tenant_id uuid 
REFERENCES profiles(id) ON DELETE CASCADE;
```

**删除流程**：
```
删除主账号 (profiles)
  ↓
自动级联删除：
  ├─ 平级账号 (profiles.main_account_id)
  ├─ 车队长 (profiles.boss_id)
  ├─ 司机 (profiles.boss_id)
  ├─ 车辆 (vehicles.tenant_id)
  ├─ 仓库 (warehouses.tenant_id)
  ├─ 考勤记录 (attendance.tenant_id)
  ├─ 请假记录 (leave_applications.tenant_id)
  ├─ 计件记录 (piece_work_records.tenant_id)
  └─ 通知 (notifications.tenant_id)
```

### 3. 删除验证

**验证步骤**：
1. 查询租户信息
2. 验证角色是否为 super_admin
3. 验证是否为主账号（main_account_id = NULL）
4. 统计将要删除的数据
5. 执行删除操作
6. 再次查询验证是否删除成功
7. 返回详细结果

**代码示例**：
```typescript
// 4. 验证删除是否成功
const {data: verifyTenant} = await supabase
  .from('profiles')
  .select('id')
  .eq('id', id)
  .maybeSingle()

if (verifyTenant) {
  console.error('删除失败：租户仍然存在')
  return {
    success: false,
    message: '删除失败：租户仍然存在',
    error: '可能是权限不足或数据库约束问题',
    deletedData: stats
  }
}
```

## 📊 删除范围

删除租户时会自动删除以下所有数据：

| 数据类型 | 关联字段 | 说明 |
|---------|---------|------|
| 租户本身 | id | 主账号记录 |
| 平级账号 | main_account_id | 同一租户的其他管理账号 |
| 车队长 | boss_id | 租户下的所有车队长 |
| 司机 | boss_id | 租户下的所有司机 |
| 车辆 | tenant_id | 租户下的所有车辆 |
| 仓库 | tenant_id | 租户下的所有仓库 |
| 仓库品类 | tenant_id | 租户下的所有仓库品类 |
| 考勤记录 | tenant_id | 租户下的所有考勤记录 |
| 请假记录 | tenant_id | 租户下的所有请假记录 |
| 计件记录 | tenant_id | 租户下的所有计件记录 |
| 通知 | tenant_id | 租户下的所有通知 |
| 司机仓库分配 | - | 通过 warehouses 级联删除 |
| 车队长仓库分配 | - | 通过 warehouses 级联删除 |

## 🛡️ 安全保护机制

### 1. 身份验证

```typescript
// 确保是老板账号
if (tenant.role !== 'super_admin') {
  return {
    success: false,
    message: '只能删除老板账号',
    error: `当前用户角色为 ${tenant.role}，不是 super_admin`
  }
}

// 确保是主账号
if (tenant.main_account_id !== null) {
  return {
    success: false,
    message: '只能删除主账号，不能删除平级账号',
    error: '请删除主账号，平级账号会自动级联删除'
  }
}
```

### 2. 二次确认

用户必须在详细的确认对话框中点击"确认删除"按钮。

### 3. 数据统计

删除前统计并显示所有将要删除的数据。

### 4. 删除验证

删除后验证租户是否真的被删除。

### 5. 错误处理

```typescript
try {
  // 删除逻辑
} catch (error) {
  return {
    success: false,
    message: '删除异常',
    error: error instanceof Error ? error.message : String(error)
  }
}
```

## 📝 使用说明

### 租赁端删除租户

1. 登录租赁管理端
2. 进入"租户列表"页面
3. 找到要删除的租户
4. 点击"删除"按钮
5. 查看详细的删除确认对话框
6. 确认无误后点击"确认删除"
7. 等待删除完成
8. 查看详细的删除结果

### 删除结果示例

**成功示例**：
```
✅ 删除成功

已删除：
• 租户：测试公司 (13800000001)
• 平级账号：2 个
• 车队长：5 名
• 司机：20 名
• 车辆：15 辆
• 仓库：3 个
• 考勤记录：1250 条
• 请假记录：45 条
• 计件记录：380 条
• 通知：120 条

总计删除：1341 条记录
```

**失败示例**：
```
❌ 删除失败

原因：只能删除主账号，不能删除平级账号
详情：请删除主账号，平级账号会自动级联删除
```

## ⚠️ 注意事项

### 1. 不可恢复

删除操作是**永久性**的，无法恢复。

### 2. 只能删除主账号

- ✅ 可以删除主账号（main_account_id = NULL）
- ❌ 不能删除平级账号（main_account_id ≠ NULL）
- 💡 删除主账号时，平级账号会自动级联删除

### 3. 租赁管理员特权

租赁管理员删除租户时：
- ✅ 不受"至少保留一个仓库"的限制
- ✅ 可以删除租户的所有数据
- ✅ 不受其他业务规则约束

### 4. 数据备份

在删除重要租户之前，建议先备份数据。

## 🧪 测试验证

### 测试场景

1. **删除空租户**
   - 租户下没有任何数据
   - ✅ 应该成功删除

2. **删除有数据的租户**
   - 租户下有平级账号、车队长、司机
   - 租户下有车辆、仓库、考勤记录等
   - ✅ 应该成功删除所有关联数据

3. **删除只有一个仓库的租户**
   - 租户只有一个仓库
   - ✅ 租赁管理员应该可以删除
   - ❌ 普通用户不能删除最后一个仓库

4. **删除平级账号**
   - 尝试删除平级账号
   - ❌ 应该失败并提示错误

5. **删除非老板账号**
   - 尝试删除车队长或司机
   - ❌ 应该失败并提示错误

### 验证方法

```bash
# 1. 删除前查询数据
npx tsx scripts/list-all-accounts.ts

# 2. 在租赁端执行删除操作

# 3. 查看删除结果对话框

# 4. 删除后再次查询数据
npx tsx scripts/list-all-accounts.ts

# 5. 验证所有关联数据都已删除
```

## 📊 影响范围

### 修改的文件

1. **数据库迁移**：
   - `supabase/migrations/00999_add_lease_admin_delete_permission.sql`
   - `supabase/migrations/01000_fix_delete_last_warehouse_for_lease_admin.sql`

2. **后端代码**：
   - `src/db/api.ts` - 新增 `deleteTenantWithLog` 函数
   - `src/db/types.ts` - 新增 `DeleteTenantResult` 类型

3. **前端页面**：
   - `src/pages/lease-admin/tenant-list/index.tsx` - 更新删除逻辑和UI

### 不影响的功能

- ✅ 其他租户的数据不受影响
- ✅ 租赁管理员的其他功能正常
- ✅ 超级管理员端不受影响
- ✅ 车队长端和司机端不受影响
- ✅ 普通用户的仓库删除限制仍然有效

## 🎯 总结

### 问题解决

✅ **问题 1：显示删除成功但账号仍然存在**
- 已修复：添加了租赁管理员删除权限的 RLS 策略

✅ **问题 2：删除失败提示"无法删除：每个老板号必须保留至少一个仓库"**
- 已修复：修改了触发器，租赁管理员不受此限制

✅ **问题 3：缺少详细的删除日志**
- 已修复：创建了 `deleteTenantWithLog` 函数，返回详细的删除结果

### 功能特点

- ✅ 完善的身份验证和权限检查
- ✅ 详细的删除确认对话框
- ✅ 自动级联删除所有关联数据
- ✅ 完善的错误处理和日志记录
- ✅ 友好的用户体验
- ✅ 安全的删除验证机制
- ✅ 租赁管理员不受业务规则限制

### 安全保障

- ✅ 二次确认机制
- ✅ 详细的数据统计
- ✅ 完善的错误提示
- ✅ 删除后验证
- ✅ 权限验证
- ✅ 日志记录

---

**修复日期**：2025-11-05  
**修复人员**：秒哒 AI  
**状态**：✅ 已完成并测试通过

## 🔍 故障排查

如果删除仍然失败，请检查：

1. **权限问题**
   ```sql
   -- 检查 RLS 策略是否存在
   SELECT * FROM pg_policies 
   WHERE tablename = 'profiles' 
   AND policyname = '租赁管理员可以删除老板账号';
   ```

2. **触发器问题**
   ```sql
   -- 检查触发器函数是否已更新
   SELECT prosrc FROM pg_proc 
   WHERE proname = 'prevent_delete_last_warehouse';
   ```

3. **用户角色**
   ```sql
   -- 检查当前用户是否为租赁管理员
   SELECT id, role FROM profiles WHERE id = auth.uid();
   ```

4. **查看详细错误**
   - 打开浏览器控制台
   - 查看 Console 标签页
   - 查找以 "删除老板账号失败:" 开头的错误信息
