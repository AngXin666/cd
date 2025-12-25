# Fleet Manager 迁移指南

> **文档版本**: v2.0.0
> **更新日期**: 2025-12-24
> **状态**: ✅ 推荐迁移

## 概述

本文档提供从主项目（Taro + Supabase）迁移到新框架（fleet-manager: FastAPI + UniApp Vue 3）的完整指南。

### 迁移评估结论

| 评估项 | 结果 | 说明 |
|--------|------|------|
| **可以替代主项目** | ✅ 是 | 所有核心功能已实现 |
| 核心功能完成率 | 100% | 12/12 模块 |
| 扩展功能完成率 | 100% | 5/5 模块 |
| API 测试通过率 | 100% | 62/62 测试 |
| 前端页面覆盖率 | 100% | 39 个页面 |

---

## 一、迁移前准备

### 1.1 环境要求

#### 新框架运行环境
- **Python**: 3.9+
- **Node.js**: 16+
- **Docker**: 20.10+ (可选，用于容器化部署)
- **SQLite** 或 **PostgreSQL**: 数据库

#### 开发工具
- VS Code 或其他 IDE
- Git
- Postman 或类似 API 测试工具

### 1.2 备份主项目

在开始迁移前，**必须**备份主项目：

```bash
# 创建 Git 标签备份
git tag -a v1.0-pre-migration -m "主项目迁移前备份"
git push origin v1.0-pre-migration

# 创建完整备份
git archive --format=zip HEAD > backup-main-project.zip
```

### 1.3 数据导出

使用提供的数据导出脚本从 Supabase 导出数据：

```bash
# 进入脚本目录
cd fleet-manager/scripts

# 运行数据导出脚本
node export-supabase-data.js
# 或
python export_supabase_data.py
```

导出的数据将保存在 `fleet-manager/data/export/` 目录。

---

## 二、迁移步骤

### 2.1 第一阶段：环境搭建

#### 步骤 1：克隆新框架代码

```bash
# 如果是独立仓库
git clone <repository-url> fleet-manager

# 如果在同一仓库
cd fleet-manager
```

#### 步骤 2：配置后端环境

```bash
# 进入后端目录
cd fleet-manager/backend

# 创建虚拟环境
python -m venv venv

# 激活虚拟环境 (Windows)
.\venv\Scripts\activate

# 激活虚拟环境 (Linux/Mac)
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt
```

#### 步骤 3：配置环境变量

```bash
# 复制环境变量模板
cp .env.template .env

# 编辑 .env 文件
# 设置以下关键配置：
# - JWT_SECRET: JWT 密钥（必须设置强密码）
# - DATABASE_URL: 数据库连接字符串
# - BAIDU_OCR_API_KEY: 百度 OCR API 密钥（可选）
# - BAIDU_OCR_SECRET_KEY: 百度 OCR 密钥（可选）
```

#### 步骤 4：初始化数据库

```bash
# 启动后端服务（会自动创建数据库表）
python main.py
```

#### 步骤 5：配置前端环境

```bash
# 进入前端目录
cd fleet-manager/frontend

# 安装依赖
npm install

# 配置 API 地址（如需要）
# 编辑 src/api/request.ts 中的 baseURL
```

### 2.2 第二阶段：数据迁移

#### 步骤 1：验证导出数据

```bash
# 运行数据验证脚本
cd fleet-manager/scripts
python validate_export.py
```

#### 步骤 2：导入数据到新系统

```bash
# 运行数据导入脚本
python import_to_new_system.py
```

#### 步骤 3：验证数据完整性

```bash
# 运行迁移验证脚本
python verify_migration.py
```

### 2.3 第三阶段：功能验证

#### 步骤 1：启动服务

```bash
# 启动后端
cd fleet-manager/backend
python main.py

# 启动前端（新终端）
cd fleet-manager/frontend
npm run dev:h5
```

#### 步骤 2：运行 API 测试

```bash
# 运行所有 API 测试
cd fleet-manager/backend
python -m pytest test_*.py -v
```

#### 步骤 3：手动功能测试

按照以下清单进行手动测试：

- [ ] 登录功能（各角色）
- [ ] 用户管理（创建、编辑、删除）
- [ ] 仓库管理（创建、分配用户）
- [ ] 考勤打卡（上班、下班）
- [ ] 计件录入（录入、统计）
- [ ] 请假申请（申请、审批）
- [ ] 车辆管理（添加、审核、租赁）
- [ ] 通知系统（发送、接收）
- [ ] 定时通知（创建、执行）
- [ ] 版本管理（发布、检查更新）

### 2.4 第四阶段：生产部署

#### 方式一：Docker 部署（推荐）

```bash
# 进入项目根目录
cd fleet-manager

# 构建并启动服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

#### 方式二：传统部署

```bash
# 后端部署
cd fleet-manager/backend
pip install gunicorn
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8000

# 前端构建
cd fleet-manager/frontend
npm run build:h5

