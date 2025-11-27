# 通知发送者信息修复报告

**日期**：2025-11-27  
**状态**：✅ 已完成

---

## 🐛 问题描述

### 错误信息
```
null value in column "sender_name" of relation "notifications" violates not-null constraint
```

### 问题场景
老板审批司机请假申请后，系统尝试创建通知给司机，但通知创建失败，因为 `sender_name` 字段为 NULL。

### 原因分析
1. **应用层未传递发送者信息**
   - `createNotification` 函数调用 RPC 函数 `create_notifications_batch` 时，没有传递 `sender_id`、`sender_name` 和 `sender_role` 参数
   - RPC 函数依赖于 `auth.uid()` 来获取当前用户信息

2. **RPC 函数的局限性**
   - RPC 函数在某些情况下无法正确获取当前用户的 profile 信息
   - 虽然有默认值 '系统'，但在某些边缘情况下可能失败

3. **数据库约束**
   - `notifications` 表的 `sender_name` 字段设置为 NOT NULL
   - 如果没有提供有效值，插入操作会失败

---

## 🔧 修复方案

### 核心思路
**在应用层（TypeScript）获取发送者信息，然后传递给 RPC 函数**，而不是依赖 RPC 函数自己获取。

### 修复的函数

#### 1. createNotification
**位置**：`src/db/api.ts:6097`

**修复前**：
```typescript
export async function createNotification(notification: {
  user_id: string
  type: string
  title: string
  message: string
  related_id?: string
}): Promise<string | null> {
  // 直接调用 RPC，没有传递发送者信息
  const {data, error} = await supabase.rpc('create_notifications_batch', {
    notifications: [{
      user_id: notification.user_id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      related_id: notification.related_id || null,
      is_read: false
    }]
  })
}
```

**修复后**：
```typescript
export async function createNotification(notification: {
  user_id: string
  type: string
  title: string
  message: string
  related_id?: string
}): Promise<string | null> {
  // 1. 获取当前用户信息
  const {data: {user}} = await supabase.auth.getUser()
  
  let senderId = user?.id || null
  let senderName = '系统'
  let senderRole = 'system'
  
  // 2. 如果有当前用户，获取其 profile 信息
  if (user?.id) {
    const {data: senderProfile} = await supabase
      .from('profiles')
      .select('name, role')
      .eq('id', user.id)
      .maybeSingle()
    
    if (senderProfile) {
      senderName = senderProfile.name || '系统'
      senderRole = senderProfile.role || 'system'
    }
  }
  
  // 3. 调用 RPC，传递完整的发送者信息
  const {data, error} = await supabase.rpc('create_notifications_batch', {
    notifications: [{
      user_id: notification.user_id,
      sender_id: senderId,
      sender_name: senderName,
      sender_role: senderRole,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      related_id: notification.related_id || null,
      is_read: false
    }]
  })
}
```

#### 2. createNotificationForAllManagers
**位置**：`src/db/api.ts:6183`

**修复内容**：
- 在获取管理员列表之前，先获取当前用户的发送者信息
- 在创建通知数组时，为每个通知添加 `sender_id`、`sender_name` 和 `sender_role` 字段

#### 3. createNotificationForAllSuperAdmins
**位置**：`src/db/api.ts:6272`

**修复内容**：
- 在获取老板列表之前，先获取当前用户的发送者信息
- 在创建通知数组时，为每个通知添加 `sender_id`、`sender_name` 和 `sender_role` 字段

---

## 📊 修复效果

### 修复前
- ❌ 老板审批请假后，通知创建失败
- ❌ 司机无法收到审批结果通知
- ❌ 数据库约束错误：`sender_name` 为 NULL

### 修复后
- ✅ 老板审批请假后，通知创建成功
- ✅ 司机正确收到审批结果通知
- ✅ 通知包含完整的发送者信息（姓名、角色）
- ✅ 所有通知创建操作都能正确处理发送者信息

---

## 🎯 技术细节

### 发送者信息获取流程

```
1. 调用 supabase.auth.getUser()
   ↓
2. 获取当前用户的 user.id
   ↓
3. 从 profiles 表查询用户的 name 和 role
   ↓
4. 如果查询成功，使用实际值
   ↓
5. 如果查询失败，使用默认值：
   - sender_name: '系统'
   - sender_role: 'system'
   ↓
6. 将发送者信息传递给 RPC 函数
```

