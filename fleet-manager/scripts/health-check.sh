#!/bin/bash
# 车队管家健康检查脚本
# 
# 使用方法：
#   ./scripts/health-check.sh

set -e

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 状态计数
PASS=0
FAIL=0

check_service() {
    local name=$1
    local url=$2
    local expected=$3
    
    printf "检查 %-15s ... " "$name"
    
    if response=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null); then
        if [ "$response" = "$expected" ]; then
            echo -e "${GREEN}✓ OK${NC} (HTTP $response)"
            ((PASS++))
        else
            echo -e "${RED}✗ FAIL${NC} (HTTP $response, 期望 $expected)"
            ((FAIL++))
        fi
    else
        echo -e "${RED}✗ FAIL${NC} (无法连接)"
        ((FAIL++))
    fi
}

check_container() {
    local name=$1
    
    printf "检查容器 %-10s ... " "$name"
    
    if docker-compose ps "$name" 2>/dev/null | grep -q "Up"; then
        echo -e "${GREEN}✓ 运行中${NC}"
        ((PASS++))
    else
        echo -e "${RED}✗ 未运行${NC}"
        ((FAIL++))
    fi
}

echo "============================================"
echo "车队管家健康检查"
echo "============================================"
echo ""

echo "--- 容器状态 ---"
check_container "db"
check_container "backend"
check_container "frontend"
echo ""

echo "--- 服务状态 ---"
check_service "后端 API" "http://localhost:8000/docs" "200"
check_service "前端" "http://localhost/health" "200"
check_service "数据库" "http://localhost:8000/api/health" "200"
echo ""

echo "--- 资源使用 ---"
echo "容器资源使用情况:"
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" \
    fleet-manager-db fleet-manager-backend fleet-manager-frontend 2>/dev/null || echo "无法获取资源信息"
echo ""

echo "============================================"
echo "检查结果: ${GREEN}$PASS 通过${NC}, ${RED}$FAIL 失败${NC}"
echo "============================================"

# 返回状态码
if [ $FAIL -gt 0 ]; then
    exit 1
fi
exit 0
