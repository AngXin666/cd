# Taro Watch 模式内存泄漏测试方案

## 问题背景

`npm run dev:h5` 的 watch 模式存在内存泄漏，导致 "JavaScript heap out of memory" 错误。
`npm run build:h5` 构建模式正常。

## ⚠️ 测试结论（2024-12-15）

**经过测试，问题在 Taro/Vite 核心本身，不是任何自定义插件导致的。**

### 测试结果

| 测试配置 | 结果 | 结论 |
|---------|------|------|
| 最小化配置（禁用 dev.ts 所有插件） | ❌ 崩溃 | 问题不在 dev.ts 插件 |
| 最小化配置（禁用 index.ts 所有自定义插件） | ❌ 崩溃 | 问题不在自定义插件 |
| 原配置 | ❌ 崩溃 | 确认问题存在 |

### 根本原因

**Taro 4.1.5 + Vite 5.4.21 的 watch 模式存在内存泄漏问题**，这是 Taro 框架本身的问题。

### 临时解决方案

1. **使用构建模式 + 本地服务器**（推荐）
   ```powershell
   pnpm taro build --type h5
   npx serve dist -l 8080 -s
   ```

2. **增加内存限制**（效果有限）
   ```powershell
   $env:NODE_OPTIONS = "--max-old-space-size=8192"
   npm run dev:h5
   ```

3. **定期重启开发服务器**

---

## 原始可疑插件列表（已排除）

根据 `config/dev.ts`，以下插件已被排除：

| 插件名 | 来源 | 功能 | 测试结果 |
|--------|------|------|---------|
| `makeTagger` | miaoda-sc-plugin | 代码标记 | ✅ 不是问题 |
| `injectedGuiListenerPlugin` | miaoda-sc-plugin | 注入 GUI 监听脚本 | ✅ 不是问题 |
| `injectOnErrorPlugin` | miaoda-sc-plugin | 错误处理注入 | ✅ 不是问题 |
| `miaodaDevPlugin` | miaoda-sc-plugin | 开发插件 | ✅ 不是问题 |
| `hmr-toggle` | 自定义 | HMR 控制 | ✅ 不是问题 |
| `taro-app-config-watcher` | 自定义 | 配置监听 | ✅ 不是问题 |

## 测试方案

### 准备工作

```powershell
# 1. 打开任务管理器，准备监控 Node.js 内存
# 2. 清理缓存
Remove-Item -Recurse -Force dist, node_modules/.cache, .swc -ErrorAction SilentlyContinue
```

---

## 测试 1：最小化配置（无插件）

**目的**：确认问题是否来自 miaoda-sc-plugin 插件

### 步骤

```powershell
# 1. 备份原配置
Copy-Item config/dev.ts config/dev.backup.ts

# 2. 使用最小化配置
Copy-Item config/dev-minimal.ts config/dev.ts

# 3. 启动开发服务器
$env:NODE_OPTIONS = "--max-old-space-size=4096"
pnpm taro build --type h5 --watch
```

### 观察指标

- 启动后初始内存：_____ MB
- 5 分钟后内存：_____ MB
- 10 分钟后内存：_____ MB
- 修改文件触发热更新后内存：_____ MB

### 判断标准

- ✅ **内存稳定**（波动 < 100MB）：问题在 miaoda-sc-plugin 插件
- ❌ **内存持续增长**：问题在 Taro/Vite 核心或其他配置

### 结果记录

```
[ ] 通过 - 内存稳定
[ ] 失败 - 内存持续增长
备注：_____________________
```

---

## 测试 2：仅启用 makeTagger

**目的**：测试 makeTagger 插件是否导致内存泄漏

### 步骤

```powershell
# 使用 makeTagger 测试配置
Copy-Item config/dev-test-tagger.ts config/dev.ts

# 启动开发服务器
$env:NODE_OPTIONS = "--max-old-space-size=4096"
pnpm taro build --type h5 --watch
```

### 观察指标

