/**
 * Capacitor 原生功能封装
 * 为安卓APP提供原生功能支持
 */

import { platform } from './platform'

// Capacitor 插件类型定义
interface CapacitorPlugins {
  Camera?: any
  Geolocation?: any
  Device?: any
  Network?: any
  StatusBar?: any
  SplashScreen?: any
  Keyboard?: any
  App?: any
  Filesystem?: any
  PushNotifications?: any
}

/**
 * 获取 Capacitor 插件
 */
const getCapacitorPlugins = (): CapacitorPlugins => {
  if (!platform.isAndroid()) {
    return {}
  }
  
  const capacitor = (window as any)?.Capacitor
  return capacitor?.Plugins || {}
}

/**
 * 相机功能封装
 */
export const capacitorCamera = {
  /**
   * 拍照
   */
  takePicture: async (options?: {
    quality?: number
    allowEditing?: boolean
    resultType?: 'base64' | 'uri'
    source?: 'camera' | 'photos' | 'prompt'
  }) => {
    if (!platform.isAndroid()) {
      throw new Error('Camera is only available on Android app')
    }

    const { Camera } = getCapacitorPlugins()
    if (!Camera) {
      throw new Error('Camera plugin not available')
    }

    try {
      const image = await Camera.getPhoto({
        quality: options?.quality || 90,
        allowEditing: options?.allowEditing || false,
        resultType: options?.resultType || 'uri',
        source: options?.source || 'camera'
      })
      
      return {
        webPath: image.webPath,
        format: image.format,
        base64String: image.base64String
      }
    } catch (error) {
      console.error('Camera error:', error)
      throw error
    }
  },

  /**
   * 选择多张图片
   */
  pickImages: async (options?: {
    quality?: number
    limit?: number
  }) => {
    if (!platform.isAndroid()) {
      throw new Error('Camera is only available on Android app')
    }

    const { Camera } = getCapacitorPlugins()
    if (!Camera) {
      throw new Error('Camera plugin not available')
    }

    try {
      const images = await Camera.pickImages({
        quality: options?.quality || 90,
        limit: options?.limit || 5
      })
      
      return images.photos.map((photo: any) => ({
        webPath: photo.webPath,
        format: photo.format
      }))
    } catch (error) {
      console.error('Pick images error:', error)
      throw error
    }
  }
}

/**
 * 地理位置功能封装
 */
export const capacitorGeolocation = {
  /**
   * 获取当前位置
   */
  getCurrentPosition: async (options?: {
    enableHighAccuracy?: boolean
    timeout?: number
    maximumAge?: number
  }) => {
    if (!platform.isAndroid()) {
      throw new Error('Geolocation is only available on Android app')
    }

    const { Geolocation } = getCapacitorPlugins()
    if (!Geolocation) {
      throw new Error('Geolocation plugin not available')
    }

    try {
      const coordinates = await Geolocation.getCurrentPosition({
        enableHighAccuracy: options?.enableHighAccuracy || true,
        timeout: options?.timeout || 10000,
        maximumAge: options?.maximumAge || 3600000
      })
      
      return {
        latitude: coordinates.coords.latitude,
        longitude: coordinates.coords.longitude,
        accuracy: coordinates.coords.accuracy,
        altitude: coordinates.coords.altitude,
        heading: coordinates.coords.heading,
        speed: coordinates.coords.speed,
        timestamp: coordinates.timestamp
      }
    } catch (error) {
      console.error('Geolocation error:', error)
      throw error
    }
  },

  /**
   * 监听位置变化
   */
  watchPosition: async (
    callback: (position: any) => void,
    options?: {
      enableHighAccuracy?: boolean
      timeout?: number
      maximumAge?: number
    }
  ) => {
    if (!platform.isAndroid()) {
      throw new Error('Geolocation is only available on Android app')
    }

    const { Geolocation } = getCapacitorPlugins()
    if (!Geolocation) {
      throw new Error('Geolocation plugin not available')
    }

    try {
      const watchId = await Geolocation.watchPosition({
        enableHighAccuracy: options?.enableHighAccuracy || true,
        timeout: options?.timeout || 10000,
        maximumAge: options?.maximumAge || 3600000
      }, callback)
      
      return watchId
    } catch (error) {
      console.error('Watch position error:', error)
      throw error
    }
  },

  /**
   * 清除位置监听
   */
  clearWatch: async (watchId: string) => {
    if (!platform.isAndroid()) {
      return
    }

    const { Geolocation } = getCapacitorPlugins()
    if (!Geolocation) {
      return
    }

    try {
      await Geolocation.clearWatch({ id: watchId })
    } catch (error) {
      console.error('Clear watch error:', error)
    }
  }
}

/**
 * 设备信息功能封装
 */
