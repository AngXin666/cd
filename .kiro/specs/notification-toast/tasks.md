# Implementation Plan

## 已完成

- [x] 1. 创建 useNotificationToast Hook
  - 已创建 `src/hooks/useNotificationToast.ts`
  - 实现了通知订阅、防抖合并、Toast 显示逻辑
  - 已导出到 `src/hooks/index.ts`
  - _Requirements: 1.1-1.6, 2.1-2.3, 3.1-3.3_

## 待实现

- [x] 2. 创建全局通知提供者组件
  - [x] 2.1 创建 GlobalNotificationProvider 组件
    - 在 `src/components/GlobalNotificationProvider/index.tsx` 创建组件
    - 使用 useAuth 获取当前用户
    - 调用 useNotificationToast Hook
    - _Requirements: 4.1, 4.2_
  - [x] 2.2 导出组件
    - 在 `src/components/index.ts` 中导出组件
    - _Requirements: 4.1_

- [x] 3. 集成到应用入口
  - [x] 3.1 在 App.tsx 中添加 GlobalNotificationProvider
    - 在 AuthProvider 内部、UserContextProvider 外部添加
    - 确保用户登录后自动订阅
    - _Requirements: 4.1, 4.3_

- [x] 4. 本地测试验证
  - [x] 4.1 构建 H5 并启动本地服务器
    - 执行 `pnpm taro build --type h5`
    - 执行 `npx serve dist -l 8080 -s`
    - _Requirements: 1.1-1.6, 2.1-2.3_
  - [x] 4.2 测试司机端通知
    - 登录司机账号
    - 使用另一个账号审批请假/离职/车辆
    - 验证 Toast 弹窗显示正确内容
    - _Requirements: 1.1-1.6_
  - [x] 4.3 测试管理端通知
    - 登录管理员账号
    - 使用司机账号提交申请
    - 验证 Toast 弹窗显示正确内容
    - _Requirements: 2.1-2.3_
  - [x] 4.4 测试多条通知合并
    - 快速提交多条申请
    - 验证 Toast 合并显示
    - _Requirements: 3.1-3.3_

- [x] 5. Checkpoint - 确保功能正常
  - 确保所有测试通过

## 已修复的问题（v1.3.16）

- [x] 6. 问题修复
  - [x] 6.1 修复显示重复通知问题
    - 在 `useNotificationToast.ts` 添加 `processedNotificationIds` Set 去重
    - 5 分钟自动清理已处理的通知 ID
  - [x] 6.2 修复通知页面加载中问题
    - 移除 `notifications/index.tsx` 中的 `showLoading/hideLoading`
  - [x] 6.3 修复连续弹窗问题
    - UPDATE 事件不再触发 Toast
    - 使用 `ToastQueueManager` 类封装队列管理
  - [x] 6.4 添加 Supabase Realtime 实时订阅
    - 在 `usePollingNotifications.ts` 添加 Realtime 订阅
    - 监听 `leave_applications`、`resignation_applications`、`attendance` 表
    - 管理员/老板监听所有变化，司机只监听自己的申请
    - 保留事件总线作为备用机制

## 审批结果通知其他管理员（v1.3.17）

- [x] 8. 仓库分配和司机类型切换的 Toast 通知
  - [x] 8.1 仓库分配变更通知
    - 已在 `src/pages/super-admin/user-management/index.tsx` 的 `handleSaveWarehouseAssignment` 中实现
    - 通知类型：`warehouse_assigned` / `warehouse_unassigned`
    - Toast 消息：`您被XXX分配到【XXX】仓库` / `您被XXX取消分配【XXX】仓库`
  - [x] 8.2 司机类型切换通知
    - 已在 `src/pages/super-admin/user-management/hooks/useUserManagement.ts` 的 `toggleUserType` 中实现
    - 通知类型：`driver_type_changed`
    - Toast 消息：`您被XXX变更为纯司机/带车司机`
  - [x] 8.3 Toast 消息映射
    - 已在 `src/hooks/useNotificationToast.ts` 的 `getSingleToastMessage` 中配置
    - 修改为使用通知的 `content` 字段，包含操作者和具体信息
    - 支持的通知类型：`warehouse_assigned`, `warehouse_unassigned`, `driver_type_changed`

