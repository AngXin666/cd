# 代码质量修复 - 设计文档

## 概述

本设计文档描述了车队管家系统代码质量改进的技术方案。该方案旨在系统性地解决类型安全、错误处理、日志记录等方面的技术债务,提升代码的可维护性、可靠性和开发体验。

## 架构

### 整体架构原则

1. **渐进式改进**: 按优先级逐步修复,避免大规模破坏性变更
2. **向后兼容**: 保持现有 API 接口不变,确保业务功能正常运行
3. **类型优先**: 充分利用 TypeScript 类型系统,在编译时捕获错误
4. **统一标准**: 建立一致的编码规范和最佳实践

### 修复优先级

```
高优先级 (P0):
├── Console 语句替换
├── 错误处理标准化
└── 关键路径的 Any 类型替换

中优先级 (P1):
├── 工具函数的 Any 类型替换
├── API 响应类型验证
└── 导入语句组织

低优先级 (P2):
├── TypeScript 配置优化
├── 复杂类型文档化
└── 类型安全测试
```

## 组件和接口

### 1. 类型系统改进

#### 1.1 通用工具类型

```typescript
// src/types/utils.ts

/**
 * 存储工具函数的类型定义
 */
export type StorageValue = string | number | boolean | object | null

export interface StorageGetOptions {
  key: string
  defaultValue?: StorageValue
}

export interface StorageSetOptions {
  key: string
  data: StorageValue
  encrypt?: boolean
}

/**
 * 回调函数类型定义
 */
export type VoidCallback = () => void
export type ErrorCallback = (error: Error) => void
export type DataCallback<T> = (data: T) => void

/**
 * 异步操作结果类型
 */
export interface AsyncResult<T, E = Error> {
  data?: T
  error?: E
  success: boolean
}

/**
 * 分页数据类型
 */
export interface PaginatedData<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}
```

#### 1.2 API 响应类型

```typescript
// src/types/api.ts

/**
 * 标准 API 响应格式
 */
export interface ApiResponse<T> {
  data: T | null
  error: ApiError | null
  success: boolean
  message?: string
}

/**
 * API 错误类型
 */
export interface ApiError {
  code: string | number
  message: string
  details?: Record<string, unknown>
  statusCode?: number
}

/**
 * Supabase 查询构建器类型
 */
export interface QueryBuilder<T> {
  eq: (column: string, value: unknown) => QueryBuilder<T>
  neq: (column: string, value: unknown) => QueryBuilder<T>
  in: (column: string, values: unknown[]) => QueryBuilder<T>
  order: (column: string, options?: {ascending?: boolean}) => QueryBuilder<T>
  limit: (count: number) => QueryBuilder<T>
  select: (columns?: string) => QueryBuilder<T>
}
```

#### 1.3 Capacitor 插件类型

```typescript
// src/types/capacitor.ts

import type {PermissionState} from '@capacitor/core'

/**
 * 相机插件类型
 */
export interface CameraPlugin {
  getPhoto: (options: CameraOptions) => Promise<Photo>
  pickImages: (options: GalleryOptions) => Promise<GalleryPhotos>
  checkPermissions: () => Promise<PermissionStatus>
  requestPermissions: () => Promise<PermissionStatus>
}

export interface CameraOptions {
  quality?: number
  allowEditing?: boolean
  resultType: 'uri' | 'base64' | 'dataUrl'
  source?: 'camera' | 'photos'
}

export interface Photo {
  webPath?: string
  path?: string
  format: string
}

export interface GalleryPhotos {
  photos: Photo[]
}

/**
 * 地理位置插件类型
 */
export interface GeolocationPlugin {
  getCurrentPosition: (options?: PositionOptions) => Promise<Position>
  watchPosition: (
    options: PositionOptions,
    callback: (position: Position | null, error?: Error) => void
  ) => Promise<string>
  clearWatch: (options: {id: string}) => Promise<void>
}

export interface Position {
  coords: {
    latitude: number
    longitude: number
    accuracy: number
    altitude: number | null
    altitudeAccuracy: number | null
    heading: number | null
    speed: number | null
  }
  timestamp: number
}

export interface PositionOptions {
  enableHighAccuracy?: boolean
  timeout?: number
  maximumAge?: number
}

/**
 * 网络插件类型
 */
export interface NetworkPlugin {
  getStatus: () => Promise<NetworkStatus>
  addListener: (
    eventName: 'networkStatusChange',
    callback: (status: NetworkStatus) => void
  ) => Promise<PluginListenerHandle>
}

export interface NetworkStatus {
  connected: boolean
  connectionType: 'wifi' | 'cellular' | 'none' | 'unknown'
}

export interface PluginListenerHandle {
  remove: () => Promise<void>
}

/**
 * 权限状态类型
 */
export interface PermissionStatus {
  camera: PermissionState
  photos: PermissionState
  location: PermissionState
}
```

