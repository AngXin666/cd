# Requirements Document

## Introduction

本规范定义了车辆验证逻辑的测试需求。车辆验证是系统中的核心业务逻辑，用于判断车辆是否有效、是否可以还车、是否处于活跃状态等。这些逻辑已被统一提取到 `utils/vehicle.ts` 模块中，需要通过属性测试验证其正确性。

## Glossary

- **Vehicle_Validation_System**: 车辆验证系统，提供车辆状态判断的工具函数
- **Valid_Vehicle**: 有效车辆，满足：有非空车牌号 AND 状态为 ACTIVE 或 PICKED_UP
- **Active_Vehicle**: 活跃车辆，满足：状态为 ACTIVE 或 PICKED_UP AND 尚未还车
- **Returnable_Vehicle**: 可还车车辆，满足：有效车辆 AND 尚未还车 AND 审核已通过
- **VehicleStatus**: 车辆状态枚举，包含 ACTIVE、PICKED_UP、RETURNED、REVIEWING

## Requirements

### Requirement 1: 有效车辆判断 (isValidVehicle)

**User Story:** As a 系统开发者, I want to 统一判断车辆是否有效, so that 所有页面使用一致的业务逻辑。

#### Acceptance Criteria

1. WHEN 车辆有非空车牌号且状态为 ACTIVE THEN Vehicle_Validation_System SHALL 返回 true
2. WHEN 车辆有非空车牌号且状态为 PICKED_UP THEN Vehicle_Validation_System SHALL 返回 true
3. WHEN 车辆车牌号为空字符串 THEN Vehicle_Validation_System SHALL 返回 false
4. WHEN 车辆车牌号仅包含空白字符 THEN Vehicle_Validation_System SHALL 返回 false
5. WHEN 车辆状态为 RETURNED THEN Vehicle_Validation_System SHALL 返回 false
6. WHEN 车辆状态为 REVIEWING THEN Vehicle_Validation_System SHALL 返回 false

### Requirement 2: 可还车判断 (canReturnVehicle)

**User Story:** As a 系统开发者, I want to 统一判断车辆是否可以还车, so that 还车按钮的显示逻辑一致。

#### Acceptance Criteria

1. WHEN 车辆有效且未还车且审核已通过 THEN Vehicle_Validation_System SHALL 返回 true
2. WHEN 车辆无效（无车牌或状态不对）THEN Vehicle_Validation_System SHALL 返回 false
3. WHEN 车辆已有还车时间 THEN Vehicle_Validation_System SHALL 返回 false
4. WHEN 车辆审核状态不是 approved THEN Vehicle_Validation_System SHALL 返回 false

### Requirement 3: 活跃车辆判断 (isActiveVehicle)

**User Story:** As a 系统开发者, I want to 判断车辆是否处于活跃使用状态, so that 可以正确筛选车辆列表。

#### Acceptance Criteria

1. WHEN 车辆状态为 ACTIVE 且未还车 THEN Vehicle_Validation_System SHALL 返回 true
2. WHEN 车辆状态为 PICKED_UP 且未还车 THEN Vehicle_Validation_System SHALL 返回 true
3. WHEN 车辆已有还车时间 THEN Vehicle_Validation_System SHALL 返回 false
4. WHEN 车辆状态为 RETURNED THEN Vehicle_Validation_System SHALL 返回 false

### Requirement 4: 获取有效车辆列表 (getValidVehicles)

**User Story:** As a 系统开发者, I want to 获取用户的有效车辆列表, so that 可以在多个页面复用此逻辑。

#### Acceptance Criteria

1. WHEN 传入车辆列表和用户ID THEN Vehicle_Validation_System SHALL 返回该用户的所有有效车辆
2. WHEN 不传用户ID THEN Vehicle_Validation_System SHALL 返回所有有效车辆
3. THE 返回列表 SHALL 只包含满足 isValidVehicle 条件的车辆
4. THE 返回列表长度 SHALL 小于等于原列表长度

### Requirement 5: 获取有效车牌号列表 (getValidPlateNumbers)

**User Story:** As a 系统开发者, I want to 获取用户的有效车牌号列表, so that 可以在下拉选择等场景使用。

#### Acceptance Criteria

1. WHEN 传入车辆列表和用户ID THEN Vehicle_Validation_System SHALL 返回该用户所有有效车辆的车牌号
2. THE 返回列表 SHALL 只包含非空字符串
3. THE 返回列表长度 SHALL 等于 getValidVehicles 返回的列表长度

