# 添加平级老板账号功能说明

## 更新时间
2025-11-27

## 功能概述

老板现在可以在用户管理页面添加平级老板账号，这些平级账号拥有与主账号相同的权限，但会被标记为平级账号（通过 `main_account_id` 字段）。

## 功能特点

### 1. 角色选择
在添加用户时，现在有三个角色选项：
- **司机** - 普通司机账号
- **管理员** - 车队长账号
- **老板** - 平级老板账号（新增）

### 2. 平级账号特性
- **完全权限**: 平级老板账号拥有与主账号相同的完全权限
- **独立登录**: 每个平级账号都有独立的手机号和密码
- **标记识别**: 通过 `main_account_id` 字段标记为平级账号
- **无需仓库**: 老板账号不需要分配仓库

### 3. 权限说明
- **主账号**: `main_account_id` 为 `null`，可以添加平级账号
- **平级账号**: `main_account_id` 指向主账号ID，拥有完全权限但不能再添加其他平级账号

## 技术实现

### 1. 前端修改

#### 文件: `src/pages/super-admin/user-management/index.tsx`

**修改内容**:

1. **状态类型扩展**
```typescript
// 修改前
const [newUserRole, setNewUserRole] = useState<'driver' | 'manager'>('driver')

// 修改后
const [newUserRole, setNewUserRole] = useState<'driver' | 'manager' | 'boss'>('driver')
```

2. **UI 添加老板选项**
```tsx
{/* 新增老板角色选择按钮 */}
<View
  onClick={() => setNewUserRole('boss')}
  className={`flex-1 flex items-center justify-center rounded-lg py-2.5 border-2 transition-all ${
    newUserRole === 'boss'
      ? 'bg-blue-600 border-blue-600'
      : 'bg-white border-gray-300 active:bg-gray-50'
  }`}>
  <View
    className={`i-mdi-account-star text-base mr-1.5 ${
      newUserRole === 'boss' ? 'text-white' : 'text-gray-600'
    }`}
  />
  <Text
    className={`text-sm font-medium ${newUserRole === 'boss' ? 'text-white' : 'text-gray-700'}`}>
    老板
  </Text>
</View>
```

3. **仓库分配条件判断**
```tsx
{/* 仓库分配（老板角色不需要） */}
{newUserRole !== 'boss' && (
  <View className="mb-3">
    {/* 仓库选择UI */}
  </View>
)}
```

4. **添加用户逻辑**
```typescript
// 如果是添加老板角色，需要特殊处理
if (newUserRole === 'boss') {
  // 1. 在 Supabase Auth 中创建用户
  const {data: authData, error: authError} = await supabase.auth.signUp({
    phone: newUserPhone.trim(),
    password: '123456',
    options: {
      data: {
        name: newUserName.trim()
      }
    }
  })

  // 2. 在 profiles 表中创建记录，设置为平级账号
  const {data: profile, error: profileError} = await supabase
    .from('profiles')
    .insert({
      id: authData.user.id,
      name: newUserName.trim(),
      phone: newUserPhone.trim(),
      role: 'super_admin',
      permission_type: 'full',
      status: 'active',
      main_account_id: user?.id // 设置主账号ID
    })
    .select()
    .maybeSingle()

  newUser = profile
}
```

5. **验证逻辑调整**
```typescript
// 验证仓库选择（司机和管理员需要，老板不需要）
if (newUserRole !== 'boss' && newUserWarehouseIds.length === 0) {
  const roleText = newUserRole === 'driver' ? '司机' : '管理员'
  showToast({title: `请为${roleText}至少选择一个仓库`, icon: 'none'})
  return
}
```

6. **成功提示信息**
```typescript
const roleText = newUserRole === 'driver' ? '司机' : newUserRole === 'manager' ? '管理员' : '老板（平级账号）'

let content = `姓名：${newUserName.trim()}\n手机号码：${newUserPhone.trim()}\n用户角色：${roleText}\n`

if (newUserRole !== 'boss') {
  const warehouseNames = warehouses
    .filter((w) => newUserWarehouseIds.includes(w.id))
    .map((w) => w.name)
    .join('、')
  content += `分配仓库：${warehouseNames}\n`
}

content += `登录账号：${loginAccount}\n默认密码：${defaultPassword}`
```