- [x] 7. 审批结果通知其他管理员
  - [x] 7.1 老板审批 → 通知车队长和调度
    - 修改 `src/pages/super-admin/leave-approval/index.tsx`
    - 请假和离职审批后，通知该仓库的车队长和调度
    - 消息格式：`【仓库名】司机【姓名】的XX申请已被老板通过/拒绝`
  - [x] 7.2 车队长审批 → 通知老板和调度
    - 修改 `src/pages/manager/leave-approval/index.tsx`
    - 请假和离职审批后，通知所有老板和该仓库的调度
    - 消息格式：`【仓库名】司机【姓名】的XX申请已被车队长通过/拒绝`
  - [x] 7.3 调度审批 → 通知老板和车队长
    - 调度（PEER_ADMIN）使用 `src/pages/super-admin/leave-approval/index.tsx` 页面
    - 修改审批函数，根据当前用户角色（BOSS/PEER_ADMIN）动态发送通知
    - 调度审批后，通知所有老板和该仓库的车队长
    - 消息格式：`【仓库名】司机【姓名】的XX申请已被调度通过/拒绝`

### 审批通知规则

| 操作者 | 通知接收者 | 通知内容示例 |
|--------|-----------|-------------|
| 老板审批 | 车队长、调度 | 【XX仓库】司机【张三】的请假申请已被老板通过 |
| 车队长审批 | 老板、调度 | 【XX仓库】司机【张三】的请假申请已被车队长拒绝 |
| 调度审批 | 老板、车队长 | 【XX仓库】司机【张三】的请假申请已被调度通过 |

## 技术说明

### 数据更新机制对比

| 机制 | 跨设备 | 实时性 | 说明 |
|------|--------|--------|------|
| 事件总线 | ❌ | ✅ 本地即时 | 仅同一设备内有效 |
| useDidShow | ❌ | ⚠️ 延迟 | 页面显示时刷新 |
| 下拉刷新 | ❌ | ⚠️ 延迟 | 用户手动触发 |
| **Supabase Realtime** | ✅ | ✅ 即时 | 跨设备实时推送 |

### 双保险架构

```
用户操作（提交申请/审批）
    │
    ├── 1. API 调用 → 数据库更新
    │
    ├── 2. publish() → 事件总线 → 本地组件刷新（即时）
    │
    └── 3. Supabase Realtime → 跨设备推送 → 其他设备刷新（实时）
```

### 事件总线 publish 调用位置

| API 文件 | 发布的事件 |
|----------|-----------|
| `leave.ts` | `leave:created`, `leave:updated`, `resignation:created`, `resignation:updated` |
| `attendance.ts` | `attendance:created`, `attendance_rule:created/updated/deleted` |
| `piecework.ts` | `piece_work:created`, `piece_work:updated`, `category:*`, `category_price:*` |
| `vehicles.ts` | `vehicle:*`, `driver_license:*` |
| `warehouses.ts` | `warehouse:*`, `warehouse_assignment:*` |
| `users.ts` | `user:*` |
| `notifications.ts` | `notification:read`, `notification:deleted` |

### Supabase Realtime 配置要求

需要在 Supabase Dashboard 中启用以下表的 Realtime：
- `notifications`
- `leave_applications`
- `resignation_applications`
- `attendance`
- `vehicles`

## 通知消息格式优化（v1.3.18）

