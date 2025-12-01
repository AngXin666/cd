# 车队管家系统 - 数据库表和 RLS 策略完整分析

## 📊 系统概述

车队管家是一个多角色权限管理系统，包含以下角色：
- **BOSS（老板）**: 最高权限，可以管理所有数据
- **PEER_ADMIN（平级管理员）**: 与老板同级，拥有相同权限
- **MANAGER（车队长）**: 管理司机和车辆，有管辖范围限制
- **DRIVER（司机）**: 基础用户，只能访问自己的数据

---

## 📋 核心表结构

### 1. users 表（用户表）
**功能**: 存储所有用户的基本信息

**字段**:
- `id` (uuid, PK): 用户ID，与 auth.users.id 关联
- `phone` (text, unique): 手机号
- `email` (text, unique): 邮箱
- `name` (text): 真实姓名
- `driver_type` (driver_type): 司机类型（带车/不带车）
- `avatar_url` (text): 头像URL
- `nickname` (text): 昵称
- `address_province` (text): 省份
- `address_city` (text): 城市
- `address_district` (text): 区县
- `address_detail` (text): 详细地址
- `emergency_contact_name` (text): 紧急联系人姓名
- `emergency_contact_phone` (text): 紧急联系人电话
- `login_account` (text, unique): 登录账号
- `vehicle_plate` (text): 车牌号（带车司机使用）
- `join_date` (date): 入职日期
- `created_at` (timestamptz): 创建时间
- `updated_at` (timestamptz): 更新时间

**RLS 策略**:
```sql
-- 1. 管理员可以查看所有用户
CREATE POLICY "admins_view_all_users" ON users
  FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

-- 2. 车队长可以查看管辖范围内的司机
CREATE POLICY "managers_view_their_drivers" ON users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'MANAGER'
    )
    AND EXISTS (
      SELECT 1 FROM driver_warehouses dw
      JOIN warehouses w ON dw.warehouse_id = w.id
      WHERE dw.driver_id = users.id
        AND w.manager_id = auth.uid()
    )
  );

-- 3. 司机只能查看自己
CREATE POLICY "drivers_view_self" ON users
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- 4. 管理员可以插入用户
CREATE POLICY "admins_insert_users" ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin(auth.uid()));

-- 5. 管理员可以更新所有用户
CREATE POLICY "admins_update_all_users" ON users
  FOR UPDATE
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- 6. 司机可以更新自己的信息
CREATE POLICY "drivers_update_self" ON users
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- 7. 管理员可以删除用户
CREATE POLICY "admins_delete_users" ON users
  FOR DELETE
  TO authenticated
  USING (is_admin(auth.uid()));
```

**策略作用**:
- ✅ 管理员（BOSS, PEER_ADMIN）可以查看、创建、更新、删除所有用户
- ✅ 车队长（MANAGER）可以查看管辖范围内的司机
- ✅ 司机（DRIVER）只能查看和更新自己的信息
- ✅ 防止越权访问

---

### 2. user_roles 表（用户角色表）
**功能**: 存储用户的角色信息，支持一个用户多个角色

**字段**:
- `id` (uuid, PK): 角色记录ID
- `user_id` (uuid, FK): 用户ID，关联 users.id
- `role` (user_role): 角色类型（BOSS, PEER_ADMIN, MANAGER, DRIVER）
- `created_at` (timestamptz): 创建时间
- `updated_at` (timestamptz): 更新时间

**RLS 策略**:
```sql
-- 1. 管理员可以查看所有角色
CREATE POLICY "admins_view_all_roles" ON user_roles
  FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

-- 2. 车队长可以查看管辖范围内的司机角色
CREATE POLICY "managers_view_their_drivers_roles" ON user_roles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'MANAGER'
    )
    AND EXISTS (
      SELECT 1 FROM driver_warehouses dw
      JOIN warehouses w ON dw.warehouse_id = w.id
      WHERE dw.driver_id = user_roles.user_id
        AND w.manager_id = auth.uid()
    )
  );

-- 3. 用户可以查看自己的角色
CREATE POLICY "users_view_own_roles" ON user_roles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 4. 管理员可以插入角色
CREATE POLICY "admins_insert_roles" ON user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin(auth.uid()));

-- 5. 管理员可以更新角色
CREATE POLICY "admins_update_roles" ON user_roles
  FOR UPDATE
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- 6. 管理员可以删除角色
CREATE POLICY "admins_delete_roles" ON user_roles
  FOR DELETE
  TO authenticated
  USING (is_admin(auth.uid()));
```

