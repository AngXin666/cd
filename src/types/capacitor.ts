/**
 * Capacitor 插件类型定义
 * 为 Capacitor 原生插件提供类型安全
 */

import type {PermissionState} from '@capacitor/core'

/**
 * 相机插件类型
 */
export interface CameraPlugin {
  getPhoto: (options: CameraOptions) => Promise<Photo>
  pickImages: (options: GalleryOptions) => Promise<GalleryPhotos>
  checkPermissions: () => Promise<PermissionStatus>
  requestPermissions: () => Promise<PermissionStatus>
}

/**
 * 相机选项
 */
export interface CameraOptions {
  quality?: number
  allowEditing?: boolean
  resultType: 'uri' | 'base64' | 'dataUrl'
  source?: 'camera' | 'photos'
  width?: number
  height?: number
  preserveAspectRatio?: boolean
  correctOrientation?: boolean
}

/**
 * 照片信息
 */
export interface Photo {
  webPath?: string
  path?: string
  format: string
  exif?: Record<string, unknown>
  saved?: boolean
}

/**
 * 图库选项
 */
export interface GalleryOptions {
  quality?: number
  limit?: number
}

/**
 * 图库照片集合
 */
export interface GalleryPhotos {
  photos: Photo[]
}

/**
 * 地理位置插件类型
 */
export interface GeolocationPlugin {
  getCurrentPosition: (options?: PositionOptions) => Promise<Position>
  watchPosition: (
    options: PositionOptions,
    callback: (position: Position | null, error?: Error) => void
  ) => Promise<string>
  clearWatch: (options: {id: string}) => Promise<void>
  checkPermissions: () => Promise<PermissionStatus>
  requestPermissions: () => Promise<PermissionStatus>
}

/**
 * 位置信息
 */
export interface Position {
  coords: Coordinates
  timestamp: number
}

/**
 * 坐标信息
 */
export interface Coordinates {
  latitude: number
  longitude: number
  accuracy: number
  altitude: number | null
  altitudeAccuracy: number | null
  heading: number | null
  speed: number | null
}

/**
 * 位置选项
 */
export interface PositionOptions {
  enableHighAccuracy?: boolean
  timeout?: number
  maximumAge?: number
}

/**
 * 网络插件类型
 */
export interface NetworkPlugin {
  getStatus: () => Promise<NetworkStatus>
  addListener: (
    eventName: 'networkStatusChange',
    callback: (status: NetworkStatus) => void
  ) => Promise<PluginListenerHandle>
}

/**
 * 网络状态
 */
export interface NetworkStatus {
  connected: boolean
  connectionType: 'wifi' | 'cellular' | 'none' | 'unknown'
}

/**
 * 设备插件类型
 */
export interface DevicePlugin {
  getId: () => Promise<DeviceId>
  getInfo: () => Promise<DeviceInfo>
  getBatteryInfo: () => Promise<BatteryInfo>
  getLanguageCode: () => Promise<LanguageCode>
}

/**
 * 设备 ID
 */
export interface DeviceId {
  identifier: string
}

/**
 * 设备信息
 */
export interface DeviceInfo {
  model: string
  platform: 'ios' | 'android' | 'web'
  operatingSystem: string
  osVersion: string
  manufacturer: string
  isVirtual: boolean
  webViewVersion?: string
}

/**
 * 电池信息
 */
export interface BatteryInfo {
  batteryLevel: number
  isCharging: boolean
}

/**
 * 语言代码
 */
export interface LanguageCode {
  value: string
}

/**
 * 状态栏插件类型
 */
export interface StatusBarPlugin {
  setStyle: (options: StatusBarStyleOptions) => Promise<void>
  setBackgroundColor: (options: StatusBarBackgroundColorOptions) => Promise<void>
  show: () => Promise<void>
  hide: () => Promise<void>
  getInfo: () => Promise<StatusBarInfo>
}

/**
 * 状态栏样式选项
 */
export interface StatusBarStyleOptions {
  style: 'DARK' | 'LIGHT' | 'DEFAULT'
}

/**
 * 状态栏背景色选项
 */