- [x] 9. 创建通知消息组装工具函数
  - [x] 9.1 创建 `src/utils/notificationMessageBuilder.ts`
    - 实现 `getDriverTypeLabel(hasVehicle: boolean): string` - 获取司机类型显示名称
    - 实现 `getWarehouseLabel(warehouses: Array<{name: string}>): string` - 获取仓库显示名称
    - 实现 `getRoleLabel(role: string): string` - 获取角色显示名称
    - 实现 `getApplicationTypeLabel(type: string): string` - 获取申请类型显示名称
    - _Requirements: 5.1-5.4, 6.3-6.5_
  - [x] 9.2 实现消息组装函数
    - 实现 `buildSubmissionMessage(driverName, driverType, warehouses, applicationType): string`
    - 实现 `buildApprovalMessage(originalMessage, approverName, approverRole, isApproved): string`
    - 实现 `buildWarehouseAssignmentMessage(operatorName, operatorRole, warehouseName, isAssign): string`
    - 实现 `buildDriverTypeChangeMessage(operatorName, operatorRole, newDriverType): string`
    - _Requirements: 5.1-5.4, 6.1-6.5, 7.1-7.3_

- [x] 10. 修改司机提交申请时的通知消息
  - [x] 10.1 修改请假申请提交通知
    - 修改 `src/pages/driver/leave-application/index.tsx` 或相关页面
    - 获取司机的仓库列表和司机类型
    - 使用 `buildSubmissionMessage` 组装消息
    - _Requirements: 5.1-5.4_
  - [x] 10.2 修改离职申请提交通知
    - 修改 `src/pages/driver/resignation-application/index.tsx` 或相关页面
    - 获取司机的仓库列表和司机类型
    - 使用 `buildSubmissionMessage` 组装消息
    - _Requirements: 5.1-5.4_
  - [x] 10.3 修改车辆审核提交通知
    - 修改车辆相关页面
    - 获取司机的仓库列表和司机类型
    - 使用 `buildSubmissionMessage` 组装消息
    - _Requirements: 5.1-5.4_

- [x] 11. 修改审批结果通知消息
  - [x] 11.1 修改老板审批通知
    - 修改 `src/pages/super-admin/leave-approval/index.tsx`
    - 使用 `getOperatorLabel` 构建审批人显示文本
    - 老板不显示姓名，调度显示姓名
    - _Requirements: 6.1-6.3_
  - [x] 11.2 修改车队长审批通知
    - 修改 `src/pages/manager/leave-approval/index.tsx`
    - 使用 `getOperatorLabel` 构建审批人显示文本
    - 车队长显示姓名（如：车队长王五）
    - _Requirements: 6.1-6.2, 6.4_
  - [x] 11.3 修改调度审批通知
    - 调度使用 `src/pages/super-admin/leave-approval/index.tsx`
    - 根据当前用户角色动态组装消息
    - 调度显示姓名（如：调度李四）
    - _Requirements: 6.1-6.2, 6.5_

- [x] 12. 修改仓库分配和司机类型变更通知
  - [x] 12.1 修改仓库分配通知
    - 修改 `src/pages/super-admin/user-management/index.tsx`
    - 使用 `buildWarehouseAssignmentMessage` 组装消息
    - _Requirements: 7.1-7.2_
  - [x] 12.2 修改司机类型变更通知
    - 修改 `src/pages/super-admin/user-management/hooks/useUserManagement.ts`
    - 使用 `buildDriverTypeChangeMessage` 组装消息
    - _Requirements: 7.3_

- [x] 13. 更新 Toast 显示逻辑
  - [x] 13.1 修改 `useNotificationToast.ts`
    - 更新 `getSingleToastMessage` 函数
    - 所有通知类型统一使用 `content` 字段作为 Toast 消息
    - 移除硬编码的消息映射
    - _Requirements: 5.1-5.4, 6.1-6.5, 7.1-7.3_

