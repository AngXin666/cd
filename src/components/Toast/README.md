# Toast 提示组件

统一的消息提示组件，提供友好的成功、错误、警告和信息提示。

## 功能特性

- ✅ 支持4种提示类型：success、error、warning、info
- ✅ 自定义提示时长
- ✅ 友好的视觉设计
- ✅ 自动隐藏
- ✅ 统一的API接口

## 使用方式

### 1. 使用工具函数（推荐）

```typescript
import {showSuccess, showError, showWarning, showInfo, showToast} from '@/utils/toast'

// 显示成功提示
showSuccess('操作成功')

// 显示错误提示
showError('操作失败，请重试')

// 显示警告提示
showWarning('请注意检查输入')

// 显示信息提示
showInfo('正在处理中...')

// 自定义配置
showToast({
  message: '自定义提示',
  type: 'success',
  duration: 2000
})
```

### 2. 使用组件（高级用法）

```tsx
import Toast from '@/components/Toast'
import {useState} from 'react'

function MyComponent() {
  const [visible, setVisible] = useState(false)

  return (
    <View>
      <Button onClick={() => setVisible(true)}>显示提示</Button>
      
      <Toast
        message="操作成功"
        type="success"
        visible={visible}
        duration={3000}
        onClose={() => setVisible(false)}
      />
    </View>
  )
}
```

## API

### Toast 组件

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| message | string | - | 提示消息（必填） |
| type | 'success' \| 'error' \| 'warning' \| 'info' | 'info' | 提示类型 |
| duration | number | 3000 | 显示时长（毫秒），0表示不自动关闭 |
| visible | boolean | false | 是否显示 |
| onClose | () => void | - | 关闭回调 |

### 工具函数

#### showToast(options)

显示Toast提示

```typescript
showToast({
  message: '提示消息',
  type: 'success',
  duration: 3000
})

// 或简写
showToast('提示消息')
```

#### showSuccess(message, duration?)

显示成功提示

```typescript
showSuccess('操作成功')
showSuccess('操作成功', 2000)
```

#### showError(message, duration?)

显示错误提示

```typescript
showError('操作失败')
showError('操作失败', 2000)
```

#### showWarning(message, duration?)

显示警告提示

```typescript
showWarning('请注意')
showWarning('请注意', 2000)
```

#### showInfo(message, duration?)

显示信息提示

```typescript
showInfo('正在处理')
showInfo('正在处理', 2000)
```

#### hideToast()

隐藏Toast提示

```typescript
hideToast()
```

## 提示类型

### Success（成功）

用于操作成功的反馈

```typescript
showSuccess('保存成功')
showSuccess('删除成功')
showSuccess('提交成功')
```

### Error（错误）

用于操作失败的反馈

```typescript
showError('保存失败，请重试')
showError('网络连接失败')
showError('参数错误')
```

### Warning（警告）

用于需要用户注意的提示

```typescript
showWarning('请先填写必填项')
showWarning('文件大小超过限制')
showWarning('即将超时，请尽快完成')
```

### Info（信息）

用于一般信息提示

```typescript
showInfo('正在加载...')
showInfo('已是最新版本')
showInfo('暂无数据')
```

## 最佳实践

### 1. 在API调用中使用

```typescript
import {showSuccess, showError} from '@/utils/toast'

async function saveData() {
  try {
    await api.save(data)
    showSuccess('保存成功')
  } catch (error) {
    showError('保存失败，请重试')
  }
}
```

### 2. 在表单验证中使用

```typescript
import {showWarning} from '@/utils/toast'

function validateForm() {
  if (!name) {
    showWarning('请输入姓名')
    return false
  }
  
  if (!phone) {
    showWarning('请输入手机号')
    return false
  }
  
  return true
}
```

### 3. 在错误处理中使用

```typescript
import {errorHandler} from '@/utils/errorHandler'

// errorHandler 已自动使用 showError
try {
  await someOperation()
} catch (error) {
  errorHandler.handle(error)
}
```

### 4. 自定义时长

```typescript
// 短时提示（1秒）
showSuccess('已复制', 1000)

// 长时提示（5秒）
showError('网络连接失败，请检查网络设置', 5000)

// 不自动关闭（需手动调用 hideToast）
showInfo('正在处理中...', 0)
```

## 注意事项

1. **避免频繁调用**：连续调用会导致提示被覆盖
2. **消息长度**：建议消息长度不超过30个字符
3. **类型选择**：根据场景选择合适的提示类型
4. **时长设置**：一般提示3秒，重要提示5秒
5. **错误处理**：优先使用errorHandler，它会自动调用toast

## 与 errorHandler 集成

Toast组件已与errorHandler集成，所有通过errorHandler处理的错误都会自动使用showError显示：

```typescript
import {errorHandler} from '@/utils/errorHandler'

// 自动显示错误提示
errorHandler.handle(error)

// 自定义错误消息
errorHandler.handle(error, '保存失败')

// 特定错误类型
errorHandler.handleApiError(error, '加载数据')
errorHandler.handleNetworkError(error)
errorHandler.handleAuthError(error)
```

## 样式定制

Toast组件使用SCSS编写，可以通过修改`index.scss`自定义样式：

```scss
.toast-container {
  // 自定义背景色
  background: rgba(0, 0, 0, 0.8);
  
  // 自定义圆角
  border-radius: 12px;
  
  // 自定义内边距
  padding: 24px 32px;
}
```

## 示例

### 完整示例

```tsx
import {View, Button} from '@tarojs/components'
import {showSuccess, showError, showWarning, showInfo} from '@/utils/toast'

function ToastDemo() {
  return (
    <View>
      <Button onClick={() => showSuccess('操作成功')}>
        成功提示
      </Button>
      
      <Button onClick={() => showError('操作失败')}>
        错误提示
      </Button>
      
      <Button onClick={() => showWarning('请注意')}>
        警告提示
      </Button>
      
      <Button onClick={() => showInfo('正在处理')}>
        信息提示
      </Button>
    </View>
  )
}
```
