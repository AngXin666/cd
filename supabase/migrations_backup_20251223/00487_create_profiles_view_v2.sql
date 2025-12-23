/*
# 创建 profiles 视图以兼容旧代码（修订版）

## 背景
系统从多租户架构迁移到单用户架构后，将 profiles 表拆分为 users 和 user_roles 两个表。
但是有大量旧代码仍在引用 profiles 表（78 处引用）。

## 解决方案
创建一个 profiles 视图，将 users 和 user_roles 的数据合并，以兼容旧代码。
这样可以最小化代码改动，避免手动修复 78 处引用。

## 视图结构
- id: 用户ID（来自 users 表）
- name: 用户名（来自 users 表）
- email: 邮箱（来自 users 表）
- phone: 手机号（来自 users 表）
- role: 角色（来自 user_roles 表）
- status: 状态（固定为 'active'，单用户系统不需要状态管理）
- created_at: 创建时间（来自 users 表）
- updated_at: 更新时间（来自 users 表）
- main_account_id: 主账号ID（固定为 NULL，单用户系统不需要）

## 注意事项
1. 这是一个只读视图，不支持 INSERT/UPDATE/DELETE 操作
2. 如果需要修改数据，应该直接操作 users 和 user_roles 表
3. 这是一个临时兼容方案，长期应该重构代码以直接使用新表
*/

-- 创建 profiles 视图
CREATE OR REPLACE VIEW profiles AS
SELECT 
  u.id,
  u.name,
  u.email,
  u.phone,
  ur.role,
  'active'::text AS status,  -- 固定为 'active'
  u.created_at,
  u.updated_at,
  NULL::uuid AS main_account_id  -- 单用户系统不需要主账号ID
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id;