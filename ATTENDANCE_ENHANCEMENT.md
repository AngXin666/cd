# 考勤管理界面增强文档

## 修复日期
2025-11-15

## 需求描述

### 用户需求

在考勤管理界面中增强司机信息显示：
1. ✅ 为新司机打上标签（入职7天内）
2. ✅ 读取已实名的车牌并显示
3. ✅ 显示司机的手机号码
4. ✅ 调整信息显示顺序：手机号码、车牌、分配仓库、入职时间、在职天数（最后两个一行）

---

## 修复内容

### 1. 数据结构增强

#### 修改 DriverStats 接口

**文件**：
- `src/pages/manager/leave-approval/index.tsx`
- `src/pages/super-admin/leave-approval/index.tsx`

**修改前**：
```typescript
interface DriverStats {
  driverId: string
  driverName: string
  warehouseIds: string[]
  warehouseNames: string[]
  // ... 其他字段
}
```

**修改后**：
```typescript
interface DriverStats {
  driverId: string
  driverName: string
  driverPhone: string | null      // ✅ 新增：手机号码
  licensePlate: string | null     // ✅ 新增：车牌号
  warehouseIds: string[]
  warehouseNames: string[]
  // ... 其他字段
}
```

---

### 2. 数据初始化增强

#### 添加手机号码和车牌信息

**修改前**：
```typescript
// 首先，为所有司机创建初始统计数据
for (const driver of drivers) {
  statsMap.set(driver.id, {
    driverId: driver.id,
    driverName: getUserName(driver.id),
    warehouseIds: [],
    warehouseNames: [],
    // ... 其他字段
  })
}
```

**修改后**：
```typescript
// 首先，为所有司机创建初始统计数据
for (const driver of drivers) {
  statsMap.set(driver.id, {
    driverId: driver.id,
    driverName: getUserName(driver.id),
    driverPhone: driver.phone,           // ✅ 从 profiles 表读取手机号
    licensePlate: driver.license_plate,  // ✅ 从 profiles 表读取车牌号
    warehouseIds: [],
    warehouseNames: [],
    // ... 其他字段
  })
}
```

**数据来源**：
- `driver.phone`：从 `profiles` 表的 `phone` 字段读取
- `driver.license_plate`：从 `profiles` 表的 `license_plate` 字段读取

---

### 3. 界面显示增强

#### 司机信息头部重构

**修改前的显示结构**：
```
┌─────────────────────────────────────┐
│  👤  张三                           │
│      北京仓库                       │
│      入职: 2025/10/01 • 在职 45 天 │
└─────────────────────────────────────┘
```

**修改后的显示结构**：
```
┌─────────────────────────────────────┐
│  👤  张三  [新司机]                 │
│      📱 13800138000                 │
│      🚗 京A12345                    │
│      🏢 北京仓库                    │
│      入职: 2025/10/01 • 在职 7 天  │
└─────────────────────────────────────┘
```

#### 详细代码实现

**修改前**：
```tsx
{/* 司机信息头部 */}
<View className="flex items-center justify-between mb-4">
  <View className="flex items-center flex-1">
    <View className="i-mdi-account-circle text-4xl text-blue-600 mr-3" />
    <View className="flex-1">
      <Text className="text-base font-bold text-gray-800 block">{stats.driverName}</Text>
      <Text className="text-xs text-gray-500 block">
        {stats.warehouseNames.length > 0 ? stats.warehouseNames.join('、') : '未分配仓库'}
      </Text>
      {stats.joinDate && (
        <View className="flex items-center gap-2 mt-1">
          <Text className="text-xs text-gray-400">
            入职: {new Date(stats.joinDate).toLocaleDateString('zh-CN')}
          </Text>
          <Text className="text-xs text-gray-400">•</Text>
          <Text className="text-xs text-gray-400">在职 {stats.workingDays} 天</Text>
        </View>
      )}
    </View>
  </View>
</View>
```

