/**
 * API 模块入口
 * 导出所有 API 方法和类型
 */

import { get, post, put, del, getApiBaseUrl } from './request';

// 导出 getApiBaseUrl 供其他模块使用
export { getApiBaseUrl };
import type {
  LoginRequest,
  TokenResponse,
  PasswordChangeRequest,
  User,
  UserCreate,
  UserUpdate,
  Warehouse,
  WarehouseCreate,
  WarehouseUpdate,
  Attendance,
  TodayAttendance,
  AttendanceRule,
  LeaveCheckResult,
  PieceWorkCategory,
  PieceWorkCategoryCreate,
  PieceWorkRecord,
  PieceWorkRecordCreate,
  PieceWorkStats,
  LeaveApplication,
  LeaveApplicationCreate,
  LeaveApproveRequest,
  Vehicle,
  VehicleCreate,
  VehicleUpdate,
  VehicleDocument,
  VehicleLease,
  VehicleLeaseUpdate,
  VehicleLeaseReminder,
  SupplementPhotoRequest,
  SupplementedPhotosResponse,
  Notification,
  NotificationCreate,
  NotificationFromTemplateCreate,
  UnreadCountResponse,
  NotificationTemplate,
  NotificationTemplateCreate,
  NotificationTemplateUpdate,
  TemplatePreviewResponse,
  TemplateCategoriesResponse,
  MessageResponse,
  PaginationParams,
  OCRDrivingLicenseRequest,
  OCRDrivingLicenseResponse,
  OCRStatusResponse,
} from './types';
import { UserRole, LeaveStatus, VehicleStatus } from './types';

// ==================== 认证 API ====================

/**
 * 用户登录
 * @param data - 登录信息
 * @returns Token 响应
 */
export const login = (data: LoginRequest) =>
  post<TokenResponse>('/auth/login', data, false);

/**
 * 获取当前用户信息
 * @returns 用户信息
 */
export const getCurrentUser = () => get<User>('/auth/me');

/**
 * 修改密码
 * @param data - 密码信息
 * @returns 消息响应
 */
export const changePassword = (data: PasswordChangeRequest) =>
  put<MessageResponse>('/auth/password', data);

// ==================== 用户 API ====================

/**
 * 获取用户列表
 * @param params - 查询参数
 * @returns 用户列表
 */
export const getUsers = (params?: PaginationParams & { role?: UserRole; is_active?: boolean }) =>
  get<User[]>('/users', params);

/**
 * 创建用户
 * @param data - 用户信息
 * @returns 创建的用户
 */
export const createUser = (data: UserCreate) => post<User>('/users', data);

/**
 * 获取用户详情
 * @param id - 用户ID
 * @returns 用户信息
 */
export const getUser = (id: number) => get<User>(`/users/${id}`);

/**
 * 更新用户
 * @param id - 用户ID
 * @param data - 更新数据
 * @returns 更新后的用户
 */
export const updateUser = (id: number, data: UserUpdate) =>
  put<User>(`/users/${id}`, data);

/**
 * 删除用户
 * @param id - 用户ID
 * @returns 消息响应
 */
export const deleteUser = (id: number) => del<MessageResponse>(`/users/${id}`);

// ==================== 仓库 API ====================

/**
 * 获取仓库列表
 * @param params - 查询参数
 * @returns 仓库列表
 */
export const getWarehouses = (params?: PaginationParams & { is_active?: boolean }) =>
  get<Warehouse[]>('/warehouses', params);

/**
 * 创建仓库
 * @param data - 仓库信息
 * @returns 创建的仓库
 */
export const createWarehouse = (data: WarehouseCreate) =>
  post<Warehouse>('/warehouses', data);

/**
 * 获取仓库详情
 * @param id - 仓库ID
 * @returns 仓库信息
 */
export const getWarehouse = (id: number) => get<Warehouse>(`/warehouses/${id}`);

/**
 * 更新仓库
 * @param id - 仓库ID
 * @param data - 更新数据
 * @returns 更新后的仓库
 */
export const updateWarehouse = (id: number, data: WarehouseUpdate) =>
  put<Warehouse>(`/warehouses/${id}`, data);

/**
 * 删除仓库
 * @param id - 仓库ID
 * @returns 消息响应
 */
