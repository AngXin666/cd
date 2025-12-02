/**
 * 权限上下文API
 * 用于获取用户登录后的权限信息和管辖范围
 */

import {supabase} from '@/client/supabase'
import type {PermissionContext, PermissionContextResponse} from '@/types/permission-context'

/**
 * 获取用户权限上下文
 * @param userId 用户ID
 * @returns 权限上下文
 */
export async function getPermissionContext(userId: string): Promise<PermissionContextResponse> {
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🔐 [权限上下文] 开始获取用户权限上下文')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('  📋 用户ID:', userId)

    const {data, error} = await supabase.rpc('get_permission_context', {
      p_user_id: userId
    })

    if (error) {
      console.error('  ❌ 获取权限上下文失败:', error)
      return {
        success: false,
        context: null,
        error: error.message
      }
    }

    if (!data) {
      console.error('  ❌ 权限上下文数据为空')
      return {
        success: false,
        context: null,
        error: '权限上下文数据为空'
      }
    }

    console.log('  ✅ 权限上下文获取成功')
    console.log('  📊 权限模式:', data.context?.mode)
    console.log('  📊 权限级别:', data.context?.level)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    return {
      success: data.success,
      context: data.context as PermissionContext,
      error: data.error
    }
  } catch (error) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.error('❌ [权限上下文] 获取权限上下文异常:', error)
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    return {
      success: false,
      context: null,
      error: error instanceof Error ? error.message : '获取权限上下文异常'
    }
  }
}

/**
 * 获取司机权限上下文
 * @param driverId 司机ID
 * @returns 司机权限上下文
 */
export async function getDriverPermissionContext(driverId: string): Promise<PermissionContextResponse> {
  try {
    const {data, error} = await supabase.rpc('get_driver_permission_context', {
      p_driver_id: driverId
    })

    if (error) {
      console.error('获取司机权限上下文失败:', error)
      return {
        success: false,
        context: null,
        error: error.message
      }
    }

    return {
      success: data.success,
      context: data.context as PermissionContext,
      error: data.error
    }
  } catch (error) {
    console.error('获取司机权限上下文异常:', error)
    return {
      success: false,
      context: null,
      error: error instanceof Error ? error.message : '获取司机权限上下文异常'
    }
  }
}

/**
 * 获取车队长权限上下文
 * @param managerId 车队长ID
 * @returns 车队长权限上下文
 */
export async function getManagerPermissionContext(managerId: string): Promise<PermissionContextResponse> {
  try {
    const {data, error} = await supabase.rpc('get_manager_permission_context', {
      p_manager_id: managerId
    })

    if (error) {
      console.error('获取车队长权限上下文失败:', error)
      return {
        success: false,
        context: null,
        error: error.message
      }
    }

    return {
      success: data.success,
      context: data.context as PermissionContext,
      error: data.error
    }
  } catch (error) {
    console.error('获取车队长权限上下文异常:', error)
    return {
      success: false,
      context: null,
      error: error instanceof Error ? error.message : '获取车队长权限上下文异常'
    }
  }
}

/**
 * 获取调度权限上下文
 * @param schedulerId 调度ID
 * @returns 调度权限上下文
 */
export async function getSchedulerPermissionContext(schedulerId: string): Promise<PermissionContextResponse> {
  try {
    const {data, error} = await supabase.rpc('get_scheduler_permission_context', {
      p_scheduler_id: schedulerId
    })

    if (error) {
      console.error('获取调度权限上下文失败:', error)
      return {
        success: false,
        context: null,
        error: error.message
      }
    }

    return {
      success: data.success,
      context: data.context as PermissionContext,
      error: data.error
    }
  } catch (error) {
    console.error('获取调度权限上下文异常:', error)
    return {
      success: false,
      context: null,
      error: error instanceof Error ? error.message : '获取调度权限上下文异常'
    }
  }
}

/**
 * 获取老板/平级管理员权限上下文
 * @param adminId 老板/平级管理员ID
 * @returns 老板/平级管理员权限上下文
 */
export async function getAdminPermissionContext(adminId: string): Promise<PermissionContextResponse> {
  try {
    const {data, error} = await supabase.rpc('get_admin_permission_context', {
      p_admin_id: adminId
    })

    if (error) {
      console.error('获取老板/平级管理员权限上下文失败:', error)
      return {
        success: false,
        context: null,
        error: error.message
      }
    }

    return {
      success: data.success,
      context: data.context as PermissionContext,
      error: data.error
    }
  } catch (error) {
    console.error('获取老板/平级管理员权限上下文异常:', error)
    return {
      success: false,
      context: null,
      error: error instanceof Error ? error.message : '获取老板/平级管理员权限上下文异常'
    }
  }
}
