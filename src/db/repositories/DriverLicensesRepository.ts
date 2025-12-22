/**
 * 驾驶证数据 Repository
 * 提供驾驶证信息的数据访问层，带有缓存支持
 *
 * 功能包括：
 * - 获取司机驾驶证信息（带缓存，TTL 5 分钟）
 * - 创建/更新/删除驾驶证时自动清除缓存
 *
 * @module db/repositories/DriverLicensesRepository
 */

import { BaseRepository, type BaseEntity, type QueryOptions } from './BaseRepository'
import type { DriverLicense, DriverLicenseInput, DriverLicenseUpdate } from '../types'

// ==================== 缓存配置常量 ====================

/**
 * 驾驶证缓存 TTL：5 分钟
 * 驾驶证数据变化频率较低，使用中等的缓存时间
 */
const DRIVER_LICENSES_CACHE_TTL = 5 * 60 * 1000

/**
 * 缓存键前缀
 */
const CACHE_PREFIX = 'driver_licenses'

// ==================== 类型定义 ====================

/**
 * 驾驶证实体接口
 * 继承 BaseEntity 以支持 BaseRepository 的泛型约束
 */
interface DriverLicenseEntity extends Omit<DriverLicense, 'created_at' | 'updated_at'>, BaseEntity {}

// ==================== DriverLicensesRepository 类 ====================

/**
 * 驾驶证数据 Repository
 * 提供驾驶证信息的数据访问，带有缓存支持
 *
 * @example
 * ```typescript
 * import { driverLicensesRepository } from '@/db/repositories'
 *
 * // 获取司机驾驶证
 * const license = await driverLicensesRepository.getByDriverId(driverId)
 *
 * // 创建驾驶证
 * const newLicense = await driverLicensesRepository.createLicense({
 *   driver_id: driverId,
 *   license_number: 'A123456789',
 *   license_class: 'C1'
 * })
 *
 * // 更新驾驶证
 * await driverLicensesRepository.updateLicense(licenseId, { license_class: 'B2' })
 * ```
 */
export class DriverLicensesRepository extends BaseRepository<DriverLicenseEntity> {
  /**
   * 创建 DriverLicensesRepository 实例
   * 配置驾驶证表和缓存设置
   */
  constructor() {
    super({
      tableName: 'driver_licenses',
      cachePrefix: CACHE_PREFIX,
      defaultTTL: DRIVER_LICENSES_CACHE_TTL,
      enableCache: true
    })
  }

  // ==================== 查询方法 ====================

  /**
   * 根据司机 ID 获取驾驶证信息
   * 带缓存支持，TTL 5 分钟
   *
   * @param driverId - 司机用户 ID
   * @param options - 查询选项
   * @returns 驾驶证信息，如果不存在则返回 null
   *
   * @example
   * ```typescript
   * const license = await driverLicensesRepository.getByDriverId('driver-123')
   * if (license) {
   *   console.log('驾驶证号:', license.license_number)
   * }
   * ```
   */
  async getByDriverId(driverId: string, options: QueryOptions = {}): Promise<DriverLicense | null> {
    const { useCache = true, cacheTTL = DRIVER_LICENSES_CACHE_TTL } = options
    const cacheKey = this.getCacheKey(`driver_${driverId}`)

    // 尝试从缓存获取
    if (useCache) {
      const cached = this.getFromCache<DriverLicense>(cacheKey)
      if (cached) {
        this.logger.debug('司机驾驶证缓存命中', { driverId })
        return cached
      }
    }

    // 从数据库查询
    this.logger.debug('从数据库查询司机驾驶证', { driverId })
    const { data, error } = await this.supabase
      .from('driver_licenses')
      .select('*')
      .eq('driver_id', driverId)
      .maybeSingle()

    if (error) {
      this.logger.error('获取司机驾驶证失败', { driverId, error: error.message })
      return null
    }

    // 缓存结果
    if (useCache && data) {
      this.setToCache(cacheKey, data, cacheTTL)
      this.logger.debug('司机驾驶证已缓存', { driverId })
    }

    return data as DriverLicense | null
  }

  /**
   * 根据 ID 获取驾驶证信息
   *
   * @param id - 驾驶证 ID
   * @param options - 查询选项
   * @returns 驾驶证信息，如果不存在则返回 null
   */
  async getLicenseById(id: string, options: QueryOptions = {}): Promise<DriverLicense | null> {
    const { useCache = true, cacheTTL = DRIVER_LICENSES_CACHE_TTL } = options
    const cacheKey = this.getCacheKey(`id_${id}`)

    // 尝试从缓存获取
    if (useCache) {
      const cached = this.getFromCache<DriverLicense>(cacheKey)
      if (cached) {
        this.logger.debug('驾驶证缓存命中', { id })
        return cached
      }
    }

    // 从数据库查询
    this.logger.debug('从数据库查询驾驶证', { id })
    const { data, error } = await this.supabase
      .from('driver_licenses')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) {
      this.logger.error('获取驾驶证失败', { id, error: error.message })
      return null
    }

