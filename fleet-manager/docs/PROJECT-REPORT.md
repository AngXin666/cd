# 车队管家 (Fleet Manager) - 项目详细报告

> **生成日期**: 2025-12-29  
> **版本**: v1.0.0  
> **状态**: ✅ 生产就绪

---

## 一、项目概述

### 1.1 项目简介

车队管家是一个基于 **FastAPI + UniApp** 的车队管理系统，用于管理司机、车辆、考勤、计件、请假等业务。系统支持多端部署（H5、微信小程序、Android APP），采用前后端分离架构。

### 1.2 项目背景

本项目是对原有 Taro + Supabase 架构的重构，新框架更加简洁高效：

| 指标 | 原项目 | 新项目 | 减少比例 |
|------|--------|--------|---------|
| 后端文件数 | 644+ | ~10 | 98% |
| 前端页面数 | 60+ | 35 | 42% |
| 代码行数 | 50000+ | ~8000 | 84% |

### 1.3 功能完成度

| 类别 | 完成率 |
|------|--------|
| 核心功能 | 100% |
| 扩展功能 | 100% |
| API 接口 | 100% |
| 前端页面 | 100% |

---

## 二、技术架构

### 2.1 技术栈总览

| 层级 | 技术 | 版本 |
|------|------|------|
| **后端框架** | Python FastAPI | ≥0.100.0 |
| **后端 ORM** | SQLModel | ≥0.0.14 |
| **前端框架** | UniApp (Vue 3) | 3.0.0 |
| **前端语言** | TypeScript | ^5.4.5 |
| **状态管理** | Pinia | ^2.1.7 |
| **数据库** | SQLite（开发）/ PostgreSQL（生产） | - |
| **认证方式** | JWT Token | - |
| **实时通信** | SSE (Server-Sent Events) | - |
| **部署方式** | Docker | - |

### 2.2 后端技术详情

#### 核心依赖
```
fastapi>=0.100.0          # Web 框架
uvicorn[standard]>=0.23.0 # ASGI 服务器
sqlmodel>=0.0.14          # ORM（SQLAlchemy + Pydantic）
python-jose[cryptography] # JWT 认证
passlib[bcrypt]           # 密码加密
pydantic>=2.0.0           # 数据验证
apscheduler>=3.10.0       # 定时任务调度
baidu-aip>=4.16.0         # 百度 OCR 识别
psycopg2-binary>=2.9.0    # PostgreSQL 驱动
```

#### 后端架构
```
fleet-manager/backend/
├── main.py           # 应用入口 + 所有 API 路由（4850+ 行）
├── models.py         # 数据库模型（15 个表）
├── schemas.py        # 请求/响应模型
├── auth.py           # JWT 认证 + 权限控制
├── database.py       # 数据库连接配置
├── crud.py           # CRUD 操作封装
├── config.py         # 配置管理
├── ocr.py            # OCR 驾驶证识别
├── events.py         # SSE 事件触发器
├── scheduler.py      # 定时任务调度器
└── requirements.txt  # Python 依赖
```

### 2.3 前端技术详情

#### 核心依赖
```json
{
  "@dcloudio/uni-app": "3.0.0",      // UniApp 核心
  "vue": "^3.4.21",                   // Vue 3
  "pinia": "^2.1.7",                  // 状态管理
  "sass": "^1.75.0",                  // 样式预处理
  "typescript": "^5.4.5",             // TypeScript
  "vitest": "^2.1.0",                 // 测试框架
  "fast-check": "^3.22.0"             // 属性测试
}
```

#### 前端架构
```
fleet-manager/frontend/src/
├── api/              # API 请求封装
├── components/       # 公共组件（19 个）
├── pages/            # 页面组件（35+ 个）
│   ├── boss/         # 老板端页面（17 个模块）
│   ├── driver/       # 司机端页面（7 个模块）
│   ├── manager/      # 车队长端页面（9 个模块）
│   ├── login/        # 登录页
│   ├── notifications/# 通知中心
│   └── profile/      # 个人中心
├── store/            # Pinia 状态管理
├── types/            # TypeScript 类型定义
├── utils/            # 工具函数（25+ 个模块）
└── styles/           # 全局样式
```

