const pages = [
  'pages/login/index',
  'pages/index/index',
  'pages/driver/index',
  'pages/manager/index',
  'pages/super-admin/index',
  'pages/profile/index',
  'pages/profile/settings/index',
  'pages/profile/change-phone/index',
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
  'pages/driver/profile/index',
  'pages/driver/license-ocr/index',
  'pages/driver/vehicle-list/index',
  'pages/driver/add-vehicle/index',
  'pages/driver/vehicle-detail/index',
  'pages/driver/edit-vehicle/index',
  'pages/driver/return-vehicle/index',
  'pages/driver/supplement-photos/index',
  'pages/manager/data-summary/index',
  'pages/manager/piece-work-report/index',
  'pages/manager/piece-work-report-detail/index',
  'pages/manager/leave-approval/index',
  'pages/manager/driver-leave-detail/index',
  'pages/manager/warehouse-categories/index',
  'pages/manager/driver-management/index',
  'pages/manager/driver-profile/index',
  'pages/manager/staff-management/index',
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
