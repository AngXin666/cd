# 个人信息卡片合并与实名显示优化

## 优化背景

用户反馈了两个重要的用户体验问题：

### 问题1：信息卡片重复
在管理端司机个人信息页面，存在两个独立的卡片：
- **司机信息卡片**：显示姓名、手机号
- **身份证信息卡片**：显示姓名、身份证号、出生日期、地址

**问题**：姓名在两个卡片中重复显示，造成信息冗余，界面不够简洁。

### 问题2：列表未显示实名
在司机管理列表页面：
- 只显示`profile.name`字段（可能为空或不准确）
- 没有显示从身份证OCR识别的准确姓名
- 无法直观看出哪些司机已完成实名认证

## 优化方案

### 1. 合并信息卡片

**目标**：将"司机信息"和"身份证信息"合并为一个"个人信息"卡片

**实现**：
```tsx
{/* 个人信息（合并司机信息和身份证信息） */}
<View className="bg-card rounded-xl p-5 mb-4 shadow-sm">
  <View className="flex items-center mb-4">
    <View className="i-mdi-account-circle text-primary text-3xl mr-3" />
    <Text className="text-foreground text-xl font-bold">个人信息</Text>
  </View>
  <View className="space-y-3">
    {/* 姓名 */}
    <View className="flex justify-between py-2 border-b border-border">
      <Text className="text-muted-foreground text-sm">姓名</Text>
      <Text className="text-foreground text-sm font-medium">
        {driverLicense.id_card_name || '未识别'}
      </Text>
    </View>
    {/* 手机号 */}
    <View className="flex justify-between py-2 border-b border-border">
      <Text className="text-muted-foreground text-sm">手机号</Text>
      <Text className="text-foreground text-sm font-medium">
        {profile?.phone || '未设置'}
      </Text>
    </View>
    {/* 身份证号 */}
    <View className="flex justify-between py-2 border-b border-border">
      <Text className="text-muted-foreground text-sm">身份证号</Text>
      <Text className="text-foreground text-sm font-medium">
        {driverLicense.id_card_number || '未识别'}
      </Text>
    </View>
    {/* 出生日期 */}
    {driverLicense.id_card_birth_date && (
      <View className="flex justify-between py-2 border-b border-border">
        <Text className="text-muted-foreground text-sm">出生日期</Text>
        <Text className="text-foreground text-sm font-medium">
          {driverLicense.id_card_birth_date}
          {age !== null && (
            <Text className="text-muted-foreground ml-2">({age}岁)</Text>
          )}
        </Text>
      </View>
    )}
    {/* 地址 */}
    <View className="flex justify-between py-2">
      <Text className="text-muted-foreground text-sm">地址</Text>
      <Text className="text-foreground text-sm font-medium text-right flex-1 ml-4">
        {driverLicense.id_card_address || '未识别'}
      </Text>
    </View>
  </View>

  {/* 身份证照片 */}
  <View className="mt-4">
    <Text className="text-foreground text-base font-medium mb-3 block">
      身份证照片
    </Text>
    {/* 照片展示... */}
  </View>
</View>
```

**优势**：
- ✅ 信息集中展示，一目了然
- ✅ 避免姓名重复显示
- ✅ 界面更简洁，减少视觉干扰
- ✅ 逻辑更清晰，所有个人信息在一个卡片中

### 2. 列表显示实名

#### 2.1 创建新的API函数

**文件**：`src/db/api.ts`

```typescript
/**
 * 获取所有司机档案（包含实名信息）
 * 通过LEFT JOIN driver_licenses表获取身份证姓名
 */
export async function getAllDriversWithRealName(): Promise<
  Array<Profile & {real_name: string | null}>
> {
  logger.db('查询', 'profiles + driver_licenses', {role: 'driver'})
  try {
    const {data, error} = await supabase
      .from('profiles')
      .select(
        `
        *,
        driver_licenses!driver_licenses_driver_id_fkey(id_card_name)
      `
      )
      .eq('role', 'driver')
      .order('created_at', {ascending: false})

    if (error) {
      logger.error('获取司机列表失败', error)
      return []
    }

    // 转换数据格式，提取real_name
    const drivers = (data || []).map((item: any) => {
      const {driver_licenses, ...profile} = item
      return {
        ...profile,
        real_name: driver_licenses?.id_card_name || null
      }
    })

    logger.info(`成功获取司机列表，共 ${drivers.length} 名司机`)
    return drivers
  } catch (error) {
    logger.error('获取司机列表异常', error)
    return []
  }
}
```

