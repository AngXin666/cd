---
inclusion: always
---

# 项目上下文信息

## 项目概述

这是一个基于 Taro 框架的多端应用项目（支持 H5、小程序、Android），用于车队管理系统。

## 技术栈

### 前端框架
- **Taro 3.x**：多端统一开发框架
- **React 18**：UI 库
- **TypeScript**：类型安全的 JavaScript 超集

### 状态管理与数据
- **React Hooks**：状态管理
- **Supabase**：后端服务（数据库、认证、存储）

### 样式
- **SCSS**：CSS 预处理器
- **Tailwind CSS**：实用优先的 CSS 框架

### 构建与工具
- **Vite**：构建工具
- **Biome**：代码格式化和 lint
- **Vitest**：测试框架

## 项目结构

```
.
├── src/
│   ├── components/     # 公共组件
│   ├── pages/          # 页面组件
│   ├── services/       # API 服务
│   ├── hooks/          # 自定义 Hooks
│   ├── utils/          # 工具函数
│   ├── types/          # TypeScript 类型定义
│   ├── app.tsx         # 应用入口
│   └── app.config.ts   # 应用配置
├── config/             # 配置文件
├── scripts/            # 构建和部署脚本
├── docs/               # 项目文档
├── .kiro/              # Kiro 配置和规范
│   ├── specs/          # 功能规范
│   └── steering/       # 编码规范
└── supabase/           # Supabase 配置和迁移
```

## 核心功能模块

### 认证系统
- 使用 `useAuth` Hook 进行认证
- 使用 `AuthProvider` 包裹需要认证的组件
- 支持多租户隔离

### 导航系统
- 使用 `Taro.navigateTo` 进行页面跳转
- TabBar 配置在 `app.config.ts` 中
- 支持不同角色的页面访问控制

### 角色系统
- **司机 (driver)**：基础用户角色
- **管理员 (manager)**：车队管理员
- **超级管理员 (super-admin)**：系统管理员

## 重要约定

### 多租户
- 所有数据库操作必须包含 `tenant_id` 过滤
- 确保租户数据完全隔离
- 使用 Supabase RLS (Row Level Security) 策略

### 环境配置
- 开发环境：`.env.development`
- 生产环境：`.env.production`
- 测试环境：`.env.test`
- 模板文件：`.env.template`

### 代码规范工具
- 使用 Biome 进行代码格式化
- 配置文件：`biome.json`
- 运行检查：`npm run lint`

## 部署流程

### H5 部署
- 构建命令：`npm run build:h5`
- 部署到 Supabase Storage
- 使用脚本：`scripts/quick-deploy-h5.js`

### Android 部署
- 构建命令：`npm run build:android`
- 使用 Capacitor 打包
- 输出 APK 文件

### APK 构建流程（强制）
当需要构建 APK 时，必须按以下步骤执行：
1. 构建 H5：`npm run build:h5`
2. 同步到 Android：`npx cap sync android`
3. 构建 APK：在 `android` 目录下执行 `.\gradlew assembleDebug`
4. **构建完成后必须自动打开 APK 所在文件夹**：
   ```powershell
   explorer.exe "C:\Users\Administrator\Desktop\cdgj\android\app\build\outputs\apk\debug"
   ```
- APK 输出位置：`android\app\build\outputs\apk\debug\app-debug.apk`

## 开发工作流

### 启动开发服务器
```bash
# H5 开发
npm run dev:h5

# 微信小程序开发
npm run dev:weapp
```

### 运行测试
```bash
npm run test
```

### 代码检查
```bash
npm run lint
```

## 常用组件和 Hooks

### 认证相关
- `useAuth()`：获取当前用户认证状态
- `AuthProvider`：认证上下文提供者

### 导航相关
- `Taro.navigateTo()`：跳转到新页面
- `Taro.redirectTo()`：重定向到新页面
- `Taro.switchTab()`：切换 TabBar 页面

### UI 组件
- `TopNavBar`：顶部导航栏
- `SafeAreaTop`：安全区域顶部占位

## 数据库约定

### 表命名
- 使用小写字母和下划线
- 复数形式（如 `users`, `vehicles`）

### 字段约定
- `id`：主键，UUID 类型
- `created_at`：创建时间
- `updated_at`：更新时间
- `tenant_id`：租户 ID（多租户必需）

### RLS 策略
- 所有表必须启用 RLS
- 基于 `tenant_id` 进行数据隔离
- 基于用户角色进行权限控制

## 注意事项

### 性能优化
- 使用 React.memo 优化组件渲染
- 使用 useMemo 和 useCallback 优化计算
- 图片使用懒加载

### 安全性
- 敏感信息存储在 .env 文件
- 不要在客户端暴露 API 密钥
- 使用参数化查询防止 SQL 注入

### 兼容性
- 确保代码在 H5、小程序、Android 平台都能正常运行
- 使用 Taro 提供的跨平台 API
- 注意不同平台的样式差异
