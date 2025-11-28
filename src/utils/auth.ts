import Taro from '@tarojs/taro'
import {supabase} from '@/client/supabase'

/**
 * 智能退出登录
 * 根据登录来源决定退出后跳转的页面
 * - 如果是通过测试登录进入的，退出后返回测试登录页面
 * - 如果是通过正常登录进入的，退出后返回正常登录页面
 */
export async function smartLogout(): Promise<void> {
  try {
    // 执行退出登录
    await supabase.auth.signOut()

    // 检查是否是通过测试登录进入的
    const isTestLogin = Taro.getStorageSync('isTestLogin')

    // 清除测试登录标记
    Taro.removeStorageSync('isTestLogin')

    // 显示退出成功提示
    Taro.showToast({
      title: '已退出登录',
      icon: 'success',
      duration: 1500
    })

    // 延迟跳转，让用户看到提示
    setTimeout(() => {
      if (isTestLogin === 'true') {
        // 返回测试登录页面
        Taro.reLaunch({url: '/pages/test-login/index'})
      } else {
        // 返回正常登录页面
        Taro.reLaunch({url: '/pages/login/index'})
      }
    }, 1500)
  } catch (error) {
    console.error('退出登录失败:', error)
    Taro.showToast({
      title: '退出登录失败',
      icon: 'none'
    })
  }
}
