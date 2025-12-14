/**
 * Taro 应用配置文件
 * 配置分包加载，按角色拆分页面，优化首屏加载性能
 */

// 主包页面 - 只包含核心入口页面（TabBar 页面必须在主包）
const pages = [
  'pages/login/index',
  'pages/index/index',
  'pages/profile/index',
  // 各角色首页需要在主包，因为可能从 TabBar 跳转
  'pages/driver/index',
  'pages/manager/index',
  'pages/super-admin/index',
  // 通用通知页面
  'pages/common/notifications/index',
]

// 分包配置
const subPackages = [
  // 司机端分包
  {
    root: 'pages/driver',
    name: 'packageDriver',
    pages: [
      'notifications/index',
      'clock-in/index',
      'attendance/index',
      'warehouse-stats/index',
      'piece-work/index',
      'piece-work-entry/index',
      'leave/index',
      'leave/apply/index',
      'leave/resign/index',
      'profile/index',
      'license-ocr/index',
      'vehicle-list/index',
      'add-vehicle/index',
      'vehicle-detail/index',
      'edit-vehicle/index',
      'return-vehicle/index',
      'supplement-photos/index',
    ],
  },
  // 车队长端分包
  {
    root: 'pages/manager',
    name: 'packageManager',
    pages: [
      'data-summary/index',
      'piece-work-report/index',
      'piece-work-report-detail/index',
      'leave-approval/index',
      'driver-leave-detail/index',
      'warehouse-categories/index',
      'driver-management/index',
      'driver-profile/index',
      'staff-management/index',
    ],
  },
  // 老板端分包
  {
    root: 'pages/super-admin',
    name: 'packageAdmin',
    pages: [
      'warehouse-management/index',
      'warehouse-edit/index',
      'warehouse-detail/index',
      'driver-warehouse-assignment/index',
      'vehicle-management/index',
      'vehicle-rental-edit/index',
      'vehicle-history/index',
      'vehicle-review-detail/index',
      'manager-warehouse-assignment/index',
      'category-management/index',
      'piece-work-report/index',
      'piece-work-report-detail/index',
      'piece-work-report-form/index',
      'leave-approval/index',
      'driver-leave-detail/index',
      'driver-attendance-detail/index',
      'user-management/index',
      'user-detail/index',
      'staff-management/index',
      'permission-config/index',
      'edit-user/index',
    ],
  },
  // 个人资料分包
  {
    root: 'pages/profile',
    name: 'packageProfile',
    pages: [
      'settings/index',
      'account-management/index',
      'change-phone/index',
      'change-password/index',
      'edit-name/index',
      'help/index',
      'edit/index',
    ],
  },
  // 共享页面分包
  {
    root: 'pages/shared',
    name: 'packageShared',
    pages: [
      'driver-notification/index',
      'notification-templates/index',
      'scheduled-notifications/index',
      'notification-records/index',
      'auto-reminder-rules/index',
    ],
  },
]

export default defineAppConfig({
  pages,
  subPackages,
  // 预下载配置 - 根据用户角色预下载对应分包
  preloadRule: {
    'pages/driver/index': {
      network: 'all',
      packages: ['packageDriver'],
    },
    'pages/manager/index': {
      network: 'all',
      packages: ['packageManager'],
    },
    'pages/super-admin/index': {
      network: 'all',
      packages: ['packageAdmin'],
    },
    'pages/profile/index': {
      network: 'all',
      packages: ['packageProfile'],
    },
  },
  tabBar: {
    color: '#64748b',
    selectedColor: '#1E3A8A',
    backgroundColor: '#ffffff',
    borderStyle: 'white',
    list: [
      {
        pagePath: 'pages/index/index',
        text: '工作台',
        iconPath: './assets/images/unselected/workspace.png',
        selectedIconPath: './assets/images/selected/workspace.png',
      },
      {
        pagePath: 'pages/profile/index',
        text: '我的',
        iconPath: './assets/images/unselected/profile.png',
        selectedIconPath: './assets/images/selected/profile.png',
      },
    ],
  },
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#1E3A8A',
    navigationBarTitleText: '车队管家',
    navigationBarTextStyle: 'white',
    enablePullDownRefresh: false,
    onReachBottomDistance: 50,
    pageOrientation: 'portrait',
  },
  // 小程序权限配置
  requiredPrivateInfos: ['getLocation', 'chooseLocation', 'chooseAddress'],
  permission: {
    'scope.userLocation': {
      desc: '您的位置信息将用于上下班打卡定位验证',
    },
    'scope.camera': {
      desc: '需要使用您的相机来拍摄车辆照片和证件照片',
    },
    'scope.album': {
      desc: '需要访问您的相册来选择和上传图片',
    },
    'scope.writePhotosAlbum': {
      desc: '需要保存图片到您的相册',
    },
  },
  debug: false,
  entryPagePath: 'pages/login/index',
  navigateToMiniProgramAppIdList: [],
  networkTimeout: {
    request: 60000,
    downloadFile: 60000,
    uploadFile: 60000,
    connectSocket: 60000,
  },
  functionalPages: false,
  plugins: {},
  workers: '',
  sitemapLocation: 'sitemap.json',
})
