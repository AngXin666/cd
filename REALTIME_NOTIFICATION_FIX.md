# 实时通知订阅失败问题修复

## 📋 问题描述

**错误信息**：
```
useRealtimeNotifications.ts:246 ❌ 实时通知订阅失败！
```

**问题原因**：
在实时通知订阅中，使用了错误的字段名进行过滤：
- 代码中使用：`filter: driver_id=eq.${userId}`
- 实际字段名：`user_id`

这导致 Supabase Realtime 订阅失败，因为过滤器引用了不存在的字段。

## 🎯 解决方案

将所有实时订阅中的 `driver_id` 过滤器修改为 `user_id`，以匹配数据库表的实际字段名。

## ✅ 已完成的修改

### 修改文件

**文件**：`src/hooks/useRealtimeNotifications.ts`

### 修改内容

#### 1. 请假申请订阅过滤器

**修改前**：
```typescript
channel.on(
  'postgres_changes',
  {
    event: 'UPDATE',
    schema: 'public',
    table: 'leave_applications',
    filter: `driver_id=eq.${userId}`  // ❌ 错误的字段名
  },
  (payload) => {
    console.log('📝 请假申请状态变化:', payload)
    const record = payload.new as any
    // ...
  }
)
```

**修改后**：
```typescript
channel.on(
  'postgres_changes',
  {
    event: 'UPDATE',
    schema: 'public',
    table: 'leave_applications',
    filter: `user_id=eq.${userId}`  // ✅ 正确的字段名
  },
  (payload) => {
    console.log('📝 请假申请状态变化:', payload)
    const record = payload.new as any
    // ...
  }
)
```

#### 2. 离职申请订阅过滤器

**修改前**：
```typescript
channel.on(
  'postgres_changes',
  {
    event: 'UPDATE',
    schema: 'public',
    table: 'resignation_applications',
    filter: `driver_id=eq.${userId}`  // ❌ 错误的字段名
  },
  (payload) => {
    console.log('📝 离职申请状态变化:', payload)
    const record = payload.new as any
    // ...
  }
)
```

**修改后**：
```typescript
channel.on(
  'postgres_changes',
  {
    event: 'UPDATE',
    schema: 'public',
    table: 'resignation_applications',
    filter: `user_id=eq.${userId}`  // ✅ 正确的字段名
  },
  (payload) => {
    console.log('📝 离职申请状态变化:', payload)
    const record = payload.new as any
    // ...
  }
)
```

## 🔍 数据库表结构验证

### leave_applications 表

```sql
CREATE TABLE IF NOT EXISTS leave_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,  -- ✅ 字段名是 user_id
  warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  leave_type leave_type NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  days numeric(5,1) NOT NULL,
  reason text NOT NULL,
  status application_status DEFAULT 'pending'::application_status NOT NULL,
  reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);
```

### resignation_applications 表

```sql
CREATE TABLE IF NOT EXISTS resignation_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,  -- ✅ 字段名是 user_id
  warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  resignation_date date NOT NULL,
  reason text NOT NULL,
  status application_status DEFAULT 'pending'::application_status NOT NULL,
  reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);
```

## 📊 实时订阅工作流程

### 1. 司机端订阅

当司机登录时，会订阅以下事件：

```typescript
// 监听自己的请假申请状态变化
channel.on('postgres_changes', {
  event: 'UPDATE',
  schema: 'public',
  table: 'leave_applications',
  filter: `user_id=eq.${userId}`  // 只监听自己的申请
}, (payload) => {
  // 处理状态变化
})

// 监听自己的离职申请状态变化
channel.on('postgres_changes', {
  event: 'UPDATE',
  schema: 'public',
  table: 'resignation_applications',
  filter: `user_id=eq.${userId}`  // 只监听自己的申请
}, (payload) => {
  // 处理状态变化
})
```

### 2. 管理员端订阅

当管理员或超级管理员登录时，会订阅以下事件：

