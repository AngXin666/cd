# Requirements Document

## Introduction

清理项目中废弃的策略模板权限系统，统一使用应用层权限控制系统。项目当前存在两套权限系统：
1. **应用层权限系统**（保留）：`src/config/permission-config.ts` + `src/services/permission-service.ts`
2. **策略模板系统**（删除）：`src/db/api/permission-strategy.ts` + 数据库函数

策略模板系统依赖于不存在的数据库表和函数，导致权限配置页面无法正常工作。需要删除废弃代码并修复使用旧系统的页面。

## Glossary

- **应用层权限系统**：基于用户角色（BOSS、PEER_ADMIN、MANAGER、DRIVER）在前端代码中控制数据访问权限
- **策略模板系统**：基于数据库函数和 `user_permission_assignments` 表的复杂权限系统（已废弃）
- **permission_type**：`users` 表中的字段，用于存储用户权限级别（full/view_only）

## Requirements

### Requirement 1

**User Story:** As a developer, I want to remove the deprecated strategy template system, so that the codebase is cleaner and easier to maintain.

#### Acceptance Criteria

1. WHEN the cleanup is complete THEN the system SHALL not contain any references to `permission-strategy.ts` API functions
2. WHEN the cleanup is complete THEN the system SHALL not contain any references to deprecated database functions like `create_manager`, `get_manager_permission`
3. WHEN the cleanup is complete THEN the system SHALL continue to use the application-layer permission system without any changes

### Requirement 2

**User Story:** As a user, I want the permission configuration page to work correctly, so that I can manage user permissions.

#### Acceptance Criteria

1. WHEN a user opens the permission configuration page THEN the system SHALL load the current permission level from the `users.permission_type` field
2. WHEN a user saves permission changes THEN the system SHALL update the `users.permission_type` field directly
3. WHEN a user resets permissions THEN the system SHALL set `users.permission_type` to the default value

### Requirement 3

**User Story:** As a developer, I want to clean up unused migration files, so that the database migration history is cleaner.

#### Acceptance Criteria

1. WHEN the cleanup is complete THEN the migration files related to strategy template system SHALL be marked as deprecated or removed
2. WHEN the cleanup is complete THEN the system SHALL not attempt to create non-existent database tables or functions