---

## 三、数据库设计

### 3.1 数据表总览

系统包含 **15 个核心数据表**：

| 表名 | 说明 | 主要字段 |
|------|------|----------|
| `users` | 用户表 | id, username, name, phone, role, is_active |
| `warehouses` | 仓库表 | id, name, address, is_active |
| `warehouse_assignments` | 用户-仓库关联 | user_id, warehouse_id |
| `attendance` | 考勤记录 | user_id, work_date, clock_in, clock_out |
| `piece_work_categories` | 计件分类 | name, unit_price, upstairs_price, sorting_price |
| `piece_work_records` | 计件记录 | user_id, category_id, warehouse_id, quantity, amount |
| `leave_applications` | 请假申请 | user_id, leave_type, start_date, end_date, status |
| `vehicles` | 车辆信息 | user_id, license_plate, brand, model, status |
| `vehicle_documents` | 车辆证件 | vehicle_id, doc_type, file_url, expiry_date |
| `vehicle_history` | 车辆使用历史 | vehicle_id, user_id, action_type, photos |
| `notifications` | 通知消息 | user_id, title, content, is_read |
| `notification_templates` | 通知模板 | name, title, content, variables |
| `scheduled_notifications` | 定时通知 | template_id, scheduled_time, repeat_type |
| `app_versions` | 应用版本 | version, update_type, download_url |

### 3.2 用户角色枚举

```python
class UserRole(str, Enum):
    DRIVER = "driver"           # 司机
    MANAGER = "manager"         # 车队长
    PEER_ADMIN = "peer_admin"   # 调度
    BOSS = "boss"               # 老板
    SUPER_ADMIN = "super_admin" # 超级管理员
```

### 3.3 关键枚举类型

| 枚举 | 值 | 说明 |
|------|-----|------|
| `LeaveType` | leave, resign | 请假类型 |
| `LeaveStatus` | pending, approved, rejected | 请假状态 |
| `VehicleStatus` | active, returned, reviewing | 车辆状态 |
| `DocumentType` | license, registration, insurance | 证件类型 |
| `UpdateType` | optional, recommended, required | 更新类型 |

---

## 四、功能模块详解

### 4.1 角色权限体系

| 角色 | 权限范围 | 可访问功能 |
|------|----------|------------|
| **超级管理员** | 系统最高权限 | 所有功能 + 管理老板账号 |
| **老板** | 全局管理 | 用户管理、仓库管理、车辆审核、版本管理、权限配置 |
| **调度** | 协助管理 | 与老板类似的管理权限 |
| **车队长** | 仓库级管理 | 司机管理、请假审批、计件审批、数据统计、发送通知 |
| **司机** | 个人操作 | 打卡、计件、请假、车辆管理 |

### 4.2 司机端功能（7 个模块）

#### 4.2.1 打卡签到 (`/driver/clock`)
- ✅ 上班打卡（记录签到时间）
- ✅ 下班打卡（记录签退时间、计算工时）
- ✅ 今日打卡状态查询
- ✅ 打卡时间显示

#### 4.2.2 考勤记录 (`/driver/attendance`)
- ✅ 查看个人考勤历史
- ✅ 按日期范围筛选
- ✅ 工时统计

#### 4.2.3 计件录入 (`/driver/piece-work`)
- ✅ 选择仓库和品类
- ✅ 录入计件数量
- ✅ 自动计算金额（支持基础单价、上楼单价、分拣单价）
- ✅ 查看历史计件记录
- ✅ 实时数据同步（SSE）

#### 4.2.4 请假申请 (`/driver/leave`)
- ✅ 提交请假申请
- ✅ 提交离职申请
- ✅ 查看申请状态
- ✅ 审批结果实时通知（SSE）

