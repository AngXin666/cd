# 通知系统实现指南

## 概述

本文档说明如何在各个业务操作中集成通知发送功能。

## 已实现的通知服务

位置：`src/services/notificationService.ts`

### 核心函数

1. **sendDriverSubmissionNotification** - 司机提交申请通知
2. **sendManagerActionNotification** - 车队长操作通知
3. **sendBossActionNotification** - 老板操作通知
4. **sendPeerAdminActionNotification** - 平级账号操作通知
5. **sendApprovalNotification** - 审批操作通知（自动选择策略）

## 集成步骤

### 1. 司机提交申请（请假/离职/车辆审核）

#### 位置
- 请假申请：司机端提交请假申请的页面
- 离职申请：司机端提交离职申请的页面
- 车辆审核：司机端提交车辆审核的页面

#### 集成代码示例

```typescript
import {sendDriverSubmissionNotification} from '@/services/notificationService'
import {supabase} from '@/db/supabase'

// 提交请假申请
async function submitLeaveApplication(data: LeaveApplicationData) {
  try {
    // 1. 插入请假申请记录
    const {data: application, error} = await supabase
      .from('leave_applications')
      .insert({
        driver_id: data.driverId,
        start_date: data.startDate,
        end_date: data.endDate,
        reason: data.reason,
        status: 'pending',
        boss_id: data.bossId
      })
      .select()
      .maybeSingle()

    if (error || !application) {
      throw new Error('提交请假申请失败')
    }

    // 2. 发送通知
    await sendDriverSubmissionNotification({
      driverId: data.driverId,
      driverName: data.driverName,
      bossId: data.bossId,
      type: 'leave_submitted',
      title: '请假申请待审批',
      content: `司机【${data.driverName}】提交了请假申请\n时间：${data.startDate} 至 ${data.endDate}\n原因：${data.reason}`,
      relatedId: application.id
    })

    return {success: true, data: application}
  } catch (error) {
    console.error('提交请假申请失败:', error)
    return {success: false, error}
  }
}

// 提交离职申请
async function submitResignationApplication(data: ResignationApplicationData) {
  try {
    // 1. 插入离职申请记录
    const {data: application, error} = await supabase
      .from('resignation_applications')
      .insert({
        driver_id: data.driverId,
        resignation_date: data.resignationDate,
        reason: data.reason,
        status: 'pending',
        boss_id: data.bossId
      })
      .select()
      .maybeSingle()

    if (error || !application) {
      throw new Error('提交离职申请失败')
    }

    // 2. 发送通知
    await sendDriverSubmissionNotification({
      driverId: data.driverId,
      driverName: data.driverName,
      bossId: data.bossId,
      type: 'resignation_submitted',
      title: '离职申请待审批',
      content: `司机【${data.driverName}】提交了离职申请\n离职日期：${data.resignationDate}\n原因：${data.reason}`,
      relatedId: application.id
    })

    return {success: true, data: application}
  } catch (error) {
    console.error('提交离职申请失败:', error)
    return {success: false, error}
  }
}
```

### 2. 车队长操作（调整司机分配/类型/审批）

#### 位置
- 车队长端的司机管理页面
- 车队长端的审批页面

#### 集成代码示例

```typescript
import {sendManagerActionNotification} from '@/services/notificationService'

// 车队长调整司机仓库分配
async function managerUpdateDriverWarehouse(params: {
  managerId: string
  managerName: string
  driverId: string
  driverName: string
  warehouseIds: string[]
  bossId: string
}) {
  try {
    // 1. 更新司机仓库分配
    // ... 业务逻辑 ...

    // 2. 发送通知
    await sendManagerActionNotification({
      managerId: params.managerId,
      managerName: params.managerName,
      targetDriverId: params.driverId,
      targetDriverName: params.driverName,
      bossId: params.bossId,
      type: 'driver_warehouse_changed',
      title: '司机仓库分配变更',
      content: `车队长【${params.managerName}】调整了司机【${params.driverName}】的仓库分配`,
      relatedId: params.driverId
    })

    return {success: true}
  } catch (error) {
    console.error('调整司机仓库分配失败:', error)
    return {success: false, error}
  }
}

// 车队长调整司机类型
async function managerUpdateDriverType(params: {
  managerId: string
  managerName: string
  driverId: string
  driverName: string
  oldType: string
  newType: string
  bossId: string
}) {
  try {
    // 1. 更新司机类型
    // ... 业务逻辑 ...

    // 2. 发送通知
    await sendManagerActionNotification({
      managerId: params.managerId,
      managerName: params.managerName,
      targetDriverId: params.driverId,
      targetDriverName: params.driverName,
      bossId: params.bossId,
      type: 'driver_type_changed',
      title: '司机类型变更',
      content: `车队长【${params.managerName}】调整了司机【${params.driverName}】的类型\n从【${params.oldType}】变更为【${params.newType}】`,
      relatedId: params.driverId
    })

    return {success: true}
  } catch (error) {
    console.error('调整司机类型失败:', error)
    return {success: false, error}
  }
}
```

