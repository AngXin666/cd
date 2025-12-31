# Requirements Document

## Introduction

为车队长端考勤管理模块添加计件统计页面。该页面与考勤记录页面结构一致，使用相同的司机卡片布局，但将考勤统计（出勤天数、迟到天数、请假天数）替换为计件统计（今日数量、本周数量、本月数量）。统计数据按仓库品类单位显示。

## Glossary

- **Piece_Work_Page**: 计件统计页面，显示司机的计件数据
- **Driver_Card**: 司机卡片组件，显示司机基本信息和统计数据
- **Piece_Work_Stats**: 计件统计数据，包含今日、本周、本月的计件数量
- **Category_Unit**: 仓库品类单位，如"件"、"箱"、"吨"等
- **Manager**: 车队长用户角色

## Requirements

### Requirement 1: 计件页面入口

**User Story:** As a 车队长, I want to 在考勤管理中访问计件统计页面, so that I can 查看司机的计件数据。

#### Acceptance Criteria

1. WHEN 车队长进入考勤管理页面 THEN THE Piece_Work_Page SHALL 作为新的标签页显示在"考勤记录"和"请假审批"之间
2. THE 标签页 SHALL 显示图标"📊"和文字"计件统计"
3. WHEN 点击计件统计标签 THEN THE Piece_Work_Page SHALL 切换显示计件统计内容

### Requirement 2: 司机卡片显示

**User Story:** As a 车队长, I want to 查看每个司机的计件统计, so that I can 了解司机的工作量。

#### Acceptance Criteria

1. THE Driver_Card SHALL 复用考勤页面的司机卡片布局结构
2. THE Driver_Card SHALL 显示司机头像、姓名、手机号、实名状态、司机类型标签
3. THE Driver_Card SHALL 显示入职时间和在职天数
4. WHEN 司机未实名 THEN THE Driver_Card SHALL 显示"未实名"标签

### Requirement 3: 计件统计显示

**User Story:** As a 车队长, I want to 查看司机的今日、本周、本月计件数量, so that I can 评估司机工作表现。

#### Acceptance Criteria

1. THE Piece_Work_Stats SHALL 替换考勤统计区域，按仓库分组显示计件数据
2. WHEN 司机在单个仓库工作 THEN THE Driver_Card SHALL 显示一行计件统计数据
3. WHEN 司机在多个仓库工作 THEN THE Driver_Card SHALL 显示多行计件统计数据，每行对应一个仓库
4. THE 每行计件统计 SHALL 显示仓库名称标签，便于区分不同仓库的数据
5. THE 每行计件统计 SHALL 包含三个统计项：今日数量、本周数量、本月数量
6. THE 统计数值 SHALL 使用对应仓库品类配置的单位显示（从仓库品类配置中读取）

### Requirement 4: 数据筛选

**User Story:** As a 车队长, I want to 只看到我管辖仓库的司机计件数据, so that I can 专注于自己负责的司机。

#### Acceptance Criteria

1. THE Piece_Work_Page SHALL 只显示车队长管辖仓库的司机
2. THE 搜索功能 SHALL 支持按姓名、手机号、拼音首字母搜索
3. WHEN 搜索框为空 THEN THE Piece_Work_Page SHALL 显示所有管辖仓库的司机

### Requirement 5: 操作按钮

**User Story:** As a 车队长, I want to 从计件页面快速访问司机详情, so that I can 查看更多信息。

#### Acceptance Criteria

1. THE Driver_Card SHALL 显示"个人信息"和"车辆管理"两个操作按钮
2. WHEN 司机已实名 THEN THE "个人信息"按钮 SHALL 可点击跳转到司机详情页
3. WHEN 司机未实名 THEN THE "个人信息"按钮 SHALL 显示为禁用状态
4. THE "车辆管理"按钮 SHALL 跳转到司机车辆列表页

### Requirement 6: 统计页脚

**User Story:** As a 车队长, I want to 看到司机总数统计, so that I can 了解管辖范围。

#### Acceptance Criteria

1. THE Piece_Work_Page SHALL 在底部显示"共 X 名司机"的统计信息
2. THE 统计数量 SHALL 反映当前筛选后的司机数量
