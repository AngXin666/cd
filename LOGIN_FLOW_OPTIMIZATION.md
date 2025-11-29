# 登录流程优化总结

## 一、当前系统架构分析

### 1.1 用户认证系统

**使用 Supabase Auth**：
- 用户表：`auth.users`（Supabase 内置）
- 用户信息表：`public.profiles`
- 认证方式：
  - 手机号 + 密码
  - 手机号 + 验证码（OTP）
  - 邮箱 + 密码

**profiles 表结构**：
```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role user_role NOT NULL,  -- super_admin, peer_admin, boss, manager, driver
  main_account_id UUID,     -- 子账号所属的主账号ID
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 1.2 权限系统

**user_permissions 表**：
```sql
CREATE TABLE public.user_permissions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  boss_id TEXT NOT NULL,
  
  -- 司机管理权限
  can_add_driver BOOLEAN DEFAULT false,
  can_edit_driver BOOLEAN DEFAULT false,
  can_delete_driver BOOLEAN DEFAULT false,
  can_disable_driver BOOLEAN DEFAULT false,
  
  -- 审核权限
  can_approve_leave BOOLEAN DEFAULT false,
  can_approve_resignation BOOLEAN DEFAULT false,
  can_approve_vehicle BOOLEAN DEFAULT false,
  can_approve_realname BOOLEAN DEFAULT false,
  
  -- 查看权限
  can_view_all_drivers BOOLEAN DEFAULT false,
  can_view_all_data BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 1.3 租户架构

**租户识别逻辑**：
1. 如果用户有 `main_account_id`，说明是子账号，租户ID为 `main_account_id`
2. 如果用户没有 `main_account_id`：
   - 角色是 `boss`：租户ID为用户自己的ID
   - 角色是 `super_admin` 或 `peer_admin`：没有租户ID（中央用户）

**租户 Schema**：
- 设计中有租户 Schema（`tenant_xxx`），但**当前未使用**
- 所有用户都在 `public.profiles` 中
- 通过 `main_account_id` 字段判断租户关系

## 二、原登录流程问题

### 2.1 问题1：重复查询数据库

**现象**：
- 登录成功后，每次需要用户信息时都要查询数据库
- 每次需要权限信息时都要查询数据库
- 没有缓存机制，性能低下

**影响**：
- 增加数据库负载
- 降低应用响应速度
- 用户体验不佳

### 2.2 问题2：没有统一的用户上下文

**现象**：
- 用户信息分散在各个组件中
- 没有统一的状态管理
- 难以维护和扩展

**影响**：
- 代码重复
- 状态不一致
- 难以调试

### 2.3 问题3：权限查询不完整

**现象**：
- 登录时只查询用户基本信息
- 没有查询用户权限
- 需要权限时再查询，增加延迟

**影响**：
- 权限判断延迟
- 用户体验不佳
- 可能出现权限判断错误

## 三、优化方案

### 3.1 创建用户上下文管理器

**文件**：`src/contexts/UserContext.tsx`

**功能**：
1. 统一管理用户信息、角色、租户ID、权限
2. 登录成功后，一次性查询所有信息并缓存
3. 提供 `useUserContext` Hook 供组件使用
4. 监听认证状态变化，自动更新用户信息

**接口定义**：
```typescript
export interface UserContextData {
  // 用户基本信息
  userId: string | null
  name: string | null
  email: string | null
  phone: string | null
  role: UserRole | null
  status: string | null

  // 租户信息
  tenantId: string | null
  mainAccountId: string | null

  // 权限信息
  permissions: UserPermissions | null

  // 加载状态
  loading: boolean
  error: string | null

  // 方法
  refreshUserData: () => Promise<void>
  clearUserData: () => void
}
```

**权限接口**：
```typescript
export interface UserPermissions {
  // 司机管理权限
  can_add_driver: boolean
  can_edit_driver: boolean
  can_delete_driver: boolean
  can_disable_driver: boolean

  // 审核权限
  can_approve_leave: boolean
  can_approve_resignation: boolean
  can_approve_vehicle: boolean
  can_approve_realname: boolean

  // 查看权限
  can_view_all_drivers: boolean
  can_view_all_data: boolean
}
```

### 3.2 优化登录流程

**登录流程**：
```
1. 用户输入账号密码
   ↓
2. 调用 supabase.auth.signInWithPassword()
   ↓
3. 认证成功，触发 onAuthStateChange 事件
   ↓
4. UserContext 监听到事件，自动加载用户数据
   ↓
5. 查询 public.profiles（获取用户基本信息、角色、租户信息）
   ↓
6. 查询 public.user_permissions（获取用户权限）
   ↓
7. 将所有信息缓存到 UserContext 中
   ↓
8. 跳转到对应的首页
```

