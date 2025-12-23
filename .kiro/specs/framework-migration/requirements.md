# Requirements Document

## Introduction

本项目旨在将现有的车队管家系统从 **Taro (React) + Supabase** 架构迁移到 **Python (FastAPI) + UniApp (Vue 3)** 架构。

### 迁移原因
- 当前架构过于复杂（644个数据库迁移文件、复杂的RLS策略）
- Supabase 的 RLS 策略难以维护和调试
- 前端 Taro 框架在多端兼容性上存在问题
- 希望使用更简洁、更可控的技术栈

### 目标架构
- **后端**: Python FastAPI + PostgreSQL（或 SQLite 开发环境）
- **前端**: UniApp (Vue 3) - 支持 H5、微信小程序、Android/iOS
- **数据库**: PostgreSQL（生产）/ SQLite（开发）
- **认证**: JWT Token 认证
- **部署**: Docker 容器化部署

## Glossary

- **FastAPI**: 现代、快速的 Python Web 框架，基于标准 Python 类型提示
- **UniApp**: 使用 Vue.js 开发跨平台应用的框架，一套代码编译到多端
- **JWT**: JSON Web Token，用于身份认证的令牌
- **ORM**: 对象关系映射，使用 SQLAlchemy 或 Tortoise-ORM
- **Pydantic**: Python 数据验证库，FastAPI 的核心依赖

## Requirements

### Requirement 1

**User Story:** As a 开发者, I want to 搭建 FastAPI 后端项目结构, so that 可以快速开发 RESTful API。

#### Acceptance Criteria

1. WHEN 初始化后端项目 THEN the System SHALL 创建标准的 FastAPI 项目结构（包含 app、routers、models、schemas、services 目录）
2. WHEN 配置数据库连接 THEN the System SHALL 支持 PostgreSQL 和 SQLite 两种数据库
3. WHEN 启动开发服务器 THEN the System SHALL 提供自动生成的 API 文档（Swagger UI）
4. IF 数据库连接失败 THEN the System SHALL 提供清晰的错误信息和重试机制

### Requirement 2

**User Story:** As a 开发者, I want to 实现用户认证系统, so that 可以安全地管理用户登录和权限。

#### Acceptance Criteria

1. WHEN 用户登录 THEN the System SHALL 验证用户名和密码并返回 JWT Token
2. WHEN 用户携带 Token 请求 THEN the System SHALL 验证 Token 有效性并提取用户信息
3. WHEN Token 过期 THEN the System SHALL 返回 401 错误并提示重新登录
4. WHEN 用户登出 THEN the System SHALL 使当前 Token 失效
5. WHERE 需要权限控制 THEN the System SHALL 基于用户角色（司机、车队长、老板）进行访问控制

### Requirement 3

**User Story:** As a 开发者, I want to 设计简洁的数据库模型, so that 数据结构清晰易维护。

#### Acceptance Criteria

1. WHEN 设计数据模型 THEN the System SHALL 使用 SQLAlchemy ORM 定义所有表结构
2. WHEN 执行数据库迁移 THEN the System SHALL 使用 Alembic 管理迁移版本
3. WHEN 查询数据 THEN the System SHALL 通过 ORM 方法而非原生 SQL 进行操作
4. WHEN 定义关联关系 THEN the System SHALL 使用外键和关系属性明确表间关系

### Requirement 4

**User Story:** As a 开发者, I want to 搭建 UniApp 前端项目, so that 可以开发跨平台移动应用。

#### Acceptance Criteria

1. WHEN 初始化前端项目 THEN the System SHALL 使用 Vue 3 + TypeScript + Vite 创建 UniApp 项目
2. WHEN 配置多端编译 THEN the System SHALL 支持 H5、微信小程序、Android App 三端编译
3. WHEN 开发组件 THEN the System SHALL 使用 Vue 3 Composition API 和 uni-ui 组件库
4. IF 平台 API 不兼容 THEN the System SHALL 提供条件编译或兼容层处理

### Requirement 5

**User Story:** As a 开发者, I want to 实现前后端 API 对接, so that 前端可以正常调用后端服务。

#### Acceptance Criteria

1. WHEN 前端发起请求 THEN the System SHALL 通过统一的请求封装调用后端 API
2. WHEN 请求需要认证 THEN the System SHALL 自动在请求头中携带 JWT Token
3. WHEN 请求失败 THEN the System SHALL 统一处理错误并显示友好提示
4. WHEN Token 过期 THEN the System SHALL 自动跳转到登录页面

### Requirement 6

**User Story:** As a 用户, I want to 使用司机端功能, so that 可以完成日常工作。

#### Acceptance Criteria

1. WHEN 司机打卡 THEN the System SHALL 记录打卡时间和位置信息
2. WHEN 司机录入计件 THEN the System SHALL 保存计件记录并计算工作量
3. WHEN 司机申请请假 THEN the System SHALL 创建请假申请并通知车队长
4. WHEN 司机管理车辆 THEN the System SHALL 支持车辆的添加、查看、归还操作

### Requirement 7

**User Story:** As a 用户, I want to 使用车队长端功能, so that 可以管理司机和审批申请。

#### Acceptance Criteria

1. WHEN 车队长查看司机列表 THEN the System SHALL 显示所管辖仓库的所有司机
2. WHEN 车队长审批请假 THEN the System SHALL 更新申请状态并通知司机
3. WHEN 车队长查看统计 THEN the System SHALL 显示考勤和计件的汇总数据

### Requirement 8

**User Story:** As a 用户, I want to 使用老板端功能, so that 可以进行全局管理。

#### Acceptance Criteria

1. WHEN 老板管理用户 THEN the System SHALL 支持用户的增删改查和角色分配
2. WHEN 老板管理仓库 THEN the System SHALL 支持仓库的创建、编辑、删除
3. WHEN 老板查看全局统计 THEN the System SHALL 显示所有仓库的汇总数据
4. WHEN 老板配置权限 THEN the System SHALL 支持细粒度的权限配置

### Requirement 9

**User Story:** As a 开发者, I want to 实现通知系统, so that 用户可以及时收到消息。

#### Acceptance Criteria

1. WHEN 创建通知 THEN the System SHALL 保存通知记录并标记为未读
2. WHEN 用户查看通知 THEN the System SHALL 显示通知列表并支持标记已读
3. WHEN 有新通知 THEN the System SHALL 在前端显示未读数量提示

### Requirement 10

**User Story:** As a 开发者, I want to 实现数据迁移工具, so that 可以将现有数据迁移到新系统。

#### Acceptance Criteria

1. WHEN 执行数据迁移 THEN the System SHALL 从 Supabase 导出数据并导入新数据库
2. WHEN 迁移用户数据 THEN the System SHALL 保留用户账号和密码（重新哈希）
3. WHEN 迁移业务数据 THEN the System SHALL 保持数据完整性和关联关系
4. IF 迁移失败 THEN the System SHALL 支持回滚和重试