### 3. 审批操作（车队长/老板/平级账号）

#### 位置
- 车队长端的审批页面
- 老板端的审批页面
- 平级账号端的审批页面

#### 集成代码示例

```typescript
import {sendApprovalNotification} from '@/services/notificationService'

// 审批请假申请
async function approveLeaveApplication(params: {
  applicationId: string
  approverId: string
  approverName: string
  approverRole: 'super_admin' | 'peer_admin' | 'manager'
  applicantId: string
  applicantName: string
  status: 'approved' | 'rejected'
  comment: string
  bossId: string
}) {
  try {
    // 1. 更新申请状态
    const {error} = await supabase
      .from('leave_applications')
      .update({
        status: params.status,
        approver_id: params.approverId,
        approval_comment: params.comment,
        approval_time: new Date().toISOString()
      })
      .eq('id', params.applicationId)

    if (error) {
      throw new Error('审批失败')
    }

    // 2. 发送通知
    const statusText = params.status === 'approved' ? '通过' : '驳回'
    await sendApprovalNotification({
      approverId: params.approverId,
      approverName: params.approverName,
      approverRole: params.approverRole,
      applicantId: params.applicantId,
      applicantName: params.applicantName,
      applicantRole: 'driver',
      bossId: params.bossId,
      type: params.status === 'approved' ? 'leave_approved' : 'leave_rejected',
      title: `请假申请已${statusText}`,
      content: `${getRoleText(params.approverRole)}【${params.approverName}】${statusText}了司机【${params.applicantName}】的请假申请\n审批意见：${params.comment}`,
      relatedId: params.applicationId
    })

    return {success: true}
  } catch (error) {
    console.error('审批请假申请失败:', error)
    return {success: false, error}
  }
}

// 辅助函数：获取角色文本
function getRoleText(role: string): string {
  switch (role) {
    case 'super_admin':
      return '老板'
    case 'peer_admin':
      return '平级账号'
    case 'manager':
      return '车队长'
    default:
      return '管理员'
  }
}
```

### 4. 老板/平级账号操作（调整车队长管辖仓库/司机分配/司机类型）

#### 位置
- 老板端的用户管理页面
- 平级账号端的用户管理页面

#### 集成代码示例

```typescript
import {sendBossActionNotification, sendPeerAdminActionNotification} from '@/services/notificationService'

// 老板调整车队长管辖仓库
async function bossUpdateManagerWarehouse(params: {
  bossId: string
  bossName: string
  managerId: string
  managerName: string
  warehouseIds: string[]
}) {
  try {
    // 1. 更新车队长管辖仓库
    // ... 业务逻辑 ...

    // 2. 发送通知
    await sendBossActionNotification({
      bossId: params.bossId,
      bossName: params.bossName,
      targetId: params.managerId,
      targetName: params.managerName,
      targetRole: 'manager',
      warehouseIds: params.warehouseIds,
      type: 'manager_warehouse_changed',
      title: '车队长管辖仓库变更',
      content: `老板调整了车队长【${params.managerName}】的管辖仓库`,
      relatedId: params.managerId
    })

    return {success: true}
  } catch (error) {
    console.error('调整车队长管辖仓库失败:', error)
    return {success: false, error}
  }
}

// 平级账号调整司机分配
async function peerAdminUpdateDriverWarehouse(params: {
  peerAdminId: string
  peerAdminName: string
  driverId: string
  driverName: string
  warehouseIds: string[]
  bossId: string
}) {
  try {
    // 1. 更新司机仓库分配
    // ... 业务逻辑 ...

    // 2. 发送通知
    await sendPeerAdminActionNotification({
      peerAdminId: params.peerAdminId,
      peerAdminName: params.peerAdminName,
      targetId: params.driverId,
      targetName: params.driverName,
      targetRole: 'driver',
      warehouseIds: params.warehouseIds,
      bossId: params.bossId,
      type: 'driver_warehouse_changed',
      title: '司机仓库分配变更',
      content: `平级账号【${params.peerAdminName}】调整了司机【${params.driverName}】的仓库分配`,
      relatedId: params.driverId
    })

    return {success: true}
  } catch (error) {
    console.error('调整司机仓库分配失败:', error)
    return {success: false, error}
  }
}
```

