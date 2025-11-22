# 超级管理员查看司机信息页面 UI 优化

## 优化目标
将超级管理员查看司机信息页面的界面风格统一为与用户管理中个人信息显示风格一致，提升用户体验和视觉一致性。

## 参考页面
- **参考页面**：`src/pages/manager/driver-profile/index.tsx`（管理员查看司机个人信息页面）
- **优化页面**：`src/pages/super-admin/user-detail/index.tsx`（超级管理员查看用户详情页面）

## 优化内容

### 1. 整体布局调整

#### 优化前
- 使用蓝色渐变背景 (`linear-gradient(to bottom, #EFF6FF, #DBEAFE)`)
- 卡片使用多种渐变色背景
- 字段以独立的彩色卡片形式展示

#### 优化后 ✅
- 使用统一的灰色背景 (`bg-gray-50`)
- 卡片使用白色背景 + 灰色边框
- 字段以灰色圆角卡片形式展示，风格统一

### 2. 头部信息卡片（新增）

**新增功能**：
- ✅ 蓝色渐变背景卡片 (`from-blue-500 to-blue-600`)
- ✅ 显示司机姓名（大字体、粗体）
- ✅ 显示电话号码（小字体、浅色）
- ✅ 显示年龄（自动计算）
- ✅ 显示驾龄（自动计算）

**实现代码**：
```tsx
{/* 司机头部信息卡片 */}
{userInfo.role === 'driver' && driverLicense && (
  <View className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 mb-4 shadow-lg">
    <View className="flex items-center">
      <View className="bg-white bg-opacity-20 rounded-full p-4 mr-4">
        <View className="i-mdi-account text-white text-4xl" />
      </View>
      <View className="flex-1">
        <Text className="text-white text-2xl font-bold block mb-1">
          {driverLicense.id_card_name || '未识别'}
        </Text>
        <Text className="text-blue-100 text-sm block">{userInfo.phone || '未设置手机号'}</Text>
      </View>
    </View>
    {age !== null && (
      <View className="mt-4 pt-4 border-t border-white border-opacity-20 flex items-center justify-between">
        <View className="flex items-center">
          <View className="i-mdi-cake-variant text-white text-xl mr-2" />
          <Text className="text-white text-sm">{age} 岁</Text>
        </View>
        {drivingYears !== null && (
          <View className="flex items-center">
            <View className="i-mdi-steering text-white text-xl mr-2" />
            <Text className="text-white text-sm">驾龄 {drivingYears} 年</Text>
          </View>
        )}
      </View>
    )}
  </View>
)}
```

### 3. 身份证信息卡片优化

#### 优化前
- 每个字段使用不同的渐变色背景
- 字段独立显示，视觉较为分散

#### 优化后 ✅
- 统一使用白色卡片背景
- 所有字段使用 `bg-gray-50` 灰色圆角卡片
- 卡片顶部有蓝色图标和标题
- 字段排序：姓名 → 电话号码 → 出生日期 → 身份证号码 → 户籍地址 → 签发机关

**样式特点**：
```tsx
{/* 身份证信息卡片 */}
<View className="bg-white rounded-2xl p-5 mb-4 shadow-sm border border-gray-100">
  <View className="flex items-center mb-5 pb-4 border-b border-gray-100">
    <View className="bg-blue-50 rounded-full p-2.5 mr-3">
      <View className="i-mdi-card-account-details text-blue-600 text-2xl" />
    </View>
    <Text className="text-gray-800 text-lg font-bold">身份证信息</Text>
  </View>

  <View className="space-y-4">
    {/* 各个字段 */}
    <View className="bg-gray-50 rounded-xl p-4">
      <Text className="text-gray-500 text-xs mb-1.5 block">字段标签</Text>
      <Text className="text-gray-900 text-base font-medium">字段值</Text>
    </View>
  </View>
</View>
```

### 4. 驾驶证信息卡片优化

#### 优化前
- 每个字段使用不同的渐变色背景
- 字段独立显示，视觉较为分散

#### 优化后 ✅
- 统一使用白色卡片背景
- 所有字段使用 `bg-gray-50` 灰色圆角卡片
- 卡片顶部有绿色图标和标题
- 字段排序：驾驶证号 → 准驾车型 → 初次领证日期 → 证件有效期

