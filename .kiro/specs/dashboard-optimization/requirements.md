# Requirements Document

## Introduction

本文档定义了司机端、老板端、车队长端首页仪表盘的减负优化需求。通过分析现有代码，发现三端首页存在大量重复代码、冗余样式和可复用逻辑，需要进行统一优化以提升代码质量和可维护性。

## 现状分析

### 代码规模
- 司机端首页：1581 行
- 老板端首页：1297 行
- 车队长端首页：约 700 行

### 已有共享组件
- `Dashboard` - 数据仪表盘组件（2x2 网格）
- `DriverStats` - 司机实时状态统计组件
- `WarehouseSwitcher` - 仓库切换器组件
- `NotificationBell` - 通知铃铛组件
- `RealNotificationBar` - 实时通知栏组件

### 发现的问题

#### 1. 重复代码问题
- 三端首页存在大量重复的样式代码（欢迎卡片、区块样式、退出登录等约 400 行重复）
- 快捷功能入口样式在多处重复定义（约 100 行重复）
- 司机端仪表盘使用自定义 6 格布局，未复用 Dashboard 组件

#### 2. 过度设计问题
- `warehouse.ts` 工具函数过于复杂（280+ 行），提供了 3 个相似的过滤函数
- `WarehouseFilterOptions` 接口参数过多（10+ 个可选参数），使用复杂
- 每个页面都维护多个 Map（warehouseDataMap、warehouseDriverCountMap 等）

#### 3. 逻辑冗余问题
- 老板端和车队长端首页的 `loadWarehouses` 函数几乎完全相同（100+ 行重复）
- 三端都在 `loadWarehouses` 中并行请求每个仓库的统计数据，造成 N+1 请求问题
- 日期字符串计算（todayStr、monthStartStr）在多处重复

#### 4. 性能问题（记录但暂不处理）
- 每次加载仓库时，会为每个仓库发起 2-3 个 API 请求
- 如果有 10 个仓库，首页加载会发起 20-30 个请求
- 缺少数据缓存机制

## Glossary

- **Dashboard**: 数据仪表盘组件，显示统计数据的网格布局
- **WelcomeCard**: 欢迎卡片组件，显示角色标题和用户名
- **QuickActions**: 快捷功能入口组件，显示功能按钮网格
- **LogoutCard**: 退出登录卡片组件

## 优化策略

本次优化采用扩展策略，在保证功能不变的前提下，提取重复的样式、组件和业务逻辑。

### 实施范围

#### 第一阶段：低风险（样式和纯展示组件）
1. 提取共享 SCSS 样式文件
2. 提取 WelcomeCard、LogoutCard、QuickActions 纯展示组件
3. 简化 warehouse.ts 工具函数（保持向后兼容）

#### 第二阶段：中风险（业务逻辑 Composable）
4. 提取 useHomeStats composable（统计数据加载逻辑）
5. 提取 useWarehouseLoader composable（仓库列表加载逻辑）
6. 提取日期工具函数（todayStr、monthStartStr 计算）

### 暂不实施（高风险）
- 不添加数据缓存机制
- 不修改 API 接口定义
- 不合并 N+1 请求为批量请求

## Requirements

### Requirement 1: 提取共享样式文件

**User Story:** As a 开发者, I want 将重复的样式提取为共享 SCSS 文件, so that 减少样式代码重复。

#### Acceptance Criteria

1. THE 共享样式文件 SHALL 创建在 `src/styles/home-common.scss`
2. THE 共享样式文件 SHALL 包含区块标题样式（section-header、section-title、section-icon、loading-icon）
3. THE 共享样式文件 SHALL 包含加载动画样式（spin 动画）
4. THE 共享样式文件 SHALL 包含卡片渐变背景 mixin（blue、green、orange、purple、teal、red、cyan）
5. THE 共享样式文件 SHALL 包含安全区域样式（safe-area-top）
6. THE 共享样式文件 SHALL 包含徽章样式（badge、badge-count）

### Requirement 2: 提取欢迎卡片组件

**User Story:** As a 开发者, I want 将欢迎卡片提取为共享组件, so that 减少三端首页的重复代码。

#### Acceptance Criteria

1. THE WelcomeCard 组件 SHALL 创建在 `src/components/WelcomeCard/index.vue`
2. THE WelcomeCard 组件 SHALL 接收 title（标题）和 subtitle（副标题）属性
3. THE WelcomeCard 组件 SHALL 使用蓝色渐变背景样式（与现有样式完全一致）
4. THE WelcomeCard 组件 SHALL 支持默认插槽用于右侧内容
5. THE WelcomeCard 组件 SHALL NOT 包含任何业务逻辑

### Requirement 3: 提取退出登录组件

**User Story:** As a 开发者, I want 将退出登录卡片提取为共享组件, so that 统一退出登录的样式和逻辑。

#### Acceptance Criteria

1. THE LogoutCard 组件 SHALL 创建在 `src/components/LogoutCard/index.vue`
2. THE LogoutCard 组件 SHALL 显示红色渐变背景的退出按钮（与现有样式完全一致）
3. WHEN 点击退出按钮时, THE LogoutCard 组件 SHALL 显示确认弹窗
4. WHEN 用户确认退出时, THE LogoutCard 组件 SHALL 调用 userStore.logout() 并跳转到登录页
5. THE LogoutCard 组件 SHALL 复用现有的退出逻辑代码，不做任何修改

### Requirement 4: 提取快捷功能入口组件

**User Story:** As a 开发者, I want 将快捷功能入口提取为共享组件, so that 统一功能按钮的样式。

