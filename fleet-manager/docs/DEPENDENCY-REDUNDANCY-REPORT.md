# 依赖冗余检查报告

> 生成时间: 2024-12-29
> 更新时间: 2024-12-29 (清理完成)
> 检查范围: `fleet-manager/backend/requirements.txt` 和 `fleet-manager/frontend/package.json`

## 📊 检查总结

| 检查项 | 后端 | 前端 |
|--------|------|------|
| 总依赖数 | 14 | 17 |
| 未使用的依赖 | 0 ✅ | 0 ✅ |
| 仅脚本使用的依赖 | 1 | 0 |
| 重复功能的依赖 | 0 | 0 |
| 可升级的依赖 | 待检查 | 待检查 |

## ✅ 已完成的清理

### 后端清理 (2024-12-29)
1. **移除 baidu-aip** - OCR 功能通过 httpx 直接调用百度 API，不需要 SDK
2. **添加依赖注释** - 为所有依赖添加用途说明

### 前端清理 (2024-12-29)
1. **移除 @uni-helper/uni-ui-types** - 项目未使用 uni-ui 组件库
2. **更新 tsconfig.json** - 移除对应的类型引用

---

## 🔴 后端依赖检查 (Python)

### 依赖列表分析

| 依赖包 | 版本 | 用途 | 使用状态 |
|--------|------|------|----------|
| fastapi | >=0.100.0 | Web 框架 | ✅ 核心使用 |
| uvicorn[standard] | >=0.23.0 | ASGI 服务器 | ✅ 核心使用 |
| sqlmodel | >=0.0.14 | ORM | ✅ 核心使用 |
| python-jose[cryptography] | >=3.3.0 | JWT 认证 | ✅ 核心使用 |
| passlib[bcrypt] | >=1.7.4 | 密码哈希 | ✅ 核心使用 |
| python-dotenv | >=1.0.0 | 环境变量 | ✅ 核心使用 |
| pydantic | >=2.0.0 | 数据验证 | ✅ 核心使用 |
| pydantic-settings | >=2.0.0 | 配置管理 | ✅ 核心使用 |
| python-multipart | >=0.0.6 | 文件上传 | ✅ 核心使用 |
| psycopg2-binary | >=2.9.0 | PostgreSQL 驱动 | ✅ 核心使用 |
| httpx | >=0.24.0 | HTTP 客户端 | ✅ 测试/OCR使用 |
| apscheduler | >=3.10.0 | 定时任务 | ✅ 核心使用 |
| supabase | >=2.0.0 | 数据迁移 | 🟡 仅脚本使用 |
| pytest | >=7.0.0 | 测试框架 | ✅ 测试使用 |
| hypothesis | >=6.0.0 | 属性测试 | ✅ 测试使用 |

### ~~未使用的依赖~~ (已清理)

#### ~~1. baidu-aip (OCR)~~ ✅ 已移除

**状态**: ✅ 已在 2024-12-29 移除

**原因**: OCR 功能通过 httpx 直接调用百度 API，不需要 SDK

### 仅脚本使用的依赖

#### 1. supabase

**状态**: 🟡 仅在迁移脚本中使用

**使用位置**:
- `scripts/export_supabase_data.py`
- `scripts/migrate_data.py`

**分析**:
- 用于从 Supabase 迁移数据到本地 PostgreSQL
- 迁移完成后可能不再需要

**建议**:
- 如果迁移已完成，可以移除
- 如果需要保留迁移能力，保持现状

---

## 🔵 前端依赖检查 (npm)

### 生产依赖分析

| 依赖包 | 版本 | 用途 | 使用状态 |
|--------|------|------|----------|
| @dcloudio/uni-app | 3.0.0-* | UniApp 核心 | ✅ 核心使用 |
| @dcloudio/uni-components | 3.0.0-* | UniApp 组件 | ✅ 核心使用 |
| @dcloudio/uni-h5 | 3.0.0-* | H5 平台支持 | ✅ 核心使用 |
| @dcloudio/uni-mp-weixin | 3.0.0-* | 微信小程序支持 | ✅ 核心使用 |
| @dcloudio/uni-app-plus | 3.0.0-* | App 平台支持 | ✅ 核心使用 |
| vue | ^3.4.21 | Vue 框架 | ✅ 核心使用 |
| pinia | ^2.1.7 | 状态管理 | ✅ 核心使用 |

