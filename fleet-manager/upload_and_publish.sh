#!/bin/bash
# 上传并发布热更新版本

set -e

WGT_FILE="frontend/dist/build/h5/车队管家-v1.0.12.wgt"
SERVER="45.197.148.64"
PASSWORD="Hye19911206"

echo "=== 上传并发布热更新版本 1.0.12 ==="
echo ""

# 1. 上传 wgt 文件
echo "1. 上传 wgt 文件到服务器..."
sshpass -p "$PASSWORD" scp -o StrictHostKeyChecking=no "$WGT_FILE" root@$SERVER:/opt/fleet-manager/backend/uploads/app_updates/车队管家-v1.0.12.wgt

if [ $? -eq 0 ]; then
    echo "✅ 文件上传成功"
else
    echo "❌ 文件上传失败"
    exit 1
fi

echo ""

# 2. 获取文件信息
echo "2. 获取文件信息..."
FILE_SIZE=$(stat -f%z "$WGT_FILE" 2>/dev/null || stat -c%s "$WGT_FILE")
# macOS 使用 md5 命令
if command -v md5 &> /dev/null; then
    FILE_MD5=$(md5 -q "$WGT_FILE")
else
    FILE_MD5=$(md5sum "$WGT_FILE" | awk '{print $1}')
fi

echo "   文件大小: $FILE_SIZE bytes"
echo "   MD5: $FILE_MD5"
echo ""

# 3. 登录获取 token
echo "3. 登录获取 token..."
TOKEN=$(curl -s -X POST "http://$SERVER:8000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}' | \
  python3 -c "import sys, json; print(json.load(sys.stdin)['access_token'])")

if [ -z "$TOKEN" ]; then
    echo "❌ 登录失败"
    exit 1
fi

echo "✅ 登录成功"
echo ""

# 4. 发布新版本
echo "4. 发布版本 1.0.12..."
RESPONSE=$(curl -s -X POST "http://$SERVER:8000/api/app/version" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"version_name\": \"1.0.12\",
    \"version_code\": 112,
    \"platform\": \"android\",
    \"update_type\": \"wgt\",
    \"download_url\": \"/uploads/app_updates/车队管家-v1.0.12.wgt\",
    \"file_size\": $FILE_SIZE,
    \"md5\": \"$FILE_MD5\",
    \"description\": \"测试热更新功能 - 第二次测试\",
    \"is_force_update\": false,
    \"min_compatible_version\": 100
  }")

echo "$RESPONSE"
echo ""

echo "=== 发布完成 ==="
echo "✅ 版本 1.0.12 已发布"
echo "   版本号: 1.0.12 (112)"
echo "   更新类型: wgt (热更新)"
echo "   文件大小: $(echo "scale=1; $FILE_SIZE/1024" | bc) KB"
echo "   下载地址: /uploads/app_updates/车队管家-v1.0.12.wgt"
echo ""
echo "现在可以在手机 APP 上测试热更新了！"
echo "1. 打开 APP（版本 1.0.11）"
echo "2. 等待 2 秒或点击'检查更新'"
echo "3. 应该会提示更新到 1.0.12"
