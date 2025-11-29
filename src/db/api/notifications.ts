/**
 * 通知系统 API
 *
 * 功能包括：
 * - 通知模板管理
 * - 通知发送记录
 * - 定时通知
 * - 自动提醒规则
 * - 通知统计
 */

// 从主 API 文件重新导出通知相关函数
export {
  createAutoReminderRule,
  // 通知发送
  createNotification,
  createNotificationForAllManagers,
  createNotificationForAllSuperAdmins,
  createNotificationRecord,
  createNotificationSendRecord,
  createNotificationTemplate,
  createScheduledNotification,
  deleteAutoReminderRule,
  deleteNotification,
  deleteNotificationTemplate,
  // 自动提醒规则
  getAutoReminderRules,
  // 通知发送记录
  getNotificationSendRecords,
  getNotifications,
  // 通知模板
  getNotificationTemplates,
  // 定时通知
  getScheduledNotifications,
  getUnreadNotificationCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  sendNotificationToDrivers,
  sendVerificationReminder,
  updateAutoReminderRule,
  updateNotificationTemplate,
  updateScheduledNotificationStatus
} from '../api'
