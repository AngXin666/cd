# 车队管家数据库结构文档

## 更新日期
2025-11-05

## 数据库概述
车队管家小程序使用Supabase作为后端数据库，当前共有16个核心表，分为7个功能模块。

## 表数量统计
- **总表数：** 16个
- **优化前：** 27个表
- **优化率：** 41%

## 功能模块划分

### 1. 用户和权限管理（5个表）

#### 1.1 users - 用户表
**用途：** 存储用户基本信息
**使用频率：** 63次
**主要字段：**
- id (uuid) - 用户ID
- phone (text) - 手机号
- email (text) - 邮箱
- name (text) - 姓名
- role (text) - 角色（boss/manager/driver）
- created_at (timestamptz) - 创建时间

#### 1.2 roles - 角色表
**用途：** 定义系统角色
**使用频率：** 1次
**主要字段：**
- id (uuid) - 角色ID
- name (text) - 角色名称
- description (text) - 角色描述

#### 1.3 user_roles - 用户角色关联表
**用途：** 关联用户和角色
**使用频率：** 51次
**主要字段：**
- id (uuid) - 记录ID
- user_id (uuid) - 用户ID
- role_id (uuid) - 角色ID
- created_at (timestamptz) - 创建时间

#### 1.4 permissions - 权限表
**用途：** 定义系统权限
**使用频率：** 1次
**主要字段：**
- id (uuid) - 权限ID
- name (text) - 权限名称
- description (text) - 权限描述

#### 1.5 role_permissions - 角色权限关联表
**用途：** 关联角色和权限
**使用频率：** 3次
**主要字段：**
- id (uuid) - 记录ID
- role_id (uuid) - 角色ID
- permission_id (uuid) - 权限ID
- created_at (timestamptz) - 创建时间

---

### 2. 车辆管理（2个表）

#### 2.1 vehicles - 车辆表
**用途：** 存储车辆完整信息
**使用频率：** 39次
**主要字段：**
- id (uuid) - 车辆ID
- plate_number (text) - 车牌号
- brand (text) - 品牌
- model (text) - 型号
- color (text) - 颜色
- vin (text) - 车架号
- vehicle_type (text) - 车辆类型
- owner_name (text) - 车主姓名
- driver_id (uuid) - 司机ID
- warehouse_id (uuid) - 仓库ID
- review_status (text) - 审核状态
- 各种照片字段（left_front_photo, right_front_photo等）
- 行驶证信息字段
- 提车/还车信息字段

#### 2.2 driver_licenses - 驾驶证表
**用途：** 存储驾驶证信息
**使用频率：** 9次
**主要字段：**
- id (uuid) - 记录ID
- driver_id (uuid) - 司机ID
- license_number (text) - 驾驶证号
- license_class (text) - 准驾车型
- id_card_number (text) - 身份证号
- id_card_name (text) - 身份证姓名
- driving_license_photo (text) - 驾驶证照片
- id_card_photo_front (text) - 身份证正面照
- id_card_photo_back (text) - 身份证背面照

---

### 3. 仓库管理（2个表）

#### 3.1 warehouses - 仓库表
**用途：** 存储仓库信息
**使用频率：** 16次
**主要字段：**
- id (uuid) - 仓库ID
- name (text) - 仓库名称
- address (text) - 仓库地址
- contact_person (text) - 联系人
- contact_phone (text) - 联系电话
- created_at (timestamptz) - 创建时间

#### 3.2 warehouse_assignments - 仓库分配表
**用途：** 管理用户与仓库的关联
**使用频率：** 35次
**主要字段：**
- id (uuid) - 记录ID
- user_id (uuid) - 用户ID
- warehouse_id (uuid) - 仓库ID
- role (text) - 角色类型
- assigned_at (timestamptz) - 分配时间
- assigned_by (uuid) - 分配人ID

---

### 4. 考勤管理（2个表）

#### 4.1 attendance - 考勤表
**用途：** 记录考勤打卡信息
**使用频率：** 19次
**主要字段：**
- id (uuid) - 记录ID
- user_id (uuid) - 用户ID
- warehouse_id (uuid) - 仓库ID
- check_in_time (timestamptz) - 签到时间
- check_out_time (timestamptz) - 签退时间
- check_in_location (text) - 签到位置
- check_out_location (text) - 签退位置
- status (text) - 考勤状态
- notes (text) - 备注

#### 4.2 attendance_rules - 考勤规则表
**用途：** 定义考勤规则
**使用频率：** 5次
**主要字段：**
- id (uuid) - 规则ID
- warehouse_id (uuid) - 仓库ID
- work_start_time (time) - 上班时间
- work_end_time (time) - 下班时间
- late_threshold (interval) - 迟到阈值
- early_leave_threshold (interval) - 早退阈值

---

### 5. 工作管理（2个表）

#### 5.1 piece_work_records - 计件工作记录表
**用途：** 记录计件工作信息
**使用频率：** 20次
**主要字段：**
- id (uuid) - 记录ID
- user_id (uuid) - 用户ID
- warehouse_id (uuid) - 仓库ID
- category (text) - 工作类别
- quantity (numeric) - 数量
- unit_price (numeric) - 单价
- total_amount (numeric) - 总金额
- work_date (date) - 工作日期
- status (text) - 状态
- notes (text) - 备注

