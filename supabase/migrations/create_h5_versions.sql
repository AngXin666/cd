-- 创建H5版本管理表
CREATE TABLE IF NOT EXISTS h5_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  version VARCHAR(20) NOT NULL,           -- H5版本号，如 "1.0.1"
  h5_url TEXT NOT NULL,                   -- H5部署URL
  release_notes TEXT,                     -- 更新说明
  is_force_update BOOLEAN DEFAULT false,  -- 是否强制更新
  is_active BOOLEAN DEFAULT true,         -- 是否激活
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_h5_versions_active ON h5_versions(is_active);
CREATE INDEX IF NOT EXISTS idx_h5_versions_created ON h5_versions(created_at DESC);

-- 添加注释
COMMENT ON TABLE h5_versions IS 'H5版本管理表，用于热更新';
COMMENT ON COLUMN h5_versions.version IS 'H5版本号';
COMMENT ON COLUMN h5_versions.h5_url IS 'H5部署URL，可以是Supabase Storage或其他CDN';
COMMENT ON COLUMN h5_versions.is_force_update IS '是否强制更新，true时用户必须更新';
COMMENT ON COLUMN h5_versions.is_active IS '是否激活，只有激活的版本才会被检测到';

-- 启用RLS
ALTER TABLE h5_versions ENABLE ROW LEVEL SECURITY;

-- 允许所有人读取激活的版本信息（无需登录）
CREATE POLICY "Allow public read active h5 versions"
ON h5_versions FOR SELECT
USING (is_active = true);

-- 只允许管理员插入和更新（需要service_role或特定角色）
CREATE POLICY "Allow admin insert h5 versions"
ON h5_versions FOR INSERT
WITH CHECK (
  auth.jwt() ->> 'role' = 'service_role' OR
  auth.jwt() -> 'user_metadata' ->> 'role' = 'super_admin'
);

CREATE POLICY "Allow admin update h5 versions"
ON h5_versions FOR UPDATE
USING (
  auth.jwt() ->> 'role' = 'service_role' OR
  auth.jwt() -> 'user_metadata' ->> 'role' = 'super_admin'
);

-- 插入初始版本记录（示例）
INSERT INTO h5_versions (version, h5_url, release_notes, is_force_update, is_active)
VALUES (
  '1.0.0',
  'https://your-domain.com/h5',  -- 替换为你的H5部署地址
  '初始版本',
  false,
  true
)
ON CONFLICT DO NOTHING;
