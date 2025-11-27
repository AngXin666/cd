# RLS 策略根本性修复方案

**日期**：2025-11-28  
**问题**：RLS 策略中的 `auth.uid()` 产生了很多问题  
**修复原则**：从根本上解决问题，而不是绕过 RLS 策略

---

## 🔍 问题根源分析

### 当前的问题

#### 问题1：辅助函数无法处理无效的 UUID
```sql
-- 当前的 is_admin() 函数
CREATE OR REPLACE FUNCTION is_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role IN ('super_admin', 'peer_admin') 
  FROM profiles 
  WHERE id = p_user_id;  -- ❌ 如果 p_user_id 是 "anon"，会抛出 UUID 格式错误
$$;
```

**问题**：
- 当 `auth.uid()` 返回 `"anon"` 时，PostgreSQL 尝试将其转换为 UUID 类型
- 转换失败，抛出错误：`invalid input syntax for type uuid: "anon"`
- 导致整个查询失败

#### 问题2：RLS 策略没有处理异常情况
```sql
-- 当前的 RLS 策略
CREATE POLICY "All authenticated users can view driver warehouses"
ON driver_warehouses FOR SELECT
USING (auth.uid() IS NOT NULL);  -- ❌ 只检查是否为 NULL，不检查是否有效

CREATE POLICY "Admins can manage driver warehouses"
ON driver_warehouses FOR ALL
USING (is_admin(auth.uid()) OR is_manager(auth.uid()))  -- ❌ 如果 auth.uid() 无效，会报错
WITH CHECK (is_admin(auth.uid()) OR is_manager(auth.uid()));
```

**问题**：
- `auth.uid() IS NOT NULL` 只检查是否为 NULL，不检查值是否有效
- 当 `auth.uid()` 返回 `"anon"` 时，它不是 NULL，但也不是有效的 UUID
- 导致后续的 `is_admin(auth.uid())` 调用失败

#### 问题3：认证状态不稳定
- 在某些情况下，`auth.uid()` 会返回 `"anon"` 而不是有效的 UUID
- 这可能发生在：
  - 用户登录状态切换时
  - Token 过期时
  - 后台任务执行时
  - 页面刷新时

---

## 🔧 正确的解决方案

### 方案概述

**核心原则**：
1. ✅ 修复辅助函数，使其能够正确处理无效的 UUID
2. ✅ 修改 RLS 策略，添加更严格的检查
3. ✅ 在应用层确保认证状态稳定
4. ❌ 不绕过 RLS 策略

### 实施步骤

#### 步骤1：修复辅助函数，添加异常处理

##### 修复 is_admin() 函数
```sql
CREATE OR REPLACE FUNCTION is_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql  -- 改用 plpgsql，支持异常处理
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
    -- 捕获任何错误（包括 UUID 格式错误），返回 false
    RETURN false;
END;
$$;

COMMENT ON FUNCTION is_admin IS '检查用户是否是管理员，能够处理无效的 UUID';
```

**改进**：
- ✅ 使用 `plpgsql` 而不是 `sql`，支持异常处理
- ✅ 添加 NULL 检查
- ✅ 使用 `EXISTS` 而不是直接查询，性能更好
- ✅ 添加 `EXCEPTION` 块，捕获所有错误并返回 false
- ✅ 不会因为无效的 UUID 而抛出错误

##### 修复 is_manager() 函数
```sql
CREATE OR REPLACE FUNCTION is_manager(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql  -- 改用 plpgsql，支持异常处理
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
    -- 捕获任何错误（包括 UUID 格式错误），返回 false
    RETURN false;
END;
$$;

COMMENT ON FUNCTION is_manager IS '检查用户是否是车队长，能够处理无效的 UUID';
```

##### 修复 is_driver() 函数
```sql
CREATE OR REPLACE FUNCTION is_driver(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql  -- 改用 plpgsql，支持异常处理
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
    -- 捕获任何错误（包括 UUID 格式错误），返回 false
    RETURN false;
END;
$$;

COMMENT ON FUNCTION is_driver IS '检查用户是否是司机，能够处理无效的 UUID';
```

#### 步骤2：修改 RLS 策略，添加更严格的检查

##### driver_warehouses 表的 RLS 策略
```sql
-- 删除旧策略
DROP POLICY IF EXISTS "All authenticated users can view driver warehouses" ON driver_warehouses;
DROP POLICY IF EXISTS "Admins can manage driver warehouses" ON driver_warehouses;

-- 创建新策略：所有认证用户可以查看
CREATE POLICY "Authenticated users can view driver warehouses"
ON driver_warehouses FOR SELECT
USING (
  -- 确保 auth.uid() 不为 NULL
  auth.uid() IS NOT NULL
  -- 并且用户是管理员、车队长或司机
  AND (
    is_admin(auth.uid()) 
    OR is_manager(auth.uid()) 
    OR is_driver(auth.uid())
  )
);

-- 创建新策略：管理员和车队长可以管理
CREATE POLICY "Admins and managers can manage driver warehouses"
ON driver_warehouses FOR ALL
USING (
  auth.uid() IS NOT NULL
  AND (is_admin(auth.uid()) OR is_manager(auth.uid()))
)
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (is_admin(auth.uid()) OR is_manager(auth.uid()))
);

COMMENT ON POLICY "Authenticated users can view driver warehouses" ON driver_warehouses 
IS '认证用户可以查看司机仓库关联，辅助函数会处理无效的 UUID';

COMMENT ON POLICY "Admins and managers can manage driver warehouses" ON driver_warehouses 
IS '管理员和车队长可以管理司机仓库关联，辅助函数会处理无效的 UUID';
```

