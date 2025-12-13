# 创建 app_versions 表 - 简单步骤

## 方法：在Supabase Dashboard中执行SQL

1. **打开Supabase Dashboard**
   - 访问：https://supabase.com/dashboard/project/wxvrwkpkioalqdsfswwu

2. **打开SQL Editor**
   - 点击左侧菜单的 **SQL Editor**
   - 点击 **New Query**

3. **复制粘贴以下SQL**

```sql
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

-- 删除旧策略（如果存在）
DROP POLICY IF EXISTS "Allow public read active versions" ON app_versions;

-- 创建新策略
CREATE POLICY "Allow public read active versions"
ON app_versions FOR SELECT
USING (is_active = true);
```

4. **点击 Run 按钮**

5. **验证表已创建**
   - 点击左侧菜单的 **Table Editor**
   - 应该能看到 `app_versions` 表

## 完成！

表创建成功后，你就可以：
1. 创建Storage bucket存储APK文件
2. 在表中插入版本记录
3. 测试更新功能

---

**快速链接：**
- SQL Editor: https://supabase.com/dashboard/project/wxvrwkpkioalqdsfswwu/sql/new
- Table Editor: https://supabase.com/dashboard/project/wxvrwkpkioalqdsfswwu/editor
- Storage: https://supabase.com/dashboard/project/wxvrwkpkioalqdsfswwu/storage/buckets
