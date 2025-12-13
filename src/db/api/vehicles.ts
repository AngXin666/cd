/**
 * 车辆管理 API
 *
 * 功能包括：
 * - 车辆CRUD操作
 * - 驾驶员证件管理
 * - 车辆审核管理
 * - 车辆归还流程
 * - 车辆统计
 */

import {supabase} from '@/client/supabase'
import {CACHE_KEYS, clearCache, clearCacheByPrefix} from '@/utils/cache'
import {createLogger} from '@/utils/logger'
import type {
  DriverLicense,
  DriverLicenseInput,
  DriverLicenseUpdate,
  LockedPhotos,
  Profile,
  Vehicle,
  VehicleInput,
  VehicleUpdate,
  VehicleWithDocuments,
  VehicleWithDriver,
  VehicleWithDriverDetails
} from '../types'

// 导入需要调用的users模块函数
import {getDriverDisplayName, getDriverName, getProfileById} from './users'

// 重新导出司机名称查询函数
export {getDriverDisplayName, getDriverName}

// 创建数据库操作日志记录器
const logger = createLogger('VehiclesAPI')

// ==================== 车辆管理 API ====================

/**
 * 测试函数：获取当前认证用户信息
 * 用于调试RLS策略问题
 */
export async function debugAuthStatus(): Promise<{
  authenticated: boolean
  userId: string | null
  email: string | null
  role: string | null
}> {
  try {
    const {
      data: {session},
      error: sessionError
    } = await supabase.auth.getSession()

    if (sessionError) {
      logger.error('获取session失败', sessionError)
      return {authenticated: false, userId: null, email: null, role: null}
    }

    if (!session) {
      return {authenticated: false, userId: null, email: null, role: null}
    }

    return {
      authenticated: true,
      userId: session.user.id,
      email: session.user.email || null,
      role: session.user.role || null
    }
  } catch (error) {
    logger.error('检查认证状态异常', error)
    return {authenticated: false, userId: null, email: null, role: null}
  }
}

/**
 * 获取司机的所有车辆
 */
export async function getDriverVehicles(driverId: string): Promise<Vehicle[]> {
  logger.db('查询', 'vehicles', {driverId})
  try {
    const {data, error} = await supabase
      .from('vehicles')
      .select('*')
      .eq('driver_id', driverId)
      .order('created_at', {ascending: false})

    if (error) {
      logger.error('获取司机车辆失败', {
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        driverId
      })
      return []
    }

    return Array.isArray(data) ? data : []
  } catch (error) {
    logger.error('获取司机车辆异常', {error, driverId})
    return []
  }
}

/**
 * 获取所有车辆信息（包含司机信息）
 * 用于老板查看所有车辆
 */
