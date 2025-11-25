# 司机仓库分配问题修复

## 问题描述

**症状**：
- 老板创建仓库后，给司机分配仓库
- 司机端无法看到自己被分配的仓库
- 仓库列表为空

**影响范围**：
- 所有司机无法查看自己的仓库分配
- 影响司机的日常工作流程

## 问题分析

### 数据库层面的问题

查看 `driver_warehouses` 表的数据：

```sql
SELECT 
  dw.id,
  w.name as warehouse_name,
  p.name as driver_name,
  dw.tenant_id as assignment_tenant_id,
  p.tenant_id as driver_tenant_id,
  w.tenant_id as warehouse_tenant_id
FROM driver_warehouses dw
JOIN profiles p ON p.id = dw.driver_id
JOIN warehouses w ON w.id = dw.warehouse_id;
```

**发现的问题**：

| 字段 | 值 | 说明 |
|------|-----|------|
| driver_name | 发发奶粉哦啊 | 司机姓名 |
| driver_tenant_id | 9e04dfd6-...（管理员） | 司机属于"管理员"租户 |
| warehouse_name | 北京仓库 | 仓库名称 |
| warehouse_tenant_id | 9e04dfd6-...（管理员） | 仓库属于"管理员"租户 |
| assignment_tenant_id | 29659703-...（测试2） | ⚠️ 分配记录属于"测试2"租户 |

**问题**：`driver_warehouses.tenant_id` 被设置为当前操作用户（测试2）的 tenant_id，而不是司机的 tenant_id！

### 根本原因

`driver_warehouses` 表使用 `auto_set_tenant_id()` 触发器：

```sql
CREATE TRIGGER auto_set_tenant_id_trigger
  BEFORE INSERT ON driver_warehouses
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_tenant_id();
```

`auto_set_tenant_id()` 函数的逻辑：

```sql
-- 获取当前用户的 tenant_id
SELECT 
  CASE 
    WHEN p.role = 'super_admin' THEN p.id
    ELSE p.tenant_id
  END
INTO user_tenant_id
FROM profiles p
WHERE p.id = auth.uid();  -- 当前操作用户

NEW.tenant_id := user_tenant_id;
```

**问题分析**：
1. 老板 A（管理员）创建了司机"发发奶粉哦啊"
2. 老板 B（测试2）尝试给这个司机分配仓库（跨租户操作）
3. `auto_set_tenant_id()` 使用老板 B 的 tenant_id
4. 结果：`driver_warehouses.tenant_id` = 老板 B 的 ID

### RLS 策略的影响

司机查看仓库分配时，使用以下策略：

```sql
-- 租户数据隔离策略
CREATE POLICY "租户数据隔离 - driver_warehouses" ON driver_warehouses
  USING (
    is_lease_admin() 
    OR tenant_id = get_user_tenant_id()
  );
```

**查询流程**：
1. 司机"发发奶粉哦啊"登录
2. `get_user_tenant_id()` 返回 9e04dfd6-...（管理员）
3. 查询条件：`tenant_id = 9e04dfd6-...`
4. 但 `driver_warehouses.tenant_id` = 29659703-...（测试2）
5. 结果：查询不到任何记录！

## 解决方案

### 迁移 048：修复 driver_warehouses 的 tenant_id

**文件**：`supabase/migrations/048_fix_driver_warehouses_tenant_id.sql`

#### 1. 创建专门的触发器函数

```sql
CREATE OR REPLACE FUNCTION set_driver_warehouse_tenant_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  driver_tenant_id uuid;
BEGIN
  -- 如果已经设置了 tenant_id，则不修改
  IF NEW.tenant_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- 从 profiles 表获取司机的 tenant_id
  SELECT tenant_id INTO driver_tenant_id
  FROM profiles
  WHERE id = NEW.driver_id;

  -- 如果司机不存在或没有 tenant_id，使用当前用户的 tenant_id
  IF driver_tenant_id IS NULL THEN
    driver_tenant_id := get_user_tenant_id();
  END IF;

  -- 设置 tenant_id
  NEW.tenant_id := driver_tenant_id;
  
  RETURN NEW;
END;
$$;
```

**关键改进**：
- ❌ 旧逻辑：使用当前操作用户的 tenant_id
- ✅ 新逻辑：使用司机的 tenant_id

