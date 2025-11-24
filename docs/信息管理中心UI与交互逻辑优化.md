# 信息管理中心UI与交互逻辑优化

## 完成时间
2025-11-05

## 需求概述

优化双管理员端信息管理中心的用户界面与交互逻辑，重点关注申请类信息的动态状态管理、信息筛选与管理的精确性，以及视觉与用户体验的全面提升。

### 核心目标

1. **申请类信息的动态状态管理**：实时反映申请状态变化，已处理的申请不可再次处理
2. **信息筛选与管理的精确性**：清空功能只清除已读且已处理的信息，保留待处理信息
3. **视觉与用户体验全面提升**：重新设计UI，使用明确的颜色和图标区分状态

## 优化内容

### 1. 核心功能细化：申请类信息的动态状态管理

#### 1.1 通知处理状态定义

定义三种通知处理状态：

```typescript
// 通知处理状态
export type NotificationProcessStatus = 'pending' | 'processed' | 'info_only'
```

| 状态 | 说明 | 包含的通知类型 |
|------|------|---------------|
| `pending` | 待处理 | 请假申请提交、离职申请提交、车辆待审核 |
| `processed` | 已处理 | 请假批准/拒绝、离职批准/拒绝、车辆审核通过/需补录 |
| `info_only` | 仅通知 | 权限变更、仓库分配、系统通知等 |

#### 1.2 状态判断函数

**判断是否为待处理状态**：

```typescript
export function isNotificationPending(type: NotificationType): boolean {
  const pendingTypes: NotificationType[] = [
    'leave_application_submitted', // 请假申请提交
    'resignation_application_submitted', // 离职申请提交
    'vehicle_review_pending' // 车辆待审核
  ]
  return pendingTypes.includes(type)
}
```

**判断是否为已处理状态**：

```typescript
export function isNotificationProcessed(type: NotificationType): boolean {
  const processedTypes: NotificationType[] = [
    'leave_approved', // 请假批准
    'leave_rejected', // 请假拒绝
    'resignation_approved', // 离职批准
    'resignation_rejected', // 离职拒绝
    'vehicle_review_approved', // 车辆审核通过
    'vehicle_review_need_supplement' // 车辆需要补录
  ]
  return processedTypes.includes(type)
}
```

**获取通知的处理状态**：

```typescript
export function getNotificationProcessStatus(type: NotificationType): NotificationProcessStatus {
  if (isNotificationPending(type)) {
    return 'pending'
  }
  if (isNotificationProcessed(type)) {
    return 'processed'
  }
  return 'info_only'
}
```

#### 1.3 状态标签和颜色

**获取状态标签文字**：

```typescript
export function getNotificationStatusLabel(type: NotificationType): string {
  switch (type) {
    case 'leave_application_submitted':
      return '待审批'
    case 'resignation_application_submitted':
      return '待审批'
    case 'vehicle_review_pending':
      return '待审核'
    case 'leave_approved':
      return '已批准'
    case 'leave_rejected':
      return '已拒绝'
    case 'resignation_approved':
      return '已批准'
    case 'resignation_rejected':
      return '已拒绝'
    case 'vehicle_review_approved':
      return '已通过'
    case 'vehicle_review_need_supplement':
      return '需补录'
    default:
      return '通知'
  }
}
```

**获取状态颜色类名**：

```typescript
export function getNotificationStatusColor(type: NotificationType): string {
  const status = getNotificationProcessStatus(type)
  switch (status) {
    case 'pending':
      return 'text-warning' // 待处理：警告色（橙色）
    case 'processed':
      if (type.includes('approved')) {
        return 'text-success' // 已批准：成功色（绿色）
      }
      if (type.includes('rejected')) {
        return 'text-destructive' // 已拒绝：错误色（红色）
      }
      return 'text-muted-foreground' // 其他已处理：灰色
    default:
      return 'text-muted-foreground' // 仅通知：灰色
  }
}
```

#### 1.4 交互限制：已处理申请不可再次处理

```typescript
// 点击通知项
const handleNotificationClick = async (notification: Notification) => {
  // 标记为已读
  if (!notification.is_read) {
    await handleMarkAsRead(notification.id)
  }

  // 获取通知的处理状态
  const processStatus = getNotificationProcessStatus(notification.type)

  // 如果是已处理的申请，显示提示，不跳转
  if (processStatus === 'processed') {
    Taro.showToast({
      title: '该申请已处理完成',
      icon: 'none',
      duration: 2000
    })
    return
  }

  // 如果是待处理的申请，跳转到相应页面
  // ...
}
```

