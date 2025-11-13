# 车辆列表页面调试指南

## 问题描述

管理员点击"车辆管理"按钮后，无法看到司机的车辆信息。

## 数据库状态

### 司机信息

```sql
SELECT id, name, role FROM profiles WHERE role = 'driver';
```

结果：
- 司机1：`00000000-0000-0000-0000-000000000003`，昵称：`测试司机`，实名：`邱吉兴`
- 司机2：`c3de7d3d-6bd4-4c60-ba24-54421747686e`，昵称：`发发比`

### 车辆信息

```sql
SELECT id, user_id, plate_number, vehicle_type, status FROM vehicles;
```

结果：
- 车辆1：
  - ID: `51165fd0-6c5e-4a6b-800b-10b28b2916bf`
  - 司机ID: `00000000-0000-0000-0000-000000000003`（测试司机/邱吉兴）
  - 车牌号: `粤AC83702`
  - 车辆类型: `轻型封闭式货车`
  - 状态: `active`

### RLS策略

vehicles表的SELECT策略：
1. ✅ **司机可以查看自己的车辆**：`uid() = user_id`
2. ✅ **管理员可以查看所有车辆**：`EXISTS (SELECT 1 FROM profiles WHERE id = uid() AND role = 'manager')`
3. ✅ **超级管理员可以查看所有车辆**：`is_super_admin(uid())`

## 代码流程

### 1. 司机管理页面跳转

文件：`src/pages/manager/driver-management/index.tsx`

```typescript
const handleViewDriverVehicles = (driverId: string) => {
  logger.userAction('查看司机车辆', {driverId})
  Taro.navigateTo({
    url: `/pages/driver/vehicle-list/index?driverId=${driverId}`
  })
}
```

**预期行为**：
- 点击"车辆管理"按钮
- 跳转到 `/pages/driver/vehicle-list/index?driverId=00000000-0000-0000-0000-000000000003`

### 2. 车辆列表页面接收参数

文件：`src/pages/driver/vehicle-list/index.tsx`

```typescript
// 获取URL参数中的司机ID（只在组件挂载时执行一次）
useEffect(() => {
  const params = Taro.getCurrentInstance().router?.params
  logger.info('页面参数', {params})
  if (params?.driverId) {
    const driverId = params.driverId
    setTargetDriverId(driverId)
    setIsManagerView(true)
    logger.info('管理员查看模式', {targetDriverId: driverId})
    // 加载司机信息
    loadDriverInfo(driverId)
  } else {
    logger.info('司机自己查看模式', {userId: user?.id})
    // 清空targetDriverId，确保使用当前用户ID
    setTargetDriverId('')
    setIsManagerView(false)
  }
}, [])
```

**预期行为**：
- 从URL参数中提取`driverId`
- 设置`targetDriverId`为`00000000-0000-0000-0000-000000000003`
- 设置`isManagerView`为`true`
- 调用`loadDriverInfo`加载司机信息

### 3. 加载司机信息

```typescript
const loadDriverInfo = useCallback(async (driverId: string) => {
  logger.info('loadDriverInfo被调用', {
    driverId,
    callStack: new Error().stack?.split('\n').slice(0, 5).join('\n')
  })
  try {
    const driver = await getProfileWithRealName(driverId)
    setTargetDriver(driver)
    logger.info('司机信息加载成功', {
      driverId,
      driverName: driver?.name,
      driverRealName: driver?.real_name,
      driverRole: driver?.role
    })
  } catch (error) {
    logger.error('加载司机信息失败', error)
  }
}, [])
```

**预期行为**：
- 调用`getProfileWithRealName`获取司机信息
- 设置`targetDriver`为司机资料（包含实名）
- 日志输出：
  ```javascript
  [INFO] [VehicleList] 司机信息加载成功 {
    driverId: "00000000-0000-0000-0000-000000000003",
    driverName: "测试司机",
    driverRealName: "邱吉兴",
    driverRole: "driver"
  }
  ```

### 4. 触发车辆列表加载

有两个触发点：

**触发点1：targetDriverId变化**

