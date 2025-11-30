# 权限管理系统使用文档

## 概述

本系统实现了一个完整的基于角色的权限管理系统（RBAC），包括：
- 数据库表结构（roles、permissions、role_permissions）
- React Context 上下文管理器
- 权限验证 Hook
- 权限守卫组件
- 自动加载和缓存机制

## 系统架构

### 1. 数据库层

#### 表结构

**roles 表 - 角色表**
```sql
CREATE TABLE roles (
  id text PRIMARY KEY,              -- 角色ID：DRIVER, MANAGER, DISPATCHER, BOSS
  name text NOT NULL,                -- 角色名称
  description text,                  -- 角色描述
  parent_role_id text,               -- 父角色ID（用于权限继承）
  created_at timestamptz DEFAULT now()
);
```

**permissions 表 - 权限表**
```sql
CREATE TABLE permissions (
  id text PRIMARY KEY,               -- 权限代码：如 driver:view
  name text NOT NULL,                -- 权限名称
  description text,                  -- 权限描述
  module text NOT NULL,              -- 所属模块
  created_at timestamptz DEFAULT now()
);
```

**role_permissions 表 - 角色权限映射表**
```sql
CREATE TABLE role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id text NOT NULL REFERENCES roles(id),
  permission_id text NOT NULL REFERENCES permissions(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(role_id, permission_id)
);
```

#### 数据库函数

- `get_user_permissions(user_id)` - 获取用户的所有权限
- `has_permission(user_id, permission_code)` - 检查用户是否有指定权限
- `has_any_permission(user_id, permission_codes[])` - 检查用户是否有任一权限
- `has_all_permissions(user_id, permission_codes[])` - 检查用户是否有所有权限

### 2. 应用层

#### PermissionContext 上下文管理器

位置：`src/contexts/PermissionContext.tsx`

**核心功能：**
1. **自动加载** - 用户登录时自动从数据库加载权限
2. **内存缓存** - 权限存储在 Set 中，实现 O(1) 查询
3. **自动清理** - 用户登出时自动清除权限缓存
4. **手动刷新** - 提供 refreshPermissions 方法用于权限变更后的更新

**提供的方法：**
```typescript
interface PermissionContextValue {
  // 状态
  permissions: Set<string>          // 权限集合
  isLoading: boolean                // 是否正在加载
  isLoaded: boolean                 // 是否已加载

  // 验证方法
  hasPermission: (code: string) => boolean
  hasAnyPermission: (codes: string[]) => boolean
  hasAllPermissions: (codes: string[]) => boolean

  // 管理方法
  loadPermissions: () => Promise<void>
  refreshPermissions: () => Promise<void>
  clearPermissions: () => void
}
```

#### 权限 API

位置：`src/db/permission-api.ts`

**提供的函数：**
- `getAllRoles()` - 获取所有角色
- `getAllPermissions()` - 获取所有权限
- `getRolePermissions(roleId)` - 获取指定角色的权限
- `getUserPermissions(userId)` - 获取用户的所有权限
- `checkUserPermission(userId, code)` - 检查用户权限
- `updateRolePermissions(roleId, permissionIds)` - 更新角色权限（仅 BOSS）

## 使用指南

### 1. 在页面中使用权限验证

```typescript
import { usePermission } from '@/contexts/PermissionContext'
import { PermissionCode } from '@/db/types/permission'

export default function MyPage() {
  const { hasPermission, hasAnyPermission } = usePermission()

  // 检查单个权限
  if (hasPermission(PermissionCode.DRIVER_MANAGE)) {
    // 用户有管理司机的权限
  }

  // 检查多个权限（任一）
  if (hasAnyPermission([
    PermissionCode.DRIVER_MANAGE,
    PermissionCode.VEHICLE_MANAGE
  ])) {
    // 用户有管理司机或管理车辆的权限
  }

  return <View>...</View>
}
```

### 2. 使用权限守卫组件

```typescript
import { PermissionGuard } from '@/components/PermissionGuard'
import { PermissionCode } from '@/db/types/permission'

export default function MyPage() {
  return (
    <View>
      {/* 单个权限 */}
      <PermissionGuard permissions={PermissionCode.DRIVER_MANAGE}>
        <Button>管理司机</Button>
      </PermissionGuard>

      {/* 多个权限（任一） */}
      <PermissionGuard permissions={[
        PermissionCode.DRIVER_MANAGE,
        PermissionCode.VEHICLE_MANAGE
      ]}>
        <Button>管理操作</Button>
      </PermissionGuard>

      {/* 多个权限（全部） */}
      <PermissionGuard
        permissions={[
          PermissionCode.DRIVER_MANAGE,
          PermissionCode.VEHICLE_MANAGE
        ]}
        requireAll
      >
        <Button>高级操作</Button>
      </PermissionGuard>

      {/* 带降级内容 */}
      <PermissionGuard
        permissions={PermissionCode.DRIVER_MANAGE}
        fallback={<Text>无权限</Text>}
      >
        <Button>管理司机</Button>
      </PermissionGuard>
    </View>
  )
}
```

