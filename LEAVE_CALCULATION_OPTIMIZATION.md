# 请假与达标率计算优化文档

## 修复日期
2025-11-15

## 优化概述

本次优化针对**请假情况与司机达标率的计算方式**进行了全面改进，确保系统能够：
1. 正确读取仓库配置的允许请假天数
2. 区分合规请假和超标请假
3. 准确计算周达标率和月达标率

---

## 1. 核心优化内容

### 1.1 读取仓库配置的允许请假天数

**数据源**：`warehouses` 表中的 `max_leave_days` 字段

**实现位置**：
- 普通管理端：`src/pages/manager/piece-work-report/index.tsx`
- 超级管理端：`src/pages/super-admin/piece-work-report/index.tsx`

**代码示例**：
```typescript
const currentWarehouse = warehouses[currentWarehouseIndex]
const maxLeaveDays = currentWarehouse?.max_leave_days || 0
```

---

### 1.2 达标率计算逻辑

#### 核心公式

**周达标率计算**：
```
周达标率 = 本周实际件数 / (本周应出勤天数 - 本周合规请假天数) / 每日目标件数
```

**月达标率计算**：
```
月达标率 = 本月实际件数 / (本月应出勤天数 - 本月合规请假天数) / 每日目标件数
```

**合规请假天数定义**：
```
合规请假天数 = min(实际请假天数, 允许请假天数)
```

#### 详细说明

1. **本周/本月应出勤天数**
   - 对于新员工：从入职日期开始计算
   - 对于老员工：从本周一/本月1号开始计算
   - 计算公式：`(今天 - 起始日期) + 1`

2. **合规请假天数**
   - 如果实际请假天数 ≤ 允许请假天数：全部请假天数都是合规的
   - 如果实际请假天数 > 允许请假天数：只有允许的天数是合规的

3. **应工作天数**
   - 应工作天数 = 应出勤天数 - 合规请假天数
   - 超标请假的天数会计入应工作天数（不扣除）

---

### 1.3 超标请假处理

#### 处理逻辑

**场景1：合规请假**
```
应出勤天数：28天
实际请假：2天
允许请假：2天
合规请假：min(2, 2) = 2天
应工作天数：28 - 2 = 26天
目标件数：26 × 300 = 7800件
```

**场景2：超标请假**
```
应出勤天数：28天
实际请假：3天
允许请假：2天
合规请假：min(3, 2) = 2天
超标请假：3 - 2 = 1天
应工作天数：28 - 2 = 26天（超标的1天不扣除，计入应工作天数）
目标件数：26 × 300 = 7800件
```

#### 代码实现

```typescript
// 获取本月的请假天数
const monthlyLeaveDays = attendanceStats.leaveDays || 0

// 获取当前仓库的允许请假天数
const currentWarehouse = warehouses[currentWarehouseIndex]
const maxLeaveDays = currentWarehouse?.max_leave_days || 0

// 计算合规请假天数（不超过允许的请假天数）
const validLeaveDays = Math.min(monthlyLeaveDays, maxLeaveDays)

// 计算本月应工作天数 = 本月天数 - 合规请假天数
const workDaysInMonth = Math.max(daysInMonth - validLeaveDays, 0)

// 计算目标件数
const monthlyTarget = dailyTarget * workDaysInMonth
```

---

### 1.4 特殊情况说明

#### 法定节假日
- **处理方式**：按出勤计算
- **原因**：法定节假日不计入请假统计
- **实现**：无需特殊处理，系统默认按出勤计算

#### 调休情况
- **处理方式**：需单独标记，不计入请假统计
- **原因**：调休是工作日的调整，不是请假
- **实现**：在考勤记录中使用特殊状态标记（如果需要）

---

## 2. 技术实现细节

### 2.1 请假天数统计优化

#### 修改位置
`src/db/api.ts` - `getDriverAttendanceStats` 函数

#### 优化内容

**修改前的问题**：
```typescript
// 查询条件不够准确，可能遗漏跨期请假记录
.or(
  `and(start_date.gte.${startDate},start_date.lte.${endDate}),and(end_date.gte.${startDate},end_date.lte.${endDate})`
)
```

