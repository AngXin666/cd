/**
 * 打卡仓库自动选择属性测试
 * 使用 fast-check 进行属性测试，验证打卡仓库自动选择的正确性
 * 
 * **Feature: vue-deep-conversion, Property 1: 打卡仓库自动选择**
 * **Validates: Requirements 1.2**
 * 
 * @module utils/__tests__/warehouse-auto-select.test
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as fc from 'fast-check'

// ==================== 类型定义 ====================

/**
 * 仓库接口（简化版）
 */
interface Warehouse {
  id: number
  name: string
  is_active?: boolean
}

/**
 * 考勤记录接口（简化版）
 */
interface Attendance {
  id: number
  user_id: number
  warehouse_id: number | null
  clock_in: string | null
  clock_out: string | null
  work_date: string
}

/**
 * 仓库自动选择结果接口
 */
interface WarehouseAutoSelectResult {
  /** 选中的仓库索引 */
  selectedIndex: number
  /** 选中的仓库 ID */
  selectedWarehouseId: number | null
  /** 是否从打卡记录自动选择 */
  autoSelectedFromAttendance: boolean
}

// ==================== 核心逻辑（纯函数版本） ====================

/**
 * 打卡仓库自动选择核心逻辑（纯函数版本）
 * 根据今日打卡记录自动选择仓库
 * 
 * @param warehouses - 可用仓库列表
 * @param todayAttendance - 今日打卡记录，null 表示未打卡
 * @param lastWarehouseId - 用户偏好中保存的上次仓库 ID（可选）
 * @returns 仓库自动选择结果
 * 
 * @description
 * 选择优先级：
 * 1. 如果今日已打卡且打卡仓库在可用列表中，选择打卡仓库
 * 2. 如果有用户偏好且偏好仓库在可用列表中，选择偏好仓库
 * 3. 否则选择第一个仓库
 */
function selectWarehouseFromAttendance(
  warehouses: Warehouse[],
  todayAttendance: Attendance | null,
  lastWarehouseId?: number
): WarehouseAutoSelectResult {
  // 默认结果：选择第一个仓库
  const defaultResult: WarehouseAutoSelectResult = {
    selectedIndex: 0,
    selectedWarehouseId: warehouses.length > 0 ? warehouses[0].id : null,
    autoSelectedFromAttendance: false,
  }

  // 如果没有可用仓库，返回默认结果
  if (warehouses.length === 0) {
    return {
      selectedIndex: -1,
      selectedWarehouseId: null,
      autoSelectedFromAttendance: false,
    }
  }

  // 1. 优先检查今日打卡记录
  if (todayAttendance && todayAttendance.clock_in && todayAttendance.warehouse_id !== null) {
    const attendanceWarehouseId = todayAttendance.warehouse_id
    const warehouseIndex = warehouses.findIndex(w => w.id === attendanceWarehouseId)
    
    if (warehouseIndex >= 0) {
      return {
        selectedIndex: warehouseIndex,
        selectedWarehouseId: attendanceWarehouseId,
        autoSelectedFromAttendance: true,
      }
    }
  }

  // 2. 检查用户偏好
  if (lastWarehouseId !== undefined) {
    const preferenceIndex = warehouses.findIndex(w => w.id === lastWarehouseId)
    
    if (preferenceIndex >= 0) {
      return {
        selectedIndex: preferenceIndex,
        selectedWarehouseId: lastWarehouseId,
        autoSelectedFromAttendance: false,
      }
    }
  }

  // 3. 返回默认结果（第一个仓库）
  return defaultResult
}

// ==================== Arbitrary 定义 ====================

/**
 * 生成有效仓库 ID 的 Arbitrary
 * 仓库 ID 应该是正整数
 */
const warehouseIdArb = fc.integer({ min: 1, max: 10000 })

/**
 * 生成有效仓库名称的 Arbitrary
 */
