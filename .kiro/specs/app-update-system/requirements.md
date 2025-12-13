# 应用更新系统需求文档

## Introduction

本文档定义了车队管家应用的强制更新系统需求。该系统将在用户登录后检查应用版本，如果发现新版本，将强制用户下载并安装新的APK。系统利用现有的Supabase后台进行版本管理，无需额外的付费服务。

## Glossary

- **App**: 车队管家移动应用（Capacitor + Taro + React）
- **Supabase**: 现有的后端服务，用于存储版本信息和APK文件
- **Version**: 应用版本号，格式为 `major.minor.patch`（如 `1.0.0`）
- **APK**: Android应用安装包
- **Update Dialog**: 更新提示对话框，显示更新信息并引导用户下载
- **Version Check**: 版本检查过程，比较本地版本与服务器最新版本
- **Force Update**: 强制更新，用户必须更新才能继续使用应用

## Requirements

### Requirement 1

**User Story:** 作为系统管理员，我想要在Supabase中管理应用版本信息，以便控制应用的更新流程。

#### Acceptance Criteria

1. WHEN 系统初始化时 THEN App SHALL 在Supabase中创建 `app_versions` 表用于存储版本信息
2. WHEN 管理员添加新版本时 THEN App SHALL 在 `app_versions` 表中存储版本号、更新说明、APK下载URL、是否强制更新标志和发布时间
3. WHEN 查询最新版本时 THEN App SHALL 返回 `is_active` 为 true 且版本号最高的记录
4. WHEN 版本记录包含APK URL时 THEN App SHALL 验证URL格式为有效的HTTP/HTTPS地址

### Requirement 2

**User Story:** 作为用户，我想要在登录后自动检查应用更新，以便及时获取最新功能和修复。

#### Acceptance Criteria

1. WHEN 用户成功登录时 THEN App SHALL 自动触发版本检查流程
2. WHEN 执行版本检查时 THEN App SHALL 从Supabase获取最新版本信息
3. WHEN 服务器版本高于本地版本时 THEN App SHALL 显示更新对话框
4. WHEN 服务器版本等于或低于本地版本时 THEN App SHALL 允许用户正常进入应用
5. WHEN 版本检查失败时 THEN App SHALL 记录错误日志并允许用户继续使用

### Requirement 3

**User Story:** 作为用户，我想要看到清晰的更新提示，以便了解新版本的改进内容。

#### Acceptance Criteria

1. WHEN 检测到新版本时 THEN App SHALL 显示包含版本号、更新说明和操作按钮的对话框
2. WHEN 更新为强制更新时 THEN App SHALL 隐藏"取消"按钮，仅显示"立即更新"按钮
3. WHEN 更新为可选更新时 THEN App SHALL 显示"稍后提醒"和"立即更新"两个按钮
4. WHEN 用户点击"立即更新"时 THEN App SHALL 打开APK下载链接
5. WHEN 对话框显示时 THEN App SHALL 阻止用户进行其他操作直到处理更新

### Requirement 4

**User Story:** 作为用户，我想要能够下载并安装新版本APK，以便更新应用。

#### Acceptance Criteria

1. WHEN 用户点击"立即更新"时 THEN App SHALL 使用系统浏览器打开APK下载URL
2. WHEN APK下载完成时 THEN Android系统 SHALL 提示用户安装应用
3. WHEN 用户安装新版本后 THEN App SHALL 使用新版本号运行
4. WHEN 下载链接无效时 THEN App SHALL 显示错误提示"下载链接无效，请联系管理员"

### Requirement 5

**User Story:** 作为开发者，我想要在应用中嵌入版本号，以便版本检查系统能够正确比较版本。

#### Acceptance Criteria

1. WHEN 应用构建时 THEN App SHALL 从 `package.json` 读取版本号
2. WHEN 应用启动时 THEN App SHALL 将版本号存储在应用配置中
3. WHEN 执行版本比较时 THEN App SHALL 使用语义化版本比较算法（major.minor.patch）
4. WHEN 比较版本时 THEN App SHALL 正确识别 `1.0.1` 大于 `1.0.0`，`1.1.0` 大于 `1.0.9`

### Requirement 6

**User Story:** 作为系统管理员，我想要能够上传APK文件到Supabase存储，以便用户下载更新。

#### Acceptance Criteria

1. WHEN 管理员上传APK时 THEN Supabase SHALL 将文件存储在 `apk-files` bucket中
2. WHEN APK上传成功时 THEN Supabase SHALL 返回公开访问的下载URL
3. WHEN 创建版本记录时 THEN App SHALL 使用Supabase返回的URL作为下载地址
4. WHEN 用户访问下载URL时 THEN Supabase SHALL 允许未认证用户下载APK文件

### Requirement 7

**User Story:** 作为用户，我想要在强制更新时无法绕过更新对话框，以确保使用最新版本。

#### Acceptance Criteria

1. WHEN 检测到强制更新时 THEN App SHALL 阻止用户关闭更新对话框
2. WHEN 强制更新对话框显示时 THEN App SHALL 禁用返回键和对话框外部点击
3. WHEN 用户尝试关闭强制更新对话框时 THEN App SHALL 保持对话框显示
4. WHEN 用户点击"立即更新"后 THEN App SHALL 打开下载链接并保持对话框显示直到应用退出
