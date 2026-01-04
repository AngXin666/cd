# Requirements Document

## Introduction

本规格文档定义了对车队管理系统用户管理功能的全面测试需求。测试范围涵盖老板端和车队长端的所有用户管理场景，包括用户创建、更新、删除、权限控制、仓库分配、司机类型管理等功能。目标是发现潜在问题、过度设计和逻辑不合理之处。

## Glossary

- **User_Management_System**: 用户管理系统，负责用户的增删改查和权限控制
- **Boss_Portal**: 老板端管理界面，拥有最高管理权限
- **Manager_Portal**: 车队长端管理界面，管理所辖仓库的司机
- **Permission_Controller**: 权限控制器，负责验证用户操作权限
- **Warehouse_Assignment**: 仓库分配功能，将用户分配到特定仓库
- **Driver_Type**: 司机类型，分为纯司机(pure)和带车司机(with_vehicle)
- **Role_Hierarchy**: 角色层级，从高到低为 boss > peer_admin > manager > driver

## Requirements

### Requirement 1: 用户创建功能测试

**User Story:** As a 测试工程师, I want to 全面测试用户创建功能, so that 确保各角色创建用户的权限和逻辑正确。

#### Acceptance Criteria

1. WHEN 老板创建任意角色用户 THEN User_Management_System SHALL 成功创建用户并返回用户信息
2. WHEN 调度创建车队长或司机 THEN User_Management_System SHALL 成功创建用户
3. WHEN 调度尝试创建老板 THEN User_Management_System SHALL 返回权限不足错误
4. WHEN 车队长尝试创建用户 THEN User_Management_System SHALL 返回权限不足错误（当前实现）
5. WHEN 司机尝试创建用户 THEN User_Management_System SHALL 返回权限不足错误
6. WHEN 创建用户时用户名已存在 THEN User_Management_System SHALL 返回用户名重复错误
7. WHEN 创建用户时角色值无效 THEN User_Management_System SHALL 返回验证错误
8. WHEN 创建用户时必填字段缺失 THEN User_Management_System SHALL 返回验证错误

### Requirement 2: 用户更新功能测试

**User Story:** As a 测试工程师, I want to 全面测试用户更新功能, so that 确保用户信息修改的权限和逻辑正确。

#### Acceptance Criteria

1. WHEN 老板更新任意用户信息 THEN User_Management_System SHALL 成功更新并返回更新后的信息
2. WHEN 老板更新另一个老板的信息 THEN User_Management_System SHALL 成功更新（老板是最高权限）
3. WHEN 调度更新车队长或司机信息 THEN User_Management_System SHALL 成功更新
4. WHEN 调度尝试更新老板信息 THEN User_Management_System SHALL 返回权限不足错误
5. WHEN 车队长更新所辖仓库司机信息 THEN User_Management_System SHALL 成功更新
6. WHEN 车队长尝试更新非所辖仓库司机 THEN User_Management_System SHALL 返回仓库权限错误
7. WHEN 车队长尝试更新非司机角色用户 THEN User_Management_System SHALL 返回权限不足错误
8. WHEN 司机尝试更新他人信息 THEN User_Management_System SHALL 返回权限不足错误
9. WHEN 更新用户角色为无效值 THEN User_Management_System SHALL 返回验证错误
10. WHEN 禁用用户后该用户尝试登录 THEN User_Management_System SHALL 返回用户已禁用错误

### Requirement 3: 用户删除功能测试

**User Story:** As a 测试工程师, I want to 全面测试用户删除功能, so that 确保删除操作的权限和约束正确。

#### Acceptance Criteria

