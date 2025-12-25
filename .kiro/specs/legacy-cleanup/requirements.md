# Requirements Document

## Introduction

本文档定义了主项目（Taro + Supabase）清理的需求。在新框架（fleet-manager）已完整实现所有功能并通过验证后，需要清理旧的主项目代码，以简化项目结构、减少维护成本。

## Glossary

- **主项目**: 基于 Taro + React + Supabase 的原始车队管理系统
- **新框架**: 基于 FastAPI + UniApp Vue 3 的 fleet-manager 系统
- **清理**: 删除不再需要的代码、配置和资源文件
- **备份**: 在清理前创建 Git 标签以保留历史版本

## Requirements

### Requirement 1

**User Story:** As a developer, I want to backup the legacy code before cleanup, so that I can restore it if needed.

#### Acceptance Criteria

1. WHEN the cleanup process starts THEN the system SHALL create a Git tag named "v1.0-legacy" with description "Legacy Taro+Supabase version before cleanup"
2. WHEN the Git tag is created THEN the system SHALL push the tag to the remote repository
3. WHEN the backup is complete THEN the system SHALL verify the tag exists both locally and remotely

### Requirement 2

**User Story:** As a developer, I want to clean up the main project frontend code, so that the project structure is simplified.

#### Acceptance Criteria

1. WHEN cleaning up frontend code THEN the system SHALL remove the src/ directory containing all Taro React components
2. WHEN cleaning up frontend code THEN the system SHALL remove the config/ directory containing main project configurations
3. WHEN cleaning up frontend code THEN the system SHALL remove the dist/ directory containing build outputs
4. WHEN cleaning up frontend code THEN the system SHALL remove the h5-bundles/ directory containing H5 hot update packages

### Requirement 3

**User Story:** As a developer, I want to clean up the Supabase configuration, so that the project no longer depends on Supabase.

#### Acceptance Criteria

1. WHEN cleaning up Supabase THEN the system SHALL remove the supabase/ directory containing all Supabase configurations and migrations
2. WHEN cleaning up Supabase THEN the system SHALL verify no remaining code references Supabase

### Requirement 4

**User Story:** As a developer, I want to clean up the Android native code, so that the project structure is simplified.

#### Acceptance Criteria

1. WHEN cleaning up Android code THEN the system SHALL remove the android/ directory containing all Capacitor Android code
2. WHEN cleaning up Android code THEN the system SHALL remove any APK files in the root directory

### Requirement 5

**User Story:** As a developer, I want to clean up the E2E tests for the old project, so that only relevant tests remain.

#### Acceptance Criteria

1. WHEN cleaning up tests THEN the system SHALL remove the e2e/ directory containing Playwright tests for the old project

### Requirement 6

**User Story:** As a developer, I want to clean up root-level configuration files, so that only fleet-manager configurations remain.

#### Acceptance Criteria

1. WHEN cleaning up root configs THEN the system SHALL remove package.json, pnpm-lock.yaml, pnpm-workspace.yaml
2. WHEN cleaning up root configs THEN the system SHALL remove tsconfig.json, tailwind.config.js, postcss.config.js
3. WHEN cleaning up root configs THEN the system SHALL remove project.config.json, project.private.config.json
4. WHEN cleaning up root configs THEN the system SHALL remove node_modules/ directory

### Requirement 7

**User Story:** As a developer, I want to clean up archive and miscellaneous files, so that the project is clean.

#### Acceptance Criteria

1. WHEN cleaning up archives THEN the system SHALL remove the archive/ directory
2. WHEN cleaning up archives THEN the system SHALL evaluate and optionally clean the rules/ directory

### Requirement 8

**User Story:** As a developer, I want to verify the cleanup was successful, so that the project is in a clean state.

#### Acceptance Criteria

1. WHEN cleanup is complete THEN the system SHALL verify fleet-manager/ directory is intact
2. WHEN cleanup is complete THEN the system SHALL verify .git/, .kiro/, .vscode/ directories are preserved
3. WHEN cleanup is complete THEN the system SHALL verify the new framework can start successfully
4. WHEN cleanup is complete THEN the system SHALL commit the cleanup changes with appropriate message