export const deleteWarehouse = (id: number) =>
  del<MessageResponse>(`/warehouses/${id}`);

/**
 * 分配用户到仓库
 * @param warehouseId - 仓库ID
 * @param userIds - 用户ID列表
 * @returns 消息响应
 */
export const assignUsersToWarehouse = (warehouseId: number, userIds: number[]) =>
  post<MessageResponse>(`/warehouses/${warehouseId}/assign`, { user_ids: userIds });

/**
 * 获取仓库下的用户
 * @param warehouseId - 仓库ID
 * @returns 用户列表
 */
export const getWarehouseUsers = (warehouseId: number) =>
  get<User[]>(`/warehouses/${warehouseId}/users`);

// ==================== 考勤 API ====================

/**
 * 上班打卡
 * @param warehouseId - 可选的仓库 ID（用于记录打卡仓库）
 * @returns 考勤记录
 */
export const clockIn = (warehouseId?: number) => 
  post<Attendance>('/attendance/clock-in', warehouseId ? { warehouse_id: warehouseId } : undefined);

/**
 * 下班打卡
 * @returns 考勤记录
 */
export const clockOut = () => post<Attendance>('/attendance/clock-out');

/**
 * 获取今日打卡状态
 * @returns 今日打卡状态
 */
export const getTodayAttendance = () => get<TodayAttendance>('/attendance/today');

/**
 * 获取指定用户的今日考勤记录
 * 用于计件录入页面检查用户是否已打卡
 * 
 * @param userId - 用户ID
 * @returns 今日考勤记录，如果未打卡则返回 null
 * @requirements 1.2 - 打卡仓库自动选择
 */
export async function getTodayAttendanceForUser(userId: number): Promise<Attendance | null> {
  // 获取今天的日期字符串 (YYYY-MM-DD)
  const today = new Date();
  const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  
  try {
    // 查询指定用户今日的考勤记录
    const records = await getAttendanceRecords({
      user_id: userId,
      start_date: dateStr,
      end_date: dateStr,
      limit: 1,
    });
    
    // 返回第一条记录，如果没有则返回 null
    return records.length > 0 ? records[0] : null;
  } catch (error) {
    console.error('获取用户今日考勤失败:', error);
    return null;
  }
}

/**
 * 获取考勤记录列表
 * @param params - 查询参数
 * @returns 考勤记录列表
 */
export const getAttendanceRecords = (
  params?: PaginationParams & {
    user_id?: number;
    start_date?: string;
    end_date?: string;
  }
) => get<Attendance[]>('/attendance', params);

/**
 * 获取仓库的考勤规则
 * 返回指定仓库的考勤规则配置
 * 
 * @param warehouseId - 仓库 ID
 * @returns 考勤规则，如果未配置则返回默认规则
 * @requirements 9.4 - 显示考勤规则
 * 
 * @description
 * 当前后端可能没有考勤规则表，此函数返回默认规则。
 * 未来如果后端支持考勤规则配置，可以扩展此函数。
 */
export async function getAttendanceRule(warehouseId: number): Promise<AttendanceRule> {
  // 当前返回默认考勤规则
  // 未来可以从后端获取仓库特定的考勤规则
  return {
    id: 0,
    warehouse_id: warehouseId,
    work_start_time: '08:00',
    work_end_time: '18:00',
    late_threshold: 30, // 迟到阈值：30分钟
    early_threshold: 30, // 早退阈值：30分钟
    require_clock_out: true, // 默认需要打下班卡
  };
}

/**
 * 检查用户是否在请假中
 * 检查当前用户今天是否有已批准的请假
 * 
 * @returns 请假状态检查结果
 * @requirements 9.8 - 请假中禁用打卡
 * 
 * @description
 * 查询当前用户今天是否有已批准的请假申请，
 * 如果在请假中则返回 onLeave: true。
 */
