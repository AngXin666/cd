# 数据库结构分析

## 当前数据库表结构

### 1. 核心用户表
#### profiles（用户资料表）
- **主键**: id (uuid)
- **字段**:
  - phone (text, unique) - 手机号
  - email (text, unique) - 邮箱
  - name (text) - 姓名
  - role (user_role) - 角色：driver/manager/super_admin
  - driver_type (driver_type) - 司机类型：pure/with_vehicle
  - avatar_url (text) - 头像URL
  - nickname (text) - 昵称
  - address_province/city/district/detail - 地址信息
  - emergency_contact_name/phone - 紧急联系人
  - login_account (text) - 登录账号
  - vehicle_plate (text) - 车牌号
  - join_date (date) - 入职日期
  - created_at, updated_at

### 2. 仓库相关表
#### warehouses（仓库表）
- **主键**: id (uuid)
- **字段**:
  - name (text) - 仓库名称
  - is_active (boolean) - 是否启用
  - max_leave_days (integer) - 最大请假天数
  - resignation_notice_days (integer) - 离职通知天数
  - daily_target (integer) - 每日目标件数
  - created_at, updated_at

#### driver_warehouses（司机-仓库关联表）
- **主键**: id (uuid)
- **字段**:
  - driver_id (uuid, FK -> profiles.id)
  - warehouse_id (uuid, FK -> warehouses.id)
  - created_at

#### manager_warehouses（管理员-仓库关联表）
- **主键**: id (uuid)
- **字段**:
  - manager_id (uuid, FK -> profiles.id)
  - warehouse_id (uuid, FK -> warehouses.id)
  - created_at

### 3. 考勤相关表
#### attendance（考勤记录表）
- **主键**: id (uuid)
- **字段**:
  - user_id (uuid, FK -> profiles.id)
  - warehouse_id (uuid, FK -> warehouses.id)
  - clock_in_time (timestamptz) - 上班打卡时间
  - clock_out_time (timestamptz) - 下班打卡时间
  - work_date (date) - 工作日期
  - work_hours (numeric) - 工作时长
  - status (attendance_status) - 状态：normal/late/early/absent
  - notes (text) - 备注
  - created_at

#### attendance_rules（考勤规则表）
- **主键**: id (uuid)
- **字段**:
  - warehouse_id (uuid, FK -> warehouses.id)
  - work_start_time (time) - 上班时间
  - work_end_time (time) - 下班时间
  - late_threshold (integer) - 迟到阈值（分钟）
  - early_threshold (integer) - 早退阈值（分钟）
  - require_clock_out (boolean) - 是否需要下班打卡
  - is_active (boolean) - 是否启用
  - created_at, updated_at

### 4. 计件相关表
#### piece_work_records（计件记录表）
- **主键**: id (uuid)
- **字段**:
  - user_id (uuid, FK -> profiles.id)
  - warehouse_id (uuid, FK -> warehouses.id)
  - category_id (uuid, FK -> category_prices.id)
  - work_date (date) - 工作日期
  - quantity (integer) - 数量
  - unit_price (numeric) - 单价
  - total_amount (numeric) - 总金额
  - need_upstairs (boolean) - 是否需要上楼
  - upstairs_price (numeric) - 上楼费单价
  - need_sorting (boolean) - 是否需要分拣
  - sorting_quantity (integer) - 分拣数量
  - sorting_unit_price (numeric) - 分拣单价
  - notes (text) - 备注
  - created_at, updated_at

#### category_prices（价格分类表）
- **主键**: id (uuid)
- **字段**:
  - warehouse_id (uuid, FK -> warehouses.id)
  - category_name (text) - 分类名称
  - unit_price (numeric) - 单价
  - upstairs_price (numeric) - 上楼费单价
  - sorting_unit_price (numeric) - 分拣单价
  - is_active (boolean) - 是否启用
  - created_at, updated_at

### 5. 请假相关表
#### leave_applications（请假申请表）
- **主键**: id (uuid)
- **字段**:
  - user_id (uuid, FK -> profiles.id)
  - warehouse_id (uuid, FK -> warehouses.id)
  - leave_type (leave_type) - 请假类型
  - start_date (date) - 开始日期
  - end_date (date) - 结束日期
  - days (numeric) - 请假天数
  - reason (text) - 请假原因
  - status (application_status) - 状态：pending/approved/rejected/cancelled
  - reviewed_by (uuid, FK -> profiles.id) - 审批人
  - reviewed_at (timestamptz) - 审批时间
  - review_notes (text) - 审批备注
  - created_at, updated_at

#### resignation_applications（离职申请表）
- **主键**: id (uuid)
- **字段**:
  - user_id (uuid, FK -> profiles.id)
  - warehouse_id (uuid, FK -> warehouses.id)
  - resignation_date (date) - 离职日期
  - reason (text) - 离职原因
  - status (application_status) - 状态
  - reviewed_by (uuid, FK -> profiles.id)
  - reviewed_at (timestamptz)
  - review_notes (text)
  - created_at, updated_at

