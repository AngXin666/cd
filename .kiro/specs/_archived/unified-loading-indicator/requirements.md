# Requirements Document

## Introduction

本功能旨在统一项目中所有页面的加载指示器样式，使用深色半透明背景配合圆形旋转图标和"加载中..."文字的设计，替换现有的各种不同样式的加载组件，提供一致的用户体验。

## Glossary

- **Loading Indicator（加载指示器）**：在数据加载或操作执行期间显示的视觉反馈组件
- **Toast Loading**：Taro 原生的 showLoading API 显示的加载提示
- **Spinner（旋转器）**：圆形旋转动画图标
- **Overlay（遮罩层）**：覆盖在页面内容上的半透明背景层

## Requirements

### Requirement 1

**User Story:** 作为用户，我希望在所有页面加载时看到统一风格的加载指示器，以便获得一致的视觉体验。

#### Acceptance Criteria

1. WHEN 任何页面或组件触发加载状态 THEN 系统 SHALL 显示统一的深色半透明背景加载弹窗
2. WHEN 加载指示器显示时 THEN 系统 SHALL 在弹窗中央显示白色圆形旋转图标
3. WHEN 加载指示器显示时 THEN 系统 SHALL 在旋转图标下方显示"加载中..."文字
4. WHEN 加载完成或取消时 THEN 系统 SHALL 立即隐藏加载指示器

### Requirement 2

**User Story:** 作为开发者，我希望有一个统一的加载组件 API，以便在所有页面中方便地使用。

#### Acceptance Criteria

1. WHEN 开发者调用 showLoading 函数 THEN 系统 SHALL 显示统一样式的加载指示器
2. WHEN 开发者调用 hideLoading 函数 THEN 系统 SHALL 隐藏当前显示的加载指示器
3. WHEN 开发者使用 Loading 组件 THEN 系统 SHALL 支持 fullscreen 属性以显示全屏加载
4. WHEN 开发者传入自定义 tip 参数 THEN 系统 SHALL 显示自定义的提示文字

### Requirement 3

**User Story:** 作为用户，我希望加载指示器的样式与图片中展示的一致，以便获得专业的视觉效果。

#### Acceptance Criteria

1. WHEN 加载指示器显示时 THEN 系统 SHALL 使用深灰色（#4a4a4a）圆角矩形作为弹窗背景
2. WHEN 加载指示器显示时 THEN 系统 SHALL 使用白色圆环作为旋转图标
3. WHEN 加载指示器显示时 THEN 系统 SHALL 使用白色文字显示"加载中..."
4. WHEN 加载指示器显示时 THEN 系统 SHALL 在弹窗外部显示半透明黑色遮罩

### Requirement 4

**User Story:** 作为开发者，我希望移除项目中所有旧的加载样式，以便保持代码一致性。

#### Acceptance Criteria

1. WHEN 项目中存在使用 Taro.showLoading 的代码 THEN 系统 SHALL 替换为统一的 showLoading 函数
2. WHEN 项目中存在自定义的加载图标样式 THEN 系统 SHALL 替换为统一的 Loading 组件
3. WHEN 项目中存在 i-mdi-loading 图标 THEN 系统 SHALL 替换为统一的圆环旋转图标
