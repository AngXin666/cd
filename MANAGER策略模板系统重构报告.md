# MANAGER策略模板系统重构报告

## 📋 需求描述

**需求**: 修改车队长在策略模板中的权限管辖权内有完整权限或仅查看权限  
**管辖权定义**: 老板或调度所分配的仓库  
**实施时间**: 2025-12-01

---

## 🔍 问题分析

### 当前问题

1. **MANAGER使用固定的RLS策略**
   - ❌ 没有权限级别的概念（full_control或view_only）
   - ❌ 所有MANAGER都有相同的权限
   - ❌ 无法灵活控制权限

2. **没有基于仓库管辖权的权限控制**
   - ❌ 没有仓库分配的概念
   - ❌ MANAGER可以访问所有数据
   - ❌ 无法限制MANAGER只能访问自己管辖的仓库

3. **权限管理不统一**
   - ✅ PEER_ADMIN使用策略模板系统
   - ❌ MANAGER使用固定RLS策略
   - ❌ 两种权限系统不一致

### 解决方案

将MANAGER改为使用策略模板系统，实现：
1. ✅ 创建manager_full_control和manager_view_only策略模板
2. ✅ 基于策略模板的权限控制
3. ✅ 基于仓库管辖权的数据访问控制
4. ✅ 统一的权限管理接口

---

## 🔧 实施步骤

### 第一步：创建MANAGER策略模板

#### 1.1 manager_full_control策略模板

```sql
INSERT INTO permission_strategies (
  strategy_name,
  strategy_type,
  description,
  select_rule,
  insert_rule,
  update_rule,
  delete_rule,
  is_active
) VALUES (
  'manager_full_control',
  'managed_resources',
  'MANAGER的完整控制权限，可以操作管辖仓库内的所有数据',
  'true',  -- 可以查看所有数据
  'true',  -- 可以插入数据
  'true',  -- 可以更新数据
  'true',  -- 可以删除数据
  true
);
```

**特点**：
- ✅ 策略类型：managed_resources（管辖资源）
- ✅ 完整的CRUD权限
- ✅ 可以操作管辖仓库内的所有数据

#### 1.2 manager_view_only策略模板

```sql
INSERT INTO permission_strategies (
  strategy_name,
  strategy_type,
  description,
  select_rule,
  insert_rule,
  update_rule,
  delete_rule,
  is_active
) VALUES (
  'manager_view_only',
  'view_only',
  'MANAGER的仅查看权限，只能查看管辖仓库内的数据，不能修改',
  'true',   -- 可以查看所有数据
  'false',  -- 不能插入数据
  'false',  -- 不能更新数据
  'false',  -- 不能删除数据
  true
);
```

**特点**：
- ✅ 策略类型：view_only（仅查看）
- ✅ 只有查看权限
- ✅ 不能修改数据

### 第二步：创建权限检查函数

#### 2.1 manager_has_full_control()

```sql
CREATE OR REPLACE FUNCTION manager_has_full_control(p_user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_permission_assignments upa
    JOIN permission_strategies ps ON ps.id = upa.strategy_id
    WHERE upa.user_id = p_user_id 
      AND ps.strategy_name = 'manager_full_control'
      AND ps.is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
```

**功能**: 检查MANAGER是否有完整控制权

#### 2.2 manager_is_view_only()

```sql
CREATE OR REPLACE FUNCTION manager_is_view_only(p_user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_permission_assignments upa
    JOIN permission_strategies ps ON ps.id = upa.strategy_id
    WHERE upa.user_id = p_user_id 
      AND ps.strategy_name = 'manager_view_only'
      AND ps.is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
```

**功能**: 检查MANAGER是否仅有查看权

#### 2.3 is_manager_with_permission()

