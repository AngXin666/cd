# 司机汇总达标率修复文档（最终完整版）

## 修复日期
2025-11-15

## 问题描述

用户反馈了以下问题：

1. **顶部大环形图不需要** - 只需要保留三个小环形图
2. **本周已工作天数计算错误** - 在职2天，显示"已工作3天"
3. **本月应工作天数计算错误** - 显示"应工作1天"不合理，没有周末节假日
4. **本月达标率计算逻辑需要优化** - 应该根据仓库设置的允许请假天数来判断是否扣除
5. **当日录入数据后，当日数据没有更新** - 需要添加刷新功能
6. **本周达标率计算错误** - 司机入职2天，完成655件，目标300件/天，显示73%而不是109%
7. **本月达标率计算错误** - 同样的问题，计算逻辑有误

## 根本原因分析

### 问题1：本周已工作天数计算错误（UI显示）
**原因**：
- 使用 `dayOfWeek`（今天是周几）来计算天数
- 使用 `Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1` 计算天数差，+1 导致多算了一天
- 没有正确计算从起始日期到今天的实际天数

**示例**：
- 今天是周五（dayOfWeek=5）
- 员工周四入职
- 错误逻辑：计算出3天（周四、周五、周六？）
- 正确逻辑：应该是2天（周四、周五）

### 问题2：本月应工作天数计算错误（UI显示）
**原因**：
- 最初扣除了固定的 `MONTHLY_ALLOWED_LEAVE_DAYS`（每月允许请假天数2天）
- 对于新员工，入职天数很少，扣除2天后变成0或负数
- 用户需求：不考虑周末节假日，只计算实际日历天数

**示例**：
- 员工本月14号入职，今天15号
- 错误逻辑：2天 - 2天（请假）= 0天
- 正确逻辑：应该是2天（14号、15号）

### 问题3：本周达标率计算错误（后端计算）
**原因**：
- 后端计算达标率时，也使用了 `Math.ceil` 和 `+1`，导致多算了一天
- 例如：司机入职2天，但计算时用了3天
- 导致目标变大，达标率变小

**示例**：
- 司机入职2天，每天目标300件
- 实际完成655件
- 错误逻辑：655 / (300 × 3) = 655 / 900 = 72.7% ≈ 73%
- 正确逻辑：655 / (300 × 2) = 655 / 600 = 109%

### 问题4：本月达标率计算错误（后端计算）
**原因**：
- 与本周达标率相同的问题
- 使用了 `Math.ceil` 和 `+1`，导致多算了一天

### 问题5：本月达标率计算逻辑需要优化
**用户需求**：
- 本月达标率的计算应该根据仓库设置的允许请假天数来判断
- 如果司机的请假天数在允许范围内（≤ 仓库设置的允许请假天数），则不扣除请假天数
- 如果司机的请假天数超过允许范围，则需要扣除超出的部分

**示例**：
- 仓库设置：允许请假2天
- 司机A：本月请假1天 → 不扣除，应工作天数 = 实际天数
- 司机B：本月请假3天 → 扣除超出的1天，应工作天数 = 实际天数 - 1

## 修复方案

### 1. 移除顶部大环形图 ✅
**修改位置**：
- `src/pages/manager/piece-work-report/index.tsx`
- `src/pages/super-admin/piece-work-report/index.tsx`

**修改内容**：
删除了"达标率显示区域"部分的大环形图和完成件数显示

### 2. 修复本周已工作天数计算（UI显示）✅
**修改位置**：
- `src/pages/manager/piece-work-report/index.tsx` (行1025-1042)
- `src/pages/super-admin/piece-work-report/index.tsx` (行1060-1077)

**修改前**：
```typescript
已工作{(() => {
  const today = new Date()
  const dayOfWeek = today.getDay()
  let days = dayOfWeek === 0 ? 7 : dayOfWeek
  // 考虑新员工入职日期
  if (summary.joinDate) {
    const joinDate = new Date(summary.joinDate)
    const weekStart = new Date(getMondayDateString())
    if (joinDate > weekStart) {
      const diffTime = Math.abs(today.getTime() - joinDate.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
      days = Math.min(diffDays, days)
    }
  }
  return days
})()}天
```

**修改后**：
```typescript
已工作{(() => {
  const today = new Date()
  const weekStart = new Date(getMondayDateString())
  
  // 计算实际工作的起始日期（本周一或入职日，取较晚的）
  let startDate = weekStart
  if (summary.joinDate) {
    const joinDate = new Date(summary.joinDate)
    if (joinDate > weekStart) {
      startDate = joinDate
    }
  }
  
  // 计算从起始日期到今天的天数（包含起始日和今天）
  const diffTime = today.getTime() - startDate.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1
  return Math.max(diffDays, 0)
})()}天
```

