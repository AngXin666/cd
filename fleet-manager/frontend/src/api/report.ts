/**
 * 报表 API 模块
 * 封装数据统计报表相关的 API 请求
 * 
 * @module api/report
 * 
 * Requirements:
 * - Requirement 3: 仓库卡片展示
 * - Requirement 4: 仓库详情（司机列表）
 * - Requirement 5: 司机详情（计件记录）
 * - Requirement 6: 权限控制
 */

import { get } from './request';
import type {
  WarehouseStatItem,
  DriverStatItem,
  GetWarehouseStatsParams,
  GetWarehouseDriverStatsParams,
  GetDriverRecordsParams,
} from '@/types/report';
import type { PieceWorkRecord } from './types';

// ==================== 响应类型 ====================

/**
 * 司机计件记录项
 * 后端返回的计件记录格式
 */
export interface PieceWorkRecordItem {
  /** 记录ID */
  id: number;
  /** 工作日期 (YYYY-MM-DD) */
  work_date: string;
  /** 品类名称 */
  category_name: string;
  /** 数量 */
  quantity: number;
  /** 金额 */
  amount: number;
  /** 备注 */
  remark?: string;
}

/**
 * 司机计件记录响应
 * GET /api/report/driver/{driver_id}/records 的响应格式
 */
export interface DriverRecordsResponse {
  /** 计件记录列表 */
  records: PieceWorkRecordItem[];
  /** 总件数 */
  total_quantity: number;
  /** 总金额 */
  total_amount: number;
}

// ==================== API 函数 ====================

/**
 * 获取仓库统计列表
 * 
 * 按日期范围统计各仓库的计件数据，包括总件数和司机人数。
 * 结果按总件数降序排列。
 * 
 * 权限控制：
 * - 老板：可查看所有仓库数据
 * - 车队长：只能查看管辖仓库数据
 * 
 * @param params - 查询参数，包含开始日期和结束日期
 * @returns Promise<WarehouseStatItem[]> - 仓库统计列表
 * @throws Error - 网络请求失败或权限不足时抛出错误
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 6.1, 6.2, 6.3
 * 
 * @example
 * // 获取今日仓库统计
 * const stats = await getWarehouseStats({
 *   start_date: '2026-01-06',
 *   end_date: '2026-01-06'
 * });
 */
export function getWarehouseStats(
  params: GetWarehouseStatsParams
): Promise<WarehouseStatItem[]> {
  return get<WarehouseStatItem[]>('/report/warehouses', params);
}

/**
 * 获取仓库内司机统计列表
 * 
 * 按日期范围统计指定仓库内各司机的计件数据，包括总件数和记录条数。
 * 结果按总件数降序排列。
 * 
 * 权限控制：
 * - 老板：可查看任意仓库数据
 * - 车队长：只能查看管辖仓库数据
 * 
 * @param warehouseId - 仓库ID
 * @param params - 查询参数，包含开始日期和结束日期
 * @returns Promise<DriverStatItem[]> - 司机统计列表
 * @throws Error - 网络请求失败、仓库不存在或权限不足时抛出错误
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 6.2, 6.3
 * 
 * @example
 * // 获取仓库1的司机统计
 * const driverStats = await getWarehouseDriverStats(1, {
 *   start_date: '2026-01-06',
 *   end_date: '2026-01-06'
 * });
 */
export function getWarehouseDriverStats(
  warehouseId: number,
  params: GetWarehouseDriverStatsParams
): Promise<DriverStatItem[]> {
  return get<DriverStatItem[]>(`/report/warehouse/${warehouseId}/drivers`, params);
}

/**
 * 获取司机计件记录列表
 * 
 * 获取指定司机在日期范围内的计件记录明细。
 * 结果按工作日期降序排列。
 * 
 * 权限控制：
 * - 老板：可查看任意司机数据
 * - 车队长：只能查看管辖仓库内司机的数据
 * 
 * @param driverId - 司机ID
 * @param params - 查询参数，包含仓库ID、开始日期和结束日期
 * @returns Promise<DriverRecordsResponse> - 司机计件记录响应，包含记录列表和统计汇总
 * @throws Error - 网络请求失败、司机/仓库不存在或权限不足时抛出错误
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 6.2, 6.3
 * 
 * @example
 * // 获取司机1在仓库1的计件记录
 * const response = await getDriverRecords(1, {
 *   warehouse_id: 1,
 *   start_date: '2026-01-06',
 *   end_date: '2026-01-06'
 * });
 * console.log('总件数:', response.total_quantity);
 * console.log('记录数:', response.records.length);
 */
export function getDriverRecords(
  driverId: number,
  params: GetDriverRecordsParams
): Promise<DriverRecordsResponse> {
  return get<DriverRecordsResponse>(`/report/driver/${driverId}/records`, params);
}
