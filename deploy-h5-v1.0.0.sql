-- Add H5 version record
INSERT INTO h5_versions (version, h5_url, release_notes, is_force_update, is_active)
VALUES (
  '1.0.0',
  'https://wxvrwkpkioalqdsfswwu.supabase.co/storage/v1/object/public/h5-app/v1.0.0/',
  'Initial version',
  false,
  true
);

-- View all versions
SELECT version, is_force_update, is_active, created_at 
FROM h5_versions 
ORDER BY created_at DESC;
