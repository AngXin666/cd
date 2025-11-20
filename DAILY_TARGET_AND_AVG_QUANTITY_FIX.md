# 今日达标率和人均件数修复报告

## 问题描述

用户反馈的问题：
1. **今日达标率计算不对**：仓库规则中已经设置了每天每个人的指标，但达标率计算使用了错误的司机数
2. **人均件数不对**：计算逻辑有误，使用了错误的分母

## 问题分析

### 问题 1：今日达标率计算不对

#### 根本原因
达标率计算使用的是**出勤司机数**，而不是**有计件记录的司机数**。

#### 问题说明
- **错误逻辑**：今日达标率 = 今天完成件数 / (每日指标 × **出勤司机数**)
- **正确逻辑**：今日达标率 = 今天完成件数 / (每日指标 × **有计件记录的司机数**)

#### 为什么错误？
1. 出勤司机可能没有计件记录（例如：请假、培训、其他工作）
2. 使用出勤司机数会导致分母过大，达标率偏低
3. 不能准确反映实际工作司机的达标情况

#### 示例
假设：
- 每日指标：300 件/人
- 今天出勤司机：10 人
- 今天有计件记录的司机：8 人
- 今天总件数：2400 件

**错误计算**：
- 今天总目标 = 300 × 10 = 3000 件
- 达标率 = 2400 / 3000 = 80%

**正确计算**：
- 今天总目标 = 300 × 8 = 2400 件
- 达标率 = 2400 / 2400 = 100%

#### 相关代码
```typescript
// 错误的计算方式 (修复前)
const todayDriversCount = dashboardData.todayDrivers  // 使用出勤司机数
const todayTotalTarget = dailyTarget * todayDriversCount
const rate = (todayQuantity / todayTotalTarget) * 100
```

### 问题 2：人均件数不对

#### 根本原因
人均件数使用的是**出勤司机数**作为分母，而不是**有计件记录的司机数**。

#### 问题说明
- **错误逻辑**：人均件数 = 今天总件数 / 今天出勤司机数
- **正确逻辑**：人均件数 = 今天总件数 / 今天有计件记录的司机数

#### 为什么错误？
1. 出勤司机可能没有计件记录（例如：请假、培训、其他工作）
2. 使用出勤司机数会导致人均件数偏低
3. 不能准确反映实际工作的司机的平均效率

#### 示例
假设：
- 今天出勤司机：10 人
- 今天有计件记录的司机：8 人
- 今天总件数：800 件

**错误计算**：800 / 10 = 80 件/人
**正确计算**：800 / 8 = 100 件/人

#### 相关代码
```typescript
// 错误的计算方式 (修复前)
<Text className="text-white text-2xl font-bold mb-1.5">
  {dashboardData.todayDrivers > 0 ? Math.round(todayQuantity / dashboardData.todayDrivers) : 0}
</Text>
<Text className="text-white text-opacity-80 text-xs leading-tight">人均今天完成</Text>
```

## 修复方案

### 修复 1：修正今日达标率计算逻辑

#### 步骤 1：添加计算今天有计件记录的司机数
在管理员端和超级管理员端都添加：

```typescript
// 计算今天有计件记录的司机数
const todayDriversWithRecords = useMemo(() => {
  const today = getLocalDateString()
  const driverIds = new Set(records.filter((r) => r.work_date === today).map((r) => r.user_id))
  return driverIds.size
}, [records])
```

**逻辑说明**：
1. 筛选今天的计件记录
2. 提取所有司机 ID
3. 使用 Set 去重（一个司机可能有多条记录）
4. 返回去重后的司机数量

#### 步骤 2：修改达标率计算逻辑
**修改前**：
```typescript
// 使用出勤司机数
const todayDriversCount = dashboardData.todayDrivers
const todayTotalTarget = dailyTarget * todayDriversCount
const rate = (todayQuantity / todayTotalTarget) * 100
```

**修改后**：
```typescript
// 使用有计件记录的司机数
const todayDriversCount = todayDriversWithRecords
const todayTotalTarget = dailyTarget * todayDriversCount
const rate = (todayQuantity / todayTotalTarget) * 100
```

**改进点**：
1. 使用 `todayDriversWithRecords` 代替 `dashboardData.todayDrivers`
2. 只统计有计件记录的司机
3. 达标率更准确反映实际工作情况

#### 步骤 3：修改显示逻辑
**修改前**：
```typescript
<Text className="text-white text-opacity-80 text-xs leading-tight">
  完成 {todayQuantity} / {(dailyTarget * dashboardData.todayDrivers).toFixed(0)} 件
</Text>
```

