# 租户到期管理指南

## 📋 概述

当租户的租约到期后，系统会自动停用相关账号，不同角色的账号会有不同的登录限制和提示信息。

---

## 🎯 核心功能

### 1. 自动停用规则

**触发条件**：租约到期日期 < 当前日期

**停用范围**：
- ✅ **老板账号**（super_admin，主账号）：停用
- ✅ **平级账号**（super_admin，有 main_account_id）：停用
- ✅ **车队长账号**（admin）：停用
- ❌ **司机账号**（driver）：**不停用**，可以继续登录

### 2. 登录提示信息

| 角色 | 账号状态 | 提示信息 |
|------|---------|---------|
| **老板账号** | 已过期 | "您的账号已过期，请续费使用" |
| **平级账号** | 已过期 | "您的账号已过期，请联系老板续费使用" |
| **车队长** | 已过期 | "您的账号已过期，请联系老板续费使用" |
| **司机** | 正常 | 可以正常登录 |

---

## 🔧 技术实现

### 1. 数据库函数

#### 自动停用过期租户

```sql
-- 函数名称
disable_expired_tenants()

-- 功能
检查所有租户的租约到期时间，自动停用过期租户的账号

-- 使用方法
SELECT disable_expired_tenants();

-- 返回值
{
  "success": true,
  "message": "过期租户检查完成",
  "total_disabled": 5,
  "check_time": "2025-11-05 10:00:00"
}
```

**停用逻辑**：
```sql
-- 停用主账号、平级账号、车队长
UPDATE profiles
SET status = 'inactive', updated_at = NOW()
WHERE (
  -- 主账号
  (id = boss_id AND role = 'super_admin')
  OR
  -- 平级账号
  (main_account_id = boss_id AND role = 'super_admin')
  OR
  -- 车队长
  (boss_id = boss_id AND role = 'admin')
)
AND status = 'active';

-- 司机账号不受影响
```

#### 检查账号状态

```sql
-- 函数名称
check_account_status(user_id uuid)

-- 功能
检查用户账号是否可以登录，并返回相应的状态信息

-- 使用方法
SELECT check_account_status('用户UUID');

-- 返回值示例
{
  "can_login": false,
  "status": "expired",
  "message": "您的账号已过期，请续费使用",
  "role": "super_admin",
  "is_main_account": true,
  "lease_end_date": "2025-10-31"
}
```

### 2. 前端实现

#### 登录检查工具

**文件**：`src/utils/account-status-check.ts`

**主要函数**：

1. **checkAccountStatus(userId)**
   - 检查账号状态
   - 返回是否可以登录及提示信息

2. **checkLoginStatus()**
   - 登录后检查账号状态
   - 如果不能登录，显示提示并跳转到登录页

3. **checkAccountStatusOnPageShow()**
   - 在页面显示时检查账号状态
   - 确保每次页面显示时都检查

**使用示例**：

```typescript
import { checkLoginStatus, checkAccountStatusOnPageShow } from '@/utils/account-status-check'
import { useDidShow } from '@tarojs/taro'

const MyPage: React.FC = () => {
  // 页面显示时检查账号状态
  useDidShow(() => {
    checkAccountStatusOnPageShow(['driver'])  // 排除司机角色
  })

  return (
    <View>
      {/* 页面内容 */}
    </View>
  )
}
```

### 3. 租赁端管理

#### 启用租户账号

**函数**：`activateTenant(id: string)`

**功能**：
- 启用主账号
- 启用所有平级账号
- 启用所有车队长账号

**使用示例**：

```typescript
import { activateTenant } from '@/db/api'

const handleActivate = async (tenantId: string) => {
  const success = await activateTenant(tenantId)
  
  if (success) {
    console.log('租户账号已启用')
  } else {
    console.log('启用失败')
  }
}
```

#### 停用租户账号

**函数**：`suspendTenant(id: string)`

**功能**：
- 停用主账号
- 停用所有平级账号
- 停用所有车队长账号

**使用示例**：

```typescript
import { suspendTenant } from '@/db/api'

const handleSuspend = async (tenantId: string) => {
  const success = await suspendTenant(tenantId)
  
  if (success) {
    console.log('租户账号已停用')
  } else {
    console.log('停用失败')
  }
}
```

---

## 🚀 使用流程

### 场景 1：租约到期自动停用

```
1. 租约到期日期：2025-10-31
   ↓
2. 2025-11-01 执行 disable_expired_tenants()
   ↓
3. 系统检测到租约已过期
   ↓
4. 自动停用：
   - 主账号（老板）
   - 平级账号
   - 车队长
   ↓
5. 司机账号不受影响
```

### 场景 2：用户登录检查

```
1. 用户输入账号密码
   ↓
2. 登录成功，获取用户信息
   ↓
3. 调用 checkLoginStatus()
   ↓
4. 检查账号状态：
   - 司机：只检查 status
   - 其他角色：检查 status + 租约状态
   ↓
5. 如果账号已过期：
   - 显示提示信息
   - 退出登录
   - 跳转到登录页
   ↓
6. 如果账号正常：
   - 继续使用系统
```