**修改后的改进**：
```typescript
// 更准确的查询条件，覆盖所有相关请假
.or(`start_date.lte.${endDate},end_date.gte.${startDate}`)
```

**改进说明**：
- 修改前：只查询开始日期或结束日期在范围内的请假
- 修改后：查询所有与日期范围有交集的请假记录
- 效果：能够正确处理跨期请假（例如：请假从上月28号到本月3号）

#### 请假天数计算逻辑

```typescript
// 计算请假天数（只计算在指定日期范围内的天数）
let leaveDays = 0
if (leaveData && leaveData.length > 0) {
  for (const record of leaveData) {
    const leaveStart = new Date(record.start_date)
    const leaveEnd = new Date(record.end_date)
    const rangeStart = new Date(startDate)
    const rangeEnd = new Date(endDate)

    // 计算请假记录与查询范围的交集
    const overlapStart = new Date(Math.max(leaveStart.getTime(), rangeStart.getTime()))
    const overlapEnd = new Date(Math.min(leaveEnd.getTime(), rangeEnd.getTime()))

    // 如果有交集，计算天数
    if (overlapStart <= overlapEnd) {
      const days = Math.floor((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
      if (days > 0) {
        leaveDays += days
      }
    }
  }
}
```

**关键点**：
- 使用交集计算，确保只统计在查询范围内的请假天数
- 处理跨期请假，例如：
  - 请假：11月28日 - 12月3日（共6天）
  - 查询范围：12月1日 - 12月31日
  - 统计结果：3天（12月1日、2日、3日）

---

### 2.2 周达标率计算

#### 实现位置
- 普通管理端：`src/pages/manager/piece-work-report/index.tsx` (第507-549行)
- 超级管理端：`src/pages/super-admin/piece-work-report/index.tsx` (第526-568行)

#### 核心代码

```typescript
// 计算本周达标率（考虑新员工入职日期和请假天数）
let weeklyCompletionRate = 0
if (dailyTarget > 0) {
  const today = new Date()
  const weekStart = getWeekRange().start
  const weekStartDate = new Date(weekStart)

  // 计算实际工作的起始日期（本周一或入职日，取较晚的）
  let startDate = weekStartDate
  if (summary.joinDate) {
    const joinDate = new Date(summary.joinDate)
    if (joinDate > weekStartDate) {
      startDate = joinDate
    }
  }

  // 计算从起始日期到今天的天数（包含起始日和今天）
  const diffTime = today.getTime() - startDate.getTime()
  const daysInWeek = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1

  // 获取本周的请假天数
  const weeklyAttendanceStats = await getDriverAttendanceStats(
    summary.driverId,
    weekRange.start,
    weekRange.end
  )
  const weeklyLeaveDays = weeklyAttendanceStats.leaveDays || 0

  // 获取当前仓库的允许请假天数（按比例计算本周允许的请假天数）
  const currentWarehouse = warehouses[currentWarehouseIndex]
  const monthlyMaxLeaveDays = currentWarehouse?.max_leave_days || 0
  // 假设一个月30天，计算本周允许的请假天数
  const weeklyMaxLeaveDays = Math.floor((monthlyMaxLeaveDays * daysInWeek) / 30)

  // 计算合规请假天数（不超过允许的请假天数）
  const validLeaveDays = Math.min(weeklyLeaveDays, weeklyMaxLeaveDays)

  // 计算本周应工作天数 = 本周天数 - 合规请假天数
  const workDaysInWeek = Math.max(daysInWeek - validLeaveDays, 0)

  const weeklyTarget = dailyTarget * workDaysInWeek
  weeklyCompletionRate = weeklyTarget > 0 ? (weeklyQuantity / weeklyTarget) * 100 : 0
}
```

#### 关键改进

1. **新增本周请假天数统计**
   ```typescript
   const weeklyAttendanceStats = await getDriverAttendanceStats(
     summary.driverId,
     weekRange.start,
     weekRange.end
   )
   ```

2. **按比例计算本周允许的请假天数**
   ```typescript
   const weeklyMaxLeaveDays = Math.floor((monthlyMaxLeaveDays * daysInWeek) / 30)
   ```
   - 假设一个月30天
   - 例如：月允许请假2天，本周工作5天，则本周允许请假 = floor(2 × 5 / 30) = 0天

