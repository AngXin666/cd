# 仓库分配通知功能修复

## 📋 问题描述

用户报告：
1. **司机分配仓库时没有收到通知**
2. **超级管理员分配司机到别的仓库时，该仓库管辖权的管理员没有收到通知**

## 🐛 问题根源

### 问题1：代码逻辑错误

**文件**：`src/pages/super-admin/driver-warehouse-assignment/index.tsx`

**错误代码**：
```typescript
// ❌ 错误：先判断是超级管理员，然后又判断是普通管理员
if (operatorProfile && operatorProfile.role === 'super_admin') {
  if (operatorProfile.role === 'manager') {
    // 这段代码永远不会执行！
  } else if (operatorProfile.role === 'super_admin') {
    // 只有这段代码会执行
  }
}
```

**问题分析**：
- 外层判断了 `operatorProfile.role === 'super_admin'`
- 内层又判断 `operatorProfile.role === 'manager'`
- 这两个条件是互斥的，导致普通管理员的通知逻辑永远不会执行
- 超级管理员的通知逻辑虽然能执行，但外层条件限制了只有超级管理员才能进入

### 问题2：缺少详细的调试日志

**问题**：
- 无法知道通知发送函数是否被调用
- 无法知道通知是否发送成功
- 无法知道具体哪一步出了问题

## ✅ 修复方案

### 修复1：修正代码逻辑

**修改文件**：`src/pages/super-admin/driver-warehouse-assignment/index.tsx`

**修复后的代码**：
```typescript
// ✅ 正确：先判断操作者是否存在，然后根据角色分别处理
if (operatorProfile) {
  if (operatorProfile.role === 'manager') {
    // 普通管理员操作 → 通知所有超级管理员
    // ...
  } else if (operatorProfile.role === 'super_admin') {
    // 超级管理员操作 → 通知相关仓库的普通管理员
    // ...
  }
} else {
  console.warn('⚠️ [通知系统] 操作者信息为空，无法通知管理员')
}
```

**修复效果**：
- ✅ 普通管理员操作时，能正确通知超级管理员
- ✅ 超级管理员操作时，能正确通知相关仓库的管理员
- ✅ 司机始终能收到通知（不依赖操作者角色）

### 修复2：添加详细的调试日志

**添加的日志点**：

1. **开始发送通知**
```typescript
console.log('🔔 [通知系统] 开始发送仓库分配通知', {
  司机: driver.name,
  司机ID: driver.id,
  之前的仓库: previousWarehouseIds,
  新的仓库: newWarehouseIds,
  操作者: operatorProfile?.name || '未知',
  操作者角色: operatorProfile?.role || '未知'
})
```

2. **仓库变更情况**
```typescript
console.log('📊 [通知系统] 仓库变更情况', {
  新增的仓库: addedWarehouseIds,
  取消的仓库: removedWarehouseIds,
  是否有变更: addedWarehouseIds.length > 0 || removedWarehouseIds.length > 0
})
```

3. **通知司机**
```typescript
console.log('📝 [通知系统] 准备通知司机（新增仓库）', {
  司机ID: driver.id,
  仓库: addedWarehouseNames
})
```

4. **通知管理员**
```typescript
console.log('👤 [通知系统] 操作者是超级管理员，准备通知相关仓库的管理员')
console.log('📦 [通知系统] 受影响的仓库', {
  仓库ID列表: affectedWarehouseIds,
  仓库数量: affectedWarehouseIds.length
})
console.log('👥 [通知系统] 需要通知的管理员总数', {
  管理员数量: managersSet.size
})
```

5. **发送通知**
```typescript
console.log('📤 [通知系统] 准备发送通知', {
  通知数量: notifications.length,
  通知列表: notifications.map((n) => ({
    接收者ID: n.userId,
    类型: n.type,
    标题: n.title,
    消息: n.message
  }))
})
```

6. **发送结果**
```typescript
if (success) {
  console.log(`✅ [通知系统] 已成功发送 ${notifications.length} 条仓库分配通知`)
} else {
  console.error('❌ [通知系统] 发送通知失败')
}
```

### 修复3：添加错误提示

**修改内容**：
```typescript
// 发送失败时显示提示
if (!success) {
  showToast({
    title: '通知发送失败',
    icon: 'none',
    duration: 2000
  })
}

// 异常时显示提示
catch (error) {
  console.error('❌ [通知系统] 发送仓库分配通知异常:', error)
  showToast({
    title: '通知发送异常',
    icon: 'none',
    duration: 2000
  })
}
```

### 修复4：优化通知发送条件

**修改内容**：
```typescript
// 如果没有任何变更，不发送通知
if (addedWarehouseIds.length === 0 && removedWarehouseIds.length === 0) {
  console.log('ℹ️ [通知系统] 仓库没有变更，不发送通知')
  return
}
```