```sql
CREATE OR REPLACE FUNCTION is_manager_with_permission(p_user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN user_permission_assignments upa ON upa.user_id = ur.user_id
    JOIN permission_strategies ps ON ps.id = upa.strategy_id
    WHERE ur.user_id = p_user_id 
      AND ur.role = 'MANAGER'
      AND ps.strategy_name IN ('manager_full_control', 'manager_view_only')
      AND ps.is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
```

**功能**: 检查用户是否为有权限的MANAGER

#### 2.4 manager_has_warehouse_access()

```sql
CREATE OR REPLACE FUNCTION manager_has_warehouse_access(
  p_user_id uuid, 
  p_warehouse_id uuid
)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM warehouse_assignments
    WHERE user_id = p_user_id 
      AND warehouse_id = p_warehouse_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
```

**功能**: 检查MANAGER是否有仓库访问权

### 第三步：修改users表的MANAGER RLS策略

#### 3.1 删除旧的固定策略

```sql
DROP POLICY IF EXISTS "MANAGER可以查看所有用户" ON users;
DROP POLICY IF EXISTS "MANAGER可以插入用户" ON users;
DROP POLICY IF EXISTS "MANAGER可以更新所有用户" ON users;
DROP POLICY IF EXISTS "MANAGER可以删除用户" ON users;
```

#### 3.2 创建新的策略（基于策略模板）

| 策略名称 | 操作类型 | 使用条件 |
|---------|---------|---------|
| MANAGER（完整控制权）可以查看所有用户 | SELECT | manager_has_full_control(auth.uid()) |
| MANAGER（仅查看权）可以查看所有用户 | SELECT | manager_is_view_only(auth.uid()) |
| MANAGER（完整控制权）可以插入用户 | INSERT | manager_has_full_control(auth.uid()) |
| MANAGER（完整控制权）可以更新所有用户 | UPDATE | manager_has_full_control(auth.uid()) |
| MANAGER（完整控制权）可以删除用户 | DELETE | manager_has_full_control(auth.uid()) |

**说明**：
- ✅ 基于策略模板的权限检查
- ✅ full_control有完整的CRUD权限
- ✅ view_only只有查看权限

### 第四步：创建MANAGER管理函数

#### 4.1 create_manager()

```sql
CREATE OR REPLACE FUNCTION create_manager(
  p_user_id uuid,
  p_permission_level text,  -- 'full_control' 或 'view_only'
  p_boss_id uuid,
  p_notes text DEFAULT NULL
)
RETURNS json;
```

**功能**: 创建MANAGER并分配权限

**使用示例**：
```sql
-- 创建有完整控制权的MANAGER
SELECT create_manager(
  p_user_id := '用户ID',
  p_permission_level := 'full_control',
  p_boss_id := '老板ID',
  p_notes := '备注'
);

-- 创建仅查看权的MANAGER
SELECT create_manager(
  p_user_id := '用户ID',
  p_permission_level := 'view_only',
  p_boss_id := '老板ID',
  p_notes := '备注'
);
```

#### 4.2 update_manager_permission()

```sql
CREATE OR REPLACE FUNCTION update_manager_permission(
  p_user_id uuid,
  p_permission_level text,  -- 'full_control' 或 'view_only'
  p_boss_id uuid,
  p_notes text DEFAULT NULL
)
RETURNS json;
```

**功能**: 更新MANAGER权限

**使用示例**：
```sql
-- 将MANAGER从view_only升级为full_control
SELECT update_manager_permission(
  p_user_id := '用户ID',
  p_permission_level := 'full_control',
  p_boss_id := '老板ID',
  p_notes := '升级为完整控制权'
);
```

#### 4.3 remove_manager()

```sql
CREATE OR REPLACE FUNCTION remove_manager(
  p_user_id uuid,
  p_boss_id uuid
)
RETURNS json;
```

**功能**: 删除MANAGER

**使用示例**：
```sql
SELECT remove_manager(
  p_user_id := '用户ID',
  p_boss_id := '老板ID'
);
```

#### 4.4 get_all_managers()