### 场景 3：租赁端续费启用

```
1. 租赁管理员登录租赁端
   ↓
2. 查看租户列表，发现过期租户
   ↓
3. 租户续费，更新租约到期日期
   ↓
4. 调用 activateTenant(tenantId)
   ↓
5. 系统启用：
   - 主账号
   - 所有平级账号
   - 所有车队长
   ↓
6. 租户可以正常登录使用
```

---

## 📊 数据流程图

```
┌─────────────────────────────────────────────────────────────┐
│                    租约到期检查                              │
│                                                               │
│  每天执行 disable_expired_tenants()                          │
│  ↓                                                            │
│  检查所有租约的到期日期                                       │
│  ↓                                                            │
│  如果 lease_end_date < CURRENT_DATE                          │
│  ↓                                                            │
│  停用该租户的所有账号（除了司机）                             │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    用户登录检查                              │
│                                                               │
│  用户登录后调用 checkLoginStatus()                           │
│  ↓                                                            │
│  调用 check_account_status(user_id)                          │
│  ↓                                                            │
│  检查账号状态和租约状态                                       │
│  ↓                                                            │
│  返回是否可以登录及提示信息                                   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    租赁端管理                                │
│                                                               │
│  租赁管理员续费后调用 activateTenant(tenantId)               │
│  ↓                                                            │
│  启用主账号、平级账号、车队长                                 │
│  ↓                                                            │
│  租户可以正常登录使用                                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 🧪 测试场景

### 测试 1：自动停用过期租户

**步骤**：
1. 创建一个租户，租约到期日期设置为昨天
2. 执行 `SELECT disable_expired_tenants();`
3. 检查该租户的账号状态

**预期结果**：
- ✅ 主账号状态变为 `inactive`
- ✅ 平级账号状态变为 `inactive`
- ✅ 车队长状态变为 `inactive`
- ✅ 司机状态仍为 `active`

### 测试 2：老板账号登录

**步骤**：
1. 使用过期租户的老板账号登录
2. 系统调用 `checkLoginStatus()`

**预期结果**：
- ✅ 显示提示："您的账号已过期，请续费使用"
- ✅ 退出登录
- ✅ 跳转到登录页

### 测试 3：平级账号登录

**步骤**：
1. 使用过期租户的平级账号登录
2. 系统调用 `checkLoginStatus()`

**预期结果**：
- ✅ 显示提示："您的账号已过期，请联系老板续费使用"
- ✅ 退出登录
- ✅ 跳转到登录页

### 测试 4：车队长登录

**步骤**：
1. 使用过期租户的车队长账号登录
2. 系统调用 `checkLoginStatus()`

**预期结果**：
- ✅ 显示提示："您的账号已过期，请联系老板续费使用"
- ✅ 退出登录
- ✅ 跳转到登录页

### 测试 5：司机登录

**步骤**：
1. 使用过期租户的司机账号登录
2. 系统调用 `checkLoginStatus()`

**预期结果**：
- ✅ 登录成功
- ✅ 可以正常使用系统

### 测试 6：租赁端启用账号

**步骤**：
1. 租赁管理员登录租赁端
2. 更新租约到期日期（延长租约）
3. 调用 `activateTenant(tenantId)`
4. 租户尝试登录

**预期结果**：
- ✅ 主账号状态变为 `active`
- ✅ 平级账号状态变为 `active`
- ✅ 车队长状态变为 `active`
- ✅ 租户可以正常登录使用

---

## ⚠️ 注意事项

### 1. 司机账号不受影响

- 司机账号不会因为租约过期而被停用
- 司机可以继续登录系统
- 司机只受自己账号状态的影响

### 2. 定时任务

- 需要设置定时任务每天执行 `disable_expired_tenants()`
- 建议在凌晨执行，避免影响用户使用
- 可以使用 pg_cron 或外部定时任务

### 3. 租约续费

- 租赁管理员续费后，需要手动调用 `activateTenant()`
- 或者在更新租约时自动调用
- 确保租约到期日期已更新

### 4. 提示信息

- 不同角色的提示信息不同
- 老板：提示续费
- 平级账号/车队长：提示联系老板
- 司机：不受影响

---

## 📚 相关文档

- [平级账号管理指南](PEER_ACCOUNT_MANAGEMENT.md)
- [租赁系统数据库架构](LEASE_SYSTEM_DATABASE_ARCHITECTURE.md)
- [独立数据库隔离架构](../SCHEMA_ISOLATION_SUMMARY.md)

---

## 🎉 总结

通过实施租户到期管理功能，我们成功实现了：

✅ **自动停用** - 租约到期后自动停用相关账号  
✅ **差异化提示** - 不同角色显示不同的提示信息  
✅ **司机不受影响** - 司机可以继续登录使用  
✅ **租赁端管理** - 租赁管理员可以启用/停用账号  
✅ **完整的检查机制** - 登录时和页面显示时都会检查  

这是一个**完整、安全、用户友好**的租户到期管理解决方案！🎊

---

**文档日期**：2025-11-05  
**文档作者**：秒哒 AI  
**版本**：v1.0
