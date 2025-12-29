# 更新日志

本文件记录项目的所有重要变更。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [2.0.0] - 2025-12-25

### 重大变更 - 项目迁移完成 🎉

#### 架构迁移
- ✅ 从 Taro + React + Supabase 迁移到 UniApp + Vue3 + FastAPI
- ✅ 删除旧的主项目代码（src/、config/、supabase/、android/）
- ✅ 保留 Git 标签 `v1.0-legacy` 作为历史备份

#### 功能完整性
- ✅ 司机端 17 个页面功能 100% 对齐
- ⚠️ 车队长端功能 90% 对齐（缺失员工管理页面）
- ✅ 老板端 11 个缺失页面已全部补充
- ✅ 后端 62 个 API 全部实现并测试通过

#### 深度对比报告
- 📄 司机端对比报告：`fleet-manager/docs/DRIVER-PAGE-COMPARISON.md`
- 📄 老板端对比报告：`fleet-manager/docs/BOSS-PAGE-DEEP-COMPARISON.md`
- 📄 车队长端对比报告：`fleet-manager/docs/MANAGER-PAGE-DEEP-COMPARISON.md`

#### 新增功能
- ✅ 仓库统计页面（司机端）
- ✅ 车辆租赁信息页面
- ✅ 补录照片功能
- ✅ 通知模板管理
- ✅ 定时通知功能
- ✅ 热更新检测
- ✅ 照片对比功能
- ✅ 车辆历史记录

#### 清理工作
- ✅ 删除 7 个已完成的 Spec 目录
- ✅ 删除旧的 docs/ 文档目录
- ✅ 删除临时输出文件
- ✅ 更新 README.md 和 CHANGELOG.md

### 清理的 Spec
- ✅ `database-migration-consolidation` - 已删除（不再适用于新架构）

---

## [1.x.x] - 历史版本

历史版本记录请查看 Git 标签 `v1.0-legacy`。

---

## 版本说明

### 版本号格式
- **主版本号**：重大架构变更或不兼容的 API 修改
- **次版本号**：新增功能，向下兼容
- **修订号**：问题修复，向下兼容

### 变更类型
- **新增**：新功能
- **变更**：现有功能的变更
- **弃用**：即将移除的功能
- **移除**：已移除的功能
- **修复**：问题修复
- **安全**：安全相关的修复
