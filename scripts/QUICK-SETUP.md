# 快速设置 - 只需3步！

## 第1步：创建数据库表（2分钟）

**点击这个链接直接打开SQL Editor：**
👉 https://supabase.com/dashboard/project/wxvrwkpkioalqdsfswwu/sql/new

**复制粘贴这段SQL，然后点击Run：**

```sql
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

CREATE INDEX IF NOT EXISTS idx_app_versions_active ON app_versions(is_active);
CREATE INDEX IF NOT EXISTS idx_app_versions_created_at ON app_versions(created_at DESC);

ALTER TABLE app_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read active versions" ON app_versions;

CREATE POLICY "Allow public read active versions"
ON app_versions FOR SELECT
USING (is_active = true);
```

## 第2步：创建Storage Bucket（1分钟）

**点击这个链接：**
👉 https://supabase.com/dashboard/project/wxvrwkpkioalqdsfswwu/storage/buckets

1. 点击 **Create a new bucket**
2. 名称输入：`apk-files`
3. 选择 **Public bucket**
4. 点击 **Create**

## 第3步：测试（上传APK并创建版本记录）

### 上传APK：
👉 https://supabase.com/dashboard/project/wxvrwkpkioalqdsfswwu/storage/buckets/apk-files

1. 选择 `apk-files` bucket
2. 上传你的APK文件（例如：`车队管家-v1.0.1.apk`）
3. 点击文件，复制公开URL

### 创建版本记录：
👉 https://supabase.com/dashboard/project/wxvrwkpkioalqdsfswwu/editor/app_versions

1. 点击 **Insert row**
2. 填写：
   - version: `1.0.1`
   - apk_url: 刚才复制的URL
   - release_notes: `测试版本`
   - is_force_update: `true`
   - is_active: `true`
3. 点击 **Save**

## 完成！🎉

现在你可以：
1. 修改 `package.json` 版本号为 `1.0.0`（低于1.0.1）
2. 构建APK并安装到手机
3. 登录应用，应该会看到更新提示！
