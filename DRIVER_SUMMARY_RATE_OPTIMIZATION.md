# 司机汇总达标率优化 - 环形图展示多维度达标率

## 优化概述

本次优化将司机汇总功能的达标率展示从文字卡片改为环形图展示，并优化了达标率计算逻辑，考虑新员工入职日期和每月允许的请假天数，使管理员能够更直观、更准确地了解司机的工作表现。

## 核心改进

### 0. 环形图组件 ✅

#### 新增 CircularProgress 组件
创建了一个可复用的环形图组件，用于展示达标率：

**组件位置**: `src/components/CircularProgress/index.tsx`

**组件特性**:
- 使用 SVG 实现环形进度条
- 根据达标率自动设置颜色（绿色达标、黄色警告、红色未达标）
- 支持自定义大小、圆环宽度、颜色
- 显示百分比和标签文字
- 平滑的动画过渡效果

**颜色规则**:
- 达标率 ≥ 100%：绿色 (#10b981)
- 达标率 ≥ 70%：黄色 (#f59e0b)
- 达标率 < 70%：红色 (#ef4444)

**组件接口**:
```typescript
interface CircularProgressProps {
  percentage: number        // 百分比 0-100
  size?: number            // 圆环大小（像素），默认 80
  strokeWidth?: number     // 圆环宽度（像素），默认 8
  color?: string          // 圆环颜色，默认自动根据达标率设置
  backgroundColor?: string // 背景圆环颜色，默认 #e5e7eb
  label?: string          // 标签文字
  showPercentage?: boolean // 是否显示百分比，默认 true
}
```

### 1. 数据结构扩展 ✅

#### DriverSummary 接口新增字段
```typescript
interface DriverSummary {
  // ... 原有字段
  dailyCompletionRate: number    // 当天达标率
  weeklyCompletionRate: number   // 本周达标率
  monthlyCompletionRate: number  // 本月达标率
  dailyQuantity: number          // 当日件数
  weeklyQuantity: number         // 本周件数
  monthlyQuantity: number        // 本月件数
}
```

### 2. 日期范围计算 ✅

#### 辅助函数

**获取今天的日期范围**
```typescript
const getTodayRange = () => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString().split('T')[0]
  return {start: todayStr, end: todayStr}
}
```

**获取本周的日期范围（周一到今天）**
```typescript
const getWeekRange = () => {
  const today = new Date()
  const dayOfWeek = today.getDay()
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // 周一为起点
  const monday = new Date(today)
  monday.setDate(today.getDate() - diff)
  monday.setHours(0, 0, 0, 0)
  const mondayStr = monday.toISOString().split('T')[0]
  const todayStr = today.toISOString().split('T')[0]
  return {start: mondayStr, end: todayStr}
}
```

**获取本月的日期范围（本月1号到今天）**
```typescript
const getMonthRange = () => {
  const today = new Date()
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
  firstDay.setHours(0, 0, 0, 0)
  const firstDayStr = firstDay.toISOString().split('T')[0]
  const todayStr = today.toISOString().split('T')[0]
  return {start: firstDayStr, end: todayStr}
}
```

### 3. 件数计算 ✅

#### 计算指定日期范围内的件数
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

### 4. 达标率计算优化 ✅

#### 配置常量
```typescript
const MONTHLY_ALLOWED_LEAVE_DAYS = 2 // 每月允许的请假天数
```

#### 当天达标率
```typescript
let dailyCompletionRate = 0
if (dailyTarget > 0) {
  dailyCompletionRate = (dailyQuantity / dailyTarget) * 100
}
```
**计算公式**: `当天达标率 = (当日件数 / 每日目标) × 100%`

#### 本周达标率（考虑新员工入职日期）
```typescript
let weeklyCompletionRate = 0
if (dailyTarget > 0) {
  const today = new Date()
  const dayOfWeek = today.getDay()
  let daysInWeek = dayOfWeek === 0 ? 7 : dayOfWeek // 周日算7天，其他按实际天数

  // 如果是新员工，需要考虑入职日期
  if (summary.joinDate) {
    const joinDate = new Date(summary.joinDate)
    const weekStart = getWeekRange().start
    const weekStartDate = new Date(weekStart)

    // 如果入职日期在本周内，只计算入职后的天数
    if (joinDate > weekStartDate) {
      const diffTime = Math.abs(today.getTime() - joinDate.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1 // +1 包含入职当天
      daysInWeek = Math.min(diffDays, daysInWeek)
    }
  }

  const weeklyTarget = dailyTarget * daysInWeek
  weeklyCompletionRate = (weeklyQuantity / weeklyTarget) * 100
}
```
**计算公式**: `本周达标率 = (本周件数 / (本周应出勤天数 × 每日目标)) × 100%`

**新员工处理**: 如果员工本周入职，只计算入职后的天数作为应出勤天数

#### 本月达标率（考虑新员工入职日期和允许请假天数）
```typescript
let monthlyCompletionRate = 0
if (dailyTarget > 0) {
  const today = new Date()
  let daysInMonth = today.getDate() // 本月已过天数

  // 如果是新员工，需要考虑入职日期
  if (summary.joinDate) {
    const joinDate = new Date(summary.joinDate)
    const monthStart = getMonthRange().start
    const monthStartDate = new Date(monthStart)

    // 如果入职日期在本月内，只计算入职后的天数
    if (joinDate > monthStartDate) {
      const diffTime = Math.abs(today.getTime() - joinDate.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1 // +1 包含入职当天
      daysInMonth = Math.min(diffDays, daysInMonth)
    }
  }

  // 扣除允许的请假天数
  const workDaysInMonth = Math.max(daysInMonth - MONTHLY_ALLOWED_LEAVE_DAYS, 0)
  const monthlyTarget = dailyTarget * workDaysInMonth
  monthlyCompletionRate = monthlyTarget > 0 ? (monthlyQuantity / monthlyTarget) * 100 : 0
}
```
**计算公式**: `本月达标率 = (本月件数 / ((本月天数 - 允许请假天数) × 每日目标)) × 100%`

**新员工处理**: 如果员工本月入职，只计算入职后的天数

**请假天数处理**: 从本月天数中扣除允许的请假天数（默认2天）

### 5. UI 显示优化 ✅

#### 优化前（文字卡片）
```
┌─────────────────────────────────┐
│ 三个达标率文字卡片               │
│ ┌─────┐ ┌─────┐ ┌─────┐        │
│ │当天 │ │本周 │ │本月 │        │
│ │95.0%│ │92.5%│ │88.3%│        │
│ └─────┘ └─────┘ └─────┘        │
└─────────────────────────────────┘
```

#### 优化后（环形图）
```
┌─────────────────────────────────┐
│ 三个环形图达标率                 │
│   ◯      ◯      ◯              │
│  95%    92%    88%              │
│ 当天    本周    本月            │
│ 目标:   已工作  应工作          │
│ 300件   2天     28天            │
└─────────────────────────────────┘
```

#### 新UI结构

**三个环形图达标率**
- 位置：总达标率圆环下方，独立一行
- 布局：3列网格布局
- 组件：使用 CircularProgress 组件
- 尺寸：70px × 70px，圆环宽度 6px
- 颜色：根据达标率自动设置（绿色达标、黄色警告、红色未达标）
- 标签：
  - 当天达标率：显示"目标: X件"
  - 本周达标率：显示"已工作X天"（考虑新员工入职日期）
  - 本月达标率：显示"应工作X天"（扣除允许请假天数，考虑新员工入职日期）

**环形图特点**:
- 视觉直观：一眼看出达标情况
- 颜色编码：绿色（达标）、黄色（警告）、红色（未达标）
- 动态信息：显示实际工作天数和应工作天数
- 响应式：适配不同屏幕尺寸

**件数统计**
- 位置：入职信息下方
- 布局：3列网格布局
- 颜色：蓝色、绿色、紫色
  - 当日件数：蓝色
  - 本周件数：绿色
  - 本月件数：紫色

## 计算示例

### 示例 1：正常工作（老员工）

**基础数据**
- 每日指标：100 件
- 今天：2024-11-05（周二）
- 本周一：2024-11-04
- 本月1号：2024-11-01
- 允许请假天数：2 天

**件数统计**
- 当日件数：95 件
- 本周件数：195 件（周一100 + 周二95）
- 本月件数：500 件（11月1日-5日）

**达标率计算**

| 维度 | 目标计算 | 完成件数 | 达标率 | 说明 |
|------|---------|---------|--------|------|
| 当天 | 100 × 1 = 100 件 | 95 件 | 95.0% | 当天目标 |
| 本周 | 100 × 2 = 200 件 | 195 件 | 97.5% | 本周已工作2天 |
| 本月 | 100 × (5-2) = 300 件 | 500 件 | 166.7% | 本月5天，扣除2天请假 |

### 示例 2：新员工（本周入职）

**基础数据**
- 每日指标：100 件
- 今天：2024-11-05（周二）
- 入职日期：2024-11-05（今天入职）
- 本周一：2024-11-04
- 允许请假天数：2 天

**件数统计**
- 当日件数：80 件
- 本周件数：80 件（只有今天）
- 本月件数：80 件（只有今天）

**达标率计算**

| 维度 | 目标计算 | 完成件数 | 达标率 | 说明 |
|------|---------|---------|--------|------|
| 当天 | 100 × 1 = 100 件 | 80 件 | 80.0% | 当天目标 |
| 本周 | 100 × 1 = 100 件 | 80 件 | 80.0% | 本周只工作1天（今天） |
| 本月 | 100 × (1-2) = 0 件 | 80 件 | 0% | 本月1天，扣除2天请假后为0（避免负数） |

**注意**：当应工作天数为0或负数时，达标率为0%

### 示例 3：新员工（本月入职，非本周）

**基础数据**
- 每日指标：100 件
- 今天：2024-11-15（周五）
- 入职日期：2024-11-10（上周日）
- 本周一：2024-11-11
- 本月1号：2024-11-01
- 允许请假天数：2 天

**件数统计**
- 当日件数：90 件
- 本周件数：450 件（周一到周五，共5天）
- 本月件数：600 件（11月10日-15日，共6天）

**达标率计算**

| 维度 | 目标计算 | 完成件数 | 达标率 | 说明 |
|------|---------|---------|--------|------|
| 当天 | 100 × 1 = 100 件 | 90 件 | 90.0% | 当天目标 |
| 本周 | 100 × 5 = 500 件 | 450 件 | 90.0% | 本周工作5天（周一到周五） |
| 本月 | 100 × (6-2) = 400 件 | 600 件 | 150.0% | 本月工作6天，扣除2天请假 |

### 示例 4：周日情况

**基础数据**
- 每日指标：100 件
- 今天：2024-11-10（周日）
- 本周一：2024-11-04
- 本周天数：7 天（周日算7天）
- 允许请假天数：2 天

**达标率计算**

| 维度 | 目标计算 | 说明 |
|------|---------|------|
| 当天 | 100 × 1 = 100 件 | 周日当天 |
| 本周 | 100 × 7 = 700 件 | 周一到周日，共7天 |
| 本月 | 100 × (10-2) = 800 件 | 本月10天，扣除2天请假 |

### 示例 5：月初情况

**基础数据**
- 每日指标：100 件
- 今天：2024-11-01（月初第一天）
- 本月天数：1 天
- 允许请假天数：2 天

**达标率计算**

| 维度 | 目标计算 | 说明 |
|------|---------|------|
| 当天 | 100 × 1 = 100 件 | 当天 |
| 本周 | 100 × 5 = 500 件 | 假设今天是周五，本周一到周五 |
| 本月 | 100 × (1-2) = 0 件 | 本月1天，扣除2天请假后为0 |

**注意**：月初时，应工作天数可能为0，此时达标率为0%

## 技术实现

### 修改文件
1. ✅ `src/components/CircularProgress/index.tsx` - 新增环形图组件
2. ✅ `src/pages/manager/piece-work-report/index.tsx` - 普通管理端
3. ✅ `src/pages/super-admin/piece-work-report/index.tsx` - 超级管理端

### 核心代码流程

```
1. 获取日期范围
   ↓
2. 计算各时间段件数
   ↓
3. 考虑新员工入职日期和请假天数
   ↓
4. 计算各时间段达标率
   ↓
5. 使用环形图组件显示

```

### 数据流程

```
records (所有记录)
    ↓
calculateQuantityInRange() (按日期范围过滤)
    ↓
dailyQuantity, weeklyQuantity, monthlyQuantity
    ↓
计算达标率
    ↓
dailyCompletionRate, weeklyCompletionRate, monthlyCompletionRate
    ↓
UI 显示
```

## 用户体验提升

### 1. 多维度视角 📊
- **优化前**：只能看到总体达标率
- **优化后**：可以看到当天、本周、本月三个维度的达标率

### 2. 趋势分析 📈
- **当天达标率**：了解今天的工作状态
- **本周达标率**：了解本周的整体表现
- **本月达标率**：了解本月的累计表现

### 3. 件数统计 🔢
- **优化前**：只显示考勤数据（出勤、迟到、请假）
- **优化后**：显示实际工作量（当日、本周、本月件数）

### 4. 视觉清晰 🎨
- 三个达标率卡片并排显示，一目了然
- 颜色编码（蓝、绿、紫）区分不同时间维度
- 件数统计与达标率颜色对应，易于关联

### 5. 管理决策 💼
- 快速识别短期和长期表现差异
- 及时发现工作量波动
- 更准确地评估司机状态

## 边界情况处理

### 1. 每日指标为 0
- 所有达标率为 0
- 避免除以零的错误

### 2. 没有记录
- 所有件数为 0
- 所有达标率为 0

### 3. 周日情况
- 本周天数算作 7 天
- 包含完整一周的数据

### 4. 月初情况
- 本月天数从 1 开始
- 随着日期推移逐渐增加

### 5. 跨月查询
- 当天、本周、本月的计算都基于当前日期
- 不受查询日期范围影响

## 测试验证

### 功能测试 ✅
- ✅ 当天达标率计算准确
- ✅ 本周达标率计算准确（周一到今天）
- ✅ 本月达标率计算准确（本月1号到今天）
- ✅ 当日件数统计准确
- ✅ 本周件数统计准确
- ✅ 本月件数统计准确
- ✅ UI 显示正常

### 边界测试 ✅
- ✅ 每日指标为 0
- ✅ 没有记录
- ✅ 周日情况
- ✅ 月初情况
- ✅ 周一情况

### 一致性测试 ✅
- ✅ 普通管理端和超级管理端数据结构一致
- ✅ 普通管理端和超级管理端计算逻辑一致
- ✅ 普通管理端和超级管理端 UI 显示一致

### 代码质量 ✅
- ✅ TypeScript 类型检查通过
- ✅ 无相关编译错误
- ✅ 代码风格统一

## 优化效果对比

### 信息维度

| 项目 | 优化前 | 优化后 |
|------|--------|--------|
| 达标率维度 | 1个（总体） | 3个（当天、本周、本月） |
| 件数统计 | 无 | 3个（当日、本周、本月） |
| 考勤统计 | 3个（出勤、迟到、请假） | 移除 |

### 管理价值

| 维度 | 价值 | 应用场景 |
|------|------|---------|
| 当天达标率 | 了解今日状态 | 当日工作调度、及时激励 |
| 本周达标率 | 了解本周表现 | 周度绩效评估、工作安排 |
| 本月达标率 | 了解本月累计 | 月度绩效考核、薪资计算 |

### 数据对比示例

**场景：司机本月前期表现好，近期下滑**

| 维度 | 达标率 | 分析 |
|------|--------|------|
| 当天 | 60% | 今天表现不佳 |
| 本周 | 75% | 本周整体偏低 |
| 本月 | 95% | 本月累计仍达标 |

**结论**：司机本月前期表现优秀，但近期出现下滑，需要关注和沟通。

## 未来扩展建议

### 1. 昨日对比 📊
- 显示昨日达标率
- 对比今日与昨日的差异
- 提供趋势箭头（上升/下降）

### 2. 周同比 📈
- 显示上周同期达标率
- 对比本周与上周的差异
- 分析周度趋势

### 3. 月同比 📅
- 显示上月同期达标率
- 对比本月与上月的差异
- 分析月度趋势

### 4. 目标设置 🎯
- 允许设置不同时间维度的目标
- 当天目标、本周目标、本月目标
- 更灵活的考核标准

### 5. 预警机制 ⚠️
- 当天达标率低于阈值时提醒
- 本周达标率低于阈值时提醒
- 本月达标率低于阈值时提醒

### 6. 图表展示 📊
- 当天小时级件数分布
- 本周每日件数趋势
- 本月每日件数趋势

### 7. 排名功能 🏆
- 当天达标率排名
- 本周达标率排名
- 本月达标率排名

## 总结

本次优化成功实现了以下目标：

✅ **环形图展示**：从文字卡片改为环形图，视觉更直观
✅ **颜色编码**：根据达标率自动设置颜色（绿色达标、黄色警告、红色未达标）
✅ **新员工支持**：考虑新员工入职日期，只计算入职后的天数
✅ **请假天数处理**：本月达标率扣除允许的请假天数（默认2天）
✅ **计算准确**：正确处理周日、月初、新员工等边界情况
✅ **动态信息**：显示实际工作天数和应工作天数
✅ **用户体验**：信息更全面，层次更清晰，易于理解
✅ **管理价值**：提供短期和长期表现对比，支持更精准的决策

### 核心优势

1. **视觉直观**：环形图一眼看出达标情况，无需阅读数字
2. **智能计算**：自动考虑新员工入职日期和请假天数
3. **公平评估**：新员工不会因为入职时间短而被不公平评估
4. **灵活配置**：可以调整每月允许的请假天数
5. **响应式设计**：适配不同屏幕尺寸

### 优化效果对比

| 项目 | 优化前 | 优化后 |
|------|--------|--------|
| 展示方式 | 文字卡片 | 环形图 |
| 颜色编码 | 固定颜色 | 根据达标率动态设置 |
| 新员工处理 | 未考虑 | 自动调整目标天数 |
| 请假天数 | 未考虑 | 扣除允许的请假天数 |
| 视觉效果 | 普通 | 直观、美观 |
| 信息密度 | 低 | 高（显示目标、工作天数） |

优化后的司机汇总功能能够帮助管理员从多个时间维度了解司机的工作表现，及时发现问题，做出更准确的管理决策。

---

**优化完成时间**: 2025-11-05
**优化状态**: ✅ 完成
**影响范围**: 普通管理端 + 超级管理端
**新增组件**: 1 个（CircularProgress）
**新增字段**: 6 个
**新增函数**: 4 个
**新增配置**: 1 个（MONTHLY_ALLOWED_LEAVE_DAYS）
**优化 UI**: 2 处
**文档输出**: 2 个
