/**
 * Supabase 数据导出脚本
 * 从现有 Supabase 数据库导出数据到 JSON 文件
 * 用于迁移到新的 FastAPI + SQLite 系统
 * 
 * 使用方法：
 * 1. 确保 .env 文件中配置了 VITE_SUPABASE_URL 和 VITE_SUPABASE_SERVICE_ROLE_KEY
 * 2. 运行：node fleet-manager/scripts/export-supabase-data.js
 * 3. 导出的数据将保存在 fleet-manager/data/export/ 目录
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
require('dotenv').config()

// ==================== 配置 ====================

// Supabase 连接配置
const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY

// 导出目录
const EXPORT_DIR = path.join(__dirname, '../data/export')

// 需要导出的表（按依赖顺序排列）
const TABLES_TO_EXPORT = [
  'users',                    // 用户表
  'warehouses',               // 仓库表
  'warehouse_assignments',    // 用户-仓库关联
  'attendance',               // 考勤记录
  'piece_work_categories',    // 计件分类（如果存在）
  'category_prices',          // 计件分类价格
  'piece_work_records',       // 计件记录
  'leave_applications',       // 请假申请
  'resignation_applications', // 离职申请（如果存在）
  'vehicles',                 // 车辆信息
  'vehicle_documents',        // 车辆证件
  'driver_licenses',          // 驾驶证（如果存在）
  'notifications',            // 通知消息
]

// ==================== 工具函数 ====================

/**
 * 确保目录存在
 * @param {string} dirPath - 目录路径
 */
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
    console.log(`✅ 创建目录: ${dirPath}`)
  }
}

/**
 * 保存数据到 JSON 文件
 * @param {string} tableName - 表名
 * @param {Array} data - 数据数组
 */
function saveToJson(tableName, data) {
  const filePath = path.join(EXPORT_DIR, `${tableName}.json`)
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
  console.log(`✅ 导出 ${tableName}: ${data.length} 条记录 -> ${filePath}`)
}

/**
 * 导出单个表的数据
 * @param {object} supabase - Supabase 客户端
 * @param {string} tableName - 表名
 * @returns {Promise<Array>} 数据数组
 */
async function exportTable(supabase, tableName) {
  try {
    // 查询所有数据
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .order('created_at', { ascending: true })
    
    if (error) {
      // 如果表不存在，返回空数组
      if (error.code === '42P01' || error.message.includes('does not exist')) {
        console.log(`⚠️ 表 ${tableName} 不存在，跳过`)
        return []
      }
      throw error
    }
    
    return data || []
  } catch (err) {
    console.error(`❌ 导出 ${tableName} 失败:`, err.message)
    return []
  }
}

// ==================== 数据转换函数 ====================

/**
 * 转换用户数据
 * 将 Supabase 用户数据转换为新系统格式
 * @param {Array} users - 原始用户数据
 * @returns {Array} 转换后的用户数据
 */
function transformUsers(users) {
  return users.map(user => ({
    // 原始 ID（UUID）保留用于关联
    original_id: user.id,
    // 新系统字段
    username: user.login_account || user.phone || user.email || `user_${user.id.slice(0, 8)}`,
    name: user.name || '未命名用户',
    phone: user.phone || null,
    // 角色映射：BOSS -> boss, MANAGER -> manager, DRIVER -> driver
    role: (user.role || 'DRIVER').toLowerCase(),
    is_active: user.is_active !== false,
    created_at: user.created_at,
    updated_at: user.updated_at || user.created_at,
    // 保留原始数据用于参考
    _original: user
  }))
}

/**
 * 转换仓库数据
 * @param {Array} warehouses - 原始仓库数据
 * @returns {Array} 转换后的仓库数据
 */
function transformWarehouses(warehouses) {
  return warehouses.map(warehouse => ({
    original_id: warehouse.id,
    name: warehouse.name,
    address: warehouse.address || null,
    is_active: warehouse.is_active !== false,
    created_at: warehouse.created_at,
    _original: warehouse
  }))
}

