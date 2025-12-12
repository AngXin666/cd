/**
 * 车辆管理系统 API
 * 处理车辆信息的增删改查
 * 注意：由于数据库重构，所有车辆信息现在都存储在vehicles表中
 */

import {supabase} from '../client/supabase'
import {checkCurrentUserPermission, PermissionAction} from '../services/permission-service'
import {createLogger} from '../utils/logger'
import type {VehicleBase, VehicleRecordInput} from './types'

const logger = createLogger('VehicleAPI')

// ============================================
// 车辆信息相关API
// ============================================

/**
 * 根据车牌号获取或创建车辆信息
 */
export async function getOrCreateVehicleBase(
  plateNumber: string,
  vehicleInfo?: {
    brand: string
    model: string
    color?: string | null
    vin?: string | null
    vehicle_type?: string | null
    owner_name?: string | null
    use_character?: string | null
    register_date?: string | null
    engine_number?: string | null
  }
): Promise<VehicleBase | null> {
  try {
    const {data: existing, error: queryError} = await supabase
      .from('vehicles')
      .select('*')
      .eq('plate_number', plateNumber)
      .maybeSingle()

    if (queryError) {
      logger.error('查询车辆信息失败', {error: queryError})
      throw queryError
    }

    if (existing) {
      return existing as VehicleBase
    }

    if (vehicleInfo) {
      const {data: newVehicle, error: insertError} = await supabase
        .from('vehicles')
        .insert({
          plate_number: plateNumber,
          brand: vehicleInfo.brand,
          model: vehicleInfo.model,
          color: vehicleInfo.color,
          vin: vehicleInfo.vin,
          vehicle_type: vehicleInfo.vehicle_type,
          owner_name: vehicleInfo.owner_name,
          use_character: vehicleInfo.use_character,
          register_date: vehicleInfo.register_date,
          engine_number: vehicleInfo.engine_number
        })
        .select()
        .single()

      if (insertError) {
        logger.error('创建车辆信息失败', {error: insertError})
        throw insertError
      }

      return newVehicle as VehicleBase
    }

    return null
  } catch (error) {
    logger.error('获取或创建车辆信息异常', {error})
    return null
  }
}

/**
 * 获取所有车辆信息
 * @param user 用户对象，包含id和可选的role字段
 */
export async function getAllVehiclesBase(user: {id: string; role?: string} | null): Promise<VehicleBase[]> {
  try {
    // 应用层权限检查：查看车辆权限
    const permissionResult = checkCurrentUserPermission('vehicles', PermissionAction.SELECT, user)
    if (!permissionResult.hasPermission) {
      return []
    }

    let query = supabase.from('vehicles').select('*').order('created_at', {ascending: false})

    // 应用数据过滤
    if (permissionResult.filter) {
      Object.entries(permissionResult.filter).forEach(([key, value]) => {
        query = query.eq(key, value)
      })
    }
    const {data: vehicles, error} = await query

    if (error) {
      logger.error('获取车辆信息失败', {error})
      return []
    }

    return Array.isArray(vehicles) ? (vehicles as VehicleBase[]) : []
  } catch (error) {
    logger.error('获取所有车辆信息异常', {error})
    return []
  }
}

/**
 * 根据车牌号获取车辆信息
 */
export async function getVehicleBaseByPlateNumber(plateNumber: string): Promise<VehicleBase | null> {
  try {
    const {data: vehicle, error} = await supabase
      .from('vehicles')
      .select('*')
      .eq('plate_number', plateNumber)
      .maybeSingle()

    if (error) {
      logger.error('获取车辆信息失败', {error})
      return null
    }

    return vehicle as VehicleBase | null
  } catch (error) {
    logger.error('根据车牌号获取车辆信息异常', {error})
    return null
  }
}

/**
 * 创建或更新车辆录入记录
 */
