# 缓存清理指南

## 🎯 问题描述

用户反馈在"用户管理"页面看到 14 个用户，但数据库中实际只有 2 个用户。

## 🔍 原因分析

这是由于**前端缓存**导致的问题：

1. **应用缓存**：应用使用了 LocalStorage 缓存用户列表数据
2. **浏览器缓存**：浏览器可能缓存了旧的页面数据
3. **数据已清理**：数据库中的测试用户已经被删除，但前端缓存还保留着旧数据

## ✅ 已完成的修复

### 1. 修改 `getAllUsers()` 函数

**文件**：`src/db/api.ts`

**修改内容**：
- 添加了权限过滤逻辑
- 系统超级管理员（tenant_id 为 NULL）只能看到系统级用户
- 租户用户只能看到同租户的用户

```typescript
// 如果是系统超级管理员（tenant_id 为 NULL），只显示系统级用户
if (currentProfile?.role === 'super_admin' && currentProfile?.tenant_id === null) {
  console.log('🔐 系统超级管理员登录，只显示系统级用户（tenant_id 为 NULL）')
  query = query.is('tenant_id', null)
}
```

### 2. 修改用户管理页面

**文件**：`src/pages/super-admin/user-management/index.tsx`

**修改内容**：
- `useDidShow` 钩子改为强制刷新：`loadUsers(true)`
- 下拉刷新也改为强制刷新：`loadUsers(true)`
- 每次进入页面都会从数据库重新获取数据，不使用缓存

## 🧪 如何清除缓存

### 方法 1：浏览器清除缓存（推荐）

1. **Chrome 浏览器**：
   - 按 `F12` 打开开发者工具
   - 右键点击刷新按钮
   - 选择"清空缓存并硬性重新加载"

2. **手动清除**：
   - 按 `F12` 打开开发者工具
   - 切换到 `Application` 标签
   - 左侧选择 `Local Storage`
   - 找到应用的域名，右键选择 `Clear`
   - 刷新页面

### 方法 2：应用内清除（自动）

现在应用已经修改为：
- ✅ 每次进入用户管理页面都会强制刷新数据
- ✅ 下拉刷新会清除缓存并重新加载
- ✅ 不再依赖旧的缓存数据

### 方法 3：微信小程序清除缓存

如果在微信小程序中：
1. 长按小程序图标
2. 选择"删除"
3. 重新打开小程序

## 📊 验证步骤

### 1. 清除浏览器缓存

按照上面的方法清除浏览器缓存

### 2. 重新登录

使用 admin 账号登录：
- 账号：`admin`
- 密码：`hye19911206`

### 3. 进入用户管理

1. 点击"用户管理"
2. 查看用户列表

### 4. 预期结果

**应该看到**：
- ✅ 只有 2 个用户
- ✅ admin（系统管理员）
- ✅ admin888（租赁管理员）

**不应该看到**：
- ❌ 任何测试用户
- ❌ 司机用户
- ❌ 车队长用户
- ❌ 租户老板用户

### 5. 查看控制台日志

打开浏览器控制台（F12），应该看到：

```
========================================
📱 用户管理页面显示，强制刷新数据
========================================
🔍 getAllUsers: 开始从数据库获取用户列表
👤 当前登录用户: {role: 'super_admin', tenant_id: null, ...}
🔐 系统超级管理员登录，只显示系统级用户（tenant_id 为 NULL）
📦 getAllUsers: 从数据库获取到的原始数据:
   总数: 2
✅ 成功获取用户数据，数量: 2
```

## 🔧 技术细节

### 缓存键

应用使用以下缓存键：
- `CACHE_KEYS.SUPER_ADMIN_USERS` - 用户列表缓存
- `CACHE_KEYS.SUPER_ADMIN_USER_DETAILS` - 用户详情缓存
- `CACHE_KEYS.SUPER_ADMIN_USER_WAREHOUSES` - 用户仓库缓存

### 强制刷新逻辑

```typescript
// loadUsers 函数的 forceRefresh 参数
const loadUsers = useCallback(
  async (forceRefresh: boolean = false) => {
    // 如果不是强制刷新，先尝试从缓存加载
    if (!forceRefresh) {
      const cachedUsers = getVersionedCache<UserWithRealName[]>(CACHE_KEYS.SUPER_ADMIN_USERS)
      if (cachedUsers) {
        // 使用缓存
        return
      }
    }
    
    // 从数据库加载
    const data = await getAllUsers()
    // ...
  },
  [...]
)
```

### 权限过滤逻辑

```typescript
// 系统超级管理员只能看到系统级用户
if (currentProfile?.role === 'super_admin' && currentProfile?.tenant_id === null) {
  query = query.is('tenant_id', null)
}
// 租户用户只能看到同租户的用户
else if (currentProfile?.tenant_id !== null) {
  query = query.eq('tenant_id', currentProfile?.tenant_id)
}
```

## ⚠️ 注意事项

### 1. 数据隔离

现在系统实现了严格的数据隔离：
- 系统超级管理员（tenant_id = NULL）只能看到系统级用户
- 租户用户（tenant_id ≠ NULL）只能看到同租户的用户

### 2. 缓存策略

- 页面首次加载：强制刷新，不使用缓存
- 下拉刷新：强制刷新，不使用缓存
- 后续操作：可能使用缓存（如果在同一会话中）

### 3. 性能考虑

虽然现在每次都强制刷新，但由于：
- 系统级用户数量很少（只有 2 个）
- 查询速度很快
- 不会影响用户体验

## 🔗 相关文档

- [DATA_CLEANUP_SUMMARY.md](DATA_CLEANUP_SUMMARY.md) - 数据清理总结
- [QUICK_FIX_SUMMARY.md](QUICK_FIX_SUMMARY.md) - 快速修复总结
- [TEST_CHECKLIST.md](TEST_CHECKLIST.md) - 测试清单

## 📝 修改记录

| 日期 | 修改内容 | 文件 |
|------|---------|------|
| 2025-11-27 | 添加权限过滤逻辑 | `src/db/api.ts` |
| 2025-11-27 | 强制刷新数据 | `src/pages/super-admin/user-management/index.tsx` |
| 2025-11-27 | 创建缓存清理指南 | `CACHE_CLEAR_GUIDE.md` |

---

**创建日期**：2025-11-27  
**状态**：✅ 已完成  
**测试状态**：⏳ 等待用户验证
