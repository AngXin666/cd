/**
 * 车辆录入记录系统 API
 * 处理车辆基本信息和录入记录的增删改查
 */

import {supabase} from '../client/supabase'
import {createLogger} from '../utils/logger'
import type {
  VehicleBase,
  VehicleBaseWithRecords,
  VehicleRecord,
  VehicleRecordInput,
  VehicleRecordWithDetails
} from './types'

const logger = createLogger('VehicleRecordsAPI')

// ============================================
// 车辆基本信息（vehicles_base）相关API
// ============================================

/**
 * 根据车牌号获取或创建车辆基本信息
 * @param plateNumber 车牌号
 * @param vehicleInfo 车辆基本信息（如果需要创建）
 * @returns 车辆基本信息
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
    logger.info('获取或创建车辆基本信息', {plateNumber})

    // 1. 先查询是否已存在
    const {data: existing, error: queryError} = await supabase
      .from('vehicles_base')
      .select('*')
      .eq('plate_number', plateNumber)
      .maybeSingle()

    if (queryError) {
      logger.error('查询车辆基本信息失败', {error: queryError})
      throw queryError
    }

    // 2. 如果已存在，返回现有记录
    if (existing) {
      logger.info('车辆基本信息已存在', {vehicleId: existing.id})
      return existing as VehicleBase
    }

    // 3. 如果不存在且提供了车辆信息，创建新记录
    if (vehicleInfo) {
      const {data: newVehicle, error: insertError} = await supabase
        .from('vehicles_base')
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
        logger.error('创建车辆基本信息失败', {error: insertError})
        throw insertError
      }

      logger.info('车辆基本信息创建成功', {vehicleId: newVehicle.id})
      return newVehicle as VehicleBase
    }

    // 4. 如果不存在且没有提供车辆信息，返回null
    logger.warn('车辆不存在且未提供车辆信息', {plateNumber})
    return null
  } catch (error) {
    logger.error('获取或创建车辆基本信息失败', {error})
    return null
  }
}

/**
 * 获取所有车辆基本信息（带最新录入记录）
 * @returns 车辆基本信息列表
 */
export async function getAllVehiclesBase(): Promise<VehicleBaseWithRecords[]> {
  try {
    logger.info('获取所有车辆基本信息')

    // 1. 获取所有车辆基本信息
    const {data: vehicles, error: vehiclesError} = await supabase
      .from('vehicles_base')
      .select('*')
      .order('created_at', {ascending: false})

    if (vehiclesError) {
      logger.error('获取车辆基本信息失败', {error: vehiclesError})
      return []
    }

    if (!vehicles || vehicles.length === 0) {
      logger.info('没有车辆基本信息')
      return []
    }

    // 2. 获取每辆车的所有录入记录
    const vehiclesWithRecords: VehicleBaseWithRecords[] = await Promise.all(
      vehicles.map(async (vehicle) => {
        const records = await getVehicleRecordsByVehicleId(vehicle.id)
        return {
          ...vehicle,
          records,
          latest_record: records[0], // 第一条就是最新的（已按时间倒序）
          total_records: records.length
        } as VehicleBaseWithRecords
      })
    )

    logger.info('获取车辆基本信息成功', {count: vehiclesWithRecords.length})
    return vehiclesWithRecords
  } catch (error) {
    logger.error('获取所有车辆基本信息失败', {error})
    return []
  }
}

/**
 * 根据车牌号获取车辆基本信息（带所有录入记录）
 * @param plateNumber 车牌号
 * @returns 车辆基本信息（包含所有录入记录）
 */
