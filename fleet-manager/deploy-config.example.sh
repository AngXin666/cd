#!/bin/bash
# 生产服务器部署配置示例
# 复制此文件为 deploy-config.sh 并填写实际值
# 注意：deploy-config.sh 已添加到 .gitignore，不会被提交

# ============================================
# 服务器配置
# ============================================
SERVER_HOST="your-server-ip-or-domain"
SERVER_USER="root"
SERVER_PORT="22"
DEPLOY_PATH="/var/www/fleet-manager"

# ============================================
# 部署函数
# ============================================

# 上传文件到服务器
upload_files() {
    echo "上传文件到服务器..."
    rsync -avz --exclude 'node_modules' \
                --exclude '.git' \
                --exclude 'venv' \
                --exclude '__pycache__' \
                -e "ssh -p ${SERVER_PORT}" \
                ./ ${SERVER_USER}@${SERVER_HOST}:${DEPLOY_PATH}/
}

# 在服务器上执行部署
deploy_on_server() {
    echo "在服务器上执行部署..."
    ssh -p ${SERVER_PORT} ${SERVER_USER}@${SERVER_HOST} << 'EOF'
        cd ${DEPLOY_PATH}
        
        # 停止旧服务
        docker compose down
        
        # 启动新服务
        docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
        
        # 查看服务状态
        docker compose ps
EOF
}

# 主函数
main() {
    echo "=== 开始部署到生产服务器 ==="
    upload_files
    deploy_on_server
    echo "=== 部署完成 ==="
}

# 执行部署
main