## 通知类型定义

需要在 `src/db/types.ts` 中添加新的通知类型：

```typescript
export type NotificationType =
  | 'system'
  | 'attendance'
  | 'piece_work'
  | 'warehouse_assigned'
  | 'leave_submitted'        // 请假申请已提交
  | 'leave_approved'         // 请假申请已通过
  | 'leave_rejected'         // 请假申请已驳回
  | 'resignation_submitted'  // 离职申请已提交
  | 'resignation_approved'   // 离职申请已通过
  | 'resignation_rejected'   // 离职申请已驳回
  | 'vehicle_audit_submitted' // 车辆审核已提交
  | 'vehicle_audit_approved'  // 车辆审核已通过
  | 'vehicle_audit_rejected'  // 车辆审核已驳回
  | 'driver_warehouse_changed' // 司机仓库分配变更
  | 'driver_type_changed'      // 司机类型变更
  | 'manager_warehouse_changed' // 车队长管辖仓库变更
```

## 集成检查清单

### 司机端
- [ ] 请假申请提交 - 集成 `sendDriverSubmissionNotification`
- [ ] 离职申请提交 - 集成 `sendDriverSubmissionNotification`
- [ ] 车辆审核提交 - 集成 `sendDriverSubmissionNotification`

### 车队长端
- [ ] 调整司机仓库分配 - 集成 `sendManagerActionNotification`
- [ ] 调整司机类型 - 集成 `sendManagerActionNotification`
- [ ] 审批请假申请 - 集成 `sendApprovalNotification`
- [ ] 审批离职申请 - 集成 `sendApprovalNotification`
- [ ] 审批车辆申请 - 集成 `sendApprovalNotification`

### 老板端
- [ ] 调整车队长管辖仓库 - 集成 `sendBossActionNotification`
- [ ] 调整司机仓库分配 - 集成 `sendBossActionNotification`
- [ ] 调整司机类型 - 集成 `sendBossActionNotification`
- [ ] 审批请假申请 - 集成 `sendApprovalNotification`
- [ ] 审批离职申请 - 集成 `sendApprovalNotification`
- [ ] 审批车辆申请 - 集成 `sendApprovalNotification`

### 平级账号端
- [ ] 调整车队长管辖仓库 - 集成 `sendPeerAdminActionNotification`
- [ ] 调整司机仓库分配 - 集成 `sendPeerAdminActionNotification`
- [ ] 调整司机类型 - 集成 `sendPeerAdminActionNotification`
- [ ] 审批请假申请 - 集成 `sendApprovalNotification`
- [ ] 审批离职申请 - 集成 `sendApprovalNotification`
- [ ] 审批车辆申请 - 集成 `sendApprovalNotification`

## 注意事项

1. **通知发送失败不影响业务操作**
   - 通知发送应该在业务操作成功后进行
   - 通知发送失败只记录日志，不回滚业务操作

2. **获取当前用户信息**
   - 确保在调用通知服务前获取当前用户的完整信息（ID、姓名、角色、boss_id）

3. **通知内容格式**
   - 标题简洁明了
   - 内容包含完整的上下文信息
   - 使用换行符 `\n` 分隔不同信息

4. **错误处理**
   - 使用 try-catch 包裹通知发送代码
   - 记录详细的错误日志
   - 不向用户展示通知发送失败的错误

5. **性能考虑**
   - 通知发送是异步操作，不阻塞主流程
   - 批量操作时考虑通知的数量和频率

## 测试建议

1. **单元测试**
   - 测试每个通知服务函数的接收对象获取逻辑
   - 测试通知去重功能

2. **集成测试**
   - 测试完整的业务流程 + 通知发送
   - 验证通知接收对象是否正确

3. **端到端测试**
   - 模拟真实用户操作
   - 验证通知是否正确发送和显示

## 常见问题

### Q1: 通知发送失败怎么办？
A: 通知发送失败不影响业务操作，只记录错误日志。可以考虑实现通知重发机制。

### Q2: 如何避免重复通知？
A: 通知服务内部已实现去重逻辑，同一用户只会收到一次通知。

### Q3: 如何自定义通知内容？
A: 在调用通知服务时，传入自定义的 title 和 content 参数。

### Q4: 如何添加新的通知类型？
A: 在 `src/db/types.ts` 中添加新的 NotificationType，然后在通知服务中使用。
