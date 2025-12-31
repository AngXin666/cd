---
inclusion: always
---

# 项目上下文信息

## 项目概述

这是一个基于 UniApp + Vue3 + FastAPI 的车队管理系统。

> **主项目目录**：`fleet-manager/`

## 技术栈

### 前端框架
- **UniApp**：多端统一开发框架（支持 H5、微信小程序）
- **Vue 3**：UI 框架
- **TypeScript**：类型安全的 JavaScript 超集
- **Pinia**：状态管理

### 后端框架
- **FastAPI**：Python 高性能 Web 框架
- **SQLModel**：ORM 框架
- **SQLite**：开发环境数据库
- **PostgreSQL**：生产环境数据库

### 认证
- **JWT Token**：用户认证

### 实时通信
- **SSE (Server-Sent Events)**：实时通知

### 样式
- **SCSS**：CSS 预处理器
- **Tailwind CSS**：实用优先的 CSS 框架

### 构建与工具
- **Vite**：构建工具
- **Docker**：容器化部署

## 项目结构

```
.
├── fleet-manager/          # 主项目目录
│   ├── backend/            # FastAPI 后端
│   │   ├── main.py         # 应用入口 + 路由
│   │   ├── models.py       # 数据库模型
│   │   ├── schemas.py      # 请求/响应模型
│   │   ├── auth.py         # JWT 认证
│   │   ├── database.py     # 数据库连接
│   │   ├── crud.py         # CRUD 操作
│   │   ├── config.py       # 配置管理
│   │   └── routers/        # API 路由模块
│   ├── frontend/           # UniApp + Vue3 前端
│   │   ├── src/
│   │   │   ├── pages/      # 页面组件
│   │   │   ├── components/ # 公共组件
│   │   │   ├── api/        # API 请求
│   │   │   ├── store/      # Pinia 状态管理
│   │   │   └── utils/      # 工具函数
│   │   └── nginx.conf      # Nginx 配置
│   ├── nginx/              # Nginx 配置（生产环境）
│   ├── scripts/            # 部署脚本
│   ├── docs/               # 项目文档
│   ├── docker-compose.yml  # Docker 基础配置
│   └── docker-compose.prod.yml # Docker 生产环境配置
├── .kiro/                  # Kiro 配置和规范
│   ├── specs/              # 功能规范
│   └── steering/           # 编码规范
└── README.md               # 项目说明
```

## 核心功能模块

### 认证系统
- 使用 JWT Token 进行认证
- 后端 `auth.py` 处理认证逻辑
- 前端使用 Pinia store 管理用户状态

### 角色系统
- **老板 (boss)**：系统最高权限，全局管理、用户管理、仓库管理
- **调度 (dispatcher)**：协助管理
- **车队长 (manager)**：司机管理、审批、统计
- **司机 (driver)**：打卡、计件、请假、车辆管理

### 核心功能
- ✅ 用户认证（JWT）
- ✅ 考勤打卡
- ✅ 计件录入
- ✅ 请假审批
- ✅ 车辆管理
- ✅ 车辆租赁管理
- ✅ 补录照片功能
- ✅ 实时通知（SSE）
- ✅ 通知模板管理
- ✅ 定时通知功能
- ✅ 统计报表
- ✅ OCR 驾驶证识别
- ✅ 热更新版本管理

## 重要约定

### 环境配置
- 环境变量模板：`fleet-manager/.env.template`
- 后端环境变量：`fleet-manager/backend/.env`
- 前端环境变量：`fleet-manager/frontend/.env`

### 数据库
- 开发环境使用 SQLite
- 生产环境使用 PostgreSQL
- 使用 SQLModel 进行 ORM 操作

## 部署流程

### Docker 一键部署（推荐）

```bash
cd fleet-manager

# 配置环境变量
cp .env.template .env

# 启动所有服务
docker-compose up -d
```

服务地址：
- 前端：http://localhost
- 后端 API：http://localhost:8000
- API 文档：http://localhost:8000/docs

### 本地开发

#### 启动后端
```bash
cd fleet-manager/backend
python -m venv venv
venv\Scripts\activate  # Windows
source venv/bin/activate  # Linux/Mac
pip install -r requirements.txt
python main.py
```

#### 启动前端
```bash
cd fleet-manager/frontend
npm install
npm run dev:h5
```

## 开发工作流

### 启动开发服务器
```bash
# 后端（在 fleet-manager/backend 目录）
python main.py

# 前端 H5 开发（在 fleet-manager/frontend 目录）
npm run dev:h5

# 前端微信小程序开发
npm run dev:mp-weixin
```

### API 文档
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 测试账号

| 角色 | 账号 | 密码 |
|------|------|------|
| 老板 | admin | admin123 |
| 调度 | dispatcher | dispatch123 |
| 车队长 | manager | manager123 |
| 司机 | driver | driver123 |

## 数据库约定

### 表命名
- 使用小写字母和下划线
- 复数形式（如 `users`, `vehicles`）

### 字段约定
- `id`：主键，整数自增
- `created_at`：创建时间
- `updated_at`：更新时间

## 注意事项

### 安全性
- 敏感信息存储在 .env 文件
- JWT_SECRET 必须设置强随机字符串
- 不要将 .env 文件提交到 git

### 兼容性
- 确保代码在 H5、微信小程序平台都能正常运行
- 使用 UniApp 提供的跨平台 API
- 注意不同平台的样式差异
