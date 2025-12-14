/**
 * 类型定义统一导出
 * 提供项目中所有自定义类型的中心化导出
 */

// 导出 API 相关类型
export type {
  ApiError,
  ApiRequestConfig,
  ApiResponse,
  PaginationParams,
  PaginationResponse,
  QueryBuilder
} from './api'
// 导出 Capacitor 插件类型
export type {
  AppendFileOptions,
  AppInfo,
  AppLaunchUrl,
  // 应用
  AppPlugin,
  AppRestoredResult,
  AppState,
  AppStateChange,
  AppUrlOpen,
  BatteryInfo,
  CameraOptions,
  // 相机
  CameraPlugin,
  Coordinates,
  CopyOptions,
  DeleteFileOptions,
  DeliveredNotifications,
  DeviceId,
  DeviceInfo,
  // 设备
  DevicePlugin,
  FileInfo,
  // 文件系统
  FilesystemPlugin,
  GalleryOptions,
  GalleryPhotos,
  // 地理位置
  GeolocationPlugin,
  GetUriOptions,
  GetUriResult,
  KeyboardInfo,
  // 键盘
  KeyboardPlugin,
  KeyboardResizeOptions,
  KeyboardStyleOptions,
  LanguageCode,
  MkdirOptions,
  // 网络
  NetworkPlugin,
  NetworkStatus,
  NotificationChannel,
  NotificationChannelList,
  PermissionStatus,
  Photo,
  // 通用
  PluginListenerHandle,
  Position,
  PositionOptions,
  PushNotification,
  PushNotificationActionPerformed,
  // 推送通知
  PushNotificationsPlugin,
  ReaddirOptions,
  ReaddirResult,
  ReadFileOptions,
  ReadFileResult,
  RegistrationData,
  RegistrationError,
  RemoveDeliveredNotificationsOptions,
  RenameOptions,
  RmdirOptions,
  StatOptions,
  StatResult,
  StatusBarBackgroundColorOptions,
  StatusBarInfo,
  // 状态栏
  StatusBarPlugin,
  StatusBarStyleOptions,
  WriteFileOptions,
  WriteFileResult
} from './capacitor'
// 导出通用工具类型
export type {
  AsyncResult,
  DataCallback,
  DeepReadonly,
  ErrorCallback,
  Omit,
  Optional,
  PaginatedData,
  Pick,
  Readonly,
  Required,
  StorageGetOptions,
  StorageSetOptions,
  StorageValue,
  VoidCallback
} from './utils'
