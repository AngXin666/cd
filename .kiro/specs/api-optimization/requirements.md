# Requirements Document

## Introduction

基于 E2E 测试报告发现的 API 调用问题，对司机端应用进行全面的 API 优化，包括消除重复请求、添加数据缓存、合并批量查询、优化慢查询。

## Glossary

- **重复请求**: 同一页面内，同一 API 被调用 2 次以上
- **请求过多**: 页面加载时 API 调用超过 10 次
- **慢请求**: API 响应时间超过 500ms
- **数据缓存**: 使用内存或本地存储缓存 API 响应数据
- **批量查询**: 将多个单独的查询合并为一个查询

## 问题页面清单（来自 E2E 测试报告）

### 高优先级（请求过多 + 重复请求严重）

1. **归还车辆页面** - 165 次 API 调用（页面有 bug，无限循环）
   - auth:user: 53 次
   - users: 83 次
   - app_versions: 15 次

2. **计件记录页面** - 32 次 API 调用
   - users: 12 次
   - piece_work_records: 5 次
   - auth:user: 5 次
   - piece_work_categories: 4 次

3. **登录页面** - 31 次 API 调用
   - users: 5 次
   - auth:user: 4 次
   - attendance: 3 次
   - leave_applications: 3 次

4. **司机工作台** - 26 次 API 调用
   - attendance: 6 次
   - leave_applications: 4 次
   - users: 3 次
   - auth:user: 3 次

5. **计件录入** - 25 次 API 调用
   - category_prices: 9 次
   - piece_work_categories: 4 次
   - users: 3 次

### 中优先级（重复请求）

6. **请假申请** - 14 次 API 调用
   - leave_applications: 4 次
   - auth:user: 2 次

7. **申请请假** - 8 次 API 调用
   - leave_applications: 4 次
   - warehouses: 3 次

8. **考勤打卡** - 7 次 API 调用
   - attendance: 4 次

### 慢请求页面

1. **车辆列表** - warehouse_assignments: 2642ms
2. **设置页面** - attendance: 2544ms
3. **申请请假** - leave_applications: 1208ms
4. **登录页面** - app_versions: 1195ms, auth:token: 653ms

## Requirements

### Requirement 1: 修复归还车辆页面无限循环

**User Story:** As a 开发者, I want to 修复归还车辆页面的无限循环问题, so that 页面不会发起 165 次 API 调用。

#### Acceptance Criteria

1. WHEN 进入归还车辆页面 THEN the System SHALL 只发起必要的 API 调用（不超过 10 次）
2. WHEN 页面加载完成 THEN the System SHALL 停止发起新的 API 请求
3. WHEN 检查 useEffect 依赖 THEN the System SHALL 确保依赖数组正确设置

### Requirement 2: 优化 useEffect 依赖

**User Story:** As a 开发者, I want to 检查并修复所有页面的 useEffect 依赖, so that 避免重复请求。

#### Acceptance Criteria

1. WHEN useEffect 中调用 API THEN the System SHALL 确保依赖数组只包含必要的依赖
2. WHEN 组件重新渲染 THEN the System SHALL 不触发不必要的 API 调用
3. WHEN 依赖值未变化 THEN the System SHALL 不重新执行 useEffect

### Requirement 3: 添加数据缓存机制

**User Story:** As a 开发者, I want to 添加数据缓存机制, so that 相同的数据不需要重复请求。

#### Acceptance Criteria

1. WHEN 请求用户信息 THEN the System SHALL 优先从缓存读取
2. WHEN 缓存数据过期 THEN the System SHALL 重新请求并更新缓存
3. WHEN 用户登出 THEN the System SHALL 清空所有缓存

### Requirement 4: 合并批量查询

**User Story:** As a 开发者, I want to 合并多个相关的查询, so that 减少 API 调用次数。

#### Acceptance Criteria

1. WHEN 页面需要多个相关数据 THEN the System SHALL 使用单个查询获取
2. WHEN 使用 Supabase 查询 THEN the System SHALL 利用 select 的关联查询功能
3. WHEN 需要多个表的数据 THEN the System SHALL 考虑使用 RPC 函数

### Requirement 5: 优化慢查询

**User Story:** As a 开发者, I want to 优化慢查询, so that API 响应时间低于 500ms。

#### Acceptance Criteria

1. WHEN 查询 warehouse_assignments THEN the System SHALL 响应时间低于 500ms
2. WHEN 查询 attendance THEN the System SHALL 响应时间低于 500ms
3. WHEN 查询 leave_applications THEN the System SHALL 响应时间低于 500ms
