# 用户管理界面修复总结 V2

## 📋 需求说明

根据用户的最新需求，修复用户管理界面的显示逻辑：

### 1. 老板账号（主账号）登录后

**用户管理 → 管理员管理页面**：
- ✅ 显示车队长（role = 'manager'）
- ✅ 显示平级账号（role = 'super_admin' 且 main_account_id !== null）
- ❌ **不显示老板自己的账号**（role = 'super_admin' 且 main_account_id === null）

### 2. 平级账号登录后

**用户管理 → 管理员管理页面**：
- ✅ 只显示车队长（role = 'manager'）
- ❌ 不显示老板账号（主账号）
- ❌ 不显示平级账号（包括自己）

### 3. 适用范围

- ✅ 适用于所有租户
- ✅ 不影响司机管理页面

---

## 🔍 问题分析

### 角色说明

| 角色 | role 值 | main_account_id | 说明 |
|------|---------|-----------------|------|
| 司机 | `driver` | NULL | 普通司机 |
| 车队长 | `manager` | NULL | 车队管理员 |
| **老板（主账号）** | `super_admin` | **NULL** | 租户主账号 |
| **老板（平级账号）** | `super_admin` | **非NULL** | 租户平级账号 |

**关键字段**：
- `main_account_id` 为 NULL → 主账号
- `main_account_id` 非 NULL → 平级账号

### 显示逻辑

```
主账号登录：
  管理员管理页面 = 车队长 + 平级账号（排除自己）

平级账号登录：
  管理员管理页面 = 车队长
```

---

## 🔧 解决方案

### 修改文件

**文件**：`src/pages/super-admin/user-management/index.tsx`

### 修改 1：添加当前用户状态

```typescript
const UserManagement: React.FC = () => {
  const {user} = useAuth({guard: true})
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null) // 当前登录用户的完整信息
  // ... 其他状态
}
```

**说明**：
- 添加 `currentUserProfile` 状态，用于存储当前登录用户的完整信息
- 包含 `main_account_id` 字段，用于判断是主账号还是平级账号

### 修改 2：加载当前用户信息

```typescript
// 加载用户列表
const loadUsers = useCallback(
  async (forceRefresh: boolean = false) => {
    // 先加载当前登录用户的完整信息（包括 main_account_id）
    if (!currentUserProfile && user) {
      try {
        const {data: profile, error} = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle()

        if (!error && profile) {
          setCurrentUserProfile(profile)
          console.log('✅ 当前用户信息:', profile)
          console.log('是否为主账号:', profile.main_account_id === null)
          console.log('是否为平级账号:', profile.main_account_id !== null)
        }
      } catch (error) {
        console.error('加载当前用户信息失败:', error)
      }
    }

    // ... 继续加载用户列表
  },
  [searchKeyword, roleFilter, currentWarehouseIndex, filterUsers, user, currentUserProfile]
)
```

**说明**：
- 在加载用户列表之前，先加载当前登录用户的完整信息
- 从数据库获取 `main_account_id` 字段
- 用于后续的过滤逻辑判断

### 修改 3：更新过滤逻辑

```typescript
// 过滤用户
const filterUsers = useCallback(
  (userList: UserWithRealName[], keyword: string, role: 'all' | UserRole, warehouseIndex: number) => {
    let filtered = userList

    // 角色过滤
    if (role !== 'all') {
      // 特殊处理：当角色为 manager 时，根据当前登录用户类型决定显示内容
      if (role === 'manager') {
        // 判断当前登录用户是主账号还是平级账号
        const isMainAccount = currentUserProfile?.main_account_id === null
        const isPeerAccount = currentUserProfile?.main_account_id !== null

        if (isMainAccount) {
          // 主账号登录：显示车队长 + 平级账号（不显示自己）
          filtered = filtered.filter((u) => {
            // 显示车队长
            if (u.role === 'manager') return true
            // 显示平级账号（但不显示自己）
            if (u.role === 'super_admin' && u.main_account_id !== null && u.id !== user?.id) return true
            return false
          })
        } else if (isPeerAccount) {
          // 平级账号登录：只显示车队长
          filtered = filtered.filter((u) => u.role === 'manager')
        } else {
          // 其他情况（理论上不应该出现）：只显示车队长
          filtered = filtered.filter((u) => u.role === 'manager')
        }
      } else {
        filtered = filtered.filter((u) => u.role === role)
      }
    }

    // ... 其他过滤逻辑（仓库、搜索等）
  },
  [warehouses, userWarehouseIdsMap, currentUserProfile, user]
)
```

