# 车队管家前端

基于 UniApp (Vue 3 + TypeScript) 的车队管理系统前端。

## 技术栈

- **Vue 3** - UI 框架
- **UniApp** - 跨平台框架
- **TypeScript** - 类型安全
- **Pinia** - 状态管理
- **uni-ui** - UI 组件库
- **SCSS** - 样式预处理

## 快速开始

### 1. 安装依赖

```bash
npm install
# 或
pnpm install
```

### 2. 启动开发服务器

```bash
# H5 开发
npm run dev:h5

# 微信小程序开发
npm run dev:mp-weixin
```

### 3. 构建生产版本

```bash
# H5
npm run build:h5

# 微信小程序
npm run build:mp-weixin

# App
npm run build:app
```

## 项目结构

```
frontend/
├── src/
│   ├── pages/           # 页面组件（33个）
│   │   ├── login/       # 登录页
│   │   ├── index/       # 首页
│   │   ├── driver/      # 司机端页面
│   │   ├── manager/     # 车队长端页面
│   │   ├── boss/        # 老板端页面
│   │   ├── profile/     # 个人中心
│   │   └── notifications/ # 通知中心
│   ├── components/      # 公共组件
│   ├── api/             # API 请求封装
│   ├── store/           # Pinia 状态管理
│   ├── types/           # TypeScript 类型定义
│   ├── utils/           # 工具函数
│   ├── styles/          # 全局样式
│   ├── static/          # 静态资源
│   ├── App.vue          # 根组件
│   ├── main.ts          # 入口文件
│   ├── pages.json       # 页面配置
│   ├── manifest.json    # 应用配置
│   └── uni.scss         # 全局 SCSS 变量
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## 页面清单

### 公共页面（3个）
- 登录页
- 个人中心
- 通知中心

### 司机端（10个）
- 首页/仪表盘
- 打卡页
- 考勤记录
- 计件录入
- 计件记录
- 请假申请
- 请假记录
- 车辆列表
- 添加车辆
- 车辆详情

### 车队长端（8个）
- 首页/仪表盘
- 司机列表
- 司机详情
- 请假审批列表
- 请假审批详情
- 计件管理
- 统计报表
- 发送通知

### 老板端（12个）
- 首页/仪表盘
- 用户管理
- 用户详情
- 创建用户
- 仓库管理
- 仓库详情
- 车辆管理
- 车辆审核
- 请假审批
- 计件管理
- 统计报表
- 分类管理

## 环境变量

在项目根目录创建 `.env` 文件：

```env
# API 基础地址
VITE_API_BASE_URL=/api
```

## 开发说明

### API 请求

使用封装的请求方法：

```typescript
import { get, post, put, del } from '@/api/request'

// GET 请求
const users = await get('/users')

// POST 请求
const result = await post('/users', { name: '张三' })
```

### 状态管理

使用 Pinia Store：

```typescript
import { useUserStore } from '@/store/user'

const userStore = useUserStore()

// 登录
await userStore.login(username, password)

// 获取用户信息
console.log(userStore.userName)
```

### 样式

使用全局 SCSS 变量：

```scss
.my-button {
  background-color: $primary-color;
  padding: $spacing-md;
  border-radius: $radius-md;
}
```

## 注意事项

1. 静态资源（图片）需要替换为实际的图标文件
2. 开发时需要启动后端服务（端口 8000）
3. 微信小程序需要在微信开发者工具中导入项目
