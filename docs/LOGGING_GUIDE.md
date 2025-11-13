# 日志系统使用指南

## 概述

本项目集成了完善的日志系统，用于记录应用运行时的各种信息，包括用户操作、数据库访问、API调用、错误信息等。日志系统支持多级别日志记录，并提供详细的上下文信息。

## 日志级别

系统支持以下四个日志级别（按严重程度递增）：

1. **DEBUG** 🔍 - 调试信息，用于开发和问题排查
2. **INFO** ℹ️ - 一般信息，记录正常的业务流程
3. **WARN** ⚠️ - 警告信息，表示潜在问题
4. **ERROR** ❌ - 错误信息，表示发生了错误

## 快速开始

### 1. 创建Logger实例

在每个模块或页面中创建专属的Logger实例：

```typescript
import {createLogger} from '@/utils/logger'

// 创建页面日志记录器
const logger = createLogger('PageName')
```

### 2. 记录日志

```typescript
// DEBUG级别 - 调试信息
logger.debug('调试信息', {someData: 'value'})

// INFO级别 - 一般信息
logger.info('操作成功', {userId: '123'})

// WARN级别 - 警告
logger.warn('数据可能不完整', {missingFields: ['name']})

// ERROR级别 - 错误
logger.error('操作失败', error)
```

## 专用日志方法

### 数据库操作日志

```typescript
// 记录数据库操作
logger.db('查询', 'users', {userId: '123'})
logger.db('插入', 'vehicles', {plate: '京A12345'})
logger.db('更新', 'profiles', {id: '123', updates: {...}})
logger.db('删除', 'records', {recordId: '456'})
```

### 用户操作日志

```typescript
// 记录用户操作
logger.userAction('点击按钮', {buttonName: '保存'})
logger.userAction('提交表单', {formData: {...}})
logger.userAction('查看详情', {itemId: '123'})
```

### 页面访问日志

```typescript
// 记录页面访问
logger.pageView('司机管理页面', {managerId: user?.id})
logger.pageView('车辆列表', {driverId: '123'})
```

### API调用日志

```typescript
// 记录API调用
logger.api('GET', '/api/users', {page: 1}, response)
logger.api('POST', '/api/vehicles', requestData, response)
```

### 性能监控日志

```typescript
// 记录性能指标
logger.performance('数据加载', 1250, 'ms')
logger.performance('图片上传', 3.5, 's')
```

## 日志配置

### 设置日志级别

```typescript
import {setLoggerConfig, LogLevel} from '@/utils/logger'

// 只显示INFO及以上级别的日志
setLoggerConfig({
  minLevel: LogLevel.INFO
})

// 生产环境建议只显示WARN和ERROR
setLoggerConfig({
  minLevel: LogLevel.WARN
})
```

### 自定义日志显示

```typescript
import {setLoggerConfig} from '@/utils/logger'

setLoggerConfig({
  enabled: true,           // 是否启用日志
  minLevel: LogLevel.DEBUG, // 最小日志级别
  showTimestamp: true,     // 是否显示时间戳
  showUserId: true,        // 是否显示用户ID
  showModule: true         // 是否显示模块名
})
```

## 实际应用示例

### 示例1：页面组件中使用日志

```typescript
import {createLogger} from '@/utils/logger'
import {useCallback, useState} from 'react'

const logger = createLogger('DriverManagement')

const DriverManagement: React.FC = () => {
  const [drivers, setDrivers] = useState([])

  const loadDrivers = useCallback(async () => {
    logger.info('开始加载司机列表')
    try {
      const data = await getAllProfiles()
      const driverList = data.filter((p) => p.role === 'driver')
      setDrivers(driverList)
      logger.info(`成功加载司机列表，共 ${driverList.length} 名司机`)
    } catch (error) {
      logger.error('加载司机列表失败', error)
    }
  }, [])

  const handleSave = async () => {
    logger.userAction('保存司机仓库分配', {
      driverId: selectedDriver.id,
      warehouseIds: selectedWarehouseIds
    })

    try {
      const success = await setDriverWarehouses(driverId, warehouseIds)
      if (success) {
        logger.info('保存成功', {driverId, warehouseCount: warehouseIds.length})
      } else {
        logger.error('保存失败', {driverId})
      }
    } catch (error) {
      logger.error('保存异常', error)
    }
  }

  return <View>...</View>
}
```

### 示例2：数据库API中使用日志

