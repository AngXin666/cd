# Design Document: 统一仓库切换器逻辑

## Overview

本设计旨在统一整个项目中仓库切换器的显示逻辑，通过创建共享的工具函数来处理仓库过滤，确保各端（司机端、车队长端、老板端）的行为一致。

核心设计原则：
1. **单一职责**：每个工具函数只负责一种过滤逻辑
2. **可组合性**：工具函数可以组合使用以满足不同场景
3. **向后兼容**：重构不改变现有功能行为

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    工具函数层 (utils/warehouse.ts)           │
├─────────────────────────────────────────────────────────────┤
│  filterWarehousesWithData()     - 过滤有数据的仓库          │
│  filterWarehousesWithDrivers()  - 过滤有司机的仓库          │
│  filterWarehousesWithDataOrDrivers() - 过滤有数据或司机的仓库│
│  shouldShowWarehouseSwitcher()  - 判断是否显示切换器        │
│  getWarehouseDriverCount()      - 获取仓库司机数量          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        页面层                                │
├─────────────────────────────────────────────────────────────┤
│  司机端首页              - 使用 filterWarehousesWithData    │
│  车队长端首页            - 使用 filterWarehousesWithDataOrDrivers │
│  老板端首页              - 使用 filterWarehousesWithDataOrDrivers │
│  车队长端司机管理页面    - 使用 filterWarehousesWithDrivers │
│  车队长端考勤/数据页面   - 使用 filterWarehousesWithDataOrDrivers │
│  老板端考勤/数据页面     - 使用 filterWarehousesWithDataOrDrivers │
│  老板端用户管理页面      - 使用 filterWarehousesWithDrivers │
└─────────────────────────────────────────────────────────────┘
```

## 受影响的页面清单

| 页面 | 路径 | 当前逻辑 | 目标逻辑 | 说明 |
|------|------|----------|----------|------|
| 司机端首页 | `/pages/driver/index/index.vue` | `warehouses.length > 1` | `filterWarehousesWithData` | 只显示有计件数据的仓库 |
| 司机端计件录入 | `/pages/driver/piece-work/entry.vue` | 显示所有仓库 | 保持不变 | 录入时需要选择所有可用仓库 |
| 司机端计件记录 | `/pages/driver/piece-work/list.vue` | 显示所有仓库 | `filterWarehousesWithData` | 只显示有数据的仓库 |
| 车队长端首页 | `/pages/manager/index/index.vue` | `warehouses.length > 0` | `filterWarehousesWithDataOrDrivers` | 只显示有数据或司机的仓库 |
| 车队长端司机管理 | `/pages/manager/drivers/index.vue` | `warehouses.length > 1` | `filterWarehousesWithDrivers` | 只显示有司机的仓库 |
| 车队长端数据统计 | `/pages/manager/stats/index.vue` | 显示所有仓库 | `filterWarehousesWithData` | 只显示有数据的仓库 |
| 老板端首页 | `/pages/boss/index/index.vue` | `warehouses.length > 0` | `filterWarehousesWithDataOrDrivers` | 只显示有数据或司机的仓库 |
| 老板端用户管理 | `/pages/boss/users/index.vue` | `warehouseOptions.length > 1` | `filterWarehousesWithDrivers` | 只显示有司机的仓库 |
| 老板端考勤管理 | `/pages/boss/attendance/index.vue` | `warehouses.length > 1` | `filterWarehousesWithDataOrDrivers` | 只显示有数据或司机的仓库 |

### 不需要修改的页面

| 页面 | 路径 | 原因 |
|------|------|------|
| 司机端计件录入 | `/pages/driver/piece-work/entry.vue` | 录入时需要选择所有可用仓库 |
| 司机端请假申请 | `/pages/driver/leave/apply.vue` | 请假时需要选择所有可用仓库 |
| 老板端仓库管理 | `/pages/boss/warehouses/index.vue` | 管理页面需要显示所有仓库 |
| 车队长端品类配置 | `/pages/manager/warehouse-categories/index.vue` | 配置页面需要显示所有仓库 |

## Components and Interfaces

### 1. 工具函数接口

```typescript
/**
 * 仓库过滤选项
 */
interface WarehouseFilterOptions {
  /** 仓库列表 */
  warehouses: Warehouse[]
  /** 仓库数据映射 (warehouseId -> hasData) */
  warehouseDataMap?: Map<number, boolean>
  /** 仓库司机数量映射 (warehouseId -> driverCount) */
  warehouseDriverCountMap?: Map<number, number>
  /** 用户仓库分配映射 (userId -> warehouseIds[]) */
  userWarehouseIdsMap?: Map<number, number[]>
  /** 用户列表（用于统计司机数量） */
  users?: User[]
  /** 角色过滤（用于统计特定角色的用户） */
  roleFilter?: UserRole
}

