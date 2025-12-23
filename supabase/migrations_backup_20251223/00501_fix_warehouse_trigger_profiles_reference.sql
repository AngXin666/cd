/*
# 修复仓库触发器中的 profiles 表引用

## 问题描述
- `warehouses` 表的 `prevent_delete_last_warehouse` 触发器函数引用了已删除的 `profiles` 表
- 导致更新或删除仓库时报错：relation "profiles" does not exist

## 修复内容
1. 删除旧的触发器函数
2. 重新创建触发器函数，将 `profiles` 表引用改为 `users` 表
3. 将 `lease_admin` 角色改为 `BOSS` 角色（单用户系统中的老板角色）
4. 删除 `boss_id` 字段的引用（单用户系统中不再使用）

## 注意事项
- 在单用户系统中，不再需要检查租户和老板号
- 简化逻辑：只检查用户角色是否为 BOSS
- BOSS 角色的用户可以删除任何仓库
*/

-- 删除旧的触发器
DROP TRIGGER IF EXISTS check_last_warehouse_before_delete ON warehouses;

-- 删除旧的触发器函数
DROP FUNCTION IF EXISTS prevent_delete_last_warehouse();

-- 重新创建触发器函数（适配单用户系统）
CREATE OR REPLACE FUNCTION prevent_delete_last_warehouse()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  warehouse_count INT;
  user_role_value user_role;
BEGIN
  -- 获取当前用户的角色
  SELECT role INTO user_role_value
  FROM users
  WHERE id = auth.uid();

  -- 如果是 BOSS 角色，允许删除任何仓库
  IF user_role_value = 'BOSS'::user_role THEN
    RETURN OLD;
  END IF;

  -- 统计系统中的仓库总数
  SELECT COUNT(*) INTO warehouse_count
  FROM warehouses;

  -- 如果只剩一个仓库，阻止删除
  IF warehouse_count <= 1 THEN
    RAISE EXCEPTION '无法删除：系统必须保留至少一个仓库';
  END IF;

  RETURN OLD;
END;
$$;

-- 重新创建触发器
CREATE TRIGGER check_last_warehouse_before_delete
  BEFORE DELETE ON warehouses
  FOR EACH ROW
  EXECUTE FUNCTION prevent_delete_last_warehouse();