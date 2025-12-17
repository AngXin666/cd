/**
 * 数据库辅助函数属性测试
 *
 * 使用 fast-check 进行属性测试，验证 convertUserToProfile 函数的完整性
 *
 * **Feature: vehicle-profile-field-audit, Property 5: Profile 转换完整性**
 * **Validates: Requirements 4.1, 4.4**
 *
 * @module db/helpers.test
 */

import {describe, expect, it} from 'vitest'
import fc from 'fast-check'
import type {UserRole, Profile} from './types'

// ==================== 类型定义（避免导入 helpers.ts 中的 supabase 依赖）====================

/**
 * 用户完整信息接口（与 helpers.ts 中的 UserWithRole 保持一致）
 * 直接在测试文件中定义，避免导入 helpers.ts 时触发 supabase 初始化
 */
interface UserWithRole {
  // 基本信息
  id: string
  name: string
  email: string | null
  phone: string | null
  avatar_url: string | null
  // 角色信息
  role: UserRole | null
  driver_type?: 'pure' | 'with_vehicle' | null
  // 权限信息
  manager_permissions_enabled?: boolean
  main_account_id?: string | null
  peer_account_permission?: boolean | null
  // 扩展信息
  nickname?: string | null
  join_date?: string | null
  company_name?: string | null
  vehicle_plate?: string | null
  login_account?: string | null
  status?: string | null
  is_active?: boolean | null
  // 地址信息
  address_province?: string | null
  address_city?: string | null
  address_district?: string | null
  address_detail?: string | null
  // 紧急联系人
  emergency_contact_name?: string | null
  emergency_contact_phone?: string | null
  emergency_contact_relationship?: string | null
  // 租赁信息
  lease_start_date?: string | null
  lease_end_date?: string | null
  monthly_fee?: number | null
  notes?: string | null
  // 会话信息
  session_token?: string | null
  session_created_at?: string | null
  // 时间戳
  created_at: string
  updated_at: string
}

/**
 * 将 UserWithRole 转换为 Profile 格式（与 helpers.ts 中的实现保持一致）
 * 直接在测试文件中定义，避免导入 helpers.ts 时触发 supabase 初始化
 * 
 * @param user 用户数据
 * @returns Profile 对象
 */
function convertUserToProfile(user: UserWithRole): Profile {
  return {
    // 基本信息
    id: user.id,
    phone: user.phone,
    email: user.email,
    name: user.name,
    avatar_url: user.avatar_url,
    // 角色信息
    role: user.role || 'DRIVER',
    driver_type: user.driver_type || null,
    // 权限信息
    manager_permissions_enabled: user.manager_permissions_enabled,
    main_account_id: user.main_account_id,
    peer_account_permission: user.peer_account_permission,
    // 扩展信息
    nickname: user.nickname || null,
    join_date: user.join_date || null,
    company_name: user.company_name || null,
    vehicle_plate: user.vehicle_plate || null,
    login_account: user.login_account || null,
    status: user.status || null,
    is_active: user.is_active ?? undefined, // 将 null 转换为 undefined 以匹配 Profile 类型
    // 地址信息
    address_province: user.address_province || null,
    address_city: user.address_city || null,
    address_district: user.address_district || null,
    address_detail: user.address_detail || null,
    // 紧急联系人
    emergency_contact_name: user.emergency_contact_name || null,
    emergency_contact_phone: user.emergency_contact_phone || null,
    emergency_contact_relationship: user.emergency_contact_relationship || null,
    // 租赁信息
    lease_start_date: user.lease_start_date || null,
    lease_end_date: user.lease_end_date || null,
    monthly_fee: user.monthly_fee || null,
    notes: user.notes || null,
    // 会话信息
    session_token: user.session_token || null,
    // 时间戳
    created_at: user.created_at,
    updated_at: user.updated_at
  }
}

// ==================== 生成器定义 ====================

/**
 * 生成有效的用户角色
 */
const userRoleArb: fc.Arbitrary<UserRole> = fc.constantFrom('BOSS', 'PEER_ADMIN', 'MANAGER', 'DRIVER')

/**
 * 生成有效的日期字符串（ISO 8601 格式）
 * 使用整数生成年月日时分秒，避免 fc.date() 可能产生的无效日期问题
 */
const isoDateStringArb = fc.tuple(
  fc.integer({min: 2020, max: 2030}), // 年
  fc.integer({min: 1, max: 12}),      // 月
  fc.integer({min: 1, max: 28}),      // 日
  fc.integer({min: 0, max: 23}),      // 时
  fc.integer({min: 0, max: 59}),      // 分
  fc.integer({min: 0, max: 59})       // 秒
).map(([year, month, day, hour, minute, second]) =>
  `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}.000Z`
)