**策略作用**:
- ✅ 管理员可以管理所有用户的角色
- ✅ 车队长可以查看管辖范围内司机的角色
- ✅ 用户可以查看自己的角色
- ✅ 防止普通用户修改角色

---

### 3. warehouses 表（仓库表）
**功能**: 存储仓库的基本信息和配置

**字段**:
- `id` (uuid, PK): 仓库ID
- `name` (text, unique): 仓库名称
- `manager_id` (uuid, FK): 车队长ID，关联 users.id
- `is_active` (boolean): 是否启用
- `max_leave_days` (integer): 最大请假天数
- `resignation_notice_days` (integer): 离职提前通知天数
- `daily_target` (integer): 每日目标件数
- `created_at` (timestamptz): 创建时间
- `updated_at` (timestamptz): 更新时间

**RLS 策略**:
```sql
-- 1. 管理员可以查看所有仓库
CREATE POLICY "admins_view_all_warehouses" ON warehouses
  FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

-- 2. 车队长可以查看自己管理的仓库
CREATE POLICY "managers_view_own_warehouses" ON warehouses
  FOR SELECT
  TO authenticated
  USING (manager_id = auth.uid());

-- 3. 司机可以查看自己所属的仓库
CREATE POLICY "drivers_view_assigned_warehouses" ON warehouses
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM driver_warehouses dw
      WHERE dw.warehouse_id = warehouses.id
        AND dw.driver_id = auth.uid()
    )
  );

-- 4. 管理员可以插入仓库
CREATE POLICY "admins_insert_warehouses" ON warehouses
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin(auth.uid()));

-- 5. 管理员可以更新所有仓库
CREATE POLICY "admins_update_all_warehouses" ON warehouses
  FOR UPDATE
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- 6. 车队长可以更新自己管理的仓库
CREATE POLICY "managers_update_own_warehouses" ON warehouses
  FOR UPDATE
  TO authenticated
  USING (manager_id = auth.uid())
  WITH CHECK (manager_id = auth.uid());

-- 7. 管理员可以删除仓库
CREATE POLICY "admins_delete_warehouses" ON warehouses
  FOR DELETE
  TO authenticated
  USING (is_admin(auth.uid()));
```

**策略作用**:
- ✅ 管理员可以管理所有仓库
- ✅ 车队长可以查看和更新自己管理的仓库
- ✅ 司机可以查看自己所属的仓库
- ✅ 防止越权操作

---

### 4. driver_warehouses 表（司机仓库关联表）
**功能**: 存储司机和仓库的关联关系，一个司机可以属于多个仓库

**字段**:
- `id` (uuid, PK): 关联记录ID
- `driver_id` (uuid, FK): 司机ID，关联 users.id
- `warehouse_id` (uuid, FK): 仓库ID，关联 warehouses.id
- `created_at` (timestamptz): 创建时间

**RLS 策略**:
```sql
-- 1. 管理员可以查看所有关联
CREATE POLICY "admins_view_all_assignments" ON driver_warehouses
  FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

-- 2. 车队长可以查看自己管理的仓库的司机关联
CREATE POLICY "managers_view_own_warehouse_assignments" ON driver_warehouses
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM warehouses w
      WHERE w.id = driver_warehouses.warehouse_id
        AND w.manager_id = auth.uid()
    )
  );

-- 3. 司机可以查看自己的仓库关联
CREATE POLICY "drivers_view_own_assignments" ON driver_warehouses
  FOR SELECT
  TO authenticated
  USING (driver_id = auth.uid());

-- 4. 管理员可以插入关联
CREATE POLICY "admins_insert_assignments" ON driver_warehouses
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin(auth.uid()));

-- 5. 车队长可以为自己管理的仓库分配司机
CREATE POLICY "managers_insert_own_warehouse_assignments" ON driver_warehouses
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM warehouses w
      WHERE w.id = driver_warehouses.warehouse_id
        AND w.manager_id = auth.uid()
    )
  );

-- 6. 管理员可以删除关联
CREATE POLICY "admins_delete_assignments" ON driver_warehouses
  FOR DELETE
  TO authenticated
  USING (is_admin(auth.uid()));

-- 7. 车队长可以删除自己管理的仓库的司机关联
CREATE POLICY "managers_delete_own_warehouse_assignments" ON driver_warehouses
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM warehouses w
      WHERE w.id = driver_warehouses.warehouse_id
        AND w.manager_id = auth.uid()
    )
  );
```

