#!/bin/bash

# 车队管家 - 小程序构建脚本
# 用于快速构建小程序版本

set -e

echo "🚀 开始构建小程序版本..."

# 进入前端目录
cd frontend

# 检查是否安装了依赖
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖..."
    npm install
fi

# 构建小程序
echo "🔨 构建小程序..."
npm run build:mp-weixin

echo "✅ 构建完成！"
echo ""
echo "📱 下一步操作："
echo "1. 打开微信开发者工具"
echo "2. 导入项目：frontend/dist/build/mp-weixin"
echo "3. AppID: wxf11a504cd3e01346"
echo "4. 测试功能是否正常"
echo "5. 上传代码到微信小程序后台"
echo ""
echo "⚠️  注意事项："
echo "- 小程序要求使用 HTTPS 协议"
echo "- 需要在微信小程序后台配置服务器域名白名单"
echo "- 开发时可以在开发者工具中勾选「不校验合法域名」"
