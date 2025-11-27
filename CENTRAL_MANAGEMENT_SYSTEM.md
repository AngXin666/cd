# 中央管理系统

## 概述

车队管家小程序采用**中央管理系统架构**，所有数据统一管理，无需多租户隔离。

## 系统架构

### 单一数据库架构

```
┌─────────────────────────────────────────────────────────┐
│                   应用层 (Application Layer)              │
│  - 用户登录后访问统一的数据库                              │
│  - 使用单一的 Supabase 客户端                             │
│  - 所有数据操作在同一个数据库中进行                         │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│              数据层 (Data Layer)                         │
│  - Public Schema                                         │
│  - 所有表存储在同一个 Schema 中                           │
│  - 通过 RLS 策略控制数据访问权限                          │
└─────────────────────────────────────────────────────────┘
```

## 管理员账号

### 默认管理员

系统已创建默认管理员账号：

- **用户名**：admin@fleet.com
- **密码**：hye19911206
- **角色**：super_admin（超级管理员）
- **权限**：拥有系统所有权限

### 登录方式

1. 打开小程序或 H5 页面
2. 点击"登录"按钮
3. 输入用户名：admin@fleet.com
4. 输入密码：hye19911206
5. 点击"登录"

## 权限系统

### 角色类型

系统支持以下角色：

1. **super_admin（超级管理员）**
   - 拥有所有权限
   - 可以管理所有用户
   - 可以管理所有数据
   - 可以配置系统设置

2. **manager（管理员）**
   - 可以管理司机
   - 可以管理车辆
   - 可以查看报表
   - 可以审批请假

3. **driver（司机）**
   - 可以查看自己的信息
   - 可以打卡签到
   - 可以提交计件工作
   - 可以申请请假

4. **lease_admin（租赁管理员）**
   - 可以管理租赁业务
   - 可以查看租赁报表
   - 可以管理租赁合同

### 权限控制

系统通过 Row Level Security (RLS) 策略控制数据访问权限：

- **超级管理员**：可以访问所有数据
- **管理员**：可以访问自己管理的数据
- **司机**：只能访问自己的数据
- **租赁管理员**：可以访问租赁相关数据

## 数据库结构

### 核心表

1. **profiles** - 用户信息表
   - 存储所有用户的基本信息
   - 包含角色、姓名、电话、邮箱等

2. **warehouses** - 仓库表
   - 存储仓库信息
   - 包含仓库名称、地址、容量等

3. **drivers** - 司机表
   - 存储司机信息
   - 包含司机姓名、电话、驾照等

4. **vehicles** - 车辆表
   - 存储车辆信息
   - 包含车牌号、车型、状态等

5. **attendance** - 考勤表
   - 存储考勤记录
   - 包含打卡时间、地点等

6. **piece_work_records** - 计件工作记录表
   - 存储计件工作记录
   - 包含工作类型、数量、金额等

7. **leave_applications** - 请假申请表
   - 存储请假申请
   - 包含请假类型、时间、原因等

## 使用 Supabase 客户端

### 导入客户端

```typescript
import { supabase } from '@/client/supabase'
```

### 查询数据

```typescript
// 查询所有仓库
const { data: warehouses } = await supabase
  .from('warehouses')
  .select('*')

// 查询所有司机
const { data: drivers } = await supabase
  .from('drivers')
  .select('*')
```

### 插入数据

```typescript
// 创建仓库
const { data, error } = await supabase
  .from('warehouses')
  .insert({
    name: '仓库A',
    address: '北京市朝阳区',
    capacity: 100
  })
```

### 更新数据

```typescript
// 更新仓库
const { data, error } = await supabase
  .from('warehouses')
  .update({ capacity: 150 })
  .eq('id', warehouseId)
```

### 删除数据

```typescript
// 删除仓库
const { error } = await supabase
  .from('warehouses')
  .delete()
  .eq('id', warehouseId)
```

## 认证系统

### 使用 miaoda-auth-taro

系统使用 `miaoda-auth-taro` 提供的认证功能：

```typescript
import { useAuth } from 'miaoda-auth-taro'

const MyComponent: React.FC = () => {
  const { user, isAuthenticated, login, logout } = useAuth()

  if (!isAuthenticated) {
    return <Button onClick={login}>登录</Button>
  }

  return (
    <View>
      <Text>欢迎，{user?.email}</Text>
      <Button onClick={logout}>退出</Button>
    </View>
  )
}
```

### 路由守卫

需要登录才能访问的页面使用 `guard` 参数：

```typescript
import { useAuth } from 'miaoda-auth-taro'

const ProtectedPage: React.FC = () => {
  const { user } = useAuth({ guard: true })

  return (
    <View>
      <Text>受保护的页面</Text>
      <Text>当前用户：{user?.email}</Text>
    </View>
  )
}
```

## 最佳实践

### 1. 始终使用封装的 API 函数

```typescript
// ✅ 推荐：使用 src/db/api.ts 中的函数
import { getAllWarehouses } from '@/db/api'
const warehouses = await getAllWarehouses()

// ❌ 不推荐：直接使用 Supabase 客户端
import { supabase } from '@/client/supabase'
const { data } = await supabase.from('warehouses').select('*')
```

### 2. 错误处理

```typescript
try {
  const warehouses = await getAllWarehouses()
  // 处理数据
} catch (error) {
  console.error('获取仓库列表失败:', error)
  Taro.showToast({
    title: '获取数据失败',
    icon: 'none'
  })
}
```

### 3. 类型安全

```typescript
import type { Warehouse } from '@/db/types'

const warehouse: Warehouse = {
  id: '123',
  name: '仓库A',
  address: '北京市朝阳区',
  capacity: 100,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
}
```

## 数据库迁移

### 应用迁移

系统使用 Supabase 迁移管理数据库结构：

```bash
# 查看迁移文件
ls supabase/migrations/

# 应用迁移（通过 Supabase 工具）
# 迁移会自动应用到数据库
```

### 迁移文件

- `10002_create_admin_account.sql` - 创建管理员账号

## 故障排查

### 问题 1：无法登录

**原因**：账号不存在或密码错误

**解决方案**：
1. 确认使用正确的用户名和密码
2. 检查数据库中是否存在该账号
3. 重新运行迁移创建管理员账号

### 问题 2：权限不足

**原因**：用户角色权限不够

**解决方案**：
1. 检查用户的角色
2. 确认 RLS 策略配置正确
3. 使用管理员账号登录

### 问题 3：数据查询失败

**原因**：RLS 策略限制或网络问题

**解决方案**：
1. 检查网络连接
2. 确认用户已登录
3. 检查 RLS 策略配置

## 相关文档

- [README.md](README.md) - 项目主文档
- [API 使用指南](docs/API_GUIDE.md) - API 使用说明
- [数据库架构](supabase/migrations/README.md) - 数据库结构说明

## 更新日志

### 2025-11-05
- ✅ 删除多租户系统
- ✅ 创建中央管理系统
- ✅ 创建管理员账号（admin/hye19911206）
- ✅ 更新文档
