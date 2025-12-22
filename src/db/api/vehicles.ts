/**
 * 车辆管理 API
 *
 * 功能包括：
 * - 车辆CRUD操作
 * - 驾驶员证件管理
 * - 车辆审核管理
 * - 车辆归还流程
 * - 车辆统计
 *
 * v1.3.18 更新：车辆提交审核时发送通知
 * 使用 buildSubmissionMessage 组装消息格式
 */

import {supabase} from '@/client/supabase'
import {sendDriverSubmissionNotification} from '@/services/notificationService'
import {publish} from '@/utils/eventBus'
import {createLogger} from '@/utils/logger'
import {type DriverType, type WarehouseInfo} from '@/utils/notificationMessageBuilder'
import type {
  DriverLicense,
  DriverLicenseInput,
  DriverLicenseUpdate,
  LockedPhotos,
  Profile,
  SupplementedPhotos,
  Vehicle,
  VehicleInput,
  VehicleUpdate,
  VehicleWithDocuments,
  VehicleWithDriver,
  VehicleWithDriverDetails
} from '../types'

// 导入需要调用的users模块函数
import {getDriverDisplayName, getDriverName, getProfileById} from './users'

// 导入 VehiclesRepository 和 DriverLicensesRepository（用于缓存管理）
import {vehiclesRepository, driverLicensesRepository} from '../repositories'

// 重新导出司机名称查询函数
export {getDriverDisplayName, getDriverName}

// 创建数据库操作日志记录器
const logger = createLogger('VehiclesAPI')

// ==================== 辅助函数 ====================

/**
 * 将 vehicle_documents 中的字段平铺到车辆对象中
 * 这样前端可以直接使用 vehicle.left_front_photo 等字段
 * @param vehicle - 包含 document 关联的车辆数据
 * @returns 平铺后的车辆对象
 */
function flattenVehicleDocument<T extends Record<string, unknown>>(vehicle: T): Vehicle {
  const docArray = vehicle.document as unknown[] | null
  const doc = (Array.isArray(docArray) ? docArray[0] : docArray) as Record<string, unknown> | null

  // 使用类型断言将结果转换为 Vehicle
  // 这是安全的，因为 vehicle 来自数据库查询，包含所有必需字段
  return {
    ...vehicle,
    // 平铺车辆照片字段
    left_front_photo: doc?.left_front_photo || vehicle.left_front_photo,
    right_front_photo: doc?.right_front_photo || vehicle.right_front_photo,
    left_rear_photo: doc?.left_rear_photo || vehicle.left_rear_photo,
    right_rear_photo: doc?.right_rear_photo || vehicle.right_rear_photo,
    dashboard_photo: doc?.dashboard_photo || vehicle.dashboard_photo,
    rear_door_photo: doc?.rear_door_photo || vehicle.rear_door_photo,
    cargo_box_photo: doc?.cargo_box_photo || vehicle.cargo_box_photo,
    // 平铺行驶证照片字段
    driving_license_main_photo: doc?.driving_license_main_photo || vehicle.driving_license_main_photo,
    driving_license_sub_photo: doc?.driving_license_sub_photo || vehicle.driving_license_sub_photo,
    driving_license_back_photo: doc?.driving_license_back_photo || vehicle.driving_license_back_photo,
    driving_license_sub_back_photo: doc?.driving_license_sub_back_photo || vehicle.driving_license_sub_back_photo,
    // 平铺时间字段
    pickup_time: doc?.pickup_time || vehicle.pickup_time,
    return_time: doc?.return_time || vehicle.return_time,
    // 平铺照片数组字段（使用 ?? 确保空数组不会被回退）
    pickup_photos: doc?.pickup_photos ?? vehicle.pickup_photos ?? null,
    return_photos: doc?.return_photos ?? vehicle.return_photos ?? null,
    registration_photos: doc?.registration_photos ?? vehicle.registration_photos ?? null,
    damage_photos: doc?.damage_photos ?? vehicle.damage_photos ?? null,
    // 平铺审核相关字段（这些字段只存在于 vehicle_documents 表）
    review_notes: doc?.review_notes || null,
    required_photos: doc?.required_photos || null,
    // 平铺行驶证信息字段
    use_character: doc?.use_character || vehicle.use_character,
    register_date: doc?.register_date || vehicle.register_date,
    // 平铺租赁信息字段
    lessor_name: doc?.lessor_name,
    lessor_contact: doc?.lessor_contact,
    lessee_name: doc?.lessee_name,
    lessee_contact: doc?.lessee_contact,
    monthly_rent: doc?.monthly_rent,
    lease_start_date: doc?.lease_start_date,
    lease_end_date: doc?.lease_end_date,
    rent_payment_day: doc?.rent_payment_day,
    // 清除 document 字段避免重复
    document: undefined
  } as unknown as Vehicle
}

// ==================== 车辆管理 API ====================

/**
 * 获取司机的所有车辆
 * 同时查询 driver_id 和 user_id 字段，因为：
 * - 旧数据可能使用 driver_id
 * - 新数据使用 user_id（添加车辆页面设置的是 user_id）
 * 同时关联 vehicle_documents 表获取图片等扩展信息
 *
 * 使用 VehiclesRepository 进行缓存管理：
 * - 缓存 TTL: 5 分钟
 * - 在车辆创建/更新/删除时自动清除缓存
 *
 * @param driverId - 司机ID（可以是 driver_id 或 user_id）
 * @returns 车辆列表（包含图片等扩展信息）
 */
export async function getDriverVehicles(driverId: string): Promise<Vehicle[]> {
  // 委托给 VehiclesRepository 处理（带缓存）
  return vehiclesRepository.getByDriverId(driverId)
}

/**
 * 获取所有车辆信息（包含司机信息）
 * 用于老板查看所有车辆
 *
 * 使用 VehiclesRepository 进行缓存管理：
 * - 缓存 TTL: 5 分钟
 * - 在车辆创建/更新/删除时自动清除缓存
 *
 * @returns 车辆列表（包含司机信息）
 */
export async function getAllVehiclesWithDrivers(): Promise<VehicleWithDriver[]> {
  // 委托给 VehiclesRepository 处理（带缓存）
  return vehiclesRepository.getAllWithDrivers()
}

/**
 * 根据ID获取车辆信息（包含扩展信息）
 * 会将 vehicle_documents 中的字段平铺到车辆对象中
 *
 * 使用 VehiclesRepository 进行缓存管理：
 * - 缓存 TTL: 5 分钟
 * - 在车辆更新/删除时自动清除缓存
 *
 * @param vehicleId - 车辆 ID
 * @returns 车辆信息（包含文档），如果不存在则返回 null
 */
export async function getVehicleById(vehicleId: string): Promise<VehicleWithDocuments | null> {
  // 委托给 VehiclesRepository 处理（带缓存）
  return vehiclesRepository.getById(vehicleId)
}

/**
 * 根据车辆ID获取车辆信息（包含司机详细信息）
 *
 * 使用 VehiclesRepository 进行缓存管理：
 * - 缓存 TTL: 5 分钟
 * - 在车辆更新/删除时自动清除缓存
 *
 * @param vehicleId - 车辆 ID
 * @returns 车辆信息（包含司机详细信息），如果不存在则返回 null
 */