### 2. 错误处理系统

#### 2.1 错误处理器增强

```typescript
// src/utils/errorHandler.ts (增强版)

/**
 * 错误上下文信息
 */
export interface ErrorContext {
  component?: string
  action?: string
  userId?: string
  timestamp?: number
  metadata?: Record<string, unknown>
}

/**
 * 错误处理选项
 */
export interface ErrorHandleOptions {
  showToast?: boolean
  logError?: boolean
  redirectOnAuth?: boolean
  customMessage?: string
  context?: ErrorContext
}

/**
 * 增强的错误处理器
 */
class EnhancedErrorHandler extends ErrorHandler {
  /**
   * 处理错误并提供更多上下文
   */
  handleWithContext(error: unknown, options: ErrorHandleOptions = {}): void {
    const {
      showToast = true,
      logError = true,
      redirectOnAuth = true,
      customMessage,
      context
    } = options

    const appError = this.parseError(error)

    // 记录错误日志(带上下文)
    if (logError) {
      logger.error('应用错误', {
        ...appError,
        context
      })
    }

    // 显示用户提示
    if (showToast) {
      const userMessage = customMessage || this.getUserMessage(appError)
      this.showToast(userMessage)
    }

    // 处理认证错误
    if (appError.type === ErrorType.AUTH && redirectOnAuth) {
      this.redirectToLogin()
    }
  }

  /**
   * 批量错误处理
   */
  handleBatch(errors: Array<{error: unknown; context?: ErrorContext}>): void {
    const errorSummary = errors.map(({error, context}) => ({
      error: this.parseError(error),
      context
    }))

    logger.error('批量错误', {errors: errorSummary})

    // 显示汇总提示
    if (errors.length === 1) {
      this.handle(errors[0].error)
    } else {
      showError(`操作失败: ${errors.length} 个错误`)
    }
  }

  private redirectToLogin(): void {
    setTimeout(() => {
      Taro.reLaunch({url: '/pages/login/index'})
    }, 1500)
  }
}

export const enhancedErrorHandler = new EnhancedErrorHandler()
```

### 3. 日志系统标准化

#### 3.1 日志包装器

```typescript
// src/utils/loggerWrapper.ts

/**
 * 为不同模块创建专用日志器
 */
export function createModuleLogger(moduleName: string) {
  const logger = createLogger(moduleName)

  return {
    debug: (message: string, data?: unknown) => {
      logger.debug(message, data)
    },
    info: (message: string, data?: unknown) => {
      logger.info(message, data)
    },
    warn: (message: string, data?: unknown) => {
      logger.warn(message, data)
    },
    error: (message: string, error?: unknown, data?: unknown) => {
      logger.error(message, {error, ...data})
    },
    performance: (operation: string, duration: number, data?: unknown) => {
      logger.performance(operation, duration, data)
    }
  }
}

/**
 * 日志装饰器
 */
export function LogMethod(options: {level?: 'debug' | 'info'; includeArgs?: boolean} = {}) {
  return (target: object, propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value
    const {level = 'debug', includeArgs = false} = options

    descriptor.value = function (this: unknown, ...args: unknown[]) {
      const logger = createModuleLogger(target.constructor.name)
      const logData = includeArgs ? {args} : undefined

      logger[level](`${propertyKey} 调用`, logData)

      try {
        const result = originalMethod.apply(this, args)

        if (result instanceof Promise) {
          return result.catch((error: unknown) => {
            logger.error(`${propertyKey} 失败`, error)
            throw error
          })
        }

        return result
      } catch (error) {
        logger.error(`${propertyKey} 失败`, error)
        throw error
      }
    }

    return descriptor
  }
}
```

