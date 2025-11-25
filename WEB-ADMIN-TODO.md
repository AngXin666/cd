# 车队管家独立 Web 管理后台开发计划

## 项目概述
创建一个独立的 Web 管理后台，不依赖 Taro 框架，使用纯 React + TypeScript + Vite 构建。

## 技术栈
- **前端框架**：React 18 + TypeScript
- **构建工具**：Vite
- **样式方案**：Tailwind CSS
- **路由**：React Router v6
- **状态管理**：React Context + Hooks
- **HTTP 客户端**：Fetch API
- **后端服务**：Supabase（已有）
- **认证**：Supabase Auth
- **图标**：Material Design Icons

## 开发步骤

### 第一阶段：项目初始化 ✅
- [x] 创建项目结构
- [x] 配置 Vite
- [x] 配置 TypeScript
- [x] 配置 Tailwind CSS
- [x] 配置路由

### 第二阶段：核心功能开发
- [ ] 登录页面
- [ ] 权限验证
- [ ] 仪表盘页面
- [ ] 侧边栏导航
- [ ] 数据统计展示

### 第三阶段：功能模块开发
- [ ] 司机管理
- [ ] 车辆管理
- [ ] 考勤管理
- [ ] 请假审批
- [ ] 计件管理
- [ ] 仓库管理
- [ ] 用户管理

### 第四阶段：部署
- [ ] 构建生产版本
- [ ] 配置 Nginx
- [ ] 部署到服务器
- [ ] 配置域名

## 目录结构
```
web-admin/
├── public/
├── src/
│   ├── assets/
│   ├── components/
│   │   ├── Layout/
│   │   ├── Sidebar/
│   │   └── Header/
│   ├── pages/
│   │   ├── Login/
│   │   ├── Dashboard/
│   │   ├── Drivers/
│   │   ├── Vehicles/
│   │   └── ...
│   ├── services/
│   │   ├── api.ts
│   │   └── supabase.ts
│   ├── hooks/
│   ├── types/
│   ├── utils/
│   ├── App.tsx
│   └── main.tsx
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

## 访问地址
- 开发环境：http://localhost:5173
- 生产环境：https://admin.appmiaoda.com/app-7cdqf07mbu9t
