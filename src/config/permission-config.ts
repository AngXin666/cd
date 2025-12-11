/**
 * 应用层权限控制配置
 * 定义各角色对数据库表的访问规则
 */

import type {UserRole} from '@/db/types'

/**
 * 表访问权限操作类型
 */
export enum PermissionAction {
  SELECT = 'select',
  INSERT = 'insert',
  UPDATE = 'update',
  DELETE = 'delete'
}

/**
 * 表访问规则配置
 */
export interface TablePermissionRule {
  /** 操作类型 */
  action: PermissionAction
  /** 允许访问的角色 */
  roles: UserRole[]
  /** 数据过滤条件生成函数 */
  filter?: (userId: string) => Record<string, any> | null
  /** 是否允许访问所有数据 */
  allowAll?: boolean
}

/**
 * 权限配置定义
 */
export const permissionConfig: Record<string, TablePermissionRule[]> = {
  // users表权限配置
  users: [
    {
      action: PermissionAction.SELECT,
      roles: ['BOSS'],
      allowAll: true
    },
    {
      action: PermissionAction.SELECT,
      roles: ['PEER_ADMIN', 'MANAGER', 'DRIVER'],
      filter: (userId: string) => ({id: userId}) // 只能查看自己
    },
    {
      action: PermissionAction.UPDATE,
      roles: ['BOSS', 'PEER_ADMIN', 'MANAGER', 'DRIVER'],
      filter: (userId: string) => ({id: userId}) // 只能更新自己
    }
  ],

  // notifications表权限配置
  notifications: [
    {
      action: PermissionAction.SELECT,
      roles: ['BOSS'],
      allowAll: true
    },
    {
      action: PermissionAction.SELECT,
      roles: ['PEER_ADMIN', 'MANAGER', 'DRIVER'],
      filter: (userId: string) => ({recipient_id: userId}) // 只能查看自己的通知
    },
    {
      action: PermissionAction.INSERT,
      roles: ['BOSS', 'PEER_ADMIN'],
      allowAll: true
    }
  ],

  // leave_applications表权限配置
  leave_applications: [
    {
      action: PermissionAction.SELECT,
      roles: ['BOSS', 'PEER_ADMIN'],
      allowAll: true
    },
    {
      action: PermissionAction.SELECT,
      roles: ['MANAGER'],
      filter: (userId: string) => ({manager_id: userId}) // 只能查看自己管理的司机的请假申请
    },
    {
      action: PermissionAction.SELECT,
      roles: ['DRIVER'],
      filter: (userId: string) => ({driver_id: userId}) // 只能查看自己的请假申请
    },
    {
      action: PermissionAction.INSERT,
      roles: ['DRIVER'],
      filter: (userId: string) => ({driver_id: userId}) // 只能提交自己的请假申请
    }
  ],

  // resignation_applications表权限配置
  resignation_applications: [
    {
      action: PermissionAction.SELECT,
      roles: ['BOSS', 'PEER_ADMIN'],
      allowAll: true
    },
    {
      action: PermissionAction.SELECT,
      roles: ['DRIVER'],
      filter: (userId: string) => ({driver_id: userId}) // 只能查看自己的离职申请
    },
    {
      action: PermissionAction.INSERT,
      roles: ['DRIVER'],
      filter: (userId: string) => ({driver_id: userId}) // 只能提交自己的离职申请
    }
  ],

  // attendance表权限配置
  attendance: [
    {
      action: PermissionAction.SELECT,
      roles: ['BOSS', 'PEER_ADMIN'],
      allowAll: true
    },
    {
      action: PermissionAction.SELECT,
      roles: ['MANAGER'],
      filter: (userId: string) => ({manager_id: userId}) // 只能查看自己管理的司机的考勤
    },
    {
      action: PermissionAction.SELECT,
      roles: ['DRIVER'],
      filter: (userId: string) => ({driver_id: userId}) // 只能查看自己的考勤
    },
    {
      action: PermissionAction.INSERT,
      roles: ['DRIVER'],
      filter: (userId: string) => ({driver_id: userId}) // 只能提交自己的考勤
    }
  ],

  // piece_work_records表权限配置
  piece_work_records: [
    {
      action: PermissionAction.SELECT,
      roles: ['BOSS', 'PEER_ADMIN'],
      allowAll: true
    },
    {
      action: PermissionAction.SELECT,
      roles: ['MANAGER'],
      filter: (userId: string) => ({manager_id: userId}) // 只能查看自己管理的司机的计件记录
    },
    {
      action: PermissionAction.SELECT,
      roles: ['DRIVER'],
      filter: (userId: string) => ({driver_id: userId}) // 只能查看自己的计件记录
    },
    {
      action: PermissionAction.INSERT,
      roles: ['DRIVER'],
      filter: (userId: string) => ({driver_id: userId}) // 只能提交自己的计件记录
    }
  ],

  // driver_licenses表权限配置
  driver_licenses: [
    {
      action: PermissionAction.SELECT,
      roles: ['BOSS', 'PEER_ADMIN', 'MANAGER'],
      allowAll: true
    },
    {
      action: PermissionAction.SELECT,
      roles: ['DRIVER'],
      filter: (userId: string) => ({driver_id: userId}) // 只能查看自己的驾驶证信息
    },
    {
      action: PermissionAction.INSERT,
      roles: ['DRIVER'],
      filter: (userId: string) => ({driver_id: userId}) // 只能提交自己的驾驶证信息
    }
  ],

  // salary_records表权限配置
  salary_records: [
    {
      action: PermissionAction.SELECT,
      roles: ['BOSS', 'PEER_ADMIN'],
      allowAll: true
    },
    {
      action: PermissionAction.SELECT,
      roles: ['DRIVER'],
      filter: (userId: string) => ({driver_id: userId}) // 只能查看自己的工资记录
    }
  ]
}
