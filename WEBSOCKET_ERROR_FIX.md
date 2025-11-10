# WebSocket 连接错误说明

## ⚠️ 重要提示
**这个 WebSocket 错误是正常的，可以安全忽略！**

## 错误信息
```
WebSocket connection to 'wss://backend.appmiaoda.com/projects/supabase244341780043055104/realtime/v1/websocket?apikey=...' failed
```

## 为什么会出现这个错误？

Supabase 客户端在初始化时会自动尝试建立 WebSocket 连接，用于实时数据订阅功能（Realtime）。但是：

1. **车队管理小程序不需要实时订阅功能**
2. **所有功能都使用普通的 HTTP 请求**
3. **WebSocket 连接失败不影响任何功能**

## 这个错误会影响什么？

### ❌ 不会影响的功能（全部正常工作）
- ✅ 用户登录、注册、退出
- ✅ 数据查询、插入、更新、删除
- ✅ **重置密码功能**
- ✅ 用户管理
- ✅ 车辆管理
- ✅ 所有业务功能

### ✅ 会影响的功能（本应用不使用）
- 实时数据订阅（`.on('INSERT', callback)` 等）
- 实时通知推送
- 多人协作实时同步

## 为什么不禁用 WebSocket？

Supabase JS SDK 的当前版本不支持完全禁用 Realtime 功能。即使不使用实时订阅，SDK 也会尝试建立 WebSocket 连接。

**这是 SDK 的正常行为，不是错误！**

## 如何处理这个错误？

### 方案 1: 忽略（推荐）✅
**直接忽略这个错误**，它不会影响应用的任何功能。

### 方案 2: 隐藏错误消息
如果觉得错误消息影响调试，可以在浏览器控制台中过滤：

**Chrome/Edge**:
1. 打开开发者工具（F12）
2. 点击 Console 标签页
3. 点击右上角的"过滤器"图标
4. 输入: `-WebSocket`
5. 这样就不会显示 WebSocket 相关的错误

**Firefox**:
1. 打开开发者工具（F12）
2. 点击 Console 标签页
3. 在过滤框中输入: `-WebSocket`

## 重置密码失败的真正原因

**WebSocket 错误绝对不是导致重置密码失败的原因！**

重置密码功能使用的是普通的 HTTP 请求（fetch API），与 WebSocket 完全无关。

### 如何诊断重置密码问题？

请查看控制台中的详细日志：

1. 打开浏览器开发者工具（F12）
2. 切换到 Console 标签页
3. 点击"重置密码"按钮
4. 查找以下关键日志：

```
=== 开始重置密码 ===
目标用户ID: xxx
会话状态: 已登录/未登录
收到响应，状态码: xxx
响应原始文本: xxx
```

根据这些日志，可以确定重置密码失败的真正原因。

### 详细的调试指南

请参考以下文档进行详细的故障排查：

- **[RESET_PASSWORD_TROUBLESHOOTING.md](./RESET_PASSWORD_TROUBLESHOOTING.md)** - 完整的故障排查指南
- **[DEBUG_RESET_PASSWORD.md](./DEBUG_RESET_PASSWORD.md)** - 详细的调试步骤
- **[check-reset-password.sql](./check-reset-password.sql)** - 数据库诊断脚本

## 常见的重置密码失败原因

### 1. 权限不足 (最常见)
**症状**: 提示"权限不足，仅超级管理员可以重置密码"

**解决方案**:
```sql
-- 在 Supabase SQL Editor 中执行
UPDATE profiles SET role = 'super_admin' WHERE phone = '你的手机号';
```

### 2. 会话过期
**症状**: 提示"未登录，无法重置密码"

**解决方案**: 退出后重新登录

### 3. 目标用户不存在
**症状**: HTTP 状态码 500

**解决方案**: 检查目标用户是否存在于数据库中

## 总结

- ✅ WebSocket 错误是正常的，可以安全忽略
- ✅ 不影响任何应用功能
- ✅ 不是重置密码失败的原因
- ✅ 无需修复或处理

**如果重置密码失败，请查看详细的调试日志，而不是关注 WebSocket 错误。**

---

**最后更新**: 2025-11-05