3. **计算合规请假天数**
   ```typescript
   const validLeaveDays = Math.min(weeklyLeaveDays, weeklyMaxLeaveDays)
   ```

4. **计算应工作天数**
   ```typescript
   const workDaysInWeek = Math.max(daysInWeek - validLeaveDays, 0)
   ```

---

### 2.3 月达标率计算

#### 实现位置
- 普通管理端：`src/pages/manager/piece-work-report/index.tsx` (第551-586行)
- 超级管理端：`src/pages/super-admin/piece-work-report/index.tsx` (第570-605行)

#### 核心代码

```typescript
// 计算本月达标率（考虑新员工入职日期和请假天数）
let monthlyCompletionRate = 0
if (dailyTarget > 0) {
  const today = new Date()
  const monthStart = getMonthRange().start
  const monthStartDate = new Date(monthStart)

  // 计算实际工作的起始日期（本月1号或入职日，取较晚的）
  let startDate = monthStartDate
  if (summary.joinDate) {
    const joinDate = new Date(summary.joinDate)
    if (joinDate > monthStartDate) {
      startDate = joinDate
    }
  }

  // 计算从起始日期到今天的天数（包含起始日和今天）
  const diffTime = today.getTime() - startDate.getTime()
  const daysInMonth = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1

  // 获取本月的请假天数（使用已经获取的 attendanceStats）
  const monthlyLeaveDays = attendanceStats.leaveDays || 0

  // 获取当前仓库的允许请假天数
  const currentWarehouse = warehouses[currentWarehouseIndex]
  const maxLeaveDays = currentWarehouse?.max_leave_days || 0

  // 计算合规请假天数（不超过允许的请假天数）
  const validLeaveDays = Math.min(monthlyLeaveDays, maxLeaveDays)

  // 计算本月应工作天数 = 本月天数 - 合规请假天数
  const workDaysInMonth = Math.max(daysInMonth - validLeaveDays, 0)

  const monthlyTarget = dailyTarget * workDaysInMonth
  monthlyCompletionRate = monthlyTarget > 0 ? (monthlyQuantity / monthlyTarget) * 100 : 0
}
```

#### 关键改进

**修改前的错误逻辑**：
```typescript
// ❌ 错误：扣除超标请假天数
let workDaysInMonth = daysInMonth
if (actualLeaveDays > maxLeaveDays) {
  const excessLeaveDays = actualLeaveDays - maxLeaveDays
  workDaysInMonth = Math.max(daysInMonth - excessLeaveDays, 0)
}
```

**修改后的正确逻辑**：
```typescript
// ✅ 正确：只扣除合规请假天数
const validLeaveDays = Math.min(monthlyLeaveDays, maxLeaveDays)
const workDaysInMonth = Math.max(daysInMonth - validLeaveDays, 0)
```

**逻辑对比**：

| 场景 | 应出勤 | 实际请假 | 允许请假 | 修改前应工作天数 | 修改后应工作天数 |
|------|--------|----------|----------|------------------|------------------|
| 合规请假 | 28天 | 2天 | 2天 | 28天 ❌ | 26天 ✅ |
| 超标请假 | 28天 | 3天 | 2天 | 27天 ❌ | 26天 ✅ |

**修改前的问题**：
- 合规请假时，不扣除请假天数，导致目标件数过高
- 超标请假时，只扣除超标部分，导致计算错误

**修改后的改进**：
- 合规请假时，扣除合规请假天数，目标件数合理
- 超标请假时，只扣除合规请假天数，超标部分计入应工作天数

---

## 3. 计算示例

### 示例1：合规请假

**基本信息**：
- 司机：张三
- 入职日期：2025-11-01
- 今天：2025-11-15
- 每日目标：300件
- 仓库允许请假：2天/月

**本月情况**：
- 本月应出勤天数：15天（11月1日 - 11月15日）
- 本月实际请假：2天（11月8日、11月9日）
- 本月实际完成：3900件

**计算过程**：
```
合规请假天数 = min(2, 2) = 2天
应工作天数 = 15 - 2 = 13天
目标件数 = 13 × 300 = 3900件
月达标率 = 3900 / 3900 × 100% = 100%
```

**结果**：✅ 达标

---

### 示例2：超标请假

