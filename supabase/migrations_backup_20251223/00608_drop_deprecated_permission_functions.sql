/*
# 删除已废弃的权限函数

## 背景
在 00598_optimize_permission_tables_update_rls_and_drop_old_tables_v2.sql 中：
- 删除了 user_roles, roles, permissions, role_permissions 表
- 但相关的权限函数可能还存在，导致调用时出错

## 本次迁移
删除所有依赖已删除表的权限函数：
- get_user_permissions
- has_permission
- has_any_permission
- has_all_permissions

## 执行时间
2025-12-03
*/

-- 删除依赖 user_roles 表的权限函数
DROP FUNCTION IF EXISTS get_user_permissions(uuid);
DROP FUNCTION IF EXISTS has_permission(uuid, text);
DROP FUNCTION IF EXISTS has_any_permission(uuid, text[]);
DROP FUNCTION IF EXISTS has_all_permissions(uuid, text[]);

-- 确认删除
DO $$
BEGIN
  RAISE NOTICE '=== 已删除废弃的权限函数 ===';
  RAISE NOTICE '已删除的函数:';
  RAISE NOTICE '  - get_user_permissions(uuid)';
  RAISE NOTICE '  - has_permission(uuid, text)';
  RAISE NOTICE '  - has_any_permission(uuid, text[])';
  RAISE NOTICE '  - has_all_permissions(uuid, text[])';
  RAISE NOTICE '';
  RAISE NOTICE '注意: 权限控制现在直接使用 users.role 字段';
  RAISE NOTICE '=== 清理完成 ===';
END $$;
