# Requirements Document

## Introduction

本规范定义了 fleet-manager 项目（UniApp + Vue3）与主项目（Taro + React）之间 UI 布局和功能一致性的需求。目标是确保两个项目的车队长端和老板端页面在视觉风格、布局结构和功能完整性上保持一致，提供统一的用户体验。

## Glossary

- **fleet-manager**: 基于 UniApp + Vue3 的新版车队管理系统前端项目
- **主项目**: 基于 Taro + React 的原版车队管理系统前端项目
- **车队长端 (Manager)**: 车队长角色使用的管理界面
- **老板端 (Boss)**: 老板/超级管理员角色使用的管理界面
- **数据仪表盘**: 首页显示的统计数据卡片区域
- **仓库切换器**: 允许用户在多个仓库之间切换的 Swiper 组件
- **通知铃铛**: 显示未读通知数量的图标组件
- **实时通知栏**: 滚动显示最新通知的横幅组件
- **司机实时状态**: 显示司机总数、在线、已计件、未计件的统计区域

## Requirements

### Requirement 1: 颜色主题统一

**User Story:** As a 用户, I want 两个项目使用相同的颜色主题, so that 我在不同平台上获得一致的视觉体验。

#### Acceptance Criteria

1. WHEN 用户访问车队长端首页 THEN fleet-manager 系统 SHALL 使用蓝色渐变主题（#1E3A8A 到 #1D4ED8）替代当前的绿色主题
2. WHEN 用户访问老板端首页 THEN fleet-manager 系统 SHALL 使用蓝色渐变主题（#1E3A8A 到 #1D4ED8）替代当前的紫色主题
3. WHEN 渲染欢迎卡片 THEN fleet-manager 系统 SHALL 应用与主项目相同的蓝色渐变背景样式

### Requirement 2: 通知铃铛组件

**User Story:** As a 车队长或老板, I want 在首页看到通知铃铛, so that 我能快速了解未读通知数量。

#### Acceptance Criteria

1. WHEN 用户访问首页 THEN fleet-manager 系统 SHALL 在欢迎卡片右下角显示通知铃铛图标
2. WHEN 存在未读通知 THEN fleet-manager 系统 SHALL 在通知铃铛上显示未读数量徽章
3. WHEN 用户点击通知铃铛 THEN fleet-manager 系统 SHALL 跳转到通知列表页面
4. WHEN 未读通知数量超过 99 THEN fleet-manager 系统 SHALL 显示 "99+" 文本

### Requirement 3: 实时通知栏组件

**User Story:** As a 用户, I want 在首页看到滚动的实时通知, so that 我能及时了解最新动态。

#### Acceptance Criteria

1. WHEN 用户访问首页 THEN fleet-manager 系统 SHALL 在欢迎卡片下方显示实时通知栏
2. WHEN 存在多条通知 THEN fleet-manager 系统 SHALL 自动滚动显示通知内容
3. WHEN 用户点击通知栏 THEN fleet-manager 系统 SHALL 跳转到对应的详情页面
4. WHEN 无通知内容 THEN fleet-manager 系统 SHALL 隐藏通知栏组件

### Requirement 4: 仓库切换器组件

**User Story:** As a 车队长, I want 在首页切换不同仓库, so that 我能查看不同仓库的数据。

#### Acceptance Criteria

1. WHEN 用户分配了多个仓库 THEN fleet-manager 系统 SHALL 显示 Swiper 滑动切换器
2. WHEN 用户滑动切换仓库 THEN fleet-manager 系统 SHALL 更新数据仪表盘显示对应仓库的数据
3. WHEN 用户只有一个仓库 THEN fleet-manager 系统 SHALL 显示单个仓库卡片而非切换器
4. WHEN 用户没有分配仓库 THEN fleet-manager 系统 SHALL 显示"暂无分配仓库"提示

### Requirement 5: 数据仪表盘布局统一