export async function getVehicleWithDriverDetails(vehicleId: string): Promise<VehicleWithDriverDetails | null> {
  // 委托给 VehiclesRepository 处理（带缓存）
  return vehiclesRepository.getWithDriverDetails(vehicleId)
}

/**
 * 根据司机ID获取车辆列表
 */
export async function getVehiclesByDriverId(driverId: string): Promise<Vehicle[]> {
  logger.db('查询', 'vehicles', {driverId})
  try {
    const {data, error} = await supabase
      .from('vehicles')
      .select('*')
      .eq('id', driverId)
      .order('created_at', {ascending: false})

    if (error) {
      logger.error('获取司机车辆列表失败', error)
      return []
    }

    return Array.isArray(data) ? data : []
  } catch (error) {
    logger.error('获取司机车辆列表异常', error)
    return []
  }
}

/**
 * 添加车辆
 * 将车辆数据分离为核心字段（vehicles表）和扩展字段（vehicle_documents表）
 * 
 * @param vehicle - 车辆输入数据（包含核心字段和扩展字段）
 * @returns 创建的车辆对象，失败返回 null
 * 
 * 注意：vehicles表已优化，扩展字段（行驶证信息、照片、租赁信息等）
 * 存储在vehicle_documents表中，通过vehicle_id关联
 */
export async function insertVehicle(vehicle: VehicleInput): Promise<Vehicle | null> {
  logger.db('插入', 'vehicles', {plate: vehicle.plate_number})
  try {
    const {
      data: {user}
    } = await supabase.auth.getUser()

    if (!user) {
      logger.error('添加车辆失败: 用户未登录')
      return null
    }

    if (!vehicle.plate_number?.trim()) {
      logger.error('添加车辆失败: 车牌号不能为空')
      return null
    }

    // 分离核心字段和扩展字段
    // 核心字段：存储在vehicles表
    const coreFields = {
      plate_number: vehicle.plate_number,
      brand: vehicle.brand,
      model: vehicle.model,
      color: vehicle.color,
      vin: vehicle.vin,
      owner_id: vehicle.owner_id,
      current_driver_id: vehicle.current_driver_id,
      driver_id: vehicle.driver_id,
      user_id: vehicle.user_id,
      warehouse_id: vehicle.warehouse_id,
      vehicle_type: vehicle.vehicle_type,
      purchase_date: vehicle.purchase_date,
      status: vehicle.status,
      review_status: vehicle.review_status,
      ownership_type: vehicle.ownership_type,
      is_active: vehicle.is_active,
      notes: vehicle.notes
    }

    // 扩展字段：存储在vehicle_documents表
    const documentFields = {
      // 行驶证信息
      owner_name: vehicle.owner_name,
      use_character: vehicle.use_character,
      register_date: vehicle.register_date,
      issue_date: vehicle.issue_date,
      engine_number: vehicle.engine_number,
      archive_number: vehicle.archive_number,
      total_mass: vehicle.total_mass ? Number(vehicle.total_mass) : null,
      approved_passengers: vehicle.approved_passengers ? Number(vehicle.approved_passengers) : null,
      curb_weight: vehicle.curb_weight ? Number(vehicle.curb_weight) : null,
      approved_load: vehicle.approved_load ? Number(vehicle.approved_load) : null,
      overall_dimension_length: vehicle.overall_dimension_length ? Number(vehicle.overall_dimension_length) : null,
      overall_dimension_width: vehicle.overall_dimension_width ? Number(vehicle.overall_dimension_width) : null,
      overall_dimension_height: vehicle.overall_dimension_height ? Number(vehicle.overall_dimension_height) : null,
      inspection_valid_until: vehicle.inspection_valid_until,
      inspection_date: vehicle.inspection_date,
      mandatory_scrap_date: vehicle.mandatory_scrap_date,
      // 行驶证照片（单张）
      driving_license_main_photo: vehicle.driving_license_main_photo,
      driving_license_sub_photo: vehicle.driving_license_sub_photo,
      driving_license_back_photo: vehicle.driving_license_back_photo,
      driving_license_sub_back_photo: vehicle.driving_license_sub_back_photo,
      // 车辆照片（单张）
      left_front_photo: vehicle.left_front_photo,
      right_front_photo: vehicle.right_front_photo,
      left_rear_photo: vehicle.left_rear_photo,
      right_rear_photo: vehicle.right_rear_photo,
      dashboard_photo: vehicle.dashboard_photo,
      rear_door_photo: vehicle.rear_door_photo,
      cargo_box_photo: vehicle.cargo_box_photo,
      // 照片数组字段（用于详情页展示）
      pickup_photos: vehicle.pickup_photos,
      return_photos: vehicle.return_photos,
      registration_photos: vehicle.registration_photos,
      damage_photos: vehicle.damage_photos,
      // 时间字段
      pickup_time: vehicle.pickup_time,
      return_time: vehicle.return_time,
      // 租赁信息
      lessor_name: vehicle.lessor_name,
      lessor_contact: vehicle.lessor_contact,
      lessee_name: vehicle.lessee_name,
      lessee_contact: vehicle.lessee_contact,
      monthly_rent: vehicle.monthly_rent ? Number(vehicle.monthly_rent) : null,
      lease_start_date: vehicle.lease_start_date,
      lease_end_date: vehicle.lease_end_date,
      rent_payment_day: vehicle.rent_payment_day ? Number(vehicle.rent_payment_day) : null
    }

    // 过滤掉undefined值，只保留有值的核心字段
    const filteredCoreFields = Object.fromEntries(
      Object.entries(coreFields).filter(([_, v]) => v !== undefined)
    )

    // 1. 插入vehicles表（核心字段）
    const {data, error} = await supabase
      .from('vehicles')
      .insert(filteredCoreFields)
      .select()
      .maybeSingle()

    if (error) {
      logger.error('添加车辆失败', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        vehicle: filteredCoreFields
      })
      // 检查是否是重复车牌号错误（PostgreSQL 唯一约束冲突错误码为 23505）
      if (error.code === '23505' && error.message.includes('plate_number')) {
        // 抛出特定错误，让调用方可以识别并处理
        throw new Error(`DUPLICATE_PLATE:${vehicle.plate_number}`)
      }
      return null
    }

    // 2. 如果有扩展字段，插入vehicle_documents表
    if (data) {
      // 检查是否有任何扩展字段有值
      const hasDocumentFields = Object.values(documentFields).some(v => v !== undefined && v !== null)
      
      if (hasDocumentFields) {
        // 过滤掉undefined和null值
        const filteredDocFields = Object.fromEntries(
          Object.entries(documentFields).filter(([_, v]) => v !== undefined && v !== null)
        )

        const {error: docError} = await supabase
          .from('vehicle_documents')
          .insert({
            vehicle_id: data.id,
            // 添加默认的 document_type 值，避免 NOT NULL 约束错误
            // 这是因为数据库中 document_type 字段可能有 NOT NULL 约束
            document_type: 'vehicle_registration',
            ...filteredDocFields
          })

        if (docError) {
          logger.error('添加车辆扩展信息失败', {
            message: docError.message,
            details: docError.details,
            hint: docError.hint,
            code: docError.code,
            vehicleId: data.id
          })
          
          // 扩展信息插入失败时，回滚删除已创建的车辆记录
          // 这样用户可以重新录入相同车牌号的车辆
          logger.warn('扩展信息保存失败，回滚删除车辆记录', {vehicleId: data.id})
          const {error: rollbackError} = await supabase
            .from('vehicles')
            .delete()
            .eq('id', data.id)
          
          if (rollbackError) {
            logger.error('回滚删除车辆记录失败', {
              vehicleId: data.id,
              error: rollbackError.message
            })
          }
          
          // 抛出错误，让调用方知道操作失败
          throw new Error(`车辆扩展信息保存失败: ${docError.message}`)
        }
      }
    }

    // 清除缓存（使用 Repository 统一管理）
    vehiclesRepository.invalidateCache()

    // 发布车辆创建事件，通知相关页面刷新
    if (data) {
      publish('vehicle:created', {
        id: data.id,
        plate_number: data.plate_number,
        user_id: data.user_id,
        status: data.status
      })
    }

    return data
  } catch (error) {
    logger.error('添加车辆异常', error)
    // 重新抛出特定错误（如 DUPLICATE_PLATE），让调用方可以识别并处理
    if (error instanceof Error && error.message.startsWith('DUPLICATE_PLATE:')) {
      throw error
    }
    // 重新抛出扩展信息保存失败的错误
    if (error instanceof Error && error.message.includes('车辆扩展信息保存失败')) {
      throw error
    }
    return null
  }
}

