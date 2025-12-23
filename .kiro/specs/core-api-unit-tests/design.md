# Design Document

## Overview

本设计文档描述如何为项目核心 API 层建立全面的单元测试覆盖，确保 API 层函数的正确性和可靠性。

## Architecture

### 测试架构

```
┌─────────────────────────────────────────────────────────────────┐
│                         测试层                                   │
├─────────────────────────────────────────────────────────────────┤
│  ✅ 单元测试文件 (*.test.ts)                                     │
│  ✅ Mock 工厂函数                                                │
│  ✅ 测试数据生成器                                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         API 层 (被测对象)                        │
├─────────────────────────────────────────────────────────────────┤
│  users.ts, warehouses.ts, attendance.ts                         │
│  piecework.ts, leave.ts, notifications.ts                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Mock 依赖                                   │
├─────────────────────────────────────────────────────────────────┤
│  ✅ Mock Repository 层                                           │
│  ✅ Mock Supabase 客户端                                         │
│  ✅ Mock 认证状态                                                │
└─────────────────────────────────────────────────────────────────┘
```

### 测试文件结构

```
src/db/api/
├── users.ts                    # 用户管理 API
├── users.test.ts               # 用户管理 API 测试 (新增)
├── warehouses.ts               # 仓库管理 API
├── warehouses.test.ts          # 仓库管理 API 测试 (新增)
├── attendance.ts               # 考勤管理 API
├── attendance.test.ts          # 考勤管理 API 测试 (新增)
├── piecework.ts                # 计件管理 API
├── piecework.test.ts           # 计件管理 API 测试 (新增)
├── leave.ts                    # 请假管理 API
├── leave.test.ts               # 请假管理 API 测试 (新增)
├── notifications.ts            # 通知管理 API
├── notifications.test.ts       # 通知管理 API 测试 (新增)
├── vehicles.ts                 # 车辆管理 API
├── vehicles.test.ts            # 车辆管理 API 测试 (已有)
├── cache-consistency.test.ts   # 缓存一致性测试 (已有)
└── __mocks__/                  # Mock 工厂函数 (新增)
    ├── supabase.ts             # Supabase Mock
    └── repositories.ts         # Repository Mock
```

## Components and Interfaces

### Mock 工厂函数

```typescript
// src/db/api/__mocks__/supabase.ts
export const createMockSupabaseClient = () => ({
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  gte: vi.fn().mockReturnThis(),
  lte: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn(),
  single: vi.fn(),
  auth: {
    getUser: vi.fn()
  }
})

// src/db/api/__mocks__/repositories.ts
export const createMockUsersRepository = () => ({
  getAllUsers: vi.fn(),
  getAllDrivers: vi.fn(),
  getAllManagers: vi.fn(),
  getById: vi.fn(),
  invalidateCache: vi.fn()
})

export const createMockWarehousesRepository = () => ({
  getAll: vi.fn(),
  getById: vi.fn(),
  invalidateCache: vi.fn()
})
```

### 测试数据生成器

```typescript
// 用户测试数据
export const createMockUser = (overrides = {}) => ({
  id: 'user-001',
  name: '测试用户',
  phone: '13800138000',
  role: 'DRIVER',
  tenant_id: 'tenant-001',
  created_at: '2024-01-01T00:00:00Z',
  ...overrides
})

// 仓库测试数据
export const createMockWarehouse = (overrides = {}) => ({
  id: 'wh-001',
  name: '测试仓库',
  is_active: true,
  tenant_id: 'tenant-001',
  created_at: '2024-01-01T00:00:00Z',
  ...overrides
})
```

## Data Models

### 测试用数据模型