**修改后**：
```tsx
{/* 司机信息头部 */}
<View className="flex items-center justify-between mb-4">
  <View className="flex items-center flex-1">
    <View className="i-mdi-account-circle text-4xl text-blue-600 mr-3" />
    <View className="flex-1">
      {/* 1. 司机姓名 + 新司机标签 */}
      <View className="flex items-center gap-2 mb-1">
        <Text className="text-base font-bold text-gray-800">{stats.driverName}</Text>
        {/* 新司机标签（入职7天内） */}
        {stats.workingDays <= 7 && (
          <View className="bg-gradient-to-r from-green-400 to-green-500 px-2 py-0.5 rounded-full">
            <Text className="text-xs text-white font-bold">新司机</Text>
          </View>
        )}
      </View>
      
      {/* 2. 手机号码 */}
      {stats.driverPhone && (
        <View className="flex items-center gap-1 mb-1">
          <View className="i-mdi-phone text-xs text-gray-400" />
          <Text className="text-xs text-gray-600">{stats.driverPhone}</Text>
        </View>
      )}
      
      {/* 3. 车牌号 */}
      {stats.licensePlate && (
        <View className="flex items-center gap-1 mb-1">
          <View className="i-mdi-car text-xs text-gray-400" />
          <Text className="text-xs text-gray-600">{stats.licensePlate}</Text>
        </View>
      )}
      
      {/* 4. 分配仓库 */}
      <View className="flex items-center gap-1 mb-1">
        <View className="i-mdi-warehouse text-xs text-gray-400" />
        <Text className="text-xs text-gray-600">
          {stats.warehouseNames.length > 0 ? stats.warehouseNames.join('、') : '未分配仓库'}
        </Text>
      </View>
      
      {/* 5. 入职时间和在职天数（一行显示） */}
      {stats.joinDate && (
        <View className="flex items-center gap-2 mt-1">
          <Text className="text-xs text-gray-400">
            入职: {new Date(stats.joinDate).toLocaleDateString('zh-CN')}
          </Text>
          <Text className="text-xs text-gray-400">•</Text>
          <Text className="text-xs text-gray-400">在职 {stats.workingDays} 天</Text>
        </View>
      )}
    </View>
  </View>
</View>
```

---

## 功能详解

### 1. 新司机标签

**判断逻辑**：
```typescript
{stats.workingDays <= 7 && (
  <View className="bg-gradient-to-r from-green-400 to-green-500 px-2 py-0.5 rounded-full">
    <Text className="text-xs text-white font-bold">新司机</Text>
  </View>
)}
```

**显示条件**：
- 在职天数 ≤ 7 天
- 自动计算，无需手动设置

**视觉效果**：
- 绿色渐变背景（from-green-400 to-green-500）
- 圆角徽章样式
- 白色粗体文字

**示例**：
```
张三  [新司机]    ← 入职 3 天，显示标签
李四              ← 入职 30 天，不显示标签
```

---

### 2. 手机号码显示

**显示逻辑**：
```typescript
{stats.driverPhone && (
  <View className="flex items-center gap-1 mb-1">
    <View className="i-mdi-phone text-xs text-gray-400" />
    <Text className="text-xs text-gray-600">{stats.driverPhone}</Text>
  </View>
)}
```

**数据来源**：
- 从 `profiles` 表的 `phone` 字段读取
- 如果没有手机号码，不显示该行

**视觉效果**：
- 📱 电话图标（i-mdi-phone）
- 灰色图标 + 深灰色文字
- 小字体显示

**示例**：
```
📱 13800138000
📱 18612345678
```

---

### 3. 车牌号显示

**显示逻辑**：
```typescript
{stats.licensePlate && (
  <View className="flex items-center gap-1 mb-1">
    <View className="i-mdi-car text-xs text-gray-400" />
    <Text className="text-xs text-gray-600">{stats.licensePlate}</Text>
  </View>
)}
```

**数据来源**：
- 从 `profiles` 表的 `license_plate` 字段读取
- 如果没有车牌号，不显示该行

**视觉效果**：
- 🚗 汽车图标（i-mdi-car）
- 灰色图标 + 深灰色文字
- 小字体显示

**示例**：
```
🚗 京A12345
🚗 沪B67890
```

---

### 4. 信息显示顺序

**新的显示顺序**：
1. **司机姓名 + 新司机标签**（一行）
2. **手机号码**（单独一行，有图标）
3. **车牌号**（单独一行，有图标）
4. **分配仓库**（单独一行，有图标）
5. **入职时间 + 在职天数**（一行，用 • 分隔）

