# Requirements Document

## Introduction

本文档定义了 fleet-manager 新框架（FastAPI + UniApp Vue 3）的深度功能测试和代码清理需求规范。目标是：
1. 验证 fleet-manager 新框架是否已完整实现主项目（Taro + Supabase）的所有功能
2. 对新框架的所有 API 和前端功能进行全面测试
3. 识别功能差距并记录缺失功能
4. 清理主项目中的冗余代码和失效文件（如果新框架可以完全替代）

## Glossary

- **主项目**: 根目录下的 Taro + React + Supabase 系统（原有系统）
- **新框架/fleet-manager**: fleet-manager 目录下的 FastAPI + UniApp Vue 3 系统（重构版本）
- **功能对比测试**: 验证新框架是否实现了主项目的所有功能
- **API 测试**: 对 FastAPI 后端 API 进行功能验证
- **前端测试**: 对 UniApp Vue 3 前端页面进行功能验证
- **冗余代码**: 主项目中不再需要的代码（如果新框架可替代）
- **失效文件**: 不再被引用或已过时的文件

## Requirements

### Requirement 1

**User Story:** As a 开发者, I want to 验证 fleet-manager 后端 API 功能完整性, so that 确保新框架可以替代主项目的后端功能。

#### Acceptance Criteria

1. WHEN 测试认证 API THEN the system SHALL 验证登录、获取当前用户、修改密码功能正确
2. WHEN 测试用户管理 API THEN the system SHALL 验证用户的增删改查功能正确
3. WHEN 测试仓库管理 API THEN the system SHALL 验证仓库的增删改查和用户分配功能正确
4. WHEN 测试考勤 API THEN the system SHALL 验证上班打卡、下班打卡、获取考勤记录功能正确
5. WHEN 测试计件 API THEN the system SHALL 验证计件分类管理、计件记录录入、统计功能正确
6. WHEN 测试请假 API THEN the system SHALL 验证请假申请、审批功能正确
7. WHEN 测试车辆 API THEN the system SHALL 验证车辆的增删改查、审核、证件上传功能正确
8. WHEN 测试通知 API THEN the system SHALL 验证通知发送、获取、标记已读、SSE 实时推送功能正确
9. WHEN 测试 OCR API THEN the system SHALL 验证驾驶证识别功能正确
10. WHEN 测试健康检查 API THEN the system SHALL 验证服务状态检查功能正确

### Requirement 2

**User Story:** As a 开发者, I want to 验证 fleet-manager 前端页面功能完整性, so that 确保新框架可以替代主项目的前端功能。

#### Acceptance Criteria

1. WHEN 测试登录页面 THEN the system SHALL 验证用户登录流程正确
2. WHEN 测试司机功能 THEN the system SHALL 验证打卡、计件录入、请假申请、车辆管理页面正确
3. WHEN 测试车队长功能 THEN the system SHALL 验证司机管理、审批、统计、通知页面正确
4. WHEN 测试老板功能 THEN the system SHALL 验证用户管理、仓库管理、车辆审核、分类管理、统计页面正确
5. WHEN 测试通知功能 THEN the system SHALL 验证通知列表、实时推送功能正确
6. WHEN 测试个人中心 THEN the system SHALL 验证个人信息查看功能正确

### Requirement 3

**User Story:** As a 开发者, I want to 对比主项目和新框架的功能差异, so that 识别新框架缺失的功能。

#### Acceptance Criteria

1. WHEN 对比用户角色 THEN the system SHALL 验证新框架支持司机、车队长、老板三种角色
2. WHEN 对比主项目功能 THEN the system SHALL 列出主项目有但新框架缺失的功能
3. WHEN 对比数据模型 THEN the system SHALL 验证新框架的数据模型覆盖主项目的核心字段
4. WHEN 对比权限控制 THEN the system SHALL 验证新框架的权限控制与主项目一致
5. IF 发现功能差距 THEN the system SHALL 记录差距并评估是否需要补充实现

### Requirement 4

**User Story:** As a 开发者, I want to 测试 fleet-manager 的部署和运行, so that 确保新框架可以正常部署运行。

#### Acceptance Criteria

1. WHEN 启动后端服务 THEN the system SHALL 验证 FastAPI 服务正常启动
2. WHEN 启动前端服务 THEN the system SHALL 验证 UniApp H5 服务正常启动
3. WHEN 使用 Docker 部署 THEN the system SHALL 验证 docker-compose 部署正常
4. WHEN 访问 API 文档 THEN the system SHALL 验证 Swagger UI 和 ReDoc 可访问
5. WHEN 测试数据库连接 THEN the system SHALL 验证数据库初始化和连接正常

### Requirement 5

**User Story:** As a 开发者, I want to 清理主项目中的冗余代码, so that 如果新框架可以替代则清理旧代码。

#### Acceptance Criteria

1. WHEN 新框架功能完整 THEN the system SHALL 标记主项目中可清理的代码
2. WHEN 清理代码前 THEN the system SHALL 确认新框架已完全实现对应功能
3. WHEN 清理代码后 THEN the system SHALL 验证新框架功能不受影响
4. IF 新框架功能不完整 THEN the system SHALL 保留主项目代码直到功能补齐

### Requirement 6

**User Story:** As a 开发者, I want to 生成功能对比报告, so that 清晰了解新框架的完成度。

#### Acceptance Criteria

1. WHEN 测试完成后 THEN the system SHALL 生成功能对比报告
2. WHEN 生成报告 THEN the system SHALL 包含已实现功能列表
3. WHEN 生成报告 THEN the system SHALL 包含缺失功能列表
4. WHEN 生成报告 THEN the system SHALL 包含功能完成度百分比
5. WHEN 生成报告 THEN the system SHALL 包含迁移建议

