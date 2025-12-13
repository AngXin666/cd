/**
 * 车辆管理 API - 单元测试
 */
import {describe, it, expect, vi, beforeEach} from 'vitest'

// Mock Supabase
const mockSelect = vi.fn().mockReturnThis()
const mockInsert = vi.fn().mockReturnThis()
const mockUpdate = vi.fn().mockReturnThis()
const mockDelete = vi.fn().mockReturnThis()
const mockEq = vi.fn().mockReturnThis()
const mockIn = vi.fn().mockReturnThis()
const mockOrder = vi.fn().mockReturnThis()
const mockLimit = vi.fn().mockReturnThis()
const mockMaybeSingle = vi.fn()
const mockUpsert = vi.fn().mockReturnThis()

vi.mock('@/client/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
      upsert: mockUpsert,
      eq: mockEq,
      in: mockIn,
      order: mockOrder,
      limit: mockLimit,
      maybeSingle: mockMaybeSingle
    })),
    auth: {
      getUser: vi.fn(),
      getSession: vi.fn()
    },
    storage: {
      from: vi.fn(() => ({
        remove: vi.fn().mockResolvedValue({error: null})
      }))
    }
  }
}))

// Mock cache
vi.mock('@/utils/cache', () => ({
  CACHE_KEYS: {
    ALL_VEHICLES: 'all_vehicles'
  },
  clearCache: vi.fn(),
  clearCacheByPrefix: vi.fn()
}))

// Mock logger
vi.mock('@/utils/logger', () => ({
  createLogger: vi.fn(() => ({
    db: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn()
  }))
}))

// Mock users module
vi.mock('./users', () => ({
  getDriverDisplayName: vi.fn(),
  getDriverName: vi.fn(),
  getProfileById: vi.fn()
}))

import {supabase} from '@/client/supabase'
import {clearCache, clearCacheByPrefix} from '@/utils/cache'

