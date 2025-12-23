/**
 * Toast 消息常量
 * 统一管理所有用户提示消息，避免重复定义
 * 
 * 使用指南：
 * 1. 优先使用常量，避免硬编码字符串
 * 2. 使用 showSuccess/showError/showWarning 函数显示消息
 * 3. 动态消息使用便捷函数生成（如 getSuccessMessage）
 * 
 * @module constants/messages
 */

// ============================================
// 通用成功消息
// ============================================
export const SUCCESS_MESSAGES = {
  /** 保存成功 */
  SAVE: '保存成功',
  /** 删除成功 */
  DELETE: '删除成功',
  /** 创建成功 */
  CREATE: '创建成功',
  /** 修改成功 */
  UPDATE: '修改成功',
  /** 提交成功 */
  SUBMIT: '提交成功',
  /** 复制成功 */
  COPY: '复制成功',
  /** 上传成功 */
  UPLOAD: '上传成功',
  /** 登录成功 */
  LOGIN: '登录成功',
  /** 验证成功 */
  VERIFY: '验证成功',
  /** 识别成功 */
  RECOGNIZE: '识别成功',
  /** 发送成功 */
  SEND: '发送成功',
  /** 审核通过 */
  APPROVE: '审核通过',
  /** 密码修改成功 */
  PASSWORD_CHANGED: '密码修改成功',
  /** 密码已重置 */
  PASSWORD_RESET: '密码已重置',
  /** 已退出登录 */
  LOGOUT: '已退出登录',
  /** 已是最新版本 */
  ALREADY_LATEST: '已是最新版本',
  /** 验证码已发送 */
  OTP_SENT: '验证码已发送',
  /** 配置已复制 */
  CONFIG_COPIED: '配置已复制',
  /** 已添加自己为管理员 */
  ADDED_SELF_AS_MANAGER: '已添加自己为管理员',
} as const

// ============================================
// 通用失败消息
// ============================================
export const ERROR_MESSAGES = {
  /** 加载失败 */
  LOAD: '加载失败',
  /** 保存失败 */
  SAVE: '保存失败',
  /** 删除失败 */
  DELETE: '删除失败',
  /** 创建失败 */
  CREATE: '创建失败',
  /** 修改失败 */
  UPDATE: '修改失败',
  /** 提交失败 */
  SUBMIT: '提交失败',
  /** 操作失败 */
  OPERATION: '操作失败',
  /** 网络错误 */
  NETWORK: '网络错误',
  /** 上传失败 */
  UPLOAD: '上传失败',
  /** 复制失败 */
  COPY: '复制失败',
  /** 发送失败 */
  SEND: '发送失败',
  /** 审批失败 */
  APPROVE: '审批失败',
  /** 识别失败 */
  RECOGNIZE: '识别失败，请重新拍摄',
  /** 验证失败 */
  VERIFY: '验证失败',
  /** 退出登录失败 */
  LOGOUT: '退出登录失败',
  /** 重置失败 */
  RESET: '重置失败',
  /** 切换失败 */
  SWITCH: '切换失败',
  /** 预览图片失败 */
  PREVIEW_IMAGE: '预览图片失败',
  /** 导入失败 */
  IMPORT: '导入失败',
  /** 登录失败 */
  LOGIN: '登录失败，请稍后重试',
  /** 登录异常 */
  LOGIN_EXCEPTION: '登录异常，请重试',
  /** 验证码错误 */
  OTP_INVALID: '验证码错误或已过期',
  /** 账号或密码错误 */
  ACCOUNT_PASSWORD: '账号或密码错误',
  /** 发送验证码失败 */
  SEND_OTP: '发送验证码失败',
} as const

