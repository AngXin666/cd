const pages = [
  'pages/login/index',
  'pages/index/index',
  'pages/driver/index',
  'pages/manager/index',
  'pages/super-admin/index',
  'pages/profile/index',
  'pages/profile/edit/index',
  'pages/profile/settings/index',
  'pages/profile/change-password/index',
  'pages/profile/help/index',
  'pages/profile/feedback/index',
  'pages/admin-dashboard/index',
  'pages/driver/clock-in/index',
  'pages/driver/attendance/index',
  'pages/driver/warehouse-stats/index',
  'pages/driver/piece-work/index',
  'pages/driver/piece-work-entry/index',
  'pages/driver/leave/index',
  'pages/driver/leave/apply/index',
  'pages/driver/leave/resign/index',
  'pages/manager/data-summary/index',
  'pages/manager/piece-work-report/index',
  'pages/manager/piece-work-report-detail/index',
  'pages/manager/leave-approval/index',
  'pages/manager/driver-leave-detail/index',
  'pages/manager/attendance-records/index',
  'pages/manager/warehouse-categories/index',
  'pages/manager/driver-management/index',
  'pages/super-admin/warehouse-management/index',
  'pages/super-admin/warehouse-detail/index',
  'pages/super-admin/driver-warehouse-assignment/index',
  'pages/super-admin/manager-warehouse-assignment/index',
  'pages/super-admin/category-management/index',
  'pages/super-admin/piece-work-report/index',
  'pages/super-admin/piece-work-report-detail/index',
  'pages/super-admin/piece-work-report-form/index',
  'pages/super-admin/leave-approval/index',
  'pages/super-admin/driver-leave-detail/index',
  'pages/super-admin/user-management/index',
  'pages/super-admin/permission-config/index',
  'pages/super-admin/edit-user/index'
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
    navigationBarTextStyle: 'white'
  },
  requiredPrivateInfos: ['getLocation'],
  permission: {
    'scope.userLocation': {
      desc: '您的位置信息将用于上下班打卡定位'
    }
  }
})
