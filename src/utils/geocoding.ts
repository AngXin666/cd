import Taro from '@tarojs/taro'

const APP_ID = process.env.TARO_APP_APP_ID || ''

/**
 * 定位方式枚举
 */
export enum LocationMethod {
  BAIDU = 'baidu', // 百度地图API
  NATIVE = 'native' // 本机GPS定位
}

/**
 * 定位结果接口
 */
export interface LocationResult {
  latitude: number
  longitude: number
  address: string
  method: LocationMethod // 使用的定位方式
  accuracy?: number // 定位精度（米）
}

/**
 * 百度地图逆地理编码接口响应类型
 */
interface BaiduGeocodingResponse {
  data: {
    status: number
    result: {
      location: {
        lng: number
        lat: number
      }
      formatted_address: string
      formatted_address_poi?: string
      business?: string
      addressComponent: {
        country: string
        province: string
        city: string
        district: string
        town?: string
        street?: string
        street_number?: string
      }
      sematic_description?: string
    }
  }
  status: number
  msg: string
}

/**
 * 调用百度地图逆地理编码API，将GPS坐标转换为详细地址
 * @param latitude 纬度
 * @param longitude 经度
 * @returns 详细地址信息
 */
export async function reverseGeocode(latitude: number, longitude: number): Promise<string> {
  try {
    // 调用百度地图逆地理编码API
    const response = await Taro.request<BaiduGeocodingResponse>({
      url: 'https://api-integrations.appmiaoda.com/app-7cdqf07mbu9t/api-V1bGYXDxY8mn/reverse_geocoding/v3',
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
        'X-App-Id': APP_ID
      },
      data: {
        location: `${latitude},${longitude}`,
        coordtype: 'gcj02ll', // Taro.getLocation返回的是gcj02坐标
        ret_coordtype: 'gcj02ll',
        extensions_poi: '1', // 召回POI数据，获取更详细的地址
        output: 'json',
        language: 'zh-CN'
      }
    })

    // 检查响应状态
    if (response.statusCode !== 200) {
      throw new Error(`API请求失败，状态码：${response.statusCode}`)
    }

    const result = response.data

    // 检查API返回状态
    if (result.status !== 0 || result.data.status !== 0) {
      // 如果status为999，显示API返回的错误信息
      if (result.status === 999) {
        throw new Error(result.msg || '地址解析失败')
      }
      throw new Error(`地址解析失败，错误码：${result.data.status}`)
    }

    // 优先使用包含POI信息的详细地址
    const address = result.data.result.formatted_address_poi || result.data.result.formatted_address

    if (!address) {
      throw new Error('未能获取到地址信息')
    }

    return address
  } catch (error) {
    console.error('逆地理编码失败:', error)

    // 如果API调用失败，返回简单的坐标描述
    if (error instanceof Error) {
      throw error
    }

    throw new Error('地址解析服务暂时不可用')
  }
}

/**
 * 获取当前位置的GPS坐标（不包含地址解析）
 * @returns GPS坐标和精度信息
 */
async function getNativeLocation(): Promise<{
  latitude: number
  longitude: number
  accuracy: number
}> {
  try {
    const location = await Taro.getLocation({
      type: 'gcj02', // 使用国测局坐标系
      isHighAccuracy: true, // 开启高精度定位
      highAccuracyExpireTime: 3000 // 高精度定位超时时间
    })

    return {
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy || 0
    }
  } catch (error) {
    console.error('本机GPS定位失败:', error)
    throw new Error('获取位置失败，请检查GPS和位置权限')
  }
}

/**
 * 使用百度地图API获取位置和地址
 * @returns 位置信息和详细地址
 */
async function getLocationWithBaiduAPI(): Promise<LocationResult> {
  try {
    // 先获取GPS坐标
    const location = await getNativeLocation()

    // 调用百度地图逆地理编码API
    const address = await reverseGeocode(location.latitude, location.longitude)

    return {
      latitude: location.latitude,
      longitude: location.longitude,
      address,
      method: LocationMethod.BAIDU,
      accuracy: location.accuracy
    }
  } catch (error) {
    console.error('百度地图API定位失败:', error)
    throw error
  }
}

/**
 * 使用本机GPS定位（降级方案）
 * @returns 位置信息（只有坐标，无详细地址）
 */
async function getLocationWithNativeGPS(): Promise<LocationResult> {
  try {
    const location = await getNativeLocation()

    // 生成简单的坐标描述
    const address = `GPS坐标: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`

    return {
      latitude: location.latitude,
      longitude: location.longitude,
      address,
      method: LocationMethod.NATIVE,
      accuracy: location.accuracy
    }
  } catch (error) {
    console.error('本机GPS定位失败:', error)
    throw error
  }
}

/**
 * 智能获取当前位置和地址
 * 优先级：百度地图API -> 本机GPS定位
 * @returns 位置信息和详细地址
 */
export async function getSmartLocation(): Promise<LocationResult> {
  const errors: string[] = []

  // 方法1：尝试使用百度地图API
  try {
    console.log('尝试使用百度地图API获取位置...')
    const result = await getLocationWithBaiduAPI()
    console.log('百度地图API定位成功:', result.method)
    return result
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : '百度地图API失败'
    errors.push(`百度地图: ${errorMsg}`)
    console.warn('百度地图API失败，尝试降级方案')
  }

  // 方法2：降级到本机GPS定位
  try {
    console.log('尝试使用本机GPS定位...')
    const result = await getLocationWithNativeGPS()
    console.log('本机GPS定位成功:', result.method)

    // 显示降级提示
    Taro.showToast({
      title: '使用GPS坐标定位',
      icon: 'none',
      duration: 2000
    })

    return result
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : '本机GPS定位失败'
    errors.push(`本机GPS: ${errorMsg}`)
  }

  // 所有方法都失败
  const errorMessage = `定位失败，已尝试以下方式：\n${errors.join('\n')}`
  console.error(errorMessage)
  throw new Error('所有定位方式均失败，请检查GPS和网络连接')
}

/**
 * 获取当前位置的GPS坐标和详细地址（兼容旧接口）
 * @deprecated 建议使用 getSmartLocation() 代替
 * @returns GPS坐标和详细地址
 */
export async function getCurrentLocationWithAddress(): Promise<{
  latitude: number
  longitude: number
  address: string
}> {
  const result = await getSmartLocation()
  return {
    latitude: result.latitude,
    longitude: result.longitude,
    address: result.address
  }
}
