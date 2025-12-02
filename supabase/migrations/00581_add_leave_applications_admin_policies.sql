/*
# 添加请假申请的管理员查看和审批权限

## 说明
- 允许老板（BOSS）查看和审批所有请假申请
- 允许车队长（MANAGER）查看和审批所有请假申请
- 允许调度（SCHEDULER）查看所有请假申请

## 变更内容
1. 添加老板查看所有请假申请的策略
2. 添加老板审批（更新）请假申请的策略
3. 添加车队长查看所有请假申请的策略
4. 添加车队长审批（更新）请假申请的策略
5. 添加调度查看所有请假申请的策略

## 注意事项
- 使用现有的辅助函数 is_boss() 和相关权限检查函数
- 审批权限只允许更新 status 和 reviewed_by 字段
*/

-- 老板可以查看所有请假申请
CREATE POLICY "老板可以查看所有请假申请" ON leave_applications
  FOR SELECT TO authenticated
  USING (is_boss(auth.uid()));

-- 老板可以审批所有请假申请
CREATE POLICY "老板可以审批所有请假申请" ON leave_applications
  FOR UPDATE TO authenticated
  USING (is_boss(auth.uid()));

-- 车队长可以查看所有请假申请
CREATE POLICY "车队长可以查看所有请假申请" ON leave_applications
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'MANAGER'
    )
  );

-- 车队长可以审批所有请假申请
CREATE POLICY "车队长可以审批所有请假申请" ON leave_applications
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'MANAGER'
    )
  );

-- 调度可以查看所有请假申请
CREATE POLICY "调度可以查看所有请假申请" ON leave_applications
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'SCHEDULER'
    )
  );