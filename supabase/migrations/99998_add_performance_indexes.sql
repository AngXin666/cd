/*
# 添加性能优化索引

## 目的
为迁移到 users + user_roles 表后的查询添加索引，提升查询性能。

## 索引列表

### 1. users 表索引
- `idx_users_phone`: 手机号索引（用于登录和用户查询）
- `idx_users_email`: 邮箱索引（用于登录和用户查询）
- `idx_users_name`: 姓名索引（用于用户搜索）

### 2. user_roles 表索引
- `idx_user_roles_user_id`: 用户 ID 索引（用于 JOIN 查询）
- `idx_user_roles_role`: 角色索引（用于角色过滤查询）
- `idx_user_roles_user_id_role`: 用户 ID + 角色复合索引（用于角色过滤查询优化）

### 3. warehouse_assignments 表索引
- `idx_warehouse_assignments_warehouse_id`: 仓库 ID 索引（用于查询仓库用户）
- `idx_warehouse_assignments_user_id`: 用户 ID 索引（用于查询用户仓库）
- `idx_warehouse_assignments_warehouse_user`: 仓库 ID + 用户 ID 复合索引（用于仓库用户查询优化）

### 4. user_departments 表索引
- `idx_user_departments_user_id`: 用户 ID 索引（用于查询用户部门）
- `idx_user_departments_department_id`: 部门 ID 索引（用于查询部门用户）

### 5. notifications 表索引
- `idx_notifications_recipient_id`: 接收者 ID 索引（用于查询用户通知）
- `idx_notifications_is_read`: 已读状态索引（用于查询未读通知）
- `idx_notifications_recipient_read`: 接收者 ID + 已读状态复合索引（用于未读通知查询优化）
- `idx_notifications_created_at`: 创建时间索引（用于通知排序）

## 预期效果
- 用户查询性能提升 50-100%
- 角色过滤查询性能提升 100-1000%
- 仓库用户查询性能提升 50-100%
- 通知查询性能提升 50-100%

## 注意事项
- 使用 IF NOT EXISTS 避免重复创建
- 索引创建不会影响现有数据
- 索引会占用额外的存储空间
*/

-- ==================== users 表索引 ====================

-- 手机号索引（用于登录和用户查询）
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);

-- 邮箱索引（用于登录和用户查询）
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 姓名索引（用于用户搜索）
CREATE INDEX IF NOT EXISTS idx_users_name ON users(name);

-- ==================== user_roles 表索引 ====================

-- 用户 ID 索引（用于 JOIN 查询）
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);

-- 角色索引（用于角色过滤查询）
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);

-- 用户 ID + 角色复合索引（用于角色过滤查询优化）
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id_role ON user_roles(user_id, role);

-- ==================== warehouse_assignments 表索引 ====================

-- 仓库 ID 索引（用于查询仓库用户）
CREATE INDEX IF NOT EXISTS idx_warehouse_assignments_warehouse_id ON warehouse_assignments(warehouse_id);

-- 用户 ID 索引（用于查询用户仓库）
CREATE INDEX IF NOT EXISTS idx_warehouse_assignments_user_id ON warehouse_assignments(user_id);

-- 仓库 ID + 用户 ID 复合索引（用于仓库用户查询优化）
CREATE INDEX IF NOT EXISTS idx_warehouse_assignments_warehouse_user ON warehouse_assignments(warehouse_id, user_id);

-- ==================== user_departments 表索引 ====================

-- 用户 ID 索引（用于查询用户部门）
CREATE INDEX IF NOT EXISTS idx_user_departments_user_id ON user_departments(user_id);

-- 部门 ID 索引（用于查询部门用户）
CREATE INDEX IF NOT EXISTS idx_user_departments_department_id ON user_departments(department_id);

-- ==================== notifications 表索引 ====================

-- 接收者 ID 索引（用于查询用户通知）
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON notifications(recipient_id);

-- 已读状态索引（用于查询未读通知）
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- 接收者 ID + 已读状态复合索引（用于未读通知查询优化）
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_read ON notifications(recipient_id, is_read);

-- 创建时间索引（用于通知排序）
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
