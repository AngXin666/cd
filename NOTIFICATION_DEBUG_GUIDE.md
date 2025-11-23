# 通知功能调试指南

## 🎯 目的

本指南帮助您快速定位仓库分配通知功能的问题。

## 📋 问题现状

**用户反馈**：超级管理员给司机分配仓库后，消息中心没有收到通知。

## 🔧 已完成的修复

### 1. 数据库权限修复 ✅

**问题**：`driver_warehouses` 表的 RLS 策略缺少 `WITH CHECK` 子句，导致超级管理员无法插入记录。

**修复**：
- 文件：`supabase/migrations/00050_fix_driver_warehouses_insert_policy.sql`
- 内容：为超级管理员策略添加了 `WITH CHECK` 子句

**验证**：
```sql
-- 查询策略
SELECT policyname, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'driver_warehouses'
  AND policyname = 'Super admins can manage all driver warehouses';

-- 预期结果：
-- qual: is_super_admin(uid())
-- with_check: is_super_admin(uid())  ← 应该有这个
```

### 2. 代码逻辑修复 ✅

**问题**：条件判断错误，导致通知发送逻辑无法正确执行。

**修复**：
- 文件：`src/pages/super-admin/driver-warehouse-assignment/index.tsx`
- 内容：修正了嵌套条件判断，添加了详细的调试日志

### 3. 添加测试工具 ✅

**新增**：通知功能测试页面
- 路径：`/pages/super-admin/test-notification/index`
- 功能：直接测试通知创建和发送功能
- 入口：超级管理员首页 → 系统功能 → 测试通知

## 🧪 调试步骤

### 步骤1：使用测试工具验证通知功能

这是最快速的验证方法，可以排除其他因素的干扰。

1. **登录超级管理员账号**
2. **打开浏览器控制台（F12）**
3. **进入超级管理员首页**
4. **点击"测试通知"按钮**
5. **在测试页面点击"测试1：发送单条通知"**
6. **查看控制台日志**

**预期日志**：
```
🧪 [测试] 开始测试给自己发送通知
🧪 [测试] 当前用户ID: xxx
🧪 [测试] 准备发送通知: [...]
🧪 [测试] 发送结果: true
```

**结果判断**：
- ✅ 如果显示"测试成功"，说明通知功能正常
- ❌ 如果显示"测试失败"，说明通知创建有问题

### 步骤2：查看通知中心

1. **点击"查看通知中心"按钮**
2. **查看是否有测试通知**

**预期结果**：
- ✅ 应该看到"测试通知"
- ✅ 通知内容包含发送时间

**如果没有看到通知**：
- 刷新页面
- 检查实时订阅是否工作
- 查询数据库验证

### 步骤3：测试仓库分配通知

如果测试工具验证通过，说明通知功能本身是正常的，问题可能在仓库分配的逻辑中。

1. **打开浏览器控制台（F12）**
2. **进入"仓库分配"页面**
3. **选择一个司机**
4. **勾选一个仓库**
5. **点击"保存分配"**
6. **查看控制台日志**

**预期日志**：
```
💾 [保存] 开始保存仓库分配
💾 [保存] 选中的司机 {...}
💾 [保存] 之前的仓库 [...]
💾 [保存] 保存结果 {success: true}
✅ [保存] 保存成功，准备发送通知
💾 [保存] 当前用户信息 {...}
💾 [保存] 调用通知发送函数
🔔 [通知系统] 开始发送仓库分配通知 {...}
📊 [通知系统] 仓库变更情况 {...}
📝 [通知系统] 准备通知司机 {...}
👤 [通知系统] 操作者是超级管理员 {...}
📦 [通知系统] 受影响的仓库 {...}
👥 [通知系统] 需要通知的管理员总数 {...}
📤 [通知系统] 准备发送通知 {...}
✅ [通知系统] 已成功发送 X 条通知
💾 [保存] 通知发送函数执行完毕
```

## 🔍 问题排查

### 问题1：测试工具显示"测试失败"

**可能原因**：
1. 数据库连接问题
2. 通知表的 RLS 策略问题
3. 通知类型枚举问题

**排查方法**：

#### 1.1 检查数据库连接
```typescript
// 在控制台执行
console.log('Supabase URL:', process.env.TARO_APP_SUPABASE_URL)
console.log('Supabase Key:', process.env.TARO_APP_SUPABASE_ANON_KEY ? '已设置' : '未设置')
```

#### 1.2 检查通知表的 INSERT 策略
```sql
SELECT policyname, cmd, with_check
FROM pg_policies 
WHERE tablename = 'notifications'
  AND cmd IN ('INSERT', 'ALL');
```

**预期结果**：应该有允许插入的策略

#### 1.3 检查通知类型枚举
```sql
SELECT enum_range(NULL::notification_type);
```

**预期结果**：应该包含 `warehouse_assigned` 和 `warehouse_unassigned`

#### 1.4 查看 Network 请求
1. 打开浏览器开发者工具
2. 切换到 Network 标签页
3. 点击测试按钮
4. 查找 Supabase 的 POST 请求
5. 查看请求参数和响应

### 问题2：测试成功但通知中心没有显示

**可能原因**：
1. 实时订阅没有工作
2. 前端缓存问题
3. 通知查询逻辑问题

**排查方法**：

#### 2.1 刷新页面
最简单的方法，刷新通知中心页面

#### 2.2 查询数据库
```sql
-- 查询最近的通知
SELECT * FROM notifications 
WHERE user_id = '你的用户ID'
ORDER BY created_at DESC
LIMIT 10;
```

如果数据库中有通知，说明是前端显示问题。

