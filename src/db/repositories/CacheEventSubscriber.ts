/**
 * 缓存事件订阅器
 * 监听 eventBus 事件，自动触发相关 Repository 的缓存失效
 *
 * 该模块实现了事件驱动的缓存失效机制：
 * - 当数据变更事件发生时，自动清除相关 Repository 的缓存
 * - 支持跨 Repository 的缓存失效（如仓库分配变更时清除仓库缓存）
 * - 在应用启动时自动初始化订阅
 *
 * @module db/repositories/CacheEventSubscriber
 */

import { eventBus, type EventType } from '@/utils/eventBus'
import { createLogger } from '@/utils/logger'

// 延迟导入 Repository 实例，避免循环依赖
let repositoriesLoaded = false
let repositories: {
  usersRepository: { clearAllCache: () => void }
  attendanceRepository: { clearAllCache: () => void }
  pieceWorkRepository: { clearAllCache: () => void }
  warehousesRepository: { clearAllCache: () => void }
  warehouseAssignmentsRepository: { clearAllCache: () => void }
  notificationsRepository: { clearAllCache: () => void }
  vehiclesRepository: { clearAllCache: () => void }
  leaveRepository: { clearAllCache: () => void }
  resignationApplicationsRepository: { clearAllCache: () => void }
  categoryPricesRepository: { clearAllCache: () => void }
  driverLicensesRepository: { clearAllCache: () => void }
  categoriesRepository: { clearAllCache: () => void }
}

const logger = createLogger('CacheEventSubscriber')

/**
 * 延迟加载 Repository 实例
 * 避免循环依赖问题
 */
async function loadRepositories(): Promise<void> {
  if (repositoriesLoaded) return

  try {
    const module = await import('./index')
    repositories = {
      usersRepository: module.usersRepository,
      attendanceRepository: module.attendanceRepository,
      pieceWorkRepository: module.pieceWorkRepository,
      warehousesRepository: module.warehousesRepository,
      warehouseAssignmentsRepository: module.warehouseAssignmentsRepository,
      notificationsRepository: module.notificationsRepository,
      vehiclesRepository: module.vehiclesRepository,
      leaveRepository: module.leaveRepository,
      resignationApplicationsRepository: module.resignationApplicationsRepository,
      categoryPricesRepository: module.categoryPricesRepository,
      driverLicensesRepository: module.driverLicensesRepository,
      categoriesRepository: module.categoriesRepository
    }
    repositoriesLoaded = true
    logger.debug('Repository 实例已加载')
  } catch (error) {
    logger.error('加载 Repository 实例失败', error)
  }
}

/**
 * 事件到 Repository 的映射配置
 * 定义每个事件应该清除哪些 Repository 的缓存
 */
const EVENT_CACHE_MAPPING: Record<EventType, string[]> = {
  // ==================== 请假相关事件 ====================
  'leave:created': ['leaveRepository'],
  'leave:updated': ['leaveRepository'],
  'resignation:created': ['resignationApplicationsRepository', 'leaveRepository'],
  'resignation:updated': ['resignationApplicationsRepository', 'leaveRepository'],

  // ==================== 考勤相关事件 ====================
  'attendance:created': ['attendanceRepository'],
  'attendance:updated': ['attendanceRepository'],

  // ==================== 计件相关事件 ====================
  'piece_work:created': ['pieceWorkRepository'],
  'piece_work:updated': ['pieceWorkRepository'],

  // ==================== 通知相关事件 ====================
  'notification:created': ['notificationsRepository'],
  'notification:read': ['notificationsRepository'],
  'notification:deleted': ['notificationsRepository'],

  // ==================== 仓库分配事件 ====================
  // 仓库分配变更时，同时清除仓库缓存（因为仓库列表可能包含分配信息）
  'warehouse_assignment:created': ['warehouseAssignmentsRepository', 'warehousesRepository'],
  'warehouse_assignment:updated': ['warehouseAssignmentsRepository', 'warehousesRepository'],
  'warehouse_assignment:deleted': ['warehouseAssignmentsRepository', 'warehousesRepository'],

  // ==================== 车辆审核事件 ====================
  'vehicle:review_submitted': ['vehiclesRepository'],
  'vehicle:approved': ['vehiclesRepository'],
  'vehicle:supplement_required': ['vehiclesRepository'],
  'vehicle:photo_supplemented': ['vehiclesRepository'],

  // ==================== 用户权限事件 ====================
  'user:role_updated': ['usersRepository'],
  'user:permission_updated': ['usersRepository'],

  // ==================== 仓库管理事件 ====================
  'warehouse:created': ['warehousesRepository'],
  'warehouse:updated': ['warehousesRepository'],
  'warehouse:deleted': ['warehousesRepository', 'warehouseAssignmentsRepository'],

  // ==================== 车辆管理事件 ====================
  'vehicle:created': ['vehiclesRepository'],
  'vehicle:updated': ['vehiclesRepository'],
  'vehicle:deleted': ['vehiclesRepository'],
  'vehicle:returned': ['vehiclesRepository'],

  // ==================== 用户管理事件 ====================
  'user:created': ['usersRepository'],
  'user:updated': ['usersRepository'],
  'user:deleted': ['usersRepository', 'warehouseAssignmentsRepository'],

  // ==================== 品类管理事件 ====================
  'category:created': ['categoriesRepository', 'categoryPricesRepository'],
  'category:updated': ['categoriesRepository', 'categoryPricesRepository'],
  'category:deleted': ['categoriesRepository', 'categoryPricesRepository'],
  'category_price:updated': ['categoryPricesRepository'],
  'category_price:deleted': ['categoryPricesRepository'],

  // ==================== 权限策略事件 ====================
  'permission:manager_created': ['usersRepository'],
  'permission:manager_updated': ['usersRepository'],
  'permission:manager_deleted': ['usersRepository'],
  'permission:scheduler_created': ['usersRepository'],
  'permission:scheduler_updated': ['usersRepository'],
  'permission:scheduler_deleted': ['usersRepository'],
  'peer_admin:created': ['usersRepository'],
  'peer_admin:updated': ['usersRepository'],
  'peer_admin:deleted': ['usersRepository'],

  // ==================== 角色管理事件 ====================
  'user:role_added': ['usersRepository'],
  'user:role_removed': ['usersRepository'],

  // ==================== 考勤规则事件 ====================
  'attendance_rule:created': ['attendanceRepository'],
  'attendance_rule:updated': ['attendanceRepository'],
  'attendance_rule:deleted': ['attendanceRepository'],

  // ==================== 驾照管理事件 ====================
  'driver_license:updated': ['driverLicensesRepository'],
  'driver_license:deleted': ['driverLicensesRepository'],

  // ==================== 通用事件 ====================
  // 通用数据刷新事件，清除所有缓存
  'data:refresh': [
    'usersRepository',
    'attendanceRepository',
    'pieceWorkRepository',
    'warehousesRepository',
    'warehouseAssignmentsRepository',
    'notificationsRepository',
    'vehiclesRepository',
    'leaveRepository',
    'resignationApplicationsRepository',
    'categoryPricesRepository',
    'driverLicensesRepository',
    'categoriesRepository'
  ]
}