### 默认值处理

| 情况 | sender_id | sender_name | sender_role |
|------|-----------|-------------|-------------|
| 用户已登录且 profile 存在 | user.id | profile.name | profile.role |
| 用户已登录但 profile 不存在 | user.id | '系统' | 'system' |
| 用户未登录 | null | '系统' | 'system' |

### RPC 函数的向后兼容性

RPC 函数 `create_notifications_batch` 仍然保留了自动获取发送者信息的逻辑：

```sql
-- 如果应用层没有传递发送者信息，RPC 函数会尝试自己获取
sender_id: COALESCE((n->>'sender_id')::uuid, current_user_id),
sender_name: COALESCE(n->>'sender_name', current_user_name),
sender_role: COALESCE(n->>'sender_role', current_user_role),
```

这确保了：
1. 新代码传递发送者信息，优先使用传递的值
2. 旧代码不传递发送者信息，RPC 函数会尝试自己获取
3. 双重保障，提高可靠性

---

## 📝 修改的文件

### src/db/api.ts

**修改内容**：
1. 修复 `createNotification` 函数（第 6097 行）
2. 修复 `createNotificationForAllManagers` 函数（第 6183 行）
3. 修复 `createNotificationForAllSuperAdmins` 函数（第 6272 行）

**代码行数变化**：
- 修改前：约 150 行
- 修改后：约 240 行
- 新增：约 90 行（主要是发送者信息获取逻辑和日志）

---

## ✅ 验证结果

### 代码质量检查
```bash
$ pnpm run lint
Checked 230 files in 1366ms. Fixed 1 file.
✅ 所有检查通过
```

### 功能测试
- ✅ 老板审批请假申请成功
- ✅ 司机收到审批结果通知
- ✅ 通知包含正确的发送者信息
- ✅ 通知标题和内容正确
- ✅ 通知关联的申请ID正确

---

## 🔍 相关代码位置

### 应用层函数
- `src/db/api.ts:6097` - `createNotification`
- `src/db/api.ts:6183` - `createNotificationForAllManagers`
- `src/db/api.ts:6272` - `createNotificationForAllSuperAdmins`

### RPC 函数
- `supabase/migrations/00376_fix_create_notifications_batch_use_tenant_id.sql` - `create_notifications_batch`

### 调用位置
- `src/db/api.ts:2171` - `reviewLeaveApplication` 函数中调用 `createNotification`

---

## 📚 最佳实践总结

### 1. 发送者信息处理
- ✅ 在应用层获取发送者信息，而不是依赖数据库函数
- ✅ 提供合理的默认值，确保在任何情况下都不会出现 NULL
- ✅ 添加详细的日志，便于调试

### 2. RPC 函数设计
- ✅ 使用 `COALESCE` 提供默认值
- ✅ 支持新旧字段名的向后兼容
- ✅ 使用 `SECURITY DEFINER` 绕过 RLS 限制

### 3. 错误处理
- ✅ 捕获并记录所有错误
- ✅ 提供有意义的错误信息
- ✅ 在错误情况下返回合理的默认值

### 4. 数据库约束
- ✅ 对于必填字段，设置 NOT NULL 约束
- ✅ 在应用层确保提供有效值
- ✅ 使用默认值作为后备方案

---

## 🎉 总结

本次修复解决了老板审批请假时通知创建失败的问题，主要包括：

1. **修复了发送者信息缺失问题**：在应用层获取并传递完整的发送者信息
2. **提升了代码可靠性**：添加了默认值处理和详细的日志记录
3. **优化了代码结构**：统一了三个通知创建函数的实现逻辑
4. **保持了向后兼容性**：RPC 函数仍然支持旧代码的调用方式

**关键成果**：
- ✅ 通知创建功能完全正常
- ✅ 发送者信息完整准确
- ✅ 代码质量提升
- ✅ 日志记录完善
- ✅ 易于维护和调试

**下一步**：
- 继续监控通知功能的运行情况
- 根据实际使用情况优化性能
- 考虑添加通知发送失败的重试机制
- 定期检查日志，及时发现潜在问题
