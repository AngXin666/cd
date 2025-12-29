# 车队管家 - Fleet Manager

基于 UniApp + Vue3 + FastAPI 的新一代车队管理系统。

## �  项目结构

```
.
├── fleet-manager/          # 主项目目录
│   ├── frontend/           # UniApp + Vue3 前端
│   ├── backend/            # FastAPI 后端
│   └── docs/               # 项目文档
├── .kiro/                  # Kiro 配置和规范
│   ├── specs/              # 功能规范
│   └── steering/           # 编码规范
└── scripts/                # 构建和部署脚本
```

## 🚀 快速开始

### 后端启动

```bash
cd fleet-manager/backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
python main.py
# 访问 http://localhost:8000/docs 查看 API 文档
```

### 前端启动

```bash
cd fleet-manager/frontend
npm install
npm run dev:h5      # H5 开发模式
npm run dev:mp-weixin  # 微信小程序开发模式
```

### 测试账号

| 角色 | 账号 | 密码 |
|------|------|------|
| 超级管理员 | superadmin | super123 |
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

### 车队长端
- ✅ 司机管理
- ✅ 请假审批
- ✅ 数据汇总
- ✅ 仓库管理
- ✅ 通知管理

### 老板端
- ✅ 用户管理
- ✅ 仓库管理
- ✅ 车辆审核
- ✅ 权限配置
- ✅ 员工管理
- ✅ 全局统计

## 🏗️ 技术栈

### 前端
- **框架**: UniApp + Vue 3
- **语言**: TypeScript
- **状态管理**: Pinia
- **样式**: SCSS + Tailwind CSS
- **构建**: Vite

### 后端
- **框架**: FastAPI
- **语言**: Python 3.11+
- **数据库**: SQLite (开发) / PostgreSQL (生产)
- **认证**: JWT

## 📝 编码规范

详见 [.kiro/steering/SUMMARY.md](.kiro/steering/SUMMARY.md)

**强制规则**：
1. 所有代码必须有完整注释
2. 文档必须实时同步更新
3. 所有对话输出必须使用中文

## 📄 许可证

本项目为内部使用项目，所有权利保留。

---

**最后更新**: 2025-12-25
