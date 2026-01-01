/**
 * 车辆工具函数模块
 * 提供车辆相关的通用验证和过滤函数
 * 
 * @module utils/vehicle
 */

import type { Vehicle } from '@/api/types'
import { VehicleStatus } from '@/api/types'

/**
 * 判断车辆是否有效（有有效车牌且状态为使用中或已提车）
 * 
 * 有效车辆的条件：
 * 1. 车牌号存在且非空
 * 2. 状态为 ACTIVE（使用中）或 PICKED_UP（已提车）
 * 
 * @param vehicle - 车辆信息
 * @returns 是否为有效车辆
 * 
 * @example
 * // 有效车辆
 * isValidVehicle({ license_plate: '京A12345', status: VehicleStatus.ACTIVE }) // true
 * 
 * // 无效车辆（无车牌）
 * isValidVehicle({ license_plate: '', status: VehicleStatus.ACTIVE }) // false
 * 
 * // 无效车辆（已归还）
 * isValidVehicle({ license_plate: '京A12345', status: VehicleStatus.RETURNED }) // false
 */
export function isValidVehicle(vehicle: Vehicle): boolean {
  return Boolean(
    vehicle.license_plate &&
    vehicle.license_plate.trim() !== '' &&
    (vehicle.status === VehicleStatus.ACTIVE || vehicle.status === VehicleStatus.PICKED_UP)
  )
}

/**
 * 判断车辆是否可以还车
 * 
 * 可还车的条件：
 * 1. 车辆有效（有有效车牌且状态为使用中或已提车）
 * 2. 尚未还车（return_time 为空）
 * 3. 审核已通过（review_status 为 'approved'）
 * 
 * @param vehicle - 车辆信息
 * @returns 是否可以还车
 * 
 * @example
 * canReturnVehicle({
 *   license_plate: '京A12345',
 *   status: VehicleStatus.PICKED_UP,
 *   return_time: null,
 *   review_status: 'approved'
 * }) // true
 */
export function canReturnVehicle(vehicle: Vehicle): boolean {
  return isValidVehicle(vehicle) &&
    !vehicle.return_time &&
    vehicle.review_status === 'approved'
}

/**
 * 判断车辆是否处于活跃使用状态（用于列表筛选）
 * 
 * 活跃状态的条件：
 * 1. 状态为 ACTIVE 或 PICKED_UP
 * 2. 尚未还车（return_time 为空）
 * 
 * 注意：此函数不检查车牌号，用于车辆列表的状态筛选
 * 
 * @param vehicle - 车辆信息
 * @returns 是否处于活跃使用状态
 */
export function isActiveVehicle(vehicle: Vehicle): boolean {
  return (vehicle.status === VehicleStatus.ACTIVE || vehicle.status === VehicleStatus.PICKED_UP) &&
    !vehicle.return_time
}

/**
 * 获取用户的有效车辆列表
 * 
 * @param vehicles - 所有车辆列表
 * @param userId - 用户ID（可选，不传则返回所有有效车辆）
 * @returns 有效车辆列表
 * 
 * @example
 * // 获取指定用户的有效车辆
 * const userVehicles = getValidVehicles(allVehicles, 123)
 * 
 * // 获取所有有效车辆
 * const allValidVehicles = getValidVehicles(allVehicles)
 */
export function getValidVehicles(vehicles: Vehicle[], userId?: number): Vehicle[] {
  return vehicles.filter(v => {
    // 如果指定了用户ID，先过滤用户
    if (userId !== undefined && v.user_id !== userId) {
      return false
    }
    // 检查是否为有效车辆
    return isValidVehicle(v)
  })
}

/**
 * 获取用户的有效车牌号列表
 * 
 * @param vehicles - 所有车辆列表
 * @param userId - 用户ID
 * @returns 有效车牌号列表
 * 
 * @example
 * const plates = getValidPlateNumbers(allVehicles, 123)
 * // ['京A12345', '京B67890']
 */
export function getValidPlateNumbers(vehicles: Vehicle[], userId: number): string[] {
  return getValidVehicles(vehicles, userId).map(v => v.license_plate)
}