**User Story:** As a 用户, I want 数据仪表盘使用统一的 2x2 网格布局, so that 我能快速浏览关键数据。

#### Acceptance Criteria

1. WHEN 渲染数据仪表盘 THEN fleet-manager 系统 SHALL 使用 2x2 网格布局显示四个统计卡片
2. WHEN 显示统计卡片 THEN fleet-manager 系统 SHALL 包含今天出勤、今天总件数、待审批、本月完成件数四项数据
3. WHEN 用户点击统计卡片 THEN fleet-manager 系统 SHALL 跳转到对应的详情页面
4. WHEN 数据加载中 THEN fleet-manager 系统 SHALL 显示加载动画

### Requirement 6: 司机实时状态统计

**User Story:** As a 车队长, I want 查看司机的实时状态统计, so that 我能了解司机的工作情况。

#### Acceptance Criteria

1. WHEN 用户访问车队长首页 THEN fleet-manager 系统 SHALL 显示司机实时状态统计区域
2. WHEN 渲染司机状态 THEN fleet-manager 系统 SHALL 显示总数、在线、已计件、未计件四项数据
3. WHEN 数据更新 THEN fleet-manager 系统 SHALL 实时刷新司机状态统计
4. WHEN 用户点击司机状态区域 THEN fleet-manager 系统 SHALL 跳转到司机管理页面

### Requirement 7: 图标风格统一

**User Story:** As a 用户, I want 看到统一风格的图标, so that 界面看起来更专业。

#### Acceptance Criteria

1. WHEN 渲染功能图标 THEN fleet-manager 系统 SHALL 使用 UnoCSS 图标库（i-mdi-*）替代 Emoji 图标
2. WHEN 显示快捷功能 THEN fleet-manager 系统 SHALL 使用与主项目相同的图标样式
3. WHEN 渲染统计卡片图标 THEN fleet-manager 系统 SHALL 使用 Material Design Icons

### Requirement 8: 缺失页面补充

**User Story:** As a 用户, I want 访问所有功能页面, so that 我能完成所有管理操作。

#### Acceptance Criteria

1. WHEN 用户需要查看件数详情 THEN fleet-manager 系统 SHALL 提供件数报表详情页面
2. WHEN 用户需要配置仓库品类 THEN fleet-manager 系统 SHALL 提供仓库品类配置页面
3. WHEN 用户需要编辑仓库信息 THEN fleet-manager 系统 SHALL 提供仓库编辑页面
4. WHEN 用户需要编辑车辆租金 THEN fleet-manager 系统 SHALL 提供车辆租金编辑页面
5. WHEN 用户需要查看请假详情 THEN fleet-manager 系统 SHALL 提供请假详情页面

### Requirement 9: 顶部导航栏组件

**User Story:** As a 用户, I want 看到顶部导航栏, so that 我能快速访问常用功能。

#### Acceptance Criteria

1. WHEN 用户访问首页 THEN fleet-manager 系统 SHALL 在安全区域下方显示顶部导航栏
2. WHEN 渲染导航栏 THEN fleet-manager 系统 SHALL 显示页面标题和操作按钮
3. WHEN 用户点击导航栏按钮 THEN fleet-manager 系统 SHALL 执行对应的操作

### Requirement 10: 快捷功能布局统一

**User Story:** As a 用户, I want 快捷功能使用统一的网格布局, so that 我能快速找到需要的功能。

#### Acceptance Criteria

1. WHEN 渲染车队长端快捷功能 THEN fleet-manager 系统 SHALL 使用 2x3 网格布局
2. WHEN 渲染老板端快捷功能 THEN fleet-manager 系统 SHALL 使用 2x4 网格布局
3. WHEN 用户点击快捷功能 THEN fleet-manager 系统 SHALL 跳转到对应的功能页面
4. WHEN 功能有待处理项 THEN fleet-manager 系统 SHALL 在图标上显示数量徽章
