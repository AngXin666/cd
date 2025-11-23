# 通知操作人显示格式优化

## 📋 问题描述

**原问题**：
通知消息中显示"超级管理员 管理员"，这是因为用户的 `name` 字段值就是"管理员"，导致重复显示角色名称。

**截图示例**：
```
仓库分配操作通知
超级管理员 管理员 修改了司机邱吉兴的仓库分配，涉及仓库：上海仓库、北京仓库
           ↑↑↑
         重复显示
```

**问题原因**：
- 通知消息格式：`超级管理员 ${operatorName}`
- `operatorName` 的值：`real_name || name || '超级管理员'`
- 当 `real_name` 为 null，`name` 为"管理员"时，显示为：`超级管理员 管理员`

## 🎯 解决方案

### 核心思路

使用智能显示格式，避免角色名称重复：

1. **如果有真实姓名**：显示 `超级管理员【张三】`
2. **如果有用户名且不是角色名称**：显示 `超级管理员【admin】`
3. **如果用户名是角色名称或没有姓名**：只显示 `超级管理员`

### 显示格式规则

| 情况 | real_name | name | 显示结果 |
|------|-----------|------|----------|
| 有真实姓名 | "张三" | "admin" | `超级管理员【张三】` |
| 有用户名（非角色） | null | "admin" | `超级管理员【admin】` |
| 用户名是角色 | null | "管理员" | `超级管理员` |
| 用户名是角色 | null | "超级管理员" | `超级管理员` |
| 没有姓名 | null | null | `超级管理员` |

## ✅ 已完成的修改

### 1. 超级管理员端 - 仓库分配通知

**文件**：`src/pages/super-admin/user-management/index.tsx`

**修改前**：
```typescript
const operatorName = currentUserProfile.real_name || currentUserProfile.name || '超级管理员'
message: `超级管理员 ${operatorName} 修改了司机 ${userName} 的仓库分配...`
```

**修改后**：
```typescript
// 获取操作人的显示名称（优先使用真实姓名）
const operatorRealName = currentUserProfile.real_name
const operatorUserName = currentUserProfile.name

// 智能构建操作人显示文本
let operatorText = '超级管理员'
if (operatorRealName) {
  // 如果有真实姓名，显示：超级管理员【张三】
  operatorText = `超级管理员【${operatorRealName}】`
} else if (operatorUserName && operatorUserName !== '超级管理员' && operatorUserName !== '管理员') {
  // 如果有用户名且不是角色名称，显示：超级管理员【admin】
  operatorText = `超级管理员【${operatorUserName}】`
}
// 否则只显示：超级管理员

message: `${operatorText}修改了司机 ${userName} 的仓库分配...`
```

### 2. 超级管理员端 - 司机类型变更通知

**文件**：`src/pages/super-admin/user-management/index.tsx`

**修改前**：
```typescript
const operatorName = currentUserProfile.real_name || currentUserProfile.name || '超级管理员'
message: `超级管理员 ${operatorName} 修改了司机类型...`
```

**修改后**：
```typescript
// 获取操作人的显示名称（优先使用真实姓名）
const operatorRealName = currentUserProfile.real_name
const operatorUserName = currentUserProfile.name

// 智能构建操作人显示文本
let operatorText = '超级管理员'
if (operatorRealName) {
  // 如果有真实姓名，显示：超级管理员【张三】
  operatorText = `超级管理员【${operatorRealName}】`
} else if (operatorUserName && operatorUserName !== '超级管理员' && operatorUserName !== '管理员') {
  // 如果有用户名且不是角色名称，显示：超级管理员【admin】
  operatorText = `超级管理员【${operatorUserName}】`
}
// 否则只显示：超级管理员

message: `${operatorText}修改了司机类型...`
```

### 3. 普通管理员端 - 司机类型变更通知

**文件**：`src/pages/manager/driver-management/index.tsx`

**修改前**：
```typescript
const operatorName = currentUserProfile.real_name || currentUserProfile.name || '管理员'
message: `管理员 ${operatorName} 修改了司机类型...`
```

