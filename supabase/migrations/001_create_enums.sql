/*
# 创建枚举类型

## 说明
定义系统中使用的所有枚举类型，包括用户角色、司机类型、考勤状态、请假类型、申请状态等。

## 枚举类型列表

1. **user_role** - 用户角色
   - driver: 司机
   - manager: 管理员
   - super_admin: 超级管理员

2. **driver_type** - 司机类型
   - pure: 纯司机（不带车）
   - with_vehicle: 带车司机

3. **attendance_status** - 考勤状态
   - normal: 正常
   - late: 迟到
   - early: 早退
   - absent: 缺勤

4. **leave_type** - 请假类型
   - sick: 病假
   - personal: 事假
   - annual: 年假
   - other: 其他

5. **application_status** - 申请状态
   - pending: 待审批
   - approved: 已批准
   - rejected: 已拒绝
   - cancelled: 已取消

6. **record_type** - 车辆记录类型
   - rental: 租赁
   - maintenance: 维修
   - accident: 事故

7. **record_status** - 记录状态
   - active: 进行中
   - completed: 已完成
   - cancelled: 已取消

8. **feedback_status** - 反馈状态
   - pending: 待处理
   - resolved: 已解决

9. **review_status** - 审核状态
   - drafting: 草稿中
   - pending_review: 待审核
   - need_supplement: 需补充
   - approved: 已通过

## 注意事项
- 所有枚举类型使用 IF NOT EXISTS 避免重复创建
- 枚举值使用英文，便于代码处理
*/

-- 用户角色枚举
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('driver', 'manager', 'super_admin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 司机类型枚举
DO $$ BEGIN
  CREATE TYPE driver_type AS ENUM ('pure', 'with_vehicle');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 考勤状态枚举
DO $$ BEGIN
  CREATE TYPE attendance_status AS ENUM ('normal', 'late', 'early', 'absent');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 请假类型枚举
DO $$ BEGIN
  CREATE TYPE leave_type AS ENUM ('sick', 'personal', 'annual', 'other');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 申请状态枚举
DO $$ BEGIN
  CREATE TYPE application_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 车辆记录类型枚举
DO $$ BEGIN
  CREATE TYPE record_type AS ENUM ('rental', 'maintenance', 'accident');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 记录状态枚举
DO $$ BEGIN
  CREATE TYPE record_status AS ENUM ('active', 'completed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 反馈状态枚举
DO $$ BEGIN
  CREATE TYPE feedback_status AS ENUM ('pending', 'resolved');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 审核状态枚举
DO $$ BEGIN
  CREATE TYPE review_status AS ENUM ('drafting', 'pending_review', 'need_supplement', 'approved');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
