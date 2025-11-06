# 修复 selectedDriverIndex 错误总结

## 问题描述

在运行时出现错误：
```
Uncaught ReferenceError: selectedDriverIndex is not defined
```

## 根本原因

在之前的优化中，我们将司机筛选逻辑从基于索引（`selectedDriverIndex`）改为基于ID（`selectedDriverId`），但有些页面没有完全更新，导致仍然引用了不存在的 `selectedDriverIndex` 变量。

## 修复的页面

### 1. 超级管理端 - 计件管理页面
**文件**: `/src/pages/super-admin/piece-work/index.tsx`

**修改内容**:
- 添加拼音工具导入：`import {matchWithPinyin} from '@/utils/pinyin'`
- 状态变量：`selectedDriverIndex` → `selectedDriverId`
- 过滤逻辑：添加拼音首字母搜索支持
- 数据加载：使用 `selectedDriverId` 直接筛选，而不是通过索引
- UI组件：更新 Picker 组件的 value 和 onChange 逻辑
- 初始化：`setSelectedDriverIndex(0)` → `setSelectedDriverId('')`

### 2. 管理端 - 数据汇总页面
**文件**: `/src/pages/manager/data-summary/index.tsx`

**修改内容**:
- 添加拼音工具导入：`import {matchWithPinyin} from '@/utils/pinyin'`
- 状态变量：`selectedDriverIndex` → `selectedDriverId`
- 过滤逻辑：添加拼音首字母搜索支持
- 数据加载：使用 `selectedDriverId` 直接筛选
- UI组件：更新 Picker 组件逻辑
- 初始化：`setSelectedDriverIndex(0)` → `setSelectedDriverId('')`

### 3. 管理端 - 计件管理页面
**文件**: `/src/pages/manager/piece-work/index.tsx`

**修改内容**:
- 添加拼音工具导入：`import {matchWithPinyin} from '@/utils/pinyin'`
- 状态变量：`selectedDriverIndex` → `selectedDriverId`
- 过滤逻辑：添加拼音首字母搜索支持
- 数据加载：使用 `selectedDriverId` 直接筛选
- UI组件：更新 Picker 组件逻辑
- 初始化：`setSelectedDriverIndex(0)` → `setSelectedDriverId('')`

## 修改模式

所有页面都遵循相同的修改模式：

### 1. 状态管理
```typescript
// 旧代码
const [selectedDriverIndex, setSelectedDriverIndex] = useState(0)

// 新代码
const [selectedDriverId, setSelectedDriverId] = useState<string>('')
```

### 2. 过滤逻辑
```typescript
// 旧代码
const filteredDrivers = drivers.filter((driver) => {
  if (!driverSearchKeyword.trim()) return true
  const keyword = driverSearchKeyword.toLowerCase()
  const name = (driver.name || '').toLowerCase()
  const phone = (driver.phone || '').toLowerCase()
  return name.includes(keyword) || phone.includes(keyword)
})

// 新代码
const filteredDrivers = drivers.filter((driver) => {
  if (!driverSearchKeyword.trim()) return true
  const keyword = driverSearchKeyword.trim()
  const name = driver.name || ''
  const phone = driver.phone || ''
  return matchWithPinyin(name, keyword) || phone.toLowerCase().includes(keyword.toLowerCase())
})
```

### 3. 数据筛选
```typescript
// 旧代码
if (selectedDriverIndex > 0) {
  const driver = filteredDrivers[selectedDriverIndex - 1]
  if (driver) {
    data = data.filter((r) => r.user_id === driver.id)
  }
}

// 新代码
if (selectedDriverId) {
  data = data.filter((r) => r.user_id === selectedDriverId)
}
```

### 4. UI组件
```typescript
// 旧代码
<Picker
  mode="selector"
  range={driverOptions}
  value={selectedDriverIndex}
  onChange={(e) => setSelectedDriverIndex(Number(e.detail.value))}>
  <View>
    <Text>{driverOptions[selectedDriverIndex]}</Text>
  </View>
</Picker>

// 新代码
<Picker
  mode="selector"
  range={driverOptions}
  value={selectedDriverId ? filteredDrivers.findIndex((d) => d.id === selectedDriverId) + 1 : 0}
  onChange={(e) => {
    const index = Number(e.detail.value)
    if (index === 0) {
      setSelectedDriverId('')
    } else {
      const driver = filteredDrivers[index - 1]
      if (driver) {
        setSelectedDriverId(driver.id)
      }
    }
  }}>
  <View>
    <Text>
      {selectedDriverId
        ? drivers.find((d) => d.id === selectedDriverId)?.name ||
          drivers.find((d) => d.id === selectedDriverId)?.phone ||
          '未知'
        : '所有司机'}
    </Text>
  </View>
</Picker>
```

### 5. 搜索输入框
```typescript
// 新增：搜索关键词变化时重置选中状态
<Input
  value={driverSearchKeyword}
  onInput={(e) => {
    setDriverSearchKeyword(e.detail.value)
    setSelectedDriverId('') // 重置选中的司机
  }}
/>
```

## 验证结果

所有修改已通过 lint 检查：
```bash
pnpm run lint
# Checked 79 files in 308ms. No fixes applied.
```

## 未修改的页面

以下页面仍然使用 `selectedDriverIndex`，但这是合理的，因为它们是数据录入表单，不涉及筛选和搜索功能：

1. `/src/pages/manager/piece-work-form/index.tsx` - 管理员计件录入表单
2. `/src/pages/super-admin/piece-work-form/index.tsx` - 超级管理员计件录入表单
3. `/src/pages/super-admin/piece-work-report-form/index.tsx` - 超级管理员计件报表录入表单

这些表单页面用于选择单个司机进行数据录入，使用索引方式是合适的。

## 功能改进

通过这次修复，所有筛选页面现在都具备以下功能：

1. ✅ 司机选项可以正常选中并生效
2. ✅ 支持按拼音首字母进行模糊检索
3. ✅ 管理端和超级管理端功能一致
4. ✅ 搜索关键词变化时自动重置选中状态
5. ✅ 所有引用错误已修复

## 测试建议

建议测试以下场景：

1. 在各个筛选页面中搜索司机（使用姓名、拼音首字母、手机号）
2. 选择司机后查看筛选结果是否正确
3. 清空搜索关键词后，选中状态应该被重置
4. 切换仓库和司机筛选条件，验证数据加载是否正确