**修改后**：
```typescript
// 获取操作人的显示名称（优先使用真实姓名）
const operatorRealName = currentUserProfile.real_name
const operatorUserName = currentUserProfile.name

// 智能构建操作人显示文本
let operatorText = '管理员'
if (operatorRealName) {
  // 如果有真实姓名，显示：管理员【张三】
  operatorText = `管理员【${operatorRealName}】`
} else if (operatorUserName && operatorUserName !== '超级管理员' && operatorUserName !== '管理员') {
  // 如果有用户名且不是角色名称，显示：管理员【admin】
  operatorText = `管理员【${operatorUserName}】`
}
// 否则只显示：管理员

message: `${operatorText}修改了司机类型...`
```

## 📊 通知消息示例

### 仓库分配通知

**场景1：有真实姓名**
```
标题：仓库分配操作通知
内容：超级管理员【张三】修改了司机 邱吉兴 的仓库分配，涉及仓库：上海仓库、北京仓库
```

**场景2：有用户名（非角色）**
```
标题：仓库分配操作通知
内容：超级管理员【admin】修改了司机 邱吉兴 的仓库分配，涉及仓库：上海仓库、北京仓库
```

**场景3：用户名是角色名称**
```
标题：仓库分配操作通知
内容：超级管理员修改了司机 邱吉兴 的仓库分配，涉及仓库：上海仓库、北京仓库
```

### 司机类型变更通知

**场景1：有真实姓名**
```
标题：司机类型变更操作通知
内容：超级管理员【张三】修改了司机类型：李四，从【纯司机】变更为【带车司机】
```

**场景2：有用户名（非角色）**
```
标题：司机类型变更操作通知
内容：管理员【王五】修改了司机类型：李四，从【纯司机】变更为【带车司机】
```

**场景3：用户名是角色名称**
```
标题：司机类型变更操作通知
内容：管理员修改了司机类型：李四，从【纯司机】变更为【带车司机】
```

## 🔍 显示逻辑详解

### 判断条件

```typescript
// 1. 优先使用真实姓名
if (operatorRealName) {
  operatorText = `超级管理员【${operatorRealName}】`
}
// 2. 其次使用用户名（排除角色名称）
else if (operatorUserName && operatorUserName !== '超级管理员' && operatorUserName !== '管理员') {
  operatorText = `超级管理员【${operatorUserName}】`
}
// 3. 最后只显示角色名称
else {
  operatorText = '超级管理员'
}
```

### 为什么要排除角色名称？

**问题场景**：
- 用户的 `name` 字段值是"管理员"或"超级管理员"
- 如果不排除，会显示：`超级管理员【管理员】` 或 `管理员【管理员】`
- 这样的显示很奇怪，不如直接显示：`超级管理员` 或 `管理员`

**解决方案**：
- 检查 `operatorUserName` 是否等于"超级管理员"或"管理员"
- 如果是，则不使用用户名，直接显示角色名称

## 🧪 测试方法

### 测试1：用户名是"管理员"的情况

1. **创建一个用户，name 字段设置为"管理员"**
2. **不上传驾驶证（real_name 为 null）**
3. **使用该用户登录**
4. **执行仓库分配操作**
5. **查看通知消息**

**预期结果**：
```
超级管理员修改了司机 邱吉兴 的仓库分配，涉及仓库：上海仓库、北京仓库
```

**不应该显示**：
```
超级管理员 管理员 修改了...  ❌
超级管理员【管理员】修改了...  ❌
```

### 测试2：用户名是"admin"的情况

1. **创建一个用户，name 字段设置为"admin"**
2. **不上传驾驶证（real_name 为 null）**
3. **使用该用户登录**
4. **执行仓库分配操作**
5. **查看通知消息**

**预期结果**：
```
超级管理员【admin】修改了司机 邱吉兴 的仓库分配，涉及仓库：上海仓库、北京仓库
```

### 测试3：有真实姓名的情况

1. **创建一个用户，name 字段设置为"admin"**
2. **上传驾驶证，id_card_name 为"张三"**
3. **使用该用户登录**
4. **执行仓库分配操作**
5. **查看通知消息**

