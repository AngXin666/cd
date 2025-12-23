#!/bin/bash
# 车队管家数据库备份脚本
# 
# 使用方法：
#   ./scripts/backup-db.sh
#   ./scripts/backup-db.sh /path/to/backup/dir

set -e

# 配置
BACKUP_DIR="${1:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="fleet_manager_${TIMESTAMP}.sql"

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

# 创建备份目录
mkdir -p "$BACKUP_DIR"

info "开始备份数据库..."
info "备份目录: $BACKUP_DIR"
info "备份文件: $BACKUP_FILE"

# 从 Docker 容器中备份 PostgreSQL
docker-compose exec -T db pg_dump \
    -U "${POSTGRES_USER:-fleet}" \
    -d "${POSTGRES_DB:-fleet_manager}" \
    --clean \
    --if-exists \
    > "$BACKUP_DIR/$BACKUP_FILE"

# 压缩备份文件
gzip "$BACKUP_DIR/$BACKUP_FILE"

info "备份完成: $BACKUP_DIR/${BACKUP_FILE}.gz"

# 清理旧备份（保留最近 7 天）
info "清理旧备份..."
find "$BACKUP_DIR" -name "fleet_manager_*.sql.gz" -mtime +7 -delete

# 显示备份文件大小
BACKUP_SIZE=$(du -h "$BACKUP_DIR/${BACKUP_FILE}.gz" | cut -f1)
info "备份文件大小: $BACKUP_SIZE"

# 列出现有备份
info "现有备份文件:"
ls -lh "$BACKUP_DIR"/*.sql.gz 2>/dev/null || echo "无备份文件"
