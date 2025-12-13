# H5热更新使用指南

## 概述

H5热更新系统允许你在不重新发布APK的情况下更新应用的H5代码。这对于bug修复、UI调整等日常更新非常方便。

## 工作原理

1. **构建H5代码**：运行 `npm run build:h5` 生成 `dist` 目录
2. **部署H5代码**：将 `dist` 目录上传到服务器（Supabase Storage、CDN等）
3. **更新版本记录**：在Supabase的 `h5_versions` 表中添加新版本记录
4. **用户自动更新**：用户打开APP时自动检测并应用更新

## 快速开始

### 1. 创建数据库表

在Supabase Dashboard中执行以下SQL：

```sql
-- 执行 supabase/migrations/create_h5_versions.sql 中的内容
```

或者直接在SQL编辑器中运行：
```bash
supabase db push
```

### 2. 部署H5代码

#### 方案A：使用Supabase Storage（推荐）

1. 构建H5代码：
```bash
npm run build:h5
```

2. 在Supabase Dashboard创建一个公开的bucket：
   - 名称：`h5-app`
   - 公开访问：是

3. 上传 `dist` 目录到bucket：
   - 可以使用Supabase Dashboard手动上传
   - 或使用Supabase CLI：
   ```bash
   supabase storage cp dist/ h5-app/v1.0.1/ --recursive
   ```

4. 获取公开URL：
   ```
   https://wxvrwkpkioalqdsfswwu.supabase.co/storage/v1/object/public/h5-app/v1.0.1/index.html
   ```

#### 方案B：使用其他静态托管

- Vercel
- Netlify
- 阿里云OSS
- 腾讯云COS

### 3. 添加版本记录

在Supabase Dashboard的 `h5_versions` 表中插入新记录：

```sql
INSERT INTO h5_versions (version, h5_url, release_notes, is_force_update, is_active)
VALUES (
  '1.0.1',  -- 新版本号
  'https://wxvrwkpkioalqdsfswwu.supabase.co/storage/v1/object/public/h5-app/v1.0.1/',  -- H5部署URL
  '修复了登录页面的bug\n优化了用户管理页面性能',  -- 更新说明
  false,  -- 是否强制更新
  true    -- 是否激活
);
```

### 4. 测试更新

1. 打开APP
2. 如果有新版本，会自动弹出更新对话框
3. 点击"立即更新"，APP会重新加载新的H5代码

## 版本管理

### 版本号规则

使用语义化版本：`major.minor.patch`

- `major`：重大更新（不兼容的API变更）
- `minor`：功能更新（向下兼容）
- `patch`：bug修复（向下兼容）

示例：
- `1.0.0` → `1.0.1`：修复bug
- `1.0.1` → `1.1.0`：新增功能
- `1.1.0` → `2.0.0`：重大更新

### 强制更新 vs 可选更新

- **强制更新** (`is_force_update = true`)：
  - 用户必须更新才能继续使用
  - 对话框无法关闭
  - 适用于：重要bug修复、安全更新

- **可选更新** (`is_force_update = false`)：
  - 用户可以选择"稍后"
  - 适用于：功能优化、UI调整

### 版本激活/停用

- `is_active = true`：激活，用户会检测到此版本
- `is_active = false`：停用，用户不会检测到此版本

可以通过停用旧版本来回滚：

```sql
-- 停用当前版本
UPDATE h5_versions SET is_active = false WHERE version = '1.0.1';

-- 激活旧版本
UPDATE h5_versions SET is_active = true WHERE version = '1.0.0';
```

## 配置Capacitor

如果你想让APP直接从服务器加载H5（而不是打包在APK中），可以修改 `capacitor.config.ts`：

```typescript
const config: CapacitorConfig = {
  // ... 其他配置
  server: {
    url: 'https://your-domain.com/h5',  // H5部署地址
    cleartext: true,
    androidScheme: 'https'
  }
};
```

这样APP启动时会直接加载服务器上的H5代码，实现真正的"零安装更新"。

## 最佳实践

### 1. 版本发布流程

```bash
# 1. 更新版本号
npm version patch  # 或 minor, major

# 2. 构建H5
npm run build:h5

# 3. 上传到服务器
# （使用你选择的方式）

# 4. 在Supabase添加版本记录
# （使用SQL或Dashboard）

# 5. 测试
# 打开APP验证更新
```

### 2. 灰度发布

可以通过添加用户过滤条件实现灰度发布：

```sql
-- 只对特定用户开放新版本
CREATE POLICY "Allow beta users read new versions"
ON h5_versions FOR SELECT
USING (
  is_active = true AND (
    version <= '1.0.0' OR  -- 所有人可见旧版本
    auth.jwt() -> 'user_metadata' ->> 'is_beta_tester' = 'true'  -- 只有测试用户可见新版本
  )
);
```

### 3. 监控更新

在Supabase中创建一个视图来监控更新情况：

```sql
CREATE VIEW h5_update_stats AS
SELECT 
  version,
  COUNT(*) as update_count,
  MAX(updated_at) as last_update
FROM h5_versions
GROUP BY version;
```

## 故障排查

### 问题1：更新后白屏

**原因**：H5 URL配置错误或文件未正确上传

**解决**：
1. 检查 `h5_url` 是否正确
2. 在浏览器中访问该URL，确认可以访问
3. 检查Supabase Storage的bucket是否设置为公开

### 问题2：检测不到更新

**原因**：版本号比较错误或 `is_active` 未设置

**解决**：
1. 确认 `package.json` 中的版本号
2. 确认数据库中的版本号更高
3. 确认 `is_active = true`

### 问题3：更新后功能异常

**原因**：H5代码与原生代码不兼容

**解决**：
1. 回滚到旧版本（停用新版本，激活旧版本）
2. 检查Capacitor插件版本是否匹配
3. 如果需要更新原生代码，则必须发布新APK

## 与APK更新的对比

| 特性 | H5热更新 | APK更新 |
|------|---------|---------|
| 更新速度 | 秒级 | 分钟级 |
| 用户体验 | 无感知 | 需要下载安装 |
| 适用场景 | 日常bug修复、UI调整 | 原生功能变更、插件更新 |
| 文件大小 | 几MB | 几十MB |
| 更新成本 | 低 | 高 |

## 总结

H5热更新非常适合你当前的场景（功能已完成，只需调试）。每次修复bug后：

1. `npm run build:h5`
2. 上传到Supabase Storage
3. 在数据库添加版本记录
4. 用户自动更新

无需重新打包APK，无需用户手动下载安装！
