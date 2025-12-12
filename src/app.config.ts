// 主包页面 - 包含所有页面（暂时禁用分包）
const pages = [
  'pages/login/index',
  'pages/index/index',
  'pages/driver/index',
  'pages/manager/index',
  'pages/super-admin/index',
  'pages/profile/index',
  'pages/common/notifications/index',
  // 司机端页面
  'pages/driver/notifications/index',
  'pages/driver/clock-in/index',
  'pages/driver/attendance/index',
  'pages/driver/warehouse-stats/index',
  'pages/driver/piece-work/index',
  'pages/driver/piece-work-entry/index',
  'pages/driver/leave/index',
  'pages/driver/leave/apply/index',
  'pages/driver/leave/resign/index',
  'pages/driver/profile/index',
  'pages/driver/license-ocr/index',
  'pages/driver/vehicle-list/index',
  'pages/driver/add-vehicle/index',
  'pages/driver/vehicle-detail/index',
  'pages/driver/edit-vehicle/index',
  'pages/driver/return-vehicle/index',
  'pages/driver/supplement-photos/index',
  // 车队长端页面
  'pages/manager/data-summary/index',
  'pages/manager/piece-work-report/index',
  'pages/manager/piece-work-report-detail/index',
  'pages/manager/leave-approval/index',
  'pages/manager/driver-leave-detail/index',
  'pages/manager/warehouse-categories/index',
  'pages/manager/driver-management/index',
  'pages/manager/driver-profile/index',
  'pages/manager/staff-management/index',
  // 老板端页面
  'pages/super-admin/warehouse-management/index',
  'pages/super-admin/warehouse-edit/index',
  'pages/super-admin/warehouse-detail/index',
  'pages/super-admin/driver-warehouse-assignment/index',
  'pages/super-admin/vehicle-management/index',
  'pages/super-admin/vehicle-rental-edit/index',
  'pages/super-admin/vehicle-history/index',
  'pages/super-admin/vehicle-review-detail/index',
  'pages/super-admin/manager-warehouse-assignment/index',
  'pages/super-admin/category-management/index',
  'pages/super-admin/piece-work-report/index',
  'pages/super-admin/piece-work-report-detail/index',
  'pages/super-admin/piece-work-report-form/index',
  'pages/super-admin/leave-approval/index',
  'pages/super-admin/driver-leave-detail/index',
  'pages/super-admin/driver-attendance-detail/index',
  'pages/super-admin/user-management/index',
  'pages/super-admin/user-detail/index',
  'pages/super-admin/staff-management/index',
  'pages/super-admin/permission-config/index',
  'pages/super-admin/edit-user/index',
  'pages/super-admin/database-schema/index',
  // 个人资料页面
  'pages/profile/settings/index',
  'pages/profile/account-management/index',
  'pages/profile/change-phone/index',
  'pages/profile/change-password/index',
  'pages/profile/edit-name/index',
  'pages/profile/help/index',
  'pages/profile/edit/index',
  // 共享页面
  'pages/shared/driver-notification/index',
  'pages/shared/notification-templates/index',
  'pages/shared/scheduled-notifications/index',
  'pages/shared/notification-records/index',
  'pages/shared/auto-reminder-rules/index',
  // 测试页面
  'pages/test-login/index'
]

export default defineAppConfig({
  pages,
  // 分包配置 - 按角色和功能模块分包，提升加载性能
  // 暂时禁用分包功能，修复构建问题
  subPackages: [],
  // 预下载配置 - 根据用户角色预下载对应分包
  preloadRule: {
    packageDriver: {
      network: 'all',
      packages: ['driver']
    },
    packageManager: {
      network: 'all',
      packages: ['manager']
    },
    packageAdmin: {
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
  requiredPrivateInfos: ['getLocation', 'chooseLocation', 'chooseAddress'],
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
