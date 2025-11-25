# 账号创建错误处理和用户提示改进

## 概述

本次更新改进了租赁管理系统中创建老板账号和平级账号时的错误处理和用户提示，使错误信息更加准确和友好。

## 问题背景

### 原始问题

用户在创建账号时遇到 `AuthApiError: User already registered` 错误，但前端只显示通用的"该邮箱已被注册"提示，这在以下情况下会造成困惑：

1. **用户没有填写邮箱**：系统使用 `手机号@phone.local` 作为认证邮箱
2. **实际冲突是手机号**：但提示说"邮箱已被注册"
3. **用户体验差**：用户不知道应该更换邮箱还是手机号

### 系统行为

当用户创建账号时：
- 如果填写了邮箱：使用真实邮箱作为认证邮箱
- 如果没有填写邮箱：使用 `手机号@phone.local` 作为认证邮箱

因此，冲突可能来自：
- 邮箱已被注册（用户填写了邮箱）
- 手机号已被注册（用户没有填写邮箱）

## 解决方案

### 1. 后端改进

#### createTenant 函数

**修改前**：
```typescript
export async function createTenant(
  tenant: Omit<Profile, 'id' | 'created_at' | 'updated_at'>,
  email: string | null,
  password: string
): Promise<Profile | null> {
  // ...
  if (authError) {
    console.error('创建认证用户失败:', authError)
    return null  // ❌ 不区分错误类型
  }
}
```

**修改后**：
```typescript
export async function createTenant(
  tenant: Omit<Profile, 'id' | 'created_at' | 'updated_at'>,
  email: string | null,
  password: string
): Promise<Profile | null | 'EMAIL_EXISTS'> {  // ✅ 新增返回类型
  // ...
  if (authError) {
    // ✅ 检测并返回特定错误类型
    if (authError.message?.includes('User already registered') || 
        authError.message?.includes('already registered')) {
      console.error('邮箱/手机号已被注册:', authEmail)
      return 'EMAIL_EXISTS'
    }
    console.error('创建认证用户失败:', authError)
    return null
  }
}
```

**改进点**：
- 返回类型从 `Profile | null` 改为 `Profile | null | 'EMAIL_EXISTS'`
- 检测 "User already registered" 错误并返回特定标识
- 与 `createPeerAccount` 函数保持一致的错误处理逻辑

#### createPeerAccount 函数

此函数已经有正确的错误处理逻辑（第6545-6550行），本次更新确保了两个函数的一致性。

### 2. 前端改进

#### tenant-form 页面

**createTenant 错误处理**：

**修改前**：
```typescript
const result = await createTenant(...)
if (result) {
  Taro.showToast({title: '创建成功', icon: 'success'})
  // ...
} else {
  Taro.showToast({title: '创建失败', icon: 'none'})  // ❌ 不区分错误类型
}
```

**修改后**：
```typescript
const result = await createTenant(...)
if (result === 'EMAIL_EXISTS') {
  // ✅ 根据是否填写邮箱显示不同提示
  const errorMsg = formData.email
    ? '该邮箱已被注册，请使用其他邮箱'
    : '该手机号已被注册，请使用其他手机号'
  Taro.showToast({title: errorMsg, icon: 'none', duration: 2500})
} else if (result) {
  Taro.showToast({title: '创建成功', icon: 'success'})
  // ...
} else {
  Taro.showToast({title: '创建失败', icon: 'none'})
}
```

**createPeerAccount 错误处理**：

**修改前**：
```typescript
if (result === 'EMAIL_EXISTS') {
  Taro.showToast({
    title: '该邮箱已被注册，请使用其他邮箱',  // ❌ 总是提示邮箱
    icon: 'none', 
    duration: 2500
  })
}
```

**修改后**：
```typescript
if (result === 'EMAIL_EXISTS') {
  // ✅ 根据是否填写邮箱显示不同提示
  const errorMsg = formData.email
    ? '该邮箱已被注册，请使用其他邮箱'
    : '该手机号已被注册，请使用其他手机号'
  Taro.showToast({title: errorMsg, icon: 'none', duration: 2500})
}
```

### 3. 附加修复

在修复过程中，发现并修复了两个 TypeScript 类型错误：

#### insertWarehouseAssignment 调用错误

**问题**：函数签名只接受 1 个对象参数，但调用时传了 2 个参数

**修复位置**：
1. `src/pages/manager/driver-management/index.tsx` (第303行)
2. `src/pages/super-admin/user-management/index.tsx` (第373行)

**修改前**：
```typescript
await insertWarehouseAssignment(newDriver.id, warehouseId)  // ❌ 2个参数
```

**修改后**：
```typescript
await insertWarehouseAssignment({  // ✅ 1个对象参数
  driver_id: newDriver.id,
  warehouse_id: warehouseId
})
```

## 用户体验改进

### 改进前

```
场景1：用户填写了邮箱，邮箱已被注册
提示：该邮箱已被注册，请使用其他邮箱 ✅ 正确

场景2：用户没有填写邮箱，手机号已被注册
提示：该邮箱已被注册，请使用其他邮箱 ❌ 错误！应该提示手机号
```

