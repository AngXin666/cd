# Design Document: 老板端计件统计页面

## Overview

为老板端考勤管理模块添加计件统计标签页。该页面复用车队长端计件统计页面的设计，使用相同的司机卡片布局，将考勤统计替换为计件统计（今日/本周/本月数量），支持多仓库切换查看，每行使用对应仓库的品类单位。

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    考勤管理页面                              │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │ 考勤记录 │  │ 计件统计 │  │ 请假审批 │  ← 标签页切换     │
│  └──────────┘  └──────────┘  └──────────┘                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🏭 选择仓库 (1/3)                    5 名司机       │   │
│  │ ┌─────────────────────────────────────────────────┐ │   │
│  │ │ 🏭 仓库A (5人)  ←  swiper 左右滑动  →           │ │   │
│  │ └─────────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 搜索框（支持姓名、手机号、拼音首字母）              │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 司机卡片                                            │   │
│  │ ┌─────────────────────────────────────────────────┐ │   │
│  │ │ 头像 | 姓名 | 手机号 | 实名状态 | 司机类型      │ │   │
│  │ │      | 入职时间 | 在职天数                      │ │   │
│  │ └─────────────────────────────────────────────────┘ │   │
│  │ ┌─────────────────────────────────────────────────┐ │   │
│  │ │ 仓库A: 今日 X件 | 本周 Y件 | 本月 Z件          │ │   │
│  │ │ 仓库B: 今日 X点 | 本周 Y点 | 本月 Z点          │ │   │
│  │ └─────────────────────────────────────────────────┘ │   │
│  │ ┌─────────────────────────────────────────────────┐ │   │
│  │ │ [个人信息]  [车辆管理]                          │ │   │
│  │ └─────────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  共 X 名司机                                                │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. 标签页扩展

在现有考勤管理页面的 `TabType` 中添加新类型：

```typescript
/** 标签页类型 */
type TabType = 'ATTENDANCE' | 'PIECE_WORK' | 'APPROVAL'
```

### 2. 计件统计数据结构

复用车队长端定义的数据结构：

```typescript
/**
 * 司机单仓库计件统计
 */
interface DriverWarehousePieceStats {
  /** 仓库ID */
  warehouseId: number
  /** 仓库名称 */
  warehouseName: string
  /** 仓库类型 */
  warehouseType: WarehouseType
  /** 预设单位 */
  unit: string
  /** 今日数量 */
  todayQuantity: number
  /** 本周数量 */
  weekQuantity: number
  /** 本月数量 */
  monthQuantity: number
}

/**
 * 司机计件统计映射
 * key: 司机ID
 * value: 该司机在各仓库的计件统计数组
 */
type DriverPieceStatsMap = Map<number, DriverWarehousePieceStats[]>
```

### 3. 数据加载函数

```typescript
/**
 * 加载司机计件统计数据
 * @param driverIds - 司机ID列表
 * @param warehouseId - 当前选中的仓库ID（可选，老板可查看所有仓库）
 * @returns 司机计件统计映射
 */
async function loadDriverPieceStats(
  driverIds: number[],
  warehouseId?: number
): Promise<DriverPieceStatsMap>
```

### 4. 日期范围计算

复用车队长端定义的日期范围计算函数：

```typescript
/**
 * 获取今日日期范围
 * @returns { startDate: string, endDate: string }
 */
function getTodayRange(): { startDate: string; endDate: string }

/**
 * 获取本周日期范围（周一到周日）
 * @returns { startDate: string, endDate: string }
 */
function getWeekRange(): { startDate: string; endDate: string }

/**
 * 获取本月日期范围
 * @returns { startDate: string; endDate: string }
 */
function getMonthRange(): { startDate: string; endDate: string }
```

## Data Models

### 现有数据模型复用

- `User` - 司机用户信息
- `Warehouse` - 仓库信息（包含 warehouse_type 和 preset_unit）
- `PieceWorkRecord` - 计件记录

### 数据流

```
1. 页面加载
   ↓
2. 获取所有仓库列表 (getWarehouses)
   ↓
3. 获取所有司机列表 (getUsers + 筛选 role=driver)
   ↓
4. 根据当前选中仓库筛选司机
   ↓
5. 获取计件记录 (getPieceWorkRecords)
   - 今日范围
   - 本周范围
   - 本月范围
   ↓
6. 按司机和仓库聚合统计数据
   ↓
7. 渲染司机卡片和计件统计
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: 司机实名状态影响 UI 显示

*For any* 司机数据，如果司机已实名（name 和 phone 都存在），则"个人信息"按钮可点击；如果司机未实名，则显示"未实名"标签且按钮禁用。

**Validates: Requirements 2.4, 6.2, 6.3**

### Property 2: 司机仓库数量决定统计行数

*For any* 司机的计件数据，统计区域显示的行数应等于该司机工作的仓库数量。单仓库司机显示一行，多仓库司机显示多行。

**Validates: Requirements 3.2, 3.3**

### Property 3: 仓库筛选结果一致性

*For any* 仓库切换操作，筛选后显示的司机数量应等于底部统计显示的数量，且所有显示的司机都属于当前选中的仓库。

**Validates: Requirements 4.3, 7.2**

### Property 4: 搜索功能正确性

*For any* 搜索关键词，如果关键词匹配司机的姓名、手机号或姓名拼音首字母，则该司机应出现在筛选结果中。

**Validates: Requirements 5.1**

## Error Handling

| 错误场景 | 处理方式 |
|---------|---------|
| 计件记录加载失败 | 显示错误提示，统计数据显示为 0 |
| 仓库信息加载失败 | 使用默认单位"件" |
| 司机列表为空 | 显示空状态提示"暂无司机数据" |
| 网络超时 | 显示重试按钮 |

## Testing Strategy

### 单元测试

1. 日期范围计算函数测试（复用车队长端测试）
   - 今日范围正确性
   - 本周范围正确性（周一到周日）
   - 本月范围正确性

2. 计件统计聚合函数测试
   - 单仓库司机统计
   - 多仓库司机统计
   - 空记录处理

### 属性测试

使用 fast-check 进行属性测试：

1. **Property 1**: 生成随机司机数据，验证实名状态与 UI 状态一致
2. **Property 2**: 生成随机仓库分配，验证统计行数与仓库数量一致
3. **Property 3**: 生成随机仓库切换，验证筛选结果一致性
4. **Property 4**: 生成随机搜索关键词和司机数据，验证搜索匹配正确性

### 集成测试

1. 标签页切换功能
2. 仓库切换功能
3. 搜索功能端到端测试
4. 数据加载和显示流程
