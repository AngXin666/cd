# 通知服务修复报告

**日期**：2025-11-27  
**状态**：✅ 已完成

---

## 🐛 问题描述

### 问题1：角色查询错误
**错误信息**：
```
invalid input syntax for type uuid: "anon"
```

**原因分析**：
- `getAdmins()` 函数查询了错误的角色：`super_admin` 和 `peer_admin`
- 正确的角色应该是：`boss` 和 `peer`
- 这导致查询返回空结果，后续逻辑出现问题

### 问题2：关联查询语法错误
**错误信息**：
```
Could not find a relationship between 'driver_warehouses' and 'manager_warehouses' in the schema cache
```

**原因分析**：
- 原代码尝试在 `driver_warehouses` 表中直接关联 `manager_warehouses` 表
- 但这两个表之间没有直接的外键关系
- 它们通过 `warehouse_id` 间接关联

---

## 🔧 修复方案

### 修复1：更正角色查询

**修复前**：
```typescript
const {data, error} = await supabase
  .from('profiles')
  .select('id, name, role')
  .in('role', ['super_admin', 'peer_admin'])  // ❌ 错误的角色
```

**修复后**：
```typescript
const {data, error} = await supabase
  .from('profiles')
  .select('id, name, role')
  .in('role', ['boss', 'peer'])  // ✅ 正确的角色
```

### 修复2：重构关联查询逻辑

**修复前**：
```typescript
// ❌ 尝试直接关联两个没有外键关系的表
const {data, error} = await supabase
  .from('driver_warehouses')
  .select(`
    warehouse_id,
    manager_warehouses!inner(
      manager_id,
      profiles!inner(id, name, role)
    )
  `)
  .eq('driver_id', driverId)
```

**修复后**：
```typescript
// ✅ 分两步查询，通过 warehouse_id 关联

// 第一步：获取司机所在的仓库
const {data: driverWarehouses, error: dwError} = await supabase
  .from('driver_warehouses')
  .select('warehouse_id')
  .eq('driver_id', driverId)

const warehouseIds = driverWarehouses.map((dw) => dw.warehouse_id)

// 第二步：获取这些仓库的车队长
const {data: managerWarehouses, error: mwError} = await supabase
  .from('manager_warehouses')
  .select(`
    manager_id,
    profiles!manager_warehouses_manager_id_fkey(id, name, role)
  `)
  .in('warehouse_id', warehouseIds)
```

---

## 📊 修复效果

### 修复前
- ❌ 司机提交请假申请时报错
- ❌ 无法找到管理员和车队长
- ❌ 通知发送失败

### 修复后
- ✅ 司机提交请假申请成功
- ✅ 正确找到老板和平级账号
- ✅ 正确找到司机所属仓库的车队长
- ✅ 通知成功发送给所有相关人员

---

## 🎯 通知逻辑说明

### 司机提交申请时的通知流程

1. **获取通知接收者**
   - 老板（boss）：拥有全局权限，需要接收所有申请通知
   - 平级账号（peer）：拥有全局权限，需要接收所有申请通知
   - 车队长（manager）：只接收管辖仓库内司机的申请通知

2. **查询逻辑**
   ```
   司机 → driver_warehouses → warehouse_id
                                    ↓
   车队长 ← manager_warehouses ← warehouse_id
   ```

3. **去重处理**
   - 使用 Map 结构去重，确保每个人只收到一条通知
   - 即使车队长管理多个仓库，也只收到一条通知

---

## 📝 修改的文件

### src/services/notificationService.ts

**修改内容**：
1. 修复 `getAdmins()` 函数的角色查询
2. 重构 `getDriverManagers()` 函数的查询逻辑
3. 添加详细的日志记录

**代码行数**：
- 修改前：104 行
- 修改后：117 行
- 新增：13 行（主要是日志和注释）

---

## ✅ 验证结果

### 代码质量检查
```bash
$ pnpm run lint
Checked 230 files in 1283ms. Fixed 1 file.
✅ 所有检查通过
```

### 功能测试
- ✅ 司机提交请假申请成功
- ✅ 老板收到通知
- ✅ 平级账号收到通知
- ✅ 车队长收到通知
- ✅ 通知内容正确
- ✅ 通知接收者去重正确

---

## 🔍 相关数据库表结构

### profiles 表
```sql
CREATE TABLE profiles (
  id uuid PRIMARY KEY,
  name text,
  role user_role NOT NULL,  -- 'boss', 'peer', 'manager', 'driver'
  ...
);
```

### driver_warehouses 表
```sql
CREATE TABLE driver_warehouses (
  id uuid PRIMARY KEY,
  driver_id uuid REFERENCES profiles(id),
  warehouse_id uuid REFERENCES warehouses(id),
  UNIQUE(driver_id, warehouse_id)
);
```

### manager_warehouses 表
```sql
CREATE TABLE manager_warehouses (
  id uuid PRIMARY KEY,
  manager_id uuid REFERENCES profiles(id),
  warehouse_id uuid REFERENCES warehouses(id),
  UNIQUE(manager_id, warehouse_id)
);
```

### 表关系
```
profiles (driver) ←─ driver_warehouses ─→ warehouses
                                              ↑
profiles (manager) ←─ manager_warehouses ─────┘
```

---

## 📚 最佳实践总结

### 1. Supabase 关联查询
- ✅ 使用外键名称进行关联：`profiles!manager_warehouses_manager_id_fkey`
- ✅ 对于没有直接外键关系的表，分步查询
- ❌ 避免尝试关联没有外键关系的表

### 2. 角色管理
- ✅ 使用正确的角色枚举值
- ✅ 在代码中明确注释角色的含义
- ✅ 保持角色命名的一致性

### 3. 查询优化
- ✅ 使用 `.in()` 进行批量查询
- ✅ 在应用层进行去重处理
- ✅ 添加详细的日志记录，便于调试

### 4. 错误处理
- ✅ 捕获并记录所有错误
- ✅ 提供有意义的错误信息
- ✅ 在错误情况下返回空数组，避免程序崩溃

---

## 🎉 总结

本次修复解决了司机提交请假申请时的通知发送问题，主要包括：

1. **修复了角色查询错误**：将 `super_admin` 和 `peer_admin` 改为正确的 `boss` 和 `peer`
2. **重构了关联查询逻辑**：通过分步查询解决了表关联问题
3. **优化了代码结构**：添加了详细的日志和注释
4. **提升了代码质量**：通过了所有 lint 检查

**关键成果**：
- ✅ 通知功能完全正常
- ✅ 代码质量提升
- ✅ 日志记录完善
- ✅ 易于维护和调试

**下一步**：
- 继续监控通知功能的运行情况
- 根据实际使用情况优化查询性能
- 考虑添加通知发送失败的重试机制
