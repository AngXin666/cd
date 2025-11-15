# 司机汇总达标率优化快速参考

## 核心变化

### 1. 新增字段

| 字段 | 类型 | 说明 |
|------|------|------|
| dailyCompletionRate | number | 当天达标率 |
| weeklyCompletionRate | number | 本周达标率 |
| monthlyCompletionRate | number | 本月达标率 |
| dailyQuantity | number | 当日件数 |
| weeklyQuantity | number | 本周件数 |
| monthlyQuantity | number | 本月件数 |

### 2. UI 变化

#### 优化前
```
┌─────────────────────────────────┐
│ 完成率状态卡片                   │
│ 完成率: 95.0% - 达标            │
├─────────────────────────────────┤
│ 考勤统计                         │
│ 出勤: 30  迟到: 2  请假: 1      │
└─────────────────────────────────┘
```

#### 优化后
```
┌─────────────────────────────────┐
│ 三个达标率                       │
│ 当天95.0% 本周92.5% 本月88.3%   │
├─────────────────────────────────┤
│ 件数统计                         │
│ 当日95  本周650  本月2650       │
└─────────────────────────────────┘
```

## 达标率计算公式

### 当天达标率
```
当天达标率 = (当日件数 / 每日指标) × 100%
```

### 本周达标率
```
本周天数 = 今天是周几（周日算7天）
本周目标 = 每日指标 × 本周天数
本周达标率 = (本周件数 / 本周目标) × 100%
```

### 本月达标率
```
本月天数 = 今天是几号
本月目标 = 每日指标 × 本月天数
本月达标率 = (本月件数 / 本月目标) × 100%
```

## 计算示例

### 示例 1：周二

**基础数据**
- 今天：2024-11-05（周二）
- 每日指标：100 件

**件数统计**
- 当日件数：95 件
- 本周件数：195 件（周一100 + 周二95）
- 本月件数：500 件（11月1-5日）

**达标率计算**

| 维度 | 天数 | 目标 | 完成 | 达标率 |
|------|------|------|------|--------|
| 当天 | 1 | 100 | 95 | 95.0% |
| 本周 | 2 | 200 | 195 | 97.5% |
| 本月 | 5 | 500 | 500 | 100.0% |

### 示例 2：周日

**基础数据**
- 今天：2024-11-10（周日）
- 每日指标：100 件

**达标率计算**

| 维度 | 天数 | 目标 | 说明 |
|------|------|------|------|
| 当天 | 1 | 100 | 周日当天 |
| 本周 | 7 | 700 | 周一到周日，共7天 |
| 本月 | 10 | 1000 | 本月1号到10号 |

### 示例 3：月初

**基础数据**
- 今天：2024-11-01（月初第一天）
- 每日指标：100 件

**达标率计算**

| 维度 | 天数 | 目标 | 说明 |
|------|------|------|------|
| 当天 | 1 | 100 | 当天 |
| 本周 | 5 | 500 | 假设周五，周一到周五 |
| 本月 | 1 | 100 | 本月第一天 |

## 日期范围

### 当天
- 开始：今天 00:00:00
- 结束：今天 23:59:59

### 本周
- 开始：本周一 00:00:00
- 结束：今天 23:59:59
- 特殊：周日时，本周一是6天前

### 本月
- 开始：本月1号 00:00:00
- 结束：今天 23:59:59

## 颜色编码

| 维度 | 背景色 | 文字颜色 | Tailwind 类 |
|------|--------|---------|------------|
| 当天 | 浅蓝色 | 深蓝色 | bg-blue-50, text-blue-600 |
| 本周 | 浅绿色 | 深绿色 | bg-green-50, text-green-600 |
| 本月 | 浅紫色 | 深紫色 | bg-purple-50, text-purple-600 |

## 边界情况

| 情况 | 处理方式 |
|------|---------|
| 每日指标为 0 | 所有达标率为 0 |
| 没有记录 | 所有件数为 0，所有达标率为 0 |
| 周日 | 本周天数算作 7 天 |
| 月初 | 本月天数从 1 开始 |

## 关键代码

