# Fleet Manager 迁移指南

> 版本: v1.0.0
> 日期: 2024-12-23

## 概述

本文档提供从主项目（Taro + Supabase）迁移到新框架（FastAPI + UniApp Vue 3）的详细指南。

## 迁移评估

### 是否可以替代主项目？

**结论：✅ 是，新框架可以完全替代主项目**

根据功能对比报告，新框架已实现：
- 100% 的核心功能
- 100% 的扩展功能
- 5 种完整的角色权限系统
- 50+ 个 API 接口
- 35+ 个前端页面

### 迁移优势

| 方面 | 主项目 | 新框架 | 优势 |
|------|--------|--------|------|
| 代码量 | 50000+ 行 | ~7700 行 | 减少 85% |
| 后端文件数 | 644+ | ~10 | 减少 98% |
| 前端页面数 | 60+ | 33 | 减少 45% |
| 部署复杂度 | 高（Supabase + Capacitor） | 低（Docker） | 简化部署 |
| 维护成本 | 高 | 低 | 降低维护成本 |
| 自主可控 | 依赖 Supabase | 完全自主 | 提高可控性 |

## 迁移前准备

### 1. 环境要求

#### 服务器要求
- CPU: 2 核以上
- 内存: 4GB 以上
- 磁盘: 20GB 以上
- 操作系统: Linux (推荐 Ubuntu 20.04+) / Windows Server

#### 软件要求
- Docker 20.10+
- Docker Compose 2.0+
- Git

### 2. 数据备份

在迁移前，务必备份主项目的所有数据：

```bash
# 导出 Supabase 数据
cd fleet-manager/scripts
python export_supabase_data.py

# 验证导出数据
python validate_export.py
```

### 3. 配置准备

准备新框架的配置文件：

```bash
cd fleet-manager

# 复制环境变量模板
cp .env.template .env

# 编辑配置
# 必须设置的配置项：
# - JWT_SECRET: 使用强随机字符串（至少 32 位）
# - POSTGRES_PASSWORD: 数据库密码
```

## 迁移步骤

### 阶段 1：部署新框架

#### 步骤 1.1：克隆代码

```bash
git clone <repository-url>
cd fleet-manager
```

#### 步骤 1.2：配置环境变量

```bash
cp .env.template .env
# 编辑 .env 文件，设置必要的配置
```

#### 步骤 1.3：启动服务

```bash
# 开发环境
docker-compose up -d

# 生产环境
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

#### 步骤 1.4：验证部署

```bash
# 检查服务状态
docker-compose ps

# 测试健康检查
curl http://localhost:8000/api/health

# 访问 API 文档
# http://localhost:8000/docs
```

### 阶段 2：数据迁移

#### 步骤 2.1：导出主项目数据

```bash
cd fleet-manager/scripts

# 配置 Supabase 连接
export SUPABASE_URL="your-supabase-url"
export SUPABASE_KEY="your-supabase-key"

# 导出数据
python export_supabase_data.py
```

#### 步骤 2.2：验证导出数据

```bash
python validate_export.py
```

#### 步骤 2.3：导入到新系统

```bash
python import_to_new_system.py
```

#### 步骤 2.4：验证数据迁移

```bash
python verify_migration.py
```

### 阶段 3：功能验证

#### 步骤 3.1：API 功能测试

```bash
cd fleet-manager/backend

# 运行集成测试
python test_integration.py
```

#### 步骤 3.2：前端功能测试

1. 访问前端页面：http://localhost:5173
2. 使用测试账号登录
3. 验证各角色功能

#### 步骤 3.3：Docker 部署测试

```bash
# Windows
.\scripts\test-docker-deployment.ps1

