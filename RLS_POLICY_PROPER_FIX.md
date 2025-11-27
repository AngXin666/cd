# RLS 策略正确修复方案

**日期**：2025-11-28  
**问题**：RLS 策略中的 `auth.uid()` 导致错误  
**修复原则**：使用安全代理函数和显式 Schema 路径

---

## 🔍 问题根源

### 当前的问题

1. **Schema 路径不明确**
   - 直接使用 `auth.uid()` 没有指定 Schema
   - 在某些环境下可能找不到函数
   - 导致 RLS 策略检查失败

2. **权限管理不清晰**
   - 没有统一的认证函数
   - 权限控制分散在各个 RLS 策略中
   - 难以维护和审计

3. **安全性问题**
   - 直接调用 `auth.uid()` 可能存在权限问题
   - 没有统一的安全检查点

---

## 🔧 正确的解决方案

### 方案概述

**核心思路**：
1. ✅ 创建安全代理函数 `current_user_id()`
2. ✅ 使用 `SECURITY DEFINER` 确保权限正确
3. ✅ 显式指定 Schema 路径 `public.auth.uid()`
4. ✅ 最小权限原则，仅授予 authenticated 角色

### 实施步骤

#### 步骤1：创建安全代理函数

```sql
-- 创建安全代理函数
CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER  -- 关键：以定义者权限执行
STABLE
AS $$
  -- 显式指定 Schema 路径
  SELECT auth.uid();
$$;

COMMENT ON FUNCTION public.current_user_id IS '安全代理函数，返回当前用户ID，显式指定 Schema 路径';

-- 回收 PUBLIC 权限
REVOKE ALL ON FUNCTION public.current_user_id() FROM PUBLIC;

-- 仅授予 authenticated 角色执行权限
GRANT EXECUTE ON FUNCTION public.current_user_id() TO authenticated;
```

**关键点**：
- ✅ 使用 `SECURITY DEFINER` 确保权限正确
- ✅ 显式指定 `auth.uid()` 的 Schema 路径
- ✅ 回收 PUBLIC 权限，仅授予 authenticated 角色
- ✅ 使用 `STABLE` 标记，表示函数在同一事务中返回相同结果

#### 步骤2：修改辅助函数

##### 修改 is_admin() 函数
```sql
CREATE OR REPLACE FUNCTION is_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- 如果 user_id 为 NULL，返回 false
  IF p_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- 查询用户角色
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = p_user_id 
    AND role IN ('super_admin', 'peer_admin')
  );
EXCEPTION
  WHEN OTHERS THEN
    -- 捕获任何错误，返回 false
    RETURN false;
END;
$$;

COMMENT ON FUNCTION is_admin IS '检查用户是否是管理员，能够处理无效的 UUID';
```

##### 修改 is_manager() 函数
```sql
CREATE OR REPLACE FUNCTION is_manager(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- 如果 user_id 为 NULL，返回 false
  IF p_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- 查询用户角色
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = p_user_id 
    AND role = 'manager'
  );
EXCEPTION
  WHEN OTHERS THEN
    -- 捕获任何错误，返回 false
    RETURN false;
END;
$$;

COMMENT ON FUNCTION is_manager IS '检查用户是否是车队长，能够处理无效的 UUID';
```

##### 修改 is_driver() 函数
```sql
CREATE OR REPLACE FUNCTION is_driver(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- 如果 user_id 为 NULL，返回 false
  IF p_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- 查询用户角色
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = p_user_id 
    AND role = 'driver'
  );
EXCEPTION
  WHEN OTHERS THEN
    -- 捕获任何错误，返回 false
    RETURN false;
END;
$$;

COMMENT ON FUNCTION is_driver IS '检查用户是否是司机，能够处理无效的 UUID';
```

#### 步骤3：修改 RLS 策略，使用 current_user_id()

##### profiles 表的 RLS 策略
```sql
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
```

##### driver_warehouses 表的 RLS 策略
```sql
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
```

##### manager_warehouses 表的 RLS 策略
```sql
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
```

#### 步骤4：验证权限与策略

##### 检查函数权限
```sql
-- 查看 current_user_id() 函数的权限
SELECT 
  proname AS function_name,
  proowner::regrole AS owner,
  prosecdef AS security_definer,
  proacl AS access_privileges
FROM pg_proc
WHERE proname = 'current_user_id';
```

##### 检查 RLS 策略
```sql
-- 查看所有 RLS 策略
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

##### 测试数据隔离
```sql
-- 测试1：检查 current_user_id() 是否正常工作
SELECT public.current_user_id() AS current_user;