export async function getAllVehiclesWithDrivers(): Promise<VehicleWithDriver[]> {
  logger.db('查询', 'vehicles', {action: 'getAllWithDrivers'})
  try {
    const {data: vehiclesData, error: vehiclesError} = await supabase
      .from('vehicles')
      .select('*')
      .order('plate_number', {ascending: true})
      .order('created_at', {ascending: false})

    if (vehiclesError) {
      logger.error('❌ 获取所有车辆失败', {
        error: vehiclesError.message,
        code: vehiclesError.code,
        details: vehiclesError.details,
        hint: vehiclesError.hint
      })
      return []
    }

    if (!vehiclesData || vehiclesData.length === 0) {
      return []
    }

    const latestVehiclesMap = new Map<string, Vehicle>()
    vehiclesData.forEach((vehicle: Vehicle) => {
      if (!latestVehiclesMap.has(vehicle.plate_number)) {
        latestVehiclesMap.set(vehicle.plate_number, vehicle)
      }
    })
    const latestVehicles = Array.from(latestVehiclesMap.values())

    const userIds = latestVehicles.map((v) => v.user_id).filter(Boolean)
    const {data: profilesData, error: profilesError} = await supabase
      .from('users')
      .select('id, name, phone, email')
      .in('id', userIds)

    if (profilesError) {
      logger.error('获取司机信息失败', {error: profilesError.message})
    }

    const {data: licensesData, error: licensesError} = await supabase
      .from('driver_licenses')
      .select('driver_id, id_card_name')
      .in('driver_id', userIds)

    if (licensesError) {
      logger.error('获取司机实名信息失败', {error: licensesError.message})
    }

    type ProfileData = Pick<Profile, 'id' | 'name' | 'phone' | 'email'>
    type LicenseData = Pick<DriverLicense, 'driver_id' | 'id_card_name'>

    const profilesMap = new Map<string, ProfileData>()
    if (profilesData) {
      profilesData.forEach((profile: ProfileData) => {
        profilesMap.set(profile.id, profile)
      })
    }

    const licensesMap = new Map<string, LicenseData>()
    if (licensesData) {
      licensesData.forEach((license: LicenseData) => {
        licensesMap.set(license.driver_id, license)
      })
    }

    const vehicles: VehicleWithDriver[] = latestVehicles.map((item) => {
      const profile = profilesMap.get(item.user_id)
      const license = licensesMap.get(item.user_id)
      const displayName = license?.id_card_name || profile?.name || null
      return {
        ...item,
        driver_id: profile?.id || null,
        driver_name: displayName,
        driver_phone: profile?.phone || null,
        driver_email: profile?.email || null
      }
    })

    return vehicles
  } catch (error) {
    logger.error('获取所有车辆异常', {error})
    return []
  }
}

/**
 * 根据ID获取车辆信息（包含扩展信息）
 */
export async function getVehicleById(vehicleId: string): Promise<VehicleWithDocuments | null> {
  logger.db('查询', 'vehicles', {vehicleId})
  try {
    const {data, error} = await supabase
      .from('vehicles')
      .select(`
        *,
        document:vehicle_documents(*)
      `)
      .eq('id', vehicleId)
      .maybeSingle()

    if (error) {
      logger.error('获取车辆信息失败', error)
      return null
    }

    return data
  } catch (error) {
    logger.error('获取车辆信息异常', error)
    return null
  }
}

/**
 * 根据车辆ID获取车辆信息（包含司机详细信息）
 */
export async function getVehicleWithDriverDetails(vehicleId: string): Promise<VehicleWithDriverDetails | null> {
  logger.db('查询', 'vehicles with driver details', {vehicleId})
  try {
    const vehicle = await getVehicleById(vehicleId)
    if (!vehicle) {
      return null
    }

    const {data: user, error: userError} = await supabase
      .from('users')
      .select('*')
      .eq('id', vehicle.user_id)
      .maybeSingle()

    if (userError) {
      logger.error('获取司机基本信息失败', {error: userError})
    }

    let profile: Profile | null = null
    if (user) {
      const {data: roleData} = await supabase.from('users').select('role').eq('id', user.id).maybeSingle()
      profile = {
        ...user,
        role: roleData?.role || 'DRIVER'
      }
    }

    const {data: driverLicense, error: licenseError} = await supabase
      .from('driver_licenses')
      .select('*')
      .eq('driver_id', vehicle.user_id)
      .maybeSingle()

    if (licenseError) {
      logger.error('获取司机证件信息失败', {error: licenseError})
    }

    const result: VehicleWithDriverDetails = {
      ...vehicle,
      driver_profile: profile || null,
      driver_license: driverLicense || null
    }

    return result
  } catch (error) {
    logger.error('获取车辆和司机详细信息异常', error)
    return null
  }
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

    const {data, error} = await supabase
      .from('vehicles')
      .insert({
        ...vehicle
      })
      .select()
      .maybeSingle()

    if (error) {
      logger.error('添加车辆失败', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        vehicle
      })
      return null
    }

    clearCacheByPrefix('driver_vehicles_')
    clearCache(CACHE_KEYS.ALL_VEHICLES)

    return data
  } catch (error) {
    logger.error('添加车辆异常', error)
    return null
  }
}

/**
 * 更新车辆信息
 */
