/**
 * 草稿保存工具模块
 * 用于保存和恢复车辆录入的草稿数据
 * 参考主项目 src/utils/draftUtils.ts
 */

/**
 * 车辆草稿数据接口
 * 存储车辆录入过程中的临时数据
 */
export interface VehicleDraft {
  // ==================== 基本信息 ====================
  /** 车牌号 */
  plate_number?: string;
  /** 品牌 */
  brand?: string;
  /** 型号 */
  model?: string;
  /** 颜色 */
  color?: string;
  /** VIN 车架号 */
  vin?: string;
  /** 发动机号码 */
  engine_number?: string;
  /** 注册日期 */
  register_date?: string;
  /** 车辆类型 */
  vehicle_type?: string;
  /** 所有人 */
  owner_name?: string;
  /** 使用性质 */
  use_character?: string;
  /** 发证日期 */
  issue_date?: string;
  /** 档案编号 */
  archive_number?: string;
  /** 检验有效期至 */
  inspection_valid_until?: string;
  /** 强制报废日期 */
  mandatory_scrap_date?: string;
  
  // ==================== 行驶证照片 ====================
  /** 行驶证正面照片 */
  registration_front_photo?: string;
  /** 行驶证背面照片 */
  registration_back_photo?: string;
  /** 行驶证副页背页照片 */
  registration_sub_back_photo?: string;
  
  // ==================== 车辆照片 ====================
  /** 车辆照片数组（7张） */
  vehicle_photos?: string[];
  
  // ==================== 车损照片 ====================
  /** 车损照片数组 */
  damage_photos?: string[];
  
  // ==================== 驾驶员信息 ====================
  /** 驾驶员姓名 */
  driver_name?: string;
  /** 驾驶员身份证号 */
  driver_id_number?: string;
  /** 驾驶证号 */
  driver_license_number?: string;
  /** 准驾车型 */
  driver_license_class?: string;
  /** 初次领证日期 */
  driver_license_valid_from?: string;
  /** 有效期至 */
  driver_license_valid_until?: string;
  
  // ==================== 驾驶员证件照片 ====================
  /** 身份证正面照片 */
  id_card_front_photo?: string;
  /** 身份证背面照片 */
  id_card_back_photo?: string;
  /** 驾驶证照片 */
  driver_license_photo?: string;
  
  // ==================== 元数据 ====================
  /** 保存时间 */
  saved_at?: string;
  /** 当前步骤 */
  current_step?: number;
}

/**
 * 草稿类型
 */
export type DraftType = 'add' | 'return' | 'supplement';

/**
 * 生成草稿存储键
 * @param type - 草稿类型
 * @param userId - 用户ID
 * @returns 存储键
 */
function getDraftKey(type: DraftType, userId: string | number): string {
  return `vehicle_draft_${type}_${userId}`;
}

/**
 * 保存草稿到本地存储
 * @param type - 草稿类型
 * @param userId - 用户ID
 * @param draft - 草稿数据
 */
export async function saveDraft(
  type: DraftType,
  userId: string | number,
  draft: VehicleDraft
): Promise<void> {
  try {
    const key = getDraftKey(type, userId);
    const draftWithTime: VehicleDraft = {
      ...draft,
      saved_at: new Date().toISOString()
    };
    
    uni.setStorageSync(key, JSON.stringify(draftWithTime));
    console.log(`[DraftUtils] 草稿已保存: ${key}`);
  } catch (error) {
    console.error('[DraftUtils] 保存草稿失败:', error);
    throw error;
  }
}

/**
 * 获取草稿数据
 * @param type - 草稿类型
 * @param userId - 用户ID
 * @returns 草稿数据，如果不存在则返回 null
 */
export async function getDraft(
  type: DraftType,
  userId: string | number
): Promise<VehicleDraft | null> {
  try {
    const key = getDraftKey(type, userId);
    const data = uni.getStorageSync(key);
    
    if (data) {
      const draft = JSON.parse(data) as VehicleDraft;
      console.log(`[DraftUtils] 草稿已加载: ${key}`);
      return draft;
    }
    
    return null;
  } catch (error) {
    console.error('[DraftUtils] 获取草稿失败:', error);
    return null;
  }
}

/**
 * 删除草稿
 * @param type - 草稿类型
 * @param userId - 用户ID
 */
export async function deleteDraft(
  type: DraftType,
  userId: string | number
): Promise<void> {
  try {
    const key = getDraftKey(type, userId);
    uni.removeStorageSync(key);
    console.log(`[DraftUtils] 草稿已删除: ${key}`);
  } catch (error) {
    console.error('[DraftUtils] 删除草稿失败:', error);
    throw error;
  }
}

/**
 * 检查是否存在草稿
 * @param type - 草稿类型
 * @param userId - 用户ID
 * @returns 是否存在草稿
 */
export async function hasDraft(
  type: DraftType,
  userId: string | number
): Promise<boolean> {
  try {
    const key = getDraftKey(type, userId);
    const data = uni.getStorageSync(key);
    return !!data;
  } catch (error) {
    console.error('[DraftUtils] 检查草稿失败:', error);
    return false;
  }
}

/**
 * 获取草稿保存时间
 * @param type - 草稿类型
 * @param userId - 用户ID
 * @returns 保存时间字符串，如果不存在则返回 null
 */
export async function getDraftSavedTime(
  type: DraftType,
  userId: string | number
): Promise<string | null> {
  const draft = await getDraft(type, userId);
  return draft?.saved_at || null;
}

/**
 * 清除所有草稿（用于用户登出时）
 * @param userId - 用户ID
 */
export async function clearAllDrafts(userId: string | number): Promise<void> {
  const types: DraftType[] = ['add', 'return', 'supplement'];
  
  for (const type of types) {
    await deleteDraft(type, userId);
  }
  
  console.log(`[DraftUtils] 已清除用户 ${userId} 的所有草稿`);
}