```typescript
import {createLogger} from '@/utils/logger'

const logger = createLogger('DatabaseAPI')

export async function getDriverVehicles(driverId: string): Promise<Vehicle[]> {
  logger.db('查询', 'vehicles', {driverId})
  try {
    const {data, error} = await supabase
      .from('vehicles')
      .select('*')
      .eq('user_id', driverId)

    if (error) {
      logger.error('获取司机车辆失败', error)
      return []
    }

    logger.info(`成功获取司机车辆列表，共 ${data?.length || 0} 辆`, {
      driverId,
      count: data?.length
    })
    return Array.isArray(data) ? data : []
  } catch (error) {
    logger.error('获取司机车辆异常', error)
    return []
  }
}
```

## 日志输出格式

日志会以以下格式输出到控制台：

```
🔍 [2025-11-05 10:30:45.123] [DEBUG] [DriverManagement] [User:abc12345] 开始加载司机列表
📦 数据详情: {managerId: "abc12345"}

ℹ️ [2025-11-05 10:30:45.456] [INFO] [DatabaseAPI] 成功获取司机列表，共 15 名司机
📦 数据详情: {count: 15}

❌ [2025-11-05 10:30:46.789] [ERROR] [DriverManagement] 保存失败
📦 数据详情: {
  name: "Error",
  message: "Network request failed",
  stack: "Error: Network request failed\n    at ..."
}
```

## 全局错误处理

系统已自动设置全局错误处理，会捕获未处理的Promise rejection：

```typescript
// 在 app.tsx 中已自动设置
setupGlobalErrorHandler()
```

## 用户ID追踪

系统会自动追踪当前登录用户的ID，并在日志中显示：

```typescript
// 在 app.tsx 中已自动设置
useEffect(() => {
  const {data: authListener} = supabase.auth.onAuthStateChange((event, session) => {
    const userId = session?.user?.id || null
    setCurrentUserId(userId)

    if (event === 'SIGNED_IN') {
      logger.info('用户登录', {userId})
    } else if (event === 'SIGNED_OUT') {
      logger.info('用户登出')
    }
  })

  return () => {
    authListener?.subscription.unsubscribe()
  }
}, [])
```

## 最佳实践

### 1. 为每个模块创建专属Logger

```typescript
// ✅ 好的做法
const logger = createLogger('DriverManagement')

// ❌ 不好的做法
import {logger} from '@/utils/logger' // 使用全局logger
```

### 2. 记录关键操作的开始和结束

```typescript
logger.info('开始加载数据')
const data = await loadData()
logger.info('数据加载完成', {count: data.length})
```

### 3. 错误日志包含足够的上下文

```typescript
// ✅ 好的做法
logger.error('保存失败', {
  driverId: driver.id,
  warehouseIds: selectedIds,
  error
})

// ❌ 不好的做法
logger.error('保存失败')
```

### 4. 使用合适的日志级别

- **DEBUG**: 详细的调试信息，开发时使用
- **INFO**: 正常的业务流程，如"加载成功"、"保存成功"
- **WARN**: 潜在问题，如"数据不完整"、"使用了默认值"
- **ERROR**: 错误情况，如"加载失败"、"保存失败"

### 5. 避免记录敏感信息

```typescript
// ❌ 不要记录密码、token等敏感信息
logger.info('用户登录', {password: '123456'})

// ✅ 只记录必要的非敏感信息
logger.info('用户登录', {userId: user.id})
```

## 生产环境配置建议

在生产环境中，建议调整日志配置以减少日志输出：

```typescript
// 在 app.tsx 或配置文件中
if (process.env.NODE_ENV === 'production') {
  setLoggerConfig({
    minLevel: LogLevel.WARN, // 只显示警告和错误
    showTimestamp: true,
    showUserId: true,
    showModule: true
  })
}
```

## 故障排查

当遇到问题时，可以通过日志快速定位：

1. **查看ERROR级别日志** - 找到具体的错误信息和堆栈
2. **查看相关的INFO日志** - 了解操作的上下文
3. **查看DEBUG日志** - 获取详细的执行流程

例如，如果图片无法显示：

```
🔍 [DEBUG] [DriverProfileView] 获取图片URL
📦 数据详情: {path: "user123/id_card.jpg", bucketName: "app-7cdqf07mbu9t_vehicles"}

🔍 [DEBUG] [DriverProfileView] 图片URL生成成功
📦 数据详情: {path: "user123/id_card.jpg", url: "https://..."}
```

通过这些日志可以确认：
- 图片路径是否正确
- 存储桶名称是否正确
- URL是否成功生成

## 总结

日志系统是排查问题的重要工具。合理使用日志可以：

- 快速定位问题
- 了解系统运行状态
- 追踪用户操作
- 监控性能指标
- 记录错误信息

记住：**好的日志是问题排查的最佳助手！**