**完整示例**：
```
┌─────────────────────────────────────────────────────────┐
│  👤  张三  [新司机]                                     │
│      📱 13800138000                                     │
│      🚗 京A12345                                        │
│      🏢 北京仓库                                        │
│      入职: 2025/11/08 • 在职 7 天                      │
└─────────────────────────────────────────────────────────┘
```

---

## 视觉效果对比

### 修复前

```
司机出勤统计                        2025-11 月数据
┌─────────────────────────────────────────────────────────┐
│  👤  张三                                               │
│      北京仓库                                           │
│      入职: 2025/11/08 • 在职 7 天                      │
│                                                         │
│      ⭕ 100%  实际出勤: 7 / 7 天                        │
│               打卡次数: 7 次                            │
└─────────────────────────────────────────────────────────┘

❌ 缺少：新司机标签、手机号码、车牌号
❌ 信息不够详细
```

### 修复后

```
司机出勤统计                        2025-11 月数据
┌─────────────────────────────────────────────────────────┐
│  👤  张三  [新司机]                                     │
│      📱 13800138000                                     │
│      🚗 京A12345                                        │
│      🏢 北京仓库                                        │
│      入职: 2025/11/08 • 在职 7 天                      │
│                                                         │
│      ⭕ 100%  实际出勤: 7 / 7 天                        │
│               打卡次数: 7 次                            │
└─────────────────────────────────────────────────────────┘

✅ 新增：新司机标签、手机号码、车牌号
✅ 信息更加详细和完整
✅ 显示顺序更加合理
```

---

## 技术要点

### 1. 条件渲染

所有新增字段都使用条件渲染，确保数据不存在时不显示：

```typescript
{/* 只有在有手机号码时才显示 */}
{stats.driverPhone && (
  <View>...</View>
)}

{/* 只有在有车牌号时才显示 */}
{stats.licensePlate && (
  <View>...</View>
)}

{/* 只有在入职7天内才显示新司机标签 */}
{stats.workingDays <= 7 && (
  <View>...</View>
)}
```

### 2. 图标使用

使用 Material Design Icons (mdi) 图标：
- `i-mdi-phone`：电话图标
- `i-mdi-car`：汽车图标
- `i-mdi-warehouse`：仓库图标
- `i-mdi-account-circle`：用户头像图标

### 3. 样式统一

所有信息行使用统一的样式：
```typescript
<View className="flex items-center gap-1 mb-1">
  <View className="i-mdi-xxx text-xs text-gray-400" />  {/* 图标 */}
  <Text className="text-xs text-gray-600">内容</Text>   {/* 文字 */}
</View>
```

### 4. 数据来源

所有数据都来自 `profiles` 表：
- `phone`：手机号码字段
- `license_plate`：车牌号字段
- `join_date`：入职日期字段

---

## 测试建议

### 测试场景1：新司机（入职7天内）

1. 创建一个新司机，入职日期为今天
2. 添加手机号码和车牌号
3. 打开考勤管理页面
4. 验证：
   - 显示"新司机"标签 ✅
   - 显示手机号码 ✅
   - 显示车牌号 ✅
   - 显示分配仓库 ✅
   - 显示入职时间和在职天数 ✅

### 测试场景2：老司机（入职超过7天）

1. 创建一个司机，入职日期为30天前
2. 添加手机号码和车牌号
3. 打开考勤管理页面
4. 验证：
   - 不显示"新司机"标签 ✅
   - 显示手机号码 ✅
   - 显示车牌号 ✅
   - 显示分配仓库 ✅
   - 显示入职时间和在职天数 ✅

### 测试场景3：没有手机号码和车牌号

1. 创建一个司机，不添加手机号码和车牌号
2. 打开考勤管理页面
3. 验证：
   - 不显示手机号码行 ✅
   - 不显示车牌号行 ✅
   - 其他信息正常显示 ✅

### 测试场景4：只有手机号码，没有车牌号

1. 创建一个司机，只添加手机号码
2. 打开考勤管理页面
3. 验证：
   - 显示手机号码 ✅
   - 不显示车牌号行 ✅
   - 其他信息正常显示 ✅

### 测试场景5：只有车牌号，没有手机号码

1. 创建一个司机，只添加车牌号
2. 打开考勤管理页面
3. 验证：
   - 不显示手机号码行 ✅
   - 显示车牌号 ✅
   - 其他信息正常显示 ✅

