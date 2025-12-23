# 车队管家 (Fleet Manager)

基于 FastAPI + UniApp 的车队管理系统。

> **版本**: v1.0.0  
> **更新日期**: 2024-12-23  
> **状态**: ✅ 生产就绪

## 项目概述

将原有 Taro + Supabase 架构重构为更简洁的 FastAPI + UniApp 架构。新框架已实现 100% 的核心功能，可完全替代主项目。

### 技术栈

| 层级 | 技术 |
|------|------|
| 后端 | Python FastAPI + SQLModel |
| 前端 | UniApp (Vue 3 + TypeScript) |
| 数据库 | SQLite（开发）/ PostgreSQL（生产） |
| 认证 | JWT Token |
| 实时通知 | SSE (Server-Sent Events) |
| 部署 | Docker |

### 代码量对比

| 指标 | 原项目 | 新项目 | 减少比例 |
|------|--------|--------|---------|
| 后端文件数 | 644+ | ~10 | 98% |
| 前端页面数 | 60+ | 35 | 42% |
| 代码行数 | 50000+ | ~8000 | 84% |

### 功能完成度

| 类别 | 完成率 |
|------|--------|
| 核心功能 | 100% |
| 扩展功能 | 100% |
| API 接口 | 100% |
| 前端页面 | 100% |

## 快速开始

### 方式 1：Docker 一键部署（推荐）

```bash
# 克隆项目
cd fleet-manager

# 配置环境变量
cp .env.template .env
# 编辑 .env 设置 JWT_SECRET 等配置

# 启动所有服务
docker-compose up -d

# 或使用部署脚本
./scripts/deploy.sh dev      # Linux/Mac
.\scripts\deploy.ps1 dev     # Windows
```

服务地址：
- 前端：http://localhost
- 后端 API：http://localhost:8000
- API 文档：http://localhost:8000/docs
- 数据库：localhost:5432

### 方式 2：本地开发

#### 启动后端

```bash
cd backend

# 创建虚拟环境
python -m venv venv
.\venv\Scripts\activate  # Windows
source venv/bin/activate  # Linux/Mac

# 安装依赖
pip install -r requirements.txt

# 配置环境变量
cp .env.template .env
# 编辑 .env 设置 JWT_SECRET

# 启动服务
python main.py
```

后端 API 文档：http://localhost:8000/docs

#### 启动前端

```bash
cd frontend

# 安装依赖
npm install

# 启动 H5 开发服务器
npm run dev:h5
```

前端访问：http://localhost:5173

## 部署指南

### 开发环境部署

```bash
# 使用 Docker Compose
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

### 生产环境部署

#### 1. 配置环境变量

```bash
cp .env.template .env
# 编辑 .env 文件，设置以下必要配置：
# - JWT_SECRET: 使用强随机字符串
# - POSTGRES_PASSWORD: 数据库密码
# - BAIDU_OCR_*: OCR 配置（可选）
```

#### 2. 配置 SSL 证书

```bash
# 将 SSL 证书放入 nginx/ssl/ 目录
# - fullchain.pem: 完整证书链
# - privkey.pem: 私钥

# 使用 Let's Encrypt 获取免费证书
certbot certonly --standalone -d your-domain.com
cp /etc/letsencrypt/live/your-domain.com/fullchain.pem nginx/ssl/
cp /etc/letsencrypt/live/your-domain.com/privkey.pem nginx/ssl/
```

#### 3. 启动生产环境

```bash
# 使用部署脚本
./scripts/deploy.sh prod      # Linux/Mac
.\scripts\deploy.ps1 prod     # Windows

# 或手动启动
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### 部署脚本命令

| 命令 | 说明 |
|------|------|
| `deploy.sh dev` | 启动开发环境 |
| `deploy.sh prod` | 启动生产环境 |
| `deploy.sh stop` | 停止所有服务 |
| `deploy.sh restart` | 重启所有服务 |
| `deploy.sh logs [服务]` | 查看日志 |
| `deploy.sh cleanup` | 清理 Docker 资源 |

## 项目结构

