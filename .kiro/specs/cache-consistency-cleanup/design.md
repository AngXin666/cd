# Design Document

## Overview

本设计文档描述如何统一项目中的缓存策略和数据获取逻辑，确保缓存一致性和代码复用。

## Architecture

### 当前架构问题

```
┌─────────────────────────────────────────────────────────────────┐
│                         页面层                                   │
├─────────────────────────────────────────────────────────────────┤
│  ❌ 页面级缓存 (getVersionedCache/setVersionedCache)            │
│  ❌ 重复的数据获取逻辑                                           │
│  ❌ 不一致的仓库-司机筛选逻辑                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         API 层                                   │
├─────────────────────────────────────────────────────────────────┤
│  ✅ 已迁移到 Repository 模式                                     │
│  ✅ 统一的函数接口                                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Repository 层                               │
├─────────────────────────────────────────────────────────────────┤
│  ✅ 统一的缓存管理                                               │
│  ✅ 自动缓存失效                                                 │
│  ✅ 配置化的 TTL                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 目标架构

```
┌─────────────────────────────────────────────────────────────────┐
│                         页面层                                   │
├─────────────────────────────────────────────────────────────────┤
│  ✅ 直接调用 API 层函数                                          │
│  ✅ 无页面级缓存                                                 │
│  ✅ 统一的数据获取逻辑                                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         API 层                                   │
├─────────────────────────────────────────────────────────────────┤
│  ✅ Repository 模式包装器                                        │
│  ✅ 统一的函数接口                                               │
│  ✅ 事件发布（数据变更通知）                                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Repository 层                               │
├─────────────────────────────────────────────────────────────────┤
│  ✅ 统一的缓存管理                                               │
│  ✅ 自动缓存失效                                                 │
│  ✅ 配置化的 TTL                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 统一的仓库-司机关系获取模式

```typescript
// 推荐模式：在页面中构建 warehouseDriversMap
const loadData = async () => {
  // 1. 获取所有仓库-司机分配关系（Repository 缓存 TTL 5 分钟）
  const allDriverWarehouses = await WarehousesAPI.getAllDriverWarehouses()
  
  // 2. 构建仓库ID -> 司机ID列表的映射
  const warehouseDriversMapping = new Map<string, string[]>()
  for (const assignment of allDriverWarehouses) {
    const warehouseId = assignment.warehouse_id
    if (!warehouseDriversMapping.has(warehouseId)) {
      warehouseDriversMapping.set(warehouseId, [])
    }
    warehouseDriversMapping.get(warehouseId)!.push(assignment.user_id)
  }
  setWarehouseDriversMap(warehouseDriversMapping)
}

// 3. 按仓库筛选司机
const filterDriversByWarehouse = (drivers: Driver[], warehouseId: string) => {
  const assignedDriverIds = warehouseDriversMap.get(warehouseId) || []
  return drivers.filter(d => assignedDriverIds.includes(d.id))
}
```

### 移除页面级缓存的模式

```typescript
// ❌ 旧模式：页面级缓存
const loadData = async (forceRefresh = false) => {
  if (!forceRefresh) {
    const cached = getVersionedCache<Data[]>(CACHE_KEY)
    if (cached) {
      setData(cached)
      return
    }
  }
  const data = await API.getData()
  setVersionedCache(CACHE_KEY, data, 5 * 60 * 1000)
  setData(data)
}

// ✅ 新模式：直接调用 API（Repository 层已有缓存）
const loadData = async () => {
  const data = await API.getData() // Repository 层自动处理缓存
  setData(data)
}
```

## Data Models

### 仓库分配关系

```typescript
interface DriverWarehouse {
  id: string
  user_id: string
  warehouse_id: string
  created_at: string
}
```

### 缓存键常量（保留必要的）

```typescript
// 保留用于事件订阅的缓存键
export const CACHE_KEYS = {
  // 用于 onDataUpdated 事件订阅
  WAREHOUSES: 'warehouses',
  USERS: 'users',
  // ... 其他必要的键
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: 缓存一致性

*For any* 数据修改操作，Repository 层 SHALL 自动清除相关缓存，确保下次查询获取最新数据。

**Validates: Requirements 1.2, 2.3, 3.3**

### Property 2: 数据获取统一性

*For any* 页面获取仓库-司机关系，SHALL 使用 `WarehousesAPI.getAllDriverWarehouses()` 并构建统一的映射结构。

**Validates: Requirements 2.1, 2.2**

### Property 3: 无重复缓存

*For any* 页面组件，SHALL NOT 使用 `getVersionedCache`/`setVersionedCache` 进行数据缓存。

**Validates: Requirements 1.1, 4.1, 4.2**

## Error Handling

- 如果 Repository 层查询失败，API 层应返回空数组或 null，并记录错误日志
- 页面层应处理空数据情况，显示适当的提示信息
- 缓存失效不应影响数据查询，只是会触发新的数据库查询

## Testing Strategy

### 单元测试

- 验证 Repository 层缓存正确工作
- 验证 API 层正确调用 Repository
- 验证缓存失效逻辑

### 集成测试

- 验证页面数据加载正确
- 验证数据修改后缓存正确失效
- 验证多页面数据一致性

### Property-Based Testing

使用 Vitest 进行属性测试：
- 测试缓存一致性属性
- 测试数据获取统一性属性
