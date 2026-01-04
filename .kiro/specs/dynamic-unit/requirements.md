# Requirements Document

## Introduction

本需求文档描述计件品类动态计量单位功能。计件录入页面的单位标签应根据当前选择的仓库类型动态显示。单位完全由仓库类型决定，品类不需要独立的 unit 字段。

## Glossary

- **Piece_Work_Entry**: 计件录入页面，司机用于录入计件记录的界面
- **Warehouse**: 仓库，包含类型信息，决定计量单位
- **Warehouse_Type**: 仓库类型枚举（piece/point/whole/distance）
- **Category**: 计件品类，从属于仓库，包含名称和单价

## 仓库类型与单位映射

| 仓库类型 | 枚举值 | 单位 | 数量标签 | 单价标签 |
|---------|--------|------|---------|---------|
| 计件 | piece | 件 | 件数 | 元/件 |
| 点位 | point | 点 | 点数 | 元/点 |
| 整车 | whole | 车 | 车数 | 元/车 |
| 距离 | distance | 公里 | 公里数 | 元/公里 |
| 自定义 | custom | (老板设置) | (老板设置)数 | 元/(老板设置) |

注意：自定义类型需要老板在创建/编辑仓库时手动设置单位名称，不提供默认值。

## Requirements

### Requirement 1: 进入计件页面自动加载品类

**User Story:** As a 司机, I want to 进入计件页面时自动加载当前仓库的品类, so that 我能直接开始录入计件记录。

#### Acceptance Criteria

1. WHEN 司机进入计件录入页面 THEN THE Piece_Work_Entry SHALL 检测当前选择的仓库
2. WHEN 检测到当前仓库 THEN THE Piece_Work_Entry SHALL 自动读取该仓库的品类列表
3. WHEN 读取品类成功 THEN THE Piece_Work_Entry SHALL 根据仓库类型显示对应的单位标签

### Requirement 2: 切换仓库重新加载品类

**User Story:** As a 司机, I want to 切换仓库后自动重新加载品类, so that 我能看到新仓库的品类和正确的单位。

#### Acceptance Criteria

1. WHEN 司机在计件页面切换仓库 THEN THE Piece_Work_Entry SHALL 清空当前品类选择
2. WHEN 仓库切换完成 THEN THE Piece_Work_Entry SHALL 重新读取新仓库的品类列表
3. WHEN 新品类加载完成 THEN THE Piece_Work_Entry SHALL 根据新仓库类型更新所有单位标签

### Requirement 3: 单位标签动态显示

**User Story:** As a 司机, I want to 看到与仓库类型匹配的单位标签, so that 我能清楚地知道应该输入什么类型的数量。

#### Acceptance Criteria

1. WHEN 当前仓库类型为 piece THEN THE Piece_Work_Entry SHALL 显示"件数"和"元/件"
2. WHEN 当前仓库类型为 point THEN THE Piece_Work_Entry SHALL 显示"点数"和"元/点"
3. WHEN 当前仓库类型为 whole THEN THE Piece_Work_Entry SHALL 显示"车数"和"元/车"
4. WHEN 当前仓库类型为 distance THEN THE Piece_Work_Entry SHALL 显示"公里数"和"元/公里"
5. WHEN 当前仓库类型为 custom THEN THE Piece_Work_Entry SHALL 显示老板设置的自定义单位
6. IF 仓库类型为 custom 但未设置自定义单位 THEN THE Piece_Work_Entry SHALL 提示"请先设置单位"并禁止录入

### Requirement 4: 自定义单位设置

**User Story:** As a 老板, I want to 为自定义类型仓库设置单位名称, so that 我可以支持特殊业务场景。

#### Acceptance Criteria

1. WHEN 老板创建或编辑仓库时选择 custom 类型 THEN THE System SHALL 显示单位名称输入框
2. WHEN 老板保存 custom 类型仓库 THEN THE System SHALL 验证单位名称不为空
3. IF 单位名称为空 THEN THE System SHALL 阻止保存并提示"请输入单位名称"

### Requirement 5: 移除品类 unit 字段依赖

**User Story:** As a 开发者, I want to 单位完全由仓库类型决定, so that 不需要维护品类级别的 unit 字段。

#### Acceptance Criteria

1. THE Category SHALL NOT 使用独立的 unit 字段来决定显示单位
2. THE Piece_Work_Entry SHALL 仅通过仓库类型获取单位信息
3. WHEN 显示品类信息 THEN THE Piece_Work_Entry SHALL 从仓库类型映射获取单位，而非品类字段
