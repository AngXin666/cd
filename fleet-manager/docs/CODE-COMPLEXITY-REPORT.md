# 代码复杂度分析报告

分析时间: 2025-12-29 19:36:26


## 总体统计

| 指标 | 数值 |
|------|------|
| 总函数数 | 241 |
| 过长函数 (>50行) | 50 |
| 参数过多 (>5个) | 31 |
| 嵌套过深 (>3层) | 12 |

## 过长函数 (>50行)

| 文件 | 函数名 | 行数 | 起始行 |
|------|--------|------|--------|
| main.py | `assign_vehicle` | 129 | 2139 |
| main.py | `notification_stream` | 120 | 3014 |
| crud.py | `init_default_notification_templates` | 119 | 2129 |
| main.py | `update_scheduled_notification` | 118 | 3921 |
| main.py | `notification_event_generator` | 115 | 2896 |
| main.py | `return_vehicle` | 108 | 2026 |
| main.py | `create_scheduled_notification` | 106 | 3737 |
| crud.py | `calculate_next_execute_time` | 104 | 2519 |
| main.py | `get_vehicle_history` | 101 | 2273 |
| crud.py | `execute_scheduled_notification` | 96 | 2625 |
| events.py | `emit_piece_work_update` | 95 | 177 |
| crud.py | `init_default_data` | 93 | 1773 |
| main.py | `create_vehicle` | 90 | 1625 |
| main.py | `assign_warehouses_to_user` | 89 | 396 |
| crud.py | `check_app_update` | 86 | 3022 |
| main.py | `update_piece_work_record` | 85 | 1155 |
| main.py | `approve_leave_application` | 85 | 1433 |
| main.py | `cancel_scheduled_notification` | 82 | 4068 |
| main.py | `get_scheduled_notifications` | 80 | 3654 |
| main.py | `update_role_permissions` | 79 | 5022 |
| crud.py | `create_scheduled_notification` | 79 | 2253 |
| main.py | `create_piece_work_record` | 78 | 1046 |
| main.py | `get_warehouse_vehicles` | 75 | 690 |
| main.py | `upload_image` | 73 | 4612 |
| main.py | `get_scheduled_notification` | 72 | 3846 |
| main.py | `update_vehicle_lease` | 70 | 2438 |
| main.py | `update_app_version` | 69 | 4475 |
| crud.py | `update_scheduled_notification` | 69 | 2413 |
| main.py | `create_leave_application` | 68 | 1323 |
| events.py | `emit_user_update` | 68 | 376 |
| main.py | `return_vehicle_simple` | 64 | 1959 |
| main.py | `supplement_photos_simple` | 63 | 2560 |
| main.py | `update_user` | 61 | 258 |
| crud.py | `create_vehicle` | 61 | 1010 |
| crud.py | `supplement_vehicle_photo` | 58 | 1466 |
| crud.py | `create_app_version` | 57 | 2805 |
| crud.py | `update_app_version` | 57 | 2951 |
| main.py | `get_vehicle_lease` | 56 | 2379 |
| main.py | `review_vehicle` | 55 | 1802 |
| main.py | `supplement_photo` | 55 | 2626 |
| main.py | `create_app_version` | 55 | 4319 |
| main.py | `delete_vehicle` | 54 | 1900 |
| main.py | `update_notification_template` | 54 | 3294 |
| main.py | `assign_users_to_warehouse` | 53 | 614 |
| main.py | `get_piece_work_records` | 53 | 990 |
| main.py | `get_all_vehicles` | 53 | 1569 |
| crud.py | `create_notification_from_template` | 53 | 2074 |
| auth.py | `get_current_user` | 53 | 179 |
| auth.py | `check_manager_warehouse_access` | 53 | 552 |
| crud.py | `update_vehicle_lease` | 52 | 1216 |

## 参数过多函数 (>5个)

