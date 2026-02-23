#!/bin/bash
# SSL 证书配置脚本（使用 Let's Encrypt 免费证书）

set -e

echo "=========================================="
echo "  配置 SSL 证书"
echo "=========================================="
echo ""

# 检查是否为 root 用户
if [ "$EUID" -ne 0 ]; then 
    echo "请使用 root 用户或 sudo 运行此脚本"
    exit 1
fi

# 安装 Certbot
echo "安装 Certbot..."
apt install -y certbot python3-certbot-nginx

# 获取域名
read -p "请输入域名 (例如: api.example.com): " DOMAIN
read -p "请输入邮箱 (用于证书通知): " EMAIL

# 获取证书
echo "正在获取 SSL 证书..."
certbot --nginx -d ${DOMAIN} --non-interactive --agree-tos -m ${EMAIL}

# 配置自动续期
echo "配置自动续期..."
systemctl enable certbot.timer
systemctl start certbot.timer

echo ""
echo "✅ SSL 证书配置完成！"
echo ""
echo "访问地址："
echo "  HTTPS: https://${DOMAIN}"
echo "  API 文档: https://${DOMAIN}/docs"
echo ""
echo "证书将自动续期，无需手动操作。"
echo ""
