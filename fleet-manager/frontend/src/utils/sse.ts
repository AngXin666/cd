/**
 * SSE 实时通知服务模块
 * 提供 Server-Sent Events 连接管理和降级轮询功能
 * 用于实时接收服务器推送的通知消息
 */

import { useUserStore } from '@/store/user';

/** API 基础地址 */
const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

/** SSE 连接状态枚举 */
export enum SSEConnectionState {
  /** 未连接 */
  DISCONNECTED = 'disconnected',
  /** 连接中 */
  CONNECTING = 'connecting',
  /** 已连接 */
  CONNECTED = 'connected',
  /** 连接错误 */
  ERROR = 'error',
}

/** 通知数据接口 */
export interface SSENotification {
  /** 通知ID */
  id: number;
  /** 通知标题 */
  title: string;
  /** 通知内容 */
  content: string | null;
  /** 是否已读 */
  is_read: boolean;
  /** 创建时间 */
  created_at: string | null;
}

/** 心跳数据接口 */
export interface SSEHeartbeat {
  /** 数据类型 */
  type: 'heartbeat';
  /** 未读通知数量 */
  unread_count: number;
  /** 时间戳 */
  timestamp: number;
}

/** SSE 事件回调接口 */
export interface SSECallbacks {
  /** 收到新通知时的回调 */
  onNotification?: (notifications: SSENotification[]) => void;
  /** 收到心跳时的回调 */
  onHeartbeat?: (data: SSEHeartbeat) => void;
  /** 连接状态变化时的回调 */
  onStateChange?: (state: SSEConnectionState) => void;
  /** 发生错误时的回调 */
  onError?: (error: Error) => void;
}

/**
 * SSE 实时通知服务类
 * 管理 SSE 连接，支持自动重连和降级轮询
 */
export class SSENotificationService {
  /** EventSource 实例 */
  private eventSource: EventSource | null = null;
  
  /** 当前连接状态 */
  private state: SSEConnectionState = SSEConnectionState.DISCONNECTED;
  
  /** 事件回调 */
  private callbacks: SSECallbacks = {};
  
  /** 上次接收的最后一条通知ID */
  private lastNotificationId = 0;
  
  /** 重连次数 */
  private reconnectAttempts = 0;
  
  /** 最大重连次数 */
  private readonly maxReconnectAttempts = 5;
  
  /** 重连延迟（毫秒） */
  private readonly reconnectDelay = 3000;
  
  /** 轮询定时器 */
  private pollingTimer: ReturnType<typeof setInterval> | null = null;
  
  /** 轮询间隔（毫秒） */
  private readonly pollingInterval = 30000;
  
  /** 是否使用轮询模式 */
  private usePolling = false;

  /**
   * 设置事件回调
   * @param callbacks - 回调函数集合
   */
  setCallbacks(callbacks: SSECallbacks): void {
    this.callbacks = callbacks;
  }

  /**
   * 获取当前连接状态
   * @returns 当前连接状态
   */
  getState(): SSEConnectionState {
    return this.state;
  }

  /**
   * 设置连接状态并触发回调
   * @param state - 新状态
   */
  private setState(state: SSEConnectionState): void {
    this.state = state;
    this.callbacks.onStateChange?.(state);
  }

