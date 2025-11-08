# 司机端功能优化改进

## 📋 功能概述

本次优化对司机端功能进行了三个方面的改进：启动触发机制调整、离职申请管理功能增强、以及信息同步机制优化。

---

## ✅ 已实现功能

### 1. 启动触发机制调整

**实现位置**: `src/pages/driver/index.tsx`

**功能说明**:
- ✅ **已确认**：当前实现已经是"当天首次打开"逻辑，而非"早上首次打开"
- 使用 `new Date().toLocaleDateString('zh-CN')` 获取当天日期字符串
- 通过 `localStorage` 存储上次检测日期，确保只在当天首次打开时触发
- 不论司机何时打开应用（早上、中午、晚上），只要是当天第一次，都会触发打卡检测

**技术实现**:
```typescript
const checkAttendance = useCallback(async () => {
  if (!user) return

  try {
    const result = await checkTodayAttendance(user.id)
    setAttendanceCheck(result)

    // 获取今天的日期字符串（格式：YYYY/M/D）
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

**日期比较示例**:
- 2025/11/5 早上8点打开 → 触发检测，记录日期为 "2025/11/5"
- 2025/11/5 中午12点打开 → 不触发（日期相同）
- 2025/11/5 晚上8点打开 → 不触发（日期相同）
- 2025/11/6 凌晨1点打开 → 触发检测（日期变为 "2025/11/6"）

---

### 2. 离职申请管理功能

**实现位置**: 
- `src/db/api.ts` (API函数)
- `src/pages/driver/leave/index.tsx` (UI界面)

**功能说明**:
- ✅ 司机可以主动撤销**待审批状态**的离职申请
- ✅ 撤销操作需要二次确认，防止误操作
- ✅ 撤销后状态更新为"已撤销"（`cancelled`）
- ✅ 撤销后司机可以继续正常工作

**时间限制规则**:
- **只能撤销待审批状态的离职申请**
- 已批准或已拒绝的离职申请不能撤销
- 这样的设计确保了审批流程的严肃性

**技术实现**:

#### API函数 (`src/db/api.ts`)
```typescript
/**
 * 撤销离职申请
 * 只能撤销待审批状态的离职申请
 */
export async function cancelResignationApplication(
  resignationId: string,
  userId: string
): Promise<boolean> {
  try {
    // 先检查离职申请是否属于该用户
    const {data: resignation, error: fetchError} = await supabase
      .from('resignation_applications')
      .select('*')
      .eq('id', resignationId)
      .eq('user_id', userId)
      .maybeSingle()

    if (fetchError) {
      console.error('[cancelResignationApplication] 查询离职申请失败:', fetchError)
      return false
    }

    if (!resignation) {
      console.error('[cancelResignationApplication] 离职申请不存在或无权限')
      return false
    }

    // 只能撤销待审批状态的离职申请
    if (resignation.status !== 'pending') {
      console.error('[cancelResignationApplication] 只能撤销待审批状态的离职申请')
      return false
    }

    // 更新状态为已撤销
    const {error: updateError} = await supabase
      .from('resignation_applications')
      .update({
        status: 'cancelled',
        review_comment: '司机主动撤销'
      })
      .eq('id', resignationId)

    if (updateError) {
      console.error('[cancelResignationApplication] 更新失败:', updateError)
      return false
    }

    return true
  } catch (error) {
    console.error('[cancelResignationApplication] 未预期的错误:', error)
    return false
  }
}
```

#### 撤销函数 (`src/pages/driver/leave/index.tsx`)
```typescript
// 撤销待审批的离职申请
const handleCancelResignation = async (resignationId: string) => {
  if (!user) return

  const result = await showModal({
    title: '确认撤销',
    content: '确定要撤销这个离职申请吗？撤销后您可以继续正常工作。',
    confirmText: '确认撤销',
    cancelText: '取消'
  })

  if (result.confirm) {
    const success = await cancelResignationApplication(resignationId, user.id)

    if (success) {
      showToast({title: '撤销成功', icon: 'success', duration: 2000})
      // 刷新数据
      loadData()
    } else {
      showToast({title: '撤销失败，只能撤销待审批状态的申请', icon: 'none', duration: 2500})
    }
  }
}
```

#### 判断是否可以撤销
```typescript
// 判断是否可以撤销离职申请（只有待审批状态的离职申请可以撤销）
const canCancelResignation = (resignation: ResignationApplication): boolean => {
  return resignation.status === 'pending'
}
```

#### UI显示撤销按钮
```typescript
{/* 撤销按钮 - 只有待审批状态的离职申请才显示 */}
{canCancelResignation(app) && (
  <View className="mt-3 pt-3 border-t border-gray-200">
    <Button
      className="bg-orange-500 text-white rounded-lg py-2 active:bg-orange-600 transition-all text-sm"
      onClick={() => handleCancelResignation(app.id)}>
      <View className="flex items-center justify-center">
        <View className="i-mdi-cancel text-lg mr-1" />
        <Text className="text-white text-sm">撤销申请</Text>
      </View>
    </Button>
  </View>
)}
```

---

### 3. 信息同步机制

**实现位置**: 
- 管理端：`src/pages/manager/leave-approval/index.tsx`
- 超级管理员端：`src/pages/super-admin/leave-approval/index.tsx`

**功能说明**:
- ✅ 使用 Supabase 数据库，数据实时共享
- ✅ 管理端页面使用 `useDidShow` Hook，在页面显示时自动刷新数据
- ✅ 当司机撤销请假或离职申请时，管理端会在下次打开页面时看到最新状态
- ✅ 支持下拉刷新，手动获取最新数据

**技术实现**:

#### 管理端页面 (`src/pages/manager/leave-approval/index.tsx`)
```typescript
// 页面显示时刷新数据
useDidShow(() => {
  loadData()
})

