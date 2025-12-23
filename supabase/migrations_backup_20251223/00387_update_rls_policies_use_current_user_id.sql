/*
# 更新 RLS 策略使用 current_user_id()

## 说明
更新所有 RLS 策略，使用安全代理函数 current_user_id() 替代直接调用 auth.uid()。
这是解决 RLS 策略中 auth.uid() 问题的正确方案。

## 修改内容
1. profiles 表的 RLS 策略
2. driver_warehouses 表的 RLS 策略
3. manager_warehouses 表的 RLS 策略
4. 其他相关表的 RLS 策略

## 核心原则
- 使用 public.current_user_id() 替代 auth.uid()
- 保留 RLS 策略的安全保护
- 显式指定函数路径

*/

-- ============================================================================
-- profiles 表的 RLS 策略
-- ============================================================================

-- 删除旧策略
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins have full access" ON profiles;

-- 创建新策略：用户可以查看自己的资料
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING (public.current_user_id() = id);

-- 创建新策略：用户可以更新自己的资料
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (public.current_user_id() = id);

-- 创建新策略：管理员有完全访问权限
CREATE POLICY "Admins have full access"
ON profiles FOR ALL
USING (is_admin(public.current_user_id()));

COMMENT ON POLICY "Users can view own profile" ON profiles 
IS '用户可以查看自己的资料，使用安全代理函数 current_user_id()';

COMMENT ON POLICY "Users can update own profile" ON profiles 
IS '用户可以更新自己的资料，使用安全代理函数 current_user_id()';

COMMENT ON POLICY "Admins have full access" ON profiles 
IS '管理员有完全访问权限，使用安全代理函数 current_user_id()';

-- ============================================================================
-- driver_warehouses 表的 RLS 策略
-- ============================================================================

-- 删除旧策略
DROP POLICY IF EXISTS "Authenticated users can view driver warehouses" ON driver_warehouses;
DROP POLICY IF EXISTS "Admins and managers can manage driver warehouses" ON driver_warehouses;

-- 创建新策略：认证用户可以查看
CREATE POLICY "Authenticated users can view driver warehouses"
ON driver_warehouses FOR SELECT
USING (
  public.current_user_id() IS NOT NULL
  AND (
    is_admin(public.current_user_id()) 
    OR is_manager(public.current_user_id()) 
    OR is_driver(public.current_user_id())
  )
);

-- 创建新策略：管理员和车队长可以管理
CREATE POLICY "Admins and managers can manage driver warehouses"
ON driver_warehouses FOR ALL
USING (
  public.current_user_id() IS NOT NULL
  AND (is_admin(public.current_user_id()) OR is_manager(public.current_user_id()))
)
WITH CHECK (
  public.current_user_id() IS NOT NULL
  AND (is_admin(public.current_user_id()) OR is_manager(public.current_user_id()))
);

COMMENT ON POLICY "Authenticated users can view driver warehouses" ON driver_warehouses 
IS '认证用户可以查看司机仓库关联，使用安全代理函数 current_user_id()';

COMMENT ON POLICY "Admins and managers can manage driver warehouses" ON driver_warehouses 
IS '管理员和车队长可以管理司机仓库关联，使用安全代理函数 current_user_id()';

-- ============================================================================
-- manager_warehouses 表的 RLS 策略
-- ============================================================================

-- 删除旧策略
DROP POLICY IF EXISTS "Authenticated users can view manager warehouses" ON manager_warehouses;
DROP POLICY IF EXISTS "Admins can manage manager warehouses" ON manager_warehouses;

-- 创建新策略：认证用户可以查看
CREATE POLICY "Authenticated users can view manager warehouses"
ON manager_warehouses FOR SELECT
USING (
  public.current_user_id() IS NOT NULL
  AND (
    is_admin(public.current_user_id()) 
    OR is_manager(public.current_user_id())
  )
);

-- 创建新策略：只有管理员可以管理
CREATE POLICY "Admins can manage manager warehouses"
ON manager_warehouses FOR ALL
USING (
  public.current_user_id() IS NOT NULL
  AND is_admin(public.current_user_id())
)
WITH CHECK (
  public.current_user_id() IS NOT NULL
  AND is_admin(public.current_user_id())
);

COMMENT ON POLICY "Authenticated users can view manager warehouses" ON manager_warehouses 
IS '认证用户可以查看车队长仓库关联，使用安全代理函数 current_user_id()';

COMMENT ON POLICY "Admins can manage manager warehouses" ON manager_warehouses 
IS '管理员可以管理车队长仓库关联，使用安全代理函数 current_user_id()';