// ============================================
// 表单验证消息 - 必填项
// ============================================
export const REQUIRED_MESSAGES = {
  /** 请输入手机号 */
  PHONE: '请输入手机号',
  /** 请输入姓名 */
  NAME: '请输入姓名',
  /** 请输入密码 */
  PASSWORD: '请输入密码',
  /** 请输入原密码 */
  OLD_PASSWORD: '请输入原密码',
  /** 请输入新密码 */
  NEW_PASSWORD: '请输入新密码',
  /** 请输入验证码 */
  VERIFY_CODE: '请输入验证码',
  /** 请输入账号名称 */
  ACCOUNT_NAME: '请输入账号名称',
  /** 请输入登录账号 */
  LOGIN_ACCOUNT: '请输入登录账号',
  /** 请输入仓库名称 */
  WAREHOUSE_NAME: '请输入仓库名称',
  /** 请输入品类名称 */
  CATEGORY_NAME: '请输入品类名称',
  /** 请输入模板标题 */
  TEMPLATE_TITLE: '请输入模板标题',
  /** 请输入模板内容 */
  TEMPLATE_CONTENT: '请输入模板内容',
  /** 请输入通知标题 */
  NOTIFICATION_TITLE: '请输入通知标题',
  /** 请输入通知内容 */
  NOTIFICATION_CONTENT: '请输入通知内容',
  /** 请输入规则名称 */
  RULE_NAME: '请输入规则名称',
  /** 请输入提醒内容 */
  REMINDER_CONTENT: '请输入提醒内容',
  /** 请输入数量 */
  QUANTITY: '请输入数量',
  /** 请输入单价 */
  UNIT_PRICE: '请输入单价',
  /** 请输入上楼单价 */
  UPSTAIRS_PRICE: '请输入上楼单价',
  /** 请输入分拣数量 */
  SORTING_QUANTITY: '请输入分拣数量',
  /** 请输入分拣单价 */
  SORTING_PRICE: '请输入分拣单价',
  /** 请输入手机号和验证码 */
  PHONE_AND_OTP: '请输入手机号和验证码',
  /** 请输入账号和密码 */
  ACCOUNT_AND_PASSWORD: '请输入账号和密码',
} as const

// ============================================
// 表单验证消息 - 选择项
// ============================================
export const SELECT_MESSAGES = {
  /** 请选择仓库 */
  WAREHOUSE: '请选择仓库',
  /** 请选择司机 */
  DRIVER: '请选择司机',
  /** 请选择品类 */
  CATEGORY: '请选择品类',
  /** 请选择日期 */
  DATE: '请选择日期',
  /** 请选择工作日期 */
  WORK_DATE: '请选择工作日期',
  /** 请选择入职时间 */
  JOIN_DATE: '请选择入职时间',
  /** 请选择请假时间 */
  LEAVE_DATE: '请选择请假时间',
  /** 请选择期望离职日期 */
  RESIGN_DATE: '请选择期望离职日期',
  /** 请选择发送时间 */
  SEND_TIME: '请选择发送时间',
  /** 请至少选择一个管理员 */
  AT_LEAST_ONE_MANAGER: '请至少选择一个管理员',
} as const

// ============================================
// 表单验证消息 - 格式校验
// ============================================
export const FORMAT_MESSAGES = {
  /** 手机号格式不正确 */
  INVALID_PHONE: '手机号格式不正确',
  /** 每日指标必须是非负整数 */
  INVALID_DAILY_TARGET: '每日指标必须是非负整数',
  /** 月度请假天数必须在1-365之间 */
  INVALID_LEAVE_DAYS: '月度请假天数必须在1-365之间',
  /** 离职提前天数必须在1-365之间 */
  INVALID_NOTICE_DAYS: '离职提前天数必须在1-365之间',
  /** 迟到阈值必须大于等于0 */
  INVALID_LATE_THRESHOLD: '迟到阈值必须大于等于0',
  /** 早退阈值必须大于等于0 */
  INVALID_EARLY_THRESHOLD: '早退阈值必须大于等于0',
} as const

