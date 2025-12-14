# H5热更新 - 快速开始

## 🚀 5分钟完成首次设置

### 步骤1：创建数据库表（只需一次）

1. 打开Supabase Dashboard：
   https://supabase.com/dashboard/project/wxvrwkpkioalqdsfswwu/sql

2. 复制并执行以下SQL：

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
```

### 步骤2：创建Storage Bucket（只需一次）

1. 打开Supabase Storage：
   https://supabase.com/dashboard/project/wxvrwkpkioalqdsfswwu/storage/buckets

2. 点击"New bucket"

3. 填写信息：
   - Name: `h5-app`
   - Public bucket: ✅ 勾选
   - 点击"Create bucket"

### 步骤3：首次部署

1. 构建H5代码：
```powershell
npm run build:h5
```

2. 手动上传（首次）：
   - 打开 https://supabase.com/dashboard/project/wxvrwkpkioalqdsfswwu/storage/buckets/h5-app
   - 创建文件夹 `v1.0.0`
   - 将 `dist` 目录下的所有文件上传到 `v1.0.0` 文件夹

3. 添加版本记录：
```sql
INSERT INTO h5_versions (version, h5_url, release_notes, is_force_update, is_active)
VALUES (
  '1.0.0',
  'https://wxvrwkpkioalqdsfswwu.supabase.co/storage/v1/object/public/h5-app/v1.0.0/',
  '初始版本',
  false,
  true
);
```

✅ 完成！现在你的H5热更新系统已经就绪。

---

## 📦 日常更新流程（超简单）

### 方法1：使用自动化脚本（推荐）

```powershell
# 修复bug后运行
.\scripts\deploy-h5.ps1 -Version "1.0.1" -ReleaseNotes "修复登录bug"

# 强制更新
.\scripts\deploy-h5.ps1 -Version "1.0.2" -ReleaseNotes "重要安全更新" -ForceUpdate $true
```

脚本会自动：
1. ✅ 更新版本号
2. ✅ 构建H5代码
3. ✅ 生成SQL语句

然后你只需：
1. 手动上传 `dist` 到Supabase Storage的 `v1.0.1` 文件夹
2. 在Supabase执行生成的SQL

### 方法2：手动操作

1. **更新版本号**
```powershell
npm version patch  # 1.0.0 -> 1.0.1
```

2. **构建**
```powershell
npm run build:h5
```

3. **上传到Supabase Storage**
   - 创建新文件夹 `v1.0.1`
   - 上传 `dist` 目录内容

4. **添加版本记录**
```sql
INSERT INTO h5_versions (version, h5_url, release_notes, is_force_update, is_active)
VALUES (
  '1.0.1',
  'https://wxvrwkpkioalqdsfswwu.supabase.co/storage/v1/object/public/h5-app/v1.0.1/',
  '修复了XXX问题',
  false,
  true
);
```

---

## 🧪 测试更新

1. 打开APP
2. 应该会弹出更新对话框
3. 点击"立即更新"
4. APP重新加载，显示新版本

---

## 🔧 常见问题

### Q: 如何回滚到旧版本？

```sql
-- 停用新版本
UPDATE h5_versions SET is_active = false WHERE version = '1.0.1';

-- 激活旧版本
UPDATE h5_versions SET is_active = true WHERE version = '1.0.0';
```

### Q: 如何查看所有版本？

```sql
SELECT version, is_force_update, is_active, created_at 
FROM h5_versions 
ORDER BY created_at DESC;
```

### Q: 更新后白屏怎么办？

1. 检查H5 URL是否正确
2. 在浏览器中访问该URL，确认可以访问
3. 检查Storage bucket是否设置为公开

### Q: 检测不到更新？

1. 确认 `package.json` 中的版本号
2. 确认数据库中的版本号更高
3. 确认 `is_active = true`

---

## 💡 最佳实践

### 版本号规则

- `1.0.0 -> 1.0.1`：bug修复
- `1.0.1 -> 1.1.0`：新功能
- `1.1.0 -> 2.0.0`：重大更新

### 何时使用强制更新？

- ✅ 重要bug修复
- ✅ 安全漏洞修复
- ✅ 数据结构变更
- ❌ UI调整
- ❌ 性能优化

### 更新频率

- 开发阶段：随时更新
- 生产环境：建议每周不超过2次

---

## 📚 更多信息

详细文档：`docs/h5-hot-update-guide.md`

有问题？查看完整文档或联系开发团队。
