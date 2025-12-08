-- 彻底禁用 piece_work_records 表的 RLS
ALTER TABLE piece_work_records DISABLE ROW LEVEL SECURITY;

-- 删除所有旧的 RLS 策略
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'piece_work_records'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON piece_work_records', r.policyname);
        RAISE NOTICE 'Deleted policy: %', r.policyname;
    END LOOP;
END $$;

-- 确认删除结果
SELECT '✅ 已删除所有 piece_work_records 表的 RLS 策略，表已禁用 RLS' AS status;

-- 查看剩余策略（应该为空）
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'piece_work_records';
