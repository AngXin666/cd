/*
# 修复平级账号无法获取车队数据的问题

## 问题描述
平级账号（main_account_id 不为 NULL 的 super_admin）无法访问车队数据

## 原因分析
`get_user_tenant_id()` 函数的逻辑有问题：
- 原逻辑：所有 super_admin 角色都返回 p.id
- 问题：平级账号的 role 也是 'super_admin'，但它应该返回 tenant_id 而不是自己的 id

## 修复方案
区分主账号和平级账号：
1. 主账号（main_account_id IS NULL 且 role = 'super_admin'）→ 返回 p.id
2. 平级账号（main_account_id IS NOT NULL）→ 返回 p.tenant_id
3. 其他角色（manager, driver）→ 返回 p.tenant_id

## 测试验证
修复后，平级账号应该能够：
- 查看主账号租户下的所有车辆
- 查看主账号租户下的所有司机
- 查看主账号租户下的所有仓库
- 查看主账号租户下的所有业务数据
*/

-- 修复 get_user_tenant_id 函数
CREATE OR REPLACE FUNCTION get_user_tenant_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT 
    CASE 
      -- 主账号：main_account_id 为 NULL 且角色为 super_admin
      WHEN p.role = 'super_admin'::user_role AND p.main_account_id IS NULL THEN p.id
      -- 平级账号和其他角色：使用 tenant_id
      ELSE p.tenant_id
    END
  FROM profiles p
  WHERE p.id = auth.uid();
$$;