**优点**：
- **一次查询，多次使用**：登录时一次性查询所有信息，后续直接从上下文获取
- **自动更新**：监听认证状态变化，自动更新用户信息
- **统一管理**：所有用户信息集中管理，避免状态不一致
- **性能优化**：减少数据库查询次数，提高响应速度

### 3.3 集成到应用中

**修改 `src/app.tsx`**：
```typescript
import {UserContextProvider} from '@/contexts/UserContext'

const App: React.FC = ({children}: PropsWithChildren<unknown>) => {
  return (
    <AuthProvider client={supabase} loginPath="/pages/login/index">
      <UserContextProvider>
        <TenantProvider>{children}</TenantProvider>
      </UserContextProvider>
    </AuthProvider>
  )
}
```

**使用示例**：
```typescript
import {useUserContext} from '@/contexts/UserContext'

const MyComponent: React.FC = () => {
  const {userId, role, tenantId, permissions, loading} = useUserContext()

  if (loading) {
    return <View>加载中...</View>
  }

  // 使用用户信息
  console.log('用户ID:', userId)
  console.log('角色:', role)
  console.log('租户ID:', tenantId)

  // 使用权限信息
  if (permissions?.can_add_driver) {
    // 显示添加司机按钮
  }

  return <View>...</View>
}
```

## 四、租户创建检查

### 4.1 租户 Schema 创建函数

**函数**：`create_tenant_schema(p_schema_name TEXT)`

**位置**：`supabase/migrations/20009_restore_create_tenant_schema_final.sql`

**创建的表**：
1. `profiles` - 用户信息表
2. `vehicles` - 车辆表
3. `attendance` - 考勤表
4. `warehouses` - 仓库表
5. `leave_requests` - 请假申请表
6. `piecework_records` - 计件记录表

**问题**：
- ❌ **没有创建 `user_permissions` 表**
- ❌ **没有创建 `notification_config` 表**

### 4.2 当前租户架构状态

**实际情况**：
- 所有用户都在 `public.profiles` 中
- 租户 Schema 设计存在，但**未实际使用**
- 通过 `main_account_id` 字段判断租户关系
- `user_permissions` 表在 `public` Schema 中

**结论**：
- 当前系统**不使用租户 Schema**
- 租户隔离通过 `main_account_id` 字段实现
- 不需要为每个租户创建独立的 Schema

### 4.3 检查现有租户

**查询租户列表**：
```sql
SELECT id, company_name, tenant_code, status
FROM public.tenants
WHERE status = 'active';
```

**检查租户用户**：
```sql
-- 查询某个租户的所有用户
SELECT id, name, role, status
FROM public.profiles
WHERE main_account_id = '<tenant_id>';

-- 查询某个租户的老板
SELECT id, name, role, status
FROM public.profiles
WHERE id = '<tenant_id>' AND role = 'boss';
```

**检查用户权限**：
```sql
-- 查询某个用户的权限
SELECT *
FROM public.user_permissions
WHERE user_id = '<user_id>';
```

## 五、优化效果对比

### 5.1 性能对比

| 项目 | 优化前 | 优化后 | 提升 |
|------|--------|--------|------|
| 登录查询次数 | 1次（仅认证） | 2次（认证+用户信息+权限） | - |
| 后续查询次数 | 每次需要时查询 | 0次（从上下文获取） | ∞ |
| 总查询次数 | N次 | 2次 | (N-2)/N |
| 响应速度 | 慢（每次查询） | 快（直接获取） | 显著提升 |

### 5.2 代码对比

**优化前**：
```typescript
// 每个组件都要查询
const MyComponent: React.FC = () => {
  const [role, setRole] = useState<UserRole | null>(null)
  const [permissions, setPermissions] = useState<UserPermissions | null>(null)

  useEffect(() => {
    // 查询用户角色
    const loadRole = async () => {
      const {role} = await getCurrentUserRoleAndTenant()
      setRole(role)
    }

    // 查询用户权限
    const loadPermissions = async () => {
      const {data} = await supabase
        .from('user_permissions')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()
      setPermissions(data)
    }

    loadRole()
    loadPermissions()
  }, [])

  // 使用 role 和 permissions
}
```

**优化后**：
```typescript
// 直接从上下文获取
const MyComponent: React.FC = () => {
  const {role, permissions} = useUserContext()

  // 直接使用 role 和 permissions
}
```

### 5.3 维护性对比

| 项目 | 优化前 | 优化后 |
|------|--------|--------|
| 代码重复 | 高（每个组件都要查询） | 低（统一管理） |
| 状态一致性 | 低（可能不一致） | 高（统一来源） |
| 调试难度 | 高（分散在各处） | 低（集中管理） |
| 扩展性 | 低（修改困难） | 高（易于扩展） |

