# TypeScript 类型使用指南

## 概述

本指南介绍车队管家系统中的类型系统设计、常见类型模式和最佳实践。

## 目录

- [类型系统架构](#类型系统架构)
- [核心类型](#核心类型)
- [工具类型](#工具类型)
- [API 类型](#api-类型)
- [最佳实践](#最佳实践)
- [常见模式](#常见模式)
- [类型安全工具](#类型安全工具)

## 类型系统架构

```
src/types/
├── index.ts          # 统一导出所有类型
├── utils.ts          # 通用工具类型
├── api.ts            # API 响应和查询类型
└── capacitor.ts      # Capacitor 插件类型
```

### 导入方式

```typescript
// 推荐：从统一入口导入
import type {StorageValue, ApiResponse, QueryBuilder} from '@/types'

// 也可以从具体文件导入
import type {StorageValue} from '@/types/utils'
import type {ApiResponse} from '@/types/api'
```

## 核心类型

### 1. 存储类型

#### StorageValue

支持所有可存储的值类型：

```typescript
type StorageValue = string | number | boolean | object | null

// 使用示例
const token: StorageValue = 'abc123'
const userId: StorageValue = 12345
const settings: StorageValue = {theme: 'dark', lang: 'zh'}
```

#### TypeSafeStorage

类型安全的存储工具类：

```typescript
import {TypeSafeStorage} from '@/utils/storage'

// 存储和读取字符串
TypeSafeStorage.set('token', 'abc123')
const token = TypeSafeStorage.get<string>('token')

// 存储和读取对象
interface UserSettings {
  theme: string
  notifications: boolean
}

TypeSafeStorage.set('settings', {theme: 'dark', notifications: true})
const settings = TypeSafeStorage.get<UserSettings>('settings')

// 使用默认值
const lang = TypeSafeStorage.get<string>('language', 'zh-CN')
```

### 2. 异步操作类型

#### AsyncResult

统一的异步操作返回格式：

```typescript
interface AsyncResult<T, E = Error> {
  data?: T
  error?: E
  success: boolean
}

// 使用示例
async function fetchUser(id: string): Promise<AsyncResult<User>> {
  try {
    const user = await api.getUser(id)
    return {
      data: user,
      success: true
    }
  } catch (error) {
    return {
      error: error as Error,
      success: false
    }
  }
}

// 调用示例
const result = await fetchUser('123')
if (result.success && result.data) {
  console.log(result.data.name)
} else if (result.error) {
  console.error(result.error.message)
}
```

### 3. 分页类型

#### PaginatedData

用于列表数据的分页展示：

```typescript
interface PaginatedData<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

// 使用示例
async function getUserList(page: number): Promise<PaginatedData<User>> {
  const {data, count} = await supabase
    .from('users')
    .select('*', {count: 'exact'})
    .range((page - 1) * 20, page * 20 - 1)

  return {
    items: data || [],
    total: count || 0,
    page,
    pageSize: 20,
    hasMore: (count || 0) > page * 20
  }
}
```

## 工具类型

### 1. Optional<T>

将所有字段变为可选：

```typescript
interface User {
  id: string
  name: string
  email: string
}

type PartialUser = Optional<User>
// 等同于: { id?: string; name?: string; email?: string }

// 使用场景：更新操作
function updateUser(id: string, updates: Optional<User>) {
  // 只更新提供的字段
}

updateUser('123', {name: '新名字'}) // ✅ 只更新 name
```

### 2. Required<T>

将所有可选字段变为必需：

```typescript
interface UserForm {
  name?: string
  email?: string
  phone?: string
}

type RequiredUserForm = Required<UserForm>
// 等同于: { name: string; email: string; phone: string }

// 使用场景：表单验证
function validateForm(form: RequiredUserForm) {
  // 确保所有字段都存在
}
```

### 3. Pick<T, K>

选择部分字段：

```typescript
interface User {
  id: string
  name: string
  email: string
  password: string
  createdAt: string
}

type UserBasicInfo = Pick<User, 'id' | 'name' | 'email'>
// 等同于: { id: string; name: string; email: string }

// 使用场景：API 返回类型
async function getUserBasicInfo(id: string): Promise<UserBasicInfo> {
  const {data} = await supabase
    .from('users')
    .select('id, name, email')
    .eq('id', id)
    .single()

  return data
}
```

### 4. Omit<T, K>

排除部分字段：

```typescript
interface User {
  id: string
  name: string
  password: string
  salt: string
}

type UserWithoutSensitive = Omit<User, 'password' | 'salt'>
// 等同于: { id: string; name: string }

// 使用场景：公开 API
function getUserPublicInfo(user: User): UserWithoutSensitive {
  const {password, salt, ...publicInfo} = user
  return publicInfo
}
```

### 5. Readonly<T> 和 DeepReadonly<T>

创建只读类型：

```typescript
interface Config {
  apiUrl: string
  timeout: number
}

const config: Readonly<Config> = {
  apiUrl: 'https://api.example.com',
  timeout: 5000
}

// config.apiUrl = 'new-url' // ❌ 编译错误

// 深度只读
interface AppConfig {
  api: {
    url: string
    timeout: number
  }
  features: {
    enableCache: boolean
  }
}

const appConfig: DeepReadonly<AppConfig> = {
  api: {url: 'https://api.example.com', timeout: 5000},
  features: {enableCache: true}
}

// appConfig.api.url = 'new-url' // ❌ 编译错误
```

## API 类型

### 1. ApiResponse<T>

标准 API 响应格式：

```typescript
interface ApiResponse<T> {
  data: T | null
  error: ApiError | null
  success: boolean
  message?: string
}

// 使用示例
async function getUser(id: string): Promise<ApiResponse<User>> {
  try {
    const {data, error} = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error

    return {
      data,
      error: null,
      success: true,
      message: '获取用户成功'
    }
  } catch (error) {
    return {
      data: null,
      error: {
        code: 500,
        message: '获取用户失败',
        details: {originalError: error}
      },
      success: false
    }
  }
}

// 调用示例
const response = await getUser('123')
if (response.success && response.data) {
  console.log(response.data.name)
} else if (response.error) {
  console.error(response.error.message)
}
```

### 2. QueryBuilder<T>

类型安全的查询构建器：

```typescript
interface QueryBuilder<T> {
  select: (columns?: string) => QueryBuilder<T>
  eq: (column: string, value: unknown) => QueryBuilder<T>
  order: (column: string, options?: {ascending?: boolean}) => QueryBuilder<T>
  limit: (count: number) => QueryBuilder<T>
  // ... 更多方法
}

// 使用示例
const query: QueryBuilder<User> = supabase
  .from('users')
  .select('*')
  .eq('role', 'admin')
  .order('created_at', {ascending: false})
  .limit(10)

const {data} = await query
```

### 3. PaginationParams 和 PaginationResponse

分页查询的请求和响应：

```typescript
interface PaginationParams {
  page: number
  pageSize: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

interface PaginationResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

// 使用示例
async function getUsers(
  params: PaginationParams
): Promise<PaginationResponse<User>> {
  const {page, pageSize, sortBy = 'created_at', sortOrder = 'desc'} = params

  const {data, count} = await supabase
    .from('users')
    .select('*', {count: 'exact'})
    .order(sortBy, {ascending: sortOrder === 'asc'})
    .range((page - 1) * pageSize, page * pageSize - 1)

  const total = count || 0
  const totalPages = Math.ceil(total / pageSize)

  return {
    items: data || [],
    total,
    page,
    pageSize,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1
  }
}
```

## 最佳实践

### 1. 优先使用类型而非 any

❌ 不推荐：

```typescript
function processData(data: any) {
  return data.map((item: any) => item.name)
}
```

✅ 推荐：

```typescript
interface DataItem {
  name: string
  value: number
}

function processData(data: DataItem[]) {
  return data.map((item) => item.name)
}
```

### 2. 使用泛型提高复用性

❌ 不推荐：

```typescript
function getUserById(id: string): Promise<User> {
  // ...
}

function getWarehouseById(id: string): Promise<Warehouse> {
  // ...
}
```

✅ 推荐：

```typescript
async function getById<T>(
  table: string,
  id: string
): Promise<T | null> {
  const {data} = await supabase
    .from(table)
    .select('*')
    .eq('id', id)
    .single()

  return data
}

// 使用
const user = await getById<User>('users', '123')
const warehouse = await getById<Warehouse>('warehouses', '456')
```

### 3. 使用 Pick 和 Omit 定义精确类型

❌ 不推荐：

```typescript
interface UserCreateInput {
  name: string
  email: string
  role: string
  // 重复定义 User 的部分字段
}
```

✅ 推荐：

```typescript
interface User {
  id: string
  name: string
  email: string
  role: string
  createdAt: string
}

type UserCreateInput = Omit<User, 'id' | 'createdAt'>
// 或
type UserCreateInput = Pick<User, 'name' | 'email' | 'role'>
```

### 4. 为复杂类型添加 JSDoc 注释

✅ 推荐：

```typescript
/**
 * 用户创建输入类型
 * 包含创建用户所需的所有字段
 *
 * @example
 * ```typescript
 * const input: UserCreateInput = {
 *   name: '张三',
 *   email: 'zhangsan@example.com',
 *   role: 'driver'
 * }
 * ```
 */
type UserCreateInput = Omit<User, 'id' | 'createdAt'>
```

### 5. 使用类型守卫进行运行时检查

```typescript
function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'name' in value &&
    'email' in value
  )
}

// 使用
function processData(data: unknown) {
  if (isUser(data)) {
    // TypeScript 知道 data 是 User 类型
    console.log(data.name)
  }
}
```

## 常见模式

### 1. 条件类型

```typescript
// 根据条件选择不同类型
type ResponseType<T extends 'success' | 'error'> = T extends 'success'
  ? {data: unknown; success: true}
  : {error: string; success: false}

const successResponse: ResponseType<'success'> = {
  data: {name: 'test'},
  success: true
}

const errorResponse: ResponseType<'error'> = {
  error: 'Something went wrong',
  success: false
}
```

### 2. 映射类型

```typescript
// 将所有字段转换为 Promise
type Promisify<T> = {
  [K in keyof T]: Promise<T[K]>
}

interface User {
  name: string
  age: number
}

type AsyncUser = Promisify<User>
// 等同于: { name: Promise<string>; age: Promise<number> }
```

### 3. 联合类型和交叉类型

```typescript
// 联合类型：A 或 B
type Status = 'pending' | 'approved' | 'rejected'

// 交叉类型：A 和 B
interface Timestamped {
  createdAt: string
  updatedAt: string
}

interface User {
  id: string
  name: string
}

type UserWithTimestamp = User & Timestamped
// 包含 User 和 Timestamped 的所有字段
```

### 4. 索引签名

```typescript
// 动态键的对象
interface Dictionary<T> {
  [key: string]: T
}

const userMap: Dictionary<User> = {
  '123': {id: '123', name: 'Alice'},
  '456': {id: '456', name: 'Bob'}
}

// Record 工具类型（更简洁）
const userMap2: Record<string, User> = {
  '123': {id: '123', name: 'Alice'},
  '456': {id: '456', name: 'Bob'}
}
```

## 类型安全工具

### 1. TypeSafeStorage

类型安全的存储工具：

```typescript
import {TypeSafeStorage} from '@/utils/storage'

// 基本使用
TypeSafeStorage.set('token', 'abc123')
const token = TypeSafeStorage.get<string>('token')

// 复杂对象
interface UserPreferences {
  theme: 'light' | 'dark'
  language: string
  notifications: boolean
}

TypeSafeStorage.set('preferences', {
  theme: 'dark',
  language: 'zh-CN',
  notifications: true
})

const prefs = TypeSafeStorage.get<UserPreferences>('preferences')
if (prefs) {
  console.log(prefs.theme) // TypeScript 知道类型
}

// 批量操作
const data = TypeSafeStorage.getMultiple<string>(['token', 'userId'])
TypeSafeStorage.setMultiple({token: 'abc', userId: '123'})
```

### 2. EnhancedErrorHandler

增强的错误处理器：

```typescript
import {enhancedErrorHandler} from '@/utils/errorHandler'

try {
  await someAsyncOperation()
} catch (error) {
  enhancedErrorHandler.handleWithContext(error, {
    showToast: true,
    logError: true,
    customMessage: '操作失败',
    context: {
      component: 'UserManagement',
      action: 'deleteUser',
      userId: '123'
    }
  })
}
```

### 3. ModuleLogger

模块化日志系统：

```typescript
import {createModuleLogger} from '@/utils/loggerWrapper'

const logger = createModuleLogger('UserService')

logger.info('用户登录', {userId: '123'})
logger.error('登录失败', error, {userId: '123'})
logger.performance('查询用户', 150, {count: 100})
```

## 严格模式迁移

项目提供了 `tsconfig.strict.json` 用于逐步迁移到严格模式：

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true,
    "noImplicitAny": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

### 迁移步骤

1. 先在新文件中使用严格配置
2. 逐个模块修复类型错误
3. 最后更新主 `tsconfig.json`

详见：[TypeScript 严格模式迁移指南](./typescript-strict-mode-migration.md)

## 总结

- 优先使用明确的类型定义，避免 `any`
- 使用泛型提高代码复用性
- 利用工具类型（Pick、Omit 等）减少重复
- 为复杂类型添加 JSDoc 注释和示例
- 使用类型守卫进行运行时检查
- 使用项目提供的类型安全工具

## 参考资源

- [TypeScript 官方文档](https://www.typescriptlang.org/docs/)
- [TypeScript 严格模式迁移指南](./typescript-strict-mode-migration.md)
- [项目类型定义](../src/types/)