#### 4.2.5 车辆管理 (`/driver/vehicle`)
- ✅ 添加车辆信息
- ✅ 上传车辆照片（7 张基本照片）
- ✅ 上传车损照片（最多 9 张）
- ✅ 提车/还车操作
- ✅ 车辆证件管理（驾驶证、行驶证、保险）
- ✅ 租赁信息管理
- ✅ 车辆审核状态查看
- ✅ 审核结果实时通知（SSE）

#### 4.2.6 仓库统计 (`/driver/warehouse-stats`)
- ✅ 查看所属仓库的统计数据
- ✅ 计件汇总

#### 4.2.7 首页仪表盘 (`/driver/index`)
- ✅ 今日打卡状态
- ✅ 本月计件统计
- ✅ 快捷操作入口

### 4.3 车队长端功能（9 个模块）

#### 4.3.1 首页仪表盘 (`/manager/index`)
- ✅ 仓库概览
- ✅ 司机统计
- ✅ 待审批数量
- ✅ 快捷操作入口

#### 4.3.2 司机管理 (`/manager/drivers`)
- ✅ 查看所辖仓库的司机列表
- ✅ 仓库切换器（Swiper 滑动切换）
- ✅ 司机详细信息展示（年龄、驾龄、准驾车型等）
- ✅ 实名认证状态标签
- ✅ 司机类型标签（新带车/带车/新纯/纯司机）
- ✅ 添加司机功能
- ✅ 仓库分配功能
- ✅ 司机类型切换
- ✅ 拼音首字母搜索
- ✅ 发送实名提醒通知

#### 4.3.3 员工管理 (`/manager/staff`)
- ✅ 司机信息编辑
- ✅ 仓库分配
- ✅ 搜索功能

#### 4.3.4 请假审批 (`/manager/approval`)
- ✅ 查看待审批列表
- ✅ 批准/拒绝请假
- ✅ 添加审批备注
- ✅ 新申请实时通知（SSE）

#### 4.3.5 计件管理 (`/manager/piece-work`)
- ✅ 查看仓库计件记录
- ✅ 按日期/司机筛选
- ✅ 计件统计汇总
- ✅ 完成率状态显示
- ✅ 新记录实时通知（SSE）

#### 4.3.6 数据统计 (`/manager/stats`)
- ✅ 仓库数据汇总
- ✅ 司机排名
- ✅ 多字段排序（按金额/数量/日期）

#### 4.3.7 仓库品类配置 (`/manager/warehouse-categories`)
- ✅ 品类列表管理
- ✅ 添加品类（支持多种单价）
- ✅ 编辑品类
- ✅ 删除品类（有计件记录时禁止删除）

#### 4.3.8 车辆管理 (`/manager/vehicle`)
- ✅ 查看仓库车辆列表
- ✅ 车辆详情查看

#### 4.3.9 通知管理 (`/manager/notify`)
- ✅ 发送通知给司机
- ✅ 使用通知模板

### 4.4 老板端功能（17 个模块）

#### 4.4.1 首页仪表盘 (`/boss/index`)
- ✅ 全局数据概览
- ✅ 各仓库统计
- ✅ 快捷操作入口

#### 4.4.2 用户管理 (`/boss/users`)
- ✅ 用户列表（支持角色筛选）
- ✅ 标签页切换（司机管理/管理员管理）
- ✅ 仓库切换器（Swiper）
- ✅ 创建用户（司机/车队长/调度/老板）
- ✅ 编辑用户信息
- ✅ 启用/禁用用户
- ✅ 删除用户
- ✅ 仓库分配
- ✅ 司机类型切换
- ✅ 拼音首字母搜索
- ✅ 实名认证标签
- ✅ 司机类型标签

#### 4.4.3 员工管理 (`/boss/staff`)
- ✅ 全局员工列表
- ✅ 员工信息编辑

#### 4.4.4 仓库管理 (`/boss/warehouses`)
- ✅ 仓库列表
- ✅ 创建仓库
- ✅ 编辑仓库
- ✅ 删除仓库
- ✅ 启用/禁用仓库

#### 4.4.5 仓库分配 (`/boss/assignments`)
- ✅ 查看用户仓库分配
- ✅ 批量分配用户到仓库

