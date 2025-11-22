/*
# 启用 Realtime 功能

## 说明
为实时通知系统启用 Supabase Realtime 功能。

## 启用的表
1. `leave_applications` - 请假申请表
   - 管理员需要实时接收新的请假申请
   - 司机需要实时接收审批结果

2. `resignation_applications` - 离职申请表
   - 管理员需要实时接收新的离职申请
   - 司机需要实时接收审批结果

3. `attendance` - 打卡记录表
   - 管理员需要实时接收新的打卡记录

## Realtime 配置
- 使用 REPLICA IDENTITY FULL 确保能够接收完整的行数据
- 将表添加到 realtime publication 中
*/

-- 为请假申请表启用 Realtime
ALTER TABLE leave_applications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE leave_applications;

-- 为离职申请表启用 Realtime
ALTER TABLE resignation_applications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE resignation_applications;

-- 为打卡记录表启用 Realtime
ALTER TABLE attendance REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE attendance;
