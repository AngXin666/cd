# 仓库分配实时通知功能完整实现

## 📋 需求说明

在以下两个位置添加仓库分配的实时通知功能：

1. **超级管理员端** → 用户管理 → 用户详情页 → "仓库分配"按钮
2. **普通管理员端** → 司机管理 → 司机详情页 → "仓库分配"按钮

## ✅ 已完成的修改

### 1. 超级管理员端 - 用户管理页面

**文件**：`src/pages/super-admin/user-management/index.tsx`

**修改内容**：
- 修改了 `handleSaveWarehouseAssignment` 函数
- 添加了完整的通知发送逻辑

**通知逻辑**：
1. **通知司机**：
   - 当仓库分配发生变更时，通知司机
   - 区分新增、移除、同时新增和移除三种情况
   - 通知类型：`warehouse_assigned` 或 `warehouse_unassigned`

2. **通知管理员**（仅超级管理员操作时）：
   - 获取受影响仓库的所有管理员
   - 通知这些管理员司机的仓库分配变更
   - 通知类型：`warehouse_assigned`

**关键代码**：
```typescript
// 获取之前的仓库分配（用于对比变更）
const previousAssignments = await getWarehouseAssignmentsByDriver(userId)
const previousWarehouseIds = previousAssignments.map((a) => a.warehouse_id)

// 计算仓库变更情况
const addedWarehouseIds = selectedWarehouseIds.filter((id) => !previousWarehouseIds.includes(id))
const removedWarehouseIds = previousWarehouseIds.filter((id) => !selectedWarehouseIds.includes(id))

// 1. 通知司机
if (addedWarehouseIds.length > 0 || removedWarehouseIds.length > 0) {
  // 构建通知消息
  notifications.push({
    userId: userId,
    type: addedWarehouseIds.length > 0 ? 'warehouse_assigned' : 'warehouse_unassigned',
    title: '仓库分配变更通知',
    message: message,
    relatedId: userId
  })
}

// 2. 如果是超级管理员操作 → 通知相关仓库的管理员
const currentUserProfile = await getCurrentUserProfile()
if (currentUserProfile && currentUserProfile.role === 'super_admin') {
  // 获取所有受影响的仓库（新增的和移除的）
  const affectedWarehouseIds = [...new Set([...addedWarehouseIds, ...removedWarehouseIds])]
  
  // 获取这些仓库的管理员
  for (const warehouseId of affectedWarehouseIds) {
    const managers = await getWarehouseManagers(warehouseId)
    managers.forEach((m) => managersSet.add(m.id))
  }
  
  // 通知相关管理员
  for (const managerId of managersSet) {
    notifications.push({
      userId: managerId,
      type: 'warehouse_assigned',
      title: '仓库分配操作通知',
      message: `超级管理员 ${currentUserProfile.name} 修改了司机 ${userName} 的仓库分配，涉及仓库：${warehouseNames}`,
      relatedId: userId
    })
  }
}

// 批量发送通知
if (notifications.length > 0) {
  const success = await createNotifications(notifications)
}
```

### 2. 普通管理员端 - 司机管理页面

**文件**：`src/pages/manager/driver-management/index.tsx`

**修改内容**：
- 修改了 `handleSaveWarehouseAssignment` 函数
- 添加了通知司机的逻辑

**通知逻辑**：
1. **通知司机**：
   - 当仓库分配发生变更时，通知司机
   - 区分新增、移除、同时新增和移除三种情况
   - 通知类型：`warehouse_assigned` 或 `warehouse_unassigned`

**注意**：
- 普通管理员只能分配自己管理的仓库
- 不需要通知其他管理员（因为只涉及自己管理的仓库）

**关键代码**：
```typescript
// 获取之前的仓库分配（用于对比变更）
const previousAssignments = await getWarehouseAssignmentsByDriver(driverId)
const previousWarehouseIds = previousAssignments.map((a) => a.warehouse_id)

// 计算仓库变更情况
const addedWarehouseIds = selectedWarehouseIds.filter((id) => !previousWarehouseIds.includes(id))
const removedWarehouseIds = previousWarehouseIds.filter((id) => !selectedWarehouseIds.includes(id))

// 通知司机
if (addedWarehouseIds.length > 0 || removedWarehouseIds.length > 0) {
  // 构建通知消息
  notifications.push({
    userId: driverId,
    type: addedWarehouseIds.length > 0 ? 'warehouse_assigned' : 'warehouse_unassigned',
    title: '仓库分配变更通知',
    message: message,
    relatedId: driverId
  })
}

// 批量发送通知
if (notifications.length > 0) {
  const success = await createNotifications(notifications)
}
```

