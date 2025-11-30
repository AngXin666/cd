/*
# 清理请假和离职申请表的旧 RLS 策略

## 背景
数据库中可能存在旧的 RLS 策略，这些策略引用了已删除的 `profiles` 表，
导致查询失败。本迁移文件清理所有旧策略，确保只使用新的策略。

## 变更内容
1. 删除 leave_applications 表的所有旧策略
2. 删除 resignation_applications 表的所有旧策略
3. 确保表启用 RLS
4. 重新创建正确的 RLS 策略（使用 user_roles 表）

## 注意事项
- 使用 CASCADE 删除所有依赖对象
- 策略名称可能因历史迁移而不同，使用通配符删除
*/

-- 1. 禁用 RLS（临时）
ALTER TABLE IF EXISTS leave_applications DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS resignation_applications DISABLE ROW LEVEL SECURITY;

-- 2. 删除 leave_applications 表的所有策略
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'leave_applications'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON leave_applications', policy_record.policyname);
  END LOOP;
END $$;

-- 3. 删除 resignation_applications 表的所有策略
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'resignation_applications'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON resignation_applications', policy_record.policyname);
  END LOOP;
END $$;

-- 4. 重新启用 RLS
ALTER TABLE leave_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE resignation_applications ENABLE ROW LEVEL SECURITY;

-- 5. 创建新的 RLS 策略（使用 user_roles 表）

-- ==================== leave_applications 策略 ====================

-- 管理员可以查看所有申请
CREATE POLICY "Managers can view all leave applications" ON leave_applications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('boss', 'manager')
    )
  );

-- 管理员可以更新所有申请
CREATE POLICY "Managers can update all leave applications" ON leave_applications
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('boss', 'manager')
    )
  );

-- 管理员可以删除所有申请
CREATE POLICY "Managers can delete all leave applications" ON leave_applications
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('boss', 'manager')
    )
  );

-- 用户可以查看自己的申请
CREATE POLICY "Users can view own leave applications" ON leave_applications
  FOR SELECT
  USING (user_id = auth.uid());

-- 用户可以创建自己的申请
CREATE POLICY "Users can create own leave applications" ON leave_applications
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- 用户可以更新自己的待审批申请
CREATE POLICY "Users can update own pending leave applications" ON leave_applications
  FOR UPDATE
  USING (user_id = auth.uid() AND status = 'pending');

-- 用户可以删除自己的待审批申请
CREATE POLICY "Users can delete own pending leave applications" ON leave_applications
  FOR DELETE
  USING (user_id = auth.uid() AND status = 'pending');

-- ==================== resignation_applications 策略 ====================

-- 管理员可以查看所有申请
CREATE POLICY "Managers can view all resignation applications" ON resignation_applications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('boss', 'manager')
    )
  );

-- 管理员可以更新所有申请
CREATE POLICY "Managers can update all resignation applications" ON resignation_applications
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('boss', 'manager')
    )
  );

-- 管理员可以删除所有申请
CREATE POLICY "Managers can delete all resignation applications" ON resignation_applications
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('boss', 'manager')
    )
  );

-- 用户可以查看自己的申请
CREATE POLICY "Users can view own resignation applications" ON resignation_applications
  FOR SELECT
  USING (user_id = auth.uid());

-- 用户可以创建自己的申请
CREATE POLICY "Users can create own resignation applications" ON resignation_applications
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- 用户可以更新自己的待审批申请
CREATE POLICY "Users can update own pending resignation applications" ON resignation_applications
  FOR UPDATE
  USING (user_id = auth.uid() AND status = 'pending');

-- 用户可以删除自己的待审批申请
CREATE POLICY "Users can delete own pending resignation applications" ON resignation_applications
  FOR DELETE
  USING (user_id = auth.uid() AND status = 'pending');