**修复效果**：
- ✅ 避免重复保存相同仓库时发送无意义的通知
- ✅ 提高系统效率

## 🧪 测试步骤

### 测试1：超级管理员分配司机到仓库（主要测试）

**准备工作**：
1. 确保有超级管理员账号
2. 确保有司机账号
3. 确保有仓库数据
4. 确保仓库有管理员

**操作步骤**：
1. 登录超级管理员账号
2. 打开浏览器开发者工具（F12），切换到 Console 标签页
3. 进入"仓库分配"页面
4. 选择一个司机
5. 勾选一个仓库（之前没有分配过的）
6. 点击"保存分配"
7. **查看控制台日志输出**

**预期日志输出**：
```
🔔 [通知系统] 开始发送仓库分配通知
📊 [通知系统] 仓库变更情况
📝 [通知系统] 准备通知司机（新增仓库）
👤 [通知系统] 操作者是超级管理员，准备通知相关仓库的管理员
📦 [通知系统] 受影响的仓库
📦 [通知系统] 仓库 xxx 的管理员
👥 [通知系统] 需要通知的管理员总数
📝 [通知系统] 准备通知管理员
📤 [通知系统] 准备发送通知
✅ [通知系统] 已成功发送 X 条仓库分配通知
```

**验证结果**：
1. ✅ 司机账号登录，进入通知中心，应该看到"仓库分配通知"
2. ✅ 该仓库的管理员登录，进入通知中心，应该看到"仓库分配操作通知"
3. ✅ 工作台顶部通知栏应该显示新通知

### 测试2：查看数据库通知记录

```sql
-- 查询最近的仓库分配通知
SELECT 
  n.id,
  n.user_id,
  p.name as user_name,
  p.role as user_role,
  n.type,
  n.title,
  n.message,
  n.is_read,
  n.created_at
FROM notifications n
LEFT JOIN profiles p ON n.user_id = p.id
WHERE n.type IN ('warehouse_assigned', 'warehouse_unassigned')
ORDER BY n.created_at DESC
LIMIT 10;
```

**预期结果**：
- ✅ 应该看到新创建的通知记录
- ✅ 司机的通知：type = 'warehouse_assigned'，title = '仓库分配通知'
- ✅ 管理员的通知：type = 'warehouse_assigned'，title = '仓库分配操作通知'

### 测试3：取消仓库分配

**操作步骤**：
1. 登录超级管理员账号
2. 打开浏览器开发者工具（F12）
3. 进入"仓库分配"页面
4. 选择一个已分配仓库的司机
5. 取消勾选某个仓库
6. 点击"保存分配"
7. **查看控制台日志输出**

**预期日志输出**：
```
🔔 [通知系统] 开始发送仓库分配通知
📊 [通知系统] 仓库变更情况
📝 [通知系统] 准备通知司机（取消仓库）
👤 [通知系统] 操作者是超级管理员，准备通知相关仓库的管理员
📤 [通知系统] 准备发送通知
✅ [通知系统] 已成功发送 X 条仓库分配通知
```

**验证结果**：
1. ✅ 司机账号登录，应该看到"仓库取消分配通知"
2. ✅ 该仓库的管理员应该看到"仓库分配操作通知"

### 测试4：没有变更时不发送通知

**操作步骤**：
1. 登录超级管理员账号
2. 打开浏览器开发者工具（F12）
3. 进入"仓库分配"页面
4. 选择一个司机
5. 不修改任何仓库勾选状态
6. 直接点击"保存分配"
7. **查看控制台日志输出**

**预期日志输出**：
```
🔔 [通知系统] 开始发送仓库分配通知
📊 [通知系统] 仓库变更情况
ℹ️ [通知系统] 仓库没有变更，不发送通知
```

**验证结果**：
- ✅ 不会发送任何通知
- ✅ 数据库中不会新增通知记录

## 📊 通知发送逻辑流程

```
1. 超级管理员点击"保存分配"
   ↓
2. 调用 setDriverWarehouses() 保存到数据库
   ↓
3. 如果保存成功，调用 sendWarehouseAssignmentNotifications()
   ↓
4. 判断仓库变更情况（新增/取消）
   ↓
5. 如果没有变更，直接返回（不发送通知）
   ↓
6. 创建通知列表：
   - 司机通知（如果有新增或取消）
   - 管理员通知（根据操作者角色）
   ↓
7. 调用 createNotifications() 批量发送
   ↓
8. 通知发送成功
   ↓
9. 司机和管理员在通知中心看到通知
   ↓
10. 工作台顶部通知栏显示未读通知
```

## 💡 关键改进点

### 1. 修正了条件判断逻辑

**之前**：
```typescript
if (operatorProfile && operatorProfile.role === 'super_admin') {
  if (operatorProfile.role === 'manager') {
    // 永远不会执行
  }
}
```