/**
 * 更新车辆信息
 * 将更新数据分离为核心字段（vehicles表）和扩展字段（vehicle_documents表）
 * 
 * @param vehicleId - 车辆ID
 * @param updates - 更新数据（包含核心字段和扩展字段）
 * @returns 更新后的车辆对象，失败返回 null
 * 
 * 注意：扩展字段（行驶证信息、照片、租赁信息等）会更新到 vehicle_documents 表
 */
export async function updateVehicle(vehicleId: string, updates: VehicleUpdate): Promise<Vehicle | null> {
  logger.db('更新', 'vehicles', {vehicleId, updates})
  try {
    // 分离核心字段和扩展字段
    // 核心字段：存储在 vehicles 表
    const coreFields: Record<string, unknown> = {}
    // 扩展字段：存储在 vehicle_documents 表
    const documentFields: Record<string, unknown> = {}

    // 核心字段列表（vehicles 表）
    const coreFieldNames = [
      'plate_number', 'brand', 'model', 'color', 'vin',
      'owner_id', 'current_driver_id', 'driver_id', 'user_id', 'warehouse_id',
      'vehicle_type', 'purchase_date', 'status', 'review_status', 'ownership_type',
      'is_active', 'notes', 'reviewed_at', 'reviewed_by'
    ]

    // 扩展字段列表（vehicle_documents 表）
    // 审计补充：添加所有照片数组字段和时间字段
    const documentFieldNames = [
      // 审核相关
      'review_notes', 'required_photos',
      // 照片数组字段（审计补充：确保所有数组字段都能正确更新到 vehicle_documents 表）
      'damage_photos', 'pickup_photos', 'return_photos', 'registration_photos',
      // 时间字段
      'pickup_time', 'return_time',
      // 租赁信息
      'lessor_name', 'lessor_contact', 'lessee_name', 'lessee_contact',
      'monthly_rent', 'lease_start_date', 'lease_end_date', 'rent_payment_day'
    ]

    // 分离字段
    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined) continue
      
      if (coreFieldNames.includes(key)) {
        coreFields[key] = value
      } else if (documentFieldNames.includes(key)) {
        documentFields[key] = value
      } else {
        // 未知字段默认放入核心字段
        coreFields[key] = value
      }
    }

    let data: Vehicle | null = null

    // 1. 更新 vehicles 表（核心字段）
    if (Object.keys(coreFields).length > 0) {
      const {data: vehicleData, error} = await supabase
        .from('vehicles')
        .update({...coreFields, updated_at: new Date().toISOString()})
        .eq('id', vehicleId)
        .select()
        .maybeSingle()

      if (error) {
        logger.error('更新车辆核心信息失败', error)
        return null
      }
      data = vehicleData
    } else {
      // 如果没有核心字段更新，获取当前车辆数据
      const {data: vehicleData} = await supabase
        .from('vehicles')
        .select('*')
        .eq('id', vehicleId)
        .maybeSingle()
      data = vehicleData
    }

    // 2. 更新 vehicle_documents 表（扩展字段）
    if (Object.keys(documentFields).length > 0) {
      const {error: docError} = await supabase
        .from('vehicle_documents')
        .update({...documentFields, updated_at: new Date().toISOString()})
        .eq('vehicle_id', vehicleId)

      if (docError) {
        logger.error('更新车辆扩展信息失败', {
          message: docError.message,
          details: docError.details,
          hint: docError.hint,
          code: docError.code,
          vehicleId
        })
        // 扩展信息更新失败不影响核心信息的更新结果
        // 但记录警告日志
        logger.warn('车辆扩展信息更新失败，但核心信息已更新', {vehicleId})
      }
    }

    // 清除缓存（使用 Repository 统一管理）
    vehiclesRepository.invalidateCache()

    // 发布车辆更新事件，通知相关页面刷新
    if (data) {
      publish('vehicle:updated', {
        id: vehicleId,
        ...updates
      })
    }

    return data
  } catch (error) {
    logger.error('更新车辆信息异常', error)
    return null
  }
}

/**
 * 删除车辆（包含图片文件）
 * @param vehicleId - 车辆ID
 * @returns 是否删除成功
 */