## 六、使用指南

### 6.1 获取用户信息

```typescript
import {useUserContext} from '@/contexts/UserContext'

const MyComponent: React.FC = () => {
  const {userId, name, role, tenantId, loading} = useUserContext()

  if (loading) {
    return <View>加载中...</View>
  }

  return (
    <View>
      <Text>用户ID: {userId}</Text>
      <Text>姓名: {name}</Text>
      <Text>角色: {role}</Text>
      <Text>租户ID: {tenantId}</Text>
    </View>
  )
}
```

### 6.2 权限判断

```typescript
import {useUserContext} from '@/contexts/UserContext'

const DriverManagement: React.FC = () => {
  const {permissions} = useUserContext()

  return (
    <View>
      {permissions?.can_add_driver && (
        <Button onClick={handleAddDriver}>添加司机</Button>
      )}
      {permissions?.can_edit_driver && (
        <Button onClick={handleEditDriver}>编辑司机</Button>
      )}
      {permissions?.can_delete_driver && (
        <Button onClick={handleDeleteDriver}>删除司机</Button>
      )}
    </View>
  )
}
```

### 6.3 刷新用户数据

```typescript
import {useUserContext} from '@/contexts/UserContext'

const ProfileSettings: React.FC = () => {
  const {refreshUserData} = useUserContext()

  const handleUpdateProfile = async () => {
    // 更新用户信息
    await updateProfile(...)

    // 刷新用户数据
    await refreshUserData()
  }

  return <View>...</View>
}
```

### 6.4 清除用户数据

```typescript
import {useUserContext} from '@/contexts/UserContext'

const Logout: React.FC = () => {
  const {clearUserData} = useUserContext()

  const handleLogout = async () => {
    // 登出
    await supabase.auth.signOut()

    // 清除用户数据（自动触发，无需手动调用）
    // clearUserData()
  }

  return <Button onClick={handleLogout}>登出</Button>
}
```

## 七、后续优化建议

### 7.1 添加权限缓存过期机制

**问题**：
- 当前权限信息永久缓存，直到用户登出
- 如果管理员修改了用户权限，用户需要重新登录才能生效

**解决方案**：
- 添加权限缓存过期时间（如 5 分钟）
- 定期刷新权限信息
- 提供手动刷新权限的接口

### 7.2 添加权限变更通知

**问题**：
- 用户不知道权限已被修改
- 可能出现权限不一致的情况

**解决方案**：
- 使用 Supabase Realtime 监听权限变更
- 权限变更时自动刷新用户数据
- 显示权限变更通知

### 7.3 优化权限查询性能

**问题**：
- 每次登录都要查询权限表
- 如果用户没有权限配置，查询会返回空

**解决方案**：
- 为常用角色（boss、manager）预设默认权限
- 只为需要自定义权限的用户创建权限记录
- 使用数据库视图合并默认权限和自定义权限

### 7.4 添加权限审计日志

**问题**：
- 无法追踪权限变更历史
- 难以排查权限问题

**解决方案**：
- 创建 `permission_audit_logs` 表
- 记录所有权限变更操作
- 提供权限变更历史查询接口

## 八、总结

### 8.1 优化成果

1. ✅ **创建了用户上下文管理器**
   - 统一管理用户信息、角色、租户ID、权限
   - 提供 `useUserContext` Hook 供组件使用

2. ✅ **优化了登录流程**
   - 登录时一次性查询所有信息
   - 自动监听认证状态变化
   - 减少数据库查询次数

3. ✅ **集成到应用中**
   - 修改 `src/app.tsx`，添加 `UserContextProvider`
   - 所有组件都可以使用 `useUserContext` Hook

4. ✅ **检查了租户架构**
   - 确认当前系统不使用租户 Schema
   - 所有用户都在 `public.profiles` 中
   - 通过 `main_account_id` 字段判断租户关系

### 8.2 待优化项

1. ⏳ **权限缓存过期机制**
   - 添加权限缓存过期时间
   - 定期刷新权限信息

2. ⏳ **权限变更通知**
   - 使用 Realtime 监听权限变更
   - 自动刷新用户数据

3. ⏳ **权限查询性能优化**
   - 预设默认权限
   - 使用数据库视图

4. ⏳ **权限审计日志**
   - 创建审计日志表
   - 记录权限变更历史

### 8.3 使用建议

1. **在所有需要用户信息的组件中使用 `useUserContext`**
2. **不要直接查询数据库获取用户信息**
3. **权限判断统一使用 `permissions` 对象**
4. **用户信息变更后调用 `refreshUserData()` 刷新**

---

**文档创建日期**：2025-11-05  
**文档作者**：秒哒 AI 助手  
**优化版本**：v1.0