#### 2. 替换触发器

```sql
-- 删除旧触发器
DROP TRIGGER IF EXISTS auto_set_tenant_id_trigger ON driver_warehouses;

-- 创建新触发器
CREATE TRIGGER set_driver_warehouse_tenant_id_trigger
  BEFORE INSERT ON driver_warehouses
  FOR EACH ROW
  EXECUTE FUNCTION set_driver_warehouse_tenant_id();
```

#### 3. 修复现有数据

```sql
-- 更新错误的 tenant_id
UPDATE driver_warehouses dw
SET tenant_id = p.tenant_id
FROM profiles p
WHERE dw.driver_id = p.id
  AND dw.tenant_id != p.tenant_id;
```

## 验证修复

### 1. 检查数据是否修复

```sql
SELECT 
  dw.id,
  w.name as warehouse_name,
  p.name as driver_name,
  dw.tenant_id as assignment_tenant_id,
  p.tenant_id as driver_tenant_id,
  dw.tenant_id = p.tenant_id as tenant_id_correct
FROM driver_warehouses dw
JOIN profiles p ON p.id = dw.driver_id
JOIN warehouses w ON w.id = dw.warehouse_id
ORDER BY dw.created_at DESC;
```

**预期结果**：
- 所有记录的 `tenant_id_correct` 都应该是 `true`
- `assignment_tenant_id` 应该等于 `driver_tenant_id`

### 2. 测试司机端查看

1. 使用司机账号登录
2. 进入"我的仓库"或相关页面
3. 验证可以看到自己被分配的仓库

### 3. 测试新的分配

1. 使用老板账号登录
2. 创建新仓库
3. 给司机分配仓库
4. 切换到司机账号
5. 验证可以看到新分配的仓库

## 技术细节

### 为什么需要特殊处理关联表？

**关联表的特点**：
- 连接两个实体（如司机和仓库）
- tenant_id 应该基于关联的实体，而不是当前操作用户

**示例**：

| 表名 | tenant_id 来源 | 说明 |
|------|---------------|------|
| profiles | 当前用户 | 用户自己的 tenant_id |
| warehouses | 当前用户 | 仓库属于创建者的租户 |
| driver_warehouses | **司机** | 分配记录属于司机的租户 |
| manager_warehouses | **管理员** | 分配记录属于管理员的租户 |
| vehicles | 司机 | 车辆属于司机的租户 |
| piece_work_records | 司机 | 计件记录属于司机的租户 |

### 通用规则

对于关联表，tenant_id 应该使用：
1. **主实体的 tenant_id**（通常是被管理的对象）
2. 而不是当前操作用户的 tenant_id

**判断主实体**：
- `driver_warehouses`：主实体是司机（被分配仓库的人）
- `manager_warehouses`：主实体是管理员（被分配仓库的人）
- `vehicles`：主实体是司机（车辆的拥有者）

## 相关问题

### 其他表是否有类似问题？

检查所有使用 `auto_set_tenant_id_trigger` 的表：

```sql
SELECT 
  tgrelid::regclass as table_name
FROM pg_trigger
WHERE tgname = 'auto_set_tenant_id_trigger'
ORDER BY table_name;
```

**需要特别关注的表**：
- ✅ `driver_warehouses` - 已修复（迁移 048）
- ✅ `manager_warehouses` - 数据正确，无需修复
- ⚠️ 其他关联表需要逐个检查

### 如何预防类似问题？

1. **设计阶段**：
   - 明确每个表的 tenant_id 来源
   - 关联表需要特殊处理

2. **开发阶段**：
   - 为关联表创建专门的触发器函数
   - 不要盲目使用通用的 `auto_set_tenant_id()`

3. **测试阶段**：
   - 测试跨租户操作（虽然应该被阻止）
   - 验证数据的 tenant_id 是否正确

## 相关文档

- [多租户功能完整修复总结](./MULTI_TENANT_COMPLETE_FIX.md)
- [租户数据隔离问题修复](./TENANT_ISOLATION_FIX.md)
- [租户数据隔离测试指南](./TENANT_ISOLATION_TEST.md)

## 更新时间

2025-11-25 23:30:00 (UTC+8)