-- 测试2：检查 is_admin() 是否正常工作
SELECT is_admin(public.current_user_id()) AS is_admin;

-- 测试3：检查 is_manager() 是否正常工作
SELECT is_manager(public.current_user_id()) AS is_manager;

-- 测试4：检查 is_driver() 是否正常工作
SELECT is_driver(public.current_user_id()) AS is_driver;

-- 测试5：查询 profiles 表（应该只能看到自己的资料或所有资料，取决于角色）
SELECT id, name, role FROM profiles;

-- 测试6：查询 driver_warehouses 表（应该根据角色返回不同的结果）
SELECT * FROM driver_warehouses;

-- 测试7：查询 manager_warehouses 表（应该根据角色返回不同的结果）
SELECT * FROM manager_warehouses;
```

---

## 📊 方案对比

### 方案1：修复辅助函数（之前的方案）

**优点**：
- ✅ 添加了异常处理
- ✅ 能够处理无效的 UUID

**缺点**：
- ❌ 没有解决 Schema 路径问题
- ❌ 没有统一的认证函数
- ❌ 权限管理不清晰

### 方案2：安全代理函数（当前方案）✅

**优点**：
- ✅ 创建了统一的认证函数 `current_user_id()`
- ✅ 显式指定 Schema 路径 `auth.uid()`
- ✅ 使用 `SECURITY DEFINER` 确保权限正确
- ✅ 最小权限原则，仅授予 authenticated 角色
- ✅ 易于维护和审计
- ✅ 更加专业和安全

**缺点**：
- 无明显缺点

---

## 🎯 核心注意事项

### 1. 禁止省略 SECURITY DEFINER

**错误示例**：
```sql
-- ❌ 错误：没有 SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT auth.uid();
$$;
```

**正确示例**：
```sql
-- ✅ 正确：添加 SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER  -- 必须添加
STABLE
AS $$
  SELECT auth.uid();
$$;
```

### 2. 路径强制

**错误示例**：
```sql
-- ❌ 错误：没有显式指定 Schema
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);  -- 可能找不到函数
```

**正确示例**：
```sql
-- ✅ 正确：使用安全代理函数
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING (public.current_user_id() = id);  -- 显式指定路径
```

### 3. 最小权限

**错误示例**：
```sql
-- ❌ 错误：授予 PUBLIC 权限
GRANT EXECUTE ON FUNCTION public.current_user_id() TO PUBLIC;
```

**正确示例**：
```sql
-- ✅ 正确：仅授予 authenticated 角色
REVOKE ALL ON FUNCTION public.current_user_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_id() TO authenticated;
```

---

## 📝 实施计划

### 阶段1：创建安全代理函数（优先级：🔴 最高）

1. 创建迁移文件 `00403_create_current_user_id_function.sql`
2. 创建 `current_user_id()` 函数
3. 设置正确的权限
4. 应用迁移到数据库
5. 测试函数是否正常工作

### 阶段2：修改 RLS 策略（优先级：🔴 最高）

1. 创建迁移文件 `00404_update_rls_policies_use_current_user_id.sql`
2. 修改所有 RLS 策略，使用 `current_user_id()` 替代 `auth.uid()`
3. 应用迁移到数据库
4. 测试 RLS 策略是否正常工作

### 阶段3：验证权限与策略（优先级：🔴 最高）

1. 检查函数权限
2. 检查 RLS 策略
3. 测试数据隔离效果
4. 确保所有功能正常工作

### 阶段4：文档和日志（优先级：🟢 低）

1. 更新 README.md
2. 创建修复报告
3. 添加详细的日志记录

---

## 🎉 预期效果

### 功能恢复

- ✅ 车队长可以正常查看司机列表
- ✅ 车队长可以正常查看仓库列表
- ✅ 通知系统正常工作
- ✅ 所有查询都通过 RLS 策略保护

### 安全性提升

- ✅ 统一的认证函数，易于审计
- ✅ 显式指定 Schema 路径，避免环境差异
- ✅ 最小权限原则，更加安全
- ✅ 使用 `SECURITY DEFINER` 确保权限正确

### 稳定性提升

- ✅ 不会因为 Schema 路径问题而失败
- ✅ 权限管理更加清晰
- ✅ 系统更加稳定可靠

### 可维护性提升

- ✅ 统一的认证函数，易于维护
- ✅ 代码更简洁，逻辑更清晰
- ✅ 一次修复，全局生效

---

**分析完成时间**：2025-11-28  
**分析状态**：✅ 已完成  
**下一步**：创建数据库迁移文件并应用修复