#### 5.2 category_prices - 分类价格表
**用途：** 管理不同类别的计件单价
**使用频率：** 17次
**主要字段：**
- id (uuid) - 记录ID
- warehouse_id (uuid) - 仓库ID
- category (text) - 类别名称
- unit_price (numeric) - 单价
- unit (text) - 单位
- effective_date (date) - 生效日期
- is_active (boolean) - 是否启用

---

### 6. 人事管理（2个表）

#### 6.1 leave_applications - 请假申请表
**用途：** 管理请假申请
**使用频率：** 21次
**主要字段：**
- id (uuid) - 申请ID
- user_id (uuid) - 用户ID
- leave_type (text) - 请假类型
- start_date (date) - 开始日期
- end_date (date) - 结束日期
- reason (text) - 请假原因
- status (text) - 审批状态
- approver_id (uuid) - 审批人ID
- approved_at (timestamptz) - 审批时间

#### 6.2 resignation_applications - 离职申请表
**用途：** 管理离职申请
**使用频率：** 10次
**主要字段：**
- id (uuid) - 申请ID
- user_id (uuid) - 用户ID
- resignation_date (date) - 离职日期
- reason (text) - 离职原因
- status (text) - 审批状态
- approver_id (uuid) - 审批人ID
- approved_at (timestamptz) - 审批时间

---

### 7. 通知系统（1个表）

#### 7.1 notifications - 通知表
**用途：** 管理系统通知消息
**使用频率：** 35次
**主要字段：**
- id (uuid) - 通知ID
- recipient_id (uuid) - 接收人ID
- sender_id (uuid) - 发送人ID
- title (text) - 通知标题
- content (text) - 通知内容
- type (text) - 通知类型
- is_read (boolean) - 是否已读
- created_at (timestamptz) - 创建时间

---

## 表关系图

```
users (用户)
  ├─→ user_roles (用户角色)
  │     └─→ roles (角色)
  │           └─→ role_permissions (角色权限)
  │                 └─→ permissions (权限)
  │
  ├─→ vehicles (车辆)
  │     └─→ driver_id → users
  │     └─→ warehouse_id → warehouses
  │
  ├─→ driver_licenses (驾驶证)
  │     └─→ driver_id → users
  │
  ├─→ warehouse_assignments (仓库分配)
  │     └─→ warehouse_id → warehouses
  │
  ├─→ attendance (考勤)
  │     └─→ warehouse_id → warehouses
  │
  ├─→ piece_work_records (计件记录)
  │     └─→ warehouse_id → warehouses
  │
  ├─→ leave_applications (请假申请)
  │     └─→ approver_id → users
  │
  ├─→ resignation_applications (离职申请)
  │     └─→ approver_id → users
  │
  └─→ notifications (通知)
        └─→ sender_id → users
        └─→ recipient_id → users

warehouses (仓库)
  ├─→ warehouse_assignments
  ├─→ attendance
  ├─→ piece_work_records
  ├─→ category_prices
  └─→ attendance_rules
```

## 数据库优化历史

### 2025-11-05 大规模清理
**删除的表（11个）：**
1. departments - 部门表
2. user_departments - 用户部门关联表
3. leave_requests - 请假请求表（重复）
4. new_attendance - 新考勤表（重复）
5. new_notifications - 新通知表（重复）
6. new_vehicles - 新车辆表（重复）
7. piecework_records - 计件记录表（重复）
8. permission_strategies - 权限策略表
9. resource_permissions - 资源权限表
10. role_permission_mappings - 角色权限映射表
11. user_permission_assignments - 用户权限分配表

**优化成果：**
- 表数量从27个减少到16个
- 消除了所有重复功能的表
- 删除了所有未使用的表
- 数据库结构更加清晰

## 命名规范

### 表命名
- 使用小写字母和下划线
- 使用复数形式（users, vehicles, warehouses）
- 关联表使用"表1_表2"格式（user_roles, role_permissions）

### 字段命名
- 使用小写字母和下划线
- ID字段统一使用uuid类型
- 时间字段使用timestamptz类型
- 布尔字段使用is_前缀（is_active, is_read）

## 安全策略

所有表都启用了Row Level Security (RLS)，使用以下权限函数：
- `is_boss_v2()` - 检查是否为超级管理员
- `is_manager_v2()` - 检查是否为车队长
- `is_driver_v2()` - 检查是否为司机

## 维护建议

1. **定期审查**
   - 每季度审查表使用情况
   - 及时清理未使用的表
   - 避免创建重复功能的表

2. **命名规范**
   - 避免使用new_前缀创建新表
   - 如需替换旧表，应先迁移数据再删除旧表
   - 保持命名一致性

3. **文档更新**
   - 新增表时及时更新文档
   - 记录表的用途和关键字段
   - 维护表关系图

4. **性能优化**
   - 为常用查询字段添加索引
   - 定期分析查询性能
   - 优化慢查询

## 备份策略

建议的备份策略：
1. 每日自动备份
2. 重要操作前手动备份
3. 保留最近30天的备份
4. 定期测试备份恢复流程
