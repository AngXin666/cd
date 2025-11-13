# 个人信息显示优化说明

## 优化背景

在系统运行过程中发现，个人信息的显示存在以下问题：
1. **姓名来源不统一**：管理端显示的姓名来自`profile.name`字段，但实际上身份证OCR识别已经获取了准确的姓名信息
2. **邮箱功能冗余**：系统中不需要邮箱功能，但多处显示和搜索邮箱字段
3. **数据准确性问题**：`profile.name`可能为空或不准确，而`driver_licenses.id_card_name`是从身份证OCR识别的准确信息

## 优化方案

### 1. 统一姓名数据源

**原则**：姓名信息统一从身份证OCR识别结果获取

**实现**：
- 管理端司机个人信息页面：使用`driverLicense.id_card_name`替代`profile.name`
- 司机端个人信息页面：已经使用`driverLicense.id_card_name`（无需修改）

**优势**：
- 数据准确性高：来自官方身份证件
- 数据完整性好：OCR识别时必填
- 避免数据不一致：单一数据源

### 2. 移除邮箱功能

**移除范围**：
- 管理端司机个人信息页面：移除邮箱字段显示
- 司机管理列表页面：移除邮箱搜索和显示

**保留范围**：
- 数据库表结构：保留`profiles.email`字段（避免破坏现有数据结构）
- TypeScript类型定义：保留`Profile.email`字段（保持类型完整性）

**原因**：
- 系统不需要邮箱功能
- 简化用户界面
- 减少用户困惑

### 3. 优化用户体验

**改进点**：
- 搜索框提示：从"搜索司机姓名、手机号或邮箱"改为"搜索司机姓名或手机号"
- 空值显示：从"未设置"改为更具体的"未设置手机号"
- 日志记录：添加司机姓名到日志中，便于问题追踪

## 技术实现

### 管理端司机个人信息页面

**文件**：`src/pages/manager/driver-profile/index.tsx`

**修改前**：
```typescript
<View className="flex justify-between py-2 border-b border-border">
  <Text className="text-muted-foreground text-sm">姓名</Text>
  <Text className="text-foreground text-sm font-medium">
    {profile?.name || driverLicense.id_card_name || '未设置'}
  </Text>
</View>
<View className="flex justify-between py-2 border-b border-border">
  <Text className="text-muted-foreground text-sm">手机号</Text>
  <Text className="text-foreground text-sm font-medium">{profile?.phone || '未设置'}</Text>
</View>
<View className="flex justify-between py-2">
  <Text className="text-muted-foreground text-sm">邮箱</Text>
  <Text className="text-foreground text-sm font-medium">{profile?.email || '未设置'}</Text>
</View>
```

**修改后**：
```typescript
<View className="flex justify-between py-2 border-b border-border">
  <Text className="text-muted-foreground text-sm">姓名</Text>
  <Text className="text-foreground text-sm font-medium">
    {driverLicense.id_card_name || '未识别'}
  </Text>
</View>
<View className="flex justify-between py-2">
  <Text className="text-muted-foreground text-sm">手机号</Text>
  <Text className="text-foreground text-sm font-medium">{profile?.phone || '未设置'}</Text>
</View>
```

**改进点**：
1. 姓名直接使用`driverLicense.id_card_name`
2. 移除`profile?.name`的回退逻辑
3. 移除邮箱字段
4. 空值提示从"未设置"改为"未识别"（更符合OCR场景）

**日志增强**：
```typescript
logger.info('驾驶证信息加载完成', {
  driverId,
  hasData: !!licenseData,
  driverName: licenseData?.id_card_name,  // 新增：记录司机姓名
  hasIdCard: !!licenseData?.id_card_photo_front,
  hasDriverLicense: !!licenseData?.driving_license_photo
})
```

### 司机管理列表页面

**文件**：`src/pages/manager/driver-management/index.tsx`

#### 修改1：移除邮箱搜索

**修改前**：
```typescript
const filteredDrivers = useMemo(() => {
  if (!searchKeyword.trim()) {
    return drivers
  }
  const keyword = searchKeyword.trim().toLowerCase()
  return drivers.filter(
    (driver) =>
      driver.name?.toLowerCase().includes(keyword) ||
      driver.phone?.toLowerCase().includes(keyword) ||
      driver.email?.toLowerCase().includes(keyword)
  )
}, [drivers, searchKeyword])
```

**修改后**：
```typescript
const filteredDrivers = useMemo(() => {
  if (!searchKeyword.trim()) {
    return drivers
  }
  const keyword = searchKeyword.trim().toLowerCase()
  return drivers.filter(
    (driver) =>
      driver.name?.toLowerCase().includes(keyword) ||
      driver.phone?.toLowerCase().includes(keyword)
  )
}, [drivers, searchKeyword])
```

#### 修改2：更新搜索框提示

