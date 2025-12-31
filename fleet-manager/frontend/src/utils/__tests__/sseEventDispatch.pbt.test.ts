/**
 * SSE 事件分发属性测试
 * Property-Based Testing for SSE Event Dispatch
 * 
 * **Feature: unified-realtime-system, Property 1: 事件类型分发正确性**
 * **Validates: Requirements 1.1, 1.2**
 * 
 * 测试属性：
 * - 任意事件类型都能正确格式化为 SSE 消息
 * - SSE 消息包含正确的 event 和 data 字段
 * - 解析后的事件类型与原始类型一致
 * - 解析后的数据与原始数据一致
 * - 事件分发到正确的回调处理器
 */

import { describe, it, expect, vi } from 'vitest'
import * as fc from 'fast-check'
import type {
  VehicleUpdateEvent,
  LeaveUpdateEvent,
  PieceWorkUpdateEvent,
  AssignmentUpdateEvent,
  PermissionUpdateEvent,
  UserUpdateEvent,
  EventAction,
} from '@/types/sse-events'

// ==================== 数据生成策略 ====================

/**
 * 车辆状态枚举
 */
const VEHICLE_STATUSES = ['active', 'returned', 'reviewing', 'inactive'] as const

/**
 * 请假状态枚举
 */
const LEAVE_STATUSES = ['pending', 'approved', 'rejected'] as const

/**
 * 请假类型枚举
 */
const LEAVE_TYPES = ['leave', 'resignation'] as const

/**
 * 计件记录状态枚举
 */
const PIECE_WORK_STATUSES = ['submitted', 'approved', 'rejected'] as const

/**
 * 用户角色枚举
 * 注意：super_admin 角色已被移除
 */
const USER_ROLES = ['driver', 'manager', 'dispatcher', 'boss'] as const

/**
 * 事件动作类型
 */
const EVENT_ACTIONS: EventAction[] = ['create', 'update', 'delete']

/**
 * 生成有效的 ISO 日期字符串
 */
const isoDateArbitrary = fc.date().map(d => d.toISOString())

/**
 * 生成非空字符串（过滤掉只包含空白字符的字符串）
 */
const nonEmptyStringArbitrary = fc.string({ minLength: 1, maxLength: 50 })
  .filter(s => s.trim().length > 0)

/**
 * 生成车辆更新事件数据
 * Requirements: 2.2 - 车辆事件负载包含完整数据
 */
const vehicleUpdateEventArbitrary: fc.Arbitrary<VehicleUpdateEvent> = fc.record({
  action: fc.constantFrom(...EVENT_ACTIONS),
  vehicle: fc.record({
    id: fc.integer({ min: 1, max: 100000 }),
    license_plate: fc.stringMatching(/^[A-Z0-9\u4e00-\u9fa5]{5,10}$/),
    brand: fc.option(nonEmptyStringArbitrary, { nil: null }),
    model: fc.option(nonEmptyStringArbitrary, { nil: null }),
    color: fc.option(nonEmptyStringArbitrary, { nil: null }),
    status: fc.constantFrom(...VEHICLE_STATUSES),
    user_id: fc.integer({ min: 1, max: 100000 }),
    warehouse_id: fc.option(fc.integer({ min: 1, max: 10000 }), { nil: null }),
    ownership_type: fc.option(fc.constantFrom('company', 'personal', 'rental'), { nil: null }),
    created_at: isoDateArbitrary,
    updated_at: isoDateArbitrary,
  }),
})

/**
 * 生成请假更新事件数据
 * Requirements: 3.2 - 请假事件负载包含完整数据
 */
