/**
 * API 请求封装模块
 * 封装 uni.request，提供统一的请求处理、Token 携带、错误处理
 */

import { useUserStore } from '@/store/user';

/** API 基础地址 */
const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * 获取 API 基础地址
 * @returns API 基础地址
 */
export function getApiBaseUrl(): string {
  return BASE_URL;
}

/** 请求超时时间（毫秒） */
const TIMEOUT = 30000;

/**
 * 请求配置接口
 */
interface RequestConfig {
  /** 请求路径 */
  url: string;
  /** 请求方法 */
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  /** 请求数据 */
  data?: Record<string, unknown> | unknown;
  /** 请求头 */
  header?: Record<string, string>;
  /** 是否需要认证 */
  auth?: boolean;
}

/**
 * 错误响应接口（旧格式，字符串）
 */
interface ErrorResponseLegacy {
  /** 错误详情（字符串格式） */
  detail: string;
}

/**
 * 权限错误详情接口（新格式，包含 error_code）
 */
interface PermissionErrorDetail {
  /** 错误代码，用于区分不同类型的权限错误 */
  error_code: string;
  /** 错误信息，用于显示给用户 */
  message: string;
}

/**
 * 错误响应接口（新格式，支持结构化错误）
 */
interface ErrorResponseNew {
  /** 错误详情（结构化格式） */
  detail: PermissionErrorDetail;
}

/**
 * 权限错误代码枚举
 * 与后端 PermissionErrorCode 保持一致
 */
const PermissionErrorCode = {
  /** 用户已被禁用 */
  USER_DISABLED: 'user_disabled',
  /** 角色权限不足 */
  ROLE_INSUFFICIENT: 'role_insufficient',
  /** 资源不属于当前用户 */
  RESOURCE_NOT_OWNED: 'resource_not_owned',
  /** 无权访问该仓库 */
  WAREHOUSE_NOT_ACCESSIBLE: 'warehouse_not_accessible',
  /** 需要老板权限 */
  HIGH_ROLE_OPERATION: 'high_role_operation',
} as const;

/**
 * 显示加载提示
 * @param title - 提示文字
 */
function showLoading(title = '加载中...'): void {
  uni.showLoading({ title, mask: true });
}

/**
 * 隐藏加载提示
 */
function hideLoading(): void {
  uni.hideLoading();
}

/**
 * 显示错误提示
 * @param message - 错误信息
 */
function showError(message: string): void {
  uni.showToast({
    title: message,
    icon: 'none',
    duration: 2000,
  });
}

/**
 * 处理认证失败
 * 清除用户信息并跳转到登录页
 */
function handleAuthError(): void {
  const userStore = useUserStore();
  userStore.logout();
  
  // 跳转到登录页
  uni.reLaunch({ url: '/pages/login/index' });
}

/**
 * 发送 HTTP 请求
 * 
 * @param config - 请求配置
 * @returns Promise<T> - 响应数据
 * @throws Error - 请求失败时抛出错误
 * 
 * @example
 * // GET 请求
 * const users = await request<User[]>({ url: '/users' });
 * 
 * // POST 请求
 * const result = await request<LoginResponse>({
 *   url: '/auth/login',
 *   method: 'POST',
 *   data: { username, password },
 *   auth: false,
 * });
 */
