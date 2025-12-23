/*
# 恢复并增强 create_tenant_schema 函数

本迁移将：
1. 恢复 create_tenant_schema 函数
2. 添加 notifications 表创建逻辑
3. 添加通知发送权限检查函数
4. 设置 notifications 表的 RLS 策略

## 更新内容
- 恢复完整的 create_tenant_schema 函数
- 集成 notifications 表和相关 RLS 策略
- 添加 can_send_notification 辅助函数
*/

-- 首先创建辅助函数用于添加 notifications 表
CREATE OR REPLACE FUNCTION public.add_notifications_to_schema(p_schema_name TEXT)
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
  
  -- 创建 can_send_notification 函数
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
  
  -- 启用 RLS
  EXECUTE format('ALTER TABLE %I.notifications ENABLE ROW LEVEL SECURITY', p_schema_name);
  
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

COMMENT ON FUNCTION public.add_notifications_to_schema(TEXT) IS '为指定的租户 Schema 添加 notifications 表和 RLS 策略';

-- 现在为所有现有的租户 Schema 添加 notifications 表
DO $$
DECLARE
  tenant_record RECORD;
BEGIN
  FOR tenant_record IN 
    SELECT schema_name FROM tenants WHERE status = 'active'
  LOOP
    PERFORM public.add_notifications_to_schema(tenant_record.schema_name);
    RAISE NOTICE '已为租户 Schema % 添加 notifications 表', tenant_record.schema_name;
  END LOOP;
END $$;