export async function checkUserOnLeave(): Promise<LeaveCheckResult> {
  try {
    // 获取今天的日期字符串 (YYYY-MM-DD)
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    // 查询当前用户已批准的请假申请
    const applications = await getLeaveApplications({
      status: LeaveStatus.APPROVED,
      limit: 100,
    });
    
    // 检查是否有覆盖今天的请假
    for (const app of applications) {
      const startDate = app.start_date;
      const endDate = app.end_date;
      
      // 检查今天是否在请假日期范围内
      if (dateStr >= startDate && dateStr <= endDate) {
        return {
          onLeave: true,
          leaveType: app.leave_type,
          startDate: app.start_date,
          endDate: app.end_date,
        };
      }
    }
    
    return { onLeave: false };
  } catch (error) {
    console.error('检查请假状态失败:', error);
    return { onLeave: false };
  }
}

// ==================== 计件 API ====================

/**
 * 获取计件分类列表
 * @param isActive - 是否只获取启用的分类
 * @returns 分类列表
 */
export const getPieceWorkCategories = (isActive?: boolean) =>
  get<PieceWorkCategory[]>('/piece-work/categories', { is_active: isActive });

/**
 * 创建计件分类
 * @param data - 分类信息
 * @returns 创建的分类
 */
export const createPieceWorkCategory = (data: PieceWorkCategoryCreate) =>
  post<PieceWorkCategory>('/piece-work/categories', data);

/**
 * 获取计件记录列表
 * @param params - 查询参数
 * @returns 记录列表
 */
export const getPieceWorkRecords = (
  params?: PaginationParams & {
    user_id?: number;
    warehouse_id?: number;
    category_id?: number;
    start_date?: string;
    end_date?: string;
  }
) => get<PieceWorkRecord[]>('/piece-work/records', params);

/**
 * 创建计件记录
 * @param data - 记录信息
 * @returns 创建的记录
 */
export const createPieceWorkRecord = (data: PieceWorkRecordCreate) =>
  post<PieceWorkRecord>('/piece-work/records', data);

/**
 * 获取计件统计
 * @param params - 查询参数
 * @returns 统计数据
 */
export const getPieceWorkStats = (
  params?: {
    user_id?: number;
    warehouse_id?: number;
    start_date?: string;
    end_date?: string;
  }
) => get<PieceWorkStats>('/piece-work/stats', params);

/**
 * 更新计件记录
 * @param id - 记录ID
 * @param data - 更新数据
 * @returns 更新后的记录
 */
export const updatePieceWorkRecord = (id: number, data: { quantity?: number; remark?: string }) =>
  put<PieceWorkRecord>(`/piece-work/records/${id}`, data);

/**
 * 删除计件记录
 * @param id - 记录ID
 * @returns 消息响应
 */
export const deletePieceWorkRecord = (id: number) =>
  del<MessageResponse>(`/piece-work/records/${id}`);

/**
 * 司机类型枚举
 * 用于区分带车司机和纯司机的单价配置
 */
export type DriverType = 'with_vehicle' | 'driver_only';

/**
 * 单价配置接口
 * 包含基础单价和司机类型相关的单价信息
 */
export interface CategoryPriceConfig {
  /** 基础单价（从分类获取） */
  unitPrice: number;
  /** 是否由管理员设置（锁定状态） */
  isLocked: boolean;
  /** 单价来源说明 */
  source: string;
}

/**
 * 获取司机对应的单价配置
 * 根据仓库、品类和司机类型获取对应的单价
 * 
 * @param warehouseId - 仓库 ID
 * @param categoryId - 品类 ID
 * @param driverType - 司机类型 (with_vehicle | driver_only)
 * @returns 单价配置，如果未找到则返回 null
 * @requirements 1.3 - 司机类型单价加载
 * 
 * @description
 * 当前后端只支持统一单价，此函数从分类中获取单价。
 * 未来如果后端支持按司机类型区分单价，可以扩展此函数。
 */
export async function getCategoryPriceForDriver(
  warehouseId: number,
  categoryId: number,
  driverType: DriverType
): Promise<CategoryPriceConfig | null> {
  try {
    // 获取所有启用的分类
    const categories = await getPieceWorkCategories(true);
    
    // 查找指定的分类
    const category = categories.find(c => c.id === categoryId);
    
    if (!category) {
      console.warn(`未找到分类 ID: ${categoryId}`);
      return null;
    }
    
    // 当前后端只有统一单价，返回分类的单价
    // 未来可以根据 driverType 和 warehouseId 获取不同的单价
    return {
      unitPrice: category.unit_price,
      isLocked: category.unit_price > 0, // 如果有单价则认为是管理员设置的
      source: category.unit_price > 0 ? '管理员已设置' : '请输入单价',
    };
  } catch (error) {
    console.error('获取司机单价配置失败:', error);
    return null;
  }
}

