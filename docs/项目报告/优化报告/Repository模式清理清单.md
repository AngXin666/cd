# Repository 模式清理清单

## 概述

本文档记录了 Repository 模式全局实现后需要清理的旧代码。

## 清理状态

- ✅ 已完成
- ⏳ 进行中
- ❌ 待处理

## 1. 需要删除的备份文件

| 文件 | 状态 | 说明 |
|------|------|------|
| `src/pages/driver/leave/apply/index.tsx.backup` | ✅ | 已删除 |
| `src/pages/driver/leave/resign/index.tsx.backup` | ✅ | 已删除 |

## 2. 需要迁移的直接 supabase.from() 调用

| 文件 | 位置 | 当前代码 | 迁移方案 | 状态 |
|------|------|---------|---------|------|
| `src/pages/driver/notifications/index.tsx` | `handleNotificationClick` | `supabase.from('leave_applications')` | 使用 LeaveRepository | ✅ |
| `src/pages/common/notifications/index.tsx` | `handleNotificationClick` | `supabase.from('leave_applications')` | 使用 LeaveRepository | ✅ |

## 3. 需要清理的无用 supabase 导入

经过检查，以下文件中的 supabase 导入都有实际使用，不需要清理：

| 文件 | 状态 | 说明 |
|------|------|------|
| `src/pages/super-admin/vehicle-management/index.tsx` | ✅ | 用于聚合查询（历史记录数量） |
| `src/pages/super-admin/permission-config/index.tsx` | ✅ | 用于权限配置查询和更新 |
| `src/pages/super-admin/leave-approval/index.tsx` | ✅ | 用于更新通知状态 |
| `src/pages/manager/leave-approval/index.tsx` | ✅ | 用于更新通知状态 |

## 4. 合理的 supabase 使用（不需要迁移）

### 4.1 Auth API（认证相关）
- `src/pages/login/index.tsx` - `supabase.auth.signInWithOtp()`, `supabase.auth.verifyOtp()`, `supabase.auth.signInWithPassword()`, `supabase.auth.signOut()`
- `src/pages/super-admin/user-management/index.tsx` - `supabase.auth.signUp()`
- `src/pages/super-admin/user-management/hooks/useUserManagement.ts` - `supabase.auth.signUp()`

### 4.2 Storage API（文件存储相关）
- `src/pages/super-admin/vehicle-review-detail/index.tsx` - `supabase.storage.from().getPublicUrl()`
- `src/pages/super-admin/user-detail/index.tsx` - `supabase.storage.from().getPublicUrl()`
- `src/pages/manager/driver-profile/index.tsx` - `supabase.storage.from().getPublicUrl()`
- `src/pages/driver/supplement-photos/index.tsx` - `supabase.storage.from().getPublicUrl()`
- `src/pages/driver/profile/index.tsx` - `supabase.storage.from().getPublicUrl()`

### 4.3 RPC 调用（数据库函数）
- `src/pages/super-admin/admin-profile/index.tsx` - `supabase.rpc('reset_user_password')`
- `src/pages/profile/account-management/index.tsx` - `supabase.rpc('delete_user')`
- `src/pages/manager/driver-profile/index.tsx` - `supabase.rpc('reset_user_password')`

### 4.4 Realtime API（实时订阅）
- `src/hooks/useWarehousesData.ts` - `supabase.removeChannel()`
- `src/hooks/useVehicleRealtime.ts` - `supabase.channel()`, `supabase.removeChannel()`
- `src/hooks/useSuperAdminDashboard.ts` - `supabase.channel()`, `supabase.removeChannel()`
- `src/hooks/useRealtimeSubscription.ts` - `supabase.channel()`, `supabase.removeChannel()`
- `src/hooks/useRealtimeNotifications.ts` - `supabase.channel()`, `supabase.removeChannel()`
- `src/hooks/usePollingNotifications.ts` - `supabase.channel()`, `supabase.removeChannel()`
- `src/hooks/useDriverStats.ts` - `supabase.removeChannel()`
- `src/hooks/useDriverDashboard.ts` - `supabase.channel()`, `supabase.removeChannel()`
- `src/hooks/useDashboardData.ts` - `supabase.channel()`, `supabase.removeChannel()`

### 4.5 通知状态更新（复杂业务逻辑）
- `src/pages/super-admin/leave-approval/index.tsx` - 更新通知的 approval_status
- `src/pages/manager/leave-approval/index.tsx` - 更新通知的 approval_status

### 4.6 聚合查询
- `src/pages/super-admin/vehicle-management/index.tsx` - 查询车辆历史记录数量

## 5. 清理进度

- [x] 删除备份文件
- [x] 迁移通知页面的 supabase.from() 调用
- [x] 检查无用的 supabase 导入（无需清理）
- [x] 验证 TypeScript 编译通过

## 更新日期

2024-12-22
