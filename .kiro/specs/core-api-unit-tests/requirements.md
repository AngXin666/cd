# Requirements Document

## Introduction

本规范旨在为项目核心 API 层建立全面的单元测试覆盖，确保：
1. 所有 API 层函数都有对应的单元测试
2. 测试覆盖正常流程、边界条件和错误处理
3. 验证 API 层正确调用 Repository 层
4. 确保数据修改操作正确触发缓存失效

## Glossary

- **API 层**: `src/db/api/*.ts` 文件，作为 Repository 层的包装器，提供业务逻辑
- **Repository 层**: `src/db/repositories/*.ts` 文件，提供数据访问和缓存管理
- **单元测试**: 针对单个函数或模块的独立测试
- **Mock**: 模拟依赖项的测试替身
- **TTL**: Time To Live，缓存过期时间

## Requirements

### Requirement 1: 用户管理 API 测试 (users.ts)

**User Story:** 作为开发者，我希望用户管理 API 有完整的单元测试，以确保用户数据操作的正确性。

#### Acceptance Criteria

1. WHEN 调用 `getAllProfiles()` THEN 系统 SHALL 返回所有用户档案列表
2. WHEN 调用 `getDriverProfiles()` THEN 系统 SHALL 返回所有司机档案（带权限过滤）
3. WHEN 调用 `getAllDriversWithRealName()` THEN 系统 SHALL 返回司机档案及实名信息
4. WHEN 调用 `getCurrentUserProfile()` THEN 系统 SHALL 返回当前登录用户档案
5. WHEN 调用 `updateUserProfile()` THEN 系统 SHALL 更新用户信息并清除缓存
6. WHEN 用户不存在 THEN 系统 SHALL 返回 null 或空数组
7. WHEN 数据库查询失败 THEN 系统 SHALL 记录错误并返回适当的默认值

### Requirement 2: 仓库管理 API 测试 (warehouses.ts)

**User Story:** 作为开发者，我希望仓库管理 API 有完整的单元测试，以确保仓库数据操作的正确性。

#### Acceptance Criteria

1. WHEN 调用 `getAllWarehouses()` THEN 系统 SHALL 返回所有仓库列表
2. WHEN 调用 `getActiveWarehouses()` THEN 系统 SHALL 返回所有启用的仓库
3. WHEN 调用 `getManagerWarehouses(managerId)` THEN 系统 SHALL 返回管理员管辖的仓库
4. WHEN 调用 `getDriverWarehouses(driverId)` THEN 系统 SHALL 返回司机分配的仓库
5. WHEN 调用 `getAllDriverWarehouses()` THEN 系统 SHALL 返回所有仓库-司机分配关系
6. WHEN 调用 `assignDriverToWarehouse()` THEN 系统 SHALL 创建分配关系并清除缓存
7. WHEN 调用 `removeDriverFromWarehouse()` THEN 系统 SHALL 删除分配关系并清除缓存

### Requirement 3: 考勤管理 API 测试 (attendance.ts)

**User Story:** 作为开发者，我希望考勤管理 API 有完整的单元测试，以确保考勤数据操作的正确性。

#### Acceptance Criteria

1. WHEN 调用 `getAttendanceRecords()` THEN 系统 SHALL 返回指定日期范围的考勤记录
2. WHEN 调用 `checkIn()` THEN 系统 SHALL 创建签到记录并清除缓存
3. WHEN 调用 `checkOut()` THEN 系统 SHALL 更新签退记录并清除缓存
4. WHEN 调用 `getTodayAttendance()` THEN 系统 SHALL 返回当天的考勤状态
5. WHEN 重复签到 THEN 系统 SHALL 返回错误或更新现有记录
6. WHEN 未签到就签退 THEN 系统 SHALL 返回适当的错误信息

### Requirement 4: 计件管理 API 测试 (piecework.ts)

**User Story:** 作为开发者，我希望计件管理 API 有完整的单元测试，以确保计件数据操作的正确性。

#### Acceptance Criteria

