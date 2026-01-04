# Changelog

本文件记录 Fleet Manager 项目的所有重要变更。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [1.2.0] - 2026-01-05

### 🎉 动态计量单位功能

本版本新增自定义仓库类型支持，允许老板创建自定义单位的仓库。

### 新增功能

#### 自定义仓库类型 (CUSTOM)
- 新增 `custom` 仓库类型枚举值
- 支持老板在创建仓库时设置自定义单位名称
- 计件录入页面自动显示自定义单位

#### 仓库类型系统增强
| 类型 | 代码 | 预设单位 |
|------|------|----------|
| 计件 | `piece` | 件 |
| 点位 | `point` | 点 |
| 整车 | `whole` | 车 |
| 距离 | `distance` | 公里 |
| 自定义 | `custom` | (老板设置) |

### 后端变更
- `models.py`: Warehouse 模型新增 `custom_unit` 字段
- `enums.py`: WarehouseType 枚举新增 `CUSTOM` 值
- `helpers.py`: `get_warehouse_unit()` 函数支持 custom 类型
- `schemas.py`: 仓库创建/更新 schema 支持 custom_unit
- `routers/warehouses.py`: custom 类型验证（custom_unit 必填）

### 前端变更
- `api/types.ts`: WarehouseType 枚举新增 CUSTOM
- `api/types.ts`: Warehouse 接口新增 custom_unit 字段
- `api/types.ts`: `getWarehouseUnit()` 函数支持 custom 类型
- `pages/boss/warehouses/detail.vue`: 仓库创建页面支持自定义类型

### 测试
- 后端 50 个仓库类型测试全部通过
- 前端构建成功

---

## [1.1.0] - 2025-12-26

### 🎉 车队长端功能对齐完成

本版本完成了车队长端与主项目的 100% 功能对齐，新增员工管理页面和多项功能增强。

### 新增功能

#### 员工管理页面
- 新增 `manager/staff/index.vue` 员工管理页面
- 支持查看所辖仓库的司机列表
- 支持司机信息编辑（姓名、手机号）
- 支持仓库分配功能（多选仓库）
- 支持搜索功能（姓名、手机号、拼音首字母匹配）

#### 司机管理增强
- 新增仓库筛选器组件
- 支持按仓库筛选司机列表
- 支持"全部仓库"选项

#### 仓库品类配置增强
- 新增上楼单价、分拣单价配置
- 车队长可编辑品类配置
- 车队长可删除品类（带约束检查：有计件记录不可删除）

#### 数据汇总增强
- 新增排序功能（按金额/按数量/按日期）
- 支持升序/降序切换

#### 计件管理增强
- 新增完成率状态显示
- 超额完成（>110%）：绿色
- 达标（100%-110%）：蓝色
- 不达标（70%-100%）：橙色
- 严重不达标（<70%）：红色

### 后端 API

#### 新增 API
- `PUT /api/users/{user_id}/driver-info` - 更新司机信息（姓名、手机号）
- `POST /api/users/{user_id}/warehouses` - 分配仓库给用户
- `GET /api/users/{user_id}/warehouses` - 获取用户的仓库列表

#### API 权限调整
- `PUT /api/piece-work/categories/{category_id}` - 权限从 admin 调整为 management
- `DELETE /api/piece-work/categories/{category_id}` - 权限从 admin 调整为 management

### 前端工具函数

#### 新增工具函数
- `utils/completionRate.ts` - 完成率计算和状态判断
- `utils/sort.ts` - 多字段排序功能
- `utils/filter.ts` - 仓库筛选功能
- `utils/validation/driverInfoValidation.ts` - 司机信息验证
- `utils/validation/warehouseAssignmentValidation.ts` - 仓库分配验证
- `utils/validation/pieceWorkCalculation.ts` - 计件计算验证
- `utils/validation/leaveApprovalValidation.ts` - 请假审批验证
- `utils/validation/rentalValidation.ts` - 租赁验证
- `utils/validation/warehouseValidation.ts` - 仓库验证