const leaveUpdateEventArbitrary: fc.Arbitrary<LeaveUpdateEvent> = fc.record({
  action: fc.constantFrom('create', 'update') as fc.Arbitrary<'create' | 'update'>,
  leave: fc.record({
    id: fc.integer({ min: 1, max: 100000 }),
    user_id: fc.integer({ min: 1, max: 100000 }),
    leave_type: fc.constantFrom(...LEAVE_TYPES),
    start_date: isoDateArbitrary,
    end_date: isoDateArbitrary,
    status: fc.constantFrom(...LEAVE_STATUSES),
    reason: fc.option(fc.string({ maxLength: 200 }), { nil: null }),
    approver_id: fc.option(fc.integer({ min: 1, max: 100000 }), { nil: null }),
    approve_remark: fc.option(fc.string({ maxLength: 200 }), { nil: null }),
    created_at: isoDateArbitrary,
    updated_at: isoDateArbitrary,
  }),
})

/**
 * 生成计件更新事件数据
 * Requirements: 4.3 - 计件事件负载包含完整数据
 */
const pieceWorkUpdateEventArbitrary: fc.Arbitrary<PieceWorkUpdateEvent> = fc.record({
  action: fc.constantFrom('create', 'update') as fc.Arbitrary<'create' | 'update'>,
  record: fc.record({
    id: fc.integer({ min: 1, max: 100000 }),
    user_id: fc.integer({ min: 1, max: 100000 }),
    user_name: nonEmptyStringArbitrary,
    warehouse_id: fc.option(fc.integer({ min: 1, max: 10000 }), { nil: null }),
    warehouse_name: fc.option(nonEmptyStringArbitrary, { nil: null }),
    category_id: fc.integer({ min: 1, max: 1000 }),
    category_name: nonEmptyStringArbitrary,
    quantity: fc.integer({ min: 1, max: 10000 }),
    amount: fc.double({ min: 0.01, max: 100000, noNaN: true }),
    work_date: isoDateArbitrary,
    remark: fc.option(fc.string({ maxLength: 200 }), { nil: null }),
    status: fc.constantFrom(...PIECE_WORK_STATUSES),
    created_at: isoDateArbitrary,
  }),
})

/**
 * 生成仓库分配更新事件数据
 * Requirements: 5.3 - 仓库分配事件负载包含完整数据
 */
const assignmentUpdateEventArbitrary: fc.Arbitrary<AssignmentUpdateEvent> = fc.record({
  user_id: fc.integer({ min: 1, max: 100000 }),
  assignment_type: fc.constantFrom('driver', 'manager') as fc.Arbitrary<'driver' | 'manager'>,
  warehouses: fc.array(
    fc.record({
      id: fc.integer({ min: 1, max: 10000 }),
      name: nonEmptyStringArbitrary,
      address: fc.option(fc.string({ maxLength: 100 }), { nil: null }),
    }),
    { minLength: 0, maxLength: 10 }
  ),
})

/**
 * 生成权限更新事件数据
 * Requirements: 6.2 - 权限事件负载包含完整数据
 */
const permissionUpdateEventArbitrary: fc.Arbitrary<PermissionUpdateEvent> = fc.record({
  user_id: fc.integer({ min: 1, max: 100000 }),
  permissions: fc.array(
    fc.constantFrom(
      'can_approve_leave',
      'can_approve_vehicle',
      'can_manage_piece_work',
      'can_manage_users',
      'can_manage_warehouses'
    ),
    { minLength: 0, maxLength: 5 }
  ),
})

/**
 * 生成用户状态更新事件数据
 * Requirements: 7.2 - 用户事件负载包含完整数据
 */
const userUpdateEventArbitrary: fc.Arbitrary<UserUpdateEvent> = fc.record({
  action: fc.constantFrom('update', 'disable') as fc.Arbitrary<'update' | 'disable'>,
  user: fc.record({
    id: fc.integer({ min: 1, max: 100000 }),
    role: fc.constantFrom(...USER_ROLES),
    is_active: fc.boolean(),
    updated_at: isoDateArbitrary,
  }),
})

// ==================== 辅助函数 ====================