```typescript
useEffect(() => {
  if (targetDriverId) {
    logger.info('targetDriverId变化，重新加载车辆', {targetDriverId})
    loadVehicles()
  }
}, [targetDriverId, loadVehicles])
```

**触发点2：页面显示**

```typescript
useDidShow(() => {
  logger.info('useDidShow被调用', {targetDriverId, userId: user?.id, isManagerView})
  loadVehicles()
})
```

**预期行为**：
- 当`targetDriverId`从空字符串变为`00000000-0000-0000-0000-000000000003`时，触发`loadVehicles`
- 当页面显示时，也会触发`loadVehicles`

### 5. 加载车辆列表

```typescript
const loadVehicles = useCallback(async () => {
  // 如果是管理员查看模式，使用targetDriverId，否则使用当前用户ID
  const driverId = targetDriverId || user?.id

  logger.info('loadVehicles被调用', {
    targetDriverId,
    userId: user?.id,
    finalDriverId: driverId,
    isManagerView
  })

  if (!driverId) {
    logger.warn('无法加载车辆：缺少司机ID', {targetDriverId, userId: user?.id})
    return
  }

  logger.info('开始加载车辆列表', {driverId, isManagerView})
  setLoading(true)
  try {
    // 调试：检查认证状态
    const authStatus = await debugAuthStatus()
    logger.info('认证状态检查', authStatus)

    const data = await getDriverVehicles(driverId)
    setVehicles(data)
    logger.info('车辆列表加载成功', {
      driverId,
      vehicleCount: data.length,
      vehicles: data.map((v) => ({id: v.id, plate: v.plate_number}))
    })
  } catch (error) {
    logger.error('加载车辆列表失败', error)
    Taro.showToast({
      title: '加载失败',
      icon: 'none'
    })
  } finally {
    setLoading(false)
  }
}, [user, targetDriverId, isManagerView])
```

**预期行为**：
- 使用`targetDriverId`（`00000000-0000-0000-0000-000000000003`）作为查询条件
- 调用`getDriverVehicles`查询车辆
- 设置`vehicles`为查询结果
- 日志输出：
  ```javascript
  [INFO] [VehicleList] loadVehicles被调用 {
    targetDriverId: "00000000-0000-0000-0000-000000000003",
    userId: "[管理员ID]",
    finalDriverId: "00000000-0000-0000-0000-000000000003",
    isManagerView: true
  }
  [INFO] [VehicleList] 开始加载车辆列表 {
    driverId: "00000000-0000-0000-0000-000000000003",
    isManagerView: true
  }
  [INFO] [VehicleList] 车辆列表加载成功 {
    driverId: "00000000-0000-0000-0000-000000000003",
    vehicleCount: 1,
    vehicles: [{id: "51165fd0-6c5e-4a6b-800b-10b28b2916bf", plate: "粤AC83702"}]
  }
  ```

### 6. 数据库查询

文件：`src/db/api.ts`

```typescript
export async function getDriverVehicles(driverId: string): Promise<Vehicle[]> {
  logger.db('查询', 'vehicles', {driverId})
  try {
    logger.info('开始查询司机车辆', {driverId})
    const {data, error} = await supabase
      .from('vehicles')
      .select('*')
      .eq('user_id', driverId)
      .order('created_at', {ascending: false})

    if (error) {
      logger.error('获取司机车辆失败', {
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        driverId
      })
      return []
    }

    logger.info('查询司机车辆成功', {
      driverId,
      count: data?.length || 0,
      vehicles: data?.map((v) => ({id: v.id, plate: v.plate_number}))
    })

    return Array.isArray(data) ? data : []
  } catch (error) {
    logger.error('查询司机车辆异常', {error, driverId})
    return []
  }
}
```

**预期行为**：
- 执行SQL查询：`SELECT * FROM vehicles WHERE user_id = '00000000-0000-0000-0000-000000000003' ORDER BY created_at DESC`
- RLS策略检查：管理员有权限查看所有车辆
- 返回1辆车的数据
- 日志输出：
  ```javascript
  [INFO] [api] 开始查询司机车辆 {
    driverId: "00000000-0000-0000-0000-000000000003"
  }
  [INFO] [api] 查询司机车辆成功 {
    driverId: "00000000-0000-0000-0000-000000000003",
    count: 1,
    vehicles: [{id: "51165fd0-6c5e-4a6b-800b-10b28b2916bf", plate: "粤AC83702"}]
  }
  ```

