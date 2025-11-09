# 通知系统快速参考

## 快速开始

### 1. 导入通知函数

```typescript
import {
  notifyPermissionChange,
  notifyDriverInfoUpdate,
  notifyDriverCreated,
  notifyLeaveApproval,
  notifyWarehouseAssigned,
  notifySystemNotice
} from '@/utils/notificationHelper'
```

### 2. 在操作成功后调用

```typescript
// 在 updateUserInfo 成功后
if (success) {
  await notifyDriverInfoUpdate(driverId, operatorId, ['姓名', '手机号'])
}
```

## 常用场景

### 权限变更

```typescript
await notifyPermissionChange(
  userId,      // 被修改的用户ID
  operatorId,  // 操作者ID
  'driver',    // 旧角色
  'manager'    // 新角色
)
```

### 信息修改

```typescript
await notifyDriverInfoUpdate(
  driverId,                    // 司机ID
  operatorId,                  // 操作者ID
  ['姓名', '手机号', '邮箱']    // 修改的字段
)
```

### 新增司机

```typescript
await notifyDriverCreated(
  newDriverId,  // 新司机ID
  operatorId    // 操作者ID
)
```

### 请假审批

```typescript
await notifyLeaveApproval(
  applicantId,   // 申请人ID
  approverId,    // 审批人ID
  true,          // 是否通过
  'sick_leave',  // 请假类型
  '2024-01-01',  // 开始日期
  '2024-01-03'   // 结束日期
)
```

### 仓库分配

```typescript
await notifyWarehouseAssigned(
  driverId,       // 司机ID
  warehouseId,    // 仓库ID
  '北京仓库',      // 仓库名称
  operatorId      // 操作者ID
)
```

### 系统通知

```typescript
// 发送给所有用户
await notifySystemNotice(
  '系统维护通知',
  '系统将于今晚22:00-23:00进行维护'
)

// 发送给特定角色
await notifySystemNotice(
  '管理员培训通知',
  '本周五下午3点将举行管理员培训',
  'manager'  // 只发送给普通管理员
)
```

## 完整集成示例

```typescript
import {notifyDriverInfoUpdate, notifyPermissionChange} from '@/utils/notificationHelper'

const handleSave = async () => {
  // 记录旧值
  const oldRole = userInfo?.role
  const oldName = userInfo?.name

  // 执行更新
  const success = await updateUserInfo(userId, {
    name: newName,
    role: newRole
  })

  if (success && user?.id) {
    // 角色变更通知
    if (oldRole && oldRole !== newRole) {
      await notifyPermissionChange(userId, user.id, oldRole, newRole)
    }

    // 信息修改通知
    const modifiedFields: string[] = []
    if (newName !== oldName) modifiedFields.push('姓名')

    if (modifiedFields.length > 0) {
      await notifyDriverInfoUpdate(userId, user.id, modifiedFields)
    }
  }
}
```

## 滚动提醒组件

```tsx
import ScrollNotification from '@/components/notification/ScrollNotification'

// 在工作台页面中使用
{user?.id && (
  <View className="mb-3">
    <ScrollNotification userId={user.id} />
  </View>
)}
```

## 信息中心页面

路由：`/pages/notifications/index`

跳转：
```typescript
Taro.navigateTo({url: '/pages/notifications/index'})
```

## 通知类型

| 类型 | 说明 | 图标 | 颜色 |
|------|------|------|------|
| `permission_change` | 权限变更 | shield-account | 紫色 |
| `driver_info_update` | 信息修改 | account-edit | 蓝色 |
| `driver_created` | 新增司机 | account-plus | 绿色 |
| `leave_approved` | 请假通过 | check-circle | 绿色 |
| `leave_rejected` | 请假拒绝 | close-circle | 红色 |
| `warehouse_assigned` | 仓库分配 | warehouse | 橙色 |
| `system_notice` | 系统通知 | bell | 灰色 |

## 注意事项

1. ✅ 所有通知函数都是异步的，建议使用 `await`
2. ✅ 通知函数内部已包含错误处理，失败不会影响主流程
3. ✅ 批量通知使用 `createNotifications` 而不是循环调用
4. ✅ 通知的创建受 RLS 策略保护，只有管理员可以创建

## 相关文档

- 详细使用指南：`docs/notification-system-usage.md`
- 实现总结：`docs/notification-system-implementation-summary.md`
