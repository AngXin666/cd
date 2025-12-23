#!/bin/bash
# 车队管家数据库恢复脚本
# 
# 使用方法：
#   ./scripts/restore-db.sh backup_file.sql.gz

set -e

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查参数
if [ -z "$1" ]; then
    error "请指定备份文件"
    echo "使用方法: $0 <backup_file.sql.gz>"
    exit 1
fi

BACKUP_FILE="$1"

# 检查文件是否存在
if [ ! -f "$BACKUP_FILE" ]; then
    error "备份文件不存在: $BACKUP_FILE"
    exit 1
fi

# 确认恢复
warn "警告：此操作将覆盖现有数据库！"
read -p "确定要恢复数据库吗？(y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    info "操作已取消"
    exit 0
fi

info "开始恢复数据库..."
info "备份文件: $BACKUP_FILE"

# 解压并恢复
if [[ "$BACKUP_FILE" == *.gz ]]; then
    info "解压备份文件..."
    gunzip -c "$BACKUP_FILE" | docker-compose exec -T db psql \
        -U "${POSTGRES_USER:-fleet}" \
        -d "${POSTGRES_DB:-fleet_manager}"
else
    docker-compose exec -T db psql \
        -U "${POSTGRES_USER:-fleet}" \
        -d "${POSTGRES_DB:-fleet_manager}" \
        < "$BACKUP_FILE"
fi

info "数据库恢复完成！"

# 重启后端服务以刷新连接
info "重启后端服务..."
docker-compose restart backend

info "恢复操作完成"
