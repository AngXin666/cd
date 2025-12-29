/**
 * 请假审批状态验证属性测试
 * 使用 fast-check 进行属性测试，验证请假审批状态变更的核心功能
 * @module utils/__tests__/leaveApprovalValidation.pbt.test
 *
 * **Feature: boss-missing-pages, Property 3: 请假审批状态变更**
 * **Validates: Requirements 3.4, 3.5**
 * 
 * 验证规则：
 * - 只有待审批状态的申请可以被审批
 * - 审批后状态必须正确更新为已通过或已拒绝
 * - 已审批的申请不能再次审批
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { LeaveStatus, LeaveType } from '@/api/types'
import {
  validateCanApprove,
  validateApprovalTarget,
  validateRejectRemark,
  executeApproval,
  validateApprovalResult,
  isFinalStatus,
  isPendingStatus,
  getStatusName,
  getAllLeaveStatuses,
  isValidLeaveStatus,
  VALID_APPROVAL_TARGETS,
  APPROVABLE_STATUS,
  type LeaveApplicationState,
  type ApprovalAction
} from '../validation/leaveApprovalValidation'

// ==================== 自定义生成器 ====================

/**
 * 生成有效的请假状态
 */
const leaveStatusArbitrary = fc.constantFrom(
  LeaveStatus.PENDING,
  LeaveStatus.APPROVED,
  LeaveStatus.REJECTED
)

/**
 * 生成待审批状态
 */
const pendingStatusArbitrary = fc.constant(LeaveStatus.PENDING)

/**
 * 生成终态状态（已批准或已拒绝）
 */
const finalStatusArbitrary = fc.constantFrom(
  LeaveStatus.APPROVED,
  LeaveStatus.REJECTED
)

/**
 * 生成有效的审批目标状态
 */
const validApprovalTargetArbitrary = fc.constantFrom(
  LeaveStatus.APPROVED,
  LeaveStatus.REJECTED
)

/**
 * 生成无效的审批目标状态（待审批不能作为目标）
 */
const invalidApprovalTargetArbitrary = fc.constant(LeaveStatus.PENDING)

/**
 * 生成请假类型
 */
const leaveTypeArbitrary = fc.constantFrom(
  LeaveType.LEAVE,
  LeaveType.RESIGN
)

/**
 * 生成正整数 ID
 */
const positiveIdArbitrary = fc.integer({ min: 1, max: 1000000 })

/**
 * 生成请假申请状态
 */
const leaveApplicationArbitrary = fc.record({
  id: positiveIdArbitrary,
  status: leaveStatusArbitrary,
  leaveType: leaveTypeArbitrary,
  userId: positiveIdArbitrary
}) as fc.Arbitrary<LeaveApplicationState>

/**
 * 生成待审批的请假申请
 */
const pendingApplicationArbitrary = fc.record({
  id: positiveIdArbitrary,
  status: pendingStatusArbitrary,
  leaveType: leaveTypeArbitrary,
  userId: positiveIdArbitrary
}) as fc.Arbitrary<LeaveApplicationState>

/**
 * 生成已审批的请假申请（终态）
 */
const finalApplicationArbitrary = fc.record({
  id: positiveIdArbitrary,
  status: finalStatusArbitrary,
  leaveType: leaveTypeArbitrary,
  userId: positiveIdArbitrary
}) as fc.Arbitrary<LeaveApplicationState>

/**
 * 生成有效的备注（非空白字符串或 undefined）
 * 注意：验证函数拒绝只包含空白字符的备注
 */
const validRemarkArbitrary = fc.oneof(
  fc.constant(undefined),
  fc.constant(''),
  fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0)
)

/**
 * 生成有效的审批操作
 * 注意：remark 不能只包含空白字符（验证函数会拒绝）
 */
const validApprovalActionArbitrary = fc.record({
  targetStatus: validApprovalTargetArbitrary,
  remark: validRemarkArbitrary
}) as fc.Arbitrary<ApprovalAction>

