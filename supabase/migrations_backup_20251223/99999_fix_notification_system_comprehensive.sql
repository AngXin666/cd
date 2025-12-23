/*
# 通知系统全面修复

## 1. 问题分析
- 审批类通知缺少唯一标识，无法精确更新
- 获取认证用户失败
- 查询用户逻辑不明确
- RLS 策略可能过于严格

## 2. 解决方案
### 2.1 添加字段
- `batch_id`: 通知批次ID，同一批次的通知共享此ID
- `parent_notification_id`: 父通知ID，用于关联审批结果通知与原始申请通知

### 2.2 更新 RLS 策略
- 确保用户可以查看和更新自己的通知
- 确保管理员可以创建、查看、更新、删除所有通知
- 添加管理员更新所有通知的策略（用于审批后更新通知状态）

## 3. 变更内容
1. 添加 `batch_id` 字段（uuid 类型，可选）
2. 添加 `parent_notification_id` 字段（uuid 类型，可选，外键关联 notifications.id）
3. 为新字段创建索引
4. 更新 RLS 策略
5. 添加字段注释

## 4. 影响范围
- 通知表增加两个可选字段
- 不影响现有数据和功能
- 支持审批类通知的精确更新
*/

-- ============================================================
-- 第一部分：添加新字段
-- ============================================================

-- 添加 batch_id 字段
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS batch_id uuid;

-- 添加 parent_notification_id 字段
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS parent_notification_id uuid;

-- 添加外键约束（如果 parent_notification_id 不为空，必须引用有效的通知）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_notifications_parent'
  ) THEN
    ALTER TABLE notifications 
    ADD CONSTRAINT fk_notifications_parent 
    FOREIGN KEY (parent_notification_id) 
    REFERENCES notifications(id) 
    ON DELETE CASCADE;
  END IF;
END $$;

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_notifications_batch_id ON notifications(batch_id);
CREATE INDEX IF NOT EXISTS idx_notifications_parent_id ON notifications(parent_notification_id);
CREATE INDEX IF NOT EXISTS idx_notifications_related_id ON notifications(related_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type_related ON notifications(type, related_id);

-- 添加字段注释
COMMENT ON COLUMN notifications.batch_id IS '通知批次ID，同一批次的通知共享此ID，用于批量更新';
COMMENT ON COLUMN notifications.parent_notification_id IS '父通知ID，用于关联审批结果通知与原始申请通知';

-- ============================================================
-- 第二部分：更新 RLS 策略
-- ============================================================

-- 删除所有现有策略
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can create notifications" ON notifications;
DROP POLICY IF EXISTS "Admins can create notifications" ON notifications;
DROP POLICY IF EXISTS "Admins can view all notifications" ON notifications;
DROP POLICY IF EXISTS "Admins can update all notifications" ON notifications;
DROP POLICY IF EXISTS "Admins can delete notifications" ON notifications;
DROP POLICY IF EXISTS "Allow users to delete their own notifications" ON notifications;
DROP POLICY IF EXISTS "Allow admins to insert notifications" ON notifications;
DROP POLICY IF EXISTS "Allow admins to update notifications" ON notifications;

-- 1. 用户可以查看自己收到的通知
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT
  USING (auth.uid() = recipient_id);

-- 2. 用户可以更新自己收到的通知（标记已读、删除等）
CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE
  USING (auth.uid() = recipient_id);

-- 3. 用户可以删除自己的通知
CREATE POLICY "Users can delete their own notifications" ON notifications
  FOR DELETE
  USING (auth.uid() = recipient_id);

-- 4. 管理员可以创建通知
CREATE POLICY "Admins can create notifications" ON notifications
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('BOSS', 'MANAGER')
    )
  );

-- 5. 管理员可以查看所有通知
CREATE POLICY "Admins can view all notifications" ON notifications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('BOSS', 'MANAGER')
    )
  );

-- 6. 管理员可以更新所有通知（用于审批后更新通知状态）
CREATE POLICY "Admins can update all notifications" ON notifications
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('BOSS', 'MANAGER')
    )
  );

