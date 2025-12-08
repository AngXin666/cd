#!/bin/bash

# 热更新部署脚本 - 直接上传到Supabase Storage
# 使用方法: ./deploy-update.sh

# 加载环境变量
if [ -f .env.deploy ]; then
  export $(cat .env.deploy | grep -v '^#' | xargs)
fi

BUILD_DIR="dist"
UPDATE_FILE="latest.zip"

# 检查必要的环境变量
if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ] || [ "$SUPABASE_SERVICE_ROLE_KEY" = "请替换为你的service_role密钥" ]; then
  echo "❌ 错误: 请先在 .env.deploy 文件中配置 SUPABASE_SERVICE_ROLE_KEY"
  echo "📝 获取方式: https://supabase.com/dashboard/project/wxvrwkpkioalqdsfswwu/settings/api"
  exit 1
fi

echo "🚀 开始构建热更新包..."

# 1. 清理旧构建
echo "📦 清理旧构建..."
rm -rf $BUILD_DIR
rm -f $UPDATE_FILE

# 2. 构建生产版本
echo "🔨 构建H5生产版本..."
npm run build:h5

if [ ! -d "$BUILD_DIR" ]; then
  echo "❌ 构建失败！"
  exit 1
fi

# 3. 压缩为zip
echo "🗜️  压缩更新包..."
cd $BUILD_DIR
zip -r ../$UPDATE_FILE . -q
cd -

if [ ! -f "$UPDATE_FILE" ]; then
  echo "❌ 压缩失败！"
  exit 1
fi

FILE_SIZE=$(ls -lh $UPDATE_FILE | awk '{print $5}')
echo "✅ 更新包大小: $FILE_SIZE"

# 4. 上传到Supabase Storage
echo "📤 上传到Supabase Storage..."

# 先删除旧文件(如果存在)
curl -X DELETE \
  "$SUPABASE_URL/storage/v1/object/$BUCKET_NAME/$UPDATE_FILE" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -s > /dev/null 2>&1

# 上传新文件
RESPONSE=$(curl -X POST \
  "$SUPABASE_URL/storage/v1/object/$BUCKET_NAME/$UPDATE_FILE" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/zip" \
  --data-binary "@$UPDATE_FILE" \
  -w "\n%{http_code}" \
  -s)

HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
RESPONSE_BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
  echo ""
  echo "✅ 热更新包部署成功！"
  echo "📍 下载链接: $SUPABASE_URL/storage/v1/object/public/$BUCKET_NAME/$UPDATE_FILE"
  echo ""
  echo "📱 APP下次启动时将自动下载并应用更新"
else
  echo "❌ 上传失败！HTTP状态码: $HTTP_CODE"
  echo "响应内容: $RESPONSE_BODY"
  exit 1
fi

# 5. 清理临时文件
rm -f $UPDATE_FILE

echo "✅ 完成！"