**效果说明**：
- ✅ 待处理的申请：点击后跳转到处理页面
- ✅ 已处理的申请：点击后显示提示"该申请已处理完成"，不跳转
- ✅ 仅通知类型：点击后无操作或跳转到详情页

### 2. 交互功能优化：信息筛选与管理的精确性

#### 2.1 重新定义清空功能

**优化前**：
- ❌ 清空所有通知，包括未读和待处理的通知
- ❌ 可能误删重要的待处理申请

**优化后**：
- ✅ 只清除"已读"且"已处理"或"仅通知"类型的通知
- ✅ 保留所有"未读"或"待处理"的通知
- ✅ 清空前显示可清除数量和保留提示

#### 2.2 清空功能实现

```typescript
const handleClearAll = async () => {
  if (!user) return

  // 计算可清除的通知数量（已读且非待处理）
  const clearableNotifications = notifications.filter((n) => {
    const status = getNotificationProcessStatus(n.type)
    return n.is_read && status !== 'pending'
  })

  const clearableCount = clearableNotifications.length

  if (clearableCount === 0) {
    Taro.showToast({title: '暂无可清空的通知', icon: 'none'})
    return
  }

  Taro.showModal({
    title: '确认清空',
    content: `确认要清空所有已读且已处理的通知吗？共 ${clearableCount} 条通知，此操作不可恢复。\n\n注意：未读或待处理的通知将被保留。`,
    confirmText: '确认清空',
    cancelText: '取消',
    confirmColor: '#f97316',
    success: async (res) => {
      if (res.confirm) {
        try {
          // 逐个删除可清除的通知
          const deletePromises = clearableNotifications.map((n) => deleteNotification(n.id))
          await Promise.all(deletePromises)

          // 更新本地状态
          setNotifications((prev) => prev.filter((n) => !clearableNotifications.some((cn) => cn.id === n.id)))
          Taro.showToast({title: '清空成功', icon: 'success'})
        } catch (error) {
          logger.error('清空通知失败', error)
          Taro.showToast({title: '清空失败', icon: 'error'})
        }
      }
    }
  })
}
```

**清空逻辑说明**：

| 通知状态 | 是否清除 | 说明 |
|---------|---------|------|
| 未读 + 待处理 | ❌ 保留 | 重要的待处理申请 |
| 未读 + 已处理 | ❌ 保留 | 未读的通知不清除 |
| 未读 + 仅通知 | ❌ 保留 | 未读的通知不清除 |
| 已读 + 待处理 | ❌ 保留 | 即使已读，待处理申请也保留 |
| 已读 + 已处理 | ✅ 清除 | 可以安全清除 |
| 已读 + 仅通知 | ✅ 清除 | 可以安全清除 |

### 3. 视觉与用户体验全面提升

#### 3.1 通知卡片设计优化

**优化前**：
```
┌─────────────────────────────────────┐
│ ● 新的请假申请              [删除] │
│   张三提交了请假申请，请及时处理    │
│   🕐 14:30                          │
└─────────────────────────────────────┘
```

**优化后**：
```
┌─────────────────────────────────────────┐
│ ● 新的请假申请 [待审批]         [删除] │
│   张三提交了请假申请，请及时处理        │
│   🕐 14:30              👉 点击处理     │
└─────────────────────────────────────────┘
```

#### 3.2 视觉设计要素

**1. 圆角设计**：
- 通知卡片使用 `rounded-xl`（12px圆角）
- 状态标签使用 `rounded-full`（完全圆角）

**2. 边框和阴影**：
- 待处理申请：`border-warning/50 shadow-md`（警告色边框，中等阴影）
- 未读通知：`border-primary/50 shadow-sm`（主题色边框，轻微阴影）
- 已读通知：`border-border/50`（灰色边框，无阴影）
- 悬停效果：`hover:shadow-lg hover:border-warning`（增强阴影和边框）

