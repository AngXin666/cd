# 需求文档：微信小程序部署

## 简介

将车队管家完整应用部署到微信小程序平台，使用腾讯云 Serverless 作为后端服务，保持现有 PostgreSQL 数据库不变。本项目旨在为 iOS 用户（包括老板、调度、车队长、司机等所有角色）提供小程序访问方式，同时保持 Android 用户继续使用现有 APP，两端共享同一后端和数据库。

## 术语表

- **小程序 (MiniProgram)**: 微信小程序应用，供 iOS 用户使用
- **Android_APP**: 现有 Android 应用，供 Android 用户使用
- **Serverless**: 腾讯云 Serverless 云函数服务
- **全角色应用 (Full_App)**: 包含所有角色（老板、调度、车队长、司机）的完整应用
- **SSE (Server_Sent_Events)**: 服务器推送事件技术
- **轮询 (Polling)**: 客户端定期请求服务器获取更新的技术
- **热更新 (Hot_Update)**: 应用内更新机制，无需重新下载安装
- **Mangum**: FastAPI 到 ASGI/WSGI 的适配器
- **wgt包 (Widget_Package)**: UniApp 热更新资源包

## 需求

### 需求 1：小程序项目创建

**用户故事**: 作为开发者，我想创建独立的小程序项目，以便部署完整的车队管家应用到微信小程序。

#### 验收标准

1. WHEN 创建小程序项目时，THE System SHALL 复制所有页面组件（包括 boss、dispatcher、manager、driver 所有角色）
2. WHEN 复制共享组件时，THE System SHALL 包含所有通用组件和工具函数
3. WHEN 配置小程序项目时，THE System SHALL 创建正确的 manifest.json 配置，包含小程序 AppID (wxf11a504cd3e01346)
4. WHEN 配置页面路由时，THE System SHALL 在 pages.json 中包含所有角色的页面路由
5. WHEN 配置 Pinia Store 时，THE System SHALL 包含所有状态管理模块

### 需求 2：热更新功能移除

**用户故事**: 作为开发者，我想移除热更新相关代码，因为微信小程序不支持此功能。

#### 验收标准

1. WHEN 清理前端代码时，THE System SHALL 删除 `src/utils/update.ts` 文件
2. WHEN 清理前端代码时，THE System SHALL 从所有页面组件中移除热更新检查逻辑
3. WHEN 清理后端代码时，THE System SHALL 移除 `/api/version/check` 和 `/api/version/download` 接口
4. WHEN 清理后端代码时，THE System SHALL 删除 `publish_version.py` 和 `test_hot_update.py` 脚本
5. WHEN 清理配置文件时，THE System SHALL 从 manifest.json 中移除热更新相关配置项

### 需求 3：实时通信方案替换

**用户故事**: 作为开发者，我想将 SSE 实时通信替换为轮询机制，因为微信小程序不支持 SSE。

#### 验收标准

1. WHEN 实现轮询机制时，THE System SHALL 创建定时器每 5 秒请求一次服务器
2. WHEN 获取实时数据时，THE System SHALL 调用 REST API 接口而非 SSE 连接
3. WHEN 页面进入后台时，THE System SHALL 停止轮询以节省资源
4. WHEN 页面返回前台时，THE System SHALL 恢复轮询
5. WHEN 用户登出时，THE System SHALL 清除所有轮询定时器
6. WHEN 网络错误发生时，THE System SHALL 使用指数退避策略重试（最大间隔 30 秒）

### 需求 4：后端 Serverless 适配

**用户故事**: 作为开发者，我想将 FastAPI 应用适配到腾讯云 Serverless，以便利用免费额度降低运营成本。

#### 验收标准

1. WHEN 配置 Serverless 入口时，THE System SHALL 使用 Mangum 适配器包装 FastAPI 应用
2. WHEN 创建 serverless.yml 时，THE System SHALL 配置正确的运行时环境（Python 3.9）
3. WHEN 配置数据库连接时，THE System SHALL 使用现有服务器地址 (45.197.148.64)
4. WHEN 配置环境变量时，THE System SHALL 通过 serverless.yml 注入数据库凭证和 JWT 密钥
5. WHEN 处理 CORS 时，THE System SHALL 允许小程序域名的跨域请求
6. WHEN 优化冷启动时，THE System SHALL 使用连接池复用数据库连接

### 需求 5：文件上传适配

**用户故事**: 作为用户，我想在小程序中上传照片（如打卡照片），以便记录工作状态。

#### 验收标准

1. WHEN 上传文件时，THE System SHALL 支持微信小程序的 `wx.uploadFile` API
2. WHEN 文件大小超过限制时，THE System SHALL 在前端压缩图片到 2MB 以内
3. WHEN 上传失败时，THE System SHALL 提供清晰的错误提示
4. WHEN 保存文件时，THE System SHALL 使用对象存储服务（腾讯云 COS）而非本地文件系统
5. WHEN 访问上传的文件时，THE System SHALL 返回可访问的 HTTPS URL
6. WHEN Android APP 上传文件时，THE System SHALL 保持现有上传逻辑不变