// ============================================
// 业务提示消息
// ============================================
export const BUSINESS_MESSAGES = {
  /** 只能切换司机类型 */
  ONLY_SWITCH_DRIVER_TYPE: '只能切换司机类型',
  /** 至少保留一个仓库 */
  KEEP_ONE_WAREHOUSE: '至少保留一个仓库',
  /** 暂无其他仓库 */
  NO_OTHER_WAREHOUSE: '暂无其他仓库',
  /** 该仓库暂无品类配置 */
  NO_CATEGORY_CONFIG: '该仓库暂无品类配置',
  /** 无权限访问此页面 */
  NO_PERMISSION: '无权限访问此页面',
  /** 参数错误 */
  INVALID_PARAMS: '参数错误',
  /** 缺少仓库ID */
  MISSING_WAREHOUSE_ID: '缺少仓库ID',
  /** 仓库ID不存在 */
  WAREHOUSE_NOT_FOUND: '仓库ID不存在',
  /** 仓库不存在 */
  WAREHOUSE_NOT_EXIST: '仓库不存在',
  /** 无法获取用户信息 */
  CANNOT_GET_USER_INFO: '无法获取用户信息',
  /** 无法获取账号状态，请重试 */
  CANNOT_GET_ACCOUNT_STATUS: '无法获取账号状态，请重试',
  /** 已是最新版本 */
  ALREADY_LATEST: '已是最新版本',
  /** 正在检查更新... */
  CHECKING_UPDATE: '正在检查更新...',
  /** 仓库分配已更新 */
  WAREHOUSE_ASSIGNMENT_UPDATED: '仓库分配已更新',
  /** 缺少车牌号参数 */
  MISSING_PLATE_NUMBER: '缺少车牌号参数',
  /** 未找到车辆信息 */
  VEHICLE_NOT_FOUND: '未找到车辆信息',
  /** 用户信息错误 */
  USER_INFO_ERROR: '用户信息错误',
  /** 请先分配仓库 */
  ASSIGN_WAREHOUSE_FIRST: '请先分配仓库',
  /** 暂无可用仓库 */
  NO_AVAILABLE_WAREHOUSE: '暂无可用仓库',
  /** 暂无可用品类 */
  NO_AVAILABLE_CATEGORY: '暂无可用品类',
  /** 请先完善个人信息 */
  COMPLETE_PROFILE_FIRST: '请先完善个人信息',
  /** 请先登录 */
  LOGIN_FIRST: '请先登录',
  /** 车辆不存在 */
  VEHICLE_NOT_EXIST: '车辆不存在',
  /** 缺少车辆ID */
  MISSING_VEHICLE_ID: '缺少车辆ID',
  /** 加载草稿失败 */
  LOAD_DRAFT_FAILED: '加载草稿失败',
  /** 草稿保存成功 */
  DRAFT_SAVED: '草稿保存成功',
  /** 没有修改任何信息 */
  NO_CHANGES: '没有修改任何信息',
  /** 邮箱格式不正确 */
  INVALID_EMAIL: '邮箱格式不正确',
  /** 紧急联系人电话格式不正确 */
  INVALID_EMERGENCY_PHONE: '紧急联系人电话格式不正确',
  /** 新手机号与当前手机号相同 */
  SAME_PHONE: '新手机号与当前手机号相同',
  /** 图片大小不能超过1MB */
  IMAGE_TOO_LARGE: '图片大小不能超过1MB',
  /** 密码至少6位 */
  PASSWORD_TOO_SHORT: '密码至少6位',
  /** 最多只能创建3个平级账号 */
  MAX_PEER_ACCOUNTS: '最多只能创建3个平级账号',
  /** 无法确定主账号 */
  CANNOT_DETERMINE_PRIMARY: '无法确定主账号',
  /** 邮箱或手机号已被注册 */
  EMAIL_OR_PHONE_EXISTS: '邮箱或手机号已被注册',
  /** 两次输入的密码不一致 */
  PASSWORD_MISMATCH: '两次输入的密码不一致',
  /** 新密码不能与原密码相同 */
  PASSWORD_SAME_AS_OLD: '新密码不能与原密码相同',
  /** 品类创建成功 */
  CATEGORY_CREATED: '品类创建成功',
  /** 创建品类失败 */
  CATEGORY_CREATE_FAILED: '创建品类失败',
  /** 加载仓库列表失败 */
  LOAD_WAREHOUSE_LIST_FAILED: '加载仓库列表失败',
  /** 角色变更成功 */
  ROLE_CHANGED: '角色变更成功',
  /** 角色变更失败 */
  ROLE_CHANGE_FAILED: '角色变更失败',
  /** 添加失败，手机号可能已存在 */
  ADD_FAILED_PHONE_EXISTS: '添加失败，手机号可能已存在',
  /** 加载仓库失败 */
  LOAD_WAREHOUSE_FAILED: '加载仓库失败',
  /** 加载管理员失败 */
  LOAD_MANAGER_FAILED: '加载管理员失败',
  /** 加载司机失败 */
  LOAD_DRIVER_FAILED: '加载司机失败',
  /** 暂无可分配的仓库 */
  NO_ASSIGNABLE_WAREHOUSE: '暂无可分配的仓库',
  /** 获取用户信息失败 */
  GET_USER_INFO_FAILED: '获取用户信息失败',
  /** 通知已发送 */
  NOTIFICATION_SENT: '通知已发送',
  /** 发送失败，请重试 */
  SEND_FAILED_RETRY: '发送失败，请重试',
} as const