export async function updateVehicle(vehicleId: string, updates: VehicleUpdate): Promise<Vehicle | null> {
  logger.db('更新', 'vehicles', {vehicleId, updates})
  try {
    const {data, error} = await supabase
      .from('vehicles')
      .update({...updates, updated_at: new Date().toISOString()})
      .eq('id', vehicleId)
      .select()
      .maybeSingle()

    if (error) {
      logger.error('更新车辆信息失败', error)
      return null
    }

    clearCacheByPrefix('driver_vehicles_')
    clearCache(CACHE_KEYS.ALL_VEHICLES)

    return data
  } catch (error) {
    logger.error('更新车辆信息异常', error)
    return null
  }
}

/**
 * 删除车辆（包含图片文件）
 */
export async function deleteVehicle(vehicleId: string): Promise<boolean> {
  logger.db('删除', 'vehicles', {vehicleId})
  try {
    const vehicle = await getVehicleById(vehicleId)
    if (!vehicle) {
      logger.error('车辆不存在', {vehicleId})
      return false
    }

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

    const bucketName = `${process.env.TARO_APP_APP_ID}_images`
    if (allPhotos.length > 0) {
      const photoPaths = allPhotos.filter((photo) => {
        return photo && !photo.startsWith('http://') && !photo.startsWith('https://')
      })

      if (photoPaths.length > 0) {
        await supabase.storage.from(bucketName).remove(photoPaths)
      }
    }

    const {error} = await supabase.from('vehicles').delete().eq('id', vehicleId)

    if (error) {
      logger.error('删除车辆失败', error)
      return false
    }

    clearCacheByPrefix('driver_vehicles_')
    clearCache(CACHE_KEYS.ALL_VEHICLES)

    return true
  } catch (error) {
    logger.error('删除车辆异常', error)
    return false
  }
}

/**
 * 还车录入
 */
export async function returnVehicle(vehicleId: string, returnPhotos: string[]): Promise<VehicleWithDocuments | null> {
  logger.db('更新', 'vehicles', {vehicleId, action: '还车录入'})
  try {
    const {error: vehicleError} = await supabase
      .from('vehicles')
      .update({
        status: 'inactive'
      })
      .eq('id', vehicleId)
      .select()
      .maybeSingle()

    if (vehicleError) {
      logger.error('更新车辆状态失败', vehicleError)
      return null
    }

    const {error: docError} = await supabase
      .from('vehicle_documents')
      .update({
        return_time: new Date().toISOString(),
        return_photos: returnPhotos
      })
      .eq('vehicle_id', vehicleId)

    if (docError) {
      logger.error('更新还车信息失败', docError)
      await supabase.from('vehicles').update({status: 'active'}).eq('id', vehicleId)
      return null
    }

    clearCacheByPrefix('driver_vehicles_')
    clearCache(CACHE_KEYS.ALL_VEHICLES)

    return await getVehicleById(vehicleId)
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
        )
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

    let driverId = data.driver_id

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
        const {data: driverData} = await supabase
          .from('users')
          .select('id, name, phone, email')
          .eq('id', driverId)
          .maybeSingle()

        if (driverData) {
          const vehicleWithDriver = data as VehicleWithDriver
          vehicleWithDriver.driver = driverData as Profile
        }
      }
    }

    if (driverId) {
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

    return data as VehicleWithDriver
  } catch (error) {
    logger.error('根据车牌号获取车辆信息异常', {error, plateNumber})
    return null
  }
}

// ==================== 驾驶员证件管理 API ====================

/**
 * 获取驾驶员证件信息
 */
export async function getDriverLicense(driverId: string): Promise<DriverLicense | null> {
  logger.db('查询', 'driver_licenses', {driverId})
  try {
    const {data, error} = await supabase.from('driver_licenses').select('*').eq('driver_id', driverId).maybeSingle()

    if (error) {
      logger.error('获取驾驶员证件信息失败', error)
      return null
    }

    return data
  } catch (error) {
    logger.error('获取驾驶员证件信息异常', error)
    return null
  }
}

/**
 * 添加或更新驾驶员证件信息
 */
