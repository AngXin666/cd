# Changelog

本文件记录 Fleet Manager 项目的所有重要变更。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [1.0.11] - 2026-01-07

### ✨ 新功能

#### 仓库切换无感优化
- 实现数据预加载和缓存策略，消除仓库切换时的"加载中"闪动
- 新增 `useWarehouseDataCache` composable 统一管理仓库数据缓存
- 支持智能缓存（5分钟过期，后台静默更新）
- 支持 SSE 实时更新缓存数据
- 单个仓库加载失败不影响其他仓库

#### 已集成页面
- ✅ 老板首页 (`pages/boss/index/index.vue`)
- ✅ 车队长首页 (`pages/manager/index/index.vue`)
- ✅ 司机首页 (`pages/driver/index/index.vue`)
- ✅ 司机管理页面 (`pages/manager/drivers/index.vue`)
- ✅ 用户管理页面 (`pages/boss/users/index.vue`)

### 🔧 优化

- 优化仓库切换体验，缓存命中时切换时间 < 100ms
- 优化页面初始加载，当前仓库优先加载，其他仓库后台预加载
- 优化错误处理，提供重试机制

### 📦 技术细节

**核心文件**：
- `src/composables/useWarehouseDataCache.ts` - 仓库数据缓存 composable
- 缓存过期时间：5分钟（可配置）
- 预加载延迟：500ms（避免阻塞当前仓库渲染）
- 后台更新间隔：1分钟检查一次过期缓存

**设计文档**：`.kiro/specs/warehouse-switch-optimization/`

---

## [1.0.10] - 2026-01-06

### ✨ 新功能

#### 首页报表入口
- 老板首页"系统功能"板块新增"数据报表"入口
- 车队长首页"快捷功能"板块新增"数据报表"入口

#### 登录页更新检查
- 登录页面增加应用更新检查
- 确保用户在登录前能看到更新提示

#### 数据报表功能
- 完整的数据报表功能（日报/周报/月报）
- 仓库统计、司机统计、计件记录明细

### 🐛 Bug 修复

- 修复司机端首页"今天收入"在计件后不更新的问题
- 修复报表 API 在生产服务器上 404 的问题

### 🔧 优化

- 优化司机端首页数据加载顺序，确保统计数据准确
- 部署报表 API 到生产服务器

### 🐛 Bug 修复
- 修复热更新检测问题

### 📦 发布信息
- **APK 文件**: `FleetManager-v1.0.10.apk` (6.0 MB)
- **WGT 热更新包**: `FleetManager-v1.0.10.wgt` (392 KB)
- **版本号**: 1.0.10 (110)
- **构建时间**: 2026-01-06 16:10

---

## [1.0.9] - 2026-01-06

### ✨ 新功能

#### 数据统计报表功能
- 新增报表入口（老板端和车队长端数据统计页面）
- 支持日报/周报/月报三种周期切换
- 支持日期导航（上一天/周/月、下一天/周/月）
- 仓库卡片展示：显示仓库名称、总件数、司机人数
- 仓库详情页：显示该仓库的司机统计列表
- 司机详情页：显示该司机的计件记录明细
- 权限控制：老板可查看所有仓库，车队长只能查看管辖仓库

### 新增文件
- `pages/common/report/index.vue` - 报表主页
- `pages/common/report/warehouse.vue` - 仓库详情页
- `pages/common/report/driver.vue` - 司机详情页
- `api/report.ts` - 报表 API 封装
- `types/report.ts` - 报表类型定义
- `utils/report.ts` - 报表工具函数
- `backend/routers/report.py` - 报表后端 API

### 📦 发布信息
- **APK 文件**: `FleetManager-v1.0.9.apk` (6.0 MB)
- **WGT 热更新包**: `FleetManager-v1.0.9.wgt` (392 KB)
- **版本号**: 1.0.9 (109)
- **构建时间**: 2026-01-06 15:45
- **签名状态**: 已签名（Release）

### 热更新说明
- 已发布 wgt 热更新包到服务器
- 1.0.8 及以上版本用户可通过热更新升级
- 打开 APP 后会自动检测并提示更新

---

## [1.0.8] - 2026-01-06

### 🐛 Bug 修复

#### 老板端发送通知按钮修复
- 修复老板端"发送通知"按钮点击无响应的问题
- 原因：跳转路径 `/pages/boss/templates/index` 不存在
- 修复：改为复用车队长的发送通知页面 `/pages/manager/notify/index`

### 修复的文件
- `pages/boss/index/index.vue` - 老板工作台发送通知跳转路径修复

