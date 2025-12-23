/*
# 修复租赁管理员删除租户时的仓库约束问题

## 问题描述
当租赁管理员删除租户时，由于触发器 prevent_delete_last_warehouse() 的限制，
无法删除租户的最后一个仓库，导致整个删除操作失败。

## 解决方案
修改触发器逻辑，添加例外条件：
1. 如果是租赁管理员执行删除操作，允许删除最后一个仓库
2. 如果租户本身正在被删除（通过级联删除），允许删除最后一个仓库
3. 其他情况下，保持原有的保护逻辑

## 变更内容
1. 修改 prevent_delete_last_warehouse() 函数
2. 添加租赁管理员检查逻辑

## 影响范围
- 租赁管理员可以删除租户及其所有仓库
- 普通用户仍然受到"至少保留一个仓库"的限制
*/

-- 修改函数：允许租赁管理员删除最后一个仓库
CREATE OR REPLACE FUNCTION prevent_delete_last_warehouse()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  warehouse_count INT;
  is_lease_admin_user BOOLEAN;
  tenant_exists BOOLEAN;
BEGIN
  -- 检查当前用户是否为租赁管理员
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'lease_admin'::user_role
  ) INTO is_lease_admin_user;

  -- 如果是租赁管理员，允许删除
  IF is_lease_admin_user THEN
    RETURN OLD;
  END IF;

  -- 检查租户是否还存在（如果租户正在被删除，这个查询会返回 false）
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = OLD.boss_id
  ) INTO tenant_exists;

  -- 如果租户不存在或正在被删除，允许删除仓库
  IF NOT tenant_exists THEN
    RETURN OLD;
  END IF;

  -- 统计该租户的仓库数量
  SELECT COUNT(*) INTO warehouse_count
  FROM warehouses
  WHERE boss_id = OLD.boss_id;

  -- 如果只剩一个仓库，阻止删除
  IF warehouse_count <= 1 THEN
    RAISE EXCEPTION '无法删除：每个老板号必须保留至少一个仓库';
  END IF;

  RETURN OLD;
END;
$$;

COMMENT ON FUNCTION prevent_delete_last_warehouse() IS 
'防止删除最后一个仓库，但允许租赁管理员删除租户时删除所有仓库';