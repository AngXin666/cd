# 实时通知功能修复总结

## 问题描述

用户反馈：
1. 司机申请请假后，管理端顶部没有出现动态通知栏
2. 管理员审批请假后，司机端也没有出现动态通知栏

## 根本原因

**Supabase Realtime 未启用**

虽然代码逻辑正确，但数据库表没有启用 Realtime 功能，导致无法接收实时数据变更通知。

## 修复内容

### 1. 启用数据库 Realtime（关键修复）

创建迁移文件 `00033_012_enable_realtime.sql`，为以下表启用 Realtime：

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

### 2. 修复 localStorage 兼容性问题

将所有 `localStorage` 调用替换为 Taro 的 `getStorageSync` 和 `setStorageSync`，确保在小程序环境中正常工作。

**修改的文件：**
- `src/pages/manager/index.tsx`
- `src/pages/super-admin/index.tsx`
- `src/pages/driver/index.tsx`

### 3. 使用语义化颜色 Token

修复 `NotificationBar` 组件，将硬编码的颜色类（如 `bg-blue-50`）替换为语义化的设计系统 token（如 `bg-primary/10`）。

**修改的文件：**
- `src/components/NotificationBar/index.tsx`

### 4. 增强调试日志

在关键位置添加详细的调试日志，方便排查问题：

**useRealtimeNotifications Hook：**
- 订阅初始化日志
- 订阅状态日志
- 数据变更接收日志
- 通知显示流程日志

**useNotifications Hook：**
- 通知添加日志
- 通知列表更新日志

**NotificationBar 组件：**
- 渲染状态日志

**页面组件：**
- 欢迎通知加载日志

## 测试步骤

### 1. 查看订阅状态

打开浏览器控制台，应该看到：
```
🔌 开始设置实时通知订阅: {userId: "xxx", userRole: "manager"}
📡 创建新的订阅通道: notifications_xxx
👔 设置管理员/超级管理员监听
📡 实时通知订阅状态: SUBSCRIBED
✅ 实时通知订阅成功！
```

### 2. 测试管理员接收通知

1. 打开管理员端页面
2. 切换到司机端，提交请假申请
3. 返回管理员端，应该看到：
   - 控制台日志：`📨 收到新的请假申请`
   - Toast 提示："收到新的请假申请"
   - 手机震动反馈
   - 顶部通知栏显示新通知

### 3. 测试司机接收通知

1. 打开司机端页面
2. 切换到管理员端，审批请假申请
3. 返回司机端，应该看到：
   - 控制台日志：`📝 请假申请状态变化`
   - Toast 提示："您的请假申请已通过"
   - 手机震动反馈
   - 顶部通知栏显示新通知

## 调试指南

如果通知仍然不工作，请按以下步骤排查：

### 1. 检查订阅状态

查看控制台是否有：
- `✅ 实时通知订阅成功！` - 订阅正常
- `❌ 实时通知订阅失败！` - 订阅失败

如果订阅失败，检查：
- Supabase URL 和 Key 是否正确
- 网络连接是否正常
- Supabase 项目是否正常运行

### 2. 检查数据变更

在控制台查看是否有数据变更日志：
- `📨 收到新的请假申请`
- `📝 请假申请状态变化`

如果没有这些日志，说明：
- Realtime 未正确启用
- 数据变更未触发
- 订阅过滤条件不匹配

### 3. 检查通知显示

查看是否有通知显示日志：
- `🔔 尝试显示通知`
- `✅ 通过防抖检查，显示通知`
- `📢 调用 onNewNotification 回调`

如果有这些日志但没有看到通知栏，检查：
- `NotificationBar` 组件是否正确渲染
- `useNotifications` Hook 是否正常工作
- 通知数据是否正确存储

### 4. 检查欢迎通知

如果首次加载时没有看到欢迎通知，检查：
- 控制台是否有 `🎯 检查欢迎通知标记`
- 是否有 `✨ 开始添加欢迎通知`
- 是否有 `📢 添加新通知`

如果已经看过欢迎通知，可以清除缓存：
```javascript
// 浏览器环境
localStorage.removeItem('manager_welcome_shown')
localStorage.removeItem('super_admin_welcome_shown')
localStorage.removeItem('driver_welcome_shown')

// 小程序环境
Taro.removeStorageSync('manager_welcome_shown')
Taro.removeStorageSync('super_admin_welcome_shown')
Taro.removeStorageSync('driver_welcome_shown')
```

## 相关文件

### 新增文件
- `supabase/migrations/00033_012_enable_realtime.sql` - Realtime 启用迁移
- `scripts/clear-notification-cache.js` - 缓存清除脚本
- `NOTIFICATION_FIX_SUMMARY.md` - 修复总结文档

### 修改文件
- `src/hooks/useRealtimeNotifications.ts` - 增强调试日志
- `src/hooks/useNotifications.ts` - 增强调试日志
- `src/components/NotificationBar/index.tsx` - 修复颜色、增强日志
- `src/pages/manager/index.tsx` - 修复 localStorage、增强日志
- `src/pages/super-admin/index.tsx` - 修复 localStorage、增强日志
- `src/pages/driver/index.tsx` - 修复 localStorage、增强日志
- `NOTIFICATION_SYSTEM.md` - 更新文档，添加测试说明

## 技术细节

### Supabase Realtime 工作原理

1. **REPLICA IDENTITY FULL**：确保 Postgres 在复制日志中包含完整的行数据
2. **Publication**：将表添加到 `supabase_realtime` publication，使其变更可被订阅
3. **Channel**：创建订阅通道，监听特定表的变更事件
4. **Filter**：可以使用过滤器只接收特定条件的变更（如 `driver_id=eq.xxx`）

### 防抖机制

为避免短时间内重复通知，实现了防抖机制：
- 每个通知类型有独立的防抖计时器
- 默认最小间隔 3 秒
- 在间隔时间内的重复通知会被忽略

### 通知流程

```
数据库变更 → Supabase Realtime → Channel 回调 → showNotification
                                                        ↓
                                    Toast + 震动 + onNewNotification
                                                        ↓
                                                  useNotifications
                                                        ↓
                                                  NotificationBar
```

## 后续优化建议

1. **通知历史记录**：添加查看历史通知的功能
2. **通知设置**：允许用户自定义通知开关、声音等
3. **通知分类**：支持按类型筛选通知
4. **通知标记**：支持批量标记已读
5. **通知跳转**：优化通知点击后的页面跳转逻辑
6. **离线通知**：支持离线时的通知缓存和同步