### 📦 发布信息
- **APK 文件**: `FleetManager-v1.0.8.apk` (6.1 MB)
- **版本号**: 1.0.8 (108)
- **构建时间**: 2026-01-06 10:12
- **签名状态**: 已签名（Release）

### 安装说明
1. 下载 `FleetManager-v1.0.8.apk`
2. 在 Android 设备上安装
3. 如果已安装旧版本，会自动覆盖更新
4. 打开应用验证老板端发送通知功能

---

## [1.0.7] - 2026-01-06

### 🐛 Bug 修复

#### 司机端通知中心跳转问题修复
- 修复司机工作台点击通知中心没响应的问题
- 从 tabBar 页面列表中移除 `/pages/notifications/index`
- 通知中心不是 tabBar 页面，应使用 `uni.navigateTo` 而非 `uni.switchTab`
- 添加详细调试日志和错误处理
- 添加 `redirectTo` 作为备选跳转方案

### 修复的文件
- `pages/driver/index/index.vue` - 司机工作台 navigateTo 函数修复

### 📦 发布信息
- **APK 文件**: `FleetManager-v1.0.7.apk` (6.8 MB)
- **版本号**: 1.0.7 (107)
- **构建时间**: 2026-01-06 09:59
- **签名状态**: 已签名（Release）

### 安装说明
1. 下载 `FleetManager-v1.0.7.apk`
2. 在 Android 设备上安装
3. 如果已安装旧版本，会自动覆盖更新
4. 打开应用验证司机端通知中心跳转功能

---

## [1.0.6] - 2026-01-05

### 🐛 Bug 修复

#### 通知中心跳转问题深度修复
- 在 `navigateTo` 函数中添加详细调试日志
- 添加 `success` 和 `fail` 回调以捕获跳转错误
- 如果 `navigateTo` 失败，自动尝试 `redirectTo` 作为备选方案
- 通知页面 SSE 初始化添加 try-catch 防止错误阻塞页面加载

### 修复的文件
- `pages/boss/index/index.vue` - 老板工作台 navigateTo 函数增强
- `pages/manager/index/index.vue` - 车队长工作台 navigateTo 函数增强
- `pages/notifications/index.vue` - SSE 初始化错误处理

### 📦 发布信息
- **APK 文件**: `FleetManager-v1.0.6.apk` (6.0 MB)
- **版本号**: 1.0.6 (106)
- **构建时间**: 2026-01-05 17:46
- **签名状态**: 已签名（Release）

### 安装说明
1. 下载 `FleetManager-v1.0.6.apk`
2. 在 Android 设备上安装
3. 如果已安装旧版本，会自动覆盖更新
4. 打开应用验证通知中心跳转功能
5. 如果仍有问题，请查看 Android 日志（adb logcat）中的 `[BossHome]` 或 `[ManagerHome]` 标签

---

## [1.0.5] - 2026-01-05

### 🐛 Bug 修复

#### 通知中心跳转问题修复
- 修复老板和车队长工作台点击通知中心没响应的问题
- 从 tabBar 页面列表中移除 `/pages/notifications/index`
- 通知中心不是 tabBar 页面，应使用 `uni.navigateTo` 而非 `uni.switchTab`

### 修复的文件
- `pages/boss/index/index.vue` - 老板工作台 navigateTo 函数
- `pages/manager/index/index.vue` - 车队长工作台 navigateTo 函数

### 📦 发布信息
- **APK 文件**: `FleetManager-v1.0.5.apk` (6.0 MB)
- **版本号**: 1.0.5 (105)
- **构建时间**: 2026-01-05 16:45
- **签名状态**: 已签名（Release）

### 安装说明
1. 下载 `FleetManager-v1.0.5.apk`
2. 在 Android 设备上安装
3. 如果已安装旧版本，会自动覆盖更新
4. 打开应用验证通知中心跳转功能

---

## [1.3.3] - 2026-01-05

### 🔧 导航修复

修复多个页面的导航问题，提升用户体验。

### 修复内容

#### 工作台页面禁用左滑返回
- 登录页、司机工作台、车队长工作台、老板管理后台禁用左滑返回
- 防止工作台页面左滑导致应用最小化
- 配置 `disableSwipeBack: true` 和 `app-plus.popGesture: "none"`

#### 自定义导航页面添加返回按钮
- `pages/boss/categories/index.vue` - 计件品类管理
- `pages/manager/piece-work/detail.vue` - 件数报表详情
- `pages/manager/warehouse-categories/index.vue` - 仓库品类配置
- `components/AttendancePage/index.vue` - 考勤管理组件（Boss/Manager 共用）

#### 通知中心导航修复
- `NotificationBell` 和 `RealNotificationBar` 组件使用 `uni.switchTab` 跳转

---

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