### 2. 数据库结构

#### profiles 表字段
- `id` (uuid) - 用户ID
- `name` (text) - 姓名
- `phone` (text) - 手机号
- `role` (text) - 角色（'super_admin' 表示老板）
- `permission_type` (text) - 权限类型（'full' 表示完全权限）
- `status` (text) - 状态
- `main_account_id` (uuid) - 主账号ID（null 表示主账号，非 null 表示平级账号）

## 使用流程

### 1. 添加平级老板账号

1. 登录主老板账号
2. 进入"用户管理"页面
3. 点击"添加用户"按钮
4. 填写信息：
   - 手机号：15800000000
   - 姓名：张三
   - 选择角色：**老板**
5. 点击"添加用户"按钮
6. 系统显示创建成功信息：
   ```
   姓名：张三
   手机号码：15800000000
   用户角色：老板（平级账号）
   登录账号：15800000000@fleet.com
   默认密码：123456
   ```

### 2. 平级账号登录

平级老板账号可以使用以下方式登录：
1. **手机号 + 密码**
   - 手机号：15800000000
   - 密码：123456

2. **手机号 + 验证码**
   - 手机号：15800000000
   - 验证码：（发送到手机）

### 3. 平级账号权限

平级老板账号登录后：
- ✅ 可以查看所有数据
- ✅ 可以管理司机和管理员
- ✅ 可以管理车辆和仓库
- ✅ 可以查看统计数据
- ❌ 不能添加其他平级老板账号（只有主账号可以）

## 界面展示

### 添加用户表单

```
┌─────────────────────────────────┐
│ 手机号                          │
│ [输入框]                        │
├─────────────────────────────────┤
│ 姓名                            │
│ [输入框]                        │
├─────────────────────────────────┤
│ 用户角色                        │
│ ┌──────┐ ┌──────┐ ┌──────┐    │
│ │ 司机 │ │管理员│ │ 老板 │    │
│ └──────┘ └──────┘ └──────┘    │
├─────────────────────────────────┤
│ （选择老板时，不显示仓库分配）  │
├─────────────────────────────────┤
│ 密码提示                        │
│ 默认密码：123456                │
└─────────────────────────────────┘
```

## 注意事项

### 1. 主账号识别
- 主账号的 `main_account_id` 为 `null`
- 平级账号的 `main_account_id` 指向主账号的 ID

### 2. 权限控制
- 只有主账号可以添加平级账号
- 平级账号不能再添加其他平级账号
- 所有老板账号（主账号和平级账号）都有完全权限

### 3. 数据隔离
- 所有老板账号共享同一个租户的数据
- 不同租户的数据完全隔离

### 4. 安全建议
- 建议平级账号创建后立即修改默认密码
- 建议为每个平级账号设置不同的手机号
- 建议定期审查平级账号的使用情况

## 测试验证

### 测试步骤

1. **创建平级账号**
   - 使用主账号登录
   - 添加一个老板角色的用户
   - 验证创建成功

2. **平级账号登录**
   - 使用新创建的手机号和默认密码登录
   - 验证可以正常登录

3. **权限验证**
   - 使用平级账号查看各个功能模块
   - 验证所有功能都可以正常使用

4. **数据一致性**
   - 主账号和平级账号查看相同的数据
   - 验证数据完全一致

### 预期结果

- ✅ 可以成功创建平级老板账号
- ✅ 平级账号可以正常登录
- ✅ 平级账号拥有完全权限
- ✅ 主账号和平级账号看到相同的数据
- ✅ 平级账号不显示仓库分配选项

## 相关文件

- `src/pages/super-admin/user-management/index.tsx` - 用户管理页面
- `src/db/types.ts` - 类型定义
- `src/db/api.ts` - API 函数

## 后续优化建议

1. **权限细化**: 可以考虑为平级账号设置不同的权限级别
2. **审计日志**: 记录平级账号的操作日志
3. **账号管理**: 添加平级账号的启用/禁用功能
4. **批量操作**: 支持批量创建平级账号