1. WHEN 老板删除任意非自己的用户 THEN User_Management_System SHALL 成功删除用户
2. WHEN 老板尝试删除自己 THEN User_Management_System SHALL 返回不能删除自己的错误
3. WHEN 调度删除车队长或司机 THEN User_Management_System SHALL 成功删除
4. WHEN 调度尝试删除老板 THEN User_Management_System SHALL 返回权限不足错误
5. WHEN 车队长尝试删除用户 THEN User_Management_System SHALL 返回权限不足错误
6. WHEN 司机尝试删除用户 THEN User_Management_System SHALL 返回权限不足错误
7. WHEN 删除不存在的用户 THEN User_Management_System SHALL 返回用户不存在错误

### Requirement 4: 用户查询功能测试

**User Story:** As a 测试工程师, I want to 全面测试用户查询功能, so that 确保查询权限和数据返回正确。

#### Acceptance Criteria

1. WHEN 老板查询用户列表 THEN User_Management_System SHALL 返回所有用户
2. WHEN 老板按角色筛选用户 THEN User_Management_System SHALL 只返回指定角色的用户
3. WHEN 老板按激活状态筛选用户 THEN User_Management_System SHALL 只返回指定状态的用户
4. WHEN 车队长查询用户列表 THEN User_Management_System SHALL 返回用户列表
5. WHEN 司机查询用户列表 THEN User_Management_System SHALL 返回权限不足错误
6. WHEN 查询单个用户详情 THEN User_Management_System SHALL 返回用户完整信息且不包含密码
7. WHEN 查询不存在的用户 THEN User_Management_System SHALL 返回用户不存在错误

### Requirement 5: 仓库分配功能测试

**User Story:** As a 测试工程师, I want to 全面测试仓库分配功能, so that 确保仓库分配的权限和逻辑正确。

#### Acceptance Criteria

1. WHEN 老板给任意用户分配仓库 THEN Warehouse_Assignment SHALL 成功分配并替换原有分配
2. WHEN 调度给用户分配仓库 THEN Warehouse_Assignment SHALL 成功分配
3. WHEN 车队长给所辖仓库司机分配仓库 THEN Warehouse_Assignment SHALL 只能分配车队长管理的仓库
4. WHEN 车队长尝试分配非管理仓库 THEN Warehouse_Assignment SHALL 返回仓库权限错误
5. WHEN 车队长尝试给非司机分配仓库 THEN Warehouse_Assignment SHALL 返回权限不足错误
6. WHEN 分配不存在的仓库 THEN Warehouse_Assignment SHALL 返回仓库不存在错误
7. WHEN 分配空仓库列表 THEN Warehouse_Assignment SHALL 清除用户所有仓库分配
8. WHEN 查询用户已分配仓库 THEN Warehouse_Assignment SHALL 返回正确的仓库列表

### Requirement 6: 司机类型管理测试

**User Story:** As a 测试工程师, I want to 全面测试司机类型管理功能, so that 确保司机类型切换逻辑正确。

#### Acceptance Criteria

1. WHEN 老板切换司机类型为带车司机 THEN User_Management_System SHALL 成功更新司机类型
2. WHEN 老板切换司机类型为纯司机 THEN User_Management_System SHALL 成功更新司机类型
3. WHEN 车队长切换所辖司机类型 THEN User_Management_System SHALL 成功更新（如果有权限）
4. WHEN 尝试给非司机设置司机类型 THEN User_Management_System SHALL 忽略该字段或返回错误
5. WHEN 司机类型值无效 THEN User_Management_System SHALL 返回验证错误或使用默认值

### Requirement 7: 司机证件管理测试

**User Story:** As a 测试工程师, I want to 全面测试司机证件管理功能, so that 确保证件信息的增删改查正确。

#### Acceptance Criteria

1. WHEN 管理角色创建司机证件信息 THEN User_Management_System SHALL 成功创建证件记录
2. WHEN 管理角色更新司机证件信息 THEN User_Management_System SHALL 成功更新证件记录
3. WHEN 司机查询自己的证件信息 THEN User_Management_System SHALL 返回证件信息（身份证号部分隐藏）
4. WHEN 司机尝试查询他人证件 THEN User_Management_System SHALL 返回权限不足错误
5. WHEN 车队长查询非所辖司机证件 THEN User_Management_System SHALL 返回仓库权限错误
6. WHEN 查询不存在的证件信息 THEN User_Management_System SHALL 返回证件不存在错误

