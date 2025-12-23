#!/bin/bash
# 车队管家部署脚本
# 
# 使用方法：
#   开发环境：./scripts/deploy.sh dev
#   生产环境：./scripts/deploy.sh prod
#   停止服务：./scripts/deploy.sh stop
#   查看日志：./scripts/deploy.sh logs

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 打印带颜色的消息
info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查 Docker 是否安装
check_docker() {
    if ! command -v docker &> /dev/null; then
        error "Docker 未安装，请先安装 Docker"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose 未安装，请先安装 Docker Compose"
        exit 1
    fi
    
    info "Docker 环境检查通过"
}

# 检查环境变量文件
check_env() {
    if [ ! -f ".env" ]; then
        warn ".env 文件不存在，从模板创建..."
        cp .env.template .env
        warn "请编辑 .env 文件配置环境变量"
    fi
}

# 开发环境部署
deploy_dev() {
    info "启动开发环境..."
    check_env
    docker-compose up -d --build
    info "开发环境启动完成"
    info "前端地址: http://localhost"
    info "后端 API: http://localhost:8000"
    info "API 文档: http://localhost:8000/docs"
}

# 生产环境部署
deploy_prod() {
    info "启动生产环境..."
    check_env
    
    # 检查 SSL 证书
    if [ ! -f "nginx/ssl/fullchain.pem" ] || [ ! -f "nginx/ssl/privkey.pem" ]; then
        error "SSL 证书不存在，请先配置 SSL 证书"
        error "参考: nginx/ssl/README.md"
        exit 1
    fi
    
    docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
    info "生产环境启动完成"
    info "HTTPS 地址: https://your-domain.com"
}

# 停止服务
stop_services() {
    info "停止所有服务..."
    docker-compose down
    info "服务已停止"
}

# 查看日志
show_logs() {
    local service=$1
    if [ -z "$service" ]; then
        docker-compose logs -f
    else
        docker-compose logs -f "$service"
    fi
}

# 重启服务
restart_services() {
    info "重启所有服务..."
    docker-compose restart
    info "服务已重启"
}

# 清理资源
cleanup() {
    info "清理 Docker 资源..."
    docker-compose down -v --rmi local
    docker system prune -f
    info "清理完成"
}

# 显示帮助
show_help() {
    echo "车队管家部署脚本"
    echo ""
    echo "使用方法: $0 <命令> [参数]"
    echo ""
    echo "命令:"
    echo "  dev         启动开发环境"
    echo "  prod        启动生产环境（需要 SSL 证书）"
    echo "  stop        停止所有服务"
    echo "  restart     重启所有服务"
    echo "  logs [服务] 查看日志（可选指定服务：backend/frontend/db）"
    echo "  cleanup     清理 Docker 资源"
    echo "  help        显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 dev              # 启动开发环境"
    echo "  $0 prod             # 启动生产环境"
    echo "  $0 logs backend     # 查看后端日志"
}

# 主函数
main() {
    check_docker
    
    case "$1" in
        dev)
            deploy_dev
            ;;
        prod)
            deploy_prod
            ;;
        stop)
            stop_services
            ;;
        restart)
            restart_services
            ;;
        logs)
            show_logs "$2"
            ;;
        cleanup)
            cleanup
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            error "未知命令: $1"
            show_help
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"
