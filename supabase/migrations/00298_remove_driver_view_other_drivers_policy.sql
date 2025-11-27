/*
# 删除错误的 RLS 策略

## 问题
之前添加的策略允许司机查看同租户的其他司机，这是不正确的。
司机只应该能够：
1. 查看自己的信息
2. 查看自己租户的管理员（老板、车队长、平级账号）- 用于提交申请
3. 不能查看其他司机的信息

## 修复
删除 "Drivers can view same tenant drivers" 策略
*/

-- 删除错误的策略
DROP POLICY IF EXISTS "Drivers can view same tenant drivers" ON profiles;