**基本信息**：
- 司机：李四
- 入职日期：2025-11-01
- 今天：2025-11-15
- 每日目标：300件
- 仓库允许请假：2天/月

**本月情况**：
- 本月应出勤天数：15天（11月1日 - 11月15日）
- 本月实际请假：3天（11月8日、11月9日、11月10日）
- 本月实际完成：3900件

**计算过程**：
```
合规请假天数 = min(3, 2) = 2天
超标请假天数 = 3 - 2 = 1天
应工作天数 = 15 - 2 = 13天（超标的1天不扣除）
目标件数 = 13 × 300 = 3900件
月达标率 = 3900 / 3900 × 100% = 100%
```

**说明**：
- 虽然实际请假3天，但只有2天是合规的
- 超标的1天计入应工作天数，但司机实际没有工作
- 因此，虽然完成了3900件，但由于超标请假，实际上应该完成更多

**实际影响**：
- 如果司机在超标请假的那1天也工作了，应该完成：3900 + 300 = 4200件
- 由于超标请假，少完成了300件
- 但达标率计算时，超标请假的天数不扣除，所以达标率仍然是100%

---

### 示例3：新员工 + 请假

**基本信息**：
- 司机：王五
- 入职日期：2025-11-10
- 今天：2025-11-15
- 每日目标：300件
- 仓库允许请假：2天/月

**本月情况**：
- 本月应出勤天数：6天（11月10日 - 11月15日）
- 本月实际请假：1天（11月12日）
- 本月实际完成：1500件

**计算过程**：
```
合规请假天数 = min(1, 2) = 1天
应工作天数 = 6 - 1 = 5天
目标件数 = 5 × 300 = 1500件
月达标率 = 1500 / 1500 × 100% = 100%
```

**结果**：✅ 达标

---

### 示例4：本周达标率计算

**基本信息**：
- 司机：赵六
- 入职日期：2025-10-01
- 本周：2025-11-11（周一）- 2025-11-15（周五）
- 今天：2025-11-15
- 每日目标：300件
- 仓库允许请假：2天/月

**本周情况**：
- 本周应出勤天数：5天（11月11日 - 11月15日）
- 本周实际请假：1天（11月13日）
- 本周实际完成：1200件

**计算过程**：
```
本周允许请假天数 = floor(2 × 5 / 30) = floor(0.33) = 0天
合规请假天数 = min(1, 0) = 0天
超标请假天数 = 1 - 0 = 1天
应工作天数 = 5 - 0 = 5天（超标的1天不扣除）
目标件数 = 5 × 300 = 1500件
周达标率 = 1200 / 1500 × 100% = 80%
```

**结果**：⚠️ 未达标（80% < 100%）

**说明**：
- 本周只工作了5天，按比例计算，本周不允许请假
- 实际请假1天，属于超标请假
- 超标请假的天数不扣除，所以应工作天数仍然是5天
- 由于请假1天，实际只完成了1200件，达标率80%

---

## 4. 修改文件清单

### 4.1 数据库API修改
- **文件**：`src/db/api.ts`
- **函数**：`getDriverAttendanceStats`
- **修改内容**：
  - 优化请假记录查询条件，确保覆盖所有相关请假
  - 改进请假天数计算逻辑，正确处理跨期请假

### 4.2 普通管理端修改
- **文件**：`src/pages/manager/piece-work-report/index.tsx`
- **修改内容**：
  - 添加本周请假天数统计
  - 修改周达标率计算逻辑，考虑请假天数
  - 修改月达标率计算逻辑，正确处理合规请假和超标请假

### 4.3 超级管理端修改
- **文件**：`src/pages/super-admin/piece-work-report/index.tsx`
- **修改内容**：
  - 添加本周请假天数统计
  - 修改周达标率计算逻辑，考虑请假天数
  - 修改月达标率计算逻辑，正确处理合规请假和超标请假

---

## 5. 测试建议

### 测试场景1：合规请假
1. 创建一个司机，设置入职日期为本月1号
2. 添加2天请假记录（在允许范围内）
3. 添加计件记录，确保完成目标件数
4. 查看司机汇总页面
5. 验证：
   - 月达标率应该是100% ✅
   - 应工作天数 = 本月天数 - 2 ✅