/**
 * 检查是否存在重复记录
 * 检查指定用户在指定日期、仓库、品类是否已有计件记录
 * 
 * @param userId - 用户 ID
 * @param warehouseId - 仓库 ID
 * @param categoryId - 品类 ID
 * @param workDate - 工作日期 (YYYY-MM-DD)
 * @returns 如果存在重复记录则返回该记录，否则返回 null
 * @requirements 1.6 - 重复记录检测
 * 
 * @description
 * 用于在提交计件记录前检查是否已存在相同条件的记录，
 * 如果存在则提示用户选择累计或新增。
 */
export async function checkDuplicateRecord(
  userId: number,
  warehouseId: number,
  categoryId: number,
  workDate: string
): Promise<PieceWorkRecord | null> {
  try {
    // 查询指定条件的计件记录
    const records = await getPieceWorkRecords({
      user_id: userId,
      warehouse_id: warehouseId,
      category_id: categoryId,
      start_date: workDate,
      end_date: workDate,
      limit: 1,
    });
    
    // 返回第一条匹配的记录，如果没有则返回 null
    return records.length > 0 ? records[0] : null;
  } catch (error) {
    console.error('检查重复记录失败:', error);
    return null;
  }
}

// ==================== 请假 API ====================

/**
 * 获取请假申请列表
 * @param params - 查询参数
 * @returns 申请列表
 */
export const getLeaveApplications = (
  params?: PaginationParams & {
    user_id?: number;
    status?: LeaveStatus;
  }
) => get<LeaveApplication[]>('/leave', params);

/**
 * 创建请假申请
 * @param data - 申请信息
 * @returns 创建的申请
 */
export const createLeaveApplication = (data: LeaveApplicationCreate) =>
  post<LeaveApplication>('/leave', data);

/**
 * 获取请假申请详情
 * @param id - 申请ID
 * @returns 申请详情
 */
export const getLeaveApplication = (id: number) =>
  get<LeaveApplication>(`/leave/${id}`);

/**
 * 审批请假申请
 * @param id - 申请ID
 * @param data - 审批信息
 * @returns 更新后的申请
 */
export const approveLeaveApplication = (id: number, data: LeaveApproveRequest) =>
  put<LeaveApplication>(`/leave/${id}/approve`, data);

// ==================== 车辆 API ====================

/**
 * 获取车辆列表
 * @param params - 查询参数
 * @returns 车辆列表
 */
export const getVehicles = (
  params?: PaginationParams & {
    user_id?: number;
    status?: VehicleStatus;
  }
) => get<Vehicle[]>('/vehicles', params);

/**
 * 创建车辆
 * @param data - 车辆信息
 * @returns 创建的车辆
 */
export const createVehicle = (data: VehicleCreate) =>
  post<Vehicle>('/vehicles', data);

/**
 * 获取车辆详情
 * @param id - 车辆ID
 * @returns 车辆信息
 */
export const getVehicle = (id: number) => get<Vehicle>(`/vehicles/${id}`);

/**
 * 更新车辆
 * @param id - 车辆ID
 * @param data - 更新数据
 * @returns 更新后的车辆
 */
export const updateVehicle = (id: number, data: VehicleUpdate) =>
  put<Vehicle>(`/vehicles/${id}`, data);

/**
 * 审核车辆
 * @param id - 车辆ID
 * @param status - 审核状态
 * @returns 更新后的车辆
 */
export const reviewVehicle = (id: number, status: VehicleStatus) =>
  put<Vehicle>(`/vehicles/${id}/review`, { status });

/**
 * 删除车辆
 * @param id - 车辆ID
 * @returns 消息响应
 */
export const deleteVehicle = (id: number) =>
  del<MessageResponse>(`/vehicles/${id}`);

/**
 * 还车
 * @param vehicleId - 车辆ID
 * @param returnPhotos - 还车照片数组（7张车辆照片）
 * @param damagePhotos - 车损照片数组（可选）
 * @returns 更新后的车辆
 */