### Requirement 8: 权限边界测试

**User Story:** As a 测试工程师, I want to 测试权限边界情况, so that 发现潜在的权限漏洞。

#### Acceptance Criteria

1. WHEN 用户被禁用后尝试任何操作 THEN Permission_Controller SHALL 返回用户已禁用错误
2. WHEN 使用过期Token访问 THEN Permission_Controller SHALL 返回认证失败错误
3. WHEN 使用无效Token访问 THEN Permission_Controller SHALL 返回认证失败错误
4. WHEN 角色被降级后尝试原权限操作 THEN Permission_Controller SHALL 返回权限不足错误
5. WHEN 并发修改同一用户 THEN User_Management_System SHALL 正确处理并发冲突

### Requirement 9: 数据完整性测试

**User Story:** As a 测试工程师, I want to 测试数据完整性, so that 确保数据一致性和约束正确。

#### Acceptance Criteria

1. WHEN 删除有仓库分配的用户 THEN User_Management_System SHALL 同时清理仓库分配记录
2. WHEN 删除有车辆的司机 THEN User_Management_System SHALL 正确处理关联车辆
3. WHEN 删除有计件记录的司机 THEN User_Management_System SHALL 保留历史计件记录
4. WHEN 用户名包含特殊字符 THEN User_Management_System SHALL 正确处理或拒绝
5. WHEN 手机号格式不正确 THEN User_Management_System SHALL 返回验证错误或接受

### Requirement 10: 前端交互测试

**User Story:** As a 测试工程师, I want to 测试前端交互逻辑, so that 确保用户界面行为正确。

#### Acceptance Criteria

1. WHEN 老板端切换用户管理标签页 THEN Boss_Portal SHALL 正确筛选显示司机或管理员
2. WHEN 老板端使用仓库切换器 THEN Boss_Portal SHALL 只显示该仓库的用户
3. WHEN 老板端搜索用户 THEN Boss_Portal SHALL 支持姓名、手机号和拼音首字母搜索
4. WHEN 车队长端查看司机列表 THEN Manager_Portal SHALL 只显示所辖仓库的司机
5. WHEN 车队长权限被禁用 THEN Manager_Portal SHALL 隐藏添加司机和仓库分配按钮
6. WHEN 展开仓库分配面板 THEN Boss_Portal SHALL 显示用户当前已分配的仓库
7. WHEN 保存仓库分配 THEN Boss_Portal SHALL 显示二次确认对话框

### Requirement 11: 过度设计检查

**User Story:** As a 测试工程师, I want to 检查是否存在过度设计, so that 简化系统复杂度。

#### Acceptance Criteria

1. WHEN 分析用户模型字段 THEN 检查是否存在未使用或冗余的字段
2. WHEN 分析API接口 THEN 检查是否存在功能重复的接口
3. WHEN 分析权限检查逻辑 THEN 检查是否存在过于复杂的权限判断
4. WHEN 分析前端状态管理 THEN 检查是否存在不必要的状态同步
5. WHEN 分析数据库查询 THEN 检查是否存在N+1查询或过度查询

### Requirement 12: 逻辑合理性检查

**User Story:** As a 测试工程师, I want to 检查业务逻辑合理性, so that 发现不合理的设计。

#### Acceptance Criteria

1. WHEN 车队长创建司机 THEN 检查是否应该允许车队长创建司机（当前不允许）
2. WHEN 司机类型切换 THEN 检查切换逻辑是否需要额外验证（如车辆状态）
3. WHEN 用户禁用 THEN 检查是否需要强制登出已登录的用户
4. WHEN 仓库分配为空 THEN 检查司机是否应该允许无仓库分配
5. WHEN 角色变更 THEN 检查是否需要清理原角色相关数据
