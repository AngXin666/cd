# 通知系统权限说明

## 更新时间
2025-11-05

## 权限概述

系统已更新通知权限，允许所有角色（司机、车队长、平级账号、老板）创建和发送通知。

## 详细权限矩阵

### 1. 创建通知权限

| 角色 | 可以发送通知给 | 限制条件 |
|------|--------------|---------|
| **司机 (driver)** | • 自己的车队长<br>• 老板<br>• 所有平级账号 | 只能在自己的租户内 |
| **车队长 (manager)** | • 所有司机<br>• 其他车队长<br>• 老板<br>• 所有平级账号 | 只能在自己的租户内 |
| **平级账号 (peer_admin)** | • 所有用户 | 只能在自己的租户内 |
| **老板 (super_admin)** | • 所有用户 | 只能在自己的租户内 |

### 2. 查看通知权限

| 角色 | 权限说明 |
|------|---------|
| **所有角色** | 只能查看发送给自己的通知 |

### 3. 更新通知权限

| 角色 | 权限说明 |
|------|---------|
| **所有角色** | 只能更新自己的通知（如标记已读） |

### 4. 删除通知权限

| 角色 | 权限说明 |
|------|---------|
| **所有角色** | 只能删除自己的通知 |

## 使用场景示例

### 场景 1：司机向车队长报告问题

```typescript
import {createNotifications} from '@/db/notificationApi'

// 司机发送通知给自己的车队长
await createNotifications([
  {
    userId: managerUserId,
    type: 'system',
    title: '车辆故障报告',
    message: '司机【张三】报告车辆出现故障，需要维修',
    relatedId: vehicleId
  }
])
```

### 场景 2：车队长通知司机任务安排

```typescript
import {createNotifications} from '@/db/notificationApi'

// 车队长批量通知多个司机
await createNotifications([
  {
    userId: driver1Id,
    type: 'system',
    title: '任务安排',
    message: '明天早上8点到A仓库报到',
    relatedId: taskId
  },
  {
    userId: driver2Id,
    type: 'system',
    title: '任务安排',
    message: '明天早上8点到A仓库报到',
    relatedId: taskId
  }
])
```

### 场景 3：平级账号发送系统通知

```typescript
import {createNotifications} from '@/db/notificationApi'

// 平级账号发送系统通知给所有用户
const allUsers = await getAllUsersInTenant(bossId)
await createNotifications(
  allUsers.map(user => ({
    userId: user.id,
    type: 'system',
    title: '系统维护通知',
    message: '系统将于今晚22:00进行维护，预计1小时',
    relatedId: null
  }))
)
```

## 安全机制

### 1. 租户隔离
- 所有通知操作都限制在同一租户内
- 通过 `boss_id` 字段确保租户隔离
- 不同租户的用户无法互相发送通知

### 2. 角色验证
- 系统自动验证发送者的角色
- 根据角色限制可发送通知的接收对象
- 使用数据库级别的 RLS 策略确保安全

### 3. 接收对象验证
- 司机只能给特定角色发送通知（车队长、老板、平级账号）
- 车队长和平级账号可以给同租户的任何用户发送通知
- 系统自动验证接收对象是否在允许范围内

## RLS 策略详情

### 策略 1：司机创建通知
```sql
CREATE POLICY "Drivers can create notifications"
ON notifications FOR INSERT
TO authenticated
WITH CHECK (
  boss_id = get_current_user_boss_id() 
  AND is_driver(auth.uid())
  AND recipient_id IN (
    -- 自己的车队长
    SELECT DISTINCT mw.manager_id 
    FROM driver_warehouses dw
    JOIN manager_warehouses mw ON dw.warehouse_id = mw.warehouse_id
    WHERE dw.driver_id = auth.uid()
    
    UNION
    
    -- 老板
    SELECT p.id FROM profiles p
    WHERE p.role = 'super_admin'
    AND p.boss_id = get_current_user_boss_id()
    
    UNION
    
    -- 平级账号
    SELECT p.id FROM profiles p
    WHERE p.role = 'peer_admin'
    AND p.boss_id = get_current_user_boss_id()
  )
);
```

### 策略 2：车队长创建通知
```sql
CREATE POLICY "Managers can create notifications to same tenant"
ON notifications FOR INSERT
TO authenticated
WITH CHECK (
  boss_id = get_current_user_boss_id() 
  AND is_manager(auth.uid())
  AND recipient_id IN (
    SELECT p.id FROM profiles p
    WHERE p.boss_id = get_current_user_boss_id()
  )
);
```

### 策略 3：平级账号创建通知
```sql
CREATE POLICY "Peer admins can create notifications to same tenant"
ON notifications FOR INSERT
TO authenticated
WITH CHECK (
  boss_id = get_current_user_boss_id() 
  AND is_peer_admin(auth.uid())
  AND recipient_id IN (
    SELECT p.id FROM profiles p
    WHERE p.boss_id = get_current_user_boss_id()
  )
);
```

## 批量创建通知

系统支持批量创建通知，使用 `createNotifications` 函数：

```typescript
import {createNotifications} from '@/db/notificationApi'

// 批量创建通知
const notifications = [
  {
    userId: 'user-id-1',
    type: 'system',
    title: '通知标题1',
    message: '通知内容1',
    relatedId: 'related-id-1'
  },
  {
    userId: 'user-id-2',
    type: 'system',
    title: '通知标题2',
    message: '通知内容2',
    relatedId: 'related-id-2'
  }
]

const success = await createNotifications(notifications)
if (success) {
  console.log('批量通知发送成功')
} else {
  console.error('批量通知发送失败')
}
```

## 注意事项

1. **权限验证**
   - 所有通知创建操作都会经过 RLS 策略验证
   - 如果违反权限规则，操作会被拒绝

2. **错误处理**
   - 通知发送失败不会抛出异常
   - 返回 `false` 表示失败，`true` 表示成功
   - 失败原因会记录在日志中

3. **性能考虑**
   - 批量创建通知时，建议每次不超过 100 条
   - 大量通知可以分批发送

4. **通知内容**
   - 确保通知内容清晰、简洁
   - 包含必要的上下文信息
   - 使用合适的通知类型

## 常见问题

### Q1: 司机可以给其他司机发送通知吗？
A: 不可以。司机只能给自己的车队长、老板和平级账号发送通知。

### Q2: 车队长可以给其他租户的用户发送通知吗？
A: 不可以。所有通知操作都限制在同一租户内。

### Q3: 如何获取可以发送通知的用户列表？
A: 可以使用 `src/services/notificationService.ts` 中的辅助函数获取。

### Q4: 批量创建通知时，如果部分失败怎么办？
A: 批量创建是原子操作，要么全部成功，要么全部失败。

## 相关文件

- 迁移文件：`supabase/migrations/20_allow_all_roles_create_notifications.sql`
- 通知服务：`src/services/notificationService.ts`
- 通知 API：`src/db/notificationApi.ts`
- 通知规则：`NOTIFICATION_RULES.md`
- 实现指南：`NOTIFICATION_IMPLEMENTATION_GUIDE.md`
