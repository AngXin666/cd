# 司机端考勤打卡提醒与请假管理优化

## 📋 功能概述

本次优化实现了智能化的考勤打卡提醒与请假管理系统，确保司机在工作前完成打卡，并支持请假状态的豁免和主动撤销。

---

## ✅ 已实现功能

### 1. 每日首次登录检测机制

**实现位置**: `src/pages/driver/index.tsx`

**功能说明**:
- 司机每日首次登录APP时，系统自动检测其当日的打卡状态
- 若未打卡，则弹出提示框："您今日尚未打卡，是否立即去打卡？"
- 按钮选项：
  - **"立即打卡"**: 跳转至考勤打卡界面
  - **"稍后再说"**: 直接进入系统主界面
- 使用 `localStorage` 记录每日检测状态，避免重复弹窗

**技术实现**:
```typescript
// 检测打卡状态
const checkAttendance = useCallback(async () => {
  if (!user) return

  try {
    const result = await checkTodayAttendance(user.id)
    setAttendanceCheck(result)

    // 获取今天的日期字符串
    const today = new Date().toLocaleDateString('zh-CN')

    // 检查是否今天已经检测过
    const lastCheckDate = localStorage.getItem('lastAttendanceCheckDate')

    // 如果今天还没检测过，且需要打卡，则显示提醒
    if (lastCheckDate !== today && result.needClockIn) {
      setShowClockInReminder(true)
      // 记录今天已检测过
      localStorage.setItem('lastAttendanceCheckDate', today)
      hasCheckedToday.current = true
    }
  } catch (error) {
    console.error('[DriverHome] 检测打卡状态失败:', error)
  }
}, [user])
```

---

### 2. 启动计件工作前的二次检测

**实现位置**: `src/pages/driver/piece-work-entry/index.tsx`

**功能说明**:
- 当司机点击"提交录入"以开始计件工作时，系统再次检测其当日打卡状态
- 若此时仍未打卡，则弹出与首次登录时相同的提示框，引导司机完成打卡
- 若在请假中，则提示"您今天在休假中，无法进行计件操作"

**技术实现**:
```typescript
// 提交表单前检测
const handleSubmit = async () => {
  if (!user?.id) {
    Taro.showToast({
      title: '请先登录',
      icon: 'none'
    })
    return
  }

  // 检测是否可以进行计件操作
  const checkResult = await canStartPieceWork(user.id)

  if (!checkResult.canStart) {
    // 如果不能计件，显示提示
    if (checkResult.checkResult.onLeave) {
      // 在请假中
      Taro.showToast({
        title: checkResult.reason || '您今天在休假中，无法进行计件操作',
        icon: 'none',
        duration: 2500
      })
      return
    } else if (checkResult.checkResult.needClockIn) {
      // 未打卡，显示打卡提醒弹窗
      Taro.showModal({
        title: '打卡提醒',
        content: '您今日尚未打卡，是否立即去打卡？',
        confirmText: '立即打卡',
        cancelText: '稍后再说',
        success: (res) => {
          if (res.confirm) {
            Taro.navigateTo({url: '/pages/driver/clock-in/index'})
          }
        }
      })
      return
    }
  }

  // 继续提交逻辑...
}
```

---

### 3. 请假状态的豁免逻辑

**实现位置**: 
- `src/pages/driver/index.tsx` (司机工作台)
- `src/pages/driver/clock-in/index.tsx` (考勤打卡页面)

**功能说明**:
- 若司机已获批当日请假，则该日可豁免打卡要求
- 处于请假状态的司机：
  - ✅ **司机工作台右边醒目提示"今天您休息"**
  - ✅ **无法进行打卡操作**（打卡按钮显示"今日休假，无需打卡"并禁用）
  - ✅ **无法进行计件操作**（提交时检测并阻止）
  - ✅ **其他APP功能**（如查看信息、设置等）可正常使用

**技术实现**:

**司机工作台显示请假状态**:
```typescript
{/* 请假状态提示 */}
{attendanceCheck?.onLeave && (
  <View className="bg-orange-500 rounded-lg px-4 py-2 ml-4">
    <View className="flex items-center">
      <View className="i-mdi-beach text-2xl text-white mr-2" />
      <View>
        <Text className="text-white text-sm font-bold block">今天您休息</Text>
        <Text className="text-orange-100 text-xs block">无需打卡</Text>
      </View>
    </View>
  </View>
)}
```

**打卡页面禁用打卡按钮**:
```typescript
const getButtonInfo = () => {
  // 如果在请假中，禁用打卡按钮
  if (isOnLeave) {
    return {
      text: '今日休假，无需打卡',
      icon: 'i-mdi-beach',
      disabled: true,
      bgColor: 'bg-gradient-to-br from-orange-400 to-orange-500',
      disabledBgColor: 'bg-gray-300'
    }
  }
  // ...其他逻辑
}
```

