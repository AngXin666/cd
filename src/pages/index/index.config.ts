/**
 * 路由分发页配置
 * 作为工作台页面，禁用左滑返回手势
 * @see Requirements 3.3, 4.3, 5.4
 */
export default definePageConfig({
  navigationBarTitleText: '车队管家',
  // 禁用左滑返回手势（小程序环境）
  // 工作台页面阻止返回，用户需使用系统手势退出
  disableSwipeBack: true
})
