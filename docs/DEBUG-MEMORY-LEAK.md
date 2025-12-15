# Taro Watch 模式内存泄漏排查指南

## 问题描述

`npm run dev:h5` 的 watch 模式存在内存泄漏问题，导致 Node.js 进程内存持续增长。

## 排查步骤

### 步骤 1：使用最小化配置测试

```powershell
# 1. 备份原配置
Copy-Item config/dev.ts config/dev.backup.ts

# 2. 使用最小化配置
Copy-Item config/dev-minimal.ts config/dev.ts

# 3. 清理缓存
Remove-Item -Recurse -Force dist, node_modules/.cache, .swc -ErrorAction SilentlyContinue

# 4. 启动开发服务器
$env:NODE_OPTIONS = "--max-old-space-size=4096"
pnpm taro build --type h5 --watch

# 5. 观察任务管理器中 Node.js 的内存使用
# 如果内存稳定，说明问题在被禁用的插件中
```

### 步骤 2：逐个测试插件

如果步骤 1 中内存正常，逐个启用插件测试：

#### 测试 makeTagger
```powershell
Copy-Item config/dev-test-tagger.ts config/dev.ts
pnpm taro build --type h5 --watch
```

#### 测试 injectedGuiListenerPlugin
```powershell
Copy-Item config/dev-test-gui.ts config/dev.ts
pnpm taro build --type h5 --watch
```

#### 测试 injectOnErrorPlugin
```powershell
Copy-Item config/dev-test-error.ts config/dev.ts
pnpm taro build --type h5 --watch
```

### 步骤 3：恢复原配置

```powershell
Copy-Item config/dev.backup.ts config/dev.ts
Remove-Item config/dev.backup.ts
```

## 可能的问题插件

根据 `config/dev.ts` 的配置，以下插件可能导致内存泄漏：

### 1. makeTagger
- 来源：`miaoda-sc-plugin`
- 功能：代码标记
- 可能问题：文件监听器未正确清理

### 2. injectedGuiListenerPlugin
- 来源：`miaoda-sc-plugin`
- 功能：注入 GUI 监听脚本
- 可能问题：外部脚本加载导致内存累积

### 3. injectOnErrorPlugin
- 来源：`miaoda-sc-plugin`
- 功能：错误处理注入
- 可能问题：错误处理器累积

### 4. config/index.ts 中的自定义插件

#### hmr-toggle 插件
```typescript
{
  name: 'hmr-toggle',
  configureServer(server) {
    // 包装了 server.ws.send 方法
    // 可能导致内存泄漏
  }
}
```

#### taro-app-config-watcher 插件
```typescript
{
  name: 'taro-app-config-watcher',
  configureServer(server) {
    // 添加了文件监听器
    // 可能导致内存泄漏
  }
}
```

## 临时解决方案

如果需要立即开发，可以：

1. **使用构建模式**：`npm run build:h5` 不会有内存泄漏
2. **使用最小化配置**：禁用可疑插件
3. **定期重启**：watch 模式下定期重启开发服务器

## 快速调试脚本

```powershell
# 运行调试脚本
.\scripts\local-debug-setup.ps1
```

选择选项 1 可以自动进行最小化配置测试。

## APK 本地调试

如果需要调试 APK 卡顿问题：

```powershell
# 运行调试脚本
.\scripts\local-debug-setup.ps1
```

选择选项 2 可以启动本地服务器，APK 可以连接到本地进行调试。

## 相关文件

- `config/dev.ts` - 原始开发配置
- `config/dev-minimal.ts` - 最小化配置
- `config/dev-test-tagger.ts` - 测试 makeTagger
- `config/dev-test-gui.ts` - 测试 injectedGuiListenerPlugin
- `config/dev-test-error.ts` - 测试 injectOnErrorPlugin
- `config/dev-debug.ts` - 调试配置
