# 通知系统当前状态

## 问题描述
用户反馈：**"通知系统无法把信息的状态更新，会有两条信息"**

## 最新发现（2025-12-01）

### 错误信息
```
invalid input syntax for type uuid: "anon"
```

### 问题分析
1. **错误位置**：老板审批请假申请时，查询原始通知失败
2. **错误原因**：`applicationId` 的值是字符串 `"anon"`，而不是有效的 UUID
3. **影响**：
   - 无法查询到原始通知
   - 无法更新通知状态
   - 老板会看到未更新的通知（导致"两条信息"的问题）

### 根本原因
1. **数据库中存在无效数据**：
   - `leave_applications` 表中有 `id = 'anon'` 的记录
   - 这可能是测试数据或错误数据

2. **用户认证问题**：
   - 用户可能使用了匿名会话
   - `user.id` 可能是 `'anon'`

## 已完成的修复

### 1. ✅ 添加数据验证（司机端）
**文件**：`src/pages/driver/leave/apply/index.tsx`

**修改**：
- 在创建请假申请后，验证返回的 `applicationId`
- 如果 `applicationId` 是 `'anon'` 或长度小于 10，显示错误并阻止提交
- 添加详细的日志输出

**代码**：
```typescript
// 验证返回的 applicationId 是否有效
if (applicationId && (applicationId === 'anon' || applicationId.length < 10)) {
  console.error('❌ 创建请假申请返回了无效的ID:', {
    applicationId,
    userId: user.id,
    result
  })
  showToast({
    title: '创建申请失败：无效的申请ID',
    icon: 'none',
    duration: 2000
  })
  return
}
```

### 2. ✅ 添加数据验证（老板端）
**文件**：`src/pages/super-admin/leave-approval/index.tsx`

**修改**：
- 在审批请假申请前，验证 `applicationId`
- 如果 `applicationId` 是 `'anon'` 或长度小于 10，显示错误并阻止审批
- 添加详细的日志输出

**代码**：
```typescript
// 验证 applicationId 是否为有效的 UUID
if (!applicationId || applicationId === 'anon' || applicationId.length < 10) {
  showToast({
    title: '无效的申请ID，无法审批',
    icon: 'none',
    duration: 2000
  })
  console.error('❌ 无效的申请ID:', applicationId)
  return
}
```

### 3. ✅ 创建数据清理脚本
**文件**：`CLEANUP_INVALID_DATA.sql`

**功能**：
- 检查 `leave_applications` 表中的无效记录
- 检查 `notifications` 表中的无效 `related_id`
- 提供删除无效数据的 SQL 语句
- 验证数据完整性
- 统计信息

### 4. ✅ 更新调试指南
**文件**：`NOTIFICATION_DEBUG_GUIDE.md`

**新增内容**：
- 第零步：检查和清理无效数据
- 数据清理的详细步骤
- 用户认证状态检查
- 无效数据的诊断和解决方案

### 5. ✅ 修复通知类型不匹配
**问题**：司机端使用 `leave_submitted`，老板端查询 `leave_application_submitted`

**修复**：统一使用 `leave_application_submitted`

### 6. ✅ 修复 RLS 策略
**问题**：
- 用户更新通知的策略缺少 WITH CHECK 子句
- 用户无法删除自己的通知
- 管理员无法更新其他管理员的通知

**修复**：添加完整的 RLS 策略

### 7. ✅ 添加详细调试日志
**目的**：帮助诊断"两条信息"的问题

**内容**：
- 查询原始通知前的参数日志
- 查询结果的详细信息
- 更新过程的每一步日志
- 更新成功/失败的统计

## 下一步：用户操作

### 第一步：清理无效数据（必须！）

#### 1. 检查数据库
运行以下 SQL 查询：

```sql
-- 检查是否有无效的 ID
SELECT 
  id,
  user_id,
  leave_type,
  start_date,
  end_date,
  status,
  created_at
FROM leave_applications
WHERE 
  id::text = 'anon'
  OR user_id::text = 'anon'
ORDER BY created_at DESC;
```

#### 2. 如果发现无效数据，删除它们
```sql
-- 删除 ID 为 'anon' 的请假申请
DELETE FROM leave_applications WHERE id::text = 'anon';

-- 删除 user_id 为 'anon' 的请假申请
DELETE FROM leave_applications WHERE user_id::text = 'anon';

-- 删除 related_id 为 'anon' 的通知
DELETE FROM notifications WHERE related_id::text = 'anon';
```

#### 3. 验证清理结果
```sql
-- 确认没有无效数据
SELECT COUNT(*) as invalid_count
FROM leave_applications
WHERE id::text = 'anon' OR user_id::text = 'anon';

-- 应该返回 0
```

### 第二步：检查用户认证

1. 打开浏览器控制台（F12）
2. 运行以下代码：
```javascript
const { data: { user } } = await supabase.auth.getUser()
console.log('当前用户:', user)
console.log('用户ID:', user?.id)

if (user?.id === 'anon' || !user?.id || user?.id.length < 10) {
  console.error('❌ 用户ID无效！请重新登录')
} else {
  console.log('✅ 用户ID有效')
}
```

### 第三步：测试完整流程

#### 1. 司机提交请假申请
1. 使用司机账号登录
2. 打开浏览器控制台（F12）
3. 提交一个请假申请
4. **查看控制台日志**，确认：
   - ✅ 请假申请创建成功
   - ✅ `applicationId` 是有效的 UUID
   - ✅ 通知发送成功

#### 2. 老板审批请假申请
1. 使用老板账号登录
2. 打开浏览器控制台（F12）
3. 进入请假审批页面
4. 点击"批准"或"拒绝"按钮
5. **查看控制台日志**，确认：
   - ✅ `applicationId` 验证通过
   - ✅ 查询到原始通知
   - ✅ 通知更新成功

#### 3. 检查通知中心
1. 使用老板账号查看通知中心
2. **确认是否还有两条信息**
3. 如果问题解决，应该只看到一条已更新的通知

### 如果问题仍然存在

请提供以下信息：
1. **数据库检查结果**：
   - 是否发现无效数据？
   - 是否已删除？
   
2. **用户认证检查结果**：
   - 用户ID是什么？
   - 是否有效？
   
3. **完整的控制台日志**：
   - 司机端提交时的日志
   - 老板端审批时的日志
   
4. **通知中心截图**：
   - 显示"两条信息"的截图
   - 两条信息的内容

## 相关文档

- `CLEANUP_INVALID_DATA.sql`：数据清理脚本
- `NOTIFICATION_DEBUG_GUIDE.md`：详细的调试指南
- `NOTIFICATION_FIX_SUMMARY.md`：通知系统修复总结
- `README.md`：项目文档，包含所有修复记录

---

**最后更新**：2025-12-01
**状态**：等待用户清理数据并测试