/**
 * 过滤有数据的仓库
 * @param options - 过滤选项
 * @returns 有数据的仓库列表
 */
function filterWarehousesWithData(options: WarehouseFilterOptions): Warehouse[]

/**
 * 过滤有司机的仓库
 * @param options - 过滤选项
 * @returns 有司机的仓库列表
 */
function filterWarehousesWithDrivers(options: WarehouseFilterOptions): Warehouse[]

/**
 * 过滤有数据或有司机的仓库
 * @param options - 过滤选项
 * @returns 有数据或有司机的仓库列表
 */
function filterWarehousesWithDataOrDrivers(options: WarehouseFilterOptions): Warehouse[]

/**
 * 判断是否应该显示仓库切换器
 * @param filteredWarehouses - 过滤后的仓库列表
 * @returns 是否显示切换器
 */
function shouldShowWarehouseSwitcher(filteredWarehouses: Warehouse[]): boolean

/**
 * 获取仓库的司机数量
 * @param warehouseId - 仓库ID
 * @param options - 过滤选项
 * @returns 司机数量
 */
function getWarehouseDriverCount(warehouseId: number, options: WarehouseFilterOptions): number
```

### 2. 页面使用示例

```typescript
// 司机端首页
const validWarehouses = computed(() => {
  return filterWarehousesWithData({
    warehouses: warehouses.value,
    warehouseDataMap: warehouseDataMap.value,
  })
})

const showSwitcher = computed(() => {
  return shouldShowWarehouseSwitcher(validWarehouses.value)
})

// 用户管理页面
const validWarehouses = computed(() => {
  return filterWarehousesWithDrivers({
    warehouses: warehouses.value,
    userWarehouseIdsMap: userWarehouseIdsMap.value,
    users: users.value,
    roleFilter: UserRole.DRIVER,
  })
})
```

## Data Models

### 输入数据结构

```typescript
interface Warehouse {
  id: number
  name: string
  address: string | null
  is_active: boolean
  created_at: string
  warehouse_type: WarehouseType
  preset_unit: string
}

interface User {
  id: number
  name: string
  role: UserRole
  // ... other fields
}
```

### 内部数据结构

```typescript
// 仓库数据映射：记录每个仓库是否有数据
type WarehouseDataMap = Map<number, boolean>

// 仓库司机数量映射：记录每个仓库的司机数量
type WarehouseDriverCountMap = Map<number, number>

// 用户仓库分配映射：记录每个用户分配的仓库ID列表
type UserWarehouseIdsMap = Map<number, number[]>
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: 仓库切换器显示条件正确性

*For any* 仓库列表，当过滤后的有效仓库数量小于等于1时，shouldShowWarehouseSwitcher 应返回 false；当数量大于1时，应返回 true。

**Validates: Requirements 1.1, 1.2, 1.3**

### Property 2: 有数据仓库过滤正确性

*For any* 仓库列表和数据映射，filterWarehousesWithData 返回的仓库列表应只包含在数据映射中标记为有数据的仓库。

**Validates: Requirements 2.1, 2.2, 2.3**

### Property 3: 有司机仓库过滤正确性

*For any* 仓库列表、用户列表和用户仓库分配映射，filterWarehousesWithDrivers 返回的仓库列表应只包含至少有一个司机分配的仓库。

**Validates: Requirements 5.1, 5.2**

### Property 4: 有数据或司机仓库过滤正确性

*For any* 仓库列表、数据映射和司机分配映射，filterWarehousesWithDataOrDrivers 返回的仓库列表应包含所有有数据或有司机的仓库，且不包含既无数据也无司机的仓库。

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4**

## Error Handling

1. **空仓库列表**：当仓库列表为空时，所有过滤函数返回空数组
2. **空映射**：当数据映射或司机映射为空时，视为所有仓库都没有数据/司机
3. **无效仓库ID**：忽略映射中不存在于仓库列表的ID

## Testing Strategy

### 单元测试

- 测试各工具函数的基本功能
- 测试边界情况（空列表、单个仓库、全部有数据/无数据等）
- 测试错误处理

### 属性测试

使用 Vitest + fast-check 进行属性测试：

1. **Property 1**: 生成随机仓库列表，验证 shouldShowWarehouseSwitcher 的返回值与列表长度的关系
2. **Property 2**: 生成随机仓库和数据映射，验证过滤结果只包含有数据的仓库
3. **Property 3**: 生成随机仓库、用户和分配映射，验证过滤结果只包含有司机的仓库
4. **Property 4**: 生成随机仓库、数据映射和司机映射，验证过滤结果的正确性

每个属性测试运行至少 100 次迭代。
