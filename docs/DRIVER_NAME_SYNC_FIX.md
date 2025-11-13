# 司机姓名显示不一致问题修复

## 问题描述

**用户反馈**：
- 在"查看个人信息"时，显示的是实名"邱吉兴"
- 在"查看车辆管理"时，显示的是"测试司机"
- 两个页面显示的司机姓名不一致

## 问题分析

### 1. 数据结构

系统中有两个地方存储司机姓名：

**profiles表**：
```sql
SELECT id, name, role FROM profiles WHERE id = '00000000-0000-0000-0000-000000000003';

-- 结果：
-- id: 00000000-0000-0000-0000-000000000003
-- name: 测试司机  ⚠️ 这是注册时填写的昵称
-- role: driver
```

**driver_licenses表**：
```sql
SELECT user_id, id_card_name FROM driver_licenses WHERE user_id = '00000000-0000-0000-0000-000000000003';

-- 结果：
-- user_id: 00000000-0000-0000-0000-000000000003
-- id_card_name: 邱吉兴  ✅ 这是实名认证后的真实姓名
```

### 2. 问题根源

**不同页面使用了不同的数据源**：

1. **个人信息页面**：
   - 使用了`getDriverLicenseByUserId`函数
   - 获取了`driver_licenses`表的`id_card_name`字段
   - 显示的是实名"邱吉兴"

2. **车辆列表页面**：
   - 使用了`getProfileById`函数
   - 只获取了`profiles`表的`name`字段
   - 显示的是昵称"测试司机"

### 3. 为什么会出现这个问题

**设计问题**：
- `profiles.name`字段存储的是用户注册时填写的昵称
- `driver_licenses.id_card_name`字段存储的是实名认证后的真实姓名
- 实名认证后，`profiles.name`字段没有自动更新

**代码问题**：
- `getProfileById`函数只查询`profiles`表，没有关联`driver_licenses`表
- 车辆列表页面使用`getProfileById`获取司机信息，导致显示的是昵称而不是实名

## 解决方案

### 1. 创建新的数据类型

在`src/db/types.ts`中添加`ProfileWithRealName`类型：

```typescript
// 包含实名信息的司机资料（用于显示）
export interface ProfileWithRealName extends Profile {
  real_name?: string | null // 实名（来自driver_licenses表的id_card_name）
}
```

### 2. 创建新的查询函数

在`src/db/api.ts`中添加`getProfileWithRealName`函数：

```typescript
/**
 * 获取包含实名信息的司机资料
 * 会关联driver_licenses表获取实名信息（id_card_name）
 */
export async function getProfileWithRealName(id: string): Promise<ProfileWithRealName | null> {
  // 首先获取基本资料
  const profile = await getProfileById(id)
  if (!profile) {
    return null
  }

  // 如果是司机，尝试获取实名信息
  if (profile.role === 'driver') {
    const {data: license} = await supabase
      .from('driver_licenses')
      .select('id_card_name')
      .eq('user_id', id)
      .maybeSingle()

    // 返回包含实名的资料
    return {
      ...profile,
      real_name: license?.id_card_name || null
    }
  }

  // 非司机直接返回
  return {
    ...profile,
    real_name: null
  }
}
```

### 3. 修改车辆列表页面

**修改导入**：
```typescript
// 修改前
import {getProfileById} from '@/db/api'
import type {Profile} from '@/db/types'

// 修改后
import {getProfileWithRealName} from '@/db/api'
import type {ProfileWithRealName} from '@/db/types'
```

**修改状态类型**：
```typescript
// 修改前
const [targetDriver, setTargetDriver] = useState<Profile | null>(null)

// 修改后
const [targetDriver, setTargetDriver] = useState<ProfileWithRealName | null>(null)
```