export const returnVehicle = async (
  vehicleId: number,
  returnPhotos: string[],
  damagePhotos?: string[]
): Promise<Vehicle> => {
  const data: any = {
    return_photos: returnPhotos,
    return_time: new Date().toISOString(),
    status: 'returned'
  };
  
  if (damagePhotos && damagePhotos.length > 0) {
    data.damage_photos = damagePhotos;
  }
  
  return put<Vehicle>(`/vehicles/${vehicleId}/return`, data);
};

/**
 * 分配车辆给司机
 * @param vehicleId - 车辆ID
 * @param userId - 司机用户ID
 * @param warehouseId - 仓库ID（可选）
 * @returns 更新后的车辆
 */
export const assignVehicle = (
  vehicleId: number,
  userId: number,
  warehouseId?: number
): Promise<Vehicle> => {
  const data: any = {
    user_id: userId
  };
  
  if (warehouseId) {
    data.warehouse_id = warehouseId;
  }
  
  return put<Vehicle>(`/vehicles/${vehicleId}/assign`, data);
};

/**
 * 获取所有车辆（管理员用）
 * @param params - 查询参数
 * @returns 车辆列表
 */
export const getAllVehicles = (
  params?: PaginationParams & {
    warehouse_id?: number;
    status?: VehicleStatus;
    review_status?: string;
  }
) => get<Vehicle[]>('/vehicles/all', params);

/**
 * 获取仓库下的车辆
 * @param warehouseId - 仓库ID
 * @param params - 查询参数
 * @returns 车辆列表
 */
export const getWarehouseVehicles = (
  warehouseId: number,
  params?: PaginationParams & {
    status?: VehicleStatus;
    review_status?: string;
  }
) => get<Vehicle[]>(`/warehouses/${warehouseId}/vehicles`, params);

/**
 * 上传车辆证件
 * @param vehicleId - 车辆ID
 * @param data - 证件信息
 * @returns 创建的证件
 */
export const createVehicleDocument = (
  vehicleId: number,
  data: { doc_type: string; file_url?: string; expiry_date?: string }
) => post<VehicleDocument>(`/vehicles/${vehicleId}/documents`, data);

// ==================== 车辆租赁 API ====================

/**
 * 获取车辆租赁信息
 * @param vehicleId - 车辆ID
 * @returns 租赁信息
 */
export const getVehicleLease = (vehicleId: number) =>
  get<VehicleLease>(`/vehicles/${vehicleId}/lease`);

/**
 * 更新车辆租赁信息
 * @param vehicleId - 车辆ID
 * @param data - 租赁信息
 * @returns 更新后的租赁信息
 */
export const updateVehicleLease = (vehicleId: number, data: VehicleLeaseUpdate) =>
  put<VehicleLease>(`/vehicles/${vehicleId}/lease`, data);

/**
 * 获取租金提醒列表
 * @param daysAhead - 提前多少天提醒，默认7天
 * @returns 租金提醒列表
 */
export const getLeaseReminders = (daysAhead: number = 7) =>
  get<VehicleLeaseReminder[]>('/vehicles/lease-reminders', { days_ahead: daysAhead });

// ==================== 补录照片 API ====================

/**
 * 补录车辆照片
 * @param vehicleId - 车辆ID
 * @param data - 补录照片请求数据
 * @returns 更新后的补录照片元数据
 */
export const supplementVehiclePhoto = (vehicleId: number, data: SupplementPhotoRequest) =>
  put<SupplementedPhotosResponse>(`/vehicles/${vehicleId}/supplement-photo`, data);

/**
 * 获取车辆的补录照片元数据
 * @param vehicleId - 车辆ID
 * @returns 补录照片元数据
 */
export const getSupplementedPhotos = (vehicleId: number) =>
  get<SupplementedPhotosResponse>(`/vehicles/${vehicleId}/supplement-photos`);

// ==================== 通知 API ====================

/**
 * 获取通知列表
 * @param params - 查询参数
 * @returns 通知列表
 */
export const getNotifications = (
  params?: PaginationParams & { is_read?: boolean }
) => get<Notification[]>('/notifications', params);

/**
 * 发送通知
 * @param data - 通知信息
 * @returns 消息响应
 */
export const createNotification = (data: NotificationCreate) =>
  post<MessageResponse>('/notifications', data);