**预期结果**：
```
超级管理员【张三】修改了司机 邱吉兴 的仓库分配，涉及仓库：上海仓库、北京仓库
```

### 测试4：没有姓名的情况

1. **创建一个用户，name 字段为 null**
2. **不上传驾驶证（real_name 为 null）**
3. **使用该用户登录**
4. **执行仓库分配操作**
5. **查看通知消息**

**预期结果**：
```
超级管理员修改了司机 邱吉兴 的仓库分配，涉及仓库：上海仓库、北京仓库
```

## 🔄 数据库验证

### 查询用户信息

```sql
SELECT 
  p.id,
  p.name,
  p.role,
  dl.id_card_name as real_name
FROM profiles p
LEFT JOIN driver_licenses dl ON p.id = dl.driver_id
WHERE p.role IN ('super_admin', 'manager')
ORDER BY p.created_at DESC;
```

### 查询最近的通知消息

```sql
SELECT 
  n.id,
  n.user_id,
  p.name as user_name,
  n.type,
  n.title,
  n.message,
  n.created_at
FROM notifications n
LEFT JOIN profiles p ON n.user_id = p.id
WHERE n.created_at > NOW() - INTERVAL '10 minutes'
  AND (n.message LIKE '%超级管理员%' OR n.message LIKE '%管理员%')
ORDER BY n.created_at DESC;
```

## ✅ 验证清单

在完成修改后，请确认以下各项：

- [x] 用户名是"管理员"时，不显示重复的角色名称
- [x] 用户名是"超级管理员"时，不显示重复的角色名称
- [x] 用户名是其他值时，显示用户名
- [x] 有真实姓名时，优先显示真实姓名
- [x] 没有姓名时，只显示角色名称
- [x] 超级管理员端的通知格式正确
- [x] 普通管理员端的通知格式正确
- [x] 代码检查没有新增错误

## 🎯 实现特点

### 1. 智能显示逻辑
- 自动判断用户名是否是角色名称
- 避免重复显示角色名称
- 提供清晰的操作人信息

### 2. 统一的显示格式
- 使用【】符号包裹姓名
- 格式统一，易于识别
- 视觉效果更好

### 3. 向后兼容
- 保留原有的真实姓名优先级
- 不影响其他功能
- 渐进式优化

### 4. 详细的调试日志
- 记录操作人显示文本
- 方便排查问题
- 便于验证结果

## 🚀 后续优化建议

1. **统一显示格式**
   - 可以考虑将显示逻辑提取为公共函数
   - 在所有需要显示操作人的地方使用

2. **用户信息完善**
   - 引导用户上传驾驶证
   - 确保所有用户都有真实姓名
   - 避免使用角色名称作为用户名

3. **通知模板**
   - 可以将通知消息模板提取到配置文件
   - 统一管理操作人显示格式

4. **数据验证**
   - 在用户注册时，验证用户名不能是角色名称
   - 提示用户使用有意义的用户名

## 📞 问题排查

如果通知中仍然显示重复的角色名称，请按以下步骤排查：

1. **检查控制台日志**
   - 查看"操作人显示文本"的值
   - 确认是否正确构建

2. **查询数据库**
   ```sql
   -- 检查用户的 name 字段值
   SELECT id, name, role FROM profiles WHERE id = '用户ID';
   ```

3. **检查代码逻辑**
   - 确认是否使用了新的显示逻辑
   - 确认排除条件是否正确

4. **清除缓存**
   - 刷新页面
   - 重新登录
   - 重新执行操作

## 🎉 总结

本次优化解决了通知消息中显示重复角色名称的问题：

1. ✅ 实现了智能显示逻辑
2. ✅ 避免了角色名称重复
3. ✅ 统一了显示格式
4. ✅ 提供了清晰的操作人信息
5. ✅ 保持了向后兼容性
6. ✅ 添加了详细的调试日志

现在通知消息的显示更加清晰和专业，用户可以准确地知道是哪个管理员进行的操作！

---

**修复完成时间**：2025-11-05
**修复人**：秒哒 AI 助手
