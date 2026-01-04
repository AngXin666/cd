#!/bin/bash
# 构建 APK 脚本
# 使用 Gradle 构建 Debug 或 Release APK

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BUILD_TYPE="${1:-debug}"

echo "=== 构建 APK ($BUILD_TYPE) ==="

cd "$SCRIPT_DIR"

# 检查 ANDROID_HOME
if [ -z "$ANDROID_HOME" ]; then
    export ANDROID_HOME="$HOME/Library/Android/sdk"
fi

if [ ! -d "$ANDROID_HOME" ]; then
    echo "错误: 找不到 Android SDK"
    echo "请设置 ANDROID_HOME 环境变量"
    exit 1
fi

echo "Android SDK: $ANDROID_HOME"

# 检查 assets 目录
if [ ! -d "app/src/main/assets/www" ] || [ -z "$(ls -A app/src/main/assets/www 2>/dev/null)" ]; then
    echo "警告: assets/www 目录为空，先运行 prepare_assets.sh"
    ./prepare_assets.sh
fi

# 构建 APK
if [ "$BUILD_TYPE" = "release" ]; then
    echo "构建 Release APK..."
    ./gradlew assembleRelease --no-daemon
    APK_PATH="app/build/outputs/apk/release/app-release-unsigned.apk"
else
    echo "构建 Debug APK..."
    ./gradlew assembleDebug --no-daemon
    APK_PATH="app/build/outputs/apk/debug/app-debug.apk"
fi

if [ -f "$APK_PATH" ]; then
    echo ""
    echo "=== 构建成功 ==="
    echo "APK 路径: $SCRIPT_DIR/$APK_PATH"
    echo "文件大小: $(du -h "$APK_PATH" | cut -f1)"
    
    # 复制到项目根目录
    cp "$APK_PATH" "$SCRIPT_DIR/FleetManager-$BUILD_TYPE.apk"
    echo "已复制到: $SCRIPT_DIR/FleetManager-$BUILD_TYPE.apk"
else
    echo "错误: APK 构建失败"
    exit 1
fi
