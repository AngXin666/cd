/*
# 修复 profiles 表的跨租户查看问题

## 问题
"All users can view managers" 策略允许所有用户查看所有管理员和老板，
没有考虑租户隔离，导致：
- 新老板在设置仓库管理员时能看到其他租户的管理员
- 新老板能看到其他租户的车队长

## 根本原因
策略条件：role = ANY (ARRAY['manager', 'super_admin'])
这个条件只检查角色，不检查 tenant_id，导致跨租户访问。

## 解决方案
删除 "All users can view managers" 策略。
租户隔离策略已经处理了所有访问控制：
- 租赁管理员可以查看所有用户
- 老板可以查看自己租户下的所有用户
- 管理员可以查看自己租户下的司机
- 用户可以查看自己的信息

## 影响
删除后，用户只能通过租户隔离策略访问 profiles：
- 同一租户内的用户可以互相查看
- 不同租户的用户无法互相查看
*/

-- 删除允许所有用户查看管理员的策略
DROP POLICY IF EXISTS "All users can view managers" ON profiles;

-- 同时删除其他可能导致跨租户访问的策略
DROP POLICY IF EXISTS "Managers can view all drivers" ON profiles;

-- 注意：保留以下策略
-- ✅ "租户数据隔离 - profiles" - 核心租户隔离策略
-- ✅ "Users can view their own profile" - 用户查看自己
-- ✅ "Users can update their own profile" - 用户更新自己
-- ✅ "Managers can insert driver profiles" - 管理员创建司机
-- ✅ "Managers can update driver profiles" - 管理员更新司机
-- ✅ "Managers can delete driver profiles" - 管理员删除司机
-- ✅ "租赁管理员查看所有用户" - 租赁管理员全局访问
-- ✅ "租赁管理员创建老板账号" - 租赁管理员创建租户