export async function getVehicleBaseByPlateNumber(plateNumber: string): Promise<VehicleBaseWithRecords | null> {
  try {
    logger.info('根据车牌号获取车辆基本信息', {plateNumber})

    // 1. 获取车辆基本信息
    const {data: vehicle, error: vehicleError} = await supabase
      .from('vehicles_base')
      .select('*')
      .eq('plate_number', plateNumber)
      .maybeSingle()

    if (vehicleError) {
      logger.error('获取车辆基本信息失败', {error: vehicleError})
      return null
    }

    if (!vehicle) {
      logger.warn('车辆不存在', {plateNumber})
      return null
    }

    // 2. 获取该车辆的所有录入记录
    const records = await getVehicleRecordsByVehicleId(vehicle.id)

    const result: VehicleBaseWithRecords = {
      ...vehicle,
      records,
      latest_record: records[0],
      total_records: records.length
    }

    logger.info('获取车辆基本信息成功', {vehicleId: vehicle.id, recordCount: records.length})
    return result
  } catch (error) {
    logger.error('根据车牌号获取车辆基本信息失败', {error})
    return null
  }
}

// ============================================
// 车辆录入记录（vehicle_records）相关API
// ============================================

/**
 * 创建车辆录入记录
 * @param input 录入记录输入数据
 * @returns 创建的录入记录
 */
export async function createVehicleRecord(input: VehicleRecordInput): Promise<VehicleRecord | null> {
  try {
    logger.info('创建车辆录入记录', {plateNumber: input.plate_number})

    // 1. 获取或创建车辆基本信息
    const vehicleBase = await getOrCreateVehicleBase(input.plate_number, {
      brand: input.brand || '',
      model: input.model || '',
      color: input.color,
      vin: input.vin,
      vehicle_type: input.vehicle_type,
      owner_name: input.owner_name,
      use_character: input.use_character,
      register_date: input.register_date,
      engine_number: input.engine_number
    })

    if (!vehicleBase) {
      logger.error('获取或创建车辆基本信息失败')
      throw new Error('无法获取或创建车辆基本信息')
    }

    // 2. 创建录入记录
    const {data: record, error: recordError} = await supabase
      .from('vehicle_records')
      .insert({
        vehicle_id: vehicleBase.id,
        plate_number: input.plate_number,
        driver_id: input.driver_id,
        warehouse_id: input.warehouse_id,
        record_type: input.record_type || 'pickup',
        // 行驶证信息
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
        // 车辆照片
        left_front_photo: input.left_front_photo,
        right_front_photo: input.right_front_photo,
        left_rear_photo: input.left_rear_photo,
        right_rear_photo: input.right_rear_photo,
        dashboard_photo: input.dashboard_photo,
        rear_door_photo: input.rear_door_photo,
        cargo_box_photo: input.cargo_box_photo,
        // 行驶证照片
        driving_license_main_photo: input.driving_license_main_photo,
        driving_license_sub_photo: input.driving_license_sub_photo,
        driving_license_sub_back_photo: input.driving_license_sub_back_photo,
        // 提车/还车照片
        pickup_photos: input.pickup_photos || [],
        return_photos: input.return_photos || [],
        registration_photos: input.registration_photos || [],
        damage_photos: input.damage_photos || [],
        // 驾驶证信息
        driver_name: input.driver_name,
        license_number: input.license_number,
        license_class: input.license_class,
        first_issue_date: input.first_issue_date,
        license_valid_from: input.license_valid_from,
        license_valid_until: input.license_valid_until,
        id_card_number: input.id_card_number,
        // 审核管理
        review_status: input.review_status || 'drafting',
        locked_photos: input.locked_photos || {},
        required_photos: input.required_photos || [],
        review_notes: input.review_notes,
        // 时间字段
        pickup_time: input.pickup_time,
        return_time: input.return_time,
        recorded_at: input.recorded_at || new Date().toISOString(),
        notes: input.notes
      })
      .select()
      .single()

    if (recordError) {
      logger.error('创建录入记录失败', {error: recordError})
      throw recordError
    }

    logger.info('创建录入记录成功', {recordId: record.id})
    return record as VehicleRecord
  } catch (error) {
    logger.error('创建车辆录入记录失败', {error})
    return null
  }
}

