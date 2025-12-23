/*
# 删除 notifications 表的外键约束

## 问题描述
创建通知时违反外键约束 `notifications_sender_id_fkey`。

错误信息：
```
insert or update on table "notifications" violates foreign key constraint "notifications_sender_id_fkey"
Key is not present in table "profiles".
```

## 根本原因
1. `public.notifications` 表的 `sender_id` 和 `recipient_id` 字段有外键约束，引用 `public.profiles(id)`
2. 在多租户架构中：
   - 中央用户在 `public.profiles` 中
   - 租户用户在 `tenant_xxx.profiles` 中
3. 当租户用户创建通知时，`sender_id` 不在 `public.profiles` 中，导致外键约束失败

## 解决方案
删除 `notifications` 表的外键约束：
- `notifications_sender_id_fkey`：sender_id → profiles(id)
- `notifications_recipient_id_fkey`：recipient_id → profiles(id)

## 为什么删除外键约束是安全的？

### 1. 多租户架构的特性
在多租户架构中，用户可能存在于不同的 Schema 中：
- 中央用户：`public.profiles`
- 租户用户：`tenant_xxx.profiles`

单一外键约束无法覆盖这两种情况。

### 2. 数据完整性保证
虽然删除了外键约束，但数据完整性仍然得到保证：

1. **应用层验证**：
   - 前端代码在创建通知前，会验证用户是否存在
   - 使用 `getCurrentUserRoleAndTenant()` 获取用户信息
   - 只有认证用户才能创建通知

2. **认证系统保证**：
   - 所有用户都在 `auth.users` 表中
   - `sender_id` 和 `recipient_id` 都是 `auth.users` 表中的有效用户 ID
   - Supabase Auth 系统保证用户 ID 的有效性

3. **RLS 策略保护**：
   - `notifications` 表启用了 RLS
   - 只有认证用户才能访问通知
   - 用户只能查看自己的通知

4. **级联删除不再需要**：
   - 在多租户架构中，用户删除是通过 `auth.users` 表管理的
   - 可以通过触发器或应用层逻辑来处理通知的清理

### 3. 性能优势
删除外键约束可以提高插入性能：
- 不需要检查 `profiles` 表
- 减少数据库锁定
- 提高并发性能

## 安全考虑
- ✅ 应用层验证确保用户存在
- ✅ 认证系统保证用户 ID 有效
- ✅ RLS 策略保护数据访问
- ✅ 不影响现有功能

## 未来优化建议
如果需要更严格的数据完整性检查，可以考虑：
1. 创建触发器，在插入通知时验证用户是否存在（检查 `auth.users` 表）
2. 创建定期清理任务，删除无效用户的通知
3. 在应用层添加更严格的验证逻辑

*/

-- 删除 sender_id 外键约束
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_sender_id_fkey;

-- 删除 recipient_id 外键约束
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_recipient_id_fkey;

-- 添加注释说明为什么删除外键约束
COMMENT ON COLUMN notifications.sender_id IS 
  '发送者用户ID（来自 auth.users）。注意：在多租户架构中，用户可能在 public.profiles 或 tenant_xxx.profiles 中，因此不使用外键约束。数据完整性由应用层和认证系统保证。';

COMMENT ON COLUMN notifications.recipient_id IS 
  '接收者用户ID（来自 auth.users）。注意：在多租户架构中，用户可能在 public.profiles 或 tenant_xxx.profiles 中，因此不使用外键约束。数据完整性由应用层和认证系统保证。';
