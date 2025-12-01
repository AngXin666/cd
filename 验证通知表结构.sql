-- 验证通知表的完整结构
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'notifications'
ORDER BY ordinal_position;

-- 查看通知表的所有索引
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'notifications';

-- 查看通知表的所有 RLS 策略
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'notifications';
