# 🚀 H5热更新 - 超简单部署指南

## 每次更新只需3步！

### 步骤1：运行部署脚本

```powershell
.\scripts\deploy-h5.ps1 -Version "1.0.0" -ReleaseNotes "初始版本"
```

脚本会自动：
- ✅ 更新版本号
- ✅ 构建H5代码
- ✅ 生成SQL文件

### 步骤2：上传文件到Supabase

1. 打开链接：
   ```
   https://supabase.com/dashboard/project/wxvrwkpkioalqdsfswwu/storage/buckets/h5-app
   ```

2. 点击 "Upload file" 或 "Upload folder"

3. 选择 `dist` 目录下的**所有文件**

4. 上传到文件夹：`v1.0.0`（版本号对应）

### 步骤3：执行SQL

1. 打开链接：
   ```
   https://supabase.com/dashboard/project/wxvrwkpkioalqdsfswwu/sql
   ```

2. 打开脚本生成的SQL文件（例如：`deploy-h5-v1.0.0.sql`）

3. 复制内容，粘贴到SQL编辑器

4. 点击 "Run" 执行

---

## ✅ 完成！

用户下次打开APP就会自动更新！

---

## 首次设置（只需一次）

### 1. 创建数据库表

打开：https://supabase.com/dashboard/project/wxvrwkpkioalqdsfswwu/sql

复制并执行 `supabase/migrations/create_h5_versions.sql` 的内容

### 2. 创建Storage Bucket

打开：https://supabase.com/dashboard/project/wxvrwkpkioalqdsfswwu/storage/buckets

1. 点击 "New bucket"
2. Name: `h5-app`
3. Public bucket: ✅ **勾选**
4. 点击 "Create bucket"

---

## 常见问题

### Q: 上传哪些文件？

A: `dist` 目录下的**所有文件和文件夹**，包括：
- index.html
- app.js
- app.css
- 所有其他文件

### Q: 如何验证上传成功？

A: 在浏览器访问：
```
https://wxvrwkpkioalqdsfswwu.supabase.co/storage/v1/object/public/h5-app/v1.0.0/index.html
```

如果能看到你的应用页面，说明成功！

### Q: 如何回滚版本？

A: 执行SQL：
```sql
-- 停用新版本
UPDATE h5_versions SET is_active = false WHERE version = '1.0.1';

-- 激活旧版本
UPDATE h5_versions SET is_active = true WHERE version = '1.0.0';
```

---

## 完整流程示例

```powershell
# 1. 运行脚本
.\scripts\deploy-h5.ps1 -Version "1.0.1" -ReleaseNotes "修复登录bug"

# 2. 打开Supabase Storage
# https://supabase.com/dashboard/project/wxvrwkpkioalqdsfswwu/storage/buckets/h5-app

# 3. 上传 dist 目录到 v1.0.1 文件夹

# 4. 打开Supabase SQL
# https://supabase.com/dashboard/project/wxvrwkpkioalqdsfswwu/sql

# 5. 执行生成的 deploy-h5-v1.0.1.sql

# 完成！
```

---

**就这么简单！** 🎉