/**
 * 转换仓库分配数据
 * @param {Array} assignments - 原始分配数据
 * @returns {Array} 转换后的分配数据
 */
function transformWarehouseAssignments(assignments) {
  return assignments.map(assignment => ({
    original_id: assignment.id,
    user_id: assignment.user_id,
    warehouse_id: assignment.warehouse_id,
    created_at: assignment.created_at,
    _original: assignment
  }))
}

/**
 * 转换考勤数据
 * @param {Array} attendance - 原始考勤数据
 * @returns {Array} 转换后的考勤数据
 */
function transformAttendance(attendance) {
  return attendance.map(record => ({
    original_id: record.id,
    user_id: record.user_id,
    work_date: record.work_date || record.date,
    clock_in: record.clock_in_time || record.clock_in,
    clock_out: record.clock_out_time || record.clock_out,
    work_hours: record.work_hours || null,
    created_at: record.created_at,
    _original: record
  }))
}

/**
 * 转换计件分类数据
 * @param {Array} categories - 原始分类数据
 * @param {Array} prices - 分类价格数据
 * @returns {Array} 转换后的分类数据
 */
function transformPieceWorkCategories(categories, prices) {
  // 如果没有分类表，从价格表中提取分类
  if (!categories || categories.length === 0) {
    const categoryMap = new Map()
    prices.forEach(price => {
      if (price.category_id && !categoryMap.has(price.category_id)) {
        categoryMap.set(price.category_id, {
          original_id: price.category_id,
          name: price.category_name || `分类_${price.category_id.slice(0, 8)}`,
          unit_price: price.price || price.unit_price || 0,
          unit: '件',
          is_active: true,
          created_at: price.created_at,
          _original: price
        })
      }
    })
    return Array.from(categoryMap.values())
  }
  
  return categories.map(category => ({
    original_id: category.id,
    name: category.name || category.category_name,
    unit_price: category.unit_price || category.price || 0,
    unit: category.unit || '件',
    is_active: category.is_active !== false,
    created_at: category.created_at,
    _original: category
  }))
}

/**
 * 转换计件记录数据
 * @param {Array} records - 原始计件记录
 * @returns {Array} 转换后的计件记录
 */
function transformPieceWorkRecords(records) {
  return records.map(record => ({
    original_id: record.id,
    user_id: record.user_id,
    category_id: record.category_id,
    warehouse_id: record.warehouse_id,
    work_date: record.work_date || record.date,
    quantity: record.quantity || 0,
    amount: record.total_amount || record.amount || 0,
    remark: record.notes || null,
    created_at: record.created_at,
    _original: record
  }))
}

/**
 * 转换请假申请数据
 * @param {Array} leaves - 原始请假数据
 * @param {Array} resignations - 原始离职数据
 * @returns {Array} 转换后的请假数据
 */
function transformLeaveApplications(leaves, resignations) {
  const result = []
  
  // 转换请假申请
  if (leaves && leaves.length > 0) {
    leaves.forEach(leave => {
      result.push({
        original_id: leave.id,
        user_id: leave.user_id,
        leave_type: 'leave',
        start_date: leave.start_date,
        end_date: leave.end_date,
        reason: leave.reason || null,
        status: (leave.status || 'pending').toLowerCase(),
        approver_id: leave.approver_id || leave.reviewed_by || null,
        approve_remark: leave.review_notes || null,
        created_at: leave.created_at,
        updated_at: leave.updated_at || leave.created_at,
        _original: leave
      })
    })
  }
  
  // 转换离职申请
  if (resignations && resignations.length > 0) {
    resignations.forEach(resignation => {
      result.push({
        original_id: resignation.id,
        user_id: resignation.user_id,
        leave_type: 'resign',
        start_date: resignation.start_date || resignation.resignation_date,
        end_date: resignation.end_date || resignation.resignation_date,
        reason: resignation.reason || null,
        status: (resignation.status || 'pending').toLowerCase(),
        approver_id: resignation.approver_id || resignation.reviewed_by || null,
        approve_remark: resignation.review_notes || null,
        created_at: resignation.created_at,
        updated_at: resignation.updated_at || resignation.created_at,
        _original: resignation
      })
    })
  }
  
  return result
}

