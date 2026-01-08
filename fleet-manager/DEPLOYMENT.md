# 生产环境部署指南

## 📦 部署状态

### ✅ 已部署到生产服务器

**服务器信息**
- IP: 106.14.95.148
- 部署路径: `/var/www/fleet-manager/`
- 访问地址: http://106.14.95.148

**服务状态**
- ✅ 后端 API: 运行中 (Python + FastAPI + SQLite)
- ✅ 前端 H5: 运行中 (Nginx)
- ✅ 数据库: SQLite (本地文件)

**最后更新**: 2026-01-08 03:48

### 已完成的构建

✅ **APK 已构建完成**
- 文件位置：`android-offline/FleetManager-release.apk`
- 文件大小：6.0 MB
- 版本号：v1.2.0
- 签名状态：已签名
- 可直接安装使用

✅ **生产环境配置已创建**
- 配置文件：`.env`
- JWT 密钥已生成
- 数据库：SQLite (本地文件)

## 🚀 更新部署

### 更新前端和后端代码

```bash
# 1. 同步前端构建文件
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.git' \
  fleet-manager/frontend/dist/build/h5/ \
  admin@106.14.95.148:/var/www/fleet-manager/frontend/

# 2. 同步后端代码
rsync -avz \
  --exclude 'venv*' \
  --exclude '__pycache__' \
  --exclude '*.pyc' \
  --exclude 'data/*.db' \
  fleet-manager/backend/ \
  admin@106.14.95.148:/var/www/fleet-manager/backend/

# 3. 重启后端服务
ssh admin@106.14.95.148 "pkill -f 'python main.py' && cd /var/www/fleet-manager/backend && nohup ./venv/bin/python main.py > /tmp/backend.log 2>&1 &"

# 4. 重启 Nginx（如果需要）
ssh admin@106.14.95.148 "sudo systemctl restart nginx"
```

### 仅分发 APK

如果只需要更新移动端应用：

```bash
# APK 文件位置
android-offline/FleetManager-release.apk

# 分发方式：
# 1. 直接发送给用户安装
# 2. 上传到应用分发平台（如蒲公英、fir.im）
# 3. 放到服务器供用户下载
```

## 🔧 服务器架构

### 当前部署架构（非 Docker）

```
┌─────────────────────────────────────┐
│   Nginx (端口 80)                    │
│   - 前端静态文件服务                  │
│   - API 反向代理                     │
│   - 上传文件服务                     │
└──────────┬──────────────────────────┘
           │
           ├─> /var/www/fleet-manager/frontend/  (前端 H5)
           │
           └─> http://127.0.0.1:8000  (后端 API)
                    │
                    └─> Python + FastAPI + SQLite
                         /var/www/fleet-manager/backend/
```

### 服务管理

```bash
# 检查服务状态
ssh admin@106.14.95.148 "systemctl status nginx"
ssh admin@106.14.95.148 "ps aux | grep 'python main.py'"

# 查看后端日志
ssh admin@106.14.95.148 "tail -f /tmp/backend.log"

# 查看 Nginx 日志
ssh admin@106.14.95.148 "tail -f /var/log/nginx/fleet-manager-access.log"
ssh admin@106.14.95.148 "tail -f /var/log/nginx/fleet-manager-error.log"
```

## 🔧 服务器要求

### 最低配置

- **CPU**: 2 核
- **内存**: 4 GB
- **磁盘**: 20 GB
- **系统**: Ubuntu 20.04+ / CentOS 7+
- **软件**: Docker 20.10+, Docker Compose 2.0+

### 推荐配置

- **CPU**: 4 核
- **内存**: 8 GB
- **磁盘**: 50 GB SSD
- **带宽**: 5 Mbps+

## 🌐 域名和 SSL 配置

### 配置域名

1. 将域名 A 记录指向服务器 IP
2. 等待 DNS 生效（通常 10 分钟内）

### 配置 SSL 证书

#### 使用 Let's Encrypt（免费）

```bash
# 安装 certbot
apt-get update
apt-get install certbot

# 获取证书
certbot certonly --standalone -d your-domain.com

# 复制证书到项目目录
cp /etc/letsencrypt/live/your-domain.com/fullchain.pem nginx/ssl/
cp /etc/letsencrypt/live/your-domain.com/privkey.pem nginx/ssl/
```

#### 使用自有证书

```bash
# 将证书文件复制到 nginx/ssl/ 目录
cp your-cert.pem nginx/ssl/fullchain.pem
cp your-key.pem nginx/ssl/privkey.pem
```

## 📊 部署后检查

### 1. 检查服务状态

```bash
# 检查 Nginx
ssh admin@106.14.95.148 "systemctl status nginx"

# 检查后端进程
ssh admin@106.14.95.148 "ps aux | grep 'python main.py' | grep -v grep"

# 检查端口监听
ssh admin@106.14.95.148 "netstat -tulpn | grep -E ':80|:8000'"
```

### 2. 检查服务健康

