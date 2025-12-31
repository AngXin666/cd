/**
 * API 请求错误处理测试
 * 测试 403 权限错误的处理逻辑，包括新旧格式的兼容性
 * 
 * **Feature: permission-system-optimization, Task 12.1: 前端错误处理单元测试**
 * **Validates: Requirements 5.1, 5.2, 5.3, 5.4**
 * 
 * @module api/__tests__/request-error-handling.test
 */
import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'

/**
 * 权限错误代码枚举
 * 与后端 PermissionErrorCode 保持一致
 */
const PermissionErrorCode = {
  /** 用户已被禁用 */
  USER_DISABLED: 'user_disabled',
  /** 角色权限不足 */
  ROLE_INSUFFICIENT: 'role_insufficient',
  /** 资源不属于当前用户 */
  RESOURCE_NOT_OWNED: 'resource_not_owned',
  /** 无权访问该仓库 */
  WAREHOUSE_NOT_ACCESSIBLE: 'warehouse_not_accessible',
  /** 需要老板权限 */
  HIGH_ROLE_OPERATION: 'high_role_operation',
} as const

type PermissionErrorCodeType = typeof PermissionErrorCode[keyof typeof PermissionErrorCode]

/**
 * 权限错误详情接口（新格式）
 */
interface PermissionErrorDetail {
  error_code: string
  message: string
}

/**
 * 错误响应接口（新格式）
 */
interface ErrorResponseNew {
  detail: PermissionErrorDetail
}

/**
 * 错误响应接口（旧格式）
 */
interface ErrorResponseLegacy {
  detail: string
}

/**
 * 错误处理结果
 */
interface ErrorHandlingResult {
  /** 是否需要强制登出 */
  shouldLogout: boolean
  /** 是否需要显示模态框 */
  shouldShowModal: boolean
  /** 是否需要显示 Toast */
  shouldShowToast: boolean
  /** 错误信息 */
  errorMessage: string
  /** 错误代码 */
  errorCode: string
}

/**
 * 解析 403 错误响应（纯函数版本）
 * 这是核心业务逻辑的纯函数实现，用于属性测试
 * 
 * @param responseData - 响应数据
 * @returns 错误处理结果
 */
function parse403Error(responseData: unknown): ErrorHandlingResult {
  let errorCode = ''
  let errorMessage = '权限不足'
  
  // 尝试解析新格式（包含 error_code）
  const errorDataNew = responseData as ErrorResponseNew
  if (errorDataNew?.detail && typeof errorDataNew.detail === 'object') {
    errorCode = errorDataNew.detail.error_code || ''
    errorMessage = errorDataNew.detail.message || '权限不足'
  } else {
    // 旧格式（字符串）
    const errorDataLegacy = responseData as ErrorResponseLegacy
    errorMessage = errorDataLegacy?.detail || '权限不足'
    
    // 兼容旧格式：检查是否是用户被禁用
    if (errorMessage === '用户已被禁用') {
      errorCode = PermissionErrorCode.USER_DISABLED
    }
  }
  
  // 根据错误代码确定处理方式
  let shouldLogout = false
  let shouldShowModal = false
  let shouldShowToast = false
  
  switch (errorCode) {
    case PermissionErrorCode.USER_DISABLED:
      shouldLogout = true
      shouldShowModal = true
      break
      
    case PermissionErrorCode.RESOURCE_NOT_OWNED:
    case PermissionErrorCode.WAREHOUSE_NOT_ACCESSIBLE:
    case PermissionErrorCode.ROLE_INSUFFICIENT:
    case PermissionErrorCode.HIGH_ROLE_OPERATION:
      shouldShowToast = true
      break
      
    default:
      // 未知错误代码或旧格式
      shouldShowToast = true
  }
  
  return {
    shouldLogout,
    shouldShowModal,
    shouldShowToast,
    errorMessage,
    errorCode,
  }
}

// ==================== Arbitrary 定义 ====================

/**
 * 生成有效错误代码的 Arbitrary
 */
const errorCodeArb: fc.Arbitrary<PermissionErrorCodeType> = fc.constantFrom(
  PermissionErrorCode.USER_DISABLED,
  PermissionErrorCode.ROLE_INSUFFICIENT,
  PermissionErrorCode.RESOURCE_NOT_OWNED,
  PermissionErrorCode.WAREHOUSE_NOT_ACCESSIBLE,
  PermissionErrorCode.HIGH_ROLE_OPERATION
)

