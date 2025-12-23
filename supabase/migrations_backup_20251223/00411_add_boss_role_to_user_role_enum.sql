/*
# 向 user_role 枚举类型添加 boss 角色

## 问题描述
- user_role 枚举类型缺少 boss（老板）角色
- 系统的正确角色层级：
  1. 超级管理员（super_admin）- 系统最高权限
  2. 老板（boss）- 租户的所有者
  3. 平级账户（peer_admin）- 对等管理员
  4. 车队长（manager）- 车队管理员
  5. 司机（driver）- 普通司机

## 解决方案
- 向 user_role 枚举类型添加 boss 值
- 使用 ALTER TYPE ... ADD VALUE 语法

## 注意事项
- 枚举值添加后不能删除
- 添加操作不能在事务中回滚
*/

-- 向 user_role 枚举类型添加 boss 角色
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'boss';

-- 验证枚举类型
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = 'user_role'::regtype
ORDER BY enumsortorder;