**修改后**：
```typescript
<Text className="text-white text-opacity-80 text-xs leading-tight">
  完成 {todayQuantity} / {(dailyTarget * todayDriversWithRecords).toFixed(0)} 件
</Text>
```

**改进点**：
1. 显示的总目标基于有计件记录的司机数
2. 与达标率计算逻辑保持一致
3. 数据更准确

### 修复 2：修正人均件数计算逻辑

#### 步骤 1：添加计算今天有计件记录的司机数
在管理员端和超级管理员端都添加：

```typescript
// 计算今天有计件记录的司机数
const todayDriversWithRecords = useMemo(() => {
  const today = getLocalDateString()
  const driverIds = new Set(records.filter((r) => r.work_date === today).map((r) => r.user_id))
  return driverIds.size
}, [records])
```

**逻辑说明**：
1. 筛选今天的计件记录
2. 提取所有司机 ID
3. 使用 Set 去重（一个司机可能有多条记录）
4. 返回去重后的司机数量

#### 步骤 2：修改人均件数显示
**修改前**：
```typescript
<Text className="text-white text-2xl font-bold mb-1.5">
  {dashboardData.todayDrivers > 0 ? Math.round(todayQuantity / dashboardData.todayDrivers) : 0}
</Text>
<Text className="text-white text-opacity-80 text-xs leading-tight">人均今天完成</Text>
```

**修改后**：
```typescript
<Text className="text-white text-2xl font-bold mb-1.5">
  {todayDriversWithRecords > 0 ? Math.round(todayQuantity / todayDriversWithRecords) : 0}
</Text>
<View className="bg-white bg-opacity-10 rounded px-2 py-1.5">
  <Text className="text-white text-opacity-80 text-xs leading-tight">
    {todayDriversWithRecords} 位司机完成
  </Text>
</View>
```

**改进点**：
1. 使用 `todayDriversWithRecords` 代替 `dashboardData.todayDrivers`
2. 显示具体的司机数量，更加直观
3. 添加背景框，提升视觉效果

## 修复效果

### 修复前

#### 今日达标率
- ❌ 计算：150 件 / (300 件/人 × 10 人出勤) = 5.0%
- ❌ 显示：`完成 150 / 3000 件`，达标率 5.0%
- ❌ 问题：包含了没有计件记录的司机，分母过大
- ❌ 用户体验：达标率偏低，不能准确反映实际工作情况

#### 人均件数
- ❌ 计算：150 件 / 10 人（出勤） = 15 件/人
- ❌ 显示：`15` 件，`人均今天完成`
- ❌ 问题：包含了没有计件记录的司机，数据偏低
- ❌ 用户体验：不能准确反映实际工作效率

### 修复后

#### 今日达标率
- ✅ 计算：150 件 / (300 件/人 × 8 人有记录) = 6.25%
- ✅ 显示：`完成 150 / 2400 件`，达标率 6.25%
- ✅ 准确性：只统计有计件记录的司机
- ✅ 用户体验：准确反映实际工作司机的达标情况

#### 人均件数
- ✅ 计算：150 件 / 8 人（有记录） = 19 件/人
- ✅ 显示：`19` 件，`8 位司机完成`
- ✅ 准确性：只统计有计件记录的司机
- ✅ 用户体验：准确反映实际工作效率

### 整体提升
- ✅ 达标率计算更准确
- ✅ 人均件数计算更准确
- ✅ 数据展示更合理
- ✅ 用户体验改善

## 技术细节

### 1. 每日指标字段

#### daily_target 字段
```sql
-- 字段定义
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS daily_target integer;

-- 字段说明
COMMENT ON COLUMN warehouses.daily_target IS '每日指标数（件），司机每天需要完成的件数目标';
```

**特点**：
- 类型：`integer`（整数）
- 可选：允许 NULL
- 单位：件
- 作用域：仓库级别（每个仓库可以设置不同的目标）
- 含义：**每个司机**每天需要完成的件数目标

### 2. 达标率计算公式

#### 今日达标率（修复后）
```typescript
// 1. 获取每日指标
const dailyTarget = warehouse?.daily_target || 0

// 2. 计算今天有计件记录的司机数
const todayDriversWithRecords = useMemo(() => {
  const today = getLocalDateString()
  const driverIds = new Set(records.filter((r) => r.work_date === today).map((r) => r.user_id))
  return driverIds.size
}, [records])

// 3. 计算今天总目标
const todayTotalTarget = dailyTarget * todayDriversWithRecords

// 4. 计算达标率
const completionRate = (todayQuantity / todayTotalTarget) * 100
```

