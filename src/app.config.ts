const pages = [
  'pages/login/index',
  'pages/driver/index',
  'pages/manager/index',
  'pages/super-admin/index',
  'pages/profile/index',
  'pages/admin-dashboard/index',
  'pages/driver/clock-in/index',
  'pages/driver/attendance/index',
  'pages/driver/warehouse-stats/index',
  'pages/driver/piece-work/index',
  'pages/driver/piece-work-entry/index',
  'pages/manager/data-summary/index',
  'pages/manager/piece-work/index',
  'pages/manager/piece-work-form/index',
  'pages/super-admin/warehouse-management/index',
  'pages/super-admin/driver-warehouse-assignment/index',
  'pages/super-admin/manager-warehouse-assignment/index',
  'pages/super-admin/category-management/index',
  'pages/super-admin/data-report/index',
  'pages/super-admin/piece-work/index',
  'pages/super-admin/piece-work-form/index'
]

export default defineAppConfig({
  pages,
  tabBar: {
    color: '#64748b',
    selectedColor: '#1E3A8A',
    backgroundColor: '#ffffff',
    borderStyle: 'white',
    list: [
      {
        pagePath: 'pages/driver/index',
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
    navigationBarTextStyle: 'white'
  },
  requiredPrivateInfos: ['getLocation'],
  permission: {
    'scope.userLocation': {
      desc: '您的位置信息将用于上下班打卡定位'
    }
  }
})
