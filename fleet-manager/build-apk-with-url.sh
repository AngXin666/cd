#!/bin/bash
# 使用指定的后端 URL 构建 APK

set -e

echo "=========================================="
echo "  构建 APK"
echo "=========================================="
echo ""

read -p "请输入后端 URL (例如: https://fleet-manager-backend.onrender.com): " BACKEND_URL

if [ -z "$BACKEND_URL" ]; then
    echo "错误：后端 URL 不能为空"
    exit 1
fi

# 更新前端 API 地址
echo "更新前端 API 地址为: ${BACKEND_URL}/api"
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
echo "后端 API: ${BACKEND_URL}"
echo "API 文档: ${BACKEND_URL}/docs"
echo ""