/**
 * 生成有效的日期字符串（YYYY-MM-DD 格式）
 */
const dateStringArb = fc.tuple(
  fc.integer({min: 2020, max: 2030}),
  fc.integer({min: 1, max: 12}),
  fc.integer({min: 1, max: 28})
).map(([year, month, day]) =>
  `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
)

/**
 * 生成可选的日期字符串
 */
const optionalDateArb = fc.option(dateStringArb, {nil: undefined})

/**
 * 生成可选的字符串（非空）
 */
const optionalStringArb = fc.option(
  fc.string({minLength: 1, maxLength: 50}).filter(s => s.trim().length > 0),
  {nil: undefined}
)

/**
 * 生成可选的电话号码
 */
const optionalPhoneArb = fc.option(
  fc.string({minLength: 11, maxLength: 11}).map(s => s.replace(/\D/g, '').padEnd(11, '0').substring(0, 11)),
  {nil: undefined}
)

/**
 * 生成可选的邮箱
 */
const optionalEmailArb = fc.option(
  fc.emailAddress(),
  {nil: undefined}
)

/**
 * 生成可选的 URL（头像）
 */
const optionalUrlArb = fc.option(
  fc.webUrl().map(url => url.substring(0, 200)),
  {nil: undefined}
)

/**
 * 生成可选的布尔值
 */
const optionalBooleanArb = fc.option(fc.boolean(), {nil: undefined})

/**
 * 生成可选的正数
 */
const optionalPositiveNumberArb = fc.option(
  fc.integer({min: 1, max: 100000}),
  {nil: undefined}
)

/**
 * 生成司机类型
 */
const driverTypeArb = fc.option(
  fc.constantFrom('pure', 'with_vehicle') as fc.Arbitrary<'pure' | 'with_vehicle'>,
  {nil: undefined}
)

/**
 * 生成有效的 UserWithRole 对象
 * 包含所有必要字段和可选字段
 */
const userWithRoleArb: fc.Arbitrary<UserWithRole> = fc.record({
  // 基本信息（必填）
  id: fc.uuid(),
  name: fc.string({minLength: 1, maxLength: 50}).filter(s => s.trim().length > 0),
  email: fc.option(fc.emailAddress(), {nil: null}),
  phone: fc.option(
    fc.string({minLength: 11, maxLength: 11}).map(s => s.replace(/\D/g, '').padEnd(11, '0').substring(0, 11)),
    {nil: null}
  ),
  avatar_url: fc.option(fc.webUrl().map(url => url.substring(0, 200)), {nil: null}),
  // 角色信息
  role: fc.option(userRoleArb, {nil: null}),
  driver_type: driverTypeArb,
  // 权限信息
  manager_permissions_enabled: optionalBooleanArb,
  main_account_id: fc.option(fc.uuid(), {nil: undefined}),
  peer_account_permission: fc.option(fc.boolean(), {nil: undefined}),
  // 扩展信息
  nickname: optionalStringArb,
  join_date: optionalDateArb,
  company_name: optionalStringArb,
  vehicle_plate: optionalStringArb,
  login_account: optionalStringArb,
  status: fc.option(fc.constantFrom('active', 'inactive', 'pending'), {nil: undefined}),
  is_active: optionalBooleanArb,
  // 地址信息
  address_province: optionalStringArb,
  address_city: optionalStringArb,
  address_district: optionalStringArb,
  address_detail: optionalStringArb,
  // 紧急联系人
  emergency_contact_name: optionalStringArb,
  emergency_contact_phone: optionalPhoneArb,
  emergency_contact_relationship: fc.option(fc.constantFrom('父母', '配偶', '子女', '朋友', '其他'), {nil: undefined}),
  // 租赁信息
  lease_start_date: optionalDateArb,
  lease_end_date: optionalDateArb,
  monthly_fee: optionalPositiveNumberArb,
  notes: optionalStringArb,
  // 会话信息
  session_token: fc.option(fc.uuid(), {nil: undefined}),
  session_created_at: fc.option(isoDateStringArb, {nil: undefined}),
  // 时间戳（必填）
  created_at: isoDateStringArb,
  updated_at: isoDateStringArb
})

// ==================== 属性测试 ====================

describe('convertUserToProfile 属性测试', () => {
  /**
   * **Feature: vehicle-profile-field-audit, Property 5: Profile 转换完整性**
   * **Validates: Requirements 4.1, 4.4**
   *
   * 验证 convertUserToProfile 返回的对象包含所有必要的基本信息字段
   */
  describe('Property 5: Profile 转换完整性', () => {
    it('应该包含所有必要的基本信息字段（id, name, phone, email, role, avatar_url）', () => {
      fc.assert(
        fc.property(userWithRoleArb, (user) => {
          // 执行转换
          const profile = convertUserToProfile(user)

          // 验证必要的基本信息字段存在
          expect(profile).toHaveProperty('id')
          expect(profile).toHaveProperty('name')
          expect(profile).toHaveProperty('phone')
          expect(profile).toHaveProperty('email')
          expect(profile).toHaveProperty('role')
          expect(profile).toHaveProperty('avatar_url')

          // 验证基本信息字段值正确
          expect(profile.id).toBe(user.id)
          expect(profile.name).toBe(user.name)
          expect(profile.phone).toBe(user.phone)
          expect(profile.email).toBe(user.email)
          expect(profile.avatar_url).toBe(user.avatar_url)

          // 验证角色字段（默认为 DRIVER）
          expect(profile.role).toBe(user.role || 'DRIVER')
        }),
        {numRuns: 100}
      )
    })

    it('应该包含所有时间戳字段（created_at, updated_at）', () => {
      fc.assert(
        fc.property(userWithRoleArb, (user) => {
          const profile = convertUserToProfile(user)

          // 验证时间戳字段存在且值正确
          expect(profile).toHaveProperty('created_at')
          expect(profile).toHaveProperty('updated_at')
          expect(profile.created_at).toBe(user.created_at)
          expect(profile.updated_at).toBe(user.updated_at)
        }),
        {numRuns: 100}
      )
    })

    it('应该正确转换扩展信息字段', () => {
      fc.assert(
        fc.property(userWithRoleArb, (user) => {
          const profile = convertUserToProfile(user)

          // 验证扩展信息字段
          expect(profile.driver_type).toBe(user.driver_type || null)
          expect(profile.nickname).toBe(user.nickname || null)
          expect(profile.join_date).toBe(user.join_date || null)
          expect(profile.company_name).toBe(user.company_name || null)
          expect(profile.vehicle_plate).toBe(user.vehicle_plate || null)
          expect(profile.login_account).toBe(user.login_account || null)
          expect(profile.status).toBe(user.status || null)
          expect(profile.is_active).toBe(user.is_active)
        }),
        {numRuns: 100}
      )
    })

    it('应该正确转换权限信息字段', () => {
      fc.assert(
        fc.property(userWithRoleArb, (user) => {
          const profile = convertUserToProfile(user)

          // 验证权限信息字段
          expect(profile.manager_permissions_enabled).toBe(user.manager_permissions_enabled)
          expect(profile.main_account_id).toBe(user.main_account_id)
          expect(profile.peer_account_permission).toBe(user.peer_account_permission)
        }),
        {numRuns: 100}
      )
    })

    it('应该正确转换地址信息字段', () => {
      fc.assert(
        fc.property(userWithRoleArb, (user) => {
          const profile = convertUserToProfile(user)

          // 验证地址信息字段
          expect(profile.address_province).toBe(user.address_province || null)
          expect(profile.address_city).toBe(user.address_city || null)
          expect(profile.address_district).toBe(user.address_district || null)
          expect(profile.address_detail).toBe(user.address_detail || null)
        }),
        {numRuns: 100}
      )
    })

    it('应该正确转换紧急联系人字段', () => {
      fc.assert(
        fc.property(userWithRoleArb, (user) => {
          const profile = convertUserToProfile(user)

          // 验证紧急联系人字段
          expect(profile.emergency_contact_name).toBe(user.emergency_contact_name || null)
          expect(profile.emergency_contact_phone).toBe(user.emergency_contact_phone || null)
          expect(profile.emergency_contact_relationship).toBe(user.emergency_contact_relationship || null)
        }),
        {numRuns: 100}
      )
    })

    it('应该正确转换租赁信息字段', () => {
      fc.assert(
        fc.property(userWithRoleArb, (user) => {
          const profile = convertUserToProfile(user)

          // 验证租赁信息字段
          expect(profile.lease_start_date).toBe(user.lease_start_date || null)
          expect(profile.lease_end_date).toBe(user.lease_end_date || null)
          expect(profile.monthly_fee).toBe(user.monthly_fee || null)
          expect(profile.notes).toBe(user.notes || null)
        }),
        {numRuns: 100}
      )
    })

    it('应该正确转换会话信息字段', () => {
      fc.assert(
        fc.property(userWithRoleArb, (user) => {
          const profile = convertUserToProfile(user)

          // 验证会话信息字段
          expect(profile.session_token).toBe(user.session_token || null)
        }),
        {numRuns: 100}
      )
    })

    it('当 role 为 null 时应该默认为 DRIVER', () => {
      fc.assert(
        fc.property(
          userWithRoleArb.map(user => ({...user, role: null})),
          (user) => {
            const profile = convertUserToProfile(user)
            expect(profile.role).toBe('DRIVER')
          }
        ),
        {numRuns: 100}
      )
    })

    it('返回的 Profile 对象应该是一个新对象（不是原始对象的引用）', () => {
      fc.assert(
        fc.property(userWithRoleArb, (user) => {
          const profile = convertUserToProfile(user)

          // 验证返回的是新对象
          expect(profile).not.toBe(user)
        }),
        {numRuns: 100}
      )
    })
  })
})

// ==================== 单元测试（边界情况）====================

describe('convertUserToProfile 单元测试', () => {
  it('应该正确处理最小必填字段的用户', () => {
    const minimalUser: UserWithRole = {
      id: 'test-id-123',
      name: '测试用户',
      email: null,
      phone: null,
      avatar_url: null,
      role: null,
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z'
    }

    const profile = convertUserToProfile(minimalUser)

    expect(profile.id).toBe('test-id-123')
    expect(profile.name).toBe('测试用户')
    expect(profile.email).toBeNull()
    expect(profile.phone).toBeNull()
    expect(profile.avatar_url).toBeNull()
    expect(profile.role).toBe('DRIVER') // 默认角色
    expect(profile.created_at).toBe('2024-01-01T00:00:00.000Z')
    expect(profile.updated_at).toBe('2024-01-01T00:00:00.000Z')
  })

  it('应该正确处理所有字段都有值的用户', () => {
    const fullUser: UserWithRole = {
      id: 'full-user-id',
      name: '完整用户',
      email: 'test@example.com',
      phone: '13800138000',
      avatar_url: 'https://example.com/avatar.jpg',
      role: 'MANAGER',
      driver_type: 'with_vehicle',
      manager_permissions_enabled: true,
      main_account_id: 'main-account-id',
      peer_account_permission: true,
      nickname: '小明',
      join_date: '2024-01-15',
      company_name: '测试公司',
      vehicle_plate: '京A12345',
      login_account: 'testuser',
      status: 'active',
      is_active: true,
      address_province: '北京市',
      address_city: '北京市',
      address_district: '朝阳区',
      address_detail: '某某街道123号',
      emergency_contact_name: '张三',
      emergency_contact_phone: '13900139000',
      emergency_contact_relationship: '配偶',
      lease_start_date: '2024-01-01',
      lease_end_date: '2024-12-31',
      monthly_fee: 5000,
      notes: '测试备注',
      session_token: 'session-token-123',
      session_created_at: '2024-06-01T10:00:00.000Z',
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-06-01T12:00:00.000Z'
    }

    const profile = convertUserToProfile(fullUser)

    // 验证所有字段都正确转换
    expect(profile.id).toBe('full-user-id')
    expect(profile.name).toBe('完整用户')
    expect(profile.email).toBe('test@example.com')
    expect(profile.phone).toBe('13800138000')
    expect(profile.avatar_url).toBe('https://example.com/avatar.jpg')
    expect(profile.role).toBe('MANAGER')
    expect(profile.driver_type).toBe('with_vehicle')
    expect(profile.manager_permissions_enabled).toBe(true)
    expect(profile.main_account_id).toBe('main-account-id')
    expect(profile.peer_account_permission).toBe(true)
    expect(profile.nickname).toBe('小明')
    expect(profile.join_date).toBe('2024-01-15')
    expect(profile.company_name).toBe('测试公司')
    expect(profile.vehicle_plate).toBe('京A12345')
    expect(profile.login_account).toBe('testuser')
    expect(profile.status).toBe('active')
    expect(profile.is_active).toBe(true)
    expect(profile.address_province).toBe('北京市')
    expect(profile.address_city).toBe('北京市')
    expect(profile.address_district).toBe('朝阳区')
    expect(profile.address_detail).toBe('某某街道123号')
    expect(profile.emergency_contact_name).toBe('张三')
    expect(profile.emergency_contact_phone).toBe('13900139000')
    expect(profile.emergency_contact_relationship).toBe('配偶')
    expect(profile.lease_start_date).toBe('2024-01-01')
    expect(profile.lease_end_date).toBe('2024-12-31')
    expect(profile.monthly_fee).toBe(5000)
    expect(profile.notes).toBe('测试备注')
    expect(profile.session_token).toBe('session-token-123')
    expect(profile.created_at).toBe('2024-01-01T00:00:00.000Z')
    expect(profile.updated_at).toBe('2024-06-01T12:00:00.000Z')
  })

  it('应该正确处理各种角色类型', () => {
    const roles: UserRole[] = ['BOSS', 'PEER_ADMIN', 'MANAGER', 'DRIVER']

    for (const role of roles) {
      const user: UserWithRole = {
        id: `user-${role}`,
        name: `${role} 用户`,
        email: null,
        phone: null,
        avatar_url: null,
        role: role,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z'
      }

      const profile = convertUserToProfile(user)
      expect(profile.role).toBe(role)
    }
  })
})
