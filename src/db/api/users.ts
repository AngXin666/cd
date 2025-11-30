/**
 * 用户管理 API
 *
 * 功能包括：
 * - 用户认证和个人资料
 * - 用户列表查询
 * - 角色管理
 * - 用户信息更新
 * - 头像上传
 * - 密码修改
 * - 反馈管理
 */

// 从主 API 文件重新导出用户相关函数
export {
  changePassword,
  createDriver,
  createUser,
  // 调试和工具
  debugAuthStatus,
  deleteTenantWithLog,
  getAllDriverIds,
  getAllDrivers,
  getAllDriversWithRealName,
  getAllFeedbackList,
  getAllManagers,
  // 用户列表查询
  getAllProfiles,
  getAllSuperAdmins,
  getAllUsers,
  getCurrentUserPermissions,
  // 当前用户相关
  getCurrentUserProfile,
  getCurrentUserRole,
  getCurrentUserRoleAndTenant,
  getCurrentUserWithRealName,
  getDatabaseTables,
  getDriverProfiles,
  // 统计信息
  getDriverStats,
  // 管理员权限
  getManagerPermission,
  getManagerPermissionsEnabled,
  getManagerProfiles,
  getManagerStats,
  getManagerWarehouseIds,
  getProfileById,
  getSuperAdminStats,
  getTableColumns,
  getTableConstraints,
  getUserById,
  getUserFeedbackList,
  getUserRoles,
  resetUserPassword,
  setManagerWarehouses,
  // 反馈管理
  submitFeedback,
  updateFeedbackStatus,
  updateManagerPermissionsEnabled,
  // 用户信息更新
  updateProfile,
  updateUserInfo,
  updateUserProfile,
  updateUserRole,
  // 头像和密码
  uploadAvatar,
  upsertManagerPermission
} from '../api'
