# 物理隔离架构迁移状态

## 项目概述

将车队管家系统从**逻辑隔离架构**（单一数据库 + boss_id）迁移到**物理隔离架构**（每个老板独立数据库）。

## 架构对比

### 旧架构：逻辑隔离
```
所有老板 → 单一 Supabase 项目 → 共享数据库
                                ↓
                        通过 boss_id 区分租户
```

### 新架构：物理隔离
```
老板A → Supabase项目A → 数据库A（完全独立）
老板B → Supabase项目B → 数据库B（完全独立）
老板C → Supabase项目C → 数据库C（完全独立）
```

## 已完成的工作

### ✅ 1. 数据库结构重构

#### 1.1 删除所有表中的 boss_id 字段
已删除以下 21 个表的 boss_id 字段：
- ✅ attendance
- ✅ attendance_rules
- ✅ category_prices
- ✅ driver_licenses
- ✅ driver_warehouses
- ✅ feedback
- ✅ leases
- ✅ leave_applications
- ✅ manager_warehouses
- ✅ notification_config
- ✅ notifications
- ✅ piece_work_records
- ✅ profiles
- ✅ resignation_applications
- ✅ system_performance_metrics
- ✅ user_behavior_logs
- ✅ user_feature_weights
- ✅ user_permissions
- ✅ vehicle_records
- ✅ vehicles
- ✅ warehouses

#### 1.2 删除 boss_id 相关的函数
- ✅ get_current_user_boss_id()
- ✅ get_user_role_and_boss(uuid)
- ✅ auto_set_boss_id()

#### 1.3 创建新的简化辅助函数
- ✅ get_user_role(p_user_id uuid) - 获取用户角色
- ✅ is_admin(p_user_id uuid) - 检查是否是管理员
- ✅ is_manager(p_user_id uuid) - 检查是否是车队长
- ✅ is_driver(p_user_id uuid) - 检查是否是司机

#### 1.4 更新触发器和约束
- ✅ 重新创建 auto_init_user_permissions() 函数（不使用 boss_id）
- ✅ 重新创建 get_notification_recipients() 函数（不使用 boss_id）
- ✅ 更新 user_permissions 表的唯一约束（user_id）
- ✅ 更新 notification_config 表的唯一约束（notification_type）

#### 1.5 初始化默认通知配置
- ✅ 插入默认的通知配置数据

### ✅ 2. 类型定义更新

已更新 `src/db/types.ts`，删除以下接口中的 boss_id 字段：
- ✅ Profile 接口
- ✅ LeaseBill 接口
- ✅ Lease 接口
- ✅ CreateLeaseInput 接口

## 待完成的工作

### ⏳ 3. 前端代码重构

需要更新以下文件，删除所有 boss_id 相关代码：

#### 3.1 数据库 API 层
- ⏳ `src/db/api.ts` - 删除所有 API 调用中的 boss_id 参数和过滤条件
  - 删除 `getCurrentUserBossId()` 函数调用
  - 删除查询中的 `.eq('boss_id', bossId)` 过滤条件
  - 删除插入数据时的 `boss_id` 字段
  - 更新所有函数签名，删除 `bossId` 参数

- ⏳ `src/db/tenantQuery.ts` - 删除租户查询相关的 boss_id 逻辑
- ⏳ `src/db/notificationApi.ts` - 删除通知 API 中的 boss_id 参数
- ⏳ `src/db/batchQuery.ts` - 删除批量查询中的 boss_id 过滤

#### 3.2 工具函数和服务
- ⏳ `src/db/tenant-utils.ts` - 删除租户工具函数中的 boss_id 逻辑
- ⏳ `src/client/tenant-supabase.ts` - 删除租户 Supabase 客户端中的 boss_id 逻辑
- ⏳ `src/services/notificationService.ts` - 删除通知服务中的 boss_id 参数
- ⏳ `src/utils/behaviorTracker.ts` - 删除行为追踪中的 boss_id 字段
- ⏳ `src/utils/performanceMonitor.ts` - 删除性能监控中的 boss_id 字段

#### 3.3 上下文和状态管理
- ⏳ `src/contexts/TenantContext.tsx` - 删除租户上下文中的 boss_id 状态

#### 3.4 页面组件
- ⏳ `src/pages/driver/leave/apply/index.tsx` - 删除请假申请页面中的 boss_id 逻辑
- ⏳ `src/pages/lease-admin/tenant-form/index.tsx` - 删除租户表单中的 boss_id 字段
- ⏳ `src/pages/lease-admin/lease-list/index.tsx` - 删除租赁列表中的 boss_id 过滤
- ⏳ `src/pages/super-admin/user-management/index.tsx` - 删除用户管理中的 boss_id 逻辑

### ⏳ 4. RLS 策略重构

需要更新所有表的 RLS 策略：

#### 4.1 核心原则
- 删除所有基于 boss_id 的过滤条件
- 只关注角色权限（super_admin, peer_admin, manager, driver）
- 简化策略逻辑

