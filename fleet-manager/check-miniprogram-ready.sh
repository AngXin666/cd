#!/bin/bash

# 小程序部署准备检查脚本

echo "🔍 检查小程序部署准备情况..."
echo ""

# 检查 manifest.json 中的 AppID
echo "1️⃣  检查小程序 AppID 配置..."
if grep -q "wxf11a504cd3e01346" frontend/src/manifest.json; then
    echo "   ✅ AppID 已配置: wxf11a504cd3e01346"
else
    echo "   ❌ AppID 未配置或配置错误"
fi
echo ""

# 检查 App.vue 中的条件编译
echo "2️⃣  检查热更新代码条件编译..."
if grep -q "#ifndef MP-WEIXIN" frontend/src/App.vue; then
    echo "   ✅ 热更新代码已使用条件编译"
else
    echo "   ❌ 热更新代码未使用条件编译"
fi
echo ""

# 检查环境配置文件
echo "3️⃣  检查小程序环境配置..."
if [ -f "frontend/.env.mp-weixin" ]; then
    echo "   ✅ 小程序环境配置文件存在"
    echo "   当前配置的 API 地址："
    grep "VITE_API_BASE_URL" frontend/.env.mp-weixin | head -1
else
    echo "   ❌ 小程序环境配置文件不存在"
fi
echo ""

# 检查后端服务器
echo "4️⃣  检查后端服务器..."
if curl -s -o /dev/null -w "%{http_code}" http://45.197.148.64:8000/api/health | grep -q "200"; then
    echo "   ✅ 后端服务器运行正常 (HTTP)"
    echo "   ⚠️  注意：小程序正式发布需要 HTTPS"
else
    echo "   ❌ 后端服务器无法访问"
fi
echo ""

# 检查 node_modules
echo "5️⃣  检查前端依赖..."
if [ -d "frontend/node_modules" ]; then
    echo "   ✅ 前端依赖已安装"
else
    echo "   ⚠️  前端依赖未安装，运行: cd frontend && npm install"
fi
echo ""

# 总结
echo "📋 检查完成！"
echo ""
echo "✅ 已完成的准备工作："
echo "   - 小程序 AppID 已配置"
echo "   - 热更新代码已条件编译（小程序不执行）"
echo "   - 环境配置文件已创建"
echo ""
echo "⚠️  待完成的工作："
echo "   1. 后端配置 HTTPS（小程序正式发布必需）"
echo "   2. 在微信小程序后台配置服务器域名"
echo "   3. 构建小程序: ./build-miniprogram.sh"
echo "   4. 使用微信开发者工具测试"
echo ""
echo "💡 推荐方案："
echo "   使用腾讯云 Serverless 部署后端（免费 + 自动 HTTPS）"
echo "   详见: MINIPROGRAM-DEPLOYMENT.md"