### 测试场景6：信息显示顺序

1. 创建一个司机，添加所有信息
2. 打开考勤管理页面
3. 验证显示顺序：
   - 第1行：司机姓名 + 新司机标签 ✅
   - 第2行：手机号码 ✅
   - 第3行：车牌号 ✅
   - 第4行：分配仓库 ✅
   - 第5行：入职时间 + 在职天数 ✅

---

## 数据库字段说明

### profiles 表相关字段

| 字段名 | 类型 | 说明 | 示例 |
|--------|------|------|------|
| `phone` | text | 手机号码 | '13800138000' |
| `license_plate` | text | 车牌号 | '京A12345' |
| `join_date` | date | 入职日期 | '2025-11-08' |

### 字段使用

```typescript
// 从 profiles 表读取
const driver: Profile = {
  id: 'xxx',
  name: '张三',
  phone: '13800138000',        // ✅ 手机号码
  license_plate: '京A12345',   // ✅ 车牌号
  join_date: '2025-11-08',     // ✅ 入职日期
  role: 'driver'
}

// 在 DriverStats 中使用
const stats: DriverStats = {
  driverId: driver.id,
  driverName: driver.name,
  driverPhone: driver.phone,           // ✅ 显示手机号码
  licensePlate: driver.license_plate,  // ✅ 显示车牌号
  joinDate: driver.join_date,          // ✅ 计算在职天数
  workingDays: calculateWorkingDays(driver.join_date)  // ✅ 判断是否新司机
}
```

---

## 核心改进总结

### 改进1：新司机标识

✅ **自动标识新司机**
- 入职7天内自动显示"新司机"标签
- 绿色渐变徽章，醒目易识别

✅ **无需手动设置**
- 根据入职日期自动计算
- 动态更新，无需维护

### 改进2：联系方式显示

✅ **显示手机号码**
- 方便快速联系司机
- 带电话图标，清晰直观

✅ **显示车牌号**
- 快速识别司机车辆
- 带汽车图标，一目了然

### 改进3：信息组织优化

✅ **合理的显示顺序**
- 按重要性排序
- 相关信息分组显示

✅ **清晰的视觉层次**
- 使用图标增强识别
- 统一的样式风格

### 改进4：用户体验提升

✅ **信息更完整**
- 一次性查看所有关键信息
- 减少查找时间

✅ **界面更友好**
- 图标 + 文字，易于理解
- 条件显示，避免空白

---

## 注意事项

### 1. 数据完整性

- 手机号码和车牌号可能为空
- 使用条件渲染避免显示空值
- 确保界面在数据不完整时也能正常显示

### 2. 新司机判断

- 新司机标签基于在职天数（≤ 7 天）
- 自动计算，无需手动维护
- 超过7天后自动消失

### 3. 显示顺序

- 按照用户要求的顺序显示
- 手机号码、车牌、分配仓库、入职时间、在职天数
- 最后两个（入职时间和在职天数）在一行显示

### 4. 图标使用

- 所有图标使用 Material Design Icons
- 统一的图标大小和颜色
- 确保图标与文字对齐

---

## 影响范围

### 修改的文件

1. `src/pages/manager/leave-approval/index.tsx`
   - 修改 `DriverStats` 接口
   - 修改数据初始化逻辑
   - 修改司机信息显示部分

2. `src/pages/super-admin/leave-approval/index.tsx`
   - 修改 `DriverStats` 接口
   - 修改数据初始化逻辑
   - 修改司机信息显示部分

### 影响的功能

- ✅ 考勤管理 - 司机出勤统计标签页
- ✅ 普通管理端
- ✅ 超级管理端

### 不影响的功能

- ❌ 请假申请标签页
- ❌ 离职申请标签页
- ❌ 打卡记录标签页
- ❌ 司机汇总页面（已有新司机标签）

---

**修复完成时间**: 2025-11-15  
**修复状态**: ✅ 完成  
**影响范围**: 普通管理端 + 超级管理端  
**修改文件**: 2 个  
**核心改进**: 新司机标识 + 联系方式显示 + 信息组织优化 + 用户体验提升  
**重要性**: ⭐⭐⭐⭐⭐ 重要改进，大幅提升信息完整性和用户体验