# Linux/Mac
./scripts/test-docker-deployment.sh
```

### 阶段 4：切换生产环境

#### 步骤 4.1：配置 SSL 证书

```bash
# 将 SSL 证书放入 nginx/ssl/ 目录
cp /path/to/fullchain.pem nginx/ssl/
cp /path/to/privkey.pem nginx/ssl/
```

#### 步骤 4.2：配置域名

编辑 `nginx/nginx.prod.conf`，设置正确的域名。

#### 步骤 4.3：启动生产环境

```bash
./scripts/deploy.sh prod
```

#### 步骤 4.4：DNS 切换

将域名 DNS 指向新服务器。

### 阶段 5：清理主项目（可选）

在确认新框架运行稳定后，可以考虑清理主项目代码。

#### 可清理的目录

```
src/                    # 主项目前端代码
supabase/              # Supabase 配置和迁移
config/                # 主项目配置
e2e/                   # 主项目 E2E 测试
```

#### 建议保留的目录

```
fleet-manager/         # 新框架代码
docs/                  # 文档
scripts/               # 通用脚本
```

## 迁移注意事项

### 1. 数据兼容性

| 数据类型 | 注意事项 |
|---------|---------|
| 用户数据 | 密码需要重新设置或迁移哈希值 |
| 车辆数据 | 确保车牌号唯一性 |
| 考勤数据 | 日期格式需要统一 |
| 通知数据 | 可选择性迁移 |

### 2. 功能差异

| 功能 | 主项目 | 新框架 | 处理方式 |
|------|--------|--------|---------|
| 实时通知 | Supabase Realtime | SSE | 自动适配 |
| 文件存储 | Supabase Storage | 本地/OSS | 需要迁移文件 |
| 认证方式 | Supabase Auth | JWT | 用户需重新登录 |

### 3. 回滚方案

如果迁移过程中出现问题，可以按以下步骤回滚：

1. 停止新框架服务
2. 恢复 DNS 指向原服务器
3. 确认主项目服务正常
4. 分析问题原因，修复后重新迁移

## 迁移时间表建议

| 阶段 | 时间 | 任务 |
|------|------|------|
| 准备阶段 | 1-2 天 | 环境准备、数据备份 |
| 部署阶段 | 1 天 | 部署新框架、配置环境 |
| 迁移阶段 | 1-2 天 | 数据迁移、验证 |
| 测试阶段 | 2-3 天 | 功能测试、性能测试 |
| 切换阶段 | 1 天 | 生产环境切换 |
| 观察阶段 | 3-7 天 | 监控运行状态 |

**总计：约 10-16 天**

## 常见问题

### Q1: 迁移后用户需要重新注册吗？

不需要。用户数据会被迁移，但用户需要重新登录（因为认证方式改变）。如果需要保留密码，需要确保密码哈希算法兼容。

### Q2: 历史数据会丢失吗？

不会。所有历史数据（考勤、计件、请假、车辆等）都会被迁移到新系统。

### Q3: 迁移期间系统可以正常使用吗？

建议在业务低峰期进行迁移，迁移期间可能需要短暂停机（约 1-2 小时）。

### Q4: 如果迁移失败怎么办？

我们提供了完整的回滚方案，可以快速恢复到主项目。建议在迁移前做好完整备份。

### Q5: 新框架的性能如何？

新框架使用 FastAPI，性能优于原有的 Supabase 方案。同时代码量减少 85%，维护成本大幅降低。

## 技术支持

如果在迁移过程中遇到问题，请：

1. 查看日志：`docker-compose logs -f`
2. 检查健康状态：`curl http://localhost:8000/api/health`
3. 参考文档：`fleet-manager/docs/`

## 附录

### A. 默认账号

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 超级管理员 | superadmin | super123 |
| 老板 | boss | boss123 |
| 调度 | dispatcher | dispatch123 |
| 车队长 | manager | manager123 |
| 司机 | driver | driver123 |

### B. 端口说明

| 服务 | 端口 | 说明 |
|------|------|------|
| 前端 | 80/443 | Nginx 反向代理 |
| 后端 API | 8000 | FastAPI 服务 |
| 数据库 | 5432 | PostgreSQL |

### C. 相关文档

- [功能对比报告](./FEATURE-COMPARISON-REPORT.md)
- [后端开发指南](../backend/README.md)
- [前端开发指南](../frontend/README.md)
- [部署脚本说明](../scripts/README.md)

---

*文档生成工具：Kiro AI Assistant*
*最后更新：2024-12-23*
