# RLS 策略文档

## 概述

本文档详细说明了车队管理系统的 Row Level Security (RLS) 策略，确保数据访问符合角色权限要求。

---

## 一、权限模型

### 1. 超级管理员（中央管理系统）
- **位置**：中央管理系统（public schema）
- **权限**：管理所有老板和租户
- **说明**：不在租户 Schema 中，通过中央管理系统管理

### 2. 老板（租户系统最高权限）
- **角色代码**：`boss`
- **权限类型**：`full`（完整权限）
- **权限范围**：租户内所有数据
- **可以执行的操作**：
  - ✅ 查看所有用户
  - ✅ 创建、编辑、删除用户
  - ✅ 管理所有车辆、考勤、请假、计件记录
  - ✅ 管理所有仓库

### 3. 平级账号（最多3个）
- **角色代码**：`peer`
- **权限类型**：
  - `full`：完整权限，与老板相同
  - `readonly`：只读权限，只能查看

#### 3.1 完整权限平级账号
- **权限范围**：租户内所有数据
- **可以执行的操作**：
  - ✅ 查看所有用户
  - ✅ 创建、编辑、删除用户
  - ✅ 管理所有车辆、考勤、请假、计件记录
  - ✅ 管理所有仓库

#### 3.2 只读权限平级账号
- **权限范围**：租户内所有数据
- **可以执行的操作**：
  - ✅ 查看所有用户
  - ✅ 查看所有车辆、考勤、请假、计件记录
  - ✅ 查看所有仓库
  - ❌ 不能创建、编辑、删除任何数据

### 4. 车队长
- **角色代码**：`fleet_leader`
- **权限类型**：
  - `full`：完整权限，管辖范围内最高权限
  - `readonly`：只读权限，管辖范围内只能查看
- **管辖范围**：通过 `warehouse_ids` 字段定义

#### 4.1 完整权限车队长
- **权限范围**：管辖的仓库范围内
- **可以执行的操作**：
  - ✅ 查看管辖范围内的用户
  - ✅ 创建、编辑、删除管辖范围内的用户
  - ✅ 管理管辖范围内的车辆、考勤、请假、计件记录
  - ✅ 查看管辖的仓库
  - ❌ 不能管理仓库（只有老板和平级账号可以）

#### 4.2 只读权限车队长
- **权限范围**：管辖的仓库范围内
- **可以执行的操作**：
  - ✅ 查看管辖范围内的用户
  - ✅ 查看管辖范围内的车辆、考勤、请假、计件记录
  - ✅ 查看管辖的仓库
  - ❌ 不能创建、编辑、删除任何数据

### 5. 司机
- **角色代码**：`driver`
- **权限类型**：`full`（默认）
- **权限范围**：只能操作自己的数据

**可以执行的操作**：
- ✅ 查看自己的信息
- ✅ 更新自己的信息
- ✅ 查看自己的车辆
- ✅ 查看自己的考勤记录
- ✅ 创建自己的请假申请
- ✅ 查看自己的请假申请
- ✅ 查看自己的计件记录
- ❌ 不能查看其他用户的信息
- ❌ 不能管理其他用户的数据

---

## 二、数据结构

### profiles 表字段

| 字段名 | 类型 | 说明 | 约束 |
|--------|------|------|------|
| `id` | UUID | 用户ID | PRIMARY KEY, 关联 auth.users(id) |
| `name` | TEXT | 姓名 | NOT NULL |
| `email` | TEXT | 邮箱 | - |
| `phone` | TEXT | 手机号 | - |
| `role` | TEXT | 角色 | NOT NULL, DEFAULT 'driver' |
| `permission_type` | TEXT | 权限类型 | DEFAULT 'full' |
| `status` | TEXT | 状态 | DEFAULT 'active' |
| `vehicle_plate` | TEXT | 车牌号 | - |
| `warehouse_ids` | UUID[] | 管辖的仓库ID列表 | - |
| `managed_by` | UUID | 管理者ID | - |
| `created_at` | TIMESTAMPTZ | 创建时间 | DEFAULT NOW() |
| `updated_at` | TIMESTAMPTZ | 更新时间 | DEFAULT NOW() |