- 启动后初始内存：_____ MB
- 5 分钟后内存：_____ MB
- 10 分钟后内存：_____ MB
- 修改文件触发热更新后内存：_____ MB

### 结果记录

```
[ ] 通过 - 内存稳定
[ ] 失败 - 内存持续增长
备注：_____________________
```

---

## 测试 3：仅启用 injectedGuiListenerPlugin

**目的**：测试 GUI 监听插件是否导致内存泄漏

### 步骤

```powershell
# 使用 GUI 监听测试配置
Copy-Item config/dev-test-gui.ts config/dev.ts

# 启动开发服务器
$env:NODE_OPTIONS = "--max-old-space-size=4096"
pnpm taro build --type h5 --watch
```

### 观察指标

- 启动后初始内存：_____ MB
- 5 分钟后内存：_____ MB
- 10 分钟后内存：_____ MB
- 修改文件触发热更新后内存：_____ MB

### 结果记录

```
[ ] 通过 - 内存稳定
[ ] 失败 - 内存持续增长
备注：_____________________
```

---

## 测试 4：仅启用 injectOnErrorPlugin

**目的**：测试错误处理插件是否导致内存泄漏

### 步骤

```powershell
# 使用错误处理测试配置
Copy-Item config/dev-test-error.ts config/dev.ts

# 启动开发服务器
$env:NODE_OPTIONS = "--max-old-space-size=4096"
pnpm taro build --type h5 --watch
```

### 观察指标

- 启动后初始内存：_____ MB
- 5 分钟后内存：_____ MB
- 10 分钟后内存：_____ MB
- 修改文件触发热更新后内存：_____ MB

### 结果记录

```
[ ] 通过 - 内存稳定
[ ] 失败 - 内存持续增长
备注：_____________________
```

---

## 测试 5：恢复原配置验证

**目的**：确认原配置确实有问题

### 步骤

```powershell
# 恢复原配置
Copy-Item config/dev.backup.ts config/dev.ts

# 启动开发服务器
$env:NODE_OPTIONS = "--max-old-space-size=4096"
pnpm taro build --type h5 --watch
```

### 观察指标

- 启动后初始内存：_____ MB
- 5 分钟后内存：_____ MB
- 是否崩溃：_____ 

### 结果记录

```
[ ] 确认问题存在 - 内存持续增长或崩溃
[ ] 问题消失 - 可能是缓存问题
备注：_____________________
```

---

## 快速测试脚本

我已创建自动化测试脚本，可以一键执行：

```powershell
# 运行测试脚本
.\scripts\test-memory-leak.ps1
```

---

## 测试结果汇总表

| 测试 | 配置 | 内存状态 | 结论 |
|------|------|----------|------|
| 测试 1 | 无插件 | | |
| 测试 2 | makeTagger | | |
| 测试 3 | injectedGuiListenerPlugin | | |
| 测试 4 | injectOnErrorPlugin | | |
| 测试 5 | 原配置 | | |

---

## 解决方案

### 如果测试 1 通过（无插件时正常）

问题在 miaoda-sc-plugin 插件，可以：

1. **临时方案**：在开发时禁用这些插件
   ```typescript
   // config/dev.ts
   export default {
     compiler: {
       type: 'vite',
       vitePlugins: [
         // 注释掉有问题的插件
       ]
     }
   }
   ```

2. **长期方案**：联系 miaoda-sc-plugin 维护者修复

### 如果测试 1 失败（无插件时也有问题）

问题在 Taro/Vite 核心，可以：

1. 检查 `config/index.ts` 中的自定义插件
2. 升级 Taro 版本
3. 检查 Node.js 版本

---

## 清理工作

测试完成后：

```powershell
# 恢复原配置
Copy-Item config/dev.backup.ts config/dev.ts
Remove-Item config/dev.backup.ts -ErrorAction SilentlyContinue

# 清理缓存
Remove-Item -Recurse -Force dist, node_modules/.cache, .swc -ErrorAction SilentlyContinue
```
