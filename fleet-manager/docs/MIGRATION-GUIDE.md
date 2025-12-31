# 迁移指南

**更新日期**: 2024-12-30  
**状态**: ✅ 推荐迁移

---

## 概述

从主项目（Taro + Supabase）迁移到新框架（FastAPI + UniApp Vue 3）的指南。

## 迁移评估

| 评估项 | 结果 |
|--------|------|
| 可以替代主项目 | ✅ 是 |
| 核心功能完成率 | 100% |
| API 测试通过率 | 99.7% |

---

## 一、环境要求

- Python 3.9+
- Node.js 16+
- Docker 20.10+ (可选)

---

## 二、迁移步骤

### 1. 备份主项目

```bash
git tag -a v1.0-pre-migration -m "迁移前备份"
git push origin v1.0-pre-migration
```

### 2. 配置后端

```bash
cd fleet-manager/backend
python -m venv venv
.\venv\Scripts\activate  # Windows
pip install -r requirements.txt
cp .env.template .env
# 编辑 .env 设置 JWT_SECRET
python main.py
```

### 3. 配置前端

```bash
cd fleet-manager/frontend
npm install
npm run dev:h5
```

### 4. Docker 部署

```bash
cd fleet-manager
docker-compose up -d
```

---

## 三、功能对照

| 功能 | 主项目 | 新框架 | 说明 |
|------|--------|--------|------|
| 用户登录 | Supabase Auth | JWT | 需重设密码 |
| 用户管理 | ✅ | ✅ | 可直接迁移 |
| 仓库管理 | ✅ | ✅ | 可直接迁移 |
| 考勤打卡 | ✅ | ✅ | 可直接迁移 |
| 计件录入 | ✅ | ✅ | 可直接迁移 |
| 请假审批 | ✅ | ✅ | 可直接迁移 |
| 车辆管理 | ✅ | ✅ | 可直接迁移 |
| 通知系统 | ✅ | ✅ | 可直接迁移 |
| 定时通知 | ✅ | ✅ | 可直接迁移 |
| OCR 识别 | ✅ | ✅ | 需配置 API |

---

## 四、服务地址

| 服务 | 地址 |
|------|------|
| 前端 | http://localhost |
| 后端 API | http://localhost:8000 |
| API 文档 | http://localhost:8000/docs |

## 五、测试账号

| 角色 | 账号 | 密码 |
|------|------|------|
| 老板 | boss | boss123 |
| 调度 | dispatcher | dispatch123 |
| 车队长 | manager | manager123 |
| 司机 | driver | driver123 |

---

## 六、回滚方案

```bash
# 停止新服务
docker-compose down

# 恢复主项目
git checkout v1.0-pre-migration
```
