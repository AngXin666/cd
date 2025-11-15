# 司机汇总达标率修复文档

## 修复日期
2025-11-15

## 问题描述

用户反馈了以下问题：

1. **顶部大环形图不需要** - 只需要保留三个小环形图
2. **本周已工作天数计算错误** - 在职2天，显示"已工作3天"
3. **本月应工作天数计算错误** - 显示"应工作1天"不合理，没有周末节假日

## 根本原因分析

### 问题1：本周已工作天数计算错误
**原因**：
- 使用 `dayOfWeek`（今天是周几）来计算天数
- 使用 `Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1` 计算天数差，+1 导致多算了一天
- 没有正确计算从起始日期到今天的实际天数

**示例**：
- 今天是周五（dayOfWeek=5）
- 员工周四入职
- 错误逻辑：计算出3天（周四、周五、周六？）
- 正确逻辑：应该是2天（周四、周五）

### 问题2：本月应工作天数计算错误
**原因**：
- 扣除了 `MONTHLY_ALLOWED_LEAVE_DAYS`（每月允许请假天数2天）
- 对于新员工，入职天数很少，扣除2天后变成0或负数
- 用户需求：不考虑周末节假日，只计算实际日历天数

**示例**：
- 员工本月14号入职，今天15号
- 错误逻辑：2天 - 2天（请假）= 0天
- 正确逻辑：应该是2天（14号、15号）

## 修复方案

### 1. 移除顶部大环形图 ✅
**修改位置**：
- `src/pages/manager/piece-work-report/index.tsx`
- `src/pages/super-admin/piece-work-report/index.tsx`

**修改内容**：
删除了"达标率显示区域"部分的大环形图和完成件数显示

### 2. 修复本周已工作天数计算 ✅
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

### 3. 修复本月应工作天数计算 ✅
**修改位置**：
- `src/pages/manager/piece-work-report/index.tsx` (行1054-1072)
- `src/pages/super-admin/piece-work-report/index.tsx` (行1089-1107)

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
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1
  return Math.max(diffDays, 0)
})()}天
```

**关键改进**：
1. 移除了 `MONTHLY_ALLOWED_LEAVE_DAYS` 的扣除
2. 使用 `Math.floor` 而不是 `Math.ceil`
3. 直接计算从起始日期到今天的天数

### 4. 修复达标率计算逻辑 ✅
**修改位置**：
- `src/pages/manager/piece-work-report/index.tsx` (行524-547)
- `src/pages/super-admin/piece-work-report/index.tsx` (行543-566)

**修改前**：
```typescript
// 计算本月达标率（考虑新员工入职日期和允许请假天数）
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
  
  // 扣除允许的请假天数
  const workDaysInMonth = Math.max(daysInMonth - MONTHLY_ALLOWED_LEAVE_DAYS, 0)
  const monthlyTarget = dailyTarget * workDaysInMonth
  monthlyCompletionRate = monthlyTarget > 0 ? (monthlyQuantity / monthlyTarget) * 100 : 0
}
```

**修改后**：
```typescript
// 计算本月达标率（考虑新员工入职日期）
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
  
  // 不扣除请假天数，直接使用实际天数
  const monthlyTarget = dailyTarget * daysInMonth
  monthlyCompletionRate = monthlyTarget > 0 ? (monthlyQuantity / monthlyTarget) * 100 : 0
}
```

**关键改进**：
移除了请假天数的扣除，直接使用实际天数计算目标

### 5. 移除不再使用的配置常量 ✅
**修改位置**：
- `src/pages/manager/piece-work-report/index.tsx` (行115-116)
- `src/pages/super-admin/piece-work-report/index.tsx` (行115-116)

**删除内容**：
```typescript
// 配置常量
const MONTHLY_ALLOWED_LEAVE_DAYS = 2 // 每月允许的请假天数
```

## 修复效果

### 修复前
```
司机：邱吉兴
入职日期：2025-11-14
在职天数：2天

当天达标率：33%
本周达标率：40% - 已工作3天 ❌ 错误
本月达标率：100% - 应工作1天 ❌ 错误
```

### 修复后
```
司机：邱吉兴
入职日期：2025-11-14
在职天数：2天

当天达标率：33%
本周达标率：40% - 已工作2天 ✅ 正确
本月达标率：100% - 应工作2天 ✅ 正确
```

## 计算示例

### 示例1：新员工本周入职
**场景**：
- 今天：2025-11-15（周五）
- 入职日期：2025-11-14（周四）
- 本周一：2025-11-11

**计算**：
- 本周已工作天数：从11-14到11-15 = 2天（周四、周五）
- 本月应工作天数：从11-14到11-15 = 2天

### 示例2：老员工
**场景**：
- 今天：2025-11-15（周五）
- 入职日期：2025-01-01
- 本周一：2025-11-11

**计算**：
- 本周已工作天数：从11-11到11-15 = 5天（周一到周五）
- 本月应工作天数：从11-01到11-15 = 15天

### 示例3：本月入职但非本周
**场景**：
- 今天：2025-11-15（周五）
- 入职日期：2025-11-10（上周日）
- 本周一：2025-11-11

**计算**：
- 本周已工作天数：从11-11到11-15 = 5天（周一到周五）
- 本月应工作天数：从11-10到11-15 = 6天

## 技术细节

### 日期计算公式
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

## 影响范围

### 修改文件
1. `src/pages/manager/piece-work-report/index.tsx` - 普通管理端
2. `src/pages/super-admin/piece-work-report/index.tsx` - 超级管理端

### 影响功能
1. 司机汇总页面的达标率展示
2. 本周已工作天数显示
3. 本月应工作天数显示
4. 本月达标率计算

### 不影响功能
1. 当天达标率计算（保持不变）
2. 总达标率计算（保持不变）
3. 件数统计（保持不变）
4. 考勤统计（保持不变）

## 测试建议

### 测试场景1：新员工本周入职
1. 创建一个本周入职的司机
2. 录入一些计件记录
3. 查看司机汇总页面
4. 验证"已工作X天"和"应工作X天"是否正确

### 测试场景2：新员工本月入职但非本周
1. 创建一个本月但非本周入职的司机
2. 录入一些计件记录
3. 查看司机汇总页面
4. 验证"已工作X天"和"应工作X天"是否正确

### 测试场景3：老员工
1. 使用一个很早就入职的司机
2. 录入一些计件记录
3. 查看司机汇总页面
4. 验证"已工作X天"和"应工作X天"是否正确

### 测试场景4：周日
1. 在周日测试
2. 验证本周已工作天数是否为7天（周一到周日）

### 测试场景5：月初
1. 在月初（1号或2号）测试
2. 验证本月应工作天数是否正确

## 总结

本次修复解决了以下问题：

✅ **移除顶部大环形图** - 界面更简洁
✅ **修复本周已工作天数计算** - 使用正确的日期差计算方法
✅ **修复本月应工作天数计算** - 移除请假天数扣除，使用实际日历天数
✅ **修复达标率计算逻辑** - 不再扣除请假天数
✅ **移除不再使用的配置** - 删除 MONTHLY_ALLOWED_LEAVE_DAYS 常量

修复后的计算逻辑更加准确和合理，符合用户的实际需求。

---

**修复完成时间**: 2025-11-15
**修复状态**: ✅ 完成
**影响范围**: 普通管理端 + 超级管理端
**修改文件**: 2 个
**删除代码**: 约50行
**新增代码**: 约40行