### 角色枚举值

```sql
CONSTRAINT valid_role CHECK (role IN ('boss', 'peer', 'fleet_leader', 'driver'))
```

- `boss`：老板
- `peer`：平级账号
- `fleet_leader`：车队长
- `driver`：司机

### 权限类型枚举值

```sql
CONSTRAINT valid_permission CHECK (permission_type IN ('full', 'readonly'))
```

- `full`：完整权限
- `readonly`：只读权限

### 状态枚举值

```sql
CONSTRAINT valid_status CHECK (status IN ('active', 'inactive'))
```

- `active`：激活
- `inactive`：停用

---

## 三、辅助函数

### 1. has_full_permission(user_id UUID)

**功能**：检查用户是否有完整权限

**返回值**：BOOLEAN

**逻辑**：
```sql
SELECT EXISTS (
  SELECT 1 FROM profiles
  WHERE id = user_id
    AND role IN ('boss', 'peer', 'fleet_leader')
    AND permission_type = 'full'
    AND status = 'active'
);
```

### 2. can_view_user(viewer_id UUID, target_user_id UUID)

**功能**：检查用户是否可以查看某个用户

**返回值**：BOOLEAN

**逻辑**：
```sql
SELECT EXISTS (
  SELECT 1 FROM profiles viewer
  LEFT JOIN profiles target ON target.id = target_user_id
  WHERE viewer.id = viewer_id
    AND viewer.status = 'active'
    AND (
      -- 老板和完整/只读权限平级账号可以查看所有用户
      (viewer.role IN ('boss', 'peer'))
      OR
      -- 车队长可以查看管辖范围内的用户
      (viewer.role = 'fleet_leader' AND target.warehouse_ids && viewer.warehouse_ids)
      OR
      -- 司机只能查看自己
      (viewer.role = 'driver' AND viewer.id = target_user_id)
    )
);
```

### 3. can_manage_user(manager_id UUID, target_user_id UUID)

**功能**：检查用户是否可以管理某个用户

**返回值**：BOOLEAN

**逻辑**：
```sql
SELECT EXISTS (
  SELECT 1 FROM profiles manager
  LEFT JOIN profiles target ON target.id = target_user_id
  WHERE manager.id = manager_id
    AND manager.status = 'active'
    AND manager.permission_type = 'full'
    AND (
      -- 老板和完整权限平级账号可以管理所有用户
      (manager.role IN ('boss', 'peer'))
      OR
      -- 完整权限车队长可以管理管辖范围内的用户
      (manager.role = 'fleet_leader' AND target.warehouse_ids && manager.warehouse_ids)
    )
);
```

---

## 四、RLS 策略详解

### 1. profiles 表

#### 策略1：查看用户
```sql
CREATE POLICY "查看用户" ON profiles
  FOR SELECT TO authenticated
  USING (can_view_user(auth.uid(), id));
```

**说明**：
- 老板和平级账号：可以查看所有用户
- 车队长：可以查看管辖范围内的用户
- 司机：只能查看自己

#### 策略2：更新用户
```sql
CREATE POLICY "更新用户" ON profiles
  FOR UPDATE TO authenticated
  USING (
    -- 可以更新自己的信息
    auth.uid() = id
    OR
    -- 或者有管理权限
    can_manage_user(auth.uid(), id)
  );
```

**说明**：
- 所有用户：可以更新自己的信息
- 老板和完整权限平级账号：可以更新所有用户
- 完整权限车队长：可以更新管辖范围内的用户

#### 策略3：插入用户
```sql
CREATE POLICY "插入用户" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (has_full_permission(auth.uid()));
```

**说明**：
- 只有拥有完整权限的用户才能创建新用户
- 包括：老板、完整权限平级账号、完整权限车队长

#### 策略4：删除用户
```sql
CREATE POLICY "删除用户" ON profiles
  FOR DELETE TO authenticated
  USING (can_manage_user(auth.uid(), id));
```

**说明**：
- 老板和完整权限平级账号：可以删除所有用户
- 完整权限车队长：可以删除管辖范围内的用户

---

### 2. vehicles 表

