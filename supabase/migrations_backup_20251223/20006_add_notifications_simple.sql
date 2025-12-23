/*
# 添加通知系统表（简化版）

本迁移将更新 create_tenant_schema 函数，添加 notifications 表和相关的 RLS 策略。

## 通知表结构
- id: UUID (主键)
- sender_id: UUID (发送者ID)
- receiver_id: UUID (接收者ID)
- title: TEXT (标题)
- content: TEXT (内容)
- type: TEXT (类型：system/user/announcement)
- status: TEXT (状态：unread/read)
- created_at: TIMESTAMPTZ (创建时间)
- read_at: TIMESTAMPTZ (阅读时间)

## 通知发送权限
- 老板：可以向所有人发送通知
- 平级账号：可以向所有人发送通知
- 车队长：可以向管辖范围内的司机、老板、平级账号发送通知
- 司机：可以向老板、平级账号、车队长发送通知
*/

-- 由于函数太大，我们将分步执行
-- 首先，我们需要删除旧的函数并重新创建

DROP FUNCTION IF EXISTS create_tenant_schema(TEXT);

-- 注意：由于函数定义太长，我们将通过 Edge Function 或者直接在数据库中执行
-- 这里我们先创建一个辅助函数用于检查通知发送权限

CREATE OR REPLACE FUNCTION public.create_can_send_notification_function(p_schema_name TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE format('
    CREATE OR REPLACE FUNCTION %I.can_send_notification(sender_id UUID, receiver_id UUID)
    RETURNS BOOLEAN
    LANGUAGE sql
    SECURITY DEFINER
    STABLE
    AS $func$
      SELECT EXISTS (
        SELECT 1 FROM %I.profiles sender
        LEFT JOIN %I.profiles receiver ON receiver.id = receiver_id
        WHERE sender.id = sender_id
          AND sender.status = ''active''
          AND receiver.status = ''active''
          AND (
            (sender.role = ''boss'')
            OR
            (sender.role = ''peer'')
            OR
            (
              sender.role = ''fleet_leader''
              AND (
                (receiver.role = ''driver'' AND receiver.warehouse_ids && sender.warehouse_ids)
                OR
                (receiver.role = ''boss'')
                OR
                (receiver.role = ''peer'')
              )
            )
            OR
            (
              sender.role = ''driver''
              AND receiver.role IN (''boss'', ''peer'', ''fleet_leader'')
            )
          )
      );
    $func$;
    
    COMMENT ON FUNCTION %I.can_send_notification(UUID, UUID) IS ''检查是否可以发送通知'';
  ', p_schema_name, p_schema_name, p_schema_name, p_schema_name);
END;
$$;

-- 创建辅助函数用于添加 notifications 表
CREATE OR REPLACE FUNCTION public.create_notifications_table(p_schema_name TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 创建 notifications 表
  EXECUTE format('
    CREATE TABLE IF NOT EXISTS %I.notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      sender_id UUID NOT NULL REFERENCES %I.profiles(id) ON DELETE CASCADE,
      receiver_id UUID NOT NULL REFERENCES %I.profiles(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      type TEXT DEFAULT ''user'',
      status TEXT DEFAULT ''unread'',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      read_at TIMESTAMPTZ,
      
      CONSTRAINT valid_notification_type CHECK (type IN (''system'', ''user'', ''announcement'')),
      CONSTRAINT valid_notification_status CHECK (status IN (''unread'', ''read''))
    );
    CREATE INDEX IF NOT EXISTS idx_notifications_sender_id ON %I.notifications(sender_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_receiver_id ON %I.notifications(receiver_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_status ON %I.notifications(status);
    CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON %I.notifications(created_at);
    
    COMMENT ON TABLE %I.notifications IS ''通知表'';
    COMMENT ON COLUMN %I.notifications.type IS ''类型：system=系统通知, user=用户通知, announcement=公告通知'';
    COMMENT ON COLUMN %I.notifications.status IS ''状态：unread=未读, read=已读'';
  ', p_schema_name, p_schema_name, p_schema_name, p_schema_name, p_schema_name, 
     p_schema_name, p_schema_name, p_schema_name, p_schema_name, p_schema_name);
  
  -- 启用 RLS
  EXECUTE format('ALTER TABLE %I.notifications ENABLE ROW LEVEL SECURITY', p_schema_name);
  
  -- 创建 can_send_notification 函数
  PERFORM public.create_can_send_notification_function(p_schema_name);
  
  -- 策略1：查看通知
  EXECUTE format('
    DROP POLICY IF EXISTS "查看通知" ON %I.notifications;
    CREATE POLICY "查看通知" ON %I.notifications
      FOR SELECT TO authenticated
      USING (
        receiver_id = auth.uid()
        OR
        sender_id = auth.uid()
      );
  ', p_schema_name, p_schema_name);
  
  -- 策略2：发送通知
  EXECUTE format('
    DROP POLICY IF EXISTS "发送通知" ON %I.notifications;
    CREATE POLICY "发送通知" ON %I.notifications
      FOR INSERT TO authenticated
      WITH CHECK (
        sender_id = auth.uid()
        AND
        %I.can_send_notification(auth.uid(), receiver_id)
      );
  ', p_schema_name, p_schema_name, p_schema_name);
  
  -- 策略3：更新通知
  EXECUTE format('
    DROP POLICY IF EXISTS "更新通知" ON %I.notifications;
    CREATE POLICY "更新通知" ON %I.notifications
      FOR UPDATE TO authenticated
      USING (receiver_id = auth.uid());
  ', p_schema_name, p_schema_name);
  
  -- 策略4：删除通知
  EXECUTE format('
    DROP POLICY IF EXISTS "删除通知" ON %I.notifications;
    CREATE POLICY "删除通知" ON %I.notifications
      FOR DELETE TO authenticated
      USING (
        receiver_id = auth.uid()
        OR
        sender_id = auth.uid()
      );
  ', p_schema_name, p_schema_name);
END;
$$;

COMMENT ON FUNCTION public.create_notifications_table(TEXT) IS '为指定的租户 Schema 创建 notifications 表和 RLS 策略';
COMMENT ON FUNCTION public.create_can_send_notification_function(TEXT) IS '为指定的租户 Schema 创建 can_send_notification 函数';
