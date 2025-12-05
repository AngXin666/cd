# 车队管家小程序

一款专为车队管理打造的微信小程序，提供多角色权限管理，包含司机端、车队长端和老板端三个不同界面，满足车队运营的分层管理需求。

---

## 🚀 快速开始

### 开发环境启动

```bash
# H5 开发模式（浏览器预览）
pnpm run dev:h5
# 访问 http://localhost:10086/

# 小程序开发模式
pnpm run dev:weapp
# 使用微信开发者工具打开 dist/weapp 目录

# 生产构建
pnpm run build:h5      # H5 构建
pnpm run build:weapp   # 小程序构建

# 代码检查
pnpm run lint
```

### 测试账号

**统一密码**: `123456`

| 角色 | 账号 | 手机号 | 说明 |
|------|------|--------|------|
| 老板 | boss | 13800000001 | 最高权限 |
| 调度 | dispatcher | 13800000002 | 调度管理 |
| 车队长 | manager | 13800000003 | 车队管理 |
| 司机 | driver | 13800000004 | 司机端 |

---

## 📱 功能特性

### 司机端功能
- ✅ 每日打卡上下班
- ✅ 计件工作录入
- ✅ 请假申请（病假、事假等）
- ✅ 离职申请
- ✅ 车辆信息管理
- ✅ 通知中心
- ✅ 个人信息管理

### 车队长端功能
- ✅ 司机管理（查看、分配仓库）
- ✅ 请假审批
- ✅ 司机考勤统计
- ✅ 司机计件统计
- ✅ 仓库管理
- ✅ 通知管理

### 老板端功能
- ✅ 用户管理（司机、车队长、调度）
- ✅ 司机类型切换（纯司机/带车司机）
- ✅ 请假/离职审批
- ✅ 全局数据统计
- ✅ 仓库管理
- ✅ 车辆管理
- ✅ 权限管理

---

## 🏗️ 技术栈

- **前端框架**: Taro 3.x (React)
- **UI 框架**: Tailwind CSS
- **状态管理**: Zustand
- **后端服务**: Supabase
  - 认证系统
  - PostgreSQL 数据库
  - Row Level Security (RLS)
  - 实时订阅
- **开发工具**: TypeScript, ESLint, Biome

---

## 📊 数据库架构

### 核心表结构 (10表架构)

#### 用户相关 (2表)
- **users** - 用户基本信息
- **user_roles** - 用户角色关联

#### 业务核心 (8表)
- **warehouses** - 仓库信息
- **warehouse_assignments** - 仓库分配
- **vehicles** - 车辆信息
- **attendance** - 考勤记录
- **piece_work_records** - 计件记录
- **leave_applications** - 请假申请
- **resignation_applications** - 离职申请
- **notifications** - 通知消息

### 权限系统

使用 PostgreSQL RLS (Row Level Security) 实现数据隔离:
- 司机只能访问自己的数据
- 车队长可访问所属仓库的司机数据
- 老板可访问所有数据

---

## 🔐 角色权限

| 角色 | 代码 | 权限范围 |
|------|------|----------|
| 老板 | BOSS | 全部权限 |
| 调度 | DISPATCHER | 用户管理、通知管理 |
| 车队长 | MANAGER | 司机管理、考勤审批 |
| 司机 | DRIVER | 个人数据管理 |

---

## 📁 项目结构

```
src/
├── app.config.ts          # Taro 应用配置
├── app.ts                 # 应用入口
├── client/                # 客户端配置
│   └── supabase.ts       # Supabase 客户端
├── components/            # 通用组件
├── contexts/              # React 上下文
│   ├── AuthContext.tsx   # 认证上下文
│   └── UserContext.tsx   # 用户上下文
├── db/                    # 数据库 API
│   ├── api.ts            # 业务 API
│   ├── types.ts          # 类型定义
│   └── notificationApi.ts # 通知 API
├── hooks/                 # 自定义 Hooks
├── pages/                 # 页面组件
│   ├── driver/           # 司机端页面
│   ├── manager/          # 车队长端页面
│   ├── super-admin/      # 老板端页面
│   └── common/           # 通用页面
├── services/              # 业务服务
│   └── notificationService.ts
├── store/                 # Zustand 状态管理
└── utils/                 # 工具函数
```

---

## 🔧 开发指南

### 环境要求
- Node.js >= 16
- pnpm >= 8
- 微信开发者工具 (小程序开发)

### 本地开发

1. **安装依赖**
   ```bash
   pnpm install
   ```

2. **配置环境变量**
   ```bash
   cp .env.template .env
   # 编辑 .env 填入 Supabase 配置
   ```

3. **启动开发服务器**
   ```bash
   # H5 模式
   pnpm run dev:h5
   
   # 小程序模式
   pnpm run dev:weapp
   ```

### 代码规范

```bash
# 代码检查
pnpm run lint

# 类型检查
pnpm run type-check
```

---

## 📚 相关文档

### 功能使用指南 (docs/)
- [仓库管理功能使用指南](./仓库管理功能使用指南.md)
- [考勤管理功能使用指南](./考勤管理功能使用指南.md)
- [打卡功能使用指南](./打卡功能使用指南.md)
- [请假和离职管理功能使用指南](./请假和离职管理功能使用指南.md)
- [车辆管理和通知系统功能使用指南](./车辆管理和通知系统功能使用指南.md)

### 快速参考
- [仓库管理快速参考](./仓库管理快速参考.md)

---

## 🎯 最近更新

### 2025-12-05
- ✅ 清理项目文档，删除过时的修复记录和临时文件
- ✅ 精简 README 为核心文档
- ✅ 保留功能使用指南供日常参考

### 2025-12-03
- ✅ 完成权限系统优化（5表RBAC→单字段role）
- ✅ 修复考勤打卡重复记录问题
- ✅ 完成NULL字段处理和文档更新
- ✅ 数据库优化：27表→10表 (优化率63%)

### 2025-12-01
- ✅ 修复司机类型切换标签不更新问题
- ✅ 增强管理端统计系统实时更新功能
- ✅ 修复离职申请审批UUID错误
- ✅ 修复通知服务角色查询错误

---

## 🌐 在线访问

- **H5版本**: https://app.appmiaoda.com/app-7cdqf07mbu9t/
- **管理后台**: https://app.appmiaoda.com/app-7cdqf07mbu9t/#/pages/web-admin/index

---

## 📄 许可证

本项目为内部使用项目，所有权利保留。

---

**维护团队**: 车队管家开发团队  
**最后更新**: 2025-12-05
