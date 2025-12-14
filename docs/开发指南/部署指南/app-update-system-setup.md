# 应用更新系统 - 快速设置指南

## 1. 在Supabase中手动创建表（首次设置）

由于Supabase的安全限制，需要在Supabase Dashboard中手动执行SQL创建表。

### 步骤：

1. 打开 [Supabase Dashboard](https://supabase.com/dashboard)
2. 选择你的项目
3. 点击左侧菜单的 **SQL Editor**
4. 点击 **New Query**
5. 复制并粘贴以下SQL代码：

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

-- 允许所有人读取激活的版本信息
CREATE POLICY IF NOT EXISTS "Allow public read active versions"
ON app_versions FOR SELECT
USING (is_active = true);
```

6. 点击 **Run** 执行SQL
7. 确认表创建成功

## 2. 创建Storage Bucket（用于存储APK文件）

1. 在Supabase Dashboard中，点击左侧菜单的 **Storage**
2. 点击 **Create a new bucket**
3. 输入bucket名称：`apk-files`
4. 设置为 **Public bucket**（允许公开访问）
5. 点击 **Create bucket**

## 3. 上传APK并创建版本记录

### 上传APK文件：

1. 在Storage中选择 `apk-files` bucket
2. 点击 **Upload file**
3. 选择你的APK文件（例如：`车队管家-v1.0.1.apk`）
4. 上传完成后，点击文件获取公开URL
5. 复制URL（例如：`https://xxx.supabase.co/storage/v1/object/public/apk-files/车队管家-v1.0.1.apk`）

### 创建版本记录：

1. 在Supabase Dashboard中，点击 **Table Editor**
2. 选择 `app_versions` 表
3. 点击 **Insert row**
4. 填写以下信息：
   - **version**: `1.0.1`（新版本号）
   - **apk_url**: 刚才复制的APK下载URL
   - **release_notes**: `修复了状态栏问题，优化了性能`（更新说明）
   - **is_force_update**: `true`（强制更新）或 `false`（可选更新）
   - **is_active**: `true`（激活此版本）
5. 点击 **Save**

## 4. 测试更新功能

1. 确保 `package.json` 中的版本号低于你刚创建的版本（例如：`1.0.0`）
2. 构建并安装应用到手机
3. 打开应用并登录
4. 应该会看到更新提示对话框
5. 点击"立即更新"应该会打开浏览器下载APK

## 5. 发布新版本的完整流程

1. **更新版本号**：修改 `package.json` 中的 `version` 字段
2. **构建APK**：运行 `npm run build:android`
3. **上传APK**：将生成的APK上传到Supabase Storage的 `apk-files` bucket
4. **获取URL**：复制APK的公开访问URL
5. **创建版本记录**：在 `app_versions` 表中插入新记录
6. **测试**：使用旧版本应用登录，验证更新提示

## 常见问题

### Q: 为什么没有弹出更新提示？

A: 检查以下几点：
1. 确认 `app_versions` 表中有 `is_active = true` 的记录
2. 确认表中的版本号高于当前应用版本
3. 检查浏览器控制台是否有错误日志
4. 确认RLS策略已正确设置

### Q: 点击更新按钮没有反应？

A: 检查：
1. APK URL是否正确
2. Storage bucket是否设置为公开访问
3. 浏览器控制台是否有错误

### Q: 如何禁用某个版本？

A: 在 `app_versions` 表中，将该版本的 `is_active` 设置为 `false`

### Q: 如何测试可选更新？

A: 创建版本记录时，将 `is_force_update` 设置为 `false`
