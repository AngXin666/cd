# 考勤管理状态标签功能

## 功能概述

在双管理端（管理端和超级管理端）的考勤管理界面中，为每个司机添加了实时状态标签，根据打卡记录和请假状态显示当前状态。

## 状态类型

系统支持以下四种状态：

1. **上班中** (`working`)
   - 颜色：绿色渐变 (green-500 to green-600)
   - 图标：✓ (i-mdi-check-circle)
   - 条件：今天已打卡且未迟到

2. **迟到** (`late`)
   - 颜色：橙色渐变 (orange-500 to orange-600)
   - 图标：⏰ (i-mdi-clock-alert)
   - 条件：今天已打卡但状态为迟到

3. **休假** (`on_leave`)
   - 颜色：蓝色渐变 (blue-500 to blue-600)
   - 图标：🏖️ (i-mdi-beach)
   - 条件：今天在已批准的请假期间内

4. **未打卡** (`not_checked_in`)
   - 颜色：灰色渐变 (gray-500 to gray-600)
   - 图标：⚠️ (i-mdi-alert-circle)
   - 条件：今天没有打卡记录且不在休假中

## 状态判断逻辑

状态判断按以下优先级进行：

1. **首先检查是否在休假中**
   - 查询所有已批准的请假申请
   - 判断今天是否在请假的开始日期和结束日期之间
   - 如果是，显示"休假"状态

2. **其次检查是否有打卡记录**
   - 查询今天的打卡记录
   - 如果有打卡记录：
     - 检查打卡状态是否为 `late`
     - 如果是迟到，显示"迟到"状态
     - 否则显示"上班中"状态

3. **默认状态**
   - 如果既不在休假中，也没有打卡记录
   - 显示"未打卡"状态

## 实现细节

### 数据结构修改

在 `DriverStats` 接口中添加了 `todayStatus` 字段：

```typescript
interface DriverStats {
  // ... 其他字段
  todayStatus: 'working' | 'late' | 'on_leave' | 'not_checked_in' // 今日状态
}
```

### 状态计算

在 `calculateDriverStats` 函数中添加了状态计算逻辑：

```typescript
// 计算今日状态
const today = new Date().toISOString().split('T')[0]
for (const [driverId, stats] of statsMap.entries()) {
  // 1. 检查是否在休假中
  const onLeaveToday = visibleLeave.some((app) => {
    if (app.user_id !== driverId || app.status !== 'approved') return false
    const startDate = new Date(app.start_date).toISOString().split('T')[0]
    const endDate = new Date(app.end_date).toISOString().split('T')[0]
    return today >= startDate && today <= endDate
  })

  if (onLeaveToday) {
    stats.todayStatus = 'on_leave'
    continue
  }

  // 2. 检查今天是否有打卡记录
  const todayAttendance = allAttendanceForStats.find((record) => {
    const recordDate = new Date(record.clock_in_time).toISOString().split('T')[0]
    return record.user_id === driverId && recordDate === today
  })

  if (todayAttendance) {
    // 有打卡记录，判断是否迟到
    stats.todayStatus = todayAttendance.status === 'late' ? 'late' : 'working'
  } else {
    // 没有打卡记录
    stats.todayStatus = 'not_checked_in'
  }
}
```

### UI 显示

在司机信息卡片中，状态标签显示在司机类型标签和新司机标签之后：

```tsx
{/* 今日状态标签 */}
{stats.todayStatus === 'working' && (
  <View className="bg-gradient-to-r from-green-500 to-green-600 px-2 py-0.5 rounded-full flex items-center gap-1">
    <View className="i-mdi-check-circle text-xs text-white" />
    <Text className="text-xs text-white font-bold">上班中</Text>
  </View>
)}
{stats.todayStatus === 'late' && (
  <View className="bg-gradient-to-r from-orange-500 to-orange-600 px-2 py-0.5 rounded-full flex items-center gap-1">
    <View className="i-mdi-clock-alert text-xs text-white" />
    <Text className="text-xs text-white font-bold">迟到</Text>
  </View>
)}
{stats.todayStatus === 'on_leave' && (
  <View className="bg-gradient-to-r from-blue-500 to-blue-600 px-2 py-0.5 rounded-full flex items-center gap-1">
    <View className="i-mdi-beach text-xs text-white" />
    <Text className="text-xs text-white font-bold">休假</Text>
  </View>
)}
{stats.todayStatus === 'not_checked_in' && (
  <View className="bg-gradient-to-r from-gray-500 to-gray-600 px-2 py-0.5 rounded-full flex items-center gap-1">
    <View className="i-mdi-alert-circle text-xs text-white" />
    <Text className="text-xs text-white font-bold">未打卡</Text>
  </View>
)}
```

## 修改的文件

1. **管理端考勤管理页面**
   - 文件：`src/pages/manager/leave-approval/index.tsx`
   - 修改内容：
     - 添加 `todayStatus` 字段到 `DriverStats` 接口
     - 在 `calculateDriverStats` 中添加状态计算逻辑
     - 在 UI 中添加状态标签显示

2. **超级管理端考勤管理页面**
   - 文件：`src/pages/super-admin/leave-approval/index.tsx`
   - 修改内容：
     - 添加 `todayStatus` 字段到 `DriverStats` 接口
     - 在 `calculateDriverStats` 中添加状态计算逻辑
     - 在 UI 中添加状态标签显示

## 使用场景

1. **实时监控**
   - 管理员可以快速查看所有司机的当前状态
   - 一目了然地识别哪些司机已上班、迟到、休假或未打卡

2. **考勤管理**
   - 帮助管理员及时发现未打卡的司机
   - 识别迟到情况，便于后续处理

3. **人员调度**
   - 根据司机的实时状态进行工作安排
   - 了解可用人力资源情况

## 注意事项

1. **时区处理**
   - 所有日期比较都使用 ISO 格式的日期字符串（YYYY-MM-DD）
   - 避免了时区差异导致的日期判断错误

2. **状态优先级**
   - 休假状态优先级最高
   - 如果司机在休假中，即使有打卡记录也显示"休假"状态

3. **实时更新**
   - 状态会随着数据的变化自动更新
   - 使用 `useMemo` 确保计算效率

4. **视觉设计**
   - 使用不同颜色和图标区分不同状态
   - 标签采用圆角设计，与其他标签保持一致的视觉风格
