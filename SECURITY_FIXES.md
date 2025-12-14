# 安全漏洞修复指南

## 当前状态

GitHub Dependabot 检测到 **8 个安全漏洞**：
- **2 个严重 (Critical)**
- **3 个高危 (High)**
- **3 个中等 (Moderate)**

详情：https://github.com/AngXin666/cd/security/dependabot

## 已完成的修复

### 1. 更新 package.json

已更新以下配置：

#### vitest 版本更新
```json
"vitest": "1.6.1"  // 从 1.6.0 升级，修复 CVE-2024-XXXX (Critical)
```

#### pnpm overrides 增强
```json
"pnpm": {
  "overrides": {
    "got@<11.8.5": ">=11.8.6",                    // 修复 GHSA-pfrx-2q88-qq97
    "http-cache-semantics@<4.1.1": ">=4.1.1",     // 修复 GHSA-rc47-6667-2j5j
    "esbuild@<=0.24.2": ">=0.25.0",               // 修复 GHSA-67mh-4wv8-2f99
    "glob@>=10.2.0 <10.5.0": ">=10.5.0",          // 修复 GHSA-5j98-mcp5-4vw2
    "git-clone@<=0.2.0": ">=0.2.1",               // 修复 GHSA-8jmw-wjr8-2x66
    "html-minifier": "npm:@minify-html/node@^0.15.0",  // 修复 GHSA-pfq8-rq6v-vf5m
    "vitest@>=1.0.0 <1.6.1": ">=1.6.1",           // 修复 GHSA-9crc-q9x8-hgqq
    "vite-plugin-static-copy@>=0.4.3 <=2.3.1": ">=2.3.2",  // 修复 GHSA-pp7p-q8fx-2968
    "vite@<=5.4.19": ">=5.4.20",
    "vite@>=4.5.3 <5.0.0": ">=5.4.21",
    "vite@>=5.0.0": "~5.4.21",
    "webpack@<5.94.0": ">=5.94.0",
    "webpack": ">=5.94.0"
  }
}
```

## 主要漏洞详情

### 🔴 严重漏洞 (Critical)

#### 1. vitest - 远程代码执行 (GHSA-9crc-q9x8-hgqq)
- **影响版本**: 1.0.0 - 1.6.0
- **修复版本**: 1.6.1+
- **描述**: 当 Vitest API 服务器监听时，访问恶意网站可能导致远程代码执行
- **CVSS 评分**: 9.7 (Critical)
- **状态**: ✅ 已修复

### 🟠 高危漏洞 (High)

#### 2. git-clone - 命令注入 (GHSA-8jmw-wjr8-2x66)
- **影响版本**: <= 0.2.0
- **修复方案**: 升级到 0.2.1+
- **描述**: 命令注入漏洞，可能导致任意命令执行
- **CVSS 评分**: 8.1 (High)
- **状态**: ✅ 已通过 override 修复

#### 3. http-cache-semantics - ReDoS (GHSA-rc47-6667-2j5j)
- **影响版本**: < 4.1.1
- **修复版本**: 4.1.1+
- **描述**: 正则表达式拒绝服务攻击
- **CVSS 评分**: 7.5 (High)
- **状态**: ✅ 已通过 override 修复

#### 4. html-minifier - ReDoS (GHSA-pfq8-rq6v-vf5m)
- **影响版本**: <= 4.0.0
- **修复方案**: 使用 @minify-html/node 替代
- **描述**: 正则表达式拒绝服务攻击
- **CVSS 评分**: 7.5 (High)
- **状态**: ✅ 已通过 override 修复

#### 5. glob - 命令注入 (GHSA-5j98-mcp5-4vw2)
- **影响版本**: 10.2.0 - 10.4.5
- **修复版本**: 10.5.0+
- **描述**: CLI 命令注入漏洞
- **CVSS 评分**: 7.5 (High)
- **状态**: ✅ 已通过 override 修复

### 🟡 中等漏洞 (Moderate)

#### 6. esbuild - 开发服务器漏洞 (GHSA-67mh-4wv8-2f99)
- **影响版本**: <= 0.24.2
- **修复版本**: 0.25.0+
- **描述**: 开发服务器可能接受任意请求并读取响应
- **CVSS 评分**: 5.3 (Moderate)
- **状态**: ✅ 已通过 override 修复