### 测试场景2：超标请假
1. 创建一个司机，设置入职日期为本月1号
2. 添加3天请假记录（超过允许的2天）
3. 添加计件记录，确保完成目标件数
4. 查看司机汇总页面
5. 验证：
   - 月达标率应该是100% ✅
   - 应工作天数 = 本月天数 - 2（只扣除合规的2天）✅

### 测试场景3：跨期请假
1. 创建一个司机
2. 添加一个跨月的请假记录（例如：11月28日 - 12月3日）
3. 查看11月和12月的司机汇总
4. 验证：
   - 11月请假天数：3天（11月28日、29日、30日）✅
   - 12月请假天数：3天（12月1日、2日、3日）✅

### 测试场景4：新员工 + 请假
1. 创建一个司机，设置入职日期为本月10号
2. 添加1天请假记录
3. 添加计件记录
4. 查看司机汇总页面
5. 验证：
   - 应出勤天数从入职日期开始计算 ✅
   - 请假天数正确统计 ✅
   - 达标率计算正确 ✅

### 测试场景5：本周达标率
1. 创建一个司机
2. 添加本周的请假记录
3. 添加本周的计件记录
4. 查看司机汇总页面
5. 验证：
   - 本周请假天数正确统计 ✅
   - 本周允许请假天数按比例计算 ✅
   - 周达标率计算正确 ✅

---

## 6. 注意事项

### 6.1 允许请假天数的配置
- 允许请假天数在仓库配置中设置（`max_leave_days`）
- 默认值为0，表示不允许请假
- 管理员可以在仓库管理页面修改此配置

### 6.2 请假记录的状态
- 只有状态为 `approved`（已批准）的请假记录才会计入统计
- 状态为 `pending`（待审批）或 `rejected`（已拒绝）的请假记录不计入统计

### 6.3 跨期请假的处理
- 系统能够正确处理跨期请假（例如：从上月28号到本月3号）
- 每个月只统计在该月范围内的请假天数
- 例如：请假从11月28日到12月3日
  - 11月统计：3天（11月28日、29日、30日）
  - 12月统计：3天（12月1日、2日、3日）

### 6.4 新员工的特殊处理
- 新员工的应出勤天数从入职日期开始计算
- 例如：入职日期为11月10日，今天是11月15日
  - 应出勤天数：6天（11月10日 - 11月15日）
  - 不是从11月1日开始计算

### 6.5 本周允许请假天数的计算
- 本周允许请假天数按比例计算：`floor(月允许请假天数 × 本周天数 / 30)`
- 例如：月允许请假2天，本周工作5天
  - 本周允许请假 = floor(2 × 5 / 30) = floor(0.33) = 0天
- 这样可以避免司机在一周内用完整月的请假额度

---

## 7. 总结

本次优化完成了以下核心功能：

✅ **读取仓库配置的允许请假天数**
- 从仓库配置中读取 `max_leave_days`
- 支持不同仓库设置不同的允许请假天数

✅ **优化达标率计算逻辑**
- 周达标率：考虑本周请假天数，按比例计算允许请假天数
- 月达标率：考虑本月请假天数，正确处理合规请假和超标请假

✅ **超标请假处理**
- 区分合规请假和超标请假
- 只扣除合规请假天数，超标请假天数计入应工作天数

✅ **请假天数统计优化**
- 优化查询条件，确保覆盖所有相关请假
- 正确处理跨期请假，只统计在查询范围内的天数

**核心改进**：
- 提升了达标率计算的准确性
- 正确处理了合规请假和超标请假的区别
- 优化了请假天数的统计逻辑

**影响范围**：
- 数据库API：`src/db/api.ts`
- 普通管理端：`src/pages/manager/piece-work-report/index.tsx`
- 超级管理端：`src/pages/super-admin/piece-work-report/index.tsx`

---

**修复完成时间**: 2025-11-15  
**修复状态**: ✅ 完成  
**影响范围**: 数据库API + 普通管理端 + 超级管理端  
**修改文件**: 3 个  
**核心改进**: 请假天数统计 + 达标率计算逻辑 + 超标请假处理  
**重要性**: ⭐⭐⭐⭐⭐ 核心功能优化，确保达标率计算准确性