## 🔍 调试日志

两个页面都添加了详细的调试日志，方便排查问题：

### 超级管理员端日志标识
```
🔔 [仓库分配] 开始发送通知
📊 [仓库分配] 仓库变更情况
📝 [仓库分配] 准备通知司机
👤 [仓库分配] 当前用户信息
👑 [仓库分配] 操作者是超级管理员
📦 [仓库分配] 受影响的仓库
👥 [仓库分配] 仓库 X 的管理员
👥 [仓库分配] 需要通知的管理员总数
📤 [仓库分配] 准备发送通知
✅ [仓库分配] 已成功发送 X 条通知
❌ [仓库分配] 通知发送失败
ℹ️ [仓库分配] 没有需要发送的通知
```

### 普通管理员端日志标识
```
🔔 [仓库分配-管理员] 开始发送通知
📊 [仓库分配-管理员] 仓库变更情况
📝 [仓库分配-管理员] 准备通知司机
📤 [仓库分配-管理员] 准备发送通知
✅ [仓库分配-管理员] 已成功发送 X 条通知
❌ [仓库分配-管理员] 通知发送失败
ℹ️ [仓库分配-管理员] 没有需要发送的通知
```

## 🧪 测试步骤

### 测试1：超级管理员分配仓库

1. **登录超级管理员账号**
2. **打开浏览器控制台（F12）**
3. **进入"用户管理"页面**
4. **选择一个司机**
5. **点击"仓库分配"按钮**
6. **勾选一个或多个仓库**
7. **点击"保存"**
8. **查看控制台日志**

**预期结果**：
- ✅ 控制台输出完整的日志
- ✅ 显示"已成功发送 X 条通知"
- ✅ 司机账号能看到"仓库分配变更通知"
- ✅ 相关仓库的管理员能看到"仓库分配操作通知"

### 测试2：普通管理员分配仓库

1. **登录普通管理员账号**
2. **打开浏览器控制台（F12）**
3. **进入"司机管理"页面**
4. **选择一个司机**
5. **点击"仓库分配"按钮**
6. **勾选一个或多个仓库**
7. **点击"保存"**
8. **查看控制台日志**

**预期结果**：
- ✅ 控制台输出完整的日志
- ✅ 显示"已成功发送 X 条通知"
- ✅ 司机账号能看到"仓库分配变更通知"

### 测试3：验证通知内容

1. **使用司机账号登录**
2. **进入"通知中心"**
3. **查看最新的通知**

**预期通知内容**：

**新增仓库**：
```
标题：仓库分配变更通知
内容：您已被分配到新仓库：仓库A、仓库B
```

**移除仓库**：
```
标题：仓库分配变更通知
内容：您已从以下仓库移除：仓库C、仓库D
```

**同时新增和移除**：
```
标题：仓库分配变更通知
内容：您的仓库分配已更新：
新增：仓库A、仓库B
移除：仓库C、仓库D
```

### 测试4：验证管理员通知（仅超级管理员操作）

1. **使用管理员账号登录**
2. **进入"通知中心"**
3. **查看最新的通知**

**预期通知内容**：
```
标题：仓库分配操作通知
内容：超级管理员 张三 修改了司机 李四 的仓库分配，涉及仓库：仓库A、仓库B
```

## 📊 通知类型说明

### warehouse_assigned（仓库分配）
- 用于新增仓库或同时有新增和移除的情况
- 司机收到此类型通知表示有新仓库分配
- 管理员收到此类型通知表示有仓库分配操作

### warehouse_unassigned（仓库取消分配）
- 用于仅移除仓库的情况
- 司机收到此类型通知表示从某些仓库移除

## 🎯 实现特点

### 1. 智能变更检测
- 对比之前和现在的仓库分配
- 只在有实际变更时发送通知
- 区分新增、移除、同时新增和移除三种情况

### 2. 精准通知范围
- 司机：总是收到自己的仓库分配变更通知
- 管理员：只有超级管理员操作时，相关仓库的管理员才会收到通知
- 避免通知泛滥

### 3. 详细的调试日志
- 每个关键步骤都有日志输出
- 使用 emoji 图标便于识别
- 包含完整的上下文信息

### 4. 错误处理
- 通知发送失败不影响主流程
- 使用 try-catch 捕获异常
- 记录详细的错误信息

### 5. 用户友好的消息
- 通知内容清晰明了
- 包含具体的仓库名称
- 区分不同的变更类型

## 🔄 与其他功能的对比

