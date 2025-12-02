# 数据库清理分析报告

## 分析日期
2025-11-05

## 表使用情况统计

### 正在使用的表（保留）✅
| 表名 | 使用次数 | 用途 |
|------|---------|------|
| users | 63 | 用户表 - 核心表 |
| user_roles | 51 | 用户角色关联 - 核心表 |
| vehicles | 39 | 车辆表 - 核心表 |
| notifications | 35 | 通知表 - 核心表 |
| warehouse_assignments | 35 | 仓库分配表 |
| leave_applications | 21 | 请假申请表 |
| piece_work_records | 20 | 计件记录表 |
| attendance | 19 | 考勤表 |
| category_prices | 17 | 分类价格表 |
| warehouses | 16 | 仓库表 |
| resignation_applications | 10 | 离职申请表 |
| driver_licenses | 9 | 驾驶证表 |
| attendance_rules | 5 | 考勤规则表 |
| role_permissions | 3 | 角色权限表 |
| roles | 1 | 角色表 |
| permissions | 1 | 权限表 |

### 未使用的表（建议删除）❌
| 表名 | 使用次数 | 建议操作 |
|------|---------|---------|
| leave_requests | 0 | 删除（可能是leave_applications的旧版本） |
| new_attendance | 0 | 删除（attendance的新版本，但未使用） |
| new_notifications | 0 | 删除（notifications的新版本，但未使用） |
| new_vehicles | 0 | 删除（vehicles的新版本，但未使用） |
| piecework_records | 0 | 删除（piece_work_records的重复） |
| permission_strategies | 0 | 删除（未使用的权限策略表） |
| resource_permissions | 0 | 删除（未使用的资源权限表） |
| role_permission_mappings | 0 | 删除（未使用的角色权限映射表） |
| user_permission_assignments | 0 | 删除（未使用的用户权限分配表） |

## 重复功能分析

### 1. 考勤表重复
- **attendance** (使用19次) ✅ 保留
- **new_attendance** (使用0次) ❌ 删除
- **结论：** 删除new_attendance

### 2. 通知表重复
- **notifications** (使用35次) ✅ 保留
- **new_notifications** (使用0次) ❌ 删除
- **结论：** 删除new_notifications

### 3. 车辆表重复
- **vehicles** (使用39次) ✅ 保留
- **new_vehicles** (使用0次) ❌ 删除
- **结论：** 删除new_vehicles

### 4. 计件记录表重复
- **piece_work_records** (使用20次) ✅ 保留
- **piecework_records** (使用0次) ❌ 删除
- **结论：** 删除piecework_records

### 5. 请假表重复
- **leave_applications** (使用21次) ✅ 保留
- **leave_requests** (使用0次) ❌ 删除
- **结论：** 删除leave_requests

## 权限系统冗余分析

### 当前权限相关表
1. **permissions** (使用1次) - 基础权限定义
2. **roles** (使用1次) - 角色定义
3. **user_roles** (使用51次) - 用户角色关联 ✅ 核心表
4. **role_permissions** (使用3次) - 角色权限关联
5. **permission_strategies** (使用0次) ❌ 未使用
6. **resource_permissions** (使用0次) ❌ 未使用
7. **role_permission_mappings** (使用0次) ❌ 未使用
8. **user_permission_assignments** (使用0次) ❌ 未使用

### 建议
- 保留：permissions, roles, user_roles, role_permissions
- 删除：permission_strategies, resource_permissions, role_permission_mappings, user_permission_assignments

## 清理计划

### 第一批：删除未使用的"new_"表（4个）
1. new_attendance
2. new_notifications
3. new_vehicles
4. piecework_records (虽然不是new_开头，但是重复表)

### 第二批：删除未使用的权限表（4个）
5. permission_strategies
6. resource_permissions
7. role_permission_mappings
8. user_permission_assignments

### 第三批：删除其他未使用的表（1个）
9. leave_requests

## 预期结果

### 表数量变化
- **当前：** 25个表
- **删除：** 9个表
- **保留：** 16个表
- **减少：** 36%

### 保留的16个核心表
1. attendance - 考勤
2. attendance_rules - 考勤规则
3. category_prices - 分类价格
4. driver_licenses - 驾驶证
5. leave_applications - 请假申请
6. notifications - 通知
7. permissions - 权限
8. piece_work_records - 计件记录
9. resignation_applications - 离职申请
10. role_permissions - 角色权限
11. roles - 角色
12. user_roles - 用户角色
13. users - 用户
14. vehicles - 车辆
15. warehouse_assignments - 仓库分配
16. warehouses - 仓库

## 风险评估

### 低风险 ✅
所有待删除的表在代码中使用次数为0，删除不会影响现有功能。

### 建议的验证步骤
1. 检查数据库外键依赖
2. 备份数据（如果需要）
3. 执行删除操作
4. 运行lint检查
5. 测试核心功能

## 数据备份建议

虽然这些表未被使用，但建议在删除前：
1. 导出表结构（CREATE TABLE语句）
2. 如果表中有数据，导出数据
3. 保存到备份文件中

这样如果将来需要恢复，可以快速重建。
