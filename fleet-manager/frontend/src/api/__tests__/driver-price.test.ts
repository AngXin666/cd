/**
 * 司机类型单价加载属性测试
 * 使用 fast-check 进行属性测试，验证根据司机类型加载对应单价的正确性
 * 
 * **Feature: vue-deep-conversion, Property 2: 司机类型单价加载**
 * **Validates: Requirements 1.3**
 * 
 * @module api/__tests__/driver-price.test
 */
import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'

/**
 * 司机类型枚举
 * 用于区分带车司机和纯司机
 */
type DriverType = 'with_vehicle' | 'driver_only'

/**
 * 品类价格配置接口
 * 包含不同司机类型的单价配置
 */
interface CategoryPriceConfig {
  /** 品类 ID */
  categoryId: number
  /** 仓库 ID */
  warehouseId: number
  /** 带车司机单价 */
  driverWithVehiclePrice: number
  /** 纯司机单价 */
  driverOnlyPrice: number
}

/**
 * 单价加载结果接口
 */
interface PriceLoadResult {
  /** 单价 */
  unitPrice: number
  /** 是否锁定（管理员已设置） */
  isLocked: boolean
  /** 来源说明 */
  source: string
}

/**
 * 根据司机类型获取对应单价（纯函数版本）
 * 这是核心业务逻辑的纯函数实现，用于属性测试
 * 
 * @param priceConfigs - 价格配置列表
 * @param warehouseId - 仓库 ID
 * @param categoryId - 品类 ID
 * @param driverType - 司机类型
 * @returns 单价加载结果，如果未找到配置则返回 null
 */
function getPriceForDriverType(
  priceConfigs: CategoryPriceConfig[],
  warehouseId: number,
  categoryId: number,
  driverType: DriverType
): PriceLoadResult | null {
  // 查找匹配的价格配置
  const config = priceConfigs.find(
    c => c.warehouseId === warehouseId && c.categoryId === categoryId
  )
  
  if (!config) {
    return null
  }
  
  // 根据司机类型返回对应的单价
  const unitPrice = driverType === 'with_vehicle'
    ? config.driverWithVehiclePrice
    : config.driverOnlyPrice
  
  return {
    unitPrice,
    isLocked: unitPrice > 0,
    source: unitPrice > 0 ? '管理员已设置' : '请输入单价'
  }
}

// ==================== Arbitrary 定义 ====================

/**
 * 生成有效仓库 ID 的 Arbitrary
 */
const warehouseIdArb = fc.integer({ min: 1, max: 100 })

/**
 * 生成有效品类 ID 的 Arbitrary
 */
const categoryIdArb = fc.integer({ min: 1, max: 50 })

/**
 * 生成有效单价的 Arbitrary
 * 单价应该是非负数，最多两位小数
 * 使用 Math.fround 确保是 32 位浮点数
 */
const priceArb = fc.float({ min: Math.fround(0), max: Math.fround(1000), noNaN: true })
  .map(p => Math.round(p * 100) / 100) // 保留两位小数

/**
 * 生成正数单价的 Arbitrary（用于测试锁定状态）
 * 使用 Math.fround 确保是 32 位浮点数
 */
const positivePriceArb = fc.float({ min: Math.fround(0.01), max: Math.fround(1000), noNaN: true })
  .map(p => Math.round(p * 100) / 100)

/**
 * 生成司机类型的 Arbitrary
 */
const driverTypeArb: fc.Arbitrary<DriverType> = fc.constantFrom('with_vehicle', 'driver_only')

/**
 * 生成价格配置的 Arbitrary
 */
const priceConfigArb = (
  warehouseId?: number,
  categoryId?: number
): fc.Arbitrary<CategoryPriceConfig> => {
  return fc.record({
    categoryId: categoryId !== undefined ? fc.constant(categoryId) : categoryIdArb,
    warehouseId: warehouseId !== undefined ? fc.constant(warehouseId) : warehouseIdArb,
    driverWithVehiclePrice: priceArb,
    driverOnlyPrice: priceArb
  })
}

/**
 * 生成价格配置列表的 Arbitrary
 */
const priceConfigsArb = fc.array(priceConfigArb(), { minLength: 0, maxLength: 20 })

// ==================== 属性测试 ====================

