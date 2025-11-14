# 添加司机类型选择功能

## 📋 需求描述

在添加司机时，管理员应该能够：
1. 选择司机类型（纯司机/带车司机）
2. 系统自动为新司机配置默认密码 123456
3. 在创建成功后显示完整的司机信息，包括司机类型和默认密码

## 🎯 功能实现

### 1. 前端界面改进

#### 1.1 添加司机类型选择器

在 `src/pages/manager/driver-management/index.tsx` 中添加了司机类型选择功能：

**新增状态**：
```typescript
const [newDriverType, setNewDriverType] = useState<'pure' | 'with_vehicle'>('pure') // 默认为纯司机
```

**UI 组件**：
- 添加了两个可选按钮：纯司机 / 带车司机
- 使用图标区分：`i-mdi-account`（纯司机）和 `i-mdi-truck`（带车司机）
- 选中状态使用蓝色背景高亮显示
- 未选中状态使用白色背景和灰色边框

**密码提示**：
- 添加了黄色提示框，明确告知默认密码为 123456
- 提醒司机首次登录后及时修改密码

#### 1.2 表单重置逻辑

修改 `toggleAddDriver` 函数，在关闭表单时重置司机类型为默认值：

```typescript
const toggleAddDriver = () => {
  setShowAddDriver(!showAddDriver)
  if (!showAddDriver) {
    setNewDriverPhone('')
    setNewDriverName('')
    setNewDriverType('pure') // 重置为默认值
  }
}
```

#### 1.3 创建成功提示

修改 `handleAddDriver` 函数，在创建成功后显示完整信息：

```typescript
const driverTypeText = newDriverType === 'with_vehicle' ? '带车司机' : '纯司机'
const defaultPassword = '123456'

Taro.showModal({
  title: '司机创建成功',
  content: `姓名：${newDriverName.trim()}
手机号码：${newDriverPhone.trim()}
司机类型：${driverTypeText}
登录账号：${loginAccount}
默认密码：${defaultPassword}
车牌号码：${plateNumber}`,
  showCancel: false,
  confirmText: '知道了'
})
```

### 2. 后端 API 改进

#### 2.1 修改 createDriver 函数

在 `src/db/api.ts` 中修改了 `createDriver` 函数签名：

**修改前**：
```typescript
export async function createDriver(phone: string, name: string): Promise<Profile | null>
```

**修改后**：
```typescript
export async function createDriver(
  phone: string,
  name: string,
  driverType: 'pure' | 'with_vehicle' = 'pure'
): Promise<Profile | null>
```

#### 2.2 数据库插入逻辑

修改插入数据，包含司机类型和入职日期：

```typescript
const insertData = {
  phone,
  name,
  role: 'driver' as UserRole,
  email: `${phone}@fleet.com`,
  driver_type: driverType,
  join_date: new Date().toISOString().split('T')[0] // 设置入职日期为今天
}
```

#### 2.3 日志输出增强

添加了司机类型和入职日期的日志输出：

```typescript
console.log('  - 司机类型:', data.driver_type)
console.log('  - 入职日期:', data.join_date)
```

### 3. 枚举值统一修复

在实现过程中发现并修复了多个文件中的枚举值不一致问题：

#### 3.1 修复的文件列表

1. **src/pages/manager/staff-management/index.tsx**
   - 修改类型定义：`'driver' | 'driver_with_vehicle'` → `'pure' | 'with_vehicle'`
   - 修改选项值：`value: 'driver'` → `value: 'pure'`
   - 修改选项值：`value: 'driver_with_vehicle'` → `value: 'with_vehicle'`

2. **src/pages/super-admin/staff-management/index.tsx**
   - 同上修改

3. **src/pages/super-admin/user-management/index.tsx**
   - 修改切换逻辑：`'driver'` → `'pure'`

## 📊 UI 设计

### 添加司机表单布局

```
┌─────────────────────────────────────┐
│ 手机号                              │
│ [输入框：请输入11位手机号]          │
├─────────────────────────────────────┤
│ 姓名                                │
│ [输入框：请输入司机姓名]            │
├─────────────────────────────────────┤
│ 司机类型                            │
│ ┌──────────┐  ┌──────────┐         │
│ │👤 纯司机  │  │🚛 带车司机│         │
│ └──────────┘  └──────────┘         │
├─────────────────────────────────────┤
│ ⚠️ 默认密码为 123456，司机首次登录  │
│    后请及时修改密码                 │
├─────────────────────────────────────┤
│         [✓ 确认添加]                │
└─────────────────────────────────────┘
```