##### manager_warehouses 表的 RLS 策略
```sql
-- 删除旧策略
DROP POLICY IF EXISTS "All authenticated users can view manager warehouses" ON manager_warehouses;
DROP POLICY IF EXISTS "Admins can manage manager warehouses" ON manager_warehouses;

-- 创建新策略：所有认证用户可以查看
CREATE POLICY "Authenticated users can view manager warehouses"
ON manager_warehouses FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND (
    is_admin(auth.uid()) 
    OR is_manager(auth.uid())
  )
);

-- 创建新策略：只有管理员可以管理
CREATE POLICY "Admins can manage manager warehouses"
ON manager_warehouses FOR ALL
USING (
  auth.uid() IS NOT NULL
  AND is_admin(auth.uid())
)
WITH CHECK (
  auth.uid() IS NOT NULL
  AND is_admin(auth.uid())
);

COMMENT ON POLICY "Authenticated users can view manager warehouses" ON manager_warehouses 
IS '认证用户可以查看车队长仓库关联，辅助函数会处理无效的 UUID';

COMMENT ON POLICY "Admins can manage manager warehouses" ON manager_warehouses 
IS '管理员可以管理车队长仓库关联，辅助函数会处理无效的 UUID';
```

#### 步骤3：在应用层添加认证状态检查

##### 前端页面添加认证检查
```typescript
// src/pages/manager/driver-management/index.tsx
const DriverManagement: React.FC = () => {
  const {user, isAuthenticated} = useAuth({guard: true})
  
  // 添加认证状态检查
  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      logger.warn('用户未认证或用户 ID 无效', {isAuthenticated, userId: user?.id})
      Taro.showToast({
        title: '请先登录',
        icon: 'none',
        duration: 2000
      })
      // 跳转到登录页面
      setTimeout(() => {
        Taro.redirectTo({url: '/pages/login/index'})
      }, 2000)
      return
    }
  }, [isAuthenticated, user?.id])
  
  // ... 其他代码
}
```

##### 数据库查询函数添加参数验证
```typescript
// src/db/api.ts
export async function getManagerWarehouses(managerId: string): Promise<Warehouse[]> {
  // 添加参数验证
  if (!managerId || managerId === 'anon' || managerId.length < 10) {
    logger.error('无效的管理员 ID', {managerId})
    return []
  }
  
  logger.db('查询', 'manager_warehouses', {managerId})
  
  const {data, error} = await supabase
    .from('manager_warehouses')
    .select('warehouse_id')
    .eq('manager_id', managerId)
  
  if (error) {
    logger.error('获取管理员仓库失败', error)
    return []
  }
  
  // ... 其他代码
}
```

---

## 📊 修复效果对比

### 修复前的问题

| 问题 | 原因 | 影响 |
|------|------|------|
| ❌ UUID 格式错误 | `is_admin("anon")` 抛出异常 | 查询失败 |
| ❌ RLS 策略失效 | 辅助函数报错，策略检查失败 | 拒绝访问 |
| ❌ 用户体验差 | 看到技术性错误信息 | 困惑 |
| ❌ 系统不稳定 | 认证状态切换时出错 | 功能失效 |

### 修复后的改进

| 改进 | 实现方式 | 效果 |
|------|----------|------|
| ✅ 处理无效 UUID | 辅助函数添加异常处理 | 不会报错 |
| ✅ RLS 策略正常工作 | 辅助函数返回 false 而不是报错 | 正常拒绝访问 |
| ✅ 用户体验好 | 显示友好的错误提示 | 清晰明了 |
| ✅ 系统稳定 | 多层防护，不会因为认证问题而崩溃 | 稳定可靠 |

---

## 🎯 为什么这个方案更好？

### 对比：绕过 vs 修复

#### 绕过方案（之前的方案）❌
```sql
-- 使用 SECURITY DEFINER 绕过 RLS 策略
CREATE OR REPLACE FUNCTION get_manager_warehouses_for_management(p_manager_id uuid)
RETURNS TABLE (...)
LANGUAGE sql
SECURITY DEFINER  -- ❌ 绕过 RLS 策略
AS $$
  SELECT ... FROM warehouses w
  INNER JOIN manager_warehouses mw ON mw.warehouse_id = w.id
  WHERE mw.manager_id = p_manager_id;
$$;
```