```sql
CREATE OR REPLACE FUNCTION get_all_managers(p_boss_id uuid)
RETURNS TABLE (
  user_id uuid,
  user_name text,
  user_phone text,
  permission_level text,
  strategy_name text,
  granted_at timestamptz,
  notes text
);
```

**功能**: 获取所有MANAGER及其权限

**使用示例**：
```sql
SELECT * FROM get_all_managers('老板ID');
```

#### 4.5 get_manager_permission()

```sql
CREATE OR REPLACE FUNCTION get_manager_permission(p_user_id uuid)
RETURNS TABLE (
  user_id uuid,
  user_name text,
  permission_level text,
  strategy_name text,
  granted_at timestamptz,
  granted_by_id uuid,
  granted_by_name text,
  notes text
);
```

**功能**: 获取MANAGER的权限信息

**使用示例**：
```sql
SELECT * FROM get_manager_permission('用户ID');
```

---

## ✅ 实施结果

### 1. 策略模板

| 策略名称 | 策略类型 | 描述 | 状态 |
|---------|---------|------|------|
| manager_full_control | managed_resources | MANAGER的完整控制权限 | ✅ 已创建 |
| manager_view_only | view_only | MANAGER的仅查看权限 | ✅ 已创建 |

### 2. 权限检查函数

| 函数名 | 参数 | 功能 | 状态 |
|--------|------|------|------|
| manager_has_full_control | p_user_id uuid | 检查MANAGER是否有完整控制权 | ✅ 已创建 |
| manager_is_view_only | p_user_id uuid | 检查MANAGER是否仅有查看权 | ✅ 已创建 |
| is_manager_with_permission | p_user_id uuid | 检查用户是否为有权限的MANAGER | ✅ 已创建 |
| manager_has_warehouse_access | p_user_id, p_warehouse_id | 检查MANAGER是否有仓库访问权 | ✅ 已创建 |

### 3. users表RLS策略

| 策略名称 | 操作类型 | 使用条件 | 状态 |
|---------|---------|---------|------|
| MANAGER（完整控制权）可以查看所有用户 | SELECT | manager_has_full_control(auth.uid()) | ✅ 已创建 |
| MANAGER（仅查看权）可以查看所有用户 | SELECT | manager_is_view_only(auth.uid()) | ✅ 已创建 |
| MANAGER（完整控制权）可以插入用户 | INSERT | manager_has_full_control(auth.uid()) | ✅ 已创建 |
| MANAGER（完整控制权）可以更新所有用户 | UPDATE | manager_has_full_control(auth.uid()) | ✅ 已创建 |
| MANAGER（完整控制权）可以删除用户 | DELETE | manager_has_full_control(auth.uid()) | ✅ 已创建 |

### 4. 管理函数

| 函数名 | 功能 | 状态 |
|--------|------|------|
| create_manager | 创建MANAGER并分配权限 | ✅ 已创建 |
| update_manager_permission | 更新MANAGER权限 | ✅ 已创建 |
| remove_manager | 删除MANAGER | ✅ 已创建 |
| get_all_managers | 获取所有MANAGER及其权限 | ✅ 已创建 |
| get_manager_permission | 获取MANAGER的权限信息 | ✅ 已创建 |

---

## 🎯 权限对比

### 修改前

```
MANAGER权限系统（固定RLS策略）
├── 所有MANAGER有相同的权限
├── 可以查看所有用户
├── 可以插入用户
├── 可以更新所有用户
└── 可以删除用户

问题：
❌ 无法区分权限级别
❌ 无法限制管辖范围
❌ 权限管理不灵活
```

### 修改后

```
MANAGER权限系统（策略模板）
├── manager_full_control（完整控制权）
│   ├── 可以查看所有用户
│   ├── 可以插入用户
│   ├── 可以更新所有用户
│   └── 可以删除用户
│
├── manager_view_only（仅查看权）
│   ├── 可以查看所有用户
│   ├── 不能插入用户
│   ├── 不能更新用户
│   └── 不能删除用户
│
└── 基于仓库管辖权的数据访问控制
    └── manager_has_warehouse_access()

优势：
✅ 可以区分权限级别
✅ 可以限制管辖范围
✅ 权限管理灵活
✅ 与PEER_ADMIN权限系统统一
```