/** 存储取消订阅函数 */
const unsubscribeFunctions: (() => void)[] = []

/** 是否已初始化 */
let initialized = false

/**
 * 处理事件，清除相关 Repository 的缓存
 *
 * @param event - 事件类型
 * @param data - 事件数据
 */
async function handleEvent(event: EventType, data?: unknown): Promise<void> {
  // 确保 Repository 已加载
  await loadRepositories()

  if (!repositoriesLoaded || !repositories) {
    logger.warn('Repository 未加载，跳过缓存失效', { event })
    return
  }

  // 获取需要清除缓存的 Repository 列表
  const repositoryNames = EVENT_CACHE_MAPPING[event]
  if (!repositoryNames || repositoryNames.length === 0) {
    logger.debug('事件无对应的缓存失效配置', { event })
    return
  }

  // 清除每个 Repository 的缓存
  for (const repoName of repositoryNames) {
    const repo = repositories[repoName as keyof typeof repositories]
    if (repo && typeof repo.clearAllCache === 'function') {
      try {
        repo.clearAllCache()
        logger.debug('缓存已清除', { event, repository: repoName })
      } catch (error) {
        logger.error('清除缓存失败', { event, repository: repoName, error })
      }
    }
  }

  logger.info('事件驱动缓存失效完成', {
    event,
    repositories: repositoryNames,
    data: data ? '有数据' : '无数据'
  })
}

/**
 * 初始化缓存事件订阅
 * 订阅所有配置的事件，当事件发生时自动清除相关缓存
 *
 * @example
 * ```typescript
 * // 在应用启动时调用
 * import { initCacheEventSubscriber } from '@/db/repositories/CacheEventSubscriber'
 *
 * initCacheEventSubscriber()
 * ```
 */
export function initCacheEventSubscriber(): void {
  // 防止重复初始化
  if (initialized) {
    logger.warn('缓存事件订阅器已初始化，跳过重复初始化')
    return
  }

  // 获取所有需要订阅的事件类型
  const eventTypes = Object.keys(EVENT_CACHE_MAPPING) as EventType[]

  // 订阅每个事件
  for (const eventType of eventTypes) {
    const unsubscribe = eventBus.subscribe(eventType, (data) => {
      // 异步处理，不阻塞事件发布
      handleEvent(eventType, data).catch((error) => {
        logger.error('处理缓存失效事件失败', { event: eventType, error })
      })
    })
    unsubscribeFunctions.push(unsubscribe)
  }

  initialized = true
  logger.info('缓存事件订阅器初始化完成', { eventCount: eventTypes.length })
}

/**
 * 清理缓存事件订阅
 * 取消所有事件订阅，释放资源
 *
 * @example
 * ```typescript
 * // 在应用关闭或登出时调用
 * import { cleanupCacheEventSubscriber } from '@/db/repositories/CacheEventSubscriber'
 *
 * cleanupCacheEventSubscriber()
 * ```
 */
export function cleanupCacheEventSubscriber(): void {
  // 取消所有订阅
  for (const unsubscribe of unsubscribeFunctions) {
    try {
      unsubscribe()
    } catch (error) {
      logger.error('取消订阅失败', error)
    }
  }

  // 清空订阅列表
  unsubscribeFunctions.length = 0
  initialized = false

  logger.info('缓存事件订阅器已清理')
}

/**
 * 检查订阅器是否已初始化
 *
 * @returns 是否已初始化
 */
export function isCacheEventSubscriberInitialized(): boolean {
  return initialized
}

/**
 * 获取事件缓存映射配置（用于测试）
 *
 * @returns 事件到 Repository 的映射配置
 */
export function getEventCacheMapping(): Record<EventType, string[]> {
  return { ...EVENT_CACHE_MAPPING }
}
