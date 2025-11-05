# 车队管家小程序

一款专为车队管理打造的微信小程序，提供多角色权限管理，包含司机端、普通管理端和超级管理端三个不同界面，满足车队运营的分层管理需求。

---

## 功能特性

### 多角色权限管理
- **司机端**：个人工作台、基础信息展示、今日统计
- **普通管理端**：管理员工作台、司机管理、基础管理功能
- **超级管理端**：超级管理员控制台、系统管理、用户权限管理

### 用户认证系统
- 基于 Supabase Auth 的登录认证
- 首位注册用户自动成为超级管理员
- 支持手机号和邮箱登录

### 权限控制
- 超级管理员：拥有所有权限，可管理所有用户和修改任何角色
- 普通管理员：可查看所有用户，可修改司机角色
- 司机：只能查看和修改自己的信息

---

## 页面路由

| 路由 | 页面名称 | 说明 |
|------|---------|------|
| `/pages/login/index` | 登录页 | 用户登录入口 |
| `/pages/driver/index` | 司机工作台 | 司机端主页（tabBar） |
| `/pages/manager/index` | 管理员工作台 | 普通管理端主页（tabBar） |
| `/pages/super-admin/index` | 超级管理员控制台 | 超级管理端主页（tabBar） |
| `/pages/profile/index` | 个人中心 | 用户个人信息管理（tabBar） |
| `/pages/admin-dashboard/index` | 用户管理 | 超级管理员用户管理页面 |

---

## 技术栈

- **前端框架**：Taro + React + TypeScript
- **样式方案**：Tailwind CSS
- **后端服务**：Supabase（数据库 + 认证）
- **状态管理**：React Hooks
- **包管理器**：pnpm

---

## 项目结构

```
├── src/
│   ├── app.config.ts               # Taro应用配置，定义路由和tabBar
│   ├── app.tsx                     # 应用入口，配置AuthProvider
│   ├── app.scss
│   ├── assets/
│   │   └── images/                 # 图片资源
│   │       ├── selected/           # tabBar选中态图标
│   │       └── unselected/         # tabBar未选中态图标
│   ├── client/
│   │   └── supabase.ts             # Supabase客户端配置
│   ├── db/                         # 数据库操作
│   │   ├── api.ts                  # 数据库API封装
│   │   └── types.ts                # 数据库类型定义
│   ├── pages/                      # 页面目录
│   │   ├── login/                  # 登录页
│   │   ├── driver/                 # 司机工作台
│   │   ├── manager/                # 管理员工作台
│   │   ├── super-admin/            # 超级管理员控制台
│   │   ├── profile/                # 个人中心
│   │   └── admin-dashboard/        # 用户管理
│   └── types/                      # TypeScript类型定义
└── supabase/
    └── migrations/                 # 数据库迁移文件
        └── 01_create_profiles_table.sql
```

---

## 数据库设计

### profiles 表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键，用户ID |
| phone | text | 手机号（唯一） |
| email | text | 邮箱（唯一） |
| name | text | 用户姓名 |
| role | user_role | 用户角色（driver/manager/super_admin） |
| created_at | timestamptz | 创建时间 |
| updated_at | timestamptz | 更新时间 |

---

## 安装和运行

```bash
# 安装依赖
pnpm install

# 代码检查
pnpm run lint

# 开发环境运行（微信小程序）
pnpm run dev:weapp

# 开发环境运行（H5）
pnpm run dev:h5

# 构建生产版本
pnpm run build:weapp
pnpm run build:h5
```

---

## 设计风格

- **主色调**：深蓝色 (#1E3A8A)
- **辅助色**：橙色 (#F97316)
- **背景色**：浅灰色 (#F8FAFC)
- **圆角**：8px
- **布局**：卡片式布局，轻微阴影效果
- **图标**：Material Design Icons (mdi)

---

## 环境变量

在 `.env` 文件中配置以下变量：

```
TARO_APP_SUPABASE_URL=your_supabase_url
TARO_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
TARO_APP_NAME=车队管家
TARO_APP_APP_ID=app-7cdqf07mbu9t
```