### 获取日期范围
```typescript
// 今天
const getTodayRange = () => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString().split('T')[0]
  return {start: todayStr, end: todayStr}
}

// 本周（周一到今天）
const getWeekRange = () => {
  const today = new Date()
  const dayOfWeek = today.getDay()
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const monday = new Date(today)
  monday.setDate(today.getDate() - diff)
  monday.setHours(0, 0, 0, 0)
  const mondayStr = monday.toISOString().split('T')[0]
  const todayStr = today.toISOString().split('T')[0]
  return {start: mondayStr, end: todayStr}
}

// 本月（本月1号到今天）
const getMonthRange = () => {
  const today = new Date()
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
  firstDay.setHours(0, 0, 0, 0)
  const firstDayStr = firstDay.toISOString().split('T')[0]
  const todayStr = today.toISOString().split('T')[0]
  return {start: firstDayStr, end: todayStr}
}
```

### 计算件数
```typescript
const calculateQuantityInRange = (driverId: string, startDate: string, endDate: string): number => {
  return records
    .filter((record) => {
      if (record.user_id !== driverId) return false
      const recordDate = record.work_date
      return recordDate >= startDate && recordDate <= endDate
    })
    .reduce((sum, record) => sum + (record.quantity || 0), 0)
}
```

### 计算达标率
```typescript
// 当天
let dailyCompletionRate = 0
if (dailyTarget > 0) {
  dailyCompletionRate = (dailyQuantity / dailyTarget) * 100
}

// 本周
let weeklyCompletionRate = 0
if (dailyTarget > 0) {
  const today = new Date()
  const dayOfWeek = today.getDay()
  const daysInWeek = dayOfWeek === 0 ? 7 : dayOfWeek
  const weeklyTarget = dailyTarget * daysInWeek
  weeklyCompletionRate = (weeklyQuantity / weeklyTarget) * 100
}

// 本月
let monthlyCompletionRate = 0
if (dailyTarget > 0) {
  const today = new Date()
  const daysInMonth = today.getDate()
  const monthlyTarget = dailyTarget * daysInMonth
  monthlyCompletionRate = (monthlyQuantity / monthlyTarget) * 100
}
```

### UI 显示
```tsx
{/* 三个达标率卡片 */}
<View className="grid grid-cols-3 gap-2 mb-2">
  {/* 当天达标率 */}
  <View className="text-center bg-blue-50 rounded-lg py-2">
    <Text className="text-xs text-gray-600 mb-1">当天达标率</Text>
    <Text className="text-lg font-bold text-blue-600">
      {(summary.dailyCompletionRate || 0).toFixed(1)}%
    </Text>
  </View>
  {/* 本周达标率 */}
  <View className="text-center bg-green-50 rounded-lg py-2">
    <Text className="text-xs text-gray-600 mb-1">本周达标率</Text>
    <Text className="text-lg font-bold text-green-600">
      {(summary.weeklyCompletionRate || 0).toFixed(1)}%
    </Text>
  </View>
  {/* 本月达标率 */}
  <View className="text-center bg-purple-50 rounded-lg py-2">
    <Text className="text-xs text-gray-600 mb-1">本月达标率</Text>
    <Text className="text-lg font-bold text-purple-600">
      {(summary.monthlyCompletionRate || 0).toFixed(1)}%
    </Text>
  </View>
</View>

{/* 件数统计 */}
<View className="grid grid-cols-3 gap-3">
  <View className="text-center bg-blue-50 rounded-lg py-2">
    <Text className="text-xl font-bold text-blue-600 block">{summary.dailyQuantity}</Text>
    <Text className="text-xs text-gray-600">当日件数</Text>
  </View>
  <View className="text-center bg-green-50 rounded-lg py-2">
    <Text className="text-xl font-bold text-green-600 block">{summary.weeklyQuantity}</Text>
    <Text className="text-xs text-gray-600">本周件数</Text>
  </View>
  <View className="text-center bg-purple-50 rounded-lg py-2">
    <Text className="text-xl font-bold text-purple-600 block">{summary.monthlyQuantity}</Text>
    <Text className="text-xs text-gray-600">本月件数</Text>
  </View>
</View>
```

## 修改位置

- 普通管理端：`src/pages/manager/piece-work-report/index.tsx`
- 超级管理端：`src/pages/super-admin/piece-work-report/index.tsx`

## 优势总结

✅ **多维度**：从单一维度扩展到三个维度
✅ **实时性**：当天达标率反映实时状态
✅ **趋势性**：本周、本月达标率反映趋势
✅ **直观性**：件数统计直观反映工作量
✅ **视觉性**：三色编码清晰区分维度

---

**更新时间**: 2025-11-05
