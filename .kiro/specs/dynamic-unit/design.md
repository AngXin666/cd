# Design Document: 动态计量单位

## Overview

本设计文档描述计件录入页面动态计量单位功能的实现方案。核心目标是根据仓库类型自动显示对应的计量单位标签，提升用户体验。

## Architecture

### 现有架构

系统已具备完整的仓库类型和单位映射机制：

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Warehouse     │────▶│  WarehouseType  │────▶│   PresetUnit    │
│   (仓库)        │     │  (仓库类型)      │     │   (预设单位)     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                                               │
        ▼                                               ▼
┌─────────────────┐                           ┌─────────────────┐
│   Category      │──────────────────────────▶│ currentCategoryUnit │
│   (品类)        │                           │   (当前单位)     │
└─────────────────┘                           └─────────────────┘
```

### 单位映射表

| WarehouseType | 预设单位 | 数量标签 | 单价标签 |
|---------------|---------|---------|---------|
| piece         | 件      | 件数    | 元/件   |
| point         | 点      | 点数    | 元/点   |
| whole         | 车      | 车数    | 元/车   |
| distance      | 公里    | 公里数  | 元/公里 |

## Components and Interfaces

### 1. 单位获取函数 (已存在)

```typescript
// fleet-manager/frontend/src/api/types.ts
export function getWarehousePresetUnit(warehouseType: WarehouseType | string): string {
  const type = warehouseType as WarehouseType
  return WAREHOUSE_TYPE_UNITS[type] || '件'
}
```

### 2. 当前单位计算属性 (已存在)

```typescript
// fleet-manager/frontend/src/pages/driver/piece-work/entry.vue
const currentCategoryUnit = computed(() => {
  const category = currentCategory.value
  if (category?.unit) {
    return category.unit
  }
  return currentWarehousePresetUnit.value || '件'
})
```

### 3. 模板中的动态绑定 (已存在)

```vue
<!-- 数量标签 -->
<text class="form-label">
  <text class="required">*</text> {{ currentCategoryUnit }}数
</text>

<!-- 单价标签 -->
<text class="form-label">
  <text class="required">*</text> 单价（元/{{ currentCategoryUnit }}）
</text>

<!-- 输入框占位提示 -->
<input :placeholder="'请输入' + currentCategoryUnit + '数'" />
```

## Data Models

### Warehouse 接口

```typescript
interface Warehouse {
  id: number
  name: string
  warehouse_type: WarehouseType  // 仓库类型
  preset_unit: string            // 预设单位（后端计算）
  // ...
}
```

### PieceWorkCategory 接口

```typescript
interface PieceWorkCategory {
  id: number
  name: string
  warehouse_id: number
  unit: string  // 品类单位（可选，优先于仓库预设单位）
  // ...
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: 仓库类型单位映射正确性

*For any* 有效的仓库类型枚举值，`getWarehousePresetUnit` 函数应返回对应的预设单位字符串。

**Validates: Requirements 1.1, 1.2, 1.3, 1.4**

### Property 2: 单位优先级正确性

*For any* 品类和仓库组合，`currentCategoryUnit` 应遵循以下优先级：
1. 品类自身的 unit 字段（如果存在且非空）
2. 仓库的预设单位（根据 warehouse_type 计算）
3. 默认值 "件"

**Validates: Requirements 2.1, 2.2, 2.3**

### Property 3: 响应式更新正确性

*For any* 仓库切换操作，`currentCategoryUnit` 计算属性应立即重新计算并返回新仓库对应的单位。

**Validates: Requirements 1.5**

## Error Handling

| 场景 | 处理方式 |
|-----|---------|
| 仓库类型为空或未知 | 返回默认单位 "件" |
| 品类单位为空字符串 | 使用仓库预设单位 |
| 仓库数据加载失败 | 显示加载错误提示 |

## Testing Strategy

### 单元测试

1. **getWarehousePresetUnit 函数测试**
   - 测试所有有效仓库类型返回正确单位
   - 测试无效/未知类型返回默认值 "件"

2. **单位优先级测试**
   - 测试品类有独立单位时优先使用品类单位
   - 测试品类无单位时使用仓库预设单位
   - 测试仓库类型为空时使用默认值

### 属性测试

使用 fast-check 进行属性测试：

```typescript
// Property 1: 仓库类型单位映射
fc.assert(
  fc.property(
    fc.constantFrom('piece', 'point', 'whole', 'distance'),
    (warehouseType) => {
      const unit = getWarehousePresetUnit(warehouseType)
      return WAREHOUSE_TYPE_UNITS[warehouseType] === unit
    }
  )
)

// Property 2: 单位优先级
fc.assert(
  fc.property(
    fc.record({
      categoryUnit: fc.option(fc.string()),
      warehouseType: fc.option(fc.constantFrom('piece', 'point', 'whole', 'distance'))
    }),
    ({ categoryUnit, warehouseType }) => {
      // 验证优先级逻辑
    }
  )
)
```
