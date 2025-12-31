import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { matchWithPinyin } from '../pinyin'
import { UserRole } from '@/api/types'

interface Driver {
  id: number
  name: string | null
  phone: string | null
  role: UserRole
  warehouse_id: number | null
}

function isDriverVerified(driver: Driver): boolean {
  return !!(driver.name && driver.phone)
}

function getProfileButtonState(driver: Driver): { enabled: boolean; text: string } {
  return isDriverVerified(driver) 
    ? { enabled: true, text: '个人信息' }
    : { enabled: false, text: '未实名' }
}

function searchDrivers(drivers: Driver[], keyword: string): Driver[] {
  if (!keyword?.trim()) return drivers
  const k = keyword.trim()
  return drivers.filter(d => 
    (d.name && matchWithPinyin(d.name, k)) || (d.phone && d.phone.includes(k))
  )
}

function filterByWarehouse(drivers: Driver[], wid: number | null): Driver[] {
  return wid === null ? drivers : drivers.filter(d => d.warehouse_id === wid)
}

const nameChars = [
  { c: '张', p: 'Z' }, { c: '王', p: 'W' }, { c: '李', p: 'L' },
  { c: '明', p: 'M' }, { c: '华', p: 'H' }
]

const nameArb = fc.array(fc.constantFrom(...nameChars), { minLength: 2, maxLength: 3 })
  .map(cs => ({ name: cs.map(x => x.c).join(''), pinyin: cs.map(x => x.p).join('') }))

const phoneArb = fc.tuple(
  fc.constantFrom('13', '15', '18'),
  fc.stringMatching(/^[0-9]{9}$/)
).map(([a, b]) => a + b)

const verifiedArb = fc.record({
  id: fc.integer({ min: 1, max: 9999 }),
  nameData: nameArb,
  phone: phoneArb,
  warehouse_id: fc.oneof(fc.constant(null), fc.integer({ min: 1, max: 5 })),
}).map(({ id, nameData, phone, warehouse_id }) => ({
  id, name: nameData.name, pinyin: nameData.pinyin, phone,
  role: UserRole.DRIVER, warehouse_id
}))

const unverifiedArb = fc.record({
  id: fc.integer({ min: 1, max: 9999 }),
  hasName: fc.boolean(),
  nameData: nameArb,
  warehouse_id: fc.oneof(fc.constant(null), fc.integer({ min: 1, max: 5 })),
}).map(({ id, hasName, nameData, warehouse_id }) => ({
  id, name: hasName ? nameData.name : null, pinyin: hasName ? nameData.pinyin : '',
  phone: null, role: UserRole.DRIVER, warehouse_id
}))

describe('老板端计件统计页面属性测试', () => {
  // Property 1: 司机实名状态影响 UI 显示 - Validates: Requirements 2.4, 6.2, 6.3
  describe('Property 1: 司机实名状态影响 UI 显示', () => {
    it('已实名司机按钮可点击', () => {
      fc.assert(fc.property(verifiedArb, d => {
        expect(isDriverVerified(d)).toBe(true)
        expect(getProfileButtonState(d)).toEqual({ enabled: true, text: '个人信息' })
        return true
      }), { numRuns: 100 })
    })

    it('未实名司机按钮禁用', () => {
      fc.assert(fc.property(unverifiedArb, d => {
        expect(isDriverVerified(d)).toBe(false)
        expect(getProfileButtonState(d)).toEqual({ enabled: false, text: '未实名' })
        return true
      }), { numRuns: 100 })
    })
  })

  // Property 3: 仓库筛选结果一致性 - Validates: Requirements 4.3, 7.2
  describe('Property 3: 仓库筛选结果一致性', () => {
    it('筛选后司机都属于指定仓库', () => {
      fc.assert(fc.property(
        fc.array(verifiedArb, { minLength: 1, maxLength: 10 }),
        fc.integer({ min: 1, max: 5 }),
        (drivers, wid) => {
          const filtered = filterByWarehouse(drivers, wid)
          filtered.forEach(d => expect(d.warehouse_id).toBe(wid))
          return true
        }
      ), { numRuns: 100 })
    })

    it('null仓库返回全部', () => {
      fc.assert(fc.property(
        fc.array(verifiedArb, { minLength: 0, maxLength: 10 }),
        drivers => {
          expect(filterByWarehouse(drivers, null).length).toBe(drivers.length)
          return true
        }
      ), { numRuns: 100 })
    })
  })

  // Property 4: 搜索功能正确性 - Validates: Requirements 5.1
  describe('Property 4: 搜索功能正确性', () => {
    it('姓名搜索能找到目标司机', () => {
      fc.assert(fc.property(verifiedArb, target => {
        const results = searchDrivers([target], target.name!)
        expect(results.some(d => d.id === target.id)).toBe(true)
        return true
      }), { numRuns: 100 })
    })

    it('手机号搜索能找到目标司机', () => {
      fc.assert(fc.property(verifiedArb, target => {
        const results = searchDrivers([target], target.phone!)
        expect(results.some(d => d.id === target.id)).toBe(true)
        return true
      }), { numRuns: 100 })
    })

    it('拼音首字母搜索能找到目标司机', () => {
      fc.assert(fc.property(verifiedArb, target => {
        const results = searchDrivers([target], target.pinyin.toLowerCase())
        expect(results.some(d => d.id === target.id)).toBe(true)
        return true
      }), { numRuns: 100 })
    })
  })
})
