# 统一热更新系统需求文档

## Introduction

本项目需要实现一个统一的热更新系统，支持小程序和 Android APP 两个平台。当前项目存在两套热更新实现，其中旧的热更新系统（`src/utils/hotUpdate.ts`）无法在任何平台正常工作，需要移除并重构为平台自适应的统一热更新服务。

## Glossary

- **热更新 (Hot Update)**: 在不重新安装应用的情况下更新应用代码
- **小程序 (Mini Program)**: 微信小程序平台
- **Android APP**: 基于 Capacitor 的 Android 应用
- **UpdateManager**: 微信小程序官方提供的更新管理器
- **LiveUpdate**: Capacitor 的热更新插件 `@capawesome/capacitor-live-update`
- **UnifiedUpdateService**: 统一热更新服务，根据平台自动选择更新策略
- **H5VersionInfo**: H5 版本信息，存储在 Supabase 数据库中
- **Bundle**: Capacitor LiveUpdate 中的更新包

## Requirements

### Requirement 1

**User Story:** As a developer, I want to remove the invalid hot update implementation, so that the codebase is clean and maintainable.

#### Acceptance Criteria

1. WHEN the old hot update code exists THEN the system SHALL remove all files and references related to `src/utils/hotUpdate.ts`
2. WHEN the old hot update is removed THEN the system SHALL remove the import and usage in `src/app.tsx`
3. WHEN the old hot update is removed THEN the system SHALL ensure no other files reference the removed functions

### Requirement 2

**User Story:** As a mini program user, I want the app to automatically check for updates using WeChat's official mechanism, so that I can always use the latest version.

#### Acceptance Criteria

1. WHEN the mini program starts THEN the system SHALL use `Taro.getUpdateManager()` to check for updates
2. WHEN a new version is available and downloaded THEN the system SHALL prompt the user to restart the app
3. WHEN the user confirms restart THEN the system SHALL call `updateManager.applyUpdate()` to apply the new version
4. WHEN running in non-mini-program environment THEN the system SHALL skip the mini program update logic

### Requirement 3

**User Story:** As an Android APP user, I want the app to check for H5 updates from the server, so that I can get new features without reinstalling the APK.

#### Acceptance Criteria

1. WHEN the Android APP starts THEN the system SHALL check for H5 updates from Supabase database
2. WHEN a new H5 version is available THEN the system SHALL display the update dialog with version info and release notes
3. WHEN the update is a force update THEN the system SHALL prevent the user from canceling the update
4. WHEN the user confirms update THEN the system SHALL download and install the H5 bundle using LiveUpdate
5. WHEN the update is complete THEN the system SHALL prompt the user to restart the app
6. WHEN running in non-Android-APP environment THEN the system SHALL skip the Android APP update logic

### Requirement 4

**User Story:** As a developer, I want a unified update service with a consistent API, so that I can easily integrate updates without worrying about platform differences.

#### Acceptance Criteria

1. WHEN the unified update service is called THEN the system SHALL automatically detect the current platform
2. WHEN running on mini program THEN the system SHALL use the mini program update strategy
3. WHEN running on Android APP THEN the system SHALL use the H5 update strategy
4. WHEN running on H5 web THEN the system SHALL skip update checks
5. THE UnifiedUpdateService SHALL provide a single `checkAndApplyUpdate()` function for all platforms

### Requirement 5

**User Story:** As a developer, I want to initialize the update service on app startup, so that updates are checked automatically.

#### Acceptance Criteria

1. WHEN the app starts THEN the system SHALL call the unified update service initialization
2. WHEN initialization completes THEN the system SHALL perform a silent update check
3. WHEN an error occurs during initialization THEN the system SHALL log the error without crashing the app
4. WHEN running in development mode THEN the system SHALL skip automatic update checks

### Requirement 6

**User Story:** As a user, I want to see a consistent update UI across platforms, so that I have a familiar experience.

#### Acceptance Criteria

1. WHEN an update is available on Android APP THEN the system SHALL display the H5UpdateDialog component
2. WHEN an update is available on mini program THEN the system SHALL use Taro's native modal dialog
3. WHEN displaying update information THEN the system SHALL show version number and release notes
4. WHEN the update is downloading THEN the system SHALL show progress feedback to the user

### Requirement 7

**User Story:** As a developer, I want proper error handling for update failures, so that users are informed and the app remains stable.

#### Acceptance Criteria

1. WHEN an update check fails THEN the system SHALL log the error and continue app execution
2. WHEN an update download fails THEN the system SHALL display an error message to the user
3. WHEN an update installation fails THEN the system SHALL allow the user to retry or cancel
4. WHEN a network error occurs THEN the system SHALL handle it gracefully without crashing

### Requirement 8

**User Story:** As a developer, I want the update service to integrate with existing logging and error handling, so that issues can be tracked and debugged.

#### Acceptance Criteria

1. WHEN update operations occur THEN the system SHALL log events using the existing logger utility
2. WHEN errors occur THEN the system SHALL use the enhancedErrorHandler for consistent error handling
3. WHEN update status changes THEN the system SHALL log the status for debugging purposes
