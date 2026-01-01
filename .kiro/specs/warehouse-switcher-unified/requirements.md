# Requirements Document

## Introduction

统一整个项目中仓库切换器的显示逻辑，确保各端（司机端、车队长端、老板端）的仓库切换器行为一致且合理。核心原则是：只显示有意义的仓库选项，避免显示空数据的仓库。

## Glossary

- **Warehouse_Switcher**: 仓库切换器组件，用于在多仓库场景下切换当前选中的仓库
- **Driver_Page**: 司机端页面，包括首页、计件录入等
- **Manager_Page**: 车队长端页面，包括首页、司机管理、考勤管理等
- **Boss_Page**: 老板端页面，包括首页、用户管理、考勤管理等
- **User_Management_Page**: 用户管理页面（车队长端/老板端），用于管理司机和管理员
- **Data_Page**: 数据页面，如计件统计、考勤统计等
- **Valid_Warehouse**: 有效仓库，指有数据或有司机的仓库

## Requirements

### Requirement 1: 仓库切换器显示条件

**User Story:** 作为用户，我希望仓库切换器只在有多个有效仓库时显示，这样可以避免不必要的界面元素。

#### Acceptance Criteria

1. WHEN 用户只有一个有效仓库时 THEN THE Warehouse_Switcher SHALL 不显示
2. WHEN 用户有多个仓库但只有一个仓库有数据时 THEN THE Warehouse_Switcher SHALL 不显示
3. WHEN 用户有多个仓库且至少两个仓库有数据时 THEN THE Warehouse_Switcher SHALL 显示

### Requirement 2: 司机端仓库切换器逻辑

**User Story:** 作为司机，我希望仓库切换器只显示有计件数据的仓库，这样可以快速找到我工作的仓库。

#### Acceptance Criteria

1. WHEN 司机被分配多个仓库 THEN THE Driver_Page SHALL 只显示有计件数据的仓库
2. WHEN 司机只有一个仓库有计件数据 THEN THE Warehouse_Switcher SHALL 不显示
3. WHEN 司机有多个仓库有计件数据 THEN THE Warehouse_Switcher SHALL 显示这些仓库

### Requirement 3: 车队长端数据页面仓库切换器逻辑

**User Story:** 作为车队长，我希望数据页面的仓库切换器只显示有数据或有司机的仓库，这样可以避免查看空仓库。

#### Acceptance Criteria

1. WHEN 车队长管辖多个仓库 THEN THE Manager_Page SHALL 只显示有数据或有司机的仓库
2. WHEN 仓库有司机但没有数据 THEN THE Warehouse_Switcher SHALL 显示该仓库
3. WHEN 仓库有数据但没有司机 THEN THE Warehouse_Switcher SHALL 显示该仓库
4. WHEN 仓库既没有司机也没有数据 THEN THE Warehouse_Switcher SHALL 不显示该仓库

### Requirement 4: 老板端数据页面仓库切换器逻辑

**User Story:** 作为老板，我希望数据页面的仓库切换器逻辑与车队长端一致，这样可以保持一致的用户体验。

#### Acceptance Criteria

1. WHEN 老板查看数据页面 THEN THE Boss_Page SHALL 使用与车队长端相同的仓库过滤逻辑
2. WHEN 仓库有司机但没有数据 THEN THE Warehouse_Switcher SHALL 显示该仓库
3. WHEN 仓库有数据但没有司机 THEN THE Warehouse_Switcher SHALL 显示该仓库
4. WHEN 仓库既没有司机也没有数据 THEN THE Warehouse_Switcher SHALL 不显示该仓库

### Requirement 5: 用户管理页面仓库切换器逻辑

**User Story:** 作为车队长或老板，我希望用户管理页面的仓库切换器只显示有司机的仓库，这样可以避免查看空仓库。

#### Acceptance Criteria

1. WHEN 在用户管理页面查看司机列表 THEN THE User_Management_Page SHALL 只显示有司机的仓库
2. WHEN 仓库没有分配任何司机 THEN THE Warehouse_Switcher SHALL 不显示该仓库
3. WHEN 有未分配仓库的司机 THEN THE Warehouse_Switcher SHALL 显示"未分配"选项

### Requirement 6: 统一工具函数

**User Story:** 作为开发者，我希望有统一的工具函数来处理仓库过滤逻辑，这样可以避免代码重复和逻辑不一致。

#### Acceptance Criteria

1. THE System SHALL 提供 `filterWarehousesWithData` 函数用于过滤有数据的仓库
2. THE System SHALL 提供 `filterWarehousesWithDrivers` 函数用于过滤有司机的仓库
3. THE System SHALL 提供 `shouldShowWarehouseSwitcher` 函数用于判断是否显示仓库切换器
4. WHEN 调用过滤函数 THEN THE System SHALL 返回过滤后的仓库列表

### Requirement 7: 清理冗余代码

**User Story:** 作为开发者，我希望清理各页面中重复的仓库过滤逻辑，这样可以保持代码整洁。

#### Acceptance Criteria

1. WHEN 重构完成后 THEN THE System SHALL 移除各页面中重复的仓库过滤逻辑
2. WHEN 重构完成后 THEN THE System SHALL 使用统一的工具函数替代原有逻辑
3. WHEN 重构完成后 THEN THE System SHALL 确保所有页面行为与重构前一致