export async function request<T = unknown>(config: RequestConfig): Promise<T> {
  const { url, method = 'GET', data, header = {}, auth = true } = config;
  
  // 构建请求头
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...header,
  };
  
  // 添加认证 Token
  if (auth) {
    const userStore = useUserStore();
    if (userStore.token) {
      headers['Authorization'] = `Bearer ${userStore.token}`;
    }
  }
  
  return new Promise((resolve, reject) => {
    uni.request({
      url: `${BASE_URL}${url}`,
      method,
      data: data as AnyObject | undefined,
      header: headers,
      timeout: TIMEOUT,
      
      success: (res) => {
        const { statusCode, data: responseData } = res;
        
        // 请求成功（2xx）
        if (statusCode >= 200 && statusCode < 300) {
          resolve(responseData as T);
          return;
        }
        
        // 认证失败（401）
        if (statusCode === 401) {
          handleAuthError();
          reject(new Error('登录已过期，请重新登录'));
          return;
        }
        
        // 权限不足（403）
        if (statusCode === 403) {
          // 解析错误响应，支持新旧两种格式
          let errorCode = '';
          let errorMessage = '权限不足';
          
          // 尝试解析新格式（包含 error_code）
          const errorDataNew = responseData as ErrorResponseNew;
          if (errorDataNew?.detail && typeof errorDataNew.detail === 'object') {
            errorCode = errorDataNew.detail.error_code || '';
            errorMessage = errorDataNew.detail.message || '权限不足';
          } else {
            // 旧格式（字符串）
            const errorDataLegacy = responseData as ErrorResponseLegacy;
            errorMessage = errorDataLegacy?.detail || '权限不足';
            
            // 兼容旧格式：检查是否是用户被禁用
            if (errorMessage === '用户已被禁用') {
              errorCode = PermissionErrorCode.USER_DISABLED;
            }
          }
          
          // 根据错误代码处理不同情况
          switch (errorCode) {
            case PermissionErrorCode.USER_DISABLED:
              // 用户被禁用，强制登出
              const userStore = useUserStore();
              userStore.logout();
              
              uni.showModal({
                title: '账号已被禁用',
                content: '您的账号已被管理员禁用，请联系管理员',
                showCancel: false,
                success: () => {
                  uni.reLaunch({ url: '/pages/login/index' });
                }
              });
              break;
              
            case PermissionErrorCode.RESOURCE_NOT_OWNED:
            case PermissionErrorCode.WAREHOUSE_NOT_ACCESSIBLE:
              // 资源访问被拒绝，显示错误信息
              showError(errorMessage);
              break;
              
            case PermissionErrorCode.ROLE_INSUFFICIENT:
            case PermissionErrorCode.HIGH_ROLE_OPERATION:
              // 角色权限不足，显示错误信息
              showError(errorMessage);
              break;
              
            default:
              // 未知错误代码或旧格式，显示错误信息
              showError(errorMessage);
          }
          
          reject(new Error(errorMessage));
          return;
        }
        
        // 其他错误
        const errorData = responseData as ErrorResponseLegacy;
        const errorMessage = errorData?.detail || '请求失败';
        showError(errorMessage);
        reject(new Error(errorMessage));
      },
      
      fail: (error) => {
        console.error('请求失败:', error);
        // 自定义错误提示，避免显示 UniApp 框架的默认错误
        // 注意：不显示 toast，让调用方决定如何处理错误
        reject(new Error('网络请求失败，请检查网络连接'));
      },
    });
  });
}

/**
 * GET 请求快捷方法
 * 
 * @param url - 请求路径
 * @param params - 查询参数
 * @param auth - 是否需要认证
 * @returns Promise<T> - 响应数据
 */
export function get<T = unknown>(
  url: string,
  params?: unknown,
  auth = true
): Promise<T> {
  // 将参数拼接到 URL
  let fullUrl = url;
  if (params && typeof params === 'object') {
    const queryString = Object.entries(params as Record<string, unknown>)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
      .join('&');
    if (queryString) {
      fullUrl += `?${queryString}`;
    }
  }
  
  return request<T>({ url: fullUrl, method: 'GET', auth });
}

/**
 * POST 请求快捷方法
 * 
 * @param url - 请求路径
 * @param data - 请求数据
 * @param auth - 是否需要认证
 * @returns Promise<T> - 响应数据
 */
export function post<T = unknown>(
  url: string,
  data?: unknown,
  auth = true
): Promise<T> {
  return request<T>({ url, method: 'POST', data, auth });
}

/**
 * PUT 请求快捷方法
 * 
 * @param url - 请求路径
 * @param data - 请求数据
 * @param auth - 是否需要认证
 * @returns Promise<T> - 响应数据
 */
export function put<T = unknown>(
  url: string,
  data?: unknown,
  auth = true
): Promise<T> {
  return request<T>({ url, method: 'PUT', data, auth });
}

/**
 * DELETE 请求快捷方法
 * 
 * @param url - 请求路径
 * @param auth - 是否需要认证
 * @returns Promise<T> - 响应数据
 */
export function del<T = unknown>(url: string, auth = true): Promise<T> {
  return request<T>({ url, method: 'DELETE', auth });
}

export { showLoading, hideLoading, showError };
