# 登录跳转问题修复总结

## 问题描述
用户反馈：不同角色的账号登录后不会跳转到对应的工作台界面。

## 问题原因
登录页面 (`src/pages/login/index.tsx`) 中的 `handleLoginSuccess` 函数尝试直接跳转到各个角色的工作台页面：
- 司机：`/pages/driver/index`
- 管理员：`/pages/manager/index`
- 超级管理员：`/pages/super-admin/index`

但是这些页面不在 `app.config.ts` 的 `tabBar.list` 中，导致 `switchTab` 调用失败。虽然有 `reLaunch` 作为备选方案，但这会导致底部导航栏消失，用户体验不佳。

## 解决方案
修改登录成功后的跳转逻辑，统一跳转到 `pages/index/index` 页面。该页面已经实现了根据用户角色自动跳转到对应工作台的逻辑。

### 修改内容

#### 1. 简化登录跳转逻辑
**文件**: `src/pages/login/index.tsx`

**修改前**:
```typescript
const handleLoginSuccess = async () => {
  const profile = await getCurrentUserProfile()

  let path = '/pages/driver/index'
  if (profile?.role === 'super_admin') {
    path = '/pages/super-admin/index'
  } else if (profile?.role === 'manager') {
    path = '/pages/manager/index'
  }

  try {
    switchTab({url: path})
  } catch (_e) {
    reLaunch({url: path})
  }
}
```

**修改后**:
```typescript
const handleLoginSuccess = async () => {
  // 登录成功后跳转到工作台首页，由首页根据角色自动跳转
  try {
    switchTab({url: '/pages/index/index'})
  } catch (_e) {
    reLaunch({url: '/pages/index/index'})
  }
}
```

#### 2. 删除不再使用的导入
移除了 `getCurrentUserProfile` 的导入，因为不再需要在登录页面获取用户角色。

## 工作流程

### 登录流程
1. 用户在登录页面输入账号密码
2. 验证成功后，调用 `handleLoginSuccess`
3. 跳转到 `pages/index/index` (工作台首页)
4. `pages/index/index` 自动检测用户角色
5. 根据角色跳转到对应的工作台：
   - `driver` → `/pages/driver/index`
   - `manager` → `/pages/manager/index`
   - `super_admin` → `/pages/super-admin/index`

### 角色跳转逻辑
**文件**: `src/pages/index/index.tsx`

```typescript
useEffect(() => {
  if (profile?.role) {
    // 根据用户角色跳转到对应的工作台
    switch (profile.role) {
      case 'driver':
        redirectTo({url: '/pages/driver/index'})
        break
      case 'manager':
        redirectTo({url: '/pages/manager/index'})
        break
      case 'super_admin':
        redirectTo({url: '/pages/super-admin/index'})
        break
      default:
        // 如果角色未知，跳转到个人中心
        switchTab({url: '/pages/profile/index'})
    }
  }
}, [profile])
```

## 测试步骤

### 1. 测试司机账号登录
```
账号: admin1
密码: 123456
预期结果: 
- 登录成功
- 自动跳转到司机工作台 (/pages/driver/index)
- 显示司机相关功能：打卡、考勤、计件、请假等
```

### 2. 测试管理员账号登录
```
账号: admin2
密码: 123456
预期结果:
- 登录成功
- 自动跳转到管理员工作台 (/pages/manager/index)
- 显示管理员相关功能：数据汇总、计件报表、请假审批等
- 只能看到分配的仓库（东区、西区）
```

### 3. 测试超级管理员账号登录
```
账号: admin
密码: 123456
预期结果:
- 登录成功
- 自动跳转到超级管理员工作台 (/pages/super-admin/index)
- 显示超级管理员相关功能：仓库管理、用户管理、权限配置等
- 可以看到所有仓库和所有数据
```

## 优势

### 1. 统一的入口
所有用户登录后都先进入 `pages/index/index`，这个页面作为统一的分发中心，根据角色进行跳转。

### 2. 保持 TabBar 一致性
使用 `switchTab` 跳转到 `pages/index/index`，确保底部导航栏正常显示。

### 3. 代码解耦
登录逻辑不需要关心角色判断，只需要跳转到统一入口。角色判断逻辑集中在 `pages/index/index` 中。

### 4. 易于维护
如果需要修改角色跳转逻辑，只需要修改 `pages/index/index` 一个文件。

### 5. 更好的用户体验
- 登录后有加载动画，用户知道系统正在处理
- 跳转过程流畅，不会出现底部导航栏消失的问题

## 注意事项

1. **认证守卫**: `pages/index/index` 使用了 `useAuth({guard: true})`，确保只有已登录用户才能访问。

2. **角色检测**: 页面会自动获取当前用户的角色信息，并根据角色进行跳转。

3. **加载状态**: 在获取用户信息和跳转过程中，会显示加载动画，提升用户体验。

4. **错误处理**: 如果角色未知或获取失败，会跳转到个人中心页面。

## 相关文件

- `src/pages/login/index.tsx` - 登录页面
- `src/pages/index/index.tsx` - 工作台首页（角色分发中心）
- `src/pages/driver/index.tsx` - 司机工作台
- `src/pages/manager/index.tsx` - 管理员工作台
- `src/pages/super-admin/index.tsx` - 超级管理员工作台
- `src/app.config.ts` - 应用配置（包含 tabBar 配置）

## 下一步

1. 测试所有角色的登录流程
2. 验证跳转是否正确
3. 检查底部导航栏是否正常显示
4. 确认各个工作台页面功能正常
