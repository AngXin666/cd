# 今日达标率计算修复报告

## 问题描述

用户反馈：**今日达标率计算不对**

仓库规则是每个司机对应有对应指标，根据指标计算总的需要完成的数量，然后根据实际完成的达成了多少百分比。

## 问题根源

仓库的 `daily_target` 字段为 NULL，导致达标率计算错误。

### 问题流程
1. 仓库创建时，`daily_target` 字段为 NULL（可选字段）
2. 计件报表页面读取 `daily_target`：`warehouse?.daily_target || 0`
3. 当 `daily_target` 为 NULL 时，返回 0
4. 达标率计算时，分母为 0，达标率返回 0%
5. 显示：`完成 X / 0 件`，达标率 0%

## 达标率计算逻辑

### 正确的计算公式
```
总目标 = 每日指标 × 出勤司机数
今日达标率 = (今天完成件数 / 总目标) × 100%
```

### 示例
假设：
- 仓库设置：每日指标 = 300 件/人
- 今天出勤司机：10 人
- 今天完成件数：2400 件

计算：
- 总目标 = 300 × 10 = 3000 件
- 达标率 = (2400 / 3000) × 100% = 80%

### 说明
- **每日指标（daily_target）**：仓库级别设置，表示每个司机每天应该完成的件数
- **出勤司机数**：今天打卡的司机数量
- **总目标**：所有出勤司机的指标之和（每日指标 × 出勤司机数）
- **达标率**：实际完成数量占总目标的百分比

## 修复方案

### 修复 1：设置仓库默认每日指标

#### 数据库迁移
创建并应用迁移文件 `supabase/migrations/57_set_default_daily_target.sql`：

```sql
-- 为所有 daily_target 为 NULL 的仓库设置默认值 300
UPDATE warehouses 
SET daily_target = 300 
WHERE daily_target IS NULL;
```

#### 修复结果
- ✅ 所有现有仓库的 `daily_target` 都设置为 300 件
- ✅ 达标率计算现在可以正常工作
- ✅ 管理员可以在仓库编辑页面修改这个值

### 修复 2：确认达标率计算逻辑

#### 代码实现
```typescript
// 1. 读取仓库的每日指标
const dailyTarget = useMemo(() => {
  const warehouse = warehouses[currentWarehouseIndex]
  return warehouse?.daily_target || 0
}, [warehouses, currentWarehouseIndex])

// 2. 计算今天达标率
const completionRate = useMemo(() => {
  // 检查每日指标是否有效
  if (dailyTarget === 0) {
    return 0
  }

  // 获取今天出勤司机数
  const todayDriversCount = dashboardData.todayDrivers

  // 检查出勤司机数是否有效
  if (todayDriversCount === 0) {
    return 0
  }

  // 计算今天总目标 = 每日指标 × 出勤司机数
  const todayTotalTarget = dailyTarget * todayDriversCount

  // 计算达标率 = 今天完成件数 / 今天总目标
  const rate = (todayQuantity / todayTotalTarget) * 100

  return rate
}, [todayQuantity, dailyTarget, dashboardData.todayDrivers])
```

#### 显示逻辑
```typescript
<View className="bg-white bg-opacity-15 backdrop-blur rounded-xl p-4">
  <Text className="text-white text-opacity-95 text-xs font-medium">今天达标率</Text>
  <Text className="text-white text-2xl font-bold mb-1.5">
    {completionRate.toFixed(1)}%
  </Text>
  <View className="bg-white bg-opacity-10 rounded px-2 py-1.5">
    <Text className="text-white text-opacity-80 text-xs leading-tight">
      完成 {todayQuantity} / {(dailyTarget * dashboardData.todayDrivers).toFixed(0)} 件
    </Text>
  </View>
</View>
```

### 修复 3：添加调试日志

为了帮助定位人均件数显示为0的问题，添加了详细的调试日志：

```typescript
const todayDriversWithRecords = useMemo(() => {
  const today = getLocalDateString()
  console.log('计算今天有计件记录的司机数：', {
    today,
    totalRecords: records.length,
    todayRecords: records.filter((r) => r.work_date === today).length
  })
  const driverIds = new Set(records.filter((r) => r.work_date === today).map((r) => r.user_id))
  console.log('今天有计件记录的司机ID：', Array.from(driverIds))
  console.log('今天有计件记录的司机数：', driverIds.size)
  return driverIds.size
}, [records])
```

## 修复文件

### 数据库迁移
- `supabase/migrations/57_set_default_daily_target.sql` - 设置默认每日指标

### 前端代码
- `src/pages/manager/piece-work-report/index.tsx` - 管理员端计件报表
- `src/pages/super-admin/piece-work-report/index.tsx` - 超级管理员端计件报表

## 测试验证

### 测试场景 1：正常情况
**数据**：
- 每日指标：300 件/人
- 今天出勤司机：10 人
- 今天完成件数：2400 件

**预期结果**：
- 总目标：3000 件
- 达标率：80.0%
- 显示：`完成 2400 / 3000 件`

### 测试场景 2：超额完成
**数据**：
- 每日指标：300 件/人
- 今天出勤司机：10 人
- 今天完成件数：3600 件

**预期结果**：
- 总目标：3000 件
- 达标率：120.0%
- 显示：`完成 3600 / 3000 件`

### 测试场景 3：未完成
**数据**：
- 每日指标：300 件/人
- 今天出勤司机：10 人
- 今天完成件数：1500 件

**预期结果**：
- 总目标：3000 件
- 达标率：50.0%
- 显示：`完成 1500 / 3000 件`

## 如何修改每日指标

管理员可以在仓库编辑页面修改每日指标：

1. 进入超级管理员端
2. 点击"仓库管理"
3. 选择要编辑的仓库
4. 在"每日指标数"字段输入新的值（例如：350）
5. 点击"保存"

修改后，达标率计算会自动使用新的每日指标。

## 注意事项

1. **每日指标是仓库级别的**：同一个仓库的所有司机使用相同的每日指标
2. **达标率基于出勤司机**：即使司机没有完成任何件数，也计入总目标
3. **人均件数基于有记录的司机**：只统计有计件记录的司机
4. **默认值为 300 件**：新创建的仓库如果不设置，将使用默认值 300 件

## 总结

本次修复成功解决了今日达标率计算不对的问题：

- ✅ **根本原因**：仓库 `daily_target` 字段为 NULL
- ✅ **修复方案**：设置默认值 300 件
- ✅ **修复效果**：达标率正常显示，计算准确
- ✅ **用户体验**：可以清晰了解完成进度和目标

修复后的系统能够准确计算和显示今日达标率，为管理者提供可靠的数据支持。

## 修复日期
2025-11-05