#### 4.4.6 车辆审核 (`/boss/vehicles`)
- ✅ 待审核车辆列表
- ✅ 审核通过/拒绝
- ✅ 查看车辆详情和照片

#### 4.4.7 车辆管理 (`/boss/vehicle`)
- ✅ 全局车辆列表
- ✅ 车辆详情查看
- ✅ 车辆使用历史

#### 4.4.8 请假审批 (`/boss/approval`)
- ✅ 全局待审批列表
- ✅ 批准/拒绝请假

#### 4.4.9 考勤管理 (`/boss/attendance`)
- ✅ 全局考勤记录
- ✅ 按日期/用户筛选

#### 4.4.10 计件管理 (`/boss/piece-work`)
- ✅ 全局计件记录
- ✅ 按仓库/日期/用户筛选

#### 4.4.11 品类管理 (`/boss/categories`)
- ✅ 全局品类列表
- ✅ 品类 CRUD 操作

#### 4.4.12 数据统计 (`/boss/stats`)
- ✅ 全局数据汇总
- ✅ 多维度统计分析

#### 4.4.13 权限配置 (`/boss/permissions`)
- ✅ 车队长权限开关
- ✅ 权限变更实时通知（SSE）

#### 4.4.14 通知模板 (`/boss/templates`)
- ✅ 模板列表
- ✅ 创建模板（支持变量）
- ✅ 编辑模板
- ✅ 删除模板
- ✅ 模板预览

#### 4.4.15 定时通知 (`/boss/scheduled`)
- ✅ 定时任务列表
- ✅ 创建定时通知
- ✅ 支持一次性/每天/每周/每月重复
- ✅ 取消定时任务
- ✅ 查看执行状态

#### 4.4.16 版本管理 (`/boss/versions`)
- ✅ 版本列表
- ✅ 发布新版本
- ✅ 设置更新类型（可选/推荐/强制）
- ✅ 热更新支持

#### 4.4.17 管理员档案 (`/boss/admin-profile`)
- ✅ 查看管理员详细信息

### 4.5 公共功能

#### 4.5.1 登录认证 (`/login`)
- ✅ 用户名密码登录
- ✅ JWT Token 认证
- ✅ 自动登录（Token 持久化）

#### 4.5.2 通知中心 (`/notifications`)
- ✅ 通知列表
- ✅ 未读数量显示
- ✅ 标记已读
- ✅ 实时通知推送（SSE）

#### 4.5.3 个人中心 (`/profile`)
- ✅ 个人信息展示
- ✅ 修改密码
- ✅ 退出登录

---

## 五、API 接口清单

### 5.1 认证 API
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/login` | 用户登录 |
| GET | `/api/auth/me` | 获取当前用户信息 |
| PUT | `/api/auth/password` | 修改密码 |

### 5.2 用户 API
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/users` | 获取用户列表 |
| POST | `/api/users` | 创建用户 |
| GET | `/api/users/{id}` | 获取用户详情 |
| PUT | `/api/users/{id}` | 更新用户信息 |
| DELETE | `/api/users/{id}` | 删除用户 |
| PUT | `/api/users/{id}/driver-info` | 更新司机信息 |
| POST | `/api/users/{id}/warehouses` | 分配仓库 |
| GET | `/api/users/{id}/warehouses` | 获取用户仓库 |

### 5.3 仓库 API
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/warehouses` | 获取仓库列表 |
| POST | `/api/warehouses` | 创建仓库 |
| GET | `/api/warehouses/{id}` | 获取仓库详情 |
| PUT | `/api/warehouses/{id}` | 更新仓库 |
| DELETE | `/api/warehouses/{id}` | 删除仓库 |
| POST | `/api/warehouses/{id}/assign` | 分配用户到仓库 |
| GET | `/api/warehouses/{id}/users` | 获取仓库用户 |
| GET | `/api/warehouses/{id}/vehicles` | 获取仓库车辆 |

### 5.4 考勤 API
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/attendance/clock-in` | 上班打卡 |
| POST | `/api/attendance/clock-out` | 下班打卡 |
| GET | `/api/attendance/today` | 获取今日打卡状态 |
| GET | `/api/attendance` | 获取考勤记录 |

