# 车辆租赁信息编辑页面 - 问题修复

## 问题描述
点击车辆租赁信息卡片上的"编辑"按钮后，页面显示"车辆不存在"。

## 问题原因
在 `vehicle-rental-edit/index.tsx` 页面中，使用了两次 `useDidShow` Hook：
1. 第一次 `useDidShow`：从路由参数中获取 `vehicleId` 并设置到 state
2. 第二次 `useDidShow`：检查 `vehicleId` state 是否存在，然后调用 `loadVehicle()`

**问题根源**：
- 两次 `useDidShow` 的执行顺序不确定
- 即使第一次 `useDidShow` 先执行，`setVehicleId(id)` 是异步的，state 不会立即更新
- 第二次 `useDidShow` 执行时，`vehicleId` state 可能还是空字符串
- 导致 `loadVehicle()` 函数因为 `if (!vehicleId) return` 而直接返回，不加载数据

## 解决方案
将两次 `useDidShow` 合并为一次，直接在获取路由参数后立即调用 `loadVehicle(id)`，不依赖 state 的更新。

### 修改前的代码
```typescript
// 加载车辆信息
const loadVehicle = useCallback(async () => {
  if (!vehicleId) return  // 依赖 state，可能为空
  
  logger.info('开始加载车辆信息', {vehicleId})
  // ... 加载逻辑
}, [vehicleId])

// 第一次 useDidShow
useDidShow(() => {
  const instance = Taro.getCurrentInstance()
  const id = instance.router?.params?.vehicleId
  if (id) {
    setVehicleId(id)  // 异步更新 state
  }
})

// 第二次 useDidShow
useDidShow(() => {
  if (vehicleId) {  // vehicleId 可能还是空字符串
    loadVehicle()
  }
})
```

### 修改后的代码
```typescript
// 加载车辆信息 - 直接接收 id 参数
const loadVehicle = useCallback(async (id: string) => {
  if (!id) return
  
  logger.info('开始加载车辆信息', {vehicleId: id})
  // ... 加载逻辑
}, [])

// 只使用一次 useDidShow
useDidShow(() => {
  const instance = Taro.getCurrentInstance()
  const id = instance.router?.params?.vehicleId
  logger.info('页面显示，获取参数', {vehicleId: id})
  if (id) {
    loadVehicle(id)  // 直接传递 id，不依赖 state
  } else {
    logger.error('未获取到车辆ID')
    Taro.showToast({
      title: '参数错误',
      icon: 'none'
    })
    setTimeout(() => {
      Taro.navigateBack()
    }, 1500)
  }
})
```

## 修改内容
1. 将 `loadVehicle` 函数改为接收 `id` 参数，而不是从 state 中读取
2. 移除 `vehicleId` state（不再需要）
3. 合并两次 `useDidShow` 为一次
4. 在 `useDidShow` 中直接调用 `loadVehicle(id)`，传递路由参数
5. 添加更详细的日志记录，方便调试
6. 添加参数错误处理，如果没有获取到 `vehicleId` 则显示错误并返回

## 技术要点
### React Hooks 的执行顺序
- 多个相同的 Hook（如多个 `useDidShow`）的执行顺序是按照它们在代码中的声明顺序
- 但是 `setState` 是异步的，不会立即更新 state
- 不能在一个 Hook 中依赖另一个 Hook 中 `setState` 的结果

### 正确的做法
- 如果需要在页面显示时执行某些操作，应该在一个 `useDidShow` 中完成
- 如果需要传递数据，应该通过函数参数传递，而不是通过 state
- 避免在 Hook 之间创建依赖关系

## 测试验证
1. ✅ 点击"编辑"按钮后，页面正常加载车辆信息
2. ✅ 表单字段正确填充车辆的租赁信息
3. ✅ 修改信息后可以正常保存
4. ✅ 保存成功后自动返回车辆管理页面
5. ✅ 代码检查通过，没有警告和错误

## 相关文件
- `/src/pages/super-admin/vehicle-rental-edit/index.tsx` - 租赁信息编辑页面
- `/src/pages/super-admin/vehicle-management/index.tsx` - 车辆管理页面（调用方）

## 经验总结
1. 避免在同一个组件中多次使用相同的生命周期 Hook
2. 不要在 Hook 之间创建依赖关系
3. 优先使用函数参数传递数据，而不是依赖 state
4. 添加详细的日志记录，方便调试和问题定位
5. 添加完善的错误处理，提升用户体验