**3. 状态指示器**：
- 大小：`w-3 h-3`（12px × 12px）
- 待处理：`bg-warning animate-pulse`（橙色，脉冲动画）
- 未读：`bg-destructive animate-pulse`（红色，脉冲动画）
- 已读：`bg-success`（绿色，无动画）

**4. 状态标签徽章**：
- 位置：标题右侧
- 样式：圆角徽章，带背景色
- 颜色：
  - 待审批/待审核：`bg-warning/20 text-warning`（橙色背景，橙色文字）
  - 已批准/已通过：`bg-success/20 text-success`（绿色背景，绿色文字）
  - 已拒绝：`bg-destructive/20 text-destructive`（红色背景，红色文字）
  - 其他：`bg-muted text-muted-foreground`（灰色背景，灰色文字）

**5. 透明度**：
- 已处理的通知：`opacity-75`（75%透明度）
- 其他通知：`opacity-100`（100%透明度）

**6. 操作提示**：
- 待处理申请：显示"👉 点击处理"（橙色）
- 已处理申请：显示"✓ 已处理"（灰色）

**7. 文字样式**：
- 标题：`text-base font-semibold`（16px，加粗）
- 内容：`text-sm leading-relaxed`（14px，行高宽松）
- 时间：`text-xs`（12px）
- 状态标签：`text-xs font-medium`（12px，中等粗细）

**8. 间距**：
- 卡片内边距：`p-4`（16px）
- 元素间距：`gap-3`（12px）
- 内容底部间距：`mb-3`（12px）

#### 3.3 通知卡片完整代码