---

### 4. 假期的主动撤销与打卡

**实现位置**: `src/pages/driver/leave/index.tsx`

**功能说明**:
- 司机具备"主动撤销已批准假期"的权限
- 撤销已获批的当日假期后：
  - ✅ 系统立即将其状态更新为"已撤销"（`cancelled`）
  - ✅ 随后当司机进行登录或尝试计件时，将正常触发未打卡检测与提示流程
  - ✅ 允许其完成打卡后开始计件工作

**技术实现**:

**撤销请假函数**:
```typescript
// 撤销已批准的请假
const handleCancelLeave = async (leaveId: string) => {
  if (!user) return

  const result = await showModal({
    title: '确认撤销',
    content: '确定要撤销这个已批准的请假吗？撤销后您将恢复正常工作状态，需要打卡。',
    confirmText: '确认撤销',
    cancelText: '取消'
  })

  if (result.confirm) {
    const success = await cancelLeaveApplication(leaveId, user.id)

    if (success) {
      showToast({title: '撤销成功', icon: 'success', duration: 2000})
      // 刷新数据
      loadData()
    } else {
      showToast({title: '撤销失败，请稍后重试', icon: 'none', duration: 2000})
    }
  }
}
```

**判断是否可以撤销**:
```typescript
// 判断是否可以撤销请假（只有已批准且包含今天的请假可以撤销）
const canCancelLeave = (leave: LeaveApplication): boolean => {
  if (leave.status !== 'approved') return false

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const startDate = new Date(leave.start_date)
  startDate.setHours(0, 0, 0, 0)

  const endDate = new Date(leave.end_date)
  endDate.setHours(23, 59, 59, 999)

  // 只有包含今天的请假才能撤销
  return today >= startDate && today <= endDate
}
```

**UI显示撤销按钮**:
```typescript
{/* 撤销按钮 - 只有已批准且包含今天的请假才显示 */}
{canCancelLeave(app) && (
  <View className="mt-3 pt-3 border-t border-gray-200">
    <Button
      className="bg-orange-500 text-white rounded-lg py-2 active:bg-orange-600 transition-all text-sm"
      onClick={() => handleCancelLeave(app.id)}>
      <View className="flex items-center justify-center">
        <View className="i-mdi-cancel text-lg mr-1" />
        <Text className="text-white text-sm">撤销请假</Text>
      </View>
    </Button>
  </View>
)}
```

---

## 🛠️ 核心工具函数

### 考勤检测工具 (`src/utils/attendance-check.ts`)

提供了三个核心检测函数：

#### 1. `checkTodayAttendance(userId: string)`
检测司机当日的打卡状态，返回详细的检测结果。

**返回值**:
```typescript
interface AttendanceCheckResult {
  needClockIn: boolean      // 是否需要打卡
  hasClockedIn: boolean     // 是否已打卡
  onLeave: boolean          // 是否在请假中
  leaveId?: string          // 请假记录ID
  leaveType?: string        // 请假类型
  message: string           // 提示消息
}
```

#### 2. `canStartPieceWork(userId: string)`
检测是否可以进行计件操作。

**返回值**:
```typescript
{
  canStart: boolean                    // 是否可以计件
  reason?: string                      // 不能计件的原因
  checkResult: AttendanceCheckResult   // 详细检测结果
}
```

#### 3. `canClockIn(userId: string)`
检测是否可以打卡。

**返回值**:
```typescript
{
  canClockIn: boolean                  // 是否可以打卡
  reason?: string                      // 不能打卡的原因
  checkResult: AttendanceCheckResult   // 详细检测结果
}
```

---

## 📊 数据库变更

### 新增API函数 (`src/db/api.ts`)

#### 1. `getApprovedLeaveForToday(userId: string)`
获取用户当日已批准的请假记录。

```typescript
export async function getApprovedLeaveForToday(userId: string): Promise<LeaveApplication | null> {
  try {
    const today = getLocalDateString()

    const {data, error} = await supabase
      .from('leave_applications')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'approved')
      .lte('start_date', today)
      .gte('end_date', today)
      .order('created_at', {ascending: false})
      .maybeSingle()

    if (error) {
      console.error('[getApprovedLeaveForToday] 查询失败:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('[getApprovedLeaveForToday] 未预期的错误:', error)
    return null
  }
}
```

#### 2. `cancelLeaveApplication(leaveId: string, userId: string)`
撤销请假申请。