### 5.5 计件 API
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/piece-work/categories` | 获取计件分类 |
| POST | `/api/piece-work/categories` | 创建分类 |
| PUT | `/api/piece-work/categories/{id}` | 更新分类 |
| DELETE | `/api/piece-work/categories/{id}` | 删除分类 |
| GET | `/api/piece-work/records` | 获取计件记录 |
| POST | `/api/piece-work/records` | 创建计件记录 |
| PUT | `/api/piece-work/records/{id}` | 更新记录 |
| DELETE | `/api/piece-work/records/{id}` | 删除记录 |
| GET | `/api/piece-work/stats` | 获取计件统计 |

### 5.6 请假 API
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/leave` | 获取请假列表 |
| POST | `/api/leave` | 提交请假申请 |
| GET | `/api/leave/{id}` | 获取请假详情 |
| PUT | `/api/leave/{id}/approve` | 审批请假 |

### 5.7 车辆 API
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/vehicles` | 获取车辆列表 |
| POST | `/api/vehicles` | 添加车辆 |
| GET | `/api/vehicles/{id}` | 获取车辆详情 |
| PUT | `/api/vehicles/{id}` | 更新车辆 |
| DELETE | `/api/vehicles/{id}` | 删除车辆 |
| PUT | `/api/vehicles/{id}/review` | 审核车辆 |
| PUT | `/api/vehicles/{id}/return` | 还车操作 |
| GET | `/api/vehicles/{id}/lease` | 获取租赁信息 |
| PUT | `/api/vehicles/{id}/lease` | 更新租赁信息 |
| POST | `/api/vehicles/{id}/supplement-photo` | 补录照片 |
| GET | `/api/vehicles/{id}/supplemented-photos` | 获取补录照片 |
| GET | `/api/vehicles/{id}/history` | 获取使用历史 |
| GET | `/api/vehicles/{id}/documents` | 获取车辆证件 |
| POST | `/api/vehicles/{id}/documents` | 上传证件 |

### 5.8 通知 API
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/notifications` | 获取通知列表 |
| POST | `/api/notifications` | 发送通知 |
| PUT | `/api/notifications/{id}/read` | 标记已读 |
| GET | `/api/notifications/unread-count` | 获取未读数量 |
| GET | `/api/notifications/stream` | SSE 实时通知流 |

### 5.9 通知模板 API
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/notification-templates` | 获取模板列表 |
| POST | `/api/notification-templates` | 创建模板 |
| GET | `/api/notification-templates/{id}` | 获取模板详情 |
| PUT | `/api/notification-templates/{id}` | 更新模板 |
| DELETE | `/api/notification-templates/{id}` | 删除模板 |
| POST | `/api/notification-templates/preview` | 预览模板 |

### 5.10 定时通知 API
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/scheduled-notifications` | 获取定时任务列表 |
| POST | `/api/scheduled-notifications` | 创建定时任务 |
| GET | `/api/scheduled-notifications/{id}` | 获取任务详情 |
| PUT | `/api/scheduled-notifications/{id}` | 更新任务 |
| DELETE | `/api/scheduled-notifications/{id}` | 删除任务 |
| PUT | `/api/scheduled-notifications/{id}/cancel` | 取消任务 |
| GET | `/api/scheduler/status` | 获取调度器状态 |

### 5.11 版本管理 API
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/versions` | 获取版本列表 |
| POST | `/api/versions` | 发布新版本 |
| GET | `/api/versions/latest` | 获取最新版本 |
| GET | `/api/versions/check` | 检查更新 |

### 5.12 OCR API
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/ocr/driving-license` | 识别驾驶证 |
| GET | `/api/ocr/status` | 获取 OCR 服务状态 |

