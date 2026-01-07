# Requirements Document

## Introduction

本文档定义了车队管家应用的热更新功能需求。热更新允许应用在不重新安装 APK 的情况下更新前端资源（HTML、CSS、JavaScript），实现快速迭代和 bug 修复。

系统支持两种更新模式：
1. **热更新（wgt 包）**：仅更新前端资源，无需重新安装 APK
2. **整包更新（APK）**：需要下载完整 APK 并重新安装

## Glossary

- **Hot_Update_System**: 热更新系统，负责检测、下载和安装更新包
- **Version_Manager**: 版本管理器，负责版本号比较和更新策略决策
- **Update_Server**: 更新服务器（后端），提供版本检查 API 和更新包下载
- **WGT_Package**: UniApp 热更新资源包，包含前端代码和资源文件
- **APK_Package**: Android 完整安装包
- **Version_Code**: 版本号（整数），用于比较版本新旧
- **Version_Name**: 版本名称（字符串），如 "1.2.0"，用于显示

## Requirements

### Requirement 1: 版本检查

**User Story:** 作为用户，我希望应用能自动检查是否有新版本，以便及时获取最新功能和修复。

#### Acceptance Criteria

1. WHEN 应用启动时, THE Hot_Update_System SHALL 在延迟 2 秒后自动检查更新
2. WHEN 用户手动触发检查更新时, THE Hot_Update_System SHALL 立即向 Update_Server 发送版本检查请求
3. WHEN 发送版本检查请求时, THE Hot_Update_System SHALL 包含当前版本号、版本名称和平台信息
4. IF 网络请求失败, THEN THE Hot_Update_System SHALL 静默处理错误并记录日志，不影响用户正常使用

### Requirement 2: 版本比较与更新策略

**User Story:** 作为系统管理员，我希望能够控制更新策略，决定用户是否必须更新以及更新方式。

#### Acceptance Criteria

1. WHEN Update_Server 收到版本检查请求时, THE Version_Manager SHALL 比较客户端版本与最新版本
2. WHEN 存在新版本时, THE Update_Server SHALL 返回更新类型（热更新或整包更新）
3. WHEN 存在强制更新版本时, THE Update_Server SHALL 在响应中标记 is_force_update 为 true
4. WHEN 热更新包可用时, THE Update_Server SHALL 返回 wgt 包下载地址
5. WHEN 仅整包更新可用时, THE Update_Server SHALL 返回 APK 下载地址
6. THE Version_Manager SHALL 支持配置最低兼容版本号，低于此版本必须整包更新

### Requirement 3: 热更新下载与安装

**User Story:** 作为用户，我希望能够快速下载并安装热更新，无需重新安装整个应用。

#### Acceptance Criteria

1. WHEN 用户确认热更新时, THE Hot_Update_System SHALL 下载 wgt 包并显示下载进度
2. WHEN wgt 包下载完成时, THE Hot_Update_System SHALL 验证包的完整性（MD5 校验）
3. IF wgt 包校验失败, THEN THE Hot_Update_System SHALL 提示用户下载失败并允许重试
4. WHEN wgt 包校验成功时, THE Hot_Update_System SHALL 调用 plus.runtime.install 安装更新
5. WHEN 热更新安装成功时, THE Hot_Update_System SHALL 提示用户重启应用以生效
6. IF 热更新安装失败, THEN THE Hot_Update_System SHALL 提示错误信息并建议整包更新

### Requirement 4: 整包更新下载与安装

**User Story:** 作为用户，当需要整包更新时，我希望能够方便地下载并安装新版本 APK。

#### Acceptance Criteria

1. WHEN 用户确认整包更新时, THE Hot_Update_System SHALL 下载 APK 并显示下载进度
2. WHEN APK 下载完成时, THE Hot_Update_System SHALL 调用系统安装器安装 APK
3. IF 下载过程中网络中断, THEN THE Hot_Update_System SHALL 支持断点续传
4. WHEN 下载进度更新时, THE Hot_Update_System SHALL 实时显示已下载大小和总大小

### Requirement 5: 更新提示界面

**User Story:** 作为用户，我希望看到清晰的更新提示，了解更新内容和是否必须更新。

#### Acceptance Criteria

1. WHEN 检测到可选更新时, THE Hot_Update_System SHALL 显示包含"稍后再说"和"立即更新"按钮的弹窗
2. WHEN 检测到强制更新时, THE Hot_Update_System SHALL 显示仅包含"立即更新"按钮的弹窗
3. WHEN 显示更新弹窗时, THE Hot_Update_System SHALL 展示版本号、更新内容和文件大小
4. WHILE 下载进行中时, THE Hot_Update_System SHALL 显示进度条和百分比

### Requirement 6: 后端版本管理 API

**User Story:** 作为系统管理员，我希望能够通过后端管理应用版本和更新包。

#### Acceptance Criteria

1. THE Update_Server SHALL 提供 GET /api/app/version/check 接口用于版本检查
2. THE Update_Server SHALL 提供 POST /api/app/version 接口用于发布新版本（需管理员权限）
3. THE Update_Server SHALL 提供 GET /api/app/version/latest 接口获取最新版本信息
4. WHEN 发布新版本时, THE Update_Server SHALL 支持上传 wgt 包和 APK 文件
5. THE Update_Server SHALL 存储版本历史记录，包括版本号、更新内容、发布时间、下载次数

### Requirement 7: 版本信息持久化

**User Story:** 作为系统管理员，我希望版本信息能够持久化存储，支持版本回滚和历史查询。

#### Acceptance Criteria

1. THE Update_Server SHALL 将版本信息存储在数据库中
2. WHEN 存储版本信息时, THE Update_Server SHALL 包含版本号、版本名称、更新类型、下载地址、MD5 校验值、更新内容、是否强制更新、发布时间
3. THE Update_Server SHALL 支持按平台（android/ios）筛选版本
4. THE Update_Server SHALL 支持查询版本下载统计

### Requirement 8: 版本检查响应格式

**User Story:** 作为开发者，我希望版本检查 API 返回标准化的响应格式，便于客户端解析。

#### Acceptance Criteria

1. THE Update_Server SHALL 返回 JSON 格式的版本检查响应
2. WHEN 有可用更新时, THE Update_Server SHALL 返回 has_update: true 和更新详情
3. WHEN 无可用更新时, THE Update_Server SHALL 返回 has_update: false
4. THE Update_Server SHALL 在响应中包含 update_type 字段，值为 "wgt" 或 "apk"
5. FOR ALL 版本检查响应, THE Update_Server SHALL 返回 latest_version、latest_version_code、download_url、file_size、md5、description、is_force_update 字段