export const capacitorDevice = {
  /**
   * 获取设备信息
   */
  getInfo: async () => {
    if (!platform.isAndroid()) {
      return null
    }

    const { Device } = getCapacitorPlugins()
    if (!Device) {
      return null
    }

    try {
      const info = await Device.getInfo()
      return {
        model: info.model,
        platform: info.platform,
        operatingSystem: info.operatingSystem,
        osVersion: info.osVersion,
        manufacturer: info.manufacturer,
        isVirtual: info.isVirtual,
        webViewVersion: info.webViewVersion
      }
    } catch (error) {
      console.error('Device info error:', error)
      return null
    }
  },

  /**
   * 获取设备ID
   */
  getId: async () => {
    if (!platform.isAndroid()) {
      return null
    }

    const { Device } = getCapacitorPlugins()
    if (!Device) {
      return null
    }

    try {
      const id = await Device.getId()
      return id.identifier
    } catch (error) {
      console.error('Device ID error:', error)
      return null
    }
  }
}

/**
 * 网络状态功能封装
 */
export const capacitorNetwork = {
  /**
   * 获取网络状态
   */
  getStatus: async () => {
    if (!platform.isAndroid()) {
      return null
    }

    const { Network } = getCapacitorPlugins()
    if (!Network) {
      return null
    }

    try {
      const status = await Network.getStatus()
      return {
        connected: status.connected,
        connectionType: status.connectionType
      }
    } catch (error) {
      console.error('Network status error:', error)
      return null
    }
  },

  /**
   * 监听网络状态变化
   */
  addListener: (callback: (status: any) => void) => {
    if (!platform.isAndroid()) {
      return () => {}
    }

    const { Network } = getCapacitorPlugins()
    if (!Network) {
      return () => {}
    }

    try {
      const listener = Network.addListener('networkStatusChange', callback)
      return () => listener.remove()
    } catch (error) {
      console.error('Network listener error:', error)
      return () => {}
    }
  }
}

/**
 * 状态栏功能封装
 */
export const capacitorStatusBar = {
  /**
   * 设置状态栏样式
   */
  setStyle: async (style: 'DARK' | 'LIGHT') => {
    if (!platform.isAndroid()) {
      return
    }

    const { StatusBar } = getCapacitorPlugins()
    if (!StatusBar) {
      return
    }

    try {
      await StatusBar.setStyle({ style })
    } catch (error) {
      console.error('StatusBar style error:', error)
    }
  },

  /**
   * 设置状态栏背景色
   */
  setBackgroundColor: async (color: string) => {
    if (!platform.isAndroid()) {
      return
    }

    const { StatusBar } = getCapacitorPlugins()
    if (!StatusBar) {
      return
    }

    try {
      await StatusBar.setBackgroundColor({ color })
    } catch (error) {
      console.error('StatusBar background color error:', error)
    }
  },

  /**
   * 显示状态栏
   */
  show: async () => {
    if (!platform.isAndroid()) {
      return
    }

    const { StatusBar } = getCapacitorPlugins()
    if (!StatusBar) {
      return
    }

    try {
      await StatusBar.show()
    } catch (error) {
      console.error('StatusBar show error:', error)
    }
  },

  /**
   * 隐藏状态栏
   */
  hide: async () => {
    if (!platform.isAndroid()) {
      return
    }

    const { StatusBar } = getCapacitorPlugins()
    if (!StatusBar) {
      return
    }

    try {
      await StatusBar.hide()
    } catch (error) {
      console.error('StatusBar hide error:', error)
    }
  }
}

/**
 * 启动屏功能封装
 */
export const capacitorSplashScreen = {
  /**
   * 隐藏启动屏
   */
  hide: async () => {
    if (!platform.isAndroid()) {
      return
    }

    const { SplashScreen } = getCapacitorPlugins()
    if (!SplashScreen) {
      return
    }

    try {
      await SplashScreen.hide()
    } catch (error) {
      console.error('SplashScreen hide error:', error)
    }
  },

  /**
   * 显示启动屏
   */
  show: async () => {
    if (!platform.isAndroid()) {
      return
    }

    const { SplashScreen } = getCapacitorPlugins()
    if (!SplashScreen) {
      return
    }

    try {
      await SplashScreen.show()
    } catch (error) {
      console.error('SplashScreen show error:', error)
    }
  }
}

/**
 * 应用功能封装
 */
export const capacitorApp = {
  /**
   * 获取应用信息
   */
  getInfo: async () => {
    if (!platform.isAndroid()) {
      return null
    }

    const { App } = getCapacitorPlugins()
    if (!App) {
      return null
    }

    try {
      const info = await App.getInfo()
      return {
        name: info.name,
        id: info.id,
        build: info.build,
        version: info.version
      }
    } catch (error) {
      console.error('App info error:', error)
      return null
    }
  },

  /**
   * 监听应用状态变化
   */
  addStateChangeListener: (callback: (state: any) => void) => {
    if (!platform.isAndroid()) {
      return () => {}
    }

    const { App } = getCapacitorPlugins()
    if (!App) {
      return () => {}
    }

    try {
      const listener = App.addListener('appStateChange', callback)
      return () => listener.remove()
    } catch (error) {
      console.error('App state listener error:', error)
      return () => {}
    }
  }
}

export default {
  capacitorCamera,
  capacitorGeolocation,
  capacitorDevice,
  capacitorNetwork,
  capacitorStatusBar,
  capacitorSplashScreen,
  capacitorApp
}