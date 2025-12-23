/**
 * 导航工具函数
 * 提供页面路径判断和导航相关的工具函数
 * @module utils/navigation
 */

/**
 * 工作台页面路径列表
 * 这些页面会阻止返回操作，用户需要使用系统手势退出应用
 * 
 * 包含以下页面：
 * - /pages/index/index - 路由分发页（TabBar 页面）
 * - /pages/driver/index - 司机工作台
 * - /pages/manager/index - 管理员工作台
 * - /pages/super-admin/index - 老板工作台
 * - /pages/profile/index - 个人中心（TabBar 页面）
 * 
 * @constant
 * @see Requirements 5.1, 5.2, 5.3, 5.4, 5.5
 */
export const DASHBOARD_PATHS = [
  '/pages/index/index',
  '/pages/driver/index',
  '/pages/manager/index',
  '/pages/super-admin/index',
  '/pages/profile/index'
] as const

/**
 * 工作台页面路径类型
 * 从 DASHBOARD_PATHS 常量推导出的联合类型
 */
export type DashboardPath = typeof DASHBOARD_PATHS[number]

/**
 * 判断给定路径是否是工作台页面
 * 
 * 工作台页面包括：
 * - 路由分发页 (/pages/index/index)
 * - 司机工作台 (/pages/driver/index)
 * - 管理员工作台 (/pages/manager/index)
 * - 老板工作台 (/pages/super-admin/index)
 * - 个人中心 (/pages/profile/index)
 * 
 * 匹配规则：
 * 1. 路径包含工作台路径（如 /pages/driver/index?query=xxx）
 * 2. 路径以工作台路径结尾（不含 /index 后缀，如 /pages/driver）
 * 
 * @param path - 要判断的页面路径
 * @returns 如果是工作台页面返回 true，否则返回 false
 * 
 * @example
 * // 返回 true
 * isDashboardPage('/pages/driver/index')
 * isDashboardPage('/pages/driver/index?tab=1')
 * isDashboardPage('/pages/manager/index')
 * 
 * @example
 * // 返回 false
 * isDashboardPage('/pages/driver/attendance/index')
 * isDashboardPage('/pages/common/settings/index')
 * isDashboardPage('')
 * 
 * @see Requirements 5.1, 5.2, 5.3, 5.4, 5.5
 * @see Property 3: 工作台页面识别
 */
export function isDashboardPage(path: string): boolean {
  // 空路径或非字符串直接返回 false
  if (!path || typeof path !== 'string') {
    return false
  }

  // 遍历所有工作台路径进行匹配
  return DASHBOARD_PATHS.some(dashboardPath => {
    // 规则 1：路径包含完整的工作台路径
    // 例如：/pages/driver/index 或 /pages/driver/index?query=xxx
    if (path.includes(dashboardPath)) {
      return true
    }

    // 规则 2：路径以工作台路径结尾（不含 /index 后缀）
    // 例如：/pages/driver 匹配 /pages/driver/index
    const pathWithoutIndex = dashboardPath.replace('/index', '')
    if (path.endsWith(pathWithoutIndex)) {
      return true
    }

    return false
  })
}

/**
 * 登录页面路径
 * @constant
 */
export const LOGIN_PATH = '/pages/login/index'

/**
 * 判断给定路径是否是登录页面
 * 
 * @param path - 要判断的页面路径
 * @returns 如果是登录页面返回 true，否则返回 false
 * 
 * @example
 * // 返回 true
 * isLoginPage('/pages/login/index')
 * 
 * @example
 * // 返回 false
 * isLoginPage('/pages/driver/index')
 */
export function isLoginPage(path: string): boolean {
  // 空路径或非字符串直接返回 false
  if (!path || typeof path !== 'string') {
    return false
  }

  return path.includes(LOGIN_PATH)
}