/**
 * 生成错误消息的 Arbitrary
 */
const errorMessageArb = fc.string({ minLength: 1, maxLength: 100 })
  .filter(s => s.trim().length > 0)

/**
 * 生成新格式错误响应的 Arbitrary
 */
const newFormatErrorArb = (
  errorCode?: PermissionErrorCodeType,
  message?: string
): fc.Arbitrary<ErrorResponseNew> => {
  return fc.record({
    detail: fc.record({
      error_code: errorCode !== undefined ? fc.constant(errorCode) : errorCodeArb,
      message: message !== undefined ? fc.constant(message) : errorMessageArb,
    })
  })
}

/**
 * 生成旧格式错误响应的 Arbitrary
 */
const legacyFormatErrorArb = (
  message?: string
): fc.Arbitrary<ErrorResponseLegacy> => {
  return fc.record({
    detail: message !== undefined ? fc.constant(message) : errorMessageArb,
  })
}

// ==================== 属性测试 ====================

describe('403 错误处理属性测试', () => {
  /**
   * Property 1: 新格式错误响应正确解析
   * *For any* 新格式错误响应，应正确提取 error_code 和 message
   * **Validates: Requirements 5.1**
   */
  describe('Property 1: 新格式错误响应解析', () => {
    it('应正确提取 error_code', () => {
      fc.assert(
        fc.property(
          errorCodeArb,
          errorMessageArb,
          (errorCode, message) => {
            const response: ErrorResponseNew = {
              detail: { error_code: errorCode, message }
            }
            
            const result = parse403Error(response)
            
            return result.errorCode === errorCode
          }
        ),
        { numRuns: 100 }
      )
    })

    it('应正确提取 message', () => {
      fc.assert(
        fc.property(
          errorCodeArb,
          errorMessageArb,
          (errorCode, message) => {
            const response: ErrorResponseNew = {
              detail: { error_code: errorCode, message }
            }
            
            const result = parse403Error(response)
            
            return result.errorMessage === message
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Property 2: 旧格式错误响应向后兼容
   * *For any* 旧格式错误响应，应正确提取 message
   * **Validates: Requirements 5.4**
   */
  describe('Property 2: 旧格式错误响应兼容', () => {
    it('应正确提取字符串格式的 detail', () => {
      fc.assert(
        fc.property(
          errorMessageArb.filter(m => m !== '用户已被禁用'),
          (message) => {
            const response: ErrorResponseLegacy = { detail: message }
            
            const result = parse403Error(response)
            
            return result.errorMessage === message
          }
        ),
        { numRuns: 100 }
      )
    })

    it('旧格式"用户已被禁用"应识别为 USER_DISABLED', () => {
      const response: ErrorResponseLegacy = { detail: '用户已被禁用' }
      
      const result = parse403Error(response)
      
      expect(result.errorCode).toBe(PermissionErrorCode.USER_DISABLED)
      expect(result.shouldLogout).toBe(true)
      expect(result.shouldShowModal).toBe(true)
    })
  })

  /**
   * Property 3: USER_DISABLED 错误触发强制登出
   * *For any* USER_DISABLED 错误，应触发登出和模态框
   * **Validates: Requirements 5.2**
   */
  describe('Property 3: USER_DISABLED 处理', () => {
    it('应触发强制登出', () => {
      fc.assert(
        fc.property(
          errorMessageArb,
          (message) => {
            const response: ErrorResponseNew = {
              detail: {
                error_code: PermissionErrorCode.USER_DISABLED,
                message
              }
            }
            
            const result = parse403Error(response)
            
            return result.shouldLogout === true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('应显示模态框', () => {
      fc.assert(
        fc.property(
          errorMessageArb,
          (message) => {
            const response: ErrorResponseNew = {
              detail: {
                error_code: PermissionErrorCode.USER_DISABLED,
                message
              }
            }
            
            const result = parse403Error(response)
            
            return result.shouldShowModal === true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('不应显示 Toast', () => {
      fc.assert(
        fc.property(
          errorMessageArb,
          (message) => {
            const response: ErrorResponseNew = {
              detail: {
                error_code: PermissionErrorCode.USER_DISABLED,
                message
              }
            }
            
            const result = parse403Error(response)
            
            return result.shouldShowToast === false
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Property 4: 资源访问错误显示 Toast
   * *For any* RESOURCE_NOT_OWNED 或 WAREHOUSE_NOT_ACCESSIBLE 错误，应显示 Toast
   * **Validates: Requirements 5.3**
   */
  describe('Property 4: 资源访问错误处理', () => {
    const resourceErrorCodes: PermissionErrorCodeType[] = [
      PermissionErrorCode.RESOURCE_NOT_OWNED,
      PermissionErrorCode.WAREHOUSE_NOT_ACCESSIBLE,
    ]

    it('应显示 Toast', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...resourceErrorCodes),
          errorMessageArb,
          (errorCode, message) => {
            const response: ErrorResponseNew = {
              detail: { error_code: errorCode, message }
            }
            
            const result = parse403Error(response)
            
            return result.shouldShowToast === true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('不应触发登出', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...resourceErrorCodes),
          errorMessageArb,
          (errorCode, message) => {
            const response: ErrorResponseNew = {
              detail: { error_code: errorCode, message }
            }
            
            const result = parse403Error(response)
            
            return result.shouldLogout === false
          }
        ),
        { numRuns: 100 }
      )
    })

    it('不应显示模态框', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...resourceErrorCodes),
          errorMessageArb,
          (errorCode, message) => {
            const response: ErrorResponseNew = {
              detail: { error_code: errorCode, message }
            }
            
            const result = parse403Error(response)
            
            return result.shouldShowModal === false
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Property 5: 角色权限错误显示 Toast
   * *For any* ROLE_INSUFFICIENT 或 HIGH_ROLE_OPERATION 错误，应显示 Toast
   * **Validates: Requirements 5.3**
   */
  describe('Property 5: 角色权限错误处理', () => {
    const roleErrorCodes: PermissionErrorCodeType[] = [
      PermissionErrorCode.ROLE_INSUFFICIENT,
      PermissionErrorCode.HIGH_ROLE_OPERATION,
    ]

    it('应显示 Toast', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...roleErrorCodes),
          errorMessageArb,
          (errorCode, message) => {
            const response: ErrorResponseNew = {
              detail: { error_code: errorCode, message }
            }
            
            const result = parse403Error(response)
            
            return result.shouldShowToast === true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('不应触发登出', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...roleErrorCodes),
          errorMessageArb,
          (errorCode, message) => {
            const response: ErrorResponseNew = {
              detail: { error_code: errorCode, message }
            }
            
            const result = parse403Error(response)
            
            return result.shouldLogout === false
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Property 6: 未知错误代码的默认处理
   * *For any* 未知错误代码，应显示 Toast
   */
  describe('Property 6: 未知错误代码处理', () => {
    it('应显示 Toast', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 })
            .filter(s => !Object.values(PermissionErrorCode).includes(s as PermissionErrorCodeType)),
          errorMessageArb,
          (unknownCode, message) => {
            const response: ErrorResponseNew = {
              detail: { error_code: unknownCode, message }
            }
            
            const result = parse403Error(response)
            
            return result.shouldShowToast === true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('不应触发登出', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 })
            .filter(s => !Object.values(PermissionErrorCode).includes(s as PermissionErrorCodeType)),
          errorMessageArb,
          (unknownCode, message) => {
            const response: ErrorResponseNew = {
              detail: { error_code: unknownCode, message }
            }
            
            const result = parse403Error(response)
            
            return result.shouldLogout === false
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Property 7: 空响应的默认处理
   * *For any* 空或无效响应，应使用默认错误信息
   */
  describe('Property 7: 空响应处理', () => {
    it('null 响应应使用默认错误信息', () => {
      const result = parse403Error(null)
      
      expect(result.errorMessage).toBe('权限不足')
      expect(result.shouldShowToast).toBe(true)
    })

    it('undefined 响应应使用默认错误信息', () => {
      const result = parse403Error(undefined)
      
      expect(result.errorMessage).toBe('权限不足')
      expect(result.shouldShowToast).toBe(true)
    })

    it('空对象响应应使用默认错误信息', () => {
      const result = parse403Error({})
      
      expect(result.errorMessage).toBe('权限不足')
      expect(result.shouldShowToast).toBe(true)
    })
  })
})

// ==================== 示例测试 ====================

describe('403 错误处理示例测试', () => {
  describe('新格式错误响应', () => {
    it('USER_DISABLED 错误应触发登出', () => {
      const response: ErrorResponseNew = {
        detail: {
          error_code: 'user_disabled',
          message: '您的账号已被管理员禁用'
        }
      }
      
      const result = parse403Error(response)
      
      expect(result.errorCode).toBe('user_disabled')
      expect(result.errorMessage).toBe('您的账号已被管理员禁用')
      expect(result.shouldLogout).toBe(true)
      expect(result.shouldShowModal).toBe(true)
      expect(result.shouldShowToast).toBe(false)
    })

    it('RESOURCE_NOT_OWNED 错误应显示 Toast', () => {
      const response: ErrorResponseNew = {
        detail: {
          error_code: 'resource_not_owned',
          message: '您无权访问此车辆'
        }
      }
      
      const result = parse403Error(response)
      
      expect(result.errorCode).toBe('resource_not_owned')
      expect(result.errorMessage).toBe('您无权访问此车辆')
      expect(result.shouldLogout).toBe(false)
      expect(result.shouldShowModal).toBe(false)
      expect(result.shouldShowToast).toBe(true)
    })

    it('WAREHOUSE_NOT_ACCESSIBLE 错误应显示 Toast', () => {
      const response: ErrorResponseNew = {
        detail: {
          error_code: 'warehouse_not_accessible',
          message: '您无权访问此仓库的数据'
        }
      }
      
      const result = parse403Error(response)
      
      expect(result.errorCode).toBe('warehouse_not_accessible')
      expect(result.errorMessage).toBe('您无权访问此仓库的数据')
      expect(result.shouldLogout).toBe(false)
      expect(result.shouldShowToast).toBe(true)
    })

    it('ROLE_INSUFFICIENT 错误应显示 Toast', () => {
      const response: ErrorResponseNew = {
        detail: {
          error_code: 'role_insufficient',
          message: '您的角色权限不足'
        }
      }
      
      const result = parse403Error(response)
      
      expect(result.errorCode).toBe('role_insufficient')
      expect(result.errorMessage).toBe('您的角色权限不足')
      expect(result.shouldLogout).toBe(false)
      expect(result.shouldShowToast).toBe(true)
    })

    it('HIGH_ROLE_OPERATION 错误应显示 Toast', () => {
      const response: ErrorResponseNew = {
        detail: {
          error_code: 'high_role_operation',
          message: '只有老板可以执行此操作'
        }
      }
      
      const result = parse403Error(response)
      
      expect(result.errorCode).toBe('high_role_operation')
      expect(result.errorMessage).toBe('只有老板可以执行此操作')
      expect(result.shouldLogout).toBe(false)
      expect(result.shouldShowToast).toBe(true)
    })
  })

  describe('旧格式错误响应（向后兼容）', () => {
    it('字符串格式的错误信息应正确解析', () => {
      const response: ErrorResponseLegacy = {
        detail: '权限不足，无法访问'
      }
      
      const result = parse403Error(response)
      
      expect(result.errorCode).toBe('')
      expect(result.errorMessage).toBe('权限不足，无法访问')
      expect(result.shouldShowToast).toBe(true)
    })

    it('"用户已被禁用"应识别为 USER_DISABLED', () => {
      const response: ErrorResponseLegacy = {
        detail: '用户已被禁用'
      }
      
      const result = parse403Error(response)
      
      expect(result.errorCode).toBe('user_disabled')
      expect(result.shouldLogout).toBe(true)
      expect(result.shouldShowModal).toBe(true)
    })
  })

  describe('边界情况', () => {
    it('空 detail 应使用默认错误信息', () => {
      const response = { detail: '' }
      
      const result = parse403Error(response)
      
      expect(result.errorMessage).toBe('权限不足')
    })

    it('detail 为 null 应使用默认错误信息', () => {
      const response = { detail: null }
      
      const result = parse403Error(response)
      
      expect(result.errorMessage).toBe('权限不足')
    })

    it('新格式但 message 为空应使用默认错误信息', () => {
      const response: ErrorResponseNew = {
        detail: {
          error_code: 'resource_not_owned',
          message: ''
        }
      }
      
      const result = parse403Error(response)
      
      expect(result.errorMessage).toBe('权限不足')
    })
  })
})