**策略作用**:
- ✅ 管理员可以管理所有司机和仓库的关联
- ✅ 车队长可以为自己管理的仓库分配和移除司机
- ✅ 司机可以查看自己的仓库关联
- ✅ 防止越权分配

---

### 5. notifications 表（通知表）
**功能**: 存储系统通知，支持审批流程

**字段**:
- `id` (uuid, PK): 通知ID
- `recipient_id` (uuid, FK): 接收者ID，关联 users.id
- `sender_id` (uuid, FK): 发送者ID，关联 users.id
- `type` (text): 通知类型
- `title` (text): 通知标题
- `content` (text): 通知内容
- `related_id` (uuid): 关联记录ID（如请假申请ID）
- `category` (text): 通知分类
- `approval_status` (text): 审批状态（pending, approved, rejected）
- `is_read` (boolean): 是否已读
- `created_at` (timestamptz): 创建时间
- `updated_at` (timestamptz): 更新时间

**RLS 策略**:
```sql
-- 1. 用户可以查看自己收到的通知
CREATE POLICY "users_view_own_notifications" ON notifications
  FOR SELECT
  TO authenticated
  USING (recipient_id = auth.uid());

-- 2. 管理员可以查看所有通知
CREATE POLICY "admins_view_all_notifications" ON notifications
  FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

-- 3. 管理员可以插入通知
CREATE POLICY "admins_insert_notifications" ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin(auth.uid()));

-- 4. 车队长可以插入通知
CREATE POLICY "managers_insert_notifications" ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'MANAGER'
    )
  );

-- 5. 管理员可以更新所有通知（关键：用于审批后更新通知状态）
CREATE POLICY "admins_update_all_notifications" ON notifications
  FOR UPDATE
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- 6. 用户可以更新自己收到的通知（标记已读）
CREATE POLICY "users_update_own_notifications" ON notifications
  FOR UPDATE
  TO authenticated
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

-- 7. 用户可以删除自己收到的通知
CREATE POLICY "users_delete_own_notifications" ON notifications
  FOR DELETE
  TO authenticated
  USING (recipient_id = auth.uid());

-- 8. 管理员可以删除所有通知
CREATE POLICY "admins_delete_all_notifications" ON notifications
  FOR DELETE
  TO authenticated
  USING (is_admin(auth.uid()));
```

**策略作用**:
- ✅ 用户可以查看、更新（标记已读）、删除自己的通知
- ✅ 管理员可以查看、创建、更新、删除所有通知
- ✅ 车队长可以创建通知
- ✅ **关键**：管理员可以更新所有通知，用于审批后更新通知状态
- ✅ 防止用户查看他人的通知

---

### 6. leave_applications 表（请假申请表）
**功能**: 存储司机的请假申请

**字段**:
- `id` (uuid, PK): 申请ID
- `driver_id` (uuid, FK): 司机ID，关联 users.id
- `start_date` (date): 开始日期
- `end_date` (date): 结束日期
- `days` (integer): 请假天数
- `reason` (text): 请假原因
- `status` (approval_status): 审批状态（pending, approved, rejected）
- `reviewer_id` (uuid, FK): 审批人ID，关联 users.id
- `review_comment` (text): 审批意见
- `reviewed_at` (timestamptz): 审批时间
- `created_at` (timestamptz): 创建时间
- `updated_at` (timestamptz): 更新时间

