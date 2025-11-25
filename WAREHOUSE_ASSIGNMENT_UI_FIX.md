# 仓库分配 UI 显示问题修复

## 问题描述

新建的老板在用户管理页面中没有仓库分配功能的 UI 显示。

## 根本原因

在 `src/pages/super-admin/user-management/index.tsx` 中：

1. **仓库分配按钮**（第 1407 行）：
   ```tsx
   {/* 仓库分配按钮（仅司机） */}
   {u.role === 'driver' && (
     <View onClick={(e) => { ... }}>
       <Text>仓库分配</Text>
     </View>
   )}
   ```
   - 只对 `role === 'driver'` 的用户显示
   - 管理员和老板看不到这个按钮

2. **仓库分配面板**（第 1449 行）：
   ```tsx
   {/* 仓库分配面板（展开时显示） */}
   {u.role === 'driver' && isWarehouseExpanded && (
     <View>
       {/* 仓库选择界面 */}
     </View>
   )}
   ```
   - 也只对司机显示
   - 即使管理员点击了按钮，也不会显示面板

## 修复方案

### 修改仓库分配按钮显示条件

```tsx
{/* 仓库分配按钮（司机、管理员、老板） */}
{(u.role === 'driver' || u.role === 'manager' || u.role === 'super_admin') && (
  <View
    onClick={(e) => {
      e.stopPropagation()
      handleWarehouseAssignClick(u)
    }}
    className="flex items-center justify-center bg-orange-50 border border-orange-200 rounded-lg py-2.5 active:bg-orange-100 transition-all">
    <View className="i-mdi-warehouse text-orange-600 text-lg mr-1.5" />
    <Text className="text-orange-700 text-sm font-medium">仓库分配</Text>
  </View>
)}
```

### 修改仓库分配面板显示条件

```tsx
{/* 仓库分配面板（展开时显示 - 司机、管理员、老板） */}
{(u.role === 'driver' || u.role === 'manager' || u.role === 'super_admin') && isWarehouseExpanded && (
  <View className="px-4 pb-4 bg-gray-50 border-t border-gray-200">
    <View className="pt-4">
      <Text className="text-sm font-medium text-gray-700 mb-3 block">选择仓库</Text>
      {/* 仓库选择界面 */}
    </View>
  </View>
)}
```

## 修改的文件

- `src/pages/super-admin/user-management/index.tsx`
  - 第 1407 行：修改仓库分配按钮显示条件
  - 第 1449 行：修改仓库分配面板显示条件

## 验证步骤

1. 登录租赁管理员账号
2. 进入用户管理页面
3. 查看老板账号的操作按钮
4. 应该能看到"仓库分配"按钮
5. 点击"仓库分配"按钮
6. 应该能看到仓库选择面板
7. 选择仓库并保存
8. 验证仓库分配成功

## 相关问题

这个问题是 [仓库分配完整修复](./WAREHOUSE_ASSIGNMENT_COMPLETE_FIX.md) 的一部分，其他相关问题包括：

1. ✅ 新建老板没有默认仓库
2. ✅ `manager_warehouses` 表缺少 RLS 策略
3. ✅ `insertManagerWarehouseAssignment` 函数缺少 `tenant_id`
4. ✅ `setManagerWarehouses` 函数缺少 `tenant_id`
5. ✅ UI 显示问题（本次修复）

## Git 提交

```
commit 3ed1884 - 修复用户管理页面：为管理员和老板添加仓库分配功能
```

## 影响范围

- 用户管理页面的 UI 显示
- 所有角色（司机、管理员、老板）都可以在用户管理页面中分配仓库
- 后端逻辑保持不变（已支持管理员仓库分配）