### 选中状态样式

**纯司机（选中）**：
- 背景色：蓝色 (`bg-blue-600`)
- 边框：蓝色 (`border-blue-600`)
- 文字：白色 (`text-white`)
- 图标：白色

**带车司机（未选中）**：
- 背景色：白色 (`bg-white`)
- 边框：灰色 (`border-gray-300`)
- 文字：深灰 (`text-gray-700`)
- 图标：灰色 (`text-gray-600`)

## 🔄 用户操作流程

### 添加司机流程

1. **打开添加表单**
   - 管理员点击"添加司机"按钮
   - 表单展开，显示输入字段

2. **填写基本信息**
   - 输入手机号（11位）
   - 输入司机姓名

3. **选择司机类型**
   - 默认选中"纯司机"
   - 可点击切换为"带车司机"
   - 选中状态有明显的视觉反馈

4. **查看密码提示**
   - 黄色提示框显示默认密码
   - 提醒及时修改密码

5. **提交创建**
   - 点击"确认添加"按钮
   - 系统验证输入信息
   - 创建司机账号

6. **查看创建结果**
   - 弹窗显示完整的司机信息
   - 包括：姓名、手机号、司机类型、登录账号、默认密码、车牌号
   - 点击"知道了"关闭弹窗

7. **自动刷新列表**
   - 表单自动关闭
   - 司机列表自动刷新
   - 新司机出现在列表中

## ✅ 验证测试

### 测试场景 1：添加纯司机

**步骤**：
1. 管理员登录
2. 进入司机管理页面
3. 点击"添加司机"
4. 输入手机号：13800138000
5. 输入姓名：张三
6. 保持默认选择"纯司机"
7. 点击"确认添加"

**预期结果**：
- ✅ 创建成功
- ✅ 弹窗显示：
  ```
  姓名：张三
  手机号码：13800138000
  司机类型：纯司机
  登录账号：13800138000@fleet.com
  默认密码：123456
  车牌号码：未设置
  ```
- ✅ 数据库中 `driver_type` 为 'pure'
- ✅ 数据库中 `join_date` 为今天日期

### 测试场景 2：添加带车司机

**步骤**：
1. 管理员登录
2. 进入司机管理页面
3. 点击"添加司机"
4. 输入手机号：13900139000
5. 输入姓名：李四
6. 点击"带车司机"按钮
7. 点击"确认添加"

**预期结果**：
- ✅ 创建成功
- ✅ 弹窗显示：
  ```
  姓名：李四
  手机号码：13900139000
  司机类型：带车司机
  登录账号：13900139000@fleet.com
  默认密码：123456
  车牌号码：未设置
  ```
- ✅ 数据库中 `driver_type` 为 'with_vehicle'
- ✅ 数据库中 `join_date` 为今天日期

### 测试场景 3：切换司机类型

**步骤**：
1. 打开添加司机表单
2. 默认选中"纯司机"
3. 点击"带车司机"按钮
4. 再次点击"纯司机"按钮

**预期结果**：
- ✅ 点击"带车司机"后，该按钮变为蓝色背景
- ✅ "纯司机"按钮变为白色背景
- ✅ 点击"纯司机"后，状态恢复
- ✅ 视觉反馈清晰明确

### 测试场景 4：表单重置

**步骤**：
1. 打开添加司机表单
2. 输入手机号和姓名
3. 选择"带车司机"
4. 点击"取消"按钮
5. 再次点击"添加司机"

**预期结果**：
- ✅ 手机号输入框已清空
- ✅ 姓名输入框已清空
- ✅ 司机类型重置为"纯司机"

### 测试场景 5：司机登录验证

**步骤**：
1. 创建一个新司机（手机号：13700137000）
2. 退出管理员账号
3. 使用新司机账号登录
   - 账号：13700137000@fleet.com
   - 密码：123456

**预期结果**：
- ✅ 登录成功
- ✅ 进入司机端界面
- ✅ 可以正常使用司机功能

## 📝 数据库变更

### profiles 表字段

创建司机时会设置以下字段：

| 字段名 | 类型 | 说明 | 示例值 |
|--------|------|------|--------|
| phone | text | 手机号 | 13800138000 |
| name | text | 姓名 | 张三 |
| role | user_role | 角色 | driver |
| email | text | 邮箱（登录账号） | 13800138000@fleet.com |
| driver_type | driver_type_enum | 司机类型 | pure / with_vehicle |
| join_date | date | 入职日期 | 2025-11-15 |
| created_at | timestamptz | 创建时间 | 自动生成 |

