# Implementation Plan - 清理策略模板权限系统

## 概述

删除项目中废弃的策略模板权限系统，统一使用应用层权限控制系统。

## 影响分析

### 需要删除的文件
- `src/db/api/permission-strategy.ts` - 策略模板 API（整个文件）

### 需要修改的文件
- `src/db/api.ts` - 移除 permission-strategy 的导出和引用
- `src/pages/super-admin/permission-config/index.tsx` - 已修改，改用直接更新 users 表
- `src/pages/super-admin/staff-management/index.tsx` - 需要修改，移除对 permission-strategy 的依赖

### 需要检查的文件（可能有引用）
- `src/db/api/users.ts` - 检查 getManagerPermission 函数
- `src/db/api/permission-context.ts` - 检查是否依赖策略模板系统

### 数据库迁移文件（标记为废弃，不删除）
- `00547_refactor_peer_admin_to_strategy.sql`
- `00548_cleanup_peer_admin_old_implementation.sql`
- `00551_refactor_manager_to_strategy.sql`
- `00551_refactor_manager_to_strategy_template.sql`
- `00552_separate_boss_permissions.sql`
- `00559-00578` 系列迁移文件

---

## 任务列表

- [x] 1. 修改 staff-management 页面，移除对 permission-strategy 的依赖
  - [ ] 1.1 检查 staff-management/index.tsx 中的 getManagerPermission 调用
    - 文件：`src/pages/super-admin/staff-management/index.tsx`
    - 将 `UsersAPI.getManagerPermission` 改为从 `users` 表直接读取 `permission_type`
    - _Requirements: 1.1, 2.1_

- [x] 2. 修改 api.ts，移除 permission-strategy 的导出
  - [x] 2.1 移除 permission-strategy 相关的类型导出
    - 文件：`src/db/api.ts`
    - 删除 `UserPermissionInfo`, `UserPermissionDetail` 等类型导出
    - _Requirements: 1.1_
  - [x] 2.2 移除 permission-strategy 模块的动态导入
    - 文件：`src/db/api.ts`
    - 删除 `permissionStrategy` 相关的 case 分支
    - _Requirements: 1.1_

- [x] 3. 删除 permission-strategy.ts 文件
  - [x] 3.1 删除整个 permission-strategy.ts 文件
    - 文件：`src/db/api/permission-strategy.ts`
    - 确保没有其他文件引用此文件后再删除
    - _Requirements: 1.1, 1.2_

- [x] 4. 检查并修复 users.ts 中的权限函数
  - [x] 4.1 检查 getManagerPermission 函数
    - 文件：`src/db/api/users.ts`
    - 确保该函数不依赖策略模板系统
    - 如果依赖，修改为直接从 users 表读取
    - _Requirements: 1.2, 2.1_

- [x] 5. 检查 permission-context.ts
  - [x] 5.1 检查 getManagerPermissionContext 函数
    - 文件：`src/db/api/permission-context.ts`
    - 如果依赖数据库函数 `get_manager_permission_context`，需要修改或移除
    - _Requirements: 1.2_

- [x] 6. 标记废弃的数据库迁移文件
  - [x] 6.1 在迁移文件目录添加 README 说明
    - 文件：`supabase/migrations/README.md`
    - 说明哪些迁移文件是废弃的策略模板系统相关
    - _Requirements: 3.1_

- [x] 7. 本地测试验证
  - [x] 7.1 构建 H5 并启动本地服务器测试
    - 验证权限配置页面能正常加载和保存
    - 验证 staff-management 页面能正常显示
    - 验证应用层权限系统正常工作
    - _Requirements: 2.1, 2.2, 2.3_

---

## 注意事项

1. **不要删除应用层权限系统**：
   - `src/config/permission-config.ts` - 保留
   - `src/services/permission-service.ts` - 保留

2. **不要删除 users 表的 permission_type 字段**：
   - 这是简化后的权限存储方式

3. **数据库迁移文件不删除**：
   - 只标记为废弃，避免影响已部署的数据库

4. **测试时注意**：
   - 权限配置页面应该能正常保存权限
   - 不应该出现 "function not found" 错误
