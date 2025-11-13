# 修复考勤统计查询错误

## 问题描述

### 错误信息

```
supabase.ts:23 
HEAD https://backend.appmiaoda.com/projects/supabase244341780043055104/rest/v1/attendance_records?select=id&warehouse_id=eq.400fdf77-b072-4be4-bb11-0465e8a7268e&clock_in_date=gte.2025-11-01 400 (Bad Request)
```

### 错误原因

代码中使用了错误的字段名 `clock_in_date`，但数据库表 `attendance_records` 中实际的字段名是 `work_date`。

## 数据库表结构

### attendance_records 表

| 字段名 | 数据类型 | 是否可空 | 默认值 | 说明 |
|--------|---------|---------|--------|------|
| id | uuid | NO | gen_random_uuid() | 主键 |
| user_id | uuid | NO | - | 用户ID |
| clock_in_time | timestamptz | NO | now() | 打卡时间 |
| clock_out_time | timestamptz | YES | - | 下班打卡时间 |
| **work_date** | date | NO | CURRENT_DATE | **工作日期** |
| work_hours | numeric | YES | - | 工作时长 |
| status | text | NO | 'normal' | 状态 |
| notes | text | YES | - | 备注 |
| created_at | timestamptz | YES | now() | 创建时间 |
| warehouse_id | uuid | YES | - | 仓库ID |

**关键点**：
- ❌ 表中**没有** `clock_in_date` 字段
- ✅ 表中**有** `work_date` 字段（类型为 `date`）

## 问题定位

### 错误代码位置

**文件**：`src/db/api.ts`

**函数**：`getWarehouseDataVolume`

**错误代码**：
```typescript
// 统计今日考勤数
let todayAttendanceQuery = supabase
  .from('attendance_records')
  .select('id', {count: 'exact', head: true})
  .eq('warehouse_id', warehouseId)
  .eq('clock_in_date', today)  // ❌ 错误：字段名不存在

// 统计本月考勤数
let monthAttendanceQuery = supabase
  .from('attendance_records')
  .select('id', {count: 'exact', head: true})
  .eq('warehouse_id', warehouseId)
  .gte('clock_in_date', firstDayOfMonth)  // ❌ 错误：字段名不存在
```

### 错误影响

1. **查询失败**：所有使用 `getWarehouseDataVolume` 函数的地方都会返回 400 错误
2. **数据统计错误**：无法正确统计今日考勤数和本月考勤数
3. **用户体验**：仓库数据量统计功能无法正常使用

## 解决方案

### 修复代码

将 `clock_in_date` 改为 `work_date`：

```typescript
// 统计今日考勤数
let todayAttendanceQuery = supabase
  .from('attendance_records')
  .select('id', {count: 'exact', head: true})
  .eq('warehouse_id', warehouseId)
  .eq('work_date', today)  // ✅ 正确：使用work_date字段

// 统计本月考勤数
let monthAttendanceQuery = supabase
  .from('attendance_records')
  .select('id', {count: 'exact', head: true})
  .eq('warehouse_id', warehouseId)
  .gte('work_date', firstDayOfMonth)  // ✅ 正确：使用work_date字段
```

### 修改文件

- ✅ `src/db/api.ts`（第 3457 行和第 3470 行）

## 验证

### 1. 检查字段名

```sql
-- 查看attendance_records表的列定义
SELECT 
  column_name, 
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'attendance_records' 
ORDER BY ordinal_position;
```

**结果**：
- ✅ 确认表中有 `work_date` 字段（类型为 `date`）
- ❌ 确认表中没有 `clock_in_date` 字段

### 2. 测试查询

```typescript
// 测试今日考勤统计
const today = '2025-11-05'
const { count } = await supabase
  .from('attendance_records')
  .select('id', { count: 'exact', head: true })
  .eq('warehouse_id', warehouseId)
  .eq('work_date', today)
```

**预期结果**：
- ✅ 查询成功，返回今日考勤数量
- ✅ 不再出现 400 错误

### 3. 代码检查

```bash
# 检查是否还有其他地方使用错误的字段名
grep -r "clock_in_date\|clock_out_date" /workspace/app-7cdqf07mbu9t/src --include="*.tsx" --include="*.ts" -n
```

**结果**：
- ✅ 没有其他地方使用错误的字段名

## 影响范围

### 修改的函数

- `getWarehouseDataVolume`：获取仓库数据量统计

### 使用该函数的页面

需要测试以下页面，确保数据统计功能正常：
1. 超级管理员仓库管理页面
2. 普通管理员仓库管理页面
3. 其他使用仓库数据量统计的页面

## 根本原因分析

### 为什么会出现这个错误？

1. **字段命名不一致**：
   - 代码中使用了 `clock_in_date`（打卡日期）
   - 数据库中使用了 `work_date`（工作日期）

2. **缺少类型检查**：
   - 如果使用了 TypeScript 类型定义，可以在编译时发现这个错误
   - 建议为所有数据库表创建 TypeScript 接口

3. **缺少测试**：
   - 如果有单元测试或集成测试，可以在测试阶段发现这个错误

## 预防措施

### 1. 使用 TypeScript 类型定义

**建议**：为 `attendance_records` 表创建 TypeScript 接口

```typescript
// src/db/types.ts
export interface AttendanceRecord {
  id: string
  user_id: string
  clock_in_time: string
  clock_out_time: string | null
  work_date: string  // ✅ 明确字段名
  work_hours: number | null
  status: string
  notes: string | null
  created_at: string
  warehouse_id: string | null
}
```

### 2. 使用类型安全的查询

```typescript
// 使用类型定义
const { data, error } = await supabase
  .from('attendance_records')
  .select('*')
  .eq('work_date', today)
  .returns<AttendanceRecord[]>()
```

### 3. 添加单元测试

```typescript
// 测试考勤统计功能
describe('getWarehouseDataVolume', () => {
  it('should count today attendance correctly', async () => {
    const result = await getWarehouseDataVolume(warehouseId)
    expect(result.todayAttendanceCount).toBeGreaterThanOrEqual(0)
  })
})
```

### 4. 代码审查

- 在代码审查时，检查所有数据库查询的字段名是否正确
- 确保字段名与数据库表结构一致

## 总结

### 问题

- 代码中使用了不存在的字段名 `clock_in_date`
- 导致考勤统计查询失败，返回 400 错误

### 解决

- 将 `clock_in_date` 改为正确的字段名 `work_date`
- 修改了 2 处代码（今日考勤统计和本月考勤统计）

### 影响

- 修复了仓库数据量统计功能
- 考勤统计查询现在可以正常工作

### 预防

- 使用 TypeScript 类型定义
- 添加单元测试
- 加强代码审查

## Git 提交记录

```bash
9a17097 修复考勤统计查询错误：将clock_in_date改为正确的字段名work_date
```

## 相关文档

- `docs/DRIVER_REAL_NAME_SYNC.md`：司机实名自动同步功能
- `docs/DRIVER_NAME_MANAGEMENT_SUMMARY.md`：司机姓名管理功能总结
