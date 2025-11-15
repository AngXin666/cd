# 计件报表UI优化总结

## 优化内容

### 1. 功能调整
- ✅ 去除"总金额"显示项
- ✅ 新增"目标完成率"显示与计算功能

### 2. 数据计算逻辑

#### 已有司机数
- 统计系统中当前有效状态的司机账户总数
- 显示在"司机数"卡片中

#### 每日指标数
- 从仓库设置（warehouses表的daily_target字段）中读取
- 支持两种模式：
  - **所有仓库**：累加所有仓库的每日指标数
  - **特定仓库**：显示该仓库的每日指标数

#### 目标完成率
- 计算公式：`(实际完成数 / 每日指标数) × 100%`
- 示例：每日指标设为100，实际完成130，则完成率显示为130%
- 视觉反馈：
  - 完成率 ≥ 100%：绿色显示，标注"已达标"
  - 完成率 < 100%：橙色显示，标注"未达标"

### 3. UI优化细节

#### 统计卡片布局（3列）

**第一列 - 总件数**
- 主数据：实际完成的总件数
- 辅助信息：显示"目标: {每日指标数}"
- 图标：包裹图标（i-mdi-package-variant）

**第二列 - 目标完成率**
- 主数据：完成率百分比（保留1位小数）
- 颜色动态变化：
  - ≥100%：绿色（text-green-600）
  - <100%：橙色（text-orange-600）
- 辅助信息：达标状态提示
- 图标：趋势图标（i-mdi-chart-line）

**第三列 - 司机数**
- 主数据：参与计件的司机数量
- 辅助信息：显示"已有司机"
- 图标：用户组图标（i-mdi-account-group）

### 4. 权限一致性
- ✅ 超级管理员端和普通管理员端实现完全相同的UI界面
- ✅ 两端均能正确读取并应用仓库设置中的每日指标数
- ✅ 数据计算逻辑完全一致

## 技术实现

### 修改的文件
1. `/src/pages/super-admin/piece-work-report/index.tsx`
2. `/src/pages/manager/piece-work-report/index.tsx`

### 核心代码逻辑

```typescript
// 计算每日指标数（根据选中的仓库）
const dailyTarget = useMemo(() => {
  if (selectedWarehouseIndex === 0) {
    // 所有仓库：累加所有仓库的每日指标数
    return warehouses.reduce((sum, w) => sum + (w.daily_target || 0), 0)
  } else {
    // 特定仓库：返回该仓库的每日指标数
    const warehouse = warehouses[selectedWarehouseIndex - 1]
    return warehouse?.daily_target || 0
  }
}, [warehouses, selectedWarehouseIndex])

// 计算目标完成率
const completionRate = useMemo(() => {
  if (dailyTarget === 0) return 0
  return (totalQuantity / dailyTarget) * 100
}, [totalQuantity, dailyTarget])
```

## 用户体验提升

1. **直观的目标管理**：管理员可以清晰看到实际完成情况与目标的对比
2. **视觉反馈**：通过颜色变化快速识别是否达标
3. **灵活的统计维度**：支持查看所有仓库或单个仓库的完成率
4. **数据透明**：同时显示实际完成数和目标数，便于分析

## 注意事项

1. 如果仓库未设置每日指标数（daily_target为0或null），完成率将显示为0%
2. 建议在仓库设置中为每个仓库配置合理的每日指标数
3. 目标完成率支持超过100%，如实际完成130件，目标100件，则显示130%