export async function createVehicleRecord(input: VehicleRecordInput): Promise<VehicleBase | null> {
  try {
    const {data: existing, error: queryError} = await supabase
      .from('vehicles')
      .select('*')
      .eq('plate_number', input.plate_number)
      .maybeSingle()

    if (queryError) {
      logger.error('查询车辆失败', {error: queryError})
      throw queryError
    }

    const vehicleData: Partial<VehicleBase> = {
      plate_number: input.plate_number,
      brand: input.brand,
      model: input.model,
      color: input.color,
      vin: input.vin,
      vehicle_type: input.vehicle_type,
      owner_name: input.owner_name,
      use_character: input.use_character,
      register_date: input.register_date,
      engine_number: input.engine_number,
      driver_id: input.driver_id,
      warehouse_id: input.warehouse_id,
      issue_date: input.issue_date,
      archive_number: input.archive_number,
      total_mass: input.total_mass,
      approved_passengers: input.approved_passengers,
      curb_weight: input.curb_weight,
      approved_load: input.approved_load,
      overall_dimension_length: input.overall_dimension_length,
      overall_dimension_width: input.overall_dimension_width,
      overall_dimension_height: input.overall_dimension_height,
      inspection_valid_until: input.inspection_valid_until,
      inspection_date: input.inspection_date,
      mandatory_scrap_date: input.mandatory_scrap_date,
      left_front_photo: input.left_front_photo,
      right_front_photo: input.right_front_photo,
      left_rear_photo: input.left_rear_photo,
      right_rear_photo: input.right_rear_photo,
      dashboard_photo: input.dashboard_photo,
      rear_door_photo: input.rear_door_photo,
      cargo_box_photo: input.cargo_box_photo,
      driving_license_main_photo: input.driving_license_main_photo,
      driving_license_sub_photo: input.driving_license_sub_photo,
      driving_license_sub_back_photo: input.driving_license_sub_back_photo,
      pickup_photos: input.pickup_photos,
      return_photos: input.return_photos,
      registration_photos: input.registration_photos,
      damage_photos: input.damage_photos,
      review_status: input.review_status || 'drafting',
      required_photos: input.required_photos,
      review_notes: input.review_notes,
      pickup_time: input.pickup_time,
      return_time: input.return_time
    }

    if (existing) {
      const {data: updated, error: updateError} = await supabase
        .from('vehicles')
        .update(vehicleData)
        .eq('id', existing.id)
        .select()
        .single()

      if (updateError) {
        logger.error('更新车辆信息失败', {error: updateError})
        throw updateError
      }

      return updated as VehicleBase
    } else {
      const {data: created, error: createError} = await supabase.from('vehicles').insert(vehicleData).select().single()

      if (createError) {
        logger.error('创建车辆信息失败', {error: createError})
        throw createError
      }

      return created as VehicleBase
    }
  } catch (error) {
    logger.error('创建车辆录入记录异常', {error})
    return null
  }
}

/**
 * 获取所有车辆录入记录
 * @param user 用户对象，包含id和可选的role字段
 */
export async function getAllVehicleRecords(user: {id: string; role?: string} | null): Promise<VehicleBase[]> {
  return getAllVehiclesBase(user)
}

/**
 * 根据司机ID获取车辆录入记录
 * @param driverId 司机ID
 * @param user 用户对象，包含id和可选的role字段
 */
export async function getVehicleRecordsByDriverId(
  driverId: string,
  user: {id: string; role?: string} | null
): Promise<VehicleBase[]> {
  try {
    // 应用层权限检查：查看车辆权限
    const permissionResult = checkCurrentUserPermission('vehicles', PermissionAction.SELECT, user)
    if (!permissionResult.hasPermission) {
      return []
    }

    let query = supabase.from('vehicles').select('*').eq('driver_id', driverId).order('created_at', {ascending: false})

    // 应用数据过滤
    if (permissionResult.filter) {
      Object.entries(permissionResult.filter).forEach(([key, value]) => {
        query = query.eq(key, value)
      })
    }
    const {data: vehicles, error} = await query

    if (error) {
      logger.error('获取车辆录入记录失败', {error})
      return []
    }

    return Array.isArray(vehicles) ? (vehicles as VehicleBase[]) : []
  } catch (error) {
    logger.error('根据司机ID获取车辆录入记录异常', {error})
    return []
  }
}