export interface StatusBarBackgroundColorOptions {
  color: string
}

/**
 * 状态栏信息
 */
export interface StatusBarInfo {
  visible: boolean
  style: 'DARK' | 'LIGHT' | 'DEFAULT'
  color?: string
  overlays?: boolean
}

/**
 * 键盘插件类型
 */
export interface KeyboardPlugin {
  show: () => Promise<void>
  hide: () => Promise<void>
  setAccessoryBarVisible: (options: {isVisible: boolean}) => Promise<void>
  setScroll: (options: {isDisabled: boolean}) => Promise<void>
  setStyle: (options: KeyboardStyleOptions) => Promise<void>
  setResizeMode: (options: KeyboardResizeOptions) => Promise<void>
  addListener: (
    eventName: 'keyboardWillShow' | 'keyboardDidShow' | 'keyboardWillHide' | 'keyboardDidHide',
    callback: (info: KeyboardInfo) => void
  ) => Promise<PluginListenerHandle>
}

/**
 * 键盘样式选项
 */
export interface KeyboardStyleOptions {
  style: 'DARK' | 'LIGHT'
}

/**
 * 键盘调整大小选项
 */
export interface KeyboardResizeOptions {
  mode: 'body' | 'ionic' | 'native' | 'none'
}

/**
 * 键盘信息
 */
export interface KeyboardInfo {
  keyboardHeight: number
}

/**
 * 应用插件类型
 */
export interface AppPlugin {
  exitApp: () => Promise<void>
  getInfo: () => Promise<AppInfo>
  getState: () => Promise<AppState>
  getLaunchUrl: () => Promise<AppLaunchUrl>
  addListener: (
    eventName: 'appStateChange' | 'appUrlOpen' | 'appRestoredResult',
    callback: (data: AppStateChange | AppUrlOpen | AppRestoredResult) => void
  ) => Promise<PluginListenerHandle>
}

/**
 * 应用信息
 */
export interface AppInfo {
  name: string
  id: string
  build: string
  version: string
}

/**
 * 应用状态
 */
export interface AppState {
  isActive: boolean
}

/**
 * 应用启动 URL
 */
export interface AppLaunchUrl {
  url: string
}

/**
 * 应用状态变化
 */
export interface AppStateChange {
  isActive: boolean
}

/**
 * 应用 URL 打开
 */
export interface AppUrlOpen {
  url: string
}

/**
 * 应用恢复结果
 */
export interface AppRestoredResult {
  pluginId: string
  methodName: string
  data?: unknown
  success: boolean
  error?: string
}

/**
 * 文件系统插件类型
 */
export interface FilesystemPlugin {
  readFile: (options: ReadFileOptions) => Promise<ReadFileResult>
  writeFile: (options: WriteFileOptions) => Promise<WriteFileResult>
  appendFile: (options: AppendFileOptions) => Promise<void>
  deleteFile: (options: DeleteFileOptions) => Promise<void>
  mkdir: (options: MkdirOptions) => Promise<void>
  rmdir: (options: RmdirOptions) => Promise<void>
  readdir: (options: ReaddirOptions) => Promise<ReaddirResult>
  getUri: (options: GetUriOptions) => Promise<GetUriResult>
  stat: (options: StatOptions) => Promise<StatResult>
  rename: (options: RenameOptions) => Promise<void>
  copy: (options: CopyOptions) => Promise<void>
  checkPermissions: () => Promise<PermissionStatus>
  requestPermissions: () => Promise<PermissionStatus>
}

/**
 * 读取文件选项
 */
export interface ReadFileOptions {
  path: string
  directory?: string
  encoding?: 'utf8' | 'ascii' | 'utf16'
}

/**
 * 读取文件结果
 */
export interface ReadFileResult {
  data: string
}

/**
 * 写入文件选项
 */
export interface WriteFileOptions {
  path: string
  data: string
  directory?: string
  encoding?: 'utf8' | 'ascii' | 'utf16'
  recursive?: boolean
}

/**
 * 写入文件结果
 */
export interface WriteFileResult {
  uri: string
}

/**
 * 追加文件选项
 */