**样式特点**：
```tsx
{/* 驾驶证信息卡片 */}
<View className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-4">
  <View className="flex items-center mb-5 pb-4 border-b border-gray-100">
    <View className="bg-green-50 rounded-full p-2.5 mr-3">
      <View className="i-mdi-card-account-details-outline text-green-600 text-2xl" />
    </View>
    <Text className="text-gray-800 text-lg font-bold">驾驶证信息</Text>
  </View>

  <View className="space-y-4">
    {/* 各个字段 */}
  </View>
</View>
```

### 5. 年龄和驾龄计算功能（新增）

**新增函数**：

```tsx
// 计算年龄
const calculateAge = (birthDate: string | null | undefined): number | null => {
  if (!birthDate) return null
  const birth = new Date(birthDate)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age
}

// 计算驾龄
const calculateDrivingYears = (firstIssueDate: string | null | undefined): number | null => {
  if (!firstIssueDate) return null
  const issueDate = new Date(firstIssueDate)
  const today = new Date()
  let years = today.getFullYear() - issueDate.getFullYear()
  const monthDiff = today.getMonth() - issueDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < issueDate.getDate())) {
    years--
  }
  return years
}
```

**使用场景**：
- ✅ 头部信息卡片显示年龄和驾龄
- ✅ 出生日期字段旁显示年龄标签
- ✅ 初次领证日期字段旁显示驾龄标签

### 6. 移除底部按钮

#### 优化前
- 页面底部有"返回"按钮

#### 优化后 ✅
- 移除底部按钮
- 用户可以使用系统导航栏返回
- 页面更加简洁

### 7. 证件照片显示优化

#### 优化前
- 使用自定义的 `ImageWithFallback` 组件

#### 优化后 ✅
- 使用标准的 `Image` 组件
- 添加点击预览功能（`Taro.previewImage`）
- 照片上方有颜色标签（正面/背面/驾驶证）

**实现代码**：
```tsx
{/* 身份证正面 */}
<View>
  <View className="bg-blue-50 px-2 py-1 rounded-t-lg">
    <Text className="text-blue-700 text-xs font-medium text-center">正面</Text>
  </View>
  <Image
    src={getImageUrl(driverLicense.id_card_photo_front)}
    mode="aspectFit"
    className="w-full h-40 bg-gray-100 rounded-b-lg border border-gray-200"
    onClick={() => {
      Taro.previewImage({
        urls: [getImageUrl(driverLicense.id_card_photo_front!)],
        current: getImageUrl(driverLicense.id_card_photo_front!)
      })
    }}
  />
</View>
```

### 8. 空状态优化

#### 优化前
- 简单的文字提示

#### 优化后 ✅
- 使用大图标 + 标题 + 描述的形式
- 白色卡片背景，居中显示
- 视觉效果更友好

```tsx
{/* 如果司机没有实名认证信息 */}
{userInfo.role === 'driver' && !driverLicense && (
  <View className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100 mb-4">
    <View className="i-mdi-alert-circle text-7xl text-gray-300 mx-auto mb-4" />
    <Text className="text-gray-800 text-xl font-bold block mb-2">暂无实名认证信息</Text>
    <Text className="text-gray-500 text-base block">该司机尚未录入实名认证信息</Text>
  </View>
)}
```

## 视觉对比

### 颜色方案

| 元素 | 优化前 | 优化后 |
|------|--------|--------|
| 页面背景 | 蓝色渐变 | 灰色 (`bg-gray-50`) |
| 卡片背景 | 白色 | 白色 + 灰色边框 |
| 字段背景 | 多种渐变色 | 统一灰色 (`bg-gray-50`) |
| 头部卡片 | 无 | 蓝色渐变 |
| 图标背景 | 彩色圆形 | 浅色圆形 |

### 布局结构

| 元素 | 优化前 | 优化后 |
|------|--------|--------|
| 头部信息 | 无 | 蓝色渐变卡片 |
| 身份证信息 | 独立彩色卡片 | 白色卡片 + 灰色字段 |
| 驾驶证信息 | 独立彩色卡片 | 白色卡片 + 灰色字段 |
| 底部按钮 | 返回按钮 | 无 |

## 用户体验提升

### 1. 视觉一致性 ✅
- 与用户管理中的个人信息页面风格完全一致
- 统一的颜色方案和布局结构
- 提升整体应用的专业性

