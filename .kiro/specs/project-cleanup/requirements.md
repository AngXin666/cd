# Requirements Document

## Introduction

本文档定义了项目清理和归档的需求规范。目标是清理已完成的 Spec 文档、删除不再需要的临时脚本和测试文件，同时确保不影响现有功能。所有删除操作必须经过严格的关联性扫描和深度测试。

## Glossary

- **Spec**: 功能规范文档，位于 `.kiro/specs/` 目录
- **临时脚本**: 用于一次性任务的脚本文件，如数据库迁移、调试脚本
- **核心脚本**: 项目运行必需的脚本，如部署脚本、构建脚本
- **关联性扫描**: 使用 grep 搜索代码库中所有引用的过程
- **深度测试**: 包括 TypeScript 编译检查、单元测试、本地 H5 功能测试

## Requirements

### Requirement 1

**User Story:** As a 开发者, I want to 清理已完成的 Spec 文档, so that 项目结构更清晰，便于维护。

#### Acceptance Criteria

1. WHEN 清理 Spec 文档 THEN the system SHALL 将已完成的 Spec 移动到 `.kiro/specs/_archived/` 目录
2. WHEN 归档 Spec THEN the system SHALL 保留完整的 requirements.md、design.md、tasks.md 文件
3. WHEN 归档 Spec THEN the system SHALL 删除临时生成的报告文件（如 SUMMARY.md、REPORT.md 等）
4. IF Spec 任务未全部完成 THEN the system SHALL 保留该 Spec 在原位置不做处理

### Requirement 2

**User Story:** As a 开发者, I want to 删除不再需要的临时脚本, so that scripts 目录更整洁。

#### Acceptance Criteria

1. WHEN 删除脚本前 THEN the system SHALL 使用 grep 搜索该脚本在代码库中的所有引用
2. WHEN 删除脚本前 THEN the system SHALL 确认该脚本不被任何配置文件或其他脚本调用
3. WHEN 删除脚本后 THEN the system SHALL 运行 TypeScript 编译检查确保无错误
4. IF 脚本被其他文件引用 THEN the system SHALL 先更新引用再删除脚本
5. WHEN 删除脚本 THEN the system SHALL 保留核心脚本（quick-deploy-h5.js、setup-database.js 等）

### Requirement 3

**User Story:** As a 开发者, I want to 清理不再需要的测试文件, so that 测试目录更整洁。

#### Acceptance Criteria

1. WHEN 删除测试文件前 THEN the system SHALL 确认对应的源文件是否仍然存在
2. WHEN 删除测试文件前 THEN the system SHALL 运行该测试确认其状态
3. WHEN 删除测试文件后 THEN the system SHALL 运行完整测试套件确保无回归
4. IF 测试文件对应的功能仍在使用 THEN the system SHALL 保留该测试文件

### Requirement 4

**User Story:** As a 开发者, I want to 更新项目文档, so that 文档与代码保持同步。

#### Acceptance Criteria

1. WHEN 清理完成后 THEN the system SHALL 更新 README.md 反映当前项目状态
2. WHEN 清理完成后 THEN the system SHALL 更新 CHANGELOG.md 记录清理操作
3. WHEN 清理完成后 THEN the system SHALL 更新 scripts/README.md 反映当前脚本列表

### Requirement 5

**User Story:** As a 开发者, I want to 确保清理操作不影响现有功能, so that 生产环境稳定运行。

#### Acceptance Criteria

1. WHEN 每次删除操作后 THEN the system SHALL 运行 `npx tsc --noEmit` 确保编译通过
2. WHEN 每次删除操作后 THEN the system SHALL 运行 `npx vitest run` 确保测试通过
3. WHEN 所有清理完成后 THEN the system SHALL 执行本地 H5 构建和测试
4. IF 任何测试失败 THEN the system SHALL 立即回滚该删除操作
5. WHEN 清理完成后 THEN the system SHALL 验证核心功能（登录、车辆管理、审核流程）正常工作