### 需求 6：小程序配置与部署

**用户故事**: 作为开发者，我想完成小程序的配置和部署，以便司机可以使用。

#### 验收标准

1. WHEN 配置服务器域名时，THE System SHALL 在小程序后台添加 Serverless 函数的 HTTPS 域名
2. WHEN 配置业务域名时，THE System SHALL 添加文件上传服务的域名
3. WHEN 构建小程序时，THE System SHALL 生成符合微信规范的代码包（小于 2MB）
4. WHEN 上传代码时，THE System SHALL 使用微信开发者工具或 CLI 上传到微信服务器
5. WHEN 提交审核时，THE System SHALL 提供完整的功能说明和测试账号

### 需求 7：本地存储适配

**用户故事**: 作为司机，我想在小程序中保持登录状态，以便无需频繁登录。

#### 验收标准

1. WHEN 存储数据时，THE System SHALL 使用 `wx.setStorageSync` 替代 `localStorage`
2. WHEN 读取数据时，THE System SHALL 使用 `wx.getStorageSync` 替代 `localStorage.getItem`
3. WHEN 清除数据时，THE System SHALL 使用 `wx.removeStorageSync` 替代 `localStorage.removeItem`
4. WHEN 存储容量超过 10MB 时，THE System SHALL 清理旧数据或提示用户
5. WHEN 存储敏感数据时，THE System SHALL 对 Token 进行加密存储

### 需求 8：功能完整性验证

**用户故事**: 作为用户，我想在小程序中使用所有角色的核心功能，以便完成日常工作。

#### 验收标准

1. WHEN 用户登录时，THE System SHALL 验证用户名密码并根据角色跳转到对应首页
2. WHEN 老板使用时，THE System SHALL 提供用户管理、数据统计、系统设置等功能
3. WHEN 调度使用时，THE System SHALL 提供任务分配、司机管理等功能
4. WHEN 车队长使用时，THE System SHALL 提供司机管理、打卡审核等功能
5. WHEN 司机使用时，THE System SHALL 提供打卡、查看任务、提交计件等功能
6. WHEN 网络断开时，THE System SHALL 提示用户并在恢复后自动重试

### 需求 9：性能与资源优化

**用户故事**: 作为开发者，我想优化小程序性能，以便提供流畅的用户体验。

#### 验收标准

1. WHEN 小程序启动时，THE System SHALL 在 3 秒内完成首屏渲染
2. WHEN 切换页面时，THE System SHALL 在 500ms 内完成页面切换
3. WHEN 加载图片时，THE System SHALL 使用懒加载和缩略图
4. WHEN 请求 API 时，THE System SHALL 使用请求缓存减少重复请求
5. WHEN 内存使用超过 200MB 时，THE System SHALL 清理缓存数据

### 需求 10：错误处理与日志

**用户故事**: 作为开发者，我想记录错误日志，以便快速定位和修复问题。

#### 验收标准

1. WHEN API 请求失败时，THE System SHALL 记录错误信息到日志
2. WHEN 发生未捕获异常时，THE System SHALL 捕获并记录到错误监控服务
3. WHEN 用户操作失败时，THE System SHALL 显示友好的错误提示
4. WHEN 后端发生错误时，THE System SHALL 记录完整的堆栈信息
5. WHEN 生产环境运行时，THE System SHALL 使用 WARNING 级别的日志

### 需求 11：安全性要求

**用户故事**: 作为系统管理员，我想确保小程序的安全性，以便保护用户数据。

#### 验收标准

1. WHEN 传输数据时，THE System SHALL 使用 HTTPS 加密通信
2. WHEN 存储 Token 时，THE System SHALL 使用加密存储
3. WHEN 验证请求时，THE System SHALL 检查 JWT Token 的有效性和过期时间
4. WHEN 访问敏感接口时，THE System SHALL 验证用户角色权限
5. WHEN 检测到异常请求时，THE System SHALL 记录并拒绝请求

### 需求 12：Android APP 兼容性保证

**用户故事**: 作为产品经理，我想确保 Android APP 继续正常工作，以便 Android 用户不受影响。

#### 验收标准

1. WHEN 部署小程序后端时，THE System SHALL 保持现有 API 接口完全不变
2. WHEN Android APP 调用 API 时，THE System SHALL 返回与之前完全相同的数据格式
3. WHEN 数据库结构变更时，THE System SHALL 保持向后兼容
4. WHEN 新增小程序专用接口时，THE System SHALL 不影响现有接口
5. WHEN 测试兼容性时，THE System SHALL 验证 Android APP 所有角色的所有功能正常
6. WHEN Android 用户和小程序用户同时使用时，THE System SHALL 正确处理并发请求和数据一致性
