/**
 * 考勤管理 API
 *
 * 功能包括：
 * - 考勤打卡（上班/下班）
 * - 考勤记录查询
 * - 考勤规则管理
 * - 考勤统计
 */

// 从主 API 文件重新导出考勤相关函数
export {
  createAttendanceRule,
  // 考勤打卡
  createClockIn,
  deleteAttendanceRule,
  getAllAttendanceRecords,
  getAllAttendanceRules,
  getAttendanceRecordsByUserAndWarehouse,
  getAttendanceRecordsByWarehouse,
  // 考勤规则管理
  getAttendanceRuleByWarehouseId,
  getBatchDriverAttendanceStats,
  // 考勤统计
  getDriverAttendanceStats,
  // 考勤记录查询
  getMonthlyAttendance,
  getTodayAttendance,
  updateAttendanceRule,
  updateClockOut
} from '../api'