### 4. 存储工具类型安全

#### 4.1 类型安全的存储工具

```typescript
// src/utils/storage.ts

/**
 * 类型安全的存储工具
 */
export class TypeSafeStorage {
  /**
   * 获取存储值(带类型推断)
   */
  static get<T = StorageValue>(key: string, defaultValue?: T): T | null {
    try {
      if (isH5) {
        const value = localStorage.getItem(key)
        return value ? (JSON.parse(value) as T) : (defaultValue ?? null)
      }
      return Taro.getStorageSync<T>(key) || (defaultValue ?? null)
    } catch (error) {
      logger.error('获取存储失败', {key, error})
      return defaultValue ?? null
    }
  }

  /**
   * 设置存储值
   */
  static set<T = StorageValue>(key: string, data: T): boolean {
    try {
      if (isH5) {
        localStorage.setItem(key, JSON.stringify(data))
      } else {
        Taro.setStorageSync(key, data)
      }
      return true
    } catch (error) {
      logger.error('设置存储失败', {key, error})
      return false
    }
  }

  /**
   * 移除存储值
   */
  static remove(key: string): boolean {
    try {
      if (isH5) {
        localStorage.removeItem(key)
      } else {
        Taro.removeStorageSync(key)
      }
      return true
    } catch (error) {
      logger.error('移除存储失败', {key, error})
      return false
    }
  }

  /**
   * 清空所有存储
   */
  static clear(): boolean {
    try {
      if (isH5) {
        localStorage.clear()
      } else {
        Taro.clearStorageSync()
      }
      return true
    } catch (error) {
      logger.error('清空存储失败', error)
      return false
    }
  }
}
```

## 数据模型

### 类型定义改进

#### 修复 src/db/types.ts 中的问题

```typescript
// 移除 any 类型
export interface WarehouseWithRule extends Warehouse {
  rule?: WarehouseRule | null // 替代 any
  resignation_notice_days?: number
}

export interface WarehouseRule {
  id: string
  warehouse_id: string
  max_leave_days: number
  resignation_notice_days: number
  daily_target: number
  created_at: string
  updated_at: string
}

export interface LeaseWithTenant extends Lease {
  tenant?: TenantInfo | null // 替代 any
}

export interface TenantInfo {
  id: string
  name: string
  contact_person?: string
  contact_phone?: string
  created_at: string
}

export interface VehicleWithDriverDetails extends Vehicle {
  driver?: Profile | null
  driver_name?: string | null
  driver_phone?: string | null
  driver_profile?: Profile | null
  driver_license?: DriverLicense | null
  locked_photos?: Record<string, PhotoLockInfo> // 替代 Record<string, any>
}

export interface PhotoLockInfo {
  url: string
  locked_at: string
  locked_by: string
  reason?: string
}
```

## 正确性属性

*属性是系统在所有有效执行中应保持为真的特征或行为——本质上是关于系统应该做什么的形式化陈述。属性作为人类可读规范和机器可验证正确性保证之间的桥梁。*

### 属性 1: 类型安全性保持

*对于任何*代码重构操作,重构前后的类型签名应保持兼容,不应引入新的类型错误
**验证需求: 5.1, 5.2, 5.3**

### 属性 2: 错误处理一致性

*对于任何*错误处理场景,所有错误都应通过统一的错误处理器处理,并提供一致的用户反馈
**验证需求: 4.1, 4.2, 4.3, 4.4**

### 属性 3: 日志记录完整性

*对于任何*需要调试信息的操作,应使用结构化日志记录而非 console 语句,且日志应包含足够的上下文信息
**验证需求: 3.1, 3.2, 3.3, 3.4**

