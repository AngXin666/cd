/**
 * 类型定义统一导出
 * 提供项目中所有自定义类型的中心化导出
 */

// 导出通用工具类型
export type {
  StorageValue,
  StorageGetOptions,
  StorageSetOptions,
  VoidCallback,
  ErrorCallback,
  DataCallback,
  AsyncResult,
  PaginatedData,
  Optional,
  Required,
  Readonly,
  DeepReadonly,
  Pick,
  Omit
} from './utils'

// 导出 API 相关类型
export type {
  ApiResponse,
  ApiError,
  QueryBuilder,
  ApiRequestConfig,
  PaginationParams,
  PaginationResponse
} from './api'

// 导出 Capacitor 插件类型
export type {
  // 相机
  CameraPlugin,
  CameraOptions,
  Photo,
  GalleryOptions,
  GalleryPhotos,
  // 地理位置
  GeolocationPlugin,
  Position,
  Coordinates,
  PositionOptions,
  // 网络
  NetworkPlugin,
  NetworkStatus,
  // 设备
  DevicePlugin,
  DeviceId,
  DeviceInfo,
  BatteryInfo,
  LanguageCode,
  // 状态栏
  StatusBarPlugin,
  StatusBarStyleOptions,
  StatusBarBackgroundColorOptions,
  StatusBarInfo,
  // 键盘
  KeyboardPlugin,
  KeyboardStyleOptions,
  KeyboardResizeOptions,
  KeyboardInfo,
  // 应用
  AppPlugin,
  AppInfo,
  AppState,
  AppLaunchUrl,
  AppStateChange,
  AppUrlOpen,
  AppRestoredResult,
  // 文件系统
  FilesystemPlugin,
  ReadFileOptions,
  ReadFileResult,
  WriteFileOptions,
  WriteFileResult,
  AppendFileOptions,
  DeleteFileOptions,
  MkdirOptions,
  RmdirOptions,
  ReaddirOptions,
  ReaddirResult,
  FileInfo,
  GetUriOptions,
  GetUriResult,
  StatOptions,
  StatResult,
  RenameOptions,
  CopyOptions,
  // 推送通知
  PushNotificationsPlugin,
  DeliveredNotifications,
  RemoveDeliveredNotificationsOptions,
  NotificationChannel,
  NotificationChannelList,
  RegistrationData,
  RegistrationError,
  PushNotification,
  PushNotificationActionPerformed,
  // 通用
  PluginListenerHandle,
  PermissionStatus
} from './capacitor'