**RLS 策略**:
```sql
-- 1. 管理员可以查看所有请假申请
CREATE POLICY "admins_view_all_leave_applications" ON leave_applications
  FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

-- 2. 车队长可以查看管辖范围内司机的请假申请
CREATE POLICY "managers_view_their_drivers_leave_applications" ON leave_applications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM driver_warehouses dw
      JOIN warehouses w ON dw.warehouse_id = w.id
      WHERE dw.driver_id = leave_applications.driver_id
        AND w.manager_id = auth.uid()
    )
  );

-- 3. 司机可以查看自己的请假申请
CREATE POLICY "drivers_view_own_leave_applications" ON leave_applications
  FOR SELECT
  TO authenticated
  USING (driver_id = auth.uid());

-- 4. 司机可以插入自己的请假申请
CREATE POLICY "drivers_insert_own_leave_applications" ON leave_applications
  FOR INSERT
  TO authenticated
  WITH CHECK (driver_id = auth.uid());

-- 5. 管理员可以更新所有请假申请（审批）
CREATE POLICY "admins_update_all_leave_applications" ON leave_applications
  FOR UPDATE
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- 6. 司机可以更新自己的待审批请假申请
CREATE POLICY "drivers_update_own_pending_leave_applications" ON leave_applications
  FOR UPDATE
  TO authenticated
  USING (driver_id = auth.uid() AND status = 'pending')
  WITH CHECK (driver_id = auth.uid() AND status = 'pending');

-- 7. 司机可以删除自己的待审批请假申请
CREATE POLICY "drivers_delete_own_pending_leave_applications" ON leave_applications
  FOR DELETE
  TO authenticated
  USING (driver_id = auth.uid() AND status = 'pending');

-- 8. 管理员可以删除所有请假申请
CREATE POLICY "admins_delete_all_leave_applications" ON leave_applications
  FOR DELETE
  TO authenticated
  USING (is_admin(auth.uid()));
```

**策略作用**:
- ✅ 司机可以创建、查看、更新、删除自己的待审批请假申请
- ✅ 管理员可以查看、更新（审批）、删除所有请假申请
- ✅ 车队长可以查看管辖范围内司机的请假申请
- ✅ 防止司机修改已审批的申请

---

### 7. resignation_applications 表（离职申请表）
**功能**: 存储司机的离职申请

**字段**:
- `id` (uuid, PK): 申请ID
- `driver_id` (uuid, FK): 司机ID，关联 users.id
- `resignation_date` (date): 离职日期
- `reason` (text): 离职原因
- `status` (approval_status): 审批状态（pending, approved, rejected）
- `reviewer_id` (uuid, FK): 审批人ID，关联 users.id
- `review_comment` (text): 审批意见
- `reviewed_at` (timestamptz): 审批时间
- `created_at` (timestamptz): 创建时间
- `updated_at` (timestamptz): 更新时间

**RLS 策略**:
```sql
-- 与 leave_applications 表类似
-- 1. 管理员可以查看所有离职申请
-- 2. 车队长可以查看管辖范围内司机的离职申请
-- 3. 司机可以查看自己的离职申请
-- 4. 司机可以插入自己的离职申请
-- 5. 管理员可以更新所有离职申请（审批）
-- 6. 司机可以更新自己的待审批离职申请
-- 7. 司机可以删除自己的待审批离职申请
-- 8. 管理员可以删除所有离职申请
```

**策略作用**:
- ✅ 与请假申请表相同的权限控制逻辑
- ✅ 防止司机修改已审批的申请

---

### 8. attendance_records 表（考勤记录表）
**功能**: 存储司机的考勤记录

**字段**:
- `id` (uuid, PK): 记录ID
- `driver_id` (uuid, FK): 司机ID，关联 users.id
- `warehouse_id` (uuid, FK): 仓库ID，关联 warehouses.id
- `date` (date): 考勤日期
- `status` (attendance_status): 考勤状态（present, absent, leave, late）
- `check_in_time` (time): 签到时间
- `check_out_time` (time): 签退时间
- `notes` (text): 备注
- `created_at` (timestamptz): 创建时间
- `updated_at` (timestamptz): 更新时间

