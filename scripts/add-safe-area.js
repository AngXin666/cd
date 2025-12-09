/**
 * 批量为所有页面添加安全区域适配
 */

const fs = require('fs')
const path = require('path')

const pageFiles = [
  // driver pages
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
  
  // manager pages
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
  
  // super-admin pages
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
  
  // common pages
  'src/pages/common/notifications/index.tsx',
  'src/pages/home/index.tsx',
  'src/pages/login/index.tsx',
]

function addSafeArea(filePath) {
  const fullPath = path.join(__dirname, '..', filePath)
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  文件不存在: ${filePath}`)
    return false
  }
  
  let content = fs.readFileSync(fullPath, 'utf-8')
  
  // 跳过已经添加过安全区域的文件
  if (content.includes('env(safe-area-inset-top)')) {
    console.log(`✓ 已适配: ${filePath}`)
    return true
  }
  
  // 查找return语句中的最外层View
  const patterns = [
    // 匹配 <View style={{...}}>
    {
      regex: /return\s*\(\s*<View\s+style=\{\{([^}]+)\}\}/,
      replace: (match, styleContent) => {
        // 添加 paddingTop
        if (!styleContent.includes('paddingTop')) {
          const newStyle = `paddingTop: 'env(safe-area-inset-top)', ${styleContent}`
          return match.replace(styleContent, newStyle)
        }
        return match
      }
    },
    // 匹配 <View className="..." style={{...}}>
    {
      regex: /return\s*\(\s*<View\s+className="[^"]*"\s+style=\{\{([^}]+)\}\}/,
      replace: (match, styleContent) => {
        if (!styleContent.includes('paddingTop')) {
          const newStyle = `paddingTop: 'env(safe-area-inset-top)', ${styleContent}`
          return match.replace(styleContent, newStyle)
        }
        return match
      }
    },
    // 匹配没有style的View
    {
      regex: /return\s*\(\s*<View(\s+className="[^"]*")?>/,
      replace: (match) => {
        return match.replace('>', ` style={{paddingTop: 'env(safe-area-inset-top)'}}>`)
      }
    }
  ]
  
  let modified = false
  for (const pattern of patterns) {
    if (pattern.regex.test(content)) {
      const newContent = content.replace(pattern.regex, pattern.replace)
      if (newContent !== content) {
        content = newContent
        modified = true
        break
      }
    }
  }
  
  if (modified) {
    fs.writeFileSync(fullPath, content, 'utf-8')
    console.log(`✓ 已更新: ${filePath}`)
    return true
  } else {
    console.log(`⚠️  未找到匹配模式: ${filePath}`)
    return false
  }
}

console.log('开始批量添加安全区域适配...\n')

let successCount = 0
let skipCount = 0
let failCount = 0

for (const file of pageFiles) {
  const result = addSafeArea(file)
  if (result === true) {
    if (fs.readFileSync(path.join(__dirname, '..', file), 'utf-8').includes('env(safe-area-inset-top)')) {
      successCount++
    } else {
      skipCount++
    }
  } else {
    failCount++
  }
}

console.log(`\n完成统计:`)
console.log(`✓ 成功: ${successCount}`)
console.log(`⊙ 已适配: ${skipCount}`)
console.log(`✗ 失败: ${failCount}`)
console.log(`总计: ${pageFiles.length}`)