// ============================================
// 车辆相关消息
// ============================================
export const VEHICLE_MESSAGES = {
  /** 请先拍摄行驶证主页 */
  TAKE_LICENSE_MAIN: '请先拍摄行驶证主页',
  /** 请先拍摄行驶证副页 */
  TAKE_LICENSE_SUB: '请先拍摄行驶证副页',
  /** 请先拍摄行驶证副页背页 */
  TAKE_LICENSE_SUB_BACK: '请先拍摄行驶证副页背页',
  /** 请先拍摄身份证正面 */
  TAKE_ID_CARD_FRONT: '请先拍摄身份证正面',
  /** 请先拍摄驾驶证 */
  TAKE_DRIVER_LICENSE: '请先拍摄驾驶证',
  /** 请拍摄所有角度的车辆照片 */
  TAKE_ALL_VEHICLE_PHOTOS: '请拍摄所有角度的车辆照片',
  /** 请拍摄所有证件照片 */
  TAKE_ALL_DOCUMENTS: '请拍摄所有证件照片',
  /** 请先识别行驶证主页 */
  RECOGNIZE_LICENSE_FIRST: '请先识别行驶证主页，确保获取车牌号、品牌和型号',
  /** 主页识别成功 */
  LICENSE_MAIN_SUCCESS: '主页识别成功',
  /** 副页识别成功 */
  LICENSE_SUB_SUCCESS: '副页识别成功',
  /** 副页背页识别成功 */
  LICENSE_SUB_BACK_SUCCESS: '副页背页识别成功',
  /** 草稿已恢复 */
  DRAFT_RESTORED: '草稿已恢复',
  /** 已清空，请重新拍摄证件 */
  CLEARED_RETAKE: '已清空，请重新拍摄证件',
  /** 重新识别成功 */
  RE_RECOGNIZE_SUCCESS: '重新识别成功',
  /** 重新识别失败 */
  RE_RECOGNIZE_FAILED: '重新识别失败',
  /** 已锁定 */
  LOCKED: '已锁定',
  /** 已解锁 */
  UNLOCKED: '已解锁',
  /** 已标记需补录 */
  MARKED_REQUIRED: '已标记需补录',
  /** 已取消标记 */
  UNMARKED: '已取消标记',
} as const

// ============================================
// 图片相关消息
// ============================================
export const IMAGE_MESSAGES = {
  /** 选择图片失败 */
  SELECT_FAILED: '选择图片失败',
  /** 处理中... */
  PROCESSING: '处理中...',
  /** 识别中... */
  RECOGNIZING: '识别中...',
  /** 重新识别中... */
  RE_RECOGNIZING: '重新识别中...',
} as const

