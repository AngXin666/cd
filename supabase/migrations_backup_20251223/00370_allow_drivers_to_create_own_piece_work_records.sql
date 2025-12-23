/*
# 允许司机创建自己的计件记录

## 说明
添加 RLS 策略，允许司机创建自己的计件记录。

## 变更内容
1. 添加新的 INSERT 策略，允许司机创建 user_id 等于自己 ID 的计件记录
2. 添加新的 UPDATE 策略，允许司机更新自己的计件记录

## 安全性
- 司机只能创建 user_id 等于自己 ID 的记录
- 司机只能更新自己的记录
- 司机可以查看自己的记录
- 管理员、车队长、老板可以管理所有记录

*/

-- 允许司机创建自己的计件记录
CREATE POLICY "Drivers can create own piece work records" ON piece_work_records
  FOR INSERT 
  TO public
  WITH CHECK (user_id = auth.uid());

-- 允许司机更新自己的计件记录
CREATE POLICY "Drivers can update own piece work records" ON piece_work_records
  FOR UPDATE 
  TO public
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());