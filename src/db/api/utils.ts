/**
 * 数据库 API 工具函数
 * 包含所有模块共享的辅助函数
 *
 * 注意：getLocalDateString 函数已统一到 @/utils/date 模块
 * 此处重新导出以保持向后兼容
 */

// 从统一工具模块导入并重新导出 getLocalDateString
// 避免重复定义，确保日期格式一致性
export {getLocalDateString} from '@/utils/date'