```
fleet-manager/
├── backend/                # FastAPI 后端
│   ├── main.py            # 应用入口 + 路由
│   ├── models.py          # 数据库模型
│   ├── schemas.py         # 请求/响应模型
│   ├── auth.py            # JWT 认证
│   ├── database.py        # 数据库连接
│   ├── crud.py            # CRUD 操作
│   ├── config.py          # 配置管理
│   ├── ocr.py             # OCR 识别
│   ├── Dockerfile         # 后端 Docker 配置
│   └── requirements.txt   # Python 依赖
│
├── frontend/               # UniApp 前端
│   ├── src/
│   │   ├── pages/         # 页面组件（33个）
│   │   ├── components/    # 公共组件
│   │   ├── api/           # API 请求
│   │   ├── store/         # 状态管理
│   │   └── utils/         # 工具函数
│   ├── Dockerfile         # 前端 Docker 配置
│   └── nginx.conf         # Nginx 配置
│
├── nginx/                  # Nginx 配置（生产环境）
│   ├── nginx.prod.conf    # 生产环境 Nginx 配置
│   └── ssl/               # SSL 证书目录
│
├── scripts/                # 部署脚本
│   ├── deploy.sh          # Linux/Mac 部署脚本
│   └── deploy.ps1         # Windows 部署脚本
│
├── docker-compose.yml      # Docker 基础配置
├── docker-compose.prod.yml # Docker 生产环境配置
├── .env.template           # 环境变量模板
└── README.md              # 本文件
```

## 功能模块

### 角色权限

| 角色 | 功能 |
|------|------|
| 超级管理员 | 系统最高权限，管理所有功能 |
| 老板 | 全局管理、用户管理、仓库管理、版本管理 |
| 调度 | 协助管理，拥有与老板类似的管理权限 |
| 车队长 | 司机管理、审批、统计、发送通知 |
| 司机 | 打卡、计件、请假、车辆管理 |

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

## API 文档

启动后端后访问：
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 环境变量说明

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `POSTGRES_USER` | 数据库用户名 | fleet |
| `POSTGRES_PASSWORD` | 数据库密码 | fleet123 |
| `POSTGRES_DB` | 数据库名 | fleet_manager |
| `JWT_SECRET` | JWT 密钥 | 必须设置 |
| `JWT_EXPIRE_MINUTES` | JWT 过期时间（分钟） | 1440 |
| `DEBUG` | 调试模式 | false |
| `BAIDU_OCR_APP_ID` | 百度 OCR 应用 ID | 可选 |
| `BAIDU_OCR_API_KEY` | 百度 OCR API Key | 可选 |
| `BAIDU_OCR_SECRET_KEY` | 百度 OCR Secret Key | 可选 |

## 开发指南

详见各子目录的 README：
- [后端开发指南](./backend/README.md)
- [前端开发指南](./frontend/README.md)
- [功能对比报告](./docs/FEATURE-COMPARISON-REPORT.md)
- [迁移指南](./docs/MIGRATION-GUIDE.md)

## 测试指南

### 集成测试

运行后端 API 集成测试：

```bash
cd backend

# 确保后端服务已启动
python main.py &

# 运行集成测试
python test_integration.py
```

### Docker 部署测试

验证 Docker 部署是否正常：

```bash
# Linux/Mac
./scripts/test-docker-deployment.sh

# Windows
.\scripts\test-docker-deployment.ps1
```

测试脚本会：
1. 检查 Docker 和 Docker Compose 是否可用
2. 构建 Docker 镜像
3. 启动所有服务
4. 等待服务就绪
5. 测试健康检查 API
6. 测试 API 文档访问
7. 测试前端页面访问
8. 显示容器状态和日志

## 常见问题

### Q: 如何重置数据库？

```bash
# 停止服务
docker-compose down -v

# 重新启动（会创建新数据库）
docker-compose up -d
```

### Q: 如何查看日志？

```bash
# 查看所有服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f db
```

### Q: 如何更新部署？

```bash
# 拉取最新代码
git pull

# 重新构建并启动
docker-compose up -d --build
```

## License

MIT
