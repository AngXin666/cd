# 🎯 立即开始设置

## 第1步：创建数据库表（必须）

**打开这个链接：**
```
https://supabase.com/dashboard/project/wxvrwkpkioalqdsfswwu/sql
```

**复制并执行以下SQL：**

```sql
-- 创建H5版本管理表
CREATE TABLE IF NOT EXISTS h5_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  version VARCHAR(20) NOT NULL,
  h5_url TEXT NOT NULL,
  release_notes TEXT,
  is_force_update BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_h5_versions_active ON h5_versions(is_active);
CREATE INDEX IF NOT EXISTS idx_h5_versions_created ON h5_versions(created_at DESC);

-- 启用RLS
ALTER TABLE h5_versions ENABLE ROW LEVEL SECURITY;

-- 允许所有人读取激活的版本信息
CREATE POLICY "Allow public read active h5 versions"
ON h5_versions FOR SELECT
USING (is_active = true);

-- 只允许管理员插入和更新
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
```

## 第2步：创建Storage Bucket（必须）

**打开这个链接：**
```
https://supabase.com/dashboard/project/wxvrwkpkioalqdsfswwu/storage/buckets
```

**操作：**
1. 点击 "New bucket"
2. Name: `h5-app`
3. Public bucket: ✅ **勾选这个！**
4. 点击 "Create bucket"

## 第3步：首次部署

**在PowerShell中运行：**
```powershell
.\scripts\deploy-h5.ps1 -Version "1.0.0" -ReleaseNotes "初始版本"
```

**然后：**

1. 打开：https://supabase.com/dashboard/project/wxvrwkpkioalqdsfswwu/storage/buckets/h5-app

2. 创建文件夹 `v1.0.0`

3. 上传 `dist` 目录下的所有文件到 `v1.0.0` 文件夹

4. 打开：https://supabase.com/dashboard/project/wxvrwkpkioalqdsfswwu/sql

5. 执行生成的 `deploy-h5-v1.0.0.sql` 文件内容

## ✅ 完成！

现在你的H5热更新系统已经就绪！

---

## 下次更新（超简单）

```powershell
# 1. 运行脚本
.\scripts\deploy-h5.ps1 -Version "1.0.1" -ReleaseNotes "修复bug"

# 2. 上传 dist 到 Supabase Storage 的 v1.0.1 文件夹

# 3. 执行生成的SQL

# 完成！
```

---

**详细文档：** `docs/DEPLOY-SIMPLE.md`
