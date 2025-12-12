// 主包页面 - 核心功能，首次加载
const pages = [
  'pages/login/index',
  'pages/index/index',
  'pages/driver/index',
  'pages/manager/index', 
  'pages/super-admin/index',
  'pages/profile/index',
  'pages/common/notifications/index'
]

export default defineAppConfig({
  pages,
  // 分包配置 - 按角色和功能模块分包，提升加载性能
  subPackages: [
    {
      root: 'packageDriver',
      name: 'driver',
      pages: [
        'pages/notifications/index',
        'pages/clock-in/index',
        'pages/attendance/index',
        'pages/warehouse-stats/index',
        'pages/piece-work/index',
        'pages/piece-work-entry/index',
        'pages/leave/index',
        'pages/leave/apply/index',
        'pages/leave/resign/index',
        'pages/profile/index',
        'pages/license-ocr/index',
        'pages/vehicle-list/index',
        'pages/add-vehicle/index',
        'pages/vehicle-detail/index',
        'pages/edit-vehicle/index',
        'pages/return-vehicle/index',
        'pages/supplement-photos/index'
      ]
    },
    {
      root: 'packageManager',
      name: 'manager',
      pages: [
        'pages/data-summary/index',
        'pages/piece-work-report/index',
        'pages/piece-work-report-detail/index',
        'pages/leave-approval/index',
        'pages/driver-leave-detail/index',
        'pages/warehouse-categories/index',
        'pages/driver-management/index',
        'pages/driver-profile/index',
        'pages/staff-management/index'
      ]
    },
    {
      root: 'packageAdmin',
      name: 'admin',
      pages: [
        'pages/warehouse-management/index',
        'pages/warehouse-edit/index',
        'pages/warehouse-detail/index',
        'pages/driver-warehouse-assignment/index',
        'pages/vehicle-management/index',
        'pages/vehicle-rental-edit/index',
        'pages/vehicle-history/index',
        'pages/vehicle-review-detail/index',
        'pages/manager-warehouse-assignment/index',
        'pages/category-management/index',
        'pages/piece-work-report/index',
        'pages/piece-work-report-detail/index',
        'pages/piece-work-report-form/index',
        'pages/leave-approval/index',
        'pages/driver-leave-detail/index',
        'pages/driver-attendance-detail/index',
        'pages/user-management/index',
        'pages/user-detail/index',
        'pages/staff-management/index',
        'pages/permission-config/index',
        'pages/edit-user/index',
        'pages/database-schema/index'
      ]
    },
    {
      root: 'packageProfile',
      name: 'profile',
      pages: [
        'pages/settings/index',
        'pages/account-management/index',
        'pages/change-phone/index',
        'pages/change-password/index',
        'pages/edit-name/index',
        'pages/help/index'
      ]
    },
    {
      root: 'packageShared',
      name: 'shared',
      pages: [
        'pages/driver-notification/index',
        'pages/notification-templates/index',
        'pages/scheduled-notifications/index',
        'pages/notification-records/index',
        'pages/auto-reminder-rules/index'
      ]
    },
    {
      root: 'packageTest',
      name: 'test',
      pages: [
        'pages/test-login/index'
      ]
    }
  ],
  // 预下载配置 - 根据用户角色预下载对应分包
  preloadRule: {
    'packageDriver': {
      network: 'all',
      packages: ['driver']
    },
    'packageManager': {
      network: 'all', 
      packages: ['manager']
    },
    'packageAdmin': {
      network: 'all',
      packages: ['admin']
    }
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
        selectedIconPath: './assets/images/selected/workspace.png'
      },
      {
        pagePath: 'pages/profile/index',
        text: '我的',
        iconPath: './assets/images/unselected/profile.png',
        selectedIconPath: './assets/images/selected/profile.png'
      }
    ]
  },
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#1E3A8A',
    navigationBarTitleText: '车队管家',
    navigationBarTextStyle: 'white',
    // 小程序性能优化
    enablePullDownRefresh: false,
    onReachBottomDistance: 50,
    // 页面方向锁定
    pageOrientation: 'portrait'
  },
  // 小程序权限配置
  requiredPrivateInfos: [
    'getLocation',
    'chooseLocation', 
    'chooseAddress',
    'chooseInvoiceTitle'
  ],
  permission: {
    'scope.userLocation': {
      desc: '您的位置信息将用于上下班打卡定位验证'
    },
    'scope.camera': {
      desc: '需要使用您的相机来拍摄车辆照片和证件照片'
    },
    'scope.album': {
      desc: '需要访问您的相册来选择和上传图片'
    },
    'scope.writePhotosAlbum': {
      desc: '需要保存图片到您的相册'
    }
  },
  // 小程序云开发配置（如果使用）
  cloud: false,
  // 小程序性能监控
  debug: false,
  // 小程序分享配置
  entryPagePath: 'pages/login/index',
  // 小程序导航栏配置
  navigateToMiniProgramAppIdList: [],
  // 小程序网络超时配置
  networkTimeout: {
    request: 60000,
    downloadFile: 60000,
    uploadFile: 60000,
    connectSocket: 60000
  },
  // 小程序功能页面配置
  functionalPages: false,
  // 小程序插件配置
  plugins: {},
  // 小程序 workers 配置
  workers: '',
  // 小程序 sitemap 配置
  sitemapLocation: 'sitemap.json'
})
