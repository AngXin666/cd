# Requirements Document

## Introduction

本文档定义了修复 vehicles 表中 `review_status` 字段缺失问题的需求。当前系统在添加车辆时报错：`Could not find the 'review_status' column of 'vehicles' in the schema cache`，表明数据库中缺少该字段或 schema cache 未更新。

## Glossary

- **vehicles**: 车辆信息表，存储车辆的核心信息
- **review_status**: 审核状态字段，用于跟踪车辆的审核流程状态
- **schema cache**: Supabase 的数据库模式缓存，用于加速查询
- **PGRST204**: PostgREST 错误代码，表示请求的列在 schema cache 中不存在

## Requirements

### Requirement 1

**User Story:** 作为司机，我希望能够成功添加车辆信息，以便系统能够记录和管理我的车辆。

#### Acceptance Criteria

1. WHEN 司机提交车辆信息 THEN 系统 SHALL 成功将车辆数据保存到 vehicles 表中
2. WHEN vehicles 表中缺少 review_status 字段 THEN 系统 SHALL 通过数据库迁移添加该字段
3. WHEN review_status 字段添加成功 THEN 系统 SHALL 使用 'drafting' 作为默认值
4. IF schema cache 未包含新字段 THEN 系统 SHALL 刷新 schema cache 以识别新字段

### Requirement 2

**User Story:** 作为系统管理员，我希望数据库迁移脚本能够安全执行，以便不影响现有数据。

#### Acceptance Criteria

1. WHEN 执行迁移脚本 THEN 系统 SHALL 使用 `IF NOT EXISTS` 语法避免重复创建
2. WHEN review_status 枚举类型不存在 THEN 系统 SHALL 先创建枚举类型再添加字段
3. WHEN 迁移完成 THEN 系统 SHALL 验证字段已成功添加到 vehicles 表

### Requirement 3

**User Story:** 作为开发者，我希望代码能够正确处理 review_status 字段，以便车辆审核流程正常工作。

#### Acceptance Criteria

1. WHEN 插入车辆数据时包含 review_status 字段 THEN 系统 SHALL 正确保存该值
2. WHEN 查询车辆数据 THEN 系统 SHALL 能够正确返回 review_status 字段值
3. WHEN 更新车辆审核状态 THEN 系统 SHALL 正确更新 review_status 字段