### 测试

#### 属性测试（Property-Based Testing）
- 新增完成率状态判断属性测试
- 新增司机信息验证属性测试
- 新增仓库分配验证属性测试
- 新增计件计算验证属性测试
- 新增请假审批验证属性测试
- 新增租赁验证属性测试
- 新增仓库验证属性测试

#### 测试覆盖
- 21 个测试文件
- 383 个测试用例
- 全部通过

### 文档

- 更新 `MANAGER-PAGE-DEEP-COMPARISON.md` - 标记已完成功能
- 功能覆盖率从 90% 提升到 100%

---

## [1.0.0] - 2024-12-23

### 🎉 首个正式版本发布

新框架已实现主项目 100% 的核心功能，可完全替代原有 Taro + Supabase 架构。

### 新增功能

#### 角色系统
- 老板角色 (BOSS) 作为系统最高权限角色
- 新增调度角色 (PEER_ADMIN)，协助管理，拥有与老板类似的权限
- 完善司机 (DRIVER)、车队长 (MANAGER) 角色权限

#### 核心功能
- 用户认证系统（JWT Token）
- 用户管理（CRUD、角色分配）
- 仓库管理（CRUD、用户分配）
- 考勤打卡（上班/下班打卡、考勤记录查询）
- 计件录入（分类管理、记录录入、统计报表）
- 请假审批（申请、审批、记录查询）
- 车辆管理（CRUD、审核、证件上传）
- 通知系统（发送、接收、实时推送 SSE）
- OCR 驾驶证识别
- 健康检查 API

#### 扩展功能
- 车辆租赁管理
  - 租赁信息管理（出租方、承租方、租金、租期）
  - 租金到期提醒
  - 租赁历史记录
- 补录照片功能
  - 车辆照片补录标记
  - 补录照片元数据管理
  - 补录照片显示和编辑
- 通知模板管理
  - 模板 CRUD
  - 变量替换
  - 模板分类
- 定时通知功能
  - 定时任务调度（APScheduler）
  - 支持一次性、每日、每周、每月重复
  - 定时任务管理界面
- 热更新版本管理
  - 版本发布管理
  - 更新检测 API
  - 强制/推荐/可选更新类型

### 前端页面

#### 公共页面
- 登录页面
- 首页（角色自适应）
- 通知列表
- 个人中心

#### 司机页面
- 打卡页面
- 考勤记录
- 计件录入/记录
- 请假申请/记录
- 车辆列表/添加/详情
- 租赁信息编辑
- 补录照片

#### 车队长页面
- 司机管理/详情
- 审批列表/详情
- 计件统计
- 统计报表
- 发送通知

#### 老板/管理员页面
- 用户管理/创建/详情
- 仓库管理/详情
- 车辆审核/详情
- 租金提醒
- 分类管理
- 计件管理
- 统计报表
- 审批管理
- 通知模板管理
- 定时通知管理/编辑
- 版本管理/编辑

### API 接口

#### 认证 API
- POST /api/auth/login - 用户登录
- GET /api/auth/me - 获取当前用户
- PUT /api/auth/password - 修改密码

#### 用户管理 API
- GET /api/users - 获取用户列表
- POST /api/users - 创建用户
- GET /api/users/{id} - 获取用户详情
- PUT /api/users/{id} - 更新用户
- DELETE /api/users/{id} - 删除用户

#### 仓库管理 API
- GET /api/warehouses - 获取仓库列表
- POST /api/warehouses - 创建仓库
- GET /api/warehouses/{id} - 获取仓库详情
- PUT /api/warehouses/{id} - 更新仓库
- DELETE /api/warehouses/{id} - 删除仓库
- POST /api/warehouses/{id}/assign - 分配用户
- GET /api/warehouses/{id}/users - 获取仓库用户

#### 考勤 API
- POST /api/attendance/clock-in - 上班打卡
- POST /api/attendance/clock-out - 下班打卡
- GET /api/attendance/today - 获取今日状态
- GET /api/attendance - 获取考勤记录