#### 策略1：查看车辆
```sql
CREATE POLICY "查看车辆" ON vehicles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.status = 'active'
        AND (
          -- 老板和平级账号可以查看所有车辆
          p.role IN ('boss', 'peer')
          OR
          -- 车队长可以查看管辖范围内的车辆
          (p.role = 'fleet_leader' AND warehouse_id = ANY(p.warehouse_ids))
          OR
          -- 司机可以查看自己的车辆
          (p.role = 'driver' AND driver_id = auth.uid())
        )
    )
  );
```

#### 策略2：管理车辆
```sql
CREATE POLICY "管理车辆" ON vehicles
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.status = 'active'
        AND p.permission_type = 'full'
        AND (
          -- 老板和完整权限平级账号可以管理所有车辆
          p.role IN ('boss', 'peer')
          OR
          -- 完整权限车队长可以管理管辖范围内的车辆
          (p.role = 'fleet_leader' AND warehouse_id = ANY(p.warehouse_ids))
        )
    )
  );
```

---

### 3. attendance 表

#### 策略1：查看考勤
```sql
CREATE POLICY "查看考勤" ON attendance
  FOR SELECT TO authenticated
  USING (
    -- 可以查看自己的考勤
    user_id = auth.uid()
    OR
    -- 或者有查看权限
    EXISTS (
      SELECT 1 FROM profiles manager
      LEFT JOIN profiles target ON target.id = user_id
      WHERE manager.id = auth.uid()
        AND manager.status = 'active'
        AND (
          manager.role IN ('boss', 'peer')
          OR
          (manager.role = 'fleet_leader' AND target.warehouse_ids && manager.warehouse_ids)
        )
    )
  );
```

#### 策略2：管理考勤
```sql
CREATE POLICY "管理考勤" ON attendance
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles manager
      LEFT JOIN profiles target ON target.id = user_id
      WHERE manager.id = auth.uid()
        AND manager.status = 'active'
        AND manager.permission_type = 'full'
        AND (
          manager.role IN ('boss', 'peer')
          OR
          (manager.role = 'fleet_leader' AND target.warehouse_ids && manager.warehouse_ids)
        )
    )
  );
```

---

### 4. warehouses 表

#### 策略1：查看仓库
```sql
CREATE POLICY "查看仓库" ON warehouses
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.status = 'active'
        AND (
          -- 老板和平级账号可以查看所有仓库
          p.role IN ('boss', 'peer')
          OR
          -- 车队长可以查看管辖的仓库
          (p.role = 'fleet_leader' AND id = ANY(p.warehouse_ids))
        )
    )
  );
```

#### 策略2：管理仓库
```sql
CREATE POLICY "管理仓库" ON warehouses
  FOR ALL TO authenticated
  USING (
    has_full_permission(auth.uid()) 
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('boss', 'peer')
    )
  );
```

**说明**：只有老板和完整权限平级账号可以管理仓库

---

### 5. leave_requests 表

#### 策略1：查看请假申请
```sql
CREATE POLICY "查看请假申请" ON leave_requests
  FOR SELECT TO authenticated
  USING (
    -- 可以查看自己的请假申请
    user_id = auth.uid()
    OR
    -- 或者有查看权限
    EXISTS (
      SELECT 1 FROM profiles manager
      LEFT JOIN profiles target ON target.id = user_id
      WHERE manager.id = auth.uid()
        AND manager.status = 'active'
        AND (
          manager.role IN ('boss', 'peer')
          OR
          (manager.role = 'fleet_leader' AND target.warehouse_ids && manager.warehouse_ids)
        )
    )
  );
```

#### 策略2：创建请假申请
```sql
CREATE POLICY "创建请假申请" ON leave_requests
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
```

**说明**：所有用户都可以为自己创建请假申请

#### 策略3：审批请假申请
```sql
CREATE POLICY "审批请假申请" ON leave_requests
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles manager
      LEFT JOIN profiles target ON target.id = user_id
      WHERE manager.id = auth.uid()
        AND manager.status = 'active'
        AND manager.permission_type = 'full'
        AND (
          manager.role IN ('boss', 'peer')
          OR
          (manager.role = 'fleet_leader' AND target.warehouse_ids && manager.warehouse_ids)
        )
    )
  );
```