| 文件 | 函数名 | 参数数 | 起始行 |
|------|--------|--------|--------|
| crud.py | `update_scheduled_notification` | 16 | 2413 |
| crud.py | `create_vehicle` | 15 | 1010 |
| crud.py | `create_scheduled_notification` | 15 | 2253 |
| crud.py | `create_app_version` | 14 | 2805 |
| crud.py | `update_app_version` | 14 | 2951 |
| events.py | `emit_piece_work_update` | 14 | 177 |
| events.py | `emit_vehicle_update` | 13 | 94 |
| events.py | `emit_leave_update` | 13 | 135 |
| crud.py | `update_vehicle_lease` | 10 | 1216 |
| main.py | `get_piece_work_records` | 9 | 990 |
| crud.py | `update_piece_work_category` | 8 | 621 |
| crud.py | `get_piece_work_records` | 8 | 769 |
| crud.py | `update_notification_template` | 8 | 1982 |
| crud.py | `create_vehicle_history` | 8 | 3162 |
| main.py | `get_attendance_records` | 7 | 849 |
| crud.py | `create_piece_work_record` | 7 | 723 |
| crud.py | `create_notification_template` | 7 | 1870 |
| main.py | `get_users` | 6 | 193 |
| main.py | `get_warehouse_vehicles` | 6 | 690 |
| main.py | `get_piece_work_stats` | 6 | 1127 |
| main.py | `get_leave_applications` | 6 | 1273 |
| main.py | `get_vehicles` | 6 | 1523 |
| main.py | `get_all_vehicles` | 6 | 1569 |
| main.py | `get_notification_templates` | 6 | 3160 |
| main.py | `get_app_versions` | 6 | 4272 |
| crud.py | `create_user` | 6 | 23 |
| crud.py | `update_user` | 6 | 121 |
| crud.py | `get_attendance_records` | 6 | 522 |
| crud.py | `create_piece_work_category` | 6 | 562 |
| crud.py | `create_leave_application` | 6 | 908 |
| crud.py | `update_vehicle` | 6 | 1178 |

## 嵌套过深函数 (>3层)

| 文件 | 函数名 | 嵌套深度 | 起始行 |
|------|--------|----------|--------|
| scheduler.py | `check_and_execute_scheduled_notifications` | 7 | 68 |
| crud.py | `calculate_next_execute_time` | 5 | 2519 |
| crud.py | `compare_versions` | 5 | 3110 |
| crud.py | `parse_version` | 5 | 3121 |
| main.py | `get_vehicle_history` | 4 | 2273 |
| main.py | `notification_event_generator` | 4 | 2896 |
| main.py | `get_notification_templates` | 4 | 3160 |
| crud.py | `execute_scheduled_notification` | 4 | 2625 |
| crud.py | `get_target_user_count` | 4 | 2767 |
| crud.py | `check_app_update` | 4 | 3022 |
| auth.py | `get_creatable_roles` | 4 | 353 |
| scheduler.py | `cleanup_completed_notifications` | 4 | 111 |

## 圈复杂度分析

使用 radon 工具分析的圈复杂度结果：

- **A (1-5)**: 低复杂度，简单函数
- **B (6-10)**: 中等复杂度，需要关注
- **C (11-20)**: 高复杂度，建议重构
- **D (21-30)**: 非常高复杂度，必须重构
- **F (>30)**: 极高复杂度，不可维护

### main.py 圈复杂度详情

#### 高复杂度函数 (C级，需要重构)

| 函数名 | 复杂度 | 行号 | 建议 |
|--------|--------|------|------|
| `get_vehicle_history` | C (17) | 2273 | 拆分为多个辅助函数 |
| `update_scheduled_notification` | C (15) | 3921 | 提取验证逻辑 |
| `create_scheduled_notification` | C (14) | 3737 | 提取验证逻辑 |
| `update_piece_work_record` | C (13) | 1155 | 拆分业务逻辑 |
| `update_role_permissions` | C (12) | 5022 | 提取权限检查 |
| `cancel_scheduled_notification` | C (11) | 4068 | 简化条件判断 |

#### 中等复杂度函数 (B级，需要关注)

| 函数名 | 复杂度 | 行号 |
|--------|--------|------|
| `assign_warehouses_to_user` | B (10) | 396 |
| `notification_event_generator` | B (10) | 2896 |
| `get_scheduled_notifications` | B (10) | 3654 |
| `get_scheduled_notification` | B (10) | 3846 |
| `update_user` | B (9) | 258 |
| `assign_vehicle` | B (9) | 2139 |
| `create_piece_work_record` | B (8) | 1046 |
| `approve_leave_application` | B (8) | 1433 |
| `create_vehicle` | B (8) | 1625 |
| `update_app_version` | B (8) | 4475 |
| `get_warehouse_vehicles` | B (7) | 690 |
| `get_piece_work_records` | B (7) | 990 |
| `create_leave_application` | B (7) | 1323 |
| `return_vehicle` | B (7) | 2026 |
| `get_vehicle_lease` | B (7) | 2379 |
| `update_vehicle_lease` | B (7) | 2438 |
| `update_notification_template` | B (7) | 3294 |
| `assign_users_to_warehouse` | B (6) | 614 |
| `get_leave_applications` | B (6) | 1273 |
| `notification_stream` | B (6) | 3014 |
| `upload_image` | B (6) | 4612 |
| `is_valid_image_content` | B (6) | 4687 |