**关键改进**：
1. 使用 `Math.floor` 而不是 `Math.ceil`，避免多算一天
2. 直接计算从起始日期到今天的天数，而不是使用 `dayOfWeek`
3. 明确包含起始日和今天（+1）

### 3. 修复本月应工作天数计算（UI显示 + 智能扣除请假天数）✅
**修改位置**：
- `src/pages/manager/piece-work-report/index.tsx` (行1062-1093)
- `src/pages/super-admin/piece-work-report/index.tsx` (行1097-1128)

**修改前**：
```typescript
应工作{(() => {
  const today = new Date()
  let days = today.getDate()
  // 考虑新员工入职日期
  if (summary.joinDate) {
    const joinDate = new Date(summary.joinDate)
    const monthStart = new Date(getFirstDayOfMonthString())
    if (joinDate > monthStart) {
      const diffTime = Math.abs(today.getTime() - joinDate.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
      days = Math.min(diffDays, days)
    }
  }
  return Math.max(days - MONTHLY_ALLOWED_LEAVE_DAYS, 0)
})()}天
```

**修改后**：
```typescript
应工作{(() => {
  const today = new Date()
  const monthStart = new Date(getFirstDayOfMonthString())
  
  // 计算实际工作的起始日期（本月1号或入职日，取较晚的）
  let startDate = monthStart
  if (summary.joinDate) {
    const joinDate = new Date(summary.joinDate)
    if (joinDate > monthStart) {
      startDate = joinDate
    }
  }
  
  // 计算从起始日期到今天的天数（包含起始日和今天）
  const diffTime = today.getTime() - startDate.getTime()
  let daysInMonth = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1
  
  // 获取当前仓库的允许请假天数
  const currentWarehouse = warehouses[currentWarehouseIndex]
  const maxLeaveDays = currentWarehouse?.max_leave_days || 0
  
  // 获取实际请假天数
  const actualLeaveDays = summary.leaveDays || 0
  
  // 如果实际请假天数超过允许范围，则扣除超出的部分
  if (actualLeaveDays > maxLeaveDays) {
    const excessLeaveDays = actualLeaveDays - maxLeaveDays
    daysInMonth = Math.max(daysInMonth - excessLeaveDays, 0)
  }
  
  return Math.max(daysInMonth, 0)
})()}天
```

**关键改进**：
1. 使用 `Math.floor` 而不是 `Math.ceil`
2. 直接计算从起始日期到今天的天数
3. **智能扣除请假天数**：
   - 从仓库设置中获取 `max_leave_days`（允许请假天数）
   - 获取司机本月实际请假天数
   - 只有当实际请假天数超过允许范围时，才扣除超出的部分

### 4. 修复本周达标率计算（后端计算）✅
**修改位置**：
- `src/pages/manager/piece-work-report/index.tsx` (行496-518)
- `src/pages/super-admin/piece-work-report/index.tsx` (行515-537)

**修改前**：
```typescript
// 计算本周达标率（考虑新员工入职日期）
let weeklyCompletionRate = 0
if (dailyTarget > 0) {
  const today = new Date()
  const dayOfWeek = today.getDay()
  let daysInWeek = dayOfWeek === 0 ? 7 : dayOfWeek

  if (summary.joinDate) {
    const joinDate = new Date(summary.joinDate)
    const weekStart = getWeekRange().start
    const weekStartDate = new Date(weekStart)

    if (joinDate > weekStartDate) {
      const diffTime = Math.abs(today.getTime() - joinDate.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
      daysInWeek = Math.min(diffDays, daysInWeek)
    }
  }

  const weeklyTarget = dailyTarget * daysInWeek
  weeklyCompletionRate = (weeklyQuantity / weeklyTarget) * 100
}
```

**修改后**：
```typescript
// 计算本周达标率（考虑新员工入职日期）
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

  const weeklyTarget = dailyTarget * daysInWeek
  weeklyCompletionRate = weeklyTarget > 0 ? (weeklyQuantity / weeklyTarget) * 100 : 0
}
```

**关键改进**：
1. 使用 `Math.floor` 而不是 `Math.ceil`
2. 直接计算从起始日期到今天的天数
3. 添加了除零保护

### 5. 修复本月达标率计算（后端计算 + 智能扣除请假天数）✅
**修改位置**：
- `src/pages/manager/piece-work-report/index.tsx` (行520-556)
- `src/pages/super-admin/piece-work-report/index.tsx` (行539-575)