// ============================================
// 加载状态消息
// ============================================
export const LOADING_MESSAGES = {
  /** 加载中... */
  LOADING: '加载中...',
  /** 保存中... */
  SAVING: '保存中...',
  /** 提交中... */
  SUBMITTING: '提交中...',
  /** 处理中... */
  PROCESSING: '处理中...',
  /** 识别中... */
  RECOGNIZING: '识别中...',
  /** 上传中... */
  UPLOADING: '上传中...',
} as const

// ============================================
// 类型导出
// ============================================
export type SuccessMessageKey = keyof typeof SUCCESS_MESSAGES
export type ErrorMessageKey = keyof typeof ERROR_MESSAGES
export type RequiredMessageKey = keyof typeof REQUIRED_MESSAGES
export type SelectMessageKey = keyof typeof SELECT_MESSAGES
export type FormatMessageKey = keyof typeof FORMAT_MESSAGES
export type BusinessMessageKey = keyof typeof BUSINESS_MESSAGES
export type VehicleMessageKey = keyof typeof VEHICLE_MESSAGES
export type ImageMessageKey = keyof typeof IMAGE_MESSAGES
export type LoadingMessageKey = keyof typeof LOADING_MESSAGES


// ============================================
// 便捷函数
// ============================================

/**
 * 生成带实体名称的成功消息
 * @param entity - 实体名称（如：仓库、司机、品类）
 * @param action - 操作类型
 * @returns 格式化的消息
 * @example
 * getSuccessMessage('仓库', 'create') // '仓库创建成功'
 */
export function getSuccessMessage(
  entity: string,
  action: 'save' | 'delete' | 'create' | 'update'
): string {
  const actionMap = {
    save: '保存',
    delete: '删除',
    create: '创建',
    update: '修改',
  }
  return `${entity}${actionMap[action]}成功`
}

/**
 * 生成带实体名称的失败消息
 * @param entity - 实体名称（如：仓库、司机、品类）
 * @param action - 操作类型
 * @returns 格式化的消息
 * @example
 * getErrorMessage('仓库', 'load') // '加载仓库失败'
 */
export function getErrorMessage(
  entity: string,
  action: 'load' | 'save' | 'delete' | 'create' | 'update'
): string {
  const actionMap = {
    load: '加载',
    save: '保存',
    delete: '删除',
    create: '创建',
    update: '修改',
  }
  return `${actionMap[action]}${entity}失败`
}

/**
 * 生成必填项验证消息
 * @param field - 字段名称
 * @returns 格式化的消息
 * @example
 * getRequiredMessage('手机号') // '请输入手机号'
 */
export function getRequiredMessage(field: string): string {
  return `请输入${field}`
}

/**
 * 生成选择项验证消息
 * @param field - 字段名称
 * @returns 格式化的消息
 * @example
 * getSelectMessage('仓库') // '请选择仓库'
 */
export function getSelectMessage(field: string): string {
  return `请选择${field}`
}

/**
 * 生成带单价字段的验证消息
 * @param category - 品类名称
 * @param priceType - 价格类型
 * @returns 格式化的消息
 */
export function getPriceValidationMessage(
  category: string,
  priceType: 'driver' | 'vehicle'
): string {
  const typeText = priceType === 'driver' ? '纯司机' : '带车司机'
  return `请为品类"${category}"设置有效的${typeText}单价`
}

/**
 * 生成司机类型切换消息
 * @param newType - 新类型
 * @returns 格式化的消息
 */
export function getDriverTypeSwitchMessage(
  newType: 'with_vehicle' | 'without_vehicle'
): string {
  const typeText = newType === 'with_vehicle' ? '带车司机' : '纯司机'
  return `已切换为${typeText}`
}

/**
 * 生成导入成功消息
 * @param count - 导入数量
 * @param entity - 实体名称
 * @returns 格式化的消息
 */
export function getImportSuccessMessage(count: number, entity: string): string {
  return `成功导入 ${count} 个${entity}`
}
