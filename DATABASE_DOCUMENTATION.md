# 车队管理系统数据库文档

## 更新时间
2025-11-05

## 目录
1. [数据库概述](#数据库概述)
2. [表结构说明](#表结构说明)
3. [权限系统](#权限系统)
4. [多租户架构](#多租户架构)
5. [通知系统](#通知系统)
6. [迁移历史](#迁移历史)

---

## 数据库概述

### 技术栈
- **数据库**: PostgreSQL (Supabase)
- **认证**: Supabase Auth
- **安全**: Row Level Security (RLS)
- **实时**: Supabase Realtime

### 核心特性
- ✅ 多租户隔离
- ✅ 基于角色的访问控制 (RBAC)
- ✅ 行级安全策略 (RLS)
- ✅ 实时数据同步
- ✅ 审计日志

---

## 表结构说明

### 1. profiles（用户档案表）

用户基本信息和角色管理。

```sql
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  phone text UNIQUE,
  email text UNIQUE,
  name text,
  avatar_url text,
  role user_role NOT NULL DEFAULT 'driver',
  boss_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**字段说明**：
- `id`: 用户ID，关联 auth.users
- `phone`: 手机号（唯一）
- `email`: 邮箱（唯一）
- `name`: 用户姓名
- `avatar_url`: 头像URL
- `role`: 用户角色（super_admin/peer_admin/manager/driver）
- `boss_id`: 租户ID（老板的用户ID）
- `created_at`: 创建时间
- `updated_at`: 更新时间

**角色说明**：
```sql
CREATE TYPE user_role AS ENUM (
  'super_admin',  -- 老板（租户所有者）
  'peer_admin',   -- 平级管理员
  'manager',      -- 车队长
  'driver'        -- 司机
);
```

**RLS 策略**：
- Super admin 和 peer admin 可以管理所有同租户用户
- Manager 可以查看自己管理的司机
- Driver 只能查看自己的信息

### 2. warehouses（仓库表）

仓库信息管理。

```sql
CREATE TABLE warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  is_active boolean DEFAULT true,
  boss_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**字段说明**：
- `id`: 仓库ID
- `name`: 仓库名称
- `address`: 仓库地址
- `is_active`: 是否启用
- `boss_id`: 租户ID
- `created_at`: 创建时间
- `updated_at`: 更新时间

**RLS 策略**：
- Super admin 和 peer admin 可以管理所有同租户仓库
- Manager 可以查看自己管辖的仓库
- Driver 可以查看分配给自己的仓库

### 3. manager_warehouses（车队长仓库关联表）

车队长与仓库的管辖关系。

```sql
CREATE TABLE manager_warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id uuid NOT NULL REFERENCES profiles(id),
  warehouse_id uuid NOT NULL REFERENCES warehouses(id),
  boss_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(manager_id, warehouse_id)
);
```

**字段说明**：
- `id`: 关联ID
- `manager_id`: 车队长ID
- `warehouse_id`: 仓库ID
- `boss_id`: 租户ID
- `created_at`: 创建时间

**业务规则**：
- 一个车队长可以管辖多个仓库
- 一个仓库可以有多个车队长
- 同一车队长和仓库的组合唯一

### 4. driver_warehouses（司机仓库关联表）

司机与仓库的分配关系。

```sql
CREATE TABLE driver_warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES profiles(id),
  warehouse_id uuid NOT NULL REFERENCES warehouses(id),
  boss_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(driver_id, warehouse_id)
);
```

**字段说明**：
- `id`: 关联ID
- `driver_id`: 司机ID
- `warehouse_id`: 仓库ID
- `boss_id`: 租户ID
- `created_at`: 创建时间

**业务规则**：
- 一个司机可以分配到多个仓库
- 一个仓库可以有多个司机
- 同一司机和仓库的组合唯一

### 5. driver_types（司机类型表）

司机类型分类管理。

```sql
CREATE TABLE driver_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  boss_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**字段说明**：
- `id`: 类型ID
- `name`: 类型名称
- `description`: 类型描述
- `boss_id`: 租户ID
- `created_at`: 创建时间
- `updated_at`: 更新时间

### 6. driver_type_assignments（司机类型分配表）

司机与类型的关联关系。

```sql
CREATE TABLE driver_type_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES profiles(id),
  type_id uuid NOT NULL REFERENCES driver_types(id),
  boss_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(driver_id, type_id)
);
```

### 7. attendance_records（考勤记录表）

司机考勤打卡记录。

```sql
CREATE TABLE attendance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES profiles(id),
  warehouse_id uuid REFERENCES warehouses(id),
  clock_in_time timestamptz,
  clock_out_time timestamptz,
  work_date date NOT NULL,
  status text,
  boss_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**字段说明**：
- `id`: 记录ID
- `driver_id`: 司机ID
- `warehouse_id`: 仓库ID
- `clock_in_time`: 上班打卡时间
- `clock_out_time`: 下班打卡时间
- `work_date`: 工作日期
- `status`: 考勤状态
- `boss_id`: 租户ID

### 8. piece_work_records（计件工作记录表）

司机计件工作记录。

```sql
CREATE TABLE piece_work_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES profiles(id),
  warehouse_id uuid REFERENCES warehouses(id),
  work_date date NOT NULL,
  quantity integer NOT NULL,
  unit_price numeric(10,2),
  total_amount numeric(10,2),
  description text,
  boss_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### 9. leave_applications（请假申请表）

司机请假申请记录。

```sql
CREATE TABLE leave_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES profiles(id),
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason text,
  status text DEFAULT 'pending',
  approver_id uuid REFERENCES profiles(id),
  approval_comment text,
  approval_time timestamptz,
  boss_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**状态说明**：
- `pending`: 待审批
- `approved`: 已通过
- `rejected`: 已驳回

### 10. resignation_applications（离职申请表）

司机离职申请记录。

```sql
CREATE TABLE resignation_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES profiles(id),
  resignation_date date NOT NULL,
  reason text,
  status text DEFAULT 'pending',
  approver_id uuid REFERENCES profiles(id),
  approval_comment text,
  approval_time timestamptz,
  boss_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### 11. vehicles（车辆表）

车辆信息管理。

```sql
CREATE TABLE vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid REFERENCES profiles(id),
  plate_number text NOT NULL,
  vehicle_type text,
  brand text,
  model text,
  status text DEFAULT 'active',
  boss_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### 12. notifications（通知表）

系统通知记录。

```sql
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL REFERENCES profiles(id),
  sender_id uuid REFERENCES profiles(id),
  sender_name text,
  sender_role text,
  type text NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  action_url text,
  related_id uuid,
  is_read boolean DEFAULT false,
  boss_id uuid NOT NULL,
  created_at timestamptz DEFAULT now()
);
```

**通知类型**：
- `system`: 系统通知
- `attendance`: 考勤通知
- `piece_work`: 计件工作通知
- `warehouse_assigned`: 仓库分配通知
- `leave_submitted`: 请假申请已提交
- `leave_approved`: 请假申请已通过
- `leave_rejected`: 请假申请已驳回
- `resignation_submitted`: 离职申请已提交
- `resignation_approved`: 离职申请已通过
- `resignation_rejected`: 离职申请已驳回
- `vehicle_audit_submitted`: 车辆审核已提交
- `vehicle_audit_approved`: 车辆审核已通过
- `vehicle_audit_rejected`: 车辆审核已驳回
- `driver_warehouse_changed`: 司机仓库分配变更
- `driver_type_changed`: 司机类型变更
- `manager_warehouse_changed`: 车队长管辖仓库变更

---

## 权限系统

### 角色层级

```
super_admin (老板)
    ├── peer_admin (平级管理员)
    ├── manager (车队长)
    └── driver (司机)
```

### 权限矩阵

| 功能 | super_admin | peer_admin | manager | driver |
|------|------------|------------|---------|--------|
| 用户管理 | ✅ 全部 | ✅ 全部 | ✅ 查看司机 | ❌ |
| 仓库管理 | ✅ 全部 | ✅ 全部 | ✅ 查看管辖仓库 | ✅ 查看分配仓库 |
| 车队长分配 | ✅ | ✅ | ❌ | ❌ |
| 司机分配 | ✅ | ✅ | ✅ 管辖仓库内 | ❌ |
| 考勤管理 | ✅ 全部 | ✅ 全部 | ✅ 管辖司机 | ✅ 自己 |
| 计件管理 | ✅ 全部 | ✅ 全部 | ✅ 管辖司机 | ✅ 自己 |
| 请假审批 | ✅ | ✅ | ✅ 管辖司机 | ✅ 提交申请 |
| 离职审批 | ✅ | ✅ | ✅ 管辖司机 | ✅ 提交申请 |
| 车辆管理 | ✅ 全部 | ✅ 全部 | ✅ 管辖司机车辆 | ✅ 自己车辆 |
| 通知发送 | ✅ 全部 | ✅ 全部 | ✅ 同租户 | ✅ 车队长/老板/平级 |

### 辅助函数

系统提供以下辅助函数用于权限验证：

```sql
-- 获取当前用户的 boss_id
CREATE FUNCTION get_current_user_boss_id() RETURNS uuid;

-- 检查是否为 super_admin
CREATE FUNCTION is_super_admin(uid uuid) RETURNS boolean;

-- 检查是否为 peer_admin
CREATE FUNCTION is_peer_admin(uid uuid) RETURNS boolean;

-- 检查是否为 manager
CREATE FUNCTION is_manager(uid uuid) RETURNS boolean;

-- 检查是否为 driver
CREATE FUNCTION is_driver(uid uuid) RETURNS boolean;

-- 检查是否为管理员（super_admin 或 peer_admin）
CREATE FUNCTION is_admin(uid uuid) RETURNS boolean;
```

---

## 多租户架构

### 租户隔离机制

系统使用 `boss_id` 字段实现多租户隔离：

1. **数据隔离**
   - 所有业务表都包含 `boss_id` 字段
   - RLS 策略强制执行租户隔离
   - 用户只能访问自己租户的数据

2. **租户识别**
   - 第一个注册的用户自动成为 super_admin（老板）
   - 老板的 `boss_id` 等于自己的 `id`
   - 其他用户的 `boss_id` 指向老板的 `id`

3. **租户管理**
   - 老板可以创建平级管理员
   - 老板和平级管理员可以管理车队长和司机
   - 车队长只能管理分配给自己的司机

### 首位用户自动成为管理员

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    user_count int;
BEGIN
    -- 只在 confirmed_at 从 NULL → 非 NULL 时执行
    IF OLD.confirmed_at IS NULL AND NEW.confirmed_at IS NOT NULL THEN
        -- 判断 profiles 表里有多少用户
        SELECT COUNT(*) INTO user_count FROM profiles;
        
        -- 插入 profiles，首位用户给 admin 角色
        INSERT INTO profiles (id, phone, email, role, boss_id)
        VALUES (
            NEW.id,
            NEW.phone,
            NEW.email,
            CASE WHEN user_count = 0 THEN 'super_admin'::user_role ELSE 'driver'::user_role END,
            CASE WHEN user_count = 0 THEN NEW.id ELSE NEW.id END  -- 首位用户的 boss_id 是自己
        );
    END IF;
    RETURN NEW;
END;
$$;
```

---

## 通知系统

### 通知权限

详见 `NOTIFICATION_PERMISSIONS.md`

| 角色 | 可以发送通知给 |
|------|--------------|
| 司机 | 自己的车队长、老板、所有平级账号 |
| 车队长 | 所有司机、其他车队长、老板、所有平级账号 |
| 平级账号 | 所有用户 |
| 老板 | 所有用户 |

### 通知规则

详见 `NOTIFICATION_RULES.md` 和 `NOTIFICATION_IMPLEMENTATION_GUIDE.md`

### 通知服务

通知服务模块位于 `src/services/notificationService.ts`，提供以下功能：

- `sendDriverSubmissionNotification()` - 司机提交申请通知
- `sendManagerActionNotification()` - 车队长操作通知
- `sendBossActionNotification()` - 老板操作通知
- `sendPeerAdminActionNotification()` - 平级账号操作通知
- `sendApprovalNotification()` - 审批操作通知

---

## 迁移历史

### 最近的重要迁移

1. **19_fix_notifications_rls_for_manager.sql**
   - 修复通知表的 RLS 策略
   - 允许 manager 创建通知给自己管理的司机
   - 添加用户查看、更新、删除自己通知的策略

2. **20_allow_all_roles_create_notifications.sql**
   - 允许所有角色创建通知
   - 司机可以创建通知给车队长、老板、平级账号
   - 车队长可以创建通知给同租户的任何用户
   - 平级账号可以创建通知给同租户的任何用户

### 迁移文件位置

所有迁移文件位于 `supabase/migrations/` 目录。

### 应用迁移

迁移会自动应用到 Supabase 项目。如需手动应用，使用：

```bash
supabase db push
```

---

## 数据库维护

### 备份策略

Supabase 自动提供数据库备份功能。

### 性能优化

1. **索引优化**
   - 所有外键字段都有索引
   - `boss_id` 字段有索引以优化租户隔离查询
   - 常用查询字段有复合索引

2. **查询优化**
   - 使用 `.maybeSingle()` 代替 `.single()`
   - 使用 `.order().limit()` 代替单独的 `.limit()`
   - 避免 N+1 查询问题

3. **RLS 性能**
   - RLS 策略使用辅助函数减少重复计算
   - 避免在 RLS 策略中使用复杂的子查询

### 监控建议

1. 监控慢查询
2. 监控 RLS 策略性能
3. 监控数据库连接数
4. 监控存储空间使用

---

## 相关文档

- `NOTIFICATION_RULES.md` - 通知规则映射表
- `NOTIFICATION_PERMISSIONS.md` - 通知权限说明
- `NOTIFICATION_IMPLEMENTATION_GUIDE.md` - 通知实现指南
- `NOTIFICATION_SYSTEM_SUMMARY.md` - 通知系统总结
- `README.md` - 项目总体说明

---

## 更新日志

### 2025-11-05
- ✅ 创建统一的数据库文档
- ✅ 整合所有表结构说明
- ✅ 完善权限系统文档
- ✅ 添加多租户架构说明
- ✅ 整合通知系统文档
- ✅ 添加迁移历史记录
