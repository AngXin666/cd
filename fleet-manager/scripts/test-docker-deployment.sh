#!/bin/bash
# Docker 部署测试脚本
# 用于验证 fleet-manager 的 Docker 部署是否正常
#
# 使用方法：
#   ./test-docker-deployment.sh
#
# 前提条件：
#   - 已安装 Docker 和 Docker Compose
#   - 当前目录为 fleet-manager 根目录

set -e

echo "============================================================"
echo "Fleet Manager Docker 部署测试"
echo "============================================================"

# 检查 Docker 是否可用
echo ""
echo "检查 Docker..."
if command -v docker &> /dev/null; then
    docker_version=$(docker --version)
    echo "✅ Docker 已安装: $docker_version"
else
    echo "❌ Docker 未安装或不可用"
    exit 1
fi

# 检查 Docker Compose 是否可用
echo ""
echo "检查 Docker Compose..."
if docker compose version &> /dev/null; then
    compose_version=$(docker compose version)
    echo "✅ Docker Compose 已安装: $compose_version"
else
    echo "❌ Docker Compose 未安装或不可用"
    exit 1
fi

# 切换到 fleet-manager 目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FLEET_MANAGER_DIR="$(dirname "$SCRIPT_DIR")"
cd "$FLEET_MANAGER_DIR"

echo ""
echo "当前目录: $(pwd)"

# 构建镜像
echo ""
echo "构建 Docker 镜像..."
docker compose build
echo "✅ 镜像构建成功"

# 启动服务
echo ""
echo "启动服务..."
docker compose up -d
echo "✅ 服务已启动"

# 等待服务就绪
echo ""
echo "等待服务就绪..."
max_retries=30
retry_count=0
services_ready=false

while [ $retry_count -lt $max_retries ] && [ "$services_ready" = false ]; do
    sleep 2
    retry_count=$((retry_count + 1))
    
    if curl -s http://localhost:8000/api/health > /dev/null 2>&1; then
        services_ready=true
    else
        echo "  等待中... ($retry_count/$max_retries)"
    fi
done

if [ "$services_ready" = false ]; then
    echo "❌ 服务未能在预期时间内就绪"
    docker compose logs
    exit 1
fi

echo "✅ 服务已就绪"

# 测试后端 API
echo ""
echo "测试后端 API..."

# 健康检查
if curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/health | grep -q "200"; then
    echo "✅ 健康检查: 200"
else
    echo "❌ 健康检查失败"
fi

# 存活检查
if curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/health/live | grep -q "200"; then
    echo "✅ 存活检查: 200"
else
    echo "❌ 存活检查失败"
fi

# 就绪检查
if curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/health/ready | grep -q "200"; then
    echo "✅ 就绪检查: 200"
else
    echo "❌ 就绪检查失败"
fi

# API 文档
if curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/docs | grep -q "200"; then
    echo "✅ Swagger UI: 200"
else
    echo "❌ Swagger UI 失败"
fi

# 测试前端
echo ""
echo "测试前端..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:80 | grep -q "200"; then
    echo "✅ 前端页面: 200"
else
    echo "⚠️ 前端页面可能未就绪"
fi

# 显示容器状态
echo ""
echo "容器状态:"
docker compose ps

# 显示日志摘要
echo ""
echo "最近日志:"
docker compose logs --tail=10

echo ""
echo "============================================================"
echo "Docker 部署测试完成"
echo "============================================================"

echo ""
echo "访问地址:"
echo "  - 后端 API: http://localhost:8000"
echo "  - API 文档: http://localhost:8000/docs"
echo "  - 前端页面: http://localhost:80"

echo ""
echo "停止服务:"
echo "  docker compose down"

echo ""
echo "查看日志:"
echo "  docker compose logs -f"
