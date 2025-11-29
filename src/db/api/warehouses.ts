/**
 * 仓库管理 API
 *
 * 功能包括：
 * - 仓库CRUD操作
 * - 仓库规则管理
 * - 仓库与驾驶员关联
 * - 仓库与管理员关联
 * - 仓库设置
 */

// 从主 API 文件重新导出仓库相关函数
export {
  addManagerWarehouse,
  assignWarehouseToDriver,
  createWarehouse,
  deleteWarehouse,
  deleteWarehouseAssignmentsByDriver,
  // 仓库基本操作
  getActiveWarehouses,
  getAllDriverWarehouses,
  getAllWarehouses,
  getAllWarehousesWithRules,
  getDriverIdsByWarehouse,
  getDriversByWarehouse,
  getDriverWarehouseIds,
  // 仓库与驾驶员关联
  getDriverWarehouses,
  // 仓库与管理员关联
  getManagerWarehouses,
  getWarehouseAssignmentsByDriver,
  getWarehouseAssignmentsByManager,
  getWarehouseById,
  // 仓库品类
  getWarehouseCategories,
  getWarehouseCategoriesWithDetails,
  getWarehouseDriverCount,
  getWarehouseManager,
  getWarehouseManagers,
  // 仓库设置和统计
  getWarehouseSettings,
  // 仓库规则
  getWarehousesWithRules,
  getWarehouseWithRule,
  insertManagerWarehouseAssignment,
  insertWarehouseAssignment,
  removeManagerWarehouse,
  removeWarehouseFromDriver,
  setDriverWarehouses,
  setManagerWarehouses,
  setWarehouseCategories,
  updateWarehouse,
  updateWarehouseSettings
} from '../api'