**现在**：
```typescript
if (operatorProfile) {
  if (operatorProfile.role === 'manager') {
    // 可以正常执行
  } else if (operatorProfile.role === 'super_admin') {
    // 可以正常执行
  }
}
```

### 2. 添加了完整的日志系统

**日志级别**：
- 🔔 开始操作
- 📊 数据分析
- 📝 准备通知
- 👤 操作者信息
- 📦 仓库信息
- 👥 管理员信息
- 📤 发送通知
- ✅ 成功
- ❌ 失败
- ⚠️ 警告
- ℹ️ 信息

### 3. 添加了错误提示

**用户体验改进**：
- 通知发送失败时，显示 Toast 提示
- 通知发送异常时，显示 Toast 提示
- 控制台输出详细的错误信息

### 4. 优化了通知发送条件

**性能优化**：
- 没有变更时不发送通知
- 避免无意义的数据库操作
- 提高系统响应速度

## 📝 修改文件列表

1. **src/pages/super-admin/driver-warehouse-assignment/index.tsx**
   - 修正了条件判断逻辑
   - 添加了详细的调试日志
   - 添加了错误提示
   - 优化了通知发送条件

2. **WAREHOUSE_ASSIGNMENT_NOTIFICATION_FIX.md**
   - 本文档（修复说明）

## 🎯 预期效果

修复后，应该实现以下功能：

1. ✅ 司机被分配到仓库时，收到通知
2. ✅ 司机被取消仓库分配时，收到通知
3. ✅ 超级管理员分配司机到仓库时，该仓库的管理员收到通知
4. ✅ 超级管理员取消司机仓库分配时，该仓库的管理员收到通知
5. ✅ 没有变更时不发送通知
6. ✅ 通知栏正确显示未读通知
7. ✅ 通知中心正确显示所有通知
8. ✅ 控制台输出详细的调试日志
9. ✅ 发送失败时显示错误提示

## 📞 如何使用调试日志

### 1. 打开浏览器控制台

- **Chrome/Edge**：按 F12 或 Ctrl+Shift+I
- **Firefox**：按 F12 或 Ctrl+Shift+K
- **Safari**：按 Cmd+Option+I

### 2. 切换到 Console 标签页

在开发者工具中，点击 "Console" 标签页

### 3. 执行操作

进行仓库分配操作，观察控制台输出

### 4. 查看日志

日志会按照以下格式输出：
```
🔔 [通知系统] 开始发送仓库分配通知 {司机: "张三", ...}
📊 [通知系统] 仓库变更情况 {新增的仓库: [...], ...}
...
✅ [通知系统] 已成功发送 2 条仓库分配通知
```

### 5. 分析问题

根据日志输出，可以判断：
- 通知发送函数是否被调用
- 仓库变更情况是否正确
- 操作者信息是否正确
- 通知是否发送成功
- 如果失败，具体的错误信息

## 🎉 测试确认

请按照以下步骤确认修复效果：

1. **登录超级管理员账号**
2. **打开浏览器控制台（F12）**
3. **进入"仓库分配"页面**
4. **选择司机并分配仓库**
5. **查看控制台日志输出**
6. **登录司机账号，查看通知中心**
7. **登录管理员账号，查看通知中心**

如果以上步骤都正常，说明修复成功！✅

## 🔍 故障排查

如果仍然没有收到通知，请检查：

### 1. 控制台日志

**如果没有任何日志输出**：
- 说明 `sendWarehouseAssignmentNotifications` 函数没有被调用
- 检查 `handleSave` 函数的执行流程
- 检查 `result.success` 的值

**如果有日志但显示"仓库没有变更"**：
- 说明选择的仓库和之前一样
- 尝试选择不同的仓库

**如果有日志但显示"操作者信息为空"**：
- 说明 `currentUserProfile` 为 null
- 检查用户登录状态
- 检查 `loadDrivers` 函数是否正确获取了当前用户信息

**如果有日志但显示"发送通知失败"**：
- 说明 `createNotifications` 函数返回 false
- 检查数据库连接
- 检查通知表的 RLS 策略
- 检查通知类型枚举是否包含 'warehouse_assigned'

### 2. 数据库检查

```sql
-- 检查通知类型枚举
SELECT enum_range(NULL::notification_type);

-- 检查通知表的 RLS 策略
SELECT * FROM pg_policies WHERE tablename = 'notifications';

-- 检查最近的通知记录
SELECT * FROM notifications ORDER BY created_at DESC LIMIT 10;
```

### 3. 网络请求检查

在浏览器开发者工具的 Network 标签页中：
- 筛选 Supabase 请求
- 查找 `notifications` 表的 INSERT 请求
- 检查请求参数是否正确
- 检查响应状态码

## 📚 相关文档

- [通知删除功能修复](./NOTIFICATION_DELETE_COMPLETE_FIX.md)
- [通知系统调试说明](./WAREHOUSE_ASSIGNMENT_NOTIFICATION_DEBUG.md)
