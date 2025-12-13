# 立即部署 H5 热更新

## 修改内容
- 优化顶部安全区域间距（从 52px 减少到 4px）
- 登录页面标题顶部间距从 64px 减少到 32px

## 部署步骤

### 1. 上传文件到 Supabase Storage

打开: https://supabase.com/dashboard/project/wxvrwkpkioalqdsfswwu/storage/buckets/h5-app

1. 点击 "Create folder" 创建文件夹 `v1.0.5`
2. 进入 `v1.0.5` 文件夹
3. 上传 `dist` 目录下的所有文件和文件夹

### 2. 更新数据库版本

打开: https://supabase.com/dashboard/project/wxvrwkpkioalqdsfswwu/sql

执行以下 SQL:

```sql
-- 将其他版本设为非激活
UPDATE h5_versions SET is_active = false;

-- 添加新版本
INSERT INTO h5_versions (version, h5_url, release_notes, is_force_update, is_active)
VALUES (
  '1.0.5',
  'https://wxvrwkpkioalqdsfswwu.supabase.co/storage/v1/object/public/h5-app/v1.0.5/',
  '优化顶部安全区域间距',
  false,
  true
);

-- 查看所有版本
SELECT * FROM h5_versions ORDER BY created_at DESC;
```

### 3. 测试

打开 APP，应该会自动检测到新版本并提示更新。
