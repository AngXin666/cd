# 车队管家 Android 离线打包

## 快速打包步骤

### 方式一：使用 Android Studio（推荐）

1. **打开 Android Studio**
   ```bash
   open -a "Android Studio" .
   ```
   或者手动打开 Android Studio，选择 `Open` -> 选择 `fleet-manager/android-offline` 目录

2. **等待 Gradle 同步完成**（首次可能需要几分钟下载依赖）

3. **构建 APK**
   - 菜单: `Build` -> `Build Bundle(s) / APK(s)` -> `Build APK(s)`
   - 或使用快捷键: `Cmd + F9`

4. **获取 APK**
   - 构建完成后点击右下角 `locate` 链接
   - 或在 `app/build/outputs/apk/debug/app-debug.apk`

### 方式二：命令行构建

```bash
# 进入项目目录
cd fleet-manager/android-offline

# 构建 Debug APK
./gradlew assembleDebug

# APK 位置
ls -la app/build/outputs/apk/debug/
```

## 项目结构

```
android-offline/
├── app/
│   ├── src/main/
│   │   ├── assets/www/          # H5 资源（已复制）
│   │   ├── java/.../MainActivity.java
│   │   ├── res/                 # Android 资源
│   │   └── AndroidManifest.xml
│   └── build.gradle
├── build.gradle
├── settings.gradle
└── gradle.properties
```

## 更新 H5 资源

如果前端代码有更新：

```bash
# 1. 重新构建 H5
cd ../frontend
npm run build:h5

# 2. 复制到 assets
rm -rf ../android-offline/app/src/main/assets/www/*
cp -r dist/build/h5/* ../android-offline/app/src/main/assets/www/

# 3. 重新构建 APK
cd ../android-offline
./gradlew assembleDebug
```

## 配置说明

- **包名**: `com.cdgj.fleetmanager`
- **应用名**: 车队管家
- **最低 SDK**: 21 (Android 5.0)
- **目标 SDK**: 34 (Android 14)

## 注意事项

1. H5 资源已经打包在 APK 内，无需网络即可加载界面
2. API 请求仍需要网络连接到后端服务器
3. 如需修改后端地址，编辑 `MainActivity.java` 中的 `API_BASE_URL`