-- 7. 管理员可以删除所有通知
CREATE POLICY "Admins can delete all notifications" ON notifications
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('BOSS', 'MANAGER')
    )
  );

-- ============================================================
-- 第三部分：创建辅助函数
-- ============================================================

-- 创建函数：获取用户角色
CREATE OR REPLACE FUNCTION get_user_role(user_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role::text
  FROM profiles
  WHERE id = user_id
  LIMIT 1;
$$;

-- 创建函数：检查用户是否为管理员
CREATE OR REPLACE FUNCTION is_admin_user(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = user_id
    AND role IN ('BOSS', 'MANAGER')
  );
$$;

-- 创建函数：批量更新通知状态
CREATE OR REPLACE FUNCTION update_notifications_by_batch(
  p_batch_id uuid,
  p_approval_status text,
  p_content text DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_updated_count integer;
BEGIN
  -- 更新通知
  UPDATE notifications
  SET 
    approval_status = p_approval_status,
    content = COALESCE(p_content, content),
    updated_at = now()
  WHERE batch_id = p_batch_id
  AND type LIKE '%_submitted';  -- 只更新原始申请通知
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  RETURN v_updated_count;
END;
$$;

-- 添加函数注释
COMMENT ON FUNCTION get_user_role(uuid) IS '获取用户角色';
COMMENT ON FUNCTION is_admin_user(uuid) IS '检查用户是否为管理员（BOSS 或 MANAGER）';
COMMENT ON FUNCTION update_notifications_by_batch(uuid, text, text) IS '批量更新指定批次的通知状态';

-- ============================================================
-- 第四部分：数据验证
-- ============================================================

-- 验证表结构
DO $$
DECLARE
  v_batch_id_exists boolean;
  v_parent_id_exists boolean;
BEGIN
  -- 检查 batch_id 字段是否存在
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications'
    AND column_name = 'batch_id'
  ) INTO v_batch_id_exists;
  
  -- 检查 parent_notification_id 字段是否存在
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications'
    AND column_name = 'parent_notification_id'
  ) INTO v_parent_id_exists;
  
  -- 输出验证结果
  RAISE NOTICE '✅ 字段验证:';
  RAISE NOTICE '  - batch_id: %', CASE WHEN v_batch_id_exists THEN '存在' ELSE '不存在' END;
  RAISE NOTICE '  - parent_notification_id: %', CASE WHEN v_parent_id_exists THEN '存在' ELSE '不存在' END;
  
  -- 如果字段不存在，抛出错误
  IF NOT v_batch_id_exists OR NOT v_parent_id_exists THEN
    RAISE EXCEPTION '字段创建失败';
  END IF;
END $$;

-- 验证索引
DO $$
DECLARE
  v_index_count integer;
BEGIN
  SELECT COUNT(*) INTO v_index_count
  FROM pg_indexes
  WHERE tablename = 'notifications'
  AND indexname IN (
    'idx_notifications_batch_id',
    'idx_notifications_parent_id',
    'idx_notifications_related_id',
    'idx_notifications_type_related'
  );
  
  RAISE NOTICE '✅ 索引验证: 创建了 % 个索引', v_index_count;
END $$;

-- 验证 RLS 策略
DO $$
DECLARE
  v_policy_count integer;
BEGIN
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE tablename = 'notifications';
  
  RAISE NOTICE '✅ RLS 策略验证: 共有 % 个策略', v_policy_count;
END $$;

-- 验证函数
DO $$
DECLARE
  v_function_count integer;
BEGIN
  SELECT COUNT(*) INTO v_function_count
  FROM pg_proc
  WHERE proname IN (
    'get_user_role',
    'is_admin_user',
    'update_notifications_by_batch'
  );
  
  RAISE NOTICE '✅ 函数验证: 创建了 % 个函数', v_function_count;
END $$;

RAISE NOTICE '🎉 通知系统修复完成！';
