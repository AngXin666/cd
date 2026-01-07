# 车队管家 - Fleet Manager

基于 UniApp + Vue3 + FastAPI 的新一代车队管理系统。

> **版本**: v1.2.0  
> **更新日期**: 2026-01-07  
> **状态**: ✅ 生产就绪

## 📁 项目结构

```
.
├── fleet-manager/          # 主项目目录
│   ├── frontend/           # UniApp + Vue3 前端
│   ├── backend/            # FastAPI 后端
│   └── docs/               # 项目文档
├── docs/                   # 项目报告
├── .kiro/                  # Kiro 配置
│   └── steering/           # 编码规范
└── data/                   # 数据目录
```

## 🚀 快速开始

### 后端启动

```bash
cd fleet-manager/backend
python -m venv venv
source venv/bin/activate  # Mac/Linux
# venv\Scripts\activate   # Windows
pip install -r requirements.txt
python main.py
# 访问 http://localhost:8000/docs 查看 API 文档
```

### 前端启动

```bash
cd fleet-manager/frontend
npm install
npm run dev:h5           # H5 开发模式
npm run build:h5         # H5 构建
```

### Docker 部署

```bash
cd fleet-manager
docker-compose up -d
```

## 👤 测试账号

| 角色 | 账号 | 密码 |
|------|------|------|
| 老板 | boss | boss123 |
| 调度 | dispatcher | dispatch123 |
| 车队长 | manager | manager123 |
| 司机 | driver | driver123 |

## 📱 功能模块

### 司机端
- ✅ 打卡签到/签退
- ✅ 计件录入和记录
- ✅ 请假申请
- ✅ 车辆管理
- ✅ 仓库统计
- ✅ 通知中心
- ✅ 仓库无感切换

### 车队长端
- ✅ 司机管理
- ✅ 请假审批
- ✅ 数据汇总
- ✅ 仓库品类管理
- ✅ 通知管理
- ✅ 仓库无感切换

### 老板端
- ✅ 用户管理
- ✅ 仓库管理（支持自定义类型）
- ✅ 车辆审核
- ✅ 权限配置
- ✅ 全局统计
- ✅ 仓库无感切换

## 🎯 核心特性

### 仓库切换优化
系统实现了仓库切换的无感优化，通过数据预加载和缓存策略消除切换时的"加载中"闪动。

**特性**：
- 🚀 数据预加载 - 页面加载时自动预加载所有仓库数据
- 💾 智能缓存 - 5分钟缓存过期，后台静默更新
- ⚡ 无感切换 - 切换仓库时立即显示数据，无加载闪动
- 🔄 实时更新 - 支持 SSE 实时更新缓存数据
- 🛡️ 容错处理 - 单个仓库加载失败不影响其他仓库

**已集成页面**：
- 老板首页、车队长首页、司机首页
- 司机管理页面、用户管理页面

详细文档：`.kiro/specs/warehouse-switch-optimization/`

## 🏗️ 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | UniApp + Vue 3 + TypeScript + Pinia |
| 后端 | FastAPI + SQLModel + Python 3.11+ |
| 数据库 | SQLite (开发) / PostgreSQL (生产) |
| 认证 | JWT Token |
| 实时通信 | SSE (Server-Sent Events) |
| 部署 | Docker + Nginx |

## 📄 文档

- [项目报告](docs/PROJECT-REPORT.md)
- [更新日志](fleet-manager/CHANGELOG.md)
- [后端文档](fleet-manager/backend/README.md)
- [前端文档](fleet-manager/frontend/README.md)
- [迁移指南](fleet-manager/docs/MIGRATION-GUIDE.md)

## 📝 编码规范

详见 [.kiro/steering/](.kiro/steering/)

**强制规则**：
1. 所有代码必须有完整注释
2. 文档必须实时同步更新
3. 所有对话输出必须使用中文
4. 枚举值必须使用小写字符串

---

**最后更新**: 2026-01-07