### 平均复杂度

- **main.py**: 平均复杂度 A (3.99)
- **总函数数**: 109 个
- **低复杂度 (A)**: 81 个 (74.3%)
- **中等复杂度 (B)**: 22 个 (20.2%)
- **高复杂度 (C)**: 6 个 (5.5%)


## 需要重构的函数汇总

| 文件 | 函数名 | 问题 |
|------|--------|------|
| main.py | `get_users` | 参数过多: 6 个 (建议 <= 5 个) |
| main.py | `update_user` | 函数过长: 61 行 (建议 < 50 行) |
| main.py | `assign_warehouses_to_user` | 函数过长: 89 行 (建议 < 50 行) |
| main.py | `assign_users_to_warehouse` | 函数过长: 53 行 (建议 < 50 行) |
| main.py | `get_warehouse_vehicles` | 函数过长: 75 行 (建议 < 50 行); 参数过多: 6 个 (建议 <= 5 个) |
| main.py | `get_attendance_records` | 参数过多: 7 个 (建议 <= 5 个) |
| main.py | `get_piece_work_records` | 函数过长: 53 行 (建议 < 50 行); 参数过多: 9 个 (建议 <= 5 个) |
| main.py | `create_piece_work_record` | 函数过长: 78 行 (建议 < 50 行) |
| main.py | `get_piece_work_stats` | 参数过多: 6 个 (建议 <= 5 个) |
| main.py | `update_piece_work_record` | 函数过长: 85 行 (建议 < 50 行) |
| main.py | `get_leave_applications` | 参数过多: 6 个 (建议 <= 5 个) |
| main.py | `create_leave_application` | 函数过长: 68 行 (建议 < 50 行) |
| main.py | `approve_leave_application` | 函数过长: 85 行 (建议 < 50 行) |
| main.py | `get_vehicles` | 参数过多: 6 个 (建议 <= 5 个) |
| main.py | `get_all_vehicles` | 函数过长: 53 行 (建议 < 50 行); 参数过多: 6 个 (建议 <= 5 个) |
| main.py | `create_vehicle` | 函数过长: 90 行 (建议 < 50 行) |
| main.py | `review_vehicle` | 函数过长: 55 行 (建议 < 50 行) |
| main.py | `delete_vehicle` | 函数过长: 54 行 (建议 < 50 行) |
| main.py | `return_vehicle_simple` | 函数过长: 64 行 (建议 < 50 行) |
| main.py | `return_vehicle` | 函数过长: 108 行 (建议 < 50 行) |
| main.py | `assign_vehicle` | 函数过长: 129 行 (建议 < 50 行) |
| main.py | `get_vehicle_history` | 函数过长: 101 行 (建议 < 50 行); 嵌套过深: 4 层 (建议 <= 3 层) |
| main.py | `get_vehicle_lease` | 函数过长: 56 行 (建议 < 50 行) |
| main.py | `update_vehicle_lease` | 函数过长: 70 行 (建议 < 50 行) |
| main.py | `supplement_photos_simple` | 函数过长: 63 行 (建议 < 50 行) |
| main.py | `supplement_photo` | 函数过长: 55 行 (建议 < 50 行) |
| main.py | `notification_event_generator` | 函数过长: 115 行 (建议 < 50 行); 嵌套过深: 4 层 (建议 <= 3 层) |
| main.py | `notification_stream` | 函数过长: 120 行 (建议 < 50 行) |
| main.py | `get_notification_templates` | 参数过多: 6 个 (建议 <= 5 个); 嵌套过深: 4 层 (建议 <= 3 层) |
| main.py | `update_notification_template` | 函数过长: 54 行 (建议 < 50 行) |
| main.py | `get_scheduled_notifications` | 函数过长: 80 行 (建议 < 50 行) |
| main.py | `create_scheduled_notification` | 函数过长: 106 行 (建议 < 50 行) |
| main.py | `get_scheduled_notification` | 函数过长: 72 行 (建议 < 50 行) |
| main.py | `update_scheduled_notification` | 函数过长: 118 行 (建议 < 50 行) |
| main.py | `cancel_scheduled_notification` | 函数过长: 82 行 (建议 < 50 行) |
| main.py | `get_app_versions` | 参数过多: 6 个 (建议 <= 5 个) |
| main.py | `create_app_version` | 函数过长: 55 行 (建议 < 50 行) |
| main.py | `update_app_version` | 函数过长: 69 行 (建议 < 50 行) |
| main.py | `upload_image` | 函数过长: 73 行 (建议 < 50 行) |
| main.py | `update_role_permissions` | 函数过长: 79 行 (建议 < 50 行) |
| crud.py | `create_user` | 参数过多: 6 个 (建议 <= 5 个) |
| crud.py | `update_user` | 参数过多: 6 个 (建议 <= 5 个) |
| crud.py | `get_attendance_records` | 参数过多: 6 个 (建议 <= 5 个) |
| crud.py | `create_piece_work_category` | 参数过多: 6 个 (建议 <= 5 个) |
| crud.py | `update_piece_work_category` | 参数过多: 8 个 (建议 <= 5 个) |
| crud.py | `create_piece_work_record` | 参数过多: 7 个 (建议 <= 5 个) |
| crud.py | `get_piece_work_records` | 参数过多: 8 个 (建议 <= 5 个) |
| crud.py | `create_leave_application` | 参数过多: 6 个 (建议 <= 5 个) |
| crud.py | `create_vehicle` | 函数过长: 61 行 (建议 < 50 行); 参数过多: 15 个 (建议 <= 5 个) |
| crud.py | `update_vehicle` | 参数过多: 6 个 (建议 <= 5 个) |
| crud.py | `update_vehicle_lease` | 函数过长: 52 行 (建议 < 50 行); 参数过多: 10 个 (建议 <= 5 个) |
| crud.py | `supplement_vehicle_photo` | 函数过长: 58 行 (建议 < 50 行) |
| crud.py | `init_default_data` | 函数过长: 93 行 (建议 < 50 行) |
| crud.py | `create_notification_template` | 参数过多: 7 个 (建议 <= 5 个) |
| crud.py | `update_notification_template` | 参数过多: 8 个 (建议 <= 5 个) |
| crud.py | `create_notification_from_template` | 函数过长: 53 行 (建议 < 50 行) |
| crud.py | `init_default_notification_templates` | 函数过长: 119 行 (建议 < 50 行) |
| crud.py | `create_scheduled_notification` | 函数过长: 79 行 (建议 < 50 行); 参数过多: 15 个 (建议 <= 5 个) |
| crud.py | `update_scheduled_notification` | 函数过长: 69 行 (建议 < 50 行); 参数过多: 16 个 (建议 <= 5 个) |
| crud.py | `calculate_next_execute_time` | 函数过长: 104 行 (建议 < 50 行); 嵌套过深: 5 层 (建议 <= 3 层) |
| crud.py | `execute_scheduled_notification` | 函数过长: 96 行 (建议 < 50 行); 嵌套过深: 4 层 (建议 <= 3 层) |
| crud.py | `get_target_user_count` | 嵌套过深: 4 层 (建议 <= 3 层) |
| crud.py | `create_app_version` | 函数过长: 57 行 (建议 < 50 行); 参数过多: 14 个 (建议 <= 5 个) |
| crud.py | `update_app_version` | 函数过长: 57 行 (建议 < 50 行); 参数过多: 14 个 (建议 <= 5 个) |
| crud.py | `check_app_update` | 函数过长: 86 行 (建议 < 50 行); 嵌套过深: 4 层 (建议 <= 3 层) |
| crud.py | `compare_versions` | 嵌套过深: 5 层 (建议 <= 3 层) |
| crud.py | `parse_version` | 嵌套过深: 5 层 (建议 <= 3 层) |
| crud.py | `create_vehicle_history` | 参数过多: 8 个 (建议 <= 5 个) |
| auth.py | `get_current_user` | 函数过长: 53 行 (建议 < 50 行) |
| auth.py | `get_creatable_roles` | 嵌套过深: 4 层 (建议 <= 3 层) |
| auth.py | `check_manager_warehouse_access` | 函数过长: 53 行 (建议 < 50 行) |
| events.py | `emit_vehicle_update` | 参数过多: 13 个 (建议 <= 5 个) |
| events.py | `emit_leave_update` | 参数过多: 13 个 (建议 <= 5 个) |
| events.py | `emit_piece_work_update` | 函数过长: 95 行 (建议 < 50 行); 参数过多: 14 个 (建议 <= 5 个) |
| events.py | `emit_user_update` | 函数过长: 68 行 (建议 < 50 行) |
| scheduler.py | `check_and_execute_scheduled_notifications` | 嵌套过深: 7 层 (建议 <= 3 层) |
| scheduler.py | `cleanup_completed_notifications` | 嵌套过深: 4 层 (建议 <= 3 层) |