**公式**：
```
今日达标率 = (今天完成件数 / 今天总目标) × 100%
今天总目标 = 每日指标 × 今天有计件记录的司机数
```

**示例**：
- 每日指标：300 件/人
- 今天有计件记录的司机：8 人
- 今天总目标：300 × 8 = 2400 件
- 今天完成：2400 件
- 达标率：(2400 / 2400) × 100% = 100.0%

### 3. 人均件数计算公式

#### 日均件数（人均）
```typescript
// 1. 计算今天有计件记录的司机数
const todayDriversWithRecords = useMemo(() => {
  const today = getLocalDateString()
  const driverIds = new Set(records.filter((r) => r.work_date === today).map((r) => r.user_id))
  return driverIds.size
}, [records])

// 2. 计算人均件数
const avgQuantity = todayDriversWithRecords > 0 
  ? Math.round(todayQuantity / todayDriversWithRecords) 
  : 0
```

**公式**：
```
人均件数 = 今天总件数 / 今天有计件记录的司机数
```

**示例**：
- 今天总件数：800 件
- 今天有计件记录的司机：8 人
- 人均件数：800 / 8 = 100 件/人

### 4. Set 去重原理

#### 为什么使用 Set？
```typescript
const driverIds = new Set(records.filter((r) => r.work_date === today).map((r) => r.user_id))
```

**原因**：
1. 一个司机可能有多条计件记录（不同品类、不同时间段）
2. Set 自动去重，确保每个司机只计数一次
3. `driverIds.size` 返回唯一司机的数量

**示例**：
```typescript
// 今天的计件记录
const records = [
  { user_id: 'A', quantity: 100 },
  { user_id: 'A', quantity: 50 },   // 司机 A 的第二条记录
  { user_id: 'B', quantity: 80 },
  { user_id: 'C', quantity: 120 }
]

// 提取司机 ID
const ids = records.map(r => r.user_id)  // ['A', 'A', 'B', 'C']

// Set 去重
const uniqueIds = new Set(ids)  // Set { 'A', 'B', 'C' }

// 司机数量
uniqueIds.size  // 3
```

## 相关文件

### 修改的文件

#### 1. 数据库迁移
- `supabase/migrations/57_set_default_daily_target.sql` - 设置默认每日指标

#### 2. 管理员端
- `src/pages/manager/piece-work-report/index.tsx`
  - 添加 `todayDriversWithRecords` 计算（第 660-665 行）
  - 修改人均件数显示（第 872-886 行）

#### 3. 超级管理员端
- `src/pages/super-admin/piece-work-report/index.tsx`
  - 添加 `todayDriversWithRecords` 计算（第 690-695 行）
  - 修改人均件数显示（第 902-916 行）

### 未修改的文件
- `src/db/types.ts` - 类型定义无需修改
- `src/db/api.ts` - 数据库 API 无需修改
- 表单页面无需修改

## 数据一致性

### 1. 现有仓库处理
- 所有 `daily_target` 为 NULL 的仓库将被设置为 300
- 已有 `daily_target` 值的仓库不受影响
- 管理员可以在仓库管理页面修改这个值

### 2. 新建仓库处理
- 建议在仓库创建表单中添加 `daily_target` 字段
- 设置默认值为 300
- 允许管理员自定义

### 3. 数据验证
```sql
-- 检查所有仓库的 daily_target
SELECT id, name, daily_target FROM warehouses;

-- 检查是否还有 NULL 值
SELECT COUNT(*) FROM warehouses WHERE daily_target IS NULL;
```

## 用户体验改进

### 1. 今日达标率卡片
**改进前**：
```
今天达标率
0%
完成 150 / 0 件
```

**改进后**：
```
今天达标率
5.0%
完成 150 / 3000 件
```

**提升**：
- ✅ 显示明确的任务量
- ✅ 达标率有意义
- ✅ 用户可以了解完成进度

### 2. 日均件数卡片
**改进前**：
```
日均件数
15
人均今天完成
```

**改进后**：
```
日均件数
19
8 位司机完成
```

**提升**：
- ✅ 数据更准确
- ✅ 显示具体司机数
- ✅ 更好的视觉效果

## 测试验证

### 测试场景 1：有计件记录的情况

#### 测试数据
- 仓库每日指标：300 件/人
- 今天出勤司机：10 人
- 今天有计件记录的司机：8 人
- 今天总件数：2400 件

