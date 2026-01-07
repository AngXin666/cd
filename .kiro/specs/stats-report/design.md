# Design Document

## Introduction

本设计文档描述数据统计报表功能的技术实现方案。该功能为老板端和车队长端提供日报、周报、月报查看能力，支持仓库→司机→计件记录的三级钻取。

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      报表功能架构                            │
├─────────────────────────────────────────────────────────────┤
│  前端 (UniApp + Vue 3)                                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  pages/common/report/                               │   │
│  │  ├── index.vue        (报表主页 - 仓库卡片列表)      │   │
│  │  ├── warehouse.vue    (仓库详情 - 司机卡片列表)      │   │
│  │  └── driver.vue       (司机详情 - 计件记录列表)      │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  composables/useReport.ts  (报表逻辑复用)            │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  api/report.ts  (报表 API 封装)                      │   │
│  └─────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│  后端 (FastAPI)                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  routers/report.py  (报表路由)                       │   │
│  │  ├── GET /api/report/warehouses  (仓库统计列表)      │   │
│  │  ├── GET /api/report/warehouse/{id}/drivers (司机列表)│   │
│  │  └── GET /api/report/driver/{id}/records (计件记录)  │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. 前端页面组件

#### 1.1 报表主页 (index.vue)

```typescript
/**
 * 报表主页组件
 * 显示日报/周报/月报标签页和仓库卡片列表
 */
interface ReportPageProps {
  // 无 props，通过路由参数获取初始周期类型
}

interface ReportPageState {
  /** 当前周期类型 */
  periodType: 'daily' | 'weekly' | 'monthly'
  /** 当前日期（用于计算周期范围） */
  currentDate: Date
  /** 仓库统计列表 */
  warehouseStats: WarehouseStatItem[]
  /** 加载状态 */
  loading: boolean
}
```

#### 1.2 仓库详情页 (warehouse.vue)

```typescript
/**
 * 仓库详情页组件
 * 显示指定仓库的司机统计卡片列表
 */
interface WarehouseDetailPageProps {
  /** 仓库 ID（路由参数） */
  warehouseId: number
  /** 周期类型（路由参数） */
  periodType: 'daily' | 'weekly' | 'monthly'
  /** 开始日期（路由参数） */
  startDate: string
  /** 结束日期（路由参数） */
  endDate: string
}

interface WarehouseDetailPageState {
  /** 仓库信息 */
  warehouse: Warehouse | null
  /** 司机统计列表 */
  driverStats: DriverStatItem[]
  /** 加载状态 */
  loading: boolean
}
```

#### 1.3 司机详情页 (driver.vue)

```typescript
/**
 * 司机详情页组件
 * 显示指定司机的计件记录列表
 */
interface DriverDetailPageProps {
  /** 司机 ID（路由参数） */
  driverId: number
  /** 仓库 ID（路由参数） */
  warehouseId: number
  /** 周期类型（路由参数） */
  periodType: 'daily' | 'weekly' | 'monthly'
  /** 开始日期（路由参数） */
  startDate: string
  /** 结束日期（路由参数） */
  endDate: string
}

interface DriverDetailPageState {
  /** 司机信息 */
  driver: User | null
  /** 仓库信息 */
  warehouse: Warehouse | null
  /** 计件记录列表 */
  records: PieceWorkRecord[]
  /** 统计汇总 */
  summary: { totalQuantity: number }
  /** 加载状态 */
  loading: boolean
}
```

### 2. API 接口

#### 2.1 仓库统计列表

```typescript
/**
 * 获取仓库统计列表
 * GET /api/report/warehouses
 */
interface GetWarehouseStatsRequest {
  /** 开始日期 (YYYY-MM-DD) */
  start_date: string
  /** 结束日期 (YYYY-MM-DD) */
  end_date: string
}

interface WarehouseStatItem {
  /** 仓库 ID */
  warehouse_id: number
  /** 仓库名称 */
  warehouse_name: string
  /** 仓库类型 */
  warehouse_type: string
  /** 总数量 */
  total_quantity: number
  /** 司机人数 */
  driver_count: number
}

type GetWarehouseStatsResponse = WarehouseStatItem[]
```

