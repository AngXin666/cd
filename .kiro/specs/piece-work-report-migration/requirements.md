# Requirements Document

## Introduction

本需求文档定义了将计件报表页面从旧缓存系统迁移到新缓存系统的需求。计件报表页面是车队管理系统中的重要功能模块，用于展示司机的计件工作统计和报表数据。当前这两个页面（老板端和车队长端）仍在使用旧的缓存函数，需要迁移到新的统一缓存系统以提高性能和可维护性。

## Glossary

- **计件报表页面 (Piece Work Report Page)**: 显示司机计件工作统计数据的页面，包括完成率、工作量等信息
- **老板端 (Super Admin)**: 系统超级管理员角色，可以查看所有数据
- **车队长端 (Manager)**: 车队管理员角色，可以查看所管理仓库的数据
- **旧缓存系统 (Old Cache System)**: 使用 `getVersionedCache`, `setVersionedCache`, `clearVersionedCache` 的缓存方案
- **新缓存系统 (New Cache System)**: 使用 `useUserListCache` Hook 的统一缓存方案
- **用户列表缓存 (User List Cache)**: 缓存用户（司机）列表数据的系统
- **计件记录 (Piece Work Record)**: 司机的计件工作记录数据
- **仓库 (Warehouse)**: 车队的仓库/站点

## Requirements

### Requirement 1

**User Story:** 作为开发者，我希望将老板端计件报表页面迁移到新缓存系统，以便提高性能和代码可维护性。

#### Acceptance Criteria

1. WHEN 老板端计件报表页面加载时 THEN 系统 SHALL 使用 `useUserListCache` Hook 获取用户列表数据
2. WHEN 用户列表数据更新时 THEN 系统 SHALL 自动刷新计件报表页面的显示
3. WHEN 页面卸载时 THEN 系统 SHALL 正确清理缓存订阅和资源
4. WHEN 用户下拉刷新时 THEN 系统 SHALL 通过新缓存系统刷新数据
5. WHEN 页面切换回来时 THEN 系统 SHALL 从缓存中快速加载数据而不是重新请求

### Requirement 2

**User Story:** 作为开发者，我希望将车队长端计件报表页面迁移到新缓存系统，以便与老板端保持一致的实现方式。

#### Acceptance Criteria

1. WHEN 车队长端计件报表页面加载时 THEN 系统 SHALL 使用 `useUserListCache` Hook 获取用户列表数据
2. WHEN 用户列表数据更新时 THEN 系统 SHALL 自动刷新计件报表页面的显示
3. WHEN 页面卸载时 THEN 系统 SHALL 正确清理缓存订阅和资源
4. WHEN 用户下拉刷新时 THEN 系统 SHALL 通过新缓存系统刷新数据
5. WHEN 车队长只能看到自己管理的仓库数据时 THEN 系统 SHALL 正确过滤用户列表

### Requirement 3

**User Story:** 作为开发者，我希望移除旧缓存函数的调用，以便简化代码并避免维护两套缓存系统。

#### Acceptance Criteria

1. WHEN 迁移完成后 THEN 计件报表页面 SHALL NOT 包含对 `getVersionedCache` 的调用
2. WHEN 迁移完成后 THEN 计件报表页面 SHALL NOT 包含对 `setVersionedCache` 的调用
3. WHEN 迁移完成后 THEN 计件报表页面 SHALL NOT 包含对 `clearVersionedCache` 的调用
4. WHEN 迁移完成后 THEN 计件报表页面 SHALL 只使用 `useUserListCache` Hook 进行用户数据缓存

### Requirement 4

**User Story:** 作为用户，我希望迁移后的计件报表页面功能保持不变，以便继续正常使用系统。

#### Acceptance Criteria

1. WHEN 用户访问计件报表页面时 THEN 系统 SHALL 显示与迁移前相同的数据和界面
2. WHEN 用户进行任何操作时 THEN 系统 SHALL 提供与迁移前相同的功能和交互
3. WHEN 数据加载时 THEN 系统 SHALL 显示适当的加载状态
4. WHEN 发生错误时 THEN 系统 SHALL 显示清晰的错误信息
5. WHEN 用户刷新页面时 THEN 系统 SHALL 正确重新加载数据

### Requirement 5

**User Story:** 作为开发者，我希望确保迁移后的代码质量，以便长期维护和扩展。

#### Acceptance Criteria

1. WHEN 代码编写完成时 THEN 所有函数 SHALL 包含完整的 JSDoc 注释
2. WHEN 代码编写完成时 THEN 所有复杂逻辑 SHALL 包含行内注释说明
3. WHEN 代码编写完成时 THEN 代码 SHALL 遵循项目的 TypeScript 和 React 编码规范
4. WHEN 代码编写完成时 THEN 代码 SHALL 通过 lint 检查
5. WHEN 迁移完成时 THEN 相关文档 SHALL 已同步更新

### Requirement 6

**User Story:** 作为开发者，我希望验证迁移的正确性，以便确保没有引入新的问题。

#### Acceptance Criteria

1. WHEN 迁移完成后 THEN 系统 SHALL 能够正常编译和运行
2. WHEN 运行测试时 THEN 所有现有测试 SHALL 继续通过
3. WHEN 手动测试时 THEN 计件报表页面的所有功能 SHALL 正常工作
4. WHEN 对比迁移前后时 THEN 页面性能 SHALL 保持或提升
5. WHEN 检查控制台时 THEN 系统 SHALL NOT 输出错误或警告信息
