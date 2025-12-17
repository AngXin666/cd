# Requirements Document

## Introduction

本功能旨在改进现有的单点登录会话管理系统，将会话踢出检测从轮询模式（每30秒检查一次）升级为实时检测模式。利用 Supabase Realtime（WebSocket）技术，当用户在其他设备登录时，旧设备能够即时收到通知并被踢出，提供更好的用户体验和更高的安全性。

## Glossary

- **Session Token**: 会话令牌，用于标识用户当前登录会话的唯一字符串
- **Realtime**: Supabase 提供的实时数据同步功能，基于 WebSocket 协议
- **Single Sign-On (SSO)**: 单点登录，同一账号同时只能在一个设备上登录
- **Kickout**: 踢出，当检测到会话失效时强制用户退出登录
- **Polling**: 轮询，定期检查数据变化的方式
- **WebSocket**: 全双工通信协议，支持服务器主动推送消息

## Requirements

### Requirement 1

**User Story:** As a user, I want to be immediately notified and logged out when my account is logged in on another device, so that I can be aware of potential unauthorized access.

#### Acceptance Criteria

1. WHEN a user logs in on a new device THEN the system SHALL immediately notify the old device within 3 seconds
2. WHEN the old device receives the session invalidation notification THEN the system SHALL display a modal dialog informing the user
3. WHEN the user acknowledges the modal dialog THEN the system SHALL redirect the user to the login page
4. WHEN the WebSocket connection is unavailable THEN the system SHALL fall back to the existing 30-second polling mechanism

### Requirement 2

**User Story:** As a system administrator, I want the session management to use efficient real-time communication, so that server resources are optimized and user experience is improved.

#### Acceptance Criteria

1. WHEN a user is logged in THEN the system SHALL establish a Realtime subscription to monitor session token changes
2. WHEN the session token in the database changes THEN the system SHALL compare it with the local session token
3. IF the local session token does not match the database session token THEN the system SHALL trigger the kickout process
4. WHEN the user logs out THEN the system SHALL unsubscribe from the Realtime channel

### Requirement 3

**User Story:** As a developer, I want the real-time session monitoring to integrate with the existing notification system, so that the codebase remains maintainable and consistent.

#### Acceptance Criteria

1. WHEN implementing real-time session monitoring THEN the system SHALL reuse the existing Supabase Realtime infrastructure
2. WHEN handling connection errors THEN the system SHALL use the existing realtimeConnectionManager for error handling
3. WHEN the Realtime connection status changes THEN the system SHALL log appropriate messages using the existing logger
4. WHEN the Realtime connection fails THEN the system SHALL gracefully degrade to polling mode without crashing

### Requirement 4

**User Story:** As a user on a mobile device or unstable network, I want the session monitoring to handle connection issues gracefully, so that I am not unexpectedly logged out due to network problems.

#### Acceptance Criteria

1. WHEN the Realtime connection is temporarily lost THEN the system SHALL attempt to reconnect automatically
2. WHEN the Realtime connection cannot be established THEN the system SHALL continue using polling as a fallback
3. WHEN network errors occur during session verification THEN the system SHALL NOT force logout the user
4. WHEN the Realtime connection is restored THEN the system SHALL resume real-time session monitoring