```bash
# 检查后端 API
curl http://106.14.95.148/api/health

# 检查前端
curl http://106.14.95.148/

# 测试登录 API
curl -X POST http://106.14.95.148/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### 3. 查看日志

```bash
# 查看后端日志
ssh admin@106.14.95.148 "tail -100 /tmp/backend.log"

# 查看 Nginx 访问日志
ssh admin@106.14.95.148 "tail -100 /var/log/nginx/fleet-manager-access.log"

# 查看 Nginx 错误日志
ssh admin@106.14.95.148 "tail -100 /var/log/nginx/fleet-manager-error.log"
```

### 4. 测试功能

1. 访问前端地址：http://106.14.95.148
2. 使用测试账号登录：
   - 老板：admin / admin123
   - 车队长：manager / manager123
   - 司机：driver / driver123
3. 测试核心功能：
   - 用户登录
   - 数据查看
   - 打卡功能
   - 计件录入

## 🔄 更新部署

### 更新代码

```bash
# 在本地构建前端
cd fleet-manager/frontend
npm run build:h5

# 同步到服务器（参考上面的"更新部署"章节）
```

### 更新 APK

```bash
# 在本地构建新 APK
cd fleet-manager/android-offline
./build_apk.sh release

# 上传到服务器下载目录
scp FleetManager-release.apk admin@106.14.95.148:/var/www/fleet-manager/downloads/

# 用户可以通过以下地址下载
# http://106.14.95.148/downloads/FleetManager-release.apk
```

### 更新 WGT 热更新包

```bash
# 上传 WGT 包到服务器
scp FleetManager-v*.wgt admin@106.14.95.148:/var/www/fleet-manager/downloads/

# 或者上传到后端 uploads 目录供热更新 API 使用
scp FleetManager-v*.wgt admin@106.14.95.148:/var/www/fleet-manager/backend/uploads/app_updates/
```

## 🛠️ 故障排除

### 后端服务无法启动

```bash
# 查看后端日志
ssh admin@106.14.95.148 "cat /tmp/backend.log"

# 检查 Python 环境
ssh admin@106.14.95.148 "cd /var/www/fleet-manager/backend && ./venv/bin/python --version"

# 手动启动测试
ssh admin@106.14.95.148 "cd /var/www/fleet-manager/backend && ./venv/bin/python main.py"
```

### Nginx 无法访问

```bash
# 检查 Nginx 配置
ssh admin@106.14.95.148 "sudo nginx -t"

# 重启 Nginx
ssh admin@106.14.95.148 "sudo systemctl restart nginx"

# 查看错误日志
ssh admin@106.14.95.148 "tail -50 /var/log/nginx/error.log"
```

### API 请求失败

```bash
# 检查后端是否运行
ssh admin@106.14.95.148 "curl http://127.0.0.1:8000/api/health"

# 检查 Nginx 代理配置
ssh admin@106.14.95.148 "cat /etc/nginx/sites-enabled/default"

# 查看 Nginx 错误日志
ssh admin@106.14.95.148 "tail -50 /var/log/nginx/fleet-manager-error.log"
```

## 📝 维护建议

### 定期备份

```bash
# 备份数据库
ssh admin@106.14.95.148 "cp /var/www/fleet-manager/backend/data/app.db /var/www/fleet-manager/backend/data/app.db.backup-\$(date +%Y%m%d)"

# 备份上传文件
ssh admin@106.14.95.148 "tar -czf /tmp/uploads-backup-\$(date +%Y%m%d).tar.gz /var/www/fleet-manager/backend/uploads/"
```

### 监控日志

```bash
# 定期清理旧日志
ssh admin@106.14.95.148 "find /var/log/nginx/ -name '*.log' -mtime +30 -delete"
```

### 更新依赖

```bash
# 更新后端依赖（谨慎操作）
ssh admin@106.14.95.148 "cd /var/www/fleet-manager/backend && ./venv/bin/pip install --upgrade -r requirements.txt"
```

## 🔐 安全建议

1. **修改默认密码**
   - 登录系统后修改 admin、manager、driver 的默认密码
   - 修改 `.env` 中的 JWT_SECRET（如需要）

2. **配置防火墙**
   ```bash
   # 只开放必要端口
   ssh admin@106.14.95.148 "sudo ufw allow 22/tcp"   # SSH
   ssh admin@106.14.95.148 "sudo ufw allow 80/tcp"   # HTTP
   ssh admin@106.14.95.148 "sudo ufw allow 443/tcp"  # HTTPS
   ssh admin@106.14.95.148 "sudo ufw enable"
   ```

3. **定期更新系统**
   ```bash
   ssh admin@106.14.95.148 "sudo apt-get update && sudo apt-get upgrade -y"
   ```

4. **配置 HTTPS（推荐）**
   - 使用 Let's Encrypt 免费证书
   - 强制 HTTPS 访问

## 📞 技术支持

如有问题，请查看：
- 项目文档：`README.md`
- 更新日志：`CHANGELOG.md`
- API 文档：http://106.14.95.148/api/docs

---

**最后更新**: 2026-01-08 03:48