describe('司机类型单价加载属性测试', () => {
  /**
   * Property 2: 司机类型单价加载
   * *For any* 仓库和品类组合，如果存在价格配置，
   * 则带车司机应获取 driverWithVehiclePrice，纯司机应获取 driverOnlyPrice
   * **Validates: Requirements 1.3**
   */
  describe('Property 2: 司机类型单价加载', () => {
    it('带车司机应获取 driverWithVehiclePrice', () => {
      fc.assert(
        fc.property(
          warehouseIdArb,
          categoryIdArb,
          positivePriceArb,
          positivePriceArb,
          (warehouseId, categoryId, withVehiclePrice, onlyPrice) => {
            // 创建价格配置
            const config: CategoryPriceConfig = {
              warehouseId,
              categoryId,
              driverWithVehiclePrice: withVehiclePrice,
              driverOnlyPrice: onlyPrice
            }
            
            // 获取带车司机的单价
            const result = getPriceForDriverType(
              [config],
              warehouseId,
              categoryId,
              'with_vehicle'
            )
            
            // 验证返回的单价等于 driverWithVehiclePrice
            return result !== null && result.unitPrice === withVehiclePrice
          }
        ),
        { numRuns: 100 }
      )
    })

    it('纯司机应获取 driverOnlyPrice', () => {
      fc.assert(
        fc.property(
          warehouseIdArb,
          categoryIdArb,
          positivePriceArb,
          positivePriceArb,
          (warehouseId, categoryId, withVehiclePrice, onlyPrice) => {
            // 创建价格配置
            const config: CategoryPriceConfig = {
              warehouseId,
              categoryId,
              driverWithVehiclePrice: withVehiclePrice,
              driverOnlyPrice: onlyPrice
            }
            
            // 获取纯司机的单价
            const result = getPriceForDriverType(
              [config],
              warehouseId,
              categoryId,
              'driver_only'
            )
            
            // 验证返回的单价等于 driverOnlyPrice
            return result !== null && result.unitPrice === onlyPrice
          }
        ),
        { numRuns: 100 }
      )
    })

    it('不同司机类型应获取不同的单价（当配置不同时）', () => {
      fc.assert(
        fc.property(
          warehouseIdArb,
          categoryIdArb,
          positivePriceArb,
          positivePriceArb,
          (warehouseId, categoryId, withVehiclePrice, onlyPrice) => {
            // 确保两个价格不同
            const adjustedOnlyPrice = withVehiclePrice === onlyPrice
              ? onlyPrice + 1
              : onlyPrice
            
            // 创建价格配置
            const config: CategoryPriceConfig = {
              warehouseId,
              categoryId,
              driverWithVehiclePrice: withVehiclePrice,
              driverOnlyPrice: adjustedOnlyPrice
            }
            
            // 获取两种司机类型的单价
            const withVehicleResult = getPriceForDriverType(
              [config],
              warehouseId,
              categoryId,
              'with_vehicle'
            )
            
            const onlyResult = getPriceForDriverType(
              [config],
              warehouseId,
              categoryId,
              'driver_only'
            )
            
            // 验证两种司机类型获取的单价不同
            return (
              withVehicleResult !== null &&
              onlyResult !== null &&
              withVehicleResult.unitPrice !== onlyResult.unitPrice
            )
          }
        ),
        { numRuns: 100 }
      )
    })

    it('相同司机类型多次查询应返回相同结果（幂等性）', () => {
      fc.assert(
        fc.property(
          warehouseIdArb,
          categoryIdArb,
          priceArb,
          priceArb,
          driverTypeArb,
          (warehouseId, categoryId, withVehiclePrice, onlyPrice, driverType) => {
            // 创建价格配置
            const config: CategoryPriceConfig = {
              warehouseId,
              categoryId,
              driverWithVehiclePrice: withVehiclePrice,
              driverOnlyPrice: onlyPrice
            }
            
            // 多次查询
            const result1 = getPriceForDriverType(
              [config],
              warehouseId,
              categoryId,
              driverType
            )
            
            const result2 = getPriceForDriverType(
              [config],
              warehouseId,
              categoryId,
              driverType
            )
            
            // 验证两次查询结果相同
            if (result1 === null && result2 === null) {
              return true
            }
            
            return (
              result1 !== null &&
              result2 !== null &&
              result1.unitPrice === result2.unitPrice &&
              result1.isLocked === result2.isLocked &&
              result1.source === result2.source
            )
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * 价格配置查找测试
   * 验证仓库和品类匹配逻辑
   */
  describe('价格配置查找', () => {
    it('未找到匹配配置时应返回 null', () => {
      fc.assert(
        fc.property(
          warehouseIdArb,
          categoryIdArb,
          driverTypeArb,
          priceConfigsArb,
          (warehouseId, categoryId, driverType, configs) => {
            // 过滤掉任何可能匹配的配置
            const nonMatchingConfigs = configs.filter(
              c => c.warehouseId !== warehouseId || c.categoryId !== categoryId
            )
            
            // 查询单价
            const result = getPriceForDriverType(
              nonMatchingConfigs,
              warehouseId,
              categoryId,
              driverType
            )
            
            // 验证返回 null
            return result === null
          }
        ),
        { numRuns: 100 }
      )
    })

    it('空配置列表应返回 null', () => {
      fc.assert(
        fc.property(
          warehouseIdArb,
          categoryIdArb,
          driverTypeArb,
          (warehouseId, categoryId, driverType) => {
            // 空配置列表
            const result = getPriceForDriverType(
              [],
              warehouseId,
              categoryId,
              driverType
            )
            
            // 验证返回 null
            return result === null
          }
        ),
        { numRuns: 100 }
      )
    })

    it('只有仓库匹配时不应返回结果', () => {
      fc.assert(
        fc.property(
          warehouseIdArb,
          categoryIdArb,
          driverTypeArb,
          priceArb,
          priceArb,
          (warehouseId, categoryId, driverType, withVehiclePrice, onlyPrice) => {
            // 创建仓库匹配但品类不匹配的配置
            const config: CategoryPriceConfig = {
              warehouseId,
              categoryId: categoryId + 1, // 品类不匹配
              driverWithVehiclePrice: withVehiclePrice,
              driverOnlyPrice: onlyPrice
            }
            
            // 查询单价
            const result = getPriceForDriverType(
              [config],
              warehouseId,
              categoryId,
              driverType
            )
            
            // 验证返回 null
            return result === null
          }
        ),
        { numRuns: 100 }
      )
    })

    it('只有品类匹配时不应返回结果', () => {
      fc.assert(
        fc.property(
          warehouseIdArb,
          categoryIdArb,
          driverTypeArb,
          priceArb,
          priceArb,
          (warehouseId, categoryId, driverType, withVehiclePrice, onlyPrice) => {
            // 创建品类匹配但仓库不匹配的配置
            const config: CategoryPriceConfig = {
              warehouseId: warehouseId + 1, // 仓库不匹配
              categoryId,
              driverWithVehiclePrice: withVehiclePrice,
              driverOnlyPrice: onlyPrice
            }
            
            // 查询单价
            const result = getPriceForDriverType(
              [config],
              warehouseId,
              categoryId,
              driverType
            )
            
            // 验证返回 null
            return result === null
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * 锁定状态测试
   * 验证单价锁定逻辑
   */
  describe('单价锁定状态', () => {
    it('单价大于 0 时应标记为锁定', () => {
      fc.assert(
        fc.property(
          warehouseIdArb,
          categoryIdArb,
          positivePriceArb,
          positivePriceArb,
          driverTypeArb,
          (warehouseId, categoryId, withVehiclePrice, onlyPrice, driverType) => {
            // 创建价格配置（所有价格都大于 0）
            const config: CategoryPriceConfig = {
              warehouseId,
              categoryId,
              driverWithVehiclePrice: withVehiclePrice,
              driverOnlyPrice: onlyPrice
            }
            
            // 查询单价
            const result = getPriceForDriverType(
              [config],
              warehouseId,
              categoryId,
              driverType
            )
            
            // 验证锁定状态
            return result !== null && result.isLocked === true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('单价为 0 时应标记为未锁定', () => {
      fc.assert(
        fc.property(
          warehouseIdArb,
          categoryIdArb,
          (warehouseId, categoryId) => {
            // 创建价格配置（带车司机价格为 0）
            const config: CategoryPriceConfig = {
              warehouseId,
              categoryId,
              driverWithVehiclePrice: 0,
              driverOnlyPrice: 10
            }
            
            // 查询带车司机的单价
            const result = getPriceForDriverType(
              [config],
              warehouseId,
              categoryId,
              'with_vehicle'
            )
            
            // 验证未锁定状态
            return result !== null && result.isLocked === false
          }
        ),
        { numRuns: 100 }
      )
    })

    it('锁定时来源应为"管理员已设置"', () => {
      fc.assert(
        fc.property(
          warehouseIdArb,
          categoryIdArb,
          positivePriceArb,
          positivePriceArb,
          driverTypeArb,
          (warehouseId, categoryId, withVehiclePrice, onlyPrice, driverType) => {
            // 创建价格配置
            const config: CategoryPriceConfig = {
              warehouseId,
              categoryId,
              driverWithVehiclePrice: withVehiclePrice,
              driverOnlyPrice: onlyPrice
            }
            
            // 查询单价
            const result = getPriceForDriverType(
              [config],
              warehouseId,
              categoryId,
              driverType
            )
            
            // 验证来源说明
            return result !== null && result.source === '管理员已设置'
          }
        ),
        { numRuns: 100 }
      )
    })

    it('未锁定时来源应为"请输入单价"', () => {
      fc.assert(
        fc.property(
          warehouseIdArb,
          categoryIdArb,
          (warehouseId, categoryId) => {
            // 创建价格配置（纯司机价格为 0）
            const config: CategoryPriceConfig = {
              warehouseId,
              categoryId,
              driverWithVehiclePrice: 10,
              driverOnlyPrice: 0
            }
            
            // 查询纯司机的单价
            const result = getPriceForDriverType(
              [config],
              warehouseId,
              categoryId,
              'driver_only'
            )
            
            // 验证来源说明
            return result !== null && result.source === '请输入单价'
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})

// ==================== 示例测试 ====================

describe('司机类型单价加载示例测试', () => {
  it('带车司机获取正确单价', () => {
    const configs: CategoryPriceConfig[] = [
      {
        warehouseId: 1,
        categoryId: 2,
        driverWithVehiclePrice: 15.5,
        driverOnlyPrice: 12.0
      }
    ]
    
    const result = getPriceForDriverType(configs, 1, 2, 'with_vehicle')
    
    expect(result).not.toBeNull()
    expect(result?.unitPrice).toBe(15.5)
    expect(result?.isLocked).toBe(true)
    expect(result?.source).toBe('管理员已设置')
  })

  it('纯司机获取正确单价', () => {
    const configs: CategoryPriceConfig[] = [
      {
        warehouseId: 1,
        categoryId: 2,
        driverWithVehiclePrice: 15.5,
        driverOnlyPrice: 12.0
      }
    ]
    
    const result = getPriceForDriverType(configs, 1, 2, 'driver_only')
    
    expect(result).not.toBeNull()
    expect(result?.unitPrice).toBe(12.0)
    expect(result?.isLocked).toBe(true)
    expect(result?.source).toBe('管理员已设置')
  })

  it('未找到配置返回 null', () => {
    const configs: CategoryPriceConfig[] = [
      {
        warehouseId: 1,
        categoryId: 2,
        driverWithVehiclePrice: 15.5,
        driverOnlyPrice: 12.0
      }
    ]
    
    // 查询不存在的仓库
    const result = getPriceForDriverType(configs, 99, 2, 'with_vehicle')
    
    expect(result).toBeNull()
  })

  it('单价为 0 时未锁定', () => {
    const configs: CategoryPriceConfig[] = [
      {
        warehouseId: 1,
        categoryId: 2,
        driverWithVehiclePrice: 0,
        driverOnlyPrice: 12.0
      }
    ]
    
    const result = getPriceForDriverType(configs, 1, 2, 'with_vehicle')
    
    expect(result).not.toBeNull()
    expect(result?.unitPrice).toBe(0)
    expect(result?.isLocked).toBe(false)
    expect(result?.source).toBe('请输入单价')
  })

  it('多个配置中找到正确的配置', () => {
    const configs: CategoryPriceConfig[] = [
      {
        warehouseId: 1,
        categoryId: 1,
        driverWithVehiclePrice: 10.0,
        driverOnlyPrice: 8.0
      },
      {
        warehouseId: 1,
        categoryId: 2,
        driverWithVehiclePrice: 15.5,
        driverOnlyPrice: 12.0
      },
      {
        warehouseId: 2,
        categoryId: 2,
        driverWithVehiclePrice: 18.0,
        driverOnlyPrice: 14.0
      }
    ]
    
    // 查询仓库 1，品类 2
    const result = getPriceForDriverType(configs, 1, 2, 'with_vehicle')
    
    expect(result).not.toBeNull()
    expect(result?.unitPrice).toBe(15.5)
  })
})
