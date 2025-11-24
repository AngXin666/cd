# 通知中心修复说明

## 问题描述

司机发起请假申请并且提交成功以后，双管理员端都仅仅提示弹窗提示收到新的申请，但是：
- ❌ 首页的通知栏没有信息通知
- ❌ 通知中心也收不到信息

## 问题分析

系统已经有轮询机制（`usePollingNotifications` Hook），每 10 秒检查一次新的请假申请：
1. ✅ 检测到新申请时，会显示 Toast 弹窗
2. ✅ 会调用 `onNewNotification` 回调，添加到首页通知栏
3. ❌ **但是没有写入数据库的通知中心**

## 解决方案

### 核心思路
**在弹窗提示的同时，同步写入数据库通知中心**

### 实现步骤

1. **修改 `showNotification` 函数**
   - 添加 `targetUserId` 参数
   - 在显示 Toast 的同时，调用 `createNotification` API 写入数据库

2. **修改所有检查函数**
   - `checkLeaveApplications` - 管理员检查新的请假申请
   - `checkLeaveApplicationStatus` - 司机检查请假申请状态
   - `checkResignationApplications` - 管理员检查新的离职申请
   - `checkResignationApplicationStatus` - 司机检查离职申请状态

3. **传入当前用户 ID**
   - 每个管理员只为自己写入通知记录
   - 司机也为自己写入通知记录

## 代码修改

### 文件：`src/hooks/usePollingNotifications.ts`

#### 1. 导入必要的函数

```typescript
import {
  getAllAttendanceRecords,
  getAllLeaveApplications,
  getAllResignationApplications,
  getDriverName  // 新增：获取司机姓名
} from '@/db/api'
import {createNotification} from '@/db/notificationApi'  // 新增：写入通知中心
```

#### 2. 修改 `showNotification` 函数

```typescript
const showNotification = useCallback(
  async (
    title: string,
    content: string,
    key: string,
    type: Notification['type'],
    data?: any,
    targetUserId?: string  // 新增参数
  ) => {
    if (shouldShowNotification(key)) {
      // 显示 Toast 通知
      Taro.showToast({title, icon: 'none', duration: 2000})
      
      // 震动反馈
      Taro.vibrateShort({type: 'light'})
      
      // 添加到通知栏
      if (onNewNotification) {
        onNewNotification({type, title, content, data})
      }
      
      // 🆕 写入数据库通知中心
      if (targetUserId) {
        await createNotification({
          user_id: targetUserId,
          type: key,
          title,
          message: content,
          related_id: data?.applicationId || null
        })
      }
    }
  },
  [shouldShowNotification, onNewNotification]
)
```

#### 3. 修改检查函数

**管理员检查新的请假申请：**

```typescript
const checkLeaveApplications = useCallback(async () => {
  const applications = await getAllLeaveApplications()
  const newApplications = applications.filter(
    (app) => new Date(app.created_at).getTime() > lastCheckTime.current && app.status === 'pending'
  )

  if (newApplications.length > 0) {
    // 获取司机姓名
    const driverName = await getDriverName(newApplications[0].user_id)
    
    // 显示 Toast 并写入数据库
    await showNotification(
      '收到新的请假申请',
      `司机 ${driverName} 提交了请假申请`,
      'leave_application_submitted',
      'leave_application',
      {applicationId: newApplications[0].id},
      userId  // 🆕 为当前管理员写入数据库通知
    )
    
    onLeaveApplicationChange?.()
  }
}, [userId, showNotification, onLeaveApplicationChange])
```

**司机检查请假申请状态：**

```typescript
const checkLeaveApplicationStatus = useCallback(async () => {
  const applications = await getAllLeaveApplications()
  const myApplications = applications.filter((app) => app.user_id === userId)
  const recentlyUpdated = myApplications.filter(
    (app) =>
      new Date(app.reviewed_at || app.created_at).getTime() > lastCheckTime.current &&
      (app.status === 'approved' || app.status === 'rejected')
  )

  if (recentlyUpdated.length > 0) {
    const app = recentlyUpdated[0]
    if (app.status === 'approved') {
      await showNotification(
        '您的请假申请已通过',
        '您的请假申请已通过审批',
        'leave_approved',
        'approval',
        {applicationId: app.id},
        userId  // 🆕 为司机写入数据库通知
      )
    } else if (app.status === 'rejected') {
      await showNotification(
        '您的请假申请已被驳回',
        '您的请假申请已被驳回',
        'leave_rejected',
        'approval',
        {applicationId: app.id},
        userId  // 🆕 为司机写入数据库通知
      )
    }
    onLeaveApplicationChange?.()
  }
}, [userId, showNotification, onLeaveApplicationChange])
```

## 工作流程

### 完整流程图

```
司机提交请假申请
    ↓
10 秒后，管理员的轮询检测到新申请
    ↓
调用 checkLeaveApplications()
    ↓
获取司机姓名
    ↓
调用 showNotification()
    ├─ 显示 Toast 弹窗 ✅
    ├─ 添加到首页通知栏 ✅
    └─ 写入数据库通知中心 ✅ (新增)
    ↓
管理员可以在通知中心查看 ✅
```

## 优势

### 1. 不需要修改 RLS 策略
- ❌ 之前的错误方案：修改 RLS 策略，允许司机查询管理员信息
- ✅ 正确方案：每个用户只为自己写入通知记录

### 2. 不需要批量创建通知
- ❌ 之前的错误方案：司机提交申请时，为所有管理员创建通知
- ✅ 正确方案：每个管理员的轮询检测到新申请时，为自己创建通知

### 3. 代码简洁
- 只修改一个文件：`src/hooks/usePollingNotifications.ts`
- 不需要修改数据库迁移
- 不需要修改其他页面

### 4. 逻辑清晰
- 弹窗提示和数据库写入在同一个地方
- 每个用户只管理自己的通知记录
- 不会出现权限问题

## 测试验证

### 测试步骤

1. **登录司机账号**（13800000003）
2. **提交请假申请**
3. **等待 10 秒**（轮询间隔）
4. **登录管理员账号**（13800000001 或 13800000002）
5. **查看首页通知栏** - ✅ 应该看到通知
6. **点击右上角铃铛图标** - ✅ 应该看到通知中心有记录
7. **登录另一个管理员账号** - ✅ 也应该看到通知

### 预期结果

**管理员首页通知栏：**
- ✅ 显示橙色通知卡片
- ✅ 标题："收到新的请假申请"
- ✅ 内容："司机 XXX 提交了请假申请"

**管理员通知中心：**
- ✅ 铃铛图标显示未读数量
- ✅ 通知列表显示请假申请通知
- ✅ 可以点击查看详情
- ✅ 可以标记已读、删除

## 相关文件

- ✅ `src/hooks/usePollingNotifications.ts` - 唯一修改的文件

## 提交记录

- `da79b44` - 修复通知系统：在弹窗提示的同时写入数据库通知中心

## 总结

### 问题
- 管理员能收到弹窗提示，但通知中心没有记录

### 原因
- 轮询检测到新申请时，只显示 Toast，没有写入数据库

### 解决
- 在 `showNotification` 函数中添加写入数据库的逻辑
- 每个用户为自己写入通知记录

### 结果
- ✅ 弹窗提示正常
- ✅ 首页通知栏正常
- ✅ 通知中心有记录
- ✅ 不需要修改 RLS 策略
- ✅ 代码简洁清晰

---

**文档创建时间**：2025-11-05  
**最后更新**：2025-11-05  
**状态**：✅ 问题已解决
