# Implementation Plan - 权限系统字段修复

## 概述

移除代码中对不存在的 `users.permission_type` 数据库字段的引用，改为基于用户角色和 `manager_permissions_enabled` 字段推断权限级别。

---

## 当前状态

**✅ 已完成**

- 代码修改已完成并部署 (v1.3.25)
- 数据库迁移已执行完成
- `manager_permissions_enabled` 字段已添加到 users 表

---

## 任务列表

- [x] 1. 修改 users.ts 中的 getManagerPermission 函数
  - [x] 1.1 移除对 permission_type 字段的查询
  - [x] 1.2 修改权限推断逻辑
  - [x] 1.3 编写属性测试验证权限推断逻辑

- [x] 2. 修改权限配置页面
  - [x] 2.1 修改 loadData 函数（添加字段存在性检查和备用查询）
  - [x] 2.2 修改 handleSave 函数（添加字段存在性检查和友好错误提示）
  - [x] 2.3 修改 handleDelete 函数（添加字段存在性检查）

- [x] 3. 修改用户管理页面
  - [x] 3.1 移除创建用户时设置 permission_type 的代码
  - [x] 3.2 移除 useUserManagement hook 中的 permission_type 引用

- [x] 4. 全局检查并移除所有 permission_type 引用
  - [x] 4.1 使用 grep 搜索所有 permission_type 引用
  - [x] 4.2 修复发现的其他引用

- [x] 5. 本地测试验证
  - [x] 5.1 构建 H5 并启动本地服务器测试

- [x] 6. Checkpoint - 代码修改完成
  - [x] 代码已添加字段存在性检查
  - [x] 已部署 v1.3.25

- [x] 7. 数据库迁移
  - [x] 7.1 在 Supabase Dashboard SQL Editor 执行迁移脚本
  - [x] 7.2 验证权限配置功能正常工作

---

## 注意事项

1. **向后兼容**：当 `manager_permissions_enabled` 为 null 时，默认为 true（完整权限）

2. **数据库迁移**：
   - 迁移脚本位置：`supabase/migrations/00628_add_manager_permissions_enabled_field.sql`
   - 需要在 Supabase Dashboard 的 SQL Editor 中手动执行

3. **保留应用层权限系统**：
   - `src/config/permission-config.ts` - 保留
   - `src/services/permission-service.ts` - 保留

4. **测试时注意**：
   - 在执行数据库迁移前，权限配置页面会显示"需要数据库升级"警告
   - 执行迁移后，权限配置功能应该正常工作

