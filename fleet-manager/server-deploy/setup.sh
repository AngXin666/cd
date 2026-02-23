#!/bin/bash
# Ubuntu 22.04 服务器自动化部署脚本
# 用途：一键部署车队管家后端到服务器

set -e

echo "=========================================="
echo "  车队管家 - 服务器部署脚本"
echo "  系统要求：Ubuntu 22.04 LTS"
echo "=========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 检查是否为 root 用户
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}请使用 root 用户或 sudo 运行此脚本${NC}"
    exit 1
fi

# 步骤 1: 更新系统
echo -e "${GREEN}步骤 1/8: 更新系统${NC}"
apt update
apt upgrade -y

# 步骤 2: 安装基础软件
echo -e "${GREEN}步骤 2/8: 安装基础软件${NC}"
apt install -y \
    python3.10 \
    python3.10-venv \
    python3-pip \
    nginx \
    git \
    curl \
    wget \
    supervisor

# 步骤 3: 创建应用目录
echo -e "${GREEN}步骤 3/8: 创建应用目录${NC}"
mkdir -p /opt/fleet-manager
cd /opt/fleet-manager

# 步骤 4: 克隆代码（或上传代码）
echo -e "${GREEN}步骤 4/8: 准备代码${NC}"
echo "请将代码上传到 /opt/fleet-manager/backend"
echo "或使用 git clone 命令"
read -p "按 Enter 继续..."

# 步骤 5: 创建 Python 虚拟环境
echo -e "${GREEN}步骤 5/8: 创建 Python 虚拟环境${NC}"
cd /opt/fleet-manager/backend
python3.10 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# 步骤 6: 配置环境变量
echo -e "${GREEN}步骤 6/8: 配置环境变量${NC}"
read -p "请输入服务器域名或 IP (例如: api.example.com): " SERVER_DOMAIN
read -p "是否使用 Supabase 数据库? (y/n): " USE_SUPABASE

if [ "$USE_SUPABASE" = "y" ]; then
    read -p "请输入 Supabase 数据库连接字符串: " DATABASE_URL
else
    # 安装 PostgreSQL
    apt install -y postgresql postgresql-contrib
    systemctl start postgresql
    systemctl enable postgresql
    
    # 创建数据库
    sudo -u postgres psql -c "CREATE DATABASE fleet_manager;"
    sudo -u postgres psql -c "CREATE USER fleet_user WITH PASSWORD 'fleet_password';"
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE fleet_manager TO fleet_user;"
    
    DATABASE_URL="postgresql://fleet_user:fleet_password@localhost:5432/fleet_manager"
fi

# 创建 .env 文件
cat > /opt/fleet-manager/backend/.env << EOF
# 数据库配置
DATABASE_URL=${DATABASE_URL}

# JWT 配置
JWT_SECRET_KEY=$(openssl rand -hex 32)
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=43200

# 服务器配置
HOST=0.0.0.0
PORT=8000
DEBUG=false

# CORS 配置
CORS_ORIGINS=*
EOF

# 步骤 7: 配置 Supervisor（进程管理）
echo -e "${GREEN}步骤 7/8: 配置 Supervisor${NC}"
cat > /etc/supervisor/conf.d/fleet-manager.conf << EOF
[program:fleet-manager]
directory=/opt/fleet-manager/backend
command=/opt/fleet-manager/backend/venv/bin/python -m uvicorn main:app --host 0.0.0.0 --port 8000
user=root
autostart=true
autorestart=true
stderr_logfile=/var/log/fleet-manager.err.log
stdout_logfile=/var/log/fleet-manager.out.log
environment=PATH="/opt/fleet-manager/backend/venv/bin"
EOF

supervisorctl reread
supervisorctl update
supervisorctl start fleet-manager

# 步骤 8: 配置 Nginx
echo -e "${GREEN}步骤 8/8: 配置 Nginx${NC}"
cat > /etc/nginx/sites-available/fleet-manager << EOF
server {
    listen 80;
    server_name ${SERVER_DOMAIN};

    client_max_body_size 100M;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # SSE 支持
        proxy_buffering off;
        proxy_cache off;
        proxy_set_header Connection '';
        proxy_http_version 1.1;
        chunked_transfer_encoding off;
    }

    location /uploads {
        alias /opt/fleet-manager/backend/uploads;
    }
}
EOF

ln -sf /etc/nginx/sites-available/fleet-manager /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx

# 配置防火墙
echo -e "${GREEN}配置防火墙${NC}"
ufw allow 22
ufw allow 80
ufw allow 443
ufw --force enable

echo ""
echo -e "${GREEN}=========================================="
echo "  🎉 部署完成！"
echo "==========================================${NC}"
echo ""
echo "访问地址："
echo "  HTTP: http://${SERVER_DOMAIN}"
echo "  API 文档: http://${SERVER_DOMAIN}/docs"
echo ""
echo "管理命令："
echo "  查看日志: tail -f /var/log/fleet-manager.out.log"
echo "  重启服务: supervisorctl restart fleet-manager"
echo "  查看状态: supervisorctl status fleet-manager"
echo ""
echo "下一步："
echo "  1. 配置 SSL 证书（运行 ./setup-ssl.sh）"
echo "  2. 构建 APK（使用服务器地址）"
echo "  3. 测试登录功能"
echo ""
