# 统一热更新系统 - 开发者指南

## 📋 目录

- [系统架构](#系统架构)
- [核心组件](#核心组件)
- [开发指南](#开发指南)
- [调试技巧](#调试技巧)
- [常见问题](#常见问题)

---

## 系统架构

### 整体架构

```
┌─────────────────────────────────────────────────────────┐
│                      App.tsx                            │
│                    (应用入口)                            │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              UnifiedUpdateService                       │
│              (统一更新服务)                              │
│  - 平台检测                                              │
│  - 策略选择                                              │
│  - 生命周期管理                                          │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
        ▼            ▼            ▼
┌──────────┐  ┌──────────┐  ┌──────────┐
│  Weapp   │  │ Android  │  │   H5     │
│ Strategy │  │ Strategy │  │ Strategy │
└────┬─────┘  └────┬─────┘  └────┬─────┘
     │             │             │
     ▼             ▼             ▼
┌──────────┐  ┌──────────┐  ┌──────────┐
│   微信    │  │Capacitor │  │   无操作  │
│UpdateMgr │  │LiveUpdate│  │          │
└──────────┘  └──────────┘  └──────────┘
```

### 设计模式

**策略模式 (Strategy Pattern)**

- **Context**: `UnifiedUpdateService`
- **Strategy Interface**: `IUpdateStrategy`
- **Concrete Strategies**: 
  - `WeappUpdateStrategy`
  - `AndroidUpdateStrategy`
  - `H5UpdateStrategy`

---

## 核心组件

### 1. UnifiedUpdateService

**文件位置**: `src/services/unifiedUpdateService.ts`

**职责**:
- 检测当前运行平台
- 选择并初始化对应的更新策略
- 提供统一的更新检查接口
- 处理开发模式跳过逻辑

**核心方法**:

```typescript
/**
 * 统一更新服务
 * 根据平台自动选择合适的更新策略
 */
export class UnifiedUpdateService {
  /**
   * 初始化更新服务
   * 在应用启动时调用
   */
  async initialize(): Promise<void>
  
  /**
   * 检查并应用更新
   * @param silent - 是否静默检查（不显示"已是最新版本"提示）
   */
  async checkAndApplyUpdate(silent?: boolean): Promise<void>
  
  /**
   * 获取当前平台
   */
  getCurrentPlatform(): PlatformType
}
```

**使用示例**:

```typescript
// 在 App.tsx 中使用
useEffect(() => {
  const updateService = new UnifiedUpdateService()
  
  // 初始化
  updateService.initialize()
  
  // 延迟 500ms 后静默检查更新
  setTimeout(() => {
    updateService.checkAndApplyUpdate(true)
  }, 500)
}, [])
```

### 2. IUpdateStrategy

**文件位置**: `src/services/updateStrategies/IUpdateStrategy.ts`

**职责**:
- 定义更新策略的统一接口
- 确保所有策略实现相同的方法

**接口定义**:

```typescript
/**
 * 更新策略接口
 * 各平台实现自己的更新逻辑
 */
export interface IUpdateStrategy {
  /**
   * 初始化更新策略
   */
  initialize(): Promise<void>
  
  /**
   * 检查并应用更新
   * @param silent - 是否静默检查
   */
  checkAndApplyUpdate(silent?: boolean): Promise<void>
  
  /**
   * 获取策略名称
   */
  getName(): string
}
```

### 3. WeappUpdateStrategy

**文件位置**: `src/services/updateStrategies/weappUpdateStrategy.ts`

**职责**:
- 使用微信官方 `wx.getUpdateManager()` API
- 监听更新事件
- 提示用户重启应用

**关键实现**:

```typescript
/**
 * 小程序更新策略
 * 使用微信官方的更新管理器
 */
export class WeappUpdateStrategy implements IUpdateStrategy {
  private updateManager: any
  
  async initialize(): Promise<void> {
    // 获取微信更新管理器
    this.updateManager = Taro.getUpdateManager()
    
    // 设置更新事件监听器
    this.setupUpdateListeners()
  }
  
  private setupUpdateListeners(): void {
    // 监听更新下载完成
    this.updateManager.onUpdateReady(() => {
      Taro.showModal({
        title: '更新提示',
        content: '新版本已经准备好，是否重启应用？',
        success: (res) => {
          if (res.confirm) {
            this.updateManager.applyUpdate()
          }
        }
      })
    })
    
    // 监听更新失败
    this.updateManager.onUpdateFailed(() => {
      logger.error('小程序更新失败')
    })
  }
}
```

### 4. AndroidUpdateStrategy

**文件位置**: `src/services/updateStrategies/androidUpdateStrategy.ts`

**职责**:
- 从 Supabase 获取版本信息
- 使用 Capacitor LiveUpdate 下载更新
- 显示更新对话框和进度

**关键实现**:

```typescript
/**
 * Android APP 更新策略
 * 使用 Capacitor LiveUpdate 实现 H5 代码热更新
 */
export class AndroidUpdateStrategy implements IUpdateStrategy {
  async initialize(): Promise<void> {
    // 初始化 LiveUpdate
    await initLiveUpdate()
  }
  
  async checkAndApplyUpdate(silent: boolean = true): Promise<void> {
    try {
      // 检查更新
      const result = await checkForH5Update()
      
      if (result.needsUpdate && result.versionInfo) {
        // 显示更新对话框
        const confirmed = await this.showUpdateDialog(result.versionInfo)
        
        if (confirmed) {
          // 下载并安装更新
          await applyH5Update(result.versionInfo)
        }
      } else if (!silent) {
        Taro.showToast({
          title: '已是最新版本',
          icon: 'success'
        })
      }
    } catch (error) {
      logger.error('检查更新失败', error)
    }
  }
}
```

### 5. H5UpdateStrategy

**文件位置**: `src/services/updateStrategies/h5UpdateStrategy.ts`

**职责**:
- 提供空实现
- H5 环境不需要热更新

**实现**:

```typescript
/**
 * H5 更新策略
 * H5 环境不支持热更新，提供空实现
 */
export class H5UpdateStrategy implements IUpdateStrategy {
  async initialize(): Promise<void> {
    // H5 不需要初始化
  }
  
  async checkAndApplyUpdate(silent: boolean = true): Promise<void> {
    // H5 不支持热更新，不执行任何操作
    logger.info('H5 环境不支持热更新')
  }
  
  getName(): string {
    return 'H5UpdateStrategy'
  }
}
```

---

## 开发指南

### 添加新的更新策略

如果需要支持新的平台（如 iOS），按以下步骤添加：

1. **创建策略类**

```typescript
// src/services/updateStrategies/iosUpdateStrategy.ts

/**
 * iOS 更新策略
 * 使用 Capacitor LiveUpdate 实现 H5 代码热更新
 */
export class IosUpdateStrategy implements IUpdateStrategy {
  async initialize(): Promise<void> {
    // iOS 初始化逻辑
  }
  
  async checkAndApplyUpdate(silent: boolean = true): Promise<void> {
    // iOS 更新检查逻辑
  }
  
  getName(): string {
    return 'IosUpdateStrategy'
  }
}
```

2. **更新平台检测逻辑**

```typescript
// src/services/unifiedUpdateService.ts

private selectStrategy(): IUpdateStrategy {
  const platform = getCurrentPlatform()
  
  switch (platform) {
    case PlatformType.WEAPP:
      return new WeappUpdateStrategy()
    case PlatformType.ANDROID:
      return new AndroidUpdateStrategy()
    case PlatformType.IOS:
      return new IosUpdateStrategy() // 新增
    case PlatformType.H5:
    default:
      return new H5UpdateStrategy()
  }
}
```

3. **添加平台类型**

```typescript
// src/utils/platform.ts

export enum PlatformType {
  WEAPP = 'weapp',
  ANDROID = 'android',
  IOS = 'ios', // 新增
  H5 = 'h5'
}
```

### 自定义更新 UI

如需自定义 Android 更新对话框：

1. **修改 AndroidUpdateStrategy**

```typescript
private async showUpdateDialog(versionInfo: H5VersionInfo): Promise<boolean> {
  // 使用自定义组件
  return new Promise((resolve) => {
    // 显示自定义对话框
    showCustomUpdateDialog({
      version: versionInfo.version,
      releaseNotes: versionInfo.release_notes,
      isForceUpdate: versionInfo.is_force_update,
      onConfirm: () => resolve(true),
      onCancel: () => resolve(false)
    })
  })
}
```

2. **创建自定义组件**

```typescript
// src/components/CustomUpdateDialog/index.tsx

export function CustomUpdateDialog({ 
  version, 
  releaseNotes, 
  isForceUpdate,
  onConfirm,
  onCancel 
}) {
  return (
    <View className="update-dialog">
      <Text>发现新版本 {version}</Text>
      <Text>{releaseNotes}</Text>
      <Button onClick={onConfirm}>立即更新</Button>
      {!isForceUpdate && (
        <Button onClick={onCancel}>稍后更新</Button>
      )}
    </View>
  )
}
```

### 添加更新进度显示

```typescript
// AndroidUpdateStrategy.ts

private async downloadUpdate(url: string): Promise<void> {
  // 监听下载进度
  LiveUpdate.addListener('downloadProgress', (progress) => {
    const percent = Math.round(progress.percent * 100)
    
    // 更新进度 UI
    updateProgressUI(percent)
  })
  
  // 开始下载
  await LiveUpdate.download({ url })
}
```

---

## 调试技巧

### 1. 启用详细日志

```typescript
// src/services/unifiedUpdateService.ts

// 在开发模式下启用详细日志
if (process.env.NODE_ENV === 'development') {
  logger.setLevel('debug')
}
```

### 2. 模拟更新场景

**小程序**:
```typescript
// 在微信开发者工具中
// 工具 -> 编译设置 -> 勾选"模拟更新"
```

**Android**:
```typescript
// 修改版本号进行测试
const MOCK_VERSION = '999.999.999'

async checkForH5Update() {
  // 返回模拟数据
  return {
    needsUpdate: true,
    versionInfo: {
      version: MOCK_VERSION,
      h5_url: 'mock-url',
      release_notes: '测试更新',
      is_force_update: false
    }
  }
}
```

### 3. 跳过更新检查

```typescript
// 临时禁用更新检查
const DISABLE_UPDATE_CHECK = true

if (!DISABLE_UPDATE_CHECK) {
  await updateService.checkAndApplyUpdate()
}
```

### 4. 查看更新日志

```typescript
// 在浏览器控制台或微信开发者工具控制台
// 搜索关键词：
// - "UnifiedUpdateService"
// - "WeappUpdateStrategy"
// - "AndroidUpdateStrategy"
// - "检查更新"
// - "更新失败"
```

---

## 常见问题

### Q1: 如何在开发时测试更新功能？

**A**: 
1. 设置环境变量 `NODE_ENV=production`
2. 或者临时注释掉开发模式检查：
```typescript
// if (process.env.NODE_ENV === 'development') {
//   return
// }
```

### Q2: 更新策略如何选择？

**A**: 系统根据 `Taro.getEnv()` 和 `window.Capacitor` 自动检测：
- `WEAPP` → WeappUpdateStrategy
- `WEB` + Capacitor → AndroidUpdateStrategy
- `WEB` 无 Capacitor → H5UpdateStrategy

### Q3: 如何处理更新失败？

**A**: 所有策略都实现了错误处理：
```typescript
try {
  await checkAndApplyUpdate()
} catch (error) {
  // 记录错误日志
  logger.error('更新失败', error)
  
  // 显示用户友好的错误消息
  Taro.showToast({
    title: '更新失败，请稍后重试',
    icon: 'none'
  })
  
  // 应用继续运行，不崩溃
}
```

### Q4: 如何添加更新分析？

**A**: 在关键节点添加埋点：
```typescript
// 更新检查开始
analytics.track('update_check_start', { platform })

// 发现新版本
analytics.track('update_available', { version, platform })

// 用户确认更新
analytics.track('update_confirmed', { version, platform })

// 更新成功
analytics.track('update_success', { version, platform })

// 更新失败
analytics.track('update_failed', { version, platform, error })
```

### Q5: 如何实现 A/B 测试？

**A**: 在 Android 策略中添加用户分组逻辑：
```typescript
async checkAndApplyUpdate(silent: boolean = true): Promise<void> {
  // 获取用户分组
  const userGroup = await getUserGroup()
  
  // 只对特定分组检查更新
  if (userGroup === 'beta') {
    const result = await checkForH5Update()
    // ... 更新逻辑
  }
}
```

---

## 最佳实践

### 1. 错误处理

✅ **推荐**:
```typescript
try {
  await updateService.checkAndApplyUpdate()
} catch (error) {
  logger.error('更新失败', error)
  // 应用继续运行
}
```

❌ **不推荐**:
```typescript
// 不捕获错误，可能导致应用崩溃
await updateService.checkAndApplyUpdate()
```

### 2. 日志记录

✅ **推荐**:
```typescript
logger.info('开始检查更新', { platform, version })
logger.error('更新失败', { error, platform })
```

❌ **不推荐**:
```typescript
console.log('检查更新') // 信息不完整
```

### 3. 用户体验

✅ **推荐**:
```typescript
// 静默检查，不打扰用户
await updateService.checkAndApplyUpdate(true)

// 有更新时才提示
if (hasUpdate) {
  showUpdateDialog()
}
```

❌ **不推荐**:
```typescript
// 总是显示提示，打扰用户
await updateService.checkAndApplyUpdate(false)
```

---

## 相关资源

- [设计文档](../../.kiro/specs/unified-hot-update/design.md)
- [需求文档](../../.kiro/specs/unified-hot-update/requirements.md)
- [测试指南](./QUICK_TEST_GUIDE.md)
- [平台测试指南](./PLATFORM_TESTING_GUIDE.md)

---

**最后更新**: 2025-12-14  
**维护团队**: 车队管家开发团队