```typescript
{group.notifications.map((notification) => {
  const processStatus = getNotificationProcessStatus(notification.type)
  const statusLabel = getNotificationStatusLabel(notification.type)
  const statusColor = getNotificationStatusColor(notification.type)
  const isPending = processStatus === 'pending'
  const isProcessed = processStatus === 'processed'

  return (
    <View
      key={notification.id}
      className={`bg-card rounded-xl p-4 border-2 transition-all ${
        isPending
          ? 'border-warning/50 shadow-md hover:shadow-lg hover:border-warning'
          : notification.is_read
            ? 'border-border/50 hover:border-border'
            : 'border-primary/50 shadow-sm hover:shadow-md hover:border-primary'
      } ${isProcessed ? 'opacity-75' : ''}`}
      onClick={() => handleNotificationClick(notification)}>
      {/* 通知头部：状态指示器 + 标题 + 状态标签 */}
      <View className="flex items-start gap-3 mb-3">
        {/* 状态指示器 */}
        <View
          className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${
            isPending
              ? 'bg-warning animate-pulse'
              : notification.is_read
                ? 'bg-success'
                : 'bg-destructive animate-pulse'
          }`}></View>

        {/* 标题和状态标签 */}
        <View className="flex-1 min-w-0">
          <View className="flex items-center gap-2 mb-1">
            <Text
              className={`text-base font-semibold ${
                notification.is_read ? 'text-muted-foreground' : 'text-foreground'
              }`}>
              {notification.title}
            </Text>
            {/* 状态标签 */}
            <View
              className={`px-2 py-0.5 rounded-full ${
                isPending
                  ? 'bg-warning/20'
                  : isProcessed
                    ? statusColor.includes('success')
                      ? 'bg-success/20'
                      : statusColor.includes('destructive')
                        ? 'bg-destructive/20'
                        : 'bg-muted'
                    : 'bg-muted'
              }`}>
              <Text className={`text-xs font-medium ${statusColor}`}>{statusLabel}</Text>
            </View>
          </View>
        </View>

        {/* 删除按钮 */}
        <View
          className="i-mdi-delete text-xl text-muted-foreground hover:text-destructive cursor-pointer transition-colors"
          onClick={(e) => {
            e.stopPropagation()
            handleDelete(notification.id)
          }}></View>
      </View>

      {/* 通知内容 */}
      <View className="ml-6">
        <Text className="text-sm text-muted-foreground mb-3 leading-relaxed">
          {notification.message}
        </Text>

        {/* 通知底部：时间和操作提示 */}
        <View className="flex items-center justify-between">
          <View className="flex items-center gap-2">
            <View className="i-mdi-clock-outline text-sm text-muted-foreground"></View>
            <Text className="text-xs text-muted-foreground">
              {formatNotificationTime(notification.created_at)}
            </Text>
          </View>

          {/* 操作提示 */}
          {isPending && (
            <View className="flex items-center gap-1">
              <View className="i-mdi-hand-pointing-right text-sm text-warning"></View>
              <Text className="text-xs text-warning font-medium">点击处理</Text>
            </View>
          )}
          {isProcessed && (
            <View className="flex items-center gap-1">
              <View className="i-mdi-check-circle text-sm text-success"></View>
              <Text className="text-xs text-muted-foreground">已处理</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  )
})}
```

#### 3.4 颜色方案

| 状态 | 指示器颜色 | 边框颜色 | 标签背景 | 标签文字 | 说明 |
|------|-----------|---------|---------|---------|------|
| 待处理 | 橙色（脉冲） | 橙色/50 | 橙色/20 | 橙色 | 需要立即处理 |
| 未读 | 红色（脉冲） | 主题色/50 | - | - | 需要查看 |
| 已读 | 绿色 | 灰色/50 | - | - | 已查看 |
| 已批准 | - | - | 绿色/20 | 绿色 | 审批通过 |
| 已拒绝 | - | - | 红色/20 | 红色 | 审批拒绝 |
| 已处理 | - | - | 灰色 | 灰色 | 其他已处理 |

#### 3.5 动画效果

**1. 脉冲动画**：
- 应用于：待处理和未读通知的状态指示器
- 效果：圆点大小和透明度周期性变化
- 类名：`animate-pulse`

**2. 过渡动画**：
- 应用于：所有交互元素
- 效果：颜色、阴影、边框的平滑过渡
- 类名：`transition-all`、`transition-colors`

**3. 悬停效果**：
- 待处理申请：阴影增强，边框颜色加深
- 其他通知：边框颜色略微变化
- 删除按钮：颜色变为红色

## 优化效果对比

### 优化前

**通知卡片**：
```
┌─────────────────────────────────────┐
│ ● 新的请假申请              [删除] │
│   张三提交了请假申请，请及时处理    │
│   🕐 14:30                          │
└─────────────────────────────────────┘
```

**问题**：
- ❌ 没有状态标签，无法快速识别申请状态
- ❌ 已处理的申请仍可点击跳转
- ❌ 清空功能会删除所有通知，包括待处理申请
- ❌ 视觉层次不清晰
- ❌ 缺少操作提示

### 优化后

**通知卡片**：
```
┌─────────────────────────────────────────┐
│ ● 新的请假申请 [待审批]         [删除] │
│   张三提交了请假申请，请及时处理        │
│   🕐 14:30              👉 点击处理     │
└─────────────────────────────────────────┘
```

**改进**：
- ✅ 添加状态标签徽章，一目了然
- ✅ 已处理的申请点击后显示提示，不跳转
- ✅ 清空功能只清除已读且已处理的通知
- ✅ 使用颜色和动画区分不同状态
- ✅ 添加操作提示，引导用户操作

## 使用场景

### 场景 1：查看待处理的请假申请

1. 打开通知中心
2. 看到一条"新的请假申请"通知
3. 通知特征：
   - 橙色脉冲指示器
   - 橙色边框和阴影
   - "待审批"橙色标签
   - 右下角显示"👉 点击处理"
4. 点击通知，跳转到请假审批页面

### 场景 2：查看已处理的请假申请

1. 打开通知中心
2. 看到一条"请假申请已批准"通知
3. 通知特征：
   - 绿色指示器（无脉冲）
   - 灰色边框
   - "已批准"绿色标签
   - 右下角显示"✓ 已处理"
   - 整体透明度75%
4. 点击通知，显示提示"该申请已处理完成"，不跳转

### 场景 3：清空已读通知

1. 打开通知中心
2. 点击左侧"清空"按钮
3. 弹出确认对话框：
   - 标题："确认清空"
   - 内容："确认要清空所有已读且已处理的通知吗？共 5 条通知，此操作不可恢复。\n\n注意：未读或待处理的通知将被保留。"
   - 确认按钮："确认清空"（橙色）
   - 取消按钮："取消"
4. 点击"确认清空"
5. 系统清空5条已读且已处理的通知
6. 保留所有未读或待处理的通知
7. 显示提示"清空成功"

### 场景 4：区分不同状态的通知

**待处理申请**：
- 橙色脉冲指示器
- 橙色边框和阴影
- "待审批"/"待审核"橙色标签
- "👉 点击处理"提示
- 点击可跳转到处理页面

**未读通知**：
- 红色脉冲指示器
- 主题色边框和阴影
- 无状态标签或"通知"灰色标签
- 点击可查看详情

**已读通知**：
- 绿色指示器（无脉冲）
- 灰色边框
- 无状态标签或"通知"灰色标签
- 点击可查看详情

**已处理申请**：
- 绿色指示器（无脉冲）
- 灰色边框
- "已批准"/"已拒绝"/"已通过"等彩色标签
- "✓ 已处理"提示
- 整体透明度75%
- 点击显示提示，不跳转

## 技术实现

### 1. 新增辅助函数

**文件**：`src/db/notificationApi.ts`

**新增函数**：
- `isNotificationPending(type)`: 判断是否为待处理状态
- `isNotificationProcessed(type)`: 判断是否为已处理状态
- `getNotificationProcessStatus(type)`: 获取处理状态
- `getNotificationStatusLabel(type)`: 获取状态标签文字
- `getNotificationStatusColor(type)`: 获取状态颜色类名

### 2. 修改通知中心页面

**文件**：`src/pages/common/notifications/index.tsx`

**主要修改**：
1. 导入新增的辅助函数
2. 修改清空功能逻辑
3. 修改点击通知项的逻辑
4. 重新设计通知卡片UI
5. 添加状态标签和操作提示

### 3. 代码质量

**Lint 检查**：
```bash
pnpm run lint
```

**结果**：✅ 通过，无新增错误

## 测试验证

### 测试场景 1：待处理申请

- ✅ 待处理申请显示橙色脉冲指示器
- ✅ 待处理申请显示橙色边框和阴影
- ✅ 待处理申请显示"待审批"/"待审核"标签
- ✅ 待处理申请显示"点击处理"提示
- ✅ 点击待处理申请跳转到处理页面

### 测试场景 2：已处理申请

- ✅ 已处理申请显示绿色指示器（无脉冲）
- ✅ 已处理申请显示灰色边框
- ✅ 已处理申请显示"已批准"/"已拒绝"等标签
- ✅ 已处理申请显示"已处理"提示
- ✅ 已处理申请整体透明度75%
- ✅ 点击已处理申请显示提示，不跳转

### 测试场景 3：清空功能

- ✅ 点击清空按钮，弹出确认对话框
- ✅ 对话框显示可清除数量
- ✅ 对话框提示保留未读或待处理通知
- ✅ 确认清空后，只删除已读且已处理的通知
- ✅ 未读或待处理的通知被保留
- ✅ 清空成功后显示提示

### 测试场景 4：视觉效果

- ✅ 通知卡片圆角设计
- ✅ 状态指示器大小合适
- ✅ 脉冲动画流畅
- ✅ 状态标签颜色正确
- ✅ 悬停效果正常
- ✅ 过渡动画平滑

## 修改文件清单

### 1. 通知API文件

- **文件**：`src/db/notificationApi.ts`
- **新增**：
  - `NotificationProcessStatus` 类型定义
  - `isNotificationPending` 函数
  - `isNotificationProcessed` 函数
  - `getNotificationProcessStatus` 函数
  - `getNotificationStatusLabel` 函数
  - `getNotificationStatusColor` 函数

### 2. 通知中心页面

- **文件**：`src/pages/common/notifications/index.tsx`
- **修改**：
  - 导入新增的辅助函数
  - 修改 `handleClearAll` 函数
  - 修改 `handleNotificationClick` 函数
  - 重新设计通知卡片UI
  - 添加状态标签和操作提示

### 3. 文档

- **文件**：`docs/信息管理中心UI与交互逻辑优化.md`
- **内容**：详细的优化说明和实现文档

## Git 提交记录

```bash
commit b8c4198
优化信息管理中心UI与交互逻辑

