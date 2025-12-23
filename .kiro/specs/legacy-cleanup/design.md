# Design Document

## Overview

本设计文档描述了主项目（Taro + Supabase）清理的技术方案。清理工作将分阶段进行，确保在删除旧代码前有完整的备份，并在清理后验证新框架正常运行。

## Architecture

清理过程采用分阶段执行的架构：

```
┌─────────────────────────────────────────────────────────────┐
│                    清理流程架构                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  阶段1: 备份          阶段2: 清理          阶段3: 验证       │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐   │
│  │ Git Tag     │ ──► │ 删除目录    │ ──► │ 检查完整性  │   │
│  │ 创建备份    │     │ 删除文件    │     │ 启动测试    │   │
│  │ 推送远程    │     │ 清理配置    │     │ 提交变更    │   │
│  └─────────────┘     └─────────────┘     └─────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. 备份组件

负责在清理前创建完整备份：
- 创建 Git 标签 `v1.0-legacy`
- 推送标签到远程仓库
- 验证标签存在

### 2. 清理组件

负责删除不需要的文件和目录：
- 前端代码清理 (src/, config/, dist/, h5-bundles/)
- Supabase 配置清理 (supabase/)
- Android 代码清理 (android/, *.apk)
- 测试代码清理 (e2e/)
- 根目录配置清理 (package.json, node_modules/ 等)
- 归档文件清理 (archive/)

### 3. 验证组件

负责验证清理结果：
- 检查保留目录完整性 (fleet-manager/, .git/, .kiro/, .vscode/)
- 验证新框架可以正常启动
- 提交清理变更

## Data Models

本功能不涉及数据模型变更，仅涉及文件系统操作。

### 清理目标清单

| 类型 | 路径 | 操作 |
|------|------|------|
| 目录 | src/ | 删除 |
| 目录 | config/ | 删除 |
| 目录 | dist/ | 删除 |
| 目录 | h5-bundles/ | 删除 |
| 目录 | supabase/ | 删除 |
| 目录 | android/ | 删除 |
| 目录 | e2e/ | 删除 |
| 目录 | archive/ | 删除 |
| 目录 | node_modules/ | 删除 |
| 目录 | playwright-report/ | 删除 |
| 目录 | test-results/ | 删除 |
| 文件 | package.json | 删除 |
| 文件 | pnpm-lock.yaml | 删除 |
| 文件 | pnpm-workspace.yaml | 删除 |
| 文件 | tsconfig.json | 删除 |
| 文件 | tailwind.config.js | 删除 |
| 文件 | postcss.config.js | 删除 |
| 文件 | project.config.json | 删除 |
| 文件 | project.private.config.json | 删除 |
| 文件 | *.apk | 删除 |

### 保留目录清单

| 路径 | 说明 |
|------|------|
| fleet-manager/ | 新框架代码 |
| .git/ | Git 版本控制 |
| .kiro/ | Kiro 配置 |
| .vscode/ | VS Code 配置 |
| docs/ | 项目文档（可选保留） |
| scripts/ | 通用脚本（可选保留） |

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

由于本功能主要涉及文件系统操作和 Git 命令，大部分验收标准是具体的示例测试而非通用属性。以下是关键的验证点：

### Property 1: 备份完整性
*For any* cleanup operation, the Git tag "v1.0-legacy" must exist and be accessible before any files are deleted.
**Validates: Requirements 1.1, 1.2, 1.3**

### Property 2: 保留目录完整性
*For any* cleanup operation, the directories fleet-manager/, .git/, .kiro/, .vscode/ must remain intact and unchanged.
**Validates: Requirements 8.1, 8.2**

### Property 3: 新框架可用性
*For any* cleanup operation, the fleet-manager backend and frontend must be able to start successfully after cleanup.
**Validates: Requirements 8.3**

## Error Handling

### 备份失败处理
- 如果 Git 标签创建失败，停止清理流程
- 如果推送到远程失败，提示用户手动推送或检查网络

### 清理失败处理
- 如果删除目录失败（权限问题），记录错误并继续
- 如果删除文件失败，记录错误并继续
- 提供清理失败的目录/文件列表供手动处理

### 验证失败处理
- 如果保留目录缺失，立即停止并报告错误
- 如果新框架无法启动，提供回滚指导

## Testing Strategy

### 验证方法

由于本功能是一次性的清理操作，测试策略以手动验证为主：

1. **备份验证**
   - 执行 `git tag -l v1.0-legacy` 确认标签存在
   - 执行 `git ls-remote --tags origin` 确认远程标签存在

2. **清理验证**
   - 检查目标目录/文件是否已删除
   - 检查保留目录是否完整

3. **功能验证**
   - 启动 fleet-manager 后端服务
   - 启动 fleet-manager 前端服务
   - 验证基本功能正常

### 回滚方案

如果清理后发现问题，可以通过以下方式回滚：

```bash
# 恢复到清理前的状态
git checkout v1.0-legacy -- .

# 或者重置到清理前的提交
git reset --hard v1.0-legacy
```
