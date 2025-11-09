# 系统问题修复说明

## 修复日期
2025-11-05

## 修复的问题

### 问题1：用户信息修改通知优化

#### 问题描述
1. 当超级管理员修改用户信息后，通知消息中没有明确显示是"超级管理员"执行的操作
2. 司机端无法接收到相关通知

#### 根本原因
1. 通知消息中使用了操作者的具体姓名，没有根据角色区分显示
2. `createNotification` 函数返回类型为 `boolean`，无法追踪通知创建结果
3. 缺少详细的日志输出，难以排查通知发送失败的原因

#### 修复方案

##### 1. 优化通知消息显示
**文件**: `src/utils/notificationHelper.ts`

```typescript
// 根据操作者角色确定显示名称
const operatorRoleName = operator.role === 'super_admin' ? '超级管理员' : '管理员'
const operatorDisplayName = operator.role === 'super_admin' 
  ? '超级管理员' 
  : `管理员 ${operator.name || operator.phone}`

// 通知司机时使用角色名称
content: `${operatorDisplayName}修改了您的个人信息（${fieldsText}）`
```

##### 2. 修改API函数返回类型
**文件**: `src/db/api.ts`

修改前：
```typescript
export async function createNotification(input: NotificationInput): Promise<boolean>
```

修改后：
```typescript
export async function createNotification(input: NotificationInput): Promise<Notification | null>
```

同时修改 `createNotifications` 函数：
```typescript
export async function createNotifications(inputs: NotificationInput[]): Promise<Notification[]>
```

##### 3. 添加详细日志
在关键位置添加日志输出：

```typescript
// 在 createNotification 中
console.log('createNotification: 开始创建通知', {
  user_id: input.user_id,
  type: input.type,
  title: input.title
})

console.log('createNotification: 通知创建成功', {
  notificationId: data?.id,
  user_id: input.user_id
})

// 在 notifyDriverInfoUpdate 中
console.log('notifyDriverInfoUpdate: 准备发送通知', {
  driverId,
  operatorId,
  operatorRole: operator.role,
  operatorDisplayName,
  modifiedFields
})

console.log('notifyDriverInfoUpdate: 司机通知创建结果', {
  success: !!driverNotification,
  notificationId: driverNotification?.id
})
```

#### 修复效果
1. ✅ 超级管理员操作时，通知消息显示"超级管理员"
2. ✅ 普通管理员操作时，通知消息显示"管理员 [姓名]"
3. ✅ 可以追踪每条通知的创建结果
4. ✅ 详细的日志帮助快速定位问题

---

### 问题2：司机打卡考勤规则匹配修复

#### 问题描述
司机在打卡时系统提示"找不到规则"，即使仓库已经配置了有效的考勤规则

#### 根本原因
1. 当查询不到考勤规则时，直接抛出异常，导致用户看到的错误信息不友好
2. 缺少详细的日志输出，难以排查规则匹配失败的原因
3. 没有明确告知用户是哪个仓库缺少规则配置

#### 修复方案

##### 1. 添加详细日志
**文件**: `src/db/api.ts`

```typescript
export async function getAttendanceRuleByWarehouseId(warehouseId: string): Promise<AttendanceRule | null> {
  console.log('getAttendanceRuleByWarehouseId: 开始查询考勤规则', {warehouseId})

  const {data, error} = await supabase
    .from('attendance_rules')
    .select('*')
    .eq('warehouse_id', warehouseId)
    .eq('is_active', true)
    .maybeSingle()

  if (error) {
    console.error('getAttendanceRuleByWarehouseId: 获取考勤规则失败', {
      warehouseId,
      error
    })
    return null
  }

  console.log('getAttendanceRuleByWarehouseId: 查询结果', {
    warehouseId,
    found: !!data,
    ruleId: data?.id
  })

  return data
}
```

##### 2. 优化错误提示
**文件**: `src/pages/driver/clock-in/index.tsx`

