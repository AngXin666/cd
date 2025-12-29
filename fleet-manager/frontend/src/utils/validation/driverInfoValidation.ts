/**
 * 司机信息验证模块
 * 提供司机信息更新的验证函数
 * 
 * @module utils/validation/driverInfoValidation
 * @requirements 1.2, 1.3 - 司机信息编辑功能
 */

/**
 * 司机信息更新请求接口
 */
export interface DriverInfoUpdate {
  /** 司机姓名 */
  name: string;
  /** 手机号（可选） */
  phone?: string;
}

/**
 * 验证结果接口
 */
export interface ValidationResult {
  /** 是否验证通过 */
  valid: boolean;
  /** 错误信息列表 */
  errors: string[];
}

/**
 * 手机号正则表达式
 * 匹配中国大陆手机号：1开头，第二位3-9，后面9位数字
 */
const PHONE_REGEX = /^1[3-9]\d{9}$/;

/**
 * 姓名最小长度
 */
const NAME_MIN_LENGTH = 1;

/**
 * 姓名最大长度
 */
const NAME_MAX_LENGTH = 20;

/**
 * 验证司机姓名
 * 
 * @param name - 司机姓名
 * @returns 验证结果
 * 
 * @description
 * 验证规则：
 * 1. 姓名不能为空
 * 2. 姓名长度在 1-20 个字符之间
 * 3. 姓名不能只包含空白字符
 */
export function validateDriverName(name: string): ValidationResult {
  const errors: string[] = [];
  
  // 去除首尾空白
  const trimmedName = name?.trim() ?? '';
  
  // 检查是否为空
  if (!trimmedName) {
    errors.push('姓名不能为空');
    return { valid: false, errors };
  }
  
  // 检查长度
  if (trimmedName.length < NAME_MIN_LENGTH) {
    errors.push(`姓名长度不能少于 ${NAME_MIN_LENGTH} 个字符`);
  }
  
  if (trimmedName.length > NAME_MAX_LENGTH) {
    errors.push(`姓名长度不能超过 ${NAME_MAX_LENGTH} 个字符`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 验证手机号
 * 
 * @param phone - 手机号（可选）
 * @returns 验证结果
 * 
 * @description
 * 验证规则：
 * 1. 手机号可以为空（可选字段）
 * 2. 如果提供手机号，必须是有效的中国大陆手机号格式
 */
export function validateDriverPhone(phone?: string): ValidationResult {
  const errors: string[] = [];
  
  // 手机号是可选的，空值直接通过
  if (!phone || phone.trim() === '') {
    return { valid: true, errors: [] };
  }
  
  // 去除空白字符
  const trimmedPhone = phone.trim();
  
  // 验证手机号格式
  if (!PHONE_REGEX.test(trimmedPhone)) {
    errors.push('请输入有效的手机号（11位数字，以1开头）');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 验证司机信息更新请求
 * 
 * @param data - 司机信息更新数据
 * @returns 验证结果
 * 
 * @description
 * 综合验证姓名和手机号，返回所有错误信息
 * 
 * @example
 * const result = validateDriverInfoUpdate({ name: '张三', phone: '13800138000' });
 * if (!result.valid) {
 *   console.log(result.errors);
 * }
 */
export function validateDriverInfoUpdate(data: DriverInfoUpdate): ValidationResult {
  const allErrors: string[] = [];
  
  // 验证姓名
  const nameResult = validateDriverName(data.name);
  if (!nameResult.valid) {
    allErrors.push(...nameResult.errors);
  }
  
  // 验证手机号
  const phoneResult = validateDriverPhone(data.phone);
  if (!phoneResult.valid) {
    allErrors.push(...phoneResult.errors);
  }
  
  return {
    valid: allErrors.length === 0,
    errors: allErrors,
  };
}

/**
 * 格式化司机姓名
 * 去除首尾空白，保留中间空格
 * 
 * @param name - 原始姓名
 * @returns 格式化后的姓名
 */
export function formatDriverName(name: string): string {
  return name?.trim() ?? '';
}

/**
 * 格式化手机号
 * 去除所有空白字符
 * 
 * @param phone - 原始手机号
 * @returns 格式化后的手机号
 */
export function formatDriverPhone(phone?: string): string {
  if (!phone) return '';
  return phone.replace(/\s/g, '');
}