### 6. 车辆相关表
#### vehicles（车辆表）
- **主键**: id (uuid)
- **字段**:
  - license_plate (text, unique) - 车牌号
  - brand (text) - 品牌
  - model (text) - 型号
  - color (text) - 颜色
  - vin (text) - 车架号
  - owner_id (uuid, FK -> profiles.id) - 车主ID
  - current_driver_id (uuid, FK -> profiles.id) - 当前司机ID
  - is_active (boolean) - 是否启用
  - notes (text) - 备注
  - created_at, updated_at

#### vehicle_records（车辆记录/租赁表）
- **主键**: id (uuid)
- **字段**:
  - vehicle_id (uuid, FK -> vehicles.id)
  - driver_id (uuid, FK -> profiles.id)
  - record_type (record_type) - 记录类型：rental/maintenance/accident
  - start_date (date) - 开始日期
  - end_date (date) - 结束日期
  - rental_fee (numeric) - 租金
  - deposit (numeric) - 押金
  - status (record_status) - 状态
  - pickup_photos (text[]) - 提车照片
  - return_photos (text[]) - 还车照片
  - registration_photos (text[]) - 行驶证照片
  - damage_photos (text[]) - 车损照片
  - locked_photos (jsonb) - 锁定的照片
  - notes (text) - 备注
  - created_at, updated_at

#### driver_licenses（驾驶证表）
- **主键**: id (uuid)
- **字段**:
  - driver_id (uuid, FK -> profiles.id)
  - license_number (text) - 驾驶证号
  - id_card_name (text) - 身份证姓名
  - id_card_number (text) - 身份证号
  - license_class (text) - 准驾车型
  - issue_date (date) - 发证日期
  - valid_from (date) - 有效期起始
  - valid_until (date) - 有效期截止
  - issuing_authority (text) - 发证机关
  - front_photo_url (text) - 正面照片
  - back_photo_url (text) - 背面照片
  - created_at, updated_at

### 7. 反馈表
#### feedback（反馈表）
- **主键**: id (uuid)
- **字段**:
  - user_id (uuid, FK -> profiles.id)
  - content (text) - 反馈内容
  - status (feedback_status) - 状态：pending/resolved
  - response (text) - 回复内容
  - responded_by (uuid, FK -> profiles.id) - 回复人
  - responded_at (timestamptz) - 回复时间
  - created_at

### 8. 存储桶
- **avatars** - 头像存储
- **vehicle_photos** - 车辆照片存储

## 数据库枚举类型
1. **user_role**: driver, manager, super_admin
2. **driver_type**: pure, with_vehicle
3. **attendance_status**: normal, late, early, absent
4. **leave_type**: sick, personal, annual, other
5. **application_status**: pending, approved, rejected, cancelled
6. **record_type**: rental, maintenance, accident
7. **record_status**: active, completed, cancelled
8. **feedback_status**: pending, resolved
9. **review_status**: drafting, pending_review, need_supplement, approved

## 权限控制（RLS策略）
当前系统的 RLS 策略比较混乱，需要重新设计：

### 基本原则
1. **超级管理员**：可以访问所有数据
2. **管理员**：只能访问自己负责仓库的数据
3. **司机**：只能访问自己的数据

### 需要 RLS 的表
1. profiles - 用户只能查看和修改自己的资料
2. driver_warehouses - 司机只能查看自己的仓库分配
3. manager_warehouses - 管理员只能查看自己的仓库分配
4. attendance - 司机只能查看和创建自己的考勤记录
5. piece_work_records - 司机只能查看和创建自己的计件记录
6. leave_applications - 司机只能查看和创建自己的请假申请
7. vehicles - 根据角色控制访问权限
8. vehicle_records - 根据角色控制访问权限
9. driver_licenses - 司机只能查看和修改自己的驾驶证信息
10. feedback - 用户只能查看和创建自己的反馈

## 问题和优化建议

### 当前问题
1. **Migration 文件过多**：109个文件，很多是修复和补丁
2. **RLS 策略混乱**：多次启用和禁用，不清楚最终状态
3. **表结构冗余**：有些字段可能不再使用
4. **权限控制不一致**：不同表的权限策略不统一

### 优化建议
1. **合并 Migration**：将所有表结构合并到少数几个 migration 文件中
2. **统一 RLS 策略**：为所有表设计一致的权限控制策略
3. **清理冗余字段**：删除不再使用的字段
4. **优化索引**：为常用查询字段添加索引
5. **添加约束**：确保数据完整性

## 重构计划

### 新的 Migration 文件结构
1. **001_create_enums.sql** - 创建所有枚举类型
2. **002_create_core_tables.sql** - 创建核心表（profiles, warehouses）
3. **003_create_association_tables.sql** - 创建关联表（driver_warehouses, manager_warehouses）
4. **004_create_attendance_tables.sql** - 创建考勤相关表
5. **005_create_piece_work_tables.sql** - 创建计件相关表
6. **006_create_leave_tables.sql** - 创建请假相关表
7. **007_create_vehicle_tables.sql** - 创建车辆相关表
8. **008_create_feedback_table.sql** - 创建反馈表
9. **009_create_storage_buckets.sql** - 创建存储桶
10. **010_create_rls_policies.sql** - 创建 RLS 策略
11. **011_create_functions_and_triggers.sql** - 创建函数和触发器
12. **012_create_test_data.sql** - 创建测试数据

### 预期效果
- 从 109 个 migration 文件减少到 12 个
- 清晰的表结构和权限控制
- 更好的可维护性
- 更快的查询性能