**说明**：
- 根据 `currentUserProfile.main_account_id` 判断当前用户类型
- **主账号**（main_account_id === null）：
  - 显示车队长（role === 'manager'）
  - 显示平级账号（role === 'super_admin' 且 main_account_id !== null）
  - **排除自己**（u.id !== user?.id）
- **平级账号**（main_account_id !== null）：
  - 只显示车队长（role === 'manager'）

---

## ✅ 修复结果

### 测试场景 1：主账号登录

**操作**：主账号登录 → 用户管理 → 管理员管理标签页

**预期结果**：
- ✅ 显示所有车队长（role = 'manager'）
- ✅ 显示所有平级账号（role = 'super_admin' 且 main_account_id !== null）
- ❌ **不显示主账号自己**（role = 'super_admin' 且 main_account_id === null 且 id = 当前用户ID）

**示例数据**：
```
假设租户有以下用户：
- 主账号 A（super_admin, main_account_id = null）← 当前登录
- 平级账号 B（super_admin, main_account_id = A的ID）
- 平级账号 C（super_admin, main_account_id = A的ID）
- 车队长 D（manager）
- 车队长 E（manager）
- 司机 F（driver）

管理员管理页面显示：
✅ 平级账号 B
✅ 平级账号 C
✅ 车队长 D
✅ 车队长 E
❌ 主账号 A（不显示自己）
❌ 司机 F（在司机管理页面显示）
```

### 测试场景 2：平级账号登录

**操作**：平级账号登录 → 用户管理 → 管理员管理标签页

**预期结果**：
- ✅ 显示所有车队长（role = 'manager'）
- ❌ 不显示主账号（role = 'super_admin' 且 main_account_id === null）
- ❌ 不显示平级账号（role = 'super_admin' 且 main_account_id !== null，包括自己）

**示例数据**：
```
假设租户有以下用户：
- 主账号 A（super_admin, main_account_id = null）
- 平级账号 B（super_admin, main_account_id = A的ID）← 当前登录
- 平级账号 C（super_admin, main_account_id = A的ID）
- 车队长 D（manager）
- 车队长 E（manager）
- 司机 F（driver）

管理员管理页面显示：
✅ 车队长 D
✅ 车队长 E
❌ 主账号 A（不显示）
❌ 平级账号 B（不显示自己）
❌ 平级账号 C（不显示）
❌ 司机 F（在司机管理页面显示）
```

### 测试场景 3：司机管理页面

**操作**：任意角色登录 → 用户管理 → 司机管理标签页

**预期结果**：
- ✅ 显示所有司机（role = 'driver'）
- ✅ 不受管理员管理页面修改的影响

---

## 📊 影响范围

### 1. 修改的文件

| 文件 | 修改内容 | 影响 |
|------|---------|------|
| `src/pages/super-admin/user-management/index.tsx` | 添加当前用户状态 | 存储当前登录用户的完整信息 |
| `src/pages/super-admin/user-management/index.tsx` | 修改 loadUsers 函数 | 加载当前用户信息 |
| `src/pages/super-admin/user-management/index.tsx` | 修改 filterUsers 函数 | 根据用户类型过滤显示 |

### 2. 功能影响

**管理员管理页面**：
- ✅ 主账号登录：显示车队长 + 平级账号（不显示自己）
- ✅ 平级账号登录：只显示车队长
- ✅ 适用于所有租户

**司机管理页面**：
- ✅ 不受影响，继续显示所有司机

**其他功能**：
- ✅ 不受影响

### 3. 数据影响

- ✅ 不影响现有数据
- ✅ 不影响数据库结构
- ✅ 只是改变了数据的显示方式

---

## 🧪 测试验证

### 测试步骤

#### 测试 1：主账号登录

