# 司机仓库分配同步问题调试

## 问题描述

**文件**: `src/pages/manager/staff-management/index.tsx`
- ✅ 使用 `assignDriverWarehouses(driverId, selectedWarehouseIds)` 保存
- ✅ 保存成功后调用 `loadAllDrivers()` 刷新列表
- ✅ 显示"保存成功"提示

### 2. 数据库API
**文件**: `src/db/api.ts`

**setDriverWarehouses 函数**:
```typescript
export async function setDriverWarehouses(
  driverId: string,
  warehouseIds: string[]
): Promise<{success: boolean; error?: string}>
```
- ✅ 先删除旧的仓库分配
- ✅ 再插入新的仓库分配
- ✅ 返回成功/失败状态

**getDriverWarehouses 函数**:
```typescript
export async function getDriverWarehouses(driverId: string): Promise<Warehouse[]>
```
- ✅ 从 `driver_warehouses` 表读取数据
- ✅ 包含详细的日志输出
- ✅ 返回仓库列表

### 3. 司机端页面
try/index.tsx`):
- ✅ 有 `useDidShow` 钩子（第173-175行）
- ✅ 每次页面显示时调用 `loadData()`

**打卡页面** (`src/pages/driver/clock-in/index.tsx`):
- ✅ 有 `useDidShow` 钩子（第79-82行）
- ✅ 有下拉刷新功能（第85-88行）

**计件查看页面** (`src/pages/driver/piece-work/index.tsx`):
- ✅ 有 `useDidShow` 钩子（第122-125行）
- ✅ 有下拉刷新功能（第128-131行）

### 4. 数据库表结构
**文件**: `supabase/migrations/08_create_driver_warehouses.sql`
- ✅ `driver_warehouses` 表结构正确
- ✅ 有唯一约束：(driver_id, warehouse_id)
- ✅ 有索引优化查询性能

### 5. RLS策略
**文件**: `supabase/migrations/31_disable_all_rls.sql`
- ✅ RLS已被禁用，不存在权限问题

## 可能的原因

### 原因1: 数据未正确保存到数据库
**检查方法**:
1. 管理端分配仓库后，检查浏览器控制台是否有错误
2. 检查 Supabase 数据库中 `driver_warehouses` 表的数据

### 原因2: 司机端缓存问题
**检查方法**:
1. 司机端完全退出小程序后重新进入
2. 清除小程序缓存后重试

### 原因3: 仓库被禁用
**检查方法**:
1. 检查分配的仓库 `is_active` 字段是否为 `true`
2. 司机端只显示启用的仓库（`w.is_active === true`）

### 原因4: 数据库查询时机问题
**检查方法**:
1. 查看司机端控制台日志
2. 确认 `getDriverWarehouses` 函数是否被调用
3. 确认返回的数据是否正确

## 调试步骤

### 步骤1: 检查数据库
```sql
-- 查看司机的仓库分配
SELECT dw.*, w.name as warehouse_name, w.is_active
FROM driver_warehouses dw
JOIN warehouses w ON dw.warehouse_id = w.id
WHERE dw.driver_id = '司机ID';
```

### 步骤2: 检查管理端日志
1. 打开管理端页面
2. 打开浏览器开发者工具
3. 分配仓库并保存
4. 查看控制台是否有错误

### 步骤3: 检查司机端日志
1. 打开司机端页面
2. 打开浏览器开发者工具
3. 查看控制台日志
4. 查找 "=== getDriverWarehouses 调用 ===" 日志
5. 查看返回的仓库数据

### 步骤4: 强制刷新
1. 司机端完全退出小程序
2. 重新进入小程序
3. 进入计件录入或打卡页面
4. 检查是否显示新分配的仓库

## 解决方案

### 方案1: 增强日志输出
3: 添加实时通知

1. 请用户提供具体的操作步骤和截图
2. 检查数据库中的实际数据
3. 查看控制台日志
4. 根据日志输出定位具体问题
