# 仪表盘快捷跳转功能说明

## 功能概述
在双管理端（普通管理端和超级管理端）的仪表盘中，点击"本月完成件数"卡片可以快速跳转到件数报表页面，并自动筛选显示本月数据。

## 使用场景
当管理员在仪表盘看到"本月完成件数"统计数据时，如果想查看详细的本月件数报表，只需点击该卡片即可一键直达，无需手动切换筛选条件。

## 功能详情

### 1. 普通管理端
**位置**：`src/pages/manager/index.tsx`

**触发方式**：
- 点击仪表盘中的"本月完成件数"卡片（紫色渐变背景）

**跳转行为**：
- 跳转到：`/pages/manager/piece-work-report/index`
- 携带参数：`range=month`
- 自动效果：件数报表页面自动选中"本月"排序按钮

### 2. 超级管理端
**位置**：`src/pages/super-admin/index.tsx`

**触发方式**：
- 点击仪表盘中的"本月完成件数"卡片（紫色渐变背景）

**跳转行为**：
- 跳转到：`/pages/super-admin/piece-work-report/index`
- 携带参数：`range=month`
- 自动效果：件数报表页面自动选中"本月"排序按钮

## 技术实现

### URL参数传递
```typescript
// 跳转时携带参数
navigateTo({url: '/pages/manager/piece-work-report/index?range=month'})
```

### 参数接收与处理
```typescript
// 件数报表页面接收参数
useEffect(() => {
  const instance = Taro.getCurrentInstance()
  const range = instance.router?.params?.range
  if (range === 'month') {
    setSortBy('month')  // 自动切换到本月排序
  } else if (range === 'week') {
    setSortBy('week')   // 自动切换到本周排序
  } else if (range === 'today') {
    setSortBy('today')  // 自动切换到今天排序
  }
}, [])
```

## 支持的参数值
- `range=month` - 自动选中"本月"排序
- `range=week` - 自动选中"本周"排序
- `range=today` - 自动选中"今天"排序
- 无参数 - 默认显示"今天"排序

## 用户体验优化
1. **一键直达**：无需手动切换筛选条件，点击即可查看目标数据
2. **视觉反馈**：卡片添加了 `active:scale-95` 效果，点击时有缩放反馈
3. **智能筛选**：自动根据点击的卡片类型选择对应的时间范围
4. **减少操作**：从"点击卡片 → 进入页面 → 手动切换筛选"简化为"点击卡片"一步完成

## 扩展性
该功能设计具有良好的扩展性，可以轻松添加更多快捷跳转：
- 可以为"本周完成件数"添加 `range=week` 参数
- 可以为"今日完成件数"添加 `range=today` 参数
- 可以为其他统计卡片添加自定义参数

## 相关文件
- `/src/pages/manager/index.tsx` - 普通管理端主页
- `/src/pages/super-admin/index.tsx` - 超级管理端主页
- `/src/pages/manager/piece-work-report/index.tsx` - 普通管理端件数报表
- `/src/pages/super-admin/piece-work-report/index.tsx` - 超级管理端件数报表