1. 使用主账号登录系统
2. 进入"用户管理"页面
3. 切换到"管理员管理"标签页
4. 验证显示内容：
   - ✅ 显示所有车队长
   - ✅ 显示所有平级账号
   - ❌ 不显示主账号自己

#### 测试 2：平级账号登录

1. 使用平级账号登录系统
2. 进入"用户管理"页面
3. 切换到"管理员管理"标签页
4. 验证显示内容：
   - ✅ 只显示车队长
   - ❌ 不显示主账号
   - ❌ 不显示平级账号（包括自己）

#### 测试 3：跨租户验证

1. 创建多个租户，每个租户包含：
   - 1个主账号
   - 2-3个平级账号
   - 2-3个车队长
   - 若干司机
2. 分别使用主账号和平级账号登录
3. 验证每个租户的显示逻辑是否正确

#### 测试 4：边界情况

1. **只有主账号，没有平级账号**：
   - 主账号登录：只显示车队长
2. **只有平级账号，没有车队长**：
   - 主账号登录：只显示平级账号
   - 平级账号登录：不显示任何用户
3. **既没有平级账号，也没有车队长**：
   - 主账号登录：不显示任何用户
   - 平级账号登录：不显示任何用户

---

## 🎯 业务逻辑

### 1. 用户角色层级

```
租户（Tenant）
├── 主账号（super_admin, main_account_id = NULL）
│   ├── 平级账号 1（super_admin, main_account_id = 主账号ID）
│   ├── 平级账号 2（super_admin, main_account_id = 主账号ID）
│   └── 平级账号 3（super_admin, main_account_id = 主账号ID）
├── 车队长 1（manager）
├── 车队长 2（manager）
├── 司机 1（driver）
└── 司机 2（driver）
```

### 2. 显示规则

| 登录角色 | 管理员管理页面显示 | 说明 |
|---------|------------------|------|
| 主账号 | 车队长 + 平级账号（不含自己） | 可以管理车队长和平级账号 |
| 平级账号 | 只显示车队长 | 只能管理车队长 |
| 车队长 | 不适用 | 车队长没有用户管理权限 |
| 司机 | 不适用 | 司机没有用户管理权限 |

### 3. 权限说明

| 角色 | 查看车队长 | 查看平级账号 | 查看主账号 | 查看自己 |
|------|----------|------------|----------|---------|
| 主账号 | ✅ | ✅ | ❌ | ❌ |
| 平级账号 | ✅ | ❌ | ❌ | ❌ |

---

## 🔄 与账号管理界面的关系

### 用户管理 vs 账号管理

| 功能 | 用户管理 | 账号管理 |
|------|---------|---------|
| 入口 | 超级管理端首页 | 个人中心 → 设置 |
| 权限 | 主账号、平级账号 | 仅主账号、平级账号 |
| 管理对象 | 司机、车队长、平级账号 | 主账号、平级账号 |
| 主要功能 | 查看、编辑、删除用户 | 添加、删除平级账号 |

**说明**：
- **用户管理**：管理所有用户（司机、车队长、平级账号）
- **账号管理**：专门管理主账号和平级账号（添加、删除）

---

## 📚 相关文档

- [用户管理系统架构](docs/USER_MANAGEMENT_ARCHITECTURE.md)
- [平级账号管理指南](docs/PEER_ACCOUNT_MANAGEMENT.md)
- [租户管理系统](docs/TENANT_MANAGEMENT.md)

---

## 🎉 总结

通过以下修改，我们成功实现了用户的需求：

✅ **主账号登录** - 管理员管理页面显示车队长 + 平级账号（不显示自己）  
✅ **平级账号登录** - 管理员管理页面只显示车队长  
✅ **适用所有租户** - 修改对所有租户生效  
✅ **不影响其他功能** - 司机管理页面和其他功能不受影响  
✅ **保持数据一致性** - 不影响现有数据和数据库结构  

这是一个**清晰、完整、符合业务逻辑**的解决方案！🎊

---

**修复日期**：2025-11-05  
**修复人员**：秒哒 AI  
**版本**：V2  
**状态**：✅ 已完成并等待测试验证