#### 计件 API
- GET /api/piece-work/categories - 获取分类
- POST /api/piece-work/categories - 创建分类
- PUT /api/piece-work/categories/{id} - 更新分类
- GET /api/piece-work/records - 获取记录
- POST /api/piece-work/records - 录入计件
- PUT /api/piece-work/records/{id} - 更新记录
- DELETE /api/piece-work/records/{id} - 删除记录
- GET /api/piece-work/stats - 获取统计

#### 请假 API
- GET /api/leave - 获取请假列表
- POST /api/leave - 提交请假申请
- GET /api/leave/{id} - 获取请假详情
- PUT /api/leave/{id}/approve - 审批请假

#### 车辆 API
- GET /api/vehicles - 获取车辆列表
- POST /api/vehicles - 添加车辆
- GET /api/vehicles/{id} - 获取车辆详情
- PUT /api/vehicles/{id} - 更新车辆
- PUT /api/vehicles/{id}/review - 审核车辆
- POST /api/vehicles/{id}/documents - 上传证件
- GET /api/vehicles/{id}/lease - 获取租赁信息
- PUT /api/vehicles/{id}/lease - 更新租赁信息
- GET /api/vehicles/lease-reminders - 获取租金提醒
- PUT /api/vehicles/{id}/supplement-photo - 补录照片
- GET /api/vehicles/{id}/supplement-photos - 获取补录照片

#### 通知 API
- GET /api/notifications - 获取通知列表
- POST /api/notifications - 发送通知
- PUT /api/notifications/{id}/read - 标记已读
- GET /api/notifications/unread-count - 获取未读数量
- GET /api/notifications/stream - SSE 实时推送

#### 通知模板 API
- GET /api/notification-templates - 获取模板列表
- POST /api/notification-templates - 创建模板
- PUT /api/notification-templates/{id} - 更新模板
- DELETE /api/notification-templates/{id} - 删除模板

#### 定时通知 API
- GET /api/scheduled-notifications - 获取定时通知列表
- POST /api/scheduled-notifications - 创建定时通知
- GET /api/scheduled-notifications/{id} - 获取定时通知详情
- PUT /api/scheduled-notifications/{id} - 更新定时通知
- DELETE /api/scheduled-notifications/{id} - 删除定时通知

#### 版本管理 API
- GET /api/app-versions - 获取版本列表
- POST /api/app-versions - 发布新版本
- GET /api/app-versions/latest - 获取最新版本
- GET /api/app-versions/check - 检查更新

#### OCR 和健康检查 API
- GET /api/ocr/status - OCR 服务状态
- POST /api/ocr/driving-license - 驾驶证识别
- GET /api/health - 健康检查
- GET /api/health/live - 存活检查
- GET /api/health/ready - 就绪检查

### 部署支持

- Docker 容器化部署
- Docker Compose 编排
- 开发/生产环境配置分离
- Nginx 反向代理
- SSL/HTTPS 支持
- 健康检查和监控

### 文档

- README.md - 项目说明
- CHANGELOG.md - 变更日志
- docs/FEATURE-COMPARISON-REPORT.md - 功能对比报告
- docs/MIGRATION-GUIDE.md - 迁移指南
- backend/README.md - 后端开发指南
- frontend/README.md - 前端开发指南
- scripts/README.md - 脚本说明

### 测试

- 后端 API 集成测试
- Docker 部署测试脚本
- 数据迁移验证脚本

---

## [0.9.0] - 2024-12-20

### 新增
- 基础框架搭建
- 核心功能实现
- Docker 部署支持

### 变更
- 从 Taro + Supabase 迁移到 FastAPI + UniApp

---

## 版本说明

- **主版本号**：不兼容的 API 变更
- **次版本号**：向下兼容的功能新增
- **修订号**：向下兼容的问题修复

## 贡献者

感谢所有为本项目做出贡献的开发者。

---

*本文件由 Kiro AI Assistant 生成*
