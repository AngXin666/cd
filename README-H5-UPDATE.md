# 🚀 H5热更新系统

> 无需下载APK，秒级完成更新，用户无感知！

## 📖 简介

这是一个为Capacitor应用设计的H5热更新系统。通过将H5代码部署到Supabase Storage，实现了无需重新打包APK的快速更新。

**适用场景：** 功能已完成，需要频繁修复bug和调试

## ✨ 核心特性

- ⚡ **秒级更新** - 无需下载APK，重新加载即可
- 😊 **用户无感** - 自动检测，一键更新
- 💰 **零成本** - 利用Supabase免费额度
- 🎯 **简单易用** - 一键部署脚本
- 🔒 **安全可靠** - RLS策略保护
- 🔄 **版本回滚** - 随时回退到旧版本

## 🎯 快速开始

### 1. 首次设置（5分钟）

#### 步骤1：创建数据库表

在Supabase Dashboard执行：
```sql
-- 复制 supabase/migrations/create_h5_versions.sql 的内容
```

#### 步骤2：创建Storage Bucket

1. 打开 Supabase Storage
2. 创建新bucket：`h5-app`
3. 设置为公开访问

#### 步骤3：首次部署

```powershell
# 构建H5
npm run build:h5

# 上传 dist 到 Supabase Storage 的 v1.0.0 文件夹

# 添加版本记录（在Supabase Dashboard执行）
INSERT INTO h5_versions (version, h5_url, release_notes, is_force_update, is_active)
VALUES ('1.0.0', 'https://your-url/v1.0.0/', '初始版本', false, true);
```

### 2. 日常更新（1分钟）

```powershell
# 一键部署
.\scripts\deploy-h5.ps1 -Version "1.0.1" -ReleaseNotes "修复登录bug"

# 然后：
# 1. 上传 dist 到 Supabase Storage
# 2. 执行生成的SQL

# 完成！用户自动更新
```

## 📁 项目结构

```
├── src/
│   ├── services/
│   │   └── h5UpdateService.ts          # 核心更新服务
│   ├── components/
│   │   └── H5UpdateDialog/             # 更新对话框
│   └── app.tsx                         # 应用入口（集成更新检查）
├── supabase/
│   └── migrations/
│       └── create_h5_versions.sql      # 数据库表
├── scripts/
│   └── deploy-h5.ps1                   # 自动化部署脚本
└── docs/
    ├── H5-UPDATE-QUICKSTART.md         # 快速开始
    └── h5-hot-update-guide.md          # 完整指南
```

## 🔄 更新流程

```mermaid
graph LR
    A[修复bug] --> B[运行部署脚本]
    B --> C[上传到Storage]
    C --> D[添加版本记录]
    D --> E[用户打开APP]
    E --> F[自动检测更新]
    F --> G[显示对话框]
    G --> H[重新加载]
    H --> I[✅ 完成]
```

## 💻 核心API

### 检查更新

```typescript
import { checkForH5Update } from '@/services/h5UpdateService';

const result = await checkForH5Update();
if (result.needsUpdate) {
  // 显示更新对话框
}
```

### 应用更新

```typescript
import { applyH5Update } from '@/services/h5UpdateService';

applyH5Update(versionInfo.h5_url);
// 应用会重新加载
```

### 版本比较

```typescript
import { compareVersions } from '@/services/h5UpdateService';

compareVersions('1.0.1', '1.0.0'); // 返回 1
compareVersions('1.0.0', '1.0.1'); // 返回 -1
compareVersions('1.0.0', '1.0.0'); // 返回 0
```

## 🎨 UI组件

### H5UpdateDialog

```tsx
<H5UpdateDialog
  visible={true}
  version="1.0.1"
  releaseNotes="修复了登录bug"
  isForceUpdate={false}
  onUpdate={() => applyH5Update(url)}
  onCancel={() => setVisible(false)}
/>
```

## 📊 数据库表结构