修改前：
```typescript
const rule = await getAttendanceRuleByWarehouseId(selectedWarehouse.id)
if (!rule) {
  throw new Error('未找到考勤规则')
}
```

修改后：
```typescript
console.log('handleClockIn: 开始获取考勤规则', {
  warehouseId: selectedWarehouse.id,
  warehouseName: selectedWarehouse.name
})

const rule = await getAttendanceRuleByWarehouseId(selectedWarehouse.id)

console.log('handleClockIn: 考勤规则查询结果', {
  warehouseId: selectedWarehouse.id,
  warehouseName: selectedWarehouse.name,
  ruleFound: !!rule,
  ruleId: rule?.id
})

if (!rule) {
  Taro.hideLoading()
  showModal({
    title: '无法打卡',
    content: `仓库"${selectedWarehouse.name}"暂未配置考勤规则，请联系管理员为该仓库设置考勤规则后再进行打卡。`,
    showCancel: false
  })
  return
}
```

##### 3. 同时修复下班打卡
在 `handleClockOut` 函数中应用相同的修复逻辑

#### 修复效果
1. ✅ 友好的错误提示，明确告知用户哪个仓库缺少规则
2. ✅ 详细的日志输出，便于管理员排查问题
3. ✅ 不再抛出异常，而是显示友好的弹窗
4. ✅ 同时修复了上班打卡和下班打卡的规则检查

---

## 测试建议

### 测试场景1：超级管理员修改司机信息
1. 使用超级管理员账号登录
2. 进入用户管理，编辑某个司机的信息
3. 修改姓名、手机号等字段
4. 保存后，使用该司机账号登录
5. 查看信息中心，确认收到通知
6. 验证通知消息中显示"超级管理员"

### 测试场景2：普通管理员修改司机信息
1. 使用普通管理员账号登录
2. 编辑某个司机的信息
3. 保存后，使用该司机账号登录
4. 查看信息中心，确认收到通知
5. 验证通知消息中显示"管理员 [姓名]"

### 测试场景3：仓库有考勤规则的打卡
1. 确保某个仓库已配置考勤规则
2. 使用司机账号登录
3. 选择该仓库进行打卡
4. 验证打卡成功

### 测试场景4：仓库无考勤规则的打卡
1. 确保某个仓库未配置考勤规则
2. 使用司机账号登录
3. 选择该仓库进行打卡
4. 验证显示友好的错误提示
5. 确认错误提示中包含仓库名称

---

## 日志查看方法

### 浏览器环境（H5）
1. 打开浏览器开发者工具（F12）
2. 切换到 Console 标签
3. 查看日志输出

### 微信小程序环境
1. 打开微信开发者工具
2. 切换到 Console 标签
3. 查看日志输出

### 关键日志标识
- `createNotification:` - 通知创建相关日志
- `notifyDriverInfoUpdate:` - 司机信息修改通知日志
- `getAttendanceRuleByWarehouseId:` - 考勤规则查询日志
- `handleClockIn:` - 上班打卡日志
- `handleClockOut:` - 下班打卡日志

---

## 相关文件

### 修改的文件
1. `src/utils/notificationHelper.ts` - 通知辅助函数
2. `src/db/api.ts` - 数据库API函数
3. `src/pages/driver/clock-in/index.tsx` - 司机打卡页面

### 相关文档
1. `docs/notification-system-usage.md` - 通知系统使用指南
2. `docs/notification-quick-reference.md` - 通知系统快速参考
3. `NOTIFICATION_SYSTEM_COMPLETE.md` - 通知系统完成报告

---

## 总结

本次修复解决了两个关键问题：

1. **通知系统优化**：确保超级管理员的操作能够正确显示角色名称，并通过详细的日志输出帮助排查通知发送问题
2. **考勤规则匹配**：提供友好的错误提示，明确告知用户问题所在，并通过日志帮助管理员快速定位配置问题

这些修复不仅解决了当前的问题，还为未来的问题排查提供了有力的工具支持。
