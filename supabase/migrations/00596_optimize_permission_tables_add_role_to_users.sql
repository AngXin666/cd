/*
# 权限表优化 - 第1步：在users表添加role字段并迁移数据

## 背景
当前系统使用5个表实现RBAC权限系统：
- users（用户表）
- user_roles（用户角色关联表）- 使用频率51次
- roles（角色表）- 使用频率1次
- permissions（权限表）- 使用频率1次
- role_permissions（角色权限关联表）- 使用频率3次

实际上系统只使用4个固定角色（BOSS/MANAGER/DISPATCHER/DRIVER），
不需要复杂的RBAC系统。本次优化将role字段直接添加到users表，
简化结构，提升性能。

## 本次迁移内容

1. 在users表添加role字段
   - 类型：user_role（复用现有枚举类型）
   - 默认值：'DRIVER'
   - 可为空：否

2. 数据迁移
   - 将user_roles表的数据迁移到users.role字段
   - 验证数据完整性

3. 说明
   - 本次迁移不删除旧表，确保数据安全
   - 删除旧表将在下一个迁移中执行
   - 保持向后兼容，RLS函数暂不修改

## 注意事项
- 使用现有的user_role枚举类型
- 所有用户必须有角色，不允许为空
- 迁移后验证数据一致性
*/

-- 第1步：在users表添加role字段
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS role user_role DEFAULT 'DRIVER'::user_role NOT NULL;

-- 第2步：从user_roles表迁移数据到users表
UPDATE users u
SET role = ur.role
FROM user_roles ur
WHERE u.id = ur.user_id;

-- 第3步：为role字段创建索引（提升查询性能）
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 第4步：验证数据迁移结果
DO $$
DECLARE
  total_users INTEGER;
  users_with_role INTEGER;
  users_without_role INTEGER;
  user_roles_count INTEGER;
BEGIN
  -- 统计users表
  SELECT COUNT(*) INTO total_users FROM users;
  SELECT COUNT(*) INTO users_with_role FROM users WHERE role IS NOT NULL;
  SELECT COUNT(*) INTO users_without_role FROM users WHERE role IS NULL;
  
  -- 统计user_roles表
  SELECT COUNT(*) INTO user_roles_count FROM user_roles;
  
  -- 输出验证信息
  RAISE NOTICE '=== 数据迁移验证 ===';
  RAISE NOTICE 'users表总用户数: %', total_users;
  RAISE NOTICE 'users表有角色的用户数: %', users_with_role;
  RAISE NOTICE 'users表无角色的用户数: %', users_without_role;
  RAISE NOTICE 'user_roles表记录数: %', user_roles_count;
  
  -- 检查是否有数据不一致
  IF users_without_role > 0 THEN
    RAISE WARNING '警告：有%个用户没有角色！', users_without_role;
  END IF;
  
  RAISE NOTICE '=== 验证完成 ===';
END $$;
