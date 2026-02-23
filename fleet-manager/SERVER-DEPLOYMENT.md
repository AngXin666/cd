# 车队管家服务器部署文档

## 服务器信息

- **服务器 IP**: 45.197.148.64
- **操作系统**: CentOS 7
- **后端 API**: http://45.197.148.64:8000
- **数据库**: PostgreSQL 9.2（本地）

## 已部署服务

### 1. 后端服务
- **路径**: `/opt/fleet-manager/backend`
- **Python**: 3.10.13
- **进程管理**: Supervisor
- **自动启动**: 已启用
- **日志文件**: `/var/log/fleet-manager-backend.log`

### 2. 数据库
- **类型**: PostgreSQL 9.2
- **数据库名**: fleet_manager
- **用户名**: fleet_user
- **密码**: fleet_password_2026
- **自动启动**: 已启用

## 测试账号

| 角色 | 账号 | 密码 |
|------|------|------|
| 老板 | admin | admin123 |
| 调度 | dispatcher | dispatch123 |
| 车队长 | manager | manager123 |
| 司机 | driver | driver123 |

## 自动化任务

### 完整备份（数据库 + 文件 + 配置）
- **频率**: 每天凌晨 2:00
- **保留时间**: 7 天
- **备份目录**: `/opt/fleet-manager/backups`
- **脚本**: `/opt/fleet-manager/full-backup.sh`
- **备份内容**:
  - 数据库（所有业务数据）
  - 上传文件（图片、文档等）
  - 配置文件（.env、supervisor、postgresql）

### 系统监控
- **频率**: 每小时
- **监控项目**: 后端服务、数据库、磁盘空间、内存使用
- **日志文件**: `/var/log/fleet-manager-monitor.log`
- **脚本**: `/opt/fleet-manager/monitor.sh`

## 服务管理命令

使用 `fleet-manager` 命令管理服务：

```bash
# 查看服务状态
fleet-manager status

# 启动服务
fleet-manager start

# 停止服务
fleet-manager stop

# 重启服务
fleet-manager restart

# 查看日志
fleet-manager logs

# 立即备份数据库
fleet-manager backup

# 执行系统检查
fleet-manager monitor
```

## 数据库管理

### 完整备份（推荐）
```bash
# 立即执行完整备份（数据库 + 文件 + 配置）
/opt/fleet-manager/full-backup.sh
```

### 查看备份文件
```bash
# 查看所有完整备份
ls -lh /opt/fleet-manager/backups/full_*.tar.gz

# 查看备份详情
tar -tzf /opt/fleet-manager/backups/full_YYYYMMDD_HHMMSS.tar.gz
```

### 恢复完整备份
```bash
# 查看可用备份
ls -lh /opt/fleet-manager/backups/full_*.tar.gz

# 恢复指定备份（会提示确认）
/opt/fleet-manager/full-restore.sh /opt/fleet-manager/backups/full_YYYYMMDD_HHMMSS.tar.gz
```

### 仅备份数据库
```bash
/opt/fleet-manager/backup-db.sh
```

### 仅恢复数据库
```bash
/opt/fleet-manager/restore-db.sh /opt/fleet-manager/backups/fleet_manager_YYYYMMDD_HHMMSS.sql.gz
```

### 直接访问数据库
```bash
export PGPASSWORD='fleet_password_2026'
psql -U fleet_user -h localhost -d fleet_manager
```

## 性能优化配置

### PostgreSQL 优化
- **shared_buffers**: 128MB
- **effective_cache_size**: 512MB
- **work_mem**: 4MB
- **max_connections**: 50
- **慢查询日志**: 记录超过 1 秒的查询

### 后端优化
- **Workers**: 2
- **Timeout**: 60 秒
- **Keepalive**: 5 秒

## 日志文件位置

- 后端日志: `/var/log/fleet-manager-backend.log`
- 监控日志: `/var/log/fleet-manager-monitor.log`
- 备份日志: `/opt/fleet-manager/backups/backup.log`
- PostgreSQL 日志: `/var/lib/pgsql/data/pg_log/`

