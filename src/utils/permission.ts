import Taro from '@tarojs/taro'

/**
 * 权限状态枚举
 */
export enum PermissionStatus {
  AUTHORIZED = 'authorized', // 已授权
  DENIED = 'denied', // 已拒绝
  NOT_DETERMINED = 'not_determined' // 未询问
}

/**
 * 检查定位权限状态
 * @returns 权限状态
 */
export async function checkLocationPermission(): Promise<PermissionStatus> {
  try {
    const setting = await Taro.getSetting()
    const authSetting = setting.authSetting

    // 检查位置权限
    if (authSetting['scope.userLocation'] === true) {
      return PermissionStatus.AUTHORIZED
    }

    if (authSetting['scope.userLocation'] === false) {
      return PermissionStatus.DENIED
    }

    return PermissionStatus.NOT_DETERMINED
  } catch (error) {
    console.error('检查权限失败:', error)
    return PermissionStatus.NOT_DETERMINED
  }
}

/**
 * 请求定位权限
 * @returns 是否授权成功
 */
export async function requestLocationPermission(): Promise<boolean> {
  try {
    // 检查当前权限状态
    const status = await checkLocationPermission()

    // 如果已授权，直接返回成功
    if (status === PermissionStatus.AUTHORIZED) {
      return true
    }

    // 如果已拒绝，引导用户手动开启
    if (status === PermissionStatus.DENIED) {
      const result = await Taro.showModal({
        title: '需要位置权限',
        content: '打卡功能需要获取您的位置信息，请在设置中开启位置权限',
        confirmText: '去设置',
        cancelText: '取消'
      })

      if (result.confirm) {
        // 打开设置页面
        await Taro.openSetting()
        // 再次检查权限
        const newStatus = await checkLocationPermission()
        return newStatus === PermissionStatus.AUTHORIZED
      }

      return false
    }

    // 如果未询问，尝试获取位置（会自动弹出授权对话框）
    try {
      await Taro.getLocation({
        type: 'gcj02'
      })
      return true
    } catch (error) {
      console.error('获取位置失败:', error)
      return false
    }
  } catch (error) {
    console.error('请求权限失败:', error)
    return false
  }
}

/**
 * 检查并请求定位权限（带用户提示）
 * @returns 是否授权成功
 */
export async function ensureLocationPermission(): Promise<boolean> {
  try {
    // 检查权限状态
    const status = await checkLocationPermission()

    // 已授权，直接返回
    if (status === PermissionStatus.AUTHORIZED) {
      return true
    }

    // 已拒绝，引导用户开启
    if (status === PermissionStatus.DENIED) {
      Taro.showToast({
        title: '请先开启位置权限',
        icon: 'none',
        duration: 2000
      })

      const result = await Taro.showModal({
        title: '需要位置权限',
        content: '打卡功能需要获取您的位置信息，请在设置中开启位置权限',
        confirmText: '去设置',
        cancelText: '取消'
      })

      if (result.confirm) {
        await Taro.openSetting()
        // 再次检查权限
        const newStatus = await checkLocationPermission()
        if (newStatus === PermissionStatus.AUTHORIZED) {
          Taro.showToast({
            title: '权限已开启',
            icon: 'success',
            duration: 1500
          })
          return true
        }
        Taro.showToast({
          title: '未开启位置权限',
          icon: 'none',
          duration: 2000
        })
        return false
      }

      return false
    }

    // 未询问，直接请求
    return await requestLocationPermission()
  } catch (error) {
    console.error('确保权限失败:', error)
    Taro.showToast({
      title: '权限检查失败',
      icon: 'none',
      duration: 2000
    })
    return false
  }
}

/**
 * 检查GPS是否开启
 * @returns GPS是否开启
 */
export async function checkGPSEnabled(): Promise<boolean> {
  try {
    const systemInfo = await Taro.getSystemInfo()
    // 检查位置服务是否开启
    return systemInfo.locationEnabled !== false
  } catch (error) {
    console.error('检查GPS状态失败:', error)
    return true // 默认认为已开启
  }
}

/**
 * 完整的定位前检查（权限 + GPS）
 * @returns 是否可以进行定位
 */
export async function checkLocationReady(): Promise<{
  ready: boolean
  message?: string
}> {
  try {
    // 1. 检查GPS是否开启
    const gpsEnabled = await checkGPSEnabled()
    if (!gpsEnabled) {
      return {
        ready: false,
        message: '请先开启手机GPS定位服务'
      }
    }

    // 2. 检查并请求权限
    const hasPermission = await ensureLocationPermission()
    if (!hasPermission) {
      return {
        ready: false,
        message: '需要位置权限才能打卡'
      }
    }

    return {
      ready: true
    }
  } catch (error) {
    console.error('定位准备检查失败:', error)
    return {
      ready: false,
      message: '定位检查失败，请重试'
    }
  }
}
