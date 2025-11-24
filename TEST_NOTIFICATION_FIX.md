# 通知系统修复验证指南

## 修复内容总结

### 问题 1：RLS 权限限制
- **现象**：司机提交请假申请时报错 `new row violates row-level security policy`
- **原因**：司机无法直接为管理员创建通知记录
- **解决**：创建 SECURITY DEFINER 函数绕过 RLS 限制

### 问题 2：参数传递错误
- **现象**：数据库中没有给管理员的通知记录
- **原因**：使用 `JSON.stringify()` 导致参数格式错误
- **解决**：直接传递对象数组，让 Supabase 自动处理序列化

## 测试步骤

### 测试 1：司机提交请假申请

#### 步骤：
1. **登录司机账号**
   - 账号：13800000003
   - 密码：123456

2. **提交请假申请**
   - 进入"司机端" → "请假申请"
   - 填写请假信息：
     - 请假类型：事假
     - 开始日期：选择未来的日期
     - 结束日期：选择未来的日期
     - 请假事由：测试通知系统
   - 点击"提交申请"

3. **检查控制台日志**
   - 打开浏览器开发者工具（F12）
   - 查看 Console 标签
   - 应该看到：`✅ 请假申请提交成功，已通知 2 位管理员`
   - **不应该**看到任何 RLS 错误

#### 预期结果：
- ✅ 提交成功提示
- ✅ 控制台显示"已通知 2 位管理员"
- ✅ 没有 RLS 错误
- ✅ 没有参数解析错误

### 测试 2：管理员查看通知中心

#### 步骤：
1. **登录超级管理员账号**
   - 账号：13800000001
   - 密码：123456

2. **查看通知中心**
   - 点击右上角的铃铛图标（通知中心）
   - 查看通知列表

3. **验证通知内容**
   - 应该看到一条新的通知
   - 通知类型：📋 请假申请（橙色图标）
   - 通知标题：新的请假申请
   - 通知内容：司机 XXX 提交了事假申请，请假时间：...

#### 预期结果：
- ✅ 通知中心有新通知
- ✅ 通知类型正确（📋 请假申请）
- ✅ 通知内容完整
- ✅ 可以点击查看详情

### 测试 3：普通管理员查看通知中心

#### 步骤：
1. **登录普通管理员账号**
   - 账号：13800000002
   - 密码：123456

2. **查看通知中心**
   - 点击右上角的铃铛图标（通知中心）
   - 查看通知列表

3. **验证通知内容**
   - 应该看到与超级管理员相同的通知

#### 预期结果：
- ✅ 通知中心有新通知
- ✅ 通知内容与超级管理员看到的一致
- ✅ 两个管理员都能收到通知

### 测试 4：首页通知栏（可选）

#### 步骤：
1. **保持管理员登录状态**
2. **等待 10 秒**（轮询间隔）
3. **查看首页通知栏**
   - 应该在首页顶部看到橙色通知卡片
   - 显示"新的请假申请"

#### 预期结果：
- ✅ 首页通知栏显示新通知
- ✅ 通知卡片样式正确（橙色背景）
- ✅ 可以点击查看详情

### 测试 5：数据库验证

#### 步骤：
1. **查询数据库**
   ```sql
   SELECT 
     n.id,
     p.phone,
     p.role,
     n.type,
     n.title,
     n.message,
     n.created_at
   FROM notifications n
   LEFT JOIN profiles p ON n.user_id = p.id
   WHERE n.type = 'leave_application_submitted'
   ORDER BY n.created_at DESC
   LIMIT 5;
   ```

2. **验证结果**
   - 应该看到两条通知记录
   - 一条给超级管理员（13800000001）
   - 一条给普通管理员（13800000002）

#### 预期结果：
- ✅ 数据库中有两条通知记录
- ✅ 通知类型为 `leave_application_submitted`
- ✅ 两个管理员各有一条通知

## 常见问题排查

### 问题 1：控制台显示 RLS 错误

**错误信息**：
```
❌ [ERROR] [DatabaseAPI] 批量创建通知失败 
{code: '42501', message: 'new row violates row-level security policy'}
```

**可能原因**：
- 数据库迁移没有执行
- SECURITY DEFINER 函数没有创建

**解决方法**：
1. 检查迁移文件是否存在：
   ```bash
   ls supabase/migrations/00060_fix_notification_rls_for_cross_user.sql
   ```

2. 检查数据库函数是否存在：
   ```sql
   SELECT proname, prosecdef 
   FROM pg_proc 
   WHERE proname = 'create_notifications_batch';
   ```

3. 如果函数不存在，重新执行迁移

### 问题 2：通知中心没有通知

**可能原因**：
- 参数传递错误
- 数据库函数调用失败
- 前端代码没有更新

**排查步骤**：
1. 检查控制台日志，看是否有错误
2. 查询数据库，确认通知是否写入：
   ```sql
   SELECT COUNT(*) 
   FROM notifications 
   WHERE type = 'leave_application_submitted'
   AND created_at > NOW() - INTERVAL '1 hour';
   ```

3. 检查前端代码是否使用了正确的调用方式：
   ```typescript
   // ✅ 正确
   await supabase.rpc('create_notifications_batch', {
     notifications: notifications
   })
   
   // ❌ 错误
   await supabase.rpc('create_notifications_batch', {
     notifications: JSON.stringify(notifications)
   })
   ```

### 问题 3：只有一个管理员收到通知

**可能原因**：
- 数据库中只有一个管理员账号
- 查询管理员列表时出错

**排查步骤**：
1. 查询管理员列表：
   ```sql
   SELECT id, phone, role 
   FROM profiles 
   WHERE role IN ('manager', 'super_admin');
   ```

2. 确认有两个管理员账号：
   - 13800000001 (super_admin)
   - 13800000002 (manager)

3. 检查控制台日志，确认"已通知 X 位管理员"的数量

### 问题 4：通知类型图标不显示

**可能原因**：
- 通知类型映射缺失
- 前端代码没有处理新的通知类型

**解决方法**：
1. 检查 `src/pages/common/notifications/index.tsx`
2. 确认 `getNotificationIcon` 函数包含 `leave_application_submitted` 类型
3. 确认图标映射正确：
   ```typescript
   case 'leave_application_submitted':
     return {icon: '📋', color: 'text-orange-500', bg: 'bg-orange-50'}
   ```

## 成功标准

所有以下条件都满足，说明修复成功：

- ✅ 司机提交请假申请时没有 RLS 错误
- ✅ 控制台显示"已通知 2 位管理员"
- ✅ 数据库中有两条通知记录（给两个管理员）
- ✅ 超级管理员通知中心能看到通知
- ✅ 普通管理员通知中心能看到通知
- ✅ 通知类型图标正确显示（📋 橙色）
- ✅ 通知内容完整准确
- ✅ 可以点击通知查看详情

## 相关文件

### 修改的文件
- `supabase/migrations/00060_fix_notification_rls_for_cross_user.sql` - 数据库函数
- `src/db/api.ts` - 前端调用代码

### 参考文档
- `NOTIFICATION_RLS_FIX.md` - 详细的修复说明
- `NOTIFICATION_CENTER_FIX.md` - 通知中心修复说明

## 联系支持

如果测试失败，请提供以下信息：
1. 控制台错误日志（完整的错误信息）
2. 数据库查询结果（通知记录）
3. 测试步骤（哪一步失败了）
4. 浏览器和版本信息

---

**文档创建时间**：2025-11-05  
**最后更新**：2025-11-05  
**状态**：✅ 修复完成，等待测试验证
