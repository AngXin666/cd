/**
 * 工具函数模块
 * 提供通用的工具函数
 */

// 导出子模块
export * from './storage'
export * from './imageCache'
export * from './vehicle'
export * from './warehouse'
// 注意：draftImage 和 draftStorage 有重复导出，只导出 draftImage
export * from './draftImage'
// draftStorage 的类型与 draftImage 冲突，使用命名导出避免冲突
export {
  type DraftType,
  type ImageType,
  type DraftImageInfo,
  type DraftMeta,
  type DraftStorageOptions,
  type SaveImageOptions as DraftSaveImageOptions,
  DEFAULT_DRAFT_OPTIONS as DRAFT_STORAGE_DEFAULT_OPTIONS,
  DRAFT_META_FILENAME as DRAFT_STORAGE_META_FILENAME,
  IMAGES_META_FILENAME,
  DraftImageStorage as DraftStorageImageStorage,
  getDraftImageStorage as getDraftStorageImageStorage
} from './draftStorage'
export * from './submitRecovery'
export * from './imagePreloader'
export * from './sort'
export * from './completionRate'
export * from './report'

/**
 * 格式化日期
 * 
 * @param date - 日期字符串或 Date 对象
 * @param format - 格式化模板，默认 'YYYY-MM-DD'
 * @returns 格式化后的日期字符串
 * 
 * @example
 * formatDate('2024-01-15') // '2024-01-15'
 * formatDate('2024-01-15T10:30:00', 'YYYY-MM-DD HH:mm') // '2024-01-15 10:30'
 */
export function formatDate(
  date: string | Date | null | undefined,
  format = 'YYYY-MM-DD'
): string {
  if (!date) return '';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(d.getTime())) return '';
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  
  return format
    .replace('YYYY', String(year))
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
}

/**
 * 格式化时间（只显示时分）
 * 
 * @param date - 日期字符串或 Date 对象
 * @returns 格式化后的时间字符串
 */
export function formatTime(date: string | Date | null | undefined): string {
  return formatDate(date, 'HH:mm');
}

/**
 * 格式化日期时间
 * 
 * @param date - 日期字符串或 Date 对象
 * @returns 格式化后的日期时间字符串
 */
export function formatDateTime(date: string | Date | null | undefined): string {
  return formatDate(date, 'YYYY-MM-DD HH:mm');
}

/**
 * 获取今天的日期字符串
 * 
 * @returns 今天的日期，格式 'YYYY-MM-DD'
 */
export function getToday(): string {
  return formatDate(new Date());
}

/**
 * 格式化金额
 * 
 * @param amount - 金额数值
 * @param decimals - 小数位数，默认 2
 * @returns 格式化后的金额字符串
 * 
 * @example
 * formatMoney(1234.5) // '1,234.50'
 * formatMoney(1234.567, 2) // '1,234.57'
 */