export async function upsertDriverLicense(license: DriverLicenseInput): Promise<DriverLicense | null> {
  logger.db('插入/更新', 'driver_licenses', {driverId: license.driver_id})
  try {
    const {data, error} = await supabase
      .from('driver_licenses')
      .upsert(license, {onConflict: 'driver_id'})
      .select()
      .maybeSingle()

    if (error) {
      logger.error('保存驾驶员证件信息失败', error)
      return null
    }

    return data
  } catch (error) {
    logger.error('保存驾驶员证件信息异常', error)
    return null
  }
}

/**
 * 更新驾驶员证件信息
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

    return data
  } catch (error) {
    logger.error('更新驾驶员证件信息异常', error)
    return null
  }
}

/**
 * 删除驾驶员证件信息
 */
export async function deleteDriverLicense(driverId: string): Promise<boolean> {
  try {
    const license = await getDriverLicense(driverId)

    const {error} = await supabase.from('driver_licenses').delete().eq('driver_id', driverId)

    if (error) {
      console.error('删除驾驶员证件信息失败:', error)
      return false
    }

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
          const bucketName = `${process.env.TARO_APP_APP_ID}_vehicles`
          await supabase.storage.from(bucketName).remove(relativeImagePaths)
        }
      }
    }

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
 */
export async function submitVehicleForReview(vehicleId: string): Promise<boolean> {
  try {
    logger.db('提交车辆审核', 'vehicles', {vehicleId})

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

    clearCacheByPrefix('driver_vehicles_')
    clearCache(CACHE_KEYS.ALL_VEHICLES)

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
 * 锁定图片
 */
export async function lockPhoto(vehicleId: string, photoField: string, photoIndex: number): Promise<boolean> {
  try {
    logger.db('锁定图片', 'vehicle_documents', {vehicleId, photoField, photoIndex})

    const {data: document, error: fetchError} = await supabase
      .from('vehicle_documents')
      .select('locked_photos')
      .eq('vehicle_id', vehicleId)
      .maybeSingle()

    if (fetchError || !document) {
      logger.error('获取车辆文档信息失败', fetchError)
      return false
    }

    const lockedPhotos = document.locked_photos || {}
    const fieldLocks = lockedPhotos[photoField] || []

    if (!fieldLocks.includes(photoIndex)) {
      fieldLocks.push(photoIndex)
      lockedPhotos[photoField] = fieldLocks

      const {error: updateError} = await supabase
        .from('vehicle_documents')
        .update({
          locked_photos: lockedPhotos,
          updated_at: new Date().toISOString()
        })
        .eq('vehicle_id', vehicleId)

      if (updateError) {
        logger.error('锁定图片失败', updateError)
        return false
      }

      clearCacheByPrefix('driver_vehicles_')
      clearCache(CACHE_KEYS.ALL_VEHICLES)
    }

    return true
  } catch (error) {
    logger.error('锁定图片异常', error)
    return false
  }
}

/**
 * 解锁图片
 */
export async function unlockPhoto(vehicleId: string, photoField: string, photoIndex: number): Promise<boolean> {
  try {
    logger.db('解锁图片', 'vehicle_documents', {vehicleId, photoField, photoIndex})

    const {data: document, error: fetchError} = await supabase
      .from('vehicle_documents')
      .select('locked_photos')
      .eq('vehicle_id', vehicleId)
      .maybeSingle()

    if (fetchError || !document) {
      logger.error('获取车辆文档信息失败', fetchError)
      return false
    }

    const lockedPhotos = document.locked_photos || {}
    const fieldLocks = lockedPhotos[photoField] || []

    const newFieldLocks = fieldLocks.filter((idx: number) => idx !== photoIndex)
    lockedPhotos[photoField] = newFieldLocks

    const {error: updateError} = await supabase
      .from('vehicle_documents')
      .update({
        locked_photos: lockedPhotos,
        updated_at: new Date().toISOString()
      })
      .eq('vehicle_id', vehicleId)

    if (updateError) {
      logger.error('解锁图片失败', updateError)
      return false
    }

    clearCacheByPrefix('driver_vehicles_')
    clearCache(CACHE_KEYS.ALL_VEHICLES)

    return true
  } catch (error) {
    logger.error('解锁图片异常', error)
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
    logger.db('标记图片需补录', 'vehicles', {vehicleId, photoField, photoIndex})

    const {data: vehicle, error: fetchError} = await supabase
      .from('vehicles')
      .select('required_photos')
      .eq('id', vehicleId)
      .maybeSingle()

    if (fetchError || !vehicle) {
      logger.error('获取车辆信息失败', fetchError)
      return false
    }

    const requiredPhotos = vehicle.required_photos || []
    const photoKey = `${photoField}_${photoIndex}`

    if (!requiredPhotos.includes(photoKey)) {
      requiredPhotos.push(photoKey)

      const {error: updateError} = await supabase
        .from('vehicles')
        .update({
          required_photos: requiredPhotos,
          updated_at: new Date().toISOString()
        })
        .eq('id', vehicleId)

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
 */
export async function approveVehicle(vehicleId: string, reviewerId: string, notes: string): Promise<boolean> {
  try {
    logger.db('通过车辆审核', 'vehicles', {vehicleId, reviewerId, notes})

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
        review_notes: notes,
        required_photos: [],
        updated_at: new Date().toISOString()
      })
      .eq('vehicle_id', vehicleId)

    if (docError) {
      logger.error('更新车辆文档审核信息失败', docError)
      await supabase.from('vehicles').update({review_status: 'pending'}).eq('id', vehicleId)
      return false
    }

    clearCacheByPrefix('driver_vehicles_')
    clearCache(CACHE_KEYS.ALL_VEHICLES)

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

    clearCacheByPrefix('driver_vehicles_')
    clearCache(CACHE_KEYS.ALL_VEHICLES)

    return true
  } catch (error) {
    logger.error('一键锁定车辆照片异常', error)
    return false
  }
}

/**
 * 要求补录
 */
export async function requireSupplement(vehicleId: string, reviewerId: string, notes: string): Promise<boolean> {
  try {
    logger.db('要求补录车辆信息', 'vehicles', {vehicleId, reviewerId, notes})

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

    const {error: docError} = await supabase
      .from('vehicle_documents')
      .update({
        review_notes: notes,
        updated_at: new Date().toISOString()
      })
      .eq('vehicle_id', vehicleId)

    if (docError) {
      logger.error('更新车辆文档审核备注失败', docError)
      await supabase.from('vehicles').update({review_status: 'pending'}).eq('id', vehicleId)
      return false
    }

    clearCacheByPrefix('driver_vehicles_')
    clearCache(CACHE_KEYS.ALL_VEHICLES)

    return true
  } catch (error) {
    logger.error('要求补录车辆信息异常', error)
    return false
  }
}

/**
 * 补录图片
 */
export async function supplementPhoto(
  vehicleId: string,
  photoField: string,
  photoIndex: number,
  photoUrl: string
): Promise<boolean> {
  try {
    logger.db('补录图片', 'vehicles', {vehicleId, photoField, photoIndex, photoUrl})

    const {data: vehicle, error: fetchError} = await supabase
      .from('vehicles')
      .select('pickup_photos, return_photos, registration_photos, required_photos')
      .eq('id', vehicleId)
      .maybeSingle()

    if (fetchError || !vehicle) {
      logger.error('获取车辆信息失败', {
        fetchError,
        vehicleId,
        message: fetchError?.message,
        details: fetchError?.details
      })
      return false
    }

    const photos = (vehicle as Record<string, string[]>)[photoField] || []
    photos[photoIndex] = photoUrl

    const requiredPhotos = vehicle.required_photos || []
    const photoKey = `${photoField}_${photoIndex}`
    const newRequiredPhotos = requiredPhotos.filter((key: string) => key !== photoKey)

    const {error: updateError} = await supabase
      .from('vehicles')
      .update({
        [photoField]: photos,
        required_photos: newRequiredPhotos,
        updated_at: new Date().toISOString()
      })
      .eq('id', vehicleId)

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

    clearCacheByPrefix('driver_vehicles_')
    clearCache(CACHE_KEYS.ALL_VEHICLES)

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
