# 车队管家小程序

一款专为车队管理打造的多端应用（微信小程序 / H5 / Android APP），提供多角色权限管理，包含司机端、车队长端和老板端三个不同界面，满足车队运营的分层管理需求。

## 📚 项目文档

**完整文档请查看**: [文档中心](./docs/README.md)

**快速链接**:
- [📖 项目 Wiki](./WIKI.md) - 完整技术文档
- [🚀 脚本工具](./scripts/README.md) - 部署、开发、编码工具
- [📝 编码规范](./.kiro/steering/SUMMARY.md) - 开发规范和强制要求
- [🔧 Windows 编码配置](./docs/开发指南/开发指南/编码配置快速开始.md) - 避免中文乱码

---

## 🚀 快速开始

### 开发环境启动

```bash
# 微信小程序开发模式
pnpm run dev:weapp
# 使用微信开发者工具打开 dist/weapp 目录

# H5 开发模式（浏览器预览）
pnpm run dev:h5
# 访问 http://localhost:10086/

# 安卓APP开发模式
pnpm run dev:android
# 自动构建H5、同步到安卓项目并运行

# 生产构建
pnpm run build:weapp   # 小程序构建
pnpm run build:h5      # H5 构建
pnpm run build:android # 安卓APP构建（Debug）

# 代码检查
pnpm run lint
pnpm run type-check    # TypeScript类型检查
```

### ⚡ Windows 编码配置（重要！）

**如果你在 Windows 系统上开发，请先配置编码设置，避免中文乱码问题：**

```powershell
# 一键配置（推荐）
powershell scripts/setup-encoding.ps1
```

配置完成后：
1. 重启 VSCode
2. 重启 PowerShell
3. 验证配置：运行 `chcp`，应该显示 `65001`

**详细说明**: [编码配置快速开始](./docs/开发指南/开发指南/编码配置快速开始.md)

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

### 角色定义

| 角色 | 代码 | 说明 |
|------|------|------|
| 老板 | BOSS | 系统最高权限，可管理所有数据 |
| 调度 | PEER_ADMIN | 由老板授权，根据权限等级管理系统 |
| 车队长 | MANAGER | 管理被分配的仓库及其司机 |
| 司机 | DRIVER | 只能查看和管理自己的数据 |

### 权限等级

**调度权限分配：老板给调度分配权限等级**

调度 (PEER_ADMIN) 由老板创建并授权，可设置两种权限等级：

| 权限等级 | 代码 | 说明 |
|----------|------|------|
| 完整控制 | full_control | 与老板相同的权限，可增、删、改、查所有数据 |
| 仅查看 | view_only | 只能查看所有数据，不能修改 |

**车队长权限分配：老板或调度（完整控制）为车队长分配仓库+权限等级**

车队长 (MANAGER) 必须被分配仓库才有管辖权，每个仓库可设置不同权限等级：

| 权限等级 | 代码 | 说明 |
|----------|------|------|
| 完整控制 | full_control | 可增、删、改、查被分配仓库内的数据 |
| 仅查看 | view_only | 只能查看被分配仓库内的数据，不能修改 |

---

## 📁 项目结构

```
src/
├── app.config.ts          # Taro 应用配置
├── app.ts                 # 应用入口
├── components/            # 通用组件
├── contexts/              # React 上下文
│   ├── AuthContext.tsx   # 认证上下文
│   └── UserContext.tsx   # 用户上下文
├── db/                    # 数据库 API
│   ├── api/              # 业务 API 模块
│   └── types.ts          # 类型定义
├── hooks/                 # 自定义 Hooks
├── pages/                 # 页面组件
│   ├── driver/           # 司机端页面
│   ├── manager/          # 车队长端页面
│   ├── super-admin/      # 老板端页面
│   └── common/           # 通用页面
├── services/              # 业务服务
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

**强制规则**：
1. **所有代码必须有完整注释** - 函数、文件、复杂逻辑都必须注释
2. **文档必须实时同步更新** - 代码变更时立即更新文档

详见：[编码规范](./.kiro/steering/SUMMARY.md)

---

## 🚀 部署指南

### H5 热更新部署

```bash
# 方式 1：使用 bat 脚本（推荐，避免编码问题）
scripts\deploy.bat "更新说明"

# 方式 2：手动执行
pnpm taro build --type h5
node scripts/quick-deploy-h5.js "更新说明"
```

### 版本回滚

```bash
node scripts/rollback-version.js 1.3.6
```

### APK 构建

```bash
# 完整构建流程
pnpm taro build --type h5
npx cap sync android
cd android
.\gradlew assembleDebug

# APK 输出位置
# android\app\build\outputs\apk\debug\app-debug.apk
```

详见：[部署指南](./docs/开发指南/部署指南/)

---

## 📚 相关文档

### 核心文档
- [📖 项目 Wiki](./WIKI.md) - 完整技术文档
- [📝 编码规范](./.kiro/steering/SUMMARY.md) - 开发规范和强制要求
- [🚀 脚本工具](./scripts/README.md) - 部署、开发、编码工具

### 开发指南
- [新页面开发规范](./docs/开发指南/新页面开发规范.md)
- [编码配置快速开始](./docs/开发指南/开发指南/编码配置快速开始.md)
- [APK构建指南](./docs/开发指南/构建指南/APK构建指南.md)
- [H5热更新指南](./docs/开发指南/部署指南/h5-hot-update-guide.md)

### 功能文档
- [权限系统文档](./docs/功能文档/权限系统/)
- [核心系统文档](./docs/功能文档/核心系统/)
- [模块详情](./docs/功能文档/模块详情/)

### 技术文档
- [平台优化文档](./docs/技术文档/平台优化/)
- [架构设计文档](./docs/技术文档/架构设计/)

---

## 🎯 最近更新

### 2025-12-15 - 脚本清理和文档整理 🧹
- ✅ **删除 95 个不需要的脚本**（从 128 个减少到 15 个）
- ✅ **更新脚本文档**（scripts/README.md）
- ✅ **删除过时文档**（内存泄漏调试、旧部署文档）
- ✅ **优化文档结构**
- ✅ **部署版本 1.3.6**

### 2025-12-14 - 统一热更新系统重构 🔄
- ✅ 完成统一热更新系统重构
- ✅ 移除旧的无效热更新代码
- ✅ 实现平台自适应更新策略（小程序/Android/H5）
- ✅ 完善测试文档和平台测试指南

### 2025-12-14 - 文档整理和归档 📚
- ✅ 完成项目文档全面整理
- ✅ 删除 7 个旧版本APK，只保留最新版本
- ✅ 创建 `archive/` 归档目录
- ✅ 建立强制规则：所有代码必须有注释，文档必须实时同步

### 2025-12-12 - 平台优化重大更新 🎉
- ✅ 完成微信小程序和安卓APP全面优化
- ✅ 实现小程序分包加载（主包体积减少60%）
- ✅ API导入优化（内存占用减少90%）

---

## 🌐 在线访问

- **H5版本**: https://app.appmiaoda.com/app-7cdqf07mbu9t/
- **管理后台**: https://app.appmiaoda.com/app-7cdqf07mbu9t/#/pages/web-admin/index

---

## 📄 许可证

本项目为内部使用项目，所有权利保留。

---

**维护团队**: 车队管家开发团队  
**最后更新**: 2025-12-15
