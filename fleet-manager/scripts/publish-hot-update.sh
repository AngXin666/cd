#!/bin/bash

###############################################################################
# 热更新发布脚本
# 用于快速发布 wgt 热更新包
#
# 使用方法:
#   ./scripts/publish-hot-update.sh
#
# 前提条件:
#   1. 已更新 manifest.json 和 update.ts 中的版本号
#   2. 后端服务正在运行
#   3. 已登录并获取 JWT Token
###############################################################################

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
BACKEND_URL="http://localhost:8000"
FRONTEND_DIR="$(cd "$(dirname "$0")/../frontend" && pwd)"
WGT_OUTPUT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  车队管家 - 热更新发布脚本${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 步骤 1: 检查版本号
echo -e "${YELLOW}[1/6] 检查版本号...${NC}"
VERSION_NAME=$(grep -o '"versionName" : "[^"]*"' "$FRONTEND_DIR/src/manifest.json" | cut -d'"' -f4)
VERSION_CODE=$(grep -o '"versionCode" : "[^"]*"' "$FRONTEND_DIR/src/manifest.json" | cut -d'"' -f4)

if [ -z "$VERSION_NAME" ] || [ -z "$VERSION_CODE" ]; then
    echo -e "${RED}❌ 无法读取版本号，请检查 manifest.json${NC}"
    exit 1
fi

echo -e "${GREEN}✓ 当前版本: $VERSION_NAME ($VERSION_CODE)${NC}"
echo ""

# 步骤 2: 构建前端
echo -e "${YELLOW}[2/6] 构建前端 H5...${NC}"
cd "$FRONTEND_DIR"
npm run build:h5 > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ H5 构建完成${NC}"
else
    echo -e "${RED}❌ H5 构建失败${NC}"
    exit 1
fi
echo ""

# 步骤 3: 生成 wgt 包
echo -e "${YELLOW}[3/6] 生成 wgt 包...${NC}"
WGT_FILENAME="FleetManager-v${VERSION_NAME}.wgt"
WGT_PATH="$WGT_OUTPUT_DIR/$WGT_FILENAME"

# 检查是否有 dist/build/app 目录（HBuilderX 构建）
if [ -d "$FRONTEND_DIR/dist/build/app" ]; then
    echo "使用 HBuilderX 构建的 app 目录..."
    cd "$FRONTEND_DIR/dist/build/app"
    zip -r "$WGT_PATH" * > /dev/null 2>&1
elif [ -d "$FRONTEND_DIR/dist/build/h5" ]; then
    echo "使用 H5 构建目录（仅用于测试）..."
    cd "$FRONTEND_DIR/dist/build/h5"
    zip -r "$WGT_PATH" * > /dev/null 2>&1
else
    echo -e "${RED}❌ 找不到构建目录${NC}"
    echo -e "${YELLOW}提示: 请先使用 HBuilderX 构建 App 或运行 npm run build:app${NC}"
    exit 1
fi

if [ -f "$WGT_PATH" ]; then
    WGT_SIZE=$(du -h "$WGT_PATH" | cut -f1)
    echo -e "${GREEN}✓ wgt 包已生成: $WGT_FILENAME ($WGT_SIZE)${NC}"
else
    echo -e "${RED}❌ wgt 包生成失败${NC}"
    exit 1
fi
echo ""

# 步骤 4: 获取 JWT Token
echo -e "${YELLOW}[4/6] 获取 JWT Token...${NC}"
echo -n "请输入管理员用户名 (默认: admin): "
read USERNAME
USERNAME=${USERNAME:-admin}

echo -n "请输入密码 (默认: admin123): "
read -s PASSWORD
PASSWORD=${PASSWORD:-admin123}
echo ""

LOGIN_RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\"}")

TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo -e "${RED}❌ 登录失败，请检查用户名和密码${NC}"
    echo "响应: $LOGIN_RESPONSE"
    exit 1
fi

echo -e "${GREEN}✓ 登录成功${NC}"
echo ""

# 步骤 5: 上传 wgt 包
echo -e "${YELLOW}[5/6] 上传 wgt 包到服务器...${NC}"
UPLOAD_RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/app/version/upload" \
    -H "Authorization: Bearer $TOKEN" \
    -F "file=@$WGT_PATH")

UPLOAD_SUCCESS=$(echo "$UPLOAD_RESPONSE" | grep -o '"success":[^,]*' | cut -d':' -f2)

if [ "$UPLOAD_SUCCESS" != "true" ]; then
    echo -e "${RED}❌ 上传失败${NC}"
    echo "响应: $UPLOAD_RESPONSE"
    exit 1
fi

DOWNLOAD_URL=$(echo "$UPLOAD_RESPONSE" | grep -o '"url":"[^"]*"' | cut -d'"' -f4)
FILE_SIZE=$(echo "$UPLOAD_RESPONSE" | grep -o '"file_size":[^,]*' | cut -d':' -f2)
MD5=$(echo "$UPLOAD_RESPONSE" | grep -o '"md5":"[^"]*"' | cut -d'"' -f4)

echo -e "${GREEN}✓ 上传成功${NC}"
echo "  URL: $DOWNLOAD_URL"
echo "  大小: $FILE_SIZE 字节"
echo "  MD5: $MD5"
echo ""

# 步骤 6: 发布新版本
echo -e "${YELLOW}[6/6] 发布新版本...${NC}"
echo -n "更新说明 (默认: Bug 修复和性能优化): "
read DESCRIPTION
DESCRIPTION=${DESCRIPTION:-Bug 修复和性能优化}

echo -n "是否强制更新? (y/N): "
read FORCE_UPDATE
if [ "$FORCE_UPDATE" = "y" ] || [ "$FORCE_UPDATE" = "Y" ]; then
    IS_FORCE_UPDATE="true"
else
    IS_FORCE_UPDATE="false"
fi

PUBLISH_RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/app/version" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"version_name\": \"$VERSION_NAME\",
        \"version_code\": $VERSION_CODE,
        \"platform\": \"android\",
        \"update_type\": \"wgt\",
        \"download_url\": \"$DOWNLOAD_URL\",
        \"file_size\": $FILE_SIZE,
        \"md5\": \"$MD5\",
        \"description\": \"$DESCRIPTION\",
        \"is_force_update\": $IS_FORCE_UPDATE,
        \"min_compatible_version\": 100
    }")

VERSION_ID=$(echo "$PUBLISH_RESPONSE" | grep -o '"id":[^,]*' | head -1 | cut -d':' -f2)

if [ -z "$VERSION_ID" ]; then
    echo -e "${RED}❌ 发布失败${NC}"
    echo "响应: $PUBLISH_RESPONSE"
    exit 1
fi

echo -e "${GREEN}✓ 版本发布成功 (ID: $VERSION_ID)${NC}"
echo ""

# 完成
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  ✓ 热更新发布完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "版本信息:"
echo "  版本号: $VERSION_NAME ($VERSION_CODE)"
echo "  更新类型: wgt 热更新"
echo "  强制更新: $IS_FORCE_UPDATE"
echo "  下载地址: $DOWNLOAD_URL"
echo ""
echo "测试步骤:"
echo "  1. 在手机上打开旧版本 APP"
echo "  2. 等待 2 秒或手动检查更新"
echo "  3. 下载并安装更新"
echo "  4. 重启 APP 验证功能"
echo ""
echo -e "${BLUE}wgt 包位置: $WGT_PATH${NC}"
