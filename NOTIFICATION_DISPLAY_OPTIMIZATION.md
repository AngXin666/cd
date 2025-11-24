# 通知内容显示优化说明

## 问题描述

### 原始问题
通知内容显示为："**司机 司机** 提交了事假申请"

- 第一个"司机"应该是**司机类型**（纯司机/带车司机）
- 第二个"司机"应该是**司机姓名**
- 但是显示重复了，不符合预期

### 期望效果
- 纯司机：显示为"**纯司机 张三** 提交了事假申请"
- 带车司机：显示为"**带车司机 李四** 提交了事假申请"

## 问题分析

### 1. 数据库结构
`profiles` 表包含以下字段：
- `name` (text) - 司机姓名
- `driver_type` (enum) - 司机类型
  - `pure` - 纯司机
  - `with_vehicle` - 带车司机

### 2. 原有实现
```typescript
// 原有的 getDriverName 函数
export async function getDriverName(userId: string): Promise<string> {
  const {data} = await supabase
    .from('profiles')
    .select('name')
    .eq('id', userId)
    .maybeSingle()
  
  return data?.name || '未知司机'
}

// 通知内容生成
const driverName = await getDriverName(user.id)
const message = `司机 ${driverName} 提交了事假申请...`
```

**问题**：
- 只获取了 `name` 字段，没有获取 `driver_type`
- 测试数据中司机的 `name` 字段值为"司机"
- 导致显示为"司机 司机"

### 3. 根本原因
1. `getDriverName` 函数设计不完整，只返回姓名
2. 通知内容模板硬编码了"司机"前缀
3. 没有利用数据库中的 `driver_type` 字段

## 解决方案

### 1. 创建新函数 `getDriverDisplayName`

```typescript
/**
 * 获取司机的显示名称（包含司机类型和姓名）
 * @param userId 用户ID
 * @returns 格式化的司机名称，例如："纯司机 张三" 或 "带车司机 李四"
 */
export async function getDriverDisplayName(userId: string): Promise<string> {
  try {
    const {data, error} = await supabase
      .from('profiles')
      .select('name, driver_type')
      .eq('id', userId)
      .maybeSingle()

    if (error || !data) {
      logger.error('获取司机信息失败', {userId, error})
      return '未知司机'
    }

    // 司机类型映射
    const driverTypeMap: Record<string, string> = {
      pure: '纯司机',
      with_vehicle: '带车司机'
    }

    const driverType = data.driver_type ? driverTypeMap[data.driver_type] || '司机' : '司机'
    const driverName = data.name || '未知'

    return `${driverType} ${driverName}`
  } catch (error) {
    logger.error('获取司机信息异常', {userId, error})
    return '未知司机'
  }
}
```

**优点**：
- 同时获取 `name` 和 `driver_type` 字段
- 将枚举值映射为中文显示
- 返回格式化的完整显示名称
- 包含完整的错误处理

### 2. 更新请假申请页面

```typescript
// src/pages/driver/leave/apply/index.tsx

// 修改前
import { getDriverName } from '@/db/api'
const driverName = await getDriverName(user.id)
const message = `司机 ${driverName} 提交了${leaveTypeLabel}申请...`

// 修改后
import { getDriverDisplayName } from '@/db/api'
const driverDisplayName = await getDriverDisplayName(user.id)
const message = `${driverDisplayName} 提交了${leaveTypeLabel}申请...`
```

**改进**：
- 使用新函数获取完整的显示名称
- 移除硬编码的"司机"前缀
- 通知内容更加清晰准确

### 3. 更新离职申请页面

```typescript
// src/pages/driver/leave/resign/index.tsx

// 修改前
import { getDriverName } from '@/db/api'
const driverName = await getDriverName(user.id)
const message = `司机 ${driverName} 提交了离职申请...`

// 修改后
import { getDriverDisplayName } from '@/db/api'
const driverDisplayName = await getDriverDisplayName(user.id)
const message = `${driverDisplayName} 提交了离职申请...`
```

### 4. 保留原有函数

```typescript
/**
 * 获取司机姓名（仅姓名，不含类型）
 * @deprecated 建议使用 getDriverDisplayName 获取完整的显示名称
 */
export async function getDriverName(userId: string): Promise<string> {
  // ... 原有实现
}
```

