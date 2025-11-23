# 通知中心操作人显示优化

## 📋 问题描述

**原问题**：
通知中心显示操作人时，无法区分具体是哪个超级管理员或管理员进行的操作。所有通知都显示为"超级管理员"或"管理员"，没有显示具体的姓名。

**示例**：
- ❌ 旧版本：`超级管理员 修改了司机类型...`
- ✅ 新版本：`超级管理员 张三 修改了司机类型...`

## 🎯 解决方案

### 核心思路

1. **创建新函数**：`getCurrentUserWithRealName()`
   - 类似于 `getAllDriversWithRealName()`
   - 通过 JOIN `driver_licenses` 表获取真实姓名
   - 返回包含 `real_name` 字段的用户信息

2. **优先级显示**：
   - 优先显示真实姓名（`real_name`）
   - 如果没有真实姓名，显示用户名（`name`）
   - 如果都没有，显示角色名称（"超级管理员"或"管理员"）

3. **更新所有通知发送代码**：
   - 超级管理员端 - 用户管理
   - 普通管理员端 - 司机管理

## ✅ 已完成的修改

### 1. 新增函数：`getCurrentUserWithRealName`

**文件**：`src/db/api.ts`

**功能**：获取当前用户档案（包含真实姓名）

**实现代码**：
```typescript
/**
 * 获取当前用户档案（包含真实姓名）
 * 用于需要显示操作人真实姓名的场景，如通知消息
 */
export async function getCurrentUserWithRealName(): Promise<(Profile & {real_name: string | null}) | null> {
  try {
    console.log('[getCurrentUserWithRealName] 开始获取当前用户（含真实姓名）')
    const {
      data: {user},
      error: authError
    } = await supabase.auth.getUser()

    if (authError) {
      console.error('[getCurrentUserWithRealName] 获取认证用户失败:', authError)
      return null
    }

    if (!user) {
      console.warn('[getCurrentUserWithRealName] 用户未登录')
      return null
    }

    console.log('[getCurrentUserWithRealName] 当前用户ID:', user.id)

    // 查询用户档案，并 LEFT JOIN driver_licenses 表获取真实姓名
    const {data, error} = await supabase
      .from('profiles')
      .select(
        `
        *,
        driver_licenses (
          id_card_name
        )
      `
      )
      .eq('id', user.id)
      .maybeSingle()

    if (error) {
      console.error('[getCurrentUserWithRealName] 查询用户档案失败:', error)
      return null
    }

    if (!data) {
      console.warn('[getCurrentUserWithRealName] 用户档案不存在，用户ID:', user.id)
      return null
    }

    // 提取真实姓名
    const realName = (data.driver_licenses as any)?.id_card_name || null

    console.log('[getCurrentUserWithRealName] 成功获取用户档案:', {
      id: data.id,
      name: data.name,
      real_name: realName,
      role: data.role
    })

    // 返回包含真实姓名的用户信息
    return {
      ...data,
      real_name: realName
    }
  } catch (error) {
    console.error('[getCurrentUserWithRealName] 未预期的错误:', error)
    return null
  }
}
```

**关键点**：
- 使用 LEFT JOIN 查询 `driver_licenses` 表
- 提取 `id_card_name` 作为真实姓名
- 返回类型为 `Profile & {real_name: string | null}`

### 2. 超级管理员端 - 用户管理

**文件**：`src/pages/super-admin/user-management/index.tsx`

**修改内容**：

#### 2.1 添加导入
```typescript
import {
  // ... 其他导入
  getCurrentUserWithRealName,
  // ... 其他导入
} from '@/db/api'
```

#### 2.2 更新切换司机类型通知
```typescript
// 2. 超级管理员操作 → 通知该司机所属仓库的普通管理员
const currentUserProfile = await getCurrentUserWithRealName()

if (currentUserProfile && currentUserProfile.role === 'super_admin') {
  // 获取操作人的显示名称（优先使用真实姓名）
  const operatorName = currentUserProfile.real_name || currentUserProfile.name || '超级管理员'

  // ... 通知逻辑
  notifications.push({
    userId: managerId,
    type: 'driver_type_changed',
    title: '司机类型变更操作通知',
    message: `超级管理员 ${operatorName} 修改了司机类型：...`,
    relatedId: targetUser.id
  })
}
```