```typescript
export async function cancelLeaveApplication(leaveId: string, userId: string): Promise<boolean> {
  try {
    // 先检查请假记录是否属于该用户
    const {data: leave, error: fetchError} = await supabase
      .from('leave_applications')
      .select('*')
      .eq('id', leaveId)
      .eq('user_id', userId)
      .maybeSingle()

    if (fetchError) {
      console.error('[cancelLeaveApplication] 查询请假记录失败:', fetchError)
      return false
    }

    if (!leave) {
      console.error('[cancelLeaveApplication] 请假记录不存在或无权限')
      return false
    }

    // 只能撤销已批准的请假
    if (leave.status !== 'approved') {
      console.error('[cancelLeaveApplication] 只能撤销已批准的请假')
      return false
    }

    // 更新状态为已撤销
    const {error: updateError} = await supabase
      .from('leave_applications')
      .update({
        status: 'cancelled',
        review_comment: '司机主动撤销'
      })
      .eq('id', leaveId)

    if (updateError) {
      console.error('[cancelLeaveApplication] 更新失败:', updateError)
      return false
    }

    return true
  } catch (error) {
    console.error('[cancelLeaveApplication] 未预期的错误:', error)
    return false
  }
}
```

### 数据库迁移

**文件**: `supabase/migrations/21_add_cancelled_status_to_leave.sql`

**变更内容**:
- 在 `application_status` 枚举类型中添加 `'cancelled'` 状态
- 允许司机主动撤销已批准的请假申请

**状态说明**:
- `pending`: 待审批
- `approved`: 已批准
- `rejected`: 已拒绝
- `cancelled`: 已撤销（新增）

---

## 🎨 UI组件

### 打卡提醒弹窗 (`src/components/attendance/ClockInReminderModal.tsx`)

一个美观的弹窗组件，用于提醒司机完成打卡。

**特性**:
- 醒目的图标和渐变背景
- 清晰的提示消息
- 两个操作按钮："稍后再说" 和 "立即打卡"
- 响应式设计，适配不同屏幕尺寸

---

## 🔄 用户交互流程

### 流程1: 每日首次登录

```
司机登录 
  ↓
检测打卡状态
  ↓
未打卡? ──→ 是 ──→ 弹出提醒弹窗
  │                    ↓
  │              点击"立即打卡" ──→ 跳转打卡页面
  │                    ↓
  │              点击"稍后再说" ──→ 进入主界面
  ↓
已打卡 ──→ 直接进入主界面
```

### 流程2: 启动计件工作

```
司机点击"提交录入"
  ↓
检测打卡状态
  ↓
在请假中? ──→ 是 ──→ 提示"您今天在休假中，无法进行计件操作"
  │                    ↓
  │                  阻止提交
  ↓
未打卡? ──→ 是 ──→ 弹出打卡提醒
  │                ↓
  │          点击"立即打卡" ──→ 跳转打卡页面
  │                ↓
  │          点击"稍后再说" ──→ 返回
  ↓
已打卡 ──→ 继续提交计件记录
```

### 流程3: 撤销请假

```
司机查看请假记录
  ↓
找到已批准且包含今天的请假
  ↓
点击"撤销请假"按钮
  ↓
确认撤销对话框
  ↓
点击"确认撤销"
  ↓
更新请假状态为"已撤销"
  ↓
刷新页面数据
  ↓
司机可以正常打卡和计件
```

---

## 📝 测试建议

### 测试场景1: 首次登录检测
1. 清除浏览器 `localStorage`
2. 确保今天未打卡
3. 登录司机账号
4. 验证是否弹出打卡提醒弹窗
5. 点击"立即打卡"，验证是否跳转到打卡页面
6. 返回主界面，再次刷新，验证不会重复弹窗

### 测试场景2: 计件前检测
1. 确保今天未打卡
2. 进入计件录入页面
3. 填写计件信息
4. 点击"提交录入"
5. 验证是否弹出打卡提醒
6. 完成打卡后，再次提交，验证可以正常提交

### 测试场景3: 请假状态豁免
1. 申请并批准今天的请假
2. 登录司机账号
3. 验证工作台右侧显示"今天您休息"
4. 进入打卡页面，验证按钮显示"今日休假，无需打卡"并禁用
5. 尝试提交计件，验证提示"您今天在休假中，无法进行计件操作"

### 测试场景4: 撤销请假
1. 申请并批准今天的请假
2. 进入请假管理页面
3. 找到今天的请假记录，验证显示"撤销请假"按钮
4. 点击"撤销请假"，确认撤销
5. 验证请假状态更新为"已撤销"
6. 返回工作台，验证不再显示"今天您休息"
7. 验证可以正常打卡和计件

---

## ✅ 完成状态

- ✅ 每日首次登录检测机制
- ✅ 启动计件工作前的二次检测
- ✅ 请假状态的豁免逻辑
- ✅ 假期的主动撤销与打卡功能
- ✅ 数据库迁移和API函数
- ✅ UI组件和用户交互
- ✅ 代码质量检查通过

---

## 📅 创建时间

2025-11-05

---

## 👨‍💻 开发者备注

所有功能已完整实现并通过代码检查。系统现在能够智能地管理司机的考勤打卡和请假状态，确保工作流程的规范性和灵活性。