/**
 * 获取指定车辆的所有录入记录
 * @param vehicleId 车辆ID
 * @returns 录入记录列表（按时间倒序）
 */
export async function getVehicleRecordsByVehicleId(vehicleId: string): Promise<VehicleRecordWithDetails[]> {
  try {
    logger.info('获取车辆录入记录', {vehicleId})

    const {data: records, error: recordsError} = await supabase
      .from('vehicle_records')
      .select(
        `
        *,
        profiles:driver_id (
          name,
          phone,
          email
        )
      `
      )
      .eq('vehicle_id', vehicleId)
      .order('recorded_at', {ascending: false})

    if (recordsError) {
      logger.error('获取录入记录失败', {error: recordsError})
      return []
    }

    if (!records || records.length === 0) {
      logger.info('没有录入记录', {vehicleId})
      return []
    }

    // 获取所有司机的证件照片（从driver_licenses表）
    const driverIds = records.map((r) => r.driver_id).filter(Boolean)
    const {data: driverLicenses} = await supabase
      .from('driver_licenses')
      .select('driver_id, id_card_photo_front, id_card_photo_back, driving_license_photo')
      .in('driver_id', driverIds)

    // 创建司机ID到证件照片的映射
    const driverLicenseMap = new Map(
      (driverLicenses || []).map((dl) => [
        dl.driver_id,
        {
          id_card_photo_front: dl.id_card_photo_front,
          id_card_photo_back: dl.id_card_photo_back,
          driving_license_photo: dl.driving_license_photo
        }
      ])
    )

    // 转换数据格式，并填充证件照片
    const result: VehicleRecordWithDetails[] = records.map((record) => {
      const driverLicense = driverLicenseMap.get(record.driver_id)
      return {
        ...record,
        driver_name_profile: record.profiles?.name || null,
        driver_phone: record.profiles?.phone || null,
        driver_email: record.profiles?.email || null,
        // 如果vehicle_records表中没有身份证照片，从driver_licenses表中获取
        id_card_photo_front: record.id_card_photo_front || driverLicense?.id_card_photo_front || null,
        id_card_photo_back: record.id_card_photo_back || driverLicense?.id_card_photo_back || null,
        // 添加驾驶证照片（从driver_licenses表）
        driving_license_photo: driverLicense?.driving_license_photo || null
      } as any
    })

    logger.info('获取录入记录成功', {vehicleId, count: result.length})
    return result
  } catch (error) {
    logger.error('获取车辆录入记录失败', {error})
    return []
  }
}

/**
 * 获取指定司机的所有录入记录
 * @param driverId 司机ID
 * @returns 录入记录列表（按时间倒序）
 */
export async function getVehicleRecordsByDriverId(driverId: string): Promise<VehicleRecordWithDetails[]> {
  try {
    logger.info('获取司机录入记录', {driverId})

    const {data: records, error: recordsError} = await supabase
      .from('vehicle_records')
      .select(
        `
        *,
        vehicles_base:vehicle_id (
          plate_number,
          brand,
          model,
          color,
          vin
        ),
        profiles:driver_id (
          name,
          phone,
          email
        )
      `
      )
      .eq('driver_id', driverId)
      .order('recorded_at', {ascending: false})

    if (recordsError) {
      logger.error('获取录入记录失败', {error: recordsError})
      return []
    }

    if (!records || records.length === 0) {
      logger.info('没有录入记录', {driverId})
      return []
    }

    // 转换数据格式
    const result: VehicleRecordWithDetails[] = records.map((record) => ({
      ...record,
      vehicle: record.vehicles_base || undefined,
      driver_name_profile: record.profiles?.name || null,
      driver_phone: record.profiles?.phone || null,
      driver_email: record.profiles?.email || null
    }))

    logger.info('获取录入记录成功', {driverId, count: result.length})
    return result
  } catch (error) {
    logger.error('获取司机录入记录失败', {error})
    return []
  }
}

/**
 * 获取所有录入记录（带车辆和司机信息）
 * @returns 录入记录列表（按时间倒序）
 */