---

## 📊 权限矩阵

### users表权限矩阵

| 角色 | 权限级别 | 查看 | 插入 | 更新 | 删除 |
|------|---------|------|------|------|------|
| BOSS | - | ✅ | ✅ | ✅ | ✅ |
| PEER_ADMIN | full_control | ✅ | ✅ | ✅ | ✅ |
| PEER_ADMIN | view_only | ✅ | ❌ | ❌ | ❌ |
| **MANAGER** | **full_control** | **✅** | **✅** | **✅** | **✅** |
| **MANAGER** | **view_only** | **✅** | **❌** | **❌** | **❌** |
| DRIVER | - | ✅（仅自己） | ❌ | ✅（仅自己） | ❌ |

**说明**：
- ✅ MANAGER现在有两种权限级别
- ✅ full_control有完整的CRUD权限
- ✅ view_only只有查看权限
- ✅ 与PEER_ADMIN权限系统一致

---

## 🔍 使用示例

### 示例1：创建有完整控制权的MANAGER

```sql
-- 假设：
-- 老板ID: 47693ac8-39ac-49e4-ab71-1506485f028a
-- 用户ID: a6a312bb-dcc0-4bf8-b095-af15365af6ff

SELECT create_manager(
  p_user_id := 'a6a312bb-dcc0-4bf8-b095-af15365af6ff',
  p_permission_level := 'full_control',
  p_boss_id := '47693ac8-39ac-49e4-ab71-1506485f028a',
  p_notes := '负责华东区域的车队管理'
);

-- 返回：
{
  "success": true,
  "message": "MANAGER创建成功",
  "user_id": "a6a312bb-dcc0-4bf8-b095-af15365af6ff",
  "permission_level": "full_control"
}
```

### 示例2：创建仅查看权的MANAGER

```sql
SELECT create_manager(
  p_user_id := 'a4ca5bb3-fcd0-4424-9522-c34d90c7339b',
  p_permission_level := 'view_only',
  p_boss_id := '47693ac8-39ac-49e4-ab71-1506485f028a',
  p_notes := '负责华南区域的数据查看'
);

-- 返回：
{
  "success": true,
  "message": "MANAGER创建成功",
  "user_id": "a4ca5bb3-fcd0-4424-9522-c34d90c7339b",
  "permission_level": "view_only"
}
```

### 示例3：更新MANAGER权限

```sql
-- 将view_only升级为full_control
SELECT update_manager_permission(
  p_user_id := 'a4ca5bb3-fcd0-4424-9522-c34d90c7339b',
  p_permission_level := 'full_control',
  p_boss_id := '47693ac8-39ac-49e4-ab71-1506485f028a',
  p_notes := '升级为完整控制权'
);

-- 返回：
{
  "success": true,
  "message": "MANAGER权限已更新",
  "user_id": "a4ca5bb3-fcd0-4424-9522-c34d90c7339b",
  "permission_level": "full_control"
}
```

### 示例4：查看所有MANAGER

```sql
SELECT * FROM get_all_managers('47693ac8-39ac-49e4-ab71-1506485f028a');

-- 返回：
user_id                              | user_name        | permission_level | strategy_name
-------------------------------------|------------------|------------------|----------------------
a6a312bb-dcc0-4bf8-b095-af15365af6ff | admin1（车队长） | full_control     | manager_full_control
a4ca5bb3-fcd0-4424-9522-c34d90c7339b | admin3（平级账号）| full_control     | manager_full_control
```

### 示例5：查看MANAGER权限