export async function deleteVehicle(vehicleId: string): Promise<boolean> {
  logger.db('删除', 'vehicles', {vehicleId})
  try {
    const vehicle = await getVehicleById(vehicleId)
    if (!vehicle) {
      logger.error('车辆不存在', {vehicleId})
      return false
    }

    // 收集所有需要删除的图片
    const allPhotos: string[] = []
    if (vehicle.document) {
      const doc = vehicle.document
      if (doc.pickup_photos) allPhotos.push(...doc.pickup_photos)
      if (doc.return_photos) allPhotos.push(...doc.return_photos)
      if (doc.registration_photos) allPhotos.push(...doc.registration_photos)
      if (doc.damage_photos) allPhotos.push(...doc.damage_photos)
      if (doc.left_front_photo) allPhotos.push(doc.left_front_photo)
      if (doc.right_front_photo) allPhotos.push(doc.right_front_photo)
      if (doc.left_rear_photo) allPhotos.push(doc.left_rear_photo)
      if (doc.right_rear_photo) allPhotos.push(doc.right_rear_photo)
      if (doc.dashboard_photo) allPhotos.push(doc.dashboard_photo)
      if (doc.rear_door_photo) allPhotos.push(doc.rear_door_photo)
      if (doc.cargo_box_photo) allPhotos.push(doc.cargo_box_photo)
      if (doc.driving_license_main_photo) allPhotos.push(doc.driving_license_main_photo)
      if (doc.driving_license_sub_photo) allPhotos.push(doc.driving_license_sub_photo)
      if (doc.driving_license_back_photo) allPhotos.push(doc.driving_license_back_photo)
      if (doc.driving_license_sub_back_photo) allPhotos.push(doc.driving_license_sub_back_photo)
    }

    // 删除存储桶中的图片
    // 使用已存在的 h5-app 存储桶
    const bucketName = 'h5-app'
    if (allPhotos.length > 0) {
      const photoPaths = allPhotos.filter((photo) => {
        return photo && !photo.startsWith('http://') && !photo.startsWith('https://')
      })

      if (photoPaths.length > 0) {
        await supabase.storage.from(bucketName).remove(photoPaths)
      }
    }

    // 保存车辆信息用于事件发布
    const plateNumber = vehicle.plate_number
    const userId = vehicle.user_id

    // 删除车辆记录
    const {error} = await supabase.from('vehicles').delete().eq('id', vehicleId)

    if (error) {
      logger.error('删除车辆失败', error)
      return false
    }

    // 清除缓存（使用 Repository 统一管理）
    vehiclesRepository.invalidateCache()

    // 发布车辆删除事件，通知相关页面刷新
    publish('vehicle:deleted', {
      id: vehicleId,
      plate_number: plateNumber,
      user_id: userId
    })

    return true
  } catch (error) {
    logger.error('删除车辆异常', error)
    return false
  }
}

/**
 * 根据车牌号删除车辆
 * 用于处理重复车牌号的情况，允许用户删除已存在的车辆记录
 * @param plateNumber - 车牌号
 * @returns 是否删除成功
 */
export async function deleteVehicleByPlateNumber(plateNumber: string): Promise<boolean> {
  logger.db('根据车牌号删除', 'vehicles', {plateNumber})
  try {
    // 1. 先查询车辆信息
    const {data: vehicle, error: queryError} = await supabase
      .from('vehicles')
      .select('id')
      .eq('plate_number', plateNumber)
      .maybeSingle()

    if (queryError) {
      logger.error('查询车辆失败', {error: queryError, plateNumber})
      return false
    }

    if (!vehicle) {
      logger.warn('车辆不存在', {plateNumber})
      return false
    }

    // 2. 使用已有的 deleteVehicle 函数删除车辆
    return await deleteVehicle(vehicle.id)
  } catch (error) {
    logger.error('根据车牌号删除车辆异常', {error, plateNumber})
    return false
  }
}

/**
 * 还车录入
 * @param vehicleId - 车辆ID
 * @param returnPhotos - 还车照片URL数组
 * @returns 更新后的车辆对象（包含文档），失败返回 null
 */
export async function returnVehicle(vehicleId: string, returnPhotos: string[]): Promise<VehicleWithDocuments | null> {
  logger.db('更新', 'vehicles', {vehicleId, action: '还车录入'})
  try {
    // 1. 更新车辆状态为 returned（还车待审核），审核状态为 pending_review
    const {error: vehicleError} = await supabase
      .from('vehicles')
      .update({
        status: 'returned',
        review_status: 'pending_review',
        updated_at: new Date().toISOString()
      })
      .eq('id', vehicleId)
      .select()
      .maybeSingle()

    if (vehicleError) {
      logger.error('更新车辆状态失败', vehicleError)
      return null
    }

    // 2. 更新车辆文档的还车信息
    const {error: docError} = await supabase
      .from('vehicle_documents')
      .update({
        return_time: new Date().toISOString(),
        return_photos: returnPhotos
      })
      .eq('vehicle_id', vehicleId)

    if (docError) {
      logger.error('更新还车信息失败', docError)
      // 回滚车辆状态
      await supabase.from('vehicles').update({status: 'active', review_status: 'approved'}).eq('id', vehicleId)
      return null
    }

    // 3. 清除缓存（使用 Repository 统一管理）
    vehiclesRepository.invalidateCache()

    // 4. 获取更新后的车辆信息
    const updatedVehicle = await getVehicleById(vehicleId)

    // 5. 发布车辆归还审核提交事件，通知管理员页面刷新
    publish('vehicle:review_submitted', {
      vehicle_id: vehicleId,
      status: 'pending_review',
      review_type: 'return'
    })

    // 6. 发送还车审核通知给管理员
    if (updatedVehicle && updatedVehicle.user_id) {
      // 获取司机信息
      const {data: driver} = await supabase
        .from('users')
        .select('name, driver_type')
        .eq('id', updatedVehicle.user_id)
        .maybeSingle()

      const driverType: DriverType = driver?.driver_type === 'with_vehicle' ? 'with_vehicle' : 'pure'
      let driverName = driver?.name || ''
      driverName = driverName.replace(/^(纯司机|带车司机|司机)\s*/, '') || '司机'

      // 获取司机的仓库列表
      const {data: warehouseAssignments} = await supabase
        .from('warehouse_assignments')
        .select('warehouse_id, warehouses(id, name)')
        .eq('user_id', updatedVehicle.user_id)
      const warehouses: WarehouseInfo[] = (warehouseAssignments || [])
        .map((wa: any) => wa.warehouses)
        .filter((w: any) => w && w.name)
        .map((w: any) => ({id: w.id, name: w.name}))

      const warehouseLabel = warehouses.length === 0 ? '未分配仓库' : warehouses.length === 1 ? warehouses[0].name : '多仓库'
      const driverTypeLabel = driverType === 'with_vehicle' ? '带车司机' : '纯司机'

      // 发送还车审核通知
      await sendDriverSubmissionNotification({
        driverId: updatedVehicle.user_id,
        driverName: driverName,
        type: 'vehicle_review_pending',
        title: '新的还车审核',
        content: `${warehouseLabel} ${driverTypeLabel}${driverName} 提交了车牌号：${updatedVehicle.plate_number || '未知'} 的还车审核申请`,
        relatedId: vehicleId,
        approvalStatus: 'pending'
      })
    }

    return updatedVehicle
  } catch (error) {
    logger.error('还车录入异常', error)
    return null
  }
}

/**
 * 根据车牌号获取车辆信息
 */
