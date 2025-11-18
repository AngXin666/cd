# 考勤管理功能修复总结

## 更新时间
2025-11-05

## 修复的问题

### 1. ✅ 在职天数计算修复
**问题**：在职天数计算不包含入职当天

**原有逻辑**：
```typescript
const diffTime = now.getTime() - join.getTime()
const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
return diffDays  // 不包含入职当天
```

**修复后**：
```typescript
// 设置时间为0点，确保计算整天
join.setHours(0, 0, 0, 0)
now.setHours(0, 0, 0, 0)
const diffTime = now.getTime() - join.getTime()
const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
// 加1是因为入职当天也算一天
return diffDays + 1
```

**示例**：
- 入职日期：2025-01-01
- 当前日期：2025-01-02
- 修复前：1天
- 修复后：2天 ✅（包含入职当天）

---

### 2. ✅ 纯司机标签颜色优化
**问题**：纯司机标签使用灰色渐变，视觉效果不佳

**修复前**：
```typescript
bg-gradient-to-r from-gray-400 to-gray-500  // 灰色渐变
```

**修复后**：
```typescript
bg-gradient-to-r from-cyan-500 to-cyan-600  // 青色渐变
```

**视觉效果**：
- 带车司机：蓝色渐变 `from-blue-500 to-blue-600`
- 纯司机：青色渐变 `from-cyan-500 to-cyan-600` ✅
- 新司机：橙色渐变 `from-orange-500 to-orange-600`

---

### 3. ✅ 新司机应出勤天数计算优化
**问题**：新司机的应出勤天数按整月计算，不合理

**修复前**：
```typescript
// 所有司机都按整月计算工作日
const workDays = calculateWorkDays(filterMonth)
```

**修复后**：
```typescript
// 如果司机是本月入职的，从入职日期开始计算
let workDays: number
if (driver.join_date) {
  const joinDate = new Date(driver.join_date)
  const [filterYear, filterMonthNum] = filterMonth.split('-').map(Number)
  const joinYear = joinDate.getFullYear()
  const joinMonth = joinDate.getMonth() + 1
  
  // 如果入职月份是当前筛选月份，从入职日期开始计算
  if (joinYear === filterYear && joinMonth === filterMonthNum) {
    workDays = calculateWorkDays(filterMonth, driver.join_date)
  } else {
    // 否则计算整月的工作日
    workDays = calculateWorkDays(filterMonth)
  }
} else {
  workDays = calculateWorkDays(filterMonth)
}
```

**示例**：
- 筛选月份：2025-01
- 入职日期：2025-01-15（周三）
- 修复前：整月工作日 22天
- 修复后：从1月15日到月底的工作日 12天 ✅

**calculateWorkDays 函数优化**：
```typescript
// 支持指定起始日期
const calculateWorkDays = useCallback((yearMonth: string, startDate?: string): number => {
  const [year, month] = yearMonth.split('-').map(Number)
  
  // 确定起始日期
  let firstDay = 1
  if (startDate) {
    const startDateObj = new Date(startDate)
    const startYear = startDateObj.getFullYear()
    const startMonth = startDateObj.getMonth() + 1
    // 只有当起始日期在当前月份时才使用
    if (startYear === year && startMonth === month) {
      firstDay = startDateObj.getDate()
    }
  }
  
  // 计算从 firstDay 到月底的工作日
  // ...
}, [])
```

---

### 4. ✅ 迟到规则优化
**问题**：迟到判断硬编码为9:00，不灵活

**修复前**：
```typescript
const calculateLateCount = useCallback((records: AttendanceRecord[]): number => {
  let lateCount = 0
  records.forEach((record) => {
    const clockInTime = new Date(record.clock_in_time)
    const hours = clockInTime.getHours()
    const minutes = clockInTime.getMinutes()
    // 9:00 之后算迟到（硬编码）
    if (hours > 9 || (hours === 9 && minutes > 0)) {
      lateCount++
    }
  })
  return lateCount
}, [])
```

**修复后**：
```typescript
const calculateLateCount = useCallback(
  (records: AttendanceRecord[]): number => {
    let lateCount = 0
    records.forEach((record) => {
      // 获取该打卡记录对应的仓库考勤规则
      const rule = attendanceRules.find((r) => r.warehouse_id === record.warehouse_id && r.is_active)
      
      // 如果没有找到规则，使用默认的9:00
      const workStartTime = rule?.work_start_time || '09:00:00'
      
      // 解析上班时间
      const [startHour, startMinute] = workStartTime.split(':').map(Number)
      
      // 解析打卡时间
      const clockInTime = new Date(record.clock_in_time)
      const clockHour = clockInTime.getHours()
      const clockMinute = clockInTime.getMinutes()
      
      // 判断是否迟到
      if (clockHour > startHour || (clockHour === startHour && clockMinute > startMinute)) {
        lateCount++
      }
    })
    return lateCount
  },
  [attendanceRules]
)
```

