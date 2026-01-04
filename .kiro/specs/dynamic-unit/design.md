# Design Document: 动态计量单位

## Overview

本设计文档描述计件录入页面动态计量单位功能的简化实现方案。核心原则：**单位完全由仓库类型决定，品类不需要独立的 unit 字段**。

## Architecture

### 简化后的架构

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Warehouse     │────▶│  WarehouseType  │────▶│   Unit          │
│   (仓库)        │     │  (仓库类型)      │     │   (单位)        │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                                               
        ▼                                               
┌─────────────────┐                           
│   Category      │                           
│   (品类)        │                           
└─────────────────┘                           
```

### 数据流

```
进入计件页面
    │
    ▼
检测当前仓库 ──────────────────────────────────┐
    │                                          │
    ▼                                          │
读取仓库类型 (warehouse_type)                   │
    │                                          │
    ▼                                          │
根据类型映射获取单位                             │
    │                                          │
    ▼                                          │
加载该仓库的品类列表                             │
    │                                          │
    ▼                                          │
显示品类和对应单位标签                           │
                                               │
司机切换仓库 ◄─────────────────────────────────┘
```

### 单位映射表

| WarehouseType | 单位 | 数量标签 | 单价标签 |
|---------------|------|---------|---------|
| piece         | 件   | 件数    | 元/件   |
| point         | 点   | 点数    | 元/点   |
| whole         | 车   | 车数    | 元/车   |
| distance      | 公里 | 公里数  | 元/公里 |
| custom        | (自定义) | (自定义)数 | 元/(自定义) |

注意：custom 类型需要老板在仓库设置中指定 `custom_unit` 字段，不提供默认值。

## Components and Interfaces

### 1. 仓库类型单位映射（前端）

```typescript
// fleet-manager/frontend/src/api/types.ts

/** 仓库类型枚举 */
export enum WarehouseType {
  PIECE = 'piece',
  POINT = 'point',
  WHOLE = 'whole',
  DISTANCE = 'distance',
  CUSTOM = 'custom',  // 自定义类型
}

/** 仓库类型到单位的映射（不包含 custom） */
export const WAREHOUSE_TYPE_UNITS: Record<string, string> = {
  [WarehouseType.PIECE]: '件',
  [WarehouseType.POINT]: '点',
  [WarehouseType.WHOLE]: '车',
  [WarehouseType.DISTANCE]: '公里',
  // custom 类型不在此映射中，需要从仓库的 custom_unit 字段获取
}

/**
 * 根据仓库获取单位
 * @param warehouse 仓库对象
 * @returns 对应的单位字符串，custom 类型返回 custom_unit 或空字符串
 */
export function getWarehouseUnit(warehouse: Warehouse): string {
  if (!warehouse?.warehouse_type) {
    return ''  // 不提供默认值，强制要求设置仓库类型
  }
  
  // custom 类型使用自定义单位
  if (warehouse.warehouse_type === WarehouseType.CUSTOM) {
    return warehouse.custom_unit || ''  // 未设置时返回空，触发错误提示
  }
  
  // 其他类型从映射获取
  return WAREHOUSE_TYPE_UNITS[warehouse.warehouse_type] || ''
}
```

### 2. 计件录入页面单位计算（简化）

```typescript
// fleet-manager/frontend/src/pages/driver/piece-work/entry.vue

/**
 * 当前单位 - 完全由仓库决定
 * 不再依赖品类的 unit 字段
 */
const currentCategoryUnit = computed(() => {
  const warehouse = currentWarehouse.value
  if (!warehouse) {
    return ''
  }
  return getWarehouseUnit(warehouse)
})

/**
 * 是否可以录入 - 必须有有效单位
 */
const canEnterPieceWork = computed(() => {
  return currentCategoryUnit.value !== ''
})
```

### 3. 单位缺失提示

```typescript
/**
 * 检查单位是否有效，无效时显示提示
 */
function checkUnitValid(): boolean {
  if (!currentCategoryUnit.value) {
    uni.showToast({
      title: '该仓库未设置单位，请联系管理员',
      icon: 'none',
      duration: 2000,
    })
    return false
  }
  return true
}
```

### 3. 仓库切换时重新加载品类

```typescript
/**
 * 仓库选择变化
 * 切换仓库后重新加载该仓库的品类
 */
async function onWarehouseChange(e: any): Promise<void> {
  const index = Number(e.detail.value)
  selectedWarehouseIndex.value = index
  
  // 清空当前品类选择
  selectedCategoryIndex.value = 0
  categories.value = []
  
  // 重新加载该仓库的品类
  const warehouse = warehouses.value[index]
  if (warehouse) {
    await loadCategories(warehouse.id)
  }
}
```

### 4. 后端单位映射（需更新）

```python
# fleet-manager/backend/helpers.py

WAREHOUSE_TYPE_UNIT_MAP: Dict[str, str] = {
    "piece": "件",
    "point": "点",
    "whole": "车",
    "distance": "公里",
    # "custom" 不在此映射中，需要从仓库的 custom_unit 字段获取
}

