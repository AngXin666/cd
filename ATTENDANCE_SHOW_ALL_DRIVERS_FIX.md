# 考勤管理页面 - 显示所有司机修复

## 问题描述
超级管理员端的考勤管理页面中，仓库明明有3个司机，但只显示了2个有打卡记录的司机，没有打卡记录的司机没有显示。

## 问题原因
原来的逻辑是：
1. 只根据打卡记录来获取司机的仓库信息
2. 如果司机没有打卡记录，`warehouseIds` 就是空数组
3. 在筛选时，如果司机的 `warehouseIds` 不包含当前仓库ID，就不会显示

这导致没有打卡记录的司机被过滤掉了。

## 修复方案

### 1. 修改数据处理逻辑

#### 修改前
```typescript
// 获取该司机关联的所有仓库
const warehouseIds = Array.from(new Set(driverRecords.map((r) => r.warehouse_id)))
const warehouseNames = warehouseIds.map((id) => getWarehouseName(id))
```

#### 修改后
```typescript
// 获取该司机关联的所有仓库（包括打卡记录中的仓库）
const warehouseIdsFromRecords = driverRecords
  .map((r) => r.warehouse_id)
  .filter((id): id is string => id !== null)  // 过滤掉 null 值
const warehouseIds = Array.from(new Set(warehouseIdsFromRecords))
const warehouseNames = warehouseIds.map((id) => getWarehouseName(id))
```

**改进点**：
- 添加了 null 值过滤，确保 `warehouseIds` 数组中只包含有效的仓库ID
- 使用 TypeScript 类型守卫 `id is string` 确保类型安全

### 2. 修改筛选逻辑

#### 修改前
```typescript
// 根据当前仓库筛选司机统计
const getFilteredDriverStats = () => {
  const currentWarehouseId = getCurrentWarehouseId()
  if (currentWarehouseId === 'all') {
    return calculateDriverStats
  }
  return calculateDriverStats.filter((stats) => stats.warehouseIds.includes(currentWarehouseId))
}
```

#### 修改后
```typescript
// 根据当前仓库筛选司机统计
const getFilteredDriverStats = () => {
  const currentWarehouseId = getCurrentWarehouseId()
  if (currentWarehouseId === 'all') {
    return calculateDriverStats
  }
  // 显示在当前仓库有打卡记录的司机，以及没有任何打卡记录的司机
  return calculateDriverStats.filter((stats) => {
    // 如果司机有打卡记录，只显示在当前仓库打过卡的司机
    if (stats.warehouseIds.length > 0) {
      return stats.warehouseIds.includes(currentWarehouseId)
    }
    // 如果司机没有任何打卡记录，在所有仓库都显示
    return true
  })
}
```

**改进点**：
- 对于有打卡记录的司机，只显示在当前仓库打过卡的司机
- 对于没有任何打卡记录的司机，在所有仓库都显示
- 这样确保了所有司机都能被看到

### 3. 修改 UI 显示

#### 修改前
```typescript
{/* 仓库信息 */}
{stats.warehouseNames.length > 0 && (
  <View className="flex items-center gap-2 mb-3">
    <View className="i-mdi-warehouse text-base text-gray-600" />
    <Text className="text-sm text-gray-600">仓库：{stats.warehouseNames.join('、')}</Text>
  </View>
)}
```

#### 修改后
```typescript
{/* 仓库信息 */}
{stats.warehouseNames.length > 0 ? (
  <View className="flex items-center gap-2 mb-3">
    <View className="i-mdi-warehouse text-base text-gray-600" />
    <Text className="text-sm text-gray-600">仓库：{stats.warehouseNames.join('、')}</Text>
  </View>
) : (
  <View className="flex items-center gap-2 mb-3">
    <View className="i-mdi-alert-circle text-base text-orange-600" />
    <Text className="text-sm text-orange-600">暂无打卡记录</Text>
  </View>
)}
```

**改进点**：
- 当司机有打卡记录时，显示仓库信息
- 当司机没有打卡记录时，显示"暂无打卡记录"提示
- 使用橙色警告图标和文字，让用户清楚地知道这个司机还没有打卡

### 4. 更新依赖项

#### 修改前
```typescript
}, [profiles, attendanceRecords, filterMonth, calculateWorkDays, calculateWorkingDays])
```

#### 修改后
```typescript
}, [profiles, attendanceRecords, filterMonth, calculateWorkDays, calculateWorkingDays, getWarehouseName])
```

**改进点**：
- 添加了 `getWarehouseName` 到依赖项数组中
- 确保当仓库信息变化时，司机统计数据会重新计算

## 修复效果

### 修复前
- 仓库有3个司机
- 只显示2个有打卡记录的司机
- 1个没有打卡记录的司机不显示

### 修复后
- 仓库有3个司机
- 显示所有3个司机
- 有打卡记录的司机显示仓库信息和统计数据
- 没有打卡记录的司机显示"暂无打卡记录"提示，出勤率为0%

## 显示规则

### 仓库切换时的显示规则
1. **有打卡记录的司机**：
   - 只在他们打过卡的仓库中显示
   - 显示仓库名称和统计数据

2. **没有打卡记录的司机**：
   - 在所有仓库中都显示
   - 显示"暂无打卡记录"提示
   - 出勤率显示为 0%
   - 打卡天数显示为 0/工作日数

### 统计数据显示
- **出勤率**：0%（红色）
- **打卡天数**：0/20（假设当月有20个工作日）
- **在职天数**：根据入职日期计算

## 用户体验改进

1. **完整性**：所有司机都能被看到，不会遗漏
2. **清晰性**：通过"暂无打卡记录"提示，清楚地告知用户哪些司机还没有打卡
3. **一致性**：所有司机的信息展示格式保持一致
4. **可操作性**：管理员可以看到哪些司机需要督促打卡

## 相关文件
- `src/pages/super-admin/leave-approval/index.tsx` - 考勤管理页面（已修复）

## 测试建议

### 测试场景1：有打卡记录的司机
1. 切换到某个仓库
2. 应该只显示在该仓库打过卡的司机
3. 显示仓库名称和统计数据

### 测试场景2：没有打卡记录的司机
1. 切换到任意仓库
2. 应该显示所有没有打卡记录的司机
3. 显示"暂无打卡记录"提示
4. 出勤率为0%，打卡天数为0

### 测试场景3：混合场景
1. 仓库A有3个司机：司机1和司机2有打卡记录，司机3没有打卡记录
2. 切换到仓库A
3. 应该显示所有3个司机
4. 司机1和司机2显示仓库信息和统计数据
5. 司机3显示"暂无打卡记录"提示

## 完成时间
2025-11-05
