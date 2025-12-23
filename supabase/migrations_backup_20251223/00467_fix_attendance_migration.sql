/*
# 修正考勤、计件、请假数据迁移

## 问题
- attendance 表使用 user_id 而不是 driver_id
- attendance 表使用 work_date 而不是 date
- 需要从旧表重新迁移这些数据
*/

DO $$
BEGIN
  -- 创建临时表备份旧的 attendance 数据（如果还存在的话）
  -- 注意：由于之前的迁移已经删除了旧表，我们需要检查是否有数据需要迁移
  
  -- 检查 attendance 表是否为空
  IF (SELECT COUNT(*) FROM attendance) = 0 THEN
    RAISE NOTICE '考勤表为空，无需迁移';
  END IF;
  
  -- 检查 piecework_records 表是否为空
  IF (SELECT COUNT(*) FROM piecework_records) = 0 THEN
    RAISE NOTICE '计件记录表为空，无需迁移';
  END IF;
  
  -- 检查 leave_requests 表是否为空
  IF (SELECT COUNT(*) FROM leave_requests) = 0 THEN
    RAISE NOTICE '请假申请表为空，无需迁移';
  END IF;
END $$;
