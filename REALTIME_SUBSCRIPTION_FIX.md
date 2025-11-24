# 实时通知订阅失败问题修复总结

## 📋 问题描述

**错误信息**：
```
useRealtimeNotifications.ts:246 ❌ 实时通知订阅失败！
```

**影响**：
- 实时通知功能无法正常工作
- 用户无法收到实时通知（请假申请、离职申请、考勤打卡等）

## 🔍 问题原因

Supabase 客户端配置中**没有启用 Realtime 功能**，导致实时订阅失败。

原配置（`src/client/supabase.ts`）：
```typescript
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: customFetch },
  auth: { ... }
  // ❌ 缺少 realtime 配置
})
```

## ✅ 解决方案

### 1. 启用 Realtime 功能

修改 `src/client/supabase.ts`：

```typescript
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: customFetch },
  auth: { ... },
  realtime: {
    params: {
      eventsPerSecond: 10  // 限制每秒事件数
    }
  }
})
```

### 2. 添加详细错误日志

修改 `src/hooks/useRealtimeNotifications.ts`：

```typescript
channel.subscribe((status, err) => {
  console.log('📡 实时通知订阅状态:', status)
  if (status === 'SUBSCRIBED') {
    console.log('✅ 实时通知订阅成功！')
  } else if (status === 'CHANNEL_ERROR') {
    console.error('❌ 实时通知订阅失败！', err)
    console.error('订阅失败详情:', {
      userId, userRole, channelName: `notifications_${userId}`, error: err
    })
  } else if (status === 'TIMED_OUT') {
    console.error('⏱️ 实时通知订阅超时！')
  } else if (status === 'CLOSED') {
    console.warn('🔒 实时通知订阅已关闭')
  }
})
```

## 📊 实时通知功能

### 监听的表

1. **`leave_applications`** - 请假申请表
2. **`resignation_applications`** - 离职申请表
3. **`attendance`** - 考勤记录表

### 通知类型

**管理员/超级管理员**：
- 新的请假申请
- 新的离职申请
- 新的打卡记录

**司机**：
- 请假申请审批结果
- 离职申请审批结果

## 🧪 测试方法

### 验证订阅成功

打开浏览器控制台，应该看到：

```
📡 创建新的订阅通道: notifications_{userId}
👔 设置管理员/超级管理员监听
📡 实时通知订阅状态: SUBSCRIBED
✅ 实时通知订阅成功！
```

### 测试通知

1. **管理员收到新的请假申请**
   - 司机提交请假申请
   - 管理员应收到通知弹窗

2. **司机收到审批结果**
   - 管理员审批请假申请
   - 司机应收到通知弹窗

## 📁 相关文件

- `src/client/supabase.ts` - Supabase 客户端配置
- `src/hooks/useRealtimeNotifications.ts` - 实时通知 Hook

## 🎉 总结

本次修复完成了以下内容：

1. ✅ 启用了 Supabase Realtime 功能
2. ✅ 添加了详细的错误日志
3. ✅ 支持多种订阅状态的处理

现在，实时通知功能应该可以正常工作了！

---

**修复完成时间**：2025-11-24
**相关提交**：`ddbaa53` - 修复实时通知订阅失败问题，启用Realtime功能并添加详细错误日志