#### Acceptance Criteria

1. THE QuickActions 组件 SHALL 创建在 `src/components/QuickActions/index.vue`
2. THE QuickActions 组件 SHALL 接收 actions 数组属性（icon、text、color、badge、key）
3. THE QuickActions 组件 SHALL 接收 columns 属性配置列数（默认 2 列）
4. WHEN 点击功能按钮时, THE QuickActions 组件 SHALL 触发 click 事件并传递 action.key
5. THE QuickActions 组件 SHALL 支持显示徽章数量（badge > 0 时显示）
6. THE QuickActions 组件 SHALL NOT 包含页面跳转逻辑（由父组件处理）

### Requirement 5: 简化 warehouse.ts 工具函数

**User Story:** As a 开发者, I want 简化仓库过滤工具函数, so that 减少代码复杂度。

#### Acceptance Criteria

1. THE filterWarehouses 函数 SHALL 合并现有 3 个过滤函数的功能
2. THE filterWarehouses 函数 SHALL 接收简化的选项参数（warehouses、dataMap、driverCountMap、sortMap、sortBy）
3. THE 现有的 filterWarehousesWithData、filterWarehousesWithDrivers、filterWarehousesWithDataOrDrivers 函数 SHALL 保留并调用 filterWarehouses
4. THE 简化 SHALL 保持所有现有调用方式完全兼容
5. THE 简化后的代码 SHALL 减少至少 50 行

### Requirement 6: 应用组件到三端首页

**User Story:** As a 开发者, I want 使用提取的组件重构三端首页, so that 减少代码量。

#### Acceptance Criteria

1. THE 司机端首页 SHALL 使用 WelcomeCard、LogoutCard、QuickActions 组件
2. THE 老板端首页 SHALL 使用 WelcomeCard、LogoutCard 组件
3. THE 车队长端首页 SHALL 使用 WelcomeCard、LogoutCard、QuickActions 组件
4. THE 三端首页 SHALL 引入共享样式文件
5. WHEN 重构完成后, THE 三端首页样式代码 SHALL 减少至少 300 行（合计）

### Requirement 7: 功能和逻辑完整性保障（关键约束）

**User Story:** As a 开发者, I want 确保重构不影响任何已有功能和统计逻辑, so that 用户体验和数据准确性不受影响。

#### Acceptance Criteria

1. THE 重构 SHALL NOT 修改任何 API 调用逻辑和参数
2. THE 重构 SHALL NOT 修改任何统计数据计算逻辑
3. THE 重构 SHALL NOT 修改任何仓库过滤和排序逻辑
4. THE 重构 SHALL NOT 修改任何页面跳转路径和参数
5. THE 重构 SHALL NOT 修改任何 SSE 实时更新逻辑
6. THE 重构 SHALL 保持所有现有的 loading 状态和错误处理逻辑
7. THE 重构后的首页 SHALL 保持原有 UI 样式完全不变

### Requirement 8: 提取统计数据加载 Composable

**User Story:** As a 开发者, I want 将重复的统计数据加载逻辑提取为 composable, so that 减少老板端和车队长端的代码重复。

#### Acceptance Criteria

1. THE useHomeStats composable SHALL 创建在 `src/composables/useHomeStats.ts`
2. THE useHomeStats composable SHALL 封装 loadAttendanceStats 函数逻辑
3. THE useHomeStats composable SHALL 封装 loadPieceWorkStats 函数逻辑
4. THE useHomeStats composable SHALL 接收 warehouseId 参数用于过滤
5. THE useHomeStats composable SHALL 返回 stats 响应式对象和 loading 状态
6. THE useHomeStats composable SHALL 保持与原有函数完全相同的 API 调用和计算逻辑
7. THE 老板端和车队长端首页 SHALL 使用 useHomeStats 替换原有的 loadAttendanceStats 和 loadPieceWorkStats

### Requirement 9: 提取仓库加载 Composable

**User Story:** As a 开发者, I want 将重复的仓库加载逻辑提取为 composable, so that 减少三端首页的代码重复。

#### Acceptance Criteria

1. THE useWarehouseLoader composable SHALL 创建在 `src/composables/useWarehouseLoader.ts`
2. THE useWarehouseLoader composable SHALL 封装 loadWarehouses 函数逻辑
3. THE useWarehouseLoader composable SHALL 返回 warehouses、warehouseDataMap、warehouseDriverCountMap 等响应式对象
4. THE useWarehouseLoader composable SHALL 返回 loading 状态
5. THE useWarehouseLoader composable SHALL 接收配置参数（sortBy、includeDriverCount 等）
6. THE useWarehouseLoader composable SHALL 保持与原有函数完全相同的 API 调用逻辑
7. THE 老板端和车队长端首页 SHALL 使用 useWarehouseLoader 替换原有的 loadWarehouses

### Requirement 10: 提取日期工具函数

**User Story:** As a 开发者, I want 将重复的日期计算逻辑提取为工具函数, so that 减少代码重复并统一日期处理。

#### Acceptance Criteria

1. THE 日期工具函数 SHALL 添加到 `src/utils/date.ts`
2. THE getMonthStartStr 函数 SHALL 返回本月第一天的日期字符串
3. THE getTodayStr 函数 SHALL 返回今天的日期字符串（已存在 getLocalDateString）
4. THE getDateRange 函数 SHALL 返回 { todayStr, monthStartStr } 对象
5. THE 三端首页 SHALL 使用新的日期工具函数替换重复的日期计算代码