**技术亮点**：
- 使用Supabase的关联查询（LEFT JOIN）
- 一次查询获取所有必要信息，避免N+1问题
- 性能优化：不需要为每个司机单独查询driver_licenses表
- 数据转换：将嵌套的driver_licenses对象展平为real_name字段

#### 2.2 更新页面组件

**文件**：`src/pages/manager/driver-management/index.tsx`

**类型定义**：
```typescript
// 扩展Profile类型，包含实名信息
type DriverWithRealName = Profile & {real_name: string | null}
```

**状态管理**：
```typescript
const [drivers, setDrivers] = useState<DriverWithRealName[]>([])
const [selectedDriver, setSelectedDriver] = useState<DriverWithRealName | null>(null)
```

**数据加载**：
```typescript
const loadDrivers = useCallback(async () => {
  logger.info('开始加载司机列表（包含实名）')
  try {
    const driverList = await getAllDriversWithRealName()
    setDrivers(driverList)
    logger.info(`成功加载司机列表，共 ${driverList.length} 名司机`, {
      withRealName: driverList.filter((d) => d.real_name).length
    })
  } catch (error) {
    logger.error('加载司机列表失败', error)
  }
}, [])
```

**搜索过滤**：
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
      driver.real_name?.toLowerCase().includes(keyword)  // 新增：支持实名搜索
  )
}, [drivers, searchKeyword])
```

**列表显示**：
```tsx
<View className="flex-1">
  <View className="flex items-center gap-2">
    <Text className="text-gray-800 text-base font-medium">
      {driver.real_name || driver.name || '未设置姓名'}
    </Text>
    {driver.real_name && (
      <View className="bg-green-100 px-2 py-0.5 rounded">
        <Text className="text-green-700 text-xs">已实名</Text>
      </View>
    )}
  </View>
  <Text className="text-gray-500 text-xs block mt-1">
    {driver.phone || '未设置手机号'}
  </Text>
</View>
```

**显示逻辑**：
1. **优先显示实名**：`driver.real_name || driver.name || '未设置姓名'`
2. **实名标签**：已实名的司机显示绿色"已实名"标签
3. **视觉区分**：通过标签快速识别实名状态

## 数据流程

### 原有流程（存在问题）

```
┌─────────────────────────────────────────────────────────────┐
│                     原有数据流程                              │
└─────────────────────────────────────────────────────────────┘

1. 加载司机列表
   ↓
2. 查询 profiles 表
   SELECT * FROM profiles WHERE role = 'driver'
   ↓
3. 显示 profile.name（可能为空）
   ↓
4. 问题：
   - 没有显示身份证姓名
   - 无法区分是否实名
   - 需要点击进入详情才能看到实名
```

### 优化后流程

```
┌─────────────────────────────────────────────────────────────┐
│                     优化后数据流程                            │
└─────────────────────────────────────────────────────────────┘

1. 加载司机列表
   ↓
2. 关联查询 profiles + driver_licenses
   SELECT 
     profiles.*,
     driver_licenses.id_card_name
   FROM profiles
   LEFT JOIN driver_licenses ON profiles.id = driver_licenses.driver_id
   WHERE profiles.role = 'driver'
   ↓
3. 数据转换
   {
     ...profile,
     real_name: driver_licenses?.id_card_name || null
   }
   ↓
4. 列表显示
   - 优先显示 real_name
   - 显示"已实名"标签
   - 支持实名搜索
   ↓
5. 优势：
   ✅ 一次查询获取所有信息
   ✅ 性能优化（避免N+1问题）
   ✅ 实名状态一目了然
   ✅ 搜索更智能
