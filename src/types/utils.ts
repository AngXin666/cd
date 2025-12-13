/**
 * 通用工具类型定义
 * 提供跨项目使用的基础类型
 *
 * @module types/utils
 */

/**
 * 存储值类型
 * 支持所有可以存储到 localStorage/Taro.storage 的类型
 *
 * @example
 * ```typescript
 * const stringValue: StorageValue = 'hello'
 * const numberValue: StorageValue = 42
 * const objectValue: StorageValue = { name: 'test' }
 * ```
 */
export type StorageValue = string | number | boolean | object | null

/**
 * 存储获取选项
 *
 * @example
 * ```typescript
 * const options: StorageGetOptions = {
 *   key: 'user-token',
 *   defaultValue: null
 * }
 * ```
 */
export interface StorageGetOptions {
  /** 存储键名 */
  key: string
  /** 当键不存在时返回的默认值 */
  defaultValue?: StorageValue
}

/**
 * 存储设置选项
 *
 * @example
 * ```typescript
 * const options: StorageSetOptions = {
 *   key: 'user-token',
 *   data: 'abc123',
 *   encrypt: true
 * }
 * ```
 */
export interface StorageSetOptions {
  /** 存储键名 */
  key: string
  /** 要存储的数据 */
  data: StorageValue
  /** 是否加密存储（可选） */
  encrypt?: boolean
}

/**
 * 回调函数类型定义
 *
 * @example
 * ```typescript
 * const onSuccess: VoidCallback = () => console.log('Success')
 * const onError: ErrorCallback = (error) => console.error(error)
 * const onData: DataCallback<User> = (user) => console.log(user.name)
 * ```
 */
/** 无参数无返回值的回调函数 */
export type VoidCallback = () => void
/** 错误回调函数 */
export type ErrorCallback = (error: Error) => void
/** 数据回调函数，接收泛型类型的数据 */
export type DataCallback<T> = (data: T) => void

/**
 * 异步操作结果类型
 * 统一的异步操作返回格式，包含数据、错误和成功状态
 *
 * @template T - 成功时返回的数据类型
 * @template E - 失败时返回的错误类型，默认为 Error
 *
 * @example
 * ```typescript
 * async function fetchUser(): Promise<AsyncResult<User>> {
 *   try {
 *     const user = await api.getUser()
 *     return { data: user, success: true }
 *   } catch (error) {
 *     return { error: error as Error, success: false }
 *   }
 * }
 * ```
 */
export interface AsyncResult<T, E = Error> {
  /** 成功时的数据 */
  data?: T
  /** 失败时的错误 */
  error?: E
  /** 操作是否成功 */
  success: boolean
}

/**
 * 分页数据类型
 * 用于列表数据的分页展示，包含数据项、总数、页码等信息
 *
 * @template T - 列表项的数据类型
 *
 * @example
 * ```typescript
 * const userList: PaginatedData<User> = {
 *   items: [user1, user2, user3],
 *   total: 100,
 *   page: 1,
 *   pageSize: 10,
 *   hasMore: true
 * }
 * ```
 */
export interface PaginatedData<T> {
  /** 当前页的数据项 */
  items: T[]
  /** 总数据量 */
  total: number
  /** 当前页码（从1开始） */
  page: number
  /** 每页数据量 */
  pageSize: number
  /** 是否还有更多数据 */
  hasMore: boolean
}

/**
 * 可选字段类型工具
 * 将接口的所有字段变为可选
 *
 * @template T - 要转换的类型
 *
 * @example
 * ```typescript
 * interface User {
 *   id: string
 *   name: string
 *   email: string
 * }
 *
 * type PartialUser = Optional<User>
 * // 等同于: { id?: string; name?: string; email?: string }
 * ```
 */
export type Optional<T> = {
  [P in keyof T]?: T[P]
}

/**
 * 必需字段类型工具
 * 将接口的所有可选字段变为必需
 *
 * @template T - 要转换的类型
 *
 * @example
 * ```typescript
 * interface User {
 *   id?: string
 *   name?: string
 * }
 *
 * type RequiredUser = Required<User>
 * // 等同于: { id: string; name: string }
 * ```
 */
export type Required<T> = {
  [P in keyof T]-?: T[P]
}

/**
 * 只读类型工具
 * 将接口的所有字段变为只读（浅层）
 *
 * @template T - 要转换的类型
 *
 * @example
 * ```typescript
 * interface User {
 *   id: string
 *   name: string
 * }
 *
 * type ReadonlyUser = Readonly<User>
 * // 等同于: { readonly id: string; readonly name: string }
 * ```
 */
export type Readonly<T> = {
  readonly [P in keyof T]: T[P]
}

/**
 * 深度只读类型工具
 * 递归地将接口的所有字段变为只读（深层）
 *
 * @template T - 要转换的类型
 *
 * @example
 * ```typescript
 * interface User {
 *   id: string
 *   profile: {
 *     name: string
 *     settings: {
 *       theme: string
 *     }
 *   }
 * }
 *
 * type DeepReadonlyUser = DeepReadonly<User>
 * // 所有嵌套字段都是只读的
 * ```
 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P]
}

/**
 * 选择部分字段类型工具
 * 从接口中选择指定的字段
 *
 * @template T - 源类型
 * @template K - 要选择的键
 *
 * @example
 * ```typescript
 * interface User {
 *   id: string
 *   name: string
 *   email: string
 *   password: string
 * }
 *
 * type UserBasicInfo = Pick<User, 'id' | 'name'>
 * // 等同于: { id: string; name: string }
 * ```
 */
export type Pick<T, K extends keyof T> = {
  [P in K]: T[P]
}

/**
 * 排除部分字段类型工具
 * 从接口中排除指定的字段
 *
 * @template T - 源类型
 * @template K - 要排除的键
 *
 * @example
 * ```typescript
 * interface User {
 *   id: string
 *   name: string
 *   password: string
 * }
 *
 * type UserWithoutPassword = Omit<User, 'password'>
 * // 等同于: { id: string; name: string }
 * ```
 */
export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>