### ~~未使用的依赖~~ (已清理)

#### ~~1. @uni-helper/uni-ui-types~~ ✅ 已移除

**状态**: ✅ 已在 2024-12-29 移除

**原因**: 项目未使用 uni-ui 组件库，不需要其类型定义

### 开发依赖分析

| 依赖包 | 版本 | 用途 | 使用状态 |
|--------|------|------|----------|
| @dcloudio/types | ^3.4.8 | UniApp 类型 | ✅ 类型支持 |
| @dcloudio/uni-automator | 3.0.0-* | 自动化测试 | ✅ 测试使用 |
| @dcloudio/uni-cli-shared | 3.0.0-* | CLI 共享 | ✅ 构建使用 |
| @dcloudio/uni-stacktracey | 3.0.0-* | 错误追踪 | ✅ 调试使用 |
| @dcloudio/vite-plugin-uni | 3.0.0-* | Vite 插件 | ✅ 构建使用 |
| @types/node | ^20.12.7 | Node 类型 | ✅ 类型支持 |
| @vue/tsconfig | ^0.5.1 | Vue TS 配置 | ✅ 配置使用 |
| fast-check | ^3.22.0 | 属性测试 | ✅ 测试使用 |
| vitest | ^2.1.0 | 测试框架 | ✅ 测试使用 |
| @vitest/coverage-v8 | ^2.1.0 | 覆盖率 | ✅ 测试使用 |
| sass | ^1.75.0 | SCSS 编译 | ✅ 样式使用 |
| typescript | ^5.4.5 | TypeScript | ✅ 核心使用 |
| vite | ^5.2.10 | 构建工具 | ✅ 核心使用 |
| vue-tsc | ^2.0.14 | Vue 类型检查 | ✅ 类型检查 |

### 未使用的依赖

#### 1. @uni-helper/uni-ui-types

**状态**: ⚠️ 未在代码中使用

**分析**:
- 在 `package.json` 中声明但未在任何 TypeScript 文件中导入
- 可能是为了使用 uni-ui 组件库的类型定义
- 但项目中未使用 uni-ui 组件库

**建议**:
- 如果不使用 uni-ui 组件库，移除此依赖
- 如果计划使用，保留

---

## ✅ 无重复功能的依赖

经检查，项目中没有功能重复的依赖包：

### 后端
- 只有一个 Web 框架 (FastAPI)
- 只有一个 ORM (SQLModel)
- 只有一个测试框架 (pytest)

### 前端
- 只有一个 UI 框架 (Vue)
- 只有一个状态管理 (Pinia)
- 只有一个测试框架 (Vitest)

---

## 📋 优化建议

### ~~高优先级~~ ✅ 已完成

1. ~~**移除 baidu-aip**~~ ✅ 已完成 (2024-12-29)

2. ~~**移除 @uni-helper/uni-ui-types**~~ ✅ 已完成 (2024-12-29)

### 中优先级

3. **评估 supabase 依赖**
   - 如果数据迁移已完成，可以移除
   - 或者将其移到 `requirements-dev.txt`
   - **当前状态**: 保留，用于可能的数据迁移需求

### 低优先级

4. **检查依赖版本更新**
   ```bash
   # 后端
   pip list --outdated
   
   # 前端
   npm outdated
   ```

---

## 📈 清理收益

| 优化项 | 包大小减少 | 安装时间减少 | 状态 |
|--------|------------|--------------|------|
| 移除 baidu-aip | ~10MB | ~5s | ✅ 已完成 |
| 移除 @uni-helper/uni-ui-types | ~100KB | ~1s | ✅ 已完成 |
| 移除 supabase (可选) | ~5MB | ~3s | 🟡 保留 |

**总计节省**: 约 10MB 包大小，约 6s 安装时间

---

## 🔗 相关报告

- [前端代码冗余报告](./FRONTEND-REDUNDANCY-REPORT.md)
- [前端组件冗余报告](./FRONTEND-COMPONENT-REDUNDANCY-REPORT.md)
- [后端字段冗余报告](./FIELD-REDUNDANCY-REPORT.md)