```

## 性能对比

### 原有方案（N+1问题）

```typescript
// 1. 查询所有司机
const profiles = await getAllProfiles()
const drivers = profiles.filter(p => p.role === 'driver')

// 2. 如果要显示实名，需要为每个司机单独查询
for (const driver of drivers) {
  const license = await getDriverLicense(driver.id)  // N次查询
  driver.real_name = license?.id_card_name
}

// 总查询次数：1 + N（N为司机数量）
// 如果有100个司机，需要101次查询
```

### 优化方案（单次关联查询）

```typescript
// 1. 一次关联查询获取所有信息
const drivers = await getAllDriversWithRealName()

// 总查询次数：1
// 无论有多少司机，都只需要1次查询
```

**性能提升**：
- 查询次数：从 `1 + N` 降低到 `1`
- 网络往返：从 `N+1` 次降低到 `1` 次
- 响应时间：显著减少（特别是司机数量多时）
- 数据库负载：大幅降低

## 用户体验提升

### 管理端司机个人信息页面

**优化前**：
```
┌─────────────────────────────────┐
│ 司机信息                         │
│ 姓名：张三                       │
│ 手机号：13800138000             │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ 身份证信息                       │
│ 姓名：张三                       │  ← 重复显示
│ 身份证号：110101199001011234    │
│ 出生日期：1990-01-01 (34岁)    │
│ 地址：北京市朝阳区...           │
└─────────────────────────────────┘
```

**优化后**：
```
┌─────────────────────────────────┐
│ 个人信息                         │
│ 姓名：张三                       │  ← 只显示一次
│ 手机号：13800138000             │
│ 身份证号：110101199001011234    │
│ 出生日期：1990-01-01 (34岁)    │
│ 地址：北京市朝阳区...           │
│                                  │
│ 身份证照片                       │
│ [正面照片] [背面照片]           │
└─────────────────────────────────┘
```

**改进点**：
- ✅ 信息不重复
- ✅ 布局更紧凑
- ✅ 逻辑更清晰
- ✅ 减少滚动距离

### 司机管理列表页面

**优化前**：
```
┌─────────────────────────────────┐
│ 👤 未设置姓名                    │
│    13800138000                   │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ 👤 李四                          │
│    13900139000                   │
└─────────────────────────────────┘
```
- ❌ 无法看出是否实名
- ❌ 可能显示空姓名
- ❌ 需要点击进入才能确认

**优化后**：
```
┌─────────────────────────────────┐
│ 👤 张三 [已实名]                 │
│    13800138000                   │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ 👤 李四                          │
│    13900139000                   │
└─────────────────────────────────┘
```
- ✅ 显示身份证实名
- ✅ 绿色标签标识实名状态
- ✅ 一目了然，无需点击

## 搜索功能增强

### 优化前

```typescript
// 只能搜索 name 和 phone
return drivers.filter(
  (driver) =>
    driver.name?.toLowerCase().includes(keyword) ||
    driver.phone?.toLowerCase().includes(keyword)
)
```

**问题**：
- 如果司机没有设置name，但有real_name，搜索不到
- 用户记住的是身份证姓名，但搜索不到

### 优化后

```typescript
// 可以搜索 name、phone 和 real_name
return drivers.filter(
  (driver) =>
    driver.name?.toLowerCase().includes(keyword) ||
    driver.phone?.toLowerCase().includes(keyword) ||
    driver.real_name?.toLowerCase().includes(keyword)  // 新增
)
```

**改进**：
- ✅ 支持实名搜索
- ✅ 搜索更全面
- ✅ 用户体验更好

## 日志增强

### 数据加载日志

```typescript
logger.info(`成功加载司机列表，共 ${driverList.length} 名司机`, {
  withRealName: driverList.filter((d) => d.real_name).length
})
```

**输出示例**：
```
[INFO] [DriverManagement] 成功加载司机列表，共 15 名司机 {
  withRealName: 12
}
```

**价值**：
- 快速了解实名认证情况
- 便于问题排查
- 数据统计

### 用户操作日志

```typescript
logger.userAction('选择司机', {
  driverId: driver.id,
  driverName: driver.real_name || driver.name
})
```

**输出示例**：
```
[USER_ACTION] [DriverManagement] 选择司机 {
  driverId: "uuid-123",
  driverName: "张三"
}
```

## 测试验证

### 测试场景1：查看合并后的个人信息卡片

**步骤**：
1. 登录管理端
2. 进入司机管理
3. 点击"查看个人信息"

**预期结果**：
- ✅ 只有一个"个人信息"卡片
- ✅ 姓名只显示一次
- ✅ 所有信息集中展示
- ✅ 身份证照片在卡片底部

### 测试场景2：列表显示实名

**步骤**：
1. 进入司机管理页面
2. 查看司机列表

**预期结果**：
- ✅ 已实名的司机显示身份证姓名
- ✅ 显示绿色"已实名"标签
- ✅ 未实名的司机显示profile.name或"未设置姓名"

### 测试场景3：实名搜索

**步骤**：
1. 在搜索框输入身份证姓名
2. 观察搜索结果

**预期结果**：
- ✅ 能够搜索到对应的司机
- ✅ 搜索结果正确

### 测试场景4：性能测试

**步骤**：
1. 打开浏览器开发者工具
2. 进入司机管理页面
3. 查看Network面板

**预期结果**：
- ✅ 只有一次数据库查询
- ✅ 响应时间短
- ✅ 数据完整

## 技术总结

### 关键技术点

1. **Supabase关联查询**
   ```typescript
   .select(`
     *,
     driver_licenses!driver_licenses_driver_id_fkey(id_card_name)
   `)
   ```

2. **TypeScript类型扩展**
   ```typescript
   type DriverWithRealName = Profile & {real_name: string | null}
   ```

3. **数据转换**
   ```typescript
   const {driver_licenses, ...profile} = item
   return {
     ...profile,
     real_name: driver_licenses?.id_card_name || null
   }
   ```

4. **条件渲染**
   ```tsx
   {driver.real_name && (
     <View className="bg-green-100 px-2 py-0.5 rounded">
       <Text className="text-green-700 text-xs">已实名</Text>
     </View>
   )}
   ```

### 最佳实践

1. **避免N+1查询**：使用关联查询一次获取所有数据
2. **类型安全**：使用TypeScript类型扩展确保类型安全
3. **用户体验**：通过视觉标签快速传达信息状态
4. **性能优化**：减少数据库查询次数和网络往返
5. **日志记录**：记录关键操作和数据统计

## 影响范围

### 修改的文件

1. **src/db/api.ts**
   - 新增 `getAllDriversWithRealName` 函数

2. **src/pages/manager/driver-profile/index.tsx**
   - 合并"司机信息"和"身份证信息"卡片

3. **src/pages/manager/driver-management/index.tsx**
   - 使用新的API函数
   - 更新类型定义
   - 优化列表显示
   - 增强搜索功能

### 未修改的部分

1. **数据库结构**：无需修改
2. **其他页面**：不受影响
3. **API接口**：向后兼容

## 后续建议

### 1. 数据质量监控

建议添加监控功能，统计：
- 实名认证率
- 未实名司机列表
- 数据完整性

### 2. 批量实名认证

可以考虑添加批量上传身份证的功能，提高实名认证效率。

### 3. 实名提醒

对于未实名的司机，可以添加提醒功能，引导完成实名认证。

## 总结

通过这次优化，我们实现了：

1. **界面简化**
   - 合并重复的信息卡片
   - 减少视觉干扰
   - 提升信息密度

2. **功能增强**
   - 列表显示实名信息
   - 实名状态可视化
   - 搜索功能更强大

3. **性能优化**
   - 避免N+1查询问题
   - 减少数据库负载
   - 提升响应速度

4. **用户体验**
   - 信息一目了然
   - 操作更便捷
   - 反馈更及时

这些改进使系统更加高效、易用和专业。