// 下拉刷新
usePullDownRefresh(async () => {
  await Promise.all([loadData()])
  Taro.stopPullDownRefresh()
})
```

#### 超级管理员页面 (`src/pages/super-admin/leave-approval/index.tsx`)
```typescript
// 页面显示时刷新数据
useDidShow(() => {
  loadData()
})

// 下拉刷新
usePullDownRefresh(async () => {
  await Promise.all([loadData()])
  Taro.stopPullDownRefresh()
})
```

**同步流程**:
```
司机撤销请假/离职申请
  ↓
更新 Supabase 数据库
  ↓
管理端打开审批页面
  ↓
useDidShow 触发
  ↓
loadData() 从数据库获取最新数据
  ↓
显示最新状态（已撤销）
```

---

## 🔄 用户交互流程

### 流程1: 当天首次打开应用

```
司机打开应用（任何时间）
  ↓
检查 localStorage 中的日期
  ↓
日期不同? ──→ 是 ──→ 当天首次打开
  │                    ↓
  │              检测打卡状态
  │                    ↓
  │              未打卡? ──→ 是 ──→ 弹出打卡提醒
  │                    ↓
  │              记录今天的日期
  ↓
日期相同 ──→ 不是首次打开，不触发检测
```

### 流程2: 撤销离职申请

```
司机查看离职申请记录
  ↓
找到待审批状态的离职申请
  ↓
点击"撤销申请"按钮
  ↓
确认撤销对话框
  ↓
点击"确认撤销"
  ↓
检查申请状态
  ↓
状态为待审批? ──→ 是 ──→ 更新状态为"已撤销"
  │                      ↓
  │                  显示"撤销成功"
  │                      ↓
  │                  刷新页面数据
  ↓
状态不是待审批 ──→ 显示"撤销失败，只能撤销待审批状态的申请"
```

### 流程3: 管理端同步更新

```
司机撤销申请
  ↓
Supabase 数据库更新
  ↓
管理员打开审批页面
  ↓
useDidShow 触发
  ↓
从数据库加载最新数据
  ↓
显示"已撤销"状态
  ↓