## 调试步骤

### 步骤1：检查页面跳转

1. 以管理员身份登录
2. 进入"司机管理"页面
3. 找到"测试司机"（邱吉兴）
4. 点击"车辆管理"按钮
5. **检查控制台日志**：
   ```javascript
   [INFO] [DriverManagement] 查看司机车辆 {
     driverId: "00000000-0000-0000-0000-000000000003"
   }
   ```

### 步骤2：检查参数接收

1. 页面跳转后，**检查控制台日志**：
   ```javascript
   [INFO] [VehicleList] 页面参数 {
     params: {driverId: "00000000-0000-0000-0000-000000000003"}
   }
   [INFO] [VehicleList] 管理员查看模式 {
     targetDriverId: "00000000-0000-0000-0000-000000000003"
   }
   ```

2. 如果没有看到这些日志，说明参数传递有问题

### 步骤3：检查司机信息加载

1. **检查控制台日志**：
   ```javascript
   [INFO] [VehicleList] loadDriverInfo被调用 {
     driverId: "00000000-0000-0000-0000-000000000003",
     callStack: "..."
   }
   [INFO] [VehicleList] 司机信息加载成功 {
     driverId: "00000000-0000-0000-0000-000000000003",
     driverName: "测试司机",
     driverRealName: "邱吉兴",
     driverRole: "driver"
   }
   ```

2. 如果看到错误日志，说明司机信息加载失败

### 步骤4：检查车辆列表加载触发

1. **检查控制台日志**：
   ```javascript
   [INFO] [VehicleList] targetDriverId变化，重新加载车辆 {
     targetDriverId: "00000000-0000-0000-0000-000000000003"
   }
   ```
   或
   ```javascript
   [INFO] [VehicleList] useDidShow被调用 {
     targetDriverId: "00000000-0000-0000-0000-000000000003",
     userId: "[管理员ID]",
     isManagerView: true
   }
   ```

2. 如果没有看到这些日志，说明`loadVehicles`没有被触发

### 步骤5：检查车辆列表加载

1. **检查控制台日志**：
   ```javascript
   [INFO] [VehicleList] loadVehicles被调用 {
     targetDriverId: "00000000-0000-0000-0000-000000000003",
     userId: "[管理员ID]",
     finalDriverId: "00000000-0000-0000-0000-000000000003",
     isManagerView: true
   }
   [INFO] [VehicleList] 开始加载车辆列表 {
     driverId: "00000000-0000-0000-0000-000000000003",
     isManagerView: true
   }
   ```

2. 如果`finalDriverId`是空的或者是管理员ID，说明`targetDriverId`没有正确设置

### 步骤6：检查数据库查询

1. **检查控制台日志**：
   ```javascript
   [INFO] [api] 开始查询司机车辆 {
     driverId: "00000000-0000-0000-0000-000000000003"
   }
   [INFO] [api] 查询司机车辆成功 {
     driverId: "00000000-0000-0000-0000-000000000003",
     count: 1,
     vehicles: [{id: "51165fd0-6c5e-4a6b-800b-10b28b2916bf", plate: "粤AC83702"}]
   }
   ```

2. 如果看到错误日志，检查错误信息：
   - **权限错误**：RLS策略问题
   - **查询错误**：SQL语法问题
   - **网络错误**：连接问题

### 步骤7：检查最终结果

1. **检查控制台日志**：
   ```javascript
   [INFO] [VehicleList] 车辆列表加载成功 {
     driverId: "00000000-0000-0000-0000-000000000003",
     vehicleCount: 1,
     vehicles: [{id: "51165fd0-6c5e-4a6b-800b-10b28b2916bf", plate: "粤AC83702"}]
   }
   ```

2. **检查页面显示**：
   - 页面标题应该显示："查看 邱吉兴 的车辆信息"
   - 车辆列表应该显示1辆车：`粤AC83702`

