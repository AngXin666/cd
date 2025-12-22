# Requirements Document

## Introduction

本项目旨在将 Repository 模式全局应用到整个数据访问层，解决当前存在的 API 重复调用问题。通过统一的数据访问层和缓存管理，预计可将登录页面的 API 调用从 33 次减少到 15 次以下，整体代码质量评分从 37/100 提升到 80/100 以上。

## Glossary

- **Repository**: 数据访问层的抽象类，提供统一的 CRUD 操作和缓存管理
- **BaseRepository**: 所有 Repository 的基类，已在项目中实现
- **TTL (Time To Live)**: 缓存有效期，超过此时间缓存自动失效
- **缓存命中**: 请求的数据在缓存中存在且未过期
- **缓存失效**: 数据变更后清除相关缓存，确保下次请求获取最新数据
- **API 层**: `src/db/api/` 目录下的函数，作为页面组件和 Repository 之间的桥梁

## Requirements

### Requirement 1

**User Story:** 作为开发者，我希望所有数据库表都有对应的 Repository，以便统一管理数据访问和缓存。

#### Acceptance Criteria

1. WHEN 系统初始化时 THEN Repository 模块 SHALL 为以下数据库表提供 Repository 实现：users、attendance、piece_work_records、warehouses、warehouse_assignments、notifications
2. WHEN 创建新的 Repository 时 THEN Repository 模块 SHALL 继承 BaseRepository 并配置表名、缓存前缀和默认 TTL
3. WHEN Repository 执行查询操作时 THEN Repository 模块 SHALL 优先从缓存获取数据，缓存未命中时从数据库查询
4. WHEN Repository 执行写操作（创建、更新、删除）时 THEN Repository 模块 SHALL 自动清除相关缓存

### Requirement 2

**User Story:** 作为开发者，我希望 API 层函数都通过 Repository 访问数据，以便享受统一的缓存管理。

#### Acceptance Criteria

1. WHEN API 层函数需要查询数据时 THEN API 层 SHALL 调用对应 Repository 的方法而非直接使用 supabase 客户端
2. WHEN API 层函数需要写入数据时 THEN API 层 SHALL 调用对应 Repository 的方法以确保缓存自动失效
3. WHEN 迁移 API 函数到 Repository 时 THEN API 层 SHALL 保持原有函数签名不变以确保向后兼容

### Requirement 3

**User Story:** 作为用户，我希望登录后页面加载更快，减少不必要的等待时间。

#### Acceptance Criteria

1. WHEN 用户登录成功后 THEN 系统 SHALL 将登录页面的 API 调用次数控制在 15 次以内
2. WHEN 多个组件同时请求相同数据时 THEN 系统 SHALL 通过缓存共享减少重复请求
3. WHEN 用户在页面间切换时 THEN 系统 SHALL 优先使用缓存数据，缓存有效期内不发起重复请求

### Requirement 4

**User Story:** 作为开发者，我希望有完善的缓存配置，以便根据数据特性设置合适的缓存策略。

#### Acceptance Criteria

1. WHEN 配置 Repository 缓存时 THEN 系统 SHALL 支持以下 TTL 配置：users（5分钟）、attendance（2分钟）、piece_work_records（2分钟）、warehouses（10分钟）、notifications（1分钟）
2. WHEN 数据发生变更时 THEN 系统 SHALL 通过事件总线通知相关 Repository 清除缓存
3. WHEN 用户登出时 THEN 系统 SHALL 清除所有用户相关的缓存数据

### Requirement 5

**User Story:** 作为开发者，我希望有完整的测试覆盖，以便验证 Repository 模式的正确性。

#### Acceptance Criteria

1. WHEN 运行单元测试时 THEN 测试套件 SHALL 验证每个 Repository 的缓存命中和未命中行为
2. WHEN 运行 E2E 测试时 THEN 测试套件 SHALL 验证登录页面 API 调用次数不超过 15 次
3. WHEN 运行 E2E 测试时 THEN 测试套件 SHALL 验证代码质量评分达到 80/100 以上

### Requirement 6

**User Story:** 作为开发者，我希望有清晰的迁移路径，以便逐步将现有代码迁移到 Repository 模式。

#### Acceptance Criteria

1. WHEN 迁移现有 API 函数时 THEN 迁移过程 SHALL 分阶段进行：第一阶段迁移高频调用的 API，第二阶段迁移中频调用的 API，第三阶段迁移低频调用的 API
2. WHEN 每个阶段完成后 THEN 迁移过程 SHALL 运行 E2E 测试验证功能正常且 API 调用次数减少
3. WHEN 所有迁移完成后 THEN 迁移过程 SHALL 更新文档说明 Repository 的使用方法
