-- 创建应用版本管理表
CREATE TABLE IF NOT EXISTS app_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version VARCHAR(20) NOT NULL,
  apk_url TEXT NOT NULL,
  release_notes TEXT,
  is_force_update BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_app_versions_active ON app_versions(is_active);
CREATE INDEX IF NOT EXISTS idx_app_versions_created_at ON app_versions(created_at DESC);

-- 启用RLS
ALTER TABLE app_versions ENABLE ROW LEVEL SECURITY;

-- 允许所有人读取激活的版本信息
CREATE POLICY IF NOT EXISTS "Allow public read active versions"
ON app_versions FOR SELECT
USING (is_active = true);

-- 插入示例版本记录（可选，用于测试）
-- INSERT INTO app_versions (version, apk_url, release_notes, is_force_update, is_active)
-- VALUES ('1.0.0', 'https://example.com/app-1.0.0.apk', '初始版本', false, true);