/**
 * 标记通知为已读
 * @param id - 通知ID
 * @returns 更新后的通知
 */
export const markNotificationAsRead = (id: number) =>
  put<Notification>(`/notifications/${id}/read`);

/**
 * 获取未读通知数量
 * @returns 未读数量
 */
export const getUnreadCount = () =>
  get<UnreadCountResponse>('/notifications/unread-count');

/**
 * 获取 SSE 连接状态
 * @returns SSE 状态信息
 */
export const getSSEStatus = () =>
  get<{
    sse_supported: boolean;
    is_connected: boolean;
    last_active: number | null;
    connection_count: number;
  }>('/notifications/sse-status');

/**
 * 使用模板发送通知
 * @param data - 模板通知信息
 * @returns 消息响应
 */
export const createNotificationFromTemplate = (data: NotificationFromTemplateCreate) =>
  post<MessageResponse>('/notifications/from-template', data);

// ==================== 通知模板 API ====================

/**
 * 获取通知模板列表
 * @param params - 查询参数
 * @returns 模板列表
 */
export const getNotificationTemplates = (
  params?: PaginationParams & { category?: string; is_active?: boolean }
) => get<NotificationTemplate[]>('/notification-templates', params);

/**
 * 创建通知模板
 * @param data - 模板信息
 * @returns 创建的模板
 */
export const createNotificationTemplate = (data: NotificationTemplateCreate) =>
  post<NotificationTemplate>('/notification-templates', data);

/**
 * 获取通知模板详情
 * @param id - 模板ID
 * @returns 模板信息
 */
export const getNotificationTemplate = (id: number) =>
  get<NotificationTemplate>(`/notification-templates/${id}`);

/**
 * 更新通知模板
 * @param id - 模板ID
 * @param data - 更新数据
 * @returns 更新后的模板
 */
export const updateNotificationTemplate = (id: number, data: NotificationTemplateUpdate) =>
  put<NotificationTemplate>(`/notification-templates/${id}`, data);

/**
 * 删除通知模板
 * @param id - 模板ID
 * @returns 消息响应
 */
export const deleteNotificationTemplate = (id: number) =>
  del<MessageResponse>(`/notification-templates/${id}`);

/**
 * 预览通知模板
 * @param id - 模板ID
 * @param variables - 变量值
 * @returns 预览结果
 */
export const previewNotificationTemplate = (id: number, variables?: Record<string, string>) =>
  post<TemplatePreviewResponse>(`/notification-templates/${id}/preview`, variables || {});

/**
 * 获取模板分类列表
 * @returns 分类列表
 */
export const getTemplateCategories = () =>
  get<TemplateCategoriesResponse>('/notification-templates/categories');

// ==================== OCR API ====================

/**
 * 识别驾驶证
 * @param image - 图片数据（Base64 或 URL）
 * @returns 识别结果
 */
export const recognizeDrivingLicense = (image: string) =>
  post<OCRDrivingLicenseResponse>('/ocr/driving-license', { image });

/**
 * 获取 OCR 服务状态
 * @returns OCR 状态信息
 */
export const getOCRStatus = () =>
  get<OCRStatusResponse>('/ocr/status');

// ==================== 定时通知 API ====================

import type {
  ScheduledNotification,
  ScheduledNotificationCreate,
  ScheduledNotificationUpdate,
  SchedulerStatusResponse,
} from './types';
import { ScheduledNotificationStatus } from './types';

/**
 * 获取定时通知列表
 * @param params - 查询参数
 * @returns 定时通知列表
 */
export const getScheduledNotifications = (
  params?: PaginationParams & { status?: ScheduledNotificationStatus }
) => get<ScheduledNotification[]>('/scheduled-notifications', params);

/**
 * 创建定时通知
 * @param data - 定时通知信息
 * @returns 创建的定时通知
 */
export const createScheduledNotification = (data: ScheduledNotificationCreate) =>
  post<ScheduledNotification>('/scheduled-notifications', data);

/**
 * 获取定时通知详情
 * @param id - 定时通知ID
 * @returns 定时通知信息
 */
export const getScheduledNotification = (id: number) =>
  get<ScheduledNotification>(`/scheduled-notifications/${id}`);

/**
 * 更新定时通知
 * @param id - 定时通知ID
 * @param data - 更新数据
 * @returns 更新后的定时通知
 */