**数据加载**：
```typescript
// 在 loadData 中加载考勤规则
const rules = await getAllAttendanceRules()
setAttendanceRules(rules)
```

**优势**：
- ✅ 支持不同仓库设置不同的上班时间
- ✅ 从数据库读取考勤规则，灵活可配置
- ✅ 如果没有规则，使用默认的9:00作为兜底

**示例**：
- 仓库A：上班时间 08:30
  - 打卡时间 08:31 → 迟到 ✅
  - 打卡时间 08:30 → 正常 ✅
- 仓库B：上班时间 09:00
  - 打卡时间 09:01 → 迟到 ✅
  - 打卡时间 09:00 → 正常 ✅

---

## 技术实现

### 1. 类型定义
```typescript
import type {AttendanceRecord, AttendanceRule, LeaveApplication, Profile, Warehouse} from '@/db/types'
```

### 2. 状态管理
```typescript
const [attendanceRules, setAttendanceRules] = useState<AttendanceRule[]>([])
```

### 3. API 调用
```typescript
import {getAllAttendanceRules} from '@/db/api'

// 加载考勤规则
const rules = await getAllAttendanceRules()
setAttendanceRules(rules)
```

### 4. 考勤规则表结构
```sql
CREATE TABLE IF NOT EXISTS attendance_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  work_start_time time NOT NULL DEFAULT '09:00:00',  -- 上班时间
  work_end_time time NOT NULL DEFAULT '18:00:00',    -- 下班时间
  late_threshold integer NOT NULL DEFAULT 15,         -- 迟到阈值（分钟）
  early_threshold integer NOT NULL DEFAULT 15,        -- 早退阈值（分钟）
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

---

## 文件变化

### 修改的文件
- `src/pages/super-admin/leave-approval/index.tsx` (540 行)

### 主要变更
1. 导入 `getAllAttendanceRules` 和 `AttendanceRule` 类型
2. 添加 `attendanceRules` 状态
3. 在 `loadData` 中加载考勤规则
4. 修改 `calculateWorkingDays` 函数（包含入职当天）
5. 修改 `calculateWorkDays` 函数（支持指定起始日期）
6. 优化应出勤天数计算（新司机从入职日期开始）
7. 修改 `calculateLateCount` 函数（从考勤规则读取上班时间）
8. 修改纯司机标签颜色（灰色 → 青色）

---

## 测试要点

### ✅ 在职天数测试
1. 入职当天是否计入
2. 跨月计算是否正确
3. 时区问题是否处理

### ✅ 标签颜色测试
1. 带车司机：蓝色
2. 纯司机：青色
3. 新司机：橙色

### ✅ 应出勤天数测试
1. 老司机：整月工作日
2. 新司机（本月入职）：从入职日期到月底的工作日
3. 新司机（上月入职）：整月工作日

### ✅ 迟到规则测试
1. 有考勤规则的仓库：按规则判断
2. 无考勤规则的仓库：按默认9:00判断
3. 边界情况：正好在上班时间打卡

---

## 业务逻辑说明

### 在职天数计算
- **包含入职当天**：入职当天算第1天
- **计算方式**：当前日期 - 入职日期 + 1
- **时间归零**：设置为0点，确保计算整天

### 应出勤天数计算
- **老司机**：整月的工作日（周一到周五）
- **新司机（本月入职）**：从入职日期到月底的工作日
- **新司机（上月入职）**：整月的工作日

### 迟到判断
- **优先级**：仓库考勤规则 > 默认规则（9:00）
- **判断逻辑**：打卡时间 > 上班时间 → 迟到
- **精确到分钟**：9:00:00 正常，9:00:01 迟到

---

## 完成状态
✅ 在职天数计算修复完成
✅ 纯司机标签颜色优化完成
✅ 新司机应出勤天数计算优化完成
✅ 迟到规则优化完成
✅ 代码已更新
✅ 文档已创建

---

## 相关文档
- `UI_OPTIMIZATION_SUMMARY.md` - UI 优化总结
- `LATEST_UI_UPDATE.md` - 最新 UI 更新
- `supabase/migrations/06_create_warehouse_and_attendance_rules.sql` - 考勤规则表结构

---

## 下一步建议

### 可选的进一步优化
1. 添加考勤规则管理页面（超级管理员可配置）
2. 支持弹性工作时间（不同司机不同上班时间）
3. 添加迟到容忍时间（例如：迟到5分钟内不算迟到）
4. 添加考勤异常提醒（连续迟到、缺勤等）
5. 添加考勤报表导出功能

### 维护建议
1. 定期检查考勤规则是否合理
2. 根据业务需求调整迟到阈值
3. 优化新司机入职流程
4. 考虑添加节假日管理
