---
inclusion: always
---

# 项目上下文

## 技术栈

- **前端**: UniApp + Vue 3 + TypeScript + Pinia
- **后端**: FastAPI + SQLModel + SQLite/PostgreSQL
- **认证**: JWT Token
- **实时通信**: SSE

## 项目结构

```
fleet-manager/
├── backend/          # FastAPI 后端
│   ├── main.py       # 应用入口
│   ├── models.py     # 数据库模型
│   ├── schemas.py    # 请求/响应模型
│   ├── auth.py       # JWT 认证
│   └── routers/      # API 路由
├── frontend/         # UniApp 前端
│   └── src/
│       ├── pages/    # 页面组件
│       ├── api/      # API 请求
│       └── store/    # Pinia 状态
└── docker-compose.yml
```

## 角色系统

- **老板 (boss)**: 全局管理
- **调度 (dispatcher)**: 协助管理
- **车队长 (manager)**: 司机管理
- **司机 (driver)**: 打卡、计件

## 测试账号

| 角色 | 账号 | 密码 |
|------|------|------|
| 老板 | admin | admin123 |
| 车队长 | manager | manager123 |
| 司机 | driver | driver123 |

## 开发命令

```bash
# 后端
cd fleet-manager/backend
python main.py

# 前端 H5
cd fleet-manager/frontend
npm run dev:h5
npm run build:h5
```