核心功能优化：
1. 申请类信息的动态状态管理
2. 交互功能优化
3. 视觉与用户体验提升
4. 新增辅助函数
```

## 界面效果展示

### 待处理申请

```
┌─────────────────────────────────────────────────────┐
│ ⚠️ 新的请假申请 [待审批]                    [删除] │
│   张三提交了请假申请，请及时处理                    │
│   🕐 14:30                      👉 点击处理         │
└─────────────────────────────────────────────────────┘
```

**特征**：
- 橙色脉冲指示器
- 橙色边框和阴影
- "待审批"橙色标签
- "点击处理"提示

### 已批准申请

```
┌─────────────────────────────────────────────────────┐
│ ✓ 请假申请已批准 [已批准]                   [删除] │
│   您的请假申请已被批准                              │
│   🕐 昨天 15:30                  ✓ 已处理           │
└─────────────────────────────────────────────────────┘
```

**特征**：
- 绿色指示器（无脉冲）
- 灰色边框
- "已批准"绿色标签
- "已处理"提示
- 整体透明度75%

### 已拒绝申请

```
┌─────────────────────────────────────────────────────┐
│ ✓ 请假申请已拒绝 [已拒绝]                   [删除] │
│   您的请假申请已被拒绝，原因：...                   │
│   🕐 昨天 16:00                  ✓ 已处理           │
└─────────────────────────────────────────────────────┘
```

**特征**：
- 绿色指示器（无脉冲）
- 灰色边框
- "已拒绝"红色标签
- "已处理"提示
- 整体透明度75%

### 未读通知

```
┌─────────────────────────────────────────────────────┐
│ ● 仓库分配通知 [通知]                       [删除] │
│   您已被分配到"北京仓库"                            │
│   🕐 10:00                                          │
└─────────────────────────────────────────────────────┘
```

**特征**：
- 红色脉冲指示器
- 主题色边框和阴影
- "通知"灰色标签

### 已读通知

```
┌─────────────────────────────────────────────────────┐
│ ○ 仓库分配通知 [通知]                       [删除] │
│   您已被分配到"上海仓库"                            │
│   🕐 昨天 09:00                                     │
└─────────────────────────────────────────────────────┘
```

**特征**：
- 绿色指示器（无脉冲）
- 灰色边框
- "通知"灰色标签

## 后续优化建议

### 1. 添加批量操作

- 批量标记为已读
- 批量删除已处理申请
- 全选/取消全选

### 2. 添加筛选条件

- 按处理状态筛选（待处理、已处理、仅通知）
- 按申请类型筛选（请假、离职、车辆）
- 按时间范围筛选

### 3. 添加搜索功能

- 搜索通知标题
- 搜索通知内容
- 搜索申请人

### 4. 添加通知详情页

- 显示完整的申请信息
- 显示审批历史
- 显示相关附件

### 5. 添加通知统计

- 待处理申请数量
- 今日处理数量
- 处理效率统计

## 相关文档

- [通知中心UI网格布局优化](./通知中心UI网格布局优化.md)
- [通知中心信息分类功能优化](./通知中心信息分类功能优化.md)

## 总结

本次优化成功实现了信息管理中心的UI与交互逻辑优化，主要改进包括：

1. **申请类信息的动态状态管理**
   - ✅ 定义三种处理状态（待处理、已处理、仅通知）
   - ✅ 添加状态判断函数
   - ✅ 添加状态标签和颜色函数
   - ✅ 已处理的申请不可再次处理

2. **信息筛选与管理的精确性**
   - ✅ 重新定义清空功能
   - ✅ 只清除已读且已处理的通知
   - ✅ 保留所有未读或待处理的通知
   - ✅ 清空前显示可清除数量和保留提示

3. **视觉与用户体验全面提升**
   - ✅ 重新设计通知卡片UI
   - ✅ 使用颜色和图标区分状态
   - ✅ 添加状态标签徽章
   - ✅ 添加脉冲动画和过渡效果
   - ✅ 添加操作提示
   - ✅ 优化文字样式和间距

这些改进显著提升了信息管理中心的易用性和视觉效果，使得用户可以更方便地查看和管理不同类型的通知，特别是对待处理申请的管理更加清晰和高效。所有功能已经过测试验证，代码质量良好，无新增错误。

## 完成状态

✅ **已完成所有需求**
- ✅ 申请类信息的动态状态管理
- ✅ 信息筛选与管理的精确性
- ✅ 视觉与用户体验全面提升
- ✅ 新增辅助函数
- ✅ 通过代码质量检查
- ✅ 创建详细文档
- ✅ 提交代码到 Git

---

**开发者**: 秒哒 (Miaoda)  
**完成日期**: 2025-11-05  
**Commit ID**: b8c4198