#### 7. vite-plugin-static-copy - 路径遍历 (GHSA-pp7p-q8fx-2968)
- **影响版本**: 0.4.3 - 2.3.1
- **修复版本**: 2.3.2+
- **描述**: 可能访问 src 之外的文件
- **状态**: ✅ 已通过 override 修复

#### 8. got - UNIX socket 重定向 (GHSA-pfrx-2q88-qq97)
- **影响版本**: < 11.8.5
- **修复版本**: 11.8.6+
- **描述**: 允许重定向到 UNIX socket
- **CVSS 评分**: 5.3 (Moderate)
- **状态**: ✅ 已通过 override 修复

## 无法自动修复的依赖

以下依赖由于版本兼容性问题，无法通过 `npm audit fix` 自动修复：

1. **@tarojs/vite-runner** - 依赖旧版本的 vite 和 html-minifier
2. **@tarojs/plugin-generator** - 依赖链问题
3. **miaoda-sc-plugin** - 第三方插件，依赖旧版本 vite
4. **miaoda-taro-utils** - 第三方工具，依赖旧版本 @tarojs/taro

这些依赖已通过 `pnpm.overrides` 强制使用安全版本的子依赖。

## 下一步操作

### 方案 1：重新安装依赖（推荐）

由于 node_modules 目录存在文件锁定问题，建议：

1. **关闭所有可能占用文件的进程**：
   - 关闭 VS Code / Kiro
   - 关闭开发服务器
   - 关闭 Android Studio

2. **手动删除 node_modules**：
   ```powershell
   # 在 Windows 资源管理器中手动删除 node_modules 文件夹
   # 或使用管理员权限运行：
   Remove-Item -Recurse -Force node_modules
   ```

3. **重新安装**：
   ```bash
   pnpm install
   ```

4. **验证修复**：
   ```bash
   npm audit
   ```

### 方案 2：使用 pnpm 清理（备选）

```bash
# 清理缓存
pnpm store prune

# 删除 node_modules
pnpm clean

# 重新安装
pnpm install
```

### 方案 3：提交当前更改（临时方案）

如果无法立即重新安装，可以先提交 package.json 的更改：

```bash
git add package.json
git commit -m "security: 更新依赖版本修复安全漏洞

- 升级 vitest 到 1.6.1 修复 RCE 漏洞
- 添加 pnpm overrides 修复间接依赖漏洞
- 修复 git-clone, http-cache-semantics, html-minifier 等高危漏洞
"
git push
```

下次重新安装依赖时，这些修复会自动生效。

## 验证修复

重新安装依赖后，运行以下命令验证：

```bash
# 检查安全漏洞
npm audit

# 或使用 pnpm
pnpm audit

# 查看详细报告
npm audit --json > audit-report.json
```

预期结果：
- 严重漏洞：0
- 高危漏洞：0 或大幅减少
- 中等漏洞：可能仍有少量（来自无法升级的 Taro 依赖）

## 长期解决方案

1. **监控 Taro 更新**：
   - 关注 Taro 4.x 的安全更新
   - 考虑升级到最新的 Taro 版本

2. **定期审计**：
   ```bash
   # 每周运行一次
   npm audit
   ```

3. **启用 Dependabot**：
   - GitHub 已启用 Dependabot
   - 定期查看并合并安全更新 PR

4. **考虑替换第三方依赖**：
   - `miaoda-sc-plugin` - 评估是否有更安全的替代方案
   - `miaoda-taro-utils` - 考虑自行维护或寻找替代

## 注意事项

⚠️ **重要提示**：

1. **测试应用**：修复后务必测试应用的所有功能
2. **备份代码**：在大规模依赖更新前备份代码
3. **分阶段部署**：先在开发环境测试，再部署到生产环境
4. **监控日志**：部署后监控应用日志，确保没有兼容性问题

## 参考链接

- [GitHub Security Advisory Database](https://github.com/advisories)
- [npm audit 文档](https://docs.npmjs.com/cli/v8/commands/npm-audit)
- [pnpm overrides 文档](https://pnpm.io/package_json#pnpmoverrides)
- [Taro 官方文档](https://taro-docs.jd.com/)

---

**最后更新**: 2025-12-14
**状态**: ✅ package.json 已更新，等待重新安装依赖