**修改前**：
```typescript
// 计算本月达标率（考虑新员工入职日期和请假天数）
let monthlyCompletionRate = 0
if (dailyTarget > 0) {
  const today = new Date()
  let daysInMonth = today.getDate()
  
  if (summary.joinDate) {
    const joinDate = new Date(summary.joinDate)
    const monthStart = getMonthRange().start
    const monthStartDate = new Date(monthStart)
    
    if (joinDate > monthStartDate) {
      const diffTime = Math.abs(today.getTime() - joinDate.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
      daysInMonth = Math.min(diffDays, daysInMonth)
    }
  }
  
  // 获取当前仓库的允许请假天数
  const currentWarehouse = warehouses[currentWarehouseIndex]
  const maxLeaveDays = currentWarehouse?.max_leave_days || 0
  
  // 计算本月实际请假天数（从考勤统计中获取）
  const actualLeaveDays = attendanceStats.leaveDays || 0
  
  // 如果实际请假天数超过允许范围，则扣除超出的部分
  let workDaysInMonth = daysInMonth
  if (actualLeaveDays > maxLeaveDays) {
    const excessLeaveDays = actualLeaveDays - maxLeaveDays
    workDaysInMonth = Math.max(daysInMonth - excessLeaveDays, 0)
  }
  
  const monthlyTarget = dailyTarget * workDaysInMonth
  monthlyCompletionRate = monthlyTarget > 0 ? (monthlyQuantity / monthlyTarget) * 100 : 0
}
```

**修改后**：
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
  let daysInMonth = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1

  // 获取当前仓库的允许请假天数
  const currentWarehouse = warehouses[currentWarehouseIndex]
  const maxLeaveDays = currentWarehouse?.max_leave_days || 0

  // 计算本月实际请假天数（从考勤统计中获取）
  const actualLeaveDays = attendanceStats.leaveDays || 0

  // 如果实际请假天数超过允许范围，则扣除超出的部分
  let workDaysInMonth = daysInMonth
  if (actualLeaveDays > maxLeaveDays) {
    const excessLeaveDays = actualLeaveDays - maxLeaveDays
    workDaysInMonth = Math.max(daysInMonth - excessLeaveDays, 0)
  }

  const monthlyTarget = dailyTarget * workDaysInMonth
  monthlyCompletionRate = monthlyTarget > 0 ? (monthlyQuantity / monthlyTarget) * 100 : 0
}
```

**关键改进**：
1. 使用 `Math.floor` 而不是 `Math.ceil`
2. 直接计算从起始日期到今天的天数
3. **智能扣除逻辑**：只有当实际请假天数超过允许范围时，才扣除超出的部分
4. 确保达标率计算与UI显示的应工作天数保持一致

### 6. 添加刷新按钮 ✅
**修改位置**：
- `src/pages/manager/piece-work-report/index.tsx` (行770-813)
- `src/pages/super-admin/piece-work-report/index.tsx` (行795-838)

**修改内容**：
在仓库切换区域的右上角添加"刷新数据"按钮

```typescript
{/* 刷新按钮 */}
<View
  onClick={async () => {
    Taro.showLoading({title: '刷新中...'})
    await Promise.all([loadData(), loadRecords()])
    Taro.hideLoading()
    Taro.showToast({
      title: '刷新成功',
      icon: 'success',
      duration: 1500
    })
  }}
  className="flex items-center gap-1 bg-blue-900 text-white px-3 py-1.5 rounded-full">
  <View className="i-mdi-refresh text-base" />
  <Text className="text-xs">刷新数据</Text>
</View>
```

## 修复效果

### 场景1：请假天数在允许范围内
```
仓库设置：允许请假2天
司机：邱吉兴
入职日期：2025-11-14
在职天数：2天
本月请假：1天

修复前：
本月达标率：100% - 应工作0天 ❌ 错误（2天 - 2天固定扣除）

修复后：
本月达标率：100% - 应工作2天 ✅ 正确（不扣除请假天数）
```

### 场景2：请假天数超过允许范围
```
仓库设置：允许请假2天
司机：张三
入职日期：2025-11-01
在职天数：15天
本月请假：4天

修复前：
本月达标率：XX% - 应工作13天 ❌ 错误（15天 - 2天固定扣除）

修复后：
本月达标率：XX% - 应工作13天 ✅ 正确（15天 - (4天 - 2天允许) = 13天）
```

### 场景3：新员工本周入职（达标率计算错误）
```
仓库设置：允许请假2天
司机：邱吉兴
入职日期：2025-11-14（周四）
今天：2025-11-15（周五）
本月请假：0天
每天目标：300件
实际完成：655件