#### 预期结果
- 今天总目标：300 × 8 = 2400 件（使用有计件记录的司机数）
- 今日达标率：(2400 / 2400) × 100% = 100.0%
- 人均件数：2400 / 8 = 300 件/人
- 显示：`完成 2400 / 2400 件`，`8 位司机完成`

### 测试场景 2：没有计件记录的情况

#### 测试数据
- 仓库每日指标：300 件/人
- 今天出勤司机：10 人
- 今天有计件记录的司机：0 人
- 今天总件数：0 件

#### 预期结果
- 今天总目标：0 件（没有司机有记录）
- 今日达标率：0%
- 人均件数：0 件/人
- 显示：`完成 0 / 0 件`，`0 位司机完成`

### 测试场景 3：部分司机有记录

#### 测试数据
- 仓库每日指标：300 件/人
- 今天出勤司机：10 人
- 今天有计件记录的司机：5 人
- 今天总件数：1500 件

#### 预期结果
- 今天总目标：300 × 5 = 1500 件（使用有计件记录的司机数）
- 今日达标率：(1500 / 1500) × 100% = 100.0%
- 人均件数：1500 / 5 = 300 件/人
- 显示：`完成 1500 / 1500 件`，`5 位司机完成`

### 测试场景 4：超额完成

#### 测试数据
- 仓库每日指标：300 件/人
- 今天出勤司机：10 人
- 今天有计件记录的司机：8 人
- 今天总件数：3000 件

#### 预期结果
- 今天总目标：300 × 8 = 2400 件
- 今日达标率：(3000 / 2400) × 100% = 125.0%
- 人均件数：3000 / 8 = 375 件/人
- 显示：`完成 3000 / 2400 件`，`8 位司机完成`

## 注意事项

### 1. 每日指标设置
- 管理员应该根据实际情况设置合理的每日指标
- 不同仓库可以设置不同的指标
- 每日指标是**每个司机**的目标，不是整个仓库的总目标
- 建议定期评估和调整指标

### 2. 达标率解读
- 达标率基于**有计件记录的司机**，不包括出勤但没有计件的司机
- 达标率 < 50%：需要关注，可能存在问题
- 达标率 50%-80%：正常范围
- 达标率 80%-100%：表现良好
- 达标率 > 100%：超额完成

### 3. 人均件数解读
- 只统计有计件记录的司机
- 不包括请假、培训等没有计件的司机
- 更准确反映实际工作效率

### 4. 数据更新
- 页面显示时自动刷新数据
- 下拉刷新可以手动更新
- 缓存机制确保性能

### 5. 司机数统计
- **出勤司机数**：今天打卡的司机数量
- **有计件记录的司机数**：今天有计件记录的司机数量
- 达标率和人均件数都使用**有计件记录的司机数**

## 总结

本次修复成功解决了两个关键问题：

### 问题 1：今日达标率计算不对
- ✅ **根本原因**：使用出勤司机数而非有计件记录的司机数
- ✅ **修复方案**：改用有计件记录的司机数计算达标率
- ✅ **修复效果**：达标率更准确反映实际工作情况
- ✅ **用户体验**：数据更合理，决策支持更有效

### 问题 2：人均件数不对
- ✅ **根本原因**：使用出勤司机数而非有记件记录的司机数
- ✅ **修复方案**：改用有计件记录的司机数计算人均件数
- ✅ **修复效果**：人均件数更准确
- ✅ **用户体验**：准确反映实际工作效率

### 核心改进
- ✅ **统一逻辑**：达标率和人均件数都使用有计件记录的司机数
- ✅ **数据准确性**：只统计实际工作的司机，排除出勤但没有计件的司机
- ✅ **用户体验**：数据展示更合理，信息更清晰
- ✅ **决策支持**：为管理者提供更准确的数据支持

修复后的系统能够准确计算和显示今日达标率和人均件数，为管理者提供可靠的数据支持，帮助他们更好地了解团队工作情况和做出管理决策。

## 修复日期
2025-11-05

## 相关文档
- [PIECE_WORK_DATA_REFRESH_FIX.md](./PIECE_WORK_DATA_REFRESH_FIX.md) - 计件报表数据刷新修复
- [DASHBOARD_HEIGHT_FIX.md](./DASHBOARD_HEIGHT_FIX.md) - 仪表盘高度修复
- [DASHBOARD_UI_OPTIMIZATION.md](./DASHBOARD_UI_OPTIMIZATION.md) - 仪表盘UI优化
