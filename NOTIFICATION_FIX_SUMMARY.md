# 司机请假通知修复总结

## 问题描述
司机创建请假申请后，虽然能看到弹窗提示，但通知栏和通知中心都没有显示通知记录。

## 根本原因分析

### 1. 老板账号查询错误
**位置**: `src/services/notificationService.ts` - `getBoss()` 函数

**原问题**:
```typescript
const {data, error} = await supabase
  .from('profiles')
  .select('id, name, role')
  .eq('role', 'super_admin')
  .eq('boss_id', bossId)  // ❌ 错误：老板的 boss_id 是 NULL
  .maybeSingle()
```

**修复后**:
```typescript
const {data, error} = await supabase
  .from('profiles')
  .select('id, name, role')
  .eq('id', bossId)  // ✅ 正确：直接用 bossId 查询
  .eq('role', 'super_admin')
  .maybeSingle()
```

### 2. 通知创建函数的 boss_id 处理错误
**位置**: `src/db/notificationApi.ts` - `createNotifications()` 函数

**原问题**:
```typescript
const bossId = senderProfile?.boss_id

if (!bossId) {
  logger.error('批量创建通知失败：无法获取当前用户的 boss_id')
  return false  // ❌ 如果发送者是老板，boss_id 为 NULL，会直接返回失败
}
```

**修复后**:
```typescript
let bossId = senderProfile?.boss_id
if (!bossId && senderProfile?.role === 'super_admin') {
  bossId = user.id  // ✅ 如果是老板，使用自己的 ID
  logger.info('✅ 当前用户是老板，使用自己的ID作为boss_id', {bossId})
}
```

### 3. 数据库 RLS 策略错误（关键问题）
**位置**: 数据库 `notifications` 表的 RLS 策略

**原问题**:
司机创建通知的策略中，查询老板账号时使用了错误的条件：
```sql
-- 错误的查询条件
SELECT p.id 
FROM profiles p
WHERE p.role = 'super_admin'
AND p.boss_id = get_current_user_boss_id()  -- ❌ 老板的 boss_id 是 NULL，永远查不到
```

**修复后**:
```sql
-- 正确的查询条件
SELECT get_current_user_boss_id()::uuid  -- ✅ 直接返回老板的 ID
```

## 修复内容

### 1. 修复了通知服务 (`src/services/notificationService.ts`)
- ✅ 修复 `getBoss()` 函数的查询逻辑
- ✅ 添加详细的调试日志到所有函数
- ✅ 在 `sendDriverSubmissionNotification()` 中添加步骤日志

### 2. 修复了通知API (`src/db/notificationApi.ts`)
- ✅ 修复 `createNotifications()` 函数的 boss_id 处理逻辑
- ✅ 添加详细的调试日志

### 3. 增强了请假申请页面 (`src/pages/driver/leave/apply/index.tsx`)
- ✅ 添加详细的调试日志
- ✅ 添加错误处理和用户提示
- ✅ 使用 Toast 显示通知发送状态

### 4. 统一了通知类型定义
- ✅ 删除 `src/db/types.ts` 中重复的 `NotificationType` 定义
- ✅ 统一使用 `src/db/notificationApi.ts` 中的定义
- ✅ 添加 `leave_submitted` 和 `verification_reminder` 类型

### 5. 修复了数据库 RLS 策略（关键修复）
- ✅ 修复司机创建通知的策略，正确查询老板账号
- ✅ 修复类型转换问题（TEXT → UUID）
- ✅ 创建迁移文件：`supabase/migrations/99999_fix_driver_notification_creation_policy_v2.sql`

## 调试日志说明

现在系统会输出详细的调试日志，帮助追踪通知发送过程：

### 司机提交请假时的日志流程：

```
🔍 调试信息 - 开始发送通知
  - driverId: xxx
  - driverName: xxx
  - bossId: xxx
  - applicationId: xxx

🚀 开始发送司机提交申请通知

步骤1: 获取老板账号
  查询老板账号 {bossId: xxx}
  找到老板账号 {id: xxx, name: xxx}
  ✅ 已添加老板到通知列表

步骤2: 获取平级账号
  查询平级账号 {bossId: xxx}
  找到平级账号 {count: n}
  ✅ 已添加 n 个平级账号到通知列表

步骤3: 获取司机的车队长
  查询司机的车队长 {driverId: xxx, bossId: xxx}
  司机仓库查询结果 {count: n, data: [...]}
  找到车队长 {id: xxx, name: xxx}
  车队长去重后数量 {count: n}
  ✅ 已添加 n 个车队长到通知列表

📋 去重后的通知接收者列表 (共 n 人): [...]

📤 准备发送通知 {count: n, notifications: [...]}

📬 批量创建通知
  📝 当前用户信息 {userId: xxx}
  👤 发送者profile信息 {...}
  📤 准备插入通知数据 {count: n, data: [...]}
  ✅ 批量通知创建成功 {count: n}

✅ 司机提交申请通知发送成功，共 n 条

📬 通知发送结果: true
✅ 请假申请提交成功，已发送通知给老板、平级账号和车队长
```

### 如果出现错误，会显示：

```
⚠️ 未找到老板账号
⚠️ 司机未分配仓库或仓库没有车队长
❌ 没有找到通知接收对象
❌ 批量创建通知失败
💥 发送司机提交申请通知异常
```

## 测试步骤

1. **准备测试环境**：
   - 确保有一个老板账号（super_admin）
   - 确保有至少一个平级账号（peer_admin）
   - 确保有至少一个车队长（manager）
   - 确保司机已分配到车队长管辖的仓库

2. **执行测试**：
   - 以司机身份登录
   - 提交一个请假申请
   - 查看浏览器控制台的日志输出

3. **验证结果**：
   - 检查老板的通知中心是否收到通知
   - 检查平级账号的通知中心是否收到通知
   - 检查车队长的通知中心是否收到通知
   - 检查通知内容是否正确
   - **重要**：检查通知是否真的保存到数据库中（不只是弹窗）

## 预期结果

司机提交请假申请后：
- ✅ 老板账号收到通知（弹窗 + 通知中心）
- ✅ 所有平级账号收到通知（弹窗 + 通知中心）
- ✅ 管辖该司机的车队长收到通知（弹窗 + 通知中心）
- ✅ 通知内容包含：司机姓名、请假类型、请假时间、请假事由
- ✅ 浏览器控制台输出详细的调试日志
- ✅ 通知记录保存到数据库的 `notifications` 表中

## 注意事项

1. **查看日志**：打开浏览器的开发者工具（F12），切换到 Console 标签页，可以看到详细的调试日志
2. **Toast 提示**：如果通知发送失败，会显示 Toast 提示信息
3. **数据库检查**：可以直接查询 `notifications` 表，确认通知是否已创建
4. **RLS 策略**：确保数据库的 RLS 策略已经更新（运行了最新的迁移文件）

## 相关文件

- `src/services/notificationService.ts` - 通知服务
- `src/db/notificationApi.ts` - 通知API
- `src/pages/driver/leave/apply/index.tsx` - 司机请假申请页面
- `src/db/types.ts` - 类型定义
- `supabase/migrations/99999_fix_driver_notification_creation_policy_v2.sql` - RLS 策略修复迁移文件