export const updateScheduledNotification = (id: number, data: ScheduledNotificationUpdate) =>
  put<ScheduledNotification>(`/scheduled-notifications/${id}`, data);

/**
 * 删除定时通知
 * @param id - 定时通知ID
 * @returns 消息响应
 */
export const deleteScheduledNotification = (id: number) =>
  del<MessageResponse>(`/scheduled-notifications/${id}`);

/**
 * 取消定时通知
 * @param id - 定时通知ID
 * @returns 取消后的定时通知
 */
export const cancelScheduledNotification = (id: number) =>
  post<ScheduledNotification>(`/scheduled-notifications/${id}/cancel`);

/**
 * 手动执行定时通知
 * @param id - 定时通知ID
 * @returns 消息响应
 */
export const executeScheduledNotification = (id: number) =>
  post<MessageResponse>(`/scheduled-notifications/${id}/execute`);

/**
 * 获取调度器状态
 * @returns 调度器状态
 */
export const getSchedulerStatus = () =>
  get<SchedulerStatusResponse>('/scheduled-notifications/scheduler/status');

/**
 * 手动触发调度器检查
 * @returns 消息响应
 */
export const triggerSchedulerCheck = () =>
  post<MessageResponse>('/scheduled-notifications/scheduler/trigger');

/**
 * 启动调度器
 * @returns 消息响应
 */
export const startScheduler = () =>
  post<MessageResponse>('/scheduled-notifications/scheduler/start');

/**
 * 停止调度器
 * @returns 消息响应
 */
export const stopScheduler = () =>
  post<MessageResponse>('/scheduled-notifications/scheduler/stop');

// ==================== 应用版本（热更新）API ====================

import type {
  AppVersion,
  AppVersionCreate,
  AppVersionUpdate,
  AppVersionCheckRequest,
  AppVersionCheckResponse,
} from './types';

/**
 * 获取应用版本列表
 * @param params - 查询参数
 * @returns 版本列表
 */
export const getAppVersions = (params?: PaginationParams & { platform?: string; is_active?: boolean }) =>
  get<AppVersion[]>('/app-versions', params);

/**
 * 创建应用版本
 * @param data - 版本信息
 * @returns 创建的版本
 */
export const createAppVersion = (data: AppVersionCreate) =>
  post<AppVersion>('/app-versions', data);

/**
 * 获取最新版本
 * @param platform - 平台类型
 * @returns 最新版本
 */
export const getLatestAppVersion = (platform?: string) =>
  get<AppVersion>('/app-versions/latest', { platform });

/**
 * 检查更新
 * @param data - 检查更新请求
 * @returns 检查更新响应
 */
export const checkAppUpdate = (data: AppVersionCheckRequest) =>
  post<AppVersionCheckResponse>('/app-versions/check', data);

/**
 * 获取版本详情
 * @param id - 版本ID
 * @returns 版本信息
 */
export const getAppVersion = (id: number) =>
  get<AppVersion>(`/app-versions/${id}`);

/**
 * 更新版本信息
 * @param id - 版本ID
 * @param data - 更新数据
 * @returns 更新后的版本
 */
export const updateAppVersion = (id: number, data: AppVersionUpdate) =>
  put<AppVersion>(`/app-versions/${id}`, data);

/**
 * 删除版本
 * @param id - 版本ID
 * @returns 消息响应
 */
export const deleteAppVersion = (id: number) =>
  del<MessageResponse>(`/app-versions/${id}`);

// 导出 SSE 服务
export { sseService, SSEConnectionState } from '@/utils/sse';
export type { SSENotification, SSEHeartbeat, SSECallbacks } from '@/utils/sse';

// ==================== 车辆历史 API ====================

import type {
  VehicleHistory,
  VehicleHistoryListResponse,
} from './types';

/**
 * 获取车辆使用历史
 * @param vehicleId - 车辆ID
 * @param params - 分页参数
 * @returns 车辆历史列表响应
 */
export const getVehicleHistory = (
  vehicleId: number,
  params?: PaginationParams
): Promise<VehicleHistoryListResponse> =>
  get<VehicleHistoryListResponse>(`/vehicles/${vehicleId}/history`, params);

// 导出类型
export * from './types';
