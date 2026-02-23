#!/bin/bash
# 本地启动后端并构建 APK

set -e

echo "=========================================="
echo "  车队管家 - 本地部署"
echo "=========================================="
echo ""

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 获取本机 IP
echo "正在获取本机 IP 地址..."
LOCAL_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)

if [ -z "$LOCAL_IP" ]; then
    echo -e "${YELLOW}无法自动获取 IP 地址${NC}"
    read -p "请手动输入本机 IP 地址: " LOCAL_IP
fi

echo ""
echo -e "${GREEN}本机 IP: $LOCAL_IP${NC}"
echo ""

# 启动后端
echo "=========================================="
echo "启动后端服务"
echo "=========================================="
cd backend
source venv_mac/bin/activate

echo "后端正在启动..."
echo "数据库: Supabase PostgreSQL"
echo "监听地址: http://$LOCAL_IP:8000"
echo ""

# 在后台启动后端
python3 main.py &
BACKEND_PID=$!

echo "等待后端启动..."
sleep 5

echo -e "${GREEN}✓ 后端已启动 (PID: $BACKEND_PID)${NC}"
echo ""

cd ..

# 构建 APK
echo "=========================================="
echo "构建 APK"
echo "=========================================="

read -p "是否现在构建 APK？(y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    # 更新前端 API 地址
    cat > frontend/.env << EOF
VITE_API_BASE_URL=http://${LOCAL_IP}:8000/api
EOF
    
    echo "构建前端 H5..."
    cd frontend
    npm run build:h5
    cd ..
    
    cd android-offline
    
    echo "准备 H5 资源..."
    ./prepare_assets.sh
    
    echo "构建 Debug APK..."
    ./build_apk.sh debug
    
    echo ""
    echo -e "${GREEN}✓ APK 构建完成${NC}"
    echo "APK 位置: android-offline/FleetManager-debug.apk"
    echo ""
    
    cd ..
fi

# 完成
echo "=========================================="
echo "  🎉 启动完成！"
echo "=========================================="
echo ""
echo "访问地址："
echo "  后端 API: http://$LOCAL_IP:8000"
echo "  API 文档: http://$LOCAL_IP:8000/docs"
echo ""
echo "数据库："
echo "  Supabase PostgreSQL"
echo ""
echo "使用说明："
echo "  1. 确保手机和电脑在同一 WiFi 网络"
echo "  2. 安装 APK 到手机"
echo "  3. 打开应用即可使用"
echo ""
echo "测试账号："
echo "  老板: admin / admin123"
echo "  车队长: manager / manager123"
echo "  司机: driver / driver123"
echo ""
echo "注意："
echo "  - 保持此终端窗口打开"
echo "  - 关闭窗口会停止后端服务"
echo "  - 电脑休眠会断开连接"
echo ""
echo "停止服务："
echo "  按 Ctrl+C 停止"
echo ""

# 等待用户中断
trap "kill $BACKEND_PID 2>/dev/null" EXIT

echo "后端日志："
echo "----------------------------------------"
wait $BACKEND_PID