/**
 * 生成批准操作
 */
const approveActionArbitrary = fc.record({
  targetStatus: fc.constant(LeaveStatus.APPROVED),
  remark: fc.option(fc.string({ minLength: 0, maxLength: 200 }), { nil: undefined })
}) as fc.Arbitrary<ApprovalAction>

/**
 * 生成拒绝操作
 */
const rejectActionArbitrary = fc.record({
  targetStatus: fc.constant(LeaveStatus.REJECTED),
  remark: fc.option(fc.string({ minLength: 0, maxLength: 200 }), { nil: undefined })
}) as fc.Arbitrary<ApprovalAction>

/**
 * 生成非空白备注
 */
const nonEmptyRemarkArbitrary = fc.string({ minLength: 1, maxLength: 200 })
  .filter(s => s.trim().length > 0)

/**
 * 生成只包含空白字符的备注（用于测试无效情况）
 */
const whitespaceOnlyRemarkArbitrary = fc.stringOf(fc.constantFrom(' ', '\t', '\n'))
  .filter(s => s.length > 0)

// ==================== 属性测试 ====================

describe('请假审批状态验证属性测试', () => {
  /**
   * **Feature: boss-missing-pages, Property 3: 请假审批状态变更**
   * **Validates: Requirements 3.4, 3.5**
   */
  describe('Property 3: 请假审批状态变更', () => {
    
    it('Property 3.1: 待审批状态的申请可以被审批', () => {
      /**
       * 属性：对于任意待审批状态的申请，
       * validateCanApprove 应该返回 { valid: true }
       * 
       * **Feature: boss-missing-pages, Property 3: 请假审批状态变更**
       * **Validates: Requirements 3.3**
       */
      fc.assert(
        fc.property(pendingStatusArbitrary, (status) => {
          const result = validateCanApprove(status)
          
          // 待审批状态应该可以被审批
          expect(result.valid).toBe(true)
          expect(result.error).toBeUndefined()
        }),
        { numRuns: 100 }
      )
    })

    it('Property 3.2: 已审批状态的申请不能再次审批', () => {
      /**
       * 属性：对于任意终态（已批准或已拒绝）的申请，
       * validateCanApprove 应该返回 { valid: false }
       * 
       * **Feature: boss-missing-pages, Property 3: 请假审批状态变更**
       * **Validates: Requirements 3.3**
       */
      fc.assert(
        fc.property(finalStatusArbitrary, (status) => {
          const result = validateCanApprove(status)
          
          // 终态不能再次审批
          expect(result.valid).toBe(false)
          expect(result.error).toBeDefined()
        }),
        { numRuns: 100 }
      )
    })

    it('Property 3.3: 有效的审批目标状态验证通过', () => {
      /**
       * 属性：对于任意有效的审批目标状态（已批准或已拒绝），
       * validateApprovalTarget 应该返回 { valid: true }
       * 
       * **Feature: boss-missing-pages, Property 3: 请假审批状态变更**
       * **Validates: Requirements 3.4, 3.5**
       */
      fc.assert(
        fc.property(validApprovalTargetArbitrary, (targetStatus) => {
          const result = validateApprovalTarget(targetStatus)
          
          // 有效目标状态应该验证通过
          expect(result.valid).toBe(true)
          expect(result.error).toBeUndefined()
        }),
        { numRuns: 100 }
      )
    })

    it('Property 3.4: 无效的审批目标状态验证失败', () => {
      /**
       * 属性：对于无效的审批目标状态（待审批），
       * validateApprovalTarget 应该返回 { valid: false }
       * 
       * **Feature: boss-missing-pages, Property 3: 请假审批状态变更**
       * **Validates: Requirements 3.4, 3.5**
       */
      fc.assert(
        fc.property(invalidApprovalTargetArbitrary, (targetStatus) => {
          const result = validateApprovalTarget(targetStatus)
          
          // 无效目标状态应该验证失败
          expect(result.valid).toBe(false)
          expect(result.error).toBeDefined()
        }),
        { numRuns: 100 }
      )
    })

    it('Property 3.5: 审批待审批申请后状态正确更新', () => {
      /**
       * 核心属性：对于任意待审批的申请和有效的审批操作，
       * 执行审批后，新状态应该等于目标状态
       * 
       * **Feature: boss-missing-pages, Property 3: 请假审批状态变更**
       * **Validates: Requirements 3.4, 3.5**
       */
      fc.assert(
        fc.property(
          pendingApplicationArbitrary,
          validApprovalActionArbitrary,
          (application, action) => {
            const result = executeApproval(application, action)
            
            // 审批应该成功
            expect(result.success).toBe(true)
            // 新状态应该等于目标状态
            expect(result.newStatus).toBe(action.targetStatus)
            // 不应该有错误
            expect(result.error).toBeUndefined()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('Property 3.6: 审批已审批申请应该失败', () => {
      /**
       * 属性：对于任意已审批的申请（终态），
       * 执行审批应该失败，状态保持不变
       * 
       * **Feature: boss-missing-pages, Property 3: 请假审批状态变更**
       * **Validates: Requirements 3.3**
       */
      fc.assert(
        fc.property(
          finalApplicationArbitrary,
          validApprovalActionArbitrary,
          (application, action) => {
            const originalStatus = application.status
            const result = executeApproval(application, action)
            
            // 审批应该失败
            expect(result.success).toBe(false)
            // 状态应该保持不变
            expect(result.newStatus).toBe(originalStatus)
            // 应该有错误信息
            expect(result.error).toBeDefined()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('Property 3.7: 批准操作后状态为已批准', () => {
      /**
       * 属性：对于任意待审批的申请，执行批准操作后，
       * 状态应该变为已批准
       * 
       * **Feature: boss-missing-pages, Property 3: 请假审批状态变更**
       * **Validates: Requirements 3.4**
       */
      fc.assert(
        fc.property(
          pendingApplicationArbitrary,
          approveActionArbitrary,
          (application, action) => {
            const result = executeApproval(application, action)
            
            // 审批应该成功
            expect(result.success).toBe(true)
            // 状态应该为已批准
            expect(result.newStatus).toBe(LeaveStatus.APPROVED)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('Property 3.8: 拒绝操作后状态为已拒绝', () => {
      /**
       * 属性：对于任意待审批的申请，执行拒绝操作后，
       * 状态应该变为已拒绝
       * 
       * **Feature: boss-missing-pages, Property 3: 请假审批状态变更**
       * **Validates: Requirements 3.5**
       */
      fc.assert(
        fc.property(
          pendingApplicationArbitrary,
          rejectActionArbitrary,
          (application, action) => {
            const result = executeApproval(application, action)
            
            // 审批应该成功
            expect(result.success).toBe(true)
            // 状态应该为已拒绝
            expect(result.newStatus).toBe(LeaveStatus.REJECTED)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('Property 3.9: 审批结果验证的一致性', () => {
      /**
       * 属性：对于任意审批操作，
       * validateApprovalResult 应该正确验证结果状态
       * 
       * **Feature: boss-missing-pages, Property 3: 请假审批状态变更**
       * **Validates: Requirements 3.4, 3.5**
       */
      fc.assert(
        fc.property(
          pendingApplicationArbitrary,
          validApprovalActionArbitrary,
          (application, action) => {
            const result = executeApproval(application, action)
            
            // 验证结果应该一致
            const validation = validateApprovalResult(
              application.status,
              action.targetStatus,
              result.newStatus
            )
            
            expect(validation.valid).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('Property 3.10: 状态变更的幂等性检验', () => {
      /**
       * 属性：对于已审批的申请，再次尝试审批不会改变状态
       * 这验证了系统的幂等性
       * 
       * **Feature: boss-missing-pages, Property 3: 请假审批状态变更**
       * **Validates: Requirements 3.3**
       */
      fc.assert(
        fc.property(
          finalApplicationArbitrary,
          validApprovalActionArbitrary,
          validApprovalActionArbitrary,
          (application, action1, action2) => {
            // 第一次尝试审批
            const result1 = executeApproval(application, action1)
            // 第二次尝试审批
            const result2 = executeApproval(application, action2)
            
            // 两次都应该失败
            expect(result1.success).toBe(false)
            expect(result2.success).toBe(false)
            // 状态应该保持不变
            expect(result1.newStatus).toBe(application.status)
            expect(result2.newStatus).toBe(application.status)
          }
        ),
        { numRuns: 50 }
      )
    })
  })
})

describe('状态辅助函数属性测试', () => {
  /**
   * 状态辅助函数的属性测试
   */
  
  it('isFinalStatus 和 isPendingStatus 互斥', () => {
    /**
     * 属性：对于任意状态，isFinalStatus 和 isPendingStatus 不能同时为 true
     */
    fc.assert(
      fc.property(leaveStatusArbitrary, (status) => {
        const isFinal = isFinalStatus(status)
        const isPending = isPendingStatus(status)
        
        // 不能同时为 true
        expect(isFinal && isPending).toBe(false)
      }),
      { numRuns: 100 }
    )
  })

  it('所有状态要么是终态要么是待审批', () => {
    /**
     * 属性：对于任意有效状态，要么是终态，要么是待审批
     */
    fc.assert(
      fc.property(leaveStatusArbitrary, (status) => {
        const isFinal = isFinalStatus(status)
        const isPending = isPendingStatus(status)
        
        // 必须是其中之一
        expect(isFinal || isPending).toBe(true)
      }),
      { numRuns: 100 }
    )
  })

  it('getStatusName 返回非空字符串', () => {
    /**
     * 属性：对于任意有效状态，getStatusName 应该返回非空字符串
     */
    fc.assert(
      fc.property(leaveStatusArbitrary, (status) => {
        const name = getStatusName(status)
        
        expect(typeof name).toBe('string')
        expect(name.length).toBeGreaterThan(0)
      }),
      { numRuns: 100 }
    )
  })

  it('getAllLeaveStatuses 包含所有有效状态', () => {
    /**
     * 属性：getAllLeaveStatuses 应该包含所有有效状态
     */
    const allStatuses = getAllLeaveStatuses()
    
    expect(allStatuses).toContain(LeaveStatus.PENDING)
    expect(allStatuses).toContain(LeaveStatus.APPROVED)
    expect(allStatuses).toContain(LeaveStatus.REJECTED)
    expect(allStatuses.length).toBe(3)
  })

  it('isValidLeaveStatus 正确识别有效状态', () => {
    /**
     * 属性：对于任意有效状态，isValidLeaveStatus 应该返回 true
     */
    fc.assert(
      fc.property(leaveStatusArbitrary, (status) => {
        expect(isValidLeaveStatus(status)).toBe(true)
      }),
      { numRuns: 100 }
    )
  })

  it('isValidLeaveStatus 正确拒绝无效状态', () => {
    /**
     * 属性：对于任意无效状态字符串，isValidLeaveStatus 应该返回 false
     */
    fc.assert(
      fc.property(
        fc.string().filter(s => !['pending', 'approved', 'rejected'].includes(s)),
        (invalidStatus) => {
          expect(isValidLeaveStatus(invalidStatus)).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })
})

describe('拒绝备注验证属性测试', () => {
  /**
   * 拒绝备注验证的属性测试
   * **Validates: Requirements 3.5**
   */
  
  it('批准操作不需要验证备注', () => {
    /**
     * 属性：对于批准操作，任何备注都应该验证通过
     */
    fc.assert(
      fc.property(
        fc.option(fc.string(), { nil: undefined }),
        (remark) => {
          const result = validateRejectRemark(LeaveStatus.APPROVED, remark)
          
          expect(result.valid).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('拒绝操作允许空备注', () => {
    /**
     * 属性：拒绝操作时，空备注（undefined 或空字符串）应该验证通过
     */
    // undefined 备注
    const result1 = validateRejectRemark(LeaveStatus.REJECTED, undefined)
    expect(result1.valid).toBe(true)
    
    // 空字符串备注
    const result2 = validateRejectRemark(LeaveStatus.REJECTED, '')
    expect(result2.valid).toBe(true)
  })

  it('拒绝操作允许非空备注', () => {
    /**
     * 属性：拒绝操作时，非空备注应该验证通过
     */
    fc.assert(
      fc.property(nonEmptyRemarkArbitrary, (remark) => {
        const result = validateRejectRemark(LeaveStatus.REJECTED, remark)
        
        expect(result.valid).toBe(true)
      }),
      { numRuns: 100 }
    )
  })
})

describe('审批操作完整流程属性测试', () => {
  /**
   * 审批操作完整流程的属性测试
   * **Feature: boss-missing-pages, Property 3: 请假审批状态变更**
   * **Validates: Requirements 3.4, 3.5**
   */
  
  it('完整审批流程：待审批 -> 已批准', () => {
    /**
     * 属性：对于任意待审批申请，批准后状态应该变为已批准
     */
    fc.assert(
      fc.property(
        pendingApplicationArbitrary,
        fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
        (application, remark) => {
          const action: ApprovalAction = {
            targetStatus: LeaveStatus.APPROVED,
            remark
          }
          
          const result = executeApproval(application, action)
          
          // 验证结果
          expect(result.success).toBe(true)
          expect(result.newStatus).toBe(LeaveStatus.APPROVED)
          
          // 验证状态变更正确性
          const validation = validateApprovalResult(
            application.status,
            action.targetStatus,
            result.newStatus
          )
          expect(validation.valid).toBe(true)
        }
      ),
      { numRuns: 50 }
    )
  })

  it('完整审批流程：待审批 -> 已拒绝', () => {
    /**
     * 属性：对于任意待审批申请，拒绝后状态应该变为已拒绝
     * 
     * 注意：remark 需要过滤掉只包含空白字符的情况，
     * 因为业务逻辑要求拒绝备注不能只包含空白字符
     */
    // 生成有效的 remark：undefined 或非空白字符串
    const validRemarkArbitrary = fc.option(
      fc.string({ maxLength: 200 }).filter(s => s === '' || s.trim() !== ''),
      { nil: undefined }
    )
    
    fc.assert(
      fc.property(
        pendingApplicationArbitrary,
        validRemarkArbitrary,
        (application, remark) => {
          const action: ApprovalAction = {
            targetStatus: LeaveStatus.REJECTED,
            remark
          }
          
          const result = executeApproval(application, action)
          
          // 验证结果
          expect(result.success).toBe(true)
          expect(result.newStatus).toBe(LeaveStatus.REJECTED)
          
          // 验证状态变更正确性
          const validation = validateApprovalResult(
            application.status,
            action.targetStatus,
            result.newStatus
          )
          expect(validation.valid).toBe(true)
        }
      ),
      { numRuns: 50 }
    )
  })

  it('审批操作的确定性', () => {
    /**
     * 属性：对于相同的输入，审批操作应该产生相同的结果
     */
    fc.assert(
      fc.property(
        leaveApplicationArbitrary,
        validApprovalActionArbitrary,
        (application, action) => {
          // 执行两次相同的操作
          const result1 = executeApproval(application, action)
          const result2 = executeApproval(application, action)
          
          // 结果应该相同
          expect(result1.success).toBe(result2.success)
          expect(result1.newStatus).toBe(result2.newStatus)
          expect(result1.error).toBe(result2.error)
        }
      ),
      { numRuns: 50 }
    )
  })
})
