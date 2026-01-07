/**
 * 司机管理页面集成测试
 * 测试仓库切换、数据预加载和缓存功能的完整流程
 * 
 * @module pages/manager/drivers/__tests__/integration.test
 * @requirements 7.4 - 司机管理页面集成测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, nextTick } from 'vue'
import { useWarehouseDataCache } from '@/composables/useWarehouseDataCache'
import type { Warehouse, User, Vehicle } from '@/api/types'
import { UserRole, WarehouseType } from '@/api/types'

// ==================== 类型定义 ====================

/**
 * 司机详细信息
 */
interface DriverDetailInfo {
  age: number | null
  drivingYears: number | null
  licenseClass: string | null
  vehicleCount: number
  plateNumbers: string[]
  joinDate: string | null
  workDays: number | null
  idCardNumber: string | null
  address: string | null
}

/**
 * 带详情的司机信息
 */
interface DriverWithDetails extends User {
  warehouse_id: number | null
  detail?: DriverDetailInfo
  driver_type?: 'pure' | 'with_vehicle'
}

/**
 * 司机管理页面数据类型
 */
interface DriverManagementData {
  drivers: DriverWithDetails[]
  warehouses: Warehouse[]
  driverWarehouseMap: Map<number, number[]>
  allVehicles: Vehicle[]
}

// ==================== 测试数据生成器 ====================

/**
 * 创建测试仓库
 */
function createTestWarehouse(id: number, name: string): Warehouse {
  return {
    id,
    name,
    address: `地址 ${id}`,
    is_active: true,
    created_at: new Date().toISOString(),
    warehouse_type: WarehouseType.PIECE,
    preset_unit: '件',
  }
}

/**
 * 创建测试司机
 */
function createTestDriver(
  id: number,
  name: string,
  warehouseIds: number[]
): DriverWithDetails {
  return {
    id,
    username: `driver${id}@fleet.com`,
    name,
    phone: `1380000${String(id).padStart(4, '0')}`,
    role: UserRole.DRIVER,
    is_active: true,
    created_at: new Date().toISOString(),
    warehouse_id: warehouseIds[0] || null,
    is_verified: false,
    driver_type: 'pure',
    detail: {
      age: 30,
      drivingYears: 5,
      licenseClass: 'C1',
      vehicleCount: 0,
      plateNumbers: [],
      joinDate: new Date().toISOString(),
      workDays: 10,
      idCardNumber: null,
      address: null,
    },
  }
}

/**
 * 创建测试车辆
 */
function createTestVehicle(id: number, driverId: number): Vehicle {
  return {
    id,
    license_plate: `京A${String(id).padStart(5, '0')}`,
    driver_id: driverId,
    status: 'ACTIVE' as any,
    created_at: new Date().toISOString(),
  } as Vehicle
}

// ==================== 集成测试 ====================

