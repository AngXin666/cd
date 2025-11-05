import Taro from '@tarojs/taro'

const APP_ID = process.env.TARO_APP_APP_ID || ''

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
 * 获取当前位置的GPS坐标和详细地址
 * @returns GPS坐标和详细地址
 */
export async function getCurrentLocationWithAddress(): Promise<{
  latitude: number
  longitude: number
  address: string
}> {
  try {
    // 获取GPS坐标
    const location = await Taro.getLocation({
      type: 'gcj02', // 使用国测局坐标系
      isHighAccuracy: true, // 开启高精度定位
      highAccuracyExpireTime: 3000 // 高精度定位超时时间
    })

    // 调用逆地理编码API获取详细地址
    const address = await reverseGeocode(location.latitude, location.longitude)

    return {
      latitude: location.latitude,
      longitude: location.longitude,
      address
    }
  } catch (error) {
    console.error('获取位置信息失败:', error)
    throw error
  }
}