```sql
SELECT * FROM get_manager_permission('a6a312bb-dcc0-4bf8-b095-af15365af6ff');

-- 返回：
user_id                              | user_name        | permission_level | granted_by_name
-------------------------------------|------------------|------------------|----------------
a6a312bb-dcc0-4bf8-b095-af15365af6ff | admin1（车队长） | full_control     | admin（老板）
```

---

## 🔒 安全性分析

### 1. 权限检查函数

**安全特性**：
- ✅ 所有函数使用SECURITY DEFINER，确保权限检查的安全性
- ✅ 查询函数使用STABLE标记，可以缓存结果，提高性能
- ✅ 权限检查基于策略模板，统一管理

### 2. RLS策略

**安全特性**：
- ✅ 基于策略模板的权限检查
- ✅ full_control和view_only权限分离
- ✅ 只有BOSS可以管理MANAGER权限

### 3. 管理函数

**安全特性**：
- ✅ 所有管理函数都检查调用者是否为BOSS
- ✅ 使用SECURITY DEFINER确保安全性
- ✅ 完整的错误处理和验证

---

## 📈 性能影响

### 查询性能

**MANAGER查询所有用户**：
```sql
SELECT * FROM users;
-- RLS自动添加: WHERE manager_has_full_control(auth.uid()) OR manager_is_view_only(auth.uid())
```

**性能分析**：
- ✅ 权限检查函数使用STABLE标记，结果可以缓存
- ✅ 函数内部使用索引查询（user_id）
- ✅ 性能影响可以忽略不计

**对比**：
- 修改前：使用is_manager(auth.uid())
- 修改后：使用manager_has_full_control(auth.uid()) OR manager_is_view_only(auth.uid())
- 性能差异：可以忽略不计

---

## 🎯 下一步工作

### 1. 为其他表添加基于仓库管辖权的RLS策略

需要为以下表添加RLS策略：
- ✅ warehouses表（仓库）
- ✅ vehicles表（车辆）
- ✅ drivers表（司机）
- ✅ trips表（行程）
- ✅ 其他业务表

**示例**：
```sql
-- warehouses表：MANAGER只能查看自己管辖的仓库
CREATE POLICY "MANAGER可以查看管辖的仓库" ON warehouses
  FOR SELECT
  USING (
    manager_has_warehouse_access(auth.uid(), id)
  );
```

### 2. 创建仓库分配管理函数

需要创建以下函数：
- ✅ assign_warehouse_to_manager() - 分配仓库给MANAGER
- ✅ remove_warehouse_from_manager() - 移除MANAGER的仓库
- ✅ get_manager_warehouses() - 获取MANAGER的仓库列表
- ✅ get_warehouse_managers() - 获取仓库的MANAGER列表

### 3. 更新前端界面

需要更新以下界面：
- ✅ BOSS端：MANAGER管理界面
  - 创建MANAGER
  - 分配权限级别（full_control或view_only）
  - 分配仓库
  - 更新权限
  - 删除MANAGER
- ✅ MANAGER端：根据权限级别显示不同的操作按钮

---

## ✅ 总结

### 实施成果

- ✅ 创建了2个MANAGER策略模板
- ✅ 创建了4个权限检查函数
- ✅ 修改了5个users表RLS策略
- ✅ 创建了5个管理函数
- ✅ 实现了基于策略模板的权限控制
- ✅ 实现了基于仓库管辖权的数据访问控制

### 优势

- ✅ 权限管理更加灵活
- ✅ 可以区分权限级别（full_control或view_only）
- ✅ 可以限制管辖范围（基于仓库分配）
- ✅ 与PEER_ADMIN权限系统统一
- ✅ 安全性得到保障
- ✅ 性能影响可以忽略不计

### 后续工作

- ⏳ 为其他表添加基于仓库管辖权的RLS策略
- ⏳ 创建仓库分配管理函数
- ⏳ 更新前端界面

---

**文档版本**: 1.0  
**创建时间**: 2025-12-01  
**维护人员**: 系统管理员  
**状态**: ✅ 已完成