def get_warehouse_unit(warehouse: "Warehouse") -> str:
    """
    获取仓库的单位
    
    Args:
        warehouse: 仓库对象
        
    Returns:
        单位字符串，未设置时返回空字符串
    """
    if not warehouse or not warehouse.warehouse_type:
        return ""
    
    warehouse_type = warehouse.warehouse_type
    if hasattr(warehouse_type, 'value'):
        type_value = warehouse_type.value
    else:
        type_value = str(warehouse_type)
    
    # custom 类型使用自定义单位
    if type_value == "custom":
        return warehouse.custom_unit or ""
    
    # 其他类型从映射获取
    return WAREHOUSE_TYPE_UNIT_MAP.get(type_value, "")
```

### 5. 仓库模型更新

```python
# fleet-manager/backend/models.py

class Warehouse(SQLModel, table=True):
    """仓库表"""
    __tablename__ = "warehouses"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=100, index=True)
    address: Optional[str] = Field(default=None, max_length=255)
    # 仓库类型：piece=计件, point=点位, whole=整车, distance=距离, custom=自定义
    warehouse_type: str = Field(
        default=WarehouseType.PIECE.value,
        sa_column=Column(String(20)),
        description="仓库类型"
    )
    # 自定义单位（仅 custom 类型使用）
    custom_unit: Optional[str] = Field(
        default=None,
        max_length=20,
        description="自定义单位名称（仅 custom 类型使用）"
    )
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.now)
```

## Data Models

### Warehouse 接口（前端）

```typescript
interface Warehouse {
  id: number
  name: string
  warehouse_type: WarehouseType  // 仓库类型，决定单位
  custom_unit?: string           // 自定义单位（仅 custom 类型使用）
  is_active: boolean
}
```

### PieceWorkCategory 接口（前端）

```typescript
interface PieceWorkCategory {
  id: number
  name: string
  warehouse_id: number
  driver_only_price: number
  with_vehicle_price: number
  unit_price: number
  // unit 字段不再用于决定显示单位
  // 单位完全由关联仓库的 warehouse_type 决定
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: 预设仓库类型单位映射正确性

*For any* 预设仓库类型（piece/point/whole/distance），`getWarehouseUnit` 函数应返回对应的预设单位字符串（件/点/车/公里）。

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

### Property 2: 自定义类型单位获取

*For any* custom 类型仓库，`getWarehouseUnit` 函数应返回仓库的 `custom_unit` 字段值。

**Validates: Requirements 3.5, 4.1**

### Property 3: 未设置单位返回空

*For any* 仓库类型为空、未知、或 custom 类型但未设置 custom_unit 的情况，`getWarehouseUnit` 函数应返回空字符串。

**Validates: Requirements 3.6**

### Property 4: 仓库切换触发品类重载

*For any* 仓库切换操作，系统应清空当前品类选择并重新加载新仓库的品类列表。

**Validates: Requirements 2.1, 2.2, 2.3**

## Error Handling

| 场景 | 处理方式 |
|-----|---------|
| 仓库类型为空或未知 | 返回空字符串，前端显示"请先设置仓库类型" |
| custom 类型未设置 custom_unit | 返回空字符串，前端显示"请先设置单位" |
| 仓库数据加载失败 | 显示加载错误提示 |
| 品类列表为空 | 显示"该仓库暂无品类"提示 |

## Testing Strategy

### 单元测试

1. **getWarehouseUnit 函数测试**
   - 测试所有预设仓库类型返回正确单位
   - 测试 custom 类型返回 custom_unit 值
   - 测试 custom 类型未设置 custom_unit 返回空字符串
   - 测试无效/未知类型返回空字符串
   - 测试空值返回空字符串

2. **仓库切换测试**
   - 测试切换仓库后品类列表被清空
   - 测试切换仓库后重新加载品类
   - 测试切换仓库后单位标签更新

3. **自定义单位验证测试**
   - 测试 custom 类型仓库保存时验证 custom_unit 不为空
   - 测试非 custom 类型仓库不需要 custom_unit

### 属性测试

使用 Hypothesis (Python) 进行属性测试：

```python
from hypothesis import given, strategies as st

# Property 1: 预设仓库类型单位映射
@given(st.sampled_from(['piece', 'point', 'whole', 'distance']))
def test_preset_warehouse_type_unit_mapping(warehouse_type):
    """验证所有预设仓库类型返回正确单位"""
    expected = {
        'piece': '件',
        'point': '点',
        'whole': '车',
        'distance': '公里',
    }
    warehouse = Warehouse(warehouse_type=warehouse_type)
    assert get_warehouse_unit(warehouse) == expected[warehouse_type]

# Property 2: 自定义类型单位获取
@given(st.text(min_size=1, max_size=20).filter(lambda x: x.strip()))
def test_custom_warehouse_type_returns_custom_unit(custom_unit):
    """验证 custom 类型返回自定义单位"""
    warehouse = Warehouse(warehouse_type='custom', custom_unit=custom_unit)
    assert get_warehouse_unit(warehouse) == custom_unit

# Property 3: 未设置单位返回空
@given(st.text().filter(lambda x: x not in ['piece', 'point', 'whole', 'distance', 'custom']))
def test_invalid_warehouse_type_returns_empty(warehouse_type):
    """验证无效仓库类型返回空字符串"""
    warehouse = Warehouse(warehouse_type=warehouse_type)
    assert get_warehouse_unit(warehouse) == ''
```

### 测试框架

- 后端：pytest + hypothesis
- 前端：vitest + fast-check（如需要）