### 5.13 图片上传 API
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/upload/image` | 上传图片 |

---

## 六、实时通信系统（SSE）

### 6.1 SSE 事件类型

| 事件类型 | 说明 | 触发场景 |
|----------|------|----------|
| `notification` | 新通知 | 收到新通知时 |
| `vehicle_update` | 车辆更新 | 车辆审核状态变更 |
| `leave_update` | 请假更新 | 请假审批结果 |
| `piece_work_update` | 计件更新 | 计件记录变更 |
| `assignment_update` | 仓库分配更新 | 仓库分配变更 |
| `permission_update` | 权限更新 | 权限配置变更 |
| `user_update` | 用户状态更新 | 用户角色/状态变更 |

### 6.2 SSE 实现架构

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   前端页面   │────▶│  SSE 连接   │◀────│  事件队列   │
└─────────────┘     └─────────────┘     └─────────────┘
                           │                    ▲
                           │                    │
                           ▼                    │
                    ┌─────────────┐     ┌─────────────┐
                    │  回调分发   │     │  事件触发器  │
                    └─────────────┘     └─────────────┘
```

### 6.3 前端 SSE 集成

- 车辆列表页：监听 `vehicle_update` 事件
- 请假列表页：监听 `leave_update` 事件
- 计件列表页：监听 `piece_work_update` 事件
- 仓库选择器：监听 `assignment_update` 事件
- 用户 Store：监听 `permission_update` 和 `user_update` 事件

---

## 七、权限系统

### 7.1 权限检查函数

| 函数 | 说明 |
|------|------|
| `get_current_user` | 获取当前登录用户 |
| `require_boss` | 要求老板权限 |
| `require_admin` | 要求管理员权限（调度/老板/超管） |
| `require_management` | 要求管理权限（车队长/调度/老板/超管） |
| `require_super_admin_for_high_roles` | 高权限角色操作检查 |
| `check_vehicle_ownership` | 车辆所有权检查 |
| `check_resource_ownership` | 通用资源所有权检查 |
| `check_manager_warehouse_access` | 车队长仓库权限检查 |

### 7.2 权限错误代码

| 错误代码 | 说明 |
|----------|------|
| `user_disabled` | 用户已禁用 |
| `role_insufficient` | 角色权限不足 |
| `resource_not_owned` | 资源不属于当前用户 |
| `warehouse_not_accessible` | 无权访问该仓库 |
| `high_role_operation` | 无权操作高权限角色 |

---

## 八、公共组件库

### 8.1 组件清单

| 组件 | 说明 | 使用场景 |
|------|------|----------|
| `AlbumMultiSelector` | 相册多选器 | 选择多张图片 |
| `Button` | 按钮组件 | 通用按钮 |
| `CachedImage` | 缓存图片 | 图片懒加载和缓存 |
| `Card` | 卡片组件 | 内容容器 |
| `Dashboard` | 仪表盘 | 首页数据展示 |
| `DriverStats` | 司机统计 | 司机数据展示 |
| `Empty` | 空状态 | 无数据提示 |
| `FormItem` | 表单项 | 表单布局 |
| `ListItem` | 列表项 | 列表布局 |
| `Loading` | 加载中 | 加载状态 |
| `NavBar` | 导航栏 | 页面导航 |
| `NotificationBell` | 通知铃铛 | 未读通知提示 |
| `PhotoCapture` | 拍照组件 | 拍照上传 |
| `PhotoCompare` | 照片对比 | 提车/还车照片对比 |
| `RealNotificationBar` | 实时通知栏 | SSE 通知展示 |
| `StatusTag` | 状态标签 | 状态显示 |
| `StepIndicator` | 步骤指示器 | 多步骤流程 |
| `TopNavBar` | 顶部导航 | 页面顶部 |
| `WarehouseSwitcher` | 仓库切换器 | 仓库选择 |

---

## 九、工具函数库

### 9.1 核心工具

| 模块 | 说明 |
|------|------|
| `pinyin.ts` | 拼音首字母转换 |
| `date.ts` / `dateFormat.ts` | 日期格式化 |
| `filter.ts` | 数据筛选 |
| `sort.ts` | 数据排序 |
| `confirm.ts` | 确认对话框 |
| `imageUpload.ts` | 图片上传 |
| `sse.ts` | SSE 连接管理 |
| `update.ts` | 热更新检测 |
| `completionRate.ts` | 完成率计算 |
| `attendance-check.ts` | 考勤检查 |
| `preferences.ts` | 用户偏好设置 |