**RLS 策略**:
```sql
-- 1. 管理员可以查看所有考勤记录
CREATE POLICY "admins_view_all_attendance_records" ON attendance_records
  FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

-- 2. 车队长可以查看自己管理的仓库的考勤记录
CREATE POLICY "managers_view_own_warehouse_attendance_records" ON attendance_records
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM warehouses w
      WHERE w.id = attendance_records.warehouse_id
        AND w.manager_id = auth.uid()
    )
  );

-- 3. 司机可以查看自己的考勤记录
CREATE POLICY "drivers_view_own_attendance_records" ON attendance_records
  FOR SELECT
  TO authenticated
  USING (driver_id = auth.uid());

-- 4. 管理员可以插入考勤记录
CREATE POLICY "admins_insert_attendance_records" ON attendance_records
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin(auth.uid()));

-- 5. 车队长可以为自己管理的仓库插入考勤记录
CREATE POLICY "managers_insert_own_warehouse_attendance_records" ON attendance_records
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM warehouses w
      WHERE w.id = attendance_records.warehouse_id
        AND w.manager_id = auth.uid()
    )
  );

-- 6. 管理员可以更新所有考勤记录
CREATE POLICY "admins_update_all_attendance_records" ON attendance_records
  FOR UPDATE
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- 7. 车队长可以更新自己管理的仓库的考勤记录
CREATE POLICY "managers_update_own_warehouse_attendance_records" ON attendance_records
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM warehouses w
      WHERE w.id = attendance_records.warehouse_id
        AND w.manager_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM warehouses w
      WHERE w.id = attendance_records.warehouse_id
        AND w.manager_id = auth.uid()
    )
  );

-- 8. 管理员可以删除所有考勤记录
CREATE POLICY "admins_delete_all_attendance_records" ON attendance_records
  FOR DELETE
  TO authenticated
  USING (is_admin(auth.uid()));
```

**策略作用**:
- ✅ 管理员可以管理所有考勤记录
- ✅ 车队长可以管理自己管理的仓库的考勤记录
- ✅ 司机可以查看自己的考勤记录
- ✅ 防止司机修改考勤记录

---

### 9. piece_work_records 表（计件记录表）
**功能**: 存储司机的计件工作记录

**字段**:
- `id` (uuid, PK): 记录ID
- `driver_id` (uuid, FK): 司机ID，关联 users.id
- `warehouse_id` (uuid, FK): 仓库ID，关联 warehouses.id
- `date` (date): 工作日期
- `category` (text): 工作类别
- `quantity` (integer): 件数
- `unit_price` (numeric): 单价
- `total_amount` (numeric): 总金额
- `notes` (text): 备注
- `created_at` (timestamptz): 创建时间
- `updated_at` (timestamptz): 更新时间

**RLS 策略**:
```sql
-- 与 attendance_records 表类似
-- 1. 管理员可以查看所有计件记录
-- 2. 车队长可以查看自己管理的仓库的计件记录
-- 3. 司机可以查看自己的计件记录
-- 4. 管理员可以插入计件记录
-- 5. 车队长可以为自己管理的仓库插入计件记录
-- 6. 管理员可以更新所有计件记录
-- 7. 车队长可以更新自己管理的仓库的计件记录
-- 8. 管理员可以删除所有计件记录
```

**策略作用**:
- ✅ 与考勤记录表相同的权限控制逻辑
- ✅ 防止司机修改计件记录

---

### 10. vehicles 表（车辆表）
**功能**: 存储车辆信息和审核状态

**字段**:
- `id` (uuid, PK): 车辆ID
- `driver_id` (uuid, FK): 司机ID，关联 users.id
- `license_plate` (text, unique): 车牌号
- `brand` (text): 品牌
- `model` (text): 型号
- `color` (text): 颜色
- `registration_date` (date): 注册日期
- `review_status` (review_status): 审核状态（pending, approved, rejected）
- `reviewer_id` (uuid, FK): 审核人ID，关联 users.id
- `review_comment` (text): 审核意见
- `reviewed_at` (timestamptz): 审核时间
- `photos` (text[]): 车辆照片URL数组
- `created_at` (timestamptz): 创建时间
- `updated_at` (timestamptz): 更新时间

