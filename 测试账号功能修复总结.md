# 测试账号功能修复总结

## 问题历程

### 问题1：测试账号列表加载不出来
**现象**：登录页面展开测试账号列表时，一直显示"加载账号列表中..."

**原因**：
- 用户未登录时，Supabase 客户端使用 `anon` 角色
- `profiles` 表启用了 RLS（Row Level Security）
- 没有策略允许 `anon` 角色读取 `profiles` 表

**解决方案**（修复18）：
- 创建 RLS 策略：`Allow anonymous read for test login`
- 允许 `anon` 角色读取 `profiles` 表
- 在加载测试账号前先退出登录，确保使用 `anon` 角色

**结果**：✅ 测试账号列表可以正常加载

---

### 问题2：中央管理系统登录状态丢失
**现象**：在登录页面展开测试账号列表后，中央管理系统的登录状态被清除，创建租户等操作失败

**原因**：
- 所有页面共用同一个 Supabase 客户端实例
- 在登录页面加载测试账号时调用了 `supabase.auth.signOut()`
- 这会清除全局的登录状态，影响其他已登录的页面

**解决方案**（修复19）：
- 删除旧策略：`Allow anonymous read for test login`（只允许 anon）
- 创建新策略：`Allow read for test login`（同时允许 anon 和 authenticated）
- 移除登录页面加载测试账号时的 `signOut()` 调用
- 保持登录状态不变，无论是否登录都能读取 profiles 表

**结果**：✅ 测试账号列表正常加载，且不影响其他页面的登录状态

---

## 最终解决方案

### 数据库策略
```sql
-- 策略名称：Allow read for test login
-- 允许角色：anon, authenticated
-- 操作类型：SELECT
-- 条件：true（允许读取所有记录）

CREATE POLICY "Allow read for test login" ON profiles
  FOR SELECT TO anon, authenticated
  USING (true);
```

### 前端代码
```typescript
// 加载测试账号列表
const loadTestAccounts = useCallback(async () => {
  console.log('🔍 开始加载测试账号列表...')

  // 检查当前用户状态（不退出登录）
  const {data: {session}} = await supabase.auth.getSession()
  console.log('📌 当前登录状态:', session ? '已登录' : '未登录（匿名）')

  try {
    const {data, error} = await supabase
      .from('profiles')
      .select('id, name, phone, email, role')
      .order('created_at', {ascending: true})
      .limit(20)

    if (error) {
      console.error('❌ 获取测试账号列表失败:', error)
      Taro.showToast({
        title: `加载失败: ${error.message}`,
        icon: 'none',
        duration: 3000
      })
      return
    }

    console.log('✅ 获取到账号数据:', data?.length || 0, '个')

    const accountsWithRoleName = (data || []).map((account) => ({
      ...account,
      role_name: getRoleName(account.role)
    }))

    setTestAccounts(accountsWithRoleName)
    console.log('✅ 测试账号列表加载完成')
  } catch (error) {
    console.error('❌ 获取测试账号列表异常:', error)
    Taro.showToast({
      title: '加载账号列表异常',
      icon: 'none',
      duration: 2000
    })
  }
}, [getRoleName])
```

---

## 关键要点

### ✅ 优点
1. **无需退出登录**：不影响其他页面的登录状态
2. **兼容性好**：同时支持已登录和未登录状态
3. **简单高效**：通过 RLS 策略统一控制权限

### ⚠️ 安全警告
**此策略仅用于开发测试环境！**

- 允许任何人（包括匿名用户）读取所有用户的 profiles 信息
- 生产环境部署前**必须删除**此策略
- 详细的删除步骤请参考 `生产环境部署清单.md`

### 🔒 生产环境建议
1. 删除测试账号快速登录功能
2. 删除 `Allow read for test login` RLS 策略
3. 只保留基于角色的权限控制策略
4. 确保用户只能访问自己有权限的数据

---

## 相关文件

- **迁移文件**：
  - `supabase/migrations/99999_allow_anonymous_read_profiles_for_test.sql`（已废弃）
  - `supabase/migrations/00408_fix_test_login_allow_authenticated_read.sql`（当前使用）

- **前端代码**：
  - `src/pages/login/index.tsx`

- **文档**：
  - `README.md` - 修复19说明
  - `生产环境部署清单.md` - 生产环境部署指南
  - `测试账号快速登录使用说明.md` - 功能使用说明

---

## 总结

通过两次修复，我们成功解决了测试账号功能的所有问题：

1. **修复18**：添加 RLS 策略允许匿名用户读取 profiles 表
2. **修复19**：优化策略同时支持匿名和已登录用户，避免影响其他页面的登录状态

最终方案简单、高效、兼容性好，但需要注意在生产环境部署前删除相关代码和策略。
