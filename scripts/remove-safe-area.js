const fs = require('fs')
const path = require('path')

const pageFiles = [
  'src/pages/driver/add-vehicle/index.tsx',
  'src/pages/driver/attendance/index.tsx',
  'src/pages/driver/clock-in/index.tsx',
  'src/pages/driver/edit-vehicle/index.tsx',
  'src/pages/driver/index.tsx',
  'src/pages/driver/leave/apply/index.tsx',
  'src/pages/driver/leave/index.tsx',
  'src/pages/driver/leave/resign/index.tsx',
  'src/pages/driver/license-ocr/index.tsx',
  'src/pages/driver/notifications/index.tsx',
  'src/pages/driver/piece-work/index.tsx',
  'src/pages/driver/piece-work-entry/index.tsx',
  'src/pages/driver/profile/index.tsx',
  'src/pages/driver/return-vehicle/index.tsx',
  'src/pages/driver/supplement-photos/index.tsx',
  'src/pages/driver/vehicle-detail/index.tsx',
  'src/pages/driver/vehicle-list/index.tsx',
  'src/pages/driver/warehouse-stats/index.tsx',
  'src/pages/manager/data-summary/index.tsx',
  'src/pages/manager/driver-leave-detail/index.tsx',
  'src/pages/manager/driver-management/index.tsx',
  'src/pages/manager/driver-profile/index.tsx',
  'src/pages/manager/index.tsx',
  'src/pages/manager/leave-approval/index.tsx',
  'src/pages/manager/piece-work/index.tsx',
  'src/pages/manager/piece-work-form/index.tsx',
  'src/pages/manager/piece-work-report/index.tsx',
  'src/pages/manager/piece-work-report-detail/index.tsx',
  'src/pages/manager/staff-management/index.tsx',
  'src/pages/manager/warehouse-categories/index.tsx',
  'src/pages/super-admin/category-management/index.tsx',
  'src/pages/super-admin/database-schema/index.tsx',
  'src/pages/super-admin/driver-attendance-detail/index.tsx',
  'src/pages/super-admin/driver-leave-detail/index.tsx',
  'src/pages/super-admin/driver-warehouse-assignment/index.tsx',
  'src/pages/super-admin/edit-user/index.tsx',
  'src/pages/super-admin/index.tsx',
  'src/pages/super-admin/leave-approval/index.tsx',
  'src/pages/super-admin/manager-warehouse-assignment/index.tsx',
  'src/pages/super-admin/permission-config/index.tsx',
  'src/pages/super-admin/piece-work/index.tsx',
  'src/pages/super-admin/piece-work-form/index.tsx',
  'src/pages/super-admin/piece-work-report/index.tsx',
  'src/pages/super-admin/piece-work-report-detail/index.tsx',
  'src/pages/super-admin/piece-work-report-form/index.tsx',
  'src/pages/super-admin/staff-management/index.tsx',
  'src/pages/super-admin/user-detail/index.tsx',
  'src/pages/super-admin/user-management/index.tsx',
  'src/pages/super-admin/vehicle-history/index.tsx',
  'src/pages/super-admin/vehicle-management/index.tsx',
  'src/pages/super-admin/vehicle-rental-edit/index.tsx',
  'src/pages/super-admin/vehicle-review-detail/index.tsx',
  'src/pages/super-admin/warehouse-detail/index.tsx',
  'src/pages/super-admin/warehouse-edit/index.tsx',
  'src/pages/super-admin/warehouse-management/index.tsx',
  'src/pages/common/notifications/index.tsx',
  'src/pages/home/index.tsx',
  'src/pages/login/index.tsx',
]

let count = 0

for (const file of pageFiles) {
  const fullPath = path.join(__dirname, '..', file)
  if (!fs.existsSync(fullPath)) continue
  
  let content = fs.readFileSync(fullPath, 'utf-8')
  
  // 移除 paddingTop: 'env(safe-area-inset-top)'
  const modified = content.replace(/paddingTop:\s*['"]env\(safe-area-inset-top\)['"]\s*,?\s*/g, '')
  
  if (modified !== content) {
    fs.writeFileSync(fullPath, modified, 'utf-8')
    count++
  }
}

console.log(`已回滚 ${count} 个文件`)
