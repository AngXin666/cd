# Design Document

## Overview

本设计文档定义了车辆验证逻辑的测试策略。车辆验证模块 (`utils/vehicle.ts`) 提供了一组工具函数，用于统一判断车辆的有效性、可还车状态和活跃状态。这些函数被多个页面复用，确保业务逻辑的一致性。

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Vehicle Validation Module                 │
│                    (utils/vehicle.ts)                        │
├─────────────────────────────────────────────────────────────┤
│  isValidVehicle(vehicle)                                     │
│  ├── 检查 license_plate 非空                                 │
│  └── 检查 status 为 ACTIVE 或 PICKED_UP                      │
├─────────────────────────────────────────────────────────────┤
│  canReturnVehicle(vehicle)                                   │
│  ├── 调用 isValidVehicle()                                   │
│  ├── 检查 return_time 为空                                   │
│  └── 检查 review_status 为 'approved'                        │
├─────────────────────────────────────────────────────────────┤
│  isActiveVehicle(vehicle)                                    │
│  ├── 检查 status 为 ACTIVE 或 PICKED_UP                      │
│  └── 检查 return_time 为空                                   │
├─────────────────────────────────────────────────────────────┤
│  getValidVehicles(vehicles, userId?)                         │
│  ├── 可选按 user_id 过滤                                     │
│  └── 调用 isValidVehicle() 过滤                              │
├─────────────────────────────────────────────────────────────┤
│  getValidPlateNumbers(vehicles, userId)                      │
│  ├── 调用 getValidVehicles()                                 │
│  └── 提取 license_plate 字段                                 │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 依赖类型

```typescript
// 车辆状态枚举
enum VehicleStatus {
  ACTIVE = 'active',
  PICKED_UP = 'picked_up',
  RETURNED = 'returned',
  REVIEWING = 'reviewing',
}

// 车辆接口（简化版，仅包含验证相关字段）
interface Vehicle {
  id: number;
  user_id: number;
  license_plate: string;
  status: VehicleStatus;
  return_time?: string | null;
  review_status?: 'drafting' | 'pending_review' | 'need_supplement' | 'approved';
}
```

### 函数签名

```typescript
// 判断车辆是否有效
function isValidVehicle(vehicle: Vehicle): boolean

// 判断车辆是否可以还车
function canReturnVehicle(vehicle: Vehicle): boolean

// 判断车辆是否处于活跃使用状态
function isActiveVehicle(vehicle: Vehicle): boolean

// 获取用户的有效车辆列表
function getValidVehicles(vehicles: Vehicle[], userId?: number): Vehicle[]

// 获取用户的有效车牌号列表
function getValidPlateNumbers(vehicles: Vehicle[], userId: number): string[]
```

## Data Models

测试数据生成器需要生成以下数据：

1. **有效车牌号**: 非空、非纯空白的字符串
2. **无效车牌号**: 空字符串或纯空白字符串
3. **有效状态**: ACTIVE 或 PICKED_UP
4. **无效状态**: RETURNED 或 REVIEWING
5. **审核状态**: 'drafting' | 'pending_review' | 'need_supplement' | 'approved'

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: 有效车辆判断正确性

*For any* 车辆，如果车牌号非空且非纯空白，并且状态为 ACTIVE 或 PICKED_UP，则 isValidVehicle 应返回 true；否则返回 false。

**Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6**

### Property 2: 无效车牌必定无效

*For any* 车辆，如果车牌号为空字符串或仅包含空白字符，则 isValidVehicle 应返回 false，无论状态如何。

**Validates: Requirements 1.3, 1.4**

### Property 3: 无效状态必定无效

*For any* 车辆，如果状态为 RETURNED 或 REVIEWING，则 isValidVehicle 应返回 false，无论车牌号如何。

**Validates: Requirements 1.5, 1.6**

### Property 4: 可还车条件完整性

*For any* 车辆，canReturnVehicle 返回 true 当且仅当：isValidVehicle 返回 true AND return_time 为空 AND review_status 为 'approved'。

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

### Property 5: 无效车辆不可还车

*For any* 无效车辆（isValidVehicle 返回 false），canReturnVehicle 必定返回 false。

**Validates: Requirements 2.2**

### Property 6: 活跃车辆判断正确性

*For any* 车辆，isActiveVehicle 返回 true 当且仅当：状态为 ACTIVE 或 PICKED_UP AND return_time 为空。

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

### Property 7: 有效车辆列表过滤正确性

*For any* 车辆列表和用户ID，getValidVehicles 返回的列表中每个车辆都满足：
1. isValidVehicle 返回 true
2. 如果指定了用户ID，则 user_id 匹配

**Validates: Requirements 4.1, 4.2, 4.3**

### Property 8: 过滤不增加元素

*For any* 车辆列表，getValidVehicles 返回的列表长度小于等于原列表长度。

**Validates: Requirements 4.4**

### Property 9: 车牌号列表一致性

*For any* 车辆列表和用户ID，getValidPlateNumbers 返回的列表长度等于 getValidVehicles 返回的列表长度，且每个车牌号都是非空字符串。

**Validates: Requirements 5.1, 5.2, 5.3**

## Error Handling

车辆验证函数不抛出异常，而是返回布尔值或空数组：

- `isValidVehicle`: 对于任何输入返回 boolean
- `canReturnVehicle`: 对于任何输入返回 boolean
- `isActiveVehicle`: 对于任何输入返回 boolean
- `getValidVehicles`: 对于空列表返回空数组
- `getValidPlateNumbers`: 对于空列表返回空数组

## Testing Strategy

### 测试框架

- **单元测试**: Vitest
- **属性测试**: fast-check

### 测试类型

1. **属性测试 (Property-Based Testing)**
   - 使用 fast-check 生成随机车辆数据
   - 验证上述 9 个正确性属性
   - 每个属性测试运行 100 次迭代

2. **边界测试 (Edge Cases)**
   - 空字符串车牌号
   - 纯空白字符车牌号
   - 空车辆列表
   - 单元素列表

### 测试文件

- 位置: `fleet-manager/frontend/src/utils/__tests__/vehicle.pbt.test.ts`
- 命名规范: `*.pbt.test.ts` 表示属性测试文件