const warehouseNameArb = fc.string({ minLength: 1, maxLength: 50 })
  .filter(s => s.trim().length > 0)

/**
 * 生成仓库对象的 Arbitrary
 */
const warehouseArb: fc.Arbitrary<Warehouse> = fc.record({
  id: warehouseIdArb,
  name: warehouseNameArb,
  is_active: fc.constant(true),
})

/**
 * 生成唯一 ID 仓库列表的 Arbitrary
 * 确保仓库 ID 不重复
 */
const uniqueWarehousesArb = (minLength: number = 1, maxLength: number = 10): fc.Arbitrary<Warehouse[]> =>
  fc.array(warehouseArb, { minLength, maxLength })
    .map(warehouses => {
      // 确保 ID 唯一
      const seen = new Set<number>()
      return warehouses.filter(w => {
        if (seen.has(w.id)) return false
        seen.add(w.id)
        return true
      })
    })
    .filter(warehouses => warehouses.length >= minLength)

/**
 * 生成有效用户 ID 的 Arbitrary
 */
const userIdArb = fc.integer({ min: 1, max: 10000 })

/**
 * 生成有效日期字符串的 Arbitrary (YYYY-MM-DD)
 */
const dateStringArb = fc.date({
  min: new Date('2020-01-01'),
  max: new Date('2030-12-31')
}).map(date => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
})

/**
 * 生成打卡时间字符串的 Arbitrary (ISO 格式)
 */
const clockTimeArb = fc.date({
  min: new Date('2024-01-01T00:00:00'),
  max: new Date('2024-12-31T23:59:59')
}).map(date => date.toISOString())

/**
 * 生成已打卡的考勤记录 Arbitrary
 * 包含有效的 clock_in 和 warehouse_id
 */
const clockedInAttendanceArb = (warehouseId: number): fc.Arbitrary<Attendance> =>
  fc.record({
    id: fc.integer({ min: 1, max: 100000 }),
    user_id: userIdArb,
    warehouse_id: fc.constant(warehouseId),
    clock_in: clockTimeArb,
    clock_out: fc.oneof(fc.constant(null), clockTimeArb),
    work_date: dateStringArb,
  })

/**
 * 生成未打卡的考勤记录 Arbitrary
 * clock_in 为 null
 */
const notClockedInAttendanceArb: fc.Arbitrary<Attendance | null> = fc.oneof(
  fc.constant(null),
  fc.record({
    id: fc.integer({ min: 1, max: 100000 }),
    user_id: userIdArb,
    warehouse_id: fc.oneof(fc.constant(null), warehouseIdArb),
    clock_in: fc.constant(null),
    clock_out: fc.constant(null),
    work_date: dateStringArb,
  })
)

// ==================== 属性测试 ====================