### 9.2 验证工具

| 模块 | 说明 |
|------|------|
| `categoryDeleteValidation.ts` | 品类删除验证 |
| `driverInfoValidation.ts` | 司机信息验证 |
| `leaveApprovalValidation.ts` | 请假审批验证 |
| `pieceWorkCalculation.ts` | 计件计算验证 |
| `rentalValidation.ts` | 租赁信息验证 |
| `warehouseAssignmentValidation.ts` | 仓库分配验证 |
| `warehouseValidation.ts` | 仓库验证 |

### 9.3 存储工具

| 模块 | 说明 |
|------|------|
| `storage/` | 跨平台存储适配器 |
| `draftStorage/` | 草稿存储 |
| `draftImage/` | 草稿图片存储 |
| `imageCache/` | 图片缓存管理 |
| `imagePreloader/` | 图片预加载 |
| `submitRecovery/` | 提交恢复 |
| `cleanup/` | 清理管理 |

---

## 十、测试覆盖

### 10.1 测试类型

| 类型 | 框架 | 数量 |
|------|------|------|
| 单元测试 | Vitest | 50+ |
| 属性测试 (PBT) | fast-check | 25+ |
| 后端测试 | pytest + hypothesis | 40+ |

### 10.2 属性测试清单

| 测试文件 | 测试内容 |
|----------|----------|
| `searchMatch.pbt.test.ts` | 搜索匹配正确性 |
| `warehouseFilter.pbt.test.ts` | 仓库筛选正确性 |
| `sort.pbt.test.ts` | 排序功能正确性 |
| `completionRate.pbt.test.ts` | 完成率状态判断 |
| `categoryDeleteValidation.pbt.test.ts` | 品类删除约束 |
| `warehouseAssignment.pbt.test.ts` | 仓库分配关系 |
| `driverInfoValidation.pbt.test.ts` | 司机信息更新 |
| `pieceWorkCalculation.pbt.test.ts` | 计件计算 |
| `rentalValidation.pbt.test.ts` | 租赁信息验证 |
| `sseEventDispatch.pbt.test.ts` | SSE 事件分发 |
| `imageCache.pbt.test.ts` | 图片缓存 |
| `draftStorage.pbt.test.ts` | 草稿存储 |
| `submitRecovery.pbt.test.ts` | 提交恢复 |

---

## 十一、部署指南

### 11.1 Docker 部署

```bash
# 克隆项目
cd fleet-manager

# 配置环境变量
cp .env.template .env
# 编辑 .env 设置 JWT_SECRET 等配置

# 启动所有服务
docker-compose up -d
```

### 11.2 服务地址

| 服务 | 地址 |
|------|------|
| 前端 | http://localhost |
| 后端 API | http://localhost:8000 |
| API 文档 | http://localhost:8000/docs |
| 数据库 | localhost:5432 |

### 11.3 测试账号

| 角色 | 账号 | 密码 |
|------|------|------|
| 超级管理员 | superadmin | super123 |
| 老板 | boss | boss123 |
| 调度 | dispatcher | dispatch123 |
| 车队长 | manager | manager123 |
| 司机 | driver | driver123 |

---

## 十二、项目统计

### 12.1 代码统计

| 指标 | 数量 |
|------|------|
| 后端代码行数 | ~5000 行 |
| 前端代码行数 | ~8000 行 |
| API 端点数 | 60+ |
| 前端页面数 | 35+ |
| 公共组件数 | 19 |
| 工具函数模块 | 25+ |
| 测试用例数 | 100+ |

### 12.2 功能统计

| 指标 | 数量 |
|------|------|
| 用户角色 | 5 种 |
| 数据库表 | 15 个 |
| SSE 事件类型 | 7 种 |
| 权限检查函数 | 8 个 |

---

**报告生成完成** ✅