```typescript
// 监听新的请假申请
channel.on('postgres_changes', {
  event: 'INSERT',
  schema: 'public',
  table: 'leave_applications'
  // 不需要过滤器，监听所有新申请
}, (payload) => {
  // 处理新申请
})

// 监听新的离职申请
channel.on('postgres_changes', {
  event: 'INSERT',
  schema: 'public',
  table: 'resignation_applications'
  // 不需要过滤器，监听所有新申请
}, (payload) => {
  // 处理新申请
})

// 监听新的打卡记录
channel.on('postgres_changes', {
  event: 'INSERT',
  schema: 'public',
  table: 'attendance'
  // 不需要过滤器，监听所有新打卡
}, (payload) => {
  // 处理新打卡
})
```

## 🧪 测试方法

### 测试1：验证订阅成功

1. **打开浏览器控制台**（F12）

2. **登录任意角色账号**

3. **查看控制台日志**

**预期日志**：
```javascript
🔌 开始设置实时通知订阅: {userId: "xxx", userRole: "driver"}
📡 创建新的订阅通道: notifications_xxx
🚗 设置司机监听，userId: xxx
📡 实时通知订阅状态: SUBSCRIBED
✅ 实时通知订阅成功！
```

**如果看到错误**：
```javascript
📡 实时通知订阅状态: CHANNEL_ERROR
❌ 实时通知订阅失败！
```

说明订阅配置有问题。

### 测试2：验证请假申请实时通知

1. **司机端提交请假申请**
   - 使用司机账号登录
   - 提交一个请假申请

2. **超级管理员审批**
   - 使用超级管理员账号登录
   - 审批刚才的请假申请

3. **司机端查看控制台**
   - 切换回司机账号的浏览器标签页
   - 查看控制台日志

**预期日志**：
```javascript
📝 请假申请状态变化: {
  new: {
    id: "xxx",
    user_id: "xxx",
    status: "approved",
    // ...
  }
}
🔔 尝试显示通知: {
  title: "您的请假申请已通过",
  content: "您的请假申请已通过审批",
  // ...
}
```

### 测试3：验证离职申请实时通知

1. **司机端提交离职申请**
   - 使用司机账号登录
   - 提交一个离职申请

2. **超级管理员审批**
   - 使用超级管理员账号登录
   - 审批刚才的离职申请

3. **司机端查看控制台**
   - 切换回司机账号的浏览器标签页
   - 查看控制台日志

**预期日志**：
```javascript
📝 离职申请状态变化: {
  new: {
    id: "xxx",
    user_id: "xxx",
    status: "approved",
    // ...
  }
}
🔔 尝试显示通知: {
  title: "您的离职申请已通过",
  content: "您的离职申请已通过审批",
  // ...
}
```

## 📁 相关文件

### 修改的文件
1. **`src/hooks/useRealtimeNotifications.ts`**
   - 修复请假申请订阅过滤器
   - 修复离职申请订阅过滤器

### 相关的数据库迁移文件
1. **`supabase/migrations/006_create_leave_tables.sql`**
   - 定义了 `leave_applications` 表结构
   - 定义了 `resignation_applications` 表结构

2. **`supabase/migrations/00033_012_enable_realtime.sql`**
   - 启用了 Realtime 功能
   - 配置了需要实时监听的表

## 🔧 Supabase Realtime 配置

### 已启用 Realtime 的表

根据 `supabase/migrations/00033_012_enable_realtime.sql`：

```sql
-- 为请假申请表启用 Realtime
ALTER TABLE leave_applications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE leave_applications;

-- 为离职申请表启用 Realtime
ALTER TABLE resignation_applications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE resignation_applications;

-- 为打卡记录表启用 Realtime
ALTER TABLE attendance REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE attendance;
```

### Realtime 过滤器语法

Supabase Realtime 支持以下过滤器语法：

```typescript
// 等于
filter: `column_name=eq.value`

// 不等于
filter: `column_name=neq.value`

// 大于
filter: `column_name=gt.value`

// 小于
filter: `column_name=lt.value`

// 包含（数组）
filter: `column_name=cs.{value1,value2}`

// 在...之中
filter: `column_name=in.(value1,value2)`
```

**重要提示**：
- 过滤器中的字段名必须与数据库表中的实际字段名完全一致
- 字段名区分大小写
- 如果字段名不存在，订阅会失败

