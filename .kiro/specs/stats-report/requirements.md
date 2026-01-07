# Requirements Document

## Introduction

本功能为车队管理系统添加数据统计报表功能，支持老板端和车队长端查看日报、周报、月报。报表以仓库卡片形式展示，支持层级钻取：仓库 → 司机 → 计件记录。

## Glossary

- **Report_System**: 报表系统，负责生成和展示统计报表
- **Warehouse_Card**: 仓库卡片，展示单个仓库的统计数据
- **Driver_Card**: 司机卡片，展示单个司机的统计数据
- **Report_Period**: 报表周期，包括日报、周报、月报三种类型
- **Tab_View**: 标签页视图，用于切换不同周期的报表

## Requirements

### Requirement 1: 报表入口

**User Story:** As a 老板/车队长, I want to 从数据统计页面进入报表功能, so that I can 查看各周期的统计报表。

#### Acceptance Criteria

1. WHEN 老板点击数据统计页面的"报表"入口 THEN THE Report_System SHALL 跳转到报表页面
2. WHEN 车队长点击数据统计页面的"报表"入口 THEN THE Report_System SHALL 跳转到报表页面
3. THE Report_System SHALL 在老板端和车队长端复用同一个报表页面组件

### Requirement 2: 报表周期切换

**User Story:** As a 用户, I want to 在日报、周报、月报之间切换, so that I can 查看不同时间维度的统计数据。

#### Acceptance Criteria

1. THE Tab_View SHALL 显示三个标签页：日报、周报、月报
2. WHEN 用户点击日报标签 THEN THE Report_System SHALL 显示当天的统计数据
3. WHEN 用户点击周报标签 THEN THE Report_System SHALL 显示本周（周一至今天）的统计数据
4. WHEN 用户点击月报标签 THEN THE Report_System SHALL 显示本月（1号至今天）的统计数据
5. THE Tab_View SHALL 默认选中日报标签
6. WHEN 用户切换标签页 THEN THE Report_System SHALL 高亮当前选中的标签

### Requirement 3: 仓库卡片展示

**User Story:** As a 用户, I want to 以卡片形式查看各仓库的统计数据, so that I can 快速了解各仓库的业绩情况。

#### Acceptance Criteria

1. THE Warehouse_Card SHALL 显示仓库名称
2. THE Warehouse_Card SHALL 显示该仓库在当前周期内的总件数（使用仓库预设单位）
3. THE Warehouse_Card SHALL 显示该仓库在当前周期内的司机人数
4. WHEN 仓库无数据时 THEN THE Report_System SHALL 显示"暂无数据"提示
5. THE Report_System SHALL 按总件数降序排列仓库卡片
6. WHILE 数据加载中 THEN THE Report_System SHALL 显示加载状态

### Requirement 4: 仓库详情（司机列表）

**User Story:** As a 用户, I want to 点击仓库卡片查看该仓库的司机统计, so that I can 了解各司机的业绩贡献。

#### Acceptance Criteria

1. WHEN 用户点击仓库卡片 THEN THE Report_System SHALL 跳转到仓库详情页面
2. THE Report_System SHALL 在仓库详情页面显示仓库名称和当前周期
3. THE Driver_Card SHALL 显示司机姓名
4. THE Driver_Card SHALL 显示该司机在当前周期内的总件数（使用仓库预设单位）
5. THE Driver_Card SHALL 显示该司机在当前周期内的记录条数
6. THE Report_System SHALL 按总件数降序排列司机卡片
7. WHEN 仓库无司机数据时 THEN THE Report_System SHALL 显示"暂无司机数据"提示

### Requirement 5: 司机详情（计件记录）

**User Story:** As a 用户, I want to 点击司机卡片查看该司机的计件记录, so that I can 了解具体的计件明细。

#### Acceptance Criteria

1. WHEN 用户点击司机卡片 THEN THE Report_System SHALL 跳转到司机计件记录页面
2. THE Report_System SHALL 在司机计件记录页面显示司机姓名、仓库名称和当前周期
3. THE Report_System SHALL 显示该司机在当前周期内的所有计件记录
4. FOR EACH 计件记录 THE Report_System SHALL 显示工作日期、品类名称、数量
5. THE Report_System SHALL 按工作日期降序排列计件记录
6. WHEN 司机无计件记录时 THEN THE Report_System SHALL 显示"暂无计件记录"提示
7. THE Report_System SHALL 在页面顶部显示统计汇总（总件数）

### Requirement 6: 权限控制

**User Story:** As a 系统管理员, I want to 根据用户角色控制数据访问范围, so that 数据安全得到保障。

#### Acceptance Criteria

1. WHEN 老板访问报表 THEN THE Report_System SHALL 显示所有仓库的数据
2. WHEN 车队长访问报表 THEN THE Report_System SHALL 只显示其管辖仓库的数据
3. IF 用户无权限访问某仓库 THEN THE Report_System SHALL 不显示该仓库的卡片

### Requirement 7: 日期导航

**User Story:** As a 用户, I want to 查看历史周期的报表, so that I can 对比不同时期的业绩。

#### Acceptance Criteria

1. THE Report_System SHALL 显示当前查看的日期/周/月
2. WHEN 用户点击"上一天/周/月"按钮 THEN THE Report_System SHALL 切换到上一个周期
3. WHEN 用户点击"下一天/周/月"按钮 THEN THE Report_System SHALL 切换到下一个周期
4. IF 下一个周期超过今天 THEN THE Report_System SHALL 禁用"下一天/周/月"按钮
5. THE Report_System SHALL 在切换周期后自动刷新数据