管理员看到最新状态
```

---

## 📊 状态对比

### 请假申请状态
| 状态 | 说明 | 可撤销 | 撤销条件 |
|------|------|--------|----------|
| `pending` | 待审批 | ❌ | - |
| `approved` | 已批准 | ✅ | 只有包含今天的请假可以撤销 |
| `rejected` | 已拒绝 | ❌ | - |
| `cancelled` | 已撤销 | ❌ | - |

### 离职申请状态
| 状态 | 说明 | 可撤销 | 撤销条件 |
|------|------|--------|----------|
| `pending` | 待审批 | ✅ | 任何时候都可以撤销 |
| `approved` | 已批准 | ❌ | - |
| `rejected` | 已拒绝 | ❌ | - |
| `cancelled` | 已撤销 | ❌ | - |

**设计理由**:
- **请假申请**：只能撤销已批准且包含今天的请假，因为已经生效的请假需要撤销后才能恢复工作
- **离职申请**：只能撤销待审批状态的申请，因为一旦批准就涉及到人事流程，不应随意撤销

---

## 🎨 UI界面

### 离职申请卡片（待审批状态）

```
┌─────────────────────────────────────┐
│ 🚪 离职申请              待审批     │
├─────────────────────────────────────┤
│ 预计离职日期：2025-12-31            │
│ 离职原因：个人原因                  │
│ 申请时间：2025-11-05                │
├─────────────────────────────────────┤
│ [🚫 撤销申请]                       │
└─────────────────────────────────────┘
```

### 离职申请卡片（已批准状态）

```
┌─────────────────────────────────────┐
│ 🚪 离职申请              已通过     │
├─────────────────────────────────────┤
│ 预计离职日期：2025-12-31            │
│ 离职原因：个人原因                  │
│ 审批意见：同意                      │
│ 申请时间：2025-11-05                │
└─────────────────────────────────────┘
（无撤销按钮）
```

### 离职申请卡片（已撤销状态）

```
┌─────────────────────────────────────┐
│ 🚪 离职申请              已撤销     │
├─────────────────────────────────────┤
│ 预计离职日期：2025-12-31            │
│ 离职原因：个人原因                  │
│ 审批意见：司机主动撤销              │
│ 申请时间：2025-11-05                │
└─────────────────────────────────────┘
（无撤销按钮）
```

---

## 📝 测试建议

### 测试场景1: 当天首次打开检测
1. 清除浏览器 `localStorage`
2. 早上8点打开应用，验证触发打卡检测
3. 关闭应用，中午12点再次打开，验证不触发检测
4. 关闭应用，晚上8点再次打开，验证不触发检测
5. 等到第二天凌晨1点打开，验证触发打卡检测

### 测试场景2: 撤销待审批的离职申请
1. 提交一个离职申请
2. 在审批前，进入请假管理页面
3. 找到待审批的离职申请，验证显示"撤销申请"按钮
4. 点击"撤销申请"，确认撤销
5. 验证状态更新为"已撤销"
6. 验证"撤销申请"按钮消失

### 测试场景3: 尝试撤销已批准的离职申请
1. 提交一个离职申请
2. 管理员批准该申请
3. 司机进入请假管理页面
4. 找到已批准的离职申请，验证**不显示**"撤销申请"按钮

### 测试场景4: 管理端同步更新
1. 司机提交一个离职申请
2. 管理员打开审批页面，验证显示"待审批"状态
3. 司机撤销该离职申请
4. 管理员关闭审批页面，再次打开
5. 验证管理端显示"已撤销"状态

### 测试场景5: 下拉刷新
1. 司机提交一个离职申请
2. 管理员打开审批页面
3. 司机撤销该离职申请
4. 管理员在审批页面下拉刷新
5. 验证管理端显示"已撤销"状态

---

## ✅ 完成状态

- ✅ 启动触发机制已确认为"当天首次打开"
- ✅ 离职申请撤销功能已实现
- ✅ 撤销操作需要二次确认
- ✅ 只能撤销待审批状态的离职申请
- ✅ 管理端使用 useDidShow 自动同步数据
- ✅ 支持下拉刷新手动同步
- ✅ 代码质量检查通过

---

## 🔍 技术细节

### localStorage 日期存储格式

使用 `toLocaleDateString('zh-CN')` 生成的日期格式：
- 格式：`YYYY/M/D`（月和日不补零）
- 示例：`2025/11/5`、`2025/12/25`

这种格式的优点：
- 简洁明了
- 易于比较（字符串比较即可）
- 符合中文习惯

### 数据库状态更新

撤销操作会更新两个字段：
```typescript
{
  status: 'cancelled',           // 状态更新为已撤销
  review_comment: '司机主动撤销'  // 记录撤销原因
}
```

这样设计的好处：
- 管理员可以看到撤销原因
- 保留完整的操作记录
- 便于后续审计和统计

---

## 📅 创建时间

2025-11-05

---

## 👨‍💻 开发者备注

所有功能已完整实现并通过代码检查。系统现在支持：
1. 当天首次打开时触发打卡检测（不限时间）
2. 司机可以撤销待审批状态的离职申请
3. 管理端自动同步最新状态

这些优化提升了系统的灵活性和用户体验，同时保持了审批流程的严肃性。