**说明**：只有拥有完整权限的管理者才能审批请假申请

---

### 6. piecework_records 表

#### 策略1：查看计件记录
```sql
CREATE POLICY "查看计件记录" ON piecework_records
  FOR SELECT TO authenticated
  USING (
    -- 可以查看自己的计件记录
    user_id = auth.uid()
    OR
    -- 或者有查看权限
    EXISTS (
      SELECT 1 FROM profiles manager
      LEFT JOIN profiles target ON target.id = user_id
      WHERE manager.id = auth.uid()
        AND manager.status = 'active'
        AND (
          manager.role IN ('boss', 'peer')
          OR
          (manager.role = 'fleet_leader' AND target.warehouse_ids && manager.warehouse_ids)
        )
    )
  );
```

#### 策略2：管理计件记录
```sql
CREATE POLICY "管理计件记录" ON piecework_records
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles manager
      LEFT JOIN profiles target ON target.id = user_id
      WHERE manager.id = auth.uid()
        AND manager.status = 'active'
        AND manager.permission_type = 'full'
        AND (
          manager.role IN ('boss', 'peer')
          OR
          (manager.role = 'fleet_leader' AND target.warehouse_ids && manager.warehouse_ids)
        )
    )
  );
```

---

## 五、权限矩阵

### profiles 表

| 角色 | 权限类型 | 查看 | 创建 | 更新 | 删除 |
|------|----------|------|------|------|------|
| 老板 | full | 所有用户 | ✅ | 所有用户 | 所有用户 |
| 平级账号 | full | 所有用户 | ✅ | 所有用户 | 所有用户 |
| 平级账号 | readonly | 所有用户 | ❌ | ❌ | ❌ |
| 车队长 | full | 管辖范围 | ✅ | 管辖范围 | 管辖范围 |
| 车队长 | readonly | 管辖范围 | ❌ | ❌ | ❌ |
| 司机 | full | 自己 | ❌ | 自己 | ❌ |

### vehicles 表

| 角色 | 权限类型 | 查看 | 创建 | 更新 | 删除 |
|------|----------|------|------|------|------|
| 老板 | full | 所有车辆 | ✅ | ✅ | ✅ |
| 平级账号 | full | 所有车辆 | ✅ | ✅ | ✅ |
| 平级账号 | readonly | 所有车辆 | ❌ | ❌ | ❌ |
| 车队长 | full | 管辖范围 | ✅ | ✅ | ✅ |
| 车队长 | readonly | 管辖范围 | ❌ | ❌ | ❌ |
| 司机 | full | 自己的车辆 | ❌ | ❌ | ❌ |

### attendance 表

| 角色 | 权限类型 | 查看 | 创建 | 更新 | 删除 |
|------|----------|------|------|------|------|
| 老板 | full | 所有考勤 | ✅ | ✅ | ✅ |
| 平级账号 | full | 所有考勤 | ✅ | ✅ | ✅ |
| 平级账号 | readonly | 所有考勤 | ❌ | ❌ | ❌ |
| 车队长 | full | 管辖范围 | ✅ | ✅ | ✅ |
| 车队长 | readonly | 管辖范围 | ❌ | ❌ | ❌ |
| 司机 | full | 自己的考勤 | ❌ | ❌ | ❌ |

### warehouses 表

| 角色 | 权限类型 | 查看 | 创建 | 更新 | 删除 |
|------|----------|------|------|------|------|
| 老板 | full | 所有仓库 | ✅ | ✅ | ✅ |
| 平级账号 | full | 所有仓库 | ✅ | ✅ | ✅ |
| 平级账号 | readonly | 所有仓库 | ❌ | ❌ | ❌ |
| 车队长 | full | 管辖的仓库 | ❌ | ❌ | ❌ |
| 车队长 | readonly | 管辖的仓库 | ❌ | ❌ | ❌ |
| 司机 | full | ❌ | ❌ | ❌ | ❌ |

### leave_requests 表