/**
 * 转换车辆数据
 * @param {Array} vehicles - 原始车辆数据
 * @returns {Array} 转换后的车辆数据
 */
function transformVehicles(vehicles) {
  return vehicles.map(vehicle => ({
    original_id: vehicle.id,
    user_id: vehicle.driver_id || vehicle.user_id || vehicle.current_driver_id,
    license_plate: vehicle.plate_number || vehicle.license_plate,
    brand: vehicle.brand || null,
    model: vehicle.model || null,
    color: vehicle.color || null,
    // 状态映射
    status: mapVehicleStatus(vehicle.status || vehicle.review_status),
    created_at: vehicle.created_at,
    updated_at: vehicle.updated_at || vehicle.created_at,
    _original: vehicle
  }))
}

/**
 * 映射车辆状态
 * @param {string} status - 原始状态
 * @returns {string} 新系统状态
 */
function mapVehicleStatus(status) {
  const statusMap = {
    'active': 'active',
    'in_use': 'active',
    'returned': 'returned',
    'reviewing': 'reviewing',
    'pending': 'reviewing',
    'approved': 'active',
    'rejected': 'returned'
  }
  return statusMap[status?.toLowerCase()] || 'reviewing'
}

/**
 * 转换车辆证件数据
 * @param {Array} documents - 原始证件数据
 * @param {Array} licenses - 驾驶证数据
 * @returns {Array} 转换后的证件数据
 */
function transformVehicleDocuments(documents, licenses) {
  const result = []
  
  // 转换车辆证件
  if (documents && documents.length > 0) {
    documents.forEach(doc => {
      // 行驶证主页
      if (doc.driving_license_main_photo) {
        result.push({
          vehicle_id: doc.vehicle_id,
          doc_type: 'registration',
          file_url: doc.driving_license_main_photo,
          expiry_date: doc.inspection_valid_until || null,
          created_at: doc.created_at,
          _original: doc
        })
      }
    })
  }
  
  // 转换驾驶证
  if (licenses && licenses.length > 0) {
    licenses.forEach(license => {
      if (license.license_photo || license.front_photo) {
        result.push({
          vehicle_id: license.vehicle_id,
          doc_type: 'license',
          file_url: license.license_photo || license.front_photo,
          expiry_date: license.valid_until || license.license_valid_until || null,
          created_at: license.created_at,
          _original: license
        })
      }
    })
  }
  
  return result
}

/**
 * 转换通知数据
 * @param {Array} notifications - 原始通知数据
 * @returns {Array} 转换后的通知数据
 */
function transformNotifications(notifications) {
  return notifications.map(notification => ({
    original_id: notification.id,
    user_id: notification.recipient_id || notification.user_id,
    title: notification.title || '系统通知',
    content: notification.content || '',
    is_read: notification.is_read === true,
    sender_id: notification.sender_id || null,
    created_at: notification.created_at,
    _original: notification
  }))
}

// ==================== 主函数 ====================

