# Implementation Plan: 热更新系统

## Overview

本实现计划将热更新功能分为后端 API 开发和前端服务开发两个主要部分。后端使用 Python/FastAPI，前端使用 TypeScript/UniApp。

## Tasks

- [x] 1. 后端：创建版本管理数据模型
  - [x] 1.1 创建 AppVersion 数据库模型
    - 在 `fleet-manager/backend/models.py` 中添加 AppVersion 模型
    - 包含字段：id, version_name, version_code, platform, update_type, download_url, file_size, md5, description, is_force_update, min_compatible_version, download_count, is_active, created_at, created_by
    - _Requirements: 7.1, 7.2_
  - [ ]* 1.2 编写属性测试：版本数据持久化完整性
    - **Property 7: 版本数据持久化完整性**
    - **Validates: Requirements 7.1, 7.2**

- [x] 2. 后端：创建版本管理 Schema
  - [x] 2.1 创建版本相关的 Pydantic Schema
    - 在 `fleet-manager/backend/schemas.py` 中添加 VersionCheckRequest, VersionCheckResponse, VersionCreate, VersionResponse
    - _Requirements: 8.1, 8.4, 8.5_
  - [ ]* 2.2 编写属性测试：版本检查响应完整性
    - **Property 3: 版本检查响应完整性**
    - **Validates: Requirements 8.1, 8.4, 8.5**

- [x] 3. 后端：实现版本 CRUD 操作
  - [x] 3.1 创建版本 CRUD 模块
    - 创建 `fleet-manager/backend/crud/app_version.py`
    - 实现 create_version, get_latest_version, get_version_history, increment_download_count, check_update 函数
    - _Requirements: 2.1, 6.5, 7.3, 7.4_
  - [x]* 3.2 编写属性测试：版本比较正确性
    - **Property 1: 版本比较正确性**
    - **Validates: Requirements 2.1, 8.2, 8.3**
  - [x]* 3.3 编写属性测试：最低兼容版本逻辑
    - **Property 5: 最低兼容版本逻辑**
    - **Validates: Requirements 2.6**
  - [x]* 3.4 编写属性测试：平台筛选正确性
    - **Property 8: 平台筛选正确性**
    - **Validates: Requirements 7.3**
  - [x]* 3.5 编写属性测试：下载统计累加正确性
    - **Property 9: 下载统计累加正确性**
    - **Validates: Requirements 7.4**

- [x] 4. 后端：创建版本管理路由
  - [x] 4.1 创建版本路由模块
    - 创建 `fleet-manager/backend/routers/app_version.py`
    - 实现 GET /api/app/version/check, GET /api/app/version/latest, POST /api/app/version, GET /api/app/version/history 端点
    - _Requirements: 6.1, 6.2, 6.3_
  - [x] 4.2 在 main.py 中注册版本路由
    - 导入并注册 app_version_router
    - _Requirements: 6.1_
  - [ ]* 4.3 编写 API 集成测试
    - 测试所有版本管理 API 端点
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 5. 后端：实现更新包上传功能
  - [x] 5.1 添加更新包上传端点
    - 在版本路由中添加 POST /api/app/version/upload 端点
    - 支持 wgt 和 apk 文件上传
    - 自动计算文件 MD5 和大小
    - _Requirements: 6.4_
  - [x] 5.2 配置静态文件服务
    - 创建 uploads/app_updates 目录
    - 在 main.py 中挂载静态文件服务
    - _Requirements: 6.4_

- [x] 6. Checkpoint - 后端功能验证
  - 确保所有后端测试通过
  - 验证 API 端点正常工作
  - 如有问题请询问用户

- [x] 7. 前端：创建热更新类型定义
  - [x] 7.1 添加热更新相关类型
    - 在 `fleet-manager/frontend/src/api/types.ts` 中添加 UpdateCheckRequest, UpdateCheckResult, DownloadProgress 类型
    - _Requirements: 1.3, 8.5_
  - [ ]* 7.2 编写属性测试：版本检查请求完整性
    - **Property 2: 版本检查请求完整性**
    - **Validates: Requirements 1.3**

- [x] 8. 前端：创建热更新 API 接口
  - [x] 8.1 添加版本检查 API 函数
    - 在 `fleet-manager/frontend/src/api/index.ts` 中添加 checkAppUpdate 函数
    - _Requirements: 1.2, 1.3_

- [x] 9. 前端：重构热更新服务
  - [x] 9.1 重构 update.ts 为完整的热更新服务
    - 更新 `fleet-manager/frontend/src/utils/update.ts`
    - 实现 HotUpdateService 类，包含 checkUpdateOnLaunch, checkForUpdate, showUpdateDialog, downloadAndInstall 方法
    - _Requirements: 1.1, 1.2, 3.1, 3.4, 4.1, 4.2, 5.1, 5.2, 5.3, 5.4_
  - [x] 9.2 实现 MD5 校验功能
    - 添加 verifyMD5 函数用于校验下载文件
    - _Requirements: 3.2_
  - [ ]* 9.3 编写属性测试：MD5 校验正确性
    - **Property 6: MD5 校验正确性**
    - **Validates: Requirements 3.2**
  - [ ]* 9.4 编写单元测试：错误处理静默性
    - **Property 4: 错误处理静默性**
    - **Validates: Requirements 1.4**

- [x] 10. 前端：集成热更新到应用启动
  - [x] 10.1 在 App.vue 中集成热更新检查
    - 在 onLaunch 生命周期中调用 checkUpdateOnLaunch
    - _Requirements: 1.1_

- [x] 11. 前端：添加手动检查更新入口
  - [x] 11.1 在设置页面添加检查更新按钮
    - 在个人中心/设置页面添加"检查更新"选项
    - 点击后调用 checkForUpdate 并显示结果
    - _Requirements: 1.2_

- [x] 12. Checkpoint - 前端功能验证
  - 确保所有前端测试通过
  - 验证热更新流程正常工作
  - 如有问题请询问用户

- [x] 13. 数据库迁移
  - [x] 13.1 添加 AppVersion 表迁移
    - 在 database.py 的 run_migrations 中添加 app_versions 表创建逻辑
    - _Requirements: 7.1_

- [x] 14. Final Checkpoint - 完整功能验证
  - 确保所有测试通过
  - 验证完整的热更新流程
  - 如有问题请询问用户

## Notes

- 任务标记 `*` 的为可选测试任务，可跳过以加快 MVP 开发
- 每个任务都引用了具体的需求条款以便追溯
- 属性测试验证核心正确性属性
- 单元测试验证具体示例和边界情况
