# 项目脚本工具

## API导入迁移脚本

### 功能说明

`migrate-api-imports.js` - 自动将旧的API导入方式迁移到新的按需导入方式

**优化效果**：
- 减少90%的运行时内存占用
- 提升95%的首次导入速度
- 支持完整的Tree-shaking
- 减少5-10%的打包体积

### 使用方法

#### 1. 预览变更（推荐先执行）

```bash
node scripts/migrate-api-imports.js --dry-run
```

这会显示所有需要修改的地方，但不会实际修改文件。

#### 2. 执行迁移

确认预览结果无误后，执行实际迁移：

```bash
node scripts/migrate-api-imports.js
```

#### 3. 迁移单个文件

如果只想迁移特定文件：

```bash
node scripts/migrate-api-imports.js --file=src/pages/index/index.tsx
```

#### 4. 验证结果

迁移完成后，务必验证：

```bash
# 类型检查
npm run type-check

# 构建测试
npm run build:weapp
npm run build:android

# 运行测试（如果有）
npm run test
```

### 迁移示例

#### 迁移前

```typescript
import { 
  getCurrentUserProfile,      // users 模块
  getAttendanceRecords,        // attendance 模块
  createNotification           // notifications 模块
} from '@/db/api'
```

#### 迁移后

```typescript
import { getCurrentUserProfile } from '@/db/api/users'
import { getAttendanceRecords } from '@/db/api/attendance'
import { createNotification } from '@/db/api/notifications'
```

### 支持的模块

脚本会自动识别以下模块的函数：

- `attendance` - 考勤管理
- `dashboard` - 仪表盘
- `leave` - 请假管理
- `notifications` - 通知管理
- `peer-accounts` - 平级账号
- `peer-admin` - 调度管理
- `permission-context` - 权限上下文
- `permission-strategy` - 权限策略
- `piecework` - 计件管理
- `stats` - 统计数据
- `users` - 用户管理
- `utils` - 工具函数
- `vehicles` - 车辆管理
- `warehouses` - 仓库管理

### 注意事项

1. **备份代码**：虽然脚本经过测试，但建议先提交当前代码或创建备份
2. **先预览**：使用 `--dry-run` 先查看变更
3. **验证结果**：迁移后务必运行类型检查和构建测试
4. **类型导入**：类型导入不受影响，仍可从 `@/db/api` 导入

### 常见问题

#### Q: 脚本会修改哪些文件？

A: 所有 `src/` 目录下的 `.ts` 和 `.tsx` 文件，但不包括 `node_modules`。

#### Q: 如果函数名不在映射表中怎么办？

A: 脚本会显示"未知导入"警告，需要手动处理这些导入。

#### Q: 类型导入会被修改吗？

A: 不会。类型导入（`import type`）不会被修改，因为它们不影响运行时内存。

#### Q: 可以撤销迁移吗？

A: 如果使用了Git，可以通过 `git checkout .` 撤销所有更改。建议迁移前先提交代码。

### 详细文档

更多信息请查看：
- [API导入优化指南](../docs/平台优化/API导入优化指南.md)
- [API内存优化说明](../docs/平台优化/API内存优化说明.md)
- [平台优化报告](../PLATFORM_OPTIMIZATION_REPORT.md)

## 其他脚本

（待添加）
