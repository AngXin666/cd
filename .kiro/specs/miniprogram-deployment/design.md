# 设计文档：微信小程序部署

## 概述

将车队管家部署到微信小程序，为 iOS 用户提供访问方式。Android 用户继续使用现有 APP。

### 核心原则

1. **零影响**：Android APP 完全不受影响
2. **简单实用**：直接复用现有代码，最小化修改
3. **符合规范**：遵守小程序规则（主包 < 2MB，总包 < 16MB）

### 关键决策

1. **不创建新项目**：直接在现有 UniApp 项目中添加小程序平台
2. **不修改后端**：后端代码完全不变，只新增 Serverless 部署
3. **不过度封装**：使用 UniApp 内置 API，不自定义复杂组件

## 架构设计

### 整体架构

```
Android APP  →  现有服务器(:8000)  ↘
                                    PostgreSQL (45.197.148.64)
小程序       →  Serverless (新部署)  ↗
```

**说明**：
- 两个后端共享同一数据库
- 后端代码完全相同，只是部署方式不同
- Android APP 路径不变，小程序使用新域名

### 前端改动（最小化）

**使用 UniApp 条件编译**：

```typescript
// 1. API 地址配置（api/config.ts）
export const BASE_URL = 
  // #ifdef MP-WEIXIN
  'https://your-serverless.com'  // 小程序
  // #endif
  // #ifdef APP-PLUS
  'http://45.197.148.64:8000'    // Android
  // #endif

// 2. 移除热更新（删除 utils/update.ts 和相关调用）

// 3. SSE 改轮询（只修改通知页面）
// #ifdef MP-WEIXIN
setInterval(() => {
  // 轮询获取通知
}, 5000);
// #endif
// #ifdef APP-PLUS
// 使用 SSE
// #endif
```

**分包配置（pages.json）**：

```json
{
  "pages": [
    { "path": "pages/login/index" },
    { "path": "pages/index/index" }
  ],
  "subPackages": [
    {
      "root": "pages/boss",
      "pages": ["index/index", "users/index", ...]
    },
    {
      "root": "pages/manager",
      "pages": ["index/index", "drivers/index", ...]
    },
    {
      "root": "pages/driver",
      "pages": ["index/index", "clock/index", ...]
    }
  ]
}
```

### 后端改动（最小化）

**只新增一个文件**（serverless_handler.py）：

```python
from mangum import Mangum
from main import app

handler = Mangum(app, lifespan="off")
```

**serverless.yml 配置**：

```yaml
service: fleet-manager

provider:
  name: tencentcloud
  runtime: Python3.9
  region: ap-guangzhou

functions:
  api:
    handler: serverless_handler.handler
    environment:
      DATABASE_URL: postgresql://user:pass@45.197.148.64/fleet_manager
      JWT_SECRET: ${env:JWT_SECRET}
```

## 组件和接口

### 1. 轮询工具（utils/polling.ts）

```typescript
/**
 * 简单轮询工具
 * 用于小程序替代 SSE
 */
export class SimplePolling {
  private timers: Map<string, number> = new Map();
  
  start(id: string, fn: () => void, interval: number = 5000) {
    const timer = setInterval(fn, interval);
    this.timers.set(id, timer);
  }
  
  stop(id: string) {
    const timer = this.timers.get(id);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(id);
    }
  }
  
  stopAll() {
    this.timers.forEach(timer => clearInterval(timer));
    this.timers.clear();
  }
}
```

### 2. 图片压缩（使用 UniApp 内置 API）

```typescript
/**
 * 压缩图片到 2MB 以内
 */
export async function compressImage(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    uni.compressImage({
      src: filePath,
      quality: 80,
      success: (res) => resolve(res.tempFilePath),
      fail: reject
    });
  });
}
```

## 数据模型

**无需修改**：数据库结构完全不变。

## 正确性属性

*属性是系统应该满足的特征或行为，适用于所有有效执行。*

### 属性 1：轮询生命周期

*对于任何*启用轮询的页面，页面隐藏时停止轮询，显示时恢复轮询。

**验证**: 需求 3.3, 3.4

### 属性 2：图片压缩限制

*对于任何*上传的图片，压缩后大小不超过 2MB。

**验证**: 需求 5.2

### 属性 3：HTTPS 协议

*对于任何*API 请求，URL 使用 HTTPS 协议。

**验证**: 需求 11.1

### 属性 4：Token 过期验证

*对于任何*过期的 JWT Token，服务器返回 401 状态码。

**验证**: 需求 11.3

### 属性 5：角色权限验证

*对于任何*无权限的角色访问敏感接口，服务器返回 403 状态码。

**验证**: 需求 11.4

## 错误处理

### 前端错误处理

```typescript
// 统一错误处理
export function handleError(error: any) {
  if (error.statusCode === 401) {
    uni.reLaunch({ url: '/pages/login/index' });
  } else if (error.statusCode === 403) {
    uni.showToast({ title: '无权限', icon: 'none' });
  } else {
    uni.showToast({ title: error.message || '操作失败', icon: 'none' });
  }
}
```

### 后端错误处理

**无需修改**：使用现有错误处理逻辑。

## 测试策略

### 单元测试

**前端**（使用 Jest）：
1. 测试轮询启动/停止
2. 测试图片压缩
3. 测试错误处理

**后端**（使用 pytest）：
1. 测试 Serverless 适配器
2. 测试 Token 验证
3. 测试权限验证

### 属性测试

每个属性测试运行 100 次迭代。

1. **属性 1：轮询生命周期**
   ```typescript
   // Feature: miniprogram-deployment, Property 1: 轮询生命周期
   test('polling lifecycle', () => {
     const polling = new SimplePolling();
     polling.start('test', () => {}, 1000);
     expect(polling.timers.has('test')).toBe(true);
     
     polling.stop('test');
     expect(polling.timers.has('test')).toBe(false);
   });
   ```

2. **属性 4：Token 过期验证**
   ```python
   # Feature: miniprogram-deployment, Property 4: Token 过期验证
   def test_expired_token():
       token = create_expired_token()
       response = client.get('/api/users', headers={'Authorization': f'Bearer {token}'})
       assert response.status_code == 401
   ```

### 集成测试

1. 测试 Android APP 所有功能正常
2. 测试小程序登录和核心功能
3. 测试数据同步

### 测试配置

- 最小迭代次数：100
- 超时时间：30 秒
