-- 测试H5更新 - 添加一个新版本1.0.1
-- 这样APP（当前是1.0.0）就会检测到更新

INSERT INTO h5_versions (version, h5_url, release_notes, is_force_update, is_active)
VALUES (
  '1.0.1',
  'https://wxvrwkpkioalqdsfswwu.supabase.co/storage/v1/object/public/h5-app/v1.0.0/',
  '测试更新功能',
  false,
  true
);

-- 查看所有版本
SELECT version, is_force_update, is_active, created_at 
FROM h5_versions 
ORDER BY created_at DESC;
