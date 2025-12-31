# Requirements Document

## Introduction

本功能优化仓库管理系统，为仓库添加分类功能。仓库可以分为四种类型：计件、点位、整车、距离，每种类型对应预设的品类单位。系统将限制对应类型仓库的品类只能使用预设单位，确保数据一致性和业务规范。

## Glossary

- **Warehouse**: 仓库，工作地点实体，存储仓库基本信息
- **Warehouse_Type**: 仓库类型，定义仓库的业务分类（计件/点位/整车/距离）
- **Category_Unit**: 品类单位，计件工作的计量单位
- **PieceWorkCategory**: 计件品类，定义计件工作的分类和单价
- **Warehouse_Category_Mapping**: 仓库品类映射，关联仓库与其可用的品类

## Requirements

### Requirement 1: 仓库类型定义

**User Story:** As a 系统管理员, I want to 为仓库定义类型分类, so that 可以规范不同业务场景下的计件单位使用。

#### Acceptance Criteria

1. THE System SHALL support four warehouse types: piece (计件), point (点位), whole (整车), distance (距离)
2. WHEN a warehouse type is "piece" THEN the System SHALL preset the unit as "件"
3. WHEN a warehouse type is "point" THEN the System SHALL preset the unit as "点"
4. WHEN a warehouse type is "whole" THEN the System SHALL preset the unit as "车"
5. WHEN a warehouse type is "distance" THEN the System SHALL preset the unit as "公里"
6. THE System SHALL store the warehouse type as a required field with default value "piece"

### Requirement 2: 仓库编辑页面增强

**User Story:** As a 老板, I want to 在编辑仓库时选择仓库类型, so that 可以为仓库指定正确的业务分类。

#### Acceptance Criteria

1. WHEN editing a warehouse THEN the System SHALL display a type selector with four options
2. WHEN a user selects a warehouse type THEN the System SHALL show the corresponding preset unit
3. WHEN creating a new warehouse THEN the System SHALL default the type to "piece" (计件)
4. WHEN updating a warehouse type THEN the System SHALL validate and save the new type
5. THE Warehouse_Edit_Page SHALL display the current warehouse type clearly

### Requirement 3: 品类单位限制

**User Story:** As a 系统管理员, I want to 限制仓库品类只能使用预设单位, so that 确保数据一致性和业务规范。

#### Acceptance Criteria

1. WHEN a warehouse has type "piece" THEN the System SHALL only allow categories with unit "件"
2. WHEN a warehouse has type "point" THEN the System SHALL only allow categories with unit "点"
3. WHEN a warehouse has type "whole" THEN the System SHALL only allow categories with unit "车"
4. WHEN a warehouse has type "distance" THEN the System SHALL only allow categories with unit "公里"
5. WHEN creating a piece work record THEN the System SHALL validate the category unit matches the warehouse type
6. IF a user attempts to use a category with mismatched unit THEN the System SHALL reject the operation and display an error message

### Requirement 4: 仓库品类关联

**User Story:** As a 老板, I want to 为仓库关联可用的品类, so that 司机在该仓库只能选择合适的品类进行计件。

#### Acceptance Criteria

1. THE System SHALL allow associating multiple categories to a warehouse
2. WHEN associating a category to a warehouse THEN the System SHALL validate the category unit matches the warehouse type
3. WHEN a driver records piece work THEN the System SHALL only show categories associated with the selected warehouse
4. IF no categories are associated with a warehouse THEN the System SHALL show all categories matching the warehouse type unit

### Requirement 5: 数据迁移

**User Story:** As a 系统管理员, I want to 现有仓库数据平滑迁移, so that 不影响现有业务运行。

#### Acceptance Criteria

1. WHEN migrating existing warehouses THEN the System SHALL set default type as "piece" (计件)
2. THE Migration SHALL preserve all existing warehouse data and relationships
3. THE Migration SHALL not disrupt existing piece work records

### Requirement 6: 数据统计单位显示

**User Story:** As a 管理员, I want to 在所有数据统计页面自动显示对应仓库类型的单位, so that 统计数据更加直观准确。

#### Acceptance Criteria

1. WHEN displaying piece work statistics THEN the System SHALL show the unit based on warehouse type
2. WHEN a warehouse type is "piece" THEN the Statistics_Page SHALL display quantities with unit "件"
3. WHEN a warehouse type is "point" THEN the Statistics_Page SHALL display quantities with unit "点"
4. WHEN a warehouse type is "whole" THEN the Statistics_Page SHALL display quantities with unit "车"
5. WHEN a warehouse type is "distance" THEN the Statistics_Page SHALL display quantities with unit "公里"
6. WHEN aggregating statistics across multiple warehouses THEN the System SHALL group by warehouse type and display respective units
7. THE Statistics_Export SHALL include the correct unit in exported data

### Requirement 7: API 接口更新

**User Story:** As a 开发者, I want to 通过 API 管理仓库类型, so that 前端可以正确显示和操作仓库分类。

#### Acceptance Criteria

1. THE Warehouse_API SHALL include warehouse_type field in create/update/get operations
2. THE Warehouse_API SHALL return the preset unit based on warehouse type
3. WHEN querying warehouses THEN the System SHALL support filtering by warehouse type
4. THE PieceWorkCategory_API SHALL support filtering categories by unit
5. THE Statistics_API SHALL return unit information based on warehouse type