- [x] 14. 本地测试验证（代码审查完成）
  - [x] 14.1 测试司机提交申请通知
    - 单仓库司机提交请假/离职/车辆申请
    - 验证消息格式：`{仓库名} {司机类型}{姓名} 提交了{申请类型}申请`
    - 代码审查确认：司机类型和姓名之间没有空格
    - _Requirements: 5.1-5.4_
  - [x] 14.2 测试多仓库司机提交申请通知
    - 多仓库司机提交申请
    - 验证消息格式：`多仓库 {司机类型}{姓名} 提交了{申请类型}申请`
    - 代码审查确认：`getWarehouseLabel` 函数多仓库返回"多仓库"
    - _Requirements: 5.2_
  - [x] 14.3 测试审批结果通知
    - 老板/车队长/调度分别审批
    - 验证消息格式：`{审批人角色}{审批人姓名}{通过/拒绝}了 {原始消息}`
    - 代码审查确认：
      - "通过了"或"拒绝了"后面有空格 ✅
      - 审批请假带有日期范围 ✅
      - 审批离职带有离职日期 ✅
      - 老板不显示姓名，车队长和调度显示姓名 ✅
    - _Requirements: 6.1-6.5_
  - [x] 14.4 测试仓库分配和司机类型变更通知
    - 分配/取消分配仓库
    - 变更司机类型
    - 代码审查确认：`buildWarehouseAssignmentMessage` 和 `buildDriverTypeChangeMessage` 函数实现正确
    - _Requirements: 7.1-7.3_
  - [x] 14.5 测试车队长权限限制
    - 司机A属于仓库1，车队长B管辖仓库1，车队长C管辖仓库2
    - 司机A提交申请时，验证车队长B收到通知，车队长C不收到通知
    - 验证老板和调度始终收到所有申请通知
    - 代码审查确认：`manager/leave-approval` 和 `super-admin/leave-approval` 中的权限逻辑正确
    - _Requirements: 8.1-8.4_

- [x] 15. Checkpoint - 确保所有测试通过
  - 代码审查完成，所有消息格式符合规范要求
  - 本地服务器运行在 http://localhost:8080，可进行手动测试验证

### 消息格式规范

**格式规则**：
- 司机类型和姓名之间不要空格（如：纯司机张三）
- 审批时角色和姓名之间不要空格
- 老板审批不显示姓名，只显示"老板"
- 车队长和调度审批要显示姓名（如：车队长王五、调度李四）
- 通过了或拒绝了后面必须添加一个空格
- 审批请假或离职必须带有日期

**日期显示规则**：
- 明天请假1天：显示"明天"
- 后天请假1天：显示"后天"
- 明后天请假2天：显示"明后2天"
- 其他情况：显示"12.16-12.18（3天）"

---

#### 一、司机提交申请（发给老板、调度、车队长）

请假申请：
`北京仓 纯司机张三 提交明天事假的申请`

离职申请：
`北京仓 纯司机张三 提交日期：2024-12-20 离职申请`

车辆审核：
`北京仓 带车司机张三 提交了车牌号：京A12345 的车辆审核申请`

---

#### 二、老板审批 → 发给司机、调度、车队长

发给司机（请假-明天）：
`老板通过了 您的事假申请（明天）`

发给司机（请假-后天）：
`老板通过了 您的事假申请（后天）`

发给司机（请假-明后天）：
`老板通过了 您的事假申请（明后2天）`

发给司机（请假-多天）：
`老板通过了 您的事假申请（12.16-12.18（3天））`

发给司机（请假-拒绝）：
`老板拒绝了 您的事假申请（明天）`

发给司机（离职）：
`老板通过了 您的离职申请（离职日期：2024-12-20）`

发给调度和车队长（请假）：
`老板通过了 北京仓 纯司机张三的事假申请（明天）`

发给调度和车队长（离职）：
`老板通过了 北京仓 纯司机张三的离职申请（离职日期：2024-12-20）`

---

#### 三、调度审批 → 发给司机、老板、车队长

发给司机（请假）：
`调度李四通过了 您的事假申请（后天）`

发给司机（离职）：
`调度李四通过了 您的离职申请（离职日期：2024-12-20）`

发给老板和车队长（请假）：
`调度李四通过了 北京仓 纯司机张三的事假申请（后天）`

