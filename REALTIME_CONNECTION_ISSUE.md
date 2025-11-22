# Supabase Realtime 连接问题说明

## 问题描述

控制台显示：
```
❌ 实时通知订阅失败！
订阅状态: CHANNEL_ERROR
```

## 原因分析

当前 Supabase 使用的是代理地址：
```
https://backend.appmiaoda.com/projects/supabase244341780043055104
```

这个代理地址可能不支持 WebSocket 连接，导致 Realtime 功能无法工作。

Supabase Realtime 依赖 WebSocket 协议进行实时通信，如果代理服务器不支持 WebSocket 升级，就会出现 `CHANNEL_ERROR`。

## 解决方案

### ✅ 已实施：使用轮询代替 Realtime

由于 Realtime 连接失败，我们已经切换到使用定时轮询的方式来实现"准实时"通知。

**实施内容**：
1. 创建了 `usePollingNotifications` Hook
2. 在所有页面中将 `useRealtimeNotifications` 替换为 `usePollingNotifications`
3. 设置轮询间隔为 10 秒

**优点**：
- ✅ 不依赖 WebSocket，兼容性好
- ✅ 实现简单，易于调试
- ✅ 可以控制轮询频率
- ✅ 已经完全集成到系统中

**缺点**：
- ⚠️ 不是真正的实时，有延迟（10 秒）
- ⚠️ 会增加一些服务器请求

**工作原理**：
- 每 10 秒自动检查一次数据库
- 比较上次检查时间和数据的创建/更新时间
- 发现新数据时触发通知
- 使用防抖机制避免重复通知

### 方案 2：配置代理支持 WebSocket（可选）

如果您有权限配置代理服务器，可以启用 WebSocket 支持。

**Nginx 配置示例**：
```nginx
location /projects/supabase244341780043055104 {
    proxy_pass https://原始supabase地址;
    
    # WebSocket 支持
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    
    # 超时设置
    proxy_read_timeout 86400;
    proxy_send_timeout 86400;
}
```

### 方案 3：使用原始 Supabase URL（可选）

如果有原始的 Supabase URL（格式如 `https://xxx.supabase.co`），可以直接使用，不经过代理。

## 测试轮询通知

### 查看轮询日志

打开浏览器控制台，您会看到：

```
🔄 [轮询] 启动轮询通知系统: {userId: "xxx", userRole: "xxx", pollingInterval: "10秒"}
🔄 [轮询] 开始检查数据更新...
✅ [轮询] 检查完成
```

每 10 秒会自动执行一次检查。

### 测试通知功能

1. **管理员测试**：
   - 打开管理员页面
   - 切换到司机页面，提交请假申请
   - 等待最多 10 秒
   - 返回管理员页面，应该看到通知

2. **司机测试**：
   - 打开司机页面
   - 切换到管理员页面，审批请假申请
   - 等待最多 10 秒
   - 返回司机页面，应该看到通知

### 调整轮询间隔

如果需要更快的响应速度，可以调整轮询间隔：

**在页面组件中修改**：
```typescript
usePollingNotifications({
  // ... 其他配置
  pollingInterval: 5000 // 改为 5 秒
})
```

**建议的间隔时间**：
- 5 秒：快速响应，但会增加服务器负载
- 10 秒：平衡的选择（当前设置）
- 15-30 秒：降低服务器负载，但响应较慢

## 性能影响

### 服务器请求

**管理员/超级管理员**：
- 每次轮询 3 个请求（请假申请、离职申请、打卡记录）
- 10 秒间隔 = 每分钟 18 个请求

**司机**：
- 每次轮询 2 个请求（请假申请状态、离职申请状态）
- 10 秒间隔 = 每分钟 12 个请求

### 优化建议

1. **合并查询**：可以创建一个 API 端点，一次请求返回所有需要的数据
2. **增量查询**：只查询上次检查后的新数据
3. **智能轮询**：页面不可见时停止轮询，可见时恢复

## 文件变更

### 新增文件
- `src/hooks/usePollingNotifications.ts` - 轮询通知 Hook

### 修改文件
- `src/hooks/index.ts` - 导出轮询 Hook
- `src/pages/manager/index.tsx` - 使用轮询通知
- `src/pages/super-admin/index.tsx` - 使用轮询通知
- `src/pages/driver/index.tsx` - 使用轮询通知

## 后续优化

如果代理服务器支持 WebSocket，可以随时切换回 Realtime：

1. 将 `usePollingNotifications` 改回 `useRealtimeNotifications`
2. 删除 `pollingInterval` 参数
3. 测试 Realtime 连接是否成功

两个 Hook 的接口完全兼容，切换非常简单。