#### 2.3 更新仓库分配通知
```typescript
// 2. 如果是超级管理员操作 → 通知相关仓库的管理员
const currentUserProfile = await getCurrentUserWithRealName()
console.log('👤 [仓库分配] 当前用户信息:', {
  用户ID: currentUserProfile?.id,
  角色: currentUserProfile?.role,
  姓名: currentUserProfile?.name,
  真实姓名: currentUserProfile?.real_name
})

if (currentUserProfile && currentUserProfile.role === 'super_admin') {
  // 获取操作人的显示名称（优先使用真实姓名）
  const operatorName = currentUserProfile.real_name || currentUserProfile.name || '超级管理员'
  console.log('👤 [仓库分配] 操作人显示名称:', operatorName)

  // ... 通知逻辑
  notifications.push({
    userId: managerId,
    type: 'warehouse_assigned',
    title: '仓库分配操作通知',
    message: `超级管理员 ${operatorName} 修改了司机 ${userName} 的仓库分配，涉及仓库：${warehouseNames}`,
    relatedId: userId
  })
}
```

### 3. 普通管理员端 - 司机管理

**文件**：`src/pages/manager/driver-management/index.tsx`

**修改内容**：

#### 3.1 添加导入
```typescript
import {
  // ... 其他导入
  getCurrentUserWithRealName,
  // ... 其他导入
} from '@/db/api'
```

#### 3.2 更新切换司机类型通知
```typescript
// 2. 获取当前操作者信息
const currentUserProfile = await getCurrentUserWithRealName()

if (currentUserProfile) {
  if (currentUserProfile.role === 'manager') {
    // 获取操作人的显示名称（优先使用真实姓名）
    const operatorName = currentUserProfile.real_name || currentUserProfile.name || '管理员'

    // 普通管理员操作 → 通知所有超级管理员
    const superAdmins = await getAllSuperAdmins()
    for (const admin of superAdmins) {
      notifications.push({
        userId: admin.id,
        type: 'driver_type_changed',
        title: '司机类型变更操作通知',
        message: `管理员 ${operatorName} 修改了司机类型：${driver.real_name || driver.name}，从【${currentTypeText}】变更为【${newTypeText}】`,
        relatedId: driver.id
      })
    }
  }
}
```

## 🔍 显示名称优先级

在所有通知消息中，操作人的显示名称按以下优先级确定：

```typescript
const operatorName = currentUserProfile.real_name || currentUserProfile.name || '超级管理员'
```

1. **第一优先级**：`real_name`（真实姓名）
   - 来源：`driver_licenses` 表的 `id_card_name` 字段
   - 适用于：已上传驾驶证的用户

2. **第二优先级**：`name`（用户名）
   - 来源：`profiles` 表的 `name` 字段
   - 适用于：没有驾驶证但有用户名的用户

3. **第三优先级**：角色名称
   - 超级管理员：`'超级管理员'`
   - 普通管理员：`'管理员'`
   - 适用于：既没有真实姓名也没有用户名的用户

## 📊 通知消息示例

### 切换司机类型

**超级管理员操作**：
```
标题：司机类型变更操作通知
内容：超级管理员 张三 修改了司机类型：李四，从【纯司机】变更为【带车司机】
```

**普通管理员操作**：
```
标题：司机类型变更操作通知
内容：管理员 王五 修改了司机类型：李四，从【纯司机】变更为【带车司机】
```

### 仓库分配

**超级管理员操作**：
```
标题：仓库分配操作通知
内容：超级管理员 张三 修改了司机 李四 的仓库分配，涉及仓库：仓库A、仓库B
```

## 🧪 测试步骤

### 测试1：超级管理员切换司机类型

1. **登录超级管理员账号**（已上传驾驶证）
2. **打开浏览器控制台（F12）**
3. **进入"用户管理"页面**
4. **选择一个司机，点击"切换成带车司机"**
5. **查看控制台日志**

**预期日志**：
```
[getCurrentUserWithRealName] 成功获取用户档案: {
  id: "...",
  name: "admin",
  real_name: "张三",
  role: "super_admin"
}
✅ 已发送 X 条司机类型变更通知
```

**验证通知**：
1. 使用管理员账号登录
2. 进入"通知中心"
3. 应该看到：`超级管理员 张三 修改了司机类型...`

### 测试2：普通管理员切换司机类型

1. **登录普通管理员账号**（已上传驾驶证）
2. **打开浏览器控制台（F12）**
3. **进入"司机管理"页面**
4. **选择一个司机，点击"切换成带车司机"**
5. **查看控制台日志**

**预期日志**：
```
[getCurrentUserWithRealName] 成功获取用户档案: {
  id: "...",
  name: "manager1",
  real_name: "王五",
  role: "manager"
}
✅ 已发送 X 条司机类型变更通知
```

**验证通知**：
1. 使用超级管理员账号登录
2. 进入"通知中心"
3. 应该看到：`管理员 王五 修改了司机类型...`

### 测试3：超级管理员分配仓库

1. **登录超级管理员账号**（已上传驾驶证）
2. **打开浏览器控制台（F12）**
3. **进入"用户管理"页面**
4. **选择一个司机，点击"仓库分配"**
5. **勾选一个仓库，点击"保存"**
6. **查看控制台日志**