**修改前**：
```typescript
<Input
  type="text"
  placeholder="搜索司机姓名、手机号或邮箱"
  value={searchKeyword}
  onInput={(e) => setSearchKeyword(e.detail.value)}
  className="flex-1 text-sm"
/>
```

**修改后**：
```typescript
<Input
  type="text"
  placeholder="搜索司机姓名或手机号"
  value={searchKeyword}
  onInput={(e) => setSearchKeyword(e.detail.value)}
  className="flex-1 text-sm"
/>
```

#### 修改3：优化司机列表显示

**修改前**：
```typescript
<View className="flex-1">
  <Text className="text-gray-800 text-base font-medium block">
    {driver.name || '未设置姓名'}
  </Text>
  <Text className="text-gray-500 text-xs block">{driver.phone || driver.email}</Text>
</View>
```

**修改后**：
```typescript
<View className="flex-1">
  <Text className="text-gray-800 text-base font-medium block">
    {driver.name || '未设置姓名'}
  </Text>
  <Text className="text-gray-500 text-xs block">{driver.phone || '未设置手机号'}</Text>
</View>
```

**改进点**：
1. 移除`driver.email`的回退显示
2. 空值提示更具体："未设置手机号"

## 数据流程图

```
┌─────────────────────────────────────────────────────────────┐
│                     司机信息数据流                            │
└─────────────────────────────────────────────────────────────┘

1. 司机上传身份证照片
   ↓
2. OCR识别提取信息
   ↓
3. 存储到 driver_licenses 表
   - id_card_name (姓名)
   - id_card_number (身份证号)
   - id_card_birth_date (出生日期)
   - id_card_address (地址)
   ↓
4. 管理端/司机端显示
   - 姓名：直接读取 driver_licenses.id_card_name
   - 手机号：读取 profiles.phone
   - 邮箱：不再显示 ❌

┌─────────────────────────────────────────────────────────────┐
│                     数据优先级                               │
└─────────────────────────────────────────────────────────────┘

姓名来源优先级：
  driver_licenses.id_card_name (唯一来源)
  ↓
  显示在所有页面

手机号来源：
  profiles.phone (唯一来源)
  ↓
  显示在所有页面

邮箱：
  不再使用 ❌
```

## 影响范围

### 修改的文件

1. **src/pages/manager/driver-profile/index.tsx**
   - 姓名显示逻辑
   - 移除邮箱字段
   - 日志增强

2. **src/pages/manager/driver-management/index.tsx**
   - 搜索过滤逻辑
   - 搜索框提示文字
   - 司机列表显示

### 未修改的部分

1. **数据库结构**
   - `profiles`表保持不变
   - `driver_licenses`表保持不变

2. **TypeScript类型**
   - `Profile`接口保持不变
   - `DriverLicense`接口保持不变

3. **司机端页面**
   - 已经使用正确的数据源，无需修改

## 测试验证

### 测试场景1：管理端查看司机信息

**步骤**：
1. 登录管理端
2. 进入司机管理页面
3. 点击"查看个人信息"

**预期结果**：
- ✅ 显示身份证上的姓名
- ✅ 显示手机号
- ✅ 不显示邮箱字段
- ✅ 日志中包含司机姓名

### 测试场景2：司机列表搜索

**步骤**：
1. 在司机管理页面
2. 在搜索框输入姓名关键字
3. 在搜索框输入手机号关键字

**预期结果**：
- ✅ 搜索框提示："搜索司机姓名或手机号"
- ✅ 姓名搜索正常工作
- ✅ 手机号搜索正常工作
- ✅ 列表显示：姓名 + 手机号

### 测试场景3：空值显示

**步骤**：
1. 查看未设置手机号的司机

**预期结果**：
- ✅ 显示"未设置手机号"而不是空白

## 后续建议

### 1. 数据清理（可选）

如果需要，可以考虑：
- 清理`profiles.email`字段的数据
- 清理`profiles.name`字段的数据
- 但建议保留字段结构，避免破坏现有系统

### 2. 数据同步（可选）

可以编写脚本将`driver_licenses.id_card_name`同步到`profiles.name`：
```sql
UPDATE profiles p
SET name = dl.id_card_name
FROM driver_licenses dl
WHERE p.id = dl.driver_id
  AND dl.id_card_name IS NOT NULL
  AND (p.name IS NULL OR p.name = '');
```

### 3. 表单优化

在司机注册/编辑表单中：
- 移除邮箱输入框
- 姓名字段设为只读（从身份证自动填充）

## 总结

通过这次优化，我们实现了：

1. **数据准确性提升**
   - 姓名统一从身份证OCR识别结果获取
   - 避免手动输入错误

2. **界面简化**
   - 移除不必要的邮箱字段
   - 减少用户困惑

3. **用户体验改善**
   - 更清晰的提示信息
   - 更准确的搜索功能

4. **可维护性提升**
   - 单一数据源
   - 完善的日志记录

这些改进使系统更加简洁、准确和易用。