### 属性 4: API 响应类型正确性

*对于任何*API 调用,返回的数据结构应与定义的类型接口完全匹配
**验证需求: 8.1, 8.2, 8.3, 8.4**

### 属性 5: 存储操作类型安全

*对于任何*存储读写操作,数据类型应在编译时验证,避免运行时类型错误
**验证需求: 2.3, 2.4, 5.4**

### 属性 6: 导入语句规范性

*对于任何*文件的导入语句,应遵循统一的组织规则(外部包、内部模块、类型、样式)
**验证需求: 6.1, 6.2, 6.3, 6.4**

### 属性 7: 错误边界覆盖性

*对于任何*页面组件,应被错误边界包裹以防止组件错误导致应用崩溃
**验证需求: 7.1, 7.2, 7.3, 7.4**

### 属性 8: 类型抑制消除

*对于任何*生产代码,不应存在 @ts-ignore 或 @ts-nocheck 注释,所有类型问题应通过正确的类型定义解决
**验证需求: 1.1, 1.2, 1.3, 1.4**

## 错误处理

### 错误处理策略

#### 1. API 错误处理

```typescript
// 标准 API 调用模式
async function fetchData<T>(operation: string, apiCall: () => Promise<T>): Promise<T | null> {
  try {
    const result = await apiCall()
    return result
  } catch (error) {
    enhancedErrorHandler.handleWithContext(error, {
      customMessage: `${operation}失败`,
      context: {
        action: operation,
        component: 'API'
      }
    })
    return null
  }
}
```

#### 2. 组件错误处理

```typescript
// 使用错误边界包裹组件
function PageWrapper({children}: {children: React.ReactNode}) {
  return (
    <ErrorBoundary
      fallback={(error, reset) => (
        <View className="error-container">
          <Text>页面加载失败</Text>
          <Button onClick={reset}>重试</Button>
        </View>
      )}
      onError={(error, errorInfo) => {
        logger.error('组件错误', {error, errorInfo})
      }}
    >
      {children}
    </ErrorBoundary>
  )
}
```

#### 3. 异步操作错误处理

```typescript
// 使用 withErrorHandler 包装异步函数
const safeAsyncOperation = withErrorHandler(
  async (param: string) => {
    // 异步操作
    return await someAsyncCall(param)
  },
  '操作失败,请重试'
)
```

## 测试策略

### 单元测试

#### 1. 类型工具测试

```typescript
// src/types/utils.test.ts
describe('TypeSafeStorage', () => {
  it('应正确存储和读取字符串', () => {
    const key = 'test-string'
    const value = 'hello'
    TypeSafeStorage.set(key, value)
    expect(TypeSafeStorage.get<string>(key)).toBe(value)
  })

  it('应正确存储和读取对象', () => {
    const key = 'test-object'
    const value = {name: 'test', age: 18}
    TypeSafeStorage.set(key, value)
    expect(TypeSafeStorage.get<typeof value>(key)).toEqual(value)
  })

  it('应在读取失败时返回默认值', () => {
    const defaultValue = 'default'
    expect(TypeSafeStorage.get('non-existent', defaultValue)).toBe(defaultValue)
  })
})
```

#### 2. 错误处理测试

```typescript
// src/utils/errorHandler.test.ts
describe('EnhancedErrorHandler', () => {
  it('应正确解析 API 错误', () => {
    const error = {code: 400, message: 'Bad Request'}
    const parsed = enhancedErrorHandler['parseError'](error)
    expect(parsed.type).toBe(ErrorType.API)
    expect(parsed.code).toBe(400)
  })

  it('应正确处理认证错误', () => {
    const error = {code: 401, message: 'Unauthorized'}
    enhancedErrorHandler.handleWithContext(error, {
      redirectOnAuth: false
    })
    // 验证日志记录和提示显示
  })

  it('应支持批量错误处理', () => {
    const errors = [
      {error: new Error('Error 1')},
      {error: new Error('Error 2')}
    ]
    enhancedErrorHandler.handleBatch(errors)
    // 验证批量处理逻辑
  })
})
```

### 属性测试