/**
 * 模拟 SSE 消息格式化
 * 将事件数据格式化为 SSE 消息字符串
 * 
 * @param eventType - 事件类型
 * @param data - 事件数据
 * @returns 格式化后的 SSE 消息字符串
 */
function formatSSEMessage(eventType: string, data: unknown): string {
  return `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`
}

/**
 * 解析 SSE 消息
 * 从 SSE 消息字符串中提取事件类型和数据
 * 
 * @param message - SSE 消息字符串
 * @returns 包含 eventType 和 data 的对象
 */
function parseSSEMessage(message: string): { eventType: string; data: unknown } {
  const lines = message.trim().split('\n')
  let eventType = ''
  let data: unknown = null
  
  for (const line of lines) {
    if (line.startsWith('event: ')) {
      eventType = line.slice(7)
    } else if (line.startsWith('data: ')) {
      data = JSON.parse(line.slice(6))
    }
  }
  
  return { eventType, data }
}

/**
 * 模拟事件分发器
 * 根据事件类型调用对应的回调函数
 * 
 * @param eventType - 事件类型
 * @param data - 事件数据
 * @param callbacks - 回调函数集合
 */
function dispatchEvent(
  eventType: string,
  data: unknown,
  callbacks: {
    onVehicleUpdate?: (data: VehicleUpdateEvent) => void
    onLeaveUpdate?: (data: LeaveUpdateEvent) => void
    onPieceWorkUpdate?: (data: PieceWorkUpdateEvent) => void
    onAssignmentUpdate?: (data: AssignmentUpdateEvent) => void
    onPermissionUpdate?: (data: PermissionUpdateEvent) => void
    onUserUpdate?: (data: UserUpdateEvent) => void
  }
): void {
  switch (eventType) {
    case 'vehicle_update':
      callbacks.onVehicleUpdate?.(data as VehicleUpdateEvent)
      break
    case 'leave_update':
      callbacks.onLeaveUpdate?.(data as LeaveUpdateEvent)
      break
    case 'piece_work_update':
      callbacks.onPieceWorkUpdate?.(data as PieceWorkUpdateEvent)
      break
    case 'assignment_update':
      callbacks.onAssignmentUpdate?.(data as AssignmentUpdateEvent)
      break
    case 'permission_update':
      callbacks.onPermissionUpdate?.(data as PermissionUpdateEvent)
      break
    case 'user_update':
      callbacks.onUserUpdate?.(data as UserUpdateEvent)
      break
  }
}

// ==================== 属性测试 ====================