## 可能的问题

### 问题1：targetDriverId没有正确设置

**症状**：
- `loadVehicles`被调用，但`finalDriverId`是管理员ID而不是司机ID
- 日志显示：`targetDriverId: ""`

**原因**：
- `setState`是异步的，`targetDriverId`可能还没有更新

**解决方案**：
- ✅ 已添加`useEffect`监听`targetDriverId`变化
- 当`targetDriverId`变化时，自动触发`loadVehicles`

### 问题2：loadVehicles在targetDriverId设置前被调用

**症状**：
- `useDidShow`先于`useEffect`执行
- `loadVehicles`使用了空的`targetDriverId`

**原因**：
- React生命周期顺序问题

**解决方案**：
- ✅ 已添加`useEffect`监听`targetDriverId`变化
- 确保`targetDriverId`设置后才加载车辆

### 问题3：RLS策略权限问题

**症状**：
- 数据库查询返回空数组
- 日志显示权限错误

**原因**：
- 管理员没有权限查看司机的车辆

**解决方案**：
- ✅ 已添加"管理员可以查看所有车辆"策略
- 策略条件：`EXISTS (SELECT 1 FROM profiles WHERE id = uid() AND role = 'manager')`

### 问题4：数据库中没有车辆数据

**症状**：
- 查询成功，但返回空数组
- 日志显示：`vehicleCount: 0`

**原因**：
- 司机还没有添加车辆

**解决方案**：
- ✅ 数据库中已有1辆车（`粤AC83702`）
- 如果看不到车辆，检查`user_id`是否匹配

## 最新修改

### 修改1：修复useEffect依赖项

**文件**：`src/pages/driver/vehicle-list/index.tsx`

**修改前**：
```typescript
useEffect(() => {
  // ...
}, [loadDriverInfo, user?.id]) // 依赖项导致重复执行
```

**修改后**：
```typescript
useEffect(() => {
  // ...
}, []) // 只在组件挂载时执行一次
```

### 修改2：添加targetDriverId变化监听

**文件**：`src/pages/driver/vehicle-list/index.tsx`

**新增代码**：
```typescript
// 当targetDriverId变化时，重新加载车辆列表
useEffect(() => {
  if (targetDriverId) {
    logger.info('targetDriverId变化，重新加载车辆', {targetDriverId})
    loadVehicles()
  }
}, [targetDriverId, loadVehicles])
```

**作用**：
- 确保`targetDriverId`设置后，自动触发`loadVehicles`
- 解决`setState`异步导致的时序问题

### 修改3：添加useDidShow日志

**文件**：`src/pages/driver/vehicle-list/index.tsx`

**修改前**：
```typescript
useDidShow(() => {
  loadVehicles()
})
```

**修改后**：
```typescript
useDidShow(() => {
  logger.info('useDidShow被调用', {targetDriverId, userId: user?.id, isManagerView})
  loadVehicles()
})
```

**作用**：
- 记录页面显示时的状态
- 便于调试时序问题

## 验证清单

请按照以下清单验证功能：

- [ ] 1. 以管理员身份登录
- [ ] 2. 进入"司机管理"页面
- [ ] 3. 找到"测试司机"（邱吉兴）
- [ ] 4. 点击"车辆管理"按钮
- [ ] 5. 页面跳转到车辆列表页面
- [ ] 6. 页面标题显示："查看 邱吉兴 的车辆信息"
- [ ] 7. 车辆列表显示1辆车：`粤AC83702`
- [ ] 8. 控制台没有错误日志
- [ ] 9. 点击车辆卡片，可以查看车辆详情
- [ ] 10. 返回司机管理页面，功能正常

## 下一步

如果按照以上步骤仍然无法看到车辆信息，请提供以下信息：

1. **控制台完整日志**（从点击"车辆管理"按钮开始）
2. **页面截图**（显示空列表或错误信息）
3. **当前登录用户的角色**（manager还是super_admin）
4. **浏览器开发者工具的Network标签**（查看Supabase API请求和响应）

这些信息将帮助我们更准确地定位问题。
