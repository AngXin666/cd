# 考勤管理页面优化说明

## 优化时间
2025-11-05

## 优化内容

### 1. 删除出勤率，改为请假天数

#### 修改前
- 显示出勤率（百分比）
- 根据出勤率显示不同颜色（绿色/橙色/红色）
- 显示满勤标签

#### 修改后
- 显示请假天数（已批准的请假天数）
- 橙色显示，突出请假信息
- 删除满勤标签

#### 实现细节
```typescript
// 新增请假天数计算函数
const calculateLeaveDays = useCallback(
  (userId: string, yearMonth: string): number => {
    const [year, month] = yearMonth.split('-').map(Number)
    const monthStart = new Date(year, month - 1, 1)
    const monthEnd = new Date(year, month, 0)

    // 获取该司机在当月的已批准请假记录
    const approvedLeaves = leaveApplications.filter(
      (leave) =>
        leave.user_id === userId &&
        leave.status === 'approved' &&
        new Date(leave.start_date) <= monthEnd &&
        new Date(leave.end_date) >= monthStart
    )

    // 计算请假天数
    let totalLeaveDays = 0
    approvedLeaves.forEach((leave) => {
      const startDate = new Date(Math.max(new Date(leave.start_date).getTime(), monthStart.getTime()))
      const endDate = new Date(Math.min(new Date(leave.end_date).getTime(), monthEnd.getTime()))
      const diffTime = endDate.getTime() - startDate.getTime()
      const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
      totalLeaveDays += days
    })

    return totalLeaveDays
  },
  [leaveApplications]
)
```

### 2. 在职天数放在入职日期后面

#### 修改前
```
统计数据：出勤率 | 打卡天数 | 在职天数
入职日期：2024-01-01 (新司机)
```

#### 修改后
```
统计数据：请假天数 | 打卡天数 | 打卡次数
入职日期：2024-01-01 (在职 300 天) (新司机)
```

#### UI 变化
- 在职天数从统计数据区域移到入职日期后面
- 格式：`入职日期：YYYY-MM-DD (在职 X 天)`
- 保留新司机标签（在职天数 < 30 天）

### 3. 显示司机类型标签

#### 司机类型
- **纯司机**：`driver_type = 'pure'`
- **带车司机**：`driver_type = 'with_vehicle'`

#### 标签样式
- **纯司机**：灰色背景 + 灰色文字
- **带车司机**：蓝色背景 + 蓝色文字

#### 标签位置
- 放在司机名字的右边
- 与名字在同一行显示

#### 实现代码
```typescript
{/* 司机类型标签 */}
{stats.driverType && (
  <View
    className={`px-2 py-0.5 rounded ${
      stats.driverType === 'with_vehicle' ? 'bg-blue-100' : 'bg-gray-100'
    }`}>
    <Text
      className={`text-xs font-bold ${
        stats.driverType === 'with_vehicle' ? 'text-blue-700' : 'text-gray-700'
      }`}>
      {stats.driverType === 'with_vehicle' ? '带车司机' : '纯司机'}
    </Text>
  </View>
)}
```

### 4. 添加详细记录展示

#### 功能说明
- 每个司机卡片下方添加"查看详细记录"按钮
- 点击按钮展开/收起详细记录
- 显示该司机的所有打卡记录

#### 详细记录内容
- 打卡日期
- 上班时间
- 下班时间（如果有）
- 仓库名称
- 状态标签（已下班/未下班）

#### 记录排序
- 按打卡时间倒序排列（最新的在前面）

#### UI 设计
```
┌─────────────────────────────────────┐
│ 查看详细记录 ▼                      │
├─────────────────────────────────────┤
│ 打卡记录明细                        │
│                                     │
│ ┌─────────────────────────────┐   │
│ │ 📅 2025-11-05               │   │
│ │ 🕐 上班：08:30 | 下班：17:30│   │
│ │ 🏢 仓库A                    │   │
│ │                      [已下班]│   │
│ └─────────────────────────────┘   │
│                                     │
│ ┌─────────────────────────────┐   │
│ │ 📅 2025-11-04               │   │
│ │ 🕐 上班：08:25              │   │
│ │ 🏢 仓库A                    │   │
│ │                      [未下班]│   │
│ └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

#### 实现细节
```typescript
// 添加展开状态
const [expandedDriverId, setExpandedDriverId] = useState<string | null>(null)

// 在司机统计数据中添加打卡记录
attendanceRecords: driverRecords