### 改进后

```
场景1：用户填写了邮箱，邮箱已被注册
提示：该邮箱已被注册，请使用其他邮箱 ✅ 正确

场景2：用户没有填写邮箱，手机号已被注册
提示：该手机号已被注册，请使用其他手机号 ✅ 正确
```

### 提示持续时间

所有错误提示的持续时间统一设置为 **2500ms（2.5秒）**，确保用户有足够时间阅读完整的错误信息。

## 技术细节

### 错误检测逻辑

```typescript
if (authError.message?.includes('User already registered') || 
    authError.message?.includes('already registered')) {
  return 'EMAIL_EXISTS'
}
```

这个检测逻辑能够捕获 Supabase Auth 返回的用户已注册错误，包括：
- 完整消息：`"User already registered"`
- 部分消息：包含 `"already registered"` 的其他变体

### 条件判断逻辑

```typescript
const errorMsg = formData.email
  ? '该邮箱已被注册，请使用其他邮箱'
  : '该手机号已被注册，请使用其他手机号'
```

- 如果 `formData.email` 有值（truthy）：说明用户填写了邮箱，冲突来自邮箱
- 如果 `formData.email` 为空（falsy）：说明用户没有填写邮箱，冲突来自手机号

## 测试场景

### 场景1：创建老板账号 - 邮箱冲突

1. 填写表单：
   - 姓名：张三
   - 手机号：13800138000
   - 邮箱：test@example.com（已被注册）
   - 密码：123456
2. 点击"创建账号"
3. **预期结果**：显示"该邮箱已被注册，请使用其他邮箱"

### 场景2：创建老板账号 - 手机号冲突

1. 填写表单：
   - 姓名：李四
   - 手机号：13800138001（已被注册）
   - 邮箱：（不填写）
   - 密码：123456
2. 点击"创建账号"
3. **预期结果**：显示"该手机号已被注册，请使用其他手机号"

### 场景3：创建平级账号 - 邮箱冲突

1. 在主账号详情页点击"添加平级账号"
2. 填写表单：
   - 姓名：王五
   - 手机号：13800138002
   - 邮箱：admin@example.com（已被注册）
   - 密码：123456
3. 点击"创建账号"
4. **预期结果**：显示"该邮箱已被注册，请使用其他邮箱"

### 场景4：创建平级账号 - 手机号冲突

1. 在主账号详情页点击"添加平级账号"
2. 填写表单：
   - 姓名：赵六
   - 手机号：13800138003（已被注册）
   - 邮箱：（不填写）
   - 密码：123456
3. 点击"创建账号"
4. **预期结果**：显示"该手机号已被注册，请使用其他手机号"

## 相关文件

### 修改的文件

1. **src/db/api.ts**
   - `createTenant` 函数（第6414-6490行）
   - 返回类型和错误处理逻辑

2. **src/pages/lease-admin/tenant-form/index.tsx**
   - createTenant 错误处理（第117-130行）
   - createPeerAccount 错误处理（第143-148行）

3. **src/pages/manager/driver-management/index.tsx**
   - insertWarehouseAssignment 调用修复（第303-307行）

4. **src/pages/super-admin/user-management/index.tsx**
   - insertWarehouseAssignment 调用修复（第373-377行）

### 相关文档

- `FIX_DUPLICATE_KEY_ERROR.md` - 主键冲突错误修复详细说明
- `LEASE_OPTIMIZATION_SUMMARY.md` - 租赁端功能优化总结

## 提交记录

```
commit 4a3a4b7
改进账号创建错误处理和用户提示

主要改进：
1. createTenant 函数返回类型改为 Profile | null | 'EMAIL_EXISTS'
2. 检测并返回 'EMAIL_EXISTS' 当邮箱/手机号已被注册
3. 前端根据是否填写邮箱显示不同的错误提示
   - 有邮箱：'该邮箱已被注册，请使用其他邮箱'
   - 无邮箱：'该手机号已被注册，请使用其他手机号'

修复的 Bug：
1. 修复 insertWarehouseAssignment 调用参数错误
   - manager/driver-management: 改为传递对象参数
   - super-admin/user-management: 改为传递对象参数

用户体验改进：
- 更准确的错误提示，帮助用户理解问题
- 区分邮箱和手机号冲突的情况
- 提示持续时间延长到 2.5 秒，确保用户看到完整信息
```

## 总结

本次更新通过以下方式改进了用户体验：

1. ✅ **准确的错误提示**：根据实际冲突类型（邮箱或手机号）显示相应的错误信息
2. ✅ **一致的错误处理**：createTenant 和 createPeerAccount 使用相同的错误处理逻辑
3. ✅ **更长的提示时间**：2.5秒的提示持续时间确保用户能够阅读完整信息
4. ✅ **类型安全**：修复了 TypeScript 类型错误，提高代码质量
5. ✅ **清晰的指导**：用户知道应该更换邮箱还是手机号来解决问题

这些改进使得账号创建流程更加友好和可靠，减少了用户的困惑和挫败感。