```typescript
// 用户档案
interface UserProfile {
  id: string
  name: string
  phone: string
  role: 'BOSS' | 'MANAGER' | 'DRIVER'
  tenant_id: string
}

// 仓库
interface Warehouse {
  id: string
  name: string
  is_active: boolean
  tenant_id: string
}

// 仓库分配
interface WarehouseAssignment {
  id: string
  user_id: string
  warehouse_id: string
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: 用户查询 API 返回正确数据

*For any* 用户查询 API 调用，返回的数据 SHALL 与 Repository 层返回的数据一致，且符合角色过滤条件。

**Validates: Requirements 1.1, 1.2, 1.3**

### Property 2: 用户数据修改触发缓存失效

*For any* 用户数据修改操作（更新、删除），系统 SHALL 调用 `invalidateCache()` 清除相关缓存。

**Validates: Requirements 1.5**

### Property 3: 仓库查询 API 返回正确数据

*For any* 仓库查询 API 调用，返回的数据 SHALL 与 Repository 层返回的数据一致，且符合过滤条件（如 is_active、managerId、driverId）。

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**

### Property 4: 仓库分配操作触发缓存失效

*For any* 仓库分配操作（创建、删除），系统 SHALL 调用 `invalidateCache()` 清除相关缓存。

**Validates: Requirements 2.6, 2.7**

### Property 5: 考勤 CRUD 操作正确性

*For any* 考勤 CRUD 操作，系统 SHALL 正确执行数据库操作并在修改操作后清除缓存。

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

### Property 6: 计件 CRUD 操作正确性

*For any* 计件 CRUD 操作，系统 SHALL 正确执行数据库操作并在修改操作后清除缓存。

**Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6**

### Property 7: 请假 CRUD 操作正确性

*For any* 请假 CRUD 操作，系统 SHALL 正确执行数据库操作并在修改操作后清除缓存。

**Validates: Requirements 5.1, 5.2, 5.3, 5.4**

### Property 8: 通知 CRUD 操作正确性

*For any* 通知 CRUD 操作，系统 SHALL 正确执行数据库操作并在修改操作后清除缓存。

**Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5**

### Property 9: 边界条件处理正确性

*For any* 不存在的资源查询或错误情况，系统 SHALL 返回适当的默认值（null、空数组）而不是抛出异常。

**Validates: Requirements 1.6, 1.7, 3.5, 3.6, 5.5, 5.6**

## Error Handling

### 测试中的错误处理

- Mock 返回错误时，验证 API 函数正确处理并返回默认值
- 验证错误日志被正确记录
- 验证异常不会传播到调用方

### 边界条件测试

- 空输入参数
- 不存在的资源 ID
- 重复操作（如重复签到）
- 状态冲突（如审批已处理的请假）

## Testing Strategy

### 单元测试

使用 Vitest 进行单元测试：

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('UsersAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getAllProfiles', () => {
    it('应该返回所有用户档案', async () => {
      // 准备
      mockUsersRepository.getAllUsers.mockResolvedValue([mockUser])
      
      // 执行
      const result = await UsersAPI.getAllProfiles()
      
      // 验证
      expect(result).toHaveLength(1)
      expect(mockUsersRepository.getAllUsers).toHaveBeenCalled()
    })
  })
})
```

### Property-Based Testing

使用 Vitest 进行属性测试：

```typescript
/**
 * Property 1: 用户查询 API 返回正确数据
 * **Feature: core-api-unit-tests, Property 1**
 * **Validates: Requirements 1.1, 1.2, 1.3**
 */
it('用户查询 API 应返回与 Repository 一致的数据', async () => {
  // 生成随机用户数据
  const mockUsers = generateRandomUsers(10)
  mockUsersRepository.getAllUsers.mockResolvedValue(mockUsers)
  
  // 执行
  const result = await UsersAPI.getAllProfiles()
  
  // 验证：返回数据与 Repository 一致
  expect(result).toEqual(mockUsers)
})
```

### 测试覆盖率目标

| 模块 | 目标覆盖率 |
|------|-----------|
| users.ts | > 80% |
| warehouses.ts | > 80% |
| attendance.ts | > 70% |
| piecework.ts | > 70% |
| leave.ts | > 70% |
| notifications.ts | > 70% |

### 测试命名规范

- 测试文件：`{module}.test.ts`
- 测试套件：`describe('{模块名}API', () => {})`
- 测试用例：`it('应该{预期行为}', async () => {})`

