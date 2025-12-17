# Requirements Document

## Introduction

本文档定义了修复权限系统数据库字段缺失问题的需求。当前系统在加载用户权限信息时报错 `column users.permission_type does not exist`，原因是代码中引用了 `users` 表的 `permission_type` 字段，但该字段在数据库中不存在。

**解决方案**：采用应用层权限控制方案，移除对 `permission_type` 数据库字段的依赖，改为基于用户角色（role）推断权限级别。这与项目现有的应用层权限系统（`src/config/permission-config.ts`）保持一致。

## Glossary

- **users 表**：存储用户基本信息的数据库表
- **role**：用户角色字段（BOSS、PEER_ADMIN、MANAGER、DRIVER）
- **应用层权限系统**：基于用户角色在前端代码中控制数据访问权限的系统
- **权限级别**：full_control（完整控制权）、view_only（仅查看权）

## Requirements

### Requirement 1

**User Story:** 作为系统管理员，我希望权限配置页面能正常加载用户权限信息，以便我能够管理用户权限。

#### Acceptance Criteria

1. WHEN 系统加载用户权限信息 THEN 系统 SHALL 基于用户角色推断权限级别而不依赖 permission_type 字段
2. WHEN 用户打开权限配置页面 THEN 系统 SHALL 根据用户角色正确显示当前权限级别
3. WHEN 用户保存权限变更 THEN 系统 SHALL 通过修改用户角色或其他现有字段来实现权限变更

### Requirement 2

**User Story:** 作为开发者，我希望权限系统完全基于应用层控制，以便减少数据库依赖并提高可维护性。

#### Acceptance Criteria

1. WHEN 代码需要获取用户权限 THEN 系统 SHALL 基于 users.role 字段推断权限级别
2. WHEN BOSS 角色用户查询权限 THEN 系统 SHALL 返回 full_control 权限级别
3. WHEN MANAGER 或 PEER_ADMIN 角色用户查询权限 THEN 系统 SHALL 基于 manager_permissions_enabled 字段确定权限级别
4. WHEN DRIVER 角色用户查询权限 THEN 系统 SHALL 返回 view_only 权限级别

### Requirement 3

**User Story:** 作为开发者，我希望移除所有对 permission_type 字段的引用，以便代码与数据库结构保持一致。

#### Acceptance Criteria

1. WHEN 代码执行完毕 THEN 系统 SHALL 不包含任何对 users.permission_type 字段的引用
2. WHEN 权限相关 API 函数被调用 THEN 系统 SHALL 正常返回权限信息而不报错
3. WHEN 权限配置页面保存权限 THEN 系统 SHALL 使用现有字段（如 manager_permissions_enabled）存储权限状态

