# 开发环境内存优化指南

## 优化成果 ✅

通过图标库精简优化，项目内存需求已大幅降低：

| 优化项 | 优化前 | 优化后 | 节省 |
|--------|--------|--------|------|
| 内存需求 | 12GB | **4GB** | 67% |
| 图标文件 | 2.79MB (7000+图标) | **46KB** (179图标) | 98.4% |
| 构建时间 | ~60s | **~21s** | 65% |

## 优化方案

### 自定义精简图标集

项目使用 MDI 图标库，但完整库包含 7000+ 图标，而项目只使用 179 个。

通过提取项目实际使用的图标，生成精简图标集：

```bash
# 1. 提取使用的图标列表
node scripts/extract-used-icons.js

# 2. 生成精简图标集
node scripts/generate-custom-icons.js
```

生成的文件：
- `src/assets/used-icons.json` - 图标名称列表
- `src/assets/custom-mdi-icons.json` - 精简图标集配置

### TailwindCSS 配置

`tailwind.config.js` 使用自定义图标集：

```javascript
const customMdiIcons = require('./src/assets/custom-mdi-icons.json')

module.exports = {
  plugins: [
    iconsPlugin({
      collections: {
        mdi: customMdiIcons
      }
    })
  ]
}
```

## 内存需求

| 模式 | 内存限制 | 说明 |
|------|----------|------|
| 开发模式 | **4GB** | 日常开发足够 |
| 生产构建 | **4GB** | 构建 H5 版本 |

## 开发命令

```bash
# H5 开发
npm run dev:h5

# H5 生产构建
npm run build:h5
```

## 添加新图标

如果需要添加新的 MDI 图标：

1. 在代码中使用新图标（如 `i-mdi-new-icon`）
2. 重新运行图标提取脚本：
   ```bash
   node scripts/extract-used-icons.js
   node scripts/generate-custom-icons.js
   ```
3. 重启开发服务器

## 技术细节

### 内存消耗分析（优化后）

| 组件 | 估计内存消耗 |
|------|-------------|
| Taro + Vite 基础 | ~2GB |
| TailwindCSS | ~500MB |
| TypeScript 编译 | ~1GB |
| 精简图标集 | ~50MB |
| **总计** | **~3.5GB** |

### 环境变量

| 变量 | 说明 |
|------|------|
| `NODE_OPTIONS=--max-old-space-size=4096` | 设置 Node.js 内存限制为 4GB |

## 常见问题

### Q: 图标不显示怎么办？

A: 检查图标名称是否在 `src/assets/used-icons.json` 中。如果不在，运行图标提取脚本重新生成。

### Q: 如何检查当前内存使用？

A: 在 Windows 上，可以使用任务管理器查看 Node.js 进程的内存使用情况。

## 更新日志

- 2025-12-15: 图标库精简优化，内存需求从 12GB 降至 4GB
