/**
 * 平级账号管理 API
 *
 * 功能包括：
 * - 创建平级账号
 * - 查询平级账号列表
 * - 验证主账号身份
 */

// 从主 API 文件重新导出平级账号相关函数
export {
  createPeerAccount,
  getPeerAccounts,
  isPrimaryAccount
} from '../api'
