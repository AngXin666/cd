# TypeScript 严格模式迁移指南

## 概述

本文档说明如何逐步将项目迁移到 TypeScript 严格模式，以提高代码质量和类型安全性。

## 当前状态

项目已创建 `tsconfig.strict.json` 配置文件，目前仅包含以下已经符合严格模式的文件：
- `src/types/**/*` - 所有类型定义
- `src/utils/errorHandler.ts` - 错误处理器
- `src/utils/storage.ts` - 类型安全存储
- `src/utils/loggerWrapper.ts` - 日志包装器
- `src/utils/logger.ts` - 日志系统

## 严格模式选项说明

### 核心严格选项
- `strict: true` - 启用所有严格类型检查选项
- `strictNullChecks: true` - 不允许 null 和 undefined 赋值给其他类型
- `strictFunctionTypes: true` - 启用函数参数的严格检查
- `strictBindCallApply: true` - 严格检查 bind、call 和 apply 方法
- `strictPropertyInitialization: true` - 类属性必须初始化
- `noImplicitAny: true` - 不允许隐式 any 类型
- `noImplicitThis: true` - 不允许 this 表达式隐式为 any 类型
- `alwaysStrict: true` - 以严格模式解析并为每个源文件生成 "use strict"

### 额外类型检查
- `noUnusedLocals: true` - 报告未使用的局部变量
- `noUnusedParameters: true` - 报告未使用的参数
- `noImplicitReturns: true` - 函数的所有代码路径都必须返回值
- `noFallthroughCasesInSwitch: true` - 报告 switch 语句的 fallthrough 错误
- `noUncheckedIndexedAccess: true` - 索引访问返回 undefined 联合类型
- `noImplicitOverride: true` - 重写方法必须使用 override 关键字
- `noPropertyAccessFromIndexSignature: true` - 索引签名属性必须使用索引访问

## 迁移策略

### 阶段1：基础设施文件（已完成）
已经迁移的文件：
- ✅ 类型定义文件
- ✅ 核心工具类

### 阶段2：工具函数（推荐下一步）
建议按以下顺序迁移：
1. `src/utils/cache.ts`
2. `src/utils/apiCache.ts`
3. `src/utils/capacitor.ts`
4. `src/utils/auth.ts`
5. `src/utils/attendance-check.ts`
6. `src/utils/account-status-check.ts`

### 阶段3：服务层
1. `src/services/notificationService.ts`
2. `src/services/permission-service.ts`

### 阶段4：数据库 API 层
1. `src/db/api/users.ts`
2. `src/db/api/warehouses.ts`
3. `src/db/api/vehicles.ts`
4. `src/db/api/piecework.ts`

### 阶段5：Hooks
1. `src/hooks/useDashboardData.ts`
2. `src/hooks/useWarehousesData.ts`
3. `src/hooks/useNotifications.ts`
4. 其他 hooks

### 阶段6：页面组件
最后迁移页面组件，因为它们依赖于其他所有模块。

## 迁移步骤

### 1. 选择要迁移的文件
从上述阶段中选择一个文件或一组相关文件。

### 2. 添加到 tsconfig.strict.json
在 `tsconfig.strict.json` 的 `include` 数组中添加文件路径：
```json
{
  "include": [
    "./src/types/**/*",
    "./src/utils/errorHandler.ts",
    "./src/utils/storage.ts",
    "./src/utils/loggerWrapper.ts",
    "./src/utils/logger.ts",
    "./src/utils/cache.ts"  // 新添加的文件
  ]
}
```

### 3. 运行类型检查
```bash
npx tsc --project tsconfig.strict.json --noEmit
```

### 4. 修复类型错误
根据错误信息修复代码：

#### 常见问题和解决方案

**问题1：可能为 null 或 undefined**
```typescript
// 错误
const name = user.name.toUpperCase()

// 修复
const name = user.name?.toUpperCase() ?? 'UNKNOWN'
```

**问题2：隐式 any 类型**
```typescript
// 错误
function process(data) { }

// 修复
function process(data: unknown) { }
// 或
function process<T>(data: T) { }
```

**问题3：未使用的变量**
```typescript
// 错误
const result = await fetchData()

// 修复（如果确实不需要）
await fetchData()

// 修复（如果需要但未使用）
const _result = await fetchData()
```

**问题4：索引访问可能为 undefined**
```typescript
// 错误
const value = obj[key]

// 修复
const value = obj[key] ?? defaultValue
// 或
if (key in obj) {
  const value = obj[key]
}
```

### 5. 验证修复
再次运行类型检查确保没有错误：
```bash
npx tsc --project tsconfig.strict.json --noEmit
```

### 6. 提交更改
提交代码并继续下一个文件。

## 最终目标

当所有文件都迁移完成后，更新主 `tsconfig.json` 文件以启用严格模式：

```json
{
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true,
    "noImplicitAny": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

然后删除 `tsconfig.strict.json` 文件。

## 注意事项

1. **逐步迁移**：不要一次性迁移所有文件，这会导致大量错误难以处理
2. **测试覆盖**：确保迁移的文件有足够的测试覆盖
3. **团队沟通**：确保团队成员了解严格模式的要求
4. **文档更新**：更新开发文档以反映新的类型要求

## 参考资源

- [TypeScript 严格模式文档](https://www.typescriptlang.org/tsconfig#strict)
- [TypeScript 编译选项](https://www.typescriptlang.org/tsconfig)
