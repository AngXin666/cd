# 缓存清理指南

## 问题描述

在优化租赁端功能后，可能会遇到以下错误：

```
Uncaught TypeError: Cannot read properties of undefined (reading 'toFixed')
    at LeaseAdminDashboard (/pages/lease-admin/index.tsx:499:63)
```

## 问题原因

这个错误是由于**浏览器或开发服务器缓存了旧版本的代码**导致的。虽然源代码已经更新，但是：

1. 浏览器可能缓存了旧的 JavaScript 文件
2. Vite 开发服务器可能缓存了旧的编译结果
3. Node.js 模块缓存可能保留了旧的模块

在旧版本的代码中，`stats` 对象包含 `thisMonthVerifiedAmount` 字段，并且使用了 `toFixed()` 方法来格式化金额。但在新版本中，这个字段已经被移除。

## 解决方案

### 方案一：完全清理缓存（推荐）

1. **停止开发服务器**（如果正在运行）
   ```bash
   # 按 Ctrl+C 停止服务器
   ```

2. **运行清理脚本**
   ```bash
   bash clear-cache.sh
   ```

3. **重新启动开发服务器**
   ```bash
   pnpm run dev:h5
   ```

### 方案二：手动清理缓存

如果清理脚本无法运行，可以手动执行以下命令：

```bash
# 清理编译输出
rm -rf dist
rm -rf .temp

# 清理 Vite 缓存
rm -rf node_modules/.cache
rm -rf node_modules/.vite

# 清理浏览器缓存（在浏览器中）
# Chrome/Edge: Ctrl+Shift+Delete -> 清除缓存
# Firefox: Ctrl+Shift+Delete -> 清除缓存
# Safari: Command+Option+E
```

### 方案三：强制刷新浏览器

在浏览器中按以下快捷键强制刷新：

- **Windows/Linux**: `Ctrl + Shift + R` 或 `Ctrl + F5`
- **Mac**: `Command + Shift + R`

## 验证修复

清理缓存后，验证以下内容：

1. **检查页面是否正常加载**
   - 访问租赁系统管理页面
   - 确认显示4个统计卡片（不是6个）
   - 确认只有1个快速操作按钮（不是4个）

2. **检查控制台是否有错误**
   - 打开浏览器开发者工具（F12）
   - 查看 Console 标签
   - 确认没有 `toFixed` 相关的错误

3. **检查数据是否正确显示**
   - 老板账号总数
   - 活跃账号
   - 停用账号
   - 本月新增

## 技术说明

### 修改内容

在本次优化中，我们对 `src/pages/lease-admin/index.tsx` 进行了以下修改：

**移除的字段：**
- `pendingBills`（待核销账单）
- `thisMonthVerifiedAmount`（本月核销金额）

**保留的字段：**
- `totalTenants`（老板账号总数）
- `activeTenants`（活跃账号）
- `suspendedTenants`（停用账号）
- `thisMonthNewTenants`（本月新增）

### 为什么会出现缓存问题？

1. **开发服务器热更新限制**
   - Vite 的热模块替换（HMR）有时无法完全更新所有依赖
   - 特别是涉及类型定义变更时

2. **浏览器缓存策略**
   - 浏览器会缓存 JavaScript 文件以提高性能
   - 即使文件内容改变，浏览器可能仍使用缓存版本

3. **模块缓存**
   - Node.js 会缓存已加载的模块
   - 需要清理缓存才能加载新版本

## 预防措施

为了避免将来出现类似问题：

1. **在进行重大修改后，始终清理缓存**
   ```bash
   bash clear-cache.sh
   ```

2. **使用硬刷新测试**
   - 在测试新功能时，使用 `Ctrl+Shift+R` 强制刷新

3. **检查浏览器开发者工具**
   - 在 Network 标签中，勾选 "Disable cache"
   - 这样可以确保每次都加载最新的文件

4. **定期清理 node_modules 缓存**
   ```bash
   rm -rf node_modules/.cache
   rm -rf node_modules/.vite
   ```

## 相关文件

- `src/pages/lease-admin/index.tsx` - 租赁管理主页面
- `src/db/api.ts` - `getLeaseStats()` 函数
- `clear-cache.sh` - 缓存清理脚本

## 总结

这个错误是由于缓存问题导致的，不是代码本身的问题。源代码已经正确更新，只需要清理缓存即可解决。

如果清理缓存后问题仍然存在，请检查：
1. 是否有其他地方引用了已删除的字段
2. 是否有 TypeScript 编译错误
3. 是否有其他页面或组件使用了旧的数据结构