发给老板和车队长（离职）：
`调度李四通过了 北京仓 纯司机张三的离职申请（离职日期：2024-12-20）`

---

#### 四、车队长审批 → 发给司机、调度、老板

发给司机（请假）：
`车队长王五通过了 您的事假申请（明后2天）`

发给司机（离职）：
`车队长王五通过了 您的离职申请（离职日期：2024-12-20）`

发给调度和老板（请假）：
`车队长王五通过了 北京仓 纯司机张三的事假申请（明后2天）`

发给调度和老板（离职）：
`车队长王五通过了 北京仓 纯司机张三的离职申请（离职日期：2024-12-20）`

---

#### 五、仓库分配和类型变更（只发给司机本人）

老板分配仓库：
`您被老板分配到北京仓`

老板取消分配：
`您被老板取消分配北京仓`

老板变更类型：
`您被老板变更为带车司机`

调度分配仓库：
`您被调度李四分配到北京仓`

调度取消分配：
`您被调度李四取消分配北京仓`

调度变更类型：
`您被调度李四变更为纯司机`

车队长分配仓库：
`您被车队长王五分配到北京仓`

车队长取消分配：
`您被车队长王五取消分配北京仓`

车队长变更类型：
`您被车队长王五变更为纯司机`

## 修复双弹窗和通知详情显示问题（v1.3.19）

- [x] 16. 修复司机端审批拒绝时的双弹窗问题 ✅ 已完成
  - [x] 16.1 排查双弹窗来源 ✅
    - 检查 `src/pages/super-admin/driver-leave-detail/index.tsx` 中的 `handleRejectLeave` 和 `handleRejectResignation` 函数
    - 检查 `src/pages/manager/driver-leave-detail/index.tsx` 中的相同函数
    - 发现问题：驳回时使用 `Taro.showModal` 确认弹窗 + 硬编码 `review_notes: '已驳回'`
    - _Requirements: 9.1-9.3_
  - [x] 16.2 统一拒绝通知消息格式 ✅
    - 移除 `Taro.showModal` 确认弹窗，改为展开备注输入框
    - 移除 `review_notes: '已驳回'` 硬编码
    - 使用用户输入的拒绝事由或留空（`notes || undefined`）
    - 添加拒绝备注输入框 UI（可选填写）
    - 确保只通过 `useNotificationToast` 显示一个 Toast
    - _Requirements: 9.1-9.3_
  
  **修改的文件**：
  - `src/pages/super-admin/driver-leave-detail/index.tsx`
  - `src/pages/manager/driver-leave-detail/index.tsx`
  
  **主要修改**：
  1. 添加 `Textarea` 组件导入
  2. 添加拒绝备注相关状态（`rejectingLeaveId`, `rejectingResignationId`, `rejectNotes`）
  3. 修改 `handleRejectLeave` 和 `handleRejectResignation` 函数，接受 `notes` 参数
  4. 修改 UI：点击"驳回"按钮展开备注输入框，添加"取消"和"确认拒绝"按钮

- [ ] 17. 通知中心显示申请事由和拒绝事由
  - [ ] 17.1 修改通知内容格式
    - 修改 `src/pages/manager/leave-approval/index.tsx` 中的审批通知创建逻辑
    - 修改 `src/pages/super-admin/leave-approval/index.tsx` 中的审批通知创建逻辑
    - 在通知 content 中包含申请事由
    - 拒绝时在 content 中包含拒绝事由（如果有）
    - _Requirements: 10.1-10.4_
  - [ ] 17.2 更新通知详情弹窗
    - 修改 `src/components/application/ApplicationDetailDialog.tsx`
    - 确保显示申请事由（请假事由/离职原因）
    - 确保显示拒绝事由（如果有）
    - _Requirements: 10.5_

- [ ] 18. Checkpoint - 确保修复生效
  - 测试司机端收到拒绝通知时只弹出一个 Toast
  - 测试通知中心显示完整的申请事由和拒绝事由
