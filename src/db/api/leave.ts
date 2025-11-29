/**
 * 请假管理 API
 *
 * 功能包括：
 * - 请假申请（草稿/提交）
 * - 离职申请（草稿/提交）
 * - 申请审批
 * - 申请查询
 * - 申请统计
 */

// 从主 API 文件重新导出请假相关函数
export {
  // 请假申请
  createLeaveApplication,
  // 离职申请
  createResignationApplication,
  deleteDraftLeaveApplication,
  deleteDraftResignationApplication,
  getAllLeaveApplications,
  getAllResignationApplications,
  getDraftLeaveApplications,
  getDraftResignationApplications,
  getLeaveApplicationsByUser,
  getLeaveApplicationsByWarehouse,
  getMonthlyLeaveCount,
  getMonthlyPendingLeaveCount,
  getResignationApplicationsByUser,
  getResignationApplicationsByWarehouse,
  reviewLeaveApplication,
  reviewResignationApplication,
  saveDraftLeaveApplication,
  saveDraftResignationApplication,
  submitDraftLeaveApplication,
  submitDraftResignationApplication,
  updateDraftLeaveApplication,
  updateDraftResignationApplication,
  // 验证和统计
  validateLeaveApplication,
  validateResignationDate
} from '../api'
