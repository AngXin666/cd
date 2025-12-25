# Requirements Document

## Introduction

本规范定义了 fleet-manager 项目老板端首页与主项目（cdgj-main）老板端首页的布局和功能对齐需求。通过对比分析，发现 fleet-manager 缺失部分功能和布局差异，需要进行对齐以确保两个项目的用户体验一致。

## Glossary

- **fleet-manager**: 基于 UniApp + Vue3 的新版车队管理系统前端项目
- **主项目 (cdgj-main)**: 基于 Taro + React 的原版车队管理系统前端项目
- **老板端 (Boss/Super-Admin)**: 老板/超级管理员角色使用的管理界面
- **司机实时状态**: 显示司机总数、在线、已计件、未计件的统计区域
- **权限管理板块**: 包含用户管理、仓库管理、计件品类、车辆管理的功能入口
- **系统功能板块**: 包含件数报表、考勤管理、通知中心、发送通知的功能入口
- **离线模式**: 网络异常时显示缓存数据并提示用户

## Requirements

### Requirement 1: 添加司机实时状态统计

**User Story:** As a 老板, I want 在首页查看司机的实时状态统计, so that 我能了解司机的工作情况。

#### Acceptance Criteria

1. WHEN 用户访问老板端首页 THEN fleet-manager 系统 SHALL 在仓库切换器下方显示司机实时状态统计区域
2. WHEN 渲染司机状态 THEN fleet-manager 系统 SHALL 使用 4 列网格布局显示总数、在线、已计件、未计件四项数据
3. WHEN 仓库切换 THEN fleet-manager 系统 SHALL 更新司机状态统计为对应仓库的数据
4. WHEN 数据加载中 THEN fleet-manager 系统 SHALL 在标题旁显示加载动画

### Requirement 2: 调整功能入口布局

**User Story:** As a 老板, I want 功能入口按照权限管理和系统功能分类, so that 我能更清晰地找到需要的功能。

#### Acceptance Criteria

1. WHEN 渲染功能入口 THEN fleet-manager 系统 SHALL 将功能分为"权限管理"和"系统功能"两个板块
2. WHEN 渲染权限管理板块 THEN fleet-manager 系统 SHALL 使用 2x2 网格布局显示用户管理、仓库管理、计件品类、车辆管理
3. WHEN 渲染系统功能板块 THEN fleet-manager 系统 SHALL 使用 2x2 网格布局显示件数报表、考勤管理、通知中心、发送通知
4. WHEN 渲染权限管理板块 THEN fleet-manager 系统 SHALL 在右上角显示个人中心入口按钮

### Requirement 3: 添加离线模式提示

**User Story:** As a 用户, I want 在网络异常时看到离线提示, so that 我知道当前数据可能不是最新的。

#### Acceptance Criteria

1. WHEN 网络请求失败且使用缓存数据 THEN fleet-manager 系统 SHALL 在页面顶部显示离线模式提示
2. WHEN 显示离线提示 THEN fleet-manager 系统 SHALL 包含离线图标和提示文字
3. WHEN 网络恢复正常 THEN fleet-manager 系统 SHALL 隐藏离线模式提示

### Requirement 4: 实现下拉刷新

**User Story:** As a 用户, I want 下拉刷新页面数据, so that 我能获取最新的统计信息。

#### Acceptance Criteria

1. WHEN 用户下拉页面 THEN fleet-manager 系统 SHALL 触发数据刷新
2. WHEN 刷新数据 THEN fleet-manager 系统 SHALL 并行刷新所有统计数据
3. WHEN 刷新完成 THEN fleet-manager 系统 SHALL 停止下拉刷新动画

### Requirement 5: 添加加载超时处理

**User Story:** As a 用户, I want 在数据加载超时时看到提示, so that 我知道需要检查网络或重试。

#### Acceptance Criteria

1. WHEN 数据加载超过 8 秒 THEN fleet-manager 系统 SHALL 显示加载超时提示页面
2. WHEN 显示超时提示 THEN fleet-manager 系统 SHALL 包含超时图标、提示文字和重试按钮
3. WHEN 用户点击重试按钮 THEN fleet-manager 系统 SHALL 重新加载数据

### Requirement 6: 移除冗余功能区域

**User Story:** As a 用户, I want 页面布局简洁清晰, so that 我能快速找到需要的功能。

#### Acceptance Criteria

1. WHEN 渲染老板端首页 THEN fleet-manager 系统 SHALL 移除"全局概览"区域（与数据仪表盘功能重复）
2. WHEN 渲染老板端首页 THEN fleet-manager 系统 SHALL 移除"功能菜单"列表区域（功能已整合到系统功能板块）
3. WHEN 渲染老板端首页 THEN fleet-manager 系统 SHALL 保留退出登录按钮在页面底部

### Requirement 7: 添加欢迎通知功能

**User Story:** As a 新用户, I want 首次访问时看到欢迎通知, so that 我能了解系统的主要功能。

#### Acceptance Criteria

1. WHEN 用户首次访问老板端首页 THEN fleet-manager 系统 SHALL 显示欢迎通知
2. WHEN 显示欢迎通知 THEN fleet-manager 系统 SHALL 包含系统介绍和功能提示
3. WHEN 用户再次访问 THEN fleet-manager 系统 SHALL 不再显示欢迎通知

