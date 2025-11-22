# 请假类型枚举值修复文档

## 问题描述

用户报告创建请假申请时出现错误：
```
创建请假申请失败: {code: '22P02', details: null, hint: null, message: 'invalid input value for enum leave_type: "personal_leave"'}
```

## 问题原因

数据库中定义的 `leave_type` 枚举值与代码中使用的枚举值不匹配：

### 数据库枚举定义
```sql
CREATE TYPE leave_type AS ENUM ('sick', 'personal', 'annual', 'other');
```

### 代码中的类型定义（修复前）
```typescript
export type LeaveType = 'sick_leave' | 'personal_leave' | 'annual_leave' | 'other'
```

**不匹配点**：
- 数据库使用：`'sick'`, `'personal'`, `'annual'`
- 代码使用：`'sick_leave'`, `'personal_leave'`, `'annual_leave'`

## 解决方案

将代码中的枚举值改为与数据库完全一致。

## 修改内容

### 1. 类型定义 (src/db/types.ts)

**修改前：**
```typescript
// 请假类型
export type LeaveType = 'sick_leave' | 'personal_leave' | 'annual_leave' | 'other'
```

**修改后：**
```typescript
// 请假类型（与数据库枚举值匹配）
export type LeaveType = 'sick' | 'personal' | 'annual' | 'other'
```

### 2. 请假申请页面 (src/pages/driver/leave/apply/index.tsx)

#### 默认值修改

**修改前：**
```typescript
const [leaveType, setLeaveType] = useState<LeaveType>('personal_leave')
```

**修改后：**
```typescript
const [leaveType, setLeaveType] = useState<LeaveType>('personal')
```

#### 选项列表修改

**修改前：**
```typescript
const leaveTypes = [
  {label: '事假', value: 'personal_leave'},
  {label: '病假', value: 'sick_leave'},
  {label: '年假', value: 'annual_leave'},
  {label: '其他', value: 'other'}
]
```

**修改后：**
```typescript
const leaveTypes = [
  {label: '事假', value: 'personal'},
  {label: '病假', value: 'sick'},
  {label: '年假', value: 'annual'},
  {label: '其他', value: 'other'}
]
```

### 3. 请假列表页面 (src/pages/driver/leave/index.tsx)

**修改前：**
```typescript
const _getLeaveTypeText = (type: string) => {
  switch (type) {
    case 'sick_leave':
      return '病假'
    case 'personal_leave':
      return '事假'
    case 'annual_leave':
      return '年假'
    case 'other':
      return '其他'
    default:
      return type
  }
}
```

**修改后：**
```typescript
const _getLeaveTypeText = (type: string) => {
  switch (type) {
    case 'sick':
      return '病假'
    case 'personal':
      return '事假'
    case 'annual':
      return '年假'
    case 'other':
      return '其他'
    default:
      return type
  }
}
```

### 4. 管理员页面 (src/pages/manager/driver-leave-detail/index.tsx)

**修改内容**：与请假列表页面相同，将 `getLeaveTypeText` 函数中的枚举值从 `'sick_leave'`, `'personal_leave'`, `'annual_leave'` 改为 `'sick'`, `'personal'`, `'annual'`。

### 5. 超级管理员页面 (src/pages/super-admin/driver-leave-detail/index.tsx)

**修改内容**：与管理员页面相同，更新 `getLeaveTypeText` 函数中的枚举值。

## 修改的文件列表

1. `src/db/types.ts` - 类型定义
2. `src/pages/driver/leave/apply/index.tsx` - 请假申请页面
3. `src/pages/driver/leave/index.tsx` - 请假列表页面
4. `src/pages/manager/driver-leave-detail/index.tsx` - 管理员请假详情页面
5. `src/pages/super-admin/driver-leave-detail/index.tsx` - 超级管理员请假详情页面

## 枚举值对照表

| 中文名称 | 数据库值 | 修复前代码值 | 修复后代码值 |
|---------|---------|------------|------------|
| 病假 | `sick` | `sick_leave` | `sick` ✅ |
| 事假 | `personal` | `personal_leave` | `personal` ✅ |
| 年假 | `annual` | `annual_leave` | `annual` ✅ |
| 其他 | `other` | `other` | `other` ✅ |

## 验证结果

修改完成后，运行代码检查：
```bash
pnpm run lint
```

确认没有关于枚举值的错误。

## 测试建议

1. **创建请假申请**：
   - 测试病假申请
   - 测试事假申请
   - 测试年假申请
   - 测试其他类型申请

2. **查看请假列表**：
   - 确认请假类型正确显示为中文

3. **管理员审批**：
   - 确认管理员页面正确显示请假类型

4. **数据库验证**：
   - 检查数据库中保存的 `leave_type` 值是否正确

## 根本原因分析

这个问题的根本原因是在设计阶段，数据库枚举定义和代码类型定义没有保持一致。可能的原因：

1. **命名风格不统一**：数据库使用简短命名（`sick`），代码使用描述性命名（`sick_leave`）
2. **缺少验证机制**：没有在开发早期发现这种不一致
3. **文档不完善**：没有明确的枚举值对照文档

## 预防措施

为了避免类似问题再次发生，建议：

1. **统一命名规范**：数据库枚举值和代码类型定义使用相同的命名
2. **类型生成工具**：考虑使用工具从数据库 schema 自动生成 TypeScript 类型
3. **集成测试**：添加集成测试验证数据库操作
4. **文档维护**：维护枚举值对照表文档

## 相关问题

这是继 `type` 字段名问题之后的第二个请假申请相关问题。两个问题都是由于代码与数据库结构不一致导致的。

## 总结

此次修复统一了代码中的枚举值，使其与数据库表结构完全一致。所有涉及请假类型的代码都已更新，包括：
- 类型定义
- 默认值
- 选项列表
- 显示逻辑

修复后，请假申请功能应该能够正常工作。
