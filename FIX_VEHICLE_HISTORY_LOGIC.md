# 修复车辆历史记录显示逻辑

## 修复时间
2025-11-18

## 问题描述

### 用户反馈的问题
1. 车辆第二次使用有提车记录，但是只显示还车记录照片
2. 逻辑错误：如果没有提车记录，怎么会有还车记录呢？

### 根本原因分析

#### 原有错误逻辑
在 `src/pages/super-admin/vehicle-history/index.tsx` 文件中，`groupRecords` 函数的分组逻辑存在严重错误：

```typescript
// ❌ 错误的逻辑
const pickupRecords = sortedRecords.filter((r) => !r.return_time)
const returnRecords = sortedRecords.filter((r) => r.return_time)
```

这个逻辑的问题：
- 把"没有还车时间"的记录当作"提车记录"
- 把"有还车时间"的记录当作"还车记录"
- 然后按索引配对：`pickupRecords[0]` 配对 `returnRecords[0]`

#### 为什么会出错？

在实际业务中，一条 `vehicle_record` 记录可以同时包含提车和还车信息：
- `pickup_time` + `pickup_photos`：提车信息
- `return_time` + `return_photos`：还车信息
- 一条记录可以同时有这两部分信息（完整的使用周期）

**错误场景示例：**

假设有3条记录：
1. 记录A：只有提车（`pickup_time`，无 `return_time`）
2. 记录B：提车+还车（`pickup_time` + `return_time`）
3. 记录C：提车+还车（`pickup_time` + `return_time`）

原有逻辑会这样分组：
- `pickupRecords = [记录A]`（只有记录A没有还车时间）
- `returnRecords = [记录B, 记录C]`（记录B和C都有还车时间）

然后配对：
- 第1次使用：提车=记录A，还车=记录B ❌ **错误！**
- 第2次使用：提车=null，还车=记录C ❌ **错误！没有提车怎么会有还车？**

#### 正确的业务逻辑

一条记录应该被理解为：
- 如果有 `pickup_time`，这条记录包含提车信息
- 如果有 `return_time`，这条记录包含还车信息
- 如果同时有两者，这是一个完整的使用周期
- 如果只有 `pickup_time`，这是一个进行中的使用周期

## 修复方案

### 1. 修复分组逻辑

```typescript
// ✅ 正确的逻辑
const groupRecords = (records: VehicleRecordWithDetails[]): RecordGroup[] => {
  // 按时间排序（从早到晚）
  const sortedRecords = [...records].sort((a, b) => {
    const aTime = new Date(a.pickup_time || a.recorded_at || '').getTime()
    const bTime = new Date(b.pickup_time || b.recorded_at || '').getTime()
    return aTime - bTime
  })

  const groups: RecordGroup[] = []

  // 遍历所有记录，每条记录可能包含提车、还车或两者
  for (let i = 0; i < sortedRecords.length; i++) {
    const record = sortedRecords[i]
    
    // 如果记录同时有提车和还车信息，作为一个完整周期
    if (record.pickup_time && record.return_time) {
      groups.push({
        cycleNumber: groups.length + 1,
        pickupRecord: record,
        returnRecord: record,
        status: 'completed'
      })
    }
    // 如果只有提车信息，作为进行中的周期
    else if (record.pickup_time && !record.return_time) {
      groups.push({
        cycleNumber: groups.length + 1,
        pickupRecord: record,
        returnRecord: null,
        status: 'in_progress'
      })
    }
    // 如果只有还车信息（异常情况，理论上不应该发生）
    else if (!record.pickup_time && record.return_time) {
      groups.push({
        cycleNumber: groups.length + 1,
        pickupRecord: null,
        returnRecord: record,
        status: 'completed'
      })
    }
  }

  return groups
}
```

### 2. 修复 Tab 状态管理

当 `pickupRecord` 和 `returnRecord` 是同一条记录时，它们会被渲染两次（一次作为提车，一次作为还车）。如果使用相同的 `record.id` 作为 Tab 状态的 key，会导致两个渲染共享同一个 Tab 状态，产生冲突。

**修复方法：**

使用 `recordId + recordType` 作为唯一标识：

```typescript
// 获取或初始化记录的 activeTab
const getRecordTab = (recordId: string, recordType: 'pickup' | 'return') => {
  const key = `${recordId}-${recordType}`
  return recordTabs[key] || 'pickup'
}

// 设置记录的 activeTab
const setRecordTab = (recordId: string, recordType: 'pickup' | 'return', tab: 'pickup' | 'registration' | 'personal' | 'damage') => {
  const key = `${recordId}-${recordType}`
  setRecordTabs((prev) => ({
    ...prev,
    [key]: tab
  }))
}
```

然后更新所有调用这两个函数的地方，添加 `recordType` 参数。

## 修复效果

### 修复前
- ❌ 第二次使用只显示还车记录，不显示提车记录
- ❌ 提车和还车记录配对错误
- ❌ 出现"没有提车但有还车"的异常情况

### 修复后
- ✅ 每条记录按照实际包含的信息正确显示
- ✅ 如果记录同时有提车和还车，会分别显示提车部分和还车部分
- ✅ 如果记录只有提车，只显示提车部分，标记为"进行中"
- ✅ 提车和还车的 Tab 状态独立管理，互不干扰

## 测试场景

### 场景1：完整的使用周期（一条记录包含提车+还车）
**数据：**
- 记录1：`pickup_time` = "2025-01-01 10:00", `return_time` = "2025-01-05 18:00"

**预期显示：**
- 第1次使用（已完成）
  - 提车：显示提车时间和提车照片
  - 还车：显示还车时间和还车照片

### 场景2：进行中的使用周期（只有提车）
**数据：**
- 记录1：`pickup_time` = "2025-01-10 09:00", `return_time` = null

**预期显示：**
- 第1次使用（进行中）
  - 提车：显示提车时间和提车照片
  - 提示：该车辆当前正在使用中，尚未还车

### 场景3：多次使用周期
**数据：**
- 记录1：`pickup_time` = "2025-01-01", `return_time` = "2025-01-05"
- 记录2：`pickup_time` = "2025-01-10", `return_time` = "2025-01-15"
- 记录3：`pickup_time` = "2025-01-20", `return_time` = null

**预期显示：**
- 第1次使用（已完成）：提车 + 还车
- 第2次使用（已完成）：提车 + 还车
- 第3次使用（进行中）：提车

## 相关文件
- `src/pages/super-admin/vehicle-history/index.tsx` - 车辆历史记录页面

## 技术要点

### 1. 数据模型理解
- 一条 `vehicle_record` 可以包含提车、还车或两者
- 不要假设提车和还车一定是分开的两条记录

### 2. 状态管理
- 当同一个数据对象被渲染多次时，需要确保状态的唯一性
- 使用组合键（`id + type`）而不是单一 ID

### 3. 业务逻辑
- 先理解业务流程，再编写代码
- 不要用技术假设替代业务逻辑

## 代码质量
- ✅ 通过 Biome 代码检查
- ✅ 无 TypeScript 错误
- ✅ 逻辑清晰，易于维护