#### 2.2 仓库司机统计列表

```typescript
/**
 * 获取仓库内司机统计列表
 * GET /api/report/warehouse/{warehouse_id}/drivers
 */
interface GetWarehouseDriverStatsRequest {
  /** 仓库 ID（路径参数） */
  warehouse_id: number
  /** 开始日期 (YYYY-MM-DD) */
  start_date: string
  /** 结束日期 (YYYY-MM-DD) */
  end_date: string
}

interface DriverStatItem {
  /** 司机 ID */
  driver_id: number
  /** 司机姓名 */
  driver_name: string
  /** 总数量 */
  total_quantity: number
  /** 记录条数 */
  record_count: number
}

type GetWarehouseDriverStatsResponse = DriverStatItem[]
```

#### 2.3 司机计件记录列表

```typescript
/**
 * 获取司机计件记录列表
 * GET /api/report/driver/{driver_id}/records
 */
interface GetDriverRecordsRequest {
  /** 司机 ID（路径参数） */
  driver_id: number
  /** 仓库 ID */
  warehouse_id: number
  /** 开始日期 (YYYY-MM-DD) */
  start_date: string
  /** 结束日期 (YYYY-MM-DD) */
  end_date: string
}

// 复用现有 PieceWorkRecord 类型
type GetDriverRecordsResponse = PieceWorkRecord[]
```

### 3. 数据模型

#### 3.1 周期类型枚举

```typescript
/**
 * 报表周期类型
 */
enum ReportPeriodType {
  /** 日报 */
  DAILY = 'daily',
  /** 周报 */
  WEEKLY = 'weekly',
  /** 月报 */
  MONTHLY = 'monthly',
}
```

#### 3.2 日期范围计算

```typescript
/**
 * 计算周期的日期范围
 * @param periodType - 周期类型
 * @param baseDate - 基准日期
 * @returns 开始日期和结束日期
 */
function calculateDateRange(
  periodType: ReportPeriodType,
  baseDate: Date
): { startDate: string; endDate: string }
```

## Correctness Properties

### Property 1: 日期范围计算正确性

```
PROPERTY date_range_calculation:
  FOR ALL periodType IN ['daily', 'weekly', 'monthly']
  AND baseDate IN valid_dates
  WHEN calculateDateRange(periodType, baseDate) returns { startDate, endDate }
  THEN:
    - startDate <= endDate
    - IF periodType == 'daily' THEN startDate == endDate == baseDate
    - IF periodType == 'weekly' THEN startDate is Monday of baseDate's week
    - IF periodType == 'monthly' THEN startDate is 1st of baseDate's month
    - endDate <= today (不能超过今天)
```

### Property 2: 统计数据计算正确性

```
PROPERTY statistics_calculation:
  FOR ALL warehouse IN warehouses
  AND dateRange IN valid_date_ranges
  WHEN getWarehouseStats(dateRange) returns stats
  THEN:
    - stats.total_quantity == SUM(records.quantity) for records in dateRange
    - stats.driver_count == COUNT(DISTINCT records.user_id) for records in dateRange
```

### Property 3: 排序正确性

```
PROPERTY sorting_correctness:
  FOR ALL warehouseStats returned by getWarehouseStats
  THEN:
    - warehouseStats is sorted by total_quantity DESC
    - FOR i IN [0, len-2]: warehouseStats[i].total_quantity >= warehouseStats[i+1].total_quantity
```

### Property 4: 权限过滤正确性

```
PROPERTY permission_filtering:
  FOR ALL user IN users
  WHEN user.role == 'boss'
  THEN getWarehouseStats returns ALL warehouses with data
  
  WHEN user.role == 'manager'
  THEN getWarehouseStats returns ONLY warehouses managed by user
```

### Property 5: 日期导航正确性