// 详细记录按钮
<View
  className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-center cursor-pointer"
  onClick={() => {
    if (expandedDriverId === stats.driverId) {
      setExpandedDriverId(null)
    } else {
      setExpandedDriverId(stats.driverId)
    }
  }}>
  <Text className="text-sm text-blue-600 font-bold">
    {expandedDriverId === stats.driverId ? '收起详细记录' : '查看详细记录'}
  </Text>
  <View
    className={`i-mdi-chevron-${expandedDriverId === stats.driverId ? 'up' : 'down'} text-xl text-blue-600 ml-1`}
  />
</View>

// 详细记录列表
{expandedDriverId === stats.driverId && (
  <View className="mt-3 pt-3 border-t border-gray-100">
    <Text className="text-sm font-bold text-gray-700 mb-2 block">打卡记录明细</Text>
    {stats.attendanceRecords.length === 0 ? (
      <View className="text-center py-4">
        <Text className="text-xs text-gray-400">暂无打卡记录</Text>
      </View>
    ) : (
      <View className="space-y-2">
        {stats.attendanceRecords
          .sort((a, b) => new Date(b.clock_in_time).getTime() - new Date(a.clock_in_time).getTime())
          .map((record) => (
            // 记录卡片
          ))}
      </View>
    )}
  </View>
)}
```

### 5. 统计数据调整

#### 修改前
| 出勤率 | 打卡天数 | 在职天数 |
|--------|----------|----------|
| 95%    | 19/20    | 300      |

#### 修改后
| 请假天数 | 打卡天数 | 打卡次数 |
|----------|----------|----------|
| 2        | 19/20    | 38       |

#### 说明
- **请假天数**：当月已批准的请假天数
- **打卡天数**：实际打卡天数 / 应出勤天数（工作日）
- **打卡次数**：总打卡记录数（包括上班和下班）

### 6. 数据类型更新

#### DriverStats 接口
```typescript
interface DriverStats {
  driverId: string
  driverName: string
  driverPhone: string | null
  driverType: 'pure' | 'with_vehicle' | null  // 新增：司机类型
  licensePlate: string | null
  warehouseIds: string[]
  warehouseNames: string[]
  attendanceCount: number
  workDays: number
  actualAttendanceDays: number
  leaveDays: number  // 新增：请假天数
  joinDate: string | null
  workingDays: number
  attendanceRecords: AttendanceRecord[]  // 新增：打卡记录
}
```

### 7. 新增工具函数

#### formatTime 函数
```typescript
// 格式化时间
const formatTime = (dateStr: string) => {
  const date = new Date(dateStr)
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
}
```

## 优化效果

### 优化前
- 显示出勤率，但不够直观
- 在职天数占用统计数据位置
- 没有司机类型标识
- 无法查看详细打卡记录

### 优化后
- 显示请假天数，更直观地了解司机请假情况
- 在职天数放在入职日期后面，更合理
- 显示司机类型标签，一目了然
- 可以查看详细打卡记录，方便核对

## 用户体验改进

### 1. 信息更直观
- 请假天数比出勤率更直观
- 司机类型标签清晰可见
- 在职天数与入职日期放在一起更合理

### 2. 功能更完善
- 可以查看详细打卡记录
- 记录按时间倒序排列
- 显示上下班时间和仓库信息
- 状态标签清晰（已下班/未下班）

### 3. 布局更合理
- 统计数据区域显示最重要的信息
- 详细记录可展开/收起，不占用空间
- 司机类型标签与名字在同一行

## 相关文件
- `src/pages/super-admin/leave-approval/index.tsx` - 考勤管理页面（已优化）

## 测试建议

### 测试场景1：请假天数显示
1. 创建一个司机
2. 为该司机创建已批准的请假申请
3. 查看考勤管理页面
4. 应该显示正确的请假天数

### 测试场景2：司机类型标签
1. 创建纯司机和带车司机
2. 查看考勤管理页面
3. 应该显示不同颜色的司机类型标签

### 测试场景3：详细记录展示
1. 为司机创建多条打卡记录
2. 点击"查看详细记录"按钮
3. 应该显示所有打卡记录，按时间倒序排列
4. 点击"收起详细记录"按钮
5. 应该隐藏详细记录

### 测试场景4：在职天数显示
1. 查看司机的入职日期
2. 应该在入职日期后面显示在职天数
3. 格式：`入职日期：YYYY-MM-DD (在职 X 天)`

## 完成时间
2025-11-05