/**
 * 根据仓库ID获取车辆录入记录
 */
export async function getVehicleRecordsByWarehouseId(warehouseId: string): Promise<VehicleBase[]> {
  try {
    const {data: vehicles, error} = await supabase
      .from('vehicles')
      .select('*')
      .eq('warehouse_id', warehouseId)
      .order('created_at', {ascending: false})

    if (error) {
      logger.error('获取车辆录入记录失败', {error})
      return []
    }

    return Array.isArray(vehicles) ? (vehicles as VehicleBase[]) : []
  } catch (error) {
    logger.error('根据仓库ID获取车辆录入记录异常', {error})
    return []
  }
}

/**
 * 根据ID获取车辆录入记录
 */
export async function getVehicleRecordById(recordId: string): Promise<VehicleBase | null> {
  try {
    const {data: vehicle, error} = await supabase.from('vehicles').select('*').eq('id', recordId).maybeSingle()

    if (error) {
      logger.error('获取车辆录入记录失败', {error})
      return null
    }

    return vehicle as VehicleBase | null
  } catch (error) {
    logger.error('根据ID获取车辆录入记录异常', {error})
    return null
  }
}

/**
 * 更新车辆录入记录
 */
export async function updateVehicleRecord(
  recordId: string,
  updates: Partial<VehicleRecordInput>,
  user: {id: string; role?: string} | null
): Promise<VehicleBase | null> {
  try {
    // 应用层权限检查：更新车辆权限
    const permissionResult = checkCurrentUserPermission('vehicles', PermissionAction.UPDATE, user)
    if (!permissionResult.hasPermission) {
      throw new Error('更新车辆信息权限不足')
    }

    const query = supabase.from('vehicles').update(updates).eq('id', recordId).select().single()

    // 应用数据过滤（不在这里使用eq链式调用，因为select().single()后的类型不支持）
    const {data: updated, error} = await query

    if (error) {
      logger.error('更新车辆录入记录失败', {error})
      throw error
    }

    return updated as VehicleBase
  } catch (error) {
    logger.error('更新车辆录入记录异常', {error})
    return null
  }
}

/**
 * 删除车辆录入记录
 */
export async function deleteVehicleRecord(recordId: string): Promise<boolean> {
  try {
    const {error} = await supabase.from('vehicles').delete().eq('id', recordId)

    if (error) {
      logger.error('删除车辆录入记录失败', {error})
      return false
    }

    return true
  } catch (error) {
    logger.error('删除车辆录入记录异常', {error})
    return false
  }
}

/**
 * 更新车辆审核状态
 */
export async function updateVehicleReviewStatus(
  recordId: string,
  status: string,
  user: {id: string; role?: string} | null,
  notes?: string,
  reviewedBy?: string
): Promise<VehicleBase | null> {
  try {
    // 应用层权限检查：更新车辆权限（审核状态属于更新操作）
    const permissionResult = checkCurrentUserPermission('vehicles', PermissionAction.UPDATE, user)
    if (!permissionResult.hasPermission) {
      throw new Error('更新车辆审核状态权限不足')
    }

    const updateData: {review_status: string; reviewed_at: string; review_notes?: string; reviewed_by?: string} = {
      review_status: status,
      reviewed_at: new Date().toISOString()
    }

    if (notes) {
      updateData.review_notes = notes
    }

    if (reviewedBy) {
      updateData.reviewed_by = reviewedBy
    }

    const query = supabase.from('vehicles').update(updateData).eq('id', recordId).select().single()

    // 应用数据过滤
    const filteredQuery = permissionResult.filter ? query : query
    const {data: updated, error} = await filteredQuery

    if (error) {
      logger.error('更新车辆审核状态失败', {error})
      throw error
    }

    return updated as VehicleBase
  } catch (error) {
    logger.error('更新车辆审核状态异常', {error})
    return null
  }
}