**原因**：
- 其他地方可能还在使用这个函数
- 标记为 `@deprecated` 提示开发者使用新函数
- 保持向后兼容性

## 实现效果

### 请假申请通知
**修改前**：
```
司机 司机 提交了事假申请，请假时间：2025-11-25 至 2025-11-25（1天），事由：测试
```

**修改后**：
```
带车司机 司机 提交了事假申请，请假时间：2025-11-25 至 2025-11-25（1天），事由：测试
```

### 离职申请通知
**修改前**：
```
司机 司机 提交了离职申请，期望离职日期：2025-12-01，离职原因：个人原因
```

**修改后**：
```
带车司机 司机 提交了离职申请，期望离职日期：2025-12-01，离职原因：个人原因
```

## 测试验证

### 测试步骤

1. **登录司机账号**
   - 账号：13800000003
   - 密码：123456

2. **提交请假申请**
   - 进入"司机端" → "请假申请"
   - 填写请假信息并提交

3. **查看管理员通知**
   - 登录管理员账号（13800000001 或 13800000002）
   - 打开通知中心
   - 查看通知内容

### 预期结果

- ✅ 通知内容显示"带车司机 司机 提交了..."
- ✅ 包含司机类型信息（纯司机/带车司机）
- ✅ 包含司机姓名
- ✅ 不再显示重复的"司机"

### 数据库验证

```sql
-- 查看司机信息
SELECT id, phone, name, driver_type
FROM profiles
WHERE role = 'driver';

-- 查看最新的通知
SELECT 
  n.type,
  n.title,
  n.message,
  p.phone,
  p.role
FROM notifications n
LEFT JOIN profiles p ON n.user_id = p.id
WHERE n.type IN ('leave_application_submitted', 'resignation_application_submitted')
ORDER BY n.created_at DESC
LIMIT 5;
```

## 扩展性考虑

### 1. 支持更多司机类型
如果将来需要添加新的司机类型，只需要：
1. 在数据库中添加新的枚举值
2. 在 `driverTypeMap` 中添加映射

```typescript
const driverTypeMap: Record<string, string> = {
  pure: '纯司机',
  with_vehicle: '带车司机',
  // 未来可以添加更多类型
  // part_time: '兼职司机',
  // contract: '合同司机'
}
```

### 2. 其他使用场景
`getDriverDisplayName` 函数可以在以下场景使用：
- 司机列表显示
- 工作记录显示
- 考勤记录显示
- 任何需要显示司机完整信息的地方

### 3. 国际化支持
如果需要支持多语言，可以将映射表提取为配置：

```typescript
// i18n/zh-CN.ts
export const driverTypeLabels = {
  pure: '纯司机',
  with_vehicle: '带车司机'
}

// i18n/en-US.ts
export const driverTypeLabels = {
  pure: 'Driver Only',
  with_vehicle: 'Driver with Vehicle'
}
```

## 相关文件

### 修改的文件
- `src/db/api.ts` - 添加 `getDriverDisplayName` 函数
- `src/pages/driver/leave/apply/index.tsx` - 使用新函数
- `src/pages/driver/leave/resign/index.tsx` - 使用新函数

### 相关文档
- `NOTIFICATION_RLS_FIX.md` - 通知系统 RLS 权限修复
- `TEST_NOTIFICATION_FIX.md` - 通知系统修复验证指南

## 提交记录

- `218d7a2` - 优化通知内容显示：显示司机类型和姓名

## 总结

### 问题根源
- 原有函数设计不完整，只获取姓名
- 通知模板硬编码了"司机"前缀
- 没有利用数据库中的司机类型信息

### 解决方案
- 创建新函数同时获取姓名和类型
- 将枚举值映射为中文显示
- 返回格式化的完整显示名称
- 更新通知内容生成逻辑

### 优化效果
- ✅ 通知内容更加清晰准确
- ✅ 包含司机类型信息
- ✅ 避免重复显示"司机"
- ✅ 提高用户体验

### 后续建议
1. 考虑在其他显示司机信息的地方使用新函数
2. 逐步替换所有使用 `getDriverName` 的地方
3. 完善司机信息显示的统一规范

---

**文档创建时间**：2025-11-05  
**最后更新**：2025-11-05  
**状态**：✅ 优化完成
