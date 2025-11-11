# SwipeBack 滑动返回组件

## 功能说明

SwipeBack 是一个支持从屏幕左侧滑动返回上一页的组件，提供类似 iOS 的滑动返回体验。

## 特性

- ✅ 从屏幕左侧边缘滑动触发返回
- ✅ 实时视觉反馈（滑动指示器和背景遮罩）
- ✅ 平滑的动画过渡效果
- ✅ 可自定义返回行为
- ✅ 可禁用滑动返回功能

## 使用方法

### 基础用法

```tsx
import SwipeBack from '@/components/SwipeBack'
import {View, Text} from '@tarojs/components'

const MyPage: React.FC = () => {
  return (
    <SwipeBack>
      <View className="p-4">
        <Text>页面内容</Text>
      </View>
    </SwipeBack>
  )
}
```

### 自定义返回行为

```tsx
import SwipeBack from '@/components/SwipeBack'
import Taro from '@tarojs/taro'

const MyPage: React.FC = () => {
  const handleBack = () => {
    // 自定义返回逻辑
    Taro.showModal({
      title: '提示',
      content: '确定要返回吗？',
      success: (res) => {
        if (res.confirm) {
          Taro.navigateBack()
        }
      }
    })
  }

  return (
    <SwipeBack onBack={handleBack}>
      <View className="p-4">
        <Text>页面内容</Text>
      </View>
    </SwipeBack>
  )
}
```

### 禁用滑动返回

```tsx
import SwipeBack from '@/components/SwipeBack'

const MyPage: React.FC = () => {
  const [isEditing, setIsEditing] = useState(false)

  return (
    <SwipeBack disabled={isEditing}>
      <View className="p-4">
        {/* 编辑模式下禁用滑动返回 */}
      </View>
    </SwipeBack>
  )
}
```

## Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| children | ReactNode | - | 页面内容 |
| onBack | () => void | undefined | 自定义返回回调函数，不传则使用默认返回逻辑 |
| disabled | boolean | false | 是否禁用滑动返回功能 |

## 默认返回逻辑

如果不传 `onBack` 属性，组件会使用以下默认逻辑：

1. 如果页面栈深度大于 1，执行 `Taro.navigateBack()` 返回上一页
2. 如果页面栈深度等于 1（即当前是第一个页面），执行 `Taro.switchTab({url: '/pages/index/index'})` 跳转到工作台

## 交互说明

1. **触发区域**：从屏幕左侧边缘 50px 内开始滑动
2. **滑动方向**：必须是横向滑动（横向移动距离大于纵向移动距离）
3. **触发阈值**：滑动距离超过 100px 时触发返回
4. **最大偏移**：页面最大偏移距离为 300px
5. **视觉反馈**：
   - 页面随手指移动
   - 左侧显示返回图标指示器
   - 背景显示半透明黑色遮罩

## 注意事项

1. **与微信小程序默认手势的关系**：
   - 微信小程序默认支持右滑返回功能
   - 本组件提供额外的左侧边缘滑动返回功能
   - 两者可以共存，互不影响

2. **性能优化**：
   - 滑动过程中使用 `transition: none` 避免动画卡顿
   - 滑动结束后使用 `transition: transform 0.3s ease-out` 实现平滑回弹

3. **适用场景**：
   - 适合需要明确滑动返回提示的页面
   - 适合需要自定义返回逻辑的页面
   - 不适合 tabBar 页面（tabBar 页面不需要返回功能）

4. **兼容性**：
   - 支持微信小程序
   - 支持 H5
   - 其他平台需要测试验证

## 示例页面

可以参考以下页面的实现：
- 司机端页面
- 管理端页面
- 超级管理端页面

## 常见问题

### Q: 为什么滑动没有反应？

A: 请检查以下几点：
1. 是否从屏幕左侧边缘 50px 内开始滑动
2. 是否是横向滑动（而不是纵向滑动）
3. 是否设置了 `disabled={true}`

### Q: 如何在某些情况下禁用滑动返回？

A: 使用 `disabled` 属性，例如在表单编辑时：

```tsx
const [isEditing, setIsEditing] = useState(false)

<SwipeBack disabled={isEditing}>
  {/* 页面内容 */}
</SwipeBack>
```

### Q: 如何在返回前进行确认？

A: 使用 `onBack` 属性自定义返回逻辑：

```tsx
const handleBack = () => {
  Taro.showModal({
    title: '提示',
    content: '确定要返回吗？未保存的内容将丢失',
    success: (res) => {
      if (res.confirm) {
        Taro.navigateBack()
      }
    }
  })
}

<SwipeBack onBack={handleBack}>
  {/* 页面内容 */}
</SwipeBack>
```