---

## 重构建议

### 优先级 1：高复杂度函数 (C级)

这些函数圈复杂度超过 10，应优先重构：

1. **`get_vehicle_history`** (复杂度 17)
   - 问题：函数过长 (101行)，嵌套过深 (4层)
   - 建议：
     - 提取历史记录构建逻辑为独立函数
     - 使用策略模式处理不同类型的历史记录
     - 将响应构建逻辑分离

2. **`update_scheduled_notification`** (复杂度 15)
   - 问题：函数过长 (118行)
   - 建议：
     - 提取参数验证逻辑
     - 提取时间计算逻辑
     - 使用 Builder 模式构建更新对象

3. **`create_scheduled_notification`** (复杂度 14)
   - 问题：函数过长 (106行)
   - 建议：
     - 提取验证逻辑为独立函数
     - 提取默认值设置逻辑
     - 使用工厂模式创建通知对象

4. **`update_piece_work_record`** (复杂度 13)
   - 问题：函数过长 (85行)
   - 建议：
     - 提取金额计算逻辑
     - 提取权限检查逻辑
     - 分离事件触发逻辑

5. **`update_role_permissions`** (复杂度 12)
   - 问题：函数过长 (79行)
   - 建议：
     - 提取权限验证逻辑
     - 使用装饰器处理权限检查

