# Android APK 构建部署指南

## 📋 项目概述

本项目是基于 Taro + React + TypeScript 开发的车队管理应用，使用 Capacitor 将 H5 应用打包为 Android APK。

**后端服务**：Supabase (云端服务，无需本地部署)
**应用名称**：车队管家
**包名**：com.miaoda.fleet

---

## ✅ 已完成配置

### 1. Capacitor 集成
- ✅ 已安装 `@capacitor/core`、`@capacitor/cli`、`@capacitor/android`
- ✅ 已创建 `capacitor.config.ts` 配置文件
- ✅ 已添加 Android 平台支持

### 2. 生产环境配置
- ✅ `.env.production` 已配置 Supabase 连接信息
  - API URL: `https://wxvrwkpkioalqdsfswwu.supabase.co`
  - Anon Key: 已配置（公开密钥）
  - Bucket: `app-7cdqf07mbu9t_vehicles`

### 3. Android 网络权限配置
已在 `android/app/src/main/AndroidManifest.xml` 配置：
- ✅ INTERNET 权限
- ✅ ACCESS_NETWORK_STATE 权限
- ✅ ACCESS_WIFI_STATE 权限
- ✅ CAMERA 权限（用于拍照功能）
- ✅ 文件读写权限
- ✅ 网络安全配置（允许 HTTPS 访问 Supabase）

### 4. npm 构建脚本
已添加以下命令：
```bash
npm run build:h5:prod        # 构建生产环境 H5
npm run build:android:debug  # 构建 Debug APK
npm run build:android        # 构建 Release APK（需签名）
```

---

## 🛠️ 环境要求

### macOS 必需环境

#### 1. Java Development Kit (JDK)
**推荐版本**: JDK 17 (LTS)

**安装方式 A - 使用 Homebrew (推荐)**:
```bash
# 安装 Homebrew (如未安装)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 安装 JDK 17
brew install openjdk@17

# 配置环境变量 (添加到 ~/.bash_profile 或 ~/.zshrc)
echo 'export JAVA_HOME=$(/usr/libexec/java_home -v 17)' >> ~/.zshrc
echo 'export PATH="$JAVA_HOME/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# 验证安装
java -version
```

**安装方式 B - 下载官方安装包**:
1. 访问 https://adoptium.net/
2. 下载 macOS x64/arm64 JDK 17
3. 安装后配置环境变量（同上）

#### 2. Android SDK (可选，推荐)
如需自定义构建或调试，建议安装 Android Studio：
- 下载地址: https://developer.android.com/studio
- 安装后启动 Android Studio
- 打开 `Tools → SDK Manager` 安装以下组件：
  - Android SDK Platform 33
  - Android SDK Build-Tools 33.0.0+
  - Android SDK Command-line Tools

配置环境变量（添加到 ~/.zshrc）：
```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin
```

---

## 🚀 构建步骤

### 方法一：使用 npm 脚本（推荐）

#### 构建 Debug APK
```bash
# 在项目根目录执行
npm run build:android:debug
```

生成的 APK 路径：
```
android/app/build/outputs/apk/debug/app-debug.apk
```

#### 构建 Release APK
```bash
# 需要配置签名后执行
npm run build:android
```

### 方法二：手动构建

```bash
# 1. 构建生产环境 H5
NODE_ENV=production npm run build:h5

# 2. 同步到 Android 项目
npx cap sync android

# 3. 进入 Android 目录构建
cd android

# 构建 Debug 版本
./gradlew assembleDebug

# 构建 Release 版本（需配置签名）
./gradlew assembleRelease
```

---

## 📱 APK 类型说明

### Debug APK
- **特点**: 未签名/使用 debug 签名，体积较大
- **用途**: 内部测试、开发调试
- **安装**: 可直接安装到设备，但无法上架应用商店
- **路径**: `android/app/build/outputs/apk/debug/app-debug.apk`

### Release APK
- **特点**: 需要正式签名，代码混淆，体积优化
- **用途**: 生产发布、应用商店上架
- **路径**: `android/app/build/outputs/apk/release/app-release.apk`
- **注意**: 首次构建需配置签名（见下方）

---

## 🔐 配置 Release 签名（可选）

### 1. 生成签名密钥
```bash
# 进入 android/app 目录
cd android/app

# 生成 keystore
keytool -genkey -v -keystore miaoda-fleet.keystore -alias miaoda-fleet -keyalg RSA -keysize 2048 -validity 10000

# 输入密码及信息（请妥善保存密码）
```

### 2. 配置 Gradle
创建 `android/key.properties`:
```properties
storePassword=你的密钥库密码
keyPassword=你的密钥密码
keyAlias=miaoda-fleet
storeFile=app/miaoda-fleet.keystore
```

