# 请假审批通知功能修复

## 📋 问题描述

**原问题**：
请假申请审批后，虽然会弹出信息显示审批成功，但通知栏并不会显示对应的通知。

**问题原因**：
超级管理员审批请假申请时，只调用了 `reviewLeaveApplication` 函数更新数据库，但没有发送通知给申请人。

## 🎯 解决方案

在超级管理员审批请假申请时，添加通知发送功能，通知申请人审批结果。

## ✅ 已完成的修改

### 1. 添加必要的导入

**文件**：`src/pages/super-admin/leave-approval/index.tsx`

**添加的导入**：
```typescript
import {
  // ... 其他导入
  getCurrentUserWithRealName,  // 新增：获取当前用户信息（包含真实姓名）
  // ...
} from '@/db/api'
import {createNotification} from '@/db/notificationApi'  // 新增：创建通知
```

### 2. 修改审批函数

**文件**：`src/pages/super-admin/leave-approval/index.tsx`

**函数**：`handleReviewLeave`

**修改内容**：

#### 修改前：
```typescript
const handleReviewLeave = async (applicationId: string, approved: boolean) => {
  if (!user) return

  try {
    showLoading({title: approved ? '批准中...' : '拒绝中...'})

    const success = await reviewLeaveApplication(applicationId, {
      status: approved ? 'approved' : 'rejected',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString()
    })

    if (success) {
      showToast({
        title: approved ? '已批准' : '已拒绝',
        icon: 'success',
        duration: 1500
      })
      await loadData()
    } else {
      throw new Error('操作失败')
    }
  } catch (_error) {
    showToast({
      title: '操作失败',
      icon: 'none',
      duration: 2000
    })
  } finally {
    Taro.hideLoading()
  }
}
```

#### 修改后：
```typescript
const handleReviewLeave = async (applicationId: string, approved: boolean) => {
  if (!user) return

  try {
    showLoading({title: approved ? '批准中...' : '拒绝中...'})

    // 1. 获取请假申请详情
    const application = leaveApplications.find((app) => app.id === applicationId)
    if (!application) {
      throw new Error('未找到请假申请')
    }

    // 2. 审批请假申请
    const success = await reviewLeaveApplication(applicationId, {
      status: approved ? 'approved' : 'rejected',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString()
    })

    if (success) {
      // 3. 发送通知给申请人
      try {
        // 获取当前审批人信息
        const currentUserProfile = await getCurrentUserWithRealName()
        
        // 构建审批人显示文本
        let reviewerText = '超级管理员'
        if (currentUserProfile) {
          const reviewerRealName = currentUserProfile.real_name
          const reviewerUserName = currentUserProfile.name
          
          if (reviewerRealName) {
            reviewerText = `超级管理员【${reviewerRealName}】`
          } else if (reviewerUserName && reviewerUserName !== '超级管理员' && reviewerUserName !== '管理员') {
            reviewerText = `超级管理员【${reviewerUserName}】`
          }
        }

        // 获取请假类型文本
        const leaveTypeText = {
          sick: '病假',
          personal: '事假',
          annual: '年假',
          other: '其他'
        }[application.leave_type] || '请假'

        // 格式化日期
        const formatDate = (dateStr: string) => {
          const date = new Date(dateStr)
          return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
        }

        const startDate = formatDate(application.start_date)
        const endDate = formatDate(application.end_date)

        // 构建通知消息
        const statusText = approved ? '已通过' : '已拒绝'
        const notificationType = approved ? 'leave_approved' : 'leave_rejected'
        const message = `${reviewerText}${statusText}了您的${leaveTypeText}申请（${startDate} 至 ${endDate}）`

        await createNotification(
          application.user_id,
          notificationType,
          '请假审批通知',
          message,
          applicationId
        )

        console.log(`✅ 已发送请假审批通知给申请人: ${application.user_id}`)
      } catch (notificationError) {
        console.error('❌ 发送请假审批通知失败:', notificationError)
        // 通知发送失败不影响审批流程
      }

      showToast({
        title: approved ? '已批准' : '已拒绝',
        icon: 'success',
        duration: 1500
      })
      await loadData()
    } else {
      throw new Error('操作失败')
    }
  } catch (_error) {
    showToast({
      title: '操作失败',
      icon: 'none',
      duration: 2000
    })
  } finally {
    Taro.hideLoading()
  }
}
```

## 📊 通知消息示例

### 请假申请通过

**场景1：有真实姓名**
```
标题：请假审批通知
内容：超级管理员【张三】已通过了您的病假申请（2025-11-01 至 2025-11-03）
```

