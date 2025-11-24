/*
# 允许普通管理员创建司机账号

## 问题描述
普通管理员在添加司机时失败，因为：
1. profiles 表的 INSERT 策略只允许超级管理员插入记录
2. 普通管理员没有权限创建新用户

## 解决方案
1. 添加策略：允许普通管理员插入角色为 'driver' 的 profiles 记录
2. 确保 create_user_auth_account_first 函数使用 SECURITY DEFINER，允许普通管理员调用

## 安全考虑
- 普通管理员只能创建司机账号（role = 'driver'）
- 不能创建管理员或超级管理员账号
- 使用 with_check 确保插入的记录角色为 'driver'
*/

-- 添加策略：允许普通管理员插入司机记录
CREATE POLICY "Managers can insert driver profiles" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    is_manager(auth.uid()) AND role = 'driver'::user_role
  );

-- 确保 create_user_auth_account_first 函数使用 SECURITY DEFINER
-- 这样普通管理员也可以调用它来创建 auth.users 记录
-- 函数已经是 SECURITY DEFINER，无需修改