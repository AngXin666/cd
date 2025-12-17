# 项目脚本工具

## 脚本概览

本目录包含项目的核心脚本工具，按功能分类如下：

### 🚀 部署相关

| 脚本 | 用途 | 使用方法 |
|------|------|----------|
| `quick-deploy-h5.js` | H5 热更新部署 | `node scripts/quick-deploy-h5.js [版本号] [更新说明]` |
| `deploy.bat` | 构建并部署 H5 | `scripts\deploy.bat [更新说明]` |
| `rollback-version.js` | 版本回滚 | `node scripts/rollback-version.js <版本号>` |

### 🛠️ 开发工具

| 脚本 | 用途 | 使用方法 |
|------|------|----------|
| `dev-local.ps1` | 本地开发服务器 | `npm run dev:local` |
| `dev-rebuild.ps1` | 重新构建开发环境 | `npm run rebuild` |
| `checkAuth.sh` | Lint 检查认证 | 自动在 `npm run lint` 时执行 |
| `checkNavigation.sh` | Lint 检查导航 | 自动在 `npm run lint` 时执行 |

### 🔧 编码配置

| 脚本 | 用途 | 使用方法 |
|------|------|----------|
| `setup-encoding.ps1` | 一键配置 UTF-8 编码 | `powershell scripts/setup-encoding.ps1` |
| `setup-git-encoding.ps1` | 配置 Git 编码 | `powershell scripts/setup-git-encoding.ps1` |
| `setup-powershell-profile.ps1` | 配置 PowerShell Profile | `powershell scripts/setup-powershell-profile.ps1` |
| `encoding-utils.js` | Node.js 编码工具模块 | 在其他脚本中引用 |

### 📦 数据库配置

| 脚本 | 用途 | 使用方法 |
|------|------|----------|
| `setup-database.js` | 初始化数据库 | `node scripts/setup-database.js` |

### 📁 模板

| 文件 | 用途 |
|------|------|
| `templates/powershell-template.ps1` | PowerShell 脚本模板 |

---

## 常用命令

### 部署 H5 热更新

```bash
# 方式 1：使用 bat 脚本（推荐，避免编码问题）
scripts\deploy.bat "更新说明"

# 方式 2：手动执行
pnpm taro build --type h5
node scripts/quick-deploy-h5.js "更新说明"
```

### 版本回滚

```bash
node scripts/rollback-version.js 1.3.4
```

### 本地开发

```bash
npm run dev:local
```

### 配置编码（首次使用）

```powershell
powershell scripts/setup-encoding.ps1
```

---

## 注意事项

1. **部署脚本**：推荐使用 `deploy.bat` 而不是直接调用 `quick-deploy-h5.js`，避免终端编码问题
2. **编码配置**：首次使用项目时，建议运行 `setup-encoding.ps1` 配置 UTF-8 编码
3. **Lint 脚本**：`checkAuth.sh` 和 `checkNavigation.sh` 会在 `npm run lint` 时自动执行

---

## 相关文档

- [部署规则](../.kiro/steering/deployment-rules.md)
- [编码配置快速开始](../docs/开发指南/编码配置快速开始.md)
- [数据库配置](./SETUP-DATABASE.md)
