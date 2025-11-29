/**
 * 车辆管理 API
 *
 * 功能包括：
 * - 车辆CRUD操作
 * - 驾驶员证件管理
 * - 车辆审核管理
 * - 车辆归还流程
 * - 车辆统计
 */

// 从主 API 文件重新导出车辆相关函数
export {
  approveVehicle,
  deleteDriverLicense,
  deleteVehicle,
  // 车辆基本操作
  getAllVehiclesWithDrivers,
  // 驾驶员信息
  getDriverDetailInfo,
  getDriverDisplayName,
  // 驾驶员证件管理
  getDriverLicense,
  getDriverName,
  getDriverStats,
  getDriverVehicles,
  // 车辆审核管理
  getPendingReviewVehicles,
  // 车辆照片管理
  getRequiredPhotos,
  getVehicleById,
  getVehicleByPlateNumber,
  getVehiclesByDriverId,
  getVehicleWithDriverDetails,
  insertVehicle,
  lockPhoto,
  lockVehiclePhotos,
  markPhotoForDeletion,
  requireSupplement,
  returnVehicle,
  submitVehicleForReview,
  supplementPhoto,
  unlockPhoto,
  updateDriverLicense,
  updateVehicle,
  upsertDriverLicense
} from '../api'