1. WHEN 调用 `getPieceWorkRecords()` THEN 系统 SHALL 返回指定日期范围的计件记录
2. WHEN 调用 `createPieceWorkRecord()` THEN 系统 SHALL 创建计件记录并清除缓存
3. WHEN 调用 `updatePieceWorkRecord()` THEN 系统 SHALL 更新计件记录并清除缓存
4. WHEN 调用 `deletePieceWorkRecord()` THEN 系统 SHALL 删除计件记录并清除缓存
5. WHEN 调用 `getCategories()` THEN 系统 SHALL 返回品类列表
6. WHEN 调用 `getCategoryPrices()` THEN 系统 SHALL 返回品类价格配置

### Requirement 5: 请假管理 API 测试 (leave.ts)

**User Story:** 作为开发者，我希望请假管理 API 有完整的单元测试，以确保请假数据操作的正确性。

#### Acceptance Criteria

1. WHEN 调用 `getLeaveRequests()` THEN 系统 SHALL 返回请假申请列表
2. WHEN 调用 `createLeaveRequest()` THEN 系统 SHALL 创建请假申请并清除缓存
3. WHEN 调用 `approveLeaveRequest()` THEN 系统 SHALL 更新审批状态并清除缓存
4. WHEN 调用 `rejectLeaveRequest()` THEN 系统 SHALL 更新拒绝状态并清除缓存
5. WHEN 请假日期冲突 THEN 系统 SHALL 返回适当的错误信息
6. WHEN 审批已处理的请假 THEN 系统 SHALL 返回错误或忽略操作

### Requirement 6: 通知管理 API 测试 (notifications.ts)

**User Story:** 作为开发者，我希望通知管理 API 有完整的单元测试，以确保通知数据操作的正确性。

#### Acceptance Criteria

1. WHEN 调用 `getNotifications()` THEN 系统 SHALL 返回用户的通知列表
2. WHEN 调用 `createNotification()` THEN 系统 SHALL 创建通知并清除缓存
3. WHEN 调用 `markAsRead()` THEN 系统 SHALL 标记通知为已读并清除缓存
4. WHEN 调用 `markAllAsRead()` THEN 系统 SHALL 标记所有通知为已读
5. WHEN 调用 `getUnreadCount()` THEN 系统 SHALL 返回未读通知数量

### Requirement 7: 测试基础设施

**User Story:** 作为开发者，我希望有统一的测试基础设施，以简化测试编写和维护。

#### Acceptance Criteria

1. WHEN 编写新测试 THEN 开发者 SHALL 使用统一的 Mock 工厂函数
2. WHEN 测试需要模拟 Supabase THEN 系统 SHALL 提供标准化的 Mock 配置
3. WHEN 测试需要模拟 Repository THEN 系统 SHALL 提供标准化的 Mock 配置
4. WHEN 运行测试 THEN 系统 SHALL 在 2 分钟内完成所有单元测试

## 现有测试覆盖情况

### 已有测试文件

| 文件 | 测试内容 | 覆盖程度 |
|------|---------|---------|
| `src/db/api/cache-consistency.test.ts` | 缓存一致性验证 | ✅ 完整 |
| `src/db/api/vehicles.test.ts` | 车辆管理 API | ✅ 完整 |
| `src/db/repositories/__tests__/*.test.ts` | Repository 层测试 | ✅ 完整 |

### 需要新增测试的 API 文件

| 文件 | 优先级 | 说明 |
|------|--------|------|
| `src/db/api/users.ts` | 高 | 用户管理核心功能 |
| `src/db/api/warehouses.ts` | 高 | 仓库管理核心功能 |
| `src/db/api/attendance.ts` | 中 | 考勤管理功能 |
| `src/db/api/piecework.ts` | 中 | 计件管理功能 |
| `src/db/api/leave.ts` | 中 | 请假管理功能 |
| `src/db/api/notifications.ts` | 低 | 通知管理功能 |

## 测试策略

### 测试类型

1. **单元测试**: 测试单个函数的输入输出
2. **Mock 测试**: 模拟 Repository 和 Supabase 依赖
3. **边界测试**: 测试空值、null、undefined 等边界情况
4. **错误处理测试**: 测试异常情况的处理

### 测试框架

- **Vitest**: 测试运行器
- **vi.mock**: 模块模拟
- **vi.fn**: 函数模拟

### 测试覆盖率目标

- 核心 API 函数覆盖率 > 80%
- 关键业务逻辑覆盖率 > 90%
- 错误处理路径覆盖率 > 70%

