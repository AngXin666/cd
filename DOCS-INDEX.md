/**
 * 车队管家项目文档索引
 * 快速查找所有项目文档
 * @created 2025-12-14
 */

# 📚 项目文档索引

## 🎯 快速导航

### 新手入门
1. [README.md](./README.md) - 项目概览和快速开始
2. [WIKI.md](./WIKI.md) - 完整技术文档

### 开发规范
1. [.kiro/steering/SUMMARY.md](./.kiro/steering/SUMMARY.md) - 编码规范总结
2. [.kiro/steering/mandatory-rules.md](./.kiro/steering/mandatory-rules.md) - 强制规则
3. [.kiro/steering/coding-standards.md](./.kiro/steering/coding-standards.md) - 编码标准

---

## 📁 文档结构

### 根目录文档

#### 核心文档
- **README.md** - 项目主文档
  - 项目介绍
  - 快速开始
  - 功能特性
  - 技术栈
  - 测试账号

- **WIKI.md** - 完整技术文档
  - 系统概览
  - 技术架构
  - 数据库设计
  - 权限系统
  - API文档
  - 开发指南
  - 部署运维

- **DEPLOY-NOW.md** - H5 部署指南
  - 部署步骤
  - 版本管理
  - 故障排查

- **DOCS-INDEX.md** - 文档索引（本文件）
  - 完整文档结构
  - 快速导航
  - 按主题查找

- **DOCS-CLEANUP-SUMMARY.md** - 文档清理总结
  - 清理记录
  - 归档说明
  - 维护建议

#### APK文件
- **车队管家-v1.2.3-渐变背景.apk** - 最新版本APK
  - 旧版本已删除
  - 历史版本说明见 `archive/README.md`

---

### .kiro/ 目录（Kiro 配置）

#### .kiro/steering/ - 编码规范
- **SUMMARY.md** - 规则总结（推荐首先阅读）
- **mandatory-rules.md** - 🚨 强制规则（必须遵守）
  - 规则 1：所有代码必须有完整注释
  - 规则 2：文档必须实时同步更新
- **workflow-guide.md** - 工作流选择指南
- **project-workflow.md** - 6A 工作流详细规则
- **coding-standards.md** - 编码规范
- **project-context.md** - 项目上下文信息
- **README.md** - Steering 使用说明