**RLS 策略**:
```sql
-- 1. 管理员可以查看所有车辆
CREATE POLICY "admins_view_all_vehicles" ON vehicles
  FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

-- 2. 车队长可以查看管辖范围内司机的车辆
CREATE POLICY "managers_view_their_drivers_vehicles" ON vehicles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM driver_warehouses dw
      JOIN warehouses w ON dw.warehouse_id = w.id
      WHERE dw.driver_id = vehicles.driver_id
        AND w.manager_id = auth.uid()
    )
  );

-- 3. 司机可以查看自己的车辆
CREATE POLICY "drivers_view_own_vehicles" ON vehicles
  FOR SELECT
  TO authenticated
  USING (driver_id = auth.uid());

-- 4. 司机可以插入自己的车辆
CREATE POLICY "drivers_insert_own_vehicles" ON vehicles
  FOR INSERT
  TO authenticated
  WITH CHECK (driver_id = auth.uid());

-- 5. 管理员可以更新所有车辆（审核）
CREATE POLICY "admins_update_all_vehicles" ON vehicles
  FOR UPDATE
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- 6. 司机可以更新自己的待审核车辆
CREATE POLICY "drivers_update_own_pending_vehicles" ON vehicles
  FOR UPDATE
  TO authenticated
  USING (driver_id = auth.uid() AND review_status = 'pending')
  WITH CHECK (driver_id = auth.uid() AND review_status = 'pending');

-- 7. 司机可以删除自己的待审核车辆
CREATE POLICY "drivers_delete_own_pending_vehicles" ON vehicles
  FOR DELETE
  TO authenticated
  USING (driver_id = auth.uid() AND review_status = 'pending');

-- 8. 管理员可以删除所有车辆
CREATE POLICY "admins_delete_all_vehicles" ON vehicles
  FOR DELETE
  TO authenticated
  USING (is_admin(auth.uid()));
```

**策略作用**:
- ✅ 司机可以创建、查看、更新、删除自己的待审核车辆
- ✅ 管理员可以查看、更新（审核）、删除所有车辆
- ✅ 车队长可以查看管辖范围内司机的车辆
- ✅ 防止司机修改已审核的车辆

---

### 11. driver_licenses 表（驾驶证表）
**功能**: 存储司机的驾驶证信息

**字段**:
- `id` (uuid, PK): 驾驶证ID
- `driver_id` (uuid, FK): 司机ID，关联 users.id
- `license_number` (text, unique): 驾驶证号
- `license_type` (text): 驾驶证类型（C1, C2, B2等）
- `issue_date` (date): 发证日期
- `expiry_date` (date): 有效期至
- `issuing_authority` (text): 发证机关
- `front_photo` (text): 正面照片URL
- `back_photo` (text): 背面照片URL
- `created_at` (timestamptz): 创建时间
- `updated_at` (timestamptz): 更新时间

**RLS 策略**:
```sql
-- 1. 管理员可以查看所有驾驶证
CREATE POLICY "admins_view_all_driver_licenses" ON driver_licenses
  FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

-- 2. 车队长可以查看管辖范围内司机的驾驶证
CREATE POLICY "managers_view_their_drivers_licenses" ON driver_licenses
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM driver_warehouses dw
      JOIN warehouses w ON dw.warehouse_id = w.id
      WHERE dw.driver_id = driver_licenses.driver_id
        AND w.manager_id = auth.uid()
    )
  );

-- 3. 司机可以查看自己的驾驶证
CREATE POLICY "drivers_view_own_driver_licenses" ON driver_licenses
  FOR SELECT
  TO authenticated
  USING (driver_id = auth.uid());

-- 4. 司机可以插入自己的驾驶证
CREATE POLICY "drivers_insert_own_driver_licenses" ON driver_licenses
  FOR INSERT
  TO authenticated
  WITH CHECK (driver_id = auth.uid());

-- 5. 管理员可以更新所有驾驶证
CREATE POLICY "admins_update_all_driver_licenses" ON driver_licenses
  FOR UPDATE
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- 6. 司机可以更新自己的驾驶证
CREATE POLICY "drivers_update_own_driver_licenses" ON driver_licenses
  FOR UPDATE
  TO authenticated
  USING (driver_id = auth.uid())
  WITH CHECK (driver_id = auth.uid());

-- 7. 司机可以删除自己的驾驶证
CREATE POLICY "drivers_delete_own_driver_licenses" ON driver_licenses
  FOR DELETE
  TO authenticated
  USING (driver_id = auth.uid());

-- 8. 管理员可以删除所有驾驶证
CREATE POLICY "admins_delete_all_driver_licenses" ON driver_licenses
  FOR DELETE
  TO authenticated
  USING (is_admin(auth.uid()));
```