使用 Vitest 进行属性测试,验证类型安全性和一致性。

#### 1. 存储操作属性测试

```typescript
// src/utils/storage.test.ts
import {describe, it, expect, fc} from 'vitest'

describe('TypeSafeStorage 属性测试', () => {
  it('属性: 存储后读取应返回相同值', () => {
    fc.assert(
      fc.property(fc.string(), fc.jsonValue(), (key, value) => {
        TypeSafeStorage.set(key, value)
        const retrieved = TypeSafeStorage.get(key)
        expect(retrieved).toEqual(value)
      })
    )
  })

  it('属性: 删除后读取应返回 null', () => {
    fc.assert(
      fc.property(fc.string(), fc.jsonValue(), (key, value) => {
        TypeSafeStorage.set(key, value)
        TypeSafeStorage.remove(key)
        expect(TypeSafeStorage.get(key)).toBeNull()
      })
    )
  })
})
```

#### 2. 错误处理属性测试

```typescript
// src/utils/errorHandler.test.ts
describe('ErrorHandler 属性测试', () => {
  it('属性: 所有错误类型都应被正确分类', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.record({code: fc.integer(400, 599), message: fc.string()}),
          fc.string(),
          fc.constant(new Error('test'))
        ),
        (error) => {
          const parsed = enhancedErrorHandler['parseError'](error)
          expect(parsed.type).toBeDefined()
          expect(Object.values(ErrorType)).toContain(parsed.type)
        }
      )
    )
  })
})
```

### 集成测试

#### API 类型验证测试

```typescript
// src/db/api/users.test.ts
describe('Users API 类型验证', () => {
  it('getUserById 应返回正确类型的用户数据', async () => {
    const userId = 'test-user-id'
    const user = await UsersAPI.getUserById(userId)

    if (user) {
      // 验证类型结构
      expect(user).toHaveProperty('id')
      expect(user).toHaveProperty('name')
      expect(user).toHaveProperty('role')
      expect(typeof user.id).toBe('string')
      expect(typeof user.name).toBe('string')
    }
  })

  it('getAllUsers 应返回用户数组', async () => {
    const users = await UsersAPI.getAllUsers()
    expect(Array.isArray(users)).toBe(true)
    users.forEach((user) => {
      expect(user).toHaveProperty('id')
      expect(user).toHaveProperty('name')
    })
  })
})
```

## 实施计划

### 阶段 1: 基础设施准备 (1-2天)

1. 创建新的类型定义文件
2. 增强错误处理器
3. 创建类型安全的存储工具
4. 设置测试框架

### 阶段 2: 高优先级修复 (3-5天)

1. 替换所有 console 语句
2. 标准化错误处理
3. 修复关键路径的 any 类型

### 阶段 3: 中优先级修复 (5-7天)

1. 修复工具函数的 any 类型
2. 验证 API 响应类型
3. 组织导入语句

### 阶段 4: 低优先级优化 (3-5天)

1. 优化 TypeScript 配置
2. 添加类型文档
3. 创建类型安全测试

### 阶段 5: 验证和部署 (2-3天)

1. 运行完整测试套件
2. 性能测试
3. 代码审查
4. 部署到测试环境

## 风险和缓解措施

### 风险 1: 类型修改导致编译错误

**缓解措施:**
- 渐进式修改,每次只修改一个模块
- 充分的单元测试覆盖
- 使用 TypeScript 的严格模式逐步启用

### 风险 2: 错误处理变更影响用户体验

**缓解措施:**
- 保持错误消息的一致性
- 充分测试各种错误场景
- 提供回退机制

### 风险 3: 性能影响

**缓解措施:**
- 性能基准测试
- 避免过度的类型检查
- 优化日志记录性能

## 成功指标

1. **类型覆盖率**: 95% 以上的代码有明确类型定义
2. **错误处理一致性**: 100% 的错误通过统一处理器
3. **日志规范性**: 0 个 console 语句在生产代码中
4. **测试覆盖率**: 核心模块 80% 以上测试覆盖
5. **编译时错误**: 启用严格模式后无编译错误
