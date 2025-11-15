# 缓存清理指南

## 问题描述

如果您在浏览器中看到以下错误：
```
Uncaught ReferenceError: allUsers is not defined
```

这是因为浏览器或开发服务器缓存了旧版本的代码。源代码已经更新，但缓存的构建文件还在使用旧代码。

## 解决方案

### 方案 1：清理开发服务器缓存（推荐）

1. **停止开发服务器**
   - 在运行 `pnpm run dev:h5` 或 `pnpm run dev:weapp` 的终端中按 `Ctrl+C`

2. **清理缓存目录**
   ```bash
   # 清理所有缓存和构建文件
   rm -rf dist .temp node_modules/.cache
   ```

3. **重新启动开发服务器**
   ```bash
   # H5 开发
   pnpm run dev:h5
   
   # 或者小程序开发
   pnpm run dev:weapp
   ```

### 方案 2：清理浏览器缓存

1. **Chrome/Edge 浏览器**
   - 按 `F12` 打开开发者工具
   - 右键点击刷新按钮
   - 选择"清空缓存并硬性重新加载"

2. **或者使用快捷键**
   - Windows/Linux: `Ctrl + Shift + Delete`
   - Mac: `Cmd + Shift + Delete`
   - 选择"缓存的图片和文件"
   - 点击"清除数据"

### 方案 3：完全重新构建

如果上述方法都不起作用，可以尝试完全重新构建项目：

```bash
# 1. 停止开发服务器（Ctrl+C）

# 2. 清理所有构建产物
rm -rf dist .temp node_modules/.cache

# 3. 重新安装依赖（可选，通常不需要）
# pnpm install

# 4. 重新启动开发服务器
pnpm run dev:h5
```

## 验证修复

修复后，您应该能够：
1. 正常访问超级管理员首页
2. 不再看到 `allUsers is not defined` 错误
3. 看到更新后的界面（没有"系统用户统计"模块）

## 代码变更说明

以下变量和函数已从 `src/pages/super-admin/index.tsx` 中移除：
- ❌ `allUsers` 状态变量
- ❌ `driverCount` 计算变量
- ❌ `managerCount` 计算变量
- ❌ `superAdminCount` 计算变量
- ❌ `getAllProfiles()` API 调用
- ❌ "系统用户统计"UI 模块

保留的功能：
- ✅ 司机实时状态统计
- ✅ 数据仪表盘
- ✅ 所有其他管理功能

## 技术说明

这个错误的根本原因是：
1. 源代码已经更新，移除了 `allUsers` 变量
2. 但是开发服务器的热更新（HMR）可能没有完全刷新所有模块
3. 或者浏览器缓存了旧的 JavaScript 文件

通过清理缓存和重新构建，可以确保使用最新的代码。

## 预防措施

为了避免将来出现类似问题：
1. 在进行大规模代码重构后，建议重启开发服务器
2. 如果遇到奇怪的运行时错误，首先尝试清理缓存
3. 使用浏览器的"无痕模式"可以避免缓存问题

## 需要帮助？

如果按照上述步骤操作后问题仍然存在，请检查：
1. 确认源代码文件 `src/pages/super-admin/index.tsx` 中确实没有 `allUsers` 变量
2. 确认开发服务器已经完全重启
3. 确认浏览器缓存已经清理
4. 尝试使用不同的浏览器或无痕模式访问