**问题**：
- ❌ 绕过了 RLS 策略，失去了安全保护
- ❌ 需要为每个查询创建专门的 RPC 函数
- ❌ 代码重复，维护困难
- ❌ 不是根本性的解决方案

#### 修复方案（新方案）✅
```sql
-- 修复辅助函数，使其能够处理无效的 UUID
CREATE OR REPLACE FUNCTION is_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = p_user_id 
    AND role IN ('super_admin', 'peer_admin')
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;  -- ✅ 捕获错误，返回 false
END;
$$;
```

**优势**：
- ✅ 保留了 RLS 策略的安全保护
- ✅ 从根本上解决了问题
- ✅ 不需要为每个查询创建专门的函数
- ✅ 代码简洁，易于维护
- ✅ 一次修复，全局生效

---

## 📝 实施计划

### 阶段1：修复辅助函数（优先级：🔴 最高）

1. 创建迁移文件 `00402_fix_role_check_functions_with_exception_handling.sql`
2. 修复 `is_admin()` 函数，添加异常处理
3. 修复 `is_manager()` 函数，添加异常处理
4. 修复 `is_driver()` 函数，添加异常处理
5. 应用迁移到数据库
6. 测试函数是否能够正确处理无效的 UUID

### 阶段2：修改 RLS 策略（优先级：🔴 最高）

1. 创建迁移文件 `00403_update_rls_policies_with_strict_checks.sql`
2. 更新 `driver_warehouses` 表的 RLS 策略
3. 更新 `manager_warehouses` 表的 RLS 策略
4. 应用迁移到数据库
5. 测试 RLS 策略是否正常工作

### 阶段3：添加应用层检查（优先级：🟡 中等）

1. 在前端页面添加认证状态检查
2. 在数据库查询函数添加参数验证
3. 添加友好的错误提示
4. 测试用户体验

### 阶段4：清理绕过方案（优先级：🟢 低）

1. 删除之前创建的 RPC 函数（可选）
   - `get_manager_warehouses_for_management()`
   - `get_driver_warehouse_ids_for_management()`
   - `get_drivers_by_warehouse_for_management()`
2. 恢复原来的查询代码
3. 测试功能是否正常

### 阶段5：测试和验证（优先级：🔴 最高）

1. 测试正常登录用户的访问
2. 测试 `auth.uid()` 返回 "anon" 时的行为
3. 测试认证状态切换时的行为
4. 测试所有角色的权限
5. 确保没有 UUID 格式错误

---

## 🎉 预期效果

### 功能恢复

- ✅ 车队长可以正常查看司机列表
- ✅ 车队长可以正常查看仓库列表
- ✅ 通知系统正常工作
- ✅ 所有查询都通过 RLS 策略保护

### 安全性提升

- ✅ 保留了 RLS 策略的安全保护
- ✅ 不会因为无效的 UUID 而绕过安全检查
- ✅ 多层防护，更加安全

### 稳定性提升

- ✅ 不会因为 `auth.uid()` 返回无效值而报错
- ✅ 辅助函数能够正确处理异常情况
- ✅ 系统更加稳定可靠

### 可维护性提升

- ✅ 不需要为每个查询创建专门的 RPC 函数
- ✅ 代码更简洁，易于维护
- ✅ 一次修复，全局生效

---

## 📚 技术细节

### 为什么使用 plpgsql 而不是 sql？

**sql 语言**：
- ❌ 不支持异常处理
- ❌ 不支持 IF 语句
- ❌ 不支持 BEGIN/END 块
- ✅ 性能稍好（但差异很小）

**plpgsql 语言**：
- ✅ 支持异常处理（EXCEPTION 块）
- ✅ 支持 IF 语句
- ✅ 支持 BEGIN/END 块
- ✅ 更灵活，功能更强大
- ❌ 性能稍差（但差异很小，可以忽略）

**结论**：对于需要异常处理的函数，必须使用 plpgsql。

### 为什么使用 EXISTS 而不是直接查询？

**直接查询**：
```sql
SELECT role IN ('super_admin', 'peer_admin') 
FROM profiles 
WHERE id = p_user_id;
```
- ❌ 如果没有找到记录，返回 NULL 而不是 false
- ❌ 需要额外的 NULL 处理

**使用 EXISTS**：
```sql
RETURN EXISTS (
  SELECT 1 FROM profiles 
  WHERE id = p_user_id 
  AND role IN ('super_admin', 'peer_admin')
);
```
- ✅ 如果没有找到记录，返回 false
- ✅ 不需要额外的 NULL 处理
- ✅ 性能更好（找到第一条记录就停止）

**结论**：使用 EXISTS 更简洁、更高效。

---

**分析完成时间**：2025-11-28  
**分析状态**：✅ 已完成  
**下一步**：创建数据库迁移文件并应用修复