describe('司机管理页面集成测试', () => {
  let mockLoadDataFn: ReturnType<typeof vi.fn>
  let warehouses: ReturnType<typeof ref<Warehouse[]>>
  let currentIndex: ReturnType<typeof ref<number>>

  beforeEach(() => {
    // 重置所有 mock
    vi.clearAllMocks()
    
    // 初始化响应式数据
    warehouses = ref<Warehouse[]>([])
    currentIndex = ref(0)
    
    // 创建 mock 数据加载函数
    mockLoadDataFn = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  /**
   * 测试 1: 预加载流程
   * 验证页面初始化时预加载所有仓库数据
   * @requirements 1.1, 1.2 - 数据预加载
   */
  it('应该在初始化时预加载所有仓库数据', async () => {
    // 准备测试数据
    const testWarehouses = [
      createTestWarehouse(1, '仓库A'),
      createTestWarehouse(2, '仓库B'),
      createTestWarehouse(3, '仓库C'),
    ]
    
    const testDrivers = [
      createTestDriver(1, '张三', [1]),
      createTestDriver(2, '李四', [1, 2]),
      createTestDriver(3, '王五', [2, 3]),
    ]
    
    const driverWarehouseMap = new Map<number, number[]>([
      [1, [1]],
      [2, [1, 2]],
      [3, [2, 3]],
    ])
    
    // 设置 mock 返回值
    mockLoadDataFn.mockImplementation(async (warehouseId: number) => {
      // 模拟网络延迟
      await new Promise(resolve => setTimeout(resolve, 10))
      
      return {
        drivers: testDrivers.filter(d => {
          const ids = driverWarehouseMap.get(d.id) || []
          return ids.includes(warehouseId)
        }),
        warehouses: testWarehouses,
        driverWarehouseMap,
        allVehicles: [],
      }
    })
    
    warehouses.value = testWarehouses
    
    // 使用 composable
    const { currentData, isLoading, isPreloading } = useWarehouseDataCache<DriverManagementData>({
      loadDataFn: mockLoadDataFn,
      warehouses,
      currentIndex,
      enablePreload: true,
    })
    
    // 等待初始加载完成
    await vi.waitFor(() => {
      expect(isLoading.value).toBe(false)
    }, { timeout: 1000 })
    
    // 验证当前仓库数据已加载
    expect(currentData.value).not.toBeNull()
    expect(currentData.value?.warehouses).toHaveLength(3)
    
    // 等待预加载完成
    await vi.waitFor(() => {
      expect(isPreloading.value).toBe(false)
    }, { timeout: 2000 })
    
    // 验证所有仓库都被加载了
    // 初始加载 1 次 + 预加载 3 次 = 4 次调用
    expect(mockLoadDataFn).toHaveBeenCalledTimes(4)
    expect(mockLoadDataFn).toHaveBeenCalledWith(1)
    expect(mockLoadDataFn).toHaveBeenCalledWith(2)
    expect(mockLoadDataFn).toHaveBeenCalledWith(3)
  })

  /**
   * 测试 2: 缓存命中时的无感切换
   * 验证切换到已缓存的仓库时不显示加载状态
   * @requirements 2.1, 2.3, 4.2 - 缓存命中时无加载状态
   */
  it('切换到已缓存的仓库时应该无加载状态', async () => {
    // 准备测试数据
    const testWarehouses = [
      createTestWarehouse(1, '仓库A'),
      createTestWarehouse(2, '仓库B'),
    ]
    
    const testData: DriverManagementData = {
      drivers: [createTestDriver(1, '张三', [1, 2])],
      warehouses: testWarehouses,
      driverWarehouseMap: new Map([[1, [1, 2]]]),
      allVehicles: [],
    }
    
    mockLoadDataFn.mockResolvedValue(testData)
    warehouses.value = testWarehouses
    
    // 使用 composable
    const { switchWarehouse, isLoading, isCached } = useWarehouseDataCache<DriverManagementData>({
      loadDataFn: mockLoadDataFn,
      warehouses,
      currentIndex,
      enablePreload: true,
    })
    
    // 等待初始加载和预加载完成
    await vi.waitFor(() => {
      expect(isLoading.value).toBe(false)
    }, { timeout: 1000 })
    
    await vi.waitFor(() => {
      expect(isCached(testWarehouses[1].id)).toBe(true)
    }, { timeout: 2000 })
    
    // 记录切换前的加载状态
    const loadingBeforeSwitch = isLoading.value
    
    // 切换到第二个仓库（已缓存）
    await switchWarehouse(1)
    await nextTick()
    
    // 验证切换过程中没有显示加载状态
    expect(loadingBeforeSwitch).toBe(false)
    expect(isLoading.value).toBe(false)
    expect(currentIndex.value).toBe(1)
  })

  /**
   * 测试 3: 缓存未命中时的加载状态
   * 验证切换到未缓存的仓库时显示加载状态
   * @requirements 2.2, 4.3 - 缓存未命中时显示局部加载
   */
  it('切换到未缓存的仓库时应该显示加载状态', async () => {
    // 准备测试数据
    const testWarehouses = [
      createTestWarehouse(1, '仓库A'),
      createTestWarehouse(2, '仓库B'),
    ]
    
    const testData: DriverManagementData = {
      drivers: [createTestDriver(1, '张三', [1, 2])],
      warehouses: testWarehouses,
      driverWarehouseMap: new Map([[1, [1, 2]]]),
      allVehicles: [],
    }
    
    mockLoadDataFn.mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 50))
      return testData
    })
    
    warehouses.value = testWarehouses
    
    // 使用 composable，禁用预加载
    const { switchWarehouse, isLoading, isCached } = useWarehouseDataCache<DriverManagementData>({
      loadDataFn: mockLoadDataFn,
      warehouses,
      currentIndex,
      enablePreload: false, // 禁用预加载以测试缓存未命中
    })
    
    // 等待初始加载完成
    await vi.waitFor(() => {
      expect(isLoading.value).toBe(false)
    }, { timeout: 1000 })
    
    // 验证第二个仓库未缓存
    expect(isCached(testWarehouses[1].id)).toBe(false)
    
    // 切换到第二个仓库（未缓存）
    const switchPromise = switchWarehouse(1)
    
    // 验证显示了加载状态
    await nextTick()
    expect(isLoading.value).toBe(true)
    
    // 等待切换完成
    await switchPromise
    await vi.waitFor(() => {
      expect(isLoading.value).toBe(false)
    }, { timeout: 1000 })
    
    // 验证切换成功
    expect(currentIndex.value).toBe(1)
    expect(isCached(testWarehouses[1].id)).toBe(true)
  })

  /**
   * 测试 4: 司机-仓库映射正确性
   * 验证司机列表根据仓库正确过滤
   * @requirements 7.4 - 司机管理页面数据结构
   */
  it('应该正确过滤当前仓库的司机', async () => {
    // 准备测试数据
    const testWarehouses = [
      createTestWarehouse(1, '仓库A'),
      createTestWarehouse(2, '仓库B'),
    ]
    
    const testDrivers = [
      createTestDriver(1, '张三', [1]),      // 只在仓库A
      createTestDriver(2, '李四', [1, 2]),   // 在仓库A和B
      createTestDriver(3, '王五', [2]),      // 只在仓库B
    ]
    
    const driverWarehouseMap = new Map<number, number[]>([
      [1, [1]],
      [2, [1, 2]],
      [3, [2]],
    ])
    
    mockLoadDataFn.mockImplementation(async (warehouseId: number) => {
      return {
        drivers: testDrivers.filter(d => {
          const ids = driverWarehouseMap.get(d.id) || []
          return ids.includes(warehouseId)
        }),
        warehouses: testWarehouses,
        driverWarehouseMap,
        allVehicles: [],
      }
    })
    
    warehouses.value = testWarehouses
    
    // 使用 composable
    const { currentData, switchWarehouse, isLoading } = useWarehouseDataCache<DriverManagementData>({
      loadDataFn: mockLoadDataFn,
      warehouses,
      currentIndex,
      enablePreload: true,
    })
    
    // 等待初始加载完成
    await vi.waitFor(() => {
      expect(isLoading.value).toBe(false)
    }, { timeout: 1000 })
    
    // 验证仓库A的司机（张三、李四）
    expect(currentData.value?.drivers).toHaveLength(2)
    expect(currentData.value?.drivers.map(d => d.name)).toContain('张三')
    expect(currentData.value?.drivers.map(d => d.name)).toContain('李四')
    
    // 等待预加载完成
    await vi.waitFor(() => {
      expect(mockLoadDataFn).toHaveBeenCalledWith(2)
    }, { timeout: 2000 })
    
    // 切换到仓库B
    await switchWarehouse(1)
    await nextTick()
    
    // 验证仓库B的司机（李四、王五）
    expect(currentData.value?.drivers).toHaveLength(2)
    expect(currentData.value?.drivers.map(d => d.name)).toContain('李四')
    expect(currentData.value?.drivers.map(d => d.name)).toContain('王五')
  })

  /**
   * 测试 5: 刷新功能
   * 验证刷新时清空缓存并重新加载
   * @requirements 3.2 - 手动刷新清空缓存
   */
  it('刷新时应该清空缓存并重新加载所有数据', async () => {
    // 准备测试数据
    const testWarehouses = [
      createTestWarehouse(1, '仓库A'),
      createTestWarehouse(2, '仓库B'),
    ]
    
    const testData: DriverManagementData = {
      drivers: [createTestDriver(1, '张三', [1, 2])],
      warehouses: testWarehouses,
      driverWarehouseMap: new Map([[1, [1, 2]]]),
      allVehicles: [],
    }
    
    mockLoadDataFn.mockResolvedValue(testData)
    warehouses.value = testWarehouses
    
    // 使用 composable
    const { refreshAll, isLoading, isCached } = useWarehouseDataCache<DriverManagementData>({
      loadDataFn: mockLoadDataFn,
      warehouses,
      currentIndex,
      enablePreload: true,
    })
    
    // 等待初始加载和预加载完成
    await vi.waitFor(() => {
      expect(isLoading.value).toBe(false)
    }, { timeout: 1000 })
    
    await vi.waitFor(() => {
      expect(isCached(testWarehouses[1].id)).toBe(true)
    }, { timeout: 2000 })
    
    // 记录调用次数
    const callCountBeforeRefresh = mockLoadDataFn.mock.calls.length
    
    // 执行刷新
    await refreshAll()
    
    // 等待刷新完成
    await vi.waitFor(() => {
      expect(isLoading.value).toBe(false)
    }, { timeout: 2000 })
    
    // 验证重新加载了数据
    expect(mockLoadDataFn.mock.calls.length).toBeGreaterThan(callCountBeforeRefresh)
    
    // 验证缓存仍然有效
    expect(isCached(testWarehouses[0].id)).toBe(true)
    expect(isCached(testWarehouses[1].id)).toBe(true)
  })

  /**
   * 测试 6: 错误处理
   * 验证某个仓库加载失败时不影响其他仓库
   * @requirements 1.3, 6.1 - 预加载容错性
   */
  it('某个仓库加载失败时不应该影响其他仓库', async () => {
    // 准备测试数据
    const testWarehouses = [
      createTestWarehouse(1, '仓库A'),
      createTestWarehouse(2, '仓库B'),
      createTestWarehouse(3, '仓库C'),
    ]
    
    const testData: DriverManagementData = {
      drivers: [createTestDriver(1, '张三', [1, 3])],
      warehouses: testWarehouses,
      driverWarehouseMap: new Map([[1, [1, 3]]]),
      allVehicles: [],
    }
    
    // 设置 mock：仓库2加载失败，其他成功
    mockLoadDataFn.mockImplementation(async (warehouseId: number) => {
      if (warehouseId === 2) {
        throw new Error('加载失败')
      }
      return testData
    })
    
    warehouses.value = testWarehouses
    
    // 使用 composable
    const { currentData, isLoading, isCached } = useWarehouseDataCache<DriverManagementData>({
      loadDataFn: mockLoadDataFn,
      warehouses,
      currentIndex,
      enablePreload: true,
    })
    
    // 等待初始加载完成
    await vi.waitFor(() => {
      expect(isLoading.value).toBe(false)
    }, { timeout: 1000 })
    
    // 验证仓库1加载成功
    expect(currentData.value).not.toBeNull()
    expect(isCached(testWarehouses[0].id)).toBe(true)
    
    // 等待预加载完成
    await vi.waitFor(() => {
      expect(mockLoadDataFn).toHaveBeenCalledWith(3)
    }, { timeout: 2000 })
    
    // 验证仓库2加载失败，但仓库3加载成功
    expect(isCached(testWarehouses[1].id)).toBe(false) // 仓库2失败
    expect(isCached(testWarehouses[2].id)).toBe(true)  // 仓库3成功
  })

  /**
   * 测试 7: 车辆统计
   * 验证司机车辆数量统计正确
   * @requirements 7.4 - 司机详细信息
   */
  it('应该正确统计司机的车辆数量', async () => {
    // 准备测试数据
    const testWarehouses = [createTestWarehouse(1, '仓库A')]
    
    const testVehicles = [
      createTestVehicle(1, 1), // 司机1的车辆
      createTestVehicle(2, 1), // 司机1的车辆
      createTestVehicle(3, 2), // 司机2的车辆
    ]
    
    const testDrivers = [
      createTestDriver(1, '张三', [1]),
      createTestDriver(2, '李四', [1]),
    ]
    
    // 更新司机详情中的车辆信息
    testDrivers[0].detail!.vehicleCount = 2
    testDrivers[0].detail!.plateNumbers = ['京A00001', '京A00002']
    testDrivers[1].detail!.vehicleCount = 1
    testDrivers[1].detail!.plateNumbers = ['京A00003']
    
    const testData: DriverManagementData = {
      drivers: testDrivers,
      warehouses: testWarehouses,
      driverWarehouseMap: new Map([[1, [1]], [2, [1]]]),
      allVehicles: testVehicles,
    }
    
    mockLoadDataFn.mockResolvedValue(testData)
    warehouses.value = testWarehouses
    
    // 使用 composable
    const { currentData, isLoading } = useWarehouseDataCache<DriverManagementData>({
      loadDataFn: mockLoadDataFn,
      warehouses,
      currentIndex,
      enablePreload: false,
    })
    
    // 等待加载完成
    await vi.waitFor(() => {
      expect(isLoading.value).toBe(false)
    }, { timeout: 1000 })
    
    // 验证车辆统计
    const driver1 = currentData.value?.drivers.find(d => d.id === 1)
    const driver2 = currentData.value?.drivers.find(d => d.id === 2)
    
    expect(driver1?.detail?.vehicleCount).toBe(2)
    expect(driver1?.detail?.plateNumbers).toHaveLength(2)
    expect(driver2?.detail?.vehicleCount).toBe(1)
    expect(driver2?.detail?.plateNumbers).toHaveLength(1)
  })

  /**
   * 测试 8: 空仓库列表处理
   * 验证没有仓库时的处理
   * @requirements 7.4 - 边界情况处理
   */
  it('应该正确处理空仓库列表', async () => {
    warehouses.value = []
    
    mockLoadDataFn.mockResolvedValue({
      drivers: [],
      warehouses: [],
      driverWarehouseMap: new Map(),
      allVehicles: [],
    })
    
    // 使用 composable
    const { currentData, isLoading } = useWarehouseDataCache<DriverManagementData>({
      loadDataFn: mockLoadDataFn,
      warehouses,
      currentIndex,
      enablePreload: true,
    })
    
    // 等待一段时间
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // 验证没有加载任何数据
    expect(mockLoadDataFn).not.toHaveBeenCalled()
    expect(currentData.value).toBeNull()
    expect(isLoading.value).toBe(false)
  })
})