**场景2：有用户名（非角色）**
```
标题：请假审批通知
内容：超级管理员【admin】已通过了您的事假申请（2025-11-01 至 2025-11-03）
```

**场景3：用户名是角色名称或没有姓名**
```
标题：请假审批通知
内容：超级管理员已通过了您的年假申请（2025-11-01 至 2025-11-03）
```

### 请假申请拒绝

**场景1：有真实姓名**
```
标题：请假审批通知
内容：超级管理员【张三】已拒绝了您的病假申请（2025-11-01 至 2025-11-03）
```

**场景2：有用户名（非角色）**
```
标题：请假审批通知
内容：超级管理员【admin】已拒绝了您的事假申请（2025-11-01 至 2025-11-03）
```

**场景3：用户名是角色名称或没有姓名**
```
标题：请假审批通知
内容：超级管理员已拒绝了您的年假申请（2025-11-01 至 2025-11-03）
```

## 🔍 实现细节

### 1. 获取请假申请详情

在审批前，先从当前的 `leaveApplications` 状态中查找对应的申请：

```typescript
const application = leaveApplications.find((app) => app.id === applicationId)
if (!application) {
  throw new Error('未找到请假申请')
}
```

### 2. 构建审批人显示文本

使用与其他通知相同的智能显示逻辑：

```typescript
let reviewerText = '超级管理员'
if (currentUserProfile) {
  const reviewerRealName = currentUserProfile.real_name
  const reviewerUserName = currentUserProfile.name
  
  if (reviewerRealName) {
    reviewerText = `超级管理员【${reviewerRealName}】`
  } else if (reviewerUserName && reviewerUserName !== '超级管理员' && reviewerUserName !== '管理员') {
    reviewerText = `超级管理员【${reviewerUserName}】`
  }
}
```

### 3. 请假类型映射

将数据库中的请假类型转换为中文：

```typescript
const leaveTypeText = {
  sick: '病假',
  personal: '事假',
  annual: '年假',
  other: '其他'
}[application.leave_type] || '请假'
```

### 4. 日期格式化

将 ISO 日期格式转换为易读的格式（YYYY-MM-DD）：

```typescript
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
```

### 5. 通知类型选择

根据审批结果选择不同的通知类型：

```typescript
const notificationType = approved ? 'leave_approved' : 'leave_rejected'
```

### 6. 错误处理

通知发送失败不影响审批流程：

```typescript
try {
  // 发送通知
  await createNotification(...)
  console.log(`✅ 已发送请假审批通知给申请人: ${application.user_id}`)
} catch (notificationError) {
  console.error('❌ 发送请假审批通知失败:', notificationError)
  // 通知发送失败不影响审批流程
}
```

## 🧪 测试方法

### 测试1：请假申请通过

1. **司机端提交请假申请**
   - 使用司机账号登录
   - 进入"请假申请"页面
   - 填写请假信息并提交

2. **超级管理员审批**
   - 使用超级管理员账号登录
   - 进入"考勤管理"页面
   - 切换到"待审核"标签
   - 找到刚才提交的请假申请
   - 点击"通过"按钮

3. **验证通知**
   - 使用司机账号登录
   - 进入"通知中心"
   - 应该看到请假审批通知

**预期通知内容**：
```
请假审批通知
超级管理员【张三】已通过了您的病假申请（2025-11-01 至 2025-11-03）
```

### 测试2：请假申请拒绝

1. **司机端提交请假申请**
   - 使用司机账号登录
   - 进入"请假申请"页面
   - 填写请假信息并提交

2. **超级管理员审批**
   - 使用超级管理员账号登录
   - 进入"考勤管理"页面
   - 切换到"待审核"标签
   - 找到刚才提交的请假申请
   - 点击"拒绝"按钮

3. **验证通知**
   - 使用司机账号登录
   - 进入"通知中心"
   - 应该看到请假审批通知

**预期通知内容**：
```
请假审批通知
超级管理员【张三】已拒绝了您的病假申请（2025-11-01 至 2025-11-03）
```

### 测试3：控制台日志验证

打开浏览器控制台（F12），审批请假申请后查看日志：

**预期日志**：
```javascript
✅ 已发送请假审批通知给申请人: [用户ID]
```

**如果发送失败**：
```javascript
❌ 发送请假审批通知失败: [错误信息]
```

## 📁 相关文件

### 修改的文件
1. **`src/pages/super-admin/leave-approval/index.tsx`**
   - 添加通知相关导入
   - 修改 `handleReviewLeave` 函数
   - 添加通知发送逻辑

