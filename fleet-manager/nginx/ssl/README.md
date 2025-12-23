# SSL 证书配置说明

## 证书文件

将以下 SSL 证书文件放置在此目录：

- `fullchain.pem` - 完整证书链（包含服务器证书和中间证书）
- `privkey.pem` - 私钥文件

## 获取证书的方法

### 方法 1：使用 Let's Encrypt（免费）

```bash
# 安装 certbot
apt-get install certbot

# 获取证书（需要域名指向服务器）
certbot certonly --standalone -d your-domain.com

# 证书位置
# /etc/letsencrypt/live/your-domain.com/fullchain.pem
# /etc/letsencrypt/live/your-domain.com/privkey.pem

# 复制到此目录
cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ./
cp /etc/letsencrypt/live/your-domain.com/privkey.pem ./
```

### 方法 2：使用 Docker + Certbot

```bash
# 使用 certbot docker 镜像
docker run -it --rm \
  -v $(pwd)/nginx/ssl:/etc/letsencrypt \
  -p 80:80 \
  certbot/certbot certonly --standalone -d your-domain.com
```

### 方法 3：自签名证书（仅用于测试）

```bash
# 生成自签名证书（不推荐用于生产）
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout privkey.pem \
  -out fullchain.pem \
  -subj "/CN=localhost"
```

### 方法 4：购买商业证书

从以下提供商购买 SSL 证书：
- DigiCert
- Comodo
- GlobalSign
- 阿里云 SSL
- 腾讯云 SSL

## 证书续期

Let's Encrypt 证书有效期为 90 天，建议设置自动续期：

```bash
# 添加 crontab 任务
0 0 1 * * certbot renew --quiet && docker-compose restart nginx-proxy
```

## 安全注意事项

1. **私钥保护**：`privkey.pem` 文件权限应设为 600
2. **不要提交到 Git**：此目录已在 .gitignore 中排除
3. **定期更新**：及时更新过期证书
