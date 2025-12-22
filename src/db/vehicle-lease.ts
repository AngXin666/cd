/**
 * 车辆租赁管理数据库操作
 * 
 * 迁移说明：
 * - 查询函数已迁移到 VehiclesRepository，本文件函数作为兼容层
 * - 写操作保留直接 Supabase 调用，但会清除缓存
 * - 新代码应直接使用 vehiclesRepository 的方法
 * 
 * 迁移状态：
 * - getAllVehicleLeaseInfo: 使用 vehiclesRepository.getAllWithDrivers()
 * - getVehicleBaseById: 使用 vehiclesRepository.getById()
 * - 写操作（createVehicle、updateVehicle、deleteVehicle）：
 *   保留直接 Supabase 调用，但会清除缓存
 */

import {supabase} from '@/client/supabase'
import {vehiclesRepository} from './repositories/VehiclesRepository'
import type {VehicleBase, VehicleLeaseInfo} from './types'

/**
 * 获取所有车辆租赁信息（包含计算字段）
 * 使用 VehiclesRepository 进行缓存管理
 * 
 * @returns 车辆租赁信息列表
 */
export async function getAllVehicleLeaseInfo(): Promise<VehicleLeaseInfo[]> {
  try {
    // 使用 Repository 方法（带缓存）
    const vehicles = await vehiclesRepository.getAllWithDrivers()
    
    // 转换为 VehicleLeaseInfo 格式，添加计算字段
    return vehicles.map(vehicle => ({
      ...vehicle,
      next_payment_date: calculateNextPaymentDate(
        vehicle.lease_start_date || null,
        vehicle.rent_payment_day || null
      ),
      days_until_payment: null, // 可以在前端计算
      lease_status: vehicle.lease_end_date 
        ? (new Date(vehicle.lease_end_date) > new Date() ? 'active' : 'expired')
        : null
    })) as VehicleLeaseInfo[]
  } catch (error) {
    console.error('获取车辆租赁信息失败:', error)
    return []
  }
}

/**
 * 根据ID获取车辆基本信息
 * 使用 VehiclesRepository 进行缓存管理
 * 
 * @param id - 车辆ID
 * @returns 车辆信息，如果不存在则返回 null
 */
export async function getVehicleBaseById(id: string): Promise<VehicleBase | null> {
  try {
    // 使用 Repository 方法（带缓存）
    const vehicle = await vehiclesRepository.getById(id)
    return vehicle as VehicleBase | null
  } catch (error) {
    console.error('获取车辆信息失败:', error)
    return null
  }
}

/**
 * 创建车辆
 * 写操作后自动清除缓存
 * 
 * @param vehicle - 车辆信息
 * @returns 创建的车辆信息，如果失败则返回 null
 */
export async function createVehicle(vehicle: Partial<VehicleBase>): Promise<VehicleBase | null> {
  const {data, error} = await supabase
    .from('vehicles_base')
    .insert({
      plate_number: vehicle.plate_number || '',
      brand: vehicle.brand || '',
      model: vehicle.model || '',
      color: vehicle.color,
      vin: vehicle.vin,
      vehicle_type: vehicle.vehicle_type,
      owner_name: vehicle.owner_name,
      use_character: vehicle.use_character,
      register_date: vehicle.register_date,
      engine_number: vehicle.engine_number,
      ownership_type: vehicle.ownership_type || 'company',
      lessor_name: vehicle.lessor_name,
      lessor_contact: vehicle.lessor_contact,
      lessee_name: vehicle.lessee_name,
      lessee_contact: vehicle.lessee_contact,
      monthly_rent: vehicle.monthly_rent || 0,
      lease_start_date: vehicle.lease_start_date,
      lease_end_date: vehicle.lease_end_date,
      rent_payment_day: vehicle.rent_payment_day
    })
    .select()
    .maybeSingle()

  if (error) {
    console.error('创建车辆失败:', error)
    throw error
  }

  // 清除车辆缓存
  vehiclesRepository.invalidateCache()

  return data
}

/**
 * 更新车辆信息
 * 写操作后自动清除缓存
 * 
 * @param id - 车辆ID
 * @param updates - 要更新的字段
 * @returns 更新后的车辆信息，如果失败则返回 null
 */
export async function updateVehicle(id: string, updates: Partial<VehicleBase>): Promise<VehicleBase | null> {
  const {data, error} = await supabase
    .from('vehicles_base')
    .update({
      plate_number: updates.plate_number,
      brand: updates.brand,
      model: updates.model,
      color: updates.color,
      vin: updates.vin,
      vehicle_type: updates.vehicle_type,
      owner_name: updates.owner_name,
      use_character: updates.use_character,
      register_date: updates.register_date,
      engine_number: updates.engine_number,
      ownership_type: updates.ownership_type,
      lessor_name: updates.lessor_name,
      lessor_contact: updates.lessor_contact,
      lessee_name: updates.lessee_name,
      lessee_contact: updates.lessee_contact,
      monthly_rent: updates.monthly_rent,
      lease_start_date: updates.lease_start_date,
      lease_end_date: updates.lease_end_date,
      rent_payment_day: updates.rent_payment_day,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .maybeSingle()

  if (error) {
    console.error('更新车辆信息失败:', error)
    throw error
  }

  // 清除车辆缓存
  vehiclesRepository.invalidateCache()

  return data
}

/**
 * 删除车辆
 * 写操作后自动清除缓存
 * 
 * @param id - 车辆ID
 * @returns 是否删除成功
 */
export async function deleteVehicle(id: string): Promise<boolean> {
  const {error} = await supabase.from('vehicles_base').delete().eq('id', id)

  if (error) {
    console.error('删除车辆失败:', error)
    return false
  }

  // 清除车辆缓存
  vehiclesRepository.invalidateCache()

  return true
}

/**
 * 根据车牌号搜索车辆
 */
export async function searchVehiclesByPlateNumber(plateNumber: string): Promise<VehicleLeaseInfo[]> {
  const {data, error} = await supabase
    .from('vehicle_lease_info')
    .select('*')
    .ilike('plate_number', `%${plateNumber}%`)
    .order('created_at', {ascending: false})

  if (error) {
    console.error('搜索车辆失败:', error)
    return []
  }

  return Array.isArray(data) ? data : []
}

/**
 * 计算下一个租金缴纳日期（前端计算版本）
 */
export function calculateNextPaymentDate(leaseStartDate: string | null, rentPaymentDay: number | null): string | null {
  if (!leaseStartDate || !rentPaymentDay) {
    return null
  }

  const today = new Date()
  const currentYear = today.getFullYear()
  const currentMonth = today.getMonth()

  // 计算当月的缴纳日期
  const currentMonthPaymentDate = new Date(currentYear, currentMonth, rentPaymentDay)

  // 如果当月的缴纳日期还未到，返回当月的缴纳日期
  if (currentMonthPaymentDate >= today) {
    return currentMonthPaymentDate.toISOString().split('T')[0]
  }

  // 否则返回下个月的缴纳日期
  const nextMonthPaymentDate = new Date(currentYear, currentMonth + 1, rentPaymentDay)
  return nextMonthPaymentDate.toISOString().split('T')[0]
}

/**
 * 格式化租金显示
 */
export function formatRent(rent: number): string {
  return `¥${rent.toFixed(2)}`
}

/**
 * 格式化日期显示
 */
export function formatDate(date: string | null): string {
  if (!date) return '--'
  return date
}

/**
 * 格式化租期显示
 */
export function formatLeasePeriod(startDate: string | null, endDate: string | null): string {
  if (!startDate || !endDate) return '--'
  return `${startDate} 至 ${endDate}`
}
