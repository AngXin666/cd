/*
# 为 users 表启用 RLS 并创建访问策略

## 问题描述
- `users` 表没有启用 RLS（行级安全）
- 导致前端无法查询用户数据
- 考勤管理页面读取不到司机列表

## 影响范围
- 无法查询用户列表
- 考勤管理功能失效
- 所有需要显示用户信息的页面都受影响

## 修复方案
1. 启用 `users` 表的 RLS
2. 创建 RLS 策略，允许认证用户查看所有用户信息
3. 创建 RLS 策略，允许用户更新自己的信息
4. 创建 RLS 策略，允许管理员（BOSS/MANAGER）管理所有用户

## RLS 策略设计
- 所有认证用户可以查看所有用户信息（用于显示司机列表、考勤管理等）
- 用户可以更新自己的信息
- 管理员（BOSS/MANAGER）可以管理所有用户
*/

-- 启用 RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- RLS 策略：所有认证用户可以查看所有用户信息
CREATE POLICY "认证用户可以查看所有用户" ON users
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS 策略：用户可以更新自己的信息
CREATE POLICY "用户可以更新自己的信息" ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- RLS 策略：管理员可以管理所有用户
CREATE POLICY "管理员可以管理所有用户" ON users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('BOSS'::user_role, 'MANAGER'::user_role)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('BOSS'::user_role, 'MANAGER'::user_role)
    )
  );