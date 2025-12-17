/**
 * 测试模式配置
 * 用于开发和测试阶段简化流程
 * 
 * 功能：
 * - 减少车辆照片数量（从7张减少到1张）
 * - 在 H5 环境下支持从电脑选择文件
 * 
 * 保留完整功能：
 * - 行驶证识别（主页、副页、副页背页 - 3张）
 * - 驾驶员证件识别（身份证正反面、驾驶证 - 3张）
 * - OCR 识别验证
 * 
 * 注意：正式发布前需要将 TEST_MODE_ENABLED 设置为 false
 */

/**
 * 是否启用测试模式
 * true: 启用测试模式（车辆照片减少到1张，支持电脑选择文件）
 * false: 正常模式（完整照片数量要求）
 */
export const TEST_MODE_ENABLED = true

/**
 * 测试模式下的照片配置说明
 * 
 * 简化的部分（测试模式）：
 * - 车辆照片：7张 -> 2张（只需左前45°+右前45°）
 * - 还车照片：7张 -> 2张（只需左前+右前）
 * 
 * 保持完整的部分：
 * - 行驶证照片：3张（主页、副页、副页背页）
 * - 驾驶员证件：3张（身份证正面、身份证背面、驾驶证）
 * - OCR 识别验证：完整保留
 */
export const TEST_MODE_CONFIG = {
  // 车辆照片：测试模式只需要2张，正常模式需要7张
  vehiclePhotosRequired: TEST_MODE_ENABLED ? 2 : 7,
  
  // 还车照片：测试模式只需要2张，正常模式需要7张
  returnPhotosRequired: TEST_MODE_ENABLED ? 2 : 7
}

/**
 * 检查是否在 H5 环境
 */
export const isH5Environment = (): boolean => {
  return process.env.TARO_ENV === 'h5'
}

/**
 * 获取测试模式状态描述
 */
export const getTestModeStatus = (): string => {
  if (TEST_MODE_ENABLED) {
    return '⚠️ 测试模式 - 车辆照片简化为1张'
  }
  return '正常模式'
}