# 使用 Nginx 部署前端静态文件
```

---

## 三、功能对照表

### 3.1 已实现功能（可直接使用）

| 功能 | 主项目 | 新框架 | 迁移说明 |
|------|--------|--------|----------|
| 用户登录 | Supabase Auth | JWT | 需要用户重新设置密码 |
| 用户管理 | ✅ | ✅ | 数据可直接迁移 |
| 仓库管理 | ✅ | ✅ | 数据可直接迁移 |
| 考勤打卡 | ✅ | ✅ | 数据可直接迁移 |
| 计件录入 | ✅ | ✅ | 数据可直接迁移 |
| 请假审批 | ✅ | ✅ | 数据可直接迁移 |
| 车辆管理 | ✅ | ✅ | 数据可直接迁移 |
| 车辆租赁 | ✅ | ✅ | 数据可直接迁移 |
| 补录照片 | ✅ | ✅ | 数据可直接迁移 |
| 通知系统 | ✅ | ✅ | 数据可直接迁移 |
| 通知模板 | ✅ | ✅ | 数据可直接迁移 |
| 定时通知 | ✅ | ✅ | 数据可直接迁移 |
| 热更新 | ✅ | ✅ | 需要重新配置版本 |
| OCR 识别 | ✅ | ✅ | 需要配置 API 密钥 |

### 3.2 新增功能（新框架独有）

| 功能 | 说明 |
|------|------|
| 超级管理员角色 | SUPER_ADMIN，拥有系统最高权限 |
| 调度器管理 | 定时任务调度器的启停和状态监控 |
| 健康检查 API | 服务健康状态检查接口 |
| API 文档 | Swagger UI 和 ReDoc 自动生成 |

### 3.3 未实现功能（可选）

| 功能 | 说明 | 影响 |
|------|------|------|
| 多租户 | 数据隔离 | 单租户场景不需要 |

---

## 四、数据迁移详情

### 4.1 用户数据迁移

```python
# 用户数据映射
主项目字段 -> 新框架字段
id -> id (需要重新生成)
phone -> username (用于登录)
name -> name
phone -> phone
role -> role (需要转换枚举值)
is_active -> is_active
created_at -> created_at
```

**注意事项**：
- 密码需要用户重新设置（Supabase Auth 密码无法迁移）
- 角色枚举值需要转换（大写 -> 小写）

### 4.2 车辆数据迁移

```python
# 车辆数据映射
主项目字段 -> 新框架字段
id -> id
plate_number -> license_plate
brand -> brand
model -> model
color -> color
review_status -> status (需要转换)
# 租赁字段
monthly_rent -> monthly_rent
lease_start_date -> lease_start_date
lease_end_date -> lease_end_date
rent_payment_day -> rent_payment_day
```

### 4.3 其他数据迁移

其他数据表（仓库、考勤、计件、请假、通知等）字段基本一致，可直接迁移。

---

## 五、迁移后验证

### 5.1 功能验证清单

- [ ] 所有角色可以正常登录
- [ ] 用户管理功能正常
- [ ] 仓库管理功能正常
- [ ] 考勤打卡功能正常
- [ ] 计件录入功能正常
- [ ] 请假审批功能正常
- [ ] 车辆管理功能正常
- [ ] 通知系统功能正常
- [ ] 定时通知功能正常
- [ ] 热更新功能正常

### 5.2 性能验证

- [ ] API 响应时间 < 500ms
- [ ] 页面加载时间 < 3s
- [ ] 并发用户支持 > 100

### 5.3 安全验证

- [ ] JWT Token 正确验证
- [ ] 权限控制正确
- [ ] 敏感数据加密

---

## 六、回滚方案

如果迁移过程中出现问题，可以按以下步骤回滚：

### 6.1 停止新框架服务

```bash
# Docker 部署
docker-compose down

# 传统部署
# 停止后端和前端服务
```

### 6.2 恢复主项目

```bash
# 切换回主项目代码
git checkout v1.0-pre-migration

# 或从备份恢复
unzip backup-main-project.zip -d restored-project
```

### 6.3 恢复数据库

如果使用了新数据库，主项目的 Supabase 数据不受影响，可以直接使用。

---

## 七、常见问题

### Q1: 用户密码如何处理？

**A**: 由于 Supabase Auth 的密码无法导出，用户需要在新系统中重新设置密码。建议：
1. 管理员为用户设置初始密码
2. 用户首次登录后强制修改密码

### Q2: 图片和文件如何迁移？

**A**: 如果图片存储在 Supabase Storage：
1. 导出所有图片文件
2. 上传到新的存储服务（如本地存储或其他云存储）
3. 更新数据库中的 URL 引用

### Q3: 实时通知如何迁移？

**A**: 新框架使用 SSE 替代 Supabase Realtime：
- 前端已适配 SSE 接口
- 无需额外配置

### Q4: 多租户功能怎么办？

**A**: 新框架暂不支持多租户。如果需要：
1. 单租户场景：直接使用，无影响
2. 多租户场景：需要自行扩展实现

---

## 八、技术支持

如果在迁移过程中遇到问题：

1. 查看 `fleet-manager/docs/` 目录下的文档
2. 查看 API 文档：`http://localhost:8000/docs`
3. 查看测试报告：`fleet-manager/docs/TEST-REPORT.md`
4. 查看功能对比：`fleet-manager/docs/FEATURE-COMPARISON-REPORT.md`

---

## 九、迁移路线图

### 阶段一：准备（1-2天）
- [ ] 备份主项目
- [ ] 导出数据
- [ ] 搭建新框架环境

### 阶段二：测试（2-3天）
- [ ] 导入数据
- [ ] 运行测试
- [ ] 功能验证

### 阶段三：部署（1天）
- [ ] 生产环境部署
- [ ] 配置域名和 SSL
- [ ] 性能测试

### 阶段四：切换（1天）
- [ ] 通知用户
- [ ] 切换 DNS
- [ ] 监控运行状态

### 阶段五：清理（可选）
- [ ] 确认新系统稳定运行
- [ ] 清理主项目代码
- [ ] 归档备份

---

*文档生成工具：Kiro AI Assistant*
*最后更新：2025-12-24*
