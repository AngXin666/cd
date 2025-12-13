-- ============================================
-- 修复H5版本表 - 确保表存在且RLS策略正确
-- ============================================

-- 1. 创建表（如果不存在）
CREATE TABLE IF NOT EXISTS h5_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version VARCHAR(20) NOT NULL,
  h5_url TEXT NOT NULL,
  release_notes TEXT,
  is_force_update BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 禁用RLS（临时，确保可以读取）
ALTER TABLE h5_versions DISABLE ROW LEVEL SECURITY;

-- 3. 删除旧的RLS策略（如果存在）
DROP POLICY IF EXISTS "Allow public read active h5 versions" ON h5_versions;
DROP POLICY IF EXISTS "Allow admin insert h5 versions" ON h5_versions;
DROP POLICY IF EXISTS "Allow admin update h5 versions" ON h5_versions;
DROP POLICY IF EXISTS "public_read_h5_versions" ON h5_versions;

-- 4. 重新启用RLS
ALTER TABLE h5_versions ENABLE ROW LEVEL SECURITY;

-- 5. 创建简单的公开读取策略
CREATE POLICY "public_read_h5_versions" ON h5_versions
  FOR SELECT
  TO public
  USING (true);

-- 6. 查看当前数据
SELECT * FROM h5_versions ORDER BY created_at DESC;

-- 7. 如果没有1.0.1版本，添加测试版本
INSERT INTO h5_versions (version, h5_url, release_notes, is_force_update, is_active)
SELECT '1.0.1', 
       'https://wxvrwkpkioalqdsfswwu.supabase.co/storage/v1/object/public/h5-app/v1.0.0/',
       '测试更新功能 - 这是一个测试版本',
       false,
       true
WHERE NOT EXISTS (SELECT 1 FROM h5_versions WHERE version = '1.0.1');

-- 8. 再次查看数据确认
SELECT version, h5_url, is_force_update, is_active, created_at 
FROM h5_versions 
ORDER BY created_at DESC;