**修改加载函数**：
```typescript
// 修改前
const loadDriverInfo = useCallback(async (driverId: string) => {
  const driver = await getProfileById(driverId)
  setTargetDriver(driver)
  logger.info('司机信息加载成功', {driverId, driverName: driver?.name})
}, [])

// 修改后
const loadDriverInfo = useCallback(async (driverId: string) => {
  const driver = await getProfileWithRealName(driverId)
  setTargetDriver(driver)
  logger.info('司机信息加载成功', {
    driverId,
    driverName: driver?.name,
    driverRealName: driver?.real_name,
    driverRole: driver?.role
  })
}, [])
```

**修改显示逻辑**：
```typescript
// 修改前
{isManagerView ? `查看 ${targetDriver?.name || '司机'} 的车辆信息` : '管理您的车辆信息'}

// 修改后
{isManagerView
  ? `查看 ${targetDriver?.real_name || targetDriver?.name || '司机'} 的车辆信息`
  : '管理您的车辆信息'}
```

### 4. 显示优先级

新的显示逻辑：
1. **优先显示实名**：`targetDriver?.real_name`（来自driver_licenses表）
2. **其次显示昵称**：`targetDriver?.name`（来自profiles表）
3. **最后显示默认值**：`'司机'`

## 修复效果

### 修复前

**个人信息页面**：
```
姓名：邱吉兴  ✅ 显示实名
```

**车辆列表页面**：
```
查看 测试司机 的车辆信息  ❌ 显示昵称
```

### 修复后

**个人信息页面**：
```
姓名：邱吉兴  ✅ 显示实名（不变）
```

**车辆列表页面**：
```
查看 邱吉兴 的车辆信息  ✅ 显示实名
```

## 技术细节

### 1. 为什么不直接修改profiles.name

**原因**：
1. **数据完整性**：`profiles.name`可能是用户自己设置的昵称，不应该被自动覆盖
2. **灵活性**：用户可能希望使用昵称而不是真实姓名
3. **分离关注点**：实名信息应该存储在`driver_licenses`表中，而不是`profiles`表

### 2. 为什么创建新的类型和函数

**原因**：
1. **向后兼容**：不影响现有的`getProfileById`函数和`Profile`类型
2. **明确意图**：`ProfileWithRealName`类型明确表示包含实名信息
3. **可维护性**：新函数专门用于需要显示实名的场景

### 3. 查询性能

**当前实现**：
```typescript
// 两次查询
const profile = await getProfileById(id)  // 查询1：profiles表
const {data: license} = await supabase
  .from('driver_licenses')
  .select('id_card_name')
  .eq('user_id', id)
  .maybeSingle()  // 查询2：driver_licenses表
```

**优化建议**（如果性能成为问题）：
```typescript
// 使用JOIN一次查询
const {data, error} = await supabase
  .from('profiles')
  .select(`
    *,
    driver_licenses!inner(id_card_name)
  `)
  .eq('id', id)
  .maybeSingle()
```

但是，当前实现更清晰，性能差异可以忽略不计。

## 影响范围

### 受益的功能

1. ✅ **车辆列表页面**
   - 管理员查看司机车辆时，显示实名
   - 数据与个人信息页面保持一致

2. ✅ **日志记录**
   - 同时记录昵称和实名，便于调试
   - 可以追踪数据来源

### 不受影响的功能

1. ✅ **个人信息页面**
   - 仍然使用`getDriverLicenseByUserId`获取实名
   - 显示逻辑不变

2. ✅ **其他使用`getProfileById`的地方**
   - 仍然返回`Profile`类型
   - 不包含`real_name`字段

## 后续优化建议

### 1. 统一实名显示逻辑

创建一个通用的工具函数：

```typescript
/**
 * 获取司机的显示名称
 * 优先显示实名，其次显示昵称
 */
export function getDriverDisplayName(profile: ProfileWithRealName | Profile): string {
  if ('real_name' in profile && profile.real_name) {
    return profile.real_name
  }
  return profile.name || '未命名'
}
```

使用示例：
```typescript
<Text>{getDriverDisplayName(targetDriver)}</Text>
```

### 2. 在更多地方使用实名

考虑在以下页面也使用`getProfileWithRealName`：