## 故障排查

### 后端服务无响应
```bash
# 查看服务状态
fleet-manager status

# 查看日志
fleet-manager logs

# 重启服务
fleet-manager restart
```

### 数据库连接失败
```bash
# 检查数据库状态
systemctl status postgresql

# 重启数据库
systemctl restart postgresql

# 检查连接
export PGPASSWORD='fleet_password_2026'
psql -U fleet_user -h localhost -d fleet_manager -c "SELECT 1"
```

### 磁盘空间不足
```bash
# 查看磁盘使用
df -h

# 清理旧备份（保留最近 7 天）
find /opt/fleet-manager/backups -name "*.sql.gz" -mtime +7 -delete

# 清理旧日志
find /var/log -name "*.log" -mtime +30 -delete
```

## 安全建议

1. **修改默认密码**: 登录后立即修改所有测试账号密码
2. **配置防火墙**: 只开放必要端口（8000）
3. **定期更新**: 定期更新系统和应用
4. **监控日志**: 定期检查日志文件，发现异常及时处理
5. **备份验证**: 定期验证备份文件可用性

## 升级部署

### 更新后端代码
```bash
# 1. 备份数据库
fleet-manager backup

# 2. 停止服务
fleet-manager stop

# 3. 更新代码
cd /opt/fleet-manager/backend
# 上传新代码...

# 4. 安装依赖（如有新依赖）
source venv/bin/activate
pip install -r requirements.txt

# 5. 启动服务
fleet-manager start

# 6. 检查状态
fleet-manager status
```

## 联系信息

如有问题，请联系系统管理员。

---

**部署日期**: 2026-02-21  
**文档版本**: 1.0


## 部署完成

服务已成功部署并运行在：
- **前端应用**: http://45.197.148.64/
- **后端 API**: http://45.197.148.64:8000
- **API 文档**: http://45.197.148.64:8000/docs

## 重要修复记录

### 2026-02-21: 修复老板端和调度端看不到司机数据问题

**问题描述**：
老板和调度登录后看不到司机数据，因为前端使用 `getWarehouseUsers(warehouseId)` API 加载司机列表，该 API 只返回分配到该仓库的用户。但老板和调度应该能看到所有司机，不管他们是否分配到仓库，这样才能给他们分配仓库。

**修复方案**：
修改前端 `loadBossHomeData` 和 `loadDriverStats` 函数，改用 `getUsers()` API 获取所有用户，然后过滤出司机角色。这样老板和调度就能看到所有司机了。

**修改文件**：
- `fleet-manager/frontend/src/pages/boss/index/index.vue`

**部署步骤**：
1. 重新构建前端：`npm run build:h5`
2. 上传到服务器：`scp frontend-dist.tar.gz root@45.197.148.64:/tmp/`
3. 解压到前端目录：`tar -xzf /tmp/frontend-dist.tar.gz -C /opt/fleet-manager/frontend`
4. 配置 Nginx 反向代理（已完成）
5. 重启 Nginx：`systemctl restart rh-nginx120-nginx`

### Nginx 配置

前端通过 Nginx 提供服务，配置文件位于：`/etc/opt/rh/rh-nginx120/nginx/conf.d/fleet-manager.conf`

```nginx
server {
    listen 80;
    server_name _;
    
    # 前端静态文件
    location / {
        root /opt/fleet-manager/frontend;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
    
    # 后端 API 代理
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # SSE 连接
    location /sse {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # SSE 特殊配置
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
        chunked_transfer_encoding off;
    }
    
    # 上传文件
    location /uploads/ {
        alias /opt/fleet-manager/backend/uploads/;
    }
}
```

Nginx 管理命令：
```bash
# 启动 Nginx
systemctl start rh-nginx120-nginx

# 停止 Nginx
systemctl stop rh-nginx120-nginx

# 重启 Nginx
systemctl restart rh-nginx120-nginx

# 查看状态
systemctl status rh-nginx120-nginx

# 测试配置
/opt/rh/rh-nginx120/root/usr/sbin/nginx -t
```
