/**
 * Hooks 模块导出
 * 集中导出所有自定义 React Hooks
 *
 * @module hooks
 */

export type {AppStateRefreshOptions} from './useAppStateRefresh'
export {useAppStateRefresh} from './useAppStateRefresh'
export {useDashboardData} from './useDashboardData'
export {useDriverDashboard, useDriverWarehouses} from './useDriverDashboard'
export {useDriverStats} from './useDriverStats'
export {useEventSubscription, useMultiEventSubscription} from './useEventSubscription'
export {useNotifications} from './useNotifications'
export {usePollingNotifications} from './usePollingNotifications'
export {useRealtimeNotifications} from './useRealtimeNotifications'
export type {
  DataChangeEvent,
  RealtimeEventType,
  RealtimeSubscriptionOptions,
  SubscriptionStatus,
  UseRealtimeSubscriptionReturn
} from './useRealtimeSubscription'
export {useRealtimeSubscription} from './useRealtimeSubscription'
export {useSuperAdminDashboard} from './useSuperAdminDashboard'
export {useWarehousesData} from './useWarehousesData'
export {useWarehousesSorted} from './useWarehousesSorted'
export {useNotificationToast} from './useNotificationToast'
export {useBackButtonBlock} from './useBackButtonBlock'
