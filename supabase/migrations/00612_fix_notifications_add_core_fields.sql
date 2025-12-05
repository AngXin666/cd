-- ============================================
-- 修复notifications表：添加核心字段
-- ============================================

-- 检查并添加核心字段
DO $$ 
BEGIN
  -- 添加 user_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications' 
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  -- 添加 title
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications' 
    AND column_name = 'title'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN title TEXT NOT NULL DEFAULT '';
  END IF;

  -- 添加 content
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications' 
    AND column_name = 'content'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN content TEXT;
  END IF;

  -- 添加 type
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications' 
    AND column_name = 'type'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN type TEXT;
  END IF;

  -- 添加 is_read
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications' 
    AND column_name = 'is_read'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN is_read BOOLEAN DEFAULT false;
  END IF;

  -- 添加 sender_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications' 
    AND column_name = 'sender_id'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN sender_id UUID REFERENCES auth.users(id);
  END IF;

  -- 添加 related_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications' 
    AND column_name = 'related_id'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN related_id UUID;
  END IF;

  -- 添加 batch_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications' 
    AND column_name = 'batch_id'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN batch_id UUID;
  END IF;

  -- 添加 action_url
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications' 
    AND column_name = 'action_url'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN action_url TEXT;
  END IF;
END $$;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_sender ON public.notifications(sender_id);
