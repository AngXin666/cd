# APK 热更新问题修复需求文档

## Introduction

用户报告 APK 没有提示热更新。本文档旨在分析问题原因并提供修复方案。当前项目已有完整的热更新系统实现（`unified-hot-update` spec），但在实际 APK 运行时未能正常触发更新提示。

## Glossary

- **APK**: Android 应用安装包
- **热更新 (Hot Update)**: 在不重新安装应用的情况下更新应用代码
- **LiveUpdate**: Capacitor 的热更新插件 `@capawesome/capacitor-live-update`
- **h5_versions**: Supabase 数据库中存储 H5 版本信息的表
- **静默检查 (Silent Check)**: 不显示"已是最新版本"提示的更新检查模式
- **Bundle**: Capacitor LiveUpdate 中的更新包

## Requirements

### Requirement 1

**User Story:** As a developer, I want to diagnose why the APK is not showing hot update prompts, so that I can identify the root cause.

#### Acceptance Criteria

1. WHEN the APK starts THEN the system SHALL log detailed information about platform detection
2. WHEN the update service initializes THEN the system SHALL log the current platform type and strategy name
3. WHEN checking for updates THEN the system SHALL log the current version, server version, and comparison result
4. WHEN the h5_versions table query completes THEN the system SHALL log whether any active versions were found
5. WHEN version comparison occurs THEN the system SHALL log both version numbers and the comparison outcome

### Requirement 2

**User Story:** As a developer, I want to verify the database configuration, so that I can ensure version records are correctly set up.

#### Acceptance Criteria

1. WHEN querying h5_versions THEN the system SHALL handle the case where no active versions exist
2. WHEN no active version is found THEN the system SHALL log a clear warning message
3. WHEN the version in database is lower than or equal to current version THEN the system SHALL log this information
4. WHEN the database query returns data THEN the system SHALL log the version number and h5_url for verification

### Requirement 3

**User Story:** As a developer, I want to ensure the platform detection is correct, so that the right update strategy is used.

#### Acceptance Criteria

1. WHEN running in Capacitor environment THEN the system SHALL detect platform as ANDROID
2. WHEN the Capacitor object exists on window THEN the isCapacitorApp() function SHALL return true
3. WHEN platform is detected THEN the system SHALL log the detection result for debugging
4. IF platform detection fails THEN the system SHALL fall back to H5 strategy and log a warning

### Requirement 4

**User Story:** As a developer, I want to ensure the update check is not skipped in production, so that users receive update prompts.

#### Acceptance Criteria

1. WHEN NODE_ENV is 'production' THEN the system SHALL NOT skip update checks
2. WHEN the APK is built for release THEN the system SHALL perform update checks
3. WHEN isDevelopmentMode() is called THEN the system SHALL correctly identify the environment
4. THE system SHALL log whether development mode check passed or failed

### Requirement 5

**User Story:** As a developer, I want to ensure the Supabase query works correctly in APK environment, so that version information can be retrieved.

#### Acceptance Criteria

1. WHEN the APK queries h5_versions table THEN the system SHALL use the correct Supabase client
2. WHEN the query fails THEN the system SHALL log the error details including error code and message
3. WHEN the query succeeds but returns empty data THEN the system SHALL log this as a warning
4. THE system SHALL handle network errors gracefully and log appropriate messages

