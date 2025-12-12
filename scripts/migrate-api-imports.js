#!/usr/bin/env node

/**
 * API 导入自动迁移脚本
 * 
 * 功能：
 * 1. 扫描所有 TypeScript/TSX 文件
 * 2. 识别从 '@/db/api' 的导入
 * 3. 根据函数名自动判断所属模块
 * 4. 重写导入语句为模块化导入
 * 
 * 使用方法：
 * node scripts/migrate-api-imports.js [--dry-run] [--file=path/to/file.ts]
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// 函数到模块的映射表
const FUNCTION_TO_MODULE = {
  // attendance 模块
  getAttendanceRecords: 'attendance',
  createAttendanceRecord: 'attendance',
  updateAttendanceRecord: 'attendance',
  deleteAttendanceRecord: 'attendance',
  getAttendanceById: 'attendance',
  getTodayAttendance: 'attendance',
  getAllAttendanceRecords: 'attendance',
  
  // dashboard 模块
  getDashboardStats: 'dashboard',
  getRecentActivities: 'dashboard',
  getApprovedLeaveForToday: 'dashboard',
  getWarehouseDashboardStats: 'dashboard',
  getAllWarehousesDashboardStats: 'dashboard',
  
  // leave 模块
  getLeaveRequests: 'leave',
  createLeaveRequest: 'leave',
  updateLeaveRequest: 'leave',
  approveLeaveRequest: 'leave',
  rejectLeaveRequest: 'leave',
  getAllLeaveApplications: 'leave',
  
  // notifications 模块
  getUserNotifications: 'notifications',
  createNotification: 'notifications',
  createNotifications: 'notifications',
  markNotificationAsRead: 'notifications',
  markAllNotificationsAsRead: 'notifications',
  deleteNotification: 'notifications',
  getUnreadNotificationCount: 'notifications',
  
  // peer-accounts 模块
  getPeerAccounts: 'peer-accounts',
  createPeerAccount: 'peer-accounts',
  updatePeerAccount: 'peer-accounts',
  
  // peer-admin 模块
  isPeerAdmin: 'peer-admin',
  isBossOrFullControlPeerAdmin: 'peer-admin',
  peerAdminHasFullControl: 'peer-admin',
  peerAdminIsViewOnly: 'peer-admin',
  
  // permission-context 模块
  getPermissionContext: 'permission-context',
  
  // permission-strategy 模块
  createPeerAdmin: 'permission-strategy',
  updatePeerAdminPermission: 'permission-strategy',
  getPeerAdminPermission: 'permission-strategy',
  getAllPeerAdmins: 'permission-strategy',
  removePeerAdmin: 'permission-strategy',
  createManager: 'permission-strategy',
  updateManagerPermission: 'permission-strategy',
  removeManager: 'permission-strategy',
  getAllManagedManagers: 'permission-strategy',
  getManagedManagerPermission: 'permission-strategy',
  
  // piecework 模块
  getPieceworkRecords: 'piecework',
  createPieceworkRecord: 'piecework',
  updatePieceworkRecord: 'piecework',
  getPieceWorkRecordsByUser: 'piecework',
  getAllResignationApplications: 'piecework',
  
  // stats 模块
  getSystemStats: 'stats',
  getUserPersonalStats: 'stats',
  getWarehouseStats: 'stats',
  getAllWarehousesStats: 'stats',
  getCurrentUserInfo: 'stats',
  getUsersByRole: 'stats',
  addRoleToUser: 'stats',
  removeRoleFromUser: 'stats',
  getUserAllRoles: 'stats',
  userHasRole: 'stats',
  
  // users 模块
  getCurrentUserProfile: 'users',
  updateUserProfile: 'users',
  getUserById: 'users',
  getAllUsers: 'users',
  createUser: 'users',
  updateUser: 'users',
  deleteUser: 'users',
  getAllSuperAdmins: 'users',
  getDriverAttendanceStats: 'users',
  getDriverWarehouses: 'users',
  
  // utils 模块
  generateId: 'utils',
  formatDate: 'utils',
  
  // vehicles 模块
  getVehicles: 'vehicles',
  createVehicle: 'vehicles',
  updateVehicle: 'vehicles',
  deleteVehicle: 'vehicles',
  getVehicleById: 'vehicles',
  getAllVehicles: 'vehicles',
  
  // warehouses 模块
  getWarehouses: 'warehouses',
  createWarehouse: 'warehouses',
  updateWarehouse: 'warehouses',
  deleteWarehouse: 'warehouses',
  getWarehouseById: 'warehouses',
  getWarehouseManagers: 'warehouses',
  getWarehousesDataVolume: 'warehouses',
  getManagerWarehouses: 'warehouses',
}

// 类型到模块的映射表
const TYPE_TO_MODULE = {
  // attendance
  AttendanceRecord: 'attendance',
  AttendanceStatus: 'attendance',
  AttendanceType: 'attendance',
  
  // dashboard
  DashboardStats: 'dashboard',
  WarehouseDataVolume: 'dashboard',
  
  // leave
  LeaveRequest: 'leave',
  LeaveStatus: 'leave',
  LeaveType: 'leave',
  
  // notifications
  Notification: 'notifications',
  NotificationCategory: 'notifications',
  NotificationProcessStatus: 'notifications',
  NotificationType: 'notifications',
  
  // peer-admin
  PeerAdminListItem: 'peer-admin',
  PeerAdminPermission: 'peer-admin',
  
  // permission-strategy
  OperationResult: 'permission-strategy',
  PermissionLevel: 'permission-strategy',
  UserPermissionDetail: 'permission-strategy',
  UserPermissionInfo: 'permission-strategy',
  
  // piecework
  PieceworkRecord: 'piecework',
  PieceworkStatus: 'piecework',
  
  // stats
  CurrentUserInfo: 'stats',
  SystemStats: 'stats',
  UserDetails: 'stats',
  UserPersonalStats: 'stats',
  StatsUserRole: 'stats',
  WarehouseStats: 'stats',
  
  // users
  DatabaseColumn: 'users',
  DatabaseConstraint: 'users',
  DatabaseTable: 'users',
  Profile: 'users',
  
  // vehicles
  Vehicle: 'vehicles',
  VehicleStatus: 'vehicles',
  
  // warehouses
  Warehouse: 'warehouses',
  WarehouseStatus: 'warehouses',
  
  // types
  UserRole: 'types',
  UserRoleAssignment: 'types',
}

// 解析命令行参数
const args = process.argv.slice(2)
const isDryRun = args.includes('--dry-run')
const targetFile = args.find(arg => arg.startsWith('--file='))?.split('=')[1]

console.log('🚀 API 导入迁移脚本')
console.log('==================\n')

if (isDryRun) {
  console.log('⚠️  DRY RUN 模式：不会修改文件\n')
}

// 获取所有需要处理的文件
function getFilesToProcess() {
  if (targetFile) {
    return [targetFile]
  }
  
  try {
    const output = execSync(
      'find src -type f \\( -name "*.ts" -o -name "*.tsx" \\) ! -path "*/node_modules/*"',
      { encoding: 'utf-8' }
    )
    return output.trim().split('\n').filter(Boolean)
  } catch (error) {
    console.error('❌ 获取文件列表失败:', error.message)
    process.exit(1)
  }
}

// 解析导入语句
function parseImports(content) {
  const importRegex = /import\s+(?:type\s+)?{([^}]+)}\s+from\s+['"]@\/db\/api['"]/g
  const imports = []
  let match
  
  while ((match = importRegex.exec(content)) !== null) {
    const fullMatch = match[0]
    const importList = match[1]
    const isTypeImport = fullMatch.includes('import type')
    
    // 解析导入的项目
    const items = importList.split(',').map(item => {
      const trimmed = item.trim()
      const typeMatch = trimmed.match(/^type\s+(.+)/)
      if (typeMatch) {
        return { name: typeMatch[1].trim(), isType: true }
      }
      // 如果整个导入语句是 import type，则所有项都是类型
      return { name: trimmed, isType: isTypeImport }
    })
    
    imports.push({
      fullMatch,
      items,
      isTypeImport,
      startIndex: match.index,
      endIndex: match.index + fullMatch.length
    })
  }
  
  return imports
}

// 将导入项按模块分组
function groupImportsByModule(items) {
  const groups = {}
  const unknown = []
  
  for (const item of items) {
    const mapping = item.isType ? TYPE_TO_MODULE : FUNCTION_TO_MODULE
    const module = mapping[item.name]
    
    if (module) {
      if (!groups[module]) {
        groups[module] = { types: [], values: [] }
      }
      if (item.isType) {
        groups[module].types.push(item.name)
      } else {
        groups[module].values.push(item.name)
      }
    } else {
      unknown.push(item.name)
    }
  }
  
  return { groups, unknown }
}

// 生成新的导入语句
function generateNewImports(groups) {
  const imports = []
  
  for (const [module, { types, values }] of Object.entries(groups)) {
    const modulePath = module === 'types' ? '@/db/types' : `@/db/api/${module}`
    
    if (types.length > 0) {
      imports.push(`import type { ${types.join(', ')} } from '${modulePath}'`)
    }
    
    if (values.length > 0) {
      imports.push(`import { ${values.join(', ')} } from '${modulePath}'`)
    }
  }
  
  return imports.join('\n')
}

// 处理单个文件
function processFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8')
  const imports = parseImports(content)
  
  if (imports.length === 0) {
    return { changed: false }
  }
  
  console.log(`\n📄 处理文件: ${filePath}`)
  
  let newContent = content
  let offset = 0
  const changes = []
  
  for (const importInfo of imports) {
    const { groups, unknown } = groupImportsByModule(importInfo.items)
    
    if (unknown.length > 0) {
      console.log(`  ⚠️  未知导入: ${unknown.join(', ')}`)
    }
    
    if (Object.keys(groups).length === 0) {
      continue
    }
    
    const newImports = generateNewImports(groups)
    const startIndex = importInfo.startIndex + offset
    const endIndex = importInfo.endIndex + offset
    
    newContent = 
      newContent.slice(0, startIndex) +
      newImports +
      newContent.slice(endIndex)
    
    offset += newImports.length - (endIndex - startIndex)
    
    changes.push({
      old: importInfo.fullMatch,
      new: newImports
    })
  }
  
  // 显示变更
  for (const change of changes) {
    console.log(`  ❌ 旧: ${change.old}`)
    console.log(`  ✅ 新: ${change.new}`)
  }
  
  if (!isDryRun) {
    fs.writeFileSync(filePath, newContent, 'utf-8')
    console.log(`  💾 已保存`)
  }
  
  return { changed: true, changes: changes.length }
}

// 主函数
function main() {
  const files = getFilesToProcess()
  console.log(`📊 找到 ${files.length} 个文件\n`)
  
  let processedCount = 0
  let changedCount = 0
  let totalChanges = 0
  
  for (const file of files) {
    try {
      const result = processFile(file)
      processedCount++
      
      if (result.changed) {
        changedCount++
        totalChanges += result.changes
      }
    } catch (error) {
      console.error(`\n❌ 处理文件失败: ${file}`)
      console.error(`   错误: ${error.message}`)
    }
  }
  
  console.log('\n' + '='.repeat(50))
  console.log('📊 迁移统计')
  console.log('='.repeat(50))
  console.log(`处理文件: ${processedCount}`)
  console.log(`修改文件: ${changedCount}`)
  console.log(`总变更数: ${totalChanges}`)
  
  if (isDryRun) {
    console.log('\n⚠️  这是 DRY RUN，没有实际修改文件')
    console.log('   移除 --dry-run 参数以应用更改')
  } else {
    console.log('\n✅ 迁移完成！')
    console.log('\n建议执行以下命令验证：')
    console.log('  npm run type-check')
    console.log('  npm run build:weapp')
  }
}

// 运行
try {
  main()
} catch (error) {
  console.error('\n❌ 脚本执行失败:', error.message)
  process.exit(1)
}