6. **`cancel_scheduled_notification`** (复杂度 11)
   - 问题：函数过长 (82行)
   - 建议：
     - 简化状态检查逻辑
     - 提取取消操作为独立方法

### 优先级 2：过长函数 (>100行)

1. **`assign_vehicle`** (129行)
   - 建议：拆分为验证、分配、事件触发三个函数

2. **`notification_stream`** (120行)
   - 建议：提取事件生成器逻辑，使用异步生成器模式

3. **`init_default_notification_templates`** (119行)
   - 建议：使用配置文件或数据文件存储模板数据

4. **`notification_event_generator`** (115行)
   - 建议：拆分为多个小型生成器函数

5. **`return_vehicle`** (108行)
   - 建议：提取照片处理、状态更新、历史记录创建为独立函数

### 优先级 3：参数过多函数 (>10个参数)

建议使用数据类或 Pydantic 模型封装参数：

1. **`update_scheduled_notification`** (16个参数)
   - 建议：创建 `ScheduledNotificationUpdateParams` 数据类

2. **`create_vehicle`** (15个参数)
   - 建议：创建 `VehicleCreateParams` 数据类

3. **`create_scheduled_notification`** (15个参数)
   - 建议：创建 `ScheduledNotificationCreateParams` 数据类

4. **`create_app_version`** / **`update_app_version`** (14个参数)
   - 建议：创建 `AppVersionParams` 数据类

5. **`emit_piece_work_update`** (14个参数)
   - 建议：创建 `PieceWorkUpdateEvent` 数据类

### 优先级 4：嵌套过深函数 (>4层)

1. **`check_and_execute_scheduled_notifications`** (7层)
   - 建议：
     - 使用早返回模式减少嵌套
     - 提取内层逻辑为独立函数
     - 使用 guard clauses

2. **`calculate_next_execute_time`** (5层)
   - 建议：
     - 使用策略模式处理不同重复类型
     - 提取日期计算逻辑

3. **`compare_versions`** / **`parse_version`** (5层)
   - 建议：
     - 简化版本比较逻辑
     - 使用正则表达式解析版本号

---

## 代码质量改进路线图

### 短期目标 (1-2周)
- [ ] 重构 6 个 C 级复杂度函数
- [ ] 为参数过多的函数创建数据类
- [ ] 减少嵌套深度超过 4 层的函数

### 中期目标 (1个月)
- [ ] 重构所有超过 100 行的函数
- [ ] 将 main.py 拆分为多个模块（按功能域）
- [ ] 添加单元测试覆盖重构后的函数

### 长期目标 (3个月)
- [ ] 将平均复杂度降低到 3.0 以下
- [ ] 消除所有 C 级及以上复杂度函数
- [ ] 建立代码复杂度检查的 CI/CD 门禁

---

## 工具使用说明

### 安装 radon
```bash
pip install radon
```

### 运行圈复杂度分析
```bash
# 分析单个文件
radon cc main.py -a -s

# 分析整个目录
radon cc . -a -s --exclude "venv/*,__pycache__/*"
```

### 运行自定义分析脚本
```bash
python analyze_complexity.py
```

---

*报告生成时间: 2025-12-29*
*分析工具: radon + 自定义 AST 分析脚本*