export async function getVehicleByPlateNumber(plateNumber: string): Promise<VehicleWithDriver | null> {
  logger.db('查询', 'vehicles', {plateNumber})
  try {
    const {data, error} = await supabase
      .from('vehicles')
      .select(`
        *,
        driver:driver_id (
          id,
          name,
          phone,
          email
        ),
        document:vehicle_documents(*)
      `)
      .eq('plate_number', plateNumber)
      .maybeSingle()

    if (error) {
      logger.error('根据车牌号获取车辆信息失败', {error, plateNumber})
      return null
    }

    if (!data) {
      return null
    }

    // 优先使用 user_id（新数据），其次使用 driver_id（旧数据）
    let driverId = data.user_id || data.driver_id

    // 如果没有司机ID但有还车时间，尝试从历史记录中获取
    if (!driverId && data.return_time) {
      const {data: recordData} = await supabase
        .from('vehicle_records')
        .select('driver_id')
        .eq('vehicle_id', data.id)
        .order('created_at', {ascending: false})
        .limit(1)
        .maybeSingle()

      if (recordData?.driver_id) {
        driverId = recordData.driver_id
      }
    }

    // 获取司机基本信息
    if (driverId) {
      const {data: driverData} = await supabase
        .from('users')
        .select('id, name, phone, email')
        .eq('id', driverId)
        .maybeSingle()

      if (driverData) {
        const vehicleWithDriver = data as VehicleWithDriver
        vehicleWithDriver.driver = driverData as Profile
      }

      // 获取司机实名信息（驾驶证、身份证）
      const {data: licenseData} = await supabase
        .from('driver_licenses')
        .select(`
          id_card_photo_front,
          id_card_photo_back,
          driving_license_photo,
          id_card_name,
          id_card_number,
          id_card_address,
          id_card_birth_date,
          license_number,
          license_class,
          first_issue_date,
          valid_from,
          valid_to,
          issue_authority
        `)
        .eq('driver_id', driverId)
        .maybeSingle()

      if (licenseData) {
        const vehicleWithDriver = data as VehicleWithDriver
        vehicleWithDriver.driver_license = licenseData as DriverLicense
      }
    }

    // 使用辅助函数平铺字段
    return flattenVehicleDocument(data) as VehicleWithDriver
  } catch (error) {
    logger.error('根据车牌号获取车辆信息异常', {error, plateNumber})
    return null
  }
}

// ==================== 驾驶员证件管理 API ====================

/**
 * 获取驾驶员证件信息
 *
 * 使用 DriverLicensesRepository 进行缓存管理：
 * - 缓存 TTL: 5 分钟
 * - 在驾驶证创建/更新/删除时自动清除缓存
 *
 * @param driverId - 司机 ID
 * @returns 驾驶员证件信息，如果不存在则返回 null
 */
export async function getDriverLicense(driverId: string): Promise<DriverLicense | null> {
  // 委托给 DriverLicensesRepository 处理（带缓存）
  return driverLicensesRepository.getByDriverId(driverId)
}

/**
 * 添加或更新驾驶员证件信息
 * @param license - 驾驶员证件输入数据
 * @returns 保存后的驾驶员证件对象，失败返回 null
 */
export async function upsertDriverLicense(license: DriverLicenseInput): Promise<DriverLicense | null> {
  // 记录详细的输入数据，便于调试
  logger.db('插入/更新', 'driver_licenses', {
    driverId: license.driver_id,
    hasIdCardFront: !!license.id_card_photo_front,
    hasIdCardBack: !!license.id_card_photo_back,
    hasDriverLicense: !!license.driving_license_photo
  })

  try {
    const {data, error} = await supabase
      .from('driver_licenses')
      .upsert(license, {onConflict: 'driver_id'})
      .select()
      .maybeSingle()

    if (error) {
      logger.error('保存驾驶员证件信息失败', {error, license})
      return null
    }

    // 验证保存结果
    if (data) {
      logger.info('驾驶员证件信息保存成功', {
        driverId: data.driver_id,
        savedIdCardFront: data.id_card_photo_front,
        savedIdCardBack: data.id_card_photo_back,
        savedDriverLicense: data.driving_license_photo
      })
    }

    // 清除驾驶证缓存（使用 Repository 统一管理）
    driverLicensesRepository.clearCache()

    // 发布驾照信息更新事件，通知相关页面刷新
    if (data) {
      publish('driver_license:updated', {
        driver_id: data.driver_id,
        id_card_name: data.id_card_name
      })
    }

    return data
  } catch (error) {
    logger.error('保存驾驶员证件信息异常', error)
    return null
  }
}

/**
 * 更新驾驶员证件信息
 * @param driverId - 司机ID
 * @param updates - 更新数据
 * @returns 更新后的驾驶员证件对象，失败返回 null
 */
export async function updateDriverLicense(
  driverId: string,
  updates: DriverLicenseUpdate
): Promise<DriverLicense | null> {
  logger.db('更新', 'driver_licenses', {driverId, updates})
  try {
    const {data, error} = await supabase
      .from('driver_licenses')
      .update({...updates, updated_at: new Date().toISOString()})
      .eq('driver_id', driverId)
      .select()
      .maybeSingle()

    if (error) {
      logger.error('更新驾驶员证件信息失败', error)
      return null
    }

    // 清除驾驶证缓存（使用 Repository 统一管理）
    driverLicensesRepository.clearCache()

    // 发布驾照信息更新事件，通知相关页面刷新
    if (data) {
      publish('driver_license:updated', {
        driver_id: driverId,
        id_card_name: data.id_card_name,
        ...updates
      })
    }

    return data
  } catch (error) {
    logger.error('更新驾驶员证件信息异常', error)
    return null
  }
}

/**
 * 删除驾驶员证件信息
 * @param driverId - 司机ID
 * @returns 是否删除成功
 */
export async function deleteDriverLicense(driverId: string): Promise<boolean> {
  try {
    // 先获取驾照信息，用于后续删除图片和发布事件
    const license = await getDriverLicense(driverId)

    const {error} = await supabase.from('driver_licenses').delete().eq('driver_id', driverId)

    if (error) {
      console.error('删除驾驶员证件信息失败:', error)
      return false
    }

    // 删除关联的图片文件
    if (license) {
      const imagePaths: string[] = []
      if (license.id_card_photo_front) imagePaths.push(license.id_card_photo_front)
      if (license.id_card_photo_back) imagePaths.push(license.id_card_photo_back)
      if (license.driving_license_photo) imagePaths.push(license.driving_license_photo)

      if (imagePaths.length > 0) {
        const relativeImagePaths = imagePaths.filter(
          (path) => !path.startsWith('http://') && !path.startsWith('https://')
        )

        if (relativeImagePaths.length > 0) {
          // 使用已存在的 h5-app 存储桶
          const bucketName = 'h5-app'
          await supabase.storage.from(bucketName).remove(relativeImagePaths)
        }
      }
    }

    // 清除驾驶证缓存（使用 Repository 统一管理）
    driverLicensesRepository.clearCache()

    // 发布驾照信息删除事件，通知相关页面刷新
    publish('driver_license:deleted', {
      driver_id: driverId
    })

    return true
  } catch (error) {
    console.error('删除驾驶员证件信息异常:', error)
    return false
  }
}

/**
 * 获取司机的详细信息（包括驾驶证和车辆信息）
 */
