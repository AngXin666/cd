# Requirements Document - 返回导航优化

## Introduction

本需求文档定义了应用返回导航行为的优化方案。目标是实现统一、流畅的返回导航体验：
- 所有页面可以正常返回到上一页，无任何提示
- 工作台页面（首页）阻止应用内返回，用户需使用系统手势退出应用
- 优先使用平台原生的手势控制，而非自定义监听器

## Glossary

- **工作台页面（Dashboard）**：应用的主页面，包括司机工作台、管理员工作台、老板工作台
- **TabBar 页面**：底部导航栏页面，包括 `pages/index/index` 和 `pages/profile/index`
- **普通页面**：非 TabBar 页面，通过 `navigateTo` 跳转的页面
- **返回手势**：用户通过物理返回键、左滑手势或浏览器返回按钮触发的返回操作
- **系统手势退出**：用户使用系统级手势（如 Android 的 Home 键、任务管理器）退出应用

## Requirements

### Requirement 1

**User Story:** As a 用户, I want 在普通页面按返回键时直接返回上一页, so that 我可以快速导航回之前的页面。

#### Acceptance Criteria

1. WHEN 用户在普通页面触发返回操作 THEN 系统 SHALL 直接返回上一页而不显示任何提示
2. WHEN 用户在普通页面连续返回 THEN 系统 SHALL 依次返回页面栈中的上一页直到工作台
3. WHEN 页面栈只剩工作台页面时 THEN 系统 SHALL 停止返回并阻止继续返回

### Requirement 2

**User Story:** As a 用户, I want 在工作台页面按返回键时不会退出应用, so that 我需要使用系统手势才能退出。

#### Acceptance Criteria

1. WHEN 用户在工作台页面触发返回操作 THEN 系统 SHALL 阻止返回并静默处理（不显示提示、不退出应用）
2. WHEN 用户想要退出应用 THEN 用户 SHALL 使用系统手势（Home 键、任务管理器等）退出
3. WHEN 用户在工作台页面多次触发返回操作 THEN 系统 SHALL 始终阻止返回（不累计、不退出）

### Requirement 3

**User Story:** As a 开发者, I want 使用平台原生的导航控制而非自定义监听器, so that 导航行为更加稳定和符合平台规范。

#### Acceptance Criteria

1. WHEN 在 Android 环境运行 THEN 系统 SHALL 使用 Capacitor App 插件的 backButton 事件处理返回
2. WHEN 在 H5 环境运行 THEN 系统 SHALL 使用 History API 管理页面历史
3. WHEN 在小程序环境运行 THEN 系统 SHALL 使用 Taro 的页面配置处理返回

### Requirement 4

**User Story:** As a 用户, I want 返回导航行为在所有平台保持一致, so that 我在不同设备上有相同的使用体验。

#### Acceptance Criteria

1. WHEN 在 Android APP 中使用 THEN 系统 SHALL 响应物理返回键并在工作台阻止返回
2. WHEN 在 H5 浏览器中使用 THEN 系统 SHALL 响应浏览器返回按钮并在工作台阻止返回
3. WHEN 在微信小程序中使用 THEN 系统 SHALL 响应导航栏返回按钮并在工作台阻止返回

### Requirement 5

**User Story:** As a 用户, I want 工作台页面包括所有角色的首页, so that 不同角色用户都有一致的返回体验。

#### Acceptance Criteria

1. WHEN 用户角色为司机且在 `/pages/driver/index` 页面 THEN 系统 SHALL 阻止返回
2. WHEN 用户角色为管理员且在 `/pages/manager/index` 页面 THEN 系统 SHALL 阻止返回
3. WHEN 用户角色为老板且在 `/pages/super-admin/index` 页面 THEN 系统 SHALL 阻止返回
4. WHEN 用户在 `/pages/index/index` 路由分发页面 THEN 系统 SHALL 阻止返回
5. WHEN 用户在 `/pages/profile/index` 个人中心页面 THEN 系统 SHALL 阻止返回（TabBar 页面）
