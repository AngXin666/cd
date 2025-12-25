/**
 * 司机工作台页面配置
 * 作为工作台页面，禁用左滑返回手势
 * @see Requirements 3.3, 4.3, 5.1
 */
export default definePageConfig({
  navigationBarTitleText: '司机工作台',
  enableShareAppMessage: false,
  enablePullDownRefresh: true,
  backgroundTextStyle: 'dark',
  // 禁用左滑返回手势（小程序环境）
  // 工作台页面阻止返回，用户需使用系统手势退出
  disableSwipeBack: true
})
