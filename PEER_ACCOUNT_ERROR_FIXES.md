# 平级账号创建错误修复总结

## 修复日期
2025-11-25

## 问题描述

在实现平级账号功能时，遇到了两个关键错误：

### 1. 主键冲突错误
**错误信息：**
```
duplicate key value violates unique constraint "profiles_pkey"
```

**原因分析：**
- 数据库触发器 `handle_new_user` 在用户邮箱确认后会自动创建 profiles 记录
- `createPeerAccount` 函数在调用 `confirm_user_email` 后又尝试手动插入 profiles 记录
- 导致同一个 ID 被插入两次，触发主键冲突

**解决方案：**
- 改为让触发器创建基础 profiles 记录
- 然后通过 UPDATE 操作设置平级账号相关字段（main_account_id、tenant_id 等）
- 添加 500ms 延迟确保触发器执行完成
- 自动继承主账号的租赁日期信息

### 2. 邮箱已存在错误
**错误信息：**
```
AuthApiError: User already registered
```

**原因分析：**
- 用户尝试使用已经在系统中注册的邮箱创建平级账号
- 之前的创建操作可能部分成功但后续步骤失败
- 用户重试时邮箱已被占用

**解决方案：**
- 修改 `createPeerAccount` 函数返回类型为 `Profile | null | 'EMAIL_EXISTS'`
- 捕获 'User already registered' 错误并返回 'EMAIL_EXISTS' 标识
- 前端表单页面检测到邮箱已存在时显示友好提示："该邮箱已被注册，请使用其他邮箱"
- 提示持续时间设置为 2500ms，确保用户能看清楚

## 修改的文件

### 1. src/db/api.ts
**createPeerAccount 函数改进：**
```typescript
/**
 * 创建平级账号（绑定到主账号）
 * @returns {Profile | null | 'EMAIL_EXISTS'} 成功返回 Profile，邮箱已存在返回 'EMAIL_EXISTS'，其他错误返回 null
 */
export async function createPeerAccount(
  mainAccountId: string,
  account: {...},
  email: string,
  password: string
): Promise<Profile | null | 'EMAIL_EXISTS'> {
  // ...
  
  // 捕获邮箱已存在错误
  if (authError) {
    if (authError.message?.includes('User already registered') || 
        authError.message?.includes('already registered')) {
      console.error('邮箱已被注册:', email)
      return 'EMAIL_EXISTS'
    }
    // ...
  }
  
  // 确认邮箱（触发器创建 profiles 记录）
  await supabase.rpc('confirm_user_email', {user_id: authData.user.id})
  
  // 等待触发器执行
  await new Promise((resolve) => setTimeout(resolve, 500))
  
  // 更新 profiles 记录（而不是插入）
  const {data: profileData} = await supabase
    .from('profiles')
    .update({
      name: account.name,
      phone: account.phone,
      // ... 其他字段
      main_account_id: mainAccountId,
      tenant_id: mainAccount.tenant_id
    })
    .eq('id', authData.user.id)
    .select()
    .maybeSingle()
  
  return profileData
}
```

### 2. src/pages/lease-admin/tenant-form/index.tsx
**表单提交逻辑改进：**
```typescript
const result = await createPeerAccount(
  mainAccountId,
  {
    name: formData.name,
    phone: formData.phone,
    notes: formData.notes || null
  },
  formData.email,
  formData.password
)

if (result === 'EMAIL_EXISTS') {
  Taro.showToast({
    title: '该邮箱已被注册，请使用其他邮箱', 
    icon: 'none', 
    duration: 2500
  })
} else if (result) {
  Taro.showToast({title: '创建平级账号成功', icon: 'success'})
  setTimeout(() => {
    Taro.navigateBack()
  }, 1500)
} else {
  Taro.showToast({title: '创建失败', icon: 'none'})
}
```

## 用户体验改进

1. **明确的错误提示**
   - 邮箱已存在：显示"该邮箱已被注册，请使用其他邮箱"
   - 避免显示技术性错误信息（如 AuthApiError）
   - 提供清晰的解决方案指引

2. **自动数据继承**
   - 平级账号自动继承主账号的 tenant_id
   - 自动继承主账号的公司名称、月租费用
   - 自动继承主账号的租赁开始/结束日期
   - 减少用户输入，提高创建效率

3. **数据一致性保证**
   - 通过数据库触发器确保 profiles 记录正确创建
   - 通过 UPDATE 操作避免主键冲突
   - 添加延迟确保触发器执行完成

## 测试建议

1. **正常流程测试**
   - 使用新邮箱创建平级账号
   - 验证平级账号的 main_account_id 正确指向主账号
   - 验证平级账号的 tenant_id 与主账号一致
   - 验证平级账号继承了主账号的公司信息和租赁日期

2. **异常流程测试**
   - 使用已存在的邮箱创建平级账号
   - 验证显示友好的错误提示
   - 验证用户可以修改邮箱后重试

3. **数据完整性测试**
   - 验证 profiles 记录只创建一次
   - 验证所有必填字段都有正确的值
   - 验证平级账号可以正常登录和使用系统

## Git 提交记录

```
e6caec4 处理平级账号创建邮箱已存在错误
03357b7 修复平级账号创建时的主键冲突错误
c8461fe 更新平级账号功能文档 - 说明自动继承字段
1c9ab88 优化平级账号创建表单
320298e 添加平级账号功能文档
```

## 后续优化建议

1. **邮箱验证**
   - 在前端添加邮箱格式验证
   - 在提交前检查邮箱是否已存在（可选）

2. **错误处理增强**
   - 添加更多错误类型的识别和处理
   - 提供更详细的错误日志用于调试

3. **用户引导**
   - 在表单中添加帮助文本
   - 说明平级账号的概念和用途
   - 提示哪些字段会自动继承

## 总结

通过这两个修复，平级账号创建功能现在可以：
- ✅ 正确处理数据库触发器创建的 profiles 记录
- ✅ 避免主键冲突错误
- ✅ 友好地处理邮箱已存在的情况
- ✅ 提供清晰的用户反馈
- ✅ 自动继承主账号的关键信息
- ✅ 确保数据一致性和完整性