#### 2.3 检查实时订阅
查看控制台是否有实时订阅的日志：
```
[Realtime] 订阅通知更新
[Realtime] 收到新通知
```

### 问题3：仓库分配时没有日志输出

**可能原因**：
1. 保存操作失败
2. JavaScript 错误
3. 函数没有被调用

**排查方法**：

#### 3.1 检查是否有 JavaScript 错误
在控制台查看是否有红色的错误信息

#### 3.2 检查保存操作是否成功
查看是否有"保存成功"的提示

#### 3.3 检查数据库记录
```sql
-- 查询司机的仓库分配
SELECT * FROM driver_warehouses 
WHERE driver_id = '司机ID'
ORDER BY created_at DESC;
```

### 问题4：日志显示"仓库没有变更"

**原因**：选择的仓库和之前一样

**解决方法**：
1. 选择不同的仓库
2. 或者先取消所有仓库，保存后再重新分配

### 问题5：日志显示"操作者信息为空"

**原因**：`currentUserProfile` 为 null

**排查方法**：
```typescript
// 查看日志中的"当前用户信息"
💾 [保存] 当前用户信息 {currentUserProfile: null, role: undefined}
```

**解决方法**：
1. 刷新页面
2. 重新登录
3. 检查 `loadDrivers` 函数是否正确获取了当前用户信息

### 问题6：日志显示"管理员数量: 0"

**原因**：该仓库没有分配管理员

**解决方法**：
1. 进入"管理员仓库分配"页面
2. 为该仓库分配一个管理员
3. 重新测试

## 📊 数据库验证

### 查询最近的通知
```sql
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
WHERE n.created_at > NOW() - INTERVAL '10 minutes'
ORDER BY n.created_at DESC;
```

### 查询特定用户的通知
```sql
SELECT * FROM notifications 
WHERE user_id = '用户ID'
ORDER BY created_at DESC
LIMIT 10;
```

### 查询司机的仓库分配
```sql
SELECT 
  dw.*,
  w.name as warehouse_name,
  p.name as driver_name
FROM driver_warehouses dw
LEFT JOIN warehouses w ON dw.warehouse_id = w.id
LEFT JOIN profiles p ON dw.driver_id = p.id
WHERE dw.driver_id = '司机ID'
ORDER BY dw.created_at DESC;
```

### 查询仓库的管理员
```sql
SELECT 
  p.id,
  p.name,
  p.role,
  w.name as warehouse_name
FROM manager_warehouses mw
JOIN profiles p ON mw.manager_id = p.id
JOIN warehouses w ON mw.warehouse_id = w.id
WHERE w.id = '仓库ID';
```

## 📝 需要提供的信息

如果问题仍然存在，请提供以下信息：

### 1. 测试工具的结果
- 测试是否成功？
- 控制台日志截图

### 2. 仓库分配的日志
- 完整的控制台日志（从"开始保存"到"执行完毕"）
- 是否有错误信息？

### 3. 数据库查询结果
- 最近的通知记录
- 司机的仓库分配记录
- 仓库的管理员记录

### 4. 操作步骤
- 具体操作了什么？
- 选择了哪个司机？
- 选择了哪个仓库？

## 🎯 快速诊断流程图

```
开始
  ↓
使用测试工具发送通知
  ↓
测试成功？
  ├─ 是 → 通知功能正常
  │       ↓
  │     查看通知中心
  │       ↓
  │     有通知？
  │       ├─ 是 → 通知功能完全正常
  │       │       ↓
  │       │     测试仓库分配
  │       │       ↓
  │       │     查看控制台日志
  │       │       ↓
  │       │     有完整日志？
  │       │       ├─ 是 → 检查日志内容
  │       │       │       ↓
  │       │       │     是否显示"已成功发送"？
  │       │       │       ├─ 是 → 刷新通知中心
  │       │       │       └─ 否 → 查看错误信息
  │       │       └─ 否 → 检查是否有 JS 错误
  │       └─ 否 → 刷新页面或查询数据库
  └─ 否 → 通知创建有问题
          ↓
        查看控制台日志
          ↓
        检查数据库连接
          ↓
        检查 RLS 策略
          ↓
        查看 Network 请求
```

## ✅ 成功标准

通知功能正常的标准：

1. ✅ 测试工具显示"测试成功"
2. ✅ 通知中心能看到测试通知
3. ✅ 仓库分配时控制台输出完整日志
4. ✅ 日志显示"已成功发送 X 条通知"
5. ✅ 司机账号能看到"仓库分配通知"
6. ✅ 管理员账号能看到"仓库分配操作通知"
7. ✅ 数据库中有对应的通知记录

如果以上7项都满足，说明功能完全正常！🎉

## 🚨 重要提示

1. **必须打开浏览器控制台**
   - 没有控制台日志，无法排查问题
   - 按 F12 打开开发者工具
   - 切换到 Console 标签页

2. **先使用测试工具**
   - 测试工具可以快速验证通知功能
   - 排除其他因素的干扰
   - 提供清晰的成功/失败反馈

3. **保存完整的日志**
   - 截图或复制完整的控制台日志
   - 包括所有的 emoji 图标和详细信息
   - 这些信息对排查问题至关重要

4. **查询数据库验证**
   - 如果前端没有显示，查询数据库
   - 数据库是最终的真相来源
   - 可以确认通知是否真的被创建

## 📞 联系支持

如果按照本指南操作后问题仍然存在，请提供：
1. 测试工具的截图
2. 完整的控制台日志
3. 数据库查询结果
4. 详细的操作步骤

这将帮助我们快速定位和解决问题。
