# Loading组件使用指南

统一的Loading组件，提供一致的加载状态展示。

## 功能特性

- ✅ 支持局部loading和全屏loading
- ✅ 可自定义提示文字
- ✅ 支持不同尺寸
- ✅ 提供Hook和工具函数
- ✅ 自动管理loading状态

## 使用方式

### 1. 局部Loading

在特定区域显示loading：

```tsx
import Loading from '@/components/Loading'
import {useLoading} from '@/hooks/useLoading'

function MyComponent() {
  const {loading, withLoading} = useLoading()

  const loadData = async () => {
    await withLoading(async () => {
      // 执行异步操作
      await fetchData()
    })
  }

  return (
    <Loading loading={loading} tip="加载数据中...">
      <View>
        {/* 你的内容 */}
      </View>
    </Loading>
  )
}
```

### 2. 全屏Loading

显示全屏loading遮罩：

```tsx
import Loading from '@/components/Loading'

function MyComponent() {
  const [loading, setLoading] = useState(false)

  return (
    <>
      <Loading loading={loading} fullscreen tip="处理中..." />
      <View>
        {/* 你的内容 */}
      </View>
    </>
  )
}
```

### 3. 使用全局Loading工具

不需要组件，直接显示loading：

```typescript
import {showGlobalLoading, hideGlobalLoading, withLoading} from '@/utils/loading'

// 手动控制
async function handleSubmit() {
  showGlobalLoading('提交中...')
  try {
    await submitData()
  } finally {
    hideGlobalLoading()
  }
}

// 自动管理
async function handleSubmit() {
  await withLoading(async () => {
    await submitData()
  }, '提交中...')
}
```

### 4. 延迟显示Loading

避免快速操作时的loading闪烁：

```typescript
import {withDelayedLoading} from '@/utils/loading'

async function quickOperation() {
  // 如果操作在300ms内完成，不显示loading
  await withDelayedLoading(async () => {
    await fetchData()
  }, '加载中...', 300)
}
```

### 5. 使用装饰器

为类方法自动添加loading：

```typescript
import {withLoadingDecorator} from '@/utils/loading'

class MyService {
  @withLoadingDecorator('保存中...')
  async saveData(data: any) {
    await api.save(data)
  }
}
```

## API

### Loading组件Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| loading | boolean | false | 是否显示loading |
| tip | string | '加载中...' | 提示文字 |
| fullscreen | boolean | false | 是否全屏显示 |
| size | 'small' \| 'default' \| 'large' | 'default' | loading图标大小 |
| className | string | '' | 自定义样式类名 |
| children | ReactNode | - | 子组件 |

### useLoading Hook

```typescript
const {
  loading,        // 当前loading状态
  setLoading,     // 设置loading状态
  withLoading,    // 包装异步函数
  startLoading,   // 开始loading
  stopLoading     // 结束loading
} = useLoading()
```

### 工具函数

```typescript
// 显示全局loading
showGlobalLoading(title?: string, mask?: boolean): void

// 隐藏全局loading
hideGlobalLoading(): void

// 包装异步函数
withLoading<T>(fn: () => Promise<T>, title?: string): Promise<T>

// 延迟显示loading
withDelayedLoading<T>(fn: () => Promise<T>, title?: string, delay?: number): Promise<T>
```

## 最佳实践

### 1. 选择合适的Loading类型

- **局部Loading**：用于页面的某个区域加载数据
- **全屏Loading**：用于提交表单、保存数据等全局操作
- **全局工具**：用于简单的API调用

### 2. 提供清晰的提示文字

```typescript
// ❌ 不好
showGlobalLoading('加载中...')

// ✅ 好
showGlobalLoading('正在保存数据...')
showGlobalLoading('正在提交表单...')
```

### 3. 使用延迟Loading避免闪烁

对于可能很快完成的操作，使用延迟loading：

```typescript
// 如果操作在300ms内完成，不显示loading
await withDelayedLoading(async () => {
  await quickApi()
}, '加载中...', 300)
```

### 4. 确保Loading总是被关闭

使用try-finally或withLoading确保loading被关闭：

```typescript
// ✅ 使用withLoading自动管理
await withLoading(async () => {
  await api.call()
})

// ✅ 使用try-finally
showGlobalLoading()
try {
  await api.call()
} finally {
  hideGlobalLoading()
}
```

## 迁移指南

### 从Taro.showLoading迁移

```typescript
// 之前
Taro.showLoading({title: '加载中...'})
try {
  await fetchData()
} finally {
  Taro.hideLoading()
}

// 之后
import {withLoading} from '@/utils/loading'

await withLoading(async () => {
  await fetchData()
}, '加载中...')
```

### 从自定义loading状态迁移

```typescript
// 之前
const [loading, setLoading] = useState(false)

const loadData = async () => {
  setLoading(true)
  try {
    await fetchData()
  } finally {
    setLoading(false)
  }
}

// 之后
import {useLoading} from '@/hooks/useLoading'

const {loading, withLoading} = useLoading()

const loadData = async () => {
  await withLoading(async () => {
    await fetchData()
  })
}
```

## 注意事项

1. **避免嵌套loading**：不要在一个loading内部再显示另一个loading
2. **及时关闭loading**：确保所有loading都能被正确关闭
3. **提供有意义的提示**：让用户知道正在发生什么
4. **考虑性能**：对于频繁的操作，考虑使用延迟loading

## 示例

完整示例请参考：
- `src/pages/super-admin/user-management/` - 用户管理页面
- `src/pages/manager/piece-work/` - 计件管理页面
