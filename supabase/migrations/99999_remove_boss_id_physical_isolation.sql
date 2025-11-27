/*
# 物理隔离架构 - 删除所有 boss_id 字段（完整迁移记录）

## 核心理念
每个老板拥有完全独立的 Supabase 项目和数据库，数据在物理上完全隔离。
不需要 boss_id 字段进行逻辑隔离。

## 已完成的变更

### 1. 删除所有表中的 boss_id 字段
- attendance
- attendance_rules
- category_prices
- driver_licenses
- driver_warehouses
- feedback
- leases
- leave_applications
- manager_warehouses
- notification_config
- notifications
- piece_work_records
- profiles
- resignation_applications
- system_performance_metrics
- user_behavior_logs
- user_feature_weights
- user_permissions
- vehicle_records
- vehicles
- warehouses

### 2. 删除 boss_id 相关的函数
- get_current_user_boss_id()
- get_user_role_and_boss(uuid)
- auto_set_boss_id()

### 3. 创建新的简化辅助函数
- get_user_role(p_user_id uuid) - 获取用户角色
- is_admin(p_user_id uuid) - 检查是否是管理员
- is_manager(p_user_id uuid) - 检查是否是车队长
- is_driver(p_user_id uuid) - 检查是否是司机

### 4. 更新触发器和约束
- 重新创建 auto_init_user_permissions() 函数（不使用 boss_id）
- 重新创建 get_notification_recipients() 函数（不使用 boss_id）
- 更新 user_permissions 表的唯一约束
- 更新 notification_config 表的唯一约束

### 5. 初始化默认通知配置
- 插入默认的通知配置数据

## 下一步工作

### 前端代码重构
1. 更新 src/db/types.ts - 删除所有接口中的 boss_id 字段 ✅
2. 更新 src/db/api.ts - 删除所有 API 调用中的 boss_id 参数和过滤条件
3. 更新 src/db/tenantQuery.ts - 删除租户查询相关的 boss_id 逻辑
4. 更新 src/db/notificationApi.ts - 删除通知 API 中的 boss_id 参数
5. 更新 src/db/batchQuery.ts - 删除批量查询中的 boss_id 过滤
6. 更新 src/db/tenant-utils.ts - 删除租户工具函数中的 boss_id 逻辑
7. 更新 src/client/tenant-supabase.ts - 删除租户 Supabase 客户端中的 boss_id 逻辑
8. 更新 src/contexts/TenantContext.tsx - 删除租户上下文中的 boss_id 状态
9. 更新 src/services/notificationService.ts - 删除通知服务中的 boss_id 参数
10. 更新 src/utils/behaviorTracker.ts - 删除行为追踪中的 boss_id 字段
11. 更新 src/utils/performanceMonitor.ts - 删除性能监控中的 boss_id 字段
12. 更新所有页面组件 - 删除页面中的 boss_id 相关逻辑

### RLS 策略重构
1. 更新所有表的 RLS 策略，删除 boss_id 相关的过滤条件
2. 简化 RLS 策略，只关注角色权限

## 注意事项

### 数据迁移
- 在删除 boss_id 字段之前，确保已经为每个老板创建了独立的 Supabase 项目
- 需要将数据从共享数据库迁移到各个独立数据库中

### 环境变量
- 每个租户需要独立的 SUPABASE_URL 和 SUPABASE_ANON_KEY
- 需要创建中央管理系统来管理所有租户的配置

### 登录流程
- 需要先查询中央数据库获取租户配置
- 然后使用租户的 Supabase 客户端进行登录
*/

-- 此文件仅用于记录迁移历史，实际迁移已在以下文件中完成：
-- 1. remove_boss_id_step1.sql - 删除 boss_id 字段和旧函数
-- 2. remove_boss_id_step2.sql - 创建新的辅助函数和更新约束
