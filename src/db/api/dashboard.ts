/**
 * 仪表盘统计 API
 *
 * 功能包括：
 * - 仓库统计数据
 * - 全局统计数据
 * - 驾驶员统计
 * - 车辆统计
 * - 考勤统计
 */

// 从主 API 文件重新导出仪表盘相关函数
export {
  getAllWarehousesDashboardStats,
  getApprovedLeaveForToday,
  getBatchDriverAttendanceStats,
  // 考勤统计
  getDriverAttendanceStats,
  // 驾驶员统计
  getDriverStats,
  // 管理员统计
  getManagerStats,
  // 请假统计
  getMonthlyLeaveCount,
  getMonthlyPendingLeaveCount,
  // 超级管理员统计
  getSuperAdminStats,
  // 仓库仪表盘
  getWarehouseDashboardStats,
  getWarehouseDataVolume,
  // 仓库统计
  getWarehouseDriverCount,
  getWarehousesDataVolume
} from '../api'