  /**
   * 连接 SSE 服务
   * 如果浏览器不支持 SSE，自动降级到轮询模式
   */
  connect(): void {
    // 检查是否已连接
    if (this.state === SSEConnectionState.CONNECTED || 
        this.state === SSEConnectionState.CONNECTING) {
      return;
    }

    // 获取用户 Token
    const userStore = useUserStore();
    const token = userStore.token;
    
    if (!token) {
      console.warn('[SSE] 未登录，无法连接');
      return;
    }

    // 检查浏览器是否支持 EventSource
    if (typeof EventSource === 'undefined') {
      console.warn('[SSE] 浏览器不支持 EventSource，降级到轮询模式');
      this.startPolling();
      return;
    }

    this.setState(SSEConnectionState.CONNECTING);

    try {
      // 构建 SSE URL（通过 query 参数传递 token）
      const url = `${BASE_URL}/notifications/stream?token=${encodeURIComponent(token)}&last_id=${this.lastNotificationId}`;
      
      // 创建 EventSource 连接
      this.eventSource = new EventSource(url);

      // 连接成功
      this.eventSource.onopen = () => {
        console.log('[SSE] 连接成功');
        this.setState(SSEConnectionState.CONNECTED);
        this.reconnectAttempts = 0;
        this.usePolling = false;
      };

      // 监听通知事件
      this.eventSource.addEventListener('notification', (event) => {
        try {
          const notifications: SSENotification[] = JSON.parse(event.data);
          console.log('[SSE] 收到新通知:', notifications.length, '条');
          
          // 更新最后通知ID
          if (notifications.length > 0) {
            this.lastNotificationId = Math.max(
              this.lastNotificationId,
              ...notifications.map(n => n.id)
            );
          }
          
          // 触发回调
          this.callbacks.onNotification?.(notifications);
        } catch (error) {
          console.error('[SSE] 解析通知数据失败:', error);
        }
      });

      // 监听心跳事件
      this.eventSource.addEventListener('heartbeat', (event) => {
        try {
          const data: SSEHeartbeat = JSON.parse(event.data);
          this.callbacks.onHeartbeat?.(data);
        } catch (error) {
          console.error('[SSE] 解析心跳数据失败:', error);
        }
      });

      // 连接错误
      this.eventSource.onerror = (error) => {
        console.error('[SSE] 连接错误:', error);
        this.setState(SSEConnectionState.ERROR);
        this.callbacks.onError?.(new Error('SSE 连接错误'));
        
        // 关闭当前连接
        this.eventSource?.close();
        this.eventSource = null;
        
        // 尝试重连
        this.handleReconnect();
      };

    } catch (error) {
      console.error('[SSE] 创建连接失败:', error);
      this.setState(SSEConnectionState.ERROR);
      this.callbacks.onError?.(error as Error);
      
      // 降级到轮询
      this.startPolling();
    }
  }

  /**
   * 处理重连逻辑
   */
  private handleReconnect(): void {
    this.reconnectAttempts++;
    
    if (this.reconnectAttempts <= this.maxReconnectAttempts) {
      console.log(`[SSE] 将在 ${this.reconnectDelay / 1000} 秒后重连 (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.connect();
      }, this.reconnectDelay);
    } else {
      console.warn('[SSE] 重连次数已达上限，降级到轮询模式');
      this.startPolling();
    }
  }

  /**
   * 启动轮询模式
   * 当 SSE 不可用时，使用轮询作为降级方案
   */
  private startPolling(): void {
    if (this.pollingTimer) {
      return;
    }

    this.usePolling = true;
    this.setState(SSEConnectionState.CONNECTED);
    console.log('[SSE] 启动轮询模式，间隔:', this.pollingInterval / 1000, '秒');

    // 立即执行一次
    this.pollNotifications();

    // 设置定时轮询
    this.pollingTimer = setInterval(() => {
      this.pollNotifications();
    }, this.pollingInterval);
  }

  /**
   * 轮询获取通知
   */
  private async pollNotifications(): Promise<void> {
    const userStore = useUserStore();
    const token = userStore.token;
    
    if (!token) {
      return;
    }

    try {
      // 获取未读数量
      const response = await fetch(`${BASE_URL}/notifications/unread-count`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        
        // 触发心跳回调（包含未读数量）
        this.callbacks.onHeartbeat?.({
          type: 'heartbeat',
          unread_count: data.count,
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      console.error('[SSE] 轮询失败:', error);
    }
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    // 关闭 SSE 连接
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    // 停止轮询
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }

    this.setState(SSEConnectionState.DISCONNECTED);
    this.reconnectAttempts = 0;
    this.usePolling = false;
    
    console.log('[SSE] 已断开连接');
  }

  /**
   * 重置最后通知ID
   * 用于重新获取所有通知
   */
  resetLastNotificationId(): void {
    this.lastNotificationId = 0;
  }

  /**
   * 检查是否正在使用轮询模式
   * @returns 是否使用轮询
   */
  isPollingMode(): boolean {
    return this.usePolling;
  }
}

// 导出单例实例
export const sseService = new SSENotificationService();