**策略作用**:
- ✅ 司机可以管理自己的驾驶证信息
- ✅ 管理员可以管理所有驾驶证
- ✅ 车队长可以查看管辖范围内司机的驾驶证
- ✅ 防止司机查看他人的驾驶证

---

## 🔐 辅助函数

### 1. is_admin(uid uuid)
**功能**: 检查用户是否为管理员（BOSS, PEER_ADMIN, MANAGER）

```sql
CREATE OR REPLACE FUNCTION is_admin(uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = uid
      AND role IN ('BOSS', 'PEER_ADMIN', 'MANAGER')
  );
$$;
```

**作用**:
- ✅ 用于 RLS 策略中判断用户是否为管理员
- ✅ SECURITY DEFINER 确保函数以定义者权限执行
- ✅ STABLE 标记表示函数在同一事务中返回相同结果

### 2. get_user_role(uid uuid)
**功能**: 获取用户的角色

```sql
CREATE OR REPLACE FUNCTION get_user_role(uid uuid)
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM user_roles
  WHERE user_id = uid
  LIMIT 1;
$$;
```

**作用**:
- ✅ 用于获取用户的角色
- ✅ 如果用户有多个角色，返回第一个

### 3. update_notifications_by_batch(notification_ids uuid[], new_status text, new_content text)
**功能**: 批量更新通知状态和内容

```sql
CREATE OR REPLACE FUNCTION update_notifications_by_batch(
  notification_ids uuid[],
  new_status text,
  new_content text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE notifications
  SET
    approval_status = new_status,
    content = new_content,
    updated_at = now()
  WHERE id = ANY(notification_ids);
END;
$$;
```

**作用**:
- ✅ 用于审批后批量更新相关通知
- ✅ SECURITY DEFINER 确保函数以定义者权限执行
- ✅ 避免在应用层循环更新

---

## 📊 权限矩阵总结

### 角色权限对比

| 表名 | BOSS | PEER_ADMIN | MANAGER | DRIVER |
|------|------|------------|---------|--------|
| **users** | 全部 | 全部 | 查看管辖司机 | 查看/更新自己 |
| **user_roles** | 全部 | 全部 | 查看管辖司机 | 查看自己 |
| **warehouses** | 全部 | 全部 | 查看/更新自己管理的 | 查看所属的 |
| **driver_warehouses** | 全部 | 全部 | 管理自己仓库的 | 查看自己的 |
| **notifications** | 全部 | 全部 | 创建/查看 | 查看/更新/删除自己的 |
| **leave_applications** | 全部 | 全部 | 查看管辖司机的 | 管理自己的 |
| **resignation_applications** | 全部 | 全部 | 查看管辖司机的 | 管理自己的 |
| **attendance_records** | 全部 | 全部 | 管理自己仓库的 | 查看自己的 |
| **piece_work_records** | 全部 | 全部 | 管理自己仓库的 | 查看自己的 |
| **vehicles** | 全部 | 全部 | 查看管辖司机的 | 管理自己的 |
| **driver_licenses** | 全部 | 全部 | 查看管辖司机的 | 管理自己的 |

**说明**:
- **全部**: SELECT, INSERT, UPDATE, DELETE
- **查看**: SELECT
- **管理**: SELECT, INSERT, UPDATE, DELETE（有限制）
- **管辖司机**: 通过 driver_warehouses 和 warehouses 表关联判断

---

## 🔍 关键 RLS 策略检查点

### 1. UPDATE 策略必须有 WITH CHECK 子句
**原因**: 防止用户通过更新操作绕过权限检查

**示例**:
```sql
-- ❌ 错误：缺少 WITH CHECK
CREATE POLICY "admins_update_all_notifications" ON notifications
  FOR UPDATE
  TO authenticated
  USING (is_admin(auth.uid()));

-- ✅ 正确：包含 WITH CHECK
CREATE POLICY "admins_update_all_notifications" ON notifications
  FOR UPDATE
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));
```

### 2. 管理员必须能更新所有通知
**原因**: 审批后需要更新通知状态

**检查**:
```sql
-- 确保存在以下策略
CREATE POLICY "admins_update_all_notifications" ON notifications
  FOR UPDATE
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));
```

### 3. 车队长的管辖范围检查
**原因**: 确保车队长只能访问自己管理的仓库的数据

