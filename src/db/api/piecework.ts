/**
 * 计件管理 API
 *
 * 功能包括：
 * - 计件记录管理
 * - 计件品类管理
 * - 品类价格配置
 * - 计件统计
 */

// 从主 API 文件重新导出计件相关函数
export {
  batchUpsertCategoryPrices,
  calculatePieceWorkStats,
  createCategory,
  createPieceWorkRecord,
  deleteCategory,
  deleteCategoryPrice,
  deletePieceWorkRecord,
  deleteUnusedCategories,
  // 计件品类
  getActiveCategories,
  getAllCategories,
  getAllPieceWorkRecords,
  getCategoryPrice,
  getCategoryPriceForDriver,
  // 品类价格配置
  getCategoryPricesByWarehouse,
  // 计件记录
  getPieceWorkRecordsByUser,
  getPieceWorkRecordsByUserAndWarehouse,
  getPieceWorkRecordsByWarehouse,
  updateCategory,
  updatePieceWorkRecord,
  upsertCategoryPrice
} from '../api'
