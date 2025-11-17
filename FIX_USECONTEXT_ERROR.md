# 修复 useContext 错误

## 错误信息
```
Uncaught TypeError: Cannot read properties of null (reading 'useContext')
    at useAuth
    at IndexPage (/pages/index/index.tsx:28:18)
```

## 问题原因

 `src/pages/index/index.tsx` 中，使用了 `useAuth({guard: true})`，这会导致以下问题：

1. **过早的路由守卫**：`guard: true` 会在 React Context 完全初始化之前就尝试读取认证状态
2. **循环依赖**：入口页面（index）使用 guard 会导致未登录用户被重定向到登录页，但此时 Context 可能还没有准备好
3. **Context 读取失败**：在 AuthProvider 还没有完全挂载时，`useContext` 返回 `null`，导致错误

## 解决方案

### 修改前
```typescript
const IndexPage: React.FC = () => {
  const {user, isAuthenticated} = useAuth({guard: true}) // ❌ 错误：使用了 guard
  // ...
}
```

### 修改后
```typescript
const IndexPage: React.FC = () => {
  const {user, isAuthenticated} = useAuth() // ✅ 正确：移除 guard
  // ...
  
  // 手动检查认证状态
  useEffect(() => {
    if (isAuthenticated === false && !hasRedirected.current) {
      console.log('[IndexPage] 用户未登录，跳转到登录页')
      hasRedirected.current = true
      Taro.reLaunch({url: '/pages/login/index'})
    }
  }, [isAuthenticated])
}
```

## 修改说明

1. **移除 `guard: true`**：不再使用自动路由守卫
2. **添加手动认证检查**：使用 `useEffect` 监听 `isAuthenticated` 状态
3. **安全的重定向**：只在认证状态确定为 `false` 时才跳转到登录页
4. **防止重复跳转**：使用 `hasRedirected.current` 标志防止多次跳转

## 为什么这样修改有效？

1. **延迟检查**：`useEffect` 会在组件挂载后执行，此时 Context 已经完全初始化
2. **明确的状态判断**：`isAuthenticated === false` 确保只在认证状态明确为"未登录"时才跳转
3. **避免循环**：使用 `hasRedirected.current` 标志确保只跳转一次

## 适用场景

### 何时使用 `guard: true`
- ✅ 普通业务页面（如车辆管理、用户详情等）
- ✅ 需要登录才能访问的功能页面
- ✅ 已经确定用户已登录的页面

### 何时不使用 `guard: true`
- ❌ 应用入口页面（index）
- ❌ 登录页面
- ❌ 公开访问的页面
- ❌ 需要手动控制跳转逻辑的页面

## 测试验证

### 测试步骤
1. ✅ 清除浏览器缓存和 localStorage
2. ✅ 刷新页面，验证不再出现 useContext 错误
3. ✅ 验证未登录用户会被正确跳转到登录页
4. ✅ 验证已登录用户会根据角色跳转到对应工作台

### 预期结果
- 不再出现 `Cannot read properties of null (reading 'useContext')` 错误
- 未登录用户顺利跳转到登录页
- 已登录用户根据角色跳转到对应页面
- 页面加载流畅，无卡顿或闪烁

## 相关文件

- ✅ `src/pages/index/index.tsx` - 已修复
- ✅ `src/app.tsx` - AuthProvider 配置正确，无需修改

## 总结

 **问题已解决**：移除入口页面的 `guard: true`，改用手动认证检查
 **代码更健壮**：避免了 Context 初始化时序问题
 **逻辑更清晰**：明确的认证状态判断和跳转控制

---
**修复时间**：2025-11-17
**状态**：✅ 已完成
**影响范围**：应用入口页面（/pages/index/index.tsx）