describe('SSE 事件分发属性测试', () => {
  describe('Property 1: 事件类型分发正确性', () => {
    /**
     * **Feature: unified-realtime-system, Property 1: 事件类型分发正确性**
     * **Validates: Requirements 1.1, 1.2**
     */
    
    it('Property 1.1: 车辆更新事件能正确格式化和解析', () => {
      fc.assert(
        fc.property(vehicleUpdateEventArbitrary, (eventData) => {
          // 格式化为 SSE 消息
          const message = formatSSEMessage('vehicle_update', eventData)
          
          // 验证消息格式
          expect(message).toMatch(/^event: vehicle_update\n/)
          expect(message).toContain('data: ')
          expect(message).toMatch(/\n\n$/)
          
          // 解析消息
          const parsed = parseSSEMessage(message)
          
          // 验证解析结果
          expect(parsed.eventType).toBe('vehicle_update')
          expect(parsed.data).toEqual(eventData)
        }),
        { numRuns: 50 }
      )
    })

    it('Property 1.2: 请假更新事件能正确格式化和解析', () => {
      fc.assert(
        fc.property(leaveUpdateEventArbitrary, (eventData) => {
          // 格式化为 SSE 消息
          const message = formatSSEMessage('leave_update', eventData)
          
          // 验证消息格式
          expect(message).toMatch(/^event: leave_update\n/)
          expect(message).toContain('data: ')
          
          // 解析消息
          const parsed = parseSSEMessage(message)
          
          // 验证解析结果
          expect(parsed.eventType).toBe('leave_update')
          expect(parsed.data).toEqual(eventData)
        }),
        { numRuns: 50 }
      )
    })

    it('Property 1.3: 计件更新事件能正确格式化和解析', () => {
      fc.assert(
        fc.property(pieceWorkUpdateEventArbitrary, (eventData) => {
          // 格式化为 SSE 消息
          const message = formatSSEMessage('piece_work_update', eventData)
          
          // 验证消息格式
          expect(message).toMatch(/^event: piece_work_update\n/)
          
          // 解析消息
          const parsed = parseSSEMessage(message)
          
          // 验证解析结果
          expect(parsed.eventType).toBe('piece_work_update')
          expect(parsed.data).toEqual(eventData)
        }),
        { numRuns: 50 }
      )
    })

    it('Property 1.4: 仓库分配更新事件能正确格式化和解析', () => {
      fc.assert(
        fc.property(assignmentUpdateEventArbitrary, (eventData) => {
          // 格式化为 SSE 消息
          const message = formatSSEMessage('assignment_update', eventData)
          
          // 验证消息格式
          expect(message).toMatch(/^event: assignment_update\n/)
          
          // 解析消息
          const parsed = parseSSEMessage(message)
          
          // 验证解析结果
          expect(parsed.eventType).toBe('assignment_update')
          expect(parsed.data).toEqual(eventData)
        }),
        { numRuns: 50 }
      )
    })

    it('Property 1.5: 权限更新事件能正确格式化和解析', () => {
      fc.assert(
        fc.property(permissionUpdateEventArbitrary, (eventData) => {
          // 格式化为 SSE 消息
          const message = formatSSEMessage('permission_update', eventData)
          
          // 验证消息格式
          expect(message).toMatch(/^event: permission_update\n/)
          
          // 解析消息
          const parsed = parseSSEMessage(message)
          
          // 验证解析结果
          expect(parsed.eventType).toBe('permission_update')
          expect(parsed.data).toEqual(eventData)
        }),
        { numRuns: 50 }
      )
    })

    it('Property 1.6: 用户状态更新事件能正确格式化和解析', () => {
      fc.assert(
        fc.property(userUpdateEventArbitrary, (eventData) => {
          // 格式化为 SSE 消息
          const message = formatSSEMessage('user_update', eventData)
          
          // 验证消息格式
          expect(message).toMatch(/^event: user_update\n/)
          
          // 解析消息
          const parsed = parseSSEMessage(message)
          
          // 验证解析结果
          expect(parsed.eventType).toBe('user_update')
          expect(parsed.data).toEqual(eventData)
        }),
        { numRuns: 50 }
      )
    })
  })

  describe('Property 1: 事件回调分发正确性', () => {
    /**
     * **Feature: unified-realtime-system, Property 1: 事件类型分发正确性**
     * **Validates: Requirements 1.1, 1.2**
     */
    
    it('Property 1.7: 车辆更新事件分发到正确的回调', () => {
      fc.assert(
        fc.property(vehicleUpdateEventArbitrary, (eventData) => {
          // 创建 mock 回调
          const onVehicleUpdate = vi.fn()
          const onLeaveUpdate = vi.fn()
          const onPieceWorkUpdate = vi.fn()
          
          // 分发事件
          dispatchEvent('vehicle_update', eventData, {
            onVehicleUpdate,
            onLeaveUpdate,
            onPieceWorkUpdate,
          })
          
          // 验证只有 onVehicleUpdate 被调用
          expect(onVehicleUpdate).toHaveBeenCalledTimes(1)
          expect(onVehicleUpdate).toHaveBeenCalledWith(eventData)
          expect(onLeaveUpdate).not.toHaveBeenCalled()
          expect(onPieceWorkUpdate).not.toHaveBeenCalled()
        }),
        { numRuns: 50 }
      )
    })

    it('Property 1.8: 请假更新事件分发到正确的回调', () => {
      fc.assert(
        fc.property(leaveUpdateEventArbitrary, (eventData) => {
          // 创建 mock 回调
          const onVehicleUpdate = vi.fn()
          const onLeaveUpdate = vi.fn()
          const onPieceWorkUpdate = vi.fn()
          
          // 分发事件
          dispatchEvent('leave_update', eventData, {
            onVehicleUpdate,
            onLeaveUpdate,
            onPieceWorkUpdate,
          })
          
          // 验证只有 onLeaveUpdate 被调用
          expect(onLeaveUpdate).toHaveBeenCalledTimes(1)
          expect(onLeaveUpdate).toHaveBeenCalledWith(eventData)
          expect(onVehicleUpdate).not.toHaveBeenCalled()
          expect(onPieceWorkUpdate).not.toHaveBeenCalled()
        }),
        { numRuns: 50 }
      )
    })

    it('Property 1.9: 计件更新事件分发到正确的回调', () => {
      fc.assert(
        fc.property(pieceWorkUpdateEventArbitrary, (eventData) => {
          // 创建 mock 回调
          const onVehicleUpdate = vi.fn()
          const onLeaveUpdate = vi.fn()
          const onPieceWorkUpdate = vi.fn()
          
          // 分发事件
          dispatchEvent('piece_work_update', eventData, {
            onVehicleUpdate,
            onLeaveUpdate,
            onPieceWorkUpdate,
          })
          
          // 验证只有 onPieceWorkUpdate 被调用
          expect(onPieceWorkUpdate).toHaveBeenCalledTimes(1)
          expect(onPieceWorkUpdate).toHaveBeenCalledWith(eventData)
          expect(onVehicleUpdate).not.toHaveBeenCalled()
          expect(onLeaveUpdate).not.toHaveBeenCalled()
        }),
        { numRuns: 50 }
      )
    })

    it('Property 1.10: 仓库分配更新事件分发到正确的回调', () => {
      fc.assert(
        fc.property(assignmentUpdateEventArbitrary, (eventData) => {
          // 创建 mock 回调
          const onAssignmentUpdate = vi.fn()
          const onPermissionUpdate = vi.fn()
          const onUserUpdate = vi.fn()
          
          // 分发事件
          dispatchEvent('assignment_update', eventData, {
            onAssignmentUpdate,
            onPermissionUpdate,
            onUserUpdate,
          })
          
          // 验证只有 onAssignmentUpdate 被调用
          expect(onAssignmentUpdate).toHaveBeenCalledTimes(1)
          expect(onAssignmentUpdate).toHaveBeenCalledWith(eventData)
          expect(onPermissionUpdate).not.toHaveBeenCalled()
          expect(onUserUpdate).not.toHaveBeenCalled()
        }),
        { numRuns: 50 }
      )
    })

    it('Property 1.11: 权限更新事件分发到正确的回调', () => {
      fc.assert(
        fc.property(permissionUpdateEventArbitrary, (eventData) => {
          // 创建 mock 回调
          const onAssignmentUpdate = vi.fn()
          const onPermissionUpdate = vi.fn()
          const onUserUpdate = vi.fn()
          
          // 分发事件
          dispatchEvent('permission_update', eventData, {
            onAssignmentUpdate,
            onPermissionUpdate,
            onUserUpdate,
          })
          
          // 验证只有 onPermissionUpdate 被调用
          expect(onPermissionUpdate).toHaveBeenCalledTimes(1)
          expect(onPermissionUpdate).toHaveBeenCalledWith(eventData)
          expect(onAssignmentUpdate).not.toHaveBeenCalled()
          expect(onUserUpdate).not.toHaveBeenCalled()
        }),
        { numRuns: 50 }
      )
    })

    it('Property 1.12: 用户状态更新事件分发到正确的回调', () => {
      fc.assert(
        fc.property(userUpdateEventArbitrary, (eventData) => {
          // 创建 mock 回调
          const onAssignmentUpdate = vi.fn()
          const onPermissionUpdate = vi.fn()
          const onUserUpdate = vi.fn()
          
          // 分发事件
          dispatchEvent('user_update', eventData, {
            onAssignmentUpdate,
            onPermissionUpdate,
            onUserUpdate,
          })
          
          // 验证只有 onUserUpdate 被调用
          expect(onUserUpdate).toHaveBeenCalledTimes(1)
          expect(onUserUpdate).toHaveBeenCalledWith(eventData)
          expect(onAssignmentUpdate).not.toHaveBeenCalled()
          expect(onPermissionUpdate).not.toHaveBeenCalled()
        }),
        { numRuns: 50 }
      )
    })
  })

  describe('Property 1: 事件数据完整性', () => {
    /**
     * **Feature: unified-realtime-system, Property 1: 事件类型分发正确性**
     * **Validates: Requirements 1.1, 1.2**
     */
    
    it('Property 1.13: 事件数据在序列化和反序列化后保持完整', () => {
      // 测试所有事件类型
      const eventTypes = [
        { eventType: 'vehicle_update', arbitrary: vehicleUpdateEventArbitrary },
        { eventType: 'leave_update', arbitrary: leaveUpdateEventArbitrary },
        { eventType: 'piece_work_update', arbitrary: pieceWorkUpdateEventArbitrary },
        { eventType: 'assignment_update', arbitrary: assignmentUpdateEventArbitrary },
        { eventType: 'permission_update', arbitrary: permissionUpdateEventArbitrary },
        { eventType: 'user_update', arbitrary: userUpdateEventArbitrary },
      ]
      
      for (const { arbitrary } of eventTypes) {
        fc.assert(
          fc.property(arbitrary, (eventData) => {
            // 序列化
            const json = JSON.stringify(eventData)
            
            // 反序列化
            const parsed = JSON.parse(json)
            
            // 验证数据完整性
            expect(parsed).toEqual(eventData)
          }),
          { numRuns: 20 }
        )
      }
    })

    it('Property 1.14: 未注册的回调不会导致错误', () => {
      fc.assert(
        fc.property(vehicleUpdateEventArbitrary, (eventData) => {
          // 不注册任何回调
          const callbacks = {}
          
          // 分发事件不应该抛出错误
          expect(() => {
            dispatchEvent('vehicle_update', eventData, callbacks)
          }).not.toThrow()
        }),
        { numRuns: 50 }
      )
    })

    it('Property 1.15: 未知事件类型不会调用任何回调', () => {
      fc.assert(
        fc.property(
          fc.record({ test: fc.string() }),
          fc.string().filter(s => !['vehicle_update', 'leave_update', 'piece_work_update', 'assignment_update', 'permission_update', 'user_update'].includes(s)),
          (eventData, unknownType) => {
            // 创建所有 mock 回调
            const callbacks = {
              onVehicleUpdate: vi.fn(),
              onLeaveUpdate: vi.fn(),
              onPieceWorkUpdate: vi.fn(),
              onAssignmentUpdate: vi.fn(),
              onPermissionUpdate: vi.fn(),
              onUserUpdate: vi.fn(),
            }
            
            // 分发未知类型的事件
            dispatchEvent(unknownType, eventData, callbacks)
            
            // 验证没有任何回调被调用
            expect(callbacks.onVehicleUpdate).not.toHaveBeenCalled()
            expect(callbacks.onLeaveUpdate).not.toHaveBeenCalled()
            expect(callbacks.onPieceWorkUpdate).not.toHaveBeenCalled()
            expect(callbacks.onAssignmentUpdate).not.toHaveBeenCalled()
            expect(callbacks.onPermissionUpdate).not.toHaveBeenCalled()
            expect(callbacks.onUserUpdate).not.toHaveBeenCalled()
          }
        ),
        { numRuns: 50 }
      )
    })
  })
})