    // 缓存结果
    if (useCache && data) {
      this.setToCache(cacheKey, data, cacheTTL)
    }

    return data as DriverLicense | null
  }

  /**
   * 获取所有驾驶证
   *
   * @param options - 查询选项
   * @returns 所有驾驶证列表
   */
  async getAllLicenses(options: QueryOptions = {}): Promise<DriverLicense[]> {
    const { useCache = true, cacheTTL = DRIVER_LICENSES_CACHE_TTL, limit = 1000 } = options
    const cacheKey = this.getCacheKey('all')

    // 尝试从缓存获取
    if (useCache) {
      const cached = this.getFromCache<DriverLicense[]>(cacheKey)
      if (cached) {
        this.logger.debug('所有驾驶证缓存命中', { count: cached.length })
        return cached
      }
    }

    // 从数据库查询
    this.logger.debug('从数据库查询所有驾驶证')
    const { data, error } = await this.supabase
      .from('driver_licenses')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      this.logger.error('获取所有驾驶证失败', { error: error.message })
      return []
    }

    const result = Array.isArray(data) ? data : []

    // 缓存结果
    if (useCache) {
      this.setToCache(cacheKey, result, cacheTTL)
    }

    return result as DriverLicense[]
  }

  /**
   * 检查司机是否有驾驶证
   *
   * @param driverId - 司机用户 ID
   * @returns 是否有驾驶证
   */
  async hasLicense(driverId: string): Promise<boolean> {
    const license = await this.getByDriverId(driverId)
    return license !== null
  }

  // ==================== 写操作方法 ====================

  /**
   * 创建驾驶证
   * 创建成功后自动清除相关缓存
   *
   * @param input - 驾驶证输入数据
   * @returns 创建的驾驶证，如果失败则返回 null
   *
   * @example
   * ```typescript
   * const license = await driverLicensesRepository.createLicense({
   *   driver_id: 'driver-123',
   *   license_number: 'A123456789',
   *   license_class: 'C1',
   *   valid_from: '2020-01-01',
   *   valid_to: '2026-01-01'
   * })
   * ```
   */
  async createLicense(input: DriverLicenseInput): Promise<DriverLicense | null> {
    this.logger.debug('创建驾驶证', { driverId: input.driver_id })

    const { data, error } = await this.supabase
      .from('driver_licenses')
      .insert({
        driver_id: input.driver_id,
        license_number: input.license_number,
        license_class: input.license_class,
        first_issue_date: input.first_issue_date,
        valid_from: input.valid_from,
        valid_to: input.valid_to,
        issue_authority: input.issue_authority,
        driving_license_photo: input.driving_license_photo,
        id_card_name: input.id_card_name,
        id_card_number: input.id_card_number,
        id_card_address: input.id_card_address,
        id_card_birth_date: input.id_card_birth_date,
        id_card_photo_front: input.id_card_photo_front,
        id_card_photo_back: input.id_card_photo_back,
        status: input.status || 'active'
      })
      .select()
      .maybeSingle()

    if (error) {
      this.logger.error('创建驾驶证失败', { input, error: error.message })
      return null
    }

    // 清除相关缓存
    this.invalidateCache()

    this.logger.info('驾驶证创建成功', { id: (data as DriverLicense)?.id })
    return data as DriverLicense | null
  }

  /**
   * 更新驾驶证
   * 更新成功后自动清除相关缓存
   *
   * @param id - 驾驶证 ID
   * @param update - 更新数据
   * @returns 更新后的驾驶证，如果失败则返回 null
   *
   * @example
   * ```typescript
   * const updated = await driverLicensesRepository.updateLicense('license-123', {
   *   license_class: 'B2',
   *   valid_to: '2028-01-01'
   * })
   * ```
   */
  async updateLicense(id: string, update: DriverLicenseUpdate): Promise<DriverLicense | null> {
    this.logger.debug('更新驾驶证', { id, update })

    const { data, error } = await this.supabase
      .from('driver_licenses')
      .update({
        ...update,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .maybeSingle()

    if (error) {
      this.logger.error('更新驾驶证失败', { id, error: error.message })
      return null
    }

    // 清除相关缓存
    this.invalidateCache()

    this.logger.info('驾驶证更新成功', { id })
    return data as DriverLicense | null
  }

  /**
   * 根据司机 ID 更新驾驶证
   * 更新成功后自动清除相关缓存
   *
   * @param driverId - 司机用户 ID
   * @param update - 更新数据
   * @returns 更新后的驾驶证，如果失败则返回 null
   */
  async updateByDriverId(driverId: string, update: DriverLicenseUpdate): Promise<DriverLicense | null> {
    this.logger.debug('根据司机 ID 更新驾驶证', { driverId, update })

    const { data, error } = await this.supabase
      .from('driver_licenses')
      .update({
        ...update,
        updated_at: new Date().toISOString()
      })
      .eq('driver_id', driverId)
      .select()
      .maybeSingle()

    if (error) {
      this.logger.error('根据司机 ID 更新驾驶证失败', { driverId, error: error.message })
      return null
    }

    // 清除相关缓存
    this.invalidateCache()

    this.logger.info('驾驶证更新成功', { driverId })
    return data as DriverLicense | null
  }

  /**
   * 删除驾驶证
   * 删除成功后自动清除相关缓存
   *
   * @param id - 驾驶证 ID
   * @returns 是否删除成功
   *
   * @example
   * ```typescript
   * const success = await driverLicensesRepository.deleteLicense('license-123')
   * ```
   */
  async deleteLicense(id: string): Promise<boolean> {
    this.logger.debug('删除驾驶证', { id })

    const { error } = await this.supabase
      .from('driver_licenses')
      .delete()
      .eq('id', id)

    if (error) {
      this.logger.error('删除驾驶证失败', { id, error: error.message })
      return false
    }

    // 清除相关缓存
    this.invalidateCache()

    this.logger.info('驾驶证删除成功', { id })
    return true
  }

  /**
   * 根据司机 ID 删除驾驶证
   * 删除成功后自动清除相关缓存
   *
   * @param driverId - 司机用户 ID
   * @returns 是否删除成功
   */
  async deleteByDriverId(driverId: string): Promise<boolean> {
    this.logger.debug('根据司机 ID 删除驾驶证', { driverId })

    const { error } = await this.supabase
      .from('driver_licenses')
      .delete()
      .eq('driver_id', driverId)

    if (error) {
      this.logger.error('根据司机 ID 删除驾驶证失败', { driverId, error: error.message })
      return false
    }

    // 清除相关缓存
    this.invalidateCache()

    this.logger.info('驾驶证删除成功', { driverId })
    return true
  }

  /**
   * 创建或更新驾驶证（Upsert）
   * 如果司机已有驾驶证则更新，否则创建新驾驶证
   * 操作成功后自动清除相关缓存
   *
   * @param input - 驾驶证输入数据
   * @returns 创建或更新的驾驶证，如果失败则返回 null
   */
  async upsertLicense(input: DriverLicenseInput): Promise<DriverLicense | null> {
    this.logger.debug('Upsert 驾驶证', { driverId: input.driver_id })

    const { data, error } = await this.supabase
      .from('driver_licenses')
      .upsert(
        {
          driver_id: input.driver_id,
          license_number: input.license_number,
          license_class: input.license_class,
          first_issue_date: input.first_issue_date,
          valid_from: input.valid_from,
          valid_to: input.valid_to,
          issue_authority: input.issue_authority,
          driving_license_photo: input.driving_license_photo,
          id_card_name: input.id_card_name,
          id_card_number: input.id_card_number,
          id_card_address: input.id_card_address,
          id_card_birth_date: input.id_card_birth_date,
          id_card_photo_front: input.id_card_photo_front,
          id_card_photo_back: input.id_card_photo_back,
          status: input.status || 'active',
          updated_at: new Date().toISOString()
        },
        {
          onConflict: 'driver_id'
        }
      )
      .select()
      .maybeSingle()

    if (error) {
      this.logger.error('Upsert 驾驶证失败', { input, error: error.message })
      return null
    }

    // 清除相关缓存
    this.invalidateCache()

    this.logger.info('驾驶证 Upsert 成功', { id: (data as DriverLicense)?.id })
    return data as DriverLicense | null
  }

  // ==================== 缓存管理方法 ====================

  /**
   * 清除所有驾驶证相关缓存
   * 公开方法，供外部调用（如 API 层）
   *
   * @example
   * ```typescript
   * // 在 API 层更新驾驶证后清除缓存
   * await updateDriverLicenseInDB(driverId, updates)
   * driverLicensesRepository.clearCache()
   * ```
   */
  public clearCache(): void {
    this.invalidateCache()
    this.logger.info('驾驶证缓存已清除')
  }
}

// ==================== 单例导出 ====================

/**
 * DriverLicensesRepository 单例实例
 * 推荐使用此实例而非创建新实例
 */
export const driverLicensesRepository = new DriverLicensesRepository()