**预期日志**：
```
👤 [仓库分配] 当前用户信息: {
  用户ID: "...",
  角色: "super_admin",
  姓名: "admin",
  真实姓名: "张三"
}
👤 [仓库分配] 操作人显示名称: 张三
✅ [仓库分配] 已成功发送 X 条通知
```

**验证通知**：
1. 使用管理员账号登录
2. 进入"通知中心"
3. 应该看到：`超级管理员 张三 修改了司机 李四 的仓库分配...`

### 测试4：没有真实姓名的用户

1. **创建一个新的超级管理员账号**（不上传驾驶证）
2. **使用该账号登录**
3. **执行任何会发送通知的操作**
4. **查看通知消息**

**预期结果**：
- 如果有 `name` 字段：显示 `name`
- 如果没有 `name` 字段：显示"超级管理员"或"管理员"

## 🔄 数据库查询验证

### 查询用户的真实姓名

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
  AND n.message LIKE '%超级管理员%' OR n.message LIKE '%管理员%'
ORDER BY n.created_at DESC;
```

## ✅ 验证清单

在完成测试后，请确认以下各项：

- [ ] 超级管理员切换司机类型，通知显示真实姓名
- [ ] 普通管理员切换司机类型，通知显示真实姓名
- [ ] 超级管理员分配仓库，通知显示真实姓名
- [ ] 没有真实姓名的用户，通知显示用户名或角色名称
- [ ] 控制台日志输出完整
- [ ] 没有 JavaScript 错误
- [ ] 数据库查询能正确获取真实姓名

## 📝 注意事项

1. **真实姓名来源**
   - 真实姓名来自 `driver_licenses` 表的 `id_card_name` 字段
   - 只有上传了驾驶证的用户才有真实姓名
   - 如果用户没有上传驾驶证，将使用用户名或角色名称

2. **性能考虑**
   - `getCurrentUserWithRealName` 使用 LEFT JOIN 查询
   - 只在发送通知时调用，不影响其他功能的性能
   - 如果需要频繁调用，可以考虑缓存结果

3. **兼容性**
   - 保留了原有的 `getCurrentUserProfile` 函数
   - 只在需要显示真实姓名的场景使用新函数
   - 不影响其他使用 `getCurrentUserProfile` 的代码

4. **调试日志**
   - 新函数添加了详细的调试日志
   - 包含用户ID、用户名、真实姓名、角色等信息
   - 方便排查问题

## 🎯 实现特点

### 1. 清晰的显示名称优先级
- 优先显示真实姓名
- 其次显示用户名
- 最后显示角色名称

### 2. 详细的调试日志
- 记录用户信息获取过程
- 包含真实姓名字段
- 方便排查问题

### 3. 向后兼容
- 保留原有函数
- 不影响其他功能
- 渐进式优化

### 4. 统一的实现方式
- 超级管理员和普通管理员使用相同的逻辑
- 代码风格一致
- 易于维护

## 🚀 后续优化建议

1. **缓存优化**
   - 可以考虑缓存用户的真实姓名
   - 减少数据库查询次数

2. **批量查询**
   - 如果需要获取多个用户的真实姓名
   - 可以创建批量查询函数

3. **通知模板**
   - 可以将通知消息模板提取到配置文件
   - 统一管理操作人显示格式

4. **用户信息完善**
   - 引导用户上传驾驶证
   - 确保所有用户都有真实姓名

## 📞 问题排查

如果通知中没有显示真实姓名，请按以下步骤排查：

1. **检查控制台日志**
   - 是否成功调用 `getCurrentUserWithRealName`？
   - `real_name` 字段是否为 null？

2. **查询数据库**
   ```sql
   -- 检查用户是否有驾驶证记录
   SELECT * FROM driver_licenses WHERE driver_id = '用户ID';
   ```

3. **检查用户信息**
   - 用户是否上传了驾驶证？
   - 驾驶证中的 `id_card_name` 字段是否有值？

4. **检查代码逻辑**
   - 是否使用了 `getCurrentUserWithRealName` 而不是 `getCurrentUserProfile`？
   - 是否正确提取了 `real_name` 字段？

## 🎉 总结

本次优化完成了以下功能：

1. ✅ 创建了 `getCurrentUserWithRealName` 函数
2. ✅ 更新了超级管理员端的通知代码
3. ✅ 更新了普通管理员端的通知代码
4. ✅ 实现了清晰的显示名称优先级
5. ✅ 添加了详细的调试日志
6. ✅ 保持了向后兼容性

现在通知中心能够清晰地显示具体是哪个超级管理员或管理员进行的操作，大大提升了通知的可读性和可追溯性！🚀
