# 统一热更新系统 - 故障排查指南

## 📋 目录

- [常见问题](#常见问题)
- [平台特定问题](#平台特定问题)
- [错误代码](#错误代码)
- [调试工具](#调试工具)
- [联系支持](#联系支持)

---

## 常见问题

### 问题 1: 应用启动时没有检查更新

**症状**:
- 应用启动后没有任何更新提示
- 控制台没有更新相关日志

**可能原因**:
1. 运行在开发模式
2. 更新服务未初始化
3. 平台检测失败

**解决方案**:

1. **检查环境变量**
```bash
# 确认不是开发模式
echo $NODE_ENV
# 应该输出 "production" 而不是 "development"
```

2. **检查初始化代码**
```typescript
// 在 App.tsx 中确认有以下代码
useEffect(() => {
  const updateService = new UnifiedUpdateService()
  updateService.initialize()
  
  setTimeout(() => {
    updateService.checkAndApplyUpdate(true)
  }, 500)
}, [])
```

3. **查看控制台日志**
```
搜索关键词：
- "UnifiedUpdateService"
- "初始化更新服务"
- "检查更新"
```

---

### 问题 2: 更新检查失败

**症状**:
- 提示"检查更新失败"
- 控制台显示网络错误

**可能原因**:
1. 网络连接问题
2. Supabase 服务不可用
3. 版本表不存在或数据错误

**解决方案**:

1. **检查网络连接**
```typescript
// 测试网络连接
Taro.request({
  url: 'https://www.baidu.com',
  success: () => console.log('网络正常'),
  fail: () => console.log('网络异常')
})
```

2. **检查 Supabase 配置**
```typescript
// 验证 Supabase 连接
import { supabase } from '@/client/supabase'

const { data, error } = await supabase
  .from('h5_versions')
  .select('*')
  .limit(1)

if (error) {
  console.error('Supabase 连接失败:', error)
}
```

3. **检查版本表**
```sql
-- 确认表存在
SELECT * FROM h5_versions WHERE is_active = true ORDER BY created_at DESC LIMIT 1;

-- 确认字段完整
\d h5_versions
```

---

### 问题 3: 下载更新失败

**症状**:
- 更新对话框显示后，下载失败
- 提示"下载失败，请重试"

**可能原因**:
1. 更新包 URL 无效
2. 存储空间不足
3. 网络不稳定

**解决方案**:

1. **验证更新包 URL**
```typescript
// 测试 URL 是否可访问
const testUrl = async (url: string) => {
  try {
    const response = await fetch(url, { method: 'HEAD' })
    console.log('URL 状态:', response.status)
  } catch (error) {
    console.error('URL 无法访问:', error)
  }
}
```

2. **检查存储空间**
```typescript
// Android 检查存储空间
import { Filesystem } from '@capacitor/filesystem'

const checkStorage = async () => {
  const info = await Filesystem.stat({
    path: '',
    directory: Directory.Data
  })
  console.log('存储信息:', info)
}
```

3. **重试机制**
```typescript
// 实现重试逻辑
const downloadWithRetry = async (url: string, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await download(url)
      return
    } catch (error) {
      if (i === maxRetries - 1) throw error
      await sleep(1000 * (i + 1)) // 指数退避
    }
  }
}
```

---

### 问题 4: 更新后应用无法启动

**症状**:
- 更新完成后重启应用
- 应用白屏或崩溃

**可能原因**:
1. 更新包损坏
2. 版本不兼容
3. 缓存问题

**解决方案**:

1. **回滚到旧版本**
```typescript
// Android 回滚
import { LiveUpdate } from '@capawesome/capacitor-live-update'

await LiveUpdate.reset()
```

2. **清除缓存**
```typescript
// 清除应用缓存
import { Filesystem } from '@capacitor/filesystem'

await Filesystem.rmdir({
  path: 'bundles',
  directory: Directory.Data,
  recursive: true
})
```

3. **重新安装应用**
```bash
# 卸载应用
adb uninstall com.your.app

# 重新安装
adb install app-release.apk
```

---

## 平台特定问题

### 微信小程序

#### 问题: 小程序更新提示不显示

**症状**:
- 有新版本但不提示更新
- `onUpdateReady` 事件不触发

**解决方案**:

1. **检查微信版本**
```
微信版本需要 >= 6.5.3
基础库版本需要 >= 1.9.90
```

2. **检查更新管理器**
```typescript
const updateManager = Taro.getUpdateManager()

// 检查是否支持
if (!updateManager) {
  console.error('当前微信版本不支持更新管理器')
}
```

3. **手动触发检查**
```typescript
// 在微信开发者工具中
// 工具 -> 编译设置 -> 勾选"模拟更新"
```

#### 问题: 小程序更新后仍是旧版本

**症状**:
- 点击"重启应用"后仍是旧版本
- 需要多次重启才生效

**解决方案**:

1. **完全关闭小程序**
```
在微信中：
1. 右上角 "..." 
2. 关闭小程序
3. 重新打开
```

2. **清除小程序缓存**
```
在微信中：
1. 发现 -> 小程序
2. 长按小程序图标
3. 删除
4. 重新搜索打开
```

---

### Android APP

#### 问题: LiveUpdate 初始化失败

**症状**:
- 控制台显示 "LiveUpdate 初始化失败"
- 无法检查更新

**解决方案**:

1. **检查插件安装**
```bash
# 确认插件已安装
npm list @capawesome/capacitor-live-update
```

2. **同步原生项目**
```bash
# 同步 Capacitor 配置
npx cap sync android
```

3. **检查权限配置**
```xml
<!-- android/app/src/main/AndroidManifest.xml -->
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
```

#### 问题: 更新包下载很慢

**症状**:
- 下载进度长时间停留在某个百分比
- 下载超时

**解决方案**:

1. **检查网络质量**
```typescript
// 检测网络类型
import { Network } from '@capacitor/network'

const status = await Network.getStatus()
console.log('网络类型:', status.connectionType)
console.log('网络速度:', status.connected)
```

2. **优化更新包大小**
```bash
# 压缩 H5 代码
pnpm run build:h5 --minify

# 检查包大小
ls -lh dist/h5
```

3. **使用 CDN 加速**
```typescript
// 使用 CDN URL
const cdnUrl = 'https://cdn.example.com/bundles/v1.2.4.zip'
```

---

### H5 网页版

#### 问题: 浏览器缓存导致无法更新

**症状**:
- 部署新版本后，用户仍看到旧版本
- 需要强制刷新才能看到新版本

**解决方案**:

1. **配置缓存策略**
```nginx
# nginx 配置
location / {
  # HTML 文件不缓存
  if ($request_filename ~* \.html$) {
    add_header Cache-Control "no-cache, no-store, must-revalidate";
  }
  
  # JS/CSS 文件使用版本号
  if ($request_filename ~* \.(js|css)$) {
    add_header Cache-Control "public, max-age=31536000";
  }
}
```

2. **使用版本号**
```html
<!-- 在 HTML 中添加版本号 -->
<script src="/app.js?v=1.2.4"></script>
<link rel="stylesheet" href="/app.css?v=1.2.4">
```

3. **Service Worker 更新**
```typescript
// 注册 Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').then(reg => {
    // 检查更新
    reg.update()
  })
}
```

---

## 错误代码

### UPDATE_001: 平台检测失败

**错误信息**: "无法检测当前平台"

**原因**: 
- Taro.getEnv() 返回未知值
- 平台检测逻辑错误

**解决方案**:
```typescript
// 添加日志查看平台信息
const env = Taro.getEnv()
const hasCapacitor = typeof window !== 'undefined' && window.Capacitor
console.log('Taro Env:', env)
console.log('Has Capacitor:', hasCapacitor)
```

---

### UPDATE_002: 策略初始化失败

**错误信息**: "更新策略初始化失败"

**原因**:
- 策略类构造函数抛出异常
- 依赖服务不可用

**解决方案**:
```typescript
try {
  await strategy.initialize()
} catch (error) {
  console.error('策略初始化失败:', error)
  // 使用降级策略
  strategy = new H5UpdateStrategy()
}
```

---

### UPDATE_003: 版本信息获取失败

**错误信息**: "无法获取版本信息"

**原因**:
- Supabase 查询失败
- 版本表数据错误
- 网络请求超时

**解决方案**:
```typescript
// 添加超时和重试
const fetchVersionWithTimeout = async (timeout = 5000) => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)
  
  try {
    const { data, error } = await supabase
      .from('h5_versions')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .abortSignal(controller.signal)
    
    clearTimeout(timeoutId)
    return { data, error }
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}
```

---

### UPDATE_004: 下载失败

**错误信息**: "更新包下载失败"

**原因**:
- URL 无效
- 网络中断
- 存储空间不足

**解决方案**:
```typescript
// 实现断点续传
const downloadWithResume = async (url: string, savePath: string) => {
  let downloaded = 0
  
  // 检查已下载大小
  try {
    const stat = await Filesystem.stat({ path: savePath })
    downloaded = stat.size
  } catch {
    // 文件不存在，从头开始
  }
  
  // 使用 Range 请求续传
  const response = await fetch(url, {
    headers: {
      'Range': `bytes=${downloaded}-`
    }
  })
  
  // 追加写入文件
  // ...
}
```

---

### UPDATE_005: 安装失败

**错误信息**: "更新包安装失败"

**原因**:
- 更新包损坏
- 权限不足
- 版本不兼容

**解决方案**:
```typescript
// 验证更新包完整性
const verifyBundle = async (path: string, expectedHash: string) => {
  const content = await Filesystem.readFile({ path })
  const hash = await calculateHash(content.data)
  
  if (hash !== expectedHash) {
    throw new Error('更新包校验失败')
  }
}
```

---

## 调试工具

### 1. 日志查看器

```typescript
// 创建日志查看器
export class UpdateLogger {
  private logs: string[] = []
  
  log(message: string, data?: any) {
    const timestamp = new Date().toISOString()
    const logEntry = `[${timestamp}] ${message} ${JSON.stringify(data || {})}`
    this.logs.push(logEntry)
    console.log(logEntry)
  }
  
  export() {
    return this.logs.join('\n')
  }
  
  clear() {
    this.logs = []
  }
}

// 使用
const logger = new UpdateLogger()
logger.log('开始检查更新', { platform: 'android' })
```

### 2. 网络监控

```typescript
// 监控网络请求
export class NetworkMonitor {
  async testConnection(url: string) {
    const start = Date.now()
    
    try {
      const response = await fetch(url, { method: 'HEAD' })
      const duration = Date.now() - start
      
      return {
        success: true,
        status: response.status,
        duration,
        url
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        duration: Date.now() - start,
        url
      }
    }
  }
}
```

### 3. 版本比较工具

```typescript
// 比较版本号
export function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number)
  const parts2 = v2.split('.').map(Number)
  
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const part1 = parts1[i] || 0
    const part2 = parts2[i] || 0
    
    if (part1 > part2) return 1
    if (part1 < part2) return -1
  }
  
  return 0
}

// 测试
console.log(compareVersions('1.2.3', '1.2.4')) // -1
console.log(compareVersions('1.2.4', '1.2.3')) // 1
console.log(compareVersions('1.2.3', '1.2.3')) // 0
```

---

## 联系支持

如果以上方法都无法解决问题，请联系技术支持：

### 提供以下信息

1. **环境信息**
   - 平台：微信小程序 / Android APP / H5
   - 设备型号
   - 系统版本
   - 应用版本

2. **问题描述**
   - 问题发生时间
   - 问题复现步骤
   - 预期行为
   - 实际行为

3. **日志信息**
   - 控制台日志
   - 错误堆栈
   - 网络请求日志

4. **截图或录屏**
   - 问题界面截图
   - 操作过程录屏

### 联系方式

- **技术支持邮箱**: support@example.com
- **开发团队**: dev@example.com
- **紧急热线**: 400-xxx-xxxx

---

**最后更新**: 2025-12-14  
**维护团队**: 车队管家开发团队