### 切换司机类型通知（参考实现）
```typescript
// 1. 通知司机
notifications.push({
  userId: targetUser.id,
  type: 'driver_type_changed',
  title: '司机类型变更通知',
  message: `您的司机类型已从【${currentTypeText}】变更为【${newTypeText}】`,
  relatedId: targetUser.id
})

// 2. 超级管理员操作 → 通知该司机所属仓库的普通管理员
if (currentUserProfile && currentUserProfile.role === 'super_admin') {
  const driverWarehouseIds = await getDriverWarehouseIds(targetUser.id)
  // 获取这些仓库的管理员并通知
}
```

### 仓库分配通知（本次实现）
```typescript
// 1. 通知司机
if (addedWarehouseIds.length > 0 || removedWarehouseIds.length > 0) {
  notifications.push({
    userId: userId,
    type: addedWarehouseIds.length > 0 ? 'warehouse_assigned' : 'warehouse_unassigned',
    title: '仓库分配变更通知',
    message: message,
    relatedId: userId
  })
}

// 2. 超级管理员操作 → 通知受影响仓库的管理员
if (currentUserProfile && currentUserProfile.role === 'super_admin') {
  const affectedWarehouseIds = [...new Set([...addedWarehouseIds, ...removedWarehouseIds])]
  // 获取这些仓库的管理员并通知
}
```

**相似之处**：
- 都是先通知直接相关的用户（司机）
- 超级管理员操作时都会通知相关管理员
- 使用相同的通知发送机制

**不同之处**：
- 仓库分配需要对比变更情况
- 仓库分配有多种通知类型
- 仓库分配的通知消息更复杂

## ✅ 验证清单

在完成测试后，请确认以下各项：

- [ ] 超级管理员分配仓库后，司机能收到通知
- [ ] 超级管理员分配仓库后，相关管理员能收到通知
- [ ] 普通管理员分配仓库后，司机能收到通知
- [ ] 通知内容准确反映了仓库变更情况
- [ ] 控制台日志输出完整
- [ ] 没有 JavaScript 错误
- [ ] 数据库中有对应的通知记录
- [ ] 通知中心能正确显示通知
- [ ] 实时订阅功能正常工作

## 📝 注意事项

1. **必须打开浏览器控制台**
   - 所有调试日志都输出到控制台
   - 没有控制台日志无法排查问题

2. **确保数据库权限正常**
   - 通知表的 INSERT 策略必须正确
   - RLS 策略不能阻止通知创建

3. **检查实时订阅**
   - 通知中心应该能实时显示新通知
   - 如果没有实时更新，刷新页面

4. **验证通知类型**
   - 确保通知类型枚举包含 `warehouse_assigned` 和 `warehouse_unassigned`
   - 检查数据库中的通知类型是否正确

## 🚀 后续优化建议

1. **批量操作优化**
   - 如果需要批量分配多个司机，可以考虑批量发送通知
   - 减少数据库查询次数

2. **通知去重**
   - 如果短时间内多次修改同一司机的仓库分配
   - 可以考虑合并通知或只保留最新的通知

3. **通知模板**
   - 可以将通知消息模板提取到配置文件
   - 便于统一管理和修改

4. **通知优先级**
   - 可以为不同类型的通知设置优先级
   - 重要通知可以置顶显示

## 📞 问题排查

如果通知功能不正常，请按以下步骤排查：

1. **检查控制台日志**
   - 是否有错误信息？
   - 是否显示"已成功发送 X 条通知"？

2. **查询数据库**
   ```sql
   -- 查询最近的通知
   SELECT * FROM notifications 
   WHERE created_at > NOW() - INTERVAL '10 minutes'
   ORDER BY created_at DESC;
   ```

3. **检查通知类型**
   ```sql
   -- 查询通知类型枚举
   SELECT enum_range(NULL::notification_type);
   ```

4. **检查 RLS 策略**
   ```sql
   -- 查询通知表的策略
   SELECT policyname, cmd, with_check
   FROM pg_policies 
   WHERE tablename = 'notifications';
   ```

5. **使用测试工具**
   - 进入"测试通知"页面
   - 测试基本的通知发送功能
   - 排除其他因素的干扰

## 🎉 总结

本次实现完成了以下功能：

1. ✅ 超级管理员端的仓库分配实时通知
2. ✅ 普通管理员端的仓库分配实时通知
3. ✅ 智能的变更检测和通知发送
4. ✅ 详细的调试日志
5. ✅ 完善的错误处理
6. ✅ 用户友好的通知消息

参考了切换司机类型的通知实现，确保了代码风格和逻辑的一致性。

所有修改都已完成，可以开始测试了！🚀