#### 4.2 需要更新的表
- ⏳ profiles - 已在 `99990_update_profiles_rls_with_strict_driver_isolation.sql` 中更新
- ⏳ notifications
- ⏳ leave_applications
- ⏳ resignation_applications
- ⏳ vehicles
- ⏳ warehouses
- ⏳ attendance
- ⏳ piece_work_records
- ⏳ driver_warehouses
- ⏳ manager_warehouses
- ⏳ category_prices
- ⏳ attendance_rules
- ⏳ feedback
- ⏳ leases
- ⏳ vehicle_records

### ⏳ 5. 租户管理系统

需要创建中央管理系统来管理所有租户：

#### 5.1 中央数据库
- ⏳ 创建中央 Supabase 项目
- ⏳ 创建 tenants 表存储租户配置
  ```sql
  CREATE TABLE tenants (
    id uuid PRIMARY KEY,
    name text NOT NULL,
    supabase_url text NOT NULL,
    supabase_anon_key text NOT NULL,
    admin_email text,
    admin_phone text,
    created_at timestamptz DEFAULT now(),
    expires_at timestamptz,
    is_active boolean DEFAULT true
  );
  ```

#### 5.2 登录流程
- ⏳ 实现租户配置查询
- ⏳ 实现动态 Supabase 客户端创建
- ⏳ 更新登录页面逻辑

#### 5.3 环境变量
- ⏳ 添加中央管理系统配置
  ```env
  TARO_APP_CENTRAL_SUPABASE_URL=https://central.supabase.co
  TARO_APP_CENTRAL_SUPABASE_ANON_KEY=central_anon_key
  ```

### ⏳ 6. 数据迁移

需要将现有数据从共享数据库迁移到各个独立数据库：

#### 6.1 迁移步骤
1. ⏳ 为每个老板创建独立的 Supabase 项目
2. ⏳ 导出每个老板的数据（按 boss_id 过滤）
3. ⏳ 导入数据到对应的独立数据库
4. ⏳ 验证数据完整性

#### 6.2 迁移脚本
- ⏳ 创建数据导出脚本
- ⏳ 创建数据导入脚本
- ⏳ 创建数据验证脚本

### ⏳ 7. 测试

#### 7.1 功能测试
- ⏳ 测试用户登录流程
- ⏳ 测试数据查询（确保不会查询到其他租户的数据）
- ⏳ 测试数据插入（确保不需要 boss_id）
- ⏳ 测试权限控制（RLS 策略）

#### 7.2 性能测试
- ⏳ 测试查询性能（不需要 boss_id 过滤）
- ⏳ 测试并发性能

#### 7.3 安全测试
- ⏳ 测试数据隔离（确保租户之间数据完全隔离）
- ⏳ 测试权限控制（确保用户只能访问有权限的数据）

## 迁移文件

### 已创建的迁移文件
1. ✅ `supabase/migrations/remove_boss_id_step1.sql` - 删除 boss_id 字段和旧函数
2. ✅ `supabase/migrations/remove_boss_id_step2.sql` - 创建新的辅助函数和更新约束
3. ✅ `supabase/migrations/99999_remove_boss_id_physical_isolation.sql` - 迁移记录文档

### 需要创建的迁移文件
1. ⏳ 更新所有表的 RLS 策略
2. ⏳ 创建中央管理系统数据库结构

## 注意事项

### 1. 数据安全
- ⚠️ 在删除 boss_id 字段之前，务必备份所有数据
- ⚠️ 确保每个老板的数据已经迁移到独立数据库

### 2. 成本考虑
- ⚠️ 每个 Supabase 项目单独计费，成本会增加
- ⚠️ 需要评估总体成本是否可接受

### 3. 管理复杂度
- ⚠️ 需要管理多个 Supabase 项目
- ⚠️ 需要创建中央管理系统

### 4. 向后兼容
- ⚠️ 旧的 API 调用会失败（因为删除了 boss_id 参数）
- ⚠️ 需要同时更新前端和后端代码

## 下一步行动

### 立即执行
1. ⏳ 更新 `src/db/api.ts`，删除所有 boss_id 相关代码
2. ⏳ 更新其他数据库 API 文件
3. ⏳ 更新页面组件

### 短期计划
1. ⏳ 创建中央管理系统
2. ⏳ 实现租户配置管理
3. ⏳ 更新登录流程

### 长期计划
1. ⏳ 数据迁移
2. ⏳ 全面测试
3. ⏳ 部署上线

## 总结

### 已完成
- ✅ 数据库结构重构（删除所有 boss_id 字段）
- ✅ 创建新的辅助函数（不使用 boss_id）
- ✅ 更新类型定义（删除 boss_id 字段）

### 进行中
- ⏳ 前端代码重构（删除 boss_id 相关逻辑）

### 待开始
- ⏳ RLS 策略重构
- ⏳ 租户管理系统
- ⏳ 数据迁移
- ⏳ 测试

### 预计完成时间
- 前端代码重构：2-3 天
- RLS 策略重构：1 天
- 租户管理系统：2-3 天
- 数据迁移：1-2 天
- 测试：2-3 天

**总计：8-12 天**