export async function getDriverDetailInfo(driverId: string) {
  try {
    const profile = await getProfileById(driverId)
    if (!profile) {
      return null
    }

    const license = await getDriverLicense(driverId)
    const vehicles = await getVehiclesByDriverId(driverId)

    let age: number | null = null
    if (license?.id_card_birth_date) {
      const birth = new Date(license.id_card_birth_date)
      const today = new Date()
      age = today.getFullYear() - birth.getFullYear()
      const monthDiff = today.getMonth() - birth.getMonth()
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--
      }
    }

    let drivingYears: number | null = null
    if (license?.first_issue_date) {
      const issueDate = new Date(license.first_issue_date)
      const today = new Date()
      drivingYears = today.getFullYear() - issueDate.getFullYear()
      const monthDiff = today.getMonth() - issueDate.getMonth()
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < issueDate.getDate())) {
        drivingYears--
      }
    }

    let workDays: number | null = null
    let joinDate: string | null = null

    if (profile.join_date) {
      joinDate = profile.join_date
    } else if (profile.created_at) {
      joinDate = profile.created_at.split('T')[0]
    }

    if (joinDate) {
      const join = new Date(joinDate)
      const today = new Date()
      const timeDiff = today.getTime() - join.getTime()
      workDays = Math.floor(timeDiff / (1000 * 60 * 60 * 24))
    }

    let driverType = '未设置'
    const isNewDriver = workDays !== null && workDays <= 7
    const hasVehicle = vehicles.length > 0

    if (hasVehicle) {
      driverType = isNewDriver ? '新带车司机' : '带车司机'
    } else {
      driverType = isNewDriver ? '新纯司机' : '纯司机'
    }

    return {
      profile,
      license,
      vehicles,
      age,
      drivingYears,
      driverType,
      joinDate,
      workDays
    }
  } catch (error) {
    console.error('获取司机详细信息失败:', error)
    return null
  }
}

// ==================== 车辆审核管理 API ====================

/**
 * 提交车辆审核
 * @param vehicleId - 车辆ID
 * @returns 是否提交成功
 *
 * v1.3.18 更新：添加通知发送逻辑
 * 使用 buildSubmissionMessage 组装消息格式：{仓库名} {司机类型} {姓名} 提交了{申请类型}申请
 */
export async function submitVehicleForReview(vehicleId: string): Promise<boolean> {
  try {
    logger.db('提交车辆审核', 'vehicles', {vehicleId})

    // 1. 获取车辆信息（包括司机ID和车牌号）
    const {data: vehicle, error: vehicleError} = await supabase
      .from('vehicles')
      .select('id, user_id, plate_number')
      .eq('id', vehicleId)
      .maybeSingle()

    if (vehicleError || !vehicle) {
      logger.error('获取车辆信息失败', vehicleError)
      return false
    }

    // 2. 更新车辆审核状态
    const {error} = await supabase
      .from('vehicles')
      .update({
        review_status: 'pending_review',
        updated_at: new Date().toISOString()
      })
      .eq('id', vehicleId)

    if (error) {
      logger.error('提交车辆审核失败', error)
      return false
    }

    // 清除缓存（使用 Repository 统一管理）
    vehiclesRepository.invalidateCache()

    // 发布车辆审核提交事件，通知管理员页面刷新
    publish('vehicle:review_submitted', {
      vehicle_id: vehicleId,
      status: 'pending_review'
    })

    // 3. 发送通知给管理员
    if (vehicle.user_id) {
      // 获取司机信息（包括姓名、司机类型）
      const {data: driver} = await supabase
        .from('users')
        .select('name, driver_type')
        .eq('id', vehicle.user_id)
        .maybeSingle()
      // 获取司机类型
      const driverType: DriverType = driver?.driver_type === 'with_vehicle' ? 'with_vehicle' : 'pure'
      // 清理姓名中可能存在的司机类型前缀，避免消息中出现"纯司机司机"这样的重复
      let driverName = driver?.name || ''
      // 移除可能的司机类型前缀（纯司机、带车司机、司机）
      driverName = driverName.replace(/^(纯司机|带车司机|司机)\s*/, '') || '司机'

      // 获取司机的仓库列表
      const {data: warehouseAssignments} = await supabase
        .from('warehouse_assignments')
        .select('warehouse_id, warehouses(id, name)')
        .eq('user_id', vehicle.user_id)
      const warehouses: WarehouseInfo[] = (warehouseAssignments || [])
        .map((wa: any) => wa.warehouses)
        .filter((w: any) => w && w.name)
        .map((w: any) => ({id: w.id, name: w.name}))

      // 获取仓库显示名称
      const warehouseLabel = warehouses.length === 0 ? '未分配仓库' : warehouses.length === 1 ? warehouses[0].name : '多仓库'
      // 获取司机类型显示名称
      const driverTypeLabel = driverType === 'with_vehicle' ? '带车司机' : '纯司机'

      // 消息格式：{仓库名} {司机类型}{姓名} 提交了车牌号：{车牌号} 的车辆审核申请
      // 示例：北京仓 带车司机张三 提交了车牌号：京A12345 的车辆审核申请
      await sendDriverSubmissionNotification({
        driverId: vehicle.user_id,
        driverName: driverName,
        type: 'vehicle_review_pending',
        title: '新的车辆审核',
        content: `${warehouseLabel} ${driverTypeLabel}${driverName} 提交了车牌号：${vehicle.plate_number || '未知'} 的车辆审核申请`,
        relatedId: vehicleId,
        approvalStatus: 'pending'
      })
    }

    return true
  } catch (error) {
    logger.error('提交车辆审核异常', error)
    return false
  }
}

/**
 * 获取待审核车辆列表
 */
export async function getPendingReviewVehicles(): Promise<Vehicle[]> {
  try {
    logger.db('查询待审核车辆列表', 'vehicles', {})

    const {data, error} = await supabase
      .from('vehicles')
      .select('*')
      .eq('review_status', 'pending_review')
      .order('created_at', {ascending: false})

    if (error) {
      logger.error('查询待审核车辆列表失败', error)
      return []
    }

    return Array.isArray(data) ? data : []
  } catch (error) {
    logger.error('查询待审核车辆列表异常', error)
    return []
  }
}

/**
 * 切换图片锁定状态（合并了 lockPhoto 和 unlockPhoto 的功能）
 * 用于审核流程中锁定或解锁车辆图片
 *
 * @param vehicleId - 车辆ID
 * @param photoField - 图片字段名（如 'left_front_photo', 'right_rear_photo' 等）
 * @param photoIndex - 图片索引（同一字段可能有多张图片）
 * @param lock - true 表示锁定，false 表示解锁
 * @returns 操作是否成功
 */