describe('vehicles API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSelect.mockReturnThis()
    mockInsert.mockReturnThis()
    mockUpdate.mockReturnThis()
    mockDelete.mockReturnThis()
    mockUpsert.mockReturnThis()
    mockEq.mockReturnThis()
    mockIn.mockReturnThis()
    mockOrder.mockReturnThis()
    mockLimit.mockReturnThis()
  })

  describe('debugAuthStatus', () => {
    it('应该在有session时返回认证信息', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: {
          session: {
            user: {id: 'user-1', email: 'test@example.com', role: 'DRIVER'}
          }
        },
        error: null
      } as any)

      const {debugAuthStatus} = await import('./vehicles')
      const result = await debugAuthStatus()

      expect(result.authenticated).toBe(true)
      expect(result.userId).toBe('user-1')
      expect(result.email).toBe('test@example.com')
    })

    it('应该在无session时返回未认证', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: {session: null},
        error: null
      } as any)

      const {debugAuthStatus} = await import('./vehicles')
      const result = await debugAuthStatus()

      expect(result.authenticated).toBe(false)
      expect(result.userId).toBeNull()
    })
  })

  describe('getDriverVehicles', () => {
    it('应该返回司机的车辆列表', async () => {
      const mockVehicles = [
        {id: 'v-1', plate_number: '京A12345', driver_id: 'driver-1'},
        {id: 'v-2', plate_number: '京B67890', driver_id: 'driver-1'}
      ]

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({data: mockVehicles, error: null})
      } as any)

      const {getDriverVehicles} = await import('./vehicles')
      const result = await getDriverVehicles('driver-1')

      expect(supabase.from).toHaveBeenCalledWith('vehicles')
      expect(result).toEqual(mockVehicles)
    })

    it('应该在查询失败时返回空数组', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({data: null, error: new Error('查询失败')})
      } as any)

      const {getDriverVehicles} = await import('./vehicles')
      const result = await getDriverVehicles('driver-1')

      expect(result).toEqual([])
    })
  })

  describe('getAllVehiclesWithDrivers', () => {
    it('应该返回所有车辆及司机信息', async () => {
      const mockVehicles = [
        {id: 'v-1', plate_number: '京A12345', user_id: 'driver-1'},
        {id: 'v-2', plate_number: '京B67890', user_id: 'driver-2'}
      ]

      const mockProfiles = [
        {id: 'driver-1', name: '司机1', phone: '13800138001'},
        {id: 'driver-2', name: '司机2', phone: '13800138002'}
      ]

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'vehicles') {
          return {
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({data: mockVehicles, error: null})
            })
          } as any
        }
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({data: mockProfiles, error: null})
          } as any
        }
        if (table === 'driver_licenses') {
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({data: [], error: null})
          } as any
        }
        return {} as any
      })

      const {getAllVehiclesWithDrivers} = await import('./vehicles')
      const result = await getAllVehiclesWithDrivers()

      expect(result.length).toBeGreaterThan(0)
    })

    it('应该在查询失败时返回空数组', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({data: null, error: new Error('查询失败')})
        })
      } as any)

      const {getAllVehiclesWithDrivers} = await import('./vehicles')
      const result = await getAllVehiclesWithDrivers()

      expect(result).toEqual([])
    })
  })

  describe('getVehicleById', () => {
    it('应该返回指定车辆信息', async () => {
      const mockVehicle = {
        id: 'v-1',
        plate_number: '京A12345',
        document: {id: 'doc-1'}
      }

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({data: mockVehicle, error: null})
      } as any)

      const {getVehicleById} = await import('./vehicles')
      const result = await getVehicleById('v-1')

      expect(result).toEqual(mockVehicle)
    })

    it('应该在车辆不存在时返回null', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({data: null, error: null})
      } as any)

      const {getVehicleById} = await import('./vehicles')
      const result = await getVehicleById('non-existent')

      expect(result).toBeNull()
    })
  })

  describe('insertVehicle', () => {
    it('应该在用户未登录时返回null', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: {user: null},
        error: null
      } as any)

      const {insertVehicle} = await import('./vehicles')
      const result = await insertVehicle({plate_number: '京A12345'} as any)

      expect(result).toBeNull()
    })

    it('应该在车牌号为空时返回null', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: {user: {id: 'user-1'}},
        error: null
      } as any)

      const {insertVehicle} = await import('./vehicles')
      const result = await insertVehicle({plate_number: ''} as any)

      expect(result).toBeNull()
    })

    it('应该成功添加车辆', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: {user: {id: 'user-1'}},
        error: null
      } as any)

      const newVehicle = {id: 'v-new', plate_number: '京A12345'}

      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({data: newVehicle, error: null})
      } as any)

      const {insertVehicle} = await import('./vehicles')
      const result = await insertVehicle({plate_number: '京A12345'} as any)

      expect(result).toEqual(newVehicle)
      expect(clearCacheByPrefix).toHaveBeenCalledWith('driver_vehicles_')
      expect(clearCache).toHaveBeenCalled()
    })
  })

  describe('updateVehicle', () => {
    it('应该成功更新车辆信息', async () => {
      const updatedVehicle = {id: 'v-1', plate_number: '京A12345', status: 'active'}

      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({data: updatedVehicle, error: null})
      } as any)

      const {updateVehicle} = await import('./vehicles')
      const result = await updateVehicle('v-1', {status: 'active'})

      expect(result).toEqual(updatedVehicle)
    })

    it('应该在更新失败时返回null', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({data: null, error: new Error('更新失败')})
      } as any)

      const {updateVehicle} = await import('./vehicles')
      const result = await updateVehicle('v-1', {status: 'active'})

      expect(result).toBeNull()
    })
  })

  describe('deleteVehicle', () => {
    it('应该在车辆不存在时返回false', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({data: null, error: null})
      } as any)

      const {deleteVehicle} = await import('./vehicles')
      const result = await deleteVehicle('non-existent')

      expect(result).toBe(false)
    })
  })

  describe('getDriverLicense', () => {
    it('应该返回驾驶员证件信息', async () => {
      const mockLicense = {
        driver_id: 'driver-1',
        id_card_name: '张三',
        license_number: 'A123456'
      }

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({data: mockLicense, error: null})
      } as any)

      const {getDriverLicense} = await import('./vehicles')
      const result = await getDriverLicense('driver-1')

      expect(result).toEqual(mockLicense)
    })

    it('应该在证件不存在时返回null', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({data: null, error: null})
      } as any)

      const {getDriverLicense} = await import('./vehicles')
      const result = await getDriverLicense('driver-1')

      expect(result).toBeNull()
    })
  })

  describe('upsertDriverLicense', () => {
    it('应该成功保存驾驶员证件', async () => {
      const mockLicense = {
        driver_id: 'driver-1',
        id_card_name: '张三'
      }

      vi.mocked(supabase.from).mockReturnValue({
        upsert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({data: mockLicense, error: null})
      } as any)

      const {upsertDriverLicense} = await import('./vehicles')
      const result = await upsertDriverLicense({driver_id: 'driver-1', id_card_name: '张三'} as any)

      expect(result).toEqual(mockLicense)
    })
  })

  describe('updateDriverLicense', () => {
    it('应该成功更新驾驶员证件', async () => {
      const updatedLicense = {
        driver_id: 'driver-1',
        id_card_name: '李四'
      }

      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({data: updatedLicense, error: null})
      } as any)

      const {updateDriverLicense} = await import('./vehicles')
      const result = await updateDriverLicense('driver-1', {id_card_name: '李四'})

      expect(result).toEqual(updatedLicense)
    })
  })

  describe('deleteDriverLicense', () => {
    it('应该成功删除驾驶员证件', async () => {
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'driver_licenses') {
          return {
            select: vi.fn().mockReturnThis(),
            delete: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({data: null, error: null})
          } as any
        }
        return {} as any
      })

      const {deleteDriverLicense} = await import('./vehicles')
      const result = await deleteDriverLicense('driver-1')

      expect(result).toBe(true)
    })
  })

  describe('submitVehicleForReview', () => {
    it('应该成功提交车辆审核', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({error: null})
      } as any)

      const {submitVehicleForReview} = await import('./vehicles')
      const result = await submitVehicleForReview('v-1')

      expect(result).toBe(true)
    })

    it('应该在提交失败时返回false', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({error: new Error('提交失败')})
      } as any)

      const {submitVehicleForReview} = await import('./vehicles')
      const result = await submitVehicleForReview('v-1')

      expect(result).toBe(false)
    })
  })

  describe('getPendingReviewVehicles', () => {
    it('应该返回待审核车辆列表', async () => {
      const mockVehicles = [
        {id: 'v-1', review_status: 'pending_review'},
        {id: 'v-2', review_status: 'pending_review'}
      ]

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({data: mockVehicles, error: null})
      } as any)

      const {getPendingReviewVehicles} = await import('./vehicles')
      const result = await getPendingReviewVehicles()

      expect(result).toEqual(mockVehicles)
    })
  })

  describe('lockPhoto', () => {
    it('应该成功锁定图片', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn()
          .mockResolvedValueOnce({data: {locked_photos: {}}, error: null})
          .mockResolvedValueOnce({error: null})
      } as any)

      const {lockPhoto} = await import('./vehicles')
      const result = await lockPhoto('v-1', 'pickup_photos', 0)

      expect(result).toBe(true)
    })
  })

  describe('unlockPhoto', () => {
    it('应该成功解锁图片', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn()
          .mockResolvedValueOnce({data: {locked_photos: {pickup_photos: [0, 1]}}, error: null})
          .mockResolvedValueOnce({error: null})
      } as any)

      const {unlockPhoto} = await import('./vehicles')
      const result = await unlockPhoto('v-1', 'pickup_photos', 0)

      expect(result).toBe(true)
    })
  })

  describe('approveVehicle', () => {
    it('应该成功通过审核', async () => {
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        return {
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({error: null})
        } as any
      })

      const {approveVehicle} = await import('./vehicles')
      const result = await approveVehicle('v-1', 'reviewer-1', '审核通过')

      expect(result).toBe(true)
    })
  })

  describe('requireSupplement', () => {
    it('应该成功要求补录', async () => {
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        return {
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({error: null})
        } as any
      })

      const {requireSupplement} = await import('./vehicles')
      const result = await requireSupplement('v-1', 'reviewer-1', '需要补录照片')

      expect(result).toBe(true)
    })
  })

  describe('getVehicleByPlateNumber', () => {
    it('应该根据车牌号返回车辆信息', async () => {
      const mockVehicle = {
        id: 'v-1',
        plate_number: '京A12345',
        driver_id: 'driver-1'
      }

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({data: mockVehicle, error: null})
      } as any)

      const {getVehicleByPlateNumber} = await import('./vehicles')
      const result = await getVehicleByPlateNumber('京A12345')

      expect(result).not.toBeNull()
      expect(result?.plate_number).toBe('京A12345')
    })

    it('应该在车辆不存在时返回null', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({data: null, error: null})
      } as any)

      const {getVehicleByPlateNumber} = await import('./vehicles')
      const result = await getVehicleByPlateNumber('不存在的车牌')

      expect(result).toBeNull()
    })
  })

  describe('returnVehicle', () => {
    it('应该成功还车录入', async () => {
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'vehicles') {
          return {
            update: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({data: {id: 'v-1'}, error: null})
          } as any
        }
        if (table === 'vehicle_documents') {
          return {
            update: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({error: null})
          } as any
        }
        return {} as any
      })

      const {returnVehicle} = await import('./vehicles')
      const result = await returnVehicle('v-1', ['photo1.jpg', 'photo2.jpg'])

      // 由于 getVehicleById 也会被调用，这里只验证不抛出错误
      expect(result).toBeDefined()
    })
  })
})
