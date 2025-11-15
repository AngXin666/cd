# 考勤管理显示修复文档

## 修复日期
2025-11-15

## 问题描述

### 用户需求

在考勤管理界面中：
1. ✅ 显示每个司机的出勤天数
2. ❌ 不需要显示请假次数
3. ✅ 没有数据的司机也要显示

### 修复前的问题

❌ **显示问题**：
- 显示"请假次数"，但用户不需要这个信息
- 没有数据的司机被隐藏，无法查看所有司机

❌ **数据加载问题**：
- 只显示有请假申请、离职申请或打卡记录的司机
- 新入职的司机如果没有任何记录，不会显示

### 修复后的效果

✅ **显示改进**：
- 移除"请假次数"显示
- 改为显示"出勤天数"（实际打卡天数）
- 显示所有司机，包括没有数据的司机

✅ **数据完整性**：
- 为所有司机创建初始统计数据
- 确保所有司机都显示在列表中
- 没有数据的司机显示 0 天、0 次

---

## 修复内容

### 1. 普通管理端修复

**文件**：`src/pages/manager/leave-approval/index.tsx`

#### 修复1：移除请假次数，显示出勤天数

**修复前**：
```tsx
{/* 其他统计数据 */}
<View className="grid grid-cols-3 gap-3">
  <View className="text-center bg-orange-50 rounded-lg py-2">
    <Text className="text-xl font-bold text-orange-600 block">{stats.totalLeaveDays}</Text>
    <Text className="text-xs text-gray-600">请假天数</Text>
  </View>
  <View className="text-center bg-blue-50 rounded-lg py-2">
    <Text className="text-xl font-bold text-blue-600 block">{stats.leaveCount}</Text>
    <Text className="text-xs text-gray-600">请假次数</Text>  {/* ❌ 显示请假次数 */}
  </View>
  <View className="text-center bg-purple-50 rounded-lg py-2">
    <Text className="text-xl font-bold text-purple-600 block">{stats.pendingCount}</Text>
    <Text className="text-xs text-gray-600">待审批</Text>
  </View>
</View>
```

**修复后**：
```tsx
{/* 其他统计数据 */}
<View className="grid grid-cols-3 gap-3">
  <View className="text-center bg-orange-50 rounded-lg py-2">
    <Text className="text-xl font-bold text-orange-600 block">{stats.totalLeaveDays}</Text>
    <Text className="text-xs text-gray-600">请假天数</Text>
  </View>
  <View className="text-center bg-blue-50 rounded-lg py-2">
    <Text className="text-xl font-bold text-blue-600 block">{stats.actualAttendanceDays}</Text>
    <Text className="text-xs text-gray-600">出勤天数</Text>  {/* ✅ 显示出勤天数 */}
  </View>
  <View className="text-center bg-purple-50 rounded-lg py-2">
    <Text className="text-xl font-bold text-purple-600 block">{stats.pendingCount}</Text>
    <Text className="text-xs text-gray-600">待审批</Text>
  </View>
</View>
```

**关键改动**：
- 将 `stats.leaveCount` 改为 `stats.actualAttendanceDays`
- 将"请假次数"改为"出勤天数"

#### 修复2：显示所有司机

**修复前的逻辑**：
```typescript
const calculateDriverStats = useMemo((): DriverStats[] => {
  const statsMap = new Map<string, DriverStats>()

  // ❌ 问题：只处理有请假申请的司机
  for (const app of visibleLeave) {
    const driver = drivers.find((d) => d.id === app.user_id)
    if (!driver) continue

    if (!statsMap.has(driver.id)) {
      statsMap.set(driver.id, {
        // 创建司机统计数据
      })
    }
    // 累加数据
  }

  // ❌ 问题：只处理有离职申请的司机
  for (const app of visibleResignation) {
    // 类似逻辑
  }

  // ❌ 问题：只处理有打卡记录的司机
  for (const record of allAttendanceForStats) {
    // 类似逻辑
  }

  return Array.from(statsMap.values())
}, [...])
```