export async function togglePhotoLock(
  vehicleId: string,
  photoField: string,
  photoIndex: number,
  lock: boolean
): Promise<boolean> {
  // 操作类型描述，用于日志记录
  const operation = lock ? '锁定' : '解锁'

  try {
    logger.db(`${operation}图片`, 'vehicle_documents', {vehicleId, photoField, photoIndex, lock})

    // 1. 获取当前车辆文档的锁定状态
    const {data: document, error: fetchError} = await supabase
      .from('vehicle_documents')
      .select('locked_photos')
      .eq('vehicle_id', vehicleId)
      .maybeSingle()

    if (fetchError || !document) {
      logger.error('获取车辆文档信息失败', fetchError)
      return false
    }

    // 2. 解析当前锁定状态
    const lockedPhotos = document.locked_photos || {}
    const fieldLocks: number[] = lockedPhotos[photoField] || []

    // 3. 根据操作类型更新锁定列表
    let newFieldLocks: number[]
    let needsUpdate = false

    if (lock) {
      // 锁定操作：如果不存在则添加
      if (!fieldLocks.includes(photoIndex)) {
        newFieldLocks = [...fieldLocks, photoIndex]
        needsUpdate = true
      } else {
        // 已经锁定，无需更新
        newFieldLocks = fieldLocks
      }
    } else {
      // 解锁操作：移除指定索引
      newFieldLocks = fieldLocks.filter((idx: number) => idx !== photoIndex)
      // 只有当列表发生变化时才需要更新
      needsUpdate = newFieldLocks.length !== fieldLocks.length
    }

    // 4. 如果需要更新，执行数据库更新
    if (needsUpdate) {
      lockedPhotos[photoField] = newFieldLocks

      const {error: updateError} = await supabase
        .from('vehicle_documents')
        .update({
          locked_photos: lockedPhotos,
          updated_at: new Date().toISOString()
        })
        .eq('vehicle_id', vehicleId)

      if (updateError) {
        logger.error(`${operation}图片失败`, updateError)
        return false
      }

      // 5. 清除相关缓存（使用 Repository 统一管理）
      vehiclesRepository.invalidateCache()
    }

    return true
  } catch (error) {
    logger.error(`${operation}图片异常`, error)
    return false
  }
}

/**
 * 删除图片（标记为需补录）
 */
export async function markPhotoForDeletion(
  vehicleId: string,
  photoField: string,
  photoIndex: number
): Promise<boolean> {
  try {
    logger.db('标记图片需补录', 'vehicle_documents', {vehicleId, photoField, photoIndex})

    // 从 vehicle_documents 表查询 required_photos 字段
    const {data: document, error: fetchError} = await supabase
      .from('vehicle_documents')
      .select('required_photos')
      .eq('vehicle_id', vehicleId)
      .maybeSingle()

    if (fetchError || !document) {
      logger.error('获取车辆文档信息失败', fetchError)
      return false
    }

    const requiredPhotos = document.required_photos || []
    const photoKey = `${photoField}_${photoIndex}`

    if (!requiredPhotos.includes(photoKey)) {
      requiredPhotos.push(photoKey)

      // 更新 vehicle_documents 表
      const {error: updateError} = await supabase
        .from('vehicle_documents')
        .update({
          required_photos: requiredPhotos,
          updated_at: new Date().toISOString()
        })
        .eq('vehicle_id', vehicleId)

      if (updateError) {
        logger.error('标记图片需补录失败', updateError)
        return false
      }
    }

    return true
  } catch (error) {
    logger.error('标记图片需补录异常', error)
    return false
  }
}

/**
 * 通过审核
 * @param vehicleId - 车辆ID
 * @param reviewerId - 审核人ID
 * @param notes - 审核备注
 * @returns 是否审核成功
 */
export async function approveVehicle(vehicleId: string, reviewerId: string, notes: string): Promise<boolean> {
  try {
    logger.db('通过车辆审核', 'vehicles', {vehicleId, reviewerId, notes})

    // 1. 更新车辆审核状态
    const {error: vehicleError} = await supabase
      .from('vehicles')
      .update({
        review_status: 'approved',
        reviewed_at: new Date().toISOString(),
        reviewed_by: reviewerId,
        updated_at: new Date().toISOString()
      })
      .eq('id', vehicleId)

    if (vehicleError) {
      logger.error('更新车辆审核状态失败', vehicleError)
      return false
    }

    // 2. 更新车辆文档审核信息
    const {error: docError} = await supabase
      .from('vehicle_documents')
      .update({
        review_notes: notes,
        required_photos: [],
        updated_at: new Date().toISOString()
      })
      .eq('vehicle_id', vehicleId)

    if (docError) {
      logger.error('更新车辆文档审核信息失败', docError)
      // 回滚车辆状态
      await supabase.from('vehicles').update({review_status: 'pending'}).eq('id', vehicleId)
      return false
    }

    // 3. 清除缓存（使用 Repository 统一管理）
    vehiclesRepository.invalidateCache()

    // 4. 发布车辆审核通过事件，通知司机页面刷新
    publish('vehicle:approved', {
      vehicle_id: vehicleId,
      reviewer_id: reviewerId,
      status: 'approved',
      notes
    })

    return true
  } catch (error) {
    logger.error('通过车辆审核异常', error)
    return false
  }
}

/**
 * 一键锁定车辆（锁定所有未标记需要补录的照片）
 */
export async function lockVehiclePhotos(
  vehicleId: string,
  reviewerId: string,
  notes: string,
  lockedPhotos: LockedPhotos
): Promise<boolean> {
  try {
    logger.db('一键锁定车辆照片', 'vehicles', {vehicleId, reviewerId, notes, lockedPhotos})

    const {error: vehicleError} = await supabase
      .from('vehicles')
      .update({
        review_status: 'approved',
        reviewed_at: new Date().toISOString(),
        reviewed_by: reviewerId,
        updated_at: new Date().toISOString()
      })
      .eq('id', vehicleId)

    if (vehicleError) {
      logger.error('更新车辆审核状态失败', vehicleError)
      return false
    }

    const {error: docError} = await supabase
      .from('vehicle_documents')
      .update({
        locked_photos: lockedPhotos,
        review_notes: notes,
        updated_at: new Date().toISOString()
      })
      .eq('vehicle_id', vehicleId)

    if (docError) {
      logger.error('更新车辆文档锁定信息失败', docError)
      await supabase.from('vehicles').update({review_status: 'pending'}).eq('id', vehicleId)
      return false
    }

    // 清除缓存（使用 Repository 统一管理）
    vehiclesRepository.invalidateCache()

    return true
  } catch (error) {
    logger.error('一键锁定车辆照片异常', error)
    return false
  }
}

/**
 * 要求补录
 * @param vehicleId - 车辆ID
 * @param reviewerId - 审核人ID
 * @param notes - 审核备注（说明需要补录的内容）
 * @returns 是否操作成功
 */
export async function requireSupplement(vehicleId: string, reviewerId: string, notes: string): Promise<boolean> {
  try {
    logger.db('要求补录车辆信息', 'vehicles', {vehicleId, reviewerId, notes})

    // 1. 更新车辆审核状态为需要补录
    const {error: vehicleError} = await supabase
      .from('vehicles')
      .update({
        review_status: 'need_supplement',
        reviewed_at: new Date().toISOString(),
        reviewed_by: reviewerId,
        updated_at: new Date().toISOString()
      })
      .eq('id', vehicleId)

    if (vehicleError) {
      logger.error('更新车辆审核状态失败', vehicleError)
      return false
    }

    // 2. 更新车辆文档审核备注
    const {error: docError} = await supabase
      .from('vehicle_documents')
      .update({
        review_notes: notes,
        updated_at: new Date().toISOString()
      })
      .eq('vehicle_id', vehicleId)

    if (docError) {
      logger.error('更新车辆文档审核备注失败', docError)
      // 回滚车辆状态
      await supabase.from('vehicles').update({review_status: 'pending'}).eq('id', vehicleId)
      return false
    }

    // 3. 清除缓存（使用 Repository 统一管理）
    vehiclesRepository.invalidateCache()

    // 4. 发布车辆需要补录事件，通知司机页面刷新
    publish('vehicle:supplement_required', {
      vehicle_id: vehicleId,
      reviewer_id: reviewerId,
      status: 'need_supplement',
      notes
    })

    return true
  } catch (error) {
    logger.error('要求补录车辆信息异常', error)
    return false
  }
}