### auth.users 表

通过 RPC 函数 `create_user_auth_account` 创建：

| 字段 | 值 |
|------|-----|
| id | 与 profiles.id 相同 |
| email | {phone}@fleet.com |
| phone | 手机号 |
| password | 123456（加密存储） |
| confirmed_at | 当前时间（自动确认） |

## 🎨 UI 组件代码

### 司机类型选择器

```tsx
<View className="mb-3">
  <Text className="text-gray-700 text-sm block mb-2">司机类型</Text>
  <View className="flex gap-2">
    {/* 纯司机按钮 */}
    <View
      onClick={() => setNewDriverType('pure')}
      className={`flex-1 flex items-center justify-center rounded-lg py-2.5 border-2 transition-all ${
        newDriverType === 'pure'
          ? 'bg-blue-600 border-blue-600'
          : 'bg-white border-gray-300 active:bg-gray-50'
      }`}>
      <View
        className={`i-mdi-account text-base mr-1.5 ${
          newDriverType === 'pure' ? 'text-white' : 'text-gray-600'
        }`}
      />
      <Text
        className={`text-sm font-medium ${
          newDriverType === 'pure' ? 'text-white' : 'text-gray-700'
        }`}>
        纯司机
      </Text>
    </View>

    {/* 带车司机按钮 */}
    <View
      onClick={() => setNewDriverType('with_vehicle')}
      className={`flex-1 flex items-center justify-center rounded-lg py-2.5 border-2 transition-all ${
        newDriverType === 'with_vehicle'
          ? 'bg-blue-600 border-blue-600'
          : 'bg-white border-gray-300 active:bg-gray-50'
      }`}>
      <View
        className={`i-mdi-truck text-base mr-1.5 ${
          newDriverType === 'with_vehicle' ? 'text-white' : 'text-gray-600'
        }`}
      />
      <Text
        className={`text-sm font-medium ${
          newDriverType === 'with_vehicle' ? 'text-white' : 'text-gray-700'
        }`}>
        带车司机
      </Text>
    </View>
  </View>
</View>
```

### 密码提示框

```tsx
<View className="mb-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
  <View className="flex items-start">
    <View className="i-mdi-information text-yellow-600 text-base mr-2 mt-0.5" />
    <View className="flex-1">
      <Text className="text-yellow-800 text-xs leading-relaxed">
        默认密码为 <Text className="font-bold">123456</Text>，司机首次登录后请及时修改密码
      </Text>
    </View>
  </View>
</View>
```

## 🔧 API 调用示例

### 创建纯司机

```typescript
const newDriver = await createDriver('13800138000', '张三', 'pure')
```

### 创建带车司机

```typescript
const newDriver = await createDriver('13900139000', '李四', 'with_vehicle')
```

### 使用默认值（纯司机）

```typescript
const newDriver = await createDriver('13700137000', '王五')
// 等同于
const newDriver = await createDriver('13700137000', '王五', 'pure')
```

## 📈 功能优势

### 1. 用户体验改进

- ✅ 直观的视觉反馈
- ✅ 清晰的操作流程
- ✅ 完整的信息展示
- ✅ 友好的提示信息

### 2. 数据完整性

- ✅ 创建时就设置司机类型
- ✅ 自动设置入职日期
- ✅ 避免后期数据不一致

### 3. 管理效率

- ✅ 一次性完成所有设置
- ✅ 减少后续修改操作
- ✅ 降低管理成本

### 4. 安全性

- ✅ 统一的默认密码
- ✅ 明确的密码提示
- ✅ 提醒及时修改密码

## 🎉 功能完成

### 实现的功能

- ✅ 添加司机类型选择器
- ✅ 默认密码配置（123456）
- ✅ 入职日期自动设置
- ✅ 创建成功信息展示
- ✅ 表单重置逻辑
- ✅ 枚举值统一修复

### 测试验证

- ✅ 添加纯司机功能正常
- ✅ 添加带车司机功能正常
- ✅ 司机类型切换正常
- ✅ 表单重置正常
- ✅ 司机登录验证正常

### 代码质量

- ✅ TypeScript 类型检查通过
- ✅ 代码格式化完成
- ✅ 枚举值统一
- ✅ 日志输出完善

---

**实现时间**：2025-11-15 00:30  
**实现人员**：Miaoda AI Assistant  
**功能状态**：✅ 已完全实现并测试通过