```
PROPERTY date_navigation:
  FOR ALL periodType AND currentDate
  WHEN navigatePrevious(periodType, currentDate) returns newDate
  THEN:
    - IF periodType == 'daily' THEN newDate == currentDate - 1 day
    - IF periodType == 'weekly' THEN newDate == currentDate - 7 days
    - IF periodType == 'monthly' THEN newDate == currentDate - 1 month
  
  WHEN navigateNext(periodType, currentDate) returns newDate
  THEN:
    - newDate <= today (禁止导航到未来)
    - IF newDate > today THEN navigation is disabled
```

## Error Handling

### 1. 网络错误处理

```typescript
try {
  const data = await getWarehouseStats(params)
  // 处理数据
} catch (error) {
  console.error('加载报表数据失败:', error)
  uni.showToast({
    title: '加载失败，请重试',
    icon: 'none',
  })
}
```

### 2. 空数据处理

- 仓库无数据时显示"暂无数据"提示
- 司机无数据时显示"暂无司机数据"提示
- 计件记录为空时显示"暂无计件记录"提示

### 3. 权限错误处理

- 后端验证用户角色，非老板/车队长角色返回 403
- 车队长访问非管辖仓库返回 403

## Testing Strategy

### 1. 单元测试

- 日期范围计算函数测试
- 统计数据聚合函数测试
- 排序函数测试

### 2. 集成测试

- API 接口测试（权限验证、数据正确性）
- 前后端数据流测试

### 3. E2E 测试

- 老板端报表流程测试
- 车队长端报表流程测试
- 日期导航测试

## File Structure

```
fleet-manager/
├── frontend/src/
│   ├── pages/
│   │   └── common/
│   │       └── report/
│   │           ├── index.vue        # 报表主页
│   │           ├── warehouse.vue    # 仓库详情页
│   │           └── driver.vue       # 司机详情页
│   ├── composables/
│   │   └── useReport.ts             # 报表逻辑复用
│   ├── api/
│   │   └── report.ts                # 报表 API
│   └── types/
│       └── report.ts                # 报表类型定义
└── backend/
    └── routers/
        └── report.py                # 报表路由
```

## UI/UX Design

### 1. 报表主页布局

```
┌─────────────────────────────────────┐
│  ← 返回        数据报表              │
├─────────────────────────────────────┤
│  [日报]  [周报]  [月报]              │  ← 标签页切换
├─────────────────────────────────────┤
│  ◀  2026年1月6日  ▶                 │  ← 日期导航
├─────────────────────────────────────┤
│  ┌─────────────────────────────┐   │
│  │  🏭 仓库A                    │   │
│  │  总件数: 1,234 件            │   │
│  │  司机数: 5 人                │   │
│  └─────────────────────────────┘   │
│  ┌─────────────────────────────┐   │
│  │  🏭 仓库B                    │   │
│  │  ...                        │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

### 2. 仓库详情页布局

```
┌─────────────────────────────────────┐
│  ← 返回        仓库A - 日报          │
├─────────────────────────────────────┤
│  2026年1月6日                       │
├─────────────────────────────────────┤
│  ┌─────────────────────────────┐   │
│  │  👤 张三                     │   │
│  │  总件数: 234 件              │   │
│  │  记录数: 12 条               │   │
│  └─────────────────────────────┘   │
│  ┌─────────────────────────────┐   │
│  │  👤 李四                     │   │
│  │  ...                        │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

### 3. 司机详情页布局

```
┌─────────────────────────────────────┐
│  ← 返回        张三 - 计件记录       │
├─────────────────────────────────────┤
│  仓库A · 2026年1月6日               │
├─────────────────────────────────────┤
│  汇总: 234 件                       │
├─────────────────────────────────────┤
│  ┌─────────────────────────────┐   │
│  │  2026-01-06                 │   │
│  │  品类A · 50件               │   │
│  └─────────────────────────────┘   │
│  ┌─────────────────────────────┐   │
│  │  2026-01-06                 │   │
│  │  品类B · 30件               │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```
