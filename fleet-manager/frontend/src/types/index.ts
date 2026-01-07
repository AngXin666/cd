/**
 * 类型定义模块
 * 定义前端使用的基础 TypeScript 类型
 * 
 * 注意：大部分类型已迁移到 @/api/types.ts
 * 此文件保留一些独特的类型定义，避免循环依赖
 * 
 * @module types/index
 */

// ==================== 重新导出 API 类型 ====================
// 为了向后兼容，从 api/types.ts 重新导出常用类型

export type {
  // 用户相关
  User,
  UserCreate,
  UserUpdate,
  UserRole,

  // 仓库相关
  Warehouse,
  WarehouseCreate,
  WarehouseUpdate,

  // 考勤相关
  Attendance,
  TodayAttendance,
  AttendanceRule,
  LeaveCheckResult,

  // 计件相关
  PieceWorkCategory,
  PieceWorkCategoryCreate,
  PieceWorkCategoryUpdate,
  PieceWorkRecord,
  PieceWorkRecordCreate,
  PieceWorkRecordUpdate,
  PieceWorkStats,

  // 请假相关
  LeaveApplication,
  LeaveApplicationCreate,
  LeaveApproveRequest,
  LeaveType,
  LeaveStatus,

  // 车辆相关
  Vehicle,
  VehicleCreate,
  VehicleUpdate,
  VehicleDocument,
  VehicleLease,
  VehicleLeaseUpdate,
  VehicleLeaseReminder,
  VehicleStatus,
  DocumentType,

  // 补录照片相关
  SupplementedPhotoMeta,
  SupplementedPhotos,
  SupplementPhotoRequest,
  SupplementedPhotosResponse,

  // 通知相关
  Notification,
  NotificationCreate,
  UnreadCountResponse,

  // 热更新相关
  UpdateType,
  AppPlatform,
  UpdateCheckRequest,
  UpdateCheckResult,
  DownloadProgress,
  VersionInfo,
  InstallResult,
  VersionCreate,

  // 车辆历史相关
  VehicleHistory,
  VehicleHistoryListResponse,
  VehicleHistoryActionType,
  VehicleHistoryPhotos,

  // 权限相关
  PermissionItem,
  PermissionGroup,
  RolePermission,
  RolePermissionUpdate,
  AllPermissionsResponse,

  // 通用类型
  MessageResponse,
  PaginationParams,

  // 认证相关
  LoginRequest,
  TokenResponse,
  PasswordChangeRequest,

  // OCR 相关
  OCRDrivingLicenseRequest,
  OCRDrivingLicenseResponse,
  OCRStatusResponse,
  OCRDrivingLicenseData,

  // 驾驶员证件相关
  DriverLicense,
  DriverLicenseInput,
  DriverLicenseResponse,
  DriverLicenseCreate,
  DriverLicenseUpdate,
} from '@/api/types';

// 重新导出工具函数
export {
  ROLE_DISPLAY_NAMES,
  getRoleDisplayName,
  isAdminRole,
  hasManagementPermission,
} from '@/api/types';

// ==================== 独特类型定义 ====================
// 以下类型是此文件独有的，不在 api/types.ts 中

/**
 * 登录响应（包含用户信息）
 * 与 api/types.ts 中的 TokenResponse 不同，此类型包含完整用户信息
 */
export interface LoginResponse {
  /** 访问令牌 */
  access_token: string;
  /** 令牌类型 */
  token_type: string;
  /** 用户信息 */
  user: import('@/api/types').User;
}

/**
 * 分页响应泛型
 * 用于包装分页数据的通用类型
 */
export interface PaginatedResponse<T> {
  /** 总记录数 */
  total: number;
  /** 当前页码 */
  page: number;
  /** 每页大小 */
  page_size: number;
  /** 数据列表 */
  items: T[];
}

/**
 * 日期范围参数
 * 用于查询接口的日期范围筛选
 */
export interface DateRangeParams {
  /** 开始日期 (YYYY-MM-DD) */
  start_date?: string;
  /** 结束日期 (YYYY-MM-DD) */
  end_date?: string;
}
