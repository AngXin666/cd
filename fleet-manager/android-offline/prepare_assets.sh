#!/bin/bash
# 准备 H5 资源脚本
# 将 UniApp 构建的 H5 资源复制到 Android assets 目录

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
ASSETS_DIR="$SCRIPT_DIR/app/src/main/assets/www"

echo "=== 准备 H5 资源 ==="

# 1. 构建 H5 版本
echo "1. 构建 H5 版本..."
cd "$FRONTEND_DIR"
npm run build:h5

# 2. 清理旧资源
echo "2. 清理旧资源..."
rm -rf "$ASSETS_DIR"
mkdir -p "$ASSETS_DIR"

# 3. 复制 H5 构建产物
echo "3. 复制 H5 资源..."
cp -r "$FRONTEND_DIR/dist/build/h5/"* "$ASSETS_DIR/"

# 4. 修改 API 地址（可选）
# 如果需要修改 API 地址，可以在这里处理
# sed -i '' 's|http://localhost:8000|http://your-server.com|g' "$ASSETS_DIR/assets/"*.js

echo "=== H5 资源准备完成 ==="
echo "资源目录: $ASSETS_DIR"
ls -la "$ASSETS_DIR"