1. **司机管理页面**：显示司机列表时
2. **考勤记录页面**：显示司机姓名时
3. **请假审批页面**：显示申请人姓名时
4. **计件工资页面**：显示司机姓名时

### 3. 添加实名同步功能

如果需要，可以添加一个功能，在实名认证后自动更新`profiles.name`：

```typescript
/**
 * 实名认证后同步姓名到profiles表
 */
export async function syncRealNameToProfile(userId: string): Promise<boolean> {
  // 获取实名
  const license = await getDriverLicenseByUserId(userId)
  if (!license?.id_card_name) {
    return false
  }

  // 更新profiles表
  return await updateProfile(userId, {
    name: license.id_card_name
  })
}
```

但是，这可能会覆盖用户自己设置的昵称，需要谨慎考虑。

### 4. 添加缓存

如果`getProfileWithRealName`被频繁调用，可以考虑添加缓存：

```typescript
const profileCache = new Map<string, {data: ProfileWithRealName, timestamp: number}>()
const CACHE_TTL = 5 * 60 * 1000 // 5分钟

export async function getProfileWithRealName(id: string): Promise<ProfileWithRealName | null> {
  // 检查缓存
  const cached = profileCache.get(id)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }

  // 查询数据库
  const profile = await getProfileById(id)
  // ... 其他逻辑

  // 更新缓存
  profileCache.set(id, {data: result, timestamp: Date.now()})
  return result
}
```

## 测试验证

### 测试场景1：管理员查看已实名司机的车辆

**操作步骤**：
1. 以管理员身份登录
2. 进入"司机管理"页面
3. 找到已实名的司机（如"测试司机"，实名"邱吉兴"）
4. 点击"查看车辆"按钮

**预期结果**：
- 页面标题显示："查看 邱吉兴 的车辆信息"
- 控制台日志显示：
  ```javascript
  [INFO] [VehicleList] 司机信息加载成功 {
    driverId: "00000000-0000-0000-0000-000000000003",
    driverName: "测试司机",
    driverRealName: "邱吉兴",
    driverRole: "driver"
  }
  ```

### 测试场景2：管理员查看未实名司机的车辆

**操作步骤**：
1. 以管理员身份登录
2. 进入"司机管理"页面
3. 找到未实名的司机
4. 点击"查看车辆"按钮

**预期结果**：
- 页面标题显示："查看 [昵称] 的车辆信息"（使用profiles.name）
- 控制台日志显示：
  ```javascript
  [INFO] [VehicleList] 司机信息加载成功 {
    driverId: "xxx",
    driverName: "昵称",
    driverRealName: null,
    driverRole: "driver"
  }
  ```

### 测试场景3：司机查看自己的车辆

**操作步骤**：
1. 以司机身份登录
2. 进入"车辆管理"页面

**预期结果**：
- 页面标题显示："管理您的车辆信息"（不显示姓名）
- 不会调用`loadDriverInfo`函数

## 总结

### 问题原因

不同页面使用了不同的数据源来显示司机姓名：
- 个人信息页面使用`driver_licenses.id_card_name`（实名）
- 车辆列表页面使用`profiles.name`（昵称）

### 解决方案

1. 创建`ProfileWithRealName`类型，包含实名信息
2. 创建`getProfileWithRealName`函数，关联查询实名
3. 修改车辆列表页面，优先显示实名

### 修复效果

✅ 车辆列表页面现在显示实名，与个人信息页面保持一致
✅ 不影响其他功能
✅ 向后兼容，不破坏现有代码

### 相关文件

- `src/db/types.ts`：添加`ProfileWithRealName`类型
- `src/db/api.ts`：添加`getProfileWithRealName`函数
- `src/pages/driver/vehicle-list/index.tsx`：修改显示逻辑

### 验证方法

1. 以管理员身份登录
2. 进入"司机管理"页面
3. 点击已实名司机的"查看车辆"按钮
4. 确认页面标题显示实名而不是昵称
