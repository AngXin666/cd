#!/bin/bash
# 准备 H5 资源脚本
# 将 UniApp 构建的 H5 资源复制到 Android assets 目录

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
ASSETS_DIR="$SCRIPT_DIR/app/src/main/assets/www"

echo "=== 准备 H5 资源 ==="

# 1. 构建 H5 版本（使用生产环境配置）
echo "1. 构建 H5 版本（生产环境）..."
cd "$FRONTEND_DIR"
NODE_ENV=production npm run build:h5

# 2. 清理旧资源
echo "2. 清理旧资源..."
rm -rf "$ASSETS_DIR"
mkdir -p "$ASSETS_DIR"

# 3. 复制 H5 构建产物
echo "3. 复制 H5 资源..."
cp -r "$FRONTEND_DIR/dist/build/h5/"* "$ASSETS_DIR/"

# 4. 修复资源路径（将绝对路径改为相对路径）
echo "4. 修复资源路径..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    # 修复 index.html 中的路径
    sed -i '' 's|href="/assets/|href="./assets/|g' "$ASSETS_DIR/index.html"
    sed -i '' 's|src="/assets/|src="./assets/|g' "$ASSETS_DIR/index.html"
    sed -i '' 's|href="/static/|href="./static/|g' "$ASSETS_DIR/index.html"
    sed -i '' 's|src="/static/|src="./static/|g' "$ASSETS_DIR/index.html"
    
    # 修复 JS 文件中的静态资源路径（tabBar 图标等）
    echo "4.1 修复 JS 文件中的静态资源路径..."
    for jsfile in "$ASSETS_DIR/assets/"*.js; do
        if [ -f "$jsfile" ]; then
            # 将 "/static/" 替换为 "./static/"
            sed -i '' 's|"/static/|"./static/|g' "$jsfile"
            # 将 '/static/' 替换为 './static/'
            sed -i '' "s|'/static/|'./static/|g" "$jsfile"
        fi
    done
else
    # Linux
    sed -i 's|href="/assets/|href="./assets/|g' "$ASSETS_DIR/index.html"
    sed -i 's|src="/assets/|src="./assets/|g' "$ASSETS_DIR/index.html"
    sed -i 's|href="/static/|href="./static/|g' "$ASSETS_DIR/index.html"
    sed -i 's|src="/static/|src="./static/|g' "$ASSETS_DIR/index.html"
    
    # 修复 JS 文件中的静态资源路径
    echo "4.1 修复 JS 文件中的静态资源路径..."
    for jsfile in "$ASSETS_DIR/assets/"*.js; do
        if [ -f "$jsfile" ]; then
            sed -i 's|"/static/|"./static/|g' "$jsfile"
            sed -i "s|'/static/|'./static/|g" "$jsfile"
        fi
    done
fi

# 5. 修改 API 地址（可选）
# 如果需要修改 API 地址，可以在这里处理
# sed -i '' 's|http://localhost:8000|http://your-server.com|g' "$ASSETS_DIR/assets/"*.js

echo "=== H5 资源准备完成 ==="
echo "资源目录: $ASSETS_DIR"
ls -la "$ASSETS_DIR"