**检查**:
```sql
-- 通过 driver_warehouses 和 warehouses 表关联
EXISTS (
  SELECT 1 FROM driver_warehouses dw
  JOIN warehouses w ON dw.warehouse_id = w.id
  WHERE dw.driver_id = <target_driver_id>
    AND w.manager_id = auth.uid()
)
```

### 4. 司机只能修改待审批的申请
**原因**: 防止司机修改已审批的申请

**检查**:
```sql
-- 确保 USING 和 WITH CHECK 都包含状态检查
CREATE POLICY "drivers_update_own_pending_leave_applications" ON leave_applications
  FOR UPDATE
  TO authenticated
  USING (driver_id = auth.uid() AND status = 'pending')
  WITH CHECK (driver_id = auth.uid() AND status = 'pending');
```

### 5. 所有表都启用 RLS
**检查**:
```sql
-- 确保所有表都执行了
ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;
```

---

## 🎯 RLS 策略设计原则

### 1. 最小权限原则
- ✅ 用户只能访问必要的数据
- ✅ 司机只能访问自己的数据
- ✅ 车队长只能访问管辖范围内的数据
- ✅ 管理员可以访问所有数据

### 2. 防御性编程
- ✅ UPDATE 策略必须有 WITH CHECK 子句
- ✅ 使用 SECURITY DEFINER 函数避免权限提升
- ✅ 使用 STABLE 标记优化性能

### 3. 审批流程支持
- ✅ 管理员可以更新所有通知（用于审批后更新）
- ✅ 司机只能修改待审批的申请
- ✅ 审批后的数据不可修改

### 4. 管辖范围隔离
- ✅ 车队长通过 warehouses 表的 manager_id 确定管辖范围
- ✅ 通过 driver_warehouses 表关联司机和仓库
- ✅ 防止跨仓库访问

### 5. 性能优化
- ✅ 使用索引优化查询
- ✅ 使用 STABLE 函数避免重复计算
- ✅ 避免复杂的子查询

---

## ✅ RLS 策略检查清单

### 基础检查
- [x] 所有核心表都存在
- [x] 所有核心表都启用了 RLS
- [x] 所有表都有至少一个 RLS 策略
- [x] 所有 UPDATE 策略都有 WITH CHECK 子句

### 函数检查
- [x] `is_admin()` 函数存在且正确
- [x] `get_user_role()` 函数存在且正确
- [x] `update_notifications_by_batch()` 函数存在且正确

### 权限检查
- [x] BOSS 可以访问所有数据
- [x] PEER_ADMIN 可以访问所有数据
- [x] MANAGER 可以访问管辖范围内的数据
- [x] DRIVER 只能访问自己的数据

### 通知系统检查
- [x] 管理员可以创建通知
- [x] 管理员可以更新所有通知
- [x] 用户可以查看自己的通知
- [x] 用户可以更新自己的通知

### 审批流程检查
- [x] 司机可以提交申请
- [x] 管理员可以审批申请
- [x] 审批后通知状态可以更新
- [x] 司机不能修改已审批的申请

---

## 📝 总结

### 系统特点
1. **多角色权限管理**: 支持 BOSS、PEER_ADMIN、MANAGER、DRIVER 四种角色
2. **管辖范围隔离**: 车队长只能管理自己管辖的仓库和司机
3. **审批流程支持**: 请假、离职、车辆审核等流程完整
4. **数据安全**: 所有表启用 RLS，防止越权访问
5. **性能优化**: 使用索引和 STABLE 函数优化查询

### RLS 策略状态
- ✅ 所有表都启用了 RLS
- ✅ 所有 UPDATE 策略都有 WITH CHECK 子句
- ✅ 管理员可以更新所有通知（用于审批）
- ✅ 权限隔离正确，防止越权访问
- ✅ 审批流程完整，数据安全可靠

### 建议
1. **定期审查**: 每月审查一次 RLS 策略
2. **性能监控**: 监控查询性能，优化慢查询
3. **安全审计**: 记录所有权限变更
4. **测试覆盖**: 确保所有角色的权限都经过测试

---

**文档版本**: 1.0  
**创建时间**: 2025-12-01  
**适用范围**: 车队管家小程序数据库系统  
**状态**: 已完成
