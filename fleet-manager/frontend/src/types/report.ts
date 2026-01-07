/**
 * 报表类型定义模块
 * 定义数据统计报表功能相关的 TypeScript 类型
 * 
 * @module types/report
 */

// ==================== 枚举类型 ====================

/**
 * 报表周期类型枚举
 * 定义报表的时间维度：日报、周报、月报
 * Requirements: 2.1, 2.2, 2.3, 2.4
 */
export enum ReportPeriodType {
  /** 日报 - 显示单天的统计数据 */
  DAILY = 'daily',
  /** 周报 - 显示本周（周一至今天）的统计数据 */
  WEEKLY = 'weekly',
  /** 月报 - 显示本月（1号至今天）的统计数据 */
  MONTHLY = 'monthly',
}

/**
 * 报表周期显示名称映射
 * 将周期类型枚举值映射为中文显示名称
 */
export const REPORT_PERIOD_DISPLAY_NAMES: Record<ReportPeriodType, string> = {
  [ReportPeriodType.DAILY]: '日报',
  [ReportPeriodType.WEEKLY]: '周报',
  [ReportPeriodType.MONTHLY]: '月报',
}

/**
 * 获取报表周期的显示名称
 * @param periodType 周期类型枚举值
 * @returns 周期类型的中文名称
 */
export function getReportPeriodDisplayName(periodType: ReportPeriodType): string {
  return REPORT_PERIOD_DISPLAY_NAMES[periodType] || '未知'
}

// ==================== 接口类型 ====================

/**
 * 日期范围接口
 * 用于报表查询的日期范围参数
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */
export interface DateRange {
  /** 开始日期 (YYYY-MM-DD 格式) */
  startDate: string;
  /** 结束日期 (YYYY-MM-DD 格式) */
  endDate: string;
}

/**
 * 仓库统计项接口
 * 表示单个仓库在指定周期内的统计数据
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */
export interface WarehouseStatItem {
  /** 仓库 ID */
  warehouse_id: number;
  /** 仓库名称 */
  warehouse_name: string;
  /** 仓库类型（piece/point/whole/distance/custom） */
  warehouse_type: string;
  /** 总数量（使用仓库预设单位） */
  total_quantity: number;
  /** 司机人数 */
  driver_count: number;
  /** 预设单位（可选，用于前端显示） */
  preset_unit?: string;
}

/**
 * 司机统计项接口
 * 表示单个司机在指定仓库和周期内的统计数据
 * Requirements: 4.3, 4.4, 4.5, 4.6
 */
export interface DriverStatItem {
  /** 司机 ID */
  driver_id: number;
  /** 司机姓名 */
  driver_name: string;
  /** 总数量（使用仓库预设单位） */
  total_quantity: number;
  /** 记录条数 */
  record_count: number;
}

// ==================== API 请求/响应类型 ====================

/**
 * 获取仓库统计列表请求参数
 * GET /api/report/warehouses
 */
export interface GetWarehouseStatsParams {
  /** 开始日期 (YYYY-MM-DD) */
  start_date: string;
  /** 结束日期 (YYYY-MM-DD) */
  end_date: string;
}

/**
 * 获取仓库司机统计列表请求参数
 * GET /api/report/warehouse/{warehouse_id}/drivers
 */
export interface GetWarehouseDriverStatsParams {
  /** 开始日期 (YYYY-MM-DD) */
  start_date: string;
  /** 结束日期 (YYYY-MM-DD) */
  end_date: string;
}

/**
 * 获取司机计件记录列表请求参数
 * GET /api/report/driver/{driver_id}/records
 */
export interface GetDriverRecordsParams {
  /** 仓库 ID */
  warehouse_id: number;
  /** 开始日期 (YYYY-MM-DD) */
  start_date: string;
  /** 结束日期 (YYYY-MM-DD) */
  end_date: string;
}