## ⚠️ 常见错误

### 错误1：字段名不匹配

```typescript
// ❌ 错误：使用了不存在的字段名
filter: `driver_id=eq.${userId}`

// ✅ 正确：使用实际的字段名
filter: `user_id=eq.${userId}`
```

### 错误2：表未启用 Realtime

如果订阅的表没有启用 Realtime，订阅会失败。

**解决方法**：
```sql
-- 启用 Realtime
ALTER TABLE table_name REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE table_name;
```

### 错误3：过滤器语法错误

```typescript
// ❌ 错误：使用了错误的语法
filter: `user_id=${userId}`

// ✅ 正确：使用正确的语法
filter: `user_id=eq.${userId}`
```

## 📞 问题排查

如果实时订阅仍然失败，请按以下步骤排查：

### 1. 检查控制台日志

打开浏览器控制台（F12），查看详细的订阅日志：

```javascript
🔌 开始设置实时通知订阅: {userId: "xxx", userRole: "driver"}
📡 创建新的订阅通道: notifications_xxx
🚗 设置司机监听，userId: xxx
📡 实时通知订阅状态: [状态]
```

### 2. 验证数据库表结构

在 Supabase 控制台中，执行以下 SQL 查询：

```sql
-- 查看 leave_applications 表结构
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'leave_applications';

-- 查看 resignation_applications 表结构
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'resignation_applications';
```

确认表中确实有 `user_id` 字段。

### 3. 验证 Realtime 配置

在 Supabase 控制台中，执行以下 SQL 查询：

```sql
-- 查看哪些表启用了 Realtime
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
```

确认 `leave_applications` 和 `resignation_applications` 在列表中。

### 4. 检查用户权限

确认当前用户有权限访问这些表：

```sql
-- 查看当前用户
SELECT auth.uid();

-- 查看用户的 profile
SELECT * FROM profiles WHERE id = auth.uid();
```

### 5. 测试简单订阅

尝试订阅一个不带过滤器的简单事件：

```typescript
const channel = supabase.channel('test')

channel.on(
  'postgres_changes',
  {
    event: '*',
    schema: 'public',
    table: 'leave_applications'
  },
  (payload) => {
    console.log('收到变化:', payload)
  }
)

channel.subscribe((status) => {
  console.log('订阅状态:', status)
})
```

如果简单订阅成功，说明问题出在过滤器上。

## 🎉 总结

本次修复完成了以下内容：

1. ✅ 修复了请假申请实时订阅的过滤器字段名
2. ✅ 修复了离职申请实时订阅的过滤器字段名
3. ✅ 验证了数据库表结构
4. ✅ 确认了 Realtime 配置正确
5. ✅ 添加了详细的测试方法和问题排查指南

现在，实时通知订阅应该可以正常工作了！当司机的请假申请或离职申请被审批后，司机端会立即收到实时通知。

## 🚀 后续优化建议

### 1. 添加通知表的实时订阅

目前只订阅了申请表的变化，可以考虑直接订阅 `notifications` 表：

```typescript
channel.on(
  'postgres_changes',
  {
    event: 'INSERT',
    schema: 'public',
    table: 'notifications',
    filter: `user_id=eq.${userId}`
  },
  (payload) => {
    const notification = payload.new as Notification
    showNotification(notification.title, notification.message, ...)
  }
)
```

这样可以统一处理所有类型的通知。

### 2. 添加重连机制

当网络断开时，自动重新订阅：

```typescript
channel.subscribe((status) => {
  if (status === 'CHANNEL_ERROR') {
    console.error('❌ 订阅失败，5秒后重试...')
    setTimeout(() => {
      channel.subscribe()
    }, 5000)
  }
})
```

### 3. 添加订阅状态指示器

在 UI 中显示实时订阅的状态：

```typescript
const [subscriptionStatus, setSubscriptionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting')

channel.subscribe((status) => {
  if (status === 'SUBSCRIBED') {
    setSubscriptionStatus('connected')
  } else if (status === 'CHANNEL_ERROR') {
    setSubscriptionStatus('error')
  }
})
```

---

**修复完成时间**：2025-11-05
**修复人**：秒哒 AI 助手