### 3. 使用权限守卫 Hook

```typescript
import { usePermissionGuard } from '@/contexts/PermissionContext'
import { PermissionCode } from '@/db/types/permission'

export default function MyPage() {
  // 检查是否有访问权限
  const hasAccess = usePermissionGuard([
    PermissionCode.DRIVER_VIEW,
    PermissionCode.DRIVER_MANAGE
  ])

  if (!hasAccess) {
    return <View><Text>无权限访问</Text></View>
  }

  return <View>...</View>
}
```

### 4. 刷新权限

当管理员修改了角色权限配置后，用户需要刷新权限：

```typescript
import { usePermission } from '@/contexts/PermissionContext'

export default function MyPage() {
  const { refreshPermissions } = usePermission()

  const handleRefresh = async () => {
    await refreshPermissions()
    Taro.showToast({ title: '权限已更新', icon: 'success' })
  }

  return (
    <Button onClick={handleRefresh}>刷新权限</Button>
  )
}
```

## 权限代码列表

### 司机管理模块
- `driver:view` - 查看司机信息
- `driver:manage` - 管理司机（增删改）
- `driver:verify` - 审核司机实名

### 车辆管理模块
- `vehicle:view` - 查看车辆信息
- `vehicle:manage` - 管理车辆（增删改）

### 计件管理模块
- `piecework:view` - 查看计件记录
- `piecework:manage` - 管理计件记录
- `piecework:approve` - 审核计件记录

### 通知模块
- `notification:send` - 发送通知
- `notification:view` - 查看通知

### 报表模块
- `report:view` - 查看报表
- `report:export` - 导出报表

### 系统管理模块
- `system:admin` - 系统管理
- `system:role` - 角色管理
- `system:permission` - 权限管理

## 角色权限配置

### DRIVER（司机）
- driver:view
- vehicle:view
- piecework:view
- notification:view

### MANAGER（车队长）
- driver:view, driver:manage, driver:verify
- vehicle:view, vehicle:manage
- piecework:view, piecework:manage, piecework:approve
- notification:send, notification:view
- report:view

### DISPATCHER（调度）
- driver:view
- vehicle:view
- piecework:view, piecework:manage
- notification:send, notification:view
- report:view

### BOSS（老板）
- 所有权限

## 性能优化

### 1. 一次加载原则
- 用户登录时执行一次数据库查询
- 查询结果缓存在内存的 Set 中
- 后续权限检查直接从内存读取，O(1) 时间复杂度

### 2. 自动管理
- 登录时自动加载权限
- 登出时自动清除权限
- 无需手动管理生命周期

### 3. 权限变更感知
- 提供 refreshPermissions 方法
- 管理员修改权限后，用户可手动刷新
- 或在下次登录时自动获取最新权限

## 安全规则

### RLS 策略
- roles 表：所有认证用户可读，只有 BOSS 可写
- permissions 表：所有认证用户可读，只有 BOSS 可写
- role_permissions 表：所有认证用户可读，只有 BOSS 可写

### 权限验证
- 所有权限检查都在前端进行
- 使用内存缓存的权限集合
- 数据库函数提供服务端验证支持

## 演示页面

访问 `/pages/permission-demo/index` 查看完整的权限系统演示，包括：
- 权限状态查看
- 当前用户权限列表
- 权限测试功能
- 权限守卫演示
- 角色权限查询
- 系统权限列表

## 最佳实践

1. **使用枚举** - 使用 `PermissionCode` 枚举而不是字符串，避免拼写错误
2. **组件级控制** - 使用 `PermissionGuard` 组件控制 UI 元素显示
3. **页面级控制** - 使用 `usePermissionGuard` Hook 控制页面访问
4. **及时刷新** - 权限变更后提示用户刷新权限
5. **降级处理** - 使用 `fallback` 属性提供无权限时的友好提示

## 故障排查

### 权限未加载
- 检查用户是否已登录
- 检查 PermissionProvider 是否正确包裹应用
- 查看控制台日志，确认权限加载过程

### 权限检查失败
- 确认权限代码拼写正确
- 检查数据库中是否存在该权限
- 确认角色权限映射是否正确配置

### 权限未更新
- 调用 refreshPermissions 方法刷新权限
- 或重新登录以获取最新权限
