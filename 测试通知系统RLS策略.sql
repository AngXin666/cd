-- 测试通知系统的 RLS 策略

-- ============================================================
-- 第一部分：准备测试数据
-- ============================================================

-- 创建测试用户（如果不存在）
DO $$
DECLARE
  v_boss_id uuid;
  v_manager_id uuid;
  v_driver_id uuid;
BEGIN
  -- 检查是否已有测试用户
  SELECT id INTO v_boss_id FROM profiles WHERE role = 'BOSS' LIMIT 1;
  SELECT id INTO v_manager_id FROM profiles WHERE role = 'MANAGER' LIMIT 1;
  SELECT id INTO v_driver_id FROM profiles WHERE role = 'DRIVER' LIMIT 1;
  
  RAISE NOTICE '测试用户:';
  RAISE NOTICE '  - BOSS ID: %', v_boss_id;
  RAISE NOTICE '  - MANAGER ID: %', v_manager_id;
  RAISE NOTICE '  - DRIVER ID: %', v_driver_id;
END $$;

-- ============================================================
-- 第二部分：测试 RLS 策略
-- ============================================================

-- 测试 1：查看通知表的所有策略
SELECT 
    policyname AS "策略名称",
    cmd AS "命令",
    permissive AS "允许/限制",
    roles AS "角色",
    CASE 
        WHEN qual IS NOT NULL THEN '有条件'
        ELSE '无条件'
    END AS "USING条件",
    CASE 
        WHEN with_check IS NOT NULL THEN '有检查'
        ELSE '无检查'
    END AS "WITH CHECK"
FROM pg_policies
WHERE tablename = 'notifications'
ORDER BY cmd, policyname;

-- 测试 2：检查通知表的字段
SELECT 
    column_name AS "字段名",
    data_type AS "数据类型",
    is_nullable AS "可为空",
    column_default AS "默认值"
FROM information_schema.columns
WHERE table_name = 'notifications'
AND column_name IN ('id', 'recipient_id', 'sender_id', 'type', 'related_id', 'batch_id', 'approval_status', 'parent_notification_id')
ORDER BY ordinal_position;

-- 测试 3：检查索引
SELECT 
    indexname AS "索引名",
    indexdef AS "索引定义"
FROM pg_indexes
WHERE tablename = 'notifications'
AND indexname LIKE '%batch%' OR indexname LIKE '%parent%' OR indexname LIKE '%related%'
ORDER BY indexname;

-- 测试 4：检查辅助函数
SELECT 
    proname AS "函数名",
    pg_get_function_arguments(oid) AS "参数",
    pg_get_function_result(oid) AS "返回类型"
FROM pg_proc
WHERE proname IN ('get_user_role', 'is_admin_user', 'update_notifications_by_batch')
ORDER BY proname;

-- ============================================================
-- 第三部分：模拟测试场景
-- ============================================================

-- 场景 1：司机提交请假申请，给老板和车队长发送通知
DO $$
DECLARE
  v_boss_id uuid;
  v_manager_id uuid;
  v_driver_id uuid;
  v_batch_id uuid := gen_random_uuid();
  v_application_id uuid := gen_random_uuid();
BEGIN
  -- 获取测试用户
  SELECT id INTO v_boss_id FROM profiles WHERE role = 'BOSS' LIMIT 1;
  SELECT id INTO v_manager_id FROM profiles WHERE role = 'MANAGER' LIMIT 1;
  SELECT id INTO v_driver_id FROM profiles WHERE role = 'DRIVER' LIMIT 1;
  
  IF v_boss_id IS NULL OR v_manager_id IS NULL OR v_driver_id IS NULL THEN
    RAISE NOTICE '⚠️ 缺少测试用户，跳过场景测试';
    RETURN;
  END IF;
  
  RAISE NOTICE '场景 1：司机提交请假申请';
  RAISE NOTICE '  - 司机 ID: %', v_driver_id;
  RAISE NOTICE '  - 申请 ID: %', v_application_id;
  RAISE NOTICE '  - 批次 ID: %', v_batch_id;
  
  -- 插入通知（给老板）
  INSERT INTO notifications (
    recipient_id,
    sender_id,
    type,
    title,
    content,
    related_id,
    batch_id,
    approval_status,
    is_read
  ) VALUES (
    v_boss_id,
    v_driver_id,
    'leave_application_submitted',
    '新的请假申请',
    '司机提交了请假申请，请审批',
    v_application_id,
    v_batch_id,
    'pending',
    false
  );
  
  -- 插入通知（给车队长）
  INSERT INTO notifications (
    recipient_id,
    sender_id,
    type,
    title,
    content,
    related_id,
    batch_id,
    approval_status,
    is_read
  ) VALUES (
    v_manager_id,
    v_driver_id,
    'leave_application_submitted',
    '新的请假申请',
    '司机提交了请假申请，请审批',
    v_application_id,
    v_batch_id,
    'pending',
    false
  );
  
  RAISE NOTICE '✅ 通知创建成功';
  
  -- 查询刚创建的通知
  RAISE NOTICE '查询批次通知:';
  FOR rec IN 
    SELECT 
      id,
      recipient_id,
      type,
      approval_status,
      batch_id
    FROM notifications
    WHERE batch_id = v_batch_id
  LOOP
    RAISE NOTICE '  - 通知 ID: %, 接收者: %, 状态: %', rec.id, rec.recipient_id, rec.approval_status;
  END LOOP;
  
  -- 模拟老板审批
  RAISE NOTICE '场景 2：老板审批请假申请';
  UPDATE notifications
  SET 
    approval_status = 'approved',
    content = '老板已批准请假申请',
    updated_at = now()
  WHERE batch_id = v_batch_id;
  
  RAISE NOTICE '✅ 通知状态更新成功';
  
  -- 查询更新后的通知
  RAISE NOTICE '查询更新后的通知:';
  FOR rec IN 
    SELECT 
      id,
      recipient_id,
      type,
      approval_status,
      content
    FROM notifications
    WHERE batch_id = v_batch_id
  LOOP
    RAISE NOTICE '  - 通知 ID: %, 接收者: %, 状态: %, 内容: %', rec.id, rec.recipient_id, rec.approval_status, rec.content;
  END LOOP;
  
  -- 清理测试数据
  DELETE FROM notifications WHERE batch_id = v_batch_id;
  RAISE NOTICE '✅ 测试数据已清理';
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ 测试失败: %', SQLERRM;
END $$;

-- ============================================================
-- 第四部分：验证结果
-- ============================================================

RAISE NOTICE '🎉 通知系统 RLS 策略测试完成！';
