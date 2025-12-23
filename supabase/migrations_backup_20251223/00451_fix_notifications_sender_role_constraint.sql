/*
# 修复 notifications 表的 sender_role 检查约束

## 问题描述
创建通知时违反了检查约束 `notifications_sender_role_check`。

错误信息：
```
new row for relation "notifications" violates check constraint "notifications_sender_role_check"
```

## 根本原因
1. `public.notifications` 表的 `sender_role` 字段有检查约束，只允许：`manager`、`super_admin`、`driver`
2. 系统角色已经改变：
   - 中央管理系统：`super_admin`、`boss`
   - 租户系统：`boss`、`peer`、`fleet_leader`、`driver`
3. 当租户用户（boss、peer、fleet_leader）创建通知时，`sender_role` 的值不在允许列表中

## 解决方案
更新 `public.notifications` 表的 `sender_role_check` 约束，允许所有有效的角色值：
- `super_admin`（中央管理员）
- `boss`（老板）
- `peer`（平级账号）
- `fleet_leader`（车队长）
- `driver`（司机）
- `manager`（旧角色，保留兼容性）
- `system`（系统通知）

## 安全考虑
- 保留数据验证，确保 `sender_role` 的值是有效的
- 允许所有系统中使用的角色值
- 保留 `system` 作为系统通知的发送者角色

*/

-- 删除旧的检查约束
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_sender_role_check;

-- 创建新的检查约束，允许所有有效的角色值
ALTER TABLE notifications ADD CONSTRAINT notifications_sender_role_check 
  CHECK (sender_role IN (
    'super_admin',    -- 中央管理员
    'boss',           -- 老板
    'peer',           -- 平级账号
    'fleet_leader',   -- 车队长
    'driver',         -- 司机
    'manager',        -- 旧角色（保留兼容性）
    'system'          -- 系统通知
  ));

-- 添加注释
COMMENT ON CONSTRAINT notifications_sender_role_check ON notifications IS 
  '发送者角色检查约束：允许 super_admin、boss、peer、fleet_leader、driver、manager、system';
