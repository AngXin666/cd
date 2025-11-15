#!/bin/bash

echo "=========================================="
echo "  车队管家 - 缓存清理工具"
echo "=========================================="
echo ""

# 检查是否有开发服务器正在运行
if pgrep -f "taro" > /dev/null; then
    echo "⚠️  检测到开发服务器正在运行"
    echo "   请先停止开发服务器（按 Ctrl+C）"
    echo ""
    exit 1
fi

echo "🧹 开始清理缓存..."
echo ""

# 清理 dist 目录
if [ -d "dist" ]; then
    echo "  清理 dist 目录..."
    rm -rf dist
    echo "  ✅ dist 目录已清理"
else
    echo "  ℹ️  dist 目录不存在"
fi

# 清理 .temp 目录
if [ -d ".temp" ]; then
    echo "  清理 .temp 目录..."
    rm -rf .temp
    echo "  ✅ .temp 目录已清理"
else
    echo "  ℹ️  .temp 目录不存在"
fi

# 清理 node_modules/.cache 目录
if [ -d "node_modules/.cache" ]; then
    echo "  清理 node_modules/.cache 目录..."
    rm -rf node_modules/.cache
    echo "  ✅ node_modules/.cache 目录已清理"
else
    echo "  ℹ️  node_modules/.cache 目录不存在"
fi

echo ""
echo "✅ 缓存清理完成！"
echo ""
echo "📝 下一步操作："
echo "   1. 重新启动开发服务器："
echo "      - H5: pnpm run dev:h5"
echo "      - 小程序: pnpm run dev:weapp"
echo ""
echo "   2. 清理浏览器缓存："
echo "      - 按 F12 打开开发者工具"
echo "      - 右键点击刷新按钮"
echo "      - 选择'清空缓存并硬性重新加载'"
echo ""
echo "   3. 或者使用浏览器的无痕模式访问"
echo ""
echo "=========================================="