#### .kiro/specs/ - 功能规范
- **top-navigation-bar/** - 顶部导航栏功能
  - requirements.md - 需求文档
  - design.md - 设计文档
  - tasks.md - 任务列表

- **login-page-optimization/** - 登录页面优化
  - requirements.md - 需求文档
  - design.md - 设计文档
  - tasks.md - 任务列表

---

### docs/ 目录（项目文档）

#### docs/平台优化/ - 平台适配文档
- **平台适配指南.md** - 微信小程序和安卓APP完整适配指南
- **API导入优化指南.md** - API按需导入详解
- **API内存优化说明.md** - 内存优化快速说明
- **优化总结.md** - 完整优化内容
- **优化检查清单.md** - 优化检查项
- **API优化快速开始.md** - API优化快速指南

#### docs/权限系统/ - 权限系统文档
- **PERMISSION_SYSTEM.md** - 权限系统概览
- **权限系统技术实现.md** - 技术实现细节
- **权限上下文使用指南.md** - 使用指南
- **调度权限完善总结.md** - 调度权限说明

#### docs/系统核心/ - 核心业务文档
- **产品需求文档.md** - 产品需求
- **系统功能文档.md** - 系统功能说明
- **核心业务功能技术文档.md** - 技术实现
- **用户手册.md** - 用户使用手册
- **说明文档.md** - 系统说明

#### docs/功能模块/ - 功能模块文档
- **仓库管理/** - 仓库管理功能
- **车辆管理/** - 车辆管理功能
- **打卡功能/** - 打卡功能
- **计件工资/** - 计件工资功能
- **考勤管理/** - 考勤管理功能
- **请假管理/** - 请假管理功能
- **权限系统/** - 权限系统
- **通知系统/** - 通知系统

#### docs/调试日志/ - 调试文档
- **仓库管理测试指南.md** - 仓库管理测试
- **仓库管理调试日志说明.md** - 调试日志

---

### 文档/ 目录（历史文档）

#### 文档/优化报告/ - 优化报告
- **代码清理指南.md**
- **平台优化报告.md**
- **API优化报告.md**

#### 文档/构建指南/ - 构建指南
- **APK构建指南.md**

#### 文档/重构文档/ - 重构文档
- **项目臃肿分析.md**
- **用户管理页面重构完成.md**
- **重构实施指南.md**

---

### archive/ 目录（归档文件）

#### archive/sql/ - SQL脚本归档
- **测试更新.sql** - H5更新测试脚本
- **修复h5_versions表.sql** - 表修复脚本
- **deploy-h5-v1.0.0.sql** - 旧版本部署脚本
- **EXECUTE_IN_DASHBOARD.sql** - Dashboard执行脚本
- **fix-notifications-rls.sql** - 通知RLS修复脚本

#### archive/scripts/ - 临时脚本归档
- **fix_*.py** - Python修复脚本
- **fix_*.ps1** - PowerShell修复脚本
- **fix-*.js** - JavaScript修复脚本
- **clean_*.py** - 日志清理脚本
- **check_*.ps1** - 编码检查脚本

#### archive/README.md - 归档说明
- 归档目录结构
- 文件说明
- 维护规则

---

## 🔍 按主题查找

### 开发相关
- 编码规范：`.kiro/steering/coding-standards.md`
- 工作流程：`.kiro/steering/workflow-guide.md`
- 项目结构：`WIKI.md` → 开发指南
- API 文档：`WIKI.md` → API文档

### 功能开发
- 功能规范：`.kiro/specs/`
- 功能文档：`docs/功能模块/`
- 系统核心：`docs/系统核心/`

### 部署运维
- H5 部署：`DEPLOY-NOW.md`
- APK 构建：`文档/构建指南/APK构建指南.md`
- 平台适配：`docs/平台优化/平台适配指南.md`

### 优化相关
- 平台优化：`docs/平台优化/`
- API 优化：`docs/平台优化/API导入优化指南.md`
- 代码清理：`文档/优化报告/代码清理指南.md`

### 权限系统
- 权限概览：`docs/权限系统/PERMISSION_SYSTEM.md`
- 技术实现：`docs/权限系统/权限系统技术实现.md`
- 使用指南：`docs/权限系统/权限上下文使用指南.md`

---

## 📝 文档更新规则

### 强制要求
根据 `.kiro/steering/mandatory-rules.md`：

1. **所有代码必须有完整注释**
   - 所有函数都必须添加 JSDoc 注释
   - 所有文件开头必须添加文件说明
   - 所有复杂逻辑必须添加行内注释

2. **文档必须实时同步更新**
   - 代码变更时必须立即更新文档
   - 不允许先改代码后补文档
   - 文档与代码必须保持 100% 同步

### 文档类型
- **需求文档** (requirements.md) - 功能需求和验收标准
- **设计文档** (design.md) - 技术设计和架构
- **任务文档** (tasks.md) - 实现任务列表
- **API 文档** - 接口说明
- **使用指南** - 功能使用说明

---

## 🎯 常用文档快速链接

### 每日开发必读
1. [编码规范总结](./.kiro/steering/SUMMARY.md)
2. [强制规则](./.kiro/steering/mandatory-rules.md)
3. [项目上下文](./.kiro/steering/project-context.md)

### 新功能开发
1. [工作流选择](./.kiro/steering/workflow-guide.md)
2. [功能规范模板](./.kiro/specs/)
3. [API 文档](./WIKI.md)

### 问题排查
1. [调试日志](./docs/调试日志/)
2. [优化报告](./文档/优化报告/)
3. [WIKI - 常见问题](./WIKI.md)

---

## 📞 需要帮助？

1. 查看 [SUMMARY.md](./.kiro/steering/SUMMARY.md) 了解规则概览
2. 查看 [WIKI.md](./WIKI.md) 了解技术细节
3. 查看 [mandatory-rules.md](./.kiro/steering/mandatory-rules.md) 了解强制要求

---

**最后更新**: 2025-12-14  
**维护**: 车队管家开发团队