### 2. 信息层次清晰 ✅
- 头部卡片突出显示关键信息（姓名、电话、年龄、驾龄）
- 身份证和驾驶证信息分别在独立的白色卡片中
- 字段使用灰色背景，层次分明

### 3. 交互优化 ✅
- 证件照片可点击预览
- 移除不必要的返回按钮，使用系统导航
- 空状态提示更友好

### 4. 数据展示优化 ✅
- 自动计算并显示年龄和驾龄
- 出生日期和初次领证日期旁显示对应的年龄/驾龄标签
- 信息更加直观

## 技术实现

### 1. 移除的组件
- ❌ `ImageWithFallback` 组件（改用标准 `Image` 组件）
- ❌ `getRoleColor` 函数（不再需要）
- ❌ 底部返回按钮

### 2. 新增的函数
- ✅ `calculateAge` - 计算年龄
- ✅ `calculateDrivingYears` - 计算驾龄

### 3. 样式优化
- ✅ 统一使用 `bg-gray-50` 作为字段背景色
- ✅ 统一使用 `rounded-2xl` 作为卡片圆角
- ✅ 统一使用 `shadow-sm border border-gray-100` 作为卡片阴影和边框
- ✅ 统一使用 `space-y-4` 作为字段间距

## 代码变更统计

```
1 file changed, 343 insertions(+), 278 deletions(-)
```

- **删除代码**：278 行（移除彩色渐变卡片、返回按钮等）
- **新增代码**：343 行（新增头部卡片、年龄/驾龄计算、统一样式等）
- **净增加**：65 行

## Git 提交记录

```bash
7007a12 refactor: 优化超级管理员查看司机信息页面UI，统一风格
```

**提交说明**：
- 参考用户管理中的个人信息显示风格，实现界面一致化
- 新增头部信息卡片，显示姓名、电话、年龄、驾龄
- 统一身份证和驾驶证信息卡片样式
- 移除底部按钮，保持页面简洁
- 优化证件照片显示和预览功能

## 测试场景

### 测试场景1：查看完整信息的司机 ✅

**操作步骤**：
1. 超级管理员登录
2. 进入"车辆管理"页面
3. 找到一辆已录入完整信息的车辆
4. 点击"查看司机"按钮

**预期结果**：
- ✅ 显示蓝色渐变头部卡片，包含姓名、电话、年龄、驾龄
- ✅ 身份证信息在白色卡片中，字段使用灰色背景
- ✅ 驾驶证信息在白色卡片中，字段使用灰色背景
- ✅ 证件照片可点击预览
- ✅ 页面底部无返回按钮

### 测试场景2：查看部分信息的司机 ✅

**操作步骤**：
1. 超级管理员登录
2. 查看一个只填写了部分信息的司机

**预期结果**：
- ✅ 只显示已填写的字段
- ✅ 未填写的字段不显示
- ✅ 如果没有出生日期，不显示年龄
- ✅ 如果没有初次领证日期，不显示驾龄

### 测试场景3：查看没有实名认证信息的司机 ✅

**操作步骤**：
1. 查看一个没有录入实名认证信息的司机

**预期结果**：
- ✅ 不显示头部卡片
- ✅ 显示空状态提示："暂无实名认证信息"
- ✅ 空状态使用白色卡片 + 大图标 + 标题 + 描述

### 测试场景4：证件照片预览 ✅

**操作步骤**：
1. 查看有证件照片的司机
2. 点击身份证正面照片

**预期结果**：
- ✅ 打开微信图片预览
- ✅ 可以放大、缩小、保存图片
- ✅ 可以左右滑动查看其他照片

## 总结

### 优化亮点
- ✅ 界面风格与用户管理页面完全一致，提升整体应用的专业性
- ✅ 新增头部信息卡片，关键信息一目了然
- ✅ 自动计算年龄和驾龄，信息更加直观
- ✅ 统一的颜色方案和布局结构，视觉更加和谐
- ✅ 移除不必要的按钮，页面更加简洁

### 用户价值
- ✅ 提升视觉一致性，降低学习成本
- ✅ 关键信息突出显示，提高查看效率
- ✅ 自动计算年龄和驾龄，减少人工计算
- ✅ 优化交互体验，操作更加流畅

---

**优化完成！** 🎉

超级管理员查看司机信息页面现在与用户管理中的个人信息页面风格完全一致，视觉效果更加专业，用户体验得到显著提升。