describe('打卡仓库自动选择属性测试', () => {
  /**
   * Property 1: 打卡仓库自动选择
   * *For any* 司机用户，如果今日已打卡，则打开计件录入页面时，
   * 仓库选择器的默认值应该等于打卡的仓库 ID
   * **Validates: Requirements 1.2**
   */
  describe('Property 1: 打卡仓库自动选择', () => {
    /**
     * 核心属性：已打卡时应自动选择打卡仓库
     */
    it('已打卡且打卡仓库在列表中时，应自动选择打卡仓库', () => {
      fc.assert(
        fc.property(
          uniqueWarehousesArb(1, 10),
          (warehouses) => {
            // 从仓库列表中随机选择一个作为打卡仓库
            const randomIndex = Math.floor(Math.random() * warehouses.length)
            const attendanceWarehouseId = warehouses[randomIndex].id
            
            // 创建已打卡的考勤记录
            const attendance: Attendance = {
              id: 1,
              user_id: 100,
              warehouse_id: attendanceWarehouseId,
              clock_in: '2024-12-24T08:30:00.000Z',
              clock_out: null,
              work_date: '2024-12-24',
            }
            
            // 执行自动选择
            const result = selectWarehouseFromAttendance(warehouses, attendance)
            
            // 验证：选中的仓库 ID 应该等于打卡仓库 ID
            return result.selectedWarehouseId === attendanceWarehouseId &&
                   result.autoSelectedFromAttendance === true &&
                   result.selectedIndex === randomIndex
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * 使用 fast-check 生成的打卡记录进行测试
     */
    it('对于任意已打卡记录，应选择打卡仓库', () => {
      fc.assert(
        fc.property(
          uniqueWarehousesArb(1, 10),
          fc.integer({ min: 0, max: 9 }),
          (warehouses, indexHint) => {
            // 确保索引在有效范围内
            const validIndex = indexHint % warehouses.length
            const attendanceWarehouseId = warehouses[validIndex].id
            
            // 创建已打卡的考勤记录
            const attendance: Attendance = {
              id: 1,
              user_id: 100,
              warehouse_id: attendanceWarehouseId,
              clock_in: '2024-12-24T08:30:00.000Z',
              clock_out: null,
              work_date: '2024-12-24',
            }
            
            // 执行自动选择
            const result = selectWarehouseFromAttendance(warehouses, attendance)
            
            // 验证：选中的仓库 ID 应该等于打卡仓库 ID
            return result.selectedWarehouseId === attendanceWarehouseId &&
                   result.autoSelectedFromAttendance === true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * 未打卡时不应从打卡记录自动选择
     */
    it('未打卡时不应从打卡记录自动选择', () => {
      fc.assert(
        fc.property(
          uniqueWarehousesArb(1, 10),
          notClockedInAttendanceArb,
          (warehouses, attendance) => {
            // 执行自动选择
            const result = selectWarehouseFromAttendance(warehouses, attendance)
            
            // 验证：不应从打卡记录自动选择
            return result.autoSelectedFromAttendance === false
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * 打卡仓库不在列表中时应回退到默认选择
     */
    it('打卡仓库不在列表中时应回退到默认选择', () => {
      fc.assert(
        fc.property(
          uniqueWarehousesArb(1, 10),
          warehouseIdArb,
          (warehouses, nonExistentWarehouseId) => {
            // 确保生成的仓库 ID 不在列表中
            const existingIds = new Set(warehouses.map(w => w.id))
            if (existingIds.has(nonExistentWarehouseId)) {
              return true // 跳过这个测试用例
            }
            
            // 创建打卡记录，但仓库 ID 不在列表中
            const attendance: Attendance = {
              id: 1,
              user_id: 100,
              warehouse_id: nonExistentWarehouseId,
              clock_in: '2024-12-24T08:30:00.000Z',
              clock_out: null,
              work_date: '2024-12-24',
            }
            
            // 执行自动选择
            const result = selectWarehouseFromAttendance(warehouses, attendance)
            
            // 验证：应回退到第一个仓库
            return result.selectedIndex === 0 &&
                   result.selectedWarehouseId === warehouses[0].id &&
                   result.autoSelectedFromAttendance === false
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * 空仓库列表时应返回无效选择
     */
    it('空仓库列表时应返回无效选择', () => {
      fc.assert(
        fc.property(
          warehouseIdArb,
          (warehouseId) => {
            // 创建打卡记录
            const attendance: Attendance = {
              id: 1,
              user_id: 100,
              warehouse_id: warehouseId,
              clock_in: '2024-12-24T08:30:00.000Z',
              clock_out: null,
              work_date: '2024-12-24',
            }
            
            // 执行自动选择（空仓库列表）
            const result = selectWarehouseFromAttendance([], attendance)
            
            // 验证：应返回无效选择
            return result.selectedIndex === -1 &&
                   result.selectedWarehouseId === null &&
                   result.autoSelectedFromAttendance === false
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * 打卡记录的 warehouse_id 为 null 时不应自动选择
     */
    it('打卡记录的 warehouse_id 为 null 时不应自动选择', () => {
      fc.assert(
        fc.property(
          uniqueWarehousesArb(1, 10),
          (warehouses) => {
            // 创建打卡记录，但 warehouse_id 为 null
            const attendance: Attendance = {
              id: 1,
              user_id: 100,
              warehouse_id: null,
              clock_in: '2024-12-24T08:30:00.000Z',
              clock_out: null,
              work_date: '2024-12-24',
            }
            
            // 执行自动选择
            const result = selectWarehouseFromAttendance(warehouses, attendance)
            
            // 验证：不应从打卡记录自动选择
            return result.autoSelectedFromAttendance === false &&
                   result.selectedIndex === 0 &&
                   result.selectedWarehouseId === warehouses[0].id
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * 用户偏好回退测试
   * 验证当无法从打卡记录选择时，应回退到用户偏好
   */
  describe('用户偏好回退测试', () => {
    it('未打卡但有用户偏好时应选择偏好仓库', () => {
      fc.assert(
        fc.property(
          uniqueWarehousesArb(2, 10),
          fc.integer({ min: 1, max: 9 }),
          (warehouses, indexHint) => {
            // 确保索引在有效范围内且不是第一个
            const validIndex = Math.max(1, indexHint % warehouses.length)
            const preferenceWarehouseId = warehouses[validIndex].id
            
            // 执行自动选择（无打卡记录，有用户偏好）
            const result = selectWarehouseFromAttendance(
              warehouses,
              null,
              preferenceWarehouseId
            )
            
            // 验证：应选择偏好仓库
            return result.selectedWarehouseId === preferenceWarehouseId &&
                   result.selectedIndex === validIndex &&
                   result.autoSelectedFromAttendance === false
          }
        ),
        { numRuns: 100 }
      )
    })

    it('打卡仓库优先于用户偏好', () => {
      fc.assert(
        fc.property(
          uniqueWarehousesArb(3, 10),
          (warehouses) => {
            // 选择不同的仓库作为打卡仓库和偏好仓库
            const attendanceWarehouseId = warehouses[0].id
            const preferenceWarehouseId = warehouses[1].id
            
            // 创建打卡记录
            const attendance: Attendance = {
              id: 1,
              user_id: 100,
              warehouse_id: attendanceWarehouseId,
              clock_in: '2024-12-24T08:30:00.000Z',
              clock_out: null,
              work_date: '2024-12-24',
            }
            
            // 执行自动选择
            const result = selectWarehouseFromAttendance(
              warehouses,
              attendance,
              preferenceWarehouseId
            )
            
            // 验证：应选择打卡仓库而非偏好仓库
            return result.selectedWarehouseId === attendanceWarehouseId &&
                   result.autoSelectedFromAttendance === true
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * 选择索引一致性测试
   * 验证选中的索引与仓库 ID 一致
   */
  describe('选择索引一致性测试', () => {
    it('选中的索引应该对应正确的仓库 ID', () => {
      fc.assert(
        fc.property(
          uniqueWarehousesArb(1, 10),
          fc.integer({ min: 0, max: 9 }),
          (warehouses, indexHint) => {
            const validIndex = indexHint % warehouses.length
            const attendanceWarehouseId = warehouses[validIndex].id
            
            const attendance: Attendance = {
              id: 1,
              user_id: 100,
              warehouse_id: attendanceWarehouseId,
              clock_in: '2024-12-24T08:30:00.000Z',
              clock_out: null,
              work_date: '2024-12-24',
            }
            
            const result = selectWarehouseFromAttendance(warehouses, attendance)
            
            // 验证：索引对应的仓库 ID 应该等于选中的仓库 ID
            if (result.selectedIndex >= 0 && result.selectedIndex < warehouses.length) {
              return warehouses[result.selectedIndex].id === result.selectedWarehouseId
            }
            return result.selectedIndex === -1 && result.selectedWarehouseId === null
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})

// ==================== 具体示例测试 ====================

describe('打卡仓库自动选择示例测试', () => {
  const warehouses: Warehouse[] = [
    { id: 1, name: '北京仓库', is_active: true },
    { id: 2, name: '上海仓库', is_active: true },
    { id: 3, name: '广州仓库', is_active: true },
  ]

  it('已打卡时应选择打卡仓库', () => {
    const attendance: Attendance = {
      id: 1,
      user_id: 100,
      warehouse_id: 2, // 上海仓库
      clock_in: '2024-12-24T08:30:00.000Z',
      clock_out: null,
      work_date: '2024-12-24',
    }
    
    const result = selectWarehouseFromAttendance(warehouses, attendance)
    
    expect(result.selectedWarehouseId).toBe(2)
    expect(result.selectedIndex).toBe(1)
    expect(result.autoSelectedFromAttendance).toBe(true)
  })

  it('未打卡时应选择第一个仓库', () => {
    const result = selectWarehouseFromAttendance(warehouses, null)
    
    expect(result.selectedWarehouseId).toBe(1)
    expect(result.selectedIndex).toBe(0)
    expect(result.autoSelectedFromAttendance).toBe(false)
  })

  it('未打卡但有用户偏好时应选择偏好仓库', () => {
    const result = selectWarehouseFromAttendance(warehouses, null, 3)
    
    expect(result.selectedWarehouseId).toBe(3)
    expect(result.selectedIndex).toBe(2)
    expect(result.autoSelectedFromAttendance).toBe(false)
  })

  it('打卡仓库不存在时应回退到第一个仓库', () => {
    const attendance: Attendance = {
      id: 1,
      user_id: 100,
      warehouse_id: 999, // 不存在的仓库
      clock_in: '2024-12-24T08:30:00.000Z',
      clock_out: null,
      work_date: '2024-12-24',
    }
    
    const result = selectWarehouseFromAttendance(warehouses, attendance)
    
    expect(result.selectedWarehouseId).toBe(1)
    expect(result.selectedIndex).toBe(0)
    expect(result.autoSelectedFromAttendance).toBe(false)
  })

  it('clock_in 为 null 时视为未打卡', () => {
    const attendance: Attendance = {
      id: 1,
      user_id: 100,
      warehouse_id: 2,
      clock_in: null, // 未打卡
      clock_out: null,
      work_date: '2024-12-24',
    }
    
    const result = selectWarehouseFromAttendance(warehouses, attendance)
    
    expect(result.selectedWarehouseId).toBe(1)
    expect(result.selectedIndex).toBe(0)
    expect(result.autoSelectedFromAttendance).toBe(false)
  })

  it('空仓库列表时应返回无效选择', () => {
    const attendance: Attendance = {
      id: 1,
      user_id: 100,
      warehouse_id: 1,
      clock_in: '2024-12-24T08:30:00.000Z',
      clock_out: null,
      work_date: '2024-12-24',
    }
    
    const result = selectWarehouseFromAttendance([], attendance)
    
    expect(result.selectedWarehouseId).toBeNull()
    expect(result.selectedIndex).toBe(-1)
    expect(result.autoSelectedFromAttendance).toBe(false)
  })

  it('打卡仓库优先于用户偏好', () => {
    const attendance: Attendance = {
      id: 1,
      user_id: 100,
      warehouse_id: 2, // 打卡在上海仓库
      clock_in: '2024-12-24T08:30:00.000Z',
      clock_out: null,
      work_date: '2024-12-24',
    }
    
    // 用户偏好是广州仓库
    const result = selectWarehouseFromAttendance(warehouses, attendance, 3)
    
    // 应该选择打卡仓库而非偏好仓库
    expect(result.selectedWarehouseId).toBe(2)
    expect(result.selectedIndex).toBe(1)
    expect(result.autoSelectedFromAttendance).toBe(true)
  })
})