/**
 * 补录图片（增强版）
 * 在更新照片的同时记录补录元数据，便于审核时快速定位补录的照片
 * 
 * 功能说明：
 * 1. 获取当前照片URL作为 original_url（用于追踪历史）
 * 2. 更新或创建 supplemented_photos 元数据
 * 3. 累加 supplement_count（记录补录次数）
 * 4. 从 required_photos 中移除已补录的照片标记
 * 
 * @param vehicleId - 车辆ID
 * @param photoField - 图片字段名（如 pickup_photos, return_photos, registration_photos 等）
 * @param photoIndex - 图片在数组中的索引
 * @param photoUrl - 新图片URL
 * @returns 是否补录成功
 * 
 * Requirements: 1.1, 2.2, 3.1
 */
export async function supplementPhoto(
  vehicleId: string,
  photoField: string,
  photoIndex: number,
  photoUrl: string
): Promise<boolean> {
  try {
    logger.db('补录图片', 'vehicle_documents', {vehicleId, photoField, photoIndex, photoUrl})

    // 参数验证
    if (!vehicleId || !photoField || photoIndex < 0 || !photoUrl) {
      logger.error('补录图片参数无效', {vehicleId, photoField, photoIndex, photoUrl})
      return false
    }

    // 从 vehicle_documents 表查询照片数组、required_photos 和 supplemented_photos 字段
    const {data: document, error: fetchError} = await supabase
      .from('vehicle_documents')
      .select('pickup_photos, return_photos, registration_photos, required_photos, supplemented_photos')
      .eq('vehicle_id', vehicleId)
      .maybeSingle()

    if (fetchError || !document) {
      logger.error('获取车辆文档信息失败', {
        fetchError,
        vehicleId,
        message: fetchError?.message,
        details: fetchError?.details
      })
      return false
    }

    // 获取当前照片数组
    const photos = (document as Record<string, string[]>)[photoField] || []
    // 保存原始照片URL（用于记录补录历史，满足 Requirements 3.1）
    const originalUrl = photos[photoIndex] || null
    // 更新为新照片
    photos[photoIndex] = photoUrl

    // 从 required_photos 中移除已补录的照片标记（满足 Requirements 2.2）
    const requiredPhotos = document.required_photos || []
    const photoKey = `${photoField}_${photoIndex}`
    const newRequiredPhotos = requiredPhotos.filter((key: string) => key !== photoKey)

    // 构建补录元数据（满足 Requirements 1.1）
    const supplementedPhotos = (document.supplemented_photos as SupplementedPhotos) || {}
    const existingMeta = supplementedPhotos[photoKey]
    // 累加补录次数，首次补录为1（满足 Requirements 3.1）
    const supplementCount = (existingMeta?.supplement_count || 0) + 1

    // 更新补录元数据，记录完整的补录信息
    const newSupplementedPhotos: SupplementedPhotos = {
      ...supplementedPhotos,
      [photoKey]: {
        field: photoField,
        index: photoIndex,
        supplemented_at: new Date().toISOString(),
        original_url: originalUrl,
        supplement_count: supplementCount
      }
    }

    // 更新 vehicle_documents 表
    const {error: updateError} = await supabase
      .from('vehicle_documents')
      .update({
        [photoField]: photos,
        required_photos: newRequiredPhotos,
        supplemented_photos: newSupplementedPhotos,
        updated_at: new Date().toISOString()
      })
      .eq('vehicle_id', vehicleId)

    if (updateError) {
      logger.error('补录图片失败', {
        updateError,
        vehicleId,
        photoField,
        photoIndex,
        message: updateError?.message,
        details: updateError?.details,
        hint: updateError?.hint,
        code: updateError?.code
      })
      return false
    }

    logger.info('补录图片成功', {vehicleId, photoField, photoIndex, supplementCount})
    
    // 清除缓存，确保数据一致性（使用 Repository 统一管理）
    vehiclesRepository.invalidateCache()

    // 发布补录成功事件，通知相关页面刷新
    publish('vehicle:photo_supplemented', {
      vehicle_id: vehicleId,
      photo_field: photoField,
      photo_index: photoIndex,
      supplement_count: supplementCount
    })

    return true
  } catch (error) {
    logger.error('补录图片异常', {error, vehicleId, photoField, photoIndex})
    return false
  }
}

/**
 * 获取需要补录的图片列表
 */
export async function getRequiredPhotos(vehicleId: string): Promise<string[]> {
  try {
    logger.db('获取需要补录的图片列表', 'vehicle_documents', {vehicleId})

    const {data, error} = await supabase
      .from('vehicle_documents')
      .select('required_photos')
      .eq('vehicle_id', vehicleId)
      .maybeSingle()

    if (error || !data) {
      logger.error('获取需要补录的图片列表失败', error)
      return []
    }

    return data.required_photos || []
  } catch (error) {
    logger.error('获取需要补录的图片列表异常', error)
    return []
  }
}

/**
 * 获取补录照片元数据
 * 用于审核页面显示哪些照片是补录的，便于老板快速定位补录的照片
 * 
 * @param vehicleId - 车辆ID
 * @returns 补录照片元数据映射，键为 "{field}_{index}"，值为补录详情
 * @example
 * // 返回示例
 * {
 *   "pickup_photos_0": {
 *     field: "pickup_photos",
 *     index: 0,
 *     supplemented_at: "2024-12-17T10:30:00Z",
 *     original_url: "https://xxx/old_photo.jpg",
 *     supplement_count: 1
 *   }
 * }
 * 
 * Requirements: 3.2, 3.3
 */
export async function getSupplementedPhotos(vehicleId: string): Promise<SupplementedPhotos> {
  try {
    logger.db('获取补录照片元数据', 'vehicle_documents', {vehicleId})

    // 参数验证
    if (!vehicleId) {
      logger.warn('获取补录照片元数据：vehicleId 为空')
      return {}
    }

    const {data, error} = await supabase
      .from('vehicle_documents')
      .select('supplemented_photos')
      .eq('vehicle_id', vehicleId)
      .maybeSingle()

    if (error) {
      logger.error('获取补录照片元数据失败', {error, vehicleId})
      return {}
    }

    // 如果没有数据或 supplemented_photos 为空，返回空对象
    if (!data || !data.supplemented_photos) {
      return {}
    }

    // 验证数据格式，确保返回的数据符合 SupplementedPhotos 类型
    const supplementedPhotos = data.supplemented_photos as SupplementedPhotos
    
    // 返回补录照片元数据
    return supplementedPhotos
  } catch (error) {
    logger.error('获取补录照片元数据异常', {error, vehicleId})
    return {}
  }
}