export function formatMoney(
  amount: number | null | undefined,
  decimals = 2
): string {
  if (amount === null || amount === undefined) return '0.00';
  
  return amount.toLocaleString('zh-CN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * 格式化工作时长
 * 
 * @param hours - 小时数
 * @returns 格式化后的时长字符串
 * 
 * @example
 * formatWorkHours(8.5) // '8小时30分钟'
 * formatWorkHours(0) // '0小时'
 */
export function formatWorkHours(hours: number | null | undefined): string {
  if (!hours) return '0小时';
  
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  
  if (m === 0) return `${h}小时`;
  return `${h}小时${m}分钟`;
}

/**
 * 防抖函数
 * 
 * @param fn - 要防抖的函数
 * @param delay - 延迟时间（毫秒）
 * @returns 防抖后的函数
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  
  return function (this: unknown, ...args: Parameters<T>) {
    if (timer) clearTimeout(timer);
    
    timer = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
}

/**
 * 节流函数
 * 
 * @param fn - 要节流的函数
 * @param interval - 间隔时间（毫秒）
 * @returns 节流后的函数
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  interval: number
): (...args: Parameters<T>) => void {
  let lastTime = 0;
  
  return function (this: unknown, ...args: Parameters<T>) {
    const now = Date.now();
    
    if (now - lastTime >= interval) {
      lastTime = now;
      fn.apply(this, args);
    }
  };
}

/**
 * 页面跳转
 * 
 * @param url - 页面路径
 * @param params - 查询参数
 */
export function navigateTo(
  url: string,
  params?: Record<string, string | number>
): void {
  let fullUrl = url;
  
  // 拼接查询参数
  if (params) {
    const queryString = Object.entries(params)
      .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
      .join('&');
    fullUrl += `?${queryString}`;
  }
  
  uni.navigateTo({ url: fullUrl });
}

/**
 * 智能页面跳转
 * 自动判断是否为 tabBar 页面，使用正确的跳转方法
 * 
 * @param url - 页面路径
 */
export function smartNavigateTo(url: string): void {
  // tabBar 页面列表
  const tabBarPages = [
    '/pages/index/index',
    '/pages/notifications/index',
    '/pages/profile/index',
  ]
  
  // 判断是否为 tabBar 页面
  const isTabBarPage = tabBarPages.some(page => url.startsWith(page))
  
  if (isTabBarPage) {
    uni.switchTab({ url })
  } else {
    uni.navigateTo({ url })
  }
}

/**
 * 页面重定向
 * 
 * @param url - 页面路径
 */
export function redirectTo(url: string): void {
  uni.redirectTo({ url });
}

/**
 * 切换 Tab 页面
 * 
 * @param url - Tab 页面路径
 */
export function switchTab(url: string): void {
  uni.switchTab({ url });
}

/**
 * 返回上一页
 * 
 * @param delta - 返回的页面数，默认 1
 */
export function navigateBack(delta = 1): void {
  uni.navigateBack({ delta });
}

/**
 * 重新启动应用并跳转到指定页面
 * 
 * @param url - 页面路径
 */
export function reLaunch(url: string): void {
  uni.reLaunch({ url });
}

/**
 * 验证手机号格式
 * 
 * @param phone - 手机号
 * @returns 是否有效
 */
export function isValidPhone(phone: string): boolean {
  return /^1[3-9]\d{9}$/.test(phone);
}

/**
 * 验证车牌号格式
 * 
 * @param plate - 车牌号
 * @returns 是否有效
 */
export function isValidLicensePlate(plate: string): boolean {
  // 普通车牌：省份简称 + 字母 + 5位字母数字
  // 新能源车牌：省份简称 + 字母 + 6位字母数字
  return /^[\u4e00-\u9fa5][A-Z][A-Z0-9]{5,6}$/.test(plate);
}

/**
 * 获取请假状态文本
 * 
 * @param status - 状态值
 * @returns 状态文本
 */
export function getLeaveStatusText(status: string): string {
  const map: Record<string, string> = {
    pending: '待审批',
    approved: '已批准',
    rejected: '已拒绝',
  };
  return map[status] || status;
}

/**
 * 获取请假状态颜色
 * 
 * @param status - 状态值
 * @returns 颜色值
 */
export function getLeaveStatusColor(status: string): string {
  const map: Record<string, string> = {
    pending: '#faad14',
    approved: '#52c41a',
    rejected: '#ff4d4f',
  };
  return map[status] || '#999999';
}

/**
 * 获取车辆状态文本
 * 
 * @param status - 状态值
 * @returns 状态文本
 */
export function getVehicleStatusText(status: string): string {
  const map: Record<string, string> = {
    active: '使用中',
    returned: '已归还',
    reviewing: '审核中',
  };
  return map[status] || status;
}

/**
 * 获取用户角色文本
 * 
 * @param role - 角色值
 * @returns 角色文本
 */
export function getRoleText(role: string): string {
  const map: Record<string, string> = {
    driver: '司机',
    manager: '车队长',
    boss: '老板',
  };
  return map[role] || role;
}

/**
 * 获取用户角色名称（别名）
 * 
 * @param role - 角色值
 * @returns 角色名称
 */
export function getRoleName(role: string): string {
  return getRoleText(role);
}

/**
 * 隐藏身份证号中间部分
 * 保留前3位和后4位，中间用*替换
 * 
 * @param idCard - 身份证号
 * @returns 部分隐藏的身份证号（如：110***********1234）
 * 
 * @example
 * maskIdCard('110101199001011234') // '110***********1234'
 */
export function maskIdCard(idCard: string | null | undefined): string {
  if (!idCard) return '未录入';
  // 如果后端已经返回了隐藏后的身份证号，直接使用
  if (idCard.includes('*')) return idCard;
  if (idCard.length < 8) return idCard;
  // 保留前3位和后4位，中间用*替换
  const prefix = idCard.substring(0, 3);
  const suffix = idCard.substring(idCard.length - 4);
  const masked = '*'.repeat(idCard.length - 7);
  return `${prefix}${masked}${suffix}`;
}

/**
 * 获取完整的图片URL
 * 将相对路径转换为完整的API URL
 * 
 * @param url - 图片路径（相对路径或完整URL）
 * @param baseUrl - API基础URL（可选，默认从环境变量获取）
 * @returns 完整的图片URL
 * 
 * @example
 * getFullImageUrl('/uploads/image.jpg') // 'http://localhost:8000/uploads/image.jpg'
 * getFullImageUrl('https://example.com/image.jpg') // 'https://example.com/image.jpg'
 */
export function getFullImageUrl(url: string, baseUrl?: string): string {
  if (!url) return '';
  // 如果已经是完整URL，直接返回
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  // 获取API基础URL并拼接
  const apiBaseUrl = baseUrl || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
  return `${apiBaseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
}

/**
 * 预览照片
 * 支持在照片列表中滑动查看
 * 
 * @param url - 当前点击的图片URL（相对路径或完整URL）
 * @param urls - 图片列表（可选，用于支持滑动查看，应为完整URL数组）
 * 
 * @example
 * // 单张预览
 * previewPhoto('/uploads/image.jpg')
 * // 列表预览（支持滑动）
 * previewPhoto('/uploads/image1.jpg', ['http://xxx/image1.jpg', 'http://xxx/image2.jpg'])
 */
export function previewPhoto(url: string, urls?: string[]): void {
  const fullUrl = getFullImageUrl(url);
  // 如果提供了图片列表，使用列表进行预览（支持滑动）
  const previewUrls = urls && urls.length > 0 ? urls : [fullUrl];
  uni.previewImage({
    urls: previewUrls,
    current: fullUrl,
  });
}

/**
 * 格式化入职/雇佣日期
 * 
 * @param dateStr - 日期字符串
 * @returns 格式化后的日期（YYYY-MM-DD），无效日期返回'未知'
 * 
 * @example
 * formatHireDate('2024-01-15T10:30:00') // '2024-01-15'
 * formatHireDate(undefined) // '未知'
 */
export function formatHireDate(dateStr: string | undefined): string {
  if (!dateStr) return '未知';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '未知';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