```sql
CREATE TABLE h5_versions (
  id UUID PRIMARY KEY,
  version VARCHAR(20) NOT NULL,        -- 版本号
  h5_url TEXT NOT NULL,                -- H5部署URL
  release_notes TEXT,                  -- 更新说明
  is_force_update BOOLEAN,             -- 是否强制更新
  is_active BOOLEAN,                   -- 是否激活
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

## 🔐 安全性

### RLS策略

- ✅ 所有人可以读取激活的版本（无需登录）
- ✅ 只有管理员可以添加/修改版本
- ✅ 使用HTTPS确保传输安全

### 版本控制

- ✅ 语义化版本号
- ✅ 激活/停用机制
- ✅ 强制更新标志
- ✅ 版本回滚支持

## 🛠️ 管理操作

### 查看所有版本

```sql
SELECT version, is_force_update, is_active, created_at 
FROM h5_versions 
ORDER BY created_at DESC;
```

### 回滚版本

```sql
-- 停用新版本
UPDATE h5_versions SET is_active = false WHERE version = '1.0.1';

-- 激活旧版本
UPDATE h5_versions SET is_active = true WHERE version = '1.0.0';
```

### 强制更新

```sql
UPDATE h5_versions 
SET is_force_update = true 
WHERE version = '1.0.1';
```

## 📈 监控

### 版本统计

```sql
SELECT 
  version,
  is_force_update,
  is_active,
  created_at
FROM h5_versions
ORDER BY created_at DESC;
```

## 🐛 故障排查

### 问题1：更新后白屏

**原因：** H5 URL配置错误

**解决：**
1. 检查URL是否正确
2. 在浏览器中访问该URL
3. 确认Storage bucket为公开

### 问题2：检测不到更新

**原因：** 版本号或激活状态错误

**解决：**
1. 确认 `package.json` 版本号
2. 确认数据库版本号更高
3. 确认 `is_active = true`

### 问题3：更新失败

**原因：** 网络问题或URL无效

**解决：**
1. 检查网络连接
2. 验证H5 URL可访问
3. 查看控制台错误日志

## 💡 最佳实践

### 版本号规则

- `patch` (1.0.0 → 1.0.1): bug修复
- `minor` (1.0.1 → 1.1.0): 新功能
- `major` (1.1.0 → 2.0.0): 重大更新

### 何时使用强制更新

✅ **应该使用：**
- 重要bug修复
- 安全漏洞修复
- 数据结构变更

❌ **不应该使用：**
- UI调整
- 性能优化
- 小功能改进

### 更新频率

- 开发阶段：随时更新
- 测试阶段：每天1-2次
- 生产环境：每周不超过2次

## 📚 文档

- [快速开始](docs/H5-UPDATE-QUICKSTART.md) - 5分钟上手
- [完整指南](docs/h5-hot-update-guide.md) - 详细文档
- [任务列表](.kiro/specs/app-update-system/tasks.md) - 实现细节

## 🎯 vs APK更新

| 特性 | H5热更新 | APK更新 |
|------|---------|---------|
| 更新速度 | ⚡ 秒级 | 🐌 分钟级 |
| 用户体验 | 😊 无感知 | 😫 需要下载安装 |
| 文件大小 | 📦 几MB | 📦 几十MB |
| 更新频率 | 🚀 随时 | 🐢 谨慎 |
| 适用场景 | ✅ bug修复、UI调整 | ✅ 原生功能变更 |
| 成本 | 💰 免费 | 💰 免费 |

## 🚀 开始使用

```powershell
# 1. 阅读快速开始文档
cat docs/H5-UPDATE-QUICKSTART.md

# 2. 执行首次设置（5分钟）

# 3. 尝试第一次更新
.\scripts\deploy-h5.ps1 -Version "1.0.1" -ReleaseNotes "测试更新"

# 4. 享受无感知更新！
```

## 🤝 贡献

欢迎提交Issue和Pull Request！

## 📄 许可证

MIT

---

**有问题？** 查看[完整文档](docs/h5-hot-update-guide.md)或提交Issue

**祝你调试顺利！** 🎉
