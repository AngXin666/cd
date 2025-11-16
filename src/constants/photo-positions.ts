/**
 * 车辆照片位置配置
 * 统一管理所有照片的位置标注和说明
 */

// 车辆照片位置类型
export type VehiclePhotoPosition =
  | 'left_front'
  | 'right_front'
  | 'left_rear'
  | 'right_rear'
  | 'dashboard'
  | 'rear_door'
  | 'cargo_area'

// 行驶证照片位置类型
export type RegistrationPhotoPosition = 'front_page' | 'back_page'

// 照片位置配置接口
export interface PhotoPositionConfig {
  key: string
  title: string
  description: string
  icon: string
  example?: string // 示例说明
}

// 车辆照片位置配置（7张标准照片）
export const VEHICLE_PHOTO_POSITIONS: PhotoPositionConfig[] = [
  {
    key: 'left_front',
    title: '左前45度角',
    description: '拍摄车辆左前方45度角，包含车头和左侧车身',
    icon: 'i-mdi-car-side',
    example: '站在车辆左前方，与车头成45度角拍摄'
  },
  {
    key: 'right_front',
    title: '右前45度角',
    description: '拍摄车辆右前方45度角，包含车头和右侧车身',
    icon: 'i-mdi-car-side',
    example: '站在车辆右前方，与车头成45度角拍摄'
  },
  {
    key: 'left_rear',
    title: '左后45度角',
    description: '拍摄车辆左后方45度角，包含车尾和左侧车身',
    icon: 'i-mdi-car-side',
    example: '站在车辆左后方，与车尾成45度角拍摄'
  },
  {
    key: 'right_rear',
    title: '右后45度角',
    description: '拍摄车辆右后方45度角，包含车尾和右侧车身',
    icon: 'i-mdi-car-side',
    example: '站在车辆右后方，与车尾成45度角拍摄'
  },
  {
    key: 'dashboard',
    title: '仪表盘',
    description: '拍摄车辆仪表盘，清晰显示里程数和油量',
    icon: 'i-mdi-speedometer',
    example: '从驾驶位拍摄，确保仪表盘数字清晰可见'
  },
  {
    key: 'rear_door',
    title: '后门开启',
    description: '打开后门拍摄，显示后门和货箱入口',
    icon: 'i-mdi-car-door',
    example: '打开后门，拍摄后门开启状态'
  },
  {
    key: 'cargo_area',
    title: '货箱内部',
    description: '拍摄货箱内部，显示货箱整体状况',
    icon: 'i-mdi-package-variant',
    example: '从后门拍摄货箱内部全景'
  }
]

// 行驶证照片位置配置（2张）
export const REGISTRATION_PHOTO_POSITIONS: PhotoPositionConfig[] = [
  {
    key: 'front_page',
    title: '行驶证正页',
    description: '拍摄行驶证正页，确保所有信息清晰可见',
    icon: 'i-mdi-card-account-details',
    example: '平铺拍摄，避免反光和模糊'
  },
  {
    key: 'back_page',
    title: '行驶证副页',
    description: '拍摄行驶证副页，确保检验记录清晰',
    icon: 'i-mdi-card-account-details',
    example: '平铺拍摄，确保检验日期清晰'
  }
]

// 获取照片位置配置
export const getPhotoPositionConfig = (key: string): PhotoPositionConfig | undefined => {
  return [...VEHICLE_PHOTO_POSITIONS, ...REGISTRATION_PHOTO_POSITIONS].find((config) => config.key === key)
}

// 获取照片位置标题
export const getPhotoPositionTitle = (key: string): string => {
  const config = getPhotoPositionConfig(key)
  return config?.title || key
}

// 获取照片位置描述
export const getPhotoPositionDescription = (key: string): string => {
  const config = getPhotoPositionConfig(key)
  return config?.description || ''
}

// 车辆照片数组索引到位置的映射
export const VEHICLE_PHOTO_INDEX_MAP: Record<number, VehiclePhotoPosition> = {
  0: 'left_front',
  1: 'right_front',
  2: 'left_rear',
  3: 'right_rear',
  4: 'dashboard',
  5: 'rear_door',
  6: 'cargo_area'
}

// 行驶证照片数组索引到位置的映射
export const REGISTRATION_PHOTO_INDEX_MAP: Record<number, RegistrationPhotoPosition> = {
  0: 'front_page',
  1: 'back_page'
}

// 根据索引获取车辆照片位置配置
export const getVehiclePhotoConfigByIndex = (index: number): PhotoPositionConfig | undefined => {
  const key = VEHICLE_PHOTO_INDEX_MAP[index]
  return key ? VEHICLE_PHOTO_POSITIONS.find((config) => config.key === key) : undefined
}

// 根据索引获取行驶证照片位置配置
export const getRegistrationPhotoConfigByIndex = (index: number): PhotoPositionConfig | undefined => {
  const key = REGISTRATION_PHOTO_INDEX_MAP[index]
  return key ? REGISTRATION_PHOTO_POSITIONS.find((config) => config.key === key) : undefined
}
