#!/bin/bash
# 使用内网穿透启动后端

set -e

echo "=========================================="
echo "  车队管家 - 内网穿透部署"
echo "=========================================="
echo ""

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 检查是否安装了 ngrok
if ! command -v ngrok &> /dev/null; then
    echo -e "${YELLOW}未检测到 ngrok，正在安装...${NC}"
    echo "请访问 https://ngrok.com/download 下载并安装 ngrok"
    echo "或使用 Homebrew: brew install ngrok"
    exit 1
fi

echo -e "${GREEN}✓ ngrok 已就绪${NC}"
echo ""

# 启动后端
echo "=========================================="
echo "步骤 1/3: 启动后端"
echo "=========================================="
cd backend
source venv_mac/bin/activate

echo "后端正在启动..."
python3 main.py &
BACKEND_PID=$!

echo "等待后端启动..."
sleep 5

echo -e "${GREEN}✓ 后端已启动 (PID: $BACKEND_PID)${NC}"
echo ""

cd ..

# 启动 ngrok
echo "=========================================="
echo "步骤 2/3: 启动内网穿透"
echo "=========================================="
echo "正在创建公网访问地址..."
ngrok http 8000 &
NGROK_PID=$!

echo "等待 ngrok 启动..."
sleep 3

# 获取公网地址
echo ""
echo -e "${GREEN}✓ 内网穿透已启动${NC}"
echo ""
echo "请访问 http://127.0.0.1:4040 查看 ngrok 控制台"
echo "复制 'Forwarding' 地址（类似：https://xxxx.ngrok.io）"
echo ""

read -p "请输入 ngrok 公网地址: " PUBLIC_URL

# 构建 APK
echo ""
echo "=========================================="
echo "步骤 3/3: 构建 APK"
echo "=========================================="

read -p "是否现在构建 APK？(y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    # 更新前端 API 地址
    cat > frontend/.env << EOF
VITE_API_BASE_URL=${PUBLIC_URL}/api
EOF
    
    echo "构建前端 H5..."
    cd frontend
    npm run build:h5
    cd ..
    
    cd android-offline
    
    echo "准备 H5 资源..."
    ./prepare_assets.sh
    
    echo "构建 Release APK..."
    ./build_apk.sh release
    
    echo ""
    echo -e "${GREEN}✓ APK 构建完成${NC}"
    echo "APK 位置: android-offline/FleetManager-release.apk"
    echo ""
    
    cd ..
fi

# 完成
echo "=========================================="
echo "  🎉 部署完成！"
echo "=========================================="
echo ""
echo "访问地址："
echo "  后端 API: $PUBLIC_URL"
echo "  API 文档: $PUBLIC_URL/docs"
echo "  ngrok 控制台: http://127.0.0.1:4040"
echo ""
echo "数据库："
echo "  Supabase PostgreSQL"
echo ""
echo "测试账号："
echo "  老板: admin / admin123"
echo "  车队长: manager / manager123"
echo "  司机: driver / driver123"
echo ""
echo "注意："
echo "  - 保持此终端窗口打开"
echo "  - 关闭窗口会停止后端服务"
echo "  - ngrok 免费版每次重启地址会变化"
echo ""
echo "停止服务："
echo "  按 Ctrl+C 停止"
echo ""

# 等待用户中断
trap "kill $BACKEND_PID $NGROK_PID 2>/dev/null" EXIT
wait
