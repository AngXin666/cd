/**
 * 版本信息接口
 */
export interface VersionInfo {
  version: string;           // 版本号，如 "1.0.1"
  apkUrl: string;           // APK下载URL
  releaseNotes?: string;    // 更新说明
  isForceUpdate: boolean;   // 是否强制更新
}

/**
 * 版本检查结果
 */
export interface UpdateCheckResult {
  needsUpdate: boolean;     // 是否需要更新
  versionInfo?: VersionInfo; // 版本信息（如果需要更新）
}

/**
 * 数据库中的版本记录
 */
export interface AppVersionRecord {
  id: string;
  version: string;
  apk_url: string;
  release_notes?: string;
  is_force_update: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