修复前：
本周达标率：73% ❌ 错误（655 / (300 × 3) = 73%，多算了1天）
本月达标率：73% ❌ 错误（655 / (300 × 3) = 73%，多算了1天）
已工作3天 ❌ 错误
应工作0天 ❌ 错误

修复后：
本周达标率：109% ✅ 正确（655 / (300 × 2) = 109%）
本月达标率：109% ✅ 正确（655 / (300 × 2) = 109%）
已工作2天 ✅ 正确
应工作2天 ✅ 正确
```

## 计算示例

### 示例1：新员工本周入职（达标率计算）
**场景**：
- 今天：2025-11-15（周五）
- 入职日期：2025-11-14（周四）
- 本周一：2025-11-11
- 每天目标：300件
- 实际完成：655件

**计算**：
- 本周已工作天数：从11-14到11-15 = 2天（周四、周五）
- 本周目标：300 × 2 = 600件
- 本周达标率：655 / 600 = 109% ✅

**修复前的错误计算**：
- 错误天数：3天（使用了 Math.ceil + 1）
- 错误目标：300 × 3 = 900件
- 错误达标率：655 / 900 = 73% ❌

### 示例2：请假天数在允许范围内
**场景**：
- 仓库设置：允许请假2天
- 今天：2025-11-15
- 入职日期：2025-11-01
- 本月请假：1天

**计算**：
- 本月实际天数：15天
- 允许请假天数：2天
- 实际请假天数：1天
- 超出请假天数：0天（1 ≤ 2）
- 本月应工作天数：15天（不扣除）

### 示例3：请假天数超过允许范围
**场景**：
- 仓库设置：允许请假2天
- 今天：2025-11-15
- 入职日期：2025-11-01
- 本月请假：4天

**计算**：
- 本月实际天数：15天
- 允许请假天数：2天
- 实际请假天数：4天
- 超出请假天数：2天（4 - 2）
- 本月应工作天数：13天（15 - 2）

## 技术细节

### 智能扣除请假天数的逻辑
```typescript
// 获取当前仓库的允许请假天数
const currentWarehouse = warehouses[currentWarehouseIndex]
const maxLeaveDays = currentWarehouse?.max_leave_days || 0

// 计算本月实际请假天数（从考勤统计中获取）
const actualLeaveDays = attendanceStats.leaveDays || 0

// 如果实际请假天数超过允许范围，则扣除超出的部分
let workDaysInMonth = daysInMonth
if (actualLeaveDays > maxLeaveDays) {
  const excessLeaveDays = actualLeaveDays - maxLeaveDays
  workDaysInMonth = Math.max(daysInMonth - excessLeaveDays, 0)
}
```

**说明**：
1. 从仓库表的 `max_leave_days` 字段获取允许请假天数
2. 从考勤统计的 `leaveDays` 字段获取实际请假天数
3. 只有当 `actualLeaveDays > maxLeaveDays` 时才扣除超出的部分
4. 扣除的天数 = `actualLeaveDays - maxLeaveDays`

### 日期计算公式（修复后）
```typescript
// 计算从 startDate 到 today 的天数（包含起始日和今天）
const diffTime = today.getTime() - startDate.getTime()
const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1
```

**说明**：
- `diffTime`：两个日期之间的毫秒数差
- `Math.floor(diffTime / (1000 * 60 * 60 * 24))`：向下取整得到完整天数
- `+ 1`：包含起始日（例如：从周四到周五，差1天，但实际是2天）

### 为什么使用 Math.floor 而不是 Math.ceil
- `Math.floor`：向下取整，只计算完整的天数
- `Math.ceil`：向上取整，会多算一天
- 例如：从周四 00:00 到周五 12:00
  - 实际差：1.5天
  - `Math.floor(1.5) + 1 = 2天` ✅ 正确（周四、周五）
  - `Math.ceil(1.5) + 1 = 3天` ❌ 错误（多算了一天）

### 为什么之前的计算会多算一天
```typescript
// 错误的计算方式
const diffTime = Math.abs(today.getTime() - joinDate.getTime())
const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1

// 示例：从周四到周五
// diffTime = 1天（24小时）
// Math.ceil(1) = 1
// diffDays = 1 + 1 = 2 ✅ 这种情况正确

// 但是：从周四 12:00 到周五 12:00
// diffTime = 1天（24小时）
// Math.ceil(1) = 1
// diffDays = 1 + 1 = 2 ✅ 正确

// 问题：从周四 00:00 到周五 23:59
// diffTime = 1.999天
// Math.ceil(1.999) = 2
// diffDays = 2 + 1 = 3 ❌ 错误！多算了一天

// 正确的计算方式
const diffTime = today.getTime() - startDate.getTime()
const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1