### 3. 修改 `android/app/build.gradle`
在 `android { ... }` 块中添加：
```gradle
android {
    ...
    
    signingConfigs {
        release {
            def keystorePropertiesFile = rootProject.file("key.properties")
            def keystoreProperties = new Properties()
            if (keystorePropertiesFile.exists()) {
                keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
                keyAlias keystoreProperties['keyAlias']
                keyPassword keystoreProperties['keyPassword']
                storeFile file(keystoreProperties['storeFile'])
                storePassword keystoreProperties['storePassword']
            }
        }
    }

    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

---

## 📦 APK 安装与分发

### 安装到设备

#### 方式一：ADB 安装（推荐）
```bash
# 连接设备后
adb install android/app/build/outputs/apk/debug/app-debug.apk

# 或 Release 版本
adb install android/app/build/outputs/apk/release/app-release.apk
```

#### 方式二：直接传输
1. 将 APK 文件传输到 Android 设备
2. 在设备上启用"允许安装未知来源应用"
3. 点击 APK 文件安装

### 分发方式
- **内部测试**: 直接分享 Debug APK 文件
- **外部测试**: 使用蒲公英、Fir.im 等内测分发平台
- **正式发布**: 上架 Google Play、华为应用市场等

---

## 🌐 网络连接说明

### Supabase 后端连接
应用已配置连接到以下 Supabase 实例：
- **URL**: https://wxvrwkpkioalqdsfswwu.supabase.co
- **区域**: 云端托管
- **网络要求**: 
  - ✅ 设备需要互联网连接
  - ✅ 支持 WiFi 和移动数据
  - ✅ 已配置 HTTPS 安全连接
  - ❌ 无需 VPN 或代理

### 网络权限
APK 已声明以下权限：
- `INTERNET`: 访问互联网
- `ACCESS_NETWORK_STATE`: 检测网络状态
- `ACCESS_WIFI_STATE`: 检测 WiFi 连接
- `CAMERA`: 拍照功能
- `READ/WRITE_EXTERNAL_STORAGE`: 文件访问

---

## 🐛 常见问题

### Q1: 构建失败 "Unable to locate a Java Runtime"
**解决方案**: 安装 JDK 17 并配置环境变量（见上方"环境要求"）

### Q2: Gradle 下载依赖速度慢
**解决方案**: 配置国内镜像
编辑 `android/build.gradle`:
```gradle
allprojects {
    repositories {
        maven { url 'https://maven.aliyun.com/repository/google' }
        maven { url 'https://maven.aliyun.com/repository/public' }
        google()
        mavenCentral()
    }
}
```

### Q3: 安装 APK 提示"应用未安装"
**可能原因**:
- 设备未启用"未知来源安装"
- 签名冲突（已安装同包名应用）
- APK 损坏

**解决方案**:
```bash
# 卸载旧版本
adb uninstall com.miaoda.fleet

# 重新安装
adb install app-debug.apk
```

### Q4: 应用运行时无法连接 Supabase
**检查步骤**:
1. 确认设备网络连接正常
2. 检查 `.env.production` 配置是否正确
3. 重新构建 APK: `npm run build:android:debug`
4. 查看 Logcat 日志: `adb logcat | grep -i supabase`

### Q5: 相机功能无法使用
**解决方案**: 
- Android 6.0+ 需要在应用中申请运行时权限
- 检查设备设置中是否授予了相机权限

---

## 📊 构建优化建议

### 减小 APK 体积
1. 启用代码混淆（Release 构建已启用）
2. 移除未使用的资源
3. 使用 APK Analyzer 分析：
   ```bash
   # Android Studio → Build → Analyze APK
   ```

### 提升启动速度
1. 使用 SplashScreen API
2. 延迟加载非关键模块
3. 优化首屏渲染

---

## 📞 技术支持

如遇到构建问题，请检查：
1. ✅ Java 版本是否为 JDK 17
2. ✅ 环境变量配置是否正确
3. ✅ 网络连接是否正常（Gradle 下载依赖）
4. ✅ Android SDK 版本是否匹配

---

## 🔄 更新流程

当应用代码更新后：
```bash
# 1. 拉取最新代码
git pull

# 2. 安装依赖（如有新增）
npm install

# 3. 重新构建
npm run build:android:debug

# 4. 安装到设备
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

---

## ✨ 项目文件说明

```
/Users/angxin/Downloads/app-7cdqf07mbu9t/
├── capacitor.config.ts          # Capacitor 配置
├── .env.production              # 生产环境变量
├── android/                     # Android 原生项目
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── AndroidManifest.xml  # 权限配置
│   │   │   └── res/xml/
│   │   │       └── network_security_config.xml  # 网络安全配置
│   │   └── build.gradle         # 应用级构建配置
│   └── gradlew                  # Gradle 构建脚本
├── dist/                        # H5 构建输出（Capacitor webDir）
└── package.json                 # npm 脚本配置
```

---

**最后更新**: 2025-12-08
**Taro 版本**: 4.1.5
**Capacitor 版本**: Latest
**目标 Android 版本**: API 33 (Android 13)