export interface AppendFileOptions {
  path: string
  data: string
  directory?: string
  encoding?: 'utf8' | 'ascii' | 'utf16'
}

/**
 * 删除文件选项
 */
export interface DeleteFileOptions {
  path: string
  directory?: string
}

/**
 * 创建目录选项
 */
export interface MkdirOptions {
  path: string
  directory?: string
  recursive?: boolean
}

/**
 * 删除目录选项
 */
export interface RmdirOptions {
  path: string
  directory?: string
  recursive?: boolean
}

/**
 * 读取目录选项
 */
export interface ReaddirOptions {
  path: string
  directory?: string
}

/**
 * 读取目录结果
 */
export interface ReaddirResult {
  files: FileInfo[]
}

/**
 * 文件信息
 */
export interface FileInfo {
  name: string
  type: 'file' | 'directory'
  size: number
  ctime: number
  mtime: number
  uri: string
}

/**
 * 获取 URI 选项
 */
export interface GetUriOptions {
  path: string
  directory?: string
}

/**
 * 获取 URI 结果
 */
export interface GetUriResult {
  uri: string
}

/**
 * 文件状态选项
 */
export interface StatOptions {
  path: string
  directory?: string
}

/**
 * 文件状态结果
 */
export interface StatResult {
  type: 'file' | 'directory'
  size: number
  ctime: number
  mtime: number
  uri: string
}

/**
 * 重命名选项
 */
export interface RenameOptions {
  from: string
  to: string
  directory?: string
  toDirectory?: string
}

/**
 * 复制选项
 */
export interface CopyOptions {
  from: string
  to: string
  directory?: string
  toDirectory?: string
}

/**
 * 推送通知插件类型
 */
export interface PushNotificationsPlugin {
  register: () => Promise<void>
  getDeliveredNotifications: () => Promise<DeliveredNotifications>
  removeDeliveredNotifications: (options: RemoveDeliveredNotificationsOptions) => Promise<void>
  removeAllDeliveredNotifications: () => Promise<void>
  createChannel: (channel: NotificationChannel) => Promise<void>
  deleteChannel: (options: {id: string}) => Promise<void>
  listChannels: () => Promise<NotificationChannelList>
  checkPermissions: () => Promise<PermissionStatus>
  requestPermissions: () => Promise<PermissionStatus>
  addListener: (
    eventName: 'registration' | 'registrationError' | 'pushNotificationReceived' | 'pushNotificationActionPerformed',
    callback: (data: RegistrationData | RegistrationError | PushNotification | PushNotificationActionPerformed) => void
  ) => Promise<PluginListenerHandle>
}

/**
 * 已送达通知
 */
export interface DeliveredNotifications {
  notifications: PushNotification[]
}

/**
 * 移除已送达通知选项
 */
export interface RemoveDeliveredNotificationsOptions {
  notifications: PushNotification[]
}

/**
 * 通知渠道
 */
export interface NotificationChannel {
  id: string
  name: string
  description?: string
  sound?: string
  importance?: 1 | 2 | 3 | 4 | 5
  visibility?: -1 | 0 | 1
  lights?: boolean
  lightColor?: string
  vibration?: boolean
}

/**
 * 通知渠道列表
 */
export interface NotificationChannelList {
  channels: NotificationChannel[]
}

/**
 * 注册数据
 */
export interface RegistrationData {
  value: string
}

/**
 * 注册错误
 */
export interface RegistrationError {
  error: string
}

/**
 * 推送通知
 */
export interface PushNotification {
  id: string
  title?: string
  subtitle?: string
  body?: string
  badge?: number
  data?: Record<string, unknown>
}

/**
 * 推送通知操作执行
 */
export interface PushNotificationActionPerformed {
  actionId: string
  notification: PushNotification
}

/**
 * 插件监听器句柄
 */
export interface PluginListenerHandle {
  remove: () => Promise<void>
}

/**
 * 权限状态
 */
export interface PermissionStatus {
  camera?: PermissionState
  photos?: PermissionState
  location?: PermissionState
  coarseLocation?: PermissionState
  publicStorage?: PermissionState
  display_notifications?: PermissionState
}