// 从周四 00:00 到周五 23:59
// diffTime = 1.999天
// Math.floor(1.999) = 1
// diffDays = 1 + 1 = 2 ✅ 正确！
```

## 影响范围

### 修改文件
1. `src/pages/manager/piece-work-report/index.tsx` - 普通管理端
2. `src/pages/super-admin/piece-work-report/index.tsx` - 超级管理端

### 影响功能
1. 司机汇总页面的达标率展示
2. 本周已工作天数显示（UI）
3. 本月应工作天数显示（UI + 智能扣除请假天数）
4. 本周达标率计算（后端计算）
5. 本月达标率计算（后端计算 + 智能扣除请假天数）
6. 数据刷新功能（新增刷新按钮）

### 不影响功能
1. 当天达标率计算（保持不变）
2. 总达标率计算（保持不变）
3. 件数统计（保持不变）
4. 考勤统计（保持不变）

### 新增依赖
- 依赖仓库表的 `max_leave_days` 字段
- 依赖考勤统计的 `leaveDays` 字段

## 测试建议

### 测试场景1：新员工本周入职（达标率计算）
1. 创建一个本周入职的司机（例如：周四入职）
2. 录入一些计件记录（例如：655件）
3. 设置每天目标为300件
4. 查看司机汇总页面
5. 验证：
   - 已工作天数是否正确（应该是2天）
   - 本周达标率是否正确（655 / 600 = 109%）
   - 本月达标率是否正确（655 / 600 = 109%）

### 测试场景2：请假天数在允许范围内
1. 设置仓库允许请假天数为2天
2. 创建一个司机，本月请假1天
3. 录入一些计件记录
4. 查看司机汇总页面
5. 验证"应工作X天"是否等于实际天数（不扣除请假天数）

### 测试场景3：请假天数超过允许范围
1. 设置仓库允许请假天数为2天
2. 创建一个司机，本月请假4天
3. 录入一些计件记录
4. 查看司机汇总页面
5. 验证"应工作X天"是否等于实际天数减去超出的请假天数（实际天数 - 2天）

### 测试场景4：当日录入数据后刷新
1. 司机在司机端录入计件数据
2. 管理员在管理端点击"刷新数据"按钮
3. 验证页面是否显示最新数据

### 测试场景5：不同仓库的允许请假天数
1. 创建两个仓库，分别设置允许请假天数为1天和3天
2. 创建两个司机，分别分配到这两个仓库
3. 让两个司机都请假2天
4. 查看司机汇总页面
5. 验证：
   - 仓库1的司机：应工作天数 = 实际天数 - 1天（超出）
   - 仓库2的司机：应工作天数 = 实际天数（不超出）

## 总结

本次修复解决了以下问题：

✅ **移除顶部大环形图** - 界面更简洁
✅ **修复本周已工作天数计算（UI）** - 使用正确的日期差计算方法
✅ **修复本月应工作天数计算（UI）** - 智能扣除请假天数
✅ **修复本周达标率计算（后端）** - 使用正确的日期差计算方法
✅ **修复本月达标率计算（后端）** - 智能扣除请假天数
✅ **实现智能请假天数扣除** - 根据仓库设置的允许请假天数来判断是否扣除
✅ **添加刷新按钮** - 方便管理员随时刷新数据

**核心改进**：
1. 本周已工作天数：使用实际日历天数计算（UI + 后端）
2. 本月应工作天数：根据仓库设置智能扣除超出的请假天数（UI + 后端）
3. 本周达标率：使用正确的天数计算目标（后端）
4. 本月达标率：与应工作天数保持一致的计算逻辑（后端）
5. 数据刷新：添加明显的刷新按钮

**智能扣除逻辑**：
- 如果实际请假天数 ≤ 允许请假天数：不扣除
- 如果实际请假天数 > 允许请假天数：只扣除超出的部分

**关键修复**：
- 将所有 `Math.ceil` 改为 `Math.floor`，避免多算一天
- 统一使用 `today.getTime() - startDate.getTime()` 计算天数差
- 确保UI显示和后端计算使用相同的逻辑

修复后的计算逻辑更加准确、合理和灵活，符合用户的实际需求。

---

**修复完成时间**: 2025-11-15
**修复状态**: ✅ 完成
**影响范围**: 普通管理端 + 超级管理端
**修改文件**: 2 个
**核心改进**: 修复达标率计算逻辑 + 智能扣除请假天数 + 添加刷新按钮
**新增逻辑**: 根据仓库设置的允许请假天数来判断是否扣除
**关键修复**: 将 Math.ceil 改为 Math.floor，避免多算一天