### 使用的API
1. **`getCurrentUserWithRealName()`** - 获取当前用户信息（包含真实姓名）
2. **`createNotification()`** - 创建通知
3. **`reviewLeaveApplication()`** - 审批请假申请

### 通知类型
1. **`leave_approved`** - 请假批准
2. **`leave_rejected`** - 请假拒绝

## ✅ 验证清单

在完成修改后，请确认以下各项：

- [x] 添加了必要的导入
- [x] 修改了 `handleReviewLeave` 函数
- [x] 添加了通知发送逻辑
- [x] 实现了审批人显示文本构建
- [x] 实现了请假类型映射
- [x] 实现了日期格式化
- [x] 根据审批结果选择正确的通知类型
- [x] 添加了错误处理
- [x] 添加了调试日志
- [x] 代码检查没有新增错误

## 🎯 实现特点

### 1. 智能显示审批人信息
- 优先显示真实姓名
- 其次显示用户名（排除角色名称）
- 最后显示角色名称

### 2. 清晰的通知消息
- 包含审批人信息
- 包含审批结果（通过/拒绝）
- 包含请假类型
- 包含请假日期范围

### 3. 完善的错误处理
- 通知发送失败不影响审批流程
- 记录详细的错误日志
- 提供友好的用户提示

### 4. 详细的调试日志
- 记录通知发送成功
- 记录通知发送失败
- 方便排查问题

## 🚀 后续优化建议

### 1. 普通管理员审批通知

目前只实现了超级管理员审批的通知功能，如果普通管理员也有审批权限，需要在普通管理员的审批页面添加类似的通知功能。

### 2. 审批备注

如果审批时填写了备注（`review_notes`），可以在通知消息中包含备注内容：

```typescript
let message = `${reviewerText}${statusText}了您的${leaveTypeText}申请（${startDate} 至 ${endDate}）`
if (review.review_notes) {
  message += `，备注：${review.review_notes}`
}
```

### 3. 通知模板

可以将通知消息模板提取到配置文件，统一管理：

```typescript
const NOTIFICATION_TEMPLATES = {
  leave_approved: (reviewer, leaveType, startDate, endDate) => 
    `${reviewer}已通过了您的${leaveType}申请（${startDate} 至 ${endDate}）`,
  leave_rejected: (reviewer, leaveType, startDate, endDate) => 
    `${reviewer}已拒绝了您的${leaveType}申请（${startDate} 至 ${endDate}）`
}
```

### 4. 批量审批通知

如果需要批量审批多个请假申请，可以使用 `createNotifications` 函数批量发送通知，提高效率。

## 📞 问题排查

如果通知没有显示，请按以下步骤排查：

### 1. 检查控制台日志

打开浏览器控制台（F12），查看是否有以下日志：

```javascript
✅ 已发送请假审批通知给申请人: [用户ID]
```

如果看到错误日志：

```javascript
❌ 发送请假审批通知失败: [错误信息]
```

请记录错误信息并进一步排查。

### 2. 查询数据库

**查询请假申请**：
```sql
SELECT * FROM leave_applications 
WHERE id = '申请ID'
ORDER BY created_at DESC;
```

**查询通知记录**：
```sql
SELECT 
  n.id,
  n.user_id,
  p.name as user_name,
  n.type,
  n.title,
  n.message,
  n.created_at
FROM notifications n
LEFT JOIN profiles p ON n.user_id = p.id
WHERE n.type IN ('leave_approved', 'leave_rejected')
  AND n.created_at > NOW() - INTERVAL '10 minutes'
ORDER BY n.created_at DESC;
```

### 3. 检查通知订阅

确认司机端的通知订阅功能正常工作：

```typescript
// 在司机端页面中
const {unreadCount} = useRealtimeNotifications()
console.log('未读通知数量:', unreadCount)
```

### 4. 检查用户ID

确认请假申请的 `user_id` 与司机的用户ID一致：

```sql
SELECT 
  la.id as application_id,
  la.user_id,
  p.name as user_name,
  p.role
FROM leave_applications la
LEFT JOIN profiles p ON la.user_id = p.id
WHERE la.id = '申请ID';
```

## 🎉 总结

本次修复完成了以下功能：

1. ✅ 在超级管理员审批请假申请时发送通知
2. ✅ 实现了智能的审批人显示文本
3. ✅ 实现了清晰的通知消息格式
4. ✅ 添加了完善的错误处理
5. ✅ 添加了详细的调试日志
6. ✅ 保持了代码的一致性和可维护性

现在，当超级管理员审批请假申请后，申请人会在通知中心收到审批结果通知，大大提升了用户体验！

---

**修复完成时间**：2025-11-05
**修复人**：秒哒 AI 助手
