# 司机汇总优化快速参考

## 核心变化

### 1. 新增字段
| 字段 | 类型 | 说明 |
|------|------|------|
| joinDate | string \| null | 入职日期（YYYY-MM-DD） |
| daysEmployed | number | 在职天数（自动计算） |

### 2. 达标率计算变化

#### 优化前
```
总目标 = 每日指标 × 出勤天数
达标率 = 完成件数 / 总目标 × 100%
```

#### 优化后
```
总目标 = 每日指标 × 在职天数
达标率 = 完成件数 / 总目标 × 100%
```

### 3. UI 显示

```
┌─────────────────────────────────┐
│ 司机汇总卡片                     │
├─────────────────────────────────┤
│ 状态徽章 + 完成率圆环            │
│ 完成率状态卡片                   │
│ 完成件数                         │
├─────────────────────────────────┤
│ 【新增】入职信息                 │
│ • 入职日期: 2024-01-15          │
│ • 在职天数: 295 天              │
├─────────────────────────────────┤
│ 考勤统计                         │
│ • 出勤天数                       │
│ • 迟到天数                       │
│ • 请假天数                       │
└─────────────────────────────────┘
```

## 计算示例

### 场景 1：正常工作
- 入职：2024-10-01
- 今天：2024-11-05
- 在职：36 天
- 出勤：36 天
- 指标：100 件/天
- 完成：3600 件

```
总目标 = 100 × 36 = 3600 件
达标率 = 3600 / 3600 × 100% = 100%
```

### 场景 2：有请假
- 入职：2024-10-01
- 今天：2024-11-05
- 在职：36 天
- 出勤：30 天（请假 6 天）
- 指标：100 件/天
- 完成：3000 件

**旧算法（基于出勤）**：
```
总目标 = 100 × 30 = 3000 件
达标率 = 3000 / 3000 × 100% = 100% ❌
```

**新算法（基于在职）**：
```
总目标 = 100 × 36 = 3600 件
达标率 = 3000 / 3600 × 100% = 83.3% ✅
```

### 场景 3：未设置入职日期
- 入职：未设置
- 在职：0 天
- 出勤：30 天
- 指标：100 件/天
- 完成：3000 件

```
在职天数 = 0 → 回退到出勤天数
总目标 = 100 × 30 = 3000 件
达标率 = 3000 / 3000 × 100% = 100%
```

## 在职天数计算

```typescript
// 计算公式
在职天数 = Math.ceil((今天 - 入职日期) / (1000 * 60 * 60 * 24))

// 示例
入职日期: 2024-10-01
今天: 2024-11-05
在职天数 = 36 天
```

## 边界情况

| 情况 | 在职天数 | 达标率计算基准 |
|------|---------|---------------|
| 正常 | > 0 | 在职天数 |
| 未设置入职日期 | 0 | 出勤天数（回退） |
| 无出勤记录 | 0 | 0（达标率为 0） |
| 每日指标为 0 | - | 达标率为 0 |

## 修改位置

- 普通管理端：`src/pages/manager/piece-work-report/index.tsx`
- 超级管理端：`src/pages/super-admin/piece-work-report/index.tsx`

## 关键代码

### 在职天数计算
```typescript
const calculateDaysEmployed = (joinDate: string | null): number => {
  if (!joinDate) return 0
  const join = new Date(joinDate)
  const today = new Date()
  const diffTime = Math.abs(today.getTime() - join.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}
```

### 达标率计算
```typescript
const daysForCalculation = summary.daysEmployed > 0 
  ? summary.daysEmployed 
  : attendanceStats.attendanceDays

if (dailyTarget > 0 && daysForCalculation > 0) {
  const driverTotalTarget = dailyTarget * daysForCalculation
  driverCompletionRate = (summary.totalQuantity / driverTotalTarget) * 100
}
```

### UI 显示
```tsx
<View className="bg-blue-50 rounded-lg px-3 py-2 mb-4">
  <View className="flex items-center justify-between mb-1">
    <Text className="text-xs text-gray-600">入职日期</Text>
    <Text className="text-sm font-bold text-blue-700">
      {summary.joinDate || '未设置'}
    </Text>
  </View>
  <View className="flex items-center justify-between">
    <Text className="text-xs text-gray-600">在职天数</Text>
    <Text className="text-sm font-bold text-blue-700">
      {summary.daysEmployed} 天
    </Text>
  </View>
</View>
```

## 优势总结

✅ **更真实**：达标率反映整体表现，不因请假虚高
✅ **更公平**：所有司机使用统一标准
✅ **更完整**：显示入职信息，便于管理决策
✅ **更智能**：自动回退机制，处理边界情况

---

**更新时间**: 2025-11-05