| 角色 | 权限类型 | 查看 | 创建 | 审批 | 删除 |
|------|----------|------|------|------|------|
| 老板 | full | 所有申请 | ✅ | ✅ | ✅ |
| 平级账号 | full | 所有申请 | ✅ | ✅ | ✅ |
| 平级账号 | readonly | 所有申请 | ❌ | ❌ | ❌ |
| 车队长 | full | 管辖范围 | ✅ | 管辖范围 | ✅ |
| 车队长 | readonly | 管辖范围 | ❌ | ❌ | ❌ |
| 司机 | full | 自己的申请 | ✅（自己） | ❌ | ❌ |

### piecework_records 表

| 角色 | 权限类型 | 查看 | 创建 | 更新 | 删除 |
|------|----------|------|------|------|------|
| 老板 | full | 所有记录 | ✅ | ✅ | ✅ |
| 平级账号 | full | 所有记录 | ✅ | ✅ | ✅ |
| 平级账号 | readonly | 所有记录 | ❌ | ❌ | ❌ |
| 车队长 | full | 管辖范围 | ✅ | ✅ | ✅ |
| 车队长 | readonly | 管辖范围 | ❌ | ❌ | ❌ |
| 司机 | full | 自己的记录 | ❌ | ❌ | ❌ |

---

## 六、使用示例

### 1. 创建老板账号
```typescript
// 在 Edge Function 中创建租户时自动创建
await supabase
  .from('profiles')
  .insert({
    id: bossUserId,
    name: '张三',
    phone: '13900000001',
    role: 'boss',
    permission_type: 'full',
    status: 'active'
  })
```

### 2. 创建完整权限平级账号
```typescript
await supabase
  .from('profiles')
  .insert({
    id: peerUserId,
    name: '李四',
    phone: '13900000002',
    role: 'peer',
    permission_type: 'full',
    status: 'active'
  })
```

### 3. 创建只读权限平级账号
```typescript
await supabase
  .from('profiles')
  .insert({
    id: peerUserId,
    name: '王五',
    phone: '13900000003',
    role: 'peer',
    permission_type: 'readonly',
    status: 'active'
  })
```

### 4. 创建完整权限车队长
```typescript
await supabase
  .from('profiles')
  .insert({
    id: fleetLeaderId,
    name: '赵六',
    phone: '13900000004',
    role: 'fleet_leader',
    permission_type: 'full',
    warehouse_ids: [warehouse1Id, warehouse2Id],
    status: 'active'
  })
```

### 5. 创建只读权限车队长
```typescript
await supabase
  .from('profiles')
  .insert({
    id: fleetLeaderId,
    name: '孙七',
    phone: '13900000005',
    role: 'fleet_leader',
    permission_type: 'readonly',
    warehouse_ids: [warehouse1Id],
    status: 'active'
  })
```

### 6. 创建司机
```typescript
await supabase
  .from('profiles')
  .insert({
    id: driverId,
    name: '周八',
    phone: '13900000006',
    role: 'driver',
    permission_type: 'full',
    warehouse_ids: [warehouse1Id],
    status: 'active'
  })
```

---

## 七、总结

### ✅ 符合要求

当前的 RLS 策略**完全符合**您的权限要求：

1. ✅ **超级管理员管理所有老板**：通过中央管理系统实现
2. ✅ **老板拥有租户系统最高权限**：可以管理所有数据
3. ✅ **平级账号（最多3个）**：
   - ✅ 完整权限：与老板相同
   - ✅ 只读权限：只能查看
4. ✅ **车队长**：
   - ✅ 完整权限：管辖范围内最高权限
   - ✅ 只读权限：管辖范围内只能查看
   - ✅ 管辖范围：通过 warehouse_ids 定义
5. ✅ **司机**：只能操作自己的数据

### 📊 核心特性

1. **细粒度权限控制**：通过 role 和 permission_type 实现
2. **管辖范围隔离**：通过 warehouse_ids 实现车队长的管辖范围
3. **安全性**：所有表都启用了 RLS，确保数据访问安全
4. **灵活性**：支持动态调整用户的角色和权限
5. **可扩展性**：可以轻松添加新的角色和权限类型

---

**文档版本**：1.0  
**更新时间**：2025-11-27  
**作者**：秒哒 AI
