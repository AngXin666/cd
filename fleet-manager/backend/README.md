# 车队管家后端 API

基于 FastAPI 构建的车队管理系统后端服务。

## 技术栈

- **Python 3.11+**
- **FastAPI** - 现代高性能 Web 框架
- **SQLModel** - ORM（SQLAlchemy + Pydantic）
- **SQLite** - 开发环境数据库
- **JWT** - 身份认证

## 快速开始

### 1. 安装依赖

```bash
# 创建虚拟环境
python -m venv venv

# 激活虚拟环境
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt
```

### 2. 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，修改配置
```

### 3. 启动服务

```bash
# 开发模式（支持热重载）
python main.py

# 或使用 uvicorn
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 4. 访问 API 文档

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 默认账号

系统启动时会自动创建以下默认账号：

| 用户名 | 密码 | 角色 | 说明 |
|--------|------|------|------|
| `superadmin` | `super123` | 超级管理员 | 系统最高权限 |
| `admin` | `admin123` | 老板 | 全局管理权限 |
| `dispatcher` | `dispatch123` | 调度 | 协助管理权限 |

## API 模块

| 模块 | 路径前缀 | 说明 |
|------|----------|------|
| 认证 | `/api/auth` | 登录、获取用户信息、修改密码 |
| 用户 | `/api/users` | 用户管理（管理员权限） |
| 仓库 | `/api/warehouses` | 仓库管理 |
| 考勤 | `/api/attendance` | 打卡、考勤记录 |
| 计件 | `/api/piece-work` | 计件分类、计件记录、统计 |
| 请假 | `/api/leave` | 请假申请、审批 |
| 车辆 | `/api/vehicles` | 车辆管理、证件上传 |
| 图片上传 | `/api/upload` | 图片文件上传 |
| 通知 | `/api/notifications` | 通知发送、已读标记 |
| 系统管理 | `/api/admin` | 系统信息、角色管理（超级管理员） |

## 图片上传 API

### 上传图片

```
POST /api/upload/image
```

**请求参数：**
- `file` (必需): 图片文件（multipart/form-data）
- `category` (可选): 图片分类，默认 "vehicle"，可选值：vehicle/document/other

**支持的图片格式：** jpg, jpeg, png, webp

**文件大小限制：** 最大 10MB

**响应示例：**
```json
{
  "success": true,
  "url": "/uploads/images/vehicle/20241224120000_abc123def456.jpg",
  "filename": "20241224120000_abc123def456.jpg",
  "size": 102400
}
```

### 访问上传的图片

上传成功后，可以通过返回的 URL 直接访问图片：

```
GET /uploads/images/{category}/{filename}
```

例如：`http://localhost:8000/uploads/images/vehicle/20241224120000_abc123def456.jpg`

## 角色权限

| 角色 | 值 | 说明 | 权限 |
|------|-----|------|------|
| SUPER_ADMIN | `super_admin` | 超级管理员 | 系统最高权限，可管理所有功能和用户 |
| BOSS | `boss` | 老板 | 全局管理、用户管理、仓库管理 |
| PEER_ADMIN | `peer_admin` | 调度 | 协助管理，拥有与老板类似的管理权限 |
| MANAGER | `manager` | 车队长 | 司机管理、审批、统计查看 |
| DRIVER | `driver` | 司机 | 打卡、计件、请假、车辆管理 |

### 权限层级

```
SUPER_ADMIN (超级管理员)
    ├── 可管理所有角色
    ├── 可创建 BOSS、PEER_ADMIN、MANAGER、DRIVER
    └── 可重置任何用户密码

BOSS (老板)
    ├── 可管理 PEER_ADMIN、MANAGER、DRIVER
    └── 可创建 PEER_ADMIN、MANAGER、DRIVER

PEER_ADMIN (调度)
    ├── 可管理 MANAGER、DRIVER
    └── 可创建 MANAGER、DRIVER

MANAGER (车队长)
    ├── 可管理 DRIVER
    └── 可创建 DRIVER

DRIVER (司机)
    └── 无管理权限
```

## Docker 部署

```bash
# 构建并启动
docker-compose up -d

# 查看日志
docker-compose logs -f backend

# 停止服务
docker-compose down
```

## 项目结构

```
backend/
├── main.py          # 应用入口 + API 路由
├── models.py        # 数据库模型（10个表）
├── schemas.py       # 请求/响应模型
├── auth.py          # JWT 认证
├── crud.py          # CRUD 操作
├── database.py      # 数据库连接
├── config.py        # 配置管理
├── requirements.txt # Python 依赖
├── Dockerfile       # Docker 构建
├── .env             # 环境变量
└── README.md        # 本文档
```

## 数据库表

1. `users` - 用户表
2. `warehouses` - 仓库表
3. `warehouse_assignments` - 用户-仓库关联
4. `attendance` - 考勤记录
5. `piece_work_categories` - 计件分类
6. `piece_work_records` - 计件记录
7. `leave_applications` - 请假申请
8. `vehicles` - 车辆信息
9. `vehicle_documents` - 车辆证件
10. `notifications` - 通知消息
