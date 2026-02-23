#!/bin/bash
# 构建 APK 脚本

set -e

echo "=========================================="
echo "  构建 APK"
echo "=========================================="
echo ""

read -p "请输入后端 URL (例如: https://xxx.vercel.app): " BACKEND_URL

# 更新前端 API 地址
echo "更新前端 API 地址..."
cat > frontend/.env << EOF
VITE_API_BASE_URL=${BACKEND_URL}/api
EOF

# 构建前端
echo "构建前端 H5..."
cd frontend
npm run build:h5
cd ..

# 准备 Android 资源
echo "准备 Android 资源..."
cd android-offline
./prepare_assets.sh

# 构建 APK
echo "构建 Release APK..."
./build_apk.sh release

echo ""
echo "✓ APK 构建完成"
echo "APK 位置: android-offline/FleetManager-release.apk"
echo ""