async function main() {
  console.log('========================================')
  console.log('Supabase 数据导出工具')
  console.log('========================================\n')
  
  // 检查环境变量
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ 错误：请在 .env 文件中配置 VITE_SUPABASE_URL 和 VITE_SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }
  
  // 创建 Supabase 客户端
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  console.log('✅ 已连接到 Supabase\n')
  
  // 确保导出目录存在
  ensureDir(EXPORT_DIR)
  
  // 存储所有导出的数据
  const exportedData = {}
  
  // 导出所有表
  console.log('开始导出数据...\n')
  for (const tableName of TABLES_TO_EXPORT) {
    const data = await exportTable(supabase, tableName)
    exportedData[tableName] = data
    
    // 保存原始数据
    if (data.length > 0) {
      saveToJson(`raw_${tableName}`, data)
    }
  }
  
  // 转换数据
  console.log('\n开始转换数据...\n')
  
  // 转换用户
  const transformedUsers = transformUsers(exportedData.users || [])
  saveToJson('transformed_users', transformedUsers)
  
  // 转换仓库
  const transformedWarehouses = transformWarehouses(exportedData.warehouses || [])
  saveToJson('transformed_warehouses', transformedWarehouses)
  
  // 转换仓库分配
  const transformedAssignments = transformWarehouseAssignments(exportedData.warehouse_assignments || [])
  saveToJson('transformed_warehouse_assignments', transformedAssignments)
  
  // 转换考勤
  const transformedAttendance = transformAttendance(exportedData.attendance || [])
  saveToJson('transformed_attendance', transformedAttendance)
  
  // 转换计件分类
  const transformedCategories = transformPieceWorkCategories(
    exportedData.piece_work_categories || [],
    exportedData.category_prices || []
  )
  saveToJson('transformed_piece_work_categories', transformedCategories)
  
  // 转换计件记录
  const transformedPieceWork = transformPieceWorkRecords(exportedData.piece_work_records || [])
  saveToJson('transformed_piece_work_records', transformedPieceWork)
  
  // 转换请假申请
  const transformedLeaves = transformLeaveApplications(
    exportedData.leave_applications || [],
    exportedData.resignation_applications || []
  )
  saveToJson('transformed_leave_applications', transformedLeaves)
  
  // 转换车辆
  const transformedVehicles = transformVehicles(exportedData.vehicles || [])
  saveToJson('transformed_vehicles', transformedVehicles)
  
  // 转换车辆证件
  const transformedDocuments = transformVehicleDocuments(
    exportedData.vehicle_documents || [],
    exportedData.driver_licenses || []
  )
  saveToJson('transformed_vehicle_documents', transformedDocuments)
  
  // 转换通知
  const transformedNotifications = transformNotifications(exportedData.notifications || [])
  saveToJson('transformed_notifications', transformedNotifications)
  
  // 生成 ID 映射文件
  const idMapping = {
    users: {},
    warehouses: {},
    categories: {},
    vehicles: {}
  }
  
  transformedUsers.forEach((user, index) => {
    idMapping.users[user.original_id] = index + 1
  })
  
  transformedWarehouses.forEach((warehouse, index) => {
    idMapping.warehouses[warehouse.original_id] = index + 1
  })
  
  transformedCategories.forEach((category, index) => {
    idMapping.categories[category.original_id] = index + 1
  })
  
  transformedVehicles.forEach((vehicle, index) => {
    idMapping.vehicles[vehicle.original_id] = index + 1
  })
  
  saveToJson('id_mapping', idMapping)
  
  // 生成导出摘要
  const summary = {
    exportTime: new Date().toISOString(),
    tables: {
      users: transformedUsers.length,
      warehouses: transformedWarehouses.length,
      warehouse_assignments: transformedAssignments.length,
      attendance: transformedAttendance.length,
      piece_work_categories: transformedCategories.length,
      piece_work_records: transformedPieceWork.length,
      leave_applications: transformedLeaves.length,
      vehicles: transformedVehicles.length,
      vehicle_documents: transformedDocuments.length,
      notifications: transformedNotifications.length
    },
    totalRecords: transformedUsers.length + transformedWarehouses.length + 
                  transformedAssignments.length + transformedAttendance.length +
                  transformedCategories.length + transformedPieceWork.length +
                  transformedLeaves.length + transformedVehicles.length +
                  transformedDocuments.length + transformedNotifications.length
  }
  
  saveToJson('export_summary', summary)
  
  // 打印导出摘要
  console.log('\n========================================')
  console.log('导出完成！')
  console.log('========================================')
  console.log(`导出时间: ${summary.exportTime}`)
  console.log(`总记录数: ${summary.totalRecords}`)
  console.log('\n各表记录数:')
  Object.entries(summary.tables).forEach(([table, count]) => {
    console.log(`  - ${table}: ${count}`)
  })
  console.log(`\n导出目录: ${EXPORT_DIR}`)
  console.log('========================================\n')
}

// 执行主函数
main().catch(err => {
  console.error('❌ 导出失败:', err)
  process.exit(1)
})