**修复后的逻辑**：
```typescript
const calculateDriverStats = useMemo((): DriverStats[] => {
  const statsMap = new Map<string, DriverStats>()

  // ✅ 修复：首先，为所有司机创建初始统计数据
  for (const driver of drivers) {
    statsMap.set(driver.id, {
      driverId: driver.id,
      driverName: getUserName(driver.id),
      warehouseIds: [],
      warehouseNames: [],
      totalLeaveDays: 0,
      leaveCount: 0,
      resignationCount: 0,
      attendanceCount: 0,
      pendingCount: 0,
      workDays: getDriverWorkDays(driver),
      actualAttendanceDays: 0,
      attendanceRate: 0,
      isFullAttendance: false,
      joinDate: driver.join_date,
      workingDays: calculateWorkingDays(driver.join_date)
    })
  }

  // ✅ 修复：然后，处理请假申请
  for (const app of visibleLeave) {
    const stats = statsMap.get(app.user_id)
    if (!stats) continue // 如果司机不存在（可能已删除），跳过
    // 累加数据
  }

  // ✅ 修复：处理离职申请
  for (const app of visibleResignation) {
    const stats = statsMap.get(app.user_id)
    if (!stats) continue
    // 累加数据
  }

  // ✅ 修复：处理打卡记录
  for (const record of allAttendanceForStats) {
    const stats = statsMap.get(record.user_id)
    if (!stats) continue
    // 累加数据
  }

  return Array.from(statsMap.values())
}, [...])
```

**关键改进**：
1. **先初始化所有司机**：为每个司机创建初始统计数据
2. **再累加数据**：处理请假申请、离职申请、打卡记录
3. **防御性编程**：检查司机是否存在，避免已删除司机导致错误

---

### 2. 超级管理端修复

**文件**：`src/pages/super-admin/leave-approval/index.tsx`

**修复内容**：与普通管理端完全相同
1. 移除"请假次数"，显示"出勤天数"
2. 为所有司机创建初始统计数据
3. 确保所有司机都显示

---

## 视觉效果对比

### 修复前

```
司机出勤统计                        2025-11 月数据
┌─────────────────────────────────────────────────────────┐
│  👤  张三                                               │
│      北京仓库                                           │
│      入职: 2025/10/01 • 在职 45 天                     │
│                                                         │
│      ⭕ 100%  实际出勤: 15 / 15 天                      │
│               打卡次数: 15 次                           │
│                                                         │
│      请假天数: 0    请假次数: 0    待审批: 0           │
│                     ^^^^^^^^^^                          │
│                     ❌ 不需要显示                       │
└─────────────────────────────────────────────────────────┘

❌ 王五（新入职，没有数据）不显示
```

### 修复后

```
司机出勤统计                        2025-11 月数据
┌─────────────────────────────────────────────────────────┐
│  👤  张三                                               │
│      北京仓库                                           │
│      入职: 2025/10/01 • 在职 45 天                     │
│                                                         │
│      ⭕ 100%  实际出勤: 15 / 15 天                      │
│               打卡次数: 15 次                           │
│                                                         │
│      请假天数: 0    出勤天数: 15    待审批: 0          │
│                     ^^^^^^^^^^                          │
│                     ✅ 显示出勤天数                     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  👤  王五  [新司机]                                     │
│      未分配仓库                                         │
│      入职: 2025/11/14 • 在职 2 天                      │
│                                                         │
│      ⭕ 0%  实际出勤: 0 / 2 天                          │
│             打卡次数: 0 次                              │
│                                                         │
│      请假天数: 0    出勤天数: 0    待审批: 0           │
└─────────────────────────────────────────────────────────┘
✅ 王五（新入职，没有数据）也显示
```

---

## 数据字段说明

### DriverStats 接口

```typescript
interface DriverStats {
  driverId: string
  driverName: string
  warehouseIds: string[]
  warehouseNames: string[]
  totalLeaveDays: number        // 请假天数（已通过的）
  leaveCount: number             // 请假次数（所有状态）
  resignationCount: number       // 离职申请次数
  attendanceCount: number        // 打卡次数
  pendingCount: number           // 待审批数量
  workDays: number               // 应出勤天数
  actualAttendanceDays: number   // 实际出勤天数（打卡天数）✅ 使用这个
  attendanceRate: number         // 出勤率
  isFullAttendance: boolean      // 是否满勤
  joinDate: string | null        // 入职日期
  workingDays: number            // 在职天数
}
```

### 字段对比

| 字段 | 说明 | 修复前 | 修复后 |
|------|------|--------|--------|
| `leaveCount` | 请假次数 | ✅ 显示 | ❌ 不显示 |
| `actualAttendanceDays` | 出勤天数 | ❌ 不显示 | ✅ 显示 |

---

## 测试建议

### 测试场景1：有数据的司机

1. 创建一个司机，添加打卡记录和请假申请
2. 打开考勤管理页面
3. 验证：
   - 显示"出勤天数"而不是"请假次数" ✅
   - 出勤天数 = 实际打卡天数 ✅
   - 请假天数正确显示 ✅
   - 待审批数量正确显示 ✅

