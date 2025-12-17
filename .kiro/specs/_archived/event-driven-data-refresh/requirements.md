# 事件驱动数据刷新系统需求文档

## Introduction

本项目当前使用定时轮询（Polling）机制来检测数据变化并更新 UI，这导致了大量不必要的 API 请求，增加了服务器负载和客户端资源消耗。本需求旨在将轮询机制改为**混合事件驱动机制**：

**核心场景**：司机在 APP 提交请假，管理员在网页审批

**现有方案问题**：
- 管理员不知道有新申请，需要手动刷新或等待轮询
- 轮询导致大量不必要的 API 请求

**新方案（混合策略）**：
1. **司机 APP**：提交请假后，通过**本地事件总线**刷新自己的页面
2. **管理员网页**：通过 **Supabase Realtime** 订阅数据库变更，自动收到通知并刷新审批页面

**效果**：管理员立即收到通知，页面自动刷新，无需轮询。

## Glossary

- **轮询 (Polling)**: 定时向服务器发送请求检查数据是否有变化的机制
- **事件驱动 (Event-Driven)**: 当数据变化时主动通知客户端的机制
- **本地事件总线 (Local Event Bus)**: 同一客户端内组件间通信的发布-订阅模式实现
- **Supabase Realtime**: Supabase 提供的实时数据订阅功能，用于跨端实时通知
- **数据刷新 (Data Refresh)**: 重新从服务器获取最新数据并更新 UI
- **发布 (Publish)**: 向事件总线发送事件通知
- **订阅 (Subscribe)**: 监听事件总线上的特定事件
- **混合策略 (Hybrid Strategy)**: 结合本地事件和 Realtime 订阅的方案

## Requirements

### Requirement 1

**User Story:** As a developer, I want to identify and remove unnecessary polling code, so that the codebase is clean and efficient.

#### Acceptance Criteria

1. WHEN analyzing the codebase THEN the system SHALL identify all polling-based data refresh implementations
2. WHEN polling code is identified THEN the system SHALL document which components use polling and their refresh intervals
3. WHEN removing polling THEN the system SHALL ensure no functionality is lost by replacing with event-driven updates

### Requirement 2

**User Story:** As a driver, I want my own pages to refresh immediately after I submit an application, so that I can see my submission without manual refresh.

#### Acceptance Criteria

1. WHEN a driver submits a leave application THEN the system SHALL emit a local `leave:created` event via Event Bus
2. WHEN a driver submits a resignation application THEN the system SHALL emit a local `resignation:created` event via Event Bus
3. WHEN a driver creates an attendance record THEN the system SHALL emit a local `attendance:created` event via Event Bus
4. WHEN a driver creates or updates a piece work record THEN the system SHALL emit the corresponding local event via Event Bus
5. WHEN a local event is emitted THEN the driver's current page SHALL refresh automatically within 500ms

### Requirement 3

**User Story:** As a manager, I want to receive real-time notifications when drivers submit new applications, so that I can review them promptly without manual refresh.

#### Acceptance Criteria

1. WHEN a new leave application is inserted into the database THEN the manager's page SHALL receive a Supabase Realtime notification
2. WHEN a new resignation application is inserted into the database THEN the manager's page SHALL receive a Supabase Realtime notification
3. WHEN receiving a Realtime notification THEN the manager's dashboard SHALL refresh automatically
4. WHEN receiving a Realtime notification THEN the system SHALL display a toast notification to the manager
5. WHEN multiple Realtime events occur within 3 seconds THEN the system SHALL debounce notifications to avoid spam

### Requirement 4

**User Story:** As a driver, I want to be notified when my applications are approved or rejected, so that I know the status immediately.

#### Acceptance Criteria

1. WHEN a manager approves or rejects a leave application THEN the system SHALL emit a local `leave:updated` event via Event Bus
2. WHEN a manager approves or rejects a resignation THEN the system SHALL emit a local `resignation:updated` event via Event Bus
3. WHEN the driver's leave page is open THEN the page SHALL subscribe to Supabase Realtime for status changes
4. WHEN receiving an approval/rejection Realtime event THEN the driver's page SHALL refresh automatically
5. WHEN receiving an approval/rejection event THEN the system SHALL display a toast notification with the result

### Requirement 5

**User Story:** As a developer, I want a centralized local event publishing mechanism, so that all local data mutations trigger appropriate events.

#### Acceptance Criteria

1. WHEN a local database mutation succeeds THEN the API function SHALL publish the corresponding event to Event Bus
2. WHEN publishing an event THEN the system SHALL include relevant data (record ID, status, user ID, etc.)
3. WHEN an API call fails THEN the system SHALL NOT publish any event
4. THE event publishing SHALL be integrated into existing API functions without breaking changes

### Requirement 6

**User Story:** As a developer, I want components to easily subscribe to Supabase Realtime events, so that they can receive cross-device updates.

#### Acceptance Criteria

1. WHEN a component needs to receive cross-device updates THEN it SHALL use the `useRealtimeSubscription` hook
2. WHEN subscribing to Realtime THEN the component SHALL specify the table name and filter conditions
3. WHEN a component unmounts THEN the system SHALL automatically unsubscribe from Realtime channel
4. WHEN a Realtime event is received THEN the component SHALL call its refresh function

### Requirement 7

**User Story:** As a developer, I want components to easily subscribe to local Event Bus events, so that they can refresh on local changes.

#### Acceptance Criteria

1. WHEN a component needs to refresh on local data change THEN it SHALL use the `useEventSubscription` hook
2. WHEN subscribing to multiple local events THEN the component SHALL use `useMultiEventSubscription` hook
3. WHEN a component unmounts THEN the system SHALL automatically unsubscribe from all local events
4. WHEN a local event is received THEN the component SHALL call its refresh function

### Requirement 8

**User Story:** As a user, I want the app to remain responsive and not consume excessive resources, so that my device battery and data are preserved.

#### Acceptance Criteria

1. WHEN the app is running THEN the system SHALL NOT make periodic API requests for data refresh
2. WHEN no data changes occur THEN the system SHALL NOT make any refresh API calls
3. WHEN the app is in background THEN the system SHALL pause Realtime subscriptions
4. THE system SHALL reduce API calls by at least 80% compared to polling

### Requirement 9

**User Story:** As a developer, I want fallback mechanisms for when Supabase Realtime connection fails, so that users still get updated data.

#### Acceptance Criteria

1. WHEN Supabase Realtime connection fails THEN the system SHALL log the error and notify the user
2. WHEN Realtime is unavailable THEN the system SHALL allow manual refresh via pull-to-refresh
3. WHEN the app returns to foreground THEN the system SHALL reconnect Realtime and trigger a data refresh
4. THE system SHALL provide a manual refresh button on key pages as fallback

