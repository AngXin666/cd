/**
 * 平台适配的定位组件
 * 统一处理微信小程序、H5、安卓APP的定位功能
 */

import {Text, View} from '@tarojs/components'
import Taro from '@tarojs/taro'
import type React from 'react'
import {useCallback, useEffect, useState} from 'react'
import {capacitorGeolocation} from '@/utils/capacitor'
import {platform} from '@/utils/platform'

export interface LocationInfo {
  latitude: number
  longitude: number
  accuracy: number
  address?: string
  province?: string
  city?: string
  district?: string
}

interface PlatformLocationProps {
  onLocationChange?: (location: LocationInfo) => void
  autoGet?: boolean
  showAddress?: boolean
  className?: string
}

export const PlatformLocation: React.FC<PlatformLocationProps> = ({
  onLocationChange,
  autoGet = false,
  showAddress = true,
  className = ''
}) => {
  const [location, setLocation] = useState<LocationInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * 微信小程序获取定位
   */
  const getLocationWeapp = async (): Promise<LocationInfo | null> => {
    try {
      // 检查定位权限
      const authRes = await Taro.getSetting()
      if (!authRes.authSetting['scope.userLocation']) {
        // 请求定位权限
        const res = await Taro.authorize({
          scope: 'scope.userLocation'
        }).catch(() => {
          // 用户拒绝授权，引导用户打开设置
          Taro.showModal({
            title: '需要定位权限',
            content: '请在设置中开启定位权限',
            confirmText: '去设置',
            success: (modalRes) => {
              if (modalRes.confirm) {
                Taro.openSetting()
              }
            }
          })
          return null
        })

        if (!res) {
          return null
        }
      }

      // 获取位置信息
      const locationRes = await Taro.getLocation({
        type: 'gcj02',
        altitude: true,
        isHighAccuracy: true
      })

      const locationInfo: LocationInfo = {
        latitude: locationRes.latitude,
        longitude: locationRes.longitude,
        accuracy: locationRes.accuracy || 0
      }

      // 如果需要地址信息，进行逆地理编码
      if (showAddress) {
        // 这里可以调用第三方地图API进行逆地理编码
        // 例如：腾讯地图、高德地图等
      }

      return locationInfo
    } catch (error) {
      console.error('获取定位失败:', error)
      throw new Error('获取定位失败')
    }
  }

  /**
   * 安卓APP获取定位
   */
  const getLocationAndroid = async (): Promise<LocationInfo | null> => {
    try {
      const position = await capacitorGeolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 3600000
      })

      const locationInfo: LocationInfo = {
        latitude: position.latitude,
        longitude: position.longitude,
        accuracy: position.accuracy
      }

      // 如果需要地址信息，进行逆地理编码
      if (showAddress) {
        // 调用第三方地图API
      }

      return locationInfo
    } catch (error) {
      console.error('获取定位失败:', error)
      throw new Error('获取定位失败')
    }
  }

  /**
   * H5获取定位
   */
  const getLocationH5 = async (): Promise<LocationInfo | null> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('浏览器不支持定位功能'))
        return
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const locationInfo: LocationInfo = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          }
          resolve(locationInfo)
        },
        (error) => {
          console.error('获取定位失败:', error)
          reject(new Error('获取定位失败'))
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 3600000
        }
      )
    })
  }

  /**
   * 获取定位
   */
  // biome-ignore lint/correctness/useExhaustiveDependencies: Internal functions don't need to be dependencies
  const getLocation = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      let locationInfo: LocationInfo | null = null

      // 根据平台获取定位
      if (platform.isWeapp()) {
        locationInfo = await getLocationWeapp()
      } else if (platform.isAndroid()) {
        locationInfo = await getLocationAndroid()
      } else {
        locationInfo = await getLocationH5()
      }

      if (locationInfo) {
        setLocation(locationInfo)
        onLocationChange?.(locationInfo)

        Taro.showToast({
          title: '定位成功',
          icon: 'success'
        })
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '获取定位失败'
      setError(errorMsg)

      Taro.showToast({
        title: errorMsg,
        icon: 'none'
      })
    } finally {
      setLoading(false)
    }
  }, [onLocationChange])

  /**
   * 自动获取定位
   */
  useEffect(() => {
    if (autoGet) {
      getLocation()
    }
  }, [autoGet, getLocation])

  /**
   * 格式化坐标
   */
  const formatCoordinate = (value: number, type: 'lat' | 'lng') => {
    const direction = type === 'lat' ? (value >= 0 ? 'N' : 'S') : value >= 0 ? 'E' : 'W'
    return `${Math.abs(value).toFixed(6)}° ${direction}`
  }

  return (
    <View className={`platform-location ${className}`}>
      {!location && !loading && !error && (
        <View className="location-empty" onClick={getLocation}>
          <Text className="location-icon">📍</Text>
          <Text className="location-text">点击获取位置</Text>
        </View>
      )}

      {loading && (
        <View className="location-loading">
          <Text className="loading-icon">⏳</Text>
          <Text className="loading-text">正在定位...</Text>
        </View>
      )}

      {error && (
        <View className="location-error" onClick={getLocation}>
          <Text className="error-icon">⚠️</Text>
          <Text className="error-text">{error}</Text>
          <Text className="retry-text">点击重试</Text>
        </View>
      )}

      {location && !loading && (
        <View className="location-info">
          <View className="location-header">
            <Text className="location-icon">📍</Text>
            <Text className="location-title">当前位置</Text>
            <Text className="refresh-btn" onClick={getLocation}>
              🔄
            </Text>
          </View>

          {showAddress && location.address && (
            <View className="location-address">
              <Text>{location.address}</Text>
            </View>
          )}

          <View className="location-coordinates">
            <View className="coordinate-item">
              <Text className="coordinate-label">纬度：</Text>
              <Text className="coordinate-value">{formatCoordinate(location.latitude, 'lat')}</Text>
            </View>
            <View className="coordinate-item">
              <Text className="coordinate-label">经度：</Text>
              <Text className="coordinate-value">{formatCoordinate(location.longitude, 'lng')}</Text>
            </View>
            <View className="coordinate-item">
              <Text className="coordinate-label">精度：</Text>
              <Text className="coordinate-value">±{location.accuracy.toFixed(0)}米</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  )
}

/**
 * 定位Hook
 */
export const usePlatformLocation = () => {
  const [location, setLocation] = useState<LocationInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getLocation = async (): Promise<LocationInfo | null> => {
    setLoading(true)
    setError(null)

    try {
      let locationInfo: LocationInfo | null = null

      if (platform.isWeapp()) {
        const res = await Taro.getLocation({
          type: 'gcj02',
          isHighAccuracy: true
        })
        locationInfo = {
          latitude: res.latitude,
          longitude: res.longitude,
          accuracy: res.accuracy || 0
        }
      } else if (platform.isAndroid()) {
        const position = await capacitorGeolocation.getCurrentPosition({
          enableHighAccuracy: true
        })
        locationInfo = {
          latitude: position.latitude,
          longitude: position.longitude,
          accuracy: position.accuracy
        }
      } else {
        locationInfo = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              resolve({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy
              })
            },
            reject,
            {enableHighAccuracy: true}
          )
        })
      }

      setLocation(locationInfo)
      return locationInfo
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '获取定位失败'
      setError(errorMsg)
      return null
    } finally {
      setLoading(false)
    }
  }

  return {
    location,
    loading,
    error,
    getLocation
  }
}

export default PlatformLocation