### 测试场景2：没有数据的司机

1. 创建一个新司机，不添加任何记录
2. 打开考勤管理页面
3. 验证：
   - 司机显示在列表中 ✅
   - 出勤天数显示为 0 ✅
   - 请假天数显示为 0 ✅
   - 待审批显示为 0 ✅

### 测试场景3：混合情况

1. 创建多个司机：
   - 司机A：有打卡记录和请假申请
   - 司机B：只有打卡记录
   - 司机C：只有请假申请
   - 司机D：没有任何记录
2. 打开考勤管理页面
3. 验证：
   - 所有司机都显示 ✅
   - 每个司机的出勤天数正确 ✅
   - 没有显示请假次数 ✅

### 测试场景4：满勤司机

1. 创建一个司机，每天都打卡
2. 打开考勤管理页面
3. 验证：
   - 显示满勤徽章 ✅
   - 出勤天数 = 应出勤天数 ✅
   - 出勤率 = 100% ✅

### 测试场景5：请假司机

1. 创建一个司机，有请假记录
2. 打开考勤管理页面
3. 验证：
   - 请假天数正确显示 ✅
   - 出勤天数 = 实际打卡天数 ✅
   - 出勤率正确计算 ✅

---

## 技术要点

### 1. 数据初始化

```typescript
// 为所有司机创建初始统计数据
for (const driver of drivers) {
  statsMap.set(driver.id, {
    driverId: driver.id,
    driverName: getUserName(driver.id),
    // ... 其他字段初始化为 0 或空数组
    actualAttendanceDays: 0,  // 出勤天数初始化为 0
  })
}
```

### 2. 数据累加

```typescript
// 处理打卡记录
for (const record of allAttendanceForStats) {
  const stats = statsMap.get(record.user_id)
  if (!stats) continue  // 防御性编程

  stats.attendanceCount++  // 累加打卡次数

  // 记录打卡日期（用于计算实际出勤天数）
  if (!attendanceDaysMap.has(record.user_id)) {
    attendanceDaysMap.set(record.user_id, new Set())
  }
  const checkInDate = new Date(record.clock_in_time).toISOString().split('T')[0]
  attendanceDaysMap.get(record.user_id)?.add(checkInDate)
}

// 计算实际出勤天数
for (const [driverId, stats] of statsMap.entries()) {
  const attendanceDays = attendanceDaysMap.get(driverId)?.size || 0
  stats.actualAttendanceDays = attendanceDays  // 设置出勤天数
}
```

### 3. 显示逻辑

```typescript
// 显示出勤天数
<View className="text-center bg-blue-50 rounded-lg py-2">
  <Text className="text-xl font-bold text-blue-600 block">
    {stats.actualAttendanceDays}
  </Text>
  <Text className="text-xs text-gray-600">出勤天数</Text>
</View>
```

---

## 核心改进总结

### 改进1：显示优化

✅ **移除请假次数**
- 用户不需要这个信息
- 简化界面显示

✅ **显示出勤天数**
- 更直观的考勤信息
- 与"实际出勤"数据一致

### 改进2：数据完整性

✅ **显示所有司机**
- 不再遗漏没有数据的司机
- 确保数据完整性

✅ **初始化数据**
- 为所有司机创建初始统计数据
- 避免数据缺失

### 改进3：用户体验

✅ **完整视图**
- 可以查看所有司机的考勤情况
- 包括新入职的司机

✅ **准确信息**
- 出勤天数更直观
- 没有数据的司机显示 0

---

## 注意事项

### 1. 出勤天数计算

- 出勤天数 = 实际打卡天数（去重）
- 一天多次打卡只算一次
- 使用 `Set` 数据结构去重

### 2. 请假次数 vs 请假天数

- **请假次数**：请假申请的数量（不显示）
- **请假天数**：已通过的请假申请的总天数（显示）

### 3. 数据一致性

- 出勤天数应该与"实际出勤"显示的天数一致
- 确保数据来源相同

### 4. 仓库筛选

- 按仓库筛选时，只显示在该仓库工作过的司机
- 没有分配仓库的司机显示"未分配仓库"

---

**修复完成时间**: 2025-11-15  
**修复状态**: ✅ 完成  
**影响范围**: 普通管理端 + 超级管理端  
**修改文件**: 2 个  
**核心改进**: 显示优化 + 数据完整性 + 用户体验提升  
**重要性**: ⭐⭐⭐⭐ 重要改进，提升用户体验和数据完整性
