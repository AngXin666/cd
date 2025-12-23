# Requirements Document

## Introduction

本项目旨在整理和合并 Supabase 数据库迁移文件。当前项目有 644 个迁移文件，其中包含大量重复、废弃和历史遗留的迁移。这些文件导致：
- 新环境部署困难（迁移执行时间长、容易失败）
- 维护成本高（难以理解当前数据库结构）
- 版本控制混乱（大量重复和冲突的迁移）

目标是将 644 个迁移文件合并为一个干净的基线迁移，同时保留必要的增量迁移。

## Glossary

- **迁移文件 (Migration File)**: SQL 文件，定义数据库结构变更
- **基线迁移 (Baseline Migration)**: 包含完整数据库结构的单一迁移文件
- **增量迁移 (Incremental Migration)**: 在基线之上的小型变更迁移
- **DDL (Data Definition Language)**: 定义数据库结构的 SQL 语句（CREATE、ALTER、DROP）
- **DML (Data Manipulation Language)**: 操作数据的 SQL 语句（INSERT、UPDATE、DELETE）
- **RLS (Row Level Security)**: Supabase 的行级安全策略

## 当前状态分析

### 迁移文件分类
- **核心表结构**: 001-009 系列（枚举、核心表、关联表、考勤、计件、请假、车辆、反馈、存储桶）
- **RLS 策略**: 010 系列、00023-00028 系列
- **测试数据**: 011 系列、00029-00032 系列
- **功能迁移**: 00037-00638 系列（通知、车辆审核、多租户、权限系统等）
- **修复迁移**: 大量 fix_* 文件（修复 RLS、修复函数、修复字段等）
- **废弃迁移**: 99999_* 系列、重复编号文件

### 问题分析
1. **重复迁移**: 同一功能有多个版本（如 fix_xxx_v2、fix_xxx_v3）
2. **废弃迁移**: 99999_* 系列是临时修复，应该合并到正式迁移
3. **编号混乱**: 存在重复编号（如 00048、00049、00050 各有两个文件）
4. **历史遗留**: 多租户相关迁移已废弃（项目已改为单用户系统）

## Requirements

### Requirement 1

**User Story:** As a 开发者, I want to 将所有迁移合并为一个干净的基线, so that 新环境可以快速部署。

#### Acceptance Criteria

1. WHEN 执行基线迁移 THEN the System SHALL 创建完整的数据库结构（所有表、索引、函数、触发器、RLS 策略）
2. WHEN 基线迁移完成 THEN the System SHALL 与当前生产环境数据库结构完全一致
3. WHEN 新环境部署 THEN the System SHALL 只需执行一个基线迁移文件即可完成数据库初始化
4. IF 基线迁移执行失败 THEN the System SHALL 提供清晰的错误信息和回滚方案

### Requirement 2

**User Story:** As a 开发者, I want to 清理废弃和重复的迁移文件, so that 迁移目录更整洁。

#### Acceptance Criteria

1. WHEN 清理迁移文件 THEN the System SHALL 删除所有 99999_* 系列的临时迁移
2. WHEN 清理迁移文件 THEN the System SHALL 删除所有重复编号的迁移（保留最新版本）
3. WHEN 清理迁移文件 THEN the System SHALL 删除所有多租户相关的废弃迁移
4. WHEN 清理完成 THEN the System SHALL 将迁移文件数量从 644 个减少到 50 个以内

### Requirement 3

**User Story:** As a 开发者, I want to 保留必要的增量迁移, so that 可以追踪数据库变更历史。

#### Acceptance Criteria

1. WHEN 保留增量迁移 THEN the System SHALL 保留最近 30 天内的功能迁移
2. WHEN 保留增量迁移 THEN the System SHALL 保留所有未执行的待部署迁移
3. WHEN 保留增量迁移 THEN the System SHALL 为每个增量迁移添加清晰的注释说明

### Requirement 4

**User Story:** As a 开发者, I want to 验证迁移合并的正确性, so that 不会丢失任何数据库功能。

#### Acceptance Criteria

1. WHEN 验证迁移 THEN the System SHALL 对比合并前后的数据库结构（表、列、索引、函数、触发器、RLS 策略）
2. WHEN 验证迁移 THEN the System SHALL 确保所有 RLS 策略正确应用
3. WHEN 验证迁移 THEN the System SHALL 确保所有函数和触发器正常工作
4. IF 验证发现差异 THEN the System SHALL 生成差异报告并提供修复建议

### Requirement 5

**User Story:** As a 开发者, I want to 创建迁移文档, so that 团队成员可以理解数据库结构。

#### Acceptance Criteria

1. WHEN 创建文档 THEN the System SHALL 生成数据库表结构文档（表名、列名、类型、约束）
2. WHEN 创建文档 THEN the System SHALL 生成 RLS 策略文档（策略名、适用表、规则说明）
3. WHEN 创建文档 THEN the System SHALL 生成函数和触发器文档（名称、参数、功能说明）
4. WHEN 创建文档 THEN the System SHALL 更新 supabase/migrations/README.md

