import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.miaoda.fleet.v2',
  appName: '妙达车队',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    // 允许混合内容，提高兼容性
    allowNavigation: ['*'],
    // 清除缓存策略
    cleartext: true
  },
  plugins: {
    // 启动屏配置
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#1976d2",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      androidSpinnerStyle: "large",
      iosSpinnerStyle: "small",
      spinnerColor: "#999999",
      splashFullScreen: true,
      splashImmersive: true
    },
    // 推送通知配置
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    },
    // 状态栏配置 - 关键：让状态栏不覆盖内容
    StatusBar: {
      style: "DARK",
      backgroundColor: "#1E3A8A",
      overlaysWebView: false
    },
    // 键盘配置
    Keyboard: {
      resize: "body",
      style: "DARK",
      resizeOnFullScreen: true
    },
    // 网络配置
    Network: {
      // 启用网络状态监听
    },
    // 设备信息
    Device: {
      // 启用设备信息获取
    },
    // 相机配置（用于车辆照片上传）
    Camera: {
      permissions: ["camera", "photos"]
    },
    // 地理位置配置（用于打卡定位）
    Geolocation: {
      permissions: ["location"]
    },
    // 文件系统配置
    Filesystem: {
      // 启用文件系统访问
    },
    // 应用配置
    App: {
      // 启用应用状态监听
    }
  },
  // 安卓特定配置
  android: {
    // 允许HTTP请求（开发环境）
    allowMixedContent: true,
    // 网络安全配置
    useCleartextTraffic: true,
    // 备份配置
    allowBackup: true,
    // 启用左滑返回手势
    backButtonBehavior: 'close'
  }
};

export default config;