export async function getAllVehicleRecords(): Promise<VehicleRecordWithDetails[]> {
  try {
    logger.info('获取所有录入记录')

    const {data: records, error: recordsError} = await supabase
      .from('vehicle_records')
      .select(
        `
        *,
        vehicles_base:vehicle_id (
          plate_number,
          brand,
          model,
          color,
          vin
        ),
        profiles:driver_id (
          name,
          phone,
          email
        )
      `
      )
      .order('recorded_at', {ascending: false})

    if (recordsError) {
      logger.error('获取录入记录失败', {error: recordsError})
      return []
    }

    if (!records || records.length === 0) {
      logger.info('没有录入记录')
      return []
    }

    // 转换数据格式
    const result: VehicleRecordWithDetails[] = records.map((record) => ({
      ...record,
      vehicle: record.vehicles_base || undefined,
      driver_name_profile: record.profiles?.name || null,
      driver_phone: record.profiles?.phone || null,
      driver_email: record.profiles?.email || null
    }))

    logger.info('获取录入记录成功', {count: result.length})
    return result
  } catch (error) {
    logger.error('获取所有录入记录失败', {error})
    return []
  }
}

/**
 * 更新录入记录
 * @param recordId 录入记录ID
 * @param updates 更新数据
 * @returns 更新后的录入记录
 */
export async function updateVehicleRecord(
  recordId: string,
  updates: Partial<VehicleRecordInput>
): Promise<VehicleRecord | null> {
  try {
    logger.info('更新录入记录', {recordId})

    const {data: record, error: updateError} = await supabase
      .from('vehicle_records')
      .update(updates)
      .eq('id', recordId)
      .select()
      .single()

    if (updateError) {
      logger.error('更新录入记录失败', {error: updateError})
      throw updateError
    }

    logger.info('更新录入记录成功', {recordId})
    return record as VehicleRecord
  } catch (error) {
    logger.error('更新录入记录失败', {error})
    return null
  }
}

/**
 * 删除录入记录
 * @param recordId 录入记录ID
 * @returns 是否删除成功
 */
export async function deleteVehicleRecord(recordId: string): Promise<boolean> {
  try {
    logger.info('删除录入记录', {recordId})

    const {error: deleteError} = await supabase.from('vehicle_records').delete().eq('id', recordId)

    if (deleteError) {
      logger.error('删除录入记录失败', {error: deleteError})
      return false
    }

    logger.info('删除录入记录成功', {recordId})
    return true
  } catch (error) {
    logger.error('删除录入记录失败', {error})
    return false
  }
}

/**
 * 获取待审核的录入记录
 * @returns 待审核的录入记录列表
 */
export async function getPendingVehicleRecords(): Promise<VehicleRecordWithDetails[]> {
  try {
    logger.info('获取待审核的录入记录')

    const {data: records, error: recordsError} = await supabase
      .from('vehicle_records')
      .select(
        `
        *,
        vehicles_base:vehicle_id (
          plate_number,
          brand,
          model,
          color,
          vin
        ),
        profiles:driver_id (
          name,
          phone,
          email
        )
      `
      )
      .in('review_status', ['pending_review', 'need_supplement'])
      .order('recorded_at', {ascending: false})

    if (recordsError) {
      logger.error('获取待审核录入记录失败', {error: recordsError})
      return []
    }

    if (!records || records.length === 0) {
      logger.info('没有待审核的录入记录')
      return []
    }

    // 转换数据格式
    const result: VehicleRecordWithDetails[] = records.map((record) => ({
      ...record,
      vehicle: record.vehicles_base || undefined,
      driver_name_profile: record.profiles?.name || null,
      driver_phone: record.profiles?.phone || null,
      driver_email: record.profiles?.email || null
    }))

    logger.info('获取待审核录入记录成功', {count: result.length})
    return result
  } catch (error) {
    logger.error('获取待审核的录入记录失败', {error})
    return []
  }
}
