# 统一热更新系统文档

## 📖 文档概述

本目录包含统一热更新系统的完整文档，包括使用说明、配置指南、测试指南等。

## 📚 文档索引

### 核心文档
- **[使用说明](#使用说明)** - 如何使用热更新系统
- **[配置指南](#配置指南)** - 如何配置不同平台的热更新
- **[平台差异](#平台差异)** - 不同平台的更新方式和特点

### 测试文档
- **[快速测试指南](./QUICK_TEST_GUIDE.md)** - 快速测试热更新功能
- **[平台测试指南](./PLATFORM_TESTING_GUIDE.md)** - 各平台详细测试步骤
- **[测试执行检查清单](./TEST_EXECUTION_CHECKLIST.md)** - 完整的测试检查清单

### 技术文档
- **[设计文档](../../.kiro/specs/unified-hot-update/design.md)** - 系统架构和设计
- **[需求文档](../../.kiro/specs/unified-hot-update/requirements.md)** - 功能需求和验收标准
- **[任务列表](../../.kiro/specs/unified-hot-update/tasks.md)** - 实现任务和进度

---

## 使用说明

### 自动更新检查

热更新系统会在应用启动时自动检查更新：

1. **应用启动**：`App.tsx` 初始化时调用 `UnifiedUpdateService`
2. **平台检测**：自动检测当前运行平台（小程序/Android/H5）
3. **策略选择**：根据平台选择对应的更新策略
4. **静默检查**：延迟 500ms 后进行静默更新检查
5. **用户提示**：如有更新，根据平台显示相应的更新提示

### 手动触发更新

如需手动触发更新检查，可以调用：

```typescript
import { UnifiedUpdateService } from '@/services/unifiedUpdateService'

// 创建服务实例
const updateService = new UnifiedUpdateService()

// 初始化
await updateService.initialize()

// 检查更新（非静默，会显示"已是最新版本"提示）
await updateService.checkAndApplyUpdate(false)
```

### 开发模式

在开发模式下（`NODE_ENV=development`），热更新检查会自动跳过，避免干扰开发调试。

---

## 配置指南

### 微信小程序配置

**无需额外配置**，微信平台自动管理版本更新。

#### 发布新版本
1. 在微信开发者工具中上传代码
2. 在微信公众平台提交审核
3. 审核通过后发布
4. 用户下次启动小程序时自动检查更新

#### 测试更新
1. 上传体验版
2. 在微信开发者工具中选择"体验版"
3. 重新上传新的体验版
4. 重启小程序测试更新提示

### Android APP 配置

#### 1. Supabase 数据库配置

确保 `h5_versions` 表存在并包含以下字段：

```sql
CREATE TABLE h5_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  version TEXT NOT NULL,
  h5_url TEXT NOT NULL,
  release_notes TEXT,
  is_force_update BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 2. 发布新版本

1. **构建 H5 代码**
   ```bash
   pnpm run build:h5
   ```

2. **创建更新包**
   ```bash
   # 使用脚本创建 H5 bundle
   .\scripts\create-h5-bundle.ps1
   ```

3. **上传到 Supabase Storage**
   ```bash
   # 上传 bundle 到 Supabase
   .\scripts\upload-h5-bundle.ps1
   ```

4. **更新版本信息**
   ```sql
   -- 插入新版本记录
   INSERT INTO h5_versions (version, h5_url, release_notes, is_force_update)
   VALUES (
     '1.2.4',
     'https://your-supabase-url/storage/v1/object/public/h5-bundles/v1.2.4-bundle.zip',
     '修复了一些问题，优化了性能',
     false
   );
   ```

#### 3. 测试更新

1. 安装旧版本 APK
2. 启动应用
3. 等待更新提示
4. 确认更新并等待下载完成
5. 重启应用验证更新成功

### H5 网页版配置

**无需配置**，浏览器会自动加载最新代码。

#### 部署新版本
1. 构建 H5 代码：`pnpm run build:h5`
2. 部署到服务器
3. 用户刷新页面即可获取最新版本

---

## 平台差异

### 对比表

| 特性 | 微信小程序 | Android APP | H5 网页版 |
|------|-----------|------------|----------|
| **更新方式** | 微信官方 API | Capacitor LiveUpdate | 浏览器自动加载 |
| **版本管理** | 微信平台 | Supabase 数据库 | 无需管理 |
| **更新内容** | 完整小程序代码 | H5 代码 | H5 代码 |
| **用户体验** | 原生弹窗 | 自定义对话框 | 无感知 |
| **强制更新** | 不支持 | 支持 | 不适用 |
| **下载进度** | 不显示 | 显示 | 不适用 |
| **更新时机** | 启动时 | 启动时 | 刷新页面 |
| **需要重启** | 是 | 是 | 否 |

### 微信小程序

**优点**：
- 微信平台自动管理，无需额外配置
- 更新流程标准化，用户体验一致
- 无需维护版本服务器

**限制**：
- 不支持强制更新
- 不能自定义更新 UI
- 更新时机由微信控制

**实现方式**：
```typescript
// WeappUpdateStrategy.ts
const updateManager = Taro.getUpdateManager()

updateManager.onUpdateReady(() => {
  Taro.showModal({
    title: '更新提示',
    content: '新版本已经准备好，是否重启应用？',
    success: (res) => {
      if (res.confirm) {
        updateManager.applyUpdate()
      }
    }
  })
})
```

### Android APP

**优点**：
- 支持强制更新和可选更新
- 可以自定义更新 UI
- 可以显示下载进度
- 可以添加版本说明

**限制**：
- 需要维护版本服务器（Supabase）
- 需要手动上传更新包
- 需要管理版本号

**实现方式**：
```typescript
// AndroidUpdateStrategy.ts
const result = await checkForH5Update()

if (result.needsUpdate && result.versionInfo) {
  // 显示更新对话框
  const confirmed = await showUpdateDialog(result.versionInfo)
  
  if (confirmed) {
    // 下载并安装更新
    await applyH5Update(result.versionInfo)
  }
}
```

### H5 网页版

**优点**：
- 无需热更新机制
- 部署即生效
- 用户无感知

**限制**：
- 需要用户刷新页面
- 无法控制更新时机
- 可能存在缓存问题

**实现方式**：
```typescript
// H5UpdateStrategy.ts
async checkAndApplyUpdate(silent: boolean = true): Promise<void> {
  // H5 不支持热更新，不执行任何操作
  console.log('H5 环境不支持热更新')
}
```

---

## 常见问题

### Q1: 为什么开发模式下不检查更新？

**A**: 开发模式下频繁的代码变更会导致不必要的更新提示，影响开发效率。系统会自动检测 `NODE_ENV` 环境变量，在开发模式下跳过更新检查。

### Q2: Android APP 如何实现强制更新？

**A**: 在 `h5_versions` 表中设置 `is_force_update = true`，更新对话框将不显示"取消"按钮，用户必须更新才能继续使用。

### Q3: 小程序如何测试更新功能？

**A**: 
1. 上传体验版 A
2. 在微信开发者工具中选择体验版 A
3. 上传新的体验版 B
4. 重启小程序，会提示有新版本

### Q4: 更新失败怎么办？

**A**: 系统会捕获所有更新错误并记录日志，不会导致应用崩溃。用户可以：
- 检查网络连接
- 稍后重试
- 联系技术支持

### Q5: 如何回滚到旧版本？

**A**: 
- **小程序**：在微信公众平台回滚版本
- **Android APP**：在 `h5_versions` 表中将旧版本设为 active
- **H5**：重新部署旧版本代码

---

## 技术支持

如有问题或建议，请联系开发团队或查看：
- [设计文档](../../.kiro/specs/unified-hot-update/design.md)
- [需求文档](../../.kiro/specs/unified-hot-update/requirements.md)
- [测试文档](./QUICK_TEST_GUIDE.md)

---

**最后更新**: 2025-12-14  
**维护团队**: 车队管家开发团队

