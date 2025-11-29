# 角色更新报告

## 概述
本次更新明确了系统中的4个角色定义，删除了其他不需要的角色定义。

## 更新时间
2025-11-05

## 角色定义

### 更新前
系统中有3个角色：
- `SUPER_ADMIN` - 超级管理员
- `MANAGER` - 车队长
- `DRIVER` - 司机

### 更新后
系统中有4个明确角色：
- `BOSS` - 老板，拥有最高权限
- `PEER_ADMIN` - 平级账户，与老板同级的管理员
- `MANAGER` - 车队长，管理司机和车辆
- `DRIVER` - 司机，基础用户

## 更新内容

### 1. 数据库迁移
创建了迁移文件：`supabase/migrations/00488_update_user_role_to_four_roles.sql`

**主要变更：**
- 将所有表中的 `role` 列临时改为 `text` 类型
- 更新所有使用旧角色名称的记录（`SUPER_ADMIN` → `BOSS`）
- 删除旧的枚举类型
- 创建新的枚举类型（只包含4个角色）
- 将列改回枚举类型
- 更新 `profiles` 视图以使用新的角色类型
- 更新触发器函数，确保第一个用户是 `BOSS`

### 2. 类型定义更新
文件：`src/db/types.ts`

**更新前：**
```typescript
export type UserRole = 'SUPER_ADMIN' | 'MANAGER' | 'DRIVER'
```

**更新后：**
```typescript
/**
 * 系统角色类型
 * - BOSS: 老板，拥有最高权限
 * - PEER_ADMIN: 平级账户，与老板同级的管理员
 * - MANAGER: 车队长，管理司机和车辆
 * - DRIVER: 司机，基础用户
 */
export type UserRole = 'BOSS' | 'PEER_ADMIN' | 'MANAGER' | 'DRIVER'
```

### 3. 角色辅助函数更新
文件：`src/utils/roleHelper.ts`

**新增函数：**
- `isPeerAdmin(role)` - 检查用户是否为平级管理员

**更新函数：**
- `isTenantAdmin(role)` - 现在包含 `PEER_ADMIN`
- `isManager(role)` - 现在包含 `PEER_ADMIN`
- `canManageUser(managerRole, targetRole)` - `PEER_ADMIN` 可以管理所有角色
- `getRoleDisplayName(role)` - 添加了所有角色的中文名称：
  - `BOSS` → "老板"
  - `PEER_ADMIN` → "平级账户"
  - `MANAGER` → "车队长"
  - `DRIVER` → "司机"
- `getCreatableRoles(currentRole)` - `PEER_ADMIN` 可以创建角色

### 4. 路由逻辑更新
文件：`src/pages/index/index.tsx`

**更新内容：**
- 添加了 `PEER_ADMIN` 的路由逻辑
- `BOSS` 和 `PEER_ADMIN` 都跳转到 `/pages/super-admin/index`

### 5. 批量替换
使用 `sed` 命令批量替换了所有文件中的 `'SUPER_ADMIN'` 为 `'BOSS'`

**影响的文件：**
- `src/db/api.ts` - 所有角色判断逻辑
- `src/pages/profile/help/index.tsx` - FAQ 列表逻辑
- `src/pages/profile/index.tsx` - 统计数据加载逻辑
- 其他所有使用角色的文件

### 6. 类型错误修复
修复了以下类型错误：
- `src/pages/profile/help/index.tsx` - 修复了重复的角色判断
- `src/pages/profile/index.tsx` - 修复了重复的角色判断

## 权限说明

### BOSS（老板）
- 拥有最高权限
- 可以管理所有角色
- 可以创建 `PEER_ADMIN`、`MANAGER`、`DRIVER`
- 第一个注册的用户自动成为 `BOSS`

### PEER_ADMIN（平级账户）
- 与老板同级的管理员
- 可以管理所有角色
- 可以创建 `PEER_ADMIN`、`MANAGER`、`DRIVER`
- 访问超级管理员工作台

### MANAGER（车队长）
- 管理司机和车辆
- 只能管理 `DRIVER`
- 只能创建 `DRIVER`
- 访问车队长工作台

### DRIVER（司机）
- 基础用户
- 不能管理其他用户
- 不能创建用户
- 访问司机工作台

## 测试结果

### 编译测试
运行 `pnpm run lint` 后：
- **错误数量：1 个**
- 唯一的错误与角色更新无关（在 `lease-admin` 页面中）
- 所有角色相关的类型错误已修复

### 影响范围
- ✅ 数据库迁移文件已创建
- ✅ 类型定义已更新
- ✅ 角色辅助函数已更新
- ✅ 路由逻辑已更新
- ✅ 所有使用角色的代码已更新
- ✅ 类型错误已修复

## 注意事项

1. **数据库迁移**
   - 需要运行迁移文件 `00488_update_user_role_to_four_roles.sql`
   - 迁移会自动将现有的 `SUPER_ADMIN` 角色更新为 `BOSS`
   - 迁移会更新所有相关的视图和触发器

2. **缓存清理**
   - 缓存键名称保持不变（如 `SUPER_ADMIN_DASHBOARD`）
   - 这些是常量名，不是角色值，不需要修改

3. **向后兼容性**
   - 旧的 `SUPER_ADMIN` 角色会自动转换为 `BOSS`
   - 不需要手动更新现有数据

4. **权限控制**
   - `BOSS` 和 `PEER_ADMIN` 拥有相同的权限
   - `MANAGER` 只能管理 `DRIVER`
   - `DRIVER` 没有管理权限

## 下一步

1. 运行数据库迁移
2. 测试登录功能
3. 测试角色权限控制
4. 测试用户管理功能
5. 测试各个角色的工作台功能

## 总结

本次更新成功地将系统角色从3个扩展到4个，并明确了每个角色的权限和职责。所有相关代码已更新，类型错误已修复，系统现在只有1个与角色无关的类型错误